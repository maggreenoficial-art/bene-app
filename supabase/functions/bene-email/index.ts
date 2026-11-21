// Envio dos e-mails da Bené pelo Resend.
// - {acao:"rodar"}: chamado pelo agendador a cada 2 minutos. Vê quem precisa receber o quê e envia.
//   {acao:"rodar", forcar:true}: mesmo envio, mas ignora o horário (8h às 21h) dos e-mails que não são de compra.
// - {acao:"teste", modelo?}: envia um modelo (ou todos) só para o e-mail de resposta (BENE_EMAIL_RESPOSTA).
// - {sair: token} ou POST ?sair=token: tira o e-mail da lista (página /sair/ e cancelamento de 1 clique).
// Segredos: RESEND_API_KEY e BENE_EMAIL_RESPOSTA. Sem eles, nada é enviado.
import { createClient } from "npm:@supabase/supabase-js@2";
import { montarEmail, SEQUENCIAS, SITE } from "./emails.ts";

const cors = { "access-control-allow-origin": "*", "access-control-allow-headers": "content-type", "access-control-allow-methods": "POST, OPTIONS" };
const json = (o: unknown, status = 200) => new Response(JSON.stringify(o), { status, headers: { ...cors, "content-type": "application/json; charset=utf-8" } });

const URL_SB = Deno.env.get("SUPABASE_URL")!;
const SRK = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const RESEND = Deno.env.get("RESEND_API_KEY") || "";
const RESPOSTA = (Deno.env.get("BENE_EMAIL_RESPOSTA") || "").trim();
const DE = "Bené, a Ovelhinha <ola@contatos.beneaovelhinha.online>";
const FUNC = `${URL_SB}/functions/v1/bene-email`;
const sb = createClient(URL_SB, SRK);

const MIN = 60_000;
const agora = () => Date.now();
const ignorar = (e: string) => !e || /@example\.com$/i.test(e) || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
const PRODUTOS_APROVADO = SEQUENCIAS.transacional as Record<string, string>;

// ---------- link para sair da lista ----------
// O token é o e-mail cifrado (AES-GCM): o link não mostra o e-mail de ninguém.
const b64u = (u8: Uint8Array) => btoa(String.fromCharCode(...u8)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const deb64u = (s: string) => Uint8Array.from(atob(s.replace(/-/g, "+").replace(/_/g, "/")), (c) => c.charCodeAt(0));
let chaveAes: CryptoKey | null = null;
async function aes() {
  if (!chaveAes) {
    const h = await crypto.subtle.digest("SHA-256", new TextEncoder().encode("bene-sair:" + SRK));
    chaveAes = await crypto.subtle.importKey("raw", h, "AES-GCM", false, ["encrypt", "decrypt"]);
  }
  return chaveAes;
}
async function token(email: string) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const c = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv }, await aes(), new TextEncoder().encode(email)));
  const out = new Uint8Array(12 + c.length); out.set(iv); out.set(c, 12);
  return b64u(out);
}
async function abrirToken(t: string) {
  try {
    const u = deb64u(String(t || ""));
    const p = await crypto.subtle.decrypt({ name: "AES-GCM", iv: u.slice(0, 12) }, await aes(), u.slice(12));
    return new TextDecoder().decode(p);
  } catch { return null; }
}
async function descadastrar(t: string) {
  const email = await abrirToken(t);
  if (!email) return null;
  await sb.from("bene_descadastros").upsert({ email, motivo: "pediu para sair" }, { onConflict: "email" });
  return email;
}

// ---------- envio ----------
type Tarefa = { email: string; nome: string; modelo: string; chave: string; pi?: string; marketing: boolean };

async function enviar(t: Tarefa, teste = false) {
  const tk = await token(t.email);
  const m = montarEmail(t.modelo, { nome: t.nome, email: t.email, pi: t.pi, sair: `${SITE}/sair/?t=${tk}` });
  if (!teste) {
    // reserva antes de enviar: se duas execuções se cruzarem, só uma envia
    const { error } = await sb.from("bene_emails").insert({ email: t.email, modelo: t.modelo, chave: t.chave });
    if (error) return { ok: false, motivo: "ja_reservado" };
  }
  const headers: Record<string, string> = {};
  if (m.marketing) {
    headers["List-Unsubscribe"] = `<${FUNC}?sair=${tk}>`;
    headers["List-Unsubscribe-Post"] = "List-Unsubscribe=One-Click";
  }
  const r = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { authorization: `Bearer ${RESEND}`, "content-type": "application/json", ...(teste ? {} : { "Idempotency-Key": `${t.modelo}:${t.chave}:${t.email}`.slice(0, 256) }) },
    body: JSON.stringify({
      from: DE, to: [t.email], reply_to: RESPOSTA, subject: m.assunto, html: m.html, text: m.texto, headers,
      tags: [{ name: "modelo", value: t.modelo }],
    }),
  });
  const j = await r.json().catch(() => ({}));
  if (teste) return { ok: r.ok, status: r.status, resposta: j };
  if (r.ok) {
    await sb.from("bene_emails").update({ resend_id: j.id ?? null }).match({ email: t.email, modelo: t.modelo, chave: t.chave });
    return { ok: true };
  }
  if (r.status === 429 || r.status >= 500) {
    // falha passageira: libera para tentar de novo na próxima rodada
    await sb.from("bene_emails").delete().match({ email: t.email, modelo: t.modelo, chave: t.chave });
  } else {
    await sb.from("bene_emails").update({ erro: `${r.status} ${JSON.stringify(j).slice(0, 300)}` }).match({ email: t.email, modelo: t.modelo, chave: t.chave });
  }
  return { ok: false, status: r.status };
}

// horário comercial em São Paulo (UTC-3) para e-mails que não são de compra
const horarioOk = () => { const h = (new Date().getUTCHours() + 21) % 24; return h >= 8 && h < 21; };

async function rodar(forcar = false) {
  const desde = (d: number) => new Date(agora() - d * 1440 * MIN).toISOString();
  const [{ data: compras }, { data: leads }, { data: enviados }, { data: fora }] = await Promise.all([
    sb.from("bene_compras").select("email,nome,produto,status,payment_intent,criado_em,pago_em").gte("criado_em", desde(60)),
    sb.from("bene_leads").select("email,nome,origem,criado_em,atualizado_em").gte("atualizado_em", desde(30)),
    sb.from("bene_emails").select("email,modelo,chave,enviado_em").gte("enviado_em", desde(60)),
    sb.from("bene_descadastros").select("email"),
  ]);
  const saiu = new Set((fora || []).map((x: { email: string }) => x.email.toLowerCase()));
  const enviado = new Map<string, number>();
  for (const e of enviados || []) enviado.set(`${e.email.toLowerCase()}|${e.modelo}|${e.chave}`, Date.parse(e.enviado_em));
  const tem = new Map<string, Set<string>>();
  for (const c of compras || []) if (c.status === "pago" && c.email) {
    const k = c.email.toLowerCase();
    if (!tem.has(k)) tem.set(k, new Set());
    tem.get(k)!.add(c.produto);
  }
  const possui = (e: string, p: string) => tem.get(e.toLowerCase())?.has(p) ?? false;

  const tarefas: Tarefa[] = [];
  const marketingOk = forcar || horarioOk(); // forcar: disparo manual fora do horário

  // próximo passo de uma sequência: respeita o atraso de cada e-mail e o intervalo entre eles
  function sequencia(email: string, nome: string, chave: string, base: number, passos: readonly (readonly [string, number])[], pi?: string, pular?: (m: string) => boolean, depoisDe = 0) {
    let ultimo = depoisDe, atrasoAnterior = 0;
    for (const [modelo, atraso] of passos) {
      const k = `${email.toLowerCase()}|${modelo}|${chave}`;
      if (enviado.has(k)) { ultimo = enviado.get(k)!; atrasoAnterior = atraso; continue; }
      if (pular?.(modelo)) return; // ex.: oferta de um produto que a pessoa já tem
      const quando = Math.max(base + atraso * MIN, ultimo ? ultimo + (atraso - atrasoAnterior) * MIN : 0);
      // a entrega das folhas grátis sai a qualquer hora; o resto, só de dia
      if (quando <= agora() && (marketingOk || modelo === "gratis_0")) tarefas.push({ email, nome, modelo, chave, pi, marketing: true });
      return;
    }
  }

  // 1) compra aprovada (últimas 48 h)
  for (const c of compras || []) {
    if (c.status !== "pago" || ignorar(c.email) || !PRODUTOS_APROVADO[c.produto]) continue;
    if (!c.pago_em || Date.parse(c.pago_em) < agora() - 2 * 1440 * MIN) continue;
    const modelo = PRODUTOS_APROVADO[c.produto];
    if (!enviado.has(`${c.email.toLowerCase()}|${modelo}|${c.payment_intent}`))
      tarefas.push({ email: c.email, nome: c.nome, modelo, chave: c.payment_intent, marketing: false });
  }

  // 2) recuperação: checkout iniciado e não pago nos últimos 4 dias (a sequência conta a partir da última tentativa)
  const abandonos = new Map<string, { email: string; nome: string; produto: string; base: number }>();
  for (const c of compras || []) {
    if (c.status === "pago" || ignorar(c.email) || !["app-bene", "kit"].includes(c.produto)) continue;
    const t = Date.parse(c.criado_em);
    if (t < agora() - 4 * 1440 * MIN) continue;
    const k = `${c.email.toLowerCase()}|${c.produto}`;
    const a = abandonos.get(k);
    if (!a || t > a.base) abandonos.set(k, { email: c.email.toLowerCase(), nome: c.nome || a?.nome || "", produto: c.produto, base: t });
  }
  for (const a of abandonos.values()) {
    if (saiu.has(a.email)) continue;
    if (possui(a.email, a.produto) || (a.produto === "kit" && possui(a.email, "app-bene"))) continue;
    sequencia(a.email, a.nome, `rec:${a.produto}`, a.base, a.produto === "kit" ? SEQUENCIAS.recuperacao_kit : SEQUENCIAS.recuperacao_app);
  }

  // 3) leads: folhas grátis e quem deixou o e-mail no quiz ou na página de vendas. Param quando compram o kit ou o app.
  // Quem abandonou o checkout fica primeiro com a recuperação e só entra aqui 2 dias depois do último lembrete.
  const abandonoMaisRecente = new Map<string, number>();
  for (const c of compras || []) {
    if (c.status === "pago" || c.origem || !["app-bene", "kit"].includes(c.produto) || !c.email) continue;
    const e = c.email.toLowerCase(), t = Date.parse(c.criado_em);
    if (t > (abandonoMaisRecente.get(e) || 0)) abandonoMaisRecente.set(e, t);
  }
  for (const l of leads || []) {
    const e = (l.email || "").toLowerCase();
    if (ignorar(e) || saiu.has(e) || possui(e, "kit") || possui(e, "app-bene")) continue;
    const gratis = l.origem === "gratis";
    if (!gratis && Date.parse(l.criado_em) < agora() - 30 * 1440 * MIN) continue;
    let base = Date.parse(gratis ? l.atualizado_em : l.criado_em);
    const abandono = abandonoMaisRecente.get(e);
    if (abandono && abandono > agora() - 30 * 1440 * MIN) {
      const ultimoLembrete = Math.max(enviado.get(`${e}|rec_app_4|rec:app-bene`) || 0, enviado.get(`${e}|rec_kit_4|rec:kit`) || 0);
      if (ultimoLembrete) base = Math.max(base, ultimoLembrete + 2 * 1440 * MIN - 120 * MIN);
      else if (abandono < agora() - 5 * 1440 * MIN) base = Math.max(base, abandono + 5 * 1440 * MIN);
      else if (!(gratis && !enviado.has(`${e}|gratis_0|gratis`))) continue; // recuperação em andamento (a entrega das folhas grátis sai mesmo assim)
    }
    sequencia(e, l.nome, "gratis", base, gratis ? SEQUENCIAS.folhas_gratis : SEQUENCIAS.nutricao);
  }

  // 4) pós-compra (compras dos últimos 10 dias); a oferta final só sai se a pessoa ainda não tem o produto
  for (const c of compras || []) {
    if (c.status !== "pago" || ignorar(c.email) || !c.pago_em || Date.parse(c.pago_em) < agora() - 10 * 1440 * MIN) continue;
    const e = c.email.toLowerCase();
    if (saiu.has(e) || !["app-bene", "kit"].includes(c.produto)) continue;
    // começa só depois do e-mail de compra aprovada, com pelo menos 12 h de intervalo
    const aprovado = enviado.get(`${e}|${PRODUTOS_APROVADO[c.produto]}|${c.payment_intent}`);
    if (!aprovado) continue;
    const depois = aprovado + 12 * 60 * MIN - 1440 * MIN; // o 1º passo tem atraso de 1 dia; isto garante o mínimo de 12 h
    if (c.produto === "app-bene")
      sequencia(e, c.nome, c.payment_intent, Date.parse(c.pago_em), SEQUENCIAS.pos_compra_app, c.payment_intent, (m) => m === "pos_app_3" && possui(e, "niveis56"), depois);
    if (c.produto === "kit" && !possui(e, "app-bene"))
      sequencia(e, c.nome, c.payment_intent, Date.parse(c.pago_em), SEQUENCIAS.pos_compra_kit, c.payment_intent, (m) => m === "pos_kit_3" && possui(e, "app-bene"), depois);
  }

  // no máximo 1 e-mail por pessoa por rodada; compra aprovada primeiro
  tarefas.sort((a, b) => Number(a.marketing) - Number(b.marketing));
  const vistos = new Set<string>();
  const res: unknown[] = [];
  for (const t of tarefas) {
    const e = t.email.toLowerCase();
    if (vistos.has(e)) continue;
    vistos.add(e);
    if (res.length >= 40) break;
    const r = await enviar({ ...t, email: e });
    res.push({ modelo: t.modelo, ...r });
    await new Promise((ok) => setTimeout(ok, 600)); // limite do Resend: 2 por segundo
  }
  return { enviados: res.length, horario_marketing: marketingOk, res };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  if (req.method !== "POST") return json({ erro: "metodo" }, 405);
  const q = new URL(req.url).searchParams.get("sair");
  if (q) return (await descadastrar(q)) ? new Response("ok") : new Response("link invalido", { status: 400 });
  let b: Record<string, unknown> = {};
  try { b = await req.json(); } catch { /* corpo vazio */ }
  if (b.sair) {
    const email = await descadastrar(String(b.sair));
    if (!email) return json({ erro: "link" }, 400);
    const [u, d] = email.split("@");
    return json({ ok: true, email: `${u.slice(0, 2)}***@${d}` });
  }
  if (!RESEND || !RESPOSTA) return json({ erro: "faltam os segredos RESEND_API_KEY e BENE_EMAIL_RESPOSTA" }, 503);
  if (b.acao === "rodar") return json(await rodar(b.forcar === true));
  if (b.acao === "teste") {
    const ids = b.modelo ? [String(b.modelo)] : [...Object.values(PRODUTOS_APROVADO), ...SEQUENCIAS.recuperacao_app.map((x) => x[0]), ...SEQUENCIAS.recuperacao_kit.map((x) => x[0]), ...SEQUENCIAS.folhas_gratis.map((x) => x[0]), "lead_0", ...SEQUENCIAS.pos_compra_app.map((x) => x[0]), ...SEQUENCIAS.pos_compra_kit.map((x) => x[0])];
    const out = [];
    for (const modelo of ids) {
      out.push({ modelo, ...(await enviar({ email: RESPOSTA, nome: "Teste", modelo, chave: "teste", pi: "pi_teste", marketing: true }, true)) });
      await new Promise((ok) => setTimeout(ok, 600));
    }
    return json({ para: RESPOSTA, out });
  }
  return json({ erro: "acao" }, 400);
});
