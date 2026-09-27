// Planes de la API pública y sus techos. Puro: sin Express, sin Redis, sin Mongo.
//
// Los números salen de lo medido en Cloudflare (24 h al 27/9/2026): el cliente anónimo que más pide
// en un día hace ~280 pedidos y la ráfaga más alta fue de 494 en un minuto. El techo anónimo queda
// por encima de las dos cosas: hoy es anti-abuso, no un muro. Una clave gratuita tiene la misma
// cuota; lo que gana es identidad, medición y el camino a un plan pago. Diseño:
// docs/superpowers/specs/2026-09-27-api-empresas-claves-design.md.
//
// app/utils/apiKeys.ts copia DEFAULT_PLAN_LIMITS para mostrarlos en /empresas, y
// app/tests/unit/apiPlansParity.test.ts es lo que mantiene las dos copias iguales.

export type PlanId = "anonymous" | "free" | "business" | "internal";

export const PLAN_IDS: readonly PlanId[] = ["anonymous", "free", "business", "internal"];

export interface Limits {
  perMinute: number;
  perDay: number;
}

export const DEFAULT_PLAN_LIMITS: Readonly<Record<PlanId, Readonly<Limits>>> = Object.freeze({
  anonymous: Object.freeze({ perMinute: 600, perDay: 20_000 }),
  free: Object.freeze({ perMinute: 600, perDay: 20_000 }),
  business: Object.freeze({ perMinute: 3_000, perDay: 500_000 }),
  internal: Object.freeze({ perMinute: Infinity, perDay: Infinity }),
});

export function isPlanId(value: unknown): value is PlanId {
  return typeof value === "string" && (PLAN_IDS as readonly string[]).includes(value);
}

function positiveInt(raw: unknown): number | null {
  const n = typeof raw === "number" ? raw : Number(String(raw ?? "").trim());
  return Number.isInteger(n) && n > 0 ? n : null;
}

/** Límites de un plan; `API_LIMIT_<PLAN>_PER_MINUTE|PER_DAY` los pisan sin desplegar código. */
export function planLimits(plan: PlanId, env: NodeJS.ProcessEnv = process.env): Limits {
  const base = DEFAULT_PLAN_LIMITS[plan];
  if (plan === "internal") return { ...base };
  const prefix = `API_LIMIT_${plan.toUpperCase()}`;
  return {
    perMinute: positiveInt(env[`${prefix}_PER_MINUTE`]) ?? base.perMinute,
    perDay: positiveInt(env[`${prefix}_PER_DAY`]) ?? base.perDay,
  };
}

/** Los límites propios de una clave (un acuerdo a medida) pisan los del plan, uno por uno. */
export function effectiveLimits(
  plan: PlanId,
  custom?: Partial<Limits> | null,
  env: NodeJS.ProcessEnv = process.env
): Limits {
  const base = planLimits(plan, env);
  if (plan === "internal" || !custom) return base;
  return {
    perMinute: positiveInt(custom.perMinute) ?? base.perMinute,
    perDay: positiveInt(custom.perDay) ?? base.perDay,
  };
}

/** `Infinity` no existe en JSON: sale como `null`, que se lee "sin límite". */
export function limitsForJson(limits: Limits): { perMinute: number | null; perDay: number | null } {
  return {
    perMinute: Number.isFinite(limits.perMinute) ? limits.perMinute : null,
    perDay: Number.isFinite(limits.perDay) ? limits.perDay : null,
  };
}
