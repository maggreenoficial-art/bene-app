// Checkout transparente da Bené: cria o PaymentIntent no Stripe (cartão, Pix, Apple Pay, Google Pay)
// e registra a compra como "criado". As chaves ficam só nos secrets do Supabase:
// STRIPE_SECRET_KEY (sk_live ou rk_live com permissão de escrita em PaymentIntents) e STRIPE_PUBLISHABLE_KEY (pk_live).
import { createClient } from "npm:@supabase/supabase-js@2";
const cors = { "access-control-allow-origin": "*", "access-control-allow-headers": "content-type", "access-control-allow-methods": "POST, OPTIONS" };
const json = (o: unknown, status = 200) => new Response(JSON.stringify(o), { status, headers: { ...cors, "content-type": "application/json; charset=utf-8" } });
const PRECO_CENTAVOS = 3700;

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  if (req.method !== "POST") return json({ erro: "metodo" }, 405);
  const sk = Deno.env.get("STRIPE_SECRET_KEY"), pk = Deno.env.get("STRIPE_PUBLISHABLE_KEY");
  if (!sk || !pk) return json({ erro: "config" }, 503);
  let b: Record<string, unknown> = {};
  try { b = await req.json(); } catch { return json({ erro: "json" }, 400); }
  const nome = String(b.nome ?? "").trim().slice(0, 120);
  const email = String(b.email ?? "").trim().toLowerCase().slice(0, 160);
  const whatsapp = String(b.whatsapp ?? "").replace(/\D/g, "").slice(0, 15);
  const variante = String(b.variante ?? "").slice(0, 40);
  const utm = (b.utm && typeof b.utm === "object" && JSON.stringify(b.utm).length < 2000) ? b.utm as Record<string, string> : {};
  if (nome.length < 2 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || whatsapp.length < 10) return json({ erro: "dados" }, 400);

  const f = new URLSearchParams();
  f.set("amount", String(PRECO_CENTAVOS));
  f.set("currency", "brl");
  f.set("automatic_payment_methods[enabled]", "true");
  f.set("description", "Aplicativo da Bené: Método Fono-Fé + 5 bônus");
  f.set("statement_descriptor_suffix", "BENE APP");
  f.set("receipt_email", email);
  f.set("metadata[produto]", "app-bene");
  f.set("metadata[nome]", nome);
  f.set("metadata[email]", email);
  f.set("metadata[whatsapp]", whatsapp);
  if (variante) f.set("metadata[variante]", variante);
  // dados para a API de Conversões da Meta (o webhook manda a compra pelo servidor)
  const fbp = String(b.fbp ?? "").slice(0, 200), fbc = String(b.fbc ?? "").slice(0, 300), url = String(b.url ?? "").slice(0, 400);
  const ip = (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim().slice(0, 64);
  const ua = (req.headers.get("user-agent") ?? "").slice(0, 450);
  if (fbp) f.set("metadata[fbp]", fbp);
  if (fbc) f.set("metadata[fbc]", fbc);
  if (url) f.set("metadata[url]", url);
  if (ip) f.set("metadata[ip]", ip);
  if (ua) f.set("metadata[ua]", ua);
  for (const k of ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"]) {
    if (utm[k]) f.set(`metadata[${k}]`, String(utm[k]).slice(0, 200));
  }
  const r = await fetch("https://api.stripe.com/v1/payment_intents", {
    method: "POST",
    headers: { Authorization: `Bearer ${sk}`, "Content-Type": "application/x-www-form-urlencoded" },
    body: f,
  });
  const pi = await r.json();
  if (!r.ok) {
    console.error("stripe", pi?.error?.type, pi?.error?.code, pi?.error?.message);
    return json({ erro: "stripe" }, 502);
  }
  const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  await sb.from("bene_compras").insert({ payment_intent: pi.id, email, nome, whatsapp, valor: PRECO_CENTAVOS, variante: variante || null, utm });
  return json({ clientSecret: pi.client_secret, publishableKey: pk, id: pi.id, valor: PRECO_CENTAVOS });
});
