// Webhook do Stripe: confirma a assinatura (STRIPE_WEBHOOK_SECRET) e marca a compra como paga ou falhou.
import { createClient } from "npm:@supabase/supabase-js@2";

const enc = new TextEncoder();
async function assinaturaValida(payload: string, header: string, segredo: string): Promise<boolean> {
  const t = header.split(",").find((p) => p.startsWith("t="))?.slice(2);
  const v1s = header.split(",").filter((p) => p.startsWith("v1=")).map((p) => p.slice(3));
  if (!t || !v1s.length) return false;
  if (Math.abs(Date.now() / 1000 - Number(t)) > 600) return false;
  const chave = await crypto.subtle.importKey("raw", enc.encode(segredo), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = new Uint8Array(await crypto.subtle.sign("HMAC", chave, enc.encode(`${t}.${payload}`)));
  const hex = Array.from(sig).map((x) => x.toString(16).padStart(2, "0")).join("");
  return v1s.some((v) => v.length === hex.length && [...v].reduce((acc, c, i) => acc | (c.charCodeAt(0) ^ hex.charCodeAt(i)), 0) === 0);
}

async function sha256(v: string): Promise<string> {
  const d = new Uint8Array(await crypto.subtle.digest("SHA-256", enc.encode(v)));
  return Array.from(d).map((x) => x.toString(16).padStart(2, "0")).join("");
}

// API de Conversões da Meta: manda a compra pelo servidor (mesmo event_id do navegador, a Meta junta os dois)
// Secrets: META_CAPI_TOKEN (obrigatório), META_PIXEL_ID (opcional), META_TEST_CODE (só durante o teste)
async function compraParaMeta(pi: any) {
  const token = Deno.env.get("META_CAPI_TOKEN");
  if (!token) return;
  const pixel = Deno.env.get("META_PIXEL_ID") || "1170302909276144";
  const m = pi.metadata ?? {};
  const email = String(m.email || pi.receipt_email || "").trim().toLowerCase();
  const ud: Record<string, unknown> = { country: [await sha256("br")] };
  if (email) { ud.em = [await sha256(email)]; ud.external_id = [await sha256(email)]; }
  const fone = String(m.whatsapp || "").replace(/\D/g, "");
  if (fone) ud.ph = [await sha256(fone.length <= 11 ? "55" + fone : fone)];
  const partes = String(m.nome || "").trim().toLowerCase().split(/\s+/).filter(Boolean);
  if (partes.length) ud.fn = [await sha256(partes[0])];
  if (partes.length > 1) ud.ln = [await sha256(partes[partes.length - 1])];
  if (m.fbp) ud.fbp = m.fbp;
  if (m.fbc) ud.fbc = m.fbc;
  if (m.ip) ud.client_ip_address = m.ip;
  if (m.ua) ud.client_user_agent = m.ua;
  const body: Record<string, unknown> = {
    data: [{
      event_name: "Purchase", event_time: Math.floor(Date.now() / 1000), event_id: pi.id, action_source: "website",
      event_source_url: m.url || "https://www.beneaovelhinha.online/obrigado/", user_data: ud,
      custom_data: { value: pi.amount / 100, currency: String(pi.currency || "brl").toUpperCase(), content_name: "app-bene", order_id: pi.id },
    }],
  };
  const teste = Deno.env.get("META_TEST_CODE");
  if (teste) body.test_event_code = teste;
  try {
    const r = await fetch(`https://graph.facebook.com/v23.0/${pixel}/events?access_token=${encodeURIComponent(token)}`, {
      method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body),
    });
    const t = await r.text();
    if (!r.ok) console.error("meta capi", r.status, t.slice(0, 300)); else console.log("meta capi ok", t.slice(0, 200));
  } catch (e) { console.error("meta capi falhou", String(e)); }
}

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") return new Response("metodo", { status: 405 });
  const segredo = Deno.env.get("STRIPE_WEBHOOK_SECRET");
  if (!segredo) return new Response("config", { status: 503 });
  const payload = await req.text();
  if (!(await assinaturaValida(payload, req.headers.get("stripe-signature") ?? "", segredo))) return new Response("assinatura", { status: 400 });
  const ev = JSON.parse(payload);
  const pi = ev?.data?.object;
  if (!pi?.id || pi.object !== "payment_intent") return new Response("ok");
  const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const metodo = (pi.payment_method_types && pi.payment_method_types.length === 1) ? pi.payment_method_types[0] : null;
  const m = pi.metadata ?? {};
  const base = { payment_intent: pi.id, email: m.email || pi.receipt_email || "", nome: m.nome || null, whatsapp: m.whatsapp || null, valor: pi.amount, moeda: pi.currency, variante: m.variante || null };
  if (ev.type === "payment_intent.succeeded") {
    await sb.from("bene_compras").upsert({ ...base, status: "pago", pago_em: new Date().toISOString(), metodo: metodo }, { onConflict: "payment_intent" });
    if (m.produto === "app-bene") await compraParaMeta(pi);
  } else if (ev.type === "payment_intent.processing") {
    await sb.from("bene_compras").upsert({ ...base, status: "processando" }, { onConflict: "payment_intent" });
  } else if (ev.type === "payment_intent.payment_failed") {
    await sb.from("bene_compras").upsert({ ...base, status: "falhou" }, { onConflict: "payment_intent" });
  }
  return new Response("ok");
});
