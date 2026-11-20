// Livrinho da Bené: "[nome] e a Bené" (produtos extras "livro" = com bonequinho personalizado, "livro_nome" = só com o nome)
// Usado no aplicativo e na página da oferta (prévia). Desenhos em SVG, sem fotos.
(function () {
  'use strict';
  var INK = '#4a3426';
  var PELES = ['#f8d9bd', '#e8b48a', '#c58a5c', '#8a5634'];
  var CABELOS = ['#2b1d14', '#6b3e1f', '#d9a441', '#b5462a'];
  var ROUPAS = ['#5ba8e8', '#f26b6b', '#5fa84f', '#f2ae16'];
  var NOMES = { pele: ['Clara', 'Média', 'Morena', 'Escura'], cab: ['Preto', 'Castanho', 'Loiro', 'Ruivo'], roupa: ['Azul', 'Vermelha', 'Verde', 'Amarela'] };

  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

  // bonequinho da criança (viewBox 0 0 200 300)
  function avatar(o) {
    o = o || {};
    var pele = PELES[o.pele | 0] || PELES[0], cab = CABELOS[o.cab | 0] || CABELOS[0], roupa = ROUPAS[o.roupa | 0] || ROUPAS[0];
    var f = o.g === 'f', cach = o.tipo === 'cacheado', s = 'stroke="' + INK + '" stroke-width="6" stroke-linejoin="round" stroke-linecap="round"';
    var g = '';
    // cabelo de trás (comprido)
    if (f && !cach) g += '<path d="M44 92 Q40 190 70 200 L130 200 Q160 190 156 92 Z" fill="' + cab + '" ' + s + '/>';
    if (f && cach) g += [[52, 150], [148, 150], [46, 120], [154, 120], [60, 178], [140, 178]].map(function (c) { return '<circle cx="' + c[0] + '" cy="' + c[1] + '" r="26" fill="' + cab + '" ' + s + '/>'; }).join('');
    // pernas e corpo
    g += '<rect x="72" y="228" width="22" height="56" rx="10" fill="' + pele + '" ' + s + '/><rect x="106" y="228" width="22" height="56" rx="10" fill="' + pele + '" ' + s + '/>';
    g += '<ellipse cx="82" cy="286" rx="18" ry="9" fill="' + INK + '"/><ellipse cx="118" cy="286" rx="18" ry="9" fill="' + INK + '"/>';
    if (f) g += '<path d="M58 238 L68 160 L132 160 L142 238 Z" fill="' + roupa + '" ' + s + '/>';
    else g += '<rect x="66" y="208" width="68" height="34" rx="10" fill="#3b5b8f" ' + s + '/><rect x="64" y="158" width="72" height="66" rx="22" fill="' + roupa + '" ' + s + '/>';
    ['M66 172 Q40 196 46 222', 'M134 172 Q160 196 154 222'].forEach(function (d) { g += '<path d="' + d + '" fill="none" stroke="' + INK + '" stroke-width="30" stroke-linecap="round"/><path d="' + d + '" fill="none" stroke="' + roupa + '" stroke-width="18" stroke-linecap="round"/>'; });
    g += '<circle cx="46" cy="226" r="11" fill="' + pele + '" ' + s + '/><circle cx="154" cy="226" r="11" fill="' + pele + '" ' + s + '/>';
    g += '<rect x="90" y="140" width="20" height="22" fill="' + pele + '" ' + s + '/>';
    // cabeça
    g += '<circle cx="100" cy="96" r="56" fill="' + pele + '" ' + s + '/>';
    g += '<ellipse cx="44" cy="100" rx="9" ry="13" fill="' + pele + '" ' + s + '/><ellipse cx="156" cy="100" rx="9" ry="13" fill="' + pele + '" ' + s + '/>';
    // cabelo da frente
    if (cach) g += [[60, 66, 20], [80, 50, 22], [104, 44, 24], [128, 50, 22], [146, 68, 20], [154, 90, 14], [46, 90, 14]].map(function (c) { return '<circle cx="' + c[0] + '" cy="' + c[1] + '" r="' + c[2] + '" fill="' + cab + '" ' + s + '/>'; }).join('');
    else g += '<path d="M44 98 Q42 36 100 36 Q158 36 156 98 Q150 72 126 66 Q110 80 78 70 Q58 76 44 98 Z" fill="' + cab + '" ' + s + '/>';
    if (f && !cach) g += '<circle cx="150" cy="58" r="11" fill="' + roupa + '" ' + s + '/>';
    // rosto
    g += '<ellipse cx="80" cy="102" rx="7" ry="9" fill="' + INK + '"/><ellipse cx="120" cy="102" rx="7" ry="9" fill="' + INK + '"/><circle cx="82" cy="98" r="2.6" fill="#fff"/><circle cx="122" cy="98" r="2.6" fill="#fff"/>';
    g += '<ellipse cx="68" cy="120" rx="10" ry="6" fill="#f4a3a3" opacity=".7"/><ellipse cx="132" cy="120" rx="10" ry="6" fill="#f4a3a3" opacity=".7"/>';
    g += '<path d="M86 124 Q100 138 114 124" fill="none" stroke="' + INK + '" stroke-width="5" stroke-linecap="round"/>';
    return g;
  }
  function avatarSvg(o, w) { return '<svg viewBox="0 0 200 300" width="' + (w || 120) + '" role="img" aria-label="Bonequinho da criança">' + avatar(o) + '</svg>'; }

  // ---------- cenários (viewBox 0 0 600 420)
  var nGrad = 0;
  function ceu(a, b) { var id = 'lvceu' + (++nGrad); return '<defs><linearGradient id="' + id + '" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="' + a + '"/><stop offset="1" stop-color="' + b + '"/></linearGradient></defs><rect width="600" height="420" fill="url(#' + id + ')"/>'; }
  function morros(cor) { return '<path d="M0 300 Q150 240 300 290 Q450 336 600 270 L600 420 L0 420 Z" fill="' + (cor || '#8fcf72') + '" stroke="' + INK + '" stroke-width="5"/>'; }
  function sol(x, y) { return '<circle cx="' + x + '" cy="' + y + '" r="34" fill="#ffd94a" stroke="' + INK + '" stroke-width="5"/>'; }
  function lua(x, y) { return '<path d="M' + x + ' ' + (y - 30) + ' a30 30 0 1 0 26 44 a24 24 0 1 1 -26 -44z" fill="#ffe9a8" stroke="' + INK + '" stroke-width="5"/>' + [[90, 60], [180, 110], [380, 50], [480, 120], [540, 60]].map(function (p) { return '<circle cx="' + p[0] + '" cy="' + p[1] + '" r="4" fill="#fff"/>'; }).join(''); }
  function flores() { return [[60, 360, '#f26b6b'], [140, 390, '#ffd94a'], [470, 370, '#b08ae0'], [550, 395, '#f26b6b'], [300, 400, '#fff']].map(function (p) { return '<circle cx="' + p[0] + '" cy="' + p[1] + '" r="9" fill="' + p[2] + '" stroke="' + INK + '" stroke-width="3"/>'; }).join(''); }
  function nuvem(x, y, s) { return '<g transform="translate(' + x + ' ' + y + ') scale(' + (s || 1) + ')"><path d="M0 30 Q0 4 26 8 Q36 -12 62 0 Q90 -6 92 22 Q112 26 104 44 L4 44 Q-14 40 0 30Z" fill="#fff" stroke="' + INK + '" stroke-width="4"/></g>'; }
  function bene(x, y, w) { return '<image href="/img/bene.webp" x="' + x + '" y="' + y + '" width="' + w + '" height="' + w + '"/>'; }
  function crianca(o, x, y, w) { return '<g transform="translate(' + x + ' ' + y + ') scale(' + (w / 200) + ')">' + avatar(o) + '</g>'; }
  function coracoes() { return [[250, 120], [330, 90], [400, 130]].map(function (p, i) { return '<path transform="translate(' + p[0] + ' ' + p[1] + ') scale(' + (1 - i * .15) + ')" d="M0 8 C0 -6 -20 -6 -20 8 C-20 20 0 30 0 34 C0 30 20 20 20 8 C20 -6 0 -6 0 8Z" fill="#f26b6b" stroke="' + INK + '" stroke-width="4"/>'; }).join(''); }
  function lagrimas(x, y) { var g = ''; [[0, 0], [70, 4], [-10, 40], [80, 46]].forEach(function (d) { g += '<path transform="translate(' + (x + d[0]) + ' ' + (y + d[1]) + ') scale(1.6)" d="M0 0 q8 14 0 20 q-8 -6 0 -20z" fill="#5ba8e8" stroke="' + INK + '" stroke-width="2.5"/>'; }); return g; }
  function cajado(x, y) { return '<path d="M' + x + ' ' + (y + 230) + ' L' + x + ' ' + (y + 40) + ' Q' + x + ' ' + y + ' ' + (x + 34) + ' ' + y + ' Q' + (x + 68) + ' ' + y + ' ' + (x + 68) + ' ' + (y + 34) + '" fill="none" stroke="#8a5634" stroke-width="14" stroke-linecap="round"/><path d="M' + x + ' ' + (y + 230) + ' L' + x + ' ' + (y + 40) + ' Q' + x + ' ' + y + ' ' + (x + 34) + ' ' + y + ' Q' + (x + 68) + ' ' + y + ' ' + (x + 68) + ' ' + (y + 34) + '" fill="none" stroke="' + INK + '" stroke-width="4" stroke-linecap="round" opacity=".5"/>'; }
  function luz(x) { var g = ''; for (var i = 0; i < 8; i++) { var a = (100 + i * 10) * Math.PI / 180, p1 = [x + 700 * Math.cos(a - .04), 30 + 700 * Math.sin(a - .04)], p2 = [x + 700 * Math.cos(a + .04), 30 + 700 * Math.sin(a + .04)]; g += '<path d="M' + x + ' 30 L' + p1[0].toFixed(0) + ' ' + p1[1].toFixed(0) + ' L' + p2[0].toFixed(0) + ' ' + p2[1].toFixed(0) + 'Z" fill="#fff6c8" opacity=".45"/>'; } return g; }
  function ovelhinha(x, y, k) { return '<g transform="translate(' + x + ' ' + y + ') scale(' + k + ')"><path d="M-14 14v14M12 14v14" stroke="' + INK + '" stroke-width="5" stroke-linecap="round"/>' + [[-14, 0, 14], [0, -8, 15], [14, 0, 14], [0, 8, 14]].map(function (c) { return '<circle cx="' + c[0] + '" cy="' + c[1] + '" r="' + c[2] + '" fill="#fff" stroke="' + INK + '" stroke-width="4"/>'; }).join('') + [[-14, 0, 11], [0, -8, 12], [14, 0, 11], [0, 8, 11]].map(function (c) { return '<circle cx="' + c[0] + '" cy="' + c[1] + '" r="' + c[2] + '" fill="#fff"/>'; }).join('') + '<ellipse cx="30" cy="-6" rx="10" ry="12" fill="' + INK + '"/><circle cx="33" cy="-9" r="2" fill="#fff"/></g>'; }
  function rebanho() { return [[60, 262, .9], [125, 280, .8], [190, 266, .85], [430, 276, .8], [495, 290, .9], [555, 268, .75]].map(function (p) { return ovelhinha(p[0], p[1], p[2]); }).join(''); }
  function riacho() { return '<path d="M0 360 Q160 320 300 360 Q440 400 600 350 L600 390 Q440 430 300 395 Q160 360 0 395Z" fill="#9fd3f7" stroke="' + INK + '" stroke-width="4"/>'; }
  function arvore(x, y) { return '<rect x="' + (x - 14) + '" y="' + y + '" width="28" height="90" fill="#a8743f" stroke="' + INK + '" stroke-width="5"/><circle cx="' + x + '" cy="' + (y - 20) + '" r="60" fill="#5fa84f" stroke="' + INK + '" stroke-width="5"/>'; }
  function pedra(x, y) { return '<path d="M' + x + ' ' + y + ' q20 -70 90 -60 q70 6 70 60z" fill="#b9b2a8" stroke="' + INK + '" stroke-width="5"/>'; }

  // ---------- texto (concordância menino/menina)
  function T(s, c) {
    var f = c.g === 'f';
    return s.replace(/\{N\}/g, esc(c.nome)).replace(/\{o\}/g, f ? 'a' : 'o').replace(/\{O\}/g, f ? 'A' : 'O').replace(/\{ele\}/g, f ? 'ela' : 'ele').replace(/\{Ele\}/g, f ? 'Ela' : 'Ele')
      .replace(/\{um\}/g, f ? 'uma' : 'um').replace(/\{crianca\}/g, f ? 'menina' : 'menino').replace(/\{chamado\}/g, f ? 'chamada' : 'chamado')
      .replace(/\{sozinho\}/g, f ? 'sozinha' : 'sozinho').replace(/\{obrigado\}/g, f ? 'Obrigada' : 'Obrigado');
  }

  // páginas: c = {nome, g, pele, cab, tipo, roupa, completo}
  function paginas(c) {
    var K = c.completo !== false, A = function (x, y, w) { return K ? crianca(c, x, y, w) : ''; };
    var dia = ceu('#8fd0f7', '#e8f6ff'), noite = ceu('#2d3a6b', '#5b6aa8');
    return [
      { capa: true, art: dia + nuvem(60, 50, .9) + nuvem(440, 80, .7) + sol(530, 60) + morros() + flores() + (K ? A(150, 140, 150) + bene(320, 190, 170) : bene(200, 150, 220)),
        txt: '<h1>' + esc(c.nome) + ' e a Bené</h1><p>A ovelhinha que se perdeu</p>' },
      { art: ceu('#ffe1e1', '#fff6ec') + coracoes() + (K ? A(220, 170, 150) : bene(220, 170, 170)),
        txt: T('<p class="ded">Este livrinho foi feito especialmente para <b>{N}</b>.</p><p class="vers">"Eu te louvo porque me fizeste de modo especial e admirável."<br><small>Salmos 139.14</small></p>', c) },
      { art: dia + sol(80, 70) + nuvem(380, 60) + morros() + flores() + rebanho() + A(260, 150, 140),
        txt: T('<p>Era uma vez {um} {crianca} {chamado} <b>{N}</b>. {Ele} adorava brincar no campo, pertinho das ovelhas.</p>', c) },
      { art: dia + nuvem(80, 60) + morros() + pedra(260, 330) + bene(300, 190, 130) + A(70, 150, 130),
        txt: T('<p>Um dia, <b>{N}</b> ouviu um barulhinho atrás das pedras: béééé... Era a Bené, uma ovelhinha bem pequena.</p>', c) },
      { art: ceu('#b8c7d9', '#e6edf5') + nuvem(100, 50) + nuvem(400, 40, .8) + morros('#9cc98a') + bene(200, 150, 200) + lagrimas(258, 228),
        txt: '<p>— Eu me perdi do meu rebanho — disse a Bené, chorando. — Não sei voltar para casa.</p>' },
      { art: dia + morros() + flores() + coracoes() + A(140, 150, 140) + bene(300, 190, 150),
        txt: T('<p><b>{N}</b> segurou a patinha da Bené e disse: — Não fique com medo. Vamos orar? Deus está com a gente.</p>', c) },
      { art: dia + sol(520, 60) + morros() + arvore(500, 220) + riacho() + flores() + A(110, 140, 120) + bene(240, 190, 130),
        txt: T('<p>Os dois andaram juntos pelo campo. Passaram pelo riacho, pela árvore grande e pelas flores.</p>', c) },
      { art: ceu('#ffe9a8', '#fff8e0') + luz(500) + morros() + cajado(470, 120) + A(90, 150, 130) + bene(220, 190, 140),
        txt: T('<p>De repente, ouviram uma voz conhecida chamando: — Bené! Bené! Era o Bom Pastor, que estava procurando a ovelhinha.</p>', c) },
      { art: dia + nuvem(240, 40) + morros() + rebanho() + bene(230, 170, 150) + coracoes(),
        txt: '<p>O Bom Pastor tinha deixado as outras noventa e nove ovelhas para procurar a Bené. Quando a encontrou, ficou muito feliz!</p>' },
      { art: ceu('#ffe9a8', '#fff8e0') + luz(500) + morros() + cajado(470, 120) + A(170, 150, 130) + bene(300, 200, 120),
        txt: T('<p>O Bom Pastor sorriu para <b>{N}</b> e disse: — Obrigado por cuidar da Bené. Assim como eu cuido das minhas ovelhas, Jesus cuida de você.</p>', c) },
      { art: noite + lua(500, 80) + morros('#4f7a52') + A(220, 150, 140),
        txt: T('<p>Naquela noite, <b>{N}</b> orou antes de dormir: — {obrigado}, Jesus, porque eu nunca estou {sozinho}.</p>', c) },
      { fim: true, art: dia + nuvem(80, 50) + nuvem(420, 70, .8) + morros() + flores() + bene(210, 140, 190),
        txt: '<h1>Fim</h1><p class="vers">"Alegrem-se comigo, pois encontrei a minha ovelha perdida."<br><small>Lucas 15.6</small></p><div class="desenho">Desenhe aqui você e a Bené</div>' },
    ];
  }
  function paginaHtml(p, i) {
    return '<section class="lv-pg' + (p.capa ? ' capa' : '') + (p.fim ? ' fim' : '') + '"><svg class="lv-art" viewBox="0 0 600 420" role="img" aria-label="Ilustração da página ' + (i + 1) + '">' + p.art + '</svg><div class="lv-txt">' + p.txt + '</div>' + (p.capa ? '' : '<span class="lv-n">' + (i + 1) + '</span>') + '</section>';
  }
  window.BENE_LIVRO = { avatar: avatar, avatarSvg: avatarSvg, paginas: paginas, paginaHtml: paginaHtml, PELES: PELES, CABELOS: CABELOS, ROUPAS: ROUPAS, NOMES: NOMES, esc: esc };
})();
