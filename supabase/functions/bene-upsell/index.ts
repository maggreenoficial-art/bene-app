// Upsells da Bené (ofertas depois da compra).
// POST {pi, oferta, modo?}
//   pi     = PaymentIntent da compra de entrada (app-bene ou kit, já pago)
//   oferta = app27 | app17 (depois do kit) | niveis56 | livro | livro_nome
//   modo   = "auto" (padrão: cobra no cartão salvo, 1 clique) | "novo" (novo pagamento: Pix ou outro cartão)
// Respostas:
//   {status:"pago", id, valor}                          cobrado no cartão salvo
//   {status:"acao", clientSecret, publishableKey, pm}   o banco pediu confirmação (3D Secure) no navegador
//   {status:"novo", clientSecret, publishableKey, id}   pagar na própria página (Pix ou outro cartão)
//   {status:"recusado"}                                 cartão salvo recusou; o navegador pode pedir modo "novo"
//   {status:"ja_tem"}                                   a pessoa já tem este produto
import { createClient } from "npm:@supabase/supabase-js@2";
const cors = { "access-control-allow-origin": "*", "access-control-allow-headers": "content-type", "access-control-allow-methods": "POST, OPTIONS" };
const json = (o: unknown, status = 200) => new Response(JSON.stringify(o), { status, headers: { ...cors, "content-type": "application/json; charset=utf-8" } });

// "da" = produto que a oferta libera (o aplicativo vendido depois do kit libera o mesmo "app-bene")
const OFERTAS: Record<string, { valor: number; nome: string; desc: string; da?: string }> = {
  app27: { valor: 2700, nome: "Aplicativo da Bené", desc: "Aplicativo da Bené: Método Fono-Fé + 5 bônus (oferta para quem comprou o kit)", da: "app-bene" },
  app17: { valor: 1700, nome: "Aplicativo da Bené", desc: "Aplicativo da Bené: Método Fono-Fé + 5 bônus (oferta especial)", da: "app-bene" },
  niveis56: { valor: 4700, nome: "Bené - Níveis 5 e 6: Historinhas", desc: "Bené: Níveis 5 e 6 com 30 historinhas bíblicas" },
  livro: { valor: 3700, nome: "Bené - Livrinho personalizado", desc: "Bené: livrinho personalizado com o nome da criança" },
  livro_nome: { valor: 1900, nome: "Bené - Livrinho com o nome", desc: "Bené: livrinho com o nome da criança" },
};
const COPIAR = ["nome", "email", "whatsapp", "variante", "fbp", "fbc", "url", "vid", "utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"];

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  if (req.method !== "POST") return json({ erro: "metodo" }, 405);
  const sk = Deno.env.get("STRIPE_SECRET_KEY"), pk = Deno.env.get("STRIPE_PUBLISHABLE_KEY");
  if (!sk || !pk) return json({ erro: "config" }, 503);
  let b: Record<string, unknown> = {};
  try { b = await req.json(); } catch { return json({ erro: "json" }, 400); }
  const origId = String(b.pi ?? ""), oferta = String(b.oferta ?? ""), modo = b.modo === "novo" ? "novo" : "auto";
  const O = OFERTAS[oferta];
  if (!O || !/^pi_[A-Za-z0-9]{10,64}$/.test(origId)) return json({ erro: "dados" }, 400);
  const H = { Authorization: `Bearer ${sk}`, "Content-Type": "application/x-www-form-urlencoded" };

  // compra principal: precisa estar paga
  const ro = await fetch(`https://api.stripe.com/v1/payment_intents/${encodeURIComponent(origId)}?expand[]=payment_method`, { headers: H });
  const orig = await ro.json();
  if (!ro.ok || !["app-bene", "kit"].includes(String(orig?.metadata?.produto))) return json({ erro: "compra" }, 404);
  if (orig.status !== "succeeded") return json({ erro: "nao_pago" }, 409);
  const m = orig.metadata as Record<string, string>;
  const email = String(m.email || orig.receipt_email || "").toLowerCase();

  const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const { data: tem } = await sb.from("bene_compras").select("produto").eq("email", email).eq("status", "pago");
  const meus = (tem ?? []).map((r) => r.produto);
  const libera = O.da || oferta;
  if (meus.includes(libera) || (oferta === "livro_nome" && meus.includes("livro"))) return json({ status: "ja_tem" });

  const f = new URLSearchParams();
  f.set("amount", String(O.valor));
  f.set("currency", "brl");
  f.set("description", O.desc);
  f.set("statement_descriptor_suffix", "BENE APP");
  if (email) f.set("receipt_email", email);
  for (const k of COPIAR) if (m[k]) f.set(`metadata[${k}]`, String(m[k]).slice(0, 500));
  f.set("metadata[produto]", libera);
  f.set("metadata[oferta]", oferta);
  f.set("metadata[product]", O.nome);
  f.set("metadata[origem]", origId);
  const ip = (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim().slice(0, 64) || m.ip || "";
  const ua = (req.headers.get("user-agent") ?? "").slice(0, 450) || m.ua || "";
  if (ip) f.set("metadata[ip]", ip);
  if (ua) f.set("metadata[ua]", ua);
  if (orig.customer) f.set("customer", String(orig.customer));

  const registrar = async (id: string, status: string) => {
    await sb.from("bene_compras").upsert({
      payment_intent: id, email, nome: m.nome || null, whatsapp: m.whatsapp || null, valor: O.valor, moeda: "brl", variante: m.variante || null,
      produto: libera, origem: origId, status, ...(status === "pago" ? { pago_em: new Date().toISOString() } : {}),
      utm: Object.fromEntries(["vid", "utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"].filter((k) => m[k]).map((k) => [k, m[k]])),
    }, { onConflict: "payment_intent" });
  };

  const pm = orig.payment_method;
  if (modo === "auto" && orig.customer && pm && typeof pm === "object" && pm.type === "card") {
    // 1 clique: cobra no cartão que a pessoa acabou de usar (a mesma chave evita cobrar duas vezes se tocar duas vezes)
    f.set("payment_method", pm.id);
    f.set("off_session", "true");
    f.set("confirm", "true");
    const r = await fetch("https://api.stripe.com/v1/payment_intents", { method: "POST", headers: { ...H, "Idempotency-Key": `bene-up-${origId}-${oferta}` }, body: f });
    const j = await r.json();
    if (r.ok && j.status === "succeeded") { await registrar(j.id, "pago"); return json({ status: "pago", id: j.id, valor: O.valor }); }
    if (r.ok && j.status === "processing") { await registrar(j.id, "processando"); return json({ status: "pago", id: j.id, valor: O.valor }); }
    const e = j?.error ?? {};
    const epi = e.payment_intent ?? (r.ok ? j : null);
    if (epi?.client_secret && (e.code === "authentication_required" || epi.status === "requires_action")) {
      await registrar(epi.id, "criado");
      return json({ status: "acao", clientSecret: epi.client_secret, publishableKey: pk, pm: pm.id, id: epi.id, valor: O.valor });
    }
    console.error("upsell cartao", e.type, e.code, e.decline_code, e.message);
    return json({ status: "recusado" });
  }

  // novo pagamento na própria página: Pix (quem pagou com Pix) ou outro cartão
  f.set("automatic_payment_methods[enabled]", "true");
  const r = await fetch("https://api.stripe.com/v1/payment_intents", { method: "POST", headers: H, body: f });
  const j = await r.json();
  if (!r.ok) { console.error("upsell novo", j?.error?.type, j?.error?.code, j?.error?.message); return json({ erro: "stripe" }, 502); }
  await registrar(j.id, "criado");
  return json({ status: "novo", clientSecret: j.client_secret, publishableKey: pk, id: j.id, valor: O.valor, metodo: (pm && typeof pm === "object") ? pm.type : "" });
});
