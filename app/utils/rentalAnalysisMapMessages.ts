import { rentalZoneMessages } from './rentalZoneMessages'

export const rentalAnalysisMapMessages = {
  es: {
    closeDetail: 'Cerrar detalle',
    ...rentalZoneMessages.es,
    title: 'Mapa de alquileres, denuncias y servicios',
    intro: 'Elegí qué comparar y tocá un barrio para ver sus cifras, la muestra y las fuentes.',
    rentalLayer: 'Precio de alquiler',
    crimeLayer: 'Denuncias de delitos',
    serviceLayer: 'Servicios',
    meanChoice: 'Promedio',
    medianChoice: 'Mediana',
    offense: 'Denuncias que querés ver',
    allOffenses: 'Total de las cinco categorías',
    mapLoading: 'Cargando límites de los barrios…',
    mapError: 'No pudimos cargar los límites del mapa.',
    contextLoading: 'Cargando esta capa de datos…',
    contextError: 'No pudimos cargar los datos de denuncias y servicios.',
    contextScope:
      'Denuncias y servicios describen el barrio completo. No cambian con los filtros de tipo de vivienda, dormitorios o moneda.',
    retryMap: 'Reintentar mapa',
    retryContext: 'Reintentar datos de contexto',
    outside:
      'El mapa disponible representa los barrios oficiales de Montevideo. Para otros departamentos podés seguir usando las gráficas y las comparaciones de la página.',
    montevideo: 'Explorar Montevideo en el mapa',
    mapCohort: '{type} · {bedrooms} · avisos en {currency}',
    allTypes: 'Casas y apartamentos',
    allBedrooms: 'Todos los dormitorios',
    bedroomCount: '{n} dormitorio(s)',
    priceScope:
      'Los precios mantienen el tipo de vivienda, los dormitorios y la moneda de tus filtros. El mapa compara todos los barrios del departamento, aunque hayas seleccionado uno. No se convierten monedas.',
    priceUnavailable:
      'No hay un análisis de precios disponible para estos filtros. Podés consultar las capas de denuncias y servicios.',
    priceLoading: 'Actualizando los precios para estos filtros…',
    priceSample: '{n} viviendas con precio en esta moneda',
    priceMinimum:
      'Para colorear un barrio y mostrar su referencia se necesitan al menos 8 viviendas de la misma selección.',
    meanExplanation:
      'El promedio suma los alquileres y divide por la cantidad de viviendas; los precios extremos pueden moverlo. La mediana divide la muestra en dos mitades.',
    noMetric: 'Sin dato para esta capa',
    noPriceMetric: 'Sin muestra de al menos 8 viviendas',
    scaleCount: '{n} de {total} barrios con dato para esta capa',
    scaleHint:
      'Los cinco tonos dividen en tramos iguales el rango de valores de esta capa. Más oscuro significa una cifra mayor; no es una calificación de seguridad o calidad.',
    geometryHint:
      'Límites INE 2011. Los nombres comerciales que no coinciden exactamente con un barrio oficial no se ubican por aproximación.',
    unmatchedNeighborhood:
      'La zona «{name}» no coincide exactamente con un barrio del mapa. Seleccioná uno para consultar sus datos.',
    chooseDetail: 'Seleccioná un barrio del mapa o de la lista para ver el detalle.',
    exploreAnalysis: 'Analizar los alquileres de este barrio',
    fullExplorer: 'Abrir el comparador de barrios',
    listValues: 'Ver las cifras de todos los barrios ({n})',
    neighborhood: 'Barrio',
    metric: 'Valor de la capa',
    reading: 'Muestra o fecha',
    rentPeriod: '{currency} por mes · sin gastos comunes',
    noServices:
      'No hay un conteo disponible de este servicio. Sin dato no significa que no exista.',
    crimePeriod: 'Denuncias del {from} al {to}',
  },
  en: {
    closeDetail: 'Close details',
    ...rentalZoneMessages.en,
    title: 'Map of asking rents, reported crime and services',
    intro:
      'Choose what to compare and select a neighbourhood to see its figures, sample and sources.',
    rentalLayer: 'Asking rent',
    crimeLayer: 'Reported crime',
    serviceLayer: 'Services',
    meanChoice: 'Mean',
    medianChoice: 'Median',
    offense: 'Reported crime categories',
    allOffenses: 'Total of the five categories',
    mapLoading: 'Loading neighbourhood boundaries…',
    mapError: 'We could not load the map boundaries.',
    contextLoading: 'Loading this data layer…',
    contextError: 'We could not load the reported crime and services data.',
    contextScope:
      'Reported crime and services describe the whole neighbourhood. Property type, bedroom and currency filters do not change these figures.',
    retryMap: 'Retry map',
    retryContext: 'Retry context data',
    outside:
      'The available map shows official neighbourhoods of Montevideo. For other departments, you can continue using the page’s charts and comparisons.',
    montevideo: 'Explore Montevideo on the map',
    mapCohort: '{type} · {bedrooms} · listings in {currency}',
    allTypes: 'Houses and apartments',
    allBedrooms: 'All bedroom counts',
    bedroomCount: '{n} bedroom(s)',
    priceScope:
      'Prices keep your selected property type, bedroom count and currency. The map compares all neighbourhoods in the department, even when you have selected one. No currencies are converted.',
    priceUnavailable:
      'No asking-price analysis is available for these filters. You can still explore reported crime and services.',
    priceLoading: 'Updating prices for these filters…',
    priceSample: '{n} properties priced in this currency',
    priceMinimum:
      'At least 8 properties from the same selection are required to colour a neighbourhood and show its price reference.',
    meanExplanation:
      'The mean adds rents and divides by the property count; extreme prices can move it. The median splits the sample into two halves.',
    noMetric: 'No data for this layer',
    noPriceMetric: 'Fewer than 8 properties available',
    scaleCount: '{n} of {total} neighbourhoods have data for this layer',
    scaleHint:
      'Five shades divide the range for this layer into equal intervals. Darker means a higher figure; it is not a safety or quality rating.',
    geometryHint:
      'INE 2011 boundaries. Commercial area names without an exact official neighbourhood match are not placed approximately.',
    unmatchedNeighborhood:
      'The area “{name}” does not exactly match a neighbourhood on the map. Select one to explore its data.',
    chooseDetail: 'Select a neighbourhood on the map or in the list to see its details.',
    exploreAnalysis: 'Analyse asking rents in this neighbourhood',
    fullExplorer: 'Open the neighbourhood comparison tool',
    listValues: 'View figures for all neighbourhoods ({n})',
    neighborhood: 'Neighbourhood',
    metric: 'Layer value',
    reading: 'Sample or date',
    rentPeriod: '{currency} per month · excluding common expenses',
    noServices:
      'No count is available for this service. Missing data does not mean that no service exists.',
    crimePeriod: 'Reported crime from {from} to {to}',
  },
  pt: {
    closeDetail: 'Fechar detalhes',
    ...rentalZoneMessages.pt,
    title: 'Mapa de aluguéis, denúncias e serviços',
    intro:
      'Escolha o que comparar e selecione um bairro para ver seus números, a amostra e as fontes.',
    rentalLayer: 'Preço de aluguel',
    crimeLayer: 'Denúncias de crimes',
    serviceLayer: 'Serviços',
    meanChoice: 'Média',
    medianChoice: 'Mediana',
    offense: 'Categorias de denúncias',
    allOffenses: 'Total das cinco categorias',
    mapLoading: 'Carregando os limites dos bairros…',
    mapError: 'Não foi possível carregar os limites do mapa.',
    contextLoading: 'Carregando esta camada de dados…',
    contextError: 'Não foi possível carregar os dados de denúncias e serviços.',
    contextScope:
      'Denúncias e serviços descrevem o bairro inteiro. Os filtros de tipo de imóvel, quartos ou moeda não alteram esses números.',
    retryMap: 'Tentar carregar o mapa novamente',
    retryContext: 'Tentar os dados de contexto novamente',
    outside:
      'O mapa disponível representa os bairros oficiais de Montevidéu. Para outros departamentos, você pode continuar usando os gráficos e as comparações da página.',
    montevideo: 'Explorar Montevidéu no mapa',
    mapCohort: '{type} · {bedrooms} · anúncios em {currency}',
    allTypes: 'Casas e apartamentos',
    allBedrooms: 'Todos os números de quartos',
    bedroomCount: '{n} quarto(s)',
    priceScope:
      'Os preços mantêm o tipo de imóvel, os quartos e a moeda dos filtros. O mapa compara todos os bairros do departamento, mesmo quando você selecionou um. Não há conversão de moedas.',
    priceUnavailable:
      'Não há análise de preços disponível para estes filtros. Você ainda pode consultar denúncias e serviços.',
    priceLoading: 'Atualizando os preços para estes filtros…',
    priceSample: '{n} imóveis com preço nesta moeda',
    priceMinimum:
      'São necessários pelo menos 8 imóveis da mesma seleção para colorir um bairro e mostrar a referência de preço.',
    meanExplanation:
      'A média soma os aluguéis e divide pela quantidade de imóveis; preços extremos podem alterá-la. A mediana divide a amostra em duas metades.',
    noMetric: 'Sem dado para esta camada',
    noPriceMetric: 'Amostra com menos de 8 imóveis',
    scaleCount: '{n} de {total} bairros com dado para esta camada',
    scaleHint:
      'Os cinco tons dividem em intervalos iguais a faixa de valores desta camada. Mais escuro significa um número maior; não é uma classificação de segurança ou qualidade.',
    geometryHint:
      'Limites INE 2011. Nomes comerciais sem correspondência exata com um bairro oficial não são posicionados por aproximação.',
    unmatchedNeighborhood:
      'A região “{name}” não corresponde exatamente a um bairro do mapa. Selecione um para consultar os dados.',
    chooseDetail: 'Selecione um bairro no mapa ou na lista para ver os detalhes.',
    exploreAnalysis: 'Analisar os aluguéis deste bairro',
    fullExplorer: 'Abrir o comparador de bairros',
    listValues: 'Ver os números de todos os bairros ({n})',
    neighborhood: 'Bairro',
    metric: 'Valor da camada',
    reading: 'Amostra ou data',
    rentPeriod: '{currency} por mês · sem condomínio',
    noServices:
      'Não há contagem disponível deste serviço. Ausência de dado não significa que o serviço não exista.',
    crimePeriod: 'Denúncias de {from} a {to}',
  },
}
