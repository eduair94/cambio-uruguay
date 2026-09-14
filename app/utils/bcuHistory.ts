/** Presentation for the BCU archive, separate from retail buy/sell boards.
 * Source: https://www.bcu.gub.uy/Estadisticas-e-Indicadores/Paginas/Cotizaciones.aspx
 * The source supplies TCC and TCV separately. Equality is evidence about the
 * supplied rows, never a reason to equate different currencies or rate types.
 */
export const BCU_HISTORY_SOURCE =
  'https://www.bcu.gub.uy/Estadisticas-e-Indicadores/Paginas/Cotizaciones.aspx'

type ReferencePair = { buy: number; sell: number }

export function hasSingleBcuReference(rows: readonly ReferencePair[]): boolean {
  return (
    rows.length > 0 &&
    rows.every(row => Number.isFinite(row.buy) && row.buy > 0 && row.buy === row.sell)
  )
}

export function formatBcuNumber(value: number, locale = 'es'): string {
  if (!Number.isFinite(value) || value <= 0) return '—'
  return value.toLocaleString(
    locale.startsWith('en') ? 'en-US' : locale.startsWith('pt') ? 'pt-BR' : 'es-UY',
    {
      minimumFractionDigits: 2,
      maximumFractionDigits: 20,
    }
  )
}

/** Keep both fields if unequal, even when a two-decimal formatter would hide it. */
export function formatBcuReference(row: ReferencePair, locale = 'es'): string {
  return hasSingleBcuReference([row])
    ? formatBcuNumber(row.sell, locale)
    : `TCC ${formatBcuNumber(row.buy, locale)} · TCV ${formatBcuNumber(row.sell, locale)}`
}

interface BcuHistoryCopy {
  hubTitle: string
  hubHeading: string
  hubIntro: string
  hubDescription: string
  archiveLink: string
  methodologyLink: string
  hubLink: string
  source: string
  value: string
  latest: string
  recordDate: string
  observations: string
  tableNote: string
  dualNote: string
  empty: string
  reference: string
  detailTitle: (currency: string) => string
  detailHeading: (currency: string) => string
  detailDescription: (currency: string) => string
  series: (currency: string, type: string) => string
  unit: (currency: string) => string
  answer: (series: string, value: string) => string
  scope: (type: string, start: string, end: string) => string
  fund: string
  cash: string
  other: string
  indexed: string
}

const copy: Record<'es' | 'en' | 'pt', BcuHistoryCopy> = {
  es: {
    hubTitle: 'BCU: valores de referencia e histórico',
    hubHeading: 'Valores de referencia del BCU',
    hubIntro:
      'Valores de UI, UP y UR en el registro consultado. El archivo del dólar se consulta por separado. El BCU publica referencias; no ofrece cambio de moneda al público.',
    hubDescription:
      'Valores de UI, UP y UR e histórico del dólar del BCU. Consultá las fechas, los tipos de referencia y su metodología.',
    archiveLink: 'Ver el histórico del dólar del BCU',
    methodologyLink: 'Cómo se calcula la cotización del BCU',
    hubLink: 'Ver los valores de UI, UP y UR del BCU',
    source: 'Fuente: cotizaciones del BCU',
    value: 'Valor (UYU)',
    latest: 'Último valor en la serie',
    recordDate: 'Fecha del registro',
    observations: 'Observaciones del tipo graficado',
    tableNote:
      'La tabla conserva el tipo y el nombre de cada registro. Los valores se expresan en pesos uruguayos por una unidad de la moneda o unidad indicada.',
    dualNote:
      'Cuando difieren, se muestran TCC (tipo de cambio comprador) y TCV (tipo de cambio vendedor), los dos campos de la fuente; no son precios ofrecidos al público por este sitio.',
    empty:
      'No hay observaciones válidas para este tipo en el período consultado. Consultá la fuente del BCU o elegí otro período.',
    reference: 'Valor de referencia',
    detailTitle: currency => `BCU ${currency}: referencia e histórico`,
    detailHeading: currency => `${currency} del BCU: valor de referencia e histórico`,
    detailDescription: currency =>
      `Histórico de ${currency} publicado por el BCU, con fecha y tipo de referencia. Consultá el gráfico, la tabla y la metodología.`,
    series: (currency, type) => `${currency}${type ? ` · ${type}` : ''}`,
    unit: currency => `UYU por 1 ${currency}`,
    answer: (series, value) => `Última referencia disponible en esta serie (${series}): ${value}.`,
    scope: (type, start, end) => `Gráfico y récords: ${type}, del ${start} al ${end}.`,
    fund: 'PROMED.FONDO: referencia del dólar fondo, calculada con operaciones efectivas ponderadas del mercado BEVSA. No es un precio de compra o venta al público.',
    cash: 'BILLETE: referencia publicada por el BCU para la moneda indicada. No es la pizarra de un banco o casa de cambio ni un precio al que el BCU venda moneda al público.',
    other:
      'Referencia publicada por el BCU para el tipo indicado. Se conserva la identificación de la fuente; no se equipara a otros tipos de cotización ni a una oferta al público.',
    indexed:
      'Valor en pesos uruguayos de una unidad. UI, UP y UR son unidades de referencia, no pizarras de compra y venta de moneda.',
  },
  en: {
    hubTitle: 'BCU reference values and history',
    hubHeading: 'BCU reference values',
    hubIntro:
      'UI, UP and UR values in the retrieved records. The dollar archive is available separately. BCU publishes reference values and does not exchange currency for the public.',
    hubDescription:
      'UI, UP and UR values and the BCU dollar archive. Check record dates, reference types and methodology.',
    archiveLink: 'View the BCU dollar history',
    methodologyLink: 'How the BCU exchange rate is calculated',
    hubLink: 'View BCU values for UI, UP and UR',
    source: 'Source: BCU exchange rates',
    value: 'Value (UYU)',
    latest: 'Latest value in the series',
    recordDate: 'Record date',
    observations: 'Observations of the charted type',
    tableNote:
      'The table retains the type and name of each record. Values are in Uruguayan pesos per one unit of the specified currency or reference unit.',
    dualNote:
      'When they differ, both source fields are shown: TCC (buying exchange rate) and TCV (selling exchange rate). They are not retail prices offered by this website.',
    empty:
      'There are no valid observations for this type in the requested period. Check the BCU source or choose another period.',
    reference: 'Reference value',
    detailTitle: currency => `BCU ${currency}: reference and history`,
    detailHeading: currency => `BCU ${currency}: reference value and history`,
    detailDescription: currency =>
      `${currency} history published by BCU, with dates and reference types. View the chart, table and methodology.`,
    series: (currency, type) => `${currency}${type ? ` · ${type}` : ''}`,
    unit: currency => `UYU per 1 ${currency}`,
    answer: (series, value) => `Latest reference available in this series (${series}): ${value}.`,
    scope: (type, start, end) => `Chart and records: ${type}, from ${start} to ${end}.`,
    fund: 'PROMED.FONDO: a dollar fondo reference calculated from weighted actual transactions on the BEVSA market. It is not a retail buying or selling price.',
    cash: 'BILLETE: the BCU reference for the specified currency. It is not a bank or exchange house board or a price at which BCU sells currency to the public.',
    other:
      'BCU reference for the specified type. The source identification is retained; it is not treated as equivalent to other rate types or a retail offer.',
    indexed:
      'Value in Uruguayan pesos of one unit. UI, UP and UR are reference units, not retail currency buying and selling quotes.',
  },
  pt: {
    hubTitle: 'BCU: valores de referência e histórico',
    hubHeading: 'Valores de referência do BCU',
    hubIntro:
      'Valores de UI, UP e UR nos registros consultados. O histórico do dólar está disponível separadamente. O BCU publica referências e não oferece câmbio de moeda ao público.',
    hubDescription:
      'Valores de UI, UP e UR e histórico do dólar do BCU. Consulte as datas, os tipos de referência e a metodologia.',
    archiveLink: 'Ver o histórico do dólar do BCU',
    methodologyLink: 'Como é calculada a cotação do BCU',
    hubLink: 'Ver os valores de UI, UP e UR do BCU',
    source: 'Fonte: cotações do BCU',
    value: 'Valor (UYU)',
    latest: 'Último valor da série',
    recordDate: 'Data do registro',
    observations: 'Observações do tipo no gráfico',
    tableNote:
      'A tabela mantém o tipo e o nome de cada registro. Os valores são expressos em pesos uruguaios por uma unidade da moeda ou unidade indicada.',
    dualNote:
      'Quando diferem, são exibidos TCC (taxa de câmbio de compra) e TCV (taxa de câmbio de venda), os dois campos da fonte; não são preços oferecidos ao público por este site.',
    empty:
      'Não há observações válidas para este tipo no período consultado. Consulte a fonte do BCU ou escolha outro período.',
    reference: 'Valor de referência',
    detailTitle: currency => `BCU ${currency}: referência e histórico`,
    detailHeading: currency => `${currency} do BCU: valor de referência e histórico`,
    detailDescription: currency =>
      `Histórico de ${currency} publicado pelo BCU, com data e tipo de referência. Consulte o gráfico, a tabela e a metodologia.`,
    series: (currency, type) => `${currency}${type ? ` · ${type}` : ''}`,
    unit: currency => `UYU por 1 ${currency}`,
    answer: (series, value) => `Última referência disponível nesta série (${series}): ${value}.`,
    scope: (type, start, end) => `Gráfico e recordes: ${type}, de ${start} a ${end}.`,
    fund: 'PROMED.FONDO: referência do dólar fondo, calculada com operações efetivas ponderadas do mercado BEVSA. Não é um preço de compra ou venda ao público.',
    cash: 'BILLETE: referência publicada pelo BCU para a moeda indicada. Não é a cotação de um banco ou casa de câmbio nem um preço pelo qual o BCU venda moeda ao público.',
    other:
      'Referência publicada pelo BCU para o tipo indicado. A identificação da fonte é preservada; não é equiparada a outros tipos de cotação nem a uma oferta ao público.',
    indexed:
      'Valor em pesos uruguaios de uma unidade. UI, UP e UR são unidades de referência, não cotações de compra e venda de moeda.',
  },
}

export function bcuHistoryCopy(locale = 'es'): BcuHistoryCopy {
  return copy[locale.startsWith('en') ? 'en' : locale.startsWith('pt') ? 'pt' : 'es']
}

export function bcuReferenceExplanation(currency: string, type: string, locale = 'es'): string {
  const text = bcuHistoryCopy(locale)
  if (['UI', 'UP', 'UR'].includes(currency.toUpperCase())) return text.indexed
  if (currency.toUpperCase() === 'USD' && type.toUpperCase() === 'PROMED.FONDO') return text.fund
  return type.toUpperCase() === 'BILLETE' ? text.cash : text.other
}
