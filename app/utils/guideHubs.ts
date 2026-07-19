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
        label: 'Comparador de cotizaciones',
        description: 'El dólar en más de 40 casas de cambio, en vivo.',
        to: '/comparar',
      },
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
        label: 'Casa de cambio cerca de mí',
        description: 'La mejor opción según dónde estás.',
        to: '/casa-de-cambio-cerca-de-mi',
      },
      { label: 'Mapa de sucursales', description: 'Dónde cambiar, en el mapa.', to: '/mapa' },
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
      'importar-de-aliexpress-a-uruguay',
      'comprar-en-amazon-desde-uruguay',
      'enviar-recibir-dinero-exterior',
    ],
    resources: [
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
        label: 'Indicadores (UI, UR, BPC)',
        description: 'Los valores que indexan todo.',
        to: '/indicadores',
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
        label: 'Guía para alquilar',
        description: 'Desde conseguir techo hasta firmar.',
        to: '/alquilar-en-uruguay',
      },
      {
        label: 'Alquilar estando en el Clearing',
        description: 'Sí se puede: cómo hacerlo.',
        to: '/alquilar-estando-en-clearing',
      },
      {
        label: 'Costo de vida',
        description: 'Cuánto necesitás para vivir donde querés.',
        to: '/herramientas/costo-de-vida',
      },
    ],
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
    ],
    resources: [
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
        label: 'Calculadora de préstamo',
        description: 'Simulá la cuota mensual.',
        to: '/herramientas/calculadora-prestamo',
      },
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
    ],
    resources: [
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
    ],
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
    ],
    relatedHubs: ['sueldo-trabajo-e-impuestos-uruguay', 'finanzas-personales-y-jubilacion-uruguay'],
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
      '¿Por qué tu líquido es tanto menor que el nominal? ¿Cómo se calcula el aguinaldo, la licencia o lo que te corresponde si te despiden? Estas guías explican, sin jerga, cómo se arma tu sueldo en Uruguay, qué te descuentan y por qué, cómo funciona el IRPF por franjas y qué tener en cuenta si trabajás para clientes del exterior. Saber leer tu recibo y entender estos derechos es el primer paso para reclamar lo que corresponde y planificar mejor.',
    guideSlugs: [
      'entender-tu-recibo-de-sueldo-uruguay',
      'horas-extra-en-uruguay',
      'llegar-tarde-tolerancia-y-sanciones-uruguay',
      'como-se-calcula-el-aguinaldo-uruguay',
      'licencia-y-salario-vacacional-uruguay',
      'despido-y-liquidacion-uruguay',
      'como-funciona-el-irpf-uruguay',
      'trabajar-para-el-exterior-desde-uruguay',
      'salario-minimo-uruguay-cuanto-es',
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
        label: 'Qué empresa abrir',
        description: 'Para facturar como unipersonal o empresa.',
        to: '/que-empresa-abrir-uruguay',
      },
    ],
    relatedHubs: [
      'deudas-y-credito-uruguay',
      'ahorrar-e-invertir-uruguay',
      'emprender-y-empresa-uruguay',
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
    ],
    relatedHubs: ['ahorrar-e-invertir-uruguay', 'deudas-y-credito-uruguay'],
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
    ],
    resources: [
      {
        label: 'Qué empresa abrir',
        description: 'Comparador de formas jurídicas según tu ingreso.',
        to: '/que-empresa-abrir-uruguay',
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
    ],
    relatedHubs: ['sueldo-trabajo-e-impuestos-uruguay', 'ahorrar-e-invertir-uruguay'],
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
