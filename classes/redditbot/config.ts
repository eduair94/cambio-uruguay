// Every knob of the Reddit bot, read from the environment at call time.
//
// Read at call time, never at import: the sync entrypoints run `dotenv.config()` themselves and a
// module-scope constant would freeze the value from before that ran — the same trap classes/
// reddit.ts documents for its own credentials.
//
// TWO GATES, deliberately. `REDDIT_BOT_ENABLED` is separate from the credentials because the
// credentials will be on the VPS before the bot is calibrated, and the day this file deploys must
// not be the day it starts talking to strangers. Same reasoning as `CONTENT_PROMO_ENABLED` in
// bots/: one gate would mean shipping the code IS shipping the behaviour.

import dotenv from "dotenv";

dotenv.config();

const num = (name: string, fallback: number): number => {
  const raw = Number(process.env[name]);
  return Number.isFinite(raw) && raw >= 0 ? raw : fallback;
};

/**
 * Lista de horas UTC (0..23) desde una variable tipo `3,4,5`.
 *
 * Una entrada fuera de rango se descarta en vez de tumbar la corrida: un `24` en el .env tiene que
 * costar esa hora, no el bot. Vacío explícito (`REDDIT_BOT_QUIET_HOURS_UTC=`) significa "ninguna",
 * que es cómo se apaga la puerta sin tocar el código.
 */
const hours = (name: string, fallback: readonly number[]): number[] => {
  const raw = process.env[name];
  if (raw === undefined) return [...fallback];
  return [
    ...new Set(
      raw
        .split(",")
        .map((s) => Number(s.trim()))
        .filter((n) => Number.isInteger(n) && n >= 0 && n <= 23)
    ),
  ].sort((a, b) => a - b);
};

const list = (name: string, fallback: readonly string[]): string[] => {
  const raw = (process.env[name] || "").trim();
  if (!raw) return [...fallback];
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
};

/**
 * The subreddits worth watching, as chosen for this bot.
 *
 * `monte_video` and not `Montevideo`: the latter is private and answers 403 to everything, which
 * this repo already learned the hard way while harvesting. `CharruaDevs` is the IT/salary sub — the
 * natural home of the take-home-pay calculator, monotributo and invoicing pages.
 *
 * ESTA LISTA YA ES "LOS SUBREDDITS URUGUAYOS", no una muestra. Se midieron 28 candidatos contra la
 * API el 2026-08-19 (suscriptores, tipo y hilos publicados en los últimos 7 días) y no hay ninguno
 * más que valga la pena: r/Montevideo y r/canelones contestan 403, r/uruguayos y r/futbol_uruguayo
 * no existen, y r/UruguayCrypto, r/PuntaDelEste, r/Maldonado, r/salto, r/MontevideoUY y compañía
 * tienen entre 0 y 337 suscriptores con CERO hilos en la semana. Agregar subs muertos no consigue
 * nada y multiplica las llamadas de la corrida, así que la respuesta a "¿por qué sólo siete?" es
 * que son siete.
 *
 * De los siete, los que de verdad se pueden escribir son cuatro: r/AskUruguayan baneó a la cuenta
 * anterior y r/CharruaDevs prohíbe bots por escrito (los dos los frena `subrules.ts`), y
 * r/UruguayFinanzas es `restricted` con cero actividad. Quedan r/uruguay, r/monte_video, r/Burises
 * y r/LegalUruguay, y ahí está el volumen: ~100+, ~100+, 89 y 8 hilos por semana.
 */
export const DEFAULT_SUBS = [
  "uruguay",
  "Burises",
  "UruguayFinanzas",
  "LegalUruguay",
  "AskUruguayan",
  "monte_video",
  "CharruaDevs",
] as const;

export interface BotConfig {
  enabled: boolean;
  dryRun: boolean;
  subs: string[];
  baseUrl: string;
  /** Posts fetched per subreddit per run. */
  fetchLimit: number;
  /**
   * Páginas de `/new` que se recorren por sub, de 100 hilos cada una.
   *
   * Existe porque la ventana pasó de horas a una semana. Con `maxAgeHours=8` una página sobraba;
   * con 168 no: r/uruguay y r/monte_video publican más de 100 hilos por semana, así que una sola
   * página deja afuera los días viejos SIN AVISAR — el bot ve el listado completo que le dieron y
   * concluye que no hay nada más. Cuatro páginas son 400 hilos, más de una semana de cualquier sub
   * uruguayo. `fetchNewPostsSince` corta antes en cuanto encuentra uno fuera de la ventana, así que
   * en régimen esto cuesta una sola página por sub.
   */
  fetchPages: number;
  /**
   * Cuántos comentarios puede publicar UNA corrida.
   *
   * Era 1, estructural, cuando el cron corría cada doce minutos: 65 oportunidades por día hacían
   * que "uno por corrida" no fuera un límite de volumen sino de ráfaga. Con el cron por hora, uno
   * por corrida es un techo de 15 por día que además se desperdicia entero cada vez que la única
   * candidata de la hora no pasa el juez. Sigue siendo un límite de RÁFAGA —entre uno y otro se
   * duerme `minGapMinutes` con jitter—, no de volumen: el volumen lo fijan `maxPerDay` y
   * `maxPerSubPerDay`, que se vuelven a chequear antes de cada comentario.
   */
  maxRepliesPerRun: number;
  /**
   * Horas UTC en las que no se publica, aunque el cron dispare.
   *
   * Uruguay es UTC−3. Un comentario a las 4 de la mañana no lo lee nadie y sí lo ve cualquiera que
   * mire el historial de la cuenta: el horario de publicación es de las señales más baratas de leer
   * y de las más difíciles de justificar. Por defecto calla entre las 03:00 y las 10:59 UTC, o sea
   * de medianoche a las 8 de la mañana uruguaya.
   */
  quietHoursUtc: number[];
  /**
   * How many screened threads may be embedded in one run.
   *
   * Query embeddings come out of the same daily Gemini allowance as the index (1 000 requests/day
   * on the free tier, measured). The bot fires 65 times a day, so an uncapped run on a busy morning
   * could spend the indexer's budget before lunch and leave the index permanently half-built. The
   * candidates that do not fit are picked by the lexical arm alone, which costs nothing, and the
   * rest simply wait for the next run twelve minutes later.
   */
  maxCandidatesPerRun: number;
  /**
   * Download and look at the image a post attached.
   *
   * On by default: a large share of these threads ARE the screenshot, and the title on those
   * ("me llegó esto, es normal?") carries almost nothing. Turn it off to save a vision call per
   * answer, at the cost of being blind to the actual question.
   */
  readImages: boolean;
  /**
   * Leer los comentarios que el hilo YA tiene, antes de redactar.
   *
   * Cuesta una llamada a la API por comentario publicado y compra las dos cosas que separan a un
   * habitué de un folleto: no repetir lo que ya está dicho, y corregir lo que está mal. El hilo que
   * originó todo esto lo muestra — la única respuesta que tenía afirmaba que Prex y Mercado Pago
   * comparten administradora de fondos, que es falso, y el bot no podía corregirlo porque no la
   * leía. Apagalo sólo para depurar. Ver `thread.ts` para por qué esos comentarios NO son evidencia.
   */
  readThreadComments: boolean;
  /**
   * Investigar afuera lo que la página no cubre, antes de redactar.
   *
   * Cuesta una llamada con búsqueda web por respuesta, y con seis respuestas por día eso es nada
   * frente a lo que compra: el primer comentario real salió cierto pero sin una sola cifra porque
   * la página no mencionaba el caso puntual que preguntaban. Apagalo sólo para depurar.
   */
  researchGaps: boolean;
  minAgeMinutes: number;
  maxAgeHours: number;
  maxPerDay: number;
  maxPerSubPerDay: number;
  minGapMinutes: number;
  authorCooldownDays: number;
  pageCooldownDays: number;
  /**
   * Best-chunk cosine the winning page must clear. This is the primary semantic gate: it is on a
   * 0..1 scale that means something on its own, unlike the fused RRF score.
   */
  minCosine: number;
  /**
   * How decisively the winner must beat the runner-up (score ratio).
   *
   * The absolute RRF score is NOT usable as a threshold and an early version of this config tried:
   * with k=60 the theoretical maximum for a page that tops both arms is 2/61 ≈ 0.033, so a
   * plausible-looking `0.034` would have silenced the bot permanently while looking like a tuned
   * value. What the fused score IS good for is comparison, so the gate compares: "did one page
   * clearly win, or did five pages tie?" A tie means the question is about a subject we cover
   * rather than a question we answer, which is exactly the case for a content gap.
   */
  minMargin: number;
  /**
   * Cosine above which the margin check is waived and the judge decides.
   *
   * A tie between two pages means "we cover this without answering it" only when the match is
   * mediocre. Above this, a tie means the site answers the question from two angles — measured:
   * "¿monotributo o unipersonal?" hits 0.741 with a 1.04 margin because two real pages cover it.
   */
  strongCosine: number;
  /** Judge confidence, 0..1. */
  minJudge: number;
  /** Consecutive bad outcomes within 24 h that trip the breaker. */
  breakerNegatives: number;
  breakerPauseHours: number;
  /**
   * Exigir que la BIO de la cuenta diga que es un bot antes de publicar.
   *
   * La aclaración de que esto es un bot vive en el perfil, no al pie de cada comentario — decisión
   * tomada y ya discutida. Lo que esta bandera evita es que "vive en el perfil" se convierta en "no
   * vive en ningún lado" el día que alguien edita la bio, cambia de cuenta o crea una nueva: si la
   * descripción pública no lo dice, no se publica. Es la única forma de que una promesa que vive
   * afuera del repositorio sea verificable desde adentro.
   */
  requireBioDisclosure: boolean;
  username: string;
  password: string;
  clientId: string;
  clientSecret: string;
  refreshToken: string;
  userAgent: string;
}

export function botConfig(): BotConfig {
  const username = (process.env.REDDIT_BOT_USERNAME || "").trim();
  return {
    enabled: process.env.REDDIT_BOT_ENABLED === "1",
    // Default TRUE. An unset variable must mean "say nothing", never "post to r/uruguay".
    dryRun: process.env.REDDIT_BOT_DRY_RUN !== "0",
    subs: list("REDDIT_BOT_SUBS", DEFAULT_SUBS),
    baseUrl: (process.env.SITE_BASE_URL || "https://cambio-uruguay.com").replace(/\/+$/, ""),
    fetchLimit: num("REDDIT_BOT_FETCH_LIMIT", 50),
    fetchPages: num("REDDIT_BOT_FETCH_PAGES", 4),
    maxRepliesPerRun: Math.max(1, num("REDDIT_BOT_MAX_PER_RUN", 5)),
    quietHoursUtc: hours("REDDIT_BOT_QUIET_HOURS_UTC", [3, 4, 5, 6, 7, 8, 9, 10]),
    // 40, no 12. El tope existe por el cupo diario de embeddings, y ese cupo se reparte entre 65
    // corridas cuando el cron era cada doce minutos y entre 15 ahora que es por hora: el mismo
    // presupuesto diario repartido en cuatro veces menos corridas es cuatro veces más por corrida.
    // Además la ventana es de una semana, así que la PRIMERA corrida ve el atraso entero de golpe.
    maxCandidatesPerRun: num("REDDIT_BOT_MAX_CANDIDATES", 40),
    readImages: process.env.REDDIT_BOT_READ_IMAGES !== "0",
    readThreadComments: process.env.REDDIT_BOT_READ_THREAD !== "0",
    researchGaps: process.env.REDDIT_BOT_RESEARCH_GAPS !== "0",
    minAgeMinutes: num("REDDIT_BOT_MIN_AGE_MIN", 15),
    // Una semana. Era 8 h, que es la ventana de "contestar mientras el hilo está vivo" y deja fuera
    // todo lo que se preguntó ayer — que es la mayor parte de lo que hay para contestar. Un hilo de
    // tres días con dos comentarios sigue recibiendo lectores por búsqueda durante años; el costo de
    // llegar tarde es que vota menos gente, no que no sirva.
    maxAgeHours: num("REDDIT_BOT_MAX_AGE_HOURS", 168),
    maxPerDay: num("REDDIT_BOT_MAX_PER_DAY", 25),
    maxPerSubPerDay: num("REDDIT_BOT_MAX_PER_SUB_PER_DAY", 8),
    minGapMinutes: num("REDDIT_BOT_MIN_GAP_MIN", 8),
    authorCooldownDays: num("REDDIT_BOT_AUTHOR_COOLDOWN_DAYS", 7),
    // CERO: el enfriamiento por página está apagado, por decisión explícita al elegir el volumen.
    //
    // Vale la pena escribir qué se apagó. Con una ventana de una semana este freno pasó a ser el
    // que más rechaza —los hilos que el sitio contesta se agrupan por tema, así que ocho preguntas
    // de aduana en la semana son ocho candidatas a la misma página— y con tres días la mayoría de
    // esas ocho quedaban sin respuesta posible. Apagarlo es lo que hace que 25 por día sean
    // alcanzables de verdad.
    //
    // Lo que NO queda apagado es el peor patrón que este freno evitaba: el mismo enlace varias
    // veces en la misma hora. Eso ahora lo impide `run.ts`, que no repite página dentro de una
    // corrida. Volumen igual, sin la firma.
    //
    // Si algún día un moderador comenta que ve el mismo enlace repetido, ésta es la primera perilla.
    pageCooldownDays: num("REDDIT_BOT_PAGE_COOLDOWN_DAYS", 0),
    minCosine: num("REDDIT_BOT_MIN_COSINE", 0.62),
    minMargin: num("REDDIT_BOT_MIN_MARGIN", 1.12),
    strongCosine: num("REDDIT_BOT_STRONG_COSINE", 0.72),
    minJudge: num("REDDIT_BOT_MIN_JUDGE", 0.7),
    breakerNegatives: num("REDDIT_BOT_BREAKER_NEGATIVES", 3),
    breakerPauseHours: num("REDDIT_BOT_BREAKER_PAUSE_HOURS", 48),
    requireBioDisclosure: process.env.REDDIT_BOT_REQUIRE_BIO_DISCLOSURE !== "0",
    username,
    password: process.env.REDDIT_BOT_PASSWORD || "",
    clientId: (process.env.REDDIT_BOT_CLIENT_ID || "").trim(),
    clientSecret: (process.env.REDDIT_BOT_CLIENT_SECRET || "").trim(),
    refreshToken: (process.env.REDDIT_BOT_REFRESH_TOKEN || "").trim(),
    userAgent:
      (process.env.REDDIT_BOT_USER_AGENT || "").trim() ||
      `nodejs:cambio-uruguay-bot:v1.0 (by /u/${username || "cambio_uruguay"})`,
  };
}

/** True when the bot has what it needs to authenticate as a user and post. */
export function botCredentialsPresent(cfg: BotConfig = botConfig()): boolean {
  if (!cfg.clientId || !cfg.clientSecret) return false;
  return Boolean(cfg.refreshToken || (cfg.username && cfg.password));
}

/** True when the bot is allowed to actually send a comment. Everything else is a rehearsal. */
export function canPost(cfg: BotConfig = botConfig()): boolean {
  return cfg.enabled && !cfg.dryRun && botCredentialsPresent(cfg);
}
