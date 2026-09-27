// Qué entra por las rutas de administración: un alta de clave y un cambio sobre una clave. Puro.
//
// `scoped` es el caso del dueño de la clave (el app manda su `ownerUid`): sólo puede revocarla o
// renombrarla. Cambiar de plan, de límites o reactivarla es del administrador. app/utils/apiKeys.ts
// copia FIELD_LIMITS y MAX_ACTIVE_PER_OWNER para el formulario; apiPlansParity.test.ts los ata.
import { isPlanId, type Limits, type PlanId } from "./plans";

export const MAX_ACTIVE_PER_OWNER = 3;

export const FIELD_LIMITS = Object.freeze({
  label: Object.freeze({ min: 1, max: 40 }),
  company: Object.freeze({ min: 2, max: 80 }),
  useCase: Object.freeze({ min: 10, max: 500 }),
  website: Object.freeze({ min: 0, max: 200 }),
  notes: Object.freeze({ min: 0, max: 500 }),
});

const MAX_CUSTOM_LIMIT = 10_000_000;

export interface NewKeyInput {
  ownerUid: string;
  ownerEmail: string | null;
  label: string;
  company: string;
  useCase: string;
  website: string | null;
}

export interface KeyPatch {
  plan?: PlanId;
  limits?: Partial<Limits> | null;
  status?: "active" | "revoked";
  notes?: string | null;
  label?: string;
}

export type Result<T> = { ok: true; value: T } | { ok: false; error: string };

function clean(value: unknown): string {
  // eslint-disable-next-line no-control-regex
  return typeof value === "string" ? value.replace(/[\u0000-\u001f\u007f]/g, "").trim() : "";
}

function bounded(value: unknown, min: number, max: number): string | null {
  const text = clean(value);
  return text.length >= min && text.length <= max ? text : null;
}

function website(value: unknown): string | null | false {
  const text = clean(value);
  if (!text) return null;
  if (text.length > FIELD_LIMITS.website.max) return false;
  try {
    const url = new URL(text);
    return url.protocol === "https:" || url.protocol === "http:" ? text : false;
  } catch {
    return false;
  }
}

export function validateNewKey(body: unknown): Result<NewKeyInput> {
  const b = (body && typeof body === "object" ? body : {}) as Record<string, unknown>;
  const ownerUid = bounded(b.ownerUid, 1, 128);
  if (!ownerUid) return { ok: false, error: "Falta la cuenta dueña de la clave." };
  const emailText = clean(b.ownerEmail);
  const ownerEmail = emailText && emailText.length <= 200 && emailText.includes("@") ? emailText : null;
  const label = bounded(b.label, FIELD_LIMITS.label.min, FIELD_LIMITS.label.max);
  if (!label) return { ok: false, error: "Poné un nombre para la clave (hasta 40 caracteres)." };
  const company = bounded(b.company, FIELD_LIMITS.company.min, FIELD_LIMITS.company.max);
  if (!company) return { ok: false, error: "Poné el nombre de la empresa o del proyecto (entre 2 y 80 caracteres)." };
  const useCase = bounded(b.useCase, FIELD_LIMITS.useCase.min, FIELD_LIMITS.useCase.max);
  if (!useCase) return { ok: false, error: "Contanos para qué la vas a usar (entre 10 y 500 caracteres)." };
  const site = website(b.website);
  if (site === false) return { ok: false, error: "El sitio web tiene que ser una dirección http o https." };
  return { ok: true, value: { ownerUid, ownerEmail, label, company, useCase, website: site } };
}

function customLimits(value: unknown): Partial<Limits> | null | false {
  if (value === null) return null;
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  const out: Partial<Limits> = {};
  for (const field of ["perMinute", "perDay"] as const) {
    if (v[field] === undefined || v[field] === null) continue;
    const n = Number(v[field]);
    if (!Number.isInteger(n) || n <= 0 || n > MAX_CUSTOM_LIMIT) return false;
    out[field] = n;
  }
  return Object.keys(out).length ? out : null;
}

export function validatePatch(body: unknown, scoped: boolean): Result<KeyPatch> {
  const b = (body && typeof body === "object" ? body : {}) as Record<string, unknown>;
  const patch: KeyPatch = {};

  if (b.label !== undefined) {
    const label = bounded(b.label, FIELD_LIMITS.label.min, FIELD_LIMITS.label.max);
    if (!label) return { ok: false, error: "El nombre de la clave va de 1 a 40 caracteres." };
    patch.label = label;
  }
  if (b.status !== undefined) {
    if (b.status !== "active" && b.status !== "revoked") return { ok: false, error: "Estado desconocido." };
    if (scoped && b.status !== "revoked") return { ok: false, error: "Sólo se puede revocar la clave o cambiarle el nombre." };
    patch.status = b.status;
  }

  const adminOnly = ["plan", "limits", "notes"].filter((field) => b[field] !== undefined);
  if (scoped && adminOnly.length) return { ok: false, error: "Sólo se puede revocar la clave o cambiarle el nombre." };

  if (b.plan !== undefined) {
    if (!isPlanId(b.plan) || b.plan === "anonymous") return { ok: false, error: "Plan desconocido." };
    patch.plan = b.plan;
  }
  if (b.limits !== undefined) {
    const limits = customLimits(b.limits);
    if (limits === false) return { ok: false, error: "Los límites propios tienen que ser enteros positivos." };
    patch.limits = limits;
  }
  if (b.notes !== undefined) {
    const notes = b.notes === null ? "" : clean(b.notes);
    if (notes.length > FIELD_LIMITS.notes.max) return { ok: false, error: "Las notas van hasta 500 caracteres." };
    patch.notes = notes || null;
  }

  if (!Object.keys(patch).length) return { ok: false, error: "No hay nada para cambiar." };
  return { ok: true, value: patch };
}
