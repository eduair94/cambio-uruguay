// Questions to resolve before opening an account. No new ranking or tariff claims:
// the page's existing rubric remains the only source of scores.
export const bankDecisionLinks = [
  { id: 'everyday', to: '/guias/abrir-una-cuenta-bancaria-uruguay' },
  { id: 'abroad', to: '/guias/recibir-transferencia-del-exterior-uruguay' },
  { id: 'saving', to: '/guias/plazo-fijo-en-uruguay-conviene' },
] as const

export const bankDecisionSources = [
  {
    id: 'conditions',
    url: 'https://usuariofinanciero.bcu.gub.uy/depositos/derechos-y-obligaciones/',
  },
  {
    id: 'access',
    url: 'https://usuariofinanciero.bcu.gub.uy/depositos/tipos-de-depositos/',
  },
  {
    id: 'protection',
    url: 'https://www.copab.org.uy/innovaportal/v/78/1/web/que-depositos-estan-garantizados',
  },
] as const

export const bankDecisionMessages = {
  es: {
    lead: 'Compará bancos y fintech según comisiones, app, atención y uso en dólares. Estos son los primeros del ranking; cambiá los criterios para adaptarlo a lo que necesitás.',
    results: 'Primeros con tus criterios',
    resultHint:
      'Puntaje de nuestra rúbrica, no una tasa ni una calificación de solvencia. Abrí una ficha para ver sus límites y fuentes.',
    details: 'Ver ficha',
    criteria: 'Cambiar criterios',
    decision: 'Antes de abrir una cuenta',
    decisionLead:
      'Una buena posición en el ranking no alcanza para elegir un producto. Compará la cuenta concreta que te ofrecen y pedí sus condiciones por escrito.',
    everyday: {
      title: 'Para cobrar y pagar todos los días',
      body: 'Anotá cuánto cuesta mantener la cuenta, retirar efectivo y transferir. Preguntá si la exoneración depende de cobrar el sueldo o mantener un saldo mínimo, y qué pasa cuando dejás de cumplir esa condición.',
      action: 'Requisitos para abrir una cuenta',
    },
    abroad: {
      title: 'Para recibir dinero del exterior',
      body: 'Compará cuánto llega a destino después de los cargos del envío y la recepción. Separá esa cuenta del cambio de moneda: recibir dólares y convertirlos a pesos son dos operaciones distintas.',
      action: 'Costos de recibir una transferencia',
    },
    saving: {
      title: 'Para guardar un ahorro',
      body: 'Definí en qué moneda vas a necesitar la plata y cuándo. Revisá si podés retirarla a demanda o queda a plazo, y verificá qué protección corresponde al producto y a la institución.',
      action: 'Qué revisar en un plazo fijo',
    },
    sources: 'Para verificar las condiciones',
    conditions: 'BCU: costos y condiciones de una cuenta',
    access: 'BCU: depósitos a la vista y a plazo',
    protection: 'COPAB: qué depósitos están garantizados',
    reviewed:
      'Fuentes de esta guía consultadas el 23/10/2026. Las fechas del ranking siguen indicadas en sus fichas.',
  },
  en: {
    lead: 'Compare banks and fintechs by fees, app, service and dollar transactions. These are the current ranking leaders; adjust the criteria to fit your needs.',
    results: 'Leaders for your selected criteria',
    resultHint:
      'Our rubric score is neither an interest rate nor a credit rating. Open a profile to review its limitations and sources.',
    details: 'View profile',
    criteria: 'Change criteria',
    decision: 'Before opening an account',
    decisionLead:
      'A high ranking alone does not identify the right product. Compare the actual account on offer and request its terms in writing.',
    everyday: {
      title: 'For everyday income and payments',
      body: 'List maintenance, cash withdrawal and transfer charges. Ask whether a fee waiver requires salary deposits or a minimum balance, and what happens when you no longer meet that condition.',
      action: 'Account opening requirements',
    },
    abroad: {
      title: 'For receiving money from abroad',
      body: 'Compare how much arrives after sending and receiving charges. Consider currency conversion separately: receiving dollars and exchanging them for pesos are different transactions.',
      action: 'Incoming transfer costs',
    },
    saving: {
      title: 'For keeping savings',
      body: 'Decide when you will need the money and in which currency. Check whether withdrawals are available on demand or tied to a term, and which protection applies to the product and institution.',
      action: 'What to check in a fixed-term deposit',
    },
    sources: 'Check the conditions',
    conditions: 'BCU: account charges and conditions',
    access: 'BCU: demand and term deposits',
    protection: 'COPAB: deposits covered by the guarantee',
    reviewed:
      'Sources for this guide checked on 23 October 2026. Ranking dates remain listed in each profile.',
  },
  pt: {
    lead: 'Compare bancos e fintechs por tarifas, app, atendimento e operações em dólares. Estes são os primeiros do ranking; ajuste os critérios ao que você precisa.',
    results: 'Primeiros com seus critérios',
    resultHint:
      'Nota da nossa metodologia, não uma taxa de juros nem uma classificação de solvência. Abra a ficha para conferir limites e fontes.',
    details: 'Ver ficha',
    criteria: 'Mudar critérios',
    decision: 'Antes de abrir uma conta',
    decisionLead:
      'Uma boa posição no ranking não basta para escolher um produto. Compare a conta oferecida e peça as condições por escrito.',
    everyday: {
      title: 'Para receber e pagar no dia a dia',
      body: 'Anote os custos de manutenção, saques e transferências. Pergunte se a isenção depende do recebimento do salário ou de um saldo mínimo, e o que acontece quando essa condição deixa de ser cumprida.',
      action: 'Requisitos para abrir uma conta',
    },
    abroad: {
      title: 'Para receber dinheiro do exterior',
      body: 'Compare quanto chega após as tarifas de envio e recebimento. Considere o câmbio separadamente: receber dólares e convertê-los em pesos são operações diferentes.',
      action: 'Custos de receber uma transferência',
    },
    saving: {
      title: 'Para guardar uma reserva',
      body: 'Defina quando vai precisar do dinheiro e em qual moeda. Confira se pode sacar a qualquer momento ou se há um prazo, e qual proteção se aplica ao produto e à instituição.',
      action: 'O que conferir num depósito a prazo',
    },
    sources: 'Confira as condições',
    conditions: 'BCU: custos e condições de uma conta',
    access: 'BCU: depósitos à vista e a prazo',
    protection: 'COPAB: quais depósitos estão garantidos',
    reviewed:
      'Fontes desta orientação consultadas em 23/10/2026. As datas do ranking continuam indicadas em cada ficha.',
  },
} as const
