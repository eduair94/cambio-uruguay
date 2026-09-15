// Lotes a Gemini con la rúbrica. Un lote que falla deja sus ítems SIN etiqueta: la corrida
// siguiente los vuelve a intentar (siguen dentro de la ventana de dos meses). Nunca se inventa.
import { askJSON } from "../gemini";
import { COMMENT_SCHEMA, POST_SCHEMA, RUBRIC, normalizeLabel, renderCommentsPrompt, renderPostsPrompt } from "./rubric";
import type { ThreadInfo } from "./rubric";
import type { ArcticComment, ArcticPost, Kind, Label } from "./types";

export const CLASSIFIER_MODEL = (process.env.CHARRUADEVS_MODEL || "gemini-3.5-flash-lite").trim();
const POSTS_PER_CALL = 40;
const COMMENTS_PER_CALL = 60;
const CONCURRENCY = 4;

async function pool<T>(items: T[], n: number, fn: (x: T) => Promise<void>): Promise<void> {
  let i = 0;
  await Promise.all(
    Array.from({ length: Math.min(n, items.length) }, async () => {
      while (i < items.length) await fn(items[i++]);
    })
  );
}

function chunks<T>(list: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < list.length; i += size) out.push(list.slice(i, i + size));
  return out;
}

async function run(kind: Kind, batches: Array<{ ids: string[]; prompt: string }>): Promise<Map<string, Label>> {
  const labels = new Map<string, Label>();
  await pool(batches, CONCURRENCY, async (b) => {
    const res = await askJSON<{ items?: unknown[] }>(b.prompt, kind === "post" ? POST_SCHEMA : COMMENT_SCHEMA, {
      system: RUBRIC,
      model: CLASSIFIER_MODEL,
    });
    const wanted = new Set(b.ids);
    for (const raw of res?.items ?? []) {
      const id = (raw as { id?: unknown } | null)?.id;
      if (typeof id !== "string" || !wanted.has(id) || labels.has(id)) continue;
      const label = normalizeLabel(raw, kind);
      if (label) labels.set(id, label);
    }
  });
  return labels;
}

export function classifyPosts(
  posts: Array<Pick<ArcticPost, "id" | "created_utc" | "title" | "selftext" | "link_flair_text">>
): Promise<Map<string, Label>> {
  return run(
    "post",
    chunks(posts, POSTS_PER_CALL).map((b) => ({ ids: b.map((p) => p.id), prompt: renderPostsPrompt(b) }))
  );
}

export function classifyComments(
  comments: Array<Pick<ArcticComment, "id" | "link_id" | "parent_id" | "created_utc" | "body">>,
  threads: Map<string, ThreadInfo>,
  parents: Map<string, string>
): Promise<Map<string, Label>> {
  const sorted = [...comments].sort((a, b) =>
    a.link_id < b.link_id ? -1 : a.link_id > b.link_id ? 1 : a.created_utc - b.created_utc
  );
  return run(
    "comment",
    chunks(sorted, COMMENTS_PER_CALL).map((b) => ({
      ids: b.map((c) => c.id),
      prompt: renderCommentsPrompt(b, threads, parents),
    }))
  );
}
