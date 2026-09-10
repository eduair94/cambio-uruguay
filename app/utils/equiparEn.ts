import type { EquiparCopy } from './equiparCopy'

export const equiparEn: EquiparCopy = {
  eyebrow: 'Housing',
  title: 'What it costs to furnish an empty home in Uruguay',
  shortTitle: 'Furnishing a home',
  description:
    'What to buy first for an unfurnished home and what it costs today: 38 categories priced from Uruguayan storefronts, Mercado Libre and Facebook Marketplace, ranked by necessity, with three budgets already added up.',
  intro:
    'You found the rental and it is empty. This page ranks what to buy first, puts today’s market price next to each thing, shows the second-hand price where one exists, and adds up three baskets so you do not have to.',
  navLabel: 'Page sections',
  nav: [
    { id: 'canastas', label: 'What it costs' },
    { id: 'ranking', label: 'What to buy first' },
    { id: 'calculadora', label: 'With what I have' },
    { id: 'consejos', label: 'What no price tells you' },
    { id: 'metodo', label: 'Where the prices come from' },
  ],

  quickTitle: 'What it costs',
  quickIntro:
    'Three ways to furnish the same home. The minimum buys second-hand where second-hand is sane; the decent one buys entry-level new; the complete one adds what can wait and buys at the middle of the market.',
  basketBlurbs: {
    minima: 'Only what cannot wait, buying used where it makes sense.',
    decente: 'That, plus the first-weeks list, all entry-level new.',
    completa: 'Adds what you buy when there is money left, at mid-market prices.',
  },
  basketPartial: 'Partial total',
  basketMissing: 'No price this week: {items}. The total above does not include them.',
  basketComplete: 'Every category in this basket has a price.',
  basketItems: '{n} things',
  perMonth: 'that is {amount} a month for a year',

  tierTitle: 'What to buy first',
  tierIntro:
    'The order measures necessity, not price and not popularity: at the top is what makes the house work, at the bottom what can wait months with no consequences. Every row says why it sits where it does.',
  tierNames: {
    S: { name: 'The house does not work without it', blurb: 'Day one, no argument.' },
    A: { name: 'First weeks', blurb: 'You can improvise for days, then you cannot.' },
    B: { name: 'When there is money left', blurb: 'Improves the home; nothing breaks without it.' },
    C: {
      name: 'Can wait months',
      blurb: 'There is almost always something cheaper that does the same.',
    },
  },
  colItem: 'What',
  colNew: 'New',
  colUsed: 'Used',
  colSaving: 'Saving',
  colWhy: 'Why here',
  noData: 'no price this week',
  noUsedData: 'not enough second-hand data',
  usedNotAdvised: 'used not advised',
  quantityLabel: 'buy {n}',
  observations: '{n} prices observed',

  calcTitle: 'With what I have, how far do I get?',
  calcIntro:
    'Enter what you have and walk down in order of necessity. It deliberately does not reorder to fit more in: buying six cheap things instead of the fridge fills the list and leaves you without a fridge.',
  calcBudget: 'What I have (pesos)',
  calcAcceptUsed: 'I will buy second-hand',
  calcOwnedTitle: 'I already have this',
  calcOwnedHint: 'Tick what you do not need to buy and it drops out of the plan.',
  calcReach: 'With {budget} you get this far',
  calcCut: 'This is where the money runs out: {item}',
  calcCovered: 'You cover {n} of {total} categories',
  calcLeftover: '{amount} left over',
  calcMissing: '{amount} short of the rest',
  calcEmpty: 'Type an amount to see how far it goes.',
  reset: 'Clear',

  notesTitle: 'What no price tells you',
  notesIntro:
    'Four things that come from experience rather than a spreadsheet. The first three were argued in the r/uruguay thread that started this page.',
  notes: [
    {
      title: 'Wooden cutting board',
      text: 'Metal or glass dulls the knife fast, and the knife costs more than the board. Thicker warps less; bamboo ones are well priced.',
    },
    {
      title: 'Few good pots, not many bad ones',
      text: 'A thin base burns everything and cannot be fixed. One large pot, one small one and a frying pan cook almost anything.',
    },
    {
      title: 'An air conditioner already dehumidifies',
      text: 'It has a dry mode, and in truth every mode dries the air. They are not identical — a dehumidifier collects the water in a tank — but for normal damp you do not need both.',
    },
    {
      title: 'A used mattress is the exception',
      text: 'It is the one thing on this list where the cheap option is bad advice: bedbugs, mites, and a sag you cannot see until you sleep on it. Everything else second-hand is a real market.',
    },
  ],
  threadCredit: 'Original thread on r/uruguay',

  methodTitle: 'Where the prices come from',
  method: [
    'Sixteen Uruguayan storefronts are read through their own published catalogues, plus Mercado Libre and Facebook Marketplace. Prices in dollars are converted at the day’s rate so rows can be compared.',
    'New and used are never averaged together: they are different markets, and mixing them gives a number that describes neither. A saving is only published when both sides have enough observations.',
    'Each category gets its own percentile band rather than a fixed multiplier: the real spread of a frying pan is not the spread of a fridge. A row far below its own band is flagged and never leads.',
    'If a basket is missing a category, the total is published as partial and says which one. A total missing the fridge is lower than the truth and reads as a bargain.',
  ],
  sourcesLabel: 'Sources in this run',

  faqTitle: 'Questions',
  faq: [
    {
      q: 'How much does it cost to furnish a home in Uruguay?',
      a: 'It depends what you buy and in what condition. This page builds three baskets from today’s market: a minimum with the essentials bought used where sensible, a decent one all entry-level new, and a complete one with what you buy when there is money left.',
    },
    {
      q: 'What do you buy first for an empty home?',
      a: 'A fridge, a mattress, something to cook on, and the minimum to eat and clean. That is tier S on this page: the house does not work without it. The washing machine, the microwave and the table come after.',
    },
    {
      q: 'Is it worth buying appliances second-hand?',
      a: 'Generally yes, and the measured saving is on every row. The exception is the mattress. For a fridge or a washing machine, ask to see it running: the compressor and the spin cycle are what fail, and neither shows in a photo.',
    },
    {
      q: 'Are the prices current?',
      a: 'They are harvested daily, and each row says how many prices were observed. A category that stopped having fresh prices is not shown with an old one — it is shown as having no price.',
    },
  ],

  updated: 'Prices observed on {date}',
  noPrices: 'No prices are available right now. What to buy, and in what order, still holds.',
  relatedTitle: 'Keep reading',
  related: [
    {
      to: '/primer-alquiler-uruguay',
      label: 'First rental',
      hint: 'Costs and paperwork at signing',
    },
    { to: '/alquileres-uruguay', label: 'Rentals', hint: 'The listings directory' },
    { to: '/plan-de-vida-uruguay', label: 'Life plan', hint: 'The order of every peso' },
    { to: '/sillas-escritorio-uruguay', label: 'Desk chairs', hint: 'The same harvest, in detail' },
    {
      to: '/precios-de-supermercado-uruguay',
      label: 'Supermarket prices',
      hint: 'What filling the fridge costs',
    },
    {
      to: '/conviene-comprar-en-cuotas',
      label: 'Instalments or cash',
      hint: 'Whether financing the big items pays',
    },
  ],
}
