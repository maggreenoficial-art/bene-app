/* Páginas de oferta depois da compra (Upsell 1 → Upsell 2 → Downsell → acesso).
   Cada página define window.UPSELL = { oferta, valor, sim, nao, botao }  (sim/nao = próxima página ou "fim") */
(function () {
  var C = window.BENE_CONFIG, U = window.UPSELL, q = new URLSearchParams(location.search), pi = q.get("pi") || "";
  var $ = function (id) { return document.getElementById(id); };
  var sim = $("sim"), nao = $("nao"), msg = $("msg"), dados = {};
  function final() { location.replace("/obrigado/?payment_intent=" + encodeURIComponent(pi)); }
  function proximo(url) { if (url === "fim") final(); else location.replace(url + "?pi=" + encodeURIComponent(pi)); }
  if (!/^pi_/.test(pi)) { location.replace("/"); return; }
  C.trackCustom("OfertaVista", { oferta: U.oferta, valor: U.valor });
  if (C.evento) C.evento("oferta_vista", { pi: pi, oferta: U.oferta });
  try { localStorage.setItem("bene_ofertas_" + pi, "1"); } catch (e) {}

  function texto(t) { sim.querySelector("span").textContent = t; }
  function ocupado(b, t) { sim.disabled = b; texto(t || (U.botaoAtual ? U.botaoAtual() : U.botao)); }

  // confere a compra principal (e se já tem este produto)
  fetch(C.acessoEndpoint, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ payment_intent: pi }) })
    .then(function (r) { return r.json(); })
    .then(function (j) {
      if (j.status !== "pago") { final(); return; }
      dados = j; C.compraConfirmada(pi, j);
      var tem = j.produtos || [];
      if (tem.indexOf(U.libera || U.oferta) >= 0 || (U.oferta === "livro_nome" && tem.indexOf("livro") >= 0)) { proximo(U.sim); return; }
      // voltou de um pagamento com redirecionamento
      if (q.get("payment_intent") && q.get("redirect_status") === "succeeded") sucesso(q.get("payment_intent"));
    }).catch(function () {});

  nao.onclick = function (e) { e.preventDefault(); C.trackCustom("OfertaRecusada", { oferta: U.oferta }); proximo(U.nao); };
  sim.onclick = function () { comprar("auto"); };

  function erroComOutro(t) {
    ocupado(false);
    msg.innerHTML = t + ' <button type="button" class="link" id="outro">Pagar com Pix ou outro cartão</button>';
    $("outro").onclick = function () { comprar("novo"); };
  }
  function comprar(modo) {
    if (U.antes) U.antes();
    ocupado(true, "Processando…"); msg.textContent = "";
    fetch(C.upsellEndpoint, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ pi: pi, oferta: U.oferta, modo: modo }) })
      .then(function (r) { return r.json(); })
      .then(function (j) {
        if (j.status === "pago") return sucesso(j.id);
        if (j.status === "ja_tem") return proximo(U.sim);
        if (j.status === "acao") return autenticar(j);
        if (j.status === "novo") return pagarNaPagina(j);
        if (j.status === "recusado") return erroComOutro("O cartão da compra não aprovou este valor. Nada foi cobrado.");
        if (j.erro === "nao_pago") return final();
        ocupado(false); msg.textContent = "Não deu certo agora. Tente de novo em alguns segundos.";
      })
      .catch(function () { ocupado(false); msg.textContent = "Sem conexão com a internet. Tente de novo."; });
  }
  function sucesso(id) {
    C.contarCompra(id, U.valor, U.oferta); C.addProduto(U.libera || U.oferta);
    sim.disabled = true; texto("Pronto, liberado!");
    var pg = $("pagar"); if (pg) pg.hidden = true;
    setTimeout(function () { proximo(U.sim); }, 900);
  }

  var stripe = null, vigiando = false;
  function carregarStripe(pk) {
    return new Promise(function (ok, falha) {
      if (stripe) return ok(stripe);
      var s = document.createElement("script"); s.src = "https://js.stripe.com/v3/";
      s.onload = function () { stripe = Stripe(pk, { locale: "pt-BR" }); ok(stripe); }; s.onerror = falha;
      document.head.appendChild(s);
    });
  }
  // o banco pediu confirmação do cartão (3D Secure)
  function autenticar(j) {
    carregarStripe(j.publishableKey).then(function (st) { return st.confirmCardPayment(j.clientSecret, { payment_method: j.pm }); })
      .then(function (r) {
        if (r.error) return erroComOutro("O banco não confirmou o pagamento. Nada foi cobrado.");
        var p = r.paymentIntent;
        if (p && (p.status === "succeeded" || p.status === "processing")) sucesso(p.id);
        else erroComOutro("O pagamento não foi concluído. Nada foi cobrado.");
      }, function () { ocupado(false); msg.textContent = "Não foi possível abrir o pagamento. Tente de novo."; });
  }
  // pagar na própria página: Pix (para quem comprou com Pix) ou outro cartão
  function pagarNaPagina(j) {
    carregarStripe(j.publishableKey).then(function (st) {
      var lead = {}; try { lead = JSON.parse(localStorage.getItem("bene_checkout") || "{}"); } catch (e) {}
      var whats = String(lead.whats || "").replace(/\D/g, ""), nome = dados.nome || lead.nome || "", email = dados.email || lead.email || "";
      var bd = { name: nome, email: email }; if (whats) bd.phone = "+55" + whats;
      var els = st.elements({
        clientSecret: j.clientSecret,
        fonts: [{ cssSrc: "https://fonts.googleapis.com/css2?family=Nunito:wght@600;700;800&display=swap" }],
        appearance: { theme: "stripe", variables: { colorPrimary: "#4A3426", colorText: "#4A3426", colorBackground: "#FFFFFF", colorDanger: "#B3261E", fontFamily: "Nunito, system-ui, sans-serif", fontSizeBase: "16px", borderRadius: "14px" },
          rules: { ".AccordionItem": { border: "2.5px solid #4A3426", boxShadow: "3px 3px 0 #4A3426", fontWeight: "800" }, ".AccordionItem--selected": { backgroundColor: "#FFF4D6" }, ".Input": { border: "2px solid #4A3426", boxShadow: "none" } } }
      });
      var pe = els.create("payment", {
        layout: { type: "accordion", defaultCollapsed: false, radios: true, spacedAccordionItems: true },
        paymentMethodOrder: ["pix", "card", "apple_pay", "google_pay"],
        fields: { billingDetails: { name: nome ? "never" : "auto", email: email ? "never" : "auto", phone: whats ? "never" : "auto" } },
        business: { name: "Bené" }
      });
      sim.hidden = true; $("pagar").hidden = false; pe.mount("#pe"); msg.textContent = "";
      var bt = $("pagarBtn");
      pe.on("change", function (ev) { var m = ev.value && ev.value.type; bt.textContent = m === "pix" ? "Gerar o Pix de " + U.precoTxt : "Pagar " + U.precoTxt; });
      bt.onclick = function () {
        bt.disabled = true; msg.textContent = "";
        st.confirmPayment({ elements: els, confirmParams: { return_url: location.origin + location.pathname + "?pi=" + encodeURIComponent(pi), payment_method_data: { billing_details: bd } }, redirect: "if_required" })
          .then(function (r) {
            if (r.error) { bt.disabled = false; msg.textContent = r.error.message || "O pagamento não foi concluído."; return; }
            var p = r.paymentIntent;
            if (p.status === "succeeded" || p.status === "processing") return sucesso(p.id);
            // Pix: o QR Code foi mostrado; espera a confirmação
            bt.disabled = false; bt.textContent = "Ver o Pix de novo";
            msg.textContent = "Assim que o Pix for pago, esta página continua sozinha.";
            if (vigiando) return; vigiando = true;
            var iv = setInterval(function () {
              st.retrievePaymentIntent(j.clientSecret).then(function (x) { var p2 = x.paymentIntent; if (p2 && (p2.status === "succeeded" || p2.status === "processing")) { clearInterval(iv); sucesso(p2.id); } });
            }, 3000);
          });
      };
    }, function () { ocupado(false); msg.textContent = "Não foi possível abrir o pagamento. Tente de novo."; });
  }
})();
