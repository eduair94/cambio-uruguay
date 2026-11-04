// La ficha técnica de un monopatín o una bicicleta eléctrica, tal como la DECLARA quien lo vende.
//
// Ningún campo es una medición nuestra: es lo que dice la tabla de la ficha de Mercado Libre, el
// texto de la tienda o, en último caso, el título. Por eso cada campo lleva su procedencia en
// `from` y un valor que no puede ser el de un monopatín (un "Largo = 100 m", un peso de 260 kg)
// queda en `null` en vez de corregirse: el error del vendedor no se adivina.

export type SpecSource = "ficha" | "descripcion" | "titulo";

export interface MonopatinSpecs {
  /** Autonomía declarada por carga, km. Con un rango ("20–25 km"), el extremo bajo. */
  rangeKm: number | null;
  /** Velocidad máxima declarada, km/h. */
  maxSpeedKmh: number | null;
  /** Potencia del motor (nominal o la única que se declara), W. */
  motorW: number | null;
  /** Potencia máxima o pico, sólo cuando se declara como tal, W. */
  motorPeakW: number | null;
  batteryV: number | null;
  batteryAh: number | null;
  /** Declarada o V × Ah. */
  batteryWh: number | null;
  /** Tiempo de carga completa, horas. Con un rango, el extremo alto. */
  chargeHours: number | null;
  /** Peso máximo que soporta, kg. Con un rango, el extremo bajo. */
  maxLoadKg: number | null;
  /** Peso del monopatín, kg. Con un rango, el extremo alto. */
  weightKg: number | null;
  wheelInches: number | null;
  minAge: number | null;
  foldable: boolean | null;
  suspension: boolean | null;
  discBrake: boolean | null;
  bluetooth: boolean | null;
  /** El texto del sistema de frenos tal como lo escribe la ficha. */
  brakes: string | null;
  /** "IPX5", "IP54". */
  ipRating: string | null;
  // Sólo bicicleta (`profiles.ts`): en un monopatín quedan siempre en null.
  /** Cantidad de cambios ("Shimano 7 velocidades", "21 Vel"). */
  gears: number | null;
  /** La batería se saca para cargarla adentro (la ficha de ML: "Con batería removible"). */
  removableBattery: boolean | null;
  /** Tiene acelerador de puño además del pedaleo asistido ("Con acelerador independiente"). */
  throttle: boolean | null;
  /** Motor central (en el eje del pedalier: Bosch, Bafang M, Shimano Steps), no en la rueda. */
  centralMotor: boolean | null;
  from: Partial<Record<SpecField, SpecSource>>;
}

/** El mismo tipo con el nombre de la familia: una bicicleta declara la misma ficha, más cuatro campos. */
export type MovilidadSpecs = MonopatinSpecs;

export type SpecField = Exclude<keyof MonopatinSpecs, "from">;

export type NumericSpecField =
  | "rangeKm"
  | "maxSpeedKmh"
  | "motorW"
  | "motorPeakW"
  | "batteryV"
  | "batteryAh"
  | "batteryWh"
  | "chargeHours"
  | "maxLoadKg"
  | "weightKg"
  | "wheelInches"
  | "minAge"
  | "gears";

export type BooleanSpecField =
  | "foldable"
  | "suspension"
  | "discBrake"
  | "bluetooth"
  | "removableBattery"
  | "throttle"
  | "centralMotor";

export const SPEC_FIELDS: readonly SpecField[] = [
  "rangeKm",
  "maxSpeedKmh",
  "motorW",
  "motorPeakW",
  "batteryV",
  "batteryAh",
  "batteryWh",
  "chargeHours",
  "maxLoadKg",
  "weightKg",
  "wheelInches",
  "minAge",
  "foldable",
  "suspension",
  "discBrake",
  "bluetooth",
  "brakes",
  "ipRating",
  "gears",
  "removableBattery",
  "throttle",
  "centralMotor",
];

/**
 * Lo que un monopatín puede declarar. Afuera de esto no hay un monopatín sino un error de carga
 * (medido el 2026-11-03: "Largo = 100 m" en una ficha de ML de un monopatín infantil).
 */
export const SPEC_BANDS: Readonly<Record<NumericSpecField, readonly [number, number]>> = {
  rangeKm: [3, 150],
  maxSpeedKmh: [5, 100],
  motorW: [100, 8000],
  motorPeakW: [100, 15000],
  batteryV: [12, 84],
  batteryAh: [1, 60],
  batteryWh: [50, 4000],
  chargeHours: [1, 24],
  maxLoadKg: [30, 200],
  weightKg: [3, 80],
  wheelInches: [5, 14],
  minAge: [3, 18],
  gears: [1, 30],
};

/**
 * Lo que una bicicleta eléctrica puede declarar. Cambia lo que separa a las dos: el rodado (12″ una
 * de equilibrio, 29″ una de montaña, contra 5–14″ de un monopatín), el peso del aparato y la potencia
 * (una bici de 3.000 W ya es una moto). Medido el 4/11/2026 en las fichas de ML de 8 bicis: rodado
 * 14–27,5, 21–30 kg, 250–500 W, 25–35 km/h, 120–150 kg soportados.
 */
export const BICICLETA_SPEC_BANDS: Readonly<Record<NumericSpecField, readonly [number, number]>> = {
  ...SPEC_BANDS,
  rangeKm: [5, 200],
  maxSpeedKmh: [6, 60],
  motorW: [100, 3000],
  motorPeakW: [100, 5000],
  maxLoadKg: [40, 250],
  weightKg: [8, 60],
  wheelInches: [12, 29],
};
