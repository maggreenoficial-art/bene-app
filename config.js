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
(function () {
  var C = window.BENE_CONFIG;
  var q = new URLSearchParams(location.search);
  var keys = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term", "fbclid"];
  var utm = {};
  try { utm = JSON.parse(localStorage.getItem("bene_utm") || "{}"); } catch (e) {}
  keys.forEach(function (k) { if (q.get(k)) utm[k] = q.get(k); });
  try { localStorage.setItem("bene_utm", JSON.stringify(utm)); } catch (e) {}
  C.utm = utm;
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
  C.salvarLead = async function (lead) {
    if (!C.leadEndpoint) return;
    try { await fetch(C.leadEndpoint, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(lead), keepalive: true }); } catch (e) {}
  };
})();
