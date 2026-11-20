// La máquina de estados de un bloque de fuente. Pura.
//
// La regla de fondo es la de los perfiles de tiendas: una fuente caída CONSERVA su bloque anterior con
// su fecha vieja. Lo que cambia en cada corrida es el estado, el intento y la nota; el `data` sólo se
// reemplaza cuando la corrida trajo algo que se puede creer.
import { THIN_REFUSAL_MAX_DAYS } from "./caps";
import type { DayWindow, SourceBlock, SourceId } from "./types";

export type BlockOutcome<D> =
  | { kind: "ok"; data: D; window?: DayWindow | null; truncated?: boolean; rowsSeen?: Record<string, number>; note?: string | null }
  | {
      kind: "partial";
      /** Lo nuevo, con las sub-partes caídas ya copiadas del bloque anterior (`mergeCarried`). */
      data: D;
      carried: string[];
      window?: DayWindow | null;
      truncated?: boolean;
      rowsSeen?: Record<string, number>;
      note?: string | null;
    }
  | { kind: "thin"; data: D; window?: DayWindow | null; truncated?: boolean; rowsSeen?: Record<string, number>; note: string }
  | { kind: "failed"; note: string }
  | { kind: "inactive"; enableHint: string; note?: string | null }
  | { kind: "skipped"; note?: string | null };

const clip = (s: string | null | undefined) => (s ? String(s).slice(0, 300) : null);

export function emptyBlock<D>(id: SourceId, now: string): SourceBlock<D> {
  return {
    id,
    status: "skipped",
    ok: false,
    fetchedAt: null,
    attemptedAt: now,
    lastOkAt: null,
    failingSince: null,
    note: null,
    enableHint: null,
    window: null,
    truncated: false,
    carried: [],
    rowsSeen: {},
    data: null,
  };
}

/** Milisegundos desde una fecha ISO, o null si no se puede leer. */
function ageMs(iso: string | null | undefined, now: string): number | null {
  if (!iso) return null;
  const t = Date.parse(iso);
  const n = Date.parse(now);
  if (!Number.isFinite(t) || !Number.isFinite(n)) return null;
  return n - t;
}

/**
 * ¿Ya venció el rechazo por "flaco"? Una racha que empezó hace 7 días o más se acepta: si no, una
 * baja real y sostenida congelaría el bloque para siempre. Una fecha ilegible NUNCA autoriza.
 */
export function refusalExpired(failingSince: string | null | undefined, now: string): boolean {
  if (!failingSince) return false;
  const age = ageMs(failingSince, now);
  if (age === null) return false;
  return age >= THIN_REFUSAL_MAX_DAYS * 86400000;
}

export function nextBlock<D>(id: SourceId, prev: SourceBlock<D> | null | undefined, outcome: BlockOutcome<D>, now: string): SourceBlock<D> {
  const base: SourceBlock<D> = prev ? { ...prev, id } : emptyBlock<D>(id, now);
  const keep = {
    data: base.data,
    fetchedAt: base.fetchedAt,
    lastOkAt: base.lastOkAt,
    window: base.window,
    truncated: base.truncated,
    rowsSeen: base.rowsSeen || {},
  };
  const fresh = (o: { data: D; window?: DayWindow | null; truncated?: boolean; rowsSeen?: Record<string, number> }) => ({
    data: o.data,
    fetchedAt: now,
    lastOkAt: now,
    window: o.window ?? null,
    truncated: !!o.truncated,
    rowsSeen: o.rowsSeen || {},
  });

  switch (outcome.kind) {
    case "ok":
      return {
        ...base,
        ...fresh(outcome),
        status: "ok",
        ok: true,
        attemptedAt: now,
        failingSince: null,
        note: clip(outcome.note),
        enableHint: null,
        carried: [],
      };
    case "partial":
      return {
        ...base,
        ...fresh(outcome),
        status: "partial",
        ok: true,
        attemptedAt: now,
        failingSince: null,
        note: clip(outcome.note),
        enableHint: null,
        carried: [...outcome.carried],
      };
    case "thin": {
      // Primera corrida sin nada guardado: no hay nada que perder (regla de `revenueWouldRegress`).
      if (!prev || prev.data === null || prev.data === undefined) {
        return {
          ...base,
          ...fresh(outcome),
          status: "ok",
          ok: true,
          attemptedAt: now,
          failingSince: null,
          note: clip(outcome.note),
          enableHint: null,
          carried: [],
        };
      }
      const since = prev.status === "thin" || prev.status === "failed" ? prev.failingSince : null;
      if (since && refusalExpired(since, now)) {
        return {
          ...base,
          ...fresh(outcome),
          status: "ok",
          ok: true,
          attemptedAt: now,
          failingSince: null,
          note: "aceptado tras 7 días de caída sostenida",
          enableHint: null,
          carried: [],
        };
      }
      return {
        ...base,
        ...keep,
        status: "thin",
        ok: false,
        attemptedAt: now,
        failingSince: since ?? now,
        note: clip(outcome.note),
        enableHint: null,
        carried: [],
      };
    }
    case "failed": {
      const since = prev && (prev.status === "thin" || prev.status === "failed") ? prev.failingSince : null;
      return {
        ...base,
        ...keep,
        status: "failed",
        ok: false,
        attemptedAt: now,
        failingSince: since ?? now,
        note: clip(outcome.note),
        enableHint: null,
        carried: [],
      };
    }
    case "inactive":
      return {
        ...base,
        ...keep,
        status: "inactive",
        ok: false,
        attemptedAt: now,
        failingSince: null,
        note: clip(outcome.note ?? null),
        enableHint: clip(outcome.enableHint),
        carried: [],
      };
    case "skipped":
      return {
        ...base,
        ...keep,
        status: "skipped",
        ok: false,
        attemptedAt: now,
        failingSince: base.failingSince ?? null,
        note: clip(outcome.note ?? base.note),
        enableHint: base.enableHint ?? null,
        carried: [],
      };
  }
}

/**
 * Copia del bloque anterior las sub-partes que esta corrida no pudo traer. Sin bloque anterior la
 * sub-parte queda como la dejó el armado nuevo (vacía).
 */
export function mergeCarried<D extends Record<string, any>>(fresh: D, prev: D | null | undefined, carried: string[]): D {
  if (!prev || !carried.length) return fresh;
  const out: any = { ...fresh };
  for (const key of carried) {
    if (key in prev) out[key] = (prev as any)[key];
  }
  return out as D;
}
