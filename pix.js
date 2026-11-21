/* Pix da Bené: tela própria com "Copiar código Pix" (no celular não dá para ler o QR Code do próprio aparelho),
   o Pix fica guardado no aparelho (se a pessoa sair para o app do banco e a página recarregar, o mesmo Pix volta)
   e a página confere o pagamento sozinha e avança quando ele é confirmado. Usado em /checkout/ e /kit/checkout/. */
window.BenePix = (function () {
  var KEY = function (k) { return "bene_pix_" + k; };
  var esc = function (s) { return String(s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); };

  function salvo(k, email) {
    try {
      var s = JSON.parse(localStorage.getItem(KEY(k)) || "null");
      if (s && s.email === email && s.exp * 1000 > Date.now() + 60000) return s;
    } catch (e) {}
    return null;
  }
  function limpar(k) { try { localStorage.removeItem(KEY(k)); } catch (e) {} }

  // confirma o Pix sem a janela do Stripe e devolve o código copia e cola
  async function gerar(o) {
    if (!o.stripe || typeof o.stripe.confirmPixPayment !== "function") return null;
    var r = await o.stripe.confirmPixPayment(o.clientSecret, { payment_method: { billing_details: o.billing } }, { handleActions: false });
    if (r.error) return { error: r.error };
    var pi = r.paymentIntent || {};
    if (pi.status === "succeeded" || pi.status === "processing") return { pago: pi };
    var na = pi.next_action && pi.next_action.pix_display_qr_code;
    if (!na || !na.data) return null;
    var s = { email: o.email, id: pi.id, cs: o.clientSecret, pk: o.pk, code: na.data, img: na.image_url_png || "", exp: na.expires_at || Math.floor(Date.now() / 1000) + 3600 };
    try { localStorage.setItem(KEY(o.k), JSON.stringify(s)); } catch (e) {}
    return { pix: s };
  }

  var css = false;
  function estilo() {
    if (css) return; css = true;
    var st = document.createElement("style");
    st.textContent =
      ".pix h2{font-size:1.45rem;margin:0 0 4px}" +
      ".pix .valor{font-family:'Baloo 2',sans-serif;font-weight:800;font-size:1.1rem;margin:0 0 14px;color:var(--tinta-suave)}" +
      ".pix ol{list-style:none;padding:0;margin:0 0 16px;display:grid;gap:10px;counter-reset:p}" +
      ".pix li{display:grid;grid-template-columns:34px 1fr;gap:10px;align-items:center;font-weight:700;counter-increment:p}" +
      ".pix li::before{content:counter(p);width:34px;height:34px;border:2.5px solid var(--tinta);border-radius:50%;display:grid;place-items:center;background:var(--sol);font-family:'Baloo 2',sans-serif;font-weight:800}" +
      ".pix .copiar{background:var(--pasto);margin-top:4px}" +
      ".pix .copiar.ok{background:var(--sol)}" +
      ".pix textarea{width:100%;font:600 .8rem/1.35 ui-monospace,monospace;color:var(--tinta-suave);background:var(--ceu-fundo);border:2px dashed var(--tinta);border-radius:12px;padding:10px;margin-top:12px;resize:none;height:62px;word-break:break-all}" +
      ".pix .esperando{display:flex;gap:10px;align-items:center;background:var(--ceu-claro);border:2.5px solid var(--tinta);border-radius:16px;padding:12px 14px;margin-top:14px;font-weight:800;font-size:.95rem}" +
      ".pix .esperando i{flex:0 0 22px;width:22px;height:22px;border:3px solid #fff;border-top-color:var(--azul);border-radius:50%;animation:gira .8s linear infinite}" +
      ".pix details{margin-top:14px;font-weight:700}" +
      ".pix summary{cursor:pointer;font-weight:800}" +
      ".pix .qr{display:block;width:220px;height:220px;margin:12px auto 0;border:2.5px solid var(--tinta);border-radius:14px;background:#fff;padding:8px}" +
      ".pix .validade{font-size:.85rem;color:var(--tinta-suave);font-weight:700;margin:10px 0 0;text-align:center}" +
      ".pix .trocar{appearance:none;background:none;border:0;font:inherit;font-weight:800;text-decoration:underline;color:var(--tinta);cursor:pointer;padding:10px 4px;margin-top:6px;display:block}" +
      ".pix .expirou{background:var(--sol-claro);border:2.5px dashed var(--tinta);border-radius:16px;padding:12px 14px;margin-top:14px;font-weight:700}" +
      "@media (min-width:860px){.pix details{display:block}}";
    document.head.appendChild(st);
  }

  var timer = null;
  function parar() { if (timer) { clearInterval(timer); timer = null; } }

  // o: { el, s, valor, stripe, k, onPago(id, status), onCartao(), onExpirou() }
  function mostrar(o) {
    estilo(); parar();
    var s = o.s, el = o.el;
    var desk = window.matchMedia("(min-width:860px)").matches;
    var hora = new Date(s.exp * 1000).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
    el.innerHTML =
      '<div class="pix">' +
        "<h2>Seu Pix está pronto!</h2>" +
        '<p class="valor">' + esc(o.valor) + "</p>" +
        "<ol>" +
          "<li><span>Toque no botão verde para copiar o código</span></li>" +
          "<li><span>Abra o app do seu banco e escolha <b>Pix Copia e Cola</b></span></li>" +
          "<li><span>Cole o código e confirme. Pronto!</span></li>" +
        "</ol>" +
        '<button class="botao copiar" type="button"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h10"/></svg><span>Copiar código Pix</span></button>' +
        '<textarea readonly aria-label="Código Pix copia e cola">' + esc(s.code) + "</textarea>" +
        '<div class="esperando" role="status"><i aria-hidden="true"></i><span>Assim que o pagamento cair, esta página avança sozinha e libera o seu acesso.</span></div>' +
        (s.img ? "<details" + (desk ? " open" : "") + "><summary>Pagar lendo o QR Code (com outro aparelho)</summary><img class=\"qr\" alt=\"QR Code do Pix\" src=\"" + esc(s.img) + "\"></details>" : "") +
        '<p class="validade">Este Pix vale até ' + esc(hora) + "</p>" +
        '<button class="trocar" type="button">Prefiro pagar com cartão</button>' +
      "</div>";
    el.hidden = false;
    var b = el.querySelector(".copiar"), bt = b.querySelector("span"), ta = el.querySelector("textarea");
    b.addEventListener("click", async function () {
      var ok = false;
      try { await navigator.clipboard.writeText(s.code); ok = true; } catch (e) {}
      if (!ok) { try { ta.focus(); ta.select(); ta.setSelectionRange(0, 99999); ok = document.execCommand("copy"); } catch (e) {} }
      if (ok) { b.classList.add("ok"); bt.textContent = "Copiado! Agora abra o app do banco"; } else { ta.focus(); ta.select(); bt.textContent = "Segure o código abaixo e copie"; }
      try { window.BENE_CONFIG && BENE_CONFIG.trackCustom("PixCopiado", {}); } catch (e) {}
    });
    ta.addEventListener("focus", function () { ta.select(); });
    el.querySelector(".trocar").addEventListener("click", function () { parar(); el.hidden = true; o.onCartao && o.onCartao(); });

    var conferindo = false;
    async function conferir() {
      if (conferindo) return; conferindo = true;
      try {
        var r = await o.stripe.retrievePaymentIntent(s.cs), pi = r && r.paymentIntent;
        if (pi && (pi.status === "succeeded" || pi.status === "processing")) { parar(); limpar(o.k); o.onPago(pi.id, pi.status); }
        else if (pi && (pi.status === "requires_payment_method" || pi.status === "canceled")) {
          parar(); limpar(o.k);
          el.querySelector(".esperando").outerHTML = '<div class="expirou">Este Pix expirou. Toque abaixo para gerar um novo.</div>';
          el.querySelector(".copiar").remove(); ta.remove();
          el.querySelector(".trocar").textContent = "Gerar um novo pagamento";
        }
      } catch (e) {}
      conferindo = false;
    }
    timer = setInterval(conferir, 3000);
    document.addEventListener("visibilitychange", function () { if (document.visibilityState === "visible") conferir(); });
    window.addEventListener("focus", conferir);
    conferir();
  }

  return { salvo: salvo, limpar: limpar, gerar: gerar, mostrar: mostrar, parar: parar };
})();
