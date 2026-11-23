// Qué se hace con una cuenta después de leerla: publicarla, guardarla como curadora (sirve para
// descubrir otras), rechazarla o esperar. Sin IA: la clasificación es una entrada más.
//
// Tres reglas que vienen de otros directorios del sitio:
//  - la ausencia nunca es un veredicto: una lectura sin perfil no despublica nada (una cuenta
//    publicada que no se puede leer sigue, y su foto vence sola); "no existe" o "privada" tienen
//    que repetirse dos veces seguidas;
//  - precisión sobre recall en Uruguay: hace falta una marca uruguaya escrita o una fuente
//    uruguaya fuerte (ver `uruguay.ts`);
//  - nunca un veredicto de confianza: se rechaza por lo que la cuenta ES (personal, extranjera,
//    marca grande, rubro excluido, inactiva), no por si "parece confiable".
import type { Candidate, CandidateState, Classification, ProfileRead, SourceKind, SourceRef } from "./types";
import { textSaysUruguay, uruguayEvidence, type UruguayEvidence } from "./uruguay";

export const MIN_POSTS = 3;
// Dos años y no uno: Mondo Pop-up (las tarjetas pop-up del pedido original) no publica en Instagram
// desde enero de 2025 y sigue vendiendo en su tienda. Una cuenta quieta no daña a nadie si la ficha
// dice cuándo publicó por última vez, y el orden por defecto pone primero a las activas.
export const INACTIVE_DAYS = 730;
export const MAX_FOLLOWERS = 150_000;
/** Lecturas seguidas que dicen "no existe" o "privada" antes de creerles. */
export const GONE_STREAK = 2;

/** Fuentes que son uruguayas por sí mismas: la cuenta tiene evidencia de Uruguay por venir de ahí. */
const STRONG_SOURCES: ReadonlySet<SourceKind> = new Set(["uruguay-emprendedor", "semilla"]);
/**
 * Fuentes con contexto uruguayo, que alcanzan junto con un "sí" de la IA y sin marcas extranjeras.
 * La búsqueda web pide "de Uruguay" pero puede traer cuentas de la región: por eso es de las medias.
 */
const MEDIUM_SOURCES: ReadonlySet<SourceKind> = new Set(["reddit", "colaboracion", "mencion", "sugerencia", "web"]);

export interface Decision {
  state: CandidateState;
  reason: string;
  evidence: UruguayEvidence | null;
}

const DAY = 86_400_000;

export function lastPostDate(profile: ProfileRead): string | null {
  let last: string | null = null;
  for (const post of profile.posts) if (post.owner === profile.handle && post.date && (!last || post.date > last)) last = post.date;
  // Si ninguna foto propia trae fecha, se mira cualquiera de la grilla (las colaboraciones también son actividad).
  if (!last) for (const post of profile.posts) if (post.date && (!last || post.date > last)) last = post.date;
  return last;
}

export function uruguayVerdict(sources: readonly SourceRef[], evidence: UruguayEvidence, classification: Classification): { ok: boolean; why: string } {
  const kinds = new Set(sources.map(source => source.kind));
  const strong = [...kinds].some(kind => STRONG_SOURCES.has(kind));
  const medium = [...kinds].some(kind => MEDIUM_SOURCES.has(kind));
  if (textSaysUruguay(evidence)) return { ok: true, why: `texto: ${evidence.markers.slice(0, 3).join(", ")}` };
  if (strong && !(evidence.foreign.length && !evidence.markers.length && classification.uruguaya === "no")) return { ok: true, why: "fuente uruguaya" };
  if (medium && classification.uruguaya === "si" && !evidence.foreign.length) return { ok: true, why: "contexto uruguayo y la descripción lo confirma" };
  if (evidence.foreign.length && !evidence.markers.length) return { ok: false, why: `de otro país (${evidence.foreign.slice(0, 2).join(", ")})` };
  if (classification.uruguaya === "no") return { ok: false, why: "de otro país" };
  return { ok: false, why: "sin evidencia de que sea uruguaya" };
}

/**
 * El estado después de una lectura. `profile` es la lectura buena más reciente (puede ser de
 * antes); `read` es lo que contestó Instagram en ESTA corrida, si se leyó.
 */
export function decide(candidate: Pick<Candidate, "state" | "sources" | "goneStreak">, profile: ProfileRead | null, classification: Classification | null, now: Date): Decision {
  if (candidate.state === "baja") return { state: "baja", reason: "la cuenta pidió no aparecer", evidence: null };
  if (!profile) return { state: candidate.state, reason: "todavía sin leer", evidence: null };
  if (profile.status === "missing" || profile.status === "private") {
    if (candidate.goneStreak >= GONE_STREAK) {
      return profile.status === "missing" ? { state: "inexistente", reason: "Instagram dice que no existe", evidence: null } : { state: "privada", reason: "la cuenta es privada", evidence: null };
    }
    return { state: candidate.state, reason: `${profile.status === "missing" ? "no existe" : "privada"} (lectura ${candidate.goneStreak} de ${GONE_STREAK})`, evidence: null };
  }
  if (profile.status !== "ok") return { state: candidate.state, reason: "sin perfil en esta lectura", evidence: null };

  const evidence = uruguayEvidence(profile);
  const own = profile.posts.length;
  if (own < MIN_POSTS) return { state: "rechazada", reason: `sólo ${own} publicaciones`, evidence };
  const last = lastPostDate(profile);
  if (!last || now.getTime() - Date.parse(`${last}T12:00:00Z`) > INACTIVE_DAYS * DAY) {
    return { state: "inactiva", reason: last ? `no publica desde ${last}` : "sin fechas en la grilla", evidence };
  }
  if ((profile.followers ?? 0) > MAX_FOLLOWERS) return { state: "rechazada", reason: `marca grande (${profile.followers} seguidores)`, evidence };
  if (!classification) return { state: "pendiente", reason: "esperando clasificación", evidence };
  if (classification.riesgo) return { state: "rechazada", reason: `rubro excluido: ${classification.riesgo}`, evidence };

  const uy = uruguayVerdict(candidate.sources, evidence, classification);
  if (classification.tipo === "medio-o-comunidad" || classification.tipo === "tienda-colectiva") {
    return uy.ok ? { state: "curadora", reason: `${classification.tipo}: sirve para descubrir cuentas`, evidence } : { state: "rechazada", reason: `${classification.tipo} ${uy.why}`, evidence };
  }
  if (classification.tipo !== "emprendimiento") return { state: "rechazada", reason: `es ${classification.tipo}`, evidence };
  if (!classification.resumen) return { state: "pendiente", reason: "la descripción vino vacía", evidence };
  if (!uy.ok) return { state: "rechazada", reason: uy.why, evidence };
  return { state: "publicada", reason: uy.why, evidence };
}

/** La prioridad de lectura de una fuente: menor = antes. */
export const SOURCE_PRIORITY: Readonly<Record<SourceKind, number>> = Object.freeze({
  sugerencia: 0,
  semilla: 1,
  "uruguay-emprendedor": 2,
  reddit: 3,
  colaboracion: 4,
  web: 4,
  mencion: 5,
});

/** Las fotos firmadas vencen; una cuenta publicada se relee este margen antes de que venzan. */
export const PHOTO_MARGIN_MS = 36 * 3_600_000;
/** Y, aunque no venzan, cada tantos días (la bio, la grilla y los seguidores cambian). */
export const LISTED_REREAD_DAYS = 3;

/**
 * Cuándo hay que volver a leer una cuenta y con qué prioridad (menor = antes). `photosExpireAt`
 * es el vencimiento de la primera foto firmada de su última lectura buena.
 */
export function schedule(candidate: Pick<Candidate, "state" | "sources" | "lastReadAt" | "unreadableStreak" | "lastReadStatus">, photosExpireAt: number | null, now: Date): { dueAt: Date; priority: number } {
  const t = now.getTime();
  const read = candidate.lastReadAt ? Date.parse(candidate.lastReadAt) : null;
  const best = Math.min(...candidate.sources.map(source => SOURCE_PRIORITY[source.kind] ?? 9), 9);
  const after = (days: number): Date => new Date((read ?? t) + days * DAY);
  // Una lectura que no trajo perfil se reintenta con espera creciente (1, 2, 3… días, tope 7).
  if (read && candidate.lastReadStatus === "unreadable" && candidate.state !== "publicada") {
    // Sin racha (la corrida estaba limitada por Instagram, no es la cuenta): se reintenta en 3 horas.
    const days = candidate.unreadableStreak > 0 ? Math.min(7, candidate.unreadableStreak) : 0.125;
    return { dueAt: after(days), priority: 20 + best };
  }
  switch (candidate.state) {
    case "baja":
      return { dueAt: new Date(t + 3650 * DAY), priority: 99 };
    case "publicada": {
      const refresh = (read ?? t) + LISTED_REREAD_DAYS * DAY;
      const photos = photosExpireAt === null ? refresh : photosExpireAt - PHOTO_MARGIN_MS;
      return { dueAt: new Date(Math.min(refresh, photos)), priority: 10 };
    }
    case "pendiente":
      return read ? { dueAt: after(1), priority: 30 + best } : { dueAt: now, priority: best };
    case "curadora":
      return { dueAt: after(7), priority: 15 };
    case "inactiva":
    case "privada":
      return { dueAt: after(60), priority: 40 };
    case "inexistente":
      return { dueAt: after(120), priority: 50 };
    case "rechazada":
    default:
      return { dueAt: after(45), priority: 45 };
  }
}
