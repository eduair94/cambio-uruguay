// The copy for each video topic page.
//
// The SLUGS are decided by the backend classifier (`classes/videos/topics.ts`), which is what tags
// every video, and `tests/unit/videoTopics.test.ts` fails the build if the two lists drift — a
// slug that exists here and not there is a page that can never fill, and a slug that exists there
// and not here is a set of videos with nowhere to be listed.
//
// What lives HERE and nowhere else is the writing: the H1, the meta description, the paragraph
// above the list and the links to the pages of this site that answer the same question. The
// backend has no business holding Spanish prose, and a topic page whose only content is an
// embedded list of somebody else's videos is exactly the thin page Google is right to ignore.
//
// PURE (no Vue/Nuxt imports) so the pages, the sitemap route and the tests all share it.

export interface VideoTopicPage {
  /** URL slug under /videos-de-economia-uruguay/. Must match the backend classifier. */
  slug: string
  /** Short label: chips, breadcrumbs, the filter row on the hub. */
  label: string
  /** The page's H1. Written as a phrase somebody would search, not as a category name. */
  h1: string
  /** <title>, without the site suffix. */
  seoTitle: string
  /** Meta description. One sentence, says what the page is and that it refreshes. */
  seoDescription: string
  /** The paragraph above the list. Its job is to make the page worth landing on. */
  intro: string
  /** MDI icon for the chip and the header. */
  icon: string
  /** Extra search phrasings, folded into the keywords meta and the site search haystack. */
  keywords: readonly string[]
  /** Pages of this site that answer the same question. Rendered as a list, and as internal links. */
  related: ReadonlyArray<{ to: string; label: string }>
}

export const VIDEO_TOPIC_PAGES: readonly VideoTopicPage[] = Object.freeze([
  {
    slug: 'dolar-y-cotizaciones',
    label: 'Dólar y cotizaciones',
    h1: 'Videos sobre el dólar en Uruguay',
    seoTitle: 'Videos sobre el dólar en Uruguay: análisis, cotización y qué esperar',
    seoDescription:
      'Los videos más recientes de YouTube sobre el dólar en Uruguay: por qué sube o baja, qué dicen los analistas y qué se espera del tipo de cambio. Se actualiza todos los días.',
    intro:
      'Acá juntamos lo último que se publicó en YouTube sobre el dólar en Uruguay: el análisis de por qué se mueve, las proyecciones de los economistas y las notas de los informativos. Lo que ningún video te va a dar es el precio de este minuto — eso lo tenés en la pizarra del sitio, con todas las casas de cambio y los bancos.',
    icon: 'mdi-currency-usd',
    keywords: [
      'videos dolar uruguay',
      'que pasa con el dolar uruguay video',
      'analisis dolar uruguay youtube',
      'proyeccion dolar uruguay',
      'por que sube el dolar video',
    ],
    related: [
      { to: '/dolar-hoy', label: 'El dólar hoy: todas las cotizaciones, en vivo' },
      { to: '/por-que-sube-el-dolar', label: 'Por qué sube el dólar' },
      { to: '/mejor-casa-de-cambio', label: 'Dónde conviene cambiar hoy' },
      { to: '/historico', label: 'Histórico del dólar' },
    ],
  },
  {
    slug: 'inflacion-y-precios',
    label: 'Inflación y precios',
    h1: 'Videos sobre inflación y precios en Uruguay',
    seoTitle: 'Videos sobre inflación y precios en Uruguay',
    seoDescription:
      'Videos recientes sobre la inflación uruguaya, el IPC, el costo de vida, las tarifas y los precios del supermercado. Actualizado a diario desde YouTube.',
    intro:
      'La inflación es el número que decide cuánto vale el sueldo del mes que viene. Acá están los videos que la explican: el dato del INE, lo que pasa con las tarifas y el combustible, y por qué la canasta sube más rápido que el índice.',
    icon: 'mdi-chart-line',
    keywords: [
      'videos inflacion uruguay',
      'ipc uruguay video',
      'costo de vida uruguay youtube',
      'aumento de precios uruguay',
    ],
    related: [
      { to: '/herramientas/costo-de-vida', label: 'Cuánto cuesta vivir en Uruguay' },
      { to: '/herramientas/calculadora-inflacion', label: 'Calculadora de inflación' },
      { to: '/indicadores', label: 'Indicadores de la economía uruguaya' },
      { to: '/economia-uruguay', label: 'La economía uruguaya, explicada' },
    ],
  },
  {
    slug: 'impuestos-y-dgi',
    label: 'Impuestos',
    h1: 'Videos sobre impuestos en Uruguay',
    seoTitle: 'Videos sobre impuestos en Uruguay: IRPF, IVA, DGI y monotributo',
    seoDescription:
      'Videos que explican el IRPF, el IVA, el monotributo y los trámites de DGI en Uruguay. Se actualiza todos los días con lo último de YouTube.',
    intro:
      'Impuestos es el tema donde un video mal mirado sale caro. Acá están los que explican el IRPF, el IVA, el monotributo y las declaraciones de DGI. Fijate siempre la fecha: una franja o una tasa del año pasado ya no es la de hoy.',
    icon: 'mdi-file-document-outline',
    keywords: [
      'videos irpf uruguay',
      'como hacer la declaracion de irpf video',
      'monotributo uruguay youtube',
      'dgi explicado video',
      'iva uruguay video',
    ],
    related: [
      { to: '/declaracion-de-irpf-uruguay', label: 'La declaración de IRPF, paso a paso' },
      { to: '/herramientas/calculadora-irpf', label: 'Calculadora de IRPF' },
      { to: '/facturar-en-monotributo-uruguay', label: 'Facturar en monotributo' },
      { to: '/impuestos-inversiones-uruguay', label: 'Impuestos sobre inversiones' },
    ],
  },
  {
    slug: 'jubilaciones-y-afap',
    label: 'Jubilaciones y AFAP',
    h1: 'Videos sobre jubilaciones y AFAP en Uruguay',
    seoTitle: 'Videos sobre jubilaciones y AFAP en Uruguay',
    seoDescription:
      'Videos sobre la jubilación en Uruguay, las AFAP, el BPS y la reforma de la seguridad social. Actualizado a diario desde YouTube.',
    intro:
      'La jubilación es la decisión financiera más larga que se toma en la vida y la que menos se explica. Acá están los videos sobre las AFAP, el BPS y la reforma: cómo se calcula, qué cambió y qué se puede elegir todavía.',
    icon: 'mdi-account-clock-outline',
    keywords: [
      'videos jubilacion uruguay',
      'afap uruguay video',
      'reforma jubilatoria uruguay youtube',
      'bps jubilacion explicado',
    ],
    related: [
      { to: '/desvincularme-de-la-afap-uruguay', label: 'Desvincularse de la AFAP' },
      { to: '/salud-financiera', label: 'Salud financiera personal' },
      { to: '/economia-uruguay', label: 'La economía uruguaya, explicada' },
    ],
  },
  {
    slug: 'sueldos-y-trabajo',
    label: 'Sueldos y trabajo',
    h1: 'Videos sobre sueldos y trabajo en Uruguay',
    seoTitle: 'Videos sobre sueldos, salarios y trabajo en Uruguay',
    seoDescription:
      'Videos sobre el salario en Uruguay: consejos de salarios, aguinaldo, salario vacacional, seguro de paro y mercado laboral. Se actualiza todos los días.',
    intro:
      'Cuánto se cobra, cuánto se descuenta y qué corresponde cobrar aparte del sueldo. Acá están los videos sobre consejos de salarios, aguinaldo, licencia y seguro de paro. Para la cuenta exacta de tu recibo, el sitio tiene la calculadora.',
    icon: 'mdi-briefcase-outline',
    keywords: [
      'videos sueldos uruguay',
      'consejo de salarios video',
      'aguinaldo uruguay youtube',
      'seguro de paro uruguay video',
      'salario minimo uruguay',
    ],
    related: [
      { to: '/herramientas/calculadora-sueldo-liquido', label: 'Calculadora de sueldo líquido' },
      { to: '/cuanto-me-tienen-que-pagar-uruguay', label: 'Cuánto te tienen que pagar' },
      { to: '/herramientas/calculadora-aguinaldo', label: 'Calculadora de aguinaldo' },
      { to: '/seguro-de-paro-uruguay', label: 'Seguro de paro' },
    ],
  },
  {
    slug: 'creditos-y-deudas',
    label: 'Créditos y deudas',
    h1: 'Videos sobre créditos y deudas en Uruguay',
    seoTitle: 'Videos sobre créditos, préstamos y deudas en Uruguay',
    seoDescription:
      'Videos sobre préstamos, tarjetas, cuotas, clearing y cómo salir de deudas en Uruguay. Actualizado a diario desde YouTube.',
    intro:
      'Un crédito se entiende o se paga dos veces. Acá están los videos sobre préstamos, tarjetas, cuotas y clearing: qué tasa te están cobrando de verdad, y qué se puede hacer cuando la deuda ya está.',
    icon: 'mdi-credit-card-outline',
    keywords: [
      'videos prestamos uruguay',
      'salir del clearing video',
      'deudas uruguay youtube',
      'tasa de interes uruguay video',
    ],
    related: [
      { to: '/prestamos-uruguay', label: 'Préstamos en Uruguay, comparados' },
      { to: '/salir-del-clearing', label: 'Salir del clearing' },
      { to: '/saldar-deudas-uruguay', label: 'Negociar y saldar deudas' },
      { to: '/conviene-comprar-en-cuotas', label: '¿Conviene comprar en cuotas?' },
    ],
  },
  {
    slug: 'vivienda-y-alquileres',
    label: 'Vivienda y alquileres',
    h1: 'Videos sobre vivienda y alquileres en Uruguay',
    seoTitle: 'Videos sobre alquileres y comprar vivienda en Uruguay',
    seoDescription:
      'Videos sobre alquilar y comprar vivienda en Uruguay: precios, garantías, crédito hipotecario y el mercado inmobiliario. Se actualiza todos los días.',
    intro:
      'El alquiler es el gasto más grande de casi cualquier presupuesto uruguayo y la compra, la decisión más cara. Acá están los videos sobre precios, garantías, crédito hipotecario y el estado del mercado.',
    icon: 'mdi-home-city-outline',
    keywords: [
      'videos alquiler uruguay',
      'comprar casa uruguay video',
      'credito hipotecario uruguay youtube',
      'mercado inmobiliario uruguay video',
    ],
    related: [
      { to: '/alquilar-en-uruguay', label: 'Alquilar en Uruguay: la guía completa' },
      { to: '/comprar-o-alquilar-uruguay', label: '¿Comprar o alquilar?' },
      { to: '/por-que-no-baja-el-alquiler-uruguay', label: 'Por qué no baja el alquiler' },
    ],
  },
  {
    slug: 'criptomonedas-y-bitcoin',
    label: 'Criptomonedas',
    h1: 'Videos sobre criptomonedas en Uruguay',
    seoTitle: 'Videos sobre criptomonedas y bitcoin en Uruguay',
    seoDescription:
      'Videos sobre bitcoin, stablecoins y la regulación cripto en Uruguay. Actualizado a diario desde YouTube.',
    intro:
      'Cripto es donde más ruido hay por minuto de video. Listamos lo que se publicó, ordenado por fecha, y no recomendamos ninguna operación: si un video te promete un rendimiento fijo, eso solo no es una inversión regulada en Uruguay.',
    icon: 'mdi-bitcoin',
    keywords: [
      'videos bitcoin uruguay',
      'cripto uruguay youtube',
      'comprar bitcoin en uruguay video',
      'ley cripto uruguay',
    ],
    related: [
      { to: '/inversiones-uruguay', label: 'Invertir desde Uruguay' },
      { to: '/impuestos-inversiones-uruguay', label: 'Impuestos sobre inversiones' },
      { to: '/estafas-uruguay', label: 'Estafas financieras: cómo reconocerlas' },
    ],
  },
  {
    slug: 'importar-y-aduana',
    label: 'Importar y aduana',
    h1: 'Videos sobre importar y aduana en Uruguay',
    seoTitle: 'Videos sobre importar a Uruguay: courier, franquicia y aduana',
    seoDescription:
      'Videos sobre comprar en el exterior y traer paquetes a Uruguay: franquicia, courier, aduana y aranceles. Se actualiza todos los días.',
    intro:
      'Traer algo de afuera se volvió un tema de reglas, no de precios. Acá están los videos sobre franquicia, courier y aduana. La letra chica cambia seguido, así que el sitio mantiene las cifras al día en sus propias páginas.',
    icon: 'mdi-package-variant-closed',
    keywords: [
      'videos importar uruguay',
      'franquicia aduana uruguay video',
      'courier uruguay youtube',
      'comprar en temu uruguay video',
    ],
    related: [
      { to: '/franquicia-aduana-uruguay', label: 'La franquicia de aduana, al día' },
      { to: '/importar', label: 'Importar por categoría' },
      { to: '/couriers-uruguay', label: 'Couriers en Uruguay, comparados' },
      { to: '/herramientas/calculadora-impuestos-importacion', label: 'Cuánto vas a pagar' },
    ],
  },
  {
    slug: 'inversiones-y-bolsa',
    label: 'Inversiones',
    h1: 'Videos sobre inversiones en Uruguay',
    seoTitle: 'Videos sobre inversiones en Uruguay: bolsa, bonos y fondos',
    seoDescription:
      'Videos sobre cómo invertir desde Uruguay: bolsa, bonos, obligaciones negociables, fondos y brokers. Actualizado a diario desde YouTube.',
    intro:
      'Invertir desde Uruguay tiene reglas propias: qué se puede comprar acá, qué impuesto paga y quién está regulado por el BCU. Estos son los videos del tema; las cifras y el marco legal los tenés en las páginas del sitio.',
    icon: 'mdi-chart-areaspline',
    keywords: [
      'videos inversiones uruguay',
      'como invertir en uruguay youtube',
      'bolsa de valores uruguay video',
      'obligaciones negociables uruguay',
    ],
    related: [
      { to: '/inversiones-uruguay', label: 'Invertir desde Uruguay: la guía' },
      { to: '/impuestos-inversiones-uruguay', label: 'Qué impuesto paga cada inversión' },
      { to: '/invertir-en-proyectos-uruguayos', label: 'Proyectos uruguayos' },
      { to: '/herramientas/calculadora-plazo-fijo', label: 'Calculadora de plazo fijo' },
    ],
  },
  {
    slug: 'ahorro-y-finanzas-personales',
    label: 'Ahorro y finanzas personales',
    h1: 'Videos de finanzas personales para uruguayos',
    seoTitle: 'Videos de finanzas personales y ahorro en Uruguay',
    seoDescription:
      'Videos sobre ahorrar, armar un presupuesto y ordenar las cuentas, con foco en Uruguay. Se actualiza todos los días desde YouTube.',
    intro:
      'Educación financiera aplicada: presupuesto, fondo de emergencia, en qué moneda ahorrar y qué hacer con el sueldo el día 1. Buena parte del material de finanzas personales en español es de afuera — marcamos de dónde es cada canal para que sepas si la cuenta te sirve tal cual.',
    icon: 'mdi-piggy-bank-outline',
    keywords: [
      'videos finanzas personales uruguay',
      'como ahorrar en uruguay video',
      'educacion financiera uruguay youtube',
      'en que moneda ahorrar uruguay',
    ],
    related: [
      { to: '/salud-financiera', label: 'Salud financiera: el chequeo' },
      { to: '/preguntas-economia-personal', label: 'Preguntas de economía personal' },
      { to: '/cuenta-remunerada-uruguay', label: 'Cuentas que pagan por el saldo' },
      { to: '/apps-economia-uruguay', label: 'Apps de dinero en Uruguay' },
    ],
  },
  {
    slug: 'emprender-y-negocios',
    label: 'Emprender y negocios',
    h1: 'Videos sobre emprender y negocios en Uruguay',
    seoTitle: 'Videos sobre emprender y armar una empresa en Uruguay',
    seoDescription:
      'Videos sobre emprender en Uruguay: qué empresa abrir, facturar, costos e historias de negocios uruguayos. Actualizado a diario.',
    intro:
      'Qué forma jurídica conviene, cuánto cuesta estar formal y qué hacen los que ya arrancaron. Estos son los videos; la parte de números — costos por forma jurídica, cuándo conviene cada una — está en las páginas del sitio.',
    icon: 'mdi-rocket-launch-outline',
    keywords: [
      'videos emprender uruguay',
      'abrir una empresa en uruguay video',
      'pymes uruguay youtube',
      'negocios uruguay podcast',
    ],
    related: [
      { to: '/que-empresa-abrir-uruguay', label: 'Qué empresa abrir en Uruguay' },
      { to: '/facturar-en-monotributo-uruguay', label: 'Facturar en monotributo' },
      { to: '/contractor-en-uruguay', label: 'Trabajar como contractor' },
    ],
  },
  {
    slug: 'macroeconomia-y-bcu',
    label: 'Economía uruguaya',
    h1: 'Videos sobre la economía uruguaya',
    seoTitle: 'Videos sobre la economía uruguaya: PBI, BCU, déficit y política monetaria',
    seoDescription:
      'Videos sobre la macro uruguaya: PBI, déficit fiscal, deuda, decisiones del BCU y calificaciones. Se actualiza todos los días desde YouTube.',
    intro:
      'La foto grande: actividad, déficit, deuda y qué hace el Banco Central con la tasa. Es el tema donde más vale escuchar a dos personas que no coinciden, así que la lista mezcla medios y analistas en lugar de quedarse con uno.',
    icon: 'mdi-bank-outline',
    keywords: [
      'videos economia uruguaya',
      'analisis economico uruguay youtube',
      'bcu tasa de politica monetaria video',
      'pbi uruguay video',
      'deficit fiscal uruguay',
    ],
    related: [
      { to: '/economia-uruguay', label: 'La economía uruguaya, explicada' },
      { to: '/indicadores', label: 'Indicadores en vivo' },
      { to: '/por-que-el-bcu-quiere-mas-pesos', label: 'Por qué el BCU quiere más pesos' },
      { to: '/tendencias-uruguay', label: 'Lo que Uruguay busca hoy' },
    ],
  },
])

/** Every topic slug, in page order. */
export function videoTopicSlugs(): string[] {
  return VIDEO_TOPIC_PAGES.map(t => t.slug)
}

export function getVideoTopicPage(slug: string): VideoTopicPage | undefined {
  return VIDEO_TOPIC_PAGES.find(t => t.slug === slug)
}
