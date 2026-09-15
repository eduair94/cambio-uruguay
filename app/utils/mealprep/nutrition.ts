// Cuánto tiene que comer la persona: TMB por Mifflin–St Jeor, GET por factor de
// actividad, objetivo, macros y reparto por turno.
//
// Todo son fórmulas poblacionales (±10 % para la mitad de la gente) y la página
// lo dice. No es un plan clínico: sin embarazo, lactancia, menores ni patologías.
import type { Activity, Goal, MealSlot, Profile, Sex } from './types'

export const ACTIVITY_FACTOR: Record<Activity, number> = {
  sedentario: 1.2,
  ligero: 1.375,
  moderado: 1.55,
  alto: 1.725,
  'muy-alto': 1.9,
}

export const ACTIVITY_LABEL: Record<Activity, string> = {
  sedentario: 'Sedentario (escritorio, sin ejercicio)',
  ligero: 'Ligero (caminás, ejercicio 1–3 veces por semana)',
  moderado: 'Moderado (ejercicio 3–5 veces por semana)',
  alto: 'Alto (ejercicio intenso 6–7 veces por semana)',
  'muy-alto': 'Muy alto (trabajo físico o doble turno de entrenamiento)',
}

export const GOAL_LABEL: Record<Goal, string> = {
  mantener: 'Mantener el peso',
  bajar: 'Bajar de peso (−15 %)',
  subir: 'Subir de peso (+10 %)',
}

/** Reparto de las kcal del día por turno. Suma 1. */
export const SLOT_SHARE: Record<MealSlot, number> = {
  desayuno: 0.22,
  almuerzo: 0.35,
  merienda: 0.13,
  cena: 0.3,
}

export const KCAL_FLOOR: Record<Sex, number> = { f: 1200, m: 1500 }
export const PROTEIN_MAX_SHARE = 0.3
/** Con esta fracción de kcal en proteína o más, el planificador prefiere platos densos en proteína. */
export const PROTEIN_DENSE_SHARE = 0.25

export const AGE_MIN = 18
export const AGE_MAX = 80
export const HEIGHT_MIN = 140
export const HEIGHT_MAX = 210
export const WEIGHT_MIN = 40
export const WEIGHT_MAX = 200

export interface BodyTargets {
  bmi: number
  bmiLabel: string
  bmr: number
  tdee: number
  /** kcal objetivo del día. */
  kcal: number
  /** Gramos por día. */
  protein: number
  fat: number
  carbs: number
  fiber: number
  /** Fracción de kcal de cada macro (para mostrar). */
  proteinShare: number
  fatShare: number
  carbsShare: number
  /** kcal objetivo por turno. */
  slots: Record<MealSlot, number>
  /** El piso de kcal se aplicó (objetivo "bajar" en una persona chica). */
  flooredAtMinimum: boolean
}

export function bmiOf(heightCm: number, weightKg: number): number {
  const m = heightCm / 100
  return weightKg / (m * m)
}

/** Categorías de la OMS para adultos. Sólo informativo. */
export function bmiLabel(bmi: number): string {
  if (bmi < 18.5) return 'bajo peso'
  if (bmi < 25) return 'normal'
  if (bmi < 30) return 'sobrepeso'
  return 'obesidad'
}

/** Mifflin–St Jeor (1990), kcal/día. */
export function basalRate(profile: Profile): number {
  const base = 10 * profile.weightKg + 6.25 * profile.heightCm - 5 * profile.age
  return profile.sex === 'm' ? base + 5 : base - 161
}

export function clampProfile(profile: Profile): Profile {
  const clamp = (v: number, lo: number, hi: number) =>
    Number.isFinite(v) ? Math.min(hi, Math.max(lo, v)) : lo
  return {
    ...profile,
    age: Math.round(clamp(profile.age, AGE_MIN, AGE_MAX)),
    heightCm: Math.round(clamp(profile.heightCm, HEIGHT_MIN, HEIGHT_MAX)),
    weightKg: Math.round(clamp(profile.weightKg, WEIGHT_MIN, WEIGHT_MAX) * 10) / 10,
  }
}

export function bodyTargets(input: Profile): BodyTargets {
  const profile = clampProfile(input)
  const bmr = basalRate(profile)
  const tdee = bmr * ACTIVITY_FACTOR[profile.activity]

  let kcal = tdee
  if (profile.goal === 'bajar') kcal = tdee * 0.85
  if (profile.goal === 'subir') kcal = tdee * 1.1
  const floor = KCAL_FLOOR[profile.sex]
  const flooredAtMinimum = kcal < floor
  if (flooredAtMinimum) kcal = floor
  kcal = Math.round(kcal / 10) * 10

  // Proteína por kilo, con tope del 30 % de las kcal: más que eso ya no es una
  // dieta balanceada, y en una persona pesada con pocas kcal el g/kg lo pide.
  const gPerKg = profile.goal === 'bajar' ? 1.8 : 1.6
  let protein = gPerKg * profile.weightKg
  const proteinCap = (kcal * PROTEIN_MAX_SHARE) / 4
  if (protein > proteinCap) protein = proteinCap
  const fat = (kcal * 0.28) / 9
  const carbs = Math.max(0, (kcal - protein * 4 - fat * 9) / 4)
  const fiber = profile.sex === 'm' ? 30 : 25

  const bmi = bmiOf(profile.heightCm, profile.weightKg)
  const slots = Object.fromEntries(
    (Object.keys(SLOT_SHARE) as MealSlot[]).map(slot => [slot, Math.round(kcal * SLOT_SHARE[slot])])
  ) as Record<MealSlot, number>

  return {
    bmi: Math.round(bmi * 10) / 10,
    bmiLabel: bmiLabel(bmi),
    bmr: Math.round(bmr),
    tdee: Math.round(tdee),
    kcal,
    protein: Math.round(protein),
    fat: Math.round(fat),
    carbs: Math.round(carbs),
    fiber,
    proteinShare: (protein * 4) / kcal,
    fatShare: (fat * 9) / kcal,
    carbsShare: (carbs * 4) / kcal,
    slots,
    flooredAtMinimum,
  }
}
