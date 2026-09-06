import type { FirstRentalCopy } from './firstRental'

export const firstRentalPt: FirstRentalCopy = {
  title: 'Primeiro aluguel no Uruguai: despesas e procedimentos da mudança',
  description:
    'O que pagar além do aluguel, como transferir UTE e OSE para o seu nome e o que conferir ao receber as chaves. CGN, tributos, esgoto e orçamento inicial.',
  eyebrow: 'Moradia · Você já encontrou onde morar',
  intro:
    'Você está prestes a assinar o contrato e falta entender como a casa funciona: quais contas chegam, em nome de quem e o que vale a pena resolver antes de entrar.',
  quickTitle: 'Casa, CGN e sem condomínio: o que mais você precisa pagar?',
  quickAnswer:
    'Aluguel + 3 % mensais da CGN, luz, água e os tributos e a tarifa de esgoto aplicáveis ao imóvel. Some internet, gás e outros serviços que contratar. Não ter despesas de condomínio não significa que o aluguel inclua as demais contas.',
  scope:
    'O guia parte de uma casa com contas independentes de UTE e OSE. Os detalhes sobre o tributo domiciliar e a cobrança municipal de esgoto se referem a Montevidéu; mais abaixo explicamos o que muda no interior.',
  navLabel: 'Neste guia',
  nav: [
    { id: 'llaves', label: 'Antes de entrar' },
    { id: 'cuentas', label: 'O que você vai pagar' },
    { id: 'tramites', label: 'UTE e OSE' },
    { id: 'presupuesto', label: 'Seu orçamento' },
  ],
  checklistTitle: 'O que você recebe junto com as chaves',
  checklistIntro:
    'Marque o que já tem. Esta lista permanece enquanto você estiver na página; ela não é salva ao sair.',
  checklist: [
    {
      id: 'contract',
      title: 'Contrato e detalhamento do que você pagou',
      text: 'Cópia assinada, data de início da cobrança do aluguel, reajuste, honorários combinados e recibos. Confirme quando começa o desconto da CGN e como é calculado o primeiro período.',
    },
    {
      id: 'accounts',
      title: 'Últimas faturas e contas sem atrasos',
      text: 'Peça as contas de UTE, OSE, tributos e esgoto, com os números das contas e os períodos. O locador com CGN deve entregar o imóvel sem dívidas acessórias; registre qualquer pendência.',
    },
    {
      id: 'meters',
      title: 'Fotos dos medidores e do imóvel',
      text: 'Anote as leituras e a data da entrega. Confira se cada medidor corresponde à sua casa; fotografe umidade, vidros, torneiras e equipamentos. As fotos acompanham o inventário, não o substituem.',
    },
    {
      id: 'inventory',
      title: 'Inventário conferido',
      text: 'Compare o inventário com o estado real antes de assinar. Se encontrar diferenças, informe e providencie a correção imediatamente com a imobiliária e o SGA; não deixe para o fim do contrato.',
    },
    {
      id: 'contacts',
      title: 'Titulares, vencimentos e contato para reparos',
      text: 'Combine a transferência de UTE e OSE para o seu nome. Confirme como receber cada fatura, quem atende em caso de vazamento ou avaria e onde ficam o registro de água e o quadro elétrico.',
    },
  ],
  checked: '{done} de {total} resolvidos',
  reset: 'Desmarcar a lista',
  billsTitle: 'As contas que continuam depois da mudança',
  billsIntro:
    'Peça os valores reais deste imóvel. A conta de outra casa não informa quanto você vai consumir, e uma fatura com dívida não serve de base para o orçamento habitual.',
  bills: [
    {
      id: 'rent',
      title: 'Aluguel e comissão da CGN · Todo mês',
      text: 'A CGN-SGA cobra do inquilino 3 % do aluguel por mês. Exemplo ilustrativo: $25.000 de aluguel + $750 de comissão = $25.750 antes dos serviços. A comissão do proprietário é independente: não se acrescentam outros 3 % à sua conta.',
      sources: ['cgnFee'],
    },
    {
      id: 'utilities',
      title: 'UTE e OSE · Conforme cada fatura',
      text: 'Você paga a eletricidade e a água do seu período. Confirme a data da leitura, as cobranças fixas, a tarifa e o vencimento; o consumo varia com seus hábitos. Não presuma que a CGN paga essas contas por você: combine o meio de pagamento e guarde os comprovantes.',
      sources: ['cgnBills', 'cgnRights'],
    },
    {
      id: 'tax',
      title: 'Tributo domiciliar · A cada dois meses em Montevidéu',
      text: 'É o chamado imposto de porta, que a CGN inclui entre as despesas acessórias do inquilino. Peça o número da conta e uma fatura habitual. Se a cobrança for de $1.200 a cada dois meses, reserve $600 por mês; é um exemplo de organização, não uma tarifa.',
      sources: ['homeTax', 'cgnBills'],
    },
    {
      id: 'sanitation',
      title: 'Esgoto · Confira o prestador e a ligação',
      text: 'Em Montevidéu, a IM cobra a cada dois meses dos ocupantes de imóveis que usam a rede. É uma conta separada da água potável da OSE. Há uma parcela fixa e outra vinculada ao consumo: peça a fatura desta casa, não um valor genérico.',
      sources: ['sanitation'],
    },
    {
      id: 'common',
      title: 'Condomínio · Somente se houver',
      text: 'Em uma casa comprovadamente sem despesas de condomínio, esse item é zero. Em um apartamento, peça o detalhamento: pode incluir água ou esgoto, que você não deve somar novamente. Separe as despesas ordinárias das obras ou despesas do proprietário.',
      sources: ['cgnBills'],
    },
  ],
  territoryTitle: 'O departamento e a ligação mudam a conta',
  territory: [
    {
      id: 'montevideo',
      title: 'Se a casa fica em Montevidéu',
      text: 'Tributo domiciliar, esgoto e Contribuição Imobiliária são cobranças distintas. O adicional da Contribuição destinado à drenagem pluvial cabe ao proprietário; não é a tarifa de esgoto do ocupante.',
      sources: ['sanitation', 'propertyTax'],
    },
    {
      id: 'interior',
      title: 'Se fica em outro departamento',
      text: 'A OSE presta o serviço de esgoto no interior, além do abastecimento de água em todo o país. Confira a fatura local e a ligação do imóvel: se você já inseriu uma conta da OSE que inclui esgoto, não o acrescente novamente. Consulte os tributos na intendência correspondente. Se houver fossa, pergunte sobre o serviço de limpa-fossa e combine quem o solicita e paga.',
      sources: ['oseCoverage'],
    },
  ],
  proceduresTitle: 'Como colocar luz e água no seu nome',
  procedures: [
    {
      id: 'ute',
      title: 'UTE: troca de titularidade do serviço',
      text: 'O novo titular faz a solicitação. Tenha em mãos o número da conta ou os dados do endereço e do titular atual, além dos seus dados pessoais. A UTE exige ser maior de idade e não ter dívida própria pendente. Se o serviço estiver cortado ou não houver ligação, consulte o procedimento e o custo aplicáveis: trocar a titularidade não equivale a uma nova ligação.',
      sources: ['ute'],
    },
    {
      id: 'ose',
      title: 'OSE: troca de titularidade do serviço',
      text: 'Prepare seu documento de identificação e um comprovante do cadastro do imóvel (padrón), como uma conta de tributos ou certidão cadastral; leve também o contrato. Se houver dívida, a OSE prevê a apresentação do vínculo com o imóvel e de uma declaração juramentada para solicitar a desvinculação. A dívida não desaparece apenas porque você informa que acabou de se mudar. O procedimento é informado como gratuito, exceto pelo selo profissional para essa desvinculação; uma nova ligação ou a individualização do serviço é outro procedimento.',
      sources: ['ose'],
    },
    {
      id: 'municipal',
      title: 'Tributos e esgoto: garanta que a fatura chegue até você',
      text: 'Peça os números das contas à imobiliária e verifique com o prestador como consultar dívidas, receber a fatura e registrar o ocupante quando aplicável. Anote os vencimentos. Se uma fatura abranger a data da entrega, combine por escrito como separar o período anterior do seu usando as leituras e as datas.',
      sources: ['homeTax', 'sanitation'],
    },
  ],
  ownerTitle: 'O que convém separar do seu consumo',
  ownerText:
    'A Contribuição Imobiliária e o Imposto de Educação Primária não são o tributo domiciliar. Seus contribuintes incluem proprietários e outros titulares de direitos sobre o imóvel; não os acrescente automaticamente como se fossem luz ou água. Se o contrato pretender repassar essas cobranças a você, consulte o SGA sobre essa cláusula antes de assinar.',
  repairsText:
    'A CGN distingue os reparos necessários à habitabilidade, a cargo do locador, dos reparos decorrentes do uso, a cargo do inquilino. Em caso de umidade, vazamentos ou falhas, documente e avise; não desconte um reparo do aluguel por conta própria nem faça melhorias sem autorização por escrito.',
  entryTitle: 'O dinheiro para entrar é calculado à parte',
  entryText:
    'Peça um demonstrativo por escrito: primeiro período de aluguel, honorários imobiliários combinados com impostos, mudança e qualquer ligação ou religação necessária. A CGN não cobra para elaborar ou celebrar o contrato, mas isso não elimina os honorários da imobiliária. Não acrescente uma garantia ou depósito extra por costume: verifique o que foi combinado. Some os equipamentos básicos e uma margem para imprevistos.',
  budgetTitle: 'Transforme suas faturas em um orçamento mensal',
  budgetIntro:
    'Insira seus próprios valores em pesos uruguaios, sem separador de milhares: por exemplo, 25000. Some cada despesa uma única vez; digite 0 se não for aplicável e deixe em branco o que ainda não souber. Esses dados não são salvos nem enviados.',
  fields: {
    rent: { label: 'Aluguel mensal', hint: 'Somente o aluguel, antes da comissão da CGN.' },
    monthly: {
      label: 'Outras despesas por mês',
      hint: 'Some UTE, OSE, internet, gás e condomínio, se houver. Se usar outra garantia, inclua aqui seu custo mensal equivalente.',
    },
    bimonthly: {
      label: 'Total das faturas a cada dois meses',
      hint: 'Por exemplo, tributo domiciliar + esgoto da IM. Insira a soma integral das duas faturas, sem dívidas; dividimos por 2.',
    },
    entry: {
      label: 'Despesas iniciais, pagas uma única vez',
      hint: 'Honorários, mudança, ligações e equipamentos. Exclua o aluguel e as contas já inseridos acima.',
    },
  },
  cgnLabel: 'Minha garantia é CGN: somar 3 % mensais',
  cgnHint: 'Aplica-se somente ao aluguel. Não é uma comissão universal para outras garantias.',
  monthlyResult: 'Reserva mensal para a moradia',
  entryResult: 'Um mês de reserva + despesas iniciais',
  feeResult: 'Comissão mensal da CGN',
  missing: 'Cálculo parcial: faltam valores. Os campos em branco não são somados.',
  budgetEmpty: 'Insira o aluguel para ver o cálculo.',
  invalid: 'Use um valor entre 0 e 1.000.000.000, sem separador de milhares.',
  budgetNote:
    'A reserva distribui as despesas bimestrais entre dois meses; não altera seus vencimentos. Não é o demonstrativo da assinatura nem uma previsão da primeira fatura. Alimentação, transporte e outras despesas pessoais são calculados à parte.',
  faqTitle: 'Dúvidas sobre o primeiro aluguel',
  faq: [
    {
      q: 'A CGN desconta tudo junto com o aluguel?',
      a: 'Não presuma que o desconto inclui luz, água, tributos ou esgoto. Identifique cada conta, como é paga e quais comprovantes você precisa guardar. A comissão mensal do inquilino é de 3 % do aluguel.',
    },
    {
      q: 'Pagar a OSE inclui o esgoto?',
      a: 'Em Montevidéu, a água potável da OSE e a tarifa de esgoto da IM são contas separadas. No interior, a OSE presta o serviço de esgoto: confira a ligação e o detalhamento da fatura. Se um item já estiver incluído, não o some duas vezes.',
    },
    {
      q: 'Preciso pagar dívidas deixadas pelo inquilino anterior?',
      a: 'Com a CGN, o locador deve entregar o imóvel sem dívidas acessórias. Peça a situação das contas e documente os períodos. Se a OSE mostrar dívida, solicite a desvinculação com os documentos exigidos; não presuma que a troca de titularidade a resolve automaticamente.',
    },
    {
      q: 'Qual é a diferença entre uma casa e um apartamento?',
      a: 'A casa pode não ter condomínio, mas continua tendo serviços e tributos aplicáveis. Em um apartamento, parte do consumo pode vir incluída no condomínio. O que importa é o detalhamento real, se os medidores são individuais e se o imóvel tem ligação à rede de esgoto.',
    },
  ],
  relatedTitle: 'Para o próximo passo',
  related: [
    { path: '/alquilar-en-uruguay', label: 'Garantias, contrato e busca de moradia' },
    { path: '/alquileres-uruguay', label: 'Buscar casas e apartamentos para alugar' },
    { path: '/herramientas/costo-de-vida', label: 'Somar as demais despesas de morar no Uruguai' },
  ],
  sourcesTitle: 'Fontes para conferir cada procedimento',
  sourceNewTab: 'Abrir fonte em outra aba',
  reviewed:
    'Fontes revisadas em 6 de setembro de 2026. Os valores do orçamento são inseridos por você; consulte suas faturas e as condições do seu contrato.',
  sourceLabels: {
    cgnFee: 'CGN · Comissão mensal',
    cgnBills: 'CGN · Serviços acessórios',
    cgnRights: 'CGN · Direitos e obrigações',
    homeTax: 'IM · Tributos domiciliares',
    propertyTax: 'IM · Contribuição Imobiliária',
    primaryTax: 'DGI · Imposto de Educação Primária',
    ose: 'OSE · Troca de titularidade',
    ute: 'UTE · Troca de titularidade',
    sanitation: 'IM · Tarifa de esgoto',
    oseCoverage: 'OSE · Água e esgoto',
    landlord: 'CGN · Obrigações do locador',
  },
}
