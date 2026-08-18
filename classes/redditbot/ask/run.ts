// Una pregunta por día en r/AskUruguayan.
//
// El orden importa y es el del pedido: primero se investiga, después se escribe. Se lee el sub
// entero que la API deja ver (nuevos, calientes, top del mes, top del año), se mira qué se está
// hablando en Uruguay esta semana con una búsqueda web de verdad, y recién con eso en la mano se
// piden tres preguntas candidatas. Cada candidata se mide contra los títulos que ya existen, y la
// primera que pasa se publica con el flair que el sub realmente ofrece.
//
// Escribir primero y preguntarse después si ya se hizo es el camino corto a publicar la pregunta
// obvia — que es obvia justamente porque el sub ya la contestó tres veces.

import { notifyAdmin } from "../../notify";
import { RedditSubmissionModel } from "../../models/RedditSubmission";
import { botConfig } from "../config";
import { fetchLinkFlairs, submitPost } from "../post";
import { composeAsk, type AskCandidate } from "./compose";
import { askConfig, type AskConfig } from "./config";
import { checkNovelty } from "./novelty";
import { currentTopics, readSubPulse } from "./research";
import { askRetryHint, validateAsk } from "./validate";

export interface AskSummary {
  researched: number;
  candidates: number;
  chosen: AskCandidate | null;
  novelty: number;
  flair: string;
  permalink: string;
  note: string;
  rejected: string[];
}

const DAY_MS = 24 * 60 * 60 * 1000;

/** Fecha de hoy en Montevideo, que es el "hoy" que importa para un sub uruguayo. */
export function todayInMontevideo(now: Date = new Date()): string {
  return new Intl.DateTimeFormat("es-UY", {
    timeZone: "America/Montevideo",
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(now);
}

async function postedRecently(cfg: AskConfig): Promise<boolean> {
  const since = new Date(Date.now() - cfg.minGapHours * 3_600_000);
  const row = await RedditSubmissionModel.findOne({ status: "posted", postedAt: { $gte: since } })
    .select({ _id: 1 })
    .lean();
  return !!row;
}

/** Todo lo que escribimos antes, salga o no: repetirnos a nosotros mismos es peor que repetir al sub. */
async function ourTitles(): Promise<string[]> {
  const rows = await RedditSubmissionModel.find({ createdAt: { $gte: new Date(Date.now() - 180 * DAY_MS) } })
    .select({ title: 1 })
    .lean<Array<{ title: string }>>();
  return rows.map((row) => row.title).filter(Boolean);
}

export async function runAskPass(cfg: AskConfig = askConfig()): Promise<AskSummary> {
  const rejected: string[] = [];
  const summary: AskSummary = {
    researched: 0,
    candidates: 0,
    chosen: null,
    novelty: 0,
    flair: "",
    permalink: "",
    note: "",
    rejected,
  };

  if (!cfg.enabled) return { ...summary, note: "apagado (REDDIT_ASK_ENABLED)" };
  if (await postedRecently(cfg)) return { ...summary, note: `ya publicamos hace menos de ${cfg.minGapHours} h` };

  // 1. El sub: qué se publicó, qué funcionó, qué reglas tiene, qué flairs usa la gente.
  const pulse = await readSubPulse(cfg.sub);
  summary.researched = pulse.titles.length;
  if (!pulse.titles.length) return { ...summary, note: "no se pudo leer el sub" };

  // 2. La calle: de qué se habla esta semana, buscado en la web.
  const today = todayInMontevideo();
  const topics = await currentTopics(today, cfg.model);

  // 3. Los flairs que el sub acepta hoy, por id — el texto no sirve para publicar.
  const flairs = await fetchLinkFlairs(cfg.sub, botConfig());

  const known = [...pulse.titles, ...(await ourTitles())];
  const ours = await ourTitles();

  let correction = "";
  for (let attempt = 0; attempt < cfg.maxAttempts; attempt++) {
    const candidates = await composeAsk(
      {
        sub: cfg.sub,
        pulse,
        topics,
        recent: pulse.titles,
        ours,
        availableFlairs: flairs.map((flair) => flair.text),
        today,
        correction: correction || undefined,
      },
      cfg.model
    );
    summary.candidates += candidates.length;
    if (!candidates.length) {
      rejected.push("el modelo no devolvió candidatas");
      break;
    }

    for (const candidate of candidates) {
      const check = validateAsk(candidate.title, candidate.body);
      if (!check.ok) {
        rejected.push(`${check.reason}: ${candidate.title.slice(0, 60)}`);
        correction = askRetryHint(check);
        continue;
      }

      const novelty = checkNovelty(candidate.title, known, cfg.noveltyLimit);
      if (!novelty.fresh) {
        rejected.push(`repetitivo (${novelty.score.toFixed(2)}): ${candidate.title.slice(0, 60)}`);
        correction = askRetryHint({
          ok: false,
          reason: "repetitive",
          detail: `se parece a "${novelty.nearest[0]?.title ?? ""}"`,
        });
        continue;
      }

      // Elegida. El flair se resuelve por texto exacto y, si no, por coincidencia parcial: el
      // modelo copia de la lista que le dimos, pero los mods a veces la cambian entre medio.
      const wanted = candidate.flair.toLowerCase().trim();
      const flair =
        flairs.find((f) => f.text.toLowerCase().trim() === wanted) ??
        flairs.find((f) => wanted && f.text.toLowerCase().includes(wanted)) ??
        null;

      summary.chosen = candidate;
      summary.novelty = novelty.score;
      summary.flair = flair?.text ?? "";

      const base = {
        sub: cfg.sub,
        title: candidate.title,
        body: candidate.body,
        flair: flair?.text ?? "",
        flairId: flair?.id ?? "",
        noveltyScore: novelty.score,
        nearestTitle: novelty.nearest[0]?.title ?? "",
        why: candidate.why,
        expectedAnswers: candidate.expectedAnswers,
        sourceTopics: topics.map((topic) => topic.topic),
      };

      if (cfg.dryRun) {
        await RedditSubmissionModel.create({ ...base, status: "dry_run", rejectReason: "ensayo" });
        return { ...summary, note: "ensayo: no se publicó nada" };
      }

      const submitted = await submitPost(cfg.sub, candidate.title, candidate.body, flair?.id ?? "", botConfig());
      if (!submitted) {
        await RedditSubmissionModel.create({ ...base, status: "failed", rejectReason: "Reddit rechazó el post" });
        return { ...summary, note: "Reddit rechazó el post" };
      }

      await RedditSubmissionModel.create({
        ...base,
        status: "posted",
        postId: submitted.id,
        fullname: submitted.fullname,
        permalink: submitted.permalink,
        postedAt: new Date(),
        visible: null,
      });
      summary.permalink = submitted.permalink;
      await notifyAdmin(
        `📌 *Post nuevo* en r/${cfg.sub}\n${candidate.title}\nnovedad ${novelty.score.toFixed(2)}\n${submitted.permalink}`
      );
      return { ...summary, note: `publicado en r/${cfg.sub}` };
    }
  }

  return { ...summary, note: "ninguna candidata pasó los filtros" };
}
