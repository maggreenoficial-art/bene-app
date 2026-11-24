// E-mail "As ofertas que você não viu": quem comprou o app e não chegou a ver as ofertas depois do pagamento
// (comum no Pix: a mãe paga no app do banco e não volta para a página) recebe o link para elas.
// Sai uma vez por compra (registro em bene_emails, modelo ofertas_0), entre 20 minutos e 24 horas depois do pagamento,
// só se ainda não houve nenhum "oferta_vista" desse pagamento e a pessoa não comprou nenhum adicional.
// - {acao:"rodar"}: chamado pelo agendador.
// - {acao:"teste"}: manda um exemplo só para o e-mail de resposta (BENE_EMAIL_RESPOSTA).
// Segredos usados: RESEND_API_KEY, BENE_EMAIL_RESPOSTA.
import { createClient } from "npm:@supabase/supabase-js@2";

const SITE = "https://www.beneaovelhinha.online";
const RESEND = Deno.env.get("RESEND_API_KEY") || "";
const RESPOSTA = (Deno.env.get("BENE_EMAIL_RESPOSTA") || "").trim();
const DE = "Bené, a Ovelhinha <ola@contatos.beneaovelhinha.online>";
const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
const MIN = 60_000;

const esc = (s: string) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
const ignorar = (e: string) => !e || /@example\.com$/i.test(e) || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
const primeiroNome = (n?: string | null) => {
  if (!n || n.includes("@")) return "";
  const p = n.trim().split(/\s+/)[0] || "";
  return p ? p.charAt(0).toUpperCase() + p.slice(1).toLowerCase() : "";
};

const C = { ceu: "#7EC8F2", tinta: "#4A3426", creme: "#FFF8E7", pasto: "#8BD17C", suave: "#7A6455" };
const FT = "'Baloo 2','Arial Rounded MT Bold',Arial,sans-serif", FB = "Nunito,'Segoe UI',Arial,sans-serif";

function montar(nome: string, pi: string) {
  const n = primeiroNome(nome);
  const link = `${SITE}/oferta-1/?pi=${encodeURIComponent(pi)}&utm_source=email&utm_medium=pos-compra&utm_campaign=ofertas-0`;
  const P = `margin:0 0 14px;font-family:${FB};font-size:17px;line-height:1.55;color:${C.tinta}`;
  const mini = `margin:14px 0 0;font-family:${FB};font-size:14px;line-height:1.5;color:${C.suave}`;
  const itens: [string, string, string][] = [
    ["Níveis 5 e 6", "30 historinhas da Bíblia para ler depois do nível 4, de Noé à ressurreição de Jesus, com uma perguntinha no fim de cada uma.", "R$ 47"],
    ["Livrinho personalizado", "Uma história de 12 páginas com a Bené e o Bom Pastor, com o nome do seu filho e um bonequinho parecido com ele.", "R$ 37"],
  ];
  const assunto = "Duas coisas que você não chegou a ver";
  const html = `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"><title>${assunto}</title></head>
<body style="margin:0;padding:0;background:${C.ceu}">
<div style="display:none;max-height:0;overflow:hidden;opacity:0">Seu acesso já chegou. Separamos dois complementos para quem já tem o aplicativo da Bené.</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${C.ceu}"><tr><td align="center" style="padding:24px 12px 32px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px">
<tr><td align="center" style="padding:0 0 14px"><img src="${SITE}/img/email-logo-v2.png" width="120" alt="Bené, a Ovelhinha" style="display:block;width:120px;height:auto;border:0"></td></tr>
<tr><td bgcolor="#FFFFFF" style="background:#FFFFFF;border:3px solid ${C.tinta};border-radius:22px;padding:30px 24px;box-shadow:6px 6px 0 ${C.tinta}">
<h1 style="margin:0 0 12px;font-family:${FT};font-size:28px;line-height:1.15;font-weight:800;color:${C.tinta}">Obrigada pela compra${n ? ", " + esc(n) : ""}!</h1>
<p style="${P}">O seu acesso ao <b>aplicativo da Bené</b> já foi enviado em outro e-mail. Depois do pagamento, você não chegou a ver os dois complementos que preparamos para quem já tem o aplicativo:</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">${itens.map(([t, x, v]) => `<tr><td style="padding:0 0 12px">
<div style="padding:14px 16px;background:${C.creme};border:2px solid ${C.tinta};border-radius:14px;font-family:${FB};font-size:16px;line-height:1.5;color:${C.tinta}"><b style="display:block;font-family:${FT};font-size:19px">${t} · ${v}</b>${x}</div></td></tr>`).join("")}</table>
<p style="${P}">É opcional: o aplicativo que você comprou já está completo.</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:8px 0 6px"><tr><td align="center">
<table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr><td align="center" bgcolor="${C.pasto}" style="background:${C.pasto};border:3px solid ${C.tinta};border-radius:16px;box-shadow:4px 4px 0 ${C.tinta}">
<a href="${esc(link)}" target="_blank" style="display:inline-block;padding:14px 28px;font-family:${FT};font-size:19px;font-weight:800;line-height:1.2;color:${C.tinta};text-decoration:none">Ver os complementos</a>
</td></tr></table></td></tr></table>
<p style="${mini}">Ainda não recebeu o e-mail de acesso? Olhe a caixa de spam ou é só responder este e-mail que a gente ajuda.</p>
<p style="margin:24px 0 0;font-family:${FB};font-size:16px;line-height:1.5;color:${C.tinta}">Com carinho,<br><b>Equipe da Bené</b></p>
</td></tr>
<tr><td align="center" style="padding:20px 16px 0;font-family:${FB};font-size:13px;line-height:1.5;color:${C.tinta}"><b>Bené, a Ovelhinha</b> · <a href="${SITE}" style="color:${C.tinta}">www.beneaovelhinha.online</a><br>Você recebe este e-mail porque comprou o aplicativo da Bené.</td></tr>
</table></td></tr></table></body></html>`;
  const texto = [
    `${n ? "Oi, " + n + "!" : "Oi!"} Obrigada pela compra! O seu acesso ao aplicativo da Bené já foi enviado em outro e-mail.`,
    "Depois do pagamento, você não chegou a ver os dois complementos que preparamos para quem já tem o aplicativo:",
    itens.map(([t, x, v]) => `- ${t} (${v}): ${x}`).join("\n"),
    "É opcional: o aplicativo que você comprou já está completo.", `Ver os complementos: ${link}`,
    "Ainda não recebeu o e-mail de acesso? Olhe a caixa de spam ou responda este e-mail.", "Com carinho,\nEquipe da Bené",
  ].join("\n\n");
  return { assunto, html, texto };
}

async function mandar(para: string, m: { assunto: string; html: string; texto: string }, chave?: string) {
  return await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { authorization: `Bearer ${RESEND}`, "content-type": "application/json", ...(chave ? { "Idempotency-Key": chave.slice(0, 256) } : {}) },
    body: JSON.stringify({ from: DE, to: [para], reply_to: RESPOSTA, subject: m.assunto, html: m.html, text: m.texto, tags: [{ name: "modelo", value: "ofertas_0" }] }),
  });
}

const ADICIONAIS = ["niveis56", "livro", "livro_nome"];

async function rodar() {
  const agora = Date.now();
  const { data: compras } = await sb.from("bene_compras").select("email,nome,payment_intent,pago_em")
    .eq("produto", "app-bene").eq("status", "pago")
    .lte("pago_em", new Date(agora - 20 * MIN).toISOString()).gte("pago_em", new Date(agora - 24 * 60 * MIN).toISOString());
  const lista = (compras || []).filter((c) => !ignorar(String(c.email || "")) && /^pi_/.test(String(c.payment_intent || "")));
  if (!lista.length) return { enviados: 0 };
  const emails = [...new Set(lista.map((c) => String(c.email).toLowerCase()))];
  const pis = lista.map((c) => c.payment_intent);
  const [{ data: ja }, { data: extras }, { data: fora }, { data: vistas }] = await Promise.all([
    sb.from("bene_emails").select("chave").eq("modelo", "ofertas_0").in("chave", pis),
    sb.from("bene_compras").select("email").eq("status", "pago").in("produto", ADICIONAIS).in("email", emails),
    sb.from("bene_descadastros").select("email").in("email", emails),
    sb.from("bene_eventos").select("dados").eq("evento", "oferta_vista").gte("criado_em", new Date(agora - 26 * 60 * MIN).toISOString()),
  ]);
  const enviado = new Set((ja || []).map((x) => x.chave));
  const comprou = new Set((extras || []).map((x) => String(x.email).toLowerCase()));
  const saiu = new Set((fora || []).map((x) => String(x.email).toLowerCase()));
  const viu = new Set((vistas || []).map((x) => String((x.dados as Record<string, unknown> | null)?.pi || "")));
  const res: unknown[] = [];
  for (const c of lista.slice(0, 10)) {
    const e = String(c.email).toLowerCase();
    if (enviado.has(c.payment_intent) || comprou.has(e) || saiu.has(e) || viu.has(c.payment_intent)) continue;
    try {
      const { error } = await sb.from("bene_emails").insert({ email: e, modelo: "ofertas_0", chave: c.payment_intent });
      if (error) continue;
      const env = await mandar(e, montar(c.nome || "", c.payment_intent), `ofertas_0:${c.payment_intent}`);
      const j = await env.json().catch(() => ({}));
      if (env.ok) await sb.from("bene_emails").update({ resend_id: j.id ?? null }).match({ email: e, modelo: "ofertas_0", chave: c.payment_intent });
      else if (env.status === 429 || env.status >= 500) await sb.from("bene_emails").delete().match({ email: e, modelo: "ofertas_0", chave: c.payment_intent });
      else await sb.from("bene_emails").update({ erro: `${env.status} ${JSON.stringify(j).slice(0, 300)}` }).match({ email: e, modelo: "ofertas_0", chave: c.payment_intent });
      res.push({ ok: env.ok, status: env.status });
      await new Promise((ok) => setTimeout(ok, 600));
    } catch { /* tenta de novo na próxima rodada */ }
  }
  return { enviados: res.length, res };
}

Deno.serve(async (req: Request) => {
  const json = (o: unknown, status = 200) => new Response(JSON.stringify(o), { status, headers: { "content-type": "application/json; charset=utf-8" } });
  if (req.method !== "POST") return json({ erro: "metodo" }, 405);
  if (!RESEND || !RESPOSTA) return json({ erro: "faltam segredos" }, 503);
  let b: Record<string, unknown> = {};
  try { b = await req.json(); } catch { /* corpo vazio */ }
  if (b.acao === "rodar") return json(await rodar());
  if (b.acao === "teste") {
    const r = await mandar(RESPOSTA, montar("Teste", "pi_teste"));
    return json({ ok: r.ok, status: r.status });
  }
  return json({ erro: "acao" }, 400);
});
