// Webhook do Resend: guarda entregue, aberto, clicado, devolvido e marcado como spam de cada e-mail.
// Confere a assinatura (Svix) com o segredo RESEND_WEBHOOK_SECRET (o "whsec_..." da tela do webhook no Resend).
// Quem marca como spam ou tem o e-mail devolvido sai da lista na hora.
import { createClient } from "npm:@supabase/supabase-js@2";

const SEGREDO = Deno.env.get("RESEND_WEBHOOK_SECRET") || "";
const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

async function assinaturaOk(id: string, ts: string, corpo: string, cabecalho: string) {
  if (!SEGREDO || !id || !ts || !cabecalho) return false;
  if (Math.abs(Date.now() / 1000 - Number(ts)) > 600) return false; // evita reenvio de evento antigo
  const chave = Uint8Array.from(atob(SEGREDO.replace(/^whsec_/, "")), (c) => c.charCodeAt(0));
  const k = await crypto.subtle.importKey("raw", chave, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = new Uint8Array(await crypto.subtle.sign("HMAC", k, new TextEncoder().encode(`${id}.${ts}.${corpo}`)));
  const esperado = btoa(String.fromCharCode(...sig));
  return cabecalho.split(" ").some((p) => p.split(",")[1] === esperado);
}

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") return new Response("metodo", { status: 405 });
  if (!SEGREDO) return new Response("falta RESEND_WEBHOOK_SECRET", { status: 503 });
  const corpo = await req.text();
  const id = req.headers.get("svix-id") || "", ts = req.headers.get("svix-timestamp") || "";
  if (!(await assinaturaOk(id, ts, corpo, req.headers.get("svix-signature") || ""))) return new Response("assinatura", { status: 401 });

  let ev: { type?: string; created_at?: string; data?: Record<string, any> } = {};
  try { ev = JSON.parse(corpo); } catch { return new Response("json", { status: 400 }); }
  const tipo = String(ev.type || "").replace(/^email\./, "");
  const d = ev.data || {};
  const email = String((Array.isArray(d.to) ? d.to[0] : d.to) || "").toLowerCase().slice(0, 160) || null;

  await sb.from("bene_email_eventos").upsert({
    svix_id: id,
    resend_id: d.email_id ? String(d.email_id) : null,
    tipo,
    email,
    link: d.click?.link ? String(d.click.link).slice(0, 500) : null,
    criado_em: ev.created_at || new Date().toISOString(),
  }, { onConflict: "svix_id", ignoreDuplicates: true });

  if (email && (tipo === "bounced" || tipo === "complained"))
    await sb.from("bene_descadastros").upsert({ email, motivo: tipo === "bounced" ? "e-mail devolvido" : "marcou como spam" }, { onConflict: "email" });

  return new Response("ok");
});
