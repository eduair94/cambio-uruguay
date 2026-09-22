// Cuánto vale un clic, por familia de página. Funciones puras, sin I/O.
//
// LA IDEA, EN UNA LÍNEA: el RPM de este sitio varía por un factor de trescientos entre familias, así
// que "clics" no es una unidad con la que se pueda priorizar trabajo.
//
// Medido el 2026-09-16 sobre GA4 3–15/9 (ventana chica, patrón consistente): las guías de plata,
// vivienda, deudas e importación rinden un orden de magnitud más por vista que la portada o los
// históricos, y dos órdenes más que los directorios de producto. Mil visitas a una guía de
// préstamos pagan lo que pagarían cientos de miles a la portada de alquileres.
//
// LAS CIFRAS NO VAN ACÁ. Convención del repo (ver `docs/seo/adsense-growth-loop.md`): este
// repositorio es PÚBLICO, así que los montos medidos viven sólo en `docs/seo/data/` (gitignored) y
// en el snapshot privado. Acá quedan las RAZONES y los multiplicadores relativos, que es lo que
// hace falta para leer el código.
//
// DE DÓNDE SALE EL PRECIO DE CADA FAMILIA, EN ORDEN:
//   1. Si la familia tiene muestra propia suficiente en la ventana de ingreso, su RPM MEDIDO manda.
//      Es el caso bueno y con el tiempo debería ser el único.
//   2. Si no, hereda el multiplicador de su TRAMO sobre el RPM del sitio. Un multiplicador, no un
//      RPM absoluto: la cifra absoluta envejece en cuanto el sitio factura otra cosa, la forma no.
//      Ver [[cifra-vieja-pasa-la-banda-de-plausibilidad]] — un número correcto en su momento
//      publicado como vigente es el error recurrente de este repo.
//   3. Si una familia no está en ninguna lista, vale 1× (el promedio del sitio) y aparece en una
//      alerta para que alguien la clasifique. NUNCA se le inventa un multiplicador alto: una página
//      nueva que todavía no se midió no puede encabezar la cola por una suposición.
//
// Y el tramo se AUDITA solo: cuando una familia sí tiene medición, el snapshot publica su
// multiplicador medido al lado del que el tramo asume, y si se separan por más de `TIER_DRIFT` sale
// una alerta. La tabla de abajo es una hipótesis con fecha, no una constante.
import { bucketOf } from "../gsc/opportunities";
import type { RevenueSnapshot } from "../site-analytics/revenue";
import type { FamilyValue, ValueBasis } from "./types";

// ---------------------------------------------------------------------------------------------
// Pisos de muestra
// ---------------------------------------------------------------------------------------------

/**
 * Vistas que necesita una familia en la ventana de 28 días para que su RPM se use como medición.
 *
 * El sitio hace del orden de 450 vistas por día, o sea ~12.600 en la ventana. 500 vistas es ~4 % de
 * eso: por debajo, el RPM de la familia lo decide un puñado de impresiones y basta un lector que
 * llegue con el bloqueador apagado para duplicarlo.
 */
export const MIN_FAMILY_VIEWS = 500;

/** Impresiones de anuncio mínimas. Mismo espíritu que `MIN_AD_IMPRESSIONS` en site-analytics. */
export const MIN_FAMILY_AD_IMPRESSIONS = 100;

/**
 * Ingreso del sitio en la ventana por debajo del cual TODA medición por familia es provisional.
 *
 * Con el ingreso diario que tenía el sitio cuando esto se escribió, 28 días repartidos entre veinte
 * familias dejan a la que más factura con centavos, y su RPM con el intervalo de confianza de una
 * moneda al aire. El plan igual
 * sirve —el orden lo da el multiplicador, no el peso— pero la pantalla tiene que decirlo.
 */
export const PROVISIONAL_REVENUE_USD = 10;

/** Separación entre el multiplicador medido y el del tramo a partir de la cual el tramo miente. */
export const TIER_DRIFT = 3;

/**
 * Cuántas veces tiene que superar el RPM sólo-Uruguay al RPM del sitio para que el plan avise de
 * vistas que no ven anuncios.
 *
 * Las dos lecturas comparten numerador (la plata la deja quien ve anuncios, y eso pasa casi todo
 * en Uruguay) y difieren en el DENOMINADOR: el del sitio suma también las vistas automatizadas que
 * no cargan ni una unidad. Con audiencia real, las dos cifras se separan por lo que pesa el
 * tráfico del exterior — decenas por ciento, no un múltiplo. 1,5× queda por encima de esa
 * diferencia legítima y muy por debajo de lo que produce un pico de robots, que multiplica el
 * denominador por varias veces. Es una alerta, no un filtro: nada se excluye por esto
 * (`docs/seo/adsense-growth-loop.md`: «No bloquear países por suposición»).
 */
export const UY_RPM_DIVERGENCE = 1.5;

// ---------------------------------------------------------------------------------------------
// Los tramos
// ---------------------------------------------------------------------------------------------

export interface Tier {
  name: string;
  multiplier: number;
  why: string;
}

/**
 * Contenido largo: guías, notas, explicativos, páginas de problema.
 *
 * 8× y no el ~25× que daría la mejor guía medida contra el promedio del sitio:
 * esta lista tiene que sobrevivir a que la revisen en noventa días, y el extremo de una muestra de
 * doce días no es el valor esperado de la familia. Además admiten dos unidades de anuncio contra
 * una de las páginas de cotización (`utils/ads.ts`), que es media razón por la que rinden más.
 */
export const TIER_CONTENIDO: Tier = {
  name: "contenido",
  multiplier: 8,
  why: "guías y páginas de problema: un orden de magnitud sobre el promedio del sitio (medido 2026-09-16)",
};

/**
 * Páginas con un dato en vivo: cotizaciones, conversores, históricos, fichas de casa y sucursal.
 *
 * 1×, o sea el promedio del sitio. Los históricos midieron algo por encima de ese promedio y la
 * portada algo por debajo; el promedio de su propio tramo es la respuesta menos comprometida. Ojo: esta familia es la que más IMPRESIONES
 * tiene y la que menos clic gana, y buena parte de su demanda está en el pozo de cero clic que el
 * pipeline de Search Console ya excluye antes.
 */
export const TIER_DATO_VIVO: Tier = {
  name: "dato-vivo",
  multiplier: 1,
  why: "cotización, conversor, histórico, sucursal: alrededor del promedio del sitio, y una sola unidad de anuncio",
};

/**
 * Directorios de producto: alquileres, autos, tiendas, celulares, equipar, oportunidades.
 *
 * 0,2×. `/alquileres` midió 0,09× el promedio del sitio y `/oportunidades` 0,18×. Son las
 * páginas más caras de producir de todo el repo y las que menos pagan por vista — lo cual no es un
 * argumento para apagarlas (traen enlaces, marca y lectores que después leen otra cosa), sino para
 * no gastar el próximo turno de trabajo de SEO en ellas creyendo que es donde está la plata.
 */
export const TIER_DIRECTORIO: Tier = {
  name: "directorio",
  multiplier: 0.2,
  why: "directorios de producto: una fracción del promedio del sitio (medido 2026-09-16)",
};

/** Lo que todavía no se clasificó. Vale el promedio y sale en una alerta. */
export const TIER_OTRO: Tier = {
  name: "otro",
  multiplier: 1,
  why: "sin clasificar: vale el promedio del sitio hasta que alguien la ubique o junte muestra propia",
};

/** Familias de `bucketOf` que son contenido largo. */
const CONTENIDO_BUCKETS = new Set([
  "/guias/*",
  "/blog/*",
  "/importar/*",
  "/temas/*",
  "/newsletter/*",
  "/glosario/*",
  "/comparativas/*",
  "/descuentos/*",
]);

/** Familias de `bucketOf` con un dato en vivo. */
const DATO_VIVO_BUCKETS = new Set([
  "/",
  "/historico/*",
  "/historico",
  "/casa/*",
  "/casa",
  "/sucursal/*",
  "/sucursales/*",
  "/sucursales",
  "/cotizacion/*",
  "/cotizacion",
  "/dolar/*",
  "/dolar",
  "/convertir/*",
  "/casas-de-cambio/*",
  "/casas-de-cambio",
  "/indicadores/*",
  "/herramientas/*",
]);

/**
 * Rutas sueltas que son directorios de producto.
 *
 * `bucketOf` sólo pliega las familias que se abren en muchas URLs; un directorio vive en UNA ruta y
 * por eso conserva su path entero. La lista es explícita a propósito: `/alquileres-uruguay` y
 * `/plan-de-vida-uruguay` terminan igual y son tramos opuestos, así que no hay heurística de sufijo
 * que sirva. Se agrega a mano cuando nace un directorio, y mientras tanto la alerta de sin
 * clasificar lo señala.
 */
const DIRECTORIO_PATHS = new Set([
  "/alquileres-uruguay",
  "/venta-viviendas-uruguay",
  "/oportunidades-inmobiliarias-uruguay",
  "/autos-usados-uruguay",
  "/oportunidades-autos-usados-uruguay",
  "/mercado-de-autos-usados-uruguay",
  "/autos-chocados-y-con-deuda-uruguay",
  "/celulares-uruguay",
  "/equipar-casa-uruguay",
  "/monopatines-electricos-uruguay",
  "/bicicletas-electricas-uruguay",
  "/tiendas-online-uruguay",
  "/sillas-de-escritorio-uruguay",
  "/ciberlunes-y-black-friday-uruguay",
  "/directorios-uruguay",
  "/alquileres",
  "/oportunidades",
]);

/** Prefijos de ruta suelta que son directorios (las secciones que cuelgan de uno). */
const DIRECTORIO_PREFIXES = ["/alquileres/", "/alquiler-", "/autos/", "/celulares/", "/equipar/", "/tiendas/"];

/**
 * Páginas de problema sueltas: una guía que se ganó su propia ruta en vez de vivir en `/guias/*`.
 *
 * Se agregan a mano y la alerta `unclassified-families` es la que las va encontrando: lista las
 * familias con tráfico que todavía valen 1× por no estar clasificadas. Estas ocho salieron de la
 * primera corrida real contra producción (2026-09-20), y las ocho eran contenido.
 */
const CONTENIDO_PATHS = new Set([
  "/tarjetas-de-credito-uruguay",
  "/mejores-bancos-uruguay",
  "/inversiones-uruguay",
  "/comisiones-de-transferencia-uruguay",
  "/alquilar-estando-en-clearing",
  "/denunciar-ruidos-molestos-uruguay",
  "/trabajo-para-menores-de-edad-uruguay",
  "/sala-vip-aeropuerto-uruguay",
  "/comprar-auto-con-deuda-uruguay",
  "/multas-de-transito-y-patente-uruguay",
]);

export function tierOf(bucket: string): Tier {
  if (CONTENIDO_BUCKETS.has(bucket) || CONTENIDO_PATHS.has(bucket)) return TIER_CONTENIDO;
  if (DATO_VIVO_BUCKETS.has(bucket)) return TIER_DATO_VIVO;
  if (DIRECTORIO_PATHS.has(bucket)) return TIER_DIRECTORIO;
  if (DIRECTORIO_PREFIXES.some((p) => bucket.startsWith(p))) return TIER_DIRECTORIO;
  // Los espejos en inglés y portugués heredan el tramo de la sección que replican, que es lo que
  // `bucketOf` deja en el segundo segmento. Hay que probar las DOS formas: `/en/guias/*` replica la
  // familia `/guias/*`, pero `/en/alquileres-uruguay/*` replica la ruta suelta
  // `/alquileres-uruguay` — medido contra producción el 2026-09-20, esa segunda forma caía en
  // "otro" y un directorio quedaba valuado 5 veces por encima de su tramo.
  const mirror = /^\/(?:en|pt)\/([^/]+)/.exec(bucket);
  if (mirror) {
    const asFamily = tierOf(`/${mirror[1]}/*`);
    if (asFamily !== TIER_OTRO) return asFamily;
    const asPath = tierOf(`/${mirror[1]}`);
    if (asPath !== TIER_OTRO) return asPath;
  }
  // La portada de cada espejo es una portada.
  if (bucket === "/en" || bucket === "/pt") return TIER_DATO_VIVO;
  return TIER_OTRO;
}

// ---------------------------------------------------------------------------------------------
// El precio
// ---------------------------------------------------------------------------------------------

const rpmToUsdPerClick = (rpm: number) => rpm / 1000;

export interface ValueTable {
  /** RPM del sitio entero en la ventana de ingreso. */
  siteRpm: number;
  /**
   * RPM sólo sobre visitas desde Uruguay (`totalsUy` del snapshot). Lectura resistente al tráfico
   * automatizado. NO ancla ningún multiplicador ni ordena nada: se publica al lado de `siteRpm` y
   * alimenta la alerta `views-without-impressions`. 0 cuando el snapshot es anterior al campo.
   */
  siteRpmUy: number;
  /** Porción de las vistas del sitio que vinieron de Uruguay, 0..1. Diagnóstico. */
  uyShareOfViews: number;
  /** Impresiones de anuncio por vista de página del sitio entero. Diagnóstico. */
  impressionsPerView: number;
  /** Vistas y impresiones del recorte uruguayo, para que la alerta exija muestra antes de hablar. */
  uyViews: number;
  uyAdImpressions: number;
  /** USD de un clic promedio del sitio. */
  siteUsdPerClick: number;
  /** True mientras el ingreso medido no alcance para llamar medición a nada. */
  provisional: boolean;
  byBucket: Map<string, FamilyValue>;
}

function blank(bucket: string, siteRpm: number): FamilyValue {
  const tier = tierOf(bucket);
  const basis: ValueBasis = siteRpm > 0 ? "tramo" : "sin-datos";
  return {
    bucket,
    usdPerClick: rpmToUsdPerClick(siteRpm * tier.multiplier),
    multiplier: tier.multiplier,
    basis,
    measuredRpm: 0,
    views: 0,
    adImpressions: 0,
    adRevenue: 0,
    measuredMultiplier: 0,
    tierMultiplier: tier.multiplier,
    tier: tier.name,
  };
}

/**
 * Arma la tabla de precios a partir del snapshot de ingreso.
 *
 * `revenue` puede ser `null` (el job de GA4 todavía no corrió) o `pending` (el enlace AdSense↔GA4
 * contesta ceros). En los dos casos la tabla se construye igual con los tramos, porque el ORDEN de
 * la cola no depende de que haya plata medida — depende de que unas páginas valgan más que otras,
 * que es cierto con el ingreso de hoy y con el de la meta.
 */
export function buildValueTable(revenue: RevenueSnapshot | null): ValueTable {
  const measured = revenue && !revenue.pending;
  const siteRpm = measured ? revenue!.totals.rpm : 0;
  // Misma compuerta que `siteRpm`: un snapshot pendiente no tiene lectura uruguaya que valga más
  // que la del sitio. `totalsUy` es opcional de facto (documentos anteriores al 2026-09-22).
  const uy = measured ? revenue!.totalsUy : undefined;
  const siteViews = measured ? revenue!.totals.screenPageViews : 0;
  const table: ValueTable = {
    siteRpm,
    siteRpmUy: uy?.rpm ?? 0,
    uyShareOfViews: siteViews > 0 ? (uy?.screenPageViews ?? 0) / siteViews : 0,
    impressionsPerView: siteViews > 0 ? revenue!.totals.adImpressions / siteViews : 0,
    uyViews: uy?.screenPageViews ?? 0,
    uyAdImpressions: uy?.adImpressions ?? 0,
    siteUsdPerClick: rpmToUsdPerClick(siteRpm),
    provisional: !measured || revenue!.totals.adRevenue < PROVISIONAL_REVENUE_USD,
    byBucket: new Map(),
  };

  for (const family of revenue?.families || []) {
    const tier = tierOf(family.bucket);
    const enough =
      measured && family.screenPageViews >= MIN_FAMILY_VIEWS && family.adImpressions >= MIN_FAMILY_AD_IMPRESSIONS;
    const measuredMultiplier = siteRpm > 0 ? family.rpm / siteRpm : 0;
    const multiplier = enough ? measuredMultiplier : tier.multiplier;
    table.byBucket.set(family.bucket, {
      bucket: family.bucket,
      usdPerClick: rpmToUsdPerClick(enough ? family.rpm : siteRpm * tier.multiplier),
      multiplier,
      basis: enough ? "medido" : siteRpm > 0 ? "tramo" : "sin-datos",
      measuredRpm: family.rpm,
      views: family.screenPageViews,
      adImpressions: family.adImpressions,
      adRevenue: family.adRevenue,
      measuredMultiplier,
      tierMultiplier: tier.multiplier,
      tier: tier.name,
    });
  }
  return table;
}

/** El precio de una familia, inventando la fila por tramo si GA4 nunca la vio. */
export function valueOf(table: ValueTable, bucket: string | null): FamilyValue {
  if (!bucket) {
    // Sin URL atribuida no hay familia: vale el promedio del sitio, ni premio ni castigo.
    return { ...blank("", table.siteRpm), tier: "sin-atribuir", tierMultiplier: 1, multiplier: 1 };
  }
  return table.byBucket.get(bucket) || blank(bucket, table.siteRpm);
}

/** La familia de una URL, con el mismo criterio que usan los otros dos pipelines. */
export function bucketOfUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  return bucketOf(url);
}
