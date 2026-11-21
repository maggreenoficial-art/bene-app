// Acesso ao app da Bené: confirma no Stripe se um pagamento foi aprovado.
// POST {payment_intent} -> {status: pago|processando|aguardando|falhou, nome, email}  (usado na página de obrigado)
// POST {email}          -> {ok: true|false, produtos: [...]}                         (usado na entrada do aplicativo)
// produtos: app-bene (aplicativo), kit (kit para imprimir), niveis56, livro, livro_nome (upsells)
import { createClient } from "npm:@supabase/supabase-js@2";
const cors = { "access-control-allow-origin": "*", "access-control-allow-headers": "content-type", "access-control-allow-methods": "POST, OPTIONS" };
const json = (o: unknown, status = 200) => new Response(JSON.stringify(o), { status, headers: { ...cors, "content-type": "application/json; charset=utf-8" } });

type PI = { id: string; status: string; amount: number; currency: string; metadata?: Record<string, string>; receipt_email?: string; last_payment_error?: unknown };

async function buscarPI(id: string, sk: string): Promise<PI | null> {
  const r = await fetch(`https://api.stripe.com/v1/payment_intents/${encodeURIComponent(id)}`, { headers: { Authorization: `Bearer ${sk}` } });
  if (!r.ok) return null;
  return await r.json();
}
function situacao(pi: PI): string {
  if (pi.status === "succeeded") return "pago";
  if (pi.status === "processing") return "processando";
  if (pi.status === "canceled") return "falhou";
  if (pi.status === "requires_payment_method" && pi.last_payment_error) return "falhou";
  return "aguardando";
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  if (req.method !== "POST") return json({ erro: "metodo" }, 405);
  const sk = Deno.env.get("STRIPE_SECRET_KEY");
  if (!sk) return json({ erro: "config" }, 503);
  let b: Record<string, unknown> = {};
  try { b = await req.json(); } catch { return json({ erro: "json" }, 400); }
  const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  const produtosDe = async (email: string): Promise<string[]> => {
    if (!email) return [];
    const { data } = await sb.from("bene_compras").select("produto").eq("email", email).eq("status", "pago");
    return [...new Set((data ?? []).map((r) => String(r.produto || "app-bene")))];
  };
  const marcarPago = async (pi: PI) => {
    const m = pi.metadata ?? {};
    const bumpV = m.bump === "niveis56" ? 1990 : 0; // order bump do checkout vira compra separada de niveis56
    const base = {
      payment_intent: pi.id, email: (m.email || pi.receipt_email || "").toLowerCase(), nome: m.nome || null, whatsapp: m.whatsapp || null,
      valor: pi.amount - bumpV, moeda: pi.currency, variante: m.variante || null, status: "pago", pago_em: new Date().toISOString(),
      produto: m.produto || "app-bene", origem: m.origem || null,
    };
    await sb.from("bene_compras").upsert(base, { onConflict: "payment_intent" });
    if (bumpV) await sb.from("bene_compras").upsert({ ...base, payment_intent: pi.id + "_bump", valor: bumpV, produto: "niveis56", origem: pi.id }, { onConflict: "payment_intent" });
  };

  // 1) Página de obrigado: confere um pagamento específico
  const id = String(b.payment_intent ?? "");
  if (id) {
    if (!/^pi_[A-Za-z0-9]{10,64}$/.test(id)) return json({ status: "desconhecido" }, 404);
    const pi = await buscarPI(id, sk);
    if (!pi || !["app-bene", "kit"].includes(String(pi.metadata?.produto))) return json({ status: "desconhecido" }, 404);
    const st = situacao(pi);
    if (st === "pago") await marcarPago(pi);
    const m = pi.metadata ?? {};
    const produtos = st === "pago" ? await produtosDe(String(m.email || "").toLowerCase()) : [];
    return json({ status: st, nome: m.nome || "", email: m.email || "", produtos, produto: m.produto, valor: pi.amount });
  }

  // 2) Entrada do aplicativo: existe compra paga para este e-mail?
  const email = String(b.email ?? "").trim().toLowerCase().slice(0, 160);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return json({ ok: false }, 400);
  const { data: rows } = await sb.from("bene_compras").select("payment_intent,status").eq("email", email).order("criado_em", { ascending: false }).limit(12);
  // o webhook pode ter atrasado: confere direto no Stripe os pagamentos ainda abertos (das últimas 48 h)
  for (const r of (rows ?? []).filter((r) => r.status === "criado" || r.status === "processando").slice(0, 4)) {
    const pi = await buscarPI(r.payment_intent, sk);
    if (pi && pi.status === "succeeded") await marcarPago(pi);
  }
  const produtos = await produtosDe(email);
  // registra a entrada no aplicativo (painel: clientes ativos)
  if (produtos.includes("app-bene")) await sb.from("bene_acessos").insert({ email });
  return json({ ok: produtos.includes("app-bene"), produtos });
});
