// Las formas del comparador de transporte (`/conviene-auto-moto-o-omnibus-uruguay`).
//
// El job publica INSUMOS, no veredictos: precios vivos, distancias y tiempos medidos, y la frecuencia
// del ómnibus. La aritmética de la comparación vive en `app/utils/transportModel.ts` y corre en el
// navegador, porque el visitante mueve controles y espera que los números cambien en el acto.
//
// Una consecuencia de eso, y conviene tenerla presente al tocar este archivo: agregar un campo acá no
// alcanza para que la página lo use, y sacar uno rompe una página que ya está publicada. El espejo
// del app (`app/server/models/TransportSnapshot.ts`) lo vigila `tests/appdb/schema_parity.test.ts`.

/** Los modos que compara la página. `pie` existe para trayectos cortos, donde es la respuesta real. */
export type TransportMode = "omnibus" | "pie" | "monopatin" | "bici" | "moto" | "auto";

export const TRANSPORT_MODES: readonly TransportMode[] = ["omnibus", "pie", "monopatin", "bici", "moto", "auto"];

/** Los modos que un ruteador sabe rutear. El ómnibus se resuelve con horarios, no con un ruteador. */
export type TransportRoutableMode = "auto" | "moto" | "bici" | "pie";

export const TRANSPORT_ROUTABLE_MODES: readonly TransportRoutableMode[] = ["auto", "moto", "bici", "pie"];

/** Una zona de la matriz: un barrio de Montevideo o una localidad del interior. */
export interface TransportZone {
  slug: string;
  name: string;
  department: string;
  lat: number;
  lon: number;
  /** `ine` para los 62 barrios de Montevideo, `localidad` para el resto. */
  kind: "ine" | "localidad";
}

/** Una ruta medida entre dos zonas para un modo. */
export interface TransportRoutePair {
  from: number;
  to: number;
  mode: TransportRoutableMode;
  meters: number;
  seconds: number;
}

/**
 * Un viaje en ómnibus entre dos zonas, armado con los horarios del STM.
 *
 * `waitMinutes` es media frecuencia acotada: si un ómnibus pasa cada 20 minutos, en promedio se
 * esperan 10, pero nadie planifica una espera de media hora — por encima del tope la gente consulta
 * el horario y sale a la hora, así que estimar media frecuencia ahí sería inventarle tiempo muerto.
 */
export interface TransportTransitPair {
  from: number;
  to: number;
  walkMinutes: number;
  waitMinutes: number;
  inVehicleMinutes: number;
  transfers: number;
  /** Las líneas que sirven el par, para poder mostrar de dónde salió el número. */
  lines: string[];
  /** Kilómetros del recorrido del ómnibus, no en línea recta. */
  meters: number;
}

/** Precio de compra de un modo, tal como lo publica su propio catálogo. */
export interface TransportVehiclePrice {
  /**
   * El precio con el que la página arranca, y NO la mediana del catálogo.
   *
   * Es el p25 para los modos que se compran usados (auto, moto): la mediana del catálogo de autos
   * usados no es "lo que sale un auto para ir a trabajar" —ese catálogo incluye camionetas de
   * US$ 40.000 y quien evalúa dejar el ómnibus no está mirando esas—, así que anclar ahí decidiría
   * la respuesta de la página sin que el visitante lo sepa. Para monopatín y bici, donde el catálogo
   * es de vehículos comparables entre sí, la referencia ES la mediana.
   *
   * Se llama `referenceUyu` y no `medianUyu` porque el campo tiene que decir lo que guarda: la
   * primera versión se llamaba así y guardaba el p25, que es la clase de nombre que engaña al que
   * lee el contrato seis meses después. La banda completa viaja al lado, en `p25Uyu`/`p75Uyu`.
   */
  referenceUyu: number;
  p25Uyu: number | null;
  p75Uyu: number | null;
  condition: "nuevo" | "usado";
  offers: number;
  asOf: string | null;
  /** Caída anual medida sobre el propio catálogo; `null` cuando el catálogo no da para medirla. */
  measuredAnnualDepreciation: number | null;
  /** Qué colección lo publicó: `movilidaditems`, `carcatalog`, `motocatalog`. */
  source: string;
}

export interface TransportPrices {
  usdUyu: number;
  busFareUyu: number;
  busTransferWindowMin: number;
  busMonthlyPassUyu: number | null;
  naftaSuper95PerLitreUyu: number;
  gasoilPerLitreUyu: number;
  kwhUyu: number;
  vehiclePriceUyu: Partial<Record<TransportMode, TransportVehiclePrice>>;
  financingTea: number | null;
  usuryCapTea: number | null;
  /** Qué fuente dio cada número, para que la página pueda citarla. */
  sources: Record<string, { label: string; asOf: string | null }>;
}

export interface TransportCoverage {
  zones: number;
  routedPairs: number;
  transitPairs: number;
  /** Cuándo se ruteó la matriz por última vez (puede ser más vieja que los precios). */
  matrixBuiltAt: string | null;
  /** Qué ruteador la armó. */
  router: string | null;
  /** Días desde la última descarga de los horarios del STM. */
  transitAgeDays: number | null;
  notes: string[];
}

export interface TransportSnapshot {
  slug: string;
  builtAt: Date;
  prices: TransportPrices;
  zones: TransportZone[];
  /** Pares ruteados, aplanados: `[from, to, modeIndex, meters, seconds]`. */
  routes: number[][];
  transit: TransportTransitPair[];
  coverage: TransportCoverage;
}

/** El orden de `TRANSPORT_ROUTABLE_MODES` es el índice que viaja aplanado en `routes`. */
export function transportModeIndex(mode: TransportRoutableMode): number {
  return TRANSPORT_ROUTABLE_MODES.indexOf(mode);
}

export function transportModeFromIndex(index: number): TransportRoutableMode | null {
  return TRANSPORT_ROUTABLE_MODES[index] ?? null;
}
