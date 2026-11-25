// Registra uma visita no Supabase com a cidade que a Vercel descobre pelo IP.
// O IP só é guardado nas visitas ao checkout e é apagado depois de 7 dias.
// Chamado pelo config.js em todas as páginas do site.
const SB = "https://acbksachtpypwtbgwyxh.supabase.co/rest/v1/bene_visitas";
// eventos do funil (rolagem, clique em comprar, lead, checkout…) vão para outra tabela
const SB_EV = "https://acbksachtpypwtbgwyxh.supabase.co/rest/v1/bene_eventos";
const EVENTOS = ["rolou_25", "rolou_50", "rolou_75", "rolou_100", "clique_comprar", "lead", "checkout_aberto", "pagamento_iniciado", "pix_gerado", "pix_copiado", "bump_marcado", "pago", "quiz_inicio", "quiz_resultado", "oferta_vista", "pag_visto", "pix_clique", "pix_erro", "pix_ja_paguei", "cartao_aberto", "cartao_erro", "pag_erro", "clique_impresso", "vsl_som", "vsl_25", "vsl_50", "vsl_75", "vsl_95"];
// chave pública "anon" (a mesma que pode ir no navegador); a tabela só aceita inserir, nunca ler
const CHAVE = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFjYmtzYWNodHB5cHd0Ymd3eXhoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE0Njc5NDQsImV4cCI6MjA4NzA0Mzk0NH0.U4qPmPr5ozsKOxQ8FfIE5rKOt2wms0s7KLuyE4Px1qk";

const corta = (v, n) => (v == null || v === "" ? null : String(v).slice(0, n));
const cab = (req, k) => {
  const v = req.headers[k];
  if (!v) return null;
  try { return decodeURIComponent(v); } catch { return v; }
};
const num = (v) => { const n = parseFloat(v); return Number.isFinite(n) ? Math.round(n * 100) / 100 : null; };

module.exports = async (req, res) => {
  res.setHeader("cache-control", "no-store");
  if (req.method !== "POST") { res.statusCode = 405; return res.end(); }
  let b = req.body;
  if (typeof b === "string") { try { b = JSON.parse(b); } catch { b = {}; } }
  b = b || {};
  if (b.evento) {
    if (!EVENTOS.includes(b.evento)) { res.statusCode = 400; return res.end(); }
    let dados = null;
    if (b.dados && typeof b.dados === "object") { const t = JSON.stringify(b.dados); if (t.length <= 1000) dados = b.dados; }
    const ev = { evento: b.evento, vid: corta(b.vid, 80), pagina: corta(b.pagina, 120), variante: corta(b.variante, 40), dados };
    try {
      await fetch(SB_EV, { method: "POST", headers: { apikey: CHAVE, authorization: `Bearer ${CHAVE}`, "content-type": "application/json", prefer: "return=minimal" }, body: JSON.stringify(ev) });
    } catch { /* evento perdido não atrapalha a página */ }
    res.statusCode = 204; return res.end();
  }
  const linha = {
    vid: corta(b.vid, 80),
    pagina: corta(b.pagina, 120) || "/",
    ref: corta(b.ref, 120),
    utm_source: corta(b.utm_source, 120),
    utm_campaign: corta(b.utm_campaign, 200),
    utm_content: corta(b.utm_content, 200),
    cidade: corta(cab(req, "x-vercel-ip-city"), 80),
    estado: corta(cab(req, "x-vercel-ip-country-region"), 10),
    pais: corta(cab(req, "x-vercel-ip-country"), 4),
    lat: num(cab(req, "x-vercel-ip-latitude")),
    lon: num(cab(req, "x-vercel-ip-longitude")),
    celular: !!b.celular,
  };
  // IP só de quem abre o checkout (para bloquear clonador de oferta); o banco apaga depois de 7 dias
  if (/^\/(kit\/)?checkout\//.test(linha.pagina)) {
    linha.ip = corta(String(req.headers["x-real-ip"] || String(req.headers["x-forwarded-for"] || "").split(",")[0] || "").trim(), 60);
  }
  try {
    await fetch(SB, {
      method: "POST",
      headers: { apikey: CHAVE, authorization: `Bearer ${CHAVE}`, "content-type": "application/json", prefer: "return=minimal" },
      body: JSON.stringify(linha),
    });
  } catch { /* visita perdida não atrapalha a página */ }
  res.statusCode = 204;
  res.end();
};
