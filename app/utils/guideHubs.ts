// Topic hubs: SEO landing pages that organise the whole site into intuitive,
// interconnected themes (hub-and-spoke). Each hub is one page at `/temas/{slug}`
// that introduces a theme, links every guide in it and points to the related
// tools and pages elsewhere on the site. Together they are the tidy directory of
// everything Cambio Uruguay offers, grouped by what the user is trying to do.
//
// PURE module (no Vue/Nuxt runtime, relative imports only) so it can be unit
// tested and reused by the page, the sitemap route and the search index. The
// hub → guide relationship is validated by `guideHubs.test.ts`: every
// `guideSlugs` entry must resolve to a real guide, no guide belongs to two hubs,
// and every Reddit-mined guide belongs to exactly one hub.
import { getGuide, type Guide } from './guides'

/** A link from a hub to another page or tool on the site, with a short blurb. */
export interface HubResource {
  label: string
  description: string
  /** App-relative path (passed through `localePath`). */
  to: string
}

/** One thematic hub grouping guides plus the related tools and pages. */
export interface GuideHub {
  /** URL-safe id, unique across {@link guideHubs} (addressable at `/temas/{slug}`). */
  slug: string
  /** H1 / on-page title. */
  title: string
  /** `<title>` and OG title (a touch longer / more keyworded than {@link title}). */
  seoTitle: string
  /** Meta description / OG subtitle. */
  description: string
  /** Short uppercase label shown on cards and the OG image. */
  tag: string
  /** MDI icon for the hub card. */
  icon: string
  /** Lead paragraph(s), plain prose (rendered verbatim). */
  intro: string
  /** Slugs of the guides in this hub, in reading order. */
  guideSlugs: readonly string[]
  /** Related tools / pages elsewhere on the site, shown as a "seguí en" section. */
  resources?: readonly HubResource[]
  /** Sibling hub slugs, for cross-hub navigation. */
  relatedHubs?: readonly string[]
  /**
   * Glossary slugs (`utils/glossary.ts`) that belong to this theme. The hub page lists them, and
   * `utils/temaVecinos.ts` links each term back to the theme and its pages.
   */
  terms?: readonly string[]
}

export const guideHubs: readonly GuideHub[] = [
  {
    slug: 'dolar-y-casas-de-cambio-uruguay',
    title: 'Dólar y casas de cambio en Uruguay',
    seoTitle: 'Dólar y casas de cambio en Uruguay: mejor precio, comparador y guías',
    description:
      'Todo sobre el dólar en Uruguay: comparar el precio entre casas de cambio, entender BILLETE, CABLE y TRANSFERENCIA, y cambiar al mejor precio con nuestras guías y herramientas.',
    tag: 'DÓLAR',
    icon: 'mdi-cash-multiple',
    intro:
      'El corazón de Cambio Uruguay: encontrar el mejor precio del dólar y las divisas. Acá reunimos el comparador en vivo de más de 40 casas de cambio, el histórico, el mapa de sucursales y las guías que explican cómo leer una cotización, qué significan los tipos de operación y cuándo conviene cambiar. Si querés comprar o vender dólares, euros o reales sin dejar plata en el camino, empezá por acá.',
    guideSlugs: [
      'conviene-comprar-dolares-hoy',
      'comprar-dolares-mejor-precio',
      'billete-cable-transferencia',
      'mejor-momento-cambiar-divisas',
      'como-leer-cotizacion-dolar',
      'casas-de-cambio-vs-bancos',
      'evitar-comisiones-cambio',
    ],
    resources: [
      {
        label: 'Dólar hoy',
        description: 'La cotización del día y su evolución.',
        to: '/dolar-hoy',
      },
      {
        label: 'Casas de cambio',
        description: 'Directorio y reputación de las casas.',
        to: '/casas-de-cambio',
      },
      {
        label: 'Comparador de cotizaciones',
        description: 'El dólar en más de 40 casas de cambio, en vivo.',
        to: '/comparar',
      },
      {
        label: 'La mejor casa de cambio',
        description:
          'Qué casa paga mejor hoy según lo que quieras hacer: comprar, vender, billete o transferencia.',
        to: '/mejor-casa-de-cambio',
      },
      {
        label: 'Histórico del dólar',
        description: 'La cotización de cada día desde 2022, casa por casa, para ver cómo se movió.',
        to: '/historico',
      },
      {
        label: 'Cotizaciones de la región',
        description:
          'El dólar en Argentina, Brasil, Paraguay, Chile y Bolivia al lado del uruguayo.',
        to: '/cotizaciones-de-la-region',
      },
      {
        label: 'Analíticas del dólar',
        description: 'Cómo se mueve el dólar en el día y entre casas, con los datos que relevamos.',
        to: '/analiticas',
      },
      {
        label: 'Últimos cambios de cotización',
        description: 'Qué casa movió su precio, en vivo.',
        to: '/ultimos-cambios',
      },
      {
        label: 'Por qué sube el dólar',
        description: 'Las razones detrás del precio.',
        to: '/por-que-sube-el-dolar',
      },
      {
        label: 'Casa de cambio cerca de mí',
        description: 'La mejor opción según dónde estás.',
        to: '/casa-de-cambio-cerca-de-mi',
      },
      { label: 'Mapa de sucursales', description: 'Dónde cambiar, en el mapa.', to: '/mapa' },
      {
        label: '¿Banco o casa de cambio?',
        description: 'Dónde conviene cambiar según el monto y la operación.',
        to: '/banco-o-casa-de-cambio-uruguay',
      },
      {
        label: 'Dólar blue hoy',
        description: 'El dólar paralelo argentino y la brecha con el oficial.',
        to: '/dolar-blue-hoy',
      },
      {
        label: 'Conversor de monedas',
        description: 'Convertí montos al instante.',
        to: '/herramientas/conversor-de-monedas',
      },
      {
        label: 'Calculadora de spread',
        description: 'Cuánto te cuesta el diferencial.',
        to: '/herramientas/calculadora-spread',
      },
      {
        label: 'Casas abiertas el fin de semana',
        description: 'Qué casas de cambio atienden sábado y domingo.',
        to: '/casas-de-cambio-abiertas-fin-de-semana',
      },
      {
        label: 'Dónde conseguir monedas',
        description: 'Dónde cambiar billetes por monedas y qué cobran.',
        to: '/donde-conseguir-monedas-uruguay',
      },
      {
        label: '¿Dólares o reales para Brasil?',
        description: 'Qué moneda conviene llevar a Brasil y dónde cambiarla.',
        to: '/llevar-dolares-o-reales-a-brasil',
      },
    ],
    terms: [
      'cotizacion',
      'tipo-de-cambio',
      'spread-cambiario',
      'casa-de-cambio',
      'dolar-billete',
      'dolar-transferencia',
      'dolar-cable',
      'dolar-interbancario',
      'dolar-ebrou',
      'divisa',
      'arbitraje',
      'mercado-cambiario',
      'brecha-cambiaria',
      'dolar-blue',
      'dolar-mep',
      'peso-argentino',
      'peso-uruguayo',
    ],
    relatedHubs: ['economia-y-mercado-uruguay', 'ahorrar-e-invertir-uruguay'],
  },
  {
    slug: 'importaciones-y-aduana-uruguay',
    title: 'Importar y aduana en Uruguay',
    seoTitle: 'Importar a Uruguay: courier, franquicia, aduana e impuestos',
    description:
      'Comprar del exterior a Uruguay sin sorpresas: régimen de courier y franquicia, impuestos, la franquicia del viajero, problemas con la aduana y calculadoras de costo final.',
    tag: 'ADUANA',
    icon: 'mdi-package-variant-closed',
    intro:
      'Comprar afuera y traerlo a Uruguay tiene reglas que conviene entender antes de pagar: el régimen de courier y la franquicia, los impuestos que se aplican, qué podés traer del viaje y qué hacer si un paquete queda trabado en la aduana. Reunimos las páginas y calculadoras que te dicen, de antemano, cuánto vas a pagar de verdad por tu compra internacional.',
    guideSlugs: [
      'comprar-online-exterior-impuestos',
      'impuesto-temu-uruguay',
      'importar-de-aliexpress-a-uruguay',
      'comprar-en-amazon-desde-uruguay',
    ],
    resources: [
      {
        label: 'Cómo declarar una compra del exterior',
        description: 'Correo, courier, Amazon Global, Temu y régimen general.',
        to: '/declarar-compra-exterior-uruguay',
      },
      {
        label: 'Couriers de Uruguay',
        description: 'Comparativa de servicios puerta a puerta.',
        to: '/couriers-uruguay',
      },
      {
        label: 'Franquicia de aduana',
        description: 'Qué podés importar sin pagar de más.',
        to: '/franquicia-aduana-uruguay',
      },
      {
        label: 'Recibir regalos del exterior',
        description: 'Obsequios sin pagar IVA y la carta adentro del paquete.',
        to: '/recibir-regalos-del-exterior-uruguay',
      },
      {
        label: 'Franquicia del viajero',
        description: 'Qué traer del exterior sin impuestos.',
        to: '/franquicia-viajero-uruguay',
      },
      {
        label: 'Problemas con la aduana',
        description: 'Qué hacer si tu paquete queda trabado.',
        to: '/problemas-con-la-aduana-uruguay',
      },
      {
        label: 'Calculadora de impuestos de importación',
        description: 'El costo final de tu compra.',
        to: '/herramientas/calculadora-impuestos-importacion',
      },
      {
        label: 'Carrito de importación',
        description: 'Estimá el costo puesto en Uruguay.',
        to: '/herramientas/carrito-importacion',
      },
      {
        label: 'Precio de celulares',
        description:
          'Cuánto sale cada modelo en Uruguay y cuánto costaría traerlo de Estados Unidos.',
        to: '/celulares-uruguay',
      },
      {
        label: 'Tiendas online',
        description: 'Señales fechadas de cada tienda que vende a Uruguay, antes de comprarle.',
        to: '/tiendas-online-uruguay',
      },
      {
        label: '¿Envío directo o casillero?',
        description: 'Qué conviene según el peso, la tienda y la franquicia.',
        to: '/envio-directo-o-casillero-uruguay',
      },
      {
        label: 'Importar para revender',
        description: 'Qué cambia cuando lo que traés no es para vos.',
        to: '/importar-para-revender-uruguay',
      },
      {
        label: 'Dónde te entregan el paquete',
        description: 'Qué pasa con el envío cuando llega a Uruguay y dónde retirarlo.',
        to: '/donde-te-entregan-el-paquete-uruguay',
      },
      {
        label: 'Preguntas frecuentes de aduana',
        description: 'Las dudas más comunes sobre franquicias, impuestos y envíos.',
        to: '/preguntas-frecuentes-aduana-uruguay',
      },
    ],
    terms: [
      'franquicia-courier',
      'impuestos-importacion',
      'arancel-aduanero',
      'tasa-consular',
      'despachante-de-aduana',
      'tax-free',
      'iva',
      'imesi',
    ],
    relatedHubs: ['dolar-y-casas-de-cambio-uruguay', 'economia-y-mercado-uruguay'],
  },
  {
    slug: 'economia-y-mercado-uruguay',
    title: 'Economía y mercado en Uruguay',
    seoTitle: 'Economía de Uruguay: por qué sube el dólar, inflación, indicadores y noticias',
    description:
      'Entendé la economía uruguaya: por qué sube el dólar, la inflación, los indicadores (UI, UR, BPC), las noticias y cómo proteger tus ahorros de la suba de precios.',
    tag: 'ECONOMÍA',
    icon: 'mdi-chart-areaspline',
    intro:
      '¿Por qué sube el dólar? ¿Qué pasa con la inflación y cómo afecta tus ahorros? Este tema reúne las páginas y guías que explican el contexto económico uruguayo sin tecnicismos: los indicadores que mueven todo (UI, UR, BPC), las noticias, la relación entre inflación y dólar, y qué mirar para no perder poder de compra. Entender el mercado es el primer paso para tomar mejores decisiones con tu plata.',
    guideSlugs: [
      'inflacion-y-dolar-uruguay',
      'como-afecta-la-fed-al-dolar',
      'proteger-ahorros-de-la-inflacion',
      'unidad-indexada-explicada',
    ],
    resources: [
      {
        label: 'Evolución del alquiler',
        description: 'Cómo cambia lo que se pide por alquilar, por zona y dormitorios.',
        to: '/evolucion-precio-alquileres-uruguay',
      },
      {
        label: 'Evolución del precio de las viviendas',
        description: 'Cómo cambia lo que se pide por comprar una vivienda.',
        to: '/evolucion-precio-viviendas-uruguay',
      },
      {
        label: 'Evolución del precio de los autos',
        description: 'Cómo cambia lo que se pide por un auto usado, por modelo.',
        to: '/evolucion-precio-autos-usados-uruguay',
      },
      {
        label: 'Histórico del dólar',
        description: 'La cotización de cada día, casa por casa, desde 2022.',
        to: '/historico',
      },
      {
        label: 'Precio de la nafta',
        description: 'El precio de los combustibles de ANCAP y cómo cambió.',
        to: '/precio-de-la-nafta-uruguay',
      },
      {
        label: 'Precios de supermercado',
        description: 'Los precios oficiales del SIPC, comparados local por local.',
        to: '/precios-de-supermercado-uruguay',
      },
      {
        label: 'Indicadores (UI, UR, BPC)',
        description: 'Los valores que indexan todo.',
        to: '/indicadores',
      },
      {
        label: 'Cotizaciones de la región',
        description: 'El dólar en los países vecinos, al lado del uruguayo.',
        to: '/cotizaciones-de-la-region',
      },
      {
        label: 'Economía de Uruguay',
        description: 'Noticias económicas por tema, con IA.',
        to: '/economia-uruguay',
      },
      {
        label: 'Por qué sube el dólar',
        description: 'Las razones detrás del precio.',
        to: '/por-que-sube-el-dolar',
      },
      {
        label: 'Cotización del BCU',
        description: 'Por qué la cotización oficial no es la que te dan al cambiar.',
        to: '/cotizacion-del-bcu',
      },
      {
        label: '¿Por qué el BCU quiere más pesos?',
        description: 'La política monetaria explicada con los datos del Banco Central.',
        to: '/por-que-el-bcu-quiere-mas-pesos',
      },
      { label: 'Noticias', description: 'Actualidad del dólar y la economía.', to: '/noticias' },
      {
        label: 'Advertencias del BCU',
        description: 'Entidades no autorizadas.',
        to: '/advertencias-bcu',
      },
      {
        label: 'Conversor de Unidad Indexada',
        description: 'Pasá de UI a pesos y viceversa.',
        to: '/herramientas/conversor-unidad-indexada',
      },
    ],
    terms: [
      'bcu',
      'inflacion',
      'ipc',
      'tasa-de-politica-monetaria',
      'base-monetaria',
      'letras-regulacion-monetaria',
      'riesgo-pais',
      'grado-inversor',
      'devaluacion',
      'apreciacion',
      'flotacion-cambiaria',
      'dolarizacion',
      'encaje-bancario',
      'indice-medio-de-salarios',
      'mercado-spot',
      'mercado-forward',
    ],
    relatedHubs: ['dolar-y-casas-de-cambio-uruguay', 'ahorrar-e-invertir-uruguay'],
  },
  {
    slug: 'alquiler-y-vivienda-uruguay',
    title: 'Alquilar en Uruguay',
    seoTitle: 'Alquilar en Uruguay: garantías, contratos y derechos del inquilino',
    description:
      'Todo sobre alquilar en Uruguay: tipos de garantía, depósito, cómo rescindir el contrato, derechos del inquilino y alquiler temporario. Guías claras y verificadas.',
    tag: 'VIVIENDA',
    icon: 'mdi-home-city-outline',
    intro:
      'Alquilar en Uruguay tiene sus reglas: qué garantía elegir, cuánto depósito te pueden pedir, qué podés reclamar y cómo salir del contrato sin pagar de más. Reunimos las dudas más frecuentes sobre alquiler —las mismas que aparecen una y otra vez en foros y grupos— y las respondemos con información práctica y fuentes oficiales. Si estás por firmar, buscando garantía o queriendo terminar un contrato, empezá por la guía que corresponde a tu caso.',
    guideSlugs: [
      'como-rescindir-contrato-alquiler-uruguay',
      'garantias-de-alquiler-uruguay',
      'deposito-de-alquiler-uruguay',
      'alquilar-sin-garantia-uruguay',
      'derechos-del-inquilino-uruguay',
      'que-revisar-antes-de-firmar-alquiler',
      'alquiler-temporario-uruguay',
    ],
    resources: [
      {
        label: 'Alquileres',
        description:
          'Los avisos de varios portales unidos por propiedad, con la garantía que acepta cada uno.',
        to: '/alquileres-uruguay',
      },
      {
        label: 'Análisis del alquiler',
        description: 'Cuánto se pide por zona, tipo y dormitorios, calculado cada semana.',
        to: '/analisis-alquileres-uruguay',
      },
      {
        label: 'Evolución del alquiler',
        description: 'Cómo cambia el precio pedido y cómo se reparte, con tu precio al lado.',
        to: '/evolucion-precio-alquileres-uruguay',
      },
      {
        label: 'Comparar barrios',
        description: 'Precio, servicios y denuncias de cada barrio de Montevideo.',
        to: '/barrios-alquileres-uruguay',
      },
      {
        label: '¿Dónde vivir?',
        description:
          'Los barrios donde alquilar o comprar entra en tu plata, con la cuota y cómo es cada uno.',
        to: '/donde-vivir-uruguay',
      },
      {
        label: 'Tu alquiler ideal',
        description: 'Qué zonas encajan con tu presupuesto y lo que necesitás.',
        to: '/alquiler-ideal-uruguay',
      },
      {
        label: 'Guía para alquilar',
        description: 'Desde conseguir techo hasta firmar.',
        to: '/alquilar-en-uruguay',
      },
      {
        label: 'Primer alquiler: gastos y trámites',
        description: 'Presupuesto de entrada, garantía CGN, UTE, OSE y tributos.',
        to: '/primer-alquiler-uruguay',
      },
      {
        label: 'Alquilar sin recibo de sueldo',
        description: 'Qué garantías aceptan a independientes y cómo presentarte.',
        to: '/alquilar-sin-recibo-de-sueldo',
      },
      {
        label: 'Alquilar estando en el Clearing',
        description: 'Sí se puede: cómo hacerlo.',
        to: '/alquilar-estando-en-clearing',
      },
      {
        label: 'Comparar portales',
        description: 'Qué portal publica qué, y cuánto se superponen.',
        to: '/comparar-portales-de-alquiler-uruguay',
      },
      {
        label: 'Oportunidades',
        description: 'Avisos pedidos por debajo de viviendas comparables.',
        to: '/oportunidades-inmobiliarias-uruguay',
      },
      {
        label: 'Inmobiliarias',
        description: 'Qué publica cada inmobiliaria, desde sus propios avisos.',
        to: '/inmobiliarias-uruguay',
      },
      {
        label: '¿Por qué no baja el alquiler?',
        description: 'Qué sostiene el precio del alquiler, con los datos del mercado.',
        to: '/por-que-no-baja-el-alquiler-uruguay',
      },
      {
        label: 'Costo de vida',
        description: 'Cuánto necesitás para vivir donde querés.',
        to: '/herramientas/costo-de-vida',
      },
      {
        label: 'Fletes y mudanzas',
        description: 'Cuánto sale mudarse y a quién contratar.',
        to: '/fletes-mudanzas-uruguay',
      },
      {
        label: 'Equipar una casa',
        description: 'Qué sale llenar una vivienda vacía, categoría por categoría.',
        to: '/equipar-casa-uruguay',
      },
      {
        label: 'Avisos para equipar la casa',
        description:
          'Heladeras, colchones, lavarropas y más, nuevos y usados, con filtros y tu lista.',
        to: '/equipar-casa-uruguay/productos',
      },
      {
        label: 'Pensiones estudiantiles',
        description: 'Alternativas de alojamiento para estudiantes y cuánto cuestan.',
        to: '/pensiones-estudiantiles-uruguay',
      },
    ],
    terms: ['ipc', 'unidad-reajustable', 'ui', 'inflacion'],
    relatedHubs: ['comprar-vivienda-uruguay', 'deudas-y-credito-uruguay'],
  },
  {
    slug: 'comprar-vivienda-uruguay',
    title: 'Comprar vivienda en Uruguay',
    seoTitle: 'Comprar vivienda en Uruguay: crédito hipotecario, BHU y escrituración',
    description:
      'Cómo comprar tu casa en Uruguay paso a paso: crédito hipotecario, BHU, costos de escrituración e ITP, promesa de compraventa y compra de terrenos.',
    tag: 'VIVIENDA',
    icon: 'mdi-home-search-outline',
    intro:
      'Comprar vivienda es la decisión financiera más grande de la mayoría de las familias, y en Uruguay tiene pasos y costos que conviene conocer antes de empezar: el crédito hipotecario y su moneda, el papel del BHU, los gastos de escritura y el ITP, la promesa de compraventa y qué verificar en un terreno. Estas guías desarman el proceso para que sepas dónde se va la plata y qué mirar en cada etapa, sin sorpresas en la escribanía.',
    guideSlugs: [
      'comprar-primera-vivienda-uruguay',
      'credito-hipotecario-uruguay',
      'costos-de-escrituracion-uruguay',
      'bhu-como-funciona',
      'comprar-un-terreno-uruguay',
      'promesa-de-compraventa-uruguay',
      'comision-inmobiliaria-uruguay',
      'comprar-en-remate-uruguay',
      'derechos-posesorios-uruguay',
      'certificado-unico-departamental-uruguay',
    ],
    resources: [
      {
        label: 'Venta de viviendas',
        description: 'Las viviendas en venta publicadas, una ficha por anuncio.',
        to: '/venta-viviendas-uruguay',
      },
      {
        label: 'Evolución del precio de las viviendas',
        description: 'Cómo cambia lo que se pide y cómo se reparte, con tu precio al lado.',
        to: '/evolucion-precio-viviendas-uruguay',
      },
      {
        label: '¿Comprar o alquilar?',
        description: 'La cuenta completa para decidir, con precios de hoy.',
        to: '/comprar-o-alquilar-uruguay',
      },
      {
        label: 'Oportunidades',
        description: 'Viviendas pedidas por debajo de otras comparables.',
        to: '/oportunidades-inmobiliarias-uruguay',
      },
      {
        label: 'Calculadora de préstamo',
        description: 'Simulá la cuota mensual.',
        to: '/herramientas/calculadora-prestamo',
      },
      {
        label: 'Conversor de Unidad Indexada',
        description: 'La UI/UR de tu crédito, en pesos.',
        to: '/herramientas/conversor-unidad-indexada',
      },
      {
        label: 'Mejores bancos de Uruguay',
        description: 'Dónde buscar tu hipoteca.',
        to: '/mejores-bancos-uruguay',
      },
      {
        label: 'Inmobiliarias',
        description: 'Qué publica cada inmobiliaria, desde sus propios avisos.',
        to: '/inmobiliarias-uruguay',
      },
      {
        label: 'Deuda de gastos comunes',
        description: 'Qué pasa con los gastos comunes impagos al comprar.',
        to: '/deuda-de-gastos-comunes-uruguay',
      },
      {
        label: 'Impuesto de Primaria',
        description: 'Quién lo paga, cuánto es y cómo se calcula.',
        to: '/impuesto-de-primaria-uruguay',
      },
    ],
    terms: [
      'ui',
      'unidad-reajustable',
      'tasa-efectiva-anual',
      'tasa-de-interes',
      'incremento-patrimonial',
    ],
    relatedHubs: ['alquiler-y-vivienda-uruguay', 'herencias-y-sucesiones-uruguay'],
  },
  {
    slug: 'herencias-y-sucesiones-uruguay',
    title: 'Herencias y sucesiones en Uruguay',
    seoTitle: 'Herencias y sucesiones en Uruguay: testamento, legítima e impuestos',
    description:
      'Cómo funciona una sucesión en Uruguay: si las deudas se heredan, cómo hacer un testamento, herederos forzosos y legítima, y por qué no hay impuesto a la herencia.',
    tag: 'HERENCIAS',
    icon: 'mdi-file-document-multiple-outline',
    intro:
      'Las herencias generan muchas dudas y algún que otro mito. En Uruguay no existe un impuesto a la herencia como en otros países, pero la sucesión sí tiene costos y reglas que conviene entender: qué pasa con las deudas del fallecido, cómo protegerse con el beneficio de inventario, quiénes son herederos forzosos y hasta dónde llega la libertad para testar. Estas guías explican, en lenguaje claro, cómo se ordena y transmite un patrimonio, y cuándo conviene la firma de un escribano o un abogado.',
    guideSlugs: [
      'como-funciona-una-sucesion-uruguay',
      'las-deudas-se-heredan-uruguay',
      'hacer-un-testamento-uruguay',
      'legitima-y-herederos-forzosos-uruguay',
      'hay-impuesto-a-la-herencia-uruguay',
    ],
    resources: [
      {
        label: 'Costos de escrituración',
        description: 'El ITP y los gastos de transmisión.',
        to: '/guias/costos-de-escrituracion-uruguay',
      },
      {
        label: 'Saldar deudas',
        description: 'Si el fallecido dejó deudas.',
        to: '/saldar-deudas-uruguay',
      },
      {
        label: 'Salir del Clearing',
        description: 'Central de Riesgos vs Clearing.',
        to: '/salir-del-clearing',
      },
    ],
    relatedHubs: ['comprar-vivienda-uruguay', 'finanzas-personales-y-jubilacion-uruguay'],
  },
  {
    slug: 'pareja-familia-y-dinero-uruguay',
    title: 'Pareja, familia y dinero en Uruguay',
    seoTitle: 'Economía de pareja en Uruguay: separación de bienes, gastos y finanzas juntos',
    description:
      'Cómo manejar el dinero en pareja en Uruguay: régimen patrimonial, separación de bienes, unión concubinaria, dividir gastos, cuenta conjunta y qué pasa en un divorcio.',
    tag: 'PAREJA',
    icon: 'mdi-account-heart-outline',
    intro:
      'Convivir es también compartir plata, y ahí aparecen dudas legales y prácticas por igual: ¿qué régimen rige tu matrimonio, sociedad conyugal o separación de bienes? ¿Qué derechos da la unión concubinaria? Y en el día a día, ¿cómo dividir los gastos, conviene una cuenta conjunta, cómo hablar de dinero sin pelear? Este tema junta la parte legal y la práctica para que organicen su economía de pareja de forma clara, justa y sin sorpresas, cualquiera sea la forma de su relación.',
    guideSlugs: [
      'regimen-patrimonial-matrimonio-uruguay',
      'separacion-de-bienes-uruguay',
      'union-concubinaria-uruguay',
      'como-dividir-gastos-en-pareja-uruguay',
      'cuenta-conjunta-o-separada-pareja-uruguay',
      'hablar-de-dinero-en-pareja-uruguay',
      'division-de-bienes-en-el-divorcio-uruguay',
      'proteger-tu-patrimonio-en-pareja-uruguay',
    ],
    resources: [
      {
        label: 'Hacer un testamento',
        description: 'Ordenar la herencia respetando la legítima.',
        to: '/guias/hacer-un-testamento-uruguay',
      },
      {
        label: 'Armar un presupuesto',
        description: 'La base de las finanzas compartidas.',
        to: '/guias/armar-un-presupuesto-personal-uruguay',
      },
      {
        label: 'Abrir una cuenta bancaria',
        description: 'Para la cuenta conjunta o separada.',
        to: '/guias/abrir-una-cuenta-bancaria-uruguay',
      },
      {
        label: 'Salud financiera',
        description: 'Diagnóstico para ordenar la economía.',
        to: '/salud-financiera',
      },
      {
        label: 'Mejores bancos de Uruguay',
        description: 'Elegir dónde tener las cuentas.',
        to: '/mejores-bancos-uruguay',
      },
      {
        label: 'Pensión alimenticia',
        description: 'Cuánto corresponde y cómo se fija.',
        to: '/pension-alimenticia-uruguay',
      },
      {
        label: 'Asignación familiar',
        description: 'Quién la cobra y de cuánto es.',
        to: '/asignacion-familiar-uruguay',
      },
      {
        label: 'Licencia por maternidad y paternidad',
        description: 'Cuántos días corresponden y quién los paga.',
        to: '/licencia-por-maternidad-y-paternidad-uruguay',
      },
    ],
    relatedHubs: ['herencias-y-sucesiones-uruguay', 'finanzas-personales-y-jubilacion-uruguay'],
  },
  {
    slug: 'comprar-y-mantener-auto-uruguay',
    title: 'Comprar y mantener un auto en Uruguay',
    seoTitle: 'Comprar un auto en Uruguay: 0km o usado, crédito prendario y costos',
    description:
      'Cómo comprar y mantener un auto en Uruguay: 0km vs usado, crédito prendario, el costo real de tener auto (patente, SOA, seguro) y cómo transferir un vehículo.',
    tag: 'VEHÍCULOS',
    icon: 'mdi-car-outline',
    intro:
      'El auto suele ser la segunda compra más cara después de la vivienda, y la que más costos ocultos tiene. Antes de decidir entre 0km y usado, de firmar un crédito prendario o de comprar de particular, conviene saber cuánto cuesta realmente tener un auto en Uruguay —patente, SOA, seguro, service— y cómo hacer una transferencia sin heredar deudas ajenas. Estas guías te ayudan a comprar con los números claros y a evitar los errores más caros.',
    guideSlugs: [
      'comprar-auto-0km-o-usado-uruguay',
      'credito-prendario-auto-uruguay',
      'costos-de-tener-auto-uruguay',
      'transferir-un-auto-uruguay',
      'pagar-patente-sucive-uruguay',
      'titulo-del-auto-uruguay',
    ],
    resources: [
      {
        label: 'Autos usados',
        description: 'Los avisos de diez fuentes, con el precio comparado contra autos iguales.',
        to: '/autos-usados-uruguay',
      },
      {
        label: 'El mercado de autos usados',
        description:
          'Qué se ofrece, cuánto pierde cada modelo por año y qué comprás con cada presupuesto.',
        to: '/mercado-de-autos-usados-uruguay',
      },
      {
        label: '¿Qué auto usado comprar?',
        description:
          'El modelo y el año que te alcanzan, con patente, repuestos y cuánto sale tenerlo por mes.',
        to: '/que-auto-comprar-uruguay',
      },
      {
        label: '¿Cuánto vale mi auto?',
        description: 'El precio de mercado de tu auto, con los avisos de hoy.',
        to: '/cuanto-vale-mi-auto-uruguay',
      },
      {
        label: 'Evolución del precio de los autos',
        description: 'Cómo cambia lo que se pide por cada modelo.',
        to: '/evolucion-precio-autos-usados-uruguay',
      },
      {
        label: 'Oportunidades en autos usados',
        description: 'Autos pedidos por debajo de otros iguales, revisados en su ficha.',
        to: '/oportunidades-autos-usados-uruguay',
      },
      {
        label: 'Autos chocados y con deuda',
        description: 'Lo que el aviso declara y cuánto menos se pide por eso.',
        to: '/autos-chocados-y-con-deuda-uruguay',
      },
      {
        label: 'Comprar un auto con deuda',
        description: 'Qué revisar antes de comprar un auto con deudas o multas.',
        to: '/comprar-auto-con-deuda-uruguay',
      },
      {
        label: 'Vender mi auto',
        description: 'Cómo fijar el precio y qué pide el comprador.',
        to: '/vender-mi-auto-uruguay',
      },
      {
        label: 'Multas y patente',
        description: 'Cómo consultar multas y deuda de patente de un auto.',
        to: '/multas-de-transito-y-patente-uruguay',
      },
      {
        label: 'Precio de la nafta',
        description: 'Lo que cuesta cargar combustible y cómo cambió.',
        to: '/precio-de-la-nafta-uruguay',
      },
      {
        label: 'IMESI a los autos eléctricos',
        description: 'Cómo cambia el impuesto a los autos eléctricos.',
        to: '/impuesto-autos-electricos-uruguay',
      },
      {
        label: 'Libreta de conducir',
        description: 'Cuánto sale y qué trámite lleva sacarla o renovarla.',
        to: '/libreta-de-conducir-uruguay',
      },
      {
        label: 'Calculadora de préstamo',
        description: 'Simulá el crédito prendario.',
        to: '/herramientas/calculadora-prestamo',
      },
      {
        label: 'Préstamos en Uruguay',
        description: 'Comparar opciones de financiación.',
        to: '/prestamos-uruguay',
      },
      {
        label: 'Estafas en Uruguay',
        description: 'Evitar fraudes al comprar de particular.',
        to: '/estafas-uruguay',
      },
      {
        label: 'Monopatines eléctricos',
        description: 'Precio nuevo y usado, con la normativa de cada departamento.',
        to: '/monopatines-electricos-uruguay',
      },
      {
        label: 'Bicicletas eléctricas',
        description: 'Precio nuevo y usado, con la normativa de cada departamento.',
        to: '/bicicletas-electricas-uruguay',
      },
      {
        label: 'Motos usadas',
        description: 'Precios por modelo y año, con la cilindrada cuando el aviso la declara.',
        to: '/motos-usadas-uruguay',
      },
      {
        label: '¿Auto, moto u ómnibus?',
        description: 'Cuánto sale por mes cada modo y en cuántos meses se paga.',
        to: '/conviene-auto-moto-o-omnibus-uruguay',
      },
    ],
    terms: ['imesi', 'tasa-efectiva-anual', 'arancel-aduanero'],
    relatedHubs: ['deudas-y-credito-uruguay', 'finanzas-personales-y-jubilacion-uruguay'],
  },
  {
    slug: 'deudas-y-credito-uruguay',
    title: 'Deudas y crédito en Uruguay',
    seoTitle: 'Deudas y crédito en Uruguay: préstamos, TEA, Clearing y cómo salir',
    description:
      'Cómo funciona el crédito en Uruguay y cómo salir de deudas: préstamos a sola firma, entender la TEA y el CFT, refinanciar, el Clearing y ser garante.',
    tag: 'CRÉDITO',
    icon: 'mdi-credit-card-clock-outline',
    intro:
      'El crédito puede ser una herramienta o una trampa, y la diferencia casi siempre está en entender el costo real. Estas guías explican cómo leer la TEA y el CFT antes de firmar, cuándo un préstamo a sola firma conviene y cuándo no, qué implica ser garante, cómo funciona el Clearing de Informes frente a la Central de Riesgos del BCU y qué caminos existen para salir de las deudas de tarjeta o refinanciar sin empeorar. La meta es que tomes deuda con los ojos abiertos y salgas de ella con un plan.',
    guideSlugs: [
      'prestamo-a-sola-firma-uruguay',
      'entender-tea-tna-y-cft',
      'refinanciar-deudas-uruguay',
      'mejorar-historial-crediticio-uruguay',
      'ser-garante-o-codeudor-riesgos-uruguay',
      'salir-de-deudas-de-tarjeta-uruguay',
      'no-pagar-prestamo-e-irse-del-pais-uruguay',
      'elegir-tarjeta-credito-beneficios-uruguay',
      'cashback-millas-o-puntos-uruguay',
      'tarjeta-debito-vs-credito-uruguay',
      'cuando-prescribe-una-deuda-uruguay',
      'cancelar-prestamo-antes-de-tiempo-uruguay',
      'me-compraron-la-deuda-uruguay',
      'saldo-a-favor-tarjeta-de-credito-uruguay',
    ],
    resources: [
      {
        label: 'Salir del Clearing',
        description: 'Cómo funciona y cómo salir.',
        to: '/salir-del-clearing',
      },
      {
        label: 'Saldar deudas',
        description: 'Negociar y ordenar tus deudas.',
        to: '/saldar-deudas-uruguay',
      },
      {
        label: 'Préstamos en Uruguay',
        description: 'Comparar antes de pedir.',
        to: '/prestamos-uruguay',
      },
      {
        label: 'Tarjetas de crédito',
        description: 'Ranking y beneficios reales.',
        to: '/tarjetas-de-credito-uruguay',
      },
      {
        label: 'Calculadora de préstamo',
        description: 'Cuota, TEA y costo total.',
        to: '/herramientas/calculadora-prestamo',
      },
      {
        label: 'Mejores préstamos',
        description: 'Qué préstamo cuesta menos según el monto y el plazo.',
        to: '/mejores-prestamos-uruguay',
      },
      {
        label: 'Préstamo sin recibo de sueldo',
        description: 'Qué opciones hay para independientes y cuánto cuestan.',
        to: '/prestamo-sin-recibo-de-sueldo-uruguay',
      },
      {
        label: 'Ley de usura',
        description: 'Los topes de interés que fija la ley y cómo se calculan.',
        to: '/ley-de-usura-uruguay',
      },
      {
        label: 'Adelanto de efectivo con tarjeta',
        description: 'Cuánto cobra cada emisor y el tope legal.',
        to: '/adelanto-de-efectivo-tarjeta-de-credito',
      },
      {
        label: 'Embargo de sueldo',
        description: 'Cuánto te pueden retener y qué hacer.',
        to: '/embargo-de-sueldo-uruguay',
      },
      {
        label: 'Deudas con el Estado',
        description: 'Cuándo prescriben las deudas con organismos públicos.',
        to: '/prescripcion-de-deudas-con-el-estado-uruguay',
      },
    ],
    terms: ['tasa-efectiva-anual', 'tasa-de-interes', 'interes-compuesto'],
    relatedHubs: [
      'sueldo-trabajo-e-impuestos-uruguay',
      'finanzas-personales-y-jubilacion-uruguay',
      'bancos-y-pagos-uruguay',
    ],
  },
  {
    slug: 'sueldo-trabajo-e-impuestos-uruguay',
    title: 'Sueldo, trabajo e impuestos en Uruguay',
    seoTitle: 'Sueldo, trabajo e impuestos en Uruguay: recibo, aguinaldo, IRPF y despido',
    description:
      'Entendé tu sueldo en Uruguay: recibo (nominal vs líquido), aguinaldo, licencia y salario vacacional, despido y liquidación, IRPF y trabajar para el exterior.',
    tag: 'TRABAJO',
    icon: 'mdi-briefcase-outline',
    intro:
      '¿Por qué tu líquido es tanto menor que el nominal? ¿Cómo se calcula el aguinaldo, la licencia o lo que te corresponde si te despiden? ¿Y qué cobrás si te certificás? Estas guías explican, sin jerga, cómo se arma tu sueldo en Uruguay, qué te descuentan y por qué, cómo funciona el IRPF por franjas y qué tener en cuenta si trabajás para clientes del exterior. Saber leer tu recibo y entender estos derechos es el primer paso para reclamar lo que corresponde y planificar mejor.',
    guideSlugs: [
      'entender-tu-recibo-de-sueldo-uruguay',
      'horas-extra-en-uruguay',
      'feriados-en-uruguay-como-se-pagan',
      'llegar-tarde-tolerancia-y-sanciones-uruguay',
      'como-se-calcula-el-aguinaldo-uruguay',
      'aguinaldo-casos-especiales-uruguay',
      'licencia-y-salario-vacacional-uruguay',
      'me-certifique-subsidio-por-enfermedad-uruguay',
      'despido-y-liquidacion-uruguay',
      'trabajo-en-negro-uruguay',
      'como-funciona-el-irpf-uruguay',
      'trabajar-para-el-exterior-desde-uruguay',
      'salario-minimo-uruguay-cuanto-es',
      'me-quede-sin-trabajo-mutualista-fonasa-uruguay',
      'como-pedir-un-aumento-de-sueldo-uruguay',
      'pedir-que-me-despidan-uruguay',
    ],
    resources: [
      {
        label: 'Calculadora de sueldo líquido',
        description: 'Del nominal al líquido, con aportes.',
        to: '/herramientas/calculadora-sueldo-liquido',
      },
      {
        label: 'Calculadora de IRPF',
        description: 'Cuánto IRPF pagás por franjas.',
        to: '/herramientas/calculadora-irpf',
      },
      {
        label: 'Calculadora de aguinaldo',
        description: 'Tu SAC según lo ganado.',
        to: '/herramientas/calculadora-aguinaldo',
      },
      {
        label: 'Seguro de paro',
        description: 'Cuánto cobrás, por cuántos meses y por qué baja.',
        to: '/seguro-de-paro-uruguay',
      },
      {
        label: 'Denunciar trabajo en negro',
        description: 'Las tres puertas: Inspección, BPS y conciliación.',
        to: '/denunciar-trabajo-en-negro-uruguay',
      },
      {
        label: 'Qué empresa abrir',
        description: 'Para facturar como unipersonal o empresa.',
        to: '/que-empresa-abrir-uruguay',
      },
      {
        label: 'Horas extras',
        description: 'Cuánto se pagan y cómo se calculan.',
        to: '/horas-extras-uruguay',
      },
      {
        label: 'Cuándo se cobra el aguinaldo',
        description:
          'Hasta el 20 de diciembre de 2026 por decreto; la cuota de junio y quién paga.',
        to: '/cuando-se-cobra-el-aguinaldo-uruguay',
      },
      {
        label: 'Salario vacacional',
        description: 'Cuánto es y cuándo se cobra.',
        to: '/salario-vacacional-uruguay',
      },
      {
        label: 'Indemnización por despido',
        description: 'Cuánto corresponde y cómo se calcula.',
        to: '/indemnizacion-por-despido-uruguay',
      },
      {
        label: 'Renunciar al trabajo',
        description: 'Qué cobrás y qué tenés que avisar.',
        to: '/renunciar-al-trabajo-uruguay',
      },
      {
        label: 'Licencias especiales',
        description: 'Qué licencias pagas existen y cuántos días dan.',
        to: '/licencias-especiales-uruguay',
      },
      {
        label: 'Mercado IT',
        description: 'Cómo ven el trabajo en software en r/CharruaDevs.',
        to: '/mercado-it-uruguay',
      },
    ],
    terms: [
      'irpf',
      'irpf-categoria-i',
      'irpf-categoria-ii',
      'iass',
      'bpc',
      'dgi',
      'irnr',
      'residencia-fiscal',
      'indice-medio-de-salarios',
    ],
    relatedHubs: [
      'deudas-y-credito-uruguay',
      'ahorrar-e-invertir-uruguay',
      'emprender-y-empresa-uruguay',
      'derechos-y-reclamos-uruguay',
    ],
  },
  {
    slug: 'derechos-y-reclamos-uruguay',
    title: 'Derechos y reclamos en Uruguay',
    seoTitle: 'Derechos y reclamos en Uruguay: sueldo impago, cobranzas y abogado gratis',
    description:
      'Cómo reclamar en Uruguay: sueldo impago y conciliación ante el MTSS, qué puede y qué no una empresa de cobranza, dónde conseguir asesoramiento jurídico gratuito y a qué organismo va cada problema.',
    tag: 'DERECHOS',
    icon: 'mdi-scale-balance',
    intro:
      'Reclamar en Uruguay no es una sola cosa: cada problema tiene su ventanilla, su plazo y su límite. Acá está el mapa. Qué hacer cuando te deben el sueldo y por qué la conciliación ante el Ministerio de Trabajo frena el reloj de la prescripción; qué puede exigir de verdad una empresa de cobranza y por qué no puede tocarte el sueldo; dónde conseguir un abogado sin plata y qué materia toma cada puerta; y a qué organismo va tu caso cuando el proveedor es un banco, una empresa de luz o una tienda. Está escrito con la norma al lado y con los límites dichos: qué te resuelve cada camino y qué no.',
    guideSlugs: [
      'me-deben-el-sueldo-uruguay',
      'abogado-gratis-uruguay',
      'estudio-de-cobranza-uruguay',
      'devoluciones-y-cambios-en-tiendas-uruguay',
    ],
    resources: [
      {
        label: 'A quién le reclamo',
        description: 'El organismo que corresponde a cada problema.',
        to: '/a-quien-le-reclamo-uruguay',
      },
      {
        label: 'Defensa del Consumidor',
        description: 'Qué puede hacer por vos y qué no.',
        to: '/defensa-al-consumidor-uruguay',
      },
      {
        label: 'Derechos en compras online',
        description: 'Retracto, vicios y remedios de la Ley 17.250.',
        to: '/derechos-consumidor-compras-online',
      },
      {
        label: 'Estafas en Uruguay',
        description: 'Cómo actuar y dónde denunciar.',
        to: '/estafas-uruguay',
      },
      {
        label: 'Preguntas verificadas',
        description: 'Respuestas con la fuente oficial al lado.',
        to: '/preguntas-economia-personal',
      },
      {
        label: 'Tiendas online',
        description: 'Señales fechadas de cada tienda antes de comprarle.',
        to: '/tiendas-online-uruguay',
      },
      {
        label: '¿El descuento es real?',
        description: 'Cada oferta de CyberLunes y Black Friday contra su propio historial.',
        to: '/ciberlunes-y-black-friday-uruguay',
      },
      {
        label: 'Me cobran algo que no autoricé',
        description: 'Cómo desconocer un cargo en la tarjeta.',
        to: '/me-cobran-algo-que-no-autorice',
      },
      {
        label: 'Sodimac canceló tu compra',
        description: 'Cómo reclamar si Sodimac canceló una compra que ya pagaste.',
        to: '/reclamo-sodimac-compra-cancelada',
      },
      {
        label: 'Denunciar ruidos molestos',
        description: 'Dónde y cómo denunciar ruidos en tu barrio.',
        to: '/denunciar-ruidos-molestos-uruguay',
      },
    ],
    relatedHubs: [
      'sueldo-trabajo-e-impuestos-uruguay',
      'deudas-y-credito-uruguay',
      'tramites-y-documentos-uruguay',
    ],
  },
  {
    slug: 'ahorrar-e-invertir-uruguay',
    title: 'Ahorrar e invertir en Uruguay',
    seoTitle: 'Ahorrar e invertir en Uruguay: desde cero, plazo fijo, bolsa y dólares',
    description:
      'Cómo empezar a ahorrar e invertir en Uruguay: fondo de emergencia, interés compuesto, plazo fijo, la bolsa de USA, renta fija, dólares y evitar estafas.',
    tag: 'INVERSIÓN',
    icon: 'mdi-chart-line',
    intro:
      'Invertir no es para pocos ni requiere fortunas: empieza por ordenar lo básico y entender un puñado de conceptos. Estas guías te llevan desde el fondo de emergencia y el interés compuesto hasta el plazo fijo, los bonos, la bolsa de Estados Unidos y la decisión de ahorrar en dólares, con una mirada honesta sobre riesgo, costos e impuestos en Uruguay —y sobre cómo reconocer las estafas que abundan. La idea es simple y la repetimos: educación antes que especulación.',
    guideSlugs: [
      'como-empezar-a-invertir-uruguay',
      'fondo-de-emergencia-como-armarlo-uruguay',
      'plazo-fijo-en-uruguay-conviene',
      'invertir-en-la-bolsa-de-usa-desde-uruguay',
      'bonos-y-renta-fija-uruguay',
      'conviene-ahorrar-en-dolares-uruguay',
      'interes-compuesto-explicado-uruguay',
      'errores-y-estafas-al-invertir-uruguay',
      'comprar-criptomonedas-en-uruguay',
    ],
    resources: [
      {
        label: 'Dónde invertir en Uruguay',
        description: 'Bancos, brokers, renta fija y cripto.',
        to: '/inversiones-uruguay',
      },
      {
        label: 'Impuestos a las inversiones',
        description: 'Cómo tributan tus rentas.',
        to: '/impuestos-inversiones-uruguay',
      },
      {
        label: 'Invertir en proyectos uruguayos',
        description: 'Economía real: agro, inmobiliario y más.',
        to: '/invertir-en-proyectos-uruguayos',
      },
      {
        label: 'Calculadora de plazo fijo',
        description: 'Simulá el rendimiento.',
        to: '/herramientas/calculadora-plazo-fijo',
      },
      {
        label: 'Calculadora de impuestos a inversiones',
        description: 'El IRPF de tus rentas de capital.',
        to: '/herramientas/calculadora-impuestos-inversiones',
      },
      {
        label: 'Cuenta remunerada',
        description: 'Qué cuentas pagan interés y cuánto.',
        to: '/cuenta-remunerada-uruguay',
      },
      {
        label: 'Préstamos P2P',
        description: 'Prestar a personas por plataformas: rendimiento y riesgo.',
        to: '/prestamos-p2p-uruguay',
      },
      {
        label: 'Indicadores',
        description: 'Inflación, UI, UR y las tasas que mueven tus ahorros.',
        to: '/indicadores',
      },
    ],
    terms: [
      'plazo-fijo',
      'interes-compuesto',
      'tasa-efectiva-anual',
      'tasa-de-interes',
      'liquidez',
      'moneda-refugio',
      'oro',
      'onza-troy',
      'quilate',
      'criptomoneda',
      'stablecoin',
      'usdt',
      'cobertura-cambiaria',
      'renta-de-fuente-extranjera',
      'incremento-patrimonial',
      'step-up-2025',
      'crs',
    ],
    relatedHubs: ['finanzas-personales-y-jubilacion-uruguay', 'economia-y-mercado-uruguay'],
  },
  {
    slug: 'finanzas-personales-y-jubilacion-uruguay',
    title: 'Finanzas personales y jubilación en Uruguay',
    seoTitle: 'Finanzas personales en Uruguay: presupuesto, seguros, jubilación y AFAP',
    description:
      'Ordená tu vida financiera en Uruguay: presupuesto personal, seguros que conviene tener, jubilación y AFAP, planificar el retiro, cuentas, billeteras y estafas.',
    tag: 'FINANZAS',
    icon: 'mdi-heart-pulse',
    intro:
      'La salud financiera se construye con hábitos, no con golpes de suerte: un presupuesto realista, los seguros justos, una cuenta bien elegida y una mirada temprana a la jubilación. Estas guías cubren lo esencial de la vida financiera en Uruguay —cómo armar un presupuesto, qué seguros valen la pena, cómo funcionan las AFAP y el sistema jubilatorio, cómo abrir una cuenta o usar billeteras digitales, y cómo no caer en estafas— para que tu dinero trabaje a favor tuyo, hoy y a largo plazo.',
    guideSlugs: [
      'armar-un-presupuesto-personal-uruguay',
      'que-seguros-conviene-tener-uruguay',
      'jubilacion-y-afap-como-funciona-uruguay',
      'reforma-jubilatoria-uruguay-que-cambia',
      'elegir-o-cambiar-de-afap-uruguay',
      'planificar-tu-retiro-uruguay',
      'abrir-una-cuenta-bancaria-uruguay',
      'billeteras-digitales-uruguay-como-funcionan',
      'como-evitar-estafas-financieras-uruguay',
      'educacion-financiera-para-jovenes-uruguay',
      'subsidio-expensas-funerarias-bps-uruguay',
      'cobrar-jubilacion-uruguaya-desde-el-exterior',
      'canasta-fin-de-ano-bps-uruguay',
      'precio-supergas-garrafa-uruguay',
    ],
    resources: [
      {
        label: 'Salud financiera',
        description: 'Diagnóstico e ideas de ingreso extra.',
        to: '/salud-financiera',
      },
      {
        label: 'Mejores bancos de Uruguay',
        description: 'Comparativa de bancos y fintech.',
        to: '/mejores-bancos-uruguay',
      },
      {
        label: 'Apps de economía',
        description: 'Las apps que te ordenan la plata.',
        to: '/apps-economia-uruguay',
      },
      {
        label: 'Preguntas de finanzas personales',
        description: 'Las dudas más comunes, respondidas.',
        to: '/preguntas-economia-personal',
      },
      {
        label: 'Estafas en Uruguay',
        description: 'Reconocer y evitar fraudes.',
        to: '/estafas-uruguay',
      },
      {
        label: 'Plan de vida por ingreso',
        description: 'El orden de cada peso según lo que ganás.',
        to: '/plan-de-vida-uruguay',
      },
      {
        label: 'Vivir con $25.000',
        description: 'Cómo se reparte un sueldo chico, con precios de hoy.',
        to: '/vivir-con-25000-pesos-uruguay',
      },
      {
        label: 'Precios de supermercado',
        description: 'Dónde sale menos la misma canasta.',
        to: '/precios-de-supermercado-uruguay',
      },
      {
        label: 'Meal prep',
        description: 'Una semana de comidas en un día de cocina, con precios del SIPC.',
        to: '/meal-prep-uruguay',
      },
      {
        label: 'Sillas de escritorio',
        description: 'Precios por modelo en tiendas uruguayas, y qué opina r/CharruaDevs.',
        to: '/sillas-escritorio-uruguay',
      },
    ],
    terms: ['iass', 'bpc', 'ui', 'unidad-reajustable', 'interes-compuesto', 'inflacion'],
    relatedHubs: [
      'ahorrar-e-invertir-uruguay',
      'deudas-y-credito-uruguay',
      'bancos-y-pagos-uruguay',
    ],
  },
  {
    slug: 'emprender-y-empresa-uruguay',
    title: 'Emprender y tener una empresa en Uruguay',
    seoTitle:
      'Emprender en Uruguay: monotributo, empresa unipersonal, facturar y qué empresa abrir',
    description:
      'Formalizar y hacer crecer tu emprendimiento en Uruguay: monotributo, empresa unipersonal, cómo facturar como freelancer, e-factura, impuestos y qué forma jurídica conviene.',
    tag: 'EMPRENDER',
    icon: 'mdi-rocket-launch-outline',
    intro:
      'Arrancar un negocio o facturar por tu cuenta en Uruguay pasa, tarde o temprano, por formalizarte: elegir entre el monotributo y la empresa unipersonal, entender la e-factura, saber cómo le cobrás a un cliente del exterior y qué impuestos te tocan según cuánto factures. Este tema reúne las guías que desarman esos primeros pasos —del monotributo para lo chico a la unipersonal cuando crecés— y las herramientas para elegir la forma jurídica que más te conviene, sin jerga y con las cifras vigentes.',
    guideSlugs: [
      'monotributo-uruguay-que-es-y-cuando-conviene',
      'abrir-empresa-unipersonal-uruguay',
      'facturar-como-freelancer-uruguay',
      'vender-por-mercado-libre-uruguay',
    ],
    resources: [
      {
        label: 'Qué empresa abrir',
        description: 'Comparador de formas jurídicas según tu ingreso.',
        to: '/que-empresa-abrir-uruguay',
      },
      {
        label: 'Facturar en monotributo',
        description: 'Talonario o e-factura: cuál te obliga la DGI y cuál te sale menos.',
        to: '/facturar-en-monotributo-uruguay',
      },
      {
        label: 'Trabajar para el exterior',
        description: 'Facturar y cobrar a clientes de afuera.',
        to: '/guias/trabajar-para-el-exterior-desde-uruguay',
      },
      {
        label: 'Mejores bancos de Uruguay',
        description: 'Dónde abrir la cuenta del emprendimiento.',
        to: '/mejores-bancos-uruguay',
      },
      {
        label: 'Calculadora de sueldo líquido',
        description: 'Del nominal al líquido, con aportes.',
        to: '/herramientas/calculadora-sueldo-liquido',
      },
      {
        label: 'Contractor desde Uruguay',
        description: 'Trabajar para afuera como contractor: impuestos y cobro.',
        to: '/contractor-en-uruguay',
      },
      {
        label: 'Cobrar en dólares, gastar en pesos',
        description: 'Cómo conviene mover la plata si cobrás en dólares.',
        to: '/cobrar-en-dolares-gastar-en-pesos',
      },
    ],
    terms: ['irae', 'iva', 'dgi', 'dividendo-ficto', 'ficto-20', 'bpc'],
    relatedHubs: ['sueldo-trabajo-e-impuestos-uruguay', 'ahorrar-e-invertir-uruguay'],
  },
  // Los dos hubs de la tanda del 2026-09-13: no había dónde poner las guías de pagos ni las de
  // trámites sin estirar el tema de otro hub.
  {
    slug: 'bancos-y-pagos-uruguay',
    title: 'Bancos, tarjetas y pagos en Uruguay',
    seoTitle: 'Bancos y pagos en Uruguay: débito, transferencias y alias',
    description:
      'Pagar, cobrar y transferir en Uruguay sin perder plata: débito y recargos, saldo retenido, transferencias equivocadas, alias, dinero del exterior y tarjetas uruguayas en Argentina.',
    tag: 'PAGOS',
    icon: 'mdi-bank-transfer',
    intro:
      'Casi todo lo que hacemos con la plata pasa por un banco o una app: cobrar el sueldo, pagar con débito, transferirle a alguien, recibir un pago de afuera o usar la tarjeta en un viaje. Y casi todo tiene una letra chica que se descubre tarde: el comercio que pide un monto mínimo para cobrar con débito, el saldo que aparece retenido sin explicación, la transferencia que salió a la cuenta equivocada, la comisión que el banco descuenta al recibir un giro del exterior. Estas guías explican cómo funciona cada cosa en Uruguay, qué dice la norma y qué podés exigir, con la fuente al lado.',
    guideSlugs: [
      'comercio-no-acepta-debito-uruguay',
      'saldo-retenido-tarjeta-debito-uruguay',
      'transferencia-a-cuenta-equivocada-uruguay',
      'recibir-transferencia-del-exterior-uruguay',
      'enviar-recibir-dinero-exterior',
      'alias-para-transferir-uruguay',
      'usar-tarjeta-uruguaya-en-argentina',
    ],
    resources: [
      {
        label: 'Comisiones de transferencia',
        description: 'Qué cobra cada banco por transferir dentro de Uruguay.',
        to: '/comisiones-de-transferencia-uruguay',
      },
      {
        label: 'Mejores bancos de Uruguay',
        description: 'Comparativa de bancos y fintech.',
        to: '/mejores-bancos-uruguay',
      },
      {
        label: 'Tarjetas de débito',
        description: 'Comisión en el exterior, spread y costo de cada una.',
        to: '/tarjetas-de-debito-uruguay',
      },
      {
        label: 'Tarjetas de crédito',
        description: 'Ranking y beneficios reales, tarjeta por tarjeta.',
        to: '/tarjetas-de-credito-uruguay',
      },
      {
        label: 'Me cobran algo que no autoricé',
        description: 'Cómo frenar un cargo y a quién reclamar.',
        to: '/me-cobran-algo-que-no-autorice',
      },
      {
        label: 'Descuentos con tarjeta',
        description: 'Los descuentos vigentes de cada banco, por rubro y comercio.',
        to: '/descuentos-con-tarjeta-uruguay',
      },
      {
        label: '¿Qué banco tiene más descuentos?',
        description: 'Los descuentos de cada banco comparados.',
        to: '/que-banco-tiene-mas-descuentos-uruguay',
      },
      {
        label: 'Cobrar un giro del exterior',
        description: 'Qué cobra cada vía por recibir plata de afuera.',
        to: '/cobrar-giro-del-exterior-uruguay',
      },
      {
        label: 'Cheques',
        description: 'Cómo funcionan, cuánto tardan y qué pasa si rebotan.',
        to: '/cheques-uruguay',
      },
      {
        label: 'Retirar efectivo',
        description: 'Dónde y cuánto cuesta sacar efectivo.',
        to: '/retirar-efectivo-uruguay',
      },
      {
        label: 'Alternativa a Bankos',
        description: 'Los descuentos de tus tarjetas sin instalar la app.',
        to: '/alternativa-a-bankos-uruguay',
      },
      {
        label: '¿Cuánto vale una milla de Itaú?',
        description: 'Lo que rinde en pesos cada milla del programa.',
        to: '/cuanto-vale-una-milla-itau-uruguay',
      },
    ],
    terms: [
      'caja-de-ahorro',
      'transferencia-internacional',
      'remesa',
      'declaracion-jurada-origen-de-fondos',
      'crs',
      'liquidez',
    ],
    relatedHubs: [
      'deudas-y-credito-uruguay',
      'finanzas-personales-y-jubilacion-uruguay',
      'dolar-y-casas-de-cambio-uruguay',
    ],
  },
  {
    slug: 'tramites-y-documentos-uruguay',
    title: 'Trámites y documentos en Uruguay',
    seoTitle: 'Trámites en Uruguay: ciudadanía, cédula, antecedentes y más',
    description:
      'Los trámites por los que más se pregunta en Uruguay, con requisitos, costo y plazo: ciudadanía legal, cédula para extranjeros, antecedentes judiciales, casarse por civil y cuánto guardar cada papel.',
    tag: 'TRÁMITES',
    icon: 'mdi-file-document-outline',
    intro:
      'Un trámite mal hecho cuesta dos veces: la vuelta perdida y la plata que se va en el camino. Acá están los trámites por los que más se pregunta en Uruguay, contados en orden: qué pedir, dónde, cuánto sale según la tarifa publicada y cuánto demora. La ciudadanía legal y en qué se diferencia de la residencia, la cédula para quien llega del Mercosur, el certificado de antecedentes que piden los organismos, cómo es casarse por civil y cuánto tiempo conviene guardar cada comprobante. Cada guía lleva la fuente oficial para que confirmes el dato el día que vayas.',
    guideSlugs: [
      'ciudadania-legal-uruguaya',
      'cedula-uruguaya-para-argentinos',
      'casarse-por-civil-uruguay',
      'cuanto-tiempo-guardar-recibos-y-facturas-uruguay',
    ],
    resources: [
      {
        // Página propia (otra sesión, 4dbf17e3): la guía que había acá competía con ella por la
        // misma consulta y se sacó de la tanda.
        label: 'Certificado de antecedentes judiciales',
        description: 'Cuánto sale hoy en pesos, los dos certificados y cuándo vence.',
        to: '/certificado-de-antecedentes-judiciales-uruguay',
      },
      {
        label: 'Cuánto sale la cédula',
        description: 'Tarifas vigentes y dónde tramitarla.',
        to: '/cuanto-sale-la-cedula-de-identidad-uruguaya',
      },
      {
        label: 'Cuánto sale el pasaporte',
        description: 'Costo, plazos y requisitos.',
        to: '/cuanto-sale-el-pasaporte-uruguayo',
      },
      {
        label: 'Mudarse a Uruguay',
        description: 'Residencia legal, paso a paso.',
        to: '/mudarme-a-uruguay-residencia',
      },
      {
        label: 'Libreta de conducir',
        description: 'Costo y trámite por departamento.',
        to: '/libreta-de-conducir-uruguay',
      },
      {
        label: 'Carné de salud',
        description: 'Dónde hacerlo y cuánto sale.',
        to: '/carne-de-salud-uruguay',
      },
      {
        label: 'A quién le reclamo',
        description: 'El organismo que corresponde a cada problema.',
        to: '/a-quien-le-reclamo-uruguay',
      },
    ],
    terms: ['residencia-fiscal', 'dgi'],
    relatedHubs: ['derechos-y-reclamos-uruguay', 'pareja-familia-y-dinero-uruguay'],
  },
]

/** Look up a hub by its slug. */
export function getHub(slug: string): GuideHub | undefined {
  return guideHubs.find(hub => hub.slug === slug)
}

/** Every hub slug, in catalogue order. Used by the route guard and sitemap. */
export function hubSlugs(): string[] {
  return guideHubs.map(hub => hub.slug)
}

/** Resolve a hub's guides to full {@link Guide} objects, skipping any unknown slug. */
export function hubGuides(hub: GuideHub): Guide[] {
  return hub.guideSlugs.map(getGuide).filter((g): g is Guide => Boolean(g))
}

/** The hub a given guide belongs to, if any (guide → hub, the spoke → hub link). */
export function hubOfGuide(guideSlug: string): GuideHub | undefined {
  return guideHubs.find(hub => hub.guideSlugs.includes(guideSlug))
}
