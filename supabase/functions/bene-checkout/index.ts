// Checkout transparente da Bené: cria o PaymentIntent no Stripe (cartão, Pix, Apple Pay, Google Pay)
// e registra a compra como "criado". Cria também o cliente no Stripe para guardar o cartão (upsells de 1 clique). As chaves ficam só nos secrets do Supabase:
// STRIPE_SECRET_KEY (sk_live ou rk_live com permissão de escrita em PaymentIntents) e STRIPE_PUBLISHABLE_KEY (pk_live).
import { createClient } from "npm:@supabase/supabase-js@2";
const cors = { "access-control-allow-origin": "*", "access-control-allow-headers": "content-type", "access-control-allow-methods": "POST, OPTIONS" };
const json = (o: unknown, status = 200) => new Response(JSON.stringify(o), { status, headers: { ...cors, "content-type": "application/json; charset=utf-8" } });
// produtos de entrada: o aplicativo (R$ 37) e o kit para imprimir (R$ 5,99)
const PRODUTOS: Record<string, { valor: number; nome: string; desc: string }> = {
  "app-bene": { valor: 3700, nome: "Aplicativo da Bené", desc: "Aplicativo da Bené: Método Fono-Fé + 5 bônus" },
  kit: { valor: 599, nome: "Bené - Kit para imprimir", desc: "Bené: kit Grafismo Fonético para imprimir (127 páginas)" },
};

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
  const produto = PRODUTOS[String(b.produto ?? "")] ? String(b.produto) : "app-bene";
  const P = PRODUTOS[produto];
  const utm = (b.utm && typeof b.utm === "object" && JSON.stringify(b.utm).length < 4000) ? b.utm as Record<string, string> : {};
  if (nome.length < 2 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || whatsapp.length < 10) return json({ erro: "dados" }, 400);

  // cliente no Stripe: guarda o cartão para os upsells de 1 clique (se a chave não puder criar clientes, segue sem)
  let customer = "";
  try {
    const c = new URLSearchParams({ email, name: nome, phone: "+55" + whatsapp });
    c.set("metadata[origem]", "bene-checkout");
    const rc = await fetch("https://api.stripe.com/v1/customers", { method: "POST", headers: { Authorization: `Bearer ${sk}`, "Content-Type": "application/x-www-form-urlencoded" }, body: c });
    const jc = await rc.json();
    if (rc.ok && jc.id) customer = jc.id; else console.error("customer", jc?.error?.type, jc?.error?.code, jc?.error?.message);
  } catch (e) { console.error("customer falhou", String(e)); }

  const f = new URLSearchParams();
  f.set("amount", String(P.valor));
  if (customer) {
    f.set("customer", customer);
    f.set("payment_method_options[card][setup_future_usage]", "off_session");
  }
  f.set("currency", "brl");
  f.set("automatic_payment_methods[enabled]", "true");
  f.set("description", P.desc);
  f.set("statement_descriptor_suffix", "BENE APP");
  f.set("receipt_email", email);
  f.set("metadata[produto]", produto);
  f.set("metadata[nome]", nome);
  f.set("metadata[email]", email);
  f.set("metadata[whatsapp]", whatsapp);
  if (variante) f.set("metadata[variante]", variante);
  // dados para a API de Conversões da Meta (o webhook manda a compra pelo servidor)
  const fbp = String(b.fbp || utm.fbp || "").slice(0, 200), fbc = String(b.fbc || utm.fbc || "").slice(0, 300), url = String(b.url ?? "").slice(0, 400);
  const ip = (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim().slice(0, 64);
  const ua = (req.headers.get("user-agent") ?? "").slice(0, 450);
  if (fbp) f.set("metadata[fbp]", fbp);
  if (fbc) f.set("metadata[fbc]", fbc);
  if (url) f.set("metadata[url]", url);
  if (ip) f.set("metadata[ip]", ip);
  if (ua) f.set("metadata[ua]", ua);
  // padrão do Métricas Rápida: product, vid, UTMs, fbc e fbp no metadata do pagamento
  f.set("metadata[product]", P.nome);
  for (const k of ["vid", "utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"]) {
    if (utm[k]) f.set(`metadata[${k}]`, String(utm[k]).trim().slice(0, 500));
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
  await sb.from("bene_compras").insert({ payment_intent: pi.id, email, nome, whatsapp, valor: P.valor, variante: variante || null, utm, produto });
  return json({ clientSecret: pi.client_secret, publishableKey: pk, id: pi.id, valor: P.valor, produto, umClique: !!customer });
});
