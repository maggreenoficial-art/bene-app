// Templates de e-mail da Bené.
// Uso: const m = montarEmail("app_aprovado", { nome: "Maria", email: "maria@x.com" });
//      → { assunto, preheader, html, texto, marketing }
// Os e-mails "marketing" precisam de dados.sair (link para sair da lista).

export const SITE = "https://www.beneaovelhinha.online";

export type Dados = {
  nome?: string;   // nome completo ou primeiro nome; usamos só o primeiro
  email?: string;
  pi?: string;     // id do pagamento (para as ofertas pós-compra)
  sair?: string;   // link para sair da lista (obrigatório nos de marketing)
};

type Bloco =
  | { t: "h"; x: string }
  | { t: "p"; x: string; mini?: boolean }
  | { t: "botao"; x: string; url: string; cor?: "sol" | "pasto" }
  | { t: "passos"; itens: [string, string][] }
  | { t: "lista"; itens: string[] }
  | { t: "caixa"; titulo?: string; x: string; botao?: { x: string; url: string } }
  | { t: "preco"; de?: string; por: string; nota: string }
  | { t: "perguntas"; itens: [string, string][] };

type Modelo = {
  assunto: string;
  preheader: string;
  marketing: boolean;
  blocos: Bloco[];
};

// ---------- links ----------
const u = (caminho: string, campanha: string, meio = "email") =>
  `${SITE}${caminho}${caminho.includes("?") ? "&" : "?"}utm_source=email&utm_medium=${meio}&utm_campaign=${campanha}`;

const L = {
  app: (c: string) => u("/", c, "transacional"),
  kitPdf: `${SITE}/pdf/kit-completo.pdf`,
  folhasPdf: `${SITE}/pdf/5-folhas-gratis.pdf`,
  checkoutApp: (c: string) => u("/checkout/", c, "recuperacao"),
  checkoutKit: (c: string) => u("/kit/checkout/", c, "recuperacao"),
  kit: (c: string) => u("/kit/", c, "folhas-gratis"),
  veja: (c: string) => u("/veja/", c, "nutricao"),
  ofertaNiveis: (pi: string, c: string) => u(`/oferta-1/?pi=${encodeURIComponent(pi)}`, c, "pos-compra"),
  ofertaApp: (pi: string, c: string) => u(`/kit-oferta-1/?pi=${encodeURIComponent(pi)}`, c, "pos-compra"),
};

const primeiroNome = (n?: string) => {
  if (!n || n.includes("@")) return ""; // tem gente que digita o e-mail no campo do nome
  const p = n.trim().split(/\s+/)[0] || "";
  return p ? p.charAt(0).toUpperCase() + p.slice(1).toLowerCase() : "";
};

// ---------- conteúdo ----------
// {nome} vira o primeiro nome; {oi} vira "Oi, Maria!" ou "Oi!"; {email} vira o e-mail.

const GARANTIA_APP = "Garantia de 7 dias: se não for para vocês, é só responder este e-mail e devolvemos todo o valor.";
const GARANTIA_KIT = "Garantia de 7 dias: se o kit não for para vocês, é só responder este e-mail e devolvemos o valor.";

const PASSOS_APP: [string, string][] = [
  ["Entre com este e-mail", "Use {email} para entrar, no celular, no tablet ou no computador."],
  ["Instale na tela inicial", "No aplicativo, toque em \"Instalar\". No iPhone: botão Compartilhar e depois \"Adicionar à Tela de Início\"."],
  ["Comece pelo nível 1", "10 minutinhos por dia bastam. Se seu filho ainda não conhece as letras, comece pelo Alfabeto da Bené."],
];

const ITENS_APP = [
  "**4 níveis e 120 atividades**, das primeiras sílabas às primeiras frases",
  "**Palavras da Bíblia**, como ARCA, OVELHA e \"Deus me ama\"",
  "**Alfabeto da Bené**, de A a Z, para quem ainda está conhecendo as letras",
  "**Kit completo em PDF** com 127 páginas para imprimir, de bônus",
  "**Pagamento único**: não é assinatura, o acesso é seu para sempre",
];

const ITENS_KIT = [
  "**127 folhas em ordem**, do BO-LA às primeiras frases",
  "**4 níveis**, do mais fácil ao mais difícil, sem pular etapa",
  "**Guia para o papai e a mamãe** explicando cada passo",
  "**Certificado \"Eu já sei ler!\"** para o final do nível 4",
  "**PDF em A4**, funciona em preto e branco e imprime quantas vezes quiser",
];

const MODELOS: Record<string, (d: Dados) => Modelo> = {
  // ===================== TRANSACIONAIS =====================
  app_aprovado: () => ({
    assunto: "Seu aplicativo da Bené está liberado",
    preheader: "Entre com este e-mail e comece hoje pelo nível 1, em 10 minutinhos.",
    marketing: false,
    blocos: [
      { t: "h", x: "Que alegria ter vocês aqui, {nome}!" },
      { t: "p", x: "Seu pagamento foi aprovado e o **aplicativo da Bené** já está liberado." },
      { t: "botao", x: "Abrir o aplicativo", url: L.app("app-aprovado") },
      { t: "passos", itens: PASSOS_APP },
      { t: "caixa", titulo: "Prefere o papel?", x: "O kit completo em PDF, com 127 páginas para imprimir, também é seu.", botao: { x: "Baixar o kit (PDF)", url: L.kitPdf } },
      { t: "p", x: GARANTIA_APP, mini: true },
    ],
  }),

  kit_aprovado: () => ({
    assunto: "Seu kit da Bené chegou: 127 folhas para imprimir",
    preheader: "Baixe o PDF e imprima a primeira folha hoje.",
    marketing: false,
    blocos: [
      { t: "h", x: "Seu kit está pronto, {nome}!" },
      { t: "p", x: "Seu pagamento foi aprovado. Aqui está o **kit da Bené**: 127 folhas em ordem, do BO-LA às primeiras frases." },
      { t: "botao", x: "Baixar o kit (PDF)", url: L.kitPdf },
      { t: "passos", itens: [
        ["Imprima a primeira folha do nível 1", "Em preto e branco mesmo, na impressora de casa ou na papelaria."],
        ["Sente 10 minutinhos com seu filho", "Bata uma palma em cada pedacinho: BO… LA… BOLA!"],
        ["Uma folha por dia", "Escreva o nome e a data no canto da folha. Amanhã é a próxima."],
      ] },
      { t: "p", x: "Guarde este e-mail: o link do kit fica sempre aqui." },
      { t: "p", x: GARANTIA_KIT, mini: true },
    ],
  }),

  niveis56_aprovado: () => ({
    assunto: "Níveis 5 e 6 liberados: 30 historinhas da Bíblia",
    preheader: "Já estão no seu aplicativo, logo na tela inicial.",
    marketing: false,
    blocos: [
      { t: "h", x: "As historinhas já estão no aplicativo, {nome}!" },
      { t: "p", x: "Seu pagamento foi aprovado e os **níveis 5 e 6** foram liberados: 30 historinhas da Bíblia para seu filho ler, com perguntas no final de cada uma." },
      { t: "botao", x: "Abrir as historinhas", url: L.app("niveis56-aprovado") },
      { t: "passos", itens: [
        ["Entre com o e-mail da compra", "{email}"],
        ["Toque em \"Níveis 5 e 6: Historinhas\"", "O cartão aparece na tela inicial do aplicativo."],
        ["Leia uma historinha por dia", "Primeiro vocês leem juntos. Depois ele tenta sozinho e responde as perguntas."],
      ] },
      { t: "p", x: "Funciona melhor depois do nível 4, quando ele já lê frases curtas.", mini: true },
    ],
  }),

  livro_aprovado: () => ({
    assunto: "O livrinho do seu filho com a Bené está liberado",
    preheader: "Escolha o nome e o jeitinho dele e imprima o livrinho.",
    marketing: false,
    blocos: [
      { t: "h", x: "Vamos montar o livrinho, {nome}?" },
      { t: "p", x: "Seu pagamento foi aprovado. O **livrinho personalizado** já está no aplicativo: seu filho vira o personagem da história, ao lado da Bené." },
      { t: "botao", x: "Montar o livrinho", url: L.app("livro-aprovado") },
      { t: "passos", itens: [
        ["Toque em \"Livrinho personalizado\"", "O cartão aparece na tela inicial do aplicativo."],
        ["Escreva o nome e escolha o jeitinho dele", "Cor da pele, cabelo e roupa, para o desenho ficar parecido com ele."],
        ["Imprima ou salve em PDF", "Dá para imprimir quantas vezes quiser, um para casa e outro para a vovó."],
      ] },
    ],
  }),

  livro_nome_aprovado: () => ({
    assunto: "O livrinho com o nome do seu filho está liberado",
    preheader: "Escreva o nome dele e imprima o livrinho da Bené.",
    marketing: false,
    blocos: [
      { t: "h", x: "O livrinho está esperando o nome dele, {nome}!" },
      { t: "p", x: "Seu pagamento foi aprovado. O **livrinho com o nome do seu filho** já está no aplicativo." },
      { t: "botao", x: "Montar o livrinho", url: L.app("livro-nome-aprovado") },
      { t: "passos", itens: [
        ["Toque em \"Livrinho personalizado\"", "O cartão aparece na tela inicial do aplicativo."],
        ["Escreva o nome do seu filho", "Ele aparece em todas as páginas da história com a Bené."],
        ["Imprima ou salve em PDF", "Dá para imprimir quantas vezes quiser."],
      ] },
    ],
  }),

  // ===================== RECUPERAÇÃO: APLICATIVO =====================
  rec_app_1: () => ({
    assunto: "Ficou alguma coisa pelo caminho, {nome}?",
    preheader: "Seu pedido do aplicativo da Bené continua esperando por você.",
    marketing: true,
    blocos: [
      { t: "h", x: "Seu pedido não foi concluído" },
      { t: "p", x: "{oi} Você começou o pedido do **aplicativo da Bené**, mas o pagamento não chegou até nós. Às vezes a internet cai, o Pix expira ou o banco pede uma confirmação. Acontece." },
      { t: "p", x: "Seu pedido continua aqui, pelo mesmo valor:" },
      { t: "preco", por: "R$ 37", nota: "Pagamento único. Acesso na hora." },
      { t: "botao", x: "Concluir meu pedido", url: L.checkoutApp("rec-app-1") },
      { t: "p", x: "Apareceu algum erro? Responda este e-mail contando o que aconteceu que a gente ajuda.", mini: true },
    ],
  }),

  rec_app_2: () => ({
    assunto: "Um lembrete rápido sobre o aplicativo da Bené",
    preheader: "120 atividades, palavras da Bíblia e o kit para imprimir de bônus.",
    marketing: true,
    blocos: [
      { t: "h", x: "Tudo o que está esperando seu filho" },
      { t: "p", x: "{oi} Passando para lembrar o que vem no aplicativo da Bené. São 10 minutinhos por dia, no celular que você já tem:" },
      { t: "lista", itens: ITENS_APP },
      { t: "preco", por: "R$ 37", nota: "Pagamento único. Garantia de 7 dias." },
      { t: "botao", x: "Quero o aplicativo da Bené", url: L.checkoutApp("rec-app-2") },
    ],
  }),

  rec_app_3: () => ({
    assunto: "Está tudo bem?",
    preheader: "Respondemos as dúvidas que mais aparecem antes da compra.",
    marketing: true,
    blocos: [
      { t: "h", x: "Ficou alguma dúvida, {nome}?" },
      { t: "p", x: "Muita gente para antes de pagar por causa de uma pergunta. Estas são as mais comuns:" },
      { t: "perguntas", itens: [
        ["É assinatura?", "Não. Você paga R$ 37 uma vez só e o acesso é seu para sempre."],
        ["Para qual idade serve?", "Para crianças de 3 a 7 anos. Quem ainda não conhece as letras começa pelo Alfabeto e pelo nível 1."],
        ["Precisa baixar na loja de aplicativos?", "Não. Ele abre por um link, no celular, no tablet ou no computador, e pode ser instalado na tela inicial."],
        ["E se não for para nós?", "Você tem 7 dias de garantia. É só responder o e-mail de acesso e devolvemos todo o valor."],
      ] },
      { t: "botao", x: "Concluir meu pedido", url: L.checkoutApp("rec-app-3") },
      { t: "p", x: "Sua dúvida não está aqui? Responda este e-mail.", mini: true },
    ],
  }),

  rec_app_4: () => ({
    assunto: "Último lembrete sobre o seu pedido da Bené",
    preheader: "Depois deste, não vamos mais lembrar.",
    marketing: true,
    blocos: [
      { t: "h", x: "Este é o último lembrete" },
      { t: "p", x: "{oi} Este é o último e-mail sobre o seu pedido do aplicativo da Bené. Depois dele, não vamos mais lembrar." },
      { t: "p", x: "A leitura não vem de uma vez. Vem de um pouquinho por dia, na ordem certa. Cada dia que começa é uma palavra nova que seu filho lê sozinho: BOLA, depois PATINHO, depois BORBOLETA." },
      { t: "preco", por: "R$ 37", nota: "Pagamento único. Garantia de 7 dias." },
      { t: "botao", x: "Começar hoje", url: L.checkoutApp("rec-app-4") },
    ],
  }),

  // ===================== RECUPERAÇÃO: KIT =====================
  rec_kit_1: () => ({
    assunto: "Ficou alguma coisa pelo caminho, {nome}?",
    preheader: "Seu kit da Bené para imprimir continua esperando por você.",
    marketing: true,
    blocos: [
      { t: "h", x: "Seu pedido não foi concluído" },
      { t: "p", x: "{oi} Você começou o pedido do **kit da Bené para imprimir**, mas o pagamento não chegou até nós. Às vezes a internet cai, o Pix expira ou o banco pede uma confirmação. Acontece." },
      { t: "p", x: "Seu pedido continua aqui, pelo mesmo valor:" },
      { t: "preco", por: "R$ 5,99", nota: "127 folhas. Download na hora." },
      { t: "botao", x: "Concluir meu pedido", url: L.checkoutKit("rec-kit-1") },
      { t: "p", x: "Apareceu algum erro? Responda este e-mail contando o que aconteceu que a gente ajuda.", mini: true },
    ],
  }),

  rec_kit_2: () => ({
    assunto: "Um lembrete rápido sobre o kit da Bené",
    preheader: "127 folhas em ordem, do BO-LA às primeiras frases.",
    marketing: true,
    blocos: [
      { t: "h", x: "127 folhas por menos que um salgado" },
      { t: "p", x: "{oi} Passando para lembrar o que vem no kit. Uma folha por dia, 10 minutinhos com seu filho:" },
      { t: "lista", itens: ITENS_KIT },
      { t: "preco", por: "R$ 5,99", nota: "Pagamento único. Garantia de 7 dias." },
      { t: "botao", x: "Quero o kit", url: L.checkoutKit("rec-kit-2") },
    ],
  }),

  rec_kit_3: () => ({
    assunto: "Está tudo bem?",
    preheader: "Respondemos as dúvidas que mais aparecem antes da compra.",
    marketing: true,
    blocos: [
      { t: "h", x: "Ficou alguma dúvida, {nome}?" },
      { t: "p", x: "Muita gente para antes de pagar por causa de uma pergunta. Estas são as mais comuns:" },
      { t: "perguntas", itens: [
        ["Para qual idade é?", "Para crianças de 3 a 8 anos que estão aprendendo a ler."],
        ["Preciso de impressora colorida?", "Não. Funciona bem em preto e branco, e a criança ainda pinta os desenhos."],
        ["É um livro físico?", "Não. É um PDF em A4 que chega na hora. Você imprime em casa ou na papelaria, quantas vezes quiser."],
        ["E se não for para nós?", "Você tem 7 dias de garantia. É só responder o e-mail do kit e devolvemos o valor."],
      ] },
      { t: "botao", x: "Concluir meu pedido", url: L.checkoutKit("rec-kit-3") },
      { t: "p", x: "Sua dúvida não está aqui? Responda este e-mail.", mini: true },
    ],
  }),

  rec_kit_4: () => ({
    assunto: "Último lembrete sobre o seu kit da Bené",
    preheader: "Depois deste, não vamos mais lembrar.",
    marketing: true,
    blocos: [
      { t: "h", x: "Este é o último lembrete" },
      { t: "p", x: "{oi} Este é o último e-mail sobre o seu pedido do kit da Bené. Depois dele, não vamos mais lembrar." },
      { t: "p", x: "Se hoje é só uma folha, amanhã é outra. Em poucas semanas, seu filho sai do BO-LA e chega nas primeiras frases, com o certificado \"Eu já sei ler!\" na mão." },
      { t: "preco", por: "R$ 5,99", nota: "Pagamento único. Garantia de 7 dias." },
      { t: "botao", x: "Quero o kit", url: L.checkoutKit("rec-kit-4") },
    ],
  }),

  // ===================== FOLHAS GRÁTIS (leads) =====================
  gratis_0: () => ({
    assunto: "Suas 5 folhas grátis da Bené",
    preheader: "Baixe o PDF e imprima a primeira folha hoje.",
    marketing: true,
    blocos: [
      { t: "h", x: "Aqui estão suas folhas, {nome}!" },
      { t: "p", x: "Como prometido, as **5 folhas grátis** da Bené para imprimir em casa." },
      { t: "botao", x: "Baixar as 5 folhas (PDF)", url: L.folhasPdf },
      { t: "passos", itens: [
        ["Imprima uma folha por dia", "Em preto e branco mesmo, na impressora de casa."],
        ["Sente 10 minutinhos com seu filho", "Fale a palavra devagar e bata uma palma em cada pedacinho: BO… LA… BOLA!"],
        ["Comemore cada folha", "Ele pinta o desenho no fim. Deixe ele mostrar para alguém da casa."],
      ] },
      { t: "p", x: "Nos próximos dias, mandamos algumas dicas curtas para ajudar seu filho a ler." },
      { t: "caixa", titulo: "Uma pergunta rápida", x: "Quantos anos tem seu filho? Responda este e-mail contando a idade dele que a gente diz por qual folha começar." },
    ],
  }),

  gratis_1: () => ({
    assunto: "O segredo da palma: BO… LA… BOLA!",
    preheader: "A brincadeira de 1 minuto que ajuda a criança a juntar as sílabas.",
    marketing: true,
    blocos: [
      { t: "h", x: "Por que bater palma ajuda a ler" },
      { t: "p", x: "{oi} Muita criança conhece as letras, mas trava na hora de juntar. Ela olha BO, olha LA, e não sai BOLA." },
      { t: "p", x: "A palma resolve isso. Quando seu filho bate uma palma em cada pedacinho, ele **sente** que a palavra é feita de partes. É esse o passo que destrava a leitura." },
      { t: "caixa", titulo: "Faça hoje, em 1 minuto", x: "Escolha 3 palavras da casa: BOLA, MESA, SAPATO. Fale devagar e batam palma juntos em cada pedacinho. Depois pergunte: quantas palmas deu?" },
      { t: "botao", x: "Abrir as 5 folhas", url: L.folhasPdf },
    ],
  }),

  gratis_2: () => ({
    assunto: "3 erros que fazem a criança fugir do caderno",
    preheader: "E o que fazer no lugar de cada um.",
    marketing: true,
    blocos: [
      { t: "h", x: "Se ele foge do caderno, veja isto" },
      { t: "p", x: "{oi} Quando a criança chora ou pede o celular na hora de estudar, quase sempre é um destes três:" },
      { t: "perguntas", itens: [
        ["1. Passar do tempo", "Mais de 10 minutos cansa. Pare enquanto ele ainda quer mais, e amanhã ele volta com vontade."],
        ["2. Corrigir tudo na hora", "Comemore o que ele acertou primeiro. O erro a gente arruma na próxima folha."],
        ["3. Pular etapas", "Atividade solta, fora de ordem, faz ele travar. Primeiro palavras de 2 pedacinhos, depois de 3, depois as grandes."],
      ] },
      { t: "p", x: "As 5 folhas que você baixou são o começo do nível 1. Amanhã mostramos o caminho inteiro." },
    ],
  }),

  gratis_3: () => ({
    assunto: "As 5 folhas acabaram? Aqui está o caminho inteiro",
    preheader: "127 folhas em ordem, do BO-LA às primeiras frases, por R$ 5,99.",
    marketing: true,
    blocos: [
      { t: "h", x: "O kit completo da Bené" },
      { t: "p", x: "{oi} As 5 folhas grátis são só o começo. O **kit completo** continua de onde elas pararam, uma folha por dia, até as primeiras frases:" },
      { t: "lista", itens: ITENS_KIT },
      { t: "preco", por: "R$ 5,99", nota: "Pagamento único. Download na hora. Garantia de 7 dias." },
      { t: "botao", x: "Quero o kit completo", url: L.kit("gratis-3") },
    ],
  }),

  gratis_4: () => ({
    assunto: "\"Preciso de impressora colorida?\" e outras dúvidas",
    preheader: "As perguntas que as mães mais fazem sobre o kit da Bené.",
    marketing: true,
    blocos: [
      { t: "h", x: "Suas dúvidas sobre o kit, {nome}" },
      { t: "perguntas", itens: [
        ["Preciso de impressora colorida?", "Não. Funciona bem em preto e branco, e a criança ainda pinta os desenhos."],
        ["Para qual idade é?", "De 3 a 8 anos. Os mais novos começam pelo nível 1 com a sua ajuda; os maiores avançam mais rápido."],
        ["Como recebo?", "O download do PDF aparece logo depois do pagamento, e o link também chega por e-mail."],
        ["Serve para mais de um filho?", "Sim. Você imprime quantas vezes quiser."],
      ] },
      { t: "preco", por: "R$ 5,99", nota: "127 folhas. Garantia de 7 dias." },
      { t: "botao", x: "Quero o kit completo", url: L.kit("gratis-4") },
    ],
  }),

  // ===================== LEADS QUE NÃO COMPRARAM =====================
  lead_0: () => ({
    assunto: "Um presente da Bené para o seu filho",
    preheader: "5 folhas de alfabetização para imprimir hoje, de graça.",
    marketing: true,
    blocos: [
      { t: "h", x: "Um presente para começar, {nome}" },
      { t: "p", x: "{oi} Você deixou seu e-mail na página da Bené. Para seu filho experimentar o método sem compromisso, separamos **5 folhas grátis** do nível 1 para imprimir em casa." },
      { t: "botao", x: "Baixar as 5 folhas (PDF)", url: L.folhasPdf },
      { t: "passos", itens: [
        ["Imprima uma folha por dia", "Em preto e branco mesmo, na impressora de casa."],
        ["Sente 10 minutinhos com seu filho", "Fale a palavra devagar e bata uma palma em cada pedacinho: BO… LA… BOLA!"],
        ["Comemore cada folha", "Ele pinta o desenho no fim. Deixe ele mostrar para alguém da casa."],
      ] },
      { t: "p", x: "Nos próximos dias, mandamos algumas dicas curtas para ajudar seu filho a ler." },
      { t: "caixa", titulo: "Uma pergunta rápida", x: "Quantos anos tem seu filho? Responda este e-mail contando a idade dele que a gente diz por qual folha começar." },
    ],
  }),

  lead_app: () => ({
    assunto: "E se a leitura virasse brincadeira no celular?",
    preheader: "O aplicativo da Bené: 120 atividades, com o kit para imprimir de bônus.",
    marketing: true,
    blocos: [
      { t: "h", x: "O caminho das folhas, agora na tela" },
      { t: "p", x: "{oi} O **aplicativo da Bené** segue a mesma ordem das folhas, só que no celular: seu filho toca em cada sílaba e ouve o som, cobre as letras com o dedo e monta as palavras como um quebra-cabeça." },
      { t: "lista", itens: ITENS_APP },
      { t: "preco", por: "R$ 37", nota: "Pagamento único. Garantia de 7 dias." },
      { t: "botao", x: "Conhecer o aplicativo", url: L.veja("lead-app") },
    ],
  }),

  // ===================== PÓS-COMPRA: APLICATIVO =====================
  // sai ~2 h depois da compra só para quem pagou e não chegou a ver as ofertas (ex.: pagou o Pix no app do banco e não voltou)
  pos_app_0: (d) => ({
    assunto: "Uma coisa que ficou para trás na sua compra",
    preheader: "Os níveis 5 e 6 da Bené: 30 historinhas da Bíblia para depois do nível 4.",
    marketing: true,
    blocos: [
      { t: "h", x: "Uma coisa ficou para trás, {nome}" },
      { t: "p", x: "Logo depois do pagamento, o site mostra uma oferta só para quem acabou de comprar. Como a página fechou antes, ela não apareceu para você." },
      { t: "p", x: "São os **níveis 5 e 6**: 30 historinhas da Bíblia para quando seu filho terminar o nível 4 e começar a ler frases. Cada uma tem perguntas no final, para você ver se ele entendeu." },
      { t: "preco", por: "R$ 47", nota: "Pagamento único. Liberado na hora, no mesmo aplicativo." },
      { t: "botao", x: "Ver os níveis 5 e 6", url: L.ofertaNiveis(d.pi || "", "pos-app-0") },
      { t: "p", x: "Se não quiser agora, tudo bem: o seu aplicativo continua liberado do mesmo jeito.", mini: true },
    ],
  }),

  pos_app_1: () => ({
    assunto: "Como foi o primeiro dia com a Bené?",
    preheader: "4 dicas para os 10 minutinhos renderem mais.",
    marketing: true,
    blocos: [
      { t: "h", x: "Como foi o primeiro dia, {nome}?" },
      { t: "p", x: "Estas dicas ajudam os 10 minutinhos a virarem hábito:" },
      { t: "lista", itens: [
        "**Mesma hora todo dia.** Depois do café ou antes de dormir. A rotina faz ele pedir.",
        "**Fale junto, devagar.** BO… LA… Ele imita o seu ritmo.",
        "**Comemore cada acerto.** O \"Muito bem!\" da tela fica ainda melhor com o seu.",
        "**Pare enquanto ele quer mais.** Assim amanhã ele volta com vontade.",
      ] },
      { t: "botao", x: "Abrir o aplicativo", url: L.app("pos-app-1") },
    ],
  }),

  pos_app_2: () => ({
    assunto: "Se ele travar numa palavra, faça isso",
    preheader: "O que fazer quando a criança empaca.",
    marketing: true,
    blocos: [
      { t: "h", x: "Quando ele empaca" },
      { t: "p", x: "{oi} É normal a criança travar em alguma palavra. Veja o que costuma funcionar:" },
      { t: "perguntas", itens: [
        ["Volte um passo", "Refaça uma atividade do nível anterior que ele já domina. A confiança volta e ele tenta de novo."],
        ["Use o papel", "Imprima a folha da mesma palavra no kit em PDF. Traçar com o lápis firma o que ele viu na tela."],
        ["Escolha a hora certa", "Com sono ou com fome não rende. Melhor 5 minutos bons do que 20 brigando."],
      ] },
      { t: "botao", x: "Baixar o kit (PDF)", url: L.kitPdf, cor: "pasto" },
    ],
  }),

  pos_app_3: (d) => ({
    assunto: "Depois do nível 4: 30 historinhas da Bíblia",
    preheader: "Para quando ele já estiver lendo frases curtas.",
    marketing: true,
    blocos: [
      { t: "h", x: "O próximo passo depois do nível 4" },
      { t: "p", x: "{oi} Quando seu filho chegar às primeiras frases, ele vai querer ler mais. Para essa hora, existem os **níveis 5 e 6**: 30 historinhas da Bíblia, com perguntas no final de cada uma." },
      { t: "lista", itens: [
        "Histórias curtas, no tamanho certo para quem está começando",
        "Ele lê sozinho e responde as perguntas, e você vê se ele entendeu",
        "Ficam no mesmo aplicativo, logo na tela inicial",
      ] },
      { t: "preco", por: "R$ 47", nota: "Pagamento único, no mesmo aplicativo." },
      { t: "botao", x: "Ver os níveis 5 e 6", url: L.ofertaNiveis(d.pi || "", "pos-app-3") },
    ],
  }),

  // ===================== PÓS-COMPRA: KIT =====================
  pos_kit_1: () => ({
    assunto: "Já imprimiu a primeira folha?",
    preheader: "Como fazer os 10 minutinhos virarem hábito.",
    marketing: true,
    blocos: [
      { t: "h", x: "Já imprimiu a primeira folha, {nome}?" },
      { t: "p", x: "Se ainda não, hoje é um bom dia. Estas dicas ajudam:" },
      { t: "lista", itens: [
        "**Imprima só a folha do dia.** A pilha inteira na mesa assusta.",
        "**Mesma hora todo dia.** A rotina faz ele pedir a folha.",
        "**Escreva o nome e a data.** Daqui a um mês, vocês veem o quanto ele avançou.",
        "**Pare enquanto ele quer mais.** Assim amanhã ele volta com vontade.",
      ] },
      { t: "botao", x: "Abrir o kit (PDF)", url: L.kitPdf },
    ],
  }),

  pos_kit_2: () => ({
    assunto: "Se ele travar numa palavra, faça isso",
    preheader: "O que fazer quando a criança empaca.",
    marketing: true,
    blocos: [
      { t: "h", x: "Quando ele empaca" },
      { t: "p", x: "{oi} É normal a criança travar em alguma palavra. Veja o que costuma funcionar:" },
      { t: "perguntas", itens: [
        ["Volte uma folha", "Refaça uma folha que ele já domina. A confiança volta e ele tenta de novo."],
        ["Mais palmas, menos letras", "Antes de escrever, batam palma na palavra três vezes. O som vem antes da letra."],
        ["Escolha a hora certa", "Com sono ou com fome não rende. Melhor 5 minutos bons do que 20 brigando."],
      ] },
    ],
  }),

  pos_kit_3: (d) => ({
    assunto: "A Bené também no celular, por R$ 27",
    preheader: "120 atividades de tocar, cobrir e montar, para os dias sem impressora.",
    marketing: true,
    blocos: [
      { t: "h", x: "Para os dias sem impressora" },
      { t: "p", x: "{oi} Quem tem o kit tem um preço especial no **aplicativo da Bené**. Ele segue a mesma ordem das folhas, só que na tela:" },
      { t: "lista", itens: [
        "Ele toca em cada sílaba e ouve o som",
        "Cobre as letras com o dedo e monta o quebra-cabeça de sílabas",
        "4 níveis e 120 atividades, com palavras da Bíblia",
        "Bom para a fila do médico, a viagem e o dia sem tinta na impressora",
      ] },
      { t: "preco", de: "R$ 37", por: "R$ 27", nota: "Preço para quem já tem o kit. Pagamento único." },
      { t: "botao", x: "Ver o aplicativo por R$ 27", url: L.ofertaApp(d.pi || "", "pos-kit-3") },
    ],
  }),
};

// Quando cada e-mail sai (minutos depois do evento) e quando a sequência para.
export const SEQUENCIAS = {
  // evento: pagamento aprovado (webhook do Stripe), um e-mail por produto
  transacional: { "app-bene": "app_aprovado", kit: "kit_aprovado", niveis56: "niveis56_aprovado", livro: "livro_aprovado", livro_nome: "livro_nome_aprovado" },
  // evento: checkout criado e não pago. Para assim que o mesmo e-mail pagar o produto.
  recuperacao_app: [["rec_app_1", 60], ["rec_app_2", 180], ["rec_app_3", 720], ["rec_app_4", 1440]],
  recuperacao_kit: [["rec_kit_1", 60], ["rec_kit_2", 180], ["rec_kit_3", 720], ["rec_kit_4", 1440]],
  // evento: lead em /gratis/. Para se comprar o kit ou o aplicativo.
  folhas_gratis: [["gratis_0", 0], ["gratis_1", 1440], ["gratis_2", 2880], ["gratis_3", 4320], ["gratis_4", 7200], ["lead_app", 10080]],
  // evento: lead do quiz ou da página de vendas que não comprou (quem abandonou o checkout entra 2 dias depois da recuperação).
  // Usa a mesma chave das folhas grátis: ninguém recebe o mesmo e-mail duas vezes.
  nutricao: [["lead_0", 120], ["gratis_1", 1440], ["gratis_2", 2880], ["gratis_3", 4320], ["gratis_4", 7200], ["lead_app", 10080]],
  // evento: compra aprovada. O e-mail de oferta só sai se a pessoa ainda não tem o produto.
  pos_compra_app: [["pos_app_1", 1440], ["pos_app_2", 4320], ["pos_app_3", 7200]],
  pos_compra_kit: [["pos_kit_1", 1440], ["pos_kit_2", 2880], ["pos_kit_3", 4320]],
} as const;

export const MODELOS_IDS = Object.keys(MODELOS);

// ---------- montagem ----------
const C = { ceu: "#7EC8F2", tinta: "#4A3426", sol: "#FFC94A", pasto: "#8BD17C", creme: "#FFF8E7", suave: "#7A6455" };
const FT = "'Baloo 2','Arial Rounded MT Bold',Arial,sans-serif";
const FB = "Nunito,'Segoe UI',Arial,sans-serif";

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const negrito = (s: string) => s.replace(/\*\*(.+?)\*\*/g, "<b>$1</b>");

function trocar(s: string, d: Dados) {
  const n = primeiroNome(d.nome);
  return s
    .replace(/\{oi\}/g, n ? `Oi, ${n}!` : "Oi!")
    .replace(/, \{nome\}/g, n ? `, ${n}` : "")
    .replace(/\{nome\}/g, n)
    .replace(/\{email\}/g, d.email || "o e-mail que você usou na compra");
}

function botaoHtml(x: string, url: string, cor: "sol" | "pasto" = "sol") {
  const bg = cor === "pasto" ? C.pasto : C.sol;
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:22px 0 6px"><tr><td align="center">
<table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr><td align="center" bgcolor="${bg}" style="background:${bg};border:3px solid ${C.tinta};border-radius:16px;box-shadow:4px 4px 0 ${C.tinta}">
<a href="${esc(url)}" target="_blank" style="display:inline-block;padding:14px 28px;font-family:${FT};font-size:19px;font-weight:800;line-height:1.2;color:${C.tinta};text-decoration:none">${esc(x)}</a>
</td></tr></table></td></tr></table>`;
}

function blocoHtml(b: Bloco, d: Dados): string {
  const T = (s: string) => negrito(esc(trocar(s, d)));
  const P = `margin:0 0 14px;font-family:${FB};font-size:17px;line-height:1.55;color:${C.tinta}`;
  switch (b.t) {
    case "h":
      return `<h1 style="margin:0 0 12px;font-family:${FT};font-size:28px;line-height:1.15;font-weight:800;color:${C.tinta}">${T(b.x)}</h1>`;
    case "p":
      return b.mini
        ? `<p style="margin:14px 0 0;font-family:${FB};font-size:14px;line-height:1.5;color:${C.suave}">${T(b.x)}</p>`
        : `<p style="${P}">${T(b.x)}</p>`;
    case "botao":
      return botaoHtml(trocar(b.x, d), b.url, b.cor);
    case "passos":
      return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:18px 0 4px">${b.itens.map(([t, x], i) => `<tr>
<td width="44" valign="top" style="padding:0 0 14px"><div style="width:34px;height:34px;line-height:34px;border-radius:17px;background:${C.ceu};border:2px solid ${C.tinta};text-align:center;font-family:${FT};font-size:18px;font-weight:800;color:${C.tinta}">${i + 1}</div></td>
<td valign="top" style="padding:3px 0 14px;font-family:${FB};font-size:16px;line-height:1.5;color:${C.tinta}"><b style="display:block;font-size:17px">${T(t)}</b>${T(x)}</td></tr>`).join("")}</table>`;
    case "lista":
      return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:4px 0 10px">${b.itens.map((x) => `<tr>
<td width="30" valign="top" style="padding:2px 0 10px;font-family:${FT};font-size:18px;font-weight:800;color:#3F8F33">&#10003;</td>
<td valign="top" style="padding:2px 0 10px;font-family:${FB};font-size:16px;line-height:1.5;color:${C.tinta}">${T(x)}</td></tr>`).join("")}</table>`;
    case "perguntas":
      return b.itens.map(([q, a]) => `<div style="margin:0 0 14px;padding:14px 16px;background:${C.creme};border-radius:14px;border:2px solid #EADFC8">
<b style="display:block;font-family:${FT};font-size:18px;line-height:1.25;color:${C.tinta};margin-bottom:4px">${T(q)}</b>
<span style="font-family:${FB};font-size:16px;line-height:1.5;color:${C.tinta}">${T(a)}</span></div>`).join("");
    case "caixa":
      return `<div style="margin:20px 0 6px;padding:18px;background:${C.creme};border:2px dashed ${C.tinta};border-radius:16px">
${b.titulo ? `<b style="display:block;font-family:${FT};font-size:19px;color:${C.tinta};margin-bottom:4px">${T(b.titulo)}</b>` : ""}
<span style="font-family:${FB};font-size:16px;line-height:1.5;color:${C.tinta}">${T(b.x)}</span>
${b.botao ? botaoHtml(b.botao.x, b.botao.url, "pasto") : ""}</div>`;
    case "preco":
      return `<div style="margin:8px 0 0;text-align:center">
${b.de ? `<span style="font-family:${FB};font-size:17px;color:${C.suave};text-decoration:line-through">${esc(b.de)}</span>&nbsp;&nbsp;` : ""}<span style="font-family:${FT};font-size:40px;font-weight:800;color:${C.tinta}">${esc(b.por)}</span>
<div style="font-family:${FB};font-size:14px;color:${C.suave}">${esc(b.nota)}</div></div>`;
  }
}

function blocoTexto(b: Bloco, d: Dados): string {
  const T = (s: string) => trocar(s, d).replace(/\*\*(.+?)\*\*/g, "$1");
  switch (b.t) {
    case "h": return T(b.x).toUpperCase();
    case "p": return T(b.x);
    case "botao": return `${T(b.x)}: ${b.url}`;
    case "passos": return b.itens.map(([t, x], i) => `${i + 1}. ${T(t)}: ${T(x)}`).join("\n");
    case "lista": return b.itens.map((x) => `- ${T(x)}`).join("\n");
    case "perguntas": return b.itens.map(([q, a]) => `${T(q)}\n${T(a)}`).join("\n\n");
    case "caixa": return [b.titulo ? T(b.titulo) : "", T(b.x), b.botao ? `${b.botao.x}: ${b.botao.url}` : ""].filter(Boolean).join("\n");
    case "preco": return `${b.de ? `De ${b.de} por ` : ""}${b.por}. ${b.nota}`;
  }
}

export function montarEmail(id: string, dados: Dados = {}) {
  const f = MODELOS[id];
  if (!f) throw new Error(`modelo de e-mail desconhecido: ${id}`);
  const m = f(dados);
  if (m.marketing && !dados.sair) throw new Error(`o e-mail ${id} precisa do link para sair da lista (dados.sair)`);
  const assunto = trocar(m.assunto, dados);
  const preheader = trocar(m.preheader, dados);
  const identidade = `<b>Bené, a Ovelhinha</b> · <a href="${SITE}" style="color:${C.tinta}">www.beneaovelhinha.online</a><br>Dúvidas? É só responder este e-mail.<br>`;
  const rodape = m.marketing
    ? `${identidade}Você recebe este e-mail porque deixou seu contato no site da Bené.<br><a href="${esc(dados.sair!)}" style="color:${C.tinta}">Não quero mais receber estes e-mails</a>`
    : `${identidade}Você recebe este e-mail porque fez uma compra no site da Bené.`;

  const html = `<!DOCTYPE html>
<html lang="pt-BR" xmlns="http://www.w3.org/1999/xhtml"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="x-apple-disable-message-reformatting">
<meta name="color-scheme" content="light"><meta name="supported-color-schemes" content="light">
<title>${esc(assunto)}</title>
<style>a{color:${C.tinta}}@media (max-width:620px){.card{padding:24px 18px!important}}</style>
</head>
<body style="margin:0;padding:0;background:${C.ceu}">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:${C.ceu}">${esc(preheader)}&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${C.ceu}" style="background:${C.ceu}"><tr><td align="center" style="padding:24px 12px 32px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px">
<tr><td align="center" style="padding:0 0 14px"><a href="${SITE}" target="_blank"><img src="${SITE}/img/email-logo-v2.png" width="120" height="98" alt="Bené, a Ovelhinha" style="display:block;width:120px;height:auto;border:0;font-family:${FT};font-size:24px;font-weight:800;line-height:1.2;color:${C.tinta}"></a></td></tr>
<tr><td class="card" bgcolor="#FFFFFF" style="background:#FFFFFF;border:3px solid ${C.tinta};border-radius:22px;padding:30px 28px;box-shadow:6px 6px 0 ${C.tinta}">
${m.blocos.map((b) => blocoHtml(b, dados)).join("\n")}
<p style="margin:24px 0 0;font-family:${FB};font-size:16px;line-height:1.5;color:${C.tinta}">Com carinho,<br><b>Equipe da Bené</b></p>
</td></tr>
<tr><td align="center" style="padding:20px 16px 0;font-family:${FB};font-size:13px;line-height:1.5;color:${C.tinta}">${rodape}</td></tr>
</table></td></tr></table>
</body></html>`;

  const texto = [...m.blocos.map((b) => blocoTexto(b, dados)), "Com carinho,\nEquipe da Bené",
    `Bené, a Ovelhinha · ${SITE}`,
    m.marketing ? `Não quer mais receber? ${dados.sair}` : ""].filter(Boolean).join("\n\n");

  return { assunto, preheader, html, texto, marketing: m.marketing };
}
