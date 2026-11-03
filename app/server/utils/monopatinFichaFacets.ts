import type { Model } from 'mongoose'
import { equiparProductosMatch } from './equiparProductos'
import type {
  EquiparProductosFacet,
  EquiparProductosQuery,
  EquiparQueryKey,
  MonopatinFichaFacets,
} from '../../utils/equiparProductos'
import {
  MONOPATIN_AUTONOMIA_OPCIONES,
  MONOPATIN_CARGA_OPCIONES,
  MONOPATIN_PESO_OPCIONES,
  MONOPATIN_POTENCIA_RANGOS,
  MONOPATIN_RASGO_CAMPOS,
  MONOPATIN_RUEDA_RANGOS,
  MONOPATIN_VELOCIDAD_RANGOS,
  monopatinAutonomiaLabel,
  monopatinCargaLabel,
  monopatinPesoLabel,
  type MovilidadFichaQuery,
} from '../../utils/monopatinFicha'

/**
 * Las facetas de ficha técnica del directorio de monopatines: cuántos avisos devolvería cada opción
 * con los DEMÁS filtros puestos y el suyo sacado, como el resto de las facetas del directorio.
 *
 * Un `$group` con un `$cond` por opción, sobre a lo sumo un millar de filas: barato, y con la misma
 * caché de borde de 300 s que el resto de la respuesta. En una comparación de agregación `null` es
 * MENOR que cualquier número, así que toda condición va con `$isNumber`: sin eso, "hasta 25 km/h"
 * contaría a cada aviso que no declara la velocidad.
 */
type Dimension = 'autonomia' | 'velocidad' | 'potencia' | 'carga' | 'peso' | 'rueda' | 'rasgos'

export interface FichaFacetStep {
  dimension: Dimension | 'conFicha'
  match: Record<string, unknown>
  group: Record<string, unknown>
}

type Range = { $gt?: number; $gte?: number; $lte?: number }

const count = (condition: unknown) => ({ $sum: { $cond: [condition, 1, 0] } })

const inRange = (path: string, range: Range) => ({
  $and: [
    { $isNumber: path },
    ...Object.entries(range).map(([op, value]) => ({ [op]: [path, value] })),
  ],
})

const groupOf = (counts: Record<string, unknown>) => ({ _id: null, ...counts })

const fromFicha = {
  $or: ['rangeKm', 'maxSpeedKmh', 'motorW', 'maxLoadKg', 'weightKg', 'chargeHours'].map(field => ({
    $in: [{ $ifNull: [`$specs.from.${field}`, ''] }, ['ficha', 'descripcion']],
  })),
}

export function monopatinFichaFacetPlan(
  query: EquiparProductosQuery,
  cutoff: string
): FichaFacetStep[] {
  const without = (key: EquiparQueryKey) => equiparProductosMatch(query, cutoff, [key])
  const entries = <K extends string>(record: Readonly<Record<K, { range: Range }>>, path: string) =>
    Object.fromEntries(
      (Object.entries(record) as Array<[K, { range: Range }]>).map(([slug, { range }]) => [
        slug,
        count(inRange(path, range)),
      ])
    )
  return [
    {
      dimension: 'autonomia',
      match: without('ficha.autonomia'),
      group: groupOf(
        Object.fromEntries(
          MONOPATIN_AUTONOMIA_OPCIONES.map(km => [
            `o${km}`,
            count(inRange('$specs.rangeKm', { $gte: km })),
          ])
        )
      ),
    },
    {
      dimension: 'velocidad',
      match: without('ficha.velocidad'),
      group: groupOf(entries(MONOPATIN_VELOCIDAD_RANGOS, '$specs.maxSpeedKmh')),
    },
    {
      dimension: 'potencia',
      match: without('ficha.potencia'),
      group: groupOf(entries(MONOPATIN_POTENCIA_RANGOS, '$specs.motorW')),
    },
    {
      dimension: 'carga',
      match: without('ficha.carga'),
      group: groupOf(
        Object.fromEntries(
          MONOPATIN_CARGA_OPCIONES.map(kg => [
            `o${kg}`,
            count(inRange('$specs.maxLoadKg', { $gte: kg })),
          ])
        )
      ),
    },
    {
      dimension: 'peso',
      match: without('ficha.peso'),
      group: groupOf(
        Object.fromEntries(
          MONOPATIN_PESO_OPCIONES.map(kg => [
            `o${kg}`,
            count(inRange('$specs.weightKg', { $lte: kg })),
          ])
        )
      ),
    },
    {
      dimension: 'rueda',
      match: without('ficha.rueda'),
      group: groupOf(entries(MONOPATIN_RUEDA_RANGOS, '$specs.wheelInches')),
    },
    {
      dimension: 'rasgos',
      match: without('ficha.rasgos'),
      group: groupOf(
        Object.fromEntries(
          Object.entries(MONOPATIN_RASGO_CAMPOS).map(([slug, { field }]) => [
            slug,
            count({ $eq: [`$${field}`, true] }),
          ])
        )
      ),
    },
    {
      dimension: 'conFicha',
      match: equiparProductosMatch(query, cutoff),
      group: groupOf({ conFicha: count(fromFicha) }),
    },
  ]
}

type Counts = Record<string, number>

export function monopatinFichaFacetsFrom(
  counts: Partial<Record<Dimension, Counts>> & { conFicha?: number },
  ficha: MovilidadFichaQuery
): MonopatinFichaFacets {
  const keep = (rows: EquiparProductosFacet[], selected: (slug: string) => boolean) =>
    rows.filter(row => row.count > 0 || selected(row.slug))
  const numeric = (
    dimension: Dimension,
    options: readonly number[],
    label: (value: number) => string,
    selected: number | null
  ) =>
    keep(
      options.map(value => ({
        slug: String(value),
        name: label(value),
        count: counts[dimension]?.[`o${value}`] ?? 0,
      })),
      slug => selected !== null && Number(slug) === selected
    )
  const ranged = (
    dimension: Dimension,
    record: Readonly<Record<string, { label: string }>>,
    selected: string
  ) =>
    keep(
      Object.entries(record).map(([slug, { label }]) => ({
        slug,
        name: label,
        count: counts[dimension]?.[slug] ?? 0,
      })),
      slug => slug === selected
    )
  return {
    autonomia: numeric('autonomia', MONOPATIN_AUTONOMIA_OPCIONES, monopatinAutonomiaLabel, ficha.autonomia),
    velocidad: ranged('velocidad', MONOPATIN_VELOCIDAD_RANGOS, ficha.velocidad),
    potencia: ranged('potencia', MONOPATIN_POTENCIA_RANGOS, ficha.potencia),
    carga: numeric('carga', MONOPATIN_CARGA_OPCIONES, monopatinCargaLabel, ficha.carga),
    peso: numeric('peso', MONOPATIN_PESO_OPCIONES, monopatinPesoLabel, ficha.peso),
    rueda: ranged('rueda', MONOPATIN_RUEDA_RANGOS, ficha.rueda),
    rasgos: keep(
      Object.entries(MONOPATIN_RASGO_CAMPOS).map(([slug, { label }]) => ({
        slug,
        name: label,
        count: counts.rasgos?.[slug] ?? 0,
      })),
      slug => (ficha.rasgos as string[]).includes(slug)
    ),
    conFicha: counts.conFicha ?? 0,
  }
}

const FACET_MS = 10_000

/** Corre el plan contra la colección. Si algo falla, el directorio sale sin facetas de ficha. */
export async function monopatinFichaFacets(
  model: Model<any>,
  query: EquiparProductosQuery,
  cutoff: string
): Promise<MonopatinFichaFacets | undefined> {
  if (!query.ficha) return undefined
  const ficha = query.ficha
  try {
    const plan = monopatinFichaFacetPlan(query, cutoff)
    const results = await Promise.all(
      plan.map(step =>
        model
          .aggregate<Record<string, number>>([{ $match: step.match }, { $group: step.group }])
          .option({ maxTimeMS: FACET_MS })
      )
    )
    const counts: Partial<Record<Dimension, Counts>> & { conFicha?: number } = {}
    plan.forEach((step, index) => {
      const { _id: _ignored, ...row } = (results[index]?.[0] ?? {}) as Record<string, number>
      if (step.dimension === 'conFicha') counts.conFicha = row.conFicha ?? 0
      else counts[step.dimension] = row
    })
    return monopatinFichaFacetsFrom(counts, ficha)
  } catch {
    return undefined
  }
}
