// La ficha técnica de un monopatín eléctrico, tal como la DECLARA quien lo vende.
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
  from: Partial<Record<SpecField, SpecSource>>;
}

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
  | "minAge";

export type BooleanSpecField = "foldable" | "suspension" | "discBrake" | "bluetooth";

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
};
