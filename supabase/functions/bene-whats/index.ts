// WhatsApp de recuperação: o programa que roda no computador do Humberto (Docker) busca aqui
// as mensagens da fila, envia pelo WhatsApp e devolve o resultado. Protegido por token (tabela bene_cfg).
import { createClient } from "npm:@supabase/supabase-js@2";
const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { "content-type": "application/json" } });

async function cfg(nome: string) {
  const { data } = await sb.from("bene_cfg").select("valor").eq("nome", nome).maybeSingle();
  return data?.valor ?? null;
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return json({ erro: "use POST" }, 405);
  let b: any = {};
  try { b = await req.json(); } catch { /* corpo vazio */ }
  const token = await cfg("whats_token");
  if (!token || req.headers.get("x-bene-token") !== token) return json({ erro: "token inválido" }, 401);
  const ativo = (await cfg("whats_ativo")) === "sim";

  if (b.acao === "status") {
    const { data } = await sb.from("bene_whats").select("status").gte("criado_em", new Date(Date.now() - 7 * 864e5).toISOString());
    const cont: Record<string, number> = {};
    (data || []).forEach((r: any) => { cont[r.status] = (cont[r.status] || 0) + 1; });
    return json({ ativo, ultimos7dias: cont });
  }

  if (b.acao === "proximas") {
    if (!ativo) return json({ ativo, mensagens: [] });
    // mensagens velhas (mais de 12 h na fila) não fazem mais sentido
    await sb.from("bene_whats").update({ status: "cancelado", erro: "velha demais" }).eq("status", "pendente").lt("criado_em", new Date(Date.now() - 12 * 36e5).toISOString());
    const { data } = await sb.from("bene_whats").select("id,telefone,texto").eq("status", "pendente").lte("tentar_apos", new Date().toISOString()).order("criado_em").limit(Math.min(3, Number(b.limite) || 1));
    const ids = (data || []).map((m: any) => m.id);
    if (ids.length) await sb.from("bene_whats").update({ status: "enviando", tentar_apos: new Date().toISOString() }).in("id", ids);
    return json({ ativo, mensagens: data || [] });
  }

  if (b.acao === "resultado" && b.id) {
    const ok = !!b.ok;
    await sb.from("bene_whats").update(ok ? { status: "enviado", enviado_em: new Date().toISOString(), erro: null } : { status: "erro", erro: String(b.erro || "").slice(0, 300) }).eq("id", b.id);
    return json({ ok: true });
  }

  if (b.acao === "sair" && b.telefone) {
    const t = String(b.telefone).replace(/\D/g, "");
    await sb.from("bene_whats_sair").upsert({ telefone: t });
    await sb.from("bene_whats").update({ status: "cancelado", erro: "pediu para sair" }).eq("telefone", t).eq("status", "pendente");
    return json({ ok: true });
  }

  return json({ erro: "ação desconhecida" }, 400);
});
