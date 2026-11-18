/* ====== CONFIGURE AQUI (vale para a página de vendas e para o quiz) ====== */
window.BENE_CONFIG = {
  // Opção A (sua API Stripe): endpoint que recebe {nome,email,whats,utm} e responde {url: "https://checkout.stripe.com/..."}
  checkoutApi: "",
  // Opção B (link de pagamento do Stripe), usado se checkoutApi estiver vazio
  checkoutUrl: "https://buy.stripe.com/SEU_LINK_AQUI",
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
    if (C.checkoutApi) {
      var r = await fetch(C.checkoutApi, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(lead) });
      var j = await r.json();
      if (!j.url) throw new Error("sem url");
      location.href = j.url; return;
    }
    var u = new URL(C.checkoutUrl);
    if (lead && lead.email) u.searchParams.set("prefilled_email", lead.email);
    Object.keys(utm).forEach(function (k) { if (k.indexOf("utm_") === 0) u.searchParams.set(k, utm[k]); });
    var v = (lead && lead.variante) || C.variante(); if (v) u.searchParams.set("client_reference_id", v);
    location.href = u.toString();
  };
  C.salvarLead = async function (lead) {
    if (!C.leadEndpoint) return;
    try { await fetch(C.leadEndpoint, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(lead), keepalive: true }); } catch (e) {}
  };
})();
