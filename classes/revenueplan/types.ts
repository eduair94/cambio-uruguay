// Forma del plan de ingreso: qué trabajo de tráfico paga, medido en plata y no en clics.
//
// POR QUÉ EXISTE ESTE ARCHIVO Y NO UN CAMPO MÁS EN EL TABLERO DE SEARCH CONSOLE. El pipeline de
// `currency-gsc` ordena las oportunidades por `potentialClicks`, y el de `currency-site-analytics`
// mide el RPM por FAMILIA de página usando a propósito el MISMO `bucketOf` "para que las dos tablas
// se puedan cruzar fila a fila". Nadie las cruzaba. Mientras tanto la medición del 2026-09-16 dice
// que el rendimiento por vista va de 0,02 USD/1.000 en `/alquileres` a 6,1 USD/1.000 en una guía de
// préstamos: un factor de trescientos. Una cola ordenada por clics, sobre un sitio con ese spread,
// no está ordenada — manda a trabajar donde hay impresiones, que es exactamente donde el clic no
// vale nada.
//
// Este módulo hace una sola cosa y la hace con aritmética explícita: le pone precio a cada clic
// según la familia de la página que lo recibiría, y reordena. No publica nada, no escribe páginas,
// no toca los catálogos: escribe UN documento privado que lee una persona.

/** Cuánta confianza merece el precio del clic de una familia. */
export type ValueBasis =
  /** RPM medido de la propia familia, con muestra suficiente. */
  | "medido"
  /** RPM del sitio × el multiplicador de su tramo: la familia no tiene muestra propia todavía. */
  | "tramo"
  /** Ni familia ni sitio tienen muestra: el precio es 0 y la fila sólo ordena por clics. */
  | "sin-datos";

export interface FamilyValue {
  /** `/guias/*`, `/convertir/*`, `/` … el mismo `bucketOf` del pipeline de Search Console. */
  bucket: string;
  /** USD que deja un clic adicional que aterriza en esta familia. */
  usdPerClick: number;
  /**
   * Cuántas veces más (o menos) que un clic promedio del sitio vale un clic acá.
   *
   * Es el número que ORDENA la cola, y existe aparte de `usdPerClick` por una razón operativa: el
   * enlace AdSense↔GA4 es de 2026-09-02 y el sitio factura centavos, así que `usdPerClick` puede
   * ser 0 durante días enteros sin que eso signifique que todas las familias valen lo mismo. El
   * multiplicador sobrevive a eso y además envejece bien: cuando el ingreso se multiplique por
   * diez, la forma de la tabla sigue siendo la misma y los cortes no hay que retocarlos.
   */
  multiplier: number;
  /** De dónde salió el número. */
  basis: ValueBasis;
  /** RPM medido de la familia (USD por 1.000 vistas), 0 si no hay muestra. */
  measuredRpm: number;
  /** Vistas de página de la familia en la ventana de ingreso. */
  views: number;
  /** Impresiones de anuncio de la familia en esa ventana. */
  adImpressions: number;
  /** Ingreso atribuido a la familia en esa ventana. */
  adRevenue: number;
  /** `measuredRpm / rpm del sitio`. 0 cuando no hay medida. Es la cifra que envejece bien. */
  measuredMultiplier: number;
  /** El multiplicador que el tramo asume. Publicado al lado del medido para que la deriva se vea. */
  tierMultiplier: number;
  /** Nombre del tramo (`contenido`, `directorio`, `dato-vivo`…). */
  tier: string;
}

/** Una oportunidad de Search Console, ya con precio. */
export interface PricedAction {
  /** Del snapshot de Search Console, sin cambios. */
  kind: string;
  subject: string;
  note: string;
  impressions: number;
  clicks: number;
  position: number;
  /** Clics por 28 días que el arreglo agregaría, según el pipeline de Search Console. */
  potentialClicks: number;
  /** La URL a la que se atribuye el trabajo (la que más impresiones tiene para esa consulta). */
  url: string | null;
  /** Familia de esa URL. `null` cuando Search Console no supo atribuir ninguna. */
  bucket: string | null;
  usdPerClick: number;
  basis: ValueBasis;
  /** `potentialClicks × usdPerClick`. USD por 28 días. Estimado, nunca observado. */
  expectedUsd: number;
  /**
   * `potentialClicks × multiplier`: los clics de esta oportunidad expresados en clics promedio del
   * sitio. Es lo que ordena la cola, porque es proporcional a `expectedUsd` y sigue existiendo
   * cuando el ingreso medido todavía es cero.
   */
  weightedClicks: number;
  /** Puesto que la fila tenía cuando la cola se ordenaba por clics. Para ver el reordenamiento. */
  rankByClicks: number;
}

/** Una familia con las dos mitades de la pregunta: cuánto tráfico trae y cuánta plata deja. */
export interface FamilyLedgerRow extends FamilyValue {
  /** Clics orgánicos de la familia en la ventana de Search Console. */
  searchClicks: number;
  searchImpressions: number;
  /** Porción de las vistas del sitio, 0..1. */
  shareOfViews: number;
  /** Porción del ingreso del sitio, 0..1. */
  shareOfRevenue: number;
  /**
   * `shareOfRevenue - shareOfViews`. Negativo = la familia consume tráfico y no lo paga; positivo =
   * paga más de lo que consume. Es la tabla que dice hacia dónde conviene mover un lector.
   */
  gap: number;
}

/** Un cambio que se publicó, con su ventana de medición. */
export interface ExperimentSpec {
  id: string;
  /** `YYYY-MM-DD` del despliegue. */
  shippedOn: string;
  /** Rutas afectadas. Prefijos: `/guias/` toma toda la familia. */
  routes: string[];
  /** Consultas afectadas, si el cambio apuntaba a consultas y no a rutas. */
  queries?: string[];
  /** Qué se esperaba que pasara, en una línea. */
  hypothesis: string;
}

export type ExperimentVerdict = "esperando" | "mejoró" | "sin cambio" | "empeoró" | "sin datos";

export interface ExperimentResult extends ExperimentSpec {
  verdict: ExperimentVerdict;
  /** Días de la ventana posterior que ya están en el archivo. */
  daysAfter: number;
  /** Días que faltan para que la ventana cierre. */
  daysMissing: number;
  before: { clicks: number; impressions: number; days: number };
  after: { clicks: number; impressions: number; days: number };
  /** Clics del sitio entero en las mismas dos ventanas — el denominador que hace honesto el antes/después. */
  siteBefore: { clicks: number; impressions: number };
  siteAfter: { clicks: number; impressions: number };
  /**
   * Cuánto se movió el sujeto DESCONTANDO cómo se movió el sitio.
   * `(after/before) / (siteAfter/siteBefore)`. 1 = se movió igual que el sitio, o sea nada.
   */
  relativeLift: number | null;
  note: string;
}

export interface RevenuePlanAlert {
  level: "info" | "warn" | "critical";
  code: string;
  message: string;
}

export interface RevenuePlanSnapshot {
  key: string;
  /** `YYYY-MM-DD` de la corrida. */
  asOf: string;
  /** Ventana de Search Console de la que salieron las oportunidades. */
  searchWindow: { startDate: string; endDate: string };
  /** Ventana de ingreso de la que salió el precio del clic. */
  revenueWindow: { start: string; end: string };
  currency: string;
  /** RPM del sitio entero en la ventana de ingreso. El ancla de todos los multiplicadores. */
  siteRpm: number;
  /** USD que deja un clic promedio del sitio. */
  siteUsdPerClick: number;
  /** True mientras el enlace AdSense↔GA4 no devuelva una medición. Todo lo de abajo queda en tramos. */
  revenuePending: boolean;
  /** Cuánto dejaría de ingreso ejecutar TODO lo que sigue. Suma de estimaciones, no una promesa. */
  totalUpsideUsd: number;
  /** Lo mismo que la cola de Search Console, reordenado por plata. */
  actions: PricedAction[];
  /** Ingreso en riesgo: páginas y consultas que YA pagaban y están perdiendo clics. */
  defend: PricedAction[];
  families: FamilyLedgerRow[];
  experiments: ExperimentResult[];
  alerts: RevenuePlanAlert[];
}

export const REVENUE_PLAN_KEY = "revenue_plan";
