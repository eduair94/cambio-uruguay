// Qué fuentes lee el directorio de motos y cómo se apaga una sin desplegar.
//
// v1 lee sólo Mercado Libre. Facebook Marketplace y las tiendas web quedan fuera a propósito: su
// lector de autos identifica cada aviso contra el diccionario de ids de ML de AUTOS, y `NOT_A_CAR`
// (classes/autos/sources/common.ts) descarta explícitamente `moto|motos|motocicletas?|scooter`, así
// que reusarlo no es "importar una función" sino invertirle el criterio — trabajo real, no trivial,
// y la spec lo deja para cuando el catálogo exista. Motorlider (Fenicio) es el candidato natural:
// ya vende 10 motos que hoy se descartan sólo porque KTM/Bajaj/Aprilia/Kymco/Piaggio no están en el
// diccionario de autos (docs/app/AUTOS.md).
//
// La tabla existe igual desde v1 porque es el seam: agregar una fuente es una fila acá, una en
// `MOTO_SOURCES` y una rama en el job.
import type { MotoSource } from "../types";

export const MOTO_SOURCES: Readonly<Record<MotoSource, { name: string; priority: number }>> = {
  // `priority` decide quién gana cuando la misma moto aparece en dos fuentes: menor gana. ML primero
  // porque es la única que da marca y modelo desde un filtro APLICADO y no desde el título.
  mercadolibre: { name: "Mercado Libre", priority: 1 },
};

export const MOTO_SOURCE_LIST: readonly MotoSource[] = Object.keys(MOTO_SOURCES) as MotoSource[];

/**
 * `MOTOS_SOURCES=a,b` es una lista blanca (si está, sólo esas corren) y `MOTOS_<FUENTE>_ENABLED=0`
 * apaga una sola. Mismo idioma que `AUTOS_*`, con el prefijo propio: la variable lleva el nombre del
 * job que la lee, así que apagar ML para motos no puede apagarlo para autos por descuido.
 *
 * Mercado Libre acepta las dos formas —`MOTOS_ML_ENABLED` y `MOTOS_MERCADOLIBRE_ENABLED`— porque
 * autos usa la abreviada (`AUTOS_ML_ENABLED`) y quien apague un job a las 3 de la mañana va a
 * escribir la que ya conoce.
 */
export function motoSourceEnabled(source: MotoSource, env: NodeJS.ProcessEnv = process.env): boolean {
  const only = String(env.MOTOS_SOURCES || "")
    .split(",")
    .map(name => name.trim().toLowerCase())
    .filter(Boolean);
  if (only.length && !only.includes(source)) return false;
  if (source === "mercadolibre" && (env.MOTOS_ML_ENABLED === "0" || env.MOTOS_MERCADOLIBRE_ENABLED === "0")) return false;
  return env[`MOTOS_${source.toUpperCase()}_ENABLED`] !== "0";
}
