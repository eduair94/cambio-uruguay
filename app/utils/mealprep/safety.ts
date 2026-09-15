// La seguridad alimentaria como restricción del planificador.
//
// El día de cocina es el día 0. Un tupper que se come el día N tiene que cumplir
// N ≤ fridgeDays de la receta, o ir al freezer —y sólo puede ir al freezer si la
// receta es congelable y hay freezer—. Lo que no cumple ninguna de las dos no se
// asigna: entra una receta rápida que se hace ese día. Ninguna receta se
// "estira" un día porque el número está cerca.
import type { Recipe } from './types'

/** Origen de un plato en un turno dado. */
export type Storage = 'heladera' | 'freezer' | 'fresco'

/** Calidad, no seguridad: a −18 °C nada se echa a perder, pero pierde textura. */
export const FREEZER_MAX_DAYS = 60

/** Horas máximas a temperatura ambiente antes de enfriar (USDA). */
export const COOL_WITHIN_HOURS = 2

/** Temperatura interna que tiene que alcanzar lo recalentado (USDA: 165 °F). */
export const REHEAT_TEMP_C = 74

/**
 * Dónde tiene que estar el plato de `recipe` para comerse el día `day` (1..7).
 * `null` = no se puede de forma segura con lo que hay.
 */
export function storageFor(day: number, recipe: Recipe, hasFreezer: boolean): Storage | null {
  if (!recipe.batch) return recipe.quick ? 'fresco' : null
  if (day <= recipe.storage.fridgeDays) return 'heladera'
  if (hasFreezer && recipe.storage.freezable && day <= FREEZER_MAX_DAYS) return 'freezer'
  return null
}

export const STORAGE_LABEL: Record<Storage, string> = {
  heladera: 'Heladera',
  freezer: 'Freezer',
  fresco: 'Se hace ese día',
}

export interface SafetyRule {
  title: string
  detail: string
}

/** Las reglas que el plan da por cumplidas. Se publican tal cual en la página. */
export const SAFETY_RULES: ReadonlyArray<SafetyRule> = Object.freeze([
  {
    title: 'Enfriar en menos de 2 horas',
    detail:
      'Lo cocido va a la heladera antes de las 2 h desde que salió del fuego. Repartilo en tuppers chatos destapados para que enfríe rápido; una olla entera tarda horas en bajar de 60 °C, que es donde las bacterias crecen más.',
  },
  {
    title: 'Heladera a 4 °C o menos, 3 días',
    detail:
      'Las comidas cocidas aguantan 3 días (la USDA dice 3–4; el plan toma 3). Arroz cocido y pescado, 2. El plan no asigna ningún tupper de heladera más allá de eso: los días 4 a 7 salen del freezer o se cocinan ese día.',
  },
  {
    title: 'Freezer a −18 °C, hasta 60 días',
    detail:
      'A −18 °C nada se echa a perder; lo que se pierde es textura, y a los 2 meses se nota. Etiquetá con el nombre y la fecha. La papa hervida y las ensaladas no se freezan: el plan lo sabe y las deja en los primeros días.',
  },
  {
    title: 'Descongelar en la heladera, la noche anterior',
    detail:
      'Pasá el tupper del freezer a la heladera la noche anterior (12 h). Nunca en la mesada. Si te olvidaste, usá la función descongelar del microondas y calentalo enseguida.',
  },
  {
    title: 'Recalentar hasta que humee, una sola vez',
    detail:
      'El centro tiene que llegar a 74 °C: en el microondas, revolvé a la mitad y dejá reposar 1 min; el borde hierve antes que el medio. Lo que se recalentó y sobró, se tira.',
  },
  {
    title: 'Tuppers de vidrio o plástico apto para microondas',
    detail:
      'El vidrio no absorbe olores ni se mancha con el tomate y va del freezer al microondas (no del freezer al horno caliente). Si es plástico, que diga "apto microondas" y sin tapa al calentar.',
  },
])
