// Los campos de ficha técnica que se leen de cada categoría de equipar con ficha, y cómo.
//
// Medido el 4/11/2026 en las fichas de Mercado Libre (puente `/product/<id>`) de 12 avisos de las
// cuatro categorías: los rótulos son regulares ("Capacidad total", "Tipo de deshielo", "Tamaño de la
// pantalla", "Capacidad de refrigeración") y los valores vienen con su unidad y en formato uruguayo
// ("1.400 rpm", "12.000 BTU", "3.754,14 BTU", "54.5 cm x 56 cm x 1.67 m"). Lo que la ficha dice gana
// sobre el título; un valor fuera de banda queda vacío en vez de corregirse (un portátil titulado
// "12000 Btu" declara 4.095 en la ficha, y es la ficha la que dice la verdad).
//
// Espejo de lectura en el app: `app/utils/equiparFicha.ts` (paridad de claves en
// `app/tests/unit/equiparFicha.test.ts`, «paridad con el backend»).

export const EQUIPAR_FICHA_CATEGORIES = ["heladera", "lavarropas", "tv", "aire-acondicionado"] as const;
export type EquiparFichaCategory = (typeof EQUIPAR_FICHA_CATEGORIES)[number];

export const isEquiparFichaCategory = (value: unknown): value is EquiparFichaCategory =>
  typeof value === "string" && (EQUIPAR_FICHA_CATEGORIES as readonly string[]).includes(value);

export type FichaValue = number | boolean | string | null;
/**
 * `descartado`: la ficha declaró el dato pero fuera de banda. Queda vacío y el título no lo completa:
 * un portátil cuya ficha dice "3.754,14 BTU" y cuyo título dice "12000 Btu" no tiene 12.000.
 */
export type FichaSource = "ficha" | "titulo" | "descartado";

/** La ficha de un aviso de equipar: valores por campo y de dónde salió cada uno. */
export interface EquiparFicha {
  values: Record<string, FichaValue>;
  from: Record<string, FichaSource>;
}

export type FieldKind = "number" | "boolean" | "enum";

export interface FichaField {
  key: string;
  kind: FieldKind;
  /** Banda de cordura de un número: afuera, el campo queda vacío. */
  band?: readonly [number, number];
}

/** Los campos de cada categoría. El orden es el de la franja y la ficha en la página. */
export const EQUIPAR_FICHA_FIELDS: Readonly<Record<EquiparFichaCategory, readonly FichaField[]>> = {
  heladera: [
    { key: "capacidadL", kind: "number", band: [30, 1000] },
    { key: "freezerL", kind: "number", band: [5, 500] },
    { key: "noFrost", kind: "boolean" },
    { key: "inverter", kind: "boolean" },
    { key: "puertas", kind: "number", band: [1, 6] },
    { key: "eficiencia", kind: "enum" },
    { key: "dispensador", kind: "boolean" },
    { key: "anchoCm", kind: "number", band: [30, 130] },
    { key: "altoCm", kind: "number", band: [40, 220] },
    { key: "wifi", kind: "boolean" },
  ],
  lavarropas: [
    { key: "capacidadKg", kind: "number", band: [2, 30] },
    { key: "carga", kind: "enum" },
    { key: "lavaseca", kind: "boolean" },
    { key: "secadoKg", kind: "number", band: [2, 20] },
    { key: "rpm", kind: "number", band: [300, 2000] },
    { key: "inverter", kind: "boolean" },
    { key: "eficiencia", kind: "enum" },
    { key: "wifi", kind: "boolean" },
  ],
  tv: [
    { key: "pulgadas", kind: "number", band: [15, 110] },
    { key: "resolucion", kind: "enum" },
    { key: "panel", kind: "enum" },
    { key: "smart", kind: "boolean" },
    { key: "so", kind: "enum" },
    { key: "hdr", kind: "boolean" },
    { key: "hz", kind: "number", band: [50, 240] },
  ],
  "aire-acondicionado": [
    { key: "btu", kind: "number", band: [4000, 60000] },
    { key: "frigorias", kind: "number", band: [1000, 15000] },
    { key: "inverter", kind: "boolean" },
    { key: "frioCalor", kind: "boolean" },
    { key: "tipo", kind: "enum" },
    { key: "eficiencia", kind: "enum" },
    { key: "wifi", kind: "boolean" },
    { key: "ruidoDb", kind: "number", band: [15, 80] },
  ],
};

/** 1 frigoría por hora = 3,968 BTU por hora. */
export const BTU_POR_FRIGORIA = 3.968;
