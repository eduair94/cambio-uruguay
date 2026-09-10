import type { EquiparCopy } from './equiparCopy'

export const equiparPt: EquiparCopy = {
  eyebrow: 'Moradia',
  title: 'Quanto custa mobiliar uma casa vazia no Uruguai',
  shortTitle: 'Mobiliar a casa',
  description:
    'O que comprar primeiro para uma casa sem móveis e quanto custa hoje: 38 categorias com preços de lojas uruguaias, Mercado Livre e Facebook Marketplace, ordenadas por necessidade e com três orçamentos já somados.',
  intro:
    'Você conseguiu o aluguel e ele está vazio. Esta página ordena o que comprar primeiro, com o preço de mercado de hoje ao lado de cada coisa, o preço de usado quando existe, e três cestas já somadas para você não ter de fazer a conta.',
  navLabel: 'Seções da página',
  nav: [
    { id: 'canastas', label: 'Quanto custa' },
    { id: 'ranking', label: 'O que comprar primeiro' },
    { id: 'calculadora', label: 'Com o que eu tenho' },
    { id: 'consejos', label: 'O que nenhum preço diz' },
    { id: 'metodo', label: 'De onde vêm os preços' },
  ],

  quickTitle: 'Quanto custa',
  quickIntro:
    'Três formas de mobiliar a mesma casa. A mínima compra usado onde o usado faz sentido; a decente compra novo de entrada; a completa acrescenta o que pode esperar e compra no meio do mercado.',
  basketBlurbs: {
    minima: 'Só o que não pode esperar, comprando usado onde convém.',
    decente: 'Isso mais a lista das primeiras semanas, tudo novo de entrada.',
    completa: 'Acrescenta o que se compra quando sobra dinheiro, a preço médio de mercado.',
  },
  basketPartial: 'Total parcial',
  basketMissing: 'Sem preço esta semana: {items}. O total acima não os inclui.',
  basketComplete: 'Todas as categorias desta cesta têm preço.',
  basketItems: '{n} coisas',
  perMonth: 'equivale a {amount} por mês durante um ano',

  tierTitle: 'O que comprar primeiro',
  tierIntro:
    'A ordem mede necessidade, não preço nem popularidade: em cima está o que faz a casa funcionar, embaixo o que pode esperar meses sem consequências. Cada linha diz por que está onde está.',
  tierNames: {
    S: { name: 'Sem isso a casa não funciona', blurb: 'No primeiro dia, sem discussão.' },
    A: { name: 'Primeiras semanas', blurb: 'Dá para improvisar uns dias e depois não.' },
    B: { name: 'Quando sobra dinheiro', blurb: 'Melhora a casa; nada para de funcionar sem isso.' },
    C: { name: 'Pode esperar meses', blurb: 'Quase sempre há algo mais barato que faz o mesmo.' },
  },
  colItem: 'O quê',
  colNew: 'Novo',
  colUsed: 'Usado',
  colSaving: 'Economia',
  colWhy: 'Por que aqui',
  noData: 'sem preço esta semana',
  noUsedData: 'sem dados suficientes de usado',
  usedNotAdvised: 'usado não recomendado',
  quantityLabel: 'compram-se {n}',
  observations: '{n} preços levantados',

  calcTitle: 'Com o que eu tenho, até onde chego?',
  calcIntro:
    'Coloque quanto você tem e desça na ordem de necessidade. Não reordena para caber mais coisas: comprar seis coisas baratas em vez da geladeira preenche a lista e deixa você sem geladeira.',
  calcBudget: 'Quanto eu tenho (pesos)',
  calcAcceptUsed: 'Aceito comprar usado',
  calcOwnedTitle: 'Isto eu já tenho',
  calcOwnedHint: 'Marque o que não precisa comprar e sai do plano.',
  calcReach: 'Com {budget} você chega até aqui',
  calcCut: 'Aqui o dinheiro acaba: {item}',
  calcCovered: 'Você cobre {n} de {total} categorias',
  calcLeftover: 'Sobram {amount}',
  calcMissing: 'Faltam {amount} para o resto',
  calcEmpty: 'Escreva um valor para ver até onde chega.',
  reset: 'Limpar',

  notesTitle: 'O que nenhum preço diz',
  notesIntro:
    'Quatro coisas que vêm da experiência e não de uma planilha. As três primeiras foram discutidas no tópico do r/uruguay que originou esta página.',
  notes: [
    {
      title: 'A tábua de corte, de madeira',
      text: 'De metal ou de vidro tira o fio da faca bem rápido, e a faca custa mais que a tábua. Quanto mais grossa, menos entorta; as de bambu têm bom preço.',
    },
    {
      title: 'Poucas panelas e boas, não muitas e ruins',
      text: 'O fundo fino queima tudo e não tem conserto. Com uma panela grande, uma pequena e uma frigideira se cozinha quase tudo.',
    },
    {
      title: 'O ar-condicionado já desumidifica',
      text: 'Tem modo dry, e na verdade qualquer modo seca o ar. Não são idênticos — o desumidificador junta a água num tanque — mas para umidade normal não precisa comprar os dois.',
    },
    {
      title: 'O colchão usado é a exceção',
      text: 'É a única coisa desta lista onde a opção barata é o mau conselho: percevejos, ácaros e um afundamento que só aparece quando você dorme em cima. No resto, o usado é um mercado real.',
    },
  ],
  threadCredit: 'Tópico original no r/uruguay',

  methodTitle: 'De onde vêm os preços',
  method: [
    'Leem-se dezesseis lojas uruguaias pelo próprio catálogo publicado, mais Mercado Livre e Facebook Marketplace. Os preços em dólares são convertidos pela cotação do dia para que as linhas possam ser comparadas.',
    'Novo e usado nunca são misturados: são dois mercados diferentes e juntá-los dá um número que não descreve nenhum. A economia só é publicada quando os dois lados têm observações suficientes.',
    'Cada categoria tem sua própria faixa por percentis, não um fator fixo: a dispersão real de uma frigideira não é a de uma geladeira. Uma linha muito abaixo da própria faixa fica marcada e nunca encabeça.',
    'Se falta uma categoria numa cesta, o total é publicado como parcial e diz qual falta. Um total sem a geladeira é mais baixo que a verdade e se lê como uma pechincha.',
  ],
  sourcesLabel: 'Fontes desta execução',

  faqTitle: 'Perguntas',
  faq: [
    {
      q: 'Quanto custa mobiliar uma casa no Uruguai?',
      a: 'Depende do que você compra e em que estado. Esta página monta três cestas com preços do mercado de hoje: a mínima com o indispensável comprando usado onde convém, a decente toda nova de entrada, e a completa com o que se compra quando sobra dinheiro.',
    },
    {
      q: 'O que se compra primeiro numa casa vazia?',
      a: 'Geladeira, colchão, algo para cozinhar e o mínimo para comer e limpar. Isso é o tier S desta página: sem isso a casa não funciona. A máquina de lavar, o micro-ondas e a mesa vêm depois.',
    },
    {
      q: 'Vale a pena comprar eletrodomésticos usados?',
      a: 'Em geral sim, e a economia medida está em cada linha. A exceção é o colchão. Em geladeira e máquina de lavar, peça para ver funcionando: o compressor e a centrifugação são o que morre e não aparece na foto.',
    },
    {
      q: 'Os preços estão atualizados?',
      a: 'São levantados todos os dias, e cada linha diz quantos preços foram levantados. Uma categoria que deixou de ter preços frescos não aparece com um preço velho: aparece como sem preço.',
    },
  ],

  updated: 'Preços levantados em {date}',
  noPrices:
    'Não há preços disponíveis neste momento. A lista do que comprar e em que ordem continua válida.',
  relatedTitle: 'Continue lendo',
  related: [
    {
      to: '/primer-alquiler-uruguay',
      label: 'Primeiro aluguel',
      hint: 'Custos e trâmites da assinatura',
    },
    { to: '/alquileres-uruguay', label: 'Aluguéis', hint: 'O diretório de anúncios' },
    { to: '/plan-de-vida-uruguay', label: 'Plano de vida', hint: 'A ordem de cada peso' },
    {
      to: '/sillas-escritorio-uruguay',
      label: 'Cadeiras de escritório',
      hint: 'O mesmo levantamento, em detalhe',
    },
    {
      to: '/precios-de-supermercado-uruguay',
      label: 'Preços de supermercado',
      hint: 'O que custa encher a geladeira',
    },
    {
      to: '/conviene-comprar-en-cuotas',
      label: 'Parcelado ou à vista',
      hint: 'Se financiar o caro compensa',
    },
  ],
}
