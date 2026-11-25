/* ====== CONFIGURE AQUI (vale para a página de vendas e para o quiz) ====== */
window.BENE_CONFIG = {
  // Checkout transparente (cartão, Pix, Apple Pay e Google Pay) na página /checkout/.
  // As chaves do Stripe NÃO ficam aqui: ficam nos secrets do Supabase (STRIPE_SECRET_KEY e STRIPE_PUBLISHABLE_KEY).
  checkoutEndpoint: "https://acbksachtpypwtbgwyxh.supabase.co/functions/v1/bene-checkout",
  // Salva o lead antes do pagamento
  leadEndpoint: "https://acbksachtpypwtbgwyxh.supabase.co/functions/v1/bene-lead",
  // ID do Pixel da Meta (só os números)
  pixelId: "1170302909276144",
  preco: 37,
  // Teste A/B do link /comecar/: porcentagem que vai para o quiz (o resto vai para a página de vendas)
  quizPct: 50
};

/* Daqui para baixo não precisa mexer */
/* Celular com "fonte grande" (ex.: navegador do Instagram no Android com fonte em 130%):
   nas páginas marcadas com <html data-fonte>, segura o aumento em no máximo 10% para o layout não quebrar. */
(function () {
  var h = document.documentElement;
  if (!h.hasAttribute("data-fonte")) return;
  try {
    var d = document.createElement("div");
    d.style.cssText = "position:absolute;left:-9999px;top:0;font-size:100px;line-height:1;visibility:hidden;white-space:nowrap";
    d.textContent = "M"; h.appendChild(d);
    var z = d.getBoundingClientRect().height / 100; h.removeChild(d);
    if (z > 1.05 && z < 3) { h.style.fontSize = (100 * Math.min(z, 1.1) / z).toFixed(1) + "%"; h.setAttribute("data-fonte", z.toFixed(2)); }
  } catch (e) {}
})();
/* Visitantes bloqueados (ex.: clonador de oferta). Põe o id do visitante (vid do painel) na lista.
   O navegador dele ganha o cookie bene_b e, a partir daí, o servidor só entrega a página de alerta. */
(function () {
  var BLOQ = ["a4c70419-895b-43b4-99fa-6b7f8147cf50"];
  function bloqueia() {
    try { document.documentElement.style.display = "none"; } catch (e) {}
    document.cookie = "bene_b=1; path=/; max-age=63072000; samesite=lax; secure";
    try { localStorage.setItem("bene_b", "1"); } catch (e) {}
    window.BENE_SEM_PIXEL = true; window.BENE_SEM_VISITA = true;
    if (/[?&]r=\d/.test(location.search)) {
      // o servidor não barrou (sem cookie?): mostra o alerta aqui mesmo, sem recarregar de novo
      document.addEventListener("DOMContentLoaded", function () {
        document.body.innerHTML = '<div style="font:18px/1.5 system-ui;max-width:520px;margin:60px auto;padding:24px;color:#fff;background:#2a201b;border:3px solid #e5484d;border-radius:20px"><h1 style="margin:0 0 12px">Acesso bloqueado</h1><p>Este acesso foi identificado copiando a página, a oferta e os materiais do app da Bené. O conteúdo é protegido pela Lei 9.610/98.</p></div>';
        document.body.style.background = "#1c1512"; document.documentElement.style.display = "";
      });
      return;
    }
    location.replace(location.pathname + "?r=" + Date.now());
  }
  function checa() {
    var v = ""; try { v = localStorage.getItem("bene_vid") || ""; } catch (e) {}
    try { var t = window.ltUtm && window.ltUtm(); if (t && t.vid) v = String(t.vid); } catch (e) {}
    var b = ""; try { b = localStorage.getItem("bene_b") || ""; } catch (e) {}
    if (b === "1" || (v && BLOQ.indexOf(v) >= 0)) { window.BENE_BLOQ = true; bloqueia(); return true; }
    return false;
  }
  if (!checa()) { var n = 0; (function de_novo() { if (window.BENE_BLOQ || n++ > 20) return; if (!checa()) setTimeout(de_novo, 250); })(); }
})();
(function () {
  var C = window.BENE_CONFIG;
  var q = new URLSearchParams(location.search);
  var keys = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term", "fbclid"];
  var utm = {};
  try { utm = JSON.parse(localStorage.getItem("bene_utm") || "{}"); } catch (e) {}
  keys.forEach(function (k) { if (q.get(k)) utm[k] = q.get(k); });
  try { localStorage.setItem("bene_utm", JSON.stringify(utm)); } catch (e) {}
  C.utm = utm;
  // acesso interno (você testando): abra qualquer página com ?interno=1 uma vez neste aparelho.
  // A partir daí este aparelho não dispara o pixel nem conta visitas/eventos no painel. ?interno=0 desfaz.
  try {
    if (q.get("interno") === "1") localStorage.setItem("bene_interno", "1");
    if (q.get("interno") === "0") localStorage.removeItem("bene_interno");
  } catch (e) {}
  C.interno = /^(localhost|127\.0\.0\.1)$/.test(location.hostname);
  try { if (localStorage.getItem("bene_interno") === "1") C.interno = true; } catch (e) {}
  if (C.interno) window.BENE_SEM_PIXEL = true;
  if (C.pixelId && !window.BENE_SEM_PIXEL) {
    !function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');
    fbq('init', C.pixelId); fbq('track', 'PageView');
  }
  C.track = function (ev, data) { if (window.fbq) fbq('track', ev, data || {}); };
  C.trackCustom = function (ev, data) { if (window.fbq) fbq('trackCustom', ev, data || {}); };
  C.variante = function () { try { return localStorage.getItem("bene_variante") || ""; } catch (e) { return ""; } };
  C.irParaPagamento = async function (lead) {
    var dados = { nome: lead.nome, email: lead.email, whats: lead.whats || lead.whatsapp, variante: lead.variante || C.variante() };
    try { localStorage.setItem("bene_checkout", JSON.stringify(dados)); } catch (e) {}
    location.href = "/checkout/" + location.search;
  };
  C.acessoEndpoint = C.checkoutEndpoint.replace("bene-checkout", "bene-acesso");
  C.upsellEndpoint = C.checkoutEndpoint.replace("bene-checkout", "bene-upsell");
  // conta uma compra no pixel uma vez só (o mesmo id vai pela API de Conversões, a Meta junta os dois)
  C.contarCompra = function (id, valor, nome) {
    var k = "bene_purchase_" + id, ja = false;
    try { ja = !!localStorage.getItem(k); localStorage.setItem(k, "1"); } catch (e) {}
    if (!ja && window.fbq) fbq("track", "Purchase", { value: valor, currency: "BRL", content_name: nome }, { eventID: id });
  };
  // compra principal confirmada no Stripe: deixa o aplicativo aberto neste aparelho e conta a compra
  C.compraConfirmada = function (id, dados) {
    var lead = {};
    try { lead = JSON.parse(localStorage.getItem("bene_checkout") || "{}"); } catch (e) {}
    var email = String(dados.email || lead.email || "").toLowerCase();
    var temApp = (dados.produtos || []).indexOf("app-bene") >= 0 || dados.produto === "app-bene" || !dados.produto;
    if (email && temApp) {
      var antes = {}; try { antes = JSON.parse(localStorage.getItem("bene_user") || "{}") || {}; } catch (e) {}
      var prods = ["app-bene"].concat(dados.produtos || [], antes.email === email ? (antes.produtos || []) : []).filter(function (p, i, a) { return a.indexOf(p) === i; });
      var u = { nome: dados.nome || lead.nome || "", email: email, whatsapp: String(lead.whats || "").replace(/\D/g, ""), sent: true, pago: true, produtos: prods };
      try { localStorage.setItem("bene_user", JSON.stringify(u)); } catch (e) {}
    }
    C.contarCompra(id, dados.valor ? dados.valor / 100 : C.preco, dados.produto || "app-bene");
  };
  C.addProduto = function (p) {
    try { var u = JSON.parse(localStorage.getItem("bene_user") || "null"); if (u) { u.produtos = u.produtos || []; if (u.produtos.indexOf(p) < 0) u.produtos.push(p); localStorage.setItem("bene_user", JSON.stringify(u)); } } catch (e) {}
  };
  // id do visitante: o do Métricas Rápida (t.js) quando existe, para juntar visita, lead e compra
  C.vid = function () {
    try { var t = window.ltUtm && window.ltUtm(); if (t && t.vid) { try { localStorage.setItem("bene_vid", String(t.vid)); } catch (e2) {} return String(t.vid); } } catch (e) {}
    try { var v = localStorage.getItem("bene_vid"); if (!v) { v = "b" + Date.now().toString(36) + Math.random().toString(36).slice(2, 8); localStorage.setItem("bene_vid", v); } return v; } catch (e) { return ""; }
  };
  // registra a visita (página, origem e cidade) para o painel
  (function visita() {
    if (window.BENE_SEM_VISITA) return;
    var n = 0;
    (function enviar() {
      if (!window.ltUtm && n++ < 15) return setTimeout(enviar, 200);
      var ref = ""; try { ref = document.referrer ? new URL(document.referrer).hostname : ""; } catch (e) {}
      if (ref === location.hostname) ref = "";
      var b = { vid: C.vid(), pagina: location.pathname, ref: ref, utm_source: utm.utm_source || "", utm_campaign: utm.utm_campaign || "", utm_content: utm.utm_content || "", celular: /Mobi|Android|iPhone/i.test(navigator.userAgent) };
      if (!C.interno) try { fetch("/api/v", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(b), keepalive: true }); } catch (e) {}
    })();
  })();
  // eventos do funil (painel: aba Funil). Cada evento conta uma vez por página aberta.
  var ja = {};
  C.evento = function (ev, dados, repetir) {
    if (!repetir && ja[ev]) return; ja[ev] = 1;
    var b = { evento: ev, vid: C.vid(), pagina: location.pathname, variante: C.variante(), dados: dados || null };
    if (!C.interno) try { fetch("/api/v", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(b), keepalive: true }); } catch (e) {}
  };
  // clique em comprar e início do quiz, em qualquer página
  document.addEventListener("click", function (e) {
    var el = e.target && e.target.closest ? e.target.closest('.abrir-checkout, .comprar, a[href^="/checkout/"], .cta-comprar') : null;
    if (el) C.evento("clique_comprar", { texto: (el.textContent || "").trim().slice(0, 40) });
    if (e.target && e.target.closest && e.target.closest("#comecar")) C.evento("quiz_inicio");
  }, true);
  // até onde a pessoa rola as páginas de venda
  if (/^\/(oferta|veja|vsl|metodo)\/$/.test(location.pathname)) {
    var marcas = [25, 50, 75, 100];
    var rolou = function () {
      var h = document.documentElement.scrollHeight - innerHeight; if (h <= 0) return;
      var p = (scrollY / h) * 100;
      while (marcas.length && p >= marcas[0] - 2) C.evento("rolou_" + marcas.shift());
      if (!marcas.length) removeEventListener("scroll", rolou);
    };
    addEventListener("scroll", rolou, { passive: true });
  }
  C.salvarLead = async function (lead) {
    C.evento("lead", { origem: lead.origem || "" });
    if (!C.leadEndpoint) return;
    lead = Object.assign({}, lead, { dados: Object.assign({}, lead.dados || {}, { vid: C.vid() }) });
    try { await fetch(C.leadEndpoint, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(lead), keepalive: true }); } catch (e) {}
  };
})();
