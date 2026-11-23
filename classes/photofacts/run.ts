// Una corrida de `currency-photo-facts`: bajar, mirar, normalizar y guardar, con tope de avisos, de
// reloj y de plata. Las dependencias que tocan la red y la base vienen inyectadas, así el orden y los
// cortes se prueban sin nada de eso.
//
// Las fotos del aviso siguiente se bajan MIENTRAS el modelo contesta el actual: la red va espaciada
// 1,2 s por host (classes/rentals/net.ts), seis fotos del mismo portal son ~7 s, y una respuesta del
// modelo ~6,5 s. En serie, 40 avisos no entran en 6 minutos; solapados, sí.
import type { ClaudeUsage } from "../anthropic";
import type { PhotoSkips, PreparedPhoto } from "../vision/photos";
import { normalizePhotoFacts, type NormalizedPhotoFacts } from "./schema";
import type { PhotoSubject } from "./subjects";

/** Con menos de dos fotos utilizables no hay nada que comparar: se anota y no se paga. */
export const MIN_USABLE_PHOTOS = 2;

export interface ModelAnswer {
  raw: unknown;
  model: string;
  costUsd: number;
  usage: ClaudeUsage;
}

export interface PhotoFactsRow {
  subject: PhotoSubject;
  sent: PreparedPhoto[];
  skipped: PhotoSkips;
  result: NormalizedPhotoFacts;
  answer: ModelAnswer;
}

export interface RunDeps {
  subjects: readonly PhotoSubject[];
  prepare: (subject: PhotoSubject) => Promise<{ photos: PreparedPhoto[]; skipped: PhotoSkips }>;
  ask: (subject: PhotoSubject, photos: PreparedPhoto[]) => Promise<ModelAnswer | null>;
  save: (row: PhotoFactsRow) => Promise<void>;
  fail: (subject: PhotoSubject, reason: "no_photos" | "no_answer" | "unreadable_answer", costUsd: number) => Promise<void>;
  max: number;
  /** Epoch ms: no se empieza un aviso después de esto. */
  deadline: number;
  monthlyUsd: number;
  /** Lo gastado este mes antes de la corrida. */
  spentUsd: number;
  now?: () => number;
  /**
   * ¿Hay una clave de Claude que pueda contestar ahora? Si no, una respuesta nula es culpa del
   * servicio (tres fallas seguidas, una clave apartada o en su tope), no del aviso.
   */
  modelAvailable?: () => boolean;
}

/** Tantas respuestas nulas seguidas son el servicio, no los avisos: la corrida corta. */
export const MAX_CONSECUTIVE_NO_ANSWER = 3;

export interface RunSummary {
  considered: number;
  read: number;
  noPhotos: number;
  failed: number;
  photosSent: number;
  resized: number;
  skipped: PhotoSkips;
  costUsd: number;
  cacheReadTokens: number;
  stop: "done" | "max" | "time" | "budget" | "model";
}

export async function runPhotoFacts(deps: RunDeps): Promise<RunSummary> {
  const now = deps.now ?? Date.now;
  const summary: RunSummary = {
    considered: 0, read: 0, noPhotos: 0, failed: 0, photosSent: 0, resized: 0,
    skipped: { small: 0, duplicate: 0, unreadable: 0, failed: 0 }, costUsd: 0, cacheReadTokens: 0, stop: "done",
  };
  let spent = deps.spentUsd;
  let noAnswerStreak = 0;
  const subjects = deps.subjects;
  let pending: Promise<{ photos: PreparedPhoto[]; skipped: PhotoSkips }> | null = subjects.length ? deps.prepare(subjects[0]) : null;
  for (let i = 0; i < subjects.length; i++) {
    const subject = subjects[i];
    if (summary.read + summary.failed >= deps.max) { summary.stop = "max"; break; }
    if (now() >= deps.deadline) { summary.stop = "time"; break; }
    if (spent >= deps.monthlyUsd) { summary.stop = "budget"; break; }
    const prepared = await pending!;
    pending = i + 1 < subjects.length ? deps.prepare(subjects[i + 1]) : null;
    summary.considered++;
    for (const key of Object.keys(summary.skipped) as Array<keyof PhotoSkips>) summary.skipped[key] += prepared.skipped[key];
    if (prepared.photos.length < MIN_USABLE_PHOTOS) {
      summary.noPhotos++;
      await deps.fail(subject, "no_photos", 0);
      continue;
    }
    const answer = await deps.ask(subject, prepared.photos);
    if (!answer) {
      // Sin modelo, el aviso no tiene la culpa: no se le anota una falla ni una espera.
      if (deps.modelAvailable && !deps.modelAvailable()) { summary.stop = "model"; break; }
      summary.failed++;
      await deps.fail(subject, "no_answer", 0);
      if (++noAnswerStreak >= MAX_CONSECUTIVE_NO_ANSWER) { summary.stop = "model"; break; }
      continue;
    }
    noAnswerStreak = 0;
    spent += answer.costUsd;
    summary.costUsd += answer.costUsd;
    summary.cacheReadTokens += answer.usage.cacheRead;
    const result = normalizePhotoFacts(answer.raw, prepared.photos.length);
    if (!result) {
      summary.failed++;
      await deps.fail(subject, "unreadable_answer", answer.costUsd);
      continue;
    }
    summary.read++;
    summary.photosSent += prepared.photos.length;
    summary.resized += prepared.photos.filter(photo => photo.resized).length;
    await deps.save({ subject, sent: prepared.photos, skipped: prepared.skipped, result, answer });
  }
  // A prefetch nobody will read must not leave an unhandled rejection behind.
  pending?.catch(() => undefined);
  summary.costUsd = Math.round(summary.costUsd * 1e6) / 1e6;
  return summary;
}
