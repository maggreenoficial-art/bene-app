// E-mail "Seu código Pix da Bené": 5 minutos depois de gerar o Pix, se ainda não pagou, manda o código copia e cola.
// Sai uma vez por pagamento (registro em bene_emails, modelo pix_0). O código vem do próprio Stripe e só sai
// se o pagamento ainda está esperando o Pix (status requires_action) e falta mais de 10 minutos para vencer.
// - {acao:"rodar"}: chamado pelo agendador a cada 2 minutos.
// - {acao:"teste"}: manda um exemplo só para o e-mail de resposta (BENE_EMAIL_RESPOSTA).
// Segredos usados: RESEND_API_KEY, BENE_EMAIL_RESPOSTA, STRIPE_SECRET_KEY.
import { createClient } from "npm:@supabase/supabase-js@2";

const SITE = "https://www.beneaovelhinha.online";
const RESEND = Deno.env.get("RESEND_API_KEY") || "";
const RESPOSTA = (Deno.env.get("BENE_EMAIL_RESPOSTA") || "").trim();
const STRIPE = Deno.env.get("STRIPE_SECRET_KEY") || "";
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

function montar(nome: string, codigo: string, ate?: string) {
  const n = primeiroNome(nome);
  const link = `${SITE}/checkout/?utm_source=email&utm_medium=recuperacao&utm_campaign=pix-0`;
  const P = `margin:0 0 14px;font-family:${FB};font-size:17px;line-height:1.55;color:${C.tinta}`;
  const mini = `margin:14px 0 0;font-family:${FB};font-size:14px;line-height:1.5;color:${C.suave}`;
  const passos: [string, string][] = [
    ["Copie o código", "Segure o dedo em cima do código e toque em <b>Copiar</b>."],
    ["Abra o app do seu banco", "Escolha <b>Pix</b> e depois <b>Pix Copia e Cola</b>."],
    ["Cole e confirme", "Assim que o pagamento cair, o acesso chega no seu e-mail."],
  ];
  const validade = ate ? `Este Pix vale até ${esc(ate)}. Se já passou do horário, gere um novo:` : "Se o Pix já expirou, é só gerar um novo:";
  const recebedor = "No app do banco, o nome de quem recebe pode aparecer diferente de \"Bené\": é a empresa que processa os nossos pagamentos com segurança. Ficou com dúvida? É só responder este e-mail.";
  const assunto = "Seu código Pix da Bené";
  const html = `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"><title>${assunto}</title></head>
<body style="margin:0;padding:0;background:${C.ceu}">
<div style="display:none;max-height:0;overflow:hidden;opacity:0">Copie o código, cole no app do seu banco e o acesso é liberado na hora.</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${C.ceu}"><tr><td align="center" style="padding:24px 12px 32px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px">
<tr><td align="center" style="padding:0 0 14px"><img src="${SITE}/img/email-logo-v2.png" width="120" alt="Bené, a Ovelhinha" style="display:block;width:120px;height:auto;border:0"></td></tr>
<tr><td bgcolor="#FFFFFF" style="background:#FFFFFF;border:3px solid ${C.tinta};border-radius:22px;padding:30px 24px;box-shadow:6px 6px 0 ${C.tinta}">
<h1 style="margin:0 0 12px;font-family:${FT};font-size:28px;line-height:1.15;font-weight:800;color:${C.tinta}">Seu Pix está aqui${n ? ", " + esc(n) : ""}</h1>
<p style="${P}">${n ? "Oi, " + esc(n) + "!" : "Oi!"} Você gerou o Pix do <b>aplicativo da Bené</b> e ele ainda não foi pago. Para ficar mais fácil, o código está logo abaixo:</p>
<div style="margin:6px 0 18px;padding:14px;background:${C.creme};border:2px dashed ${C.tinta};border-radius:14px;font-family:ui-monospace,Menlo,Consolas,monospace;font-size:13px;line-height:1.45;color:${C.tinta};word-break:break-all">${esc(codigo)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">${passos.map(([t, x], i) => `<tr>
<td width="44" valign="top" style="padding:0 0 14px"><div style="width:34px;height:34px;line-height:34px;border-radius:17px;background:${C.ceu};border:2px solid ${C.tinta};text-align:center;font-family:${FT};font-size:18px;font-weight:800;color:${C.tinta}">${i + 1}</div></td>
<td valign="top" style="padding:3px 0 14px;font-family:${FB};font-size:16px;line-height:1.5;color:${C.tinta}"><b style="display:block;font-size:17px">${t}</b>${x}</td></tr>`).join("")}</table>
<p style="${mini}">${validade}</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:18px 0 6px"><tr><td align="center">
<table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr><td align="center" bgcolor="${C.pasto}" style="background:${C.pasto};border:3px solid ${C.tinta};border-radius:16px;box-shadow:4px 4px 0 ${C.tinta}">
<a href="${esc(link)}" target="_blank" style="display:inline-block;padding:14px 28px;font-family:${FT};font-size:19px;font-weight:800;line-height:1.2;color:${C.tinta};text-decoration:none">Abrir meu pedido</a>
</td></tr></table></td></tr></table>
<p style="${mini}">${esc(recebedor)}</p>
<p style="margin:24px 0 0;font-family:${FB};font-size:16px;line-height:1.5;color:${C.tinta}">Com carinho,<br><b>Equipe da Bené</b></p>
</td></tr>
<tr><td align="center" style="padding:20px 16px 0;font-family:${FB};font-size:13px;line-height:1.5;color:${C.tinta}"><b>Bené, a Ovelhinha</b> · <a href="${SITE}" style="color:${C.tinta}">www.beneaovelhinha.online</a><br>Você recebe este e-mail porque fez um pedido no site da Bené.</td></tr>
</table></td></tr></table></body></html>`;
  const texto = [
    `${n ? "Oi, " + n + "!" : "Oi!"} Você gerou o Pix do aplicativo da Bené e ele ainda não foi pago. O código está aqui:`,
    `Código Pix (copia e cola):\n${codigo}`,
    "1. Copie o código\n2. Abra o app do seu banco e escolha Pix Copia e Cola\n3. Cole e confirme. Assim que o pagamento cair, o acesso chega no seu e-mail.",
    validade.replace(/&[a-z#0-9]+;/g, ""), `Abrir meu pedido: ${link}`, recebedor, "Com carinho,\nEquipe da Bené",
  ].join("\n\n");
  return { assunto, html, texto };
}

async function mandar(para: string, m: { assunto: string; html: string; texto: string }, chave?: string) {
  return await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { authorization: `Bearer ${RESEND}`, "content-type": "application/json", ...(chave ? { "Idempotency-Key": chave.slice(0, 256) } : {}) },
    body: JSON.stringify({ from: DE, to: [para], reply_to: RESPOSTA, subject: m.assunto, html: m.html, text: m.texto, tags: [{ name: "modelo", value: "pix_0" }] }),
  });
}

async function rodar() {
  const agora = Date.now();
  const { data: compras } = await sb.from("bene_compras").select("email,nome,produto,status,payment_intent,criado_em")
    .eq("produto", "app-bene").eq("status", "criado")
    .lte("criado_em", new Date(agora - 5 * MIN).toISOString()).gte("criado_em", new Date(agora - 90 * MIN).toISOString());
  const lista = (compras || []).filter((c) => !ignorar(String(c.email || "")));
  if (!lista.length) return { enviados: 0 };
  const emails = [...new Set(lista.map((c) => String(c.email).toLowerCase()))];
  const [{ data: ja }, { data: pagos }, { data: fora }] = await Promise.all([
    sb.from("bene_emails").select("chave").eq("modelo", "pix_0").in("chave", lista.map((c) => c.payment_intent)),
    sb.from("bene_compras").select("email").eq("produto", "app-bene").eq("status", "pago").in("email", emails),
    sb.from("bene_descadastros").select("email").in("email", emails),
  ]);
  const enviado = new Set((ja || []).map((x) => x.chave));
  const pagou = new Set((pagos || []).map((x) => String(x.email).toLowerCase()));
  const saiu = new Set((fora || []).map((x) => String(x.email).toLowerCase()));
  const res: unknown[] = [];
  const pessoa = new Set<string>();
  for (const c of lista.slice(0, 10)) {
    const e = String(c.email).toLowerCase();
    if (enviado.has(c.payment_intent) || pagou.has(e) || saiu.has(e) || pessoa.has(e)) continue;
    try {
      const r = await fetch(`https://api.stripe.com/v1/payment_intents/${encodeURIComponent(c.payment_intent)}`, { headers: { authorization: `Bearer ${STRIPE}` } });
      if (!r.ok) continue;
      const pi = await r.json();
      const q = pi?.next_action?.pix_display_qr_code;
      if (pi.status !== "requires_action" || !q?.data) continue;
      if (q.expires_at && q.expires_at * 1000 < agora + 10 * MIN) continue;
      const ate = q.expires_at ? new Date(q.expires_at * 1000).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }).replace(", ", " às ") : undefined;
      // reserva antes de enviar: se duas execuções se cruzarem, só uma envia
      const { error } = await sb.from("bene_emails").insert({ email: e, modelo: "pix_0", chave: c.payment_intent });
      if (error) continue;
      pessoa.add(e);
      const env = await mandar(e, montar(c.nome || "", String(q.data), ate), `pix_0:${c.payment_intent}`);
      const j = await env.json().catch(() => ({}));
      if (env.ok) await sb.from("bene_emails").update({ resend_id: j.id ?? null }).match({ email: e, modelo: "pix_0", chave: c.payment_intent });
      else if (env.status === 429 || env.status >= 500) await sb.from("bene_emails").delete().match({ email: e, modelo: "pix_0", chave: c.payment_intent });
      else await sb.from("bene_emails").update({ erro: `${env.status} ${JSON.stringify(j).slice(0, 300)}` }).match({ email: e, modelo: "pix_0", chave: c.payment_intent });
      res.push({ ok: env.ok, status: env.status });
      await new Promise((ok) => setTimeout(ok, 600));
    } catch { /* tenta de novo na próxima rodada */ }
  }
  return { enviados: res.length, res };
}

Deno.serve(async (req: Request) => {
  const json = (o: unknown, status = 200) => new Response(JSON.stringify(o), { status, headers: { "content-type": "application/json; charset=utf-8" } });
  if (req.method !== "POST") return json({ erro: "metodo" }, 405);
  if (!RESEND || !RESPOSTA || !STRIPE) return json({ erro: "faltam segredos" }, 503);
  let b: Record<string, unknown> = {};
  try { b = await req.json(); } catch { /* corpo vazio */ }
  if (b.acao === "rodar") return json(await rodar());
  if (b.acao === "teste") {
    const r = await mandar(RESPOSTA, montar("Teste", "00020101021226880014br.gov.bcb.pix2566exemplo-de-codigo-pix-copia-e-cola-para-teste-da-bene5204000053039865406037.005802BR5913BENE6009SAO PAULO62070503***6304ABCD", "24/11 às 10:00"));
    return json({ ok: r.ok, status: r.status });
  }
  return json({ erro: "acao" }, 400);
});
