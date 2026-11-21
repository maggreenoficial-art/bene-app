// Painel da Bené: devolve os números e as listas só para quem tem a senha (segredo PAINEL_SENHA).
// {acao:"marcar_whats", email, tipo} registra que a pessoa foi chamada no WhatsApp.
// Depois de 8 senhas erradas em 15 minutos, o mesmo endereço de internet fica bloqueado por 15 minutos.
import { createClient } from "npm:@supabase/supabase-js@2";

const SENHA = Deno.env.get("PAINEL_SENHA") || "";
const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
const ORIGENS = ["https://www.beneaovelhinha.online", "https://beneaovelhinha.online"];

const resumo = async (s: string) => new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s)));
async function senhaCerta(tentativa: string) {
  const [a, b] = await Promise.all([resumo(tentativa), resumo(SENHA)]);
  let dif = 0;
  for (let i = 0; i < a.length; i++) dif |= a[i] ^ b[i];
  return dif === 0;
}

Deno.serve(async (req: Request) => {
  const origem = req.headers.get("origin") || "";
  const cors = {
    "access-control-allow-origin": ORIGENS.includes(origem) ? origem : ORIGENS[0],
    "access-control-allow-headers": "content-type",
    "access-control-allow-methods": "POST, OPTIONS",
    "vary": "origin",
  };
  const json = (o: unknown, status = 200) => new Response(JSON.stringify(o), { status, headers: { ...cors, "content-type": "application/json; charset=utf-8", "cache-control": "no-store" } });
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  if (req.method !== "POST") return json({ erro: "metodo" }, 405);
  if (SENHA.length < 10) return json({ erro: "sem_senha" }, 503);

  const ip = (req.headers.get("x-forwarded-for") || "").split(",")[0].trim().slice(0, 60) || "?";
  const desde = new Date(Date.now() - 15 * 60_000).toISOString();
  const { count } = await sb.from("bene_painel_tentativas").select("id", { count: "exact", head: true }).eq("ip", ip).gte("criado_em", desde);
  if ((count || 0) >= 8) return json({ erro: "bloqueado" }, 429);

  let b: Record<string, unknown> = {};
  try { b = await req.json(); } catch { /* corpo vazio */ }
  if (!(await senhaCerta(String(b.senha || "")))) {
    await sb.from("bene_painel_tentativas").insert({ ip });
    await new Promise((ok) => setTimeout(ok, 800));
    return json({ erro: "senha" }, 401);
  }
  // marcar no painel que a pessoa já foi chamada no WhatsApp
  if (b.acao === "marcar_whats") {
    const email = String(b.email || "").trim().toLowerCase().slice(0, 160);
    if (!email.includes("@")) return json({ erro: "email" }, 400);
    await sb.from("bene_whats_contatos").insert({ email, tipo: String(b.tipo || "").slice(0, 30) || null });
    return json({ ok: true });
  }
  // mapa ao vivo: só as visitas da última hora (o painel pede de 15 em 15 segundos)
  if (b.acao === "aovivo") {
    const r = await sb.rpc("bene_painel_aovivo");
    if (r.error) return json({ erro: "banco" }, 500);
    return json(r.data);
  }
  const [dados, whats, f24, f72, f7d, analises] = await Promise.all([
    sb.rpc("bene_painel_dados"), sb.rpc("bene_painel_whats"),
    sb.rpc("bene_painel_funil", { horas: 24 }), sb.rpc("bene_painel_funil", { horas: 72 }), sb.rpc("bene_painel_funil", { horas: 168 }),
    sb.rpc("bene_painel_analises"),
  ]);
  if (dados.error) return json({ erro: "banco" }, 500);
  return json({ ...dados.data, whats: whats.data || [], funil: { "24": f24.data || [], "72": f72.data || [], "168": f7d.data || [] }, analises: analises.data || [] });
});
