// Cadastro de leads da Bené: grava nome, e-mail e WhatsApp do responsável,
// a variante do teste A/B (oferta ou quiz) e, no quiz, as respostas e as UTMs.
import { createClient } from "npm:@supabase/supabase-js@2";
const cors = { "access-control-allow-origin": "*", "access-control-allow-headers": "content-type", "access-control-allow-methods": "POST, OPTIONS" };
const json = (o: unknown, status = 200) => new Response(JSON.stringify(o), { status, headers: { ...cors, "content-type": "application/json; charset=utf-8" } });
Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  if (req.method !== "POST") return json({ erro: "metodo" }, 405);
  let b: Record<string, unknown> = {};
  try { b = await req.json(); } catch { return json({ erro: "json" }, 400); }
  const nome = String(b.nome ?? "").trim().slice(0, 120);
  const email = String(b.email ?? "").trim().toLowerCase().slice(0, 160);
  const whatsapp = String(b.whatsapp ?? "").replace(/\D/g, "").slice(0, 15);
  const origem = String(b.origem ?? "").slice(0, 200) || null;
  const variante = String(b.variante ?? "").slice(0, 40) || null;
  let dados: unknown = null;
  if (b.dados && typeof b.dados === "object") {
    const s = JSON.stringify(b.dados);
    if (s.length <= 4000) dados = b.dados;
  }
  if (nome.length < 2 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || whatsapp.length < 10) return json({ erro: "dados" }, 400);
  const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const row: Record<string, unknown> = { nome, email, whatsapp, origem, atualizado_em: new Date().toISOString() };
  if (variante) row.variante = variante;
  if (dados) row.dados = dados;
  const { error } = await sb.from("bene_leads").upsert(row, { onConflict: "email" });
  if (error) return json({ erro: "banco" }, 500);
  return json({ ok: true });
});
