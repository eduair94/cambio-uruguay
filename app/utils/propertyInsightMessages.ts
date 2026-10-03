/**
 * Copy de `components/property/PriceInsight.vue`, la comparativa con lo que hay cerca de las fichas
 * de alquiler y de venta. Trilingüe porque las dos fichas lo son. Sin barras verticales: vue-i18n
 * las lee como separador de plurales y corta la frase.
 */
export const propertyInsightMessages = {
  es: {
    title: 'Comparada con lo que hay cerca',
    loading: 'Comparando con lo que hay cerca…',
    scopeRadius:
      'Contra {n} viviendas parecidas (mismo tipo y dormitorios) a menos de {km} km de este aviso.',
    scopeNeighborhood:
      'Este aviso no publica una ubicación propia: se compara contra {n} viviendas parecidas de {zone}, sin distancias.',
    rentNote: 'Se compara el alquiler sin gastos comunes.',
    saleNote:
      'Se compara en dólares; no entran viviendas ocupadas, a reformar ni en pozo. Son precios pedidos, no una tasación.',
    verdictMuyBajo: 'Muy por debajo de lo cercano',
    verdictBajo: 'Por debajo de lo cercano',
    verdictJusto: 'En el precio de lo cercano',
    verdictAlto: 'Por encima de lo cercano',
    verdictMuyAlto: 'Muy por encima de lo cercano',
    thisOne: 'Este: {price}',
    middle: 'mitad central {from} – {to}',
    summary:
      'La mitad de las parecidas pide menos de {median}. Este aviso pide {price}, {gap} la mediana, y es {cheaper}.',
    gapAt: 'justo en',
    gapBelow: '{pct} por debajo de',
    gapAbove: '{pct} por encima de',
    cheaperFirst: 'el más económico de los parecidos',
    cheaperOf: 'más económico que {n} de cada 10',
    cheaperLast: 'de los más caros de los parecidos',
    lowWarning:
      'Un precio tan por debajo del resto suele tener un motivo: estado, ubicación exacta, condiciones o un error del aviso. Preguntá antes de entusiasmarte.',
    noVerdict:
      'Hay {n} viviendas parecidas en esa zona: con menos de cinco no damos un veredicto, cualquier promedio es ruido.',
    perM2Title: 'Precio por m²',
    perM2:
      'Este aviso pide {value} por m². La mediana de lo cercano de tamaño parecido es {median} ({n} avisos): está {gap} esa cifra.',
    perM2Alone:
      'Este aviso pide {value} por m²; no hay suficientes avisos cercanos para compararlo.',
    perM2Unknown: 'La superficie publicada no permite calcular un precio por m² creíble.',
    cheapButSmall:
      'Pide poco en total porque es más chica que las parecidas: por m² está por encima.',
    priceyButBig:
      'Pide más en total, pero por m² está por debajo: es más grande que las parecidas.',
    picksTitle: 'Qué más hay cerca',
    picksNote:
      'Avisos vigentes de la misma zona. "Por la misma plata" es hasta un 5 % más de lo que pide este aviso.',
    pickCheapestSimilar: 'La más económica parecida',
    pickCheapestPerM2: 'La más económica por m²',
    pickBigger: 'La más grande por la misma plata',
    pickMoreBedrooms: 'Con más dormitorios por la misma plata',
    pickClosest: 'La parecida más cercana',
    distance: 'a {d}',
    bedrooms: '{n} dorm.',
    studio: 'Monoambiente',
    perM2Short: '{value}/m²',
    diffLess: '{amount} menos',
    diffMore: '{amount} más',
    diffSame: 'mismo precio',
    diffAreaMore: '{n} m² más',
    diffAreaLess: '{n} m² menos',
    diffSuffix: 'que este',
  },
  en: {
    title: 'Compared with what is nearby',
    loading: 'Comparing with what is nearby…',
    scopeRadius:
      'Against {n} similar homes (same type and bedrooms) within {km} km of this advert.',
    scopeNeighborhood:
      'This advert does not publish its own location: it is compared against {n} similar homes in {zone}, without distances.',
    rentNote: 'Rent is compared without building fees.',
    saleNote:
      'Compared in US dollars; occupied homes, homes needing renovation and off-plan units are left out. These are asking prices, not a valuation.',
    verdictMuyBajo: 'Well below nearby homes',
    verdictBajo: 'Below nearby homes',
    verdictJusto: 'In line with nearby homes',
    verdictAlto: 'Above nearby homes',
    verdictMuyAlto: 'Well above nearby homes',
    thisOne: 'This one: {price}',
    middle: 'middle half {from} – {to}',
    summary:
      'Half of the similar homes ask less than {median}. This advert asks {price}, {gap} the median, and is {cheaper}.',
    gapAt: 'right at',
    gapBelow: '{pct} below',
    gapAbove: '{pct} above',
    cheaperFirst: 'the cheapest of the similar homes',
    cheaperOf: 'cheaper than {n} in 10',
    cheaperLast: 'among the most expensive of the similar homes',
    lowWarning:
      'A price this far below the rest usually has a reason: condition, exact location, terms or a mistake in the advert. Ask before getting excited.',
    noVerdict:
      'There are {n} similar homes in that area: with fewer than five we give no verdict, any average is noise.',
    perM2Title: 'Price per m²',
    perM2:
      'This advert asks {value} per m². The median of similar-sized homes nearby is {median} ({n} adverts): it is {gap} that figure.',
    perM2Alone:
      'This advert asks {value} per m²; there are not enough nearby adverts to compare it.',
    perM2Unknown: 'The published floor area does not allow a credible price per m².',
    cheapButSmall:
      'It asks little in total because it is smaller than the similar homes: per m² it is above.',
    priceyButBig:
      'It asks more in total, but per m² it is below: it is larger than the similar homes.',
    picksTitle: 'What else is nearby',
    picksNote:
      'Current adverts in the same area. "For the same money" means up to 5 % more than this advert asks.',
    pickCheapestSimilar: 'The cheapest similar home',
    pickCheapestPerM2: 'The cheapest per m²',
    pickBigger: 'The largest for the same money',
    pickMoreBedrooms: 'More bedrooms for the same money',
    pickClosest: 'The closest similar home',
    distance: '{d} away',
    bedrooms: '{n} bd.',
    studio: 'Studio',
    perM2Short: '{value}/m²',
    diffLess: '{amount} less',
    diffMore: '{amount} more',
    diffSame: 'same price',
    diffAreaMore: '{n} m² more',
    diffAreaLess: '{n} m² less',
    diffSuffix: 'than this one',
  },
  pt: {
    title: 'Comparado com o que há perto',
    loading: 'Comparando com o que há perto…',
    scopeRadius:
      'Contra {n} imóveis parecidos (mesmo tipo e quartos) a menos de {km} km deste anúncio.',
    scopeNeighborhood:
      'Este anúncio não publica uma localização própria: é comparado com {n} imóveis parecidos em {zone}, sem distâncias.',
    rentNote: 'O aluguel é comparado sem as despesas de condomínio.',
    saleNote:
      'Comparado em dólares; ficam de fora imóveis ocupados, para reformar ou na planta. São preços pedidos, não uma avaliação.',
    verdictMuyBajo: 'Muito abaixo do que há perto',
    verdictBajo: 'Abaixo do que há perto',
    verdictJusto: 'No preço do que há perto',
    verdictAlto: 'Acima do que há perto',
    verdictMuyAlto: 'Muito acima do que há perto',
    thisOne: 'Este: {price}',
    middle: 'metade central {from} – {to}',
    summary:
      'Metade dos parecidos pede menos de {median}. Este anúncio pede {price}, {gap} a mediana, e é {cheaper}.',
    gapAt: 'bem na',
    gapBelow: '{pct} abaixo da',
    gapAbove: '{pct} acima da',
    cheaperFirst: 'o mais barato dos parecidos',
    cheaperOf: 'mais barato que {n} de cada 10',
    cheaperLast: 'um dos mais caros dos parecidos',
    lowWarning:
      'Um preço tão abaixo dos demais costuma ter um motivo: estado, localização exata, condições ou um erro do anúncio. Pergunte antes de se animar.',
    noVerdict:
      'Há {n} imóveis parecidos nessa região: com menos de cinco não damos veredicto, qualquer média é ruído.',
    perM2Title: 'Preço por m²',
    perM2:
      'Este anúncio pede {value} por m². A mediana dos imóveis próximos de tamanho parecido é {median} ({n} anúncios): está {gap} esse valor.',
    perM2Alone:
      'Este anúncio pede {value} por m²; não há anúncios próximos suficientes para comparar.',
    perM2Unknown: 'A área publicada não permite calcular um preço por m² confiável.',
    cheapButSmall: 'Pede pouco no total porque é menor que os parecidos: por m² está acima.',
    priceyButBig: 'Pede mais no total, mas por m² está abaixo: é maior que os parecidos.',
    picksTitle: 'O que mais há perto',
    picksNote:
      'Anúncios vigentes da mesma região. "Pelo mesmo dinheiro" é até 5 % a mais do que pede este anúncio.',
    pickCheapestSimilar: 'O mais barato parecido',
    pickCheapestPerM2: 'O mais barato por m²',
    pickBigger: 'O maior pelo mesmo dinheiro',
    pickMoreBedrooms: 'Mais quartos pelo mesmo dinheiro',
    pickClosest: 'O parecido mais próximo',
    distance: 'a {d}',
    bedrooms: '{n} quartos',
    studio: 'Studio',
    perM2Short: '{value}/m²',
    diffLess: '{amount} a menos',
    diffMore: '{amount} a mais',
    diffSame: 'mesmo preço',
    diffAreaMore: '{n} m² a mais',
    diffAreaLess: '{n} m² a menos',
    diffSuffix: 'que este',
  },
} as const
