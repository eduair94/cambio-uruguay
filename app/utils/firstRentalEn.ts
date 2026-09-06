import type { FirstRentalCopy } from './firstRental'

export const firstRentalEn: FirstRentalCopy = {
  title: 'Your first rental in Uruguay: moving costs and paperwork',
  description:
    'What to pay besides rent, how to transfer UTE and OSE accounts to your name, and what to check when you get the keys. CGN, local taxes, sewerage and your move-in budget.',
  eyebrow: 'Housing · You have found a place to live',
  intro:
    'You are about to sign, and now you need to know how the house works: which bills arrive, whose name they are in, and what to sort out before moving in.',
  quickTitle: 'A house with CGN and no shared expenses: what else do you pay?',
  quickAnswer:
    'Rent + a monthly CGN fee of 3%, electricity, water, and the local taxes and sewerage charges that apply to the property. Add internet, gas or any other services you arrange. Having no shared expenses does not mean your rent includes the other bills.',
  scope:
    'This guide assumes a house with separate UTE and OSE accounts. The details about the household tax and municipal sewerage billing apply to Montevideo; below, we explain what changes elsewhere in Uruguay.',
  navLabel: 'In this guide',
  nav: [
    { id: 'llaves', label: 'Before moving in' },
    { id: 'cuentas', label: 'What you will pay' },
    { id: 'tramites', label: 'UTE and OSE' },
    { id: 'presupuesto', label: 'Your budget' },
  ],
  checklistTitle: 'What to collect along with the keys',
  checklistIntro:
    'Check off what you already have. This list stays checked while you remain on this page; it is not saved when you leave.',
  checklist: [
    {
      id: 'contract',
      title: 'Contract and a breakdown of your payments',
      text: 'A signed copy, the date your rent starts, adjustment terms, agreed fees and receipts. Confirm when CGN deductions start and how the first rental period is calculated.',
    },
    {
      id: 'accounts',
      title: 'Latest bills and accounts with no arrears',
      text: 'Ask for electricity, water, local tax and sewerage bills, including account numbers and billing periods. A landlord using CGN must hand over the property with no outstanding ancillary bills; record anything still pending.',
    },
    {
      id: 'meters',
      title: 'Photos of the meters and the property',
      text: 'Record meter readings and the handover date. Check that each meter serves your house; photograph damp, glass, taps and fixtures. Photos support the inventory; they do not replace it.',
    },
    {
      id: 'inventory',
      title: 'A checked inventory',
      text: 'Compare it with the actual condition before signing. If you find discrepancies, report them and arrange corrections immediately with the estate agent and SGA; do not leave them until the end of the tenancy.',
    },
    {
      id: 'contacts',
      title: 'Account holders, due dates and a repairs contact',
      text: 'Arrange to put UTE and OSE in your name. Confirm how to receive each bill, who handles leaks or breakages, and where the water shut-off valve and electrical panel are.',
    },
  ],
  checked: '{done} of {total} completed',
  reset: 'Uncheck the list',
  billsTitle: 'The bills that continue after you move in',
  billsIntro:
    'Ask for actual amounts for this property. Another household’s bill cannot tell you how much you will use, and a bill with arrears is not a useful estimate of ordinary costs.',
  bills: [
    {
      id: 'rent',
      title: 'Rent and CGN fee · Every month',
      text: 'CGN-SGA charges tenants 3% of the rent each month. Illustrative example: $25,000 rent + $750 fee = $25,750 before utilities. The landlord’s fee is separate: another 3% is not added to your bill.',
      sources: ['cgnFee'],
    },
    {
      id: 'utilities',
      title: 'UTE and OSE · As billed',
      text: 'You pay for electricity and water during your tenancy. Confirm reading dates, fixed charges, tariff and due dates; consumption changes with your habits. Do not assume CGN pays these bills for you: agree on the payment method and keep receipts.',
      sources: ['cgnBills', 'cgnRights'],
    },
    {
      id: 'tax',
      title: 'Household tax · Every two months in Montevideo',
      text: 'This is the charge known as impuesto de puerta, which CGN includes among the tenant’s ancillary bills. Ask for the account number and an ordinary bill. If it comes to $1,200 every two months, set aside $600 a month; this is a budgeting example, not a tariff.',
      sources: ['homeTax', 'cgnBills'],
    },
    {
      id: 'sanitation',
      title: 'Sewerage · Check the provider and connection',
      text: 'In Montevideo, the city government (IM) bills occupants of properties using the sewer network every two months. This is separate from OSE drinking water. The charge has a fixed component and a consumption-related component: ask for this house’s bill instead of using a generic amount.',
      sources: ['sanitation'],
    },
    {
      id: 'common',
      title: 'Shared expenses · Only if applicable',
      text: 'For a house confirmed to have no shared expenses, this item is zero. For an apartment, ask for a breakdown: it may include water or sewerage, which you should not add again. Separate ordinary charges from building works or expenses payable by the owner.',
      sources: ['cgnBills'],
    },
  ],
  territoryTitle: 'The department and connection affect the bill',
  territory: [
    {
      id: 'montevideo',
      title: 'If the house is in Montevideo',
      text: 'Household tax, sewerage and the Contribución Inmobiliaria property tax are separate charges. The property tax surcharge for stormwater drainage is payable by the owner; it is not the occupant’s sewerage tariff.',
      sources: ['sanitation', 'propertyTax'],
    },
    {
      id: 'interior',
      title: 'If it is in another department',
      text: 'OSE provides sewerage outside Montevideo, as well as water throughout the country. Check the local bill and the property’s connection: if you have already entered an OSE bill that includes sewerage, do not add it again. Ask the relevant departmental government about local taxes. If there is a cesspit, ask about the emptying service and agree on who arranges and pays for it.',
      sources: ['oseCoverage'],
    },
  ],
  proceduresTitle: 'How to put electricity and water in your name',
  procedures: [
    {
      id: 'ute',
      title: 'UTE: changing the account holder',
      text: 'The new account holder makes the request. Have the account number or the address and current holder’s details ready, along with your personal details. UTE requires you to be an adult and have no outstanding debt of your own. If service has been disconnected or there is no connection, check the relevant procedure and cost: changing the name is not the same as setting up a new supply.',
      sources: ['ute'],
    },
    {
      id: 'ose',
      title: 'OSE: changing the account holder',
      text: 'Prepare identification and a document proving the property’s cadastral number (padrón), such as a property tax bill or cadastral certificate; bring the contract too. If debt appears, OSE allows you to submit proof of your connection to the property and a sworn statement to request separation from that debt. It does not disappear simply because you say you have just moved in. The procedure is listed as free, except for the professional stamp required for that debt separation; a new or separate connection is a different procedure.',
      sources: ['ose'],
    },
    {
      id: 'municipal',
      title: 'Local taxes and sewerage: make sure the bill reaches you',
      text: 'Ask the estate agent for account numbers and check with the provider how to view debts, receive bills and register the occupant where required. Add due dates to your calendar. If a bill spans the handover date, agree in writing on how to separate the previous period from yours using readings and dates.',
      sources: ['homeTax', 'sanitation'],
    },
  ],
  ownerTitle: 'What to keep separate from your utility usage',
  ownerText:
    'Contribución Inmobiliaria and Impuesto de Primaria are not the household tax. Those liable include property owners and other holders of rights over the property; do not automatically add these taxes as if they were electricity or water. If the contract seeks to pass them on to you, discuss that clause with SGA before signing.',
  repairsText:
    'CGN distinguishes repairs needed to keep the property habitable, payable by the landlord, from minor repairs resulting from use, payable by the tenant. If there is damp, a leak or a fault, document and report it; do not deduct a repair from the rent yourself or make improvements without written permission.',
  entryTitle: 'Keep move-in money separate',
  entryText:
    'Ask for a written breakdown: the first rental period, agreed estate agent fees including taxes, moving costs, and any required new connections or reconnections. CGN does not charge for drawing up or signing the contract, but that does not eliminate the estate agent’s fees. Do not add an extra guarantee or deposit out of habit: check what was agreed. Add basic equipment and a cushion for unexpected costs.',
  budgetTitle: 'Turn your bills into a monthly budget',
  budgetIntro:
    'Enter your own amounts in Uruguayan pesos without thousands separators: for example, 25000. Include each expense only once; enter 0 if it does not apply and leave unknown amounts blank. These figures are neither saved nor sent anywhere.',
  fields: {
    rent: { label: 'Monthly rent', hint: 'Rent only, before the CGN fee.' },
    monthly: {
      label: 'Other monthly expenses',
      hint: 'Add UTE, OSE, internet, gas and shared expenses, if applicable. If you use another guarantee, include its equivalent monthly cost here.',
    },
    bimonthly: {
      label: 'Total bills due every two months',
      hint: 'For example, household tax + IM sewerage. Enter the full sum of both bills, without arrears; we divide it by 2.',
    },
    entry: {
      label: 'One-off move-in expenses',
      hint: 'Fees, moving, new connections and equipment. Exclude rent and bills already entered above.',
    },
  },
  cgnLabel: 'My guarantee is CGN: add 3% each month',
  cgnHint: 'This applies only to rent. It is not a universal fee for other guarantees.',
  monthlyResult: 'Monthly amount to set aside for housing',
  entryResult: 'One month set aside + move-in expenses',
  feeResult: 'Monthly CGN fee',
  missing: 'Partial calculation: some amounts are missing. Blank fields are not included.',
  budgetEmpty: 'Enter your rent to see the calculation.',
  invalid: 'Use an amount between 0 and 1,000,000,000, without thousands separators.',
  budgetNote:
    'The reserve spreads bills due every two months across two months; it does not change their due dates. It is not the amount due at signing or a prediction of the first bill. Food, transport and other personal expenses are separate.',
  faqTitle: 'First-rental questions',
  faq: [
    {
      q: 'Does CGN deduct everything along with the rent?',
      a: 'Do not assume the deduction includes electricity, water, local taxes or sewerage. Identify each account, how it is paid and which receipts you need to keep. The tenant’s monthly fee is 3% of the rent.',
    },
    {
      q: 'Does paying OSE include sewerage?',
      a: 'In Montevideo, OSE drinking water and the IM sewerage tariff are separate bills. Outside Montevideo, OSE provides sewerage: check the connection and the bill’s breakdown. If an item is already included, do not count it twice.',
    },
    {
      q: 'Do I have to pay debts left by the previous tenant?',
      a: 'With CGN, the landlord must hand over the property with no outstanding ancillary bills. Ask for account statements and document the periods. If OSE shows debt, request separation from it with the required documents; do not assume changing the account holder automatically resolves it.',
    },
    {
      q: 'What is different about renting a house or an apartment?',
      a: 'A house may have no shared expenses but still has applicable utilities and local taxes. In an apartment, some usage may be included in shared expenses. What matters is the actual breakdown, whether meters are separate, and whether the property is connected to the sewer network.',
    },
  ],
  relatedTitle: 'For your next step',
  related: [
    { path: '/alquilar-en-uruguay', label: 'Guarantees, contracts and finding a home' },
    { path: '/alquileres-uruguay', label: 'Find houses and apartments to rent' },
    { path: '/herramientas/costo-de-vida', label: 'Add the other costs of living in Uruguay' },
  ],
  sourcesTitle: 'Sources to check each procedure',
  sourceNewTab: 'Open source in a new tab',
  reviewed:
    'Sources reviewed on September 6, 2026. You enter the budget amounts yourself; check your bills and the terms of your contract.',
  sourceLabels: {
    cgnFee: 'CGN · Monthly fee',
    cgnBills: 'CGN · Ancillary services',
    cgnRights: 'CGN · Rights and obligations',
    homeTax: 'IM · Household taxes',
    propertyTax: 'IM · Property tax',
    primaryTax: 'DGI · Primary education tax',
    ose: 'OSE · Changing the account holder',
    ute: 'UTE · Changing the account holder',
    sanitation: 'IM · Sewerage tariff',
    oseCoverage: 'OSE · Water and sewerage',
    landlord: 'CGN · Landlord obligations',
  },
}
