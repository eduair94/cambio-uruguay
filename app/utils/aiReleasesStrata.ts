// app/utils/aiReleasesStrata.ts
//
// POR QUÉ EXISTE ESTE ARCHIVO, QUE ES LA MITAD QUE LE FALTABA AL PLACEBO.
//
// Comparar los meses con lanzamiento contra los meses sin lanzamiento, sin más, mide el
// CALENDARIO y no el lanzamiento. Los lanzamientos no están repartidos parejo en el tiempo: se
// amontonan en los años en que la industria se movió, que son justo los años en que la serie del
// sub subió todos los meses. Medido sobre los datos de esta página en setiembre de 2026: de los
// 13 meses comparables con lanzamiento, 6 caen en 2025 — y en 2025 subieron los 6 meses con
// lanzamiento Y los 6 sin lanzamiento. O sea: dentro de 2025 la diferencia es exactamente cero,
// y aun así la cuenta sin separar por año le atribuye al lanzamiento una ventaja de 24 puntos.
// Eso es la paradoja de Simpson sobre el almanaque, y publicar el número de arriba sin el de
// abajo es publicar un hallazgo que no existe.
//
// Por eso el veredicto de la página se decide con la brecha ESTRATIFICADA por año: se compara
// cada mes con lanzamiento contra los meses sin lanzamiento DEL MISMO AÑO, y recién después se
// promedian los años. Un año que no tiene las dos patas no aporta.
//
// MÓDULO PURO (sin Vue ni Nuxt). Vive aparte de `aiReleases.ts` para que la lista de fechas y la
// aritmética del control se lean por separado.

import { beforeAfter } from './aiReleases'

export interface RiseStratumSide {
  n: number
  rose: number
  share: number | null
}

export interface RiseStratum {
  /** El año, `YYYY`. */
  key: string
  withRelease: RiseStratumSide
  without: RiseStratumSide
}

export interface StratifiedGap {
  /**
   * Promedio de las brechas de cada año, pesado por cuántos meses con lanzamiento aporta el año.
   * `null` si ningún año tiene las dos patas.
   */
  gap: number | null
  /** Cuántos meses con lanzamiento entraron efectivamente en el promedio. */
  weight: number
  strata: RiseStratum[]
}

const side = (s: { n: number; rose: number }): RiseStratumSide => ({
  ...s,
  share: s.n ? s.rose / s.n : null,
})

/**
 * La misma cuenta de `riseSplit`, pero resuelta DENTRO de cada año y recién después promediada.
 * Un año sin meses con lanzamiento, o sin meses sin lanzamiento, no puede comparar nada y queda
 * fuera del promedio (sigue apareciendo en `strata`, que es lo que se muestra).
 */
export function stratifiedRiseGap(
  months: string[],
  values: Array<number | null>,
  releaseMonths: Set<string>,
  w = 3
): StratifiedGap {
  const buckets = new Map<
    string,
    { withRelease: { n: number; rose: number }; without: { n: number; rose: number } }
  >()
  for (let i = 0; i < months.length; i++) {
    const month = months[i]
    if (typeof month !== 'string') continue
    const { before, after } = beforeAfter(values, i, w)
    if (before === null || after === null) continue
    const key = month.slice(0, 4)
    let bucket = buckets.get(key)
    if (!bucket) {
      bucket = { withRelease: { n: 0, rose: 0 }, without: { n: 0, rose: 0 } }
      buckets.set(key, bucket)
    }
    const target = releaseMonths.has(month) ? bucket.withRelease : bucket.without
    target.n += 1
    if (after > before) target.rose += 1
  }

  const strata: RiseStratum[] = [...buckets.entries()]
    .sort((a, b) => (a[0] < b[0] ? -1 : 1))
    .map(([key, b]) => ({ key, withRelease: side(b.withRelease), without: side(b.without) }))

  let weight = 0
  let total = 0
  for (const s of strata) {
    if (s.withRelease.share === null || s.without.share === null) continue
    weight += s.withRelease.n
    total += (s.withRelease.share - s.without.share) * s.withRelease.n
  }
  return { gap: weight ? total / weight : null, weight, strata }
}
