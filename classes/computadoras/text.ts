// El texto de un aviso, normalizado una sola vez para que todos los lectores (procesador, placa,
// RAM, discos, fallas) corran sobre lo mismo. Ningún regex de este módulo lleva bandera `g` ni `y`
// salvo los que recorren con `matchAll`, que crean su propio iterador.

/**
 * Minúsculas, sin acentos, comillas tipográficas como `"`, y todo lo que no sea letra, número o
 * uno de `.,+/-"'%:` cambiado por un espacio. «16GB DDR4 – 3200MHz» → «16gb ddr4 - 3200mhz».
 * Los emojis y los «‼️» de Facebook desaparecen.
 */
export function norm(text: string | null | undefined): string {
  return String(text ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[“”″]/g, '"')
    .replace(/[‘’′]/g, "'")
    .replace(/[º°]/g, " ")
    // «I7 | 16gb Ram | Ssd» separa piezas: la barra queda como `/`, que ningún `\s*` cruza.
    .replace(/[|•·]/g, " / ")
    .replace(/[–—]/g, " - ")
    .replace(/[^a-z0-9.,+/\-"'%:$\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** «1.5» / «1,5» → 1.5. */
export const num = (raw: string): number => Number(raw.replace(",", "."));

export const uniq = <T>(values: readonly T[]): T[] => [...new Set(values)];

export function median(values: readonly number[]): number {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle]! : (sorted[middle - 1]! + sorted[middle]!) / 2;
}

/** El percentil `p` (0–1) por interpolación lineal. */
export function quantile(values: readonly number[], p: number): number {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const position = (sorted.length - 1) * p;
  const low = Math.floor(position);
  const high = Math.ceil(position);
  return sorted[low]! + (sorted[high]! - sorted[low]!) * (position - low);
}

export const round = (value: number, step = 1): number => Math.round(value / step) * step;
