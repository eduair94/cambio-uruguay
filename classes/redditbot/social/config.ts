// Los diales de los comentarios sin enlace.
//
// Hereda el interruptor del bot principal a propósito: `REDDIT_BOT_ENABLED=1` con
// `REDDIT_BOT_DRY_RUN=0` es la decisión explícita del operador de que ESTA cuenta puede escribir en
// Reddit, y no hay una segunda decisión que tomar acá. Lo que sí es propio es el freno: se apaga
// solo al llegar al karma objetivo, porque una cuenta que comenta chistes para siempre es
// exactamente lo que un sub identifica como granja.

const num = (name: string, fallback: number): number => {
  const raw = Number(process.env[name]);
  return Number.isFinite(raw) ? raw : fallback;
};

const list = (name: string, fallback: readonly string[]): string[] => {
  const raw = (process.env[name] || "").trim();
  return raw ? raw.split(",").map((s) => s.trim()).filter(Boolean) : [...fallback];
};

/** Los mismos subs que mira el bot de respuestas: el karma que sirve es el que se gana ahí. */
const DEFAULT_SUBS = ["uruguay", "Burises", "UruguayFinanzas", "LegalUruguay", "AskUruguayan", "monte_video", "CharruaDevs"];

export interface SocialConfig {
  enabled: boolean;
  dryRun: boolean;
  subs: string[];
  fetchLimit: number;
  /** Minutos antes de los cuales no se comenta: que los mods borren lo que iban a borrar. */
  minAgeMinutes: number;
  /**
   * Máximo en minutos. Corto a propósito: un comentario en un hilo de ayer no lo lee nadie, y el
   * punto de todo esto es que alguien lo vote.
   */
  maxAgeMinutes: number;
  /** Hilos con más comentarios que esto ya se llenaron; llegar decimoquinto no suma karma. */
  maxCommentsOnThread: number;
  maxPerDay: number;
  maxPerSubPerDay: number;
  minGapMinutes: number;
  authorCooldownHours: number;
  /**
   * Karma de comentarios a partir del cual esto se apaga.
   *
   * No es una meta de crecimiento: es el punto donde la cuenta deja de ser "cuenta nueva" para los
   * AutoModerator que la frenaban. Pasado eso, seguir comentando es riesgo sin beneficio.
   */
  karmaTarget: number;
  /** Comentarios borrados seguidos en un sub que lo dan por perdido. */
  subBlockStrikes: number;
  subBlockDays: number;
}

export function socialConfig(): SocialConfig {
  return {
    enabled: process.env.REDDIT_BOT_ENABLED === "1" && process.env.REDDIT_SOCIAL_ENABLED !== "0",
    dryRun: process.env.REDDIT_SOCIAL_DRY_RUN
      ? process.env.REDDIT_SOCIAL_DRY_RUN !== "0"
      : process.env.REDDIT_BOT_DRY_RUN !== "0",
    subs: list("REDDIT_SOCIAL_SUBS", DEFAULT_SUBS),
    fetchLimit: num("REDDIT_SOCIAL_FETCH_LIMIT", 25),
    minAgeMinutes: num("REDDIT_SOCIAL_MIN_AGE_MIN", 12),
    maxAgeMinutes: num("REDDIT_SOCIAL_MAX_AGE_MIN", 240),
    maxCommentsOnThread: num("REDDIT_SOCIAL_MAX_THREAD_COMMENTS", 25),
    maxPerDay: num("REDDIT_SOCIAL_MAX_PER_DAY", 5),
    maxPerSubPerDay: num("REDDIT_SOCIAL_MAX_PER_SUB_PER_DAY", 2),
    minGapMinutes: num("REDDIT_SOCIAL_MIN_GAP_MIN", 40),
    authorCooldownHours: num("REDDIT_SOCIAL_AUTHOR_COOLDOWN_HOURS", 48),
    karmaTarget: num("REDDIT_SOCIAL_KARMA_TARGET", 40),
    subBlockStrikes: num("REDDIT_SOCIAL_SUB_BLOCK_STRIKES", 2),
    subBlockDays: num("REDDIT_SOCIAL_SUB_BLOCK_DAYS", 7),
  };
}
