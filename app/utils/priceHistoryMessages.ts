/**
 * Copy de `components/PriceHistoryBlock.vue`. Vive acá, y no adentro del componente, por el mismo
 * motivo que `rentalPageMessages`: el bloque aparece en fichas de tres idiomas (alquiler y venta son
 * trilingües) y una sola frase en español dentro de una página en inglés se nota.
 *
 * La regla de fondo, en los tres idiomas: lo que se afirma es lo que NOSOTROS medimos, con su fecha.
 * Nunca se dice nada del precio anterior a la primera lectura.
 */
export const priceHistoryMessages = {
  es: {
    title: 'Cómo cambió el precio',
    noChange: 'Lo venimos midiendo desde el {date} y el precio no cambió.',
    lead: 'desde el {date}, cuando lo empezamos a medir: {from} → {to}.',
    down: 'bajó {pct}',
    up: 'subió {pct}',
    flat: 'Sin cambios',
    high: 'máximo {value}',
    low: 'mínimo {value}',
    lastChange: 'Último cambio el {date}: {from} → {to}.',
    currencyNote: 'Antes estaba publicado en otra moneda; ese tramo no se compara con éste.',
    method:
      'Son los precios que este aviso publicó y que nosotros registramos, {points}. No sabemos qué precio tenía antes del {date}.',
    onePoint: 'una sola lectura',
    manyPoints: '{count} lecturas',
  },
  en: {
    title: 'How this price moved',
    noChange: "We have been tracking it since {date} and the price hasn't changed.",
    lead: 'since {date}, when we started tracking it: {from} → {to}.',
    down: 'down {pct}',
    up: 'up {pct}',
    flat: 'No change',
    high: 'high {value}',
    low: 'low {value}',
    lastChange: 'Last change on {date}: {from} → {to}.',
    currencyNote: 'It used to be listed in another currency; that stretch is not comparable.',
    method:
      'These are the prices this advert published and we recorded, {points}. We do not know what it cost before {date}.',
    onePoint: 'a single reading',
    manyPoints: '{count} readings',
  },
  pt: {
    title: 'Como o preço mudou',
    noChange: 'Acompanhamos desde {date} e o preço não mudou.',
    lead: 'desde {date}, quando começamos a medir: {from} → {to}.',
    down: 'caiu {pct}',
    up: 'subiu {pct}',
    flat: 'Sem mudanças',
    high: 'máximo {value}',
    low: 'mínimo {value}',
    lastChange: 'Última mudança em {date}: {from} → {to}.',
    currencyNote: 'Antes estava anunciado em outra moeda; esse trecho não é comparável.',
    method:
      'São os preços que este anúncio publicou e que registramos, {points}. Não sabemos quanto custava antes de {date}.',
    onePoint: 'uma única leitura',
    manyPoints: '{count} leituras',
  },
}
