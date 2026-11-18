/* ====== CONFIGURE AQUI (vale para a página de vendas e para o quiz) ====== */
window.BENE_CONFIG = {
  // Checkout transparente (cartão, Pix, Apple Pay e Google Pay) na página /checkout/.
  // As chaves do Stripe NÃO ficam aqui: ficam nos secrets do Supabase (STRIPE_SECRET_KEY e STRIPE_PUBLISHABLE_KEY).
  checkoutEndpoint: "https://acbksachtpypwtbgwyxh.supabase.co/functions/v1/bene-checkout",
  // Salva o lead antes do pagamento
  leadEndpoint: "https://acbksachtpypwtbgwyxh.supabase.co/functions/v1/bene-lead",
  // ID do Pixel da Meta (só os números)
  pixelId: "",
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
  C.salvarLead = async function (lead) {
    if (!C.leadEndpoint) return;
    try { await fetch(C.leadEndpoint, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(lead), keepalive: true }); } catch (e) {}
  };
})();
