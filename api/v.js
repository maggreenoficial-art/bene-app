// Registra uma visita no Supabase com a cidade que a Vercel descobre pelo IP (o IP não é guardado).
// Chamado pelo config.js em todas as páginas do site.
const SB = "https://acbksachtpypwtbgwyxh.supabase.co/rest/v1/bene_visitas";
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
