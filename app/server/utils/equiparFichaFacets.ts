import type { Model } from 'mongoose'
import { equiparProductosMatch } from './equiparProductos'
import type { EquiparProductosQuery, EquiparQueryKey } from '../../utils/equiparProductos'
import {
  EQUIPAR_FICHA_FILTROS,
  isEquiparFichaCategoria,
  type EquiparFichaFacetas,
  type EquiparFichaGrupo,
} from '../../utils/equiparFicha'

/**
 * Las facetas de ficha técnica del directorio de equipar (heladeras, lavarropas, televisores y aires):
 * cuántos avisos devolvería cada opción con los DEMÁS filtros puestos y el suyo sacado, como el resto
 * de las facetas. Un `$group` con un `$cond` por opción, una agregación por grupo, sobre a lo sumo un
 * millar de filas por categoría. Toda condición numérica va con `$isNumber`: en una agregación `null`
 * es menor que cualquier número, y "hasta 250 L" contaría a cada aviso que no declara la capacidad.
 */
const count = (condition: unknown) => ({ $sum: { $cond: [condition, 1, 0] } })

function condition(field: string, cond: EquiparFichaGrupo['opciones'][number]['cond']): unknown {
  const path = `$ficha.values.${field}`
  if (typeof cond !== 'object') return { $eq: [path, cond] }
  return {
    $and: [
      { $isNumber: path },
      ...Object.entries(cond).map(([op, value]) => ({ [op]: [path, value] })),
    ],
  }
}

const fromSeller = {
  $gt: [
    {
      $size: {
        $filter: {
          input: { $objectToArray: { $ifNull: ['$ficha.from', {}] } },
          cond: { $eq: ['$$this.v', 'ficha'] },
        },
      },
    },
    0,
  ],
}

export interface EquiparFichaFacetStep {
  key: string
  match: Record<string, unknown>
  group: Record<string, unknown>
}

export function equiparFichaFacetPlan(
  query: EquiparProductosQuery,
  cutoff: string
): EquiparFichaFacetStep[] {
  if (!isEquiparFichaCategoria(query.categoria)) return []
  const steps: EquiparFichaFacetStep[] = EQUIPAR_FICHA_FILTROS[query.categoria].map(grupo => ({
    key: grupo.key,
    match: equiparProductosMatch(query, cutoff, [`eqficha.${grupo.key}` as EquiparQueryKey]),
    group: {
      _id: null,
      ...Object.fromEntries(
        grupo.opciones.map(opcion => [
          opcion.slug,
          count(condition(opcion.field ?? grupo.field, opcion.cond)),
        ])
      ),
    },
  }))
  steps.push({
    key: 'conFicha',
    match: equiparProductosMatch(query, cutoff),
    group: { _id: null, conFicha: count(fromSeller) },
  })
  return steps
}

export function equiparFichaFacetasFrom(
  counts: Record<string, Record<string, number>>,
  query: EquiparProductosQuery
): EquiparFichaFacetas | undefined {
  if (!isEquiparFichaCategoria(query.categoria)) return undefined
  const picked = (key: string, slug: string) => {
    const value = query.eqficha?.[key]
    return Array.isArray(value) ? value.includes(slug) : value === slug
  }
  return {
    grupos: EQUIPAR_FICHA_FILTROS[query.categoria].map(grupo => ({
      key: grupo.key,
      label: grupo.label,
      multi: Boolean(grupo.multi),
      // Una opción sin avisos no se ofrece, salvo que esté puesta (ahí hay que poder sacarla).
      opciones: grupo.opciones
        .map(opcion => ({
          slug: opcion.slug,
          name: opcion.label,
          count: counts[grupo.key]?.[opcion.slug] ?? 0,
        }))
        .filter(opcion => opcion.count > 0 || picked(grupo.key, opcion.slug)),
    })),
    conFicha: counts.conFicha?.conFicha ?? 0,
  }
}

const FACET_MS = 10_000

/** Corre el plan. Si algo falla, el directorio sale sin facetas de ficha. */
export async function equiparFichaFacets(
  model: Model<any>,
  query: EquiparProductosQuery,
  cutoff: string
): Promise<EquiparFichaFacetas | undefined> {
  const plan = equiparFichaFacetPlan(query, cutoff)
  if (!plan.length) return undefined
  try {
    const results = await Promise.all(
      plan.map(step =>
        model
          .aggregate<Record<string, number>>([{ $match: step.match }, { $group: step.group }])
          .option({ maxTimeMS: FACET_MS })
      )
    )
    const counts: Record<string, Record<string, number>> = {}
    plan.forEach((step, index) => {
      const { _id: _ignored, ...row } = (results[index]?.[0] ?? {}) as Record<string, number>
      counts[step.key] = row
    })
    return equiparFichaFacetasFrom(counts, query)
  } catch {
    return undefined
  }
}
