// Quién tiene el monitor andando: la prueba de 14 días, o una clave de la API con plan Empresa
// (la asigna el dueño del sitio desde /cuenta?tab=api). Puro. app/utils/competitorMonitor.ts tiene
// el espejo para mostrarlo; competitorMonitorParity.test.ts los compara.
import { TRIAL_DAYS } from "./types";

const DAY_MS = 86_400_000;

export type Access =
  | { status: "trial"; daysLeft: number; endsAt: Date }
  | { status: "business" }
  | { status: "expired"; endedAt: Date };

export function accessFor(trialStartedAt: Date, hasBusiness: boolean, now: Date): Access {
  if (hasBusiness) return { status: "business" };
  const endsAt = new Date(trialStartedAt.getTime() + TRIAL_DAYS * DAY_MS);
  if (now.getTime() < endsAt.getTime()) {
    return { status: "trial", daysLeft: Math.ceil((endsAt.getTime() - now.getTime()) / DAY_MS), endsAt };
  }
  return { status: "expired", endedAt: endsAt };
}
