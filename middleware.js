// Bloqueio de visitante (ex.: quem está clonando a oferta).
// Quem tiver o cookie bene_b=1 (marcado pelo config.js) ou um IP da lista abaixo
// recebe só a página de alerta, em qualquer endereço do site. O resto do site não muda.
const IPS = [];
const SB_EV = "https://acbksachtpypwtbgwyxh.supabase.co/rest/v1/bene_eventos";
const CHAVE = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFjYmtzYWNodHB5cHd0Ymd3eXhoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE0Njc5NDQsImV4cCI6MjA4NzA0Mzk0NH0.U4qPmPr5ozsKOxQ8FfIE5rKOt2wms0s7KLuyE4Px1qk";

const PAGINA = `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>Acesso bloqueado</title>
<style>
*{box-sizing:border-box}body{margin:0;min-height:100vh;display:grid;place-items:center;background:#1c1512;color:#fff;font:17px/1.55 system-ui,-apple-system,Segoe UI,Roboto,sans-serif;padding:24px}
main{max-width:560px;background:#2a201b;border:3px solid #e5484d;border-radius:22px;padding:34px 28px;text-align:left}
.sinal{width:72px;height:72px;border-radius:50%;background:#e5484d;display:grid;place-items:center;font-size:42px;font-weight:900;margin-bottom:18px}
h1{font-size:34px;line-height:1.1;margin:0 0 14px}p{margin:0 0 14px;color:#f1e6df}strong{color:#fff}
.lei{background:#1c1512;border-radius:14px;padding:14px 16px;font-size:15px;color:#d9c9bf}
.fim{font-size:22px;font-weight:800;color:#ffb0b2;margin:20px 0 8px}small{color:#a8968b;font-size:13px}
</style></head><body><main>
<div class="sinal">!</div>
<h1>Acesso bloqueado</h1>
<p>Este acesso foi identificado <strong>copiando a página, a oferta e os materiais</strong> do app da Bené.</p>
<p class="lei">Textos, vídeos, a personagem Bené, as atividades e o kit foram criados por nós e são protegidos pela Lei de Direitos Autorais (Lei 9.610/98). Copiar e usar sem autorização é crime (art. 184 do Código Penal). Data, horário e localização deste acesso ficaram registrados.</p>
<p class="fim">Crie o seu próprio produto. Este aqui tem dono.</p>
<small>Se você é cliente e chegou aqui por engano, responda o e-mail da sua compra que a gente resolve.</small>
</main></body></html>`;

export const config = {
  matcher: ["/((?!api/|.*\\.(?:js|css|png|jpg|jpeg|webp|gif|svg|ico|mp4|mp3|wav|pdf|json|webmanifest|woff2?|ttf|txt|xml)$).*)"],
};

export default async function middleware(request) {
  try {
    const url = new URL(request.url);
    const ip = (request.headers.get("x-real-ip") || (request.headers.get("x-forwarded-for") || "").split(",")[0] || "").trim();
    const ck = request.headers.get("cookie") || "";
    const teste = url.searchParams.get("__bloq_teste") === "1";
    const bloq = teste || /(?:^|;\s*)bene_b=1(?:;|$)/.test(ck) || (ip && IPS.includes(ip));
    if (!bloq) return;
    if (!teste) {
      const dados = { ip, ua: (request.headers.get("user-agent") || "").slice(0, 200), cidade: request.headers.get("x-vercel-ip-city") || null, url: url.pathname };
      try {
        await Promise.race([
          fetch(SB_EV, { method: "POST", headers: { apikey: CHAVE, authorization: `Bearer ${CHAVE}`, "content-type": "application/json", prefer: "return=minimal" }, body: JSON.stringify({ evento: "bloqueado", pagina: url.pathname, dados }) }),
          new Promise((r) => setTimeout(r, 1500)),
        ]);
      } catch (e) {}
    }
    return new Response(PAGINA, { status: 403, headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store", "x-robots-tag": "noindex" } });
  } catch (e) {
    return;
  }
}
