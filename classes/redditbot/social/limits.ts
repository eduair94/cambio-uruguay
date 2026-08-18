// Los frenos, como función pura del estado.
//
// Mismo criterio que en `redditbot/limits.ts`: la política se puede leer sin base de datos y se
// puede testear sin red. Los números son deliberadamente más chicos que los del bot de respuestas —
// una respuesta útil con fuentes se banca ser frecuente; un comentario casual repetido cinco veces
// por hora en el mismo sub es una granja de karma y se lee como tal.

import type { SocialConfig } from "./config";
import type { SocialSnapshot } from "./ledger";

export interface Allowed {
  ok: boolean;
  reason?: string;
}

export function runAllowed(cfg: SocialConfig, snap: SocialSnapshot, now: number = Date.now()): Allowed {
  if (snap.postedLast24h.length >= cfg.maxPerDay) return { ok: false, reason: `tope diario (${cfg.maxPerDay})` };
  if (snap.lastPostedAt) {
    const gap = (now - snap.lastPostedAt.getTime()) / 60000;
    if (gap < cfg.minGapMinutes) return { ok: false, reason: `faltan ${Math.ceil(cfg.minGapMinutes - gap)} min` };
  }
  return { ok: true };
}

export function subAllowed(cfg: SocialConfig, snap: SocialSnapshot, sub: string): Allowed {
  const n = snap.postedLast24h.filter((r) => r.sub.toLowerCase() === sub.toLowerCase()).length;
  if (n >= cfg.maxPerSubPerDay) return { ok: false, reason: `tope de r/${sub}` };
  return { ok: true };
}

export function authorAllowed(cfg: SocialConfig, snap: SocialSnapshot, author: string, now: number = Date.now()): Allowed {
  const last = snap.postedLast24h
    .filter((r) => r.author && r.author.toLowerCase() === author.toLowerCase())
    .map((r) => r.postedAt.getTime())
    .sort((a, b) => b - a)[0];
  if (last === undefined) return { ok: true };
  const hours = (now - last) / 3_600_000;
  if (hours < cfg.authorCooldownHours) return { ok: false, reason: `ya le comenté a ${author} hace ${Math.round(hours)} h` };
  return { ok: true };
}
