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
  } else if (ev.type === "payment_intent.processing") {
    await sb.from("bene_compras").upsert({ ...base, status: "processando" }, { onConflict: "payment_intent" });
  } else if (ev.type === "payment_intent.payment_failed") {
    await sb.from("bene_compras").upsert({ ...base, status: "falhou" }, { onConflict: "payment_intent" });
  }
  return new Response("ok");
});
