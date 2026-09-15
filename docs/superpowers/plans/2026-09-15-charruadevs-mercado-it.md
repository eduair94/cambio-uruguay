# Termómetro del mercado IT (r/CharruaDevs) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Publicar `/mercado-it-uruguay`: el análisis de sentimiento de r/CharruaDevs (gráficos + buscador con filtros) alimentado por un job diario que mantiene el corpus clasificado en la base del app.

**Architecture:** Job raíz `currency-charruadevs` (Arctic Shift → filtro → Gemini con esquema JSON vía `classes/gemini.ts` → votos vía Reddit → snapshot) escribe `charruadevstexts` y `charruadevssnapshots` en APP DB. El app sirve `/api/charruadevs/summary` (snapshot) y `/api/charruadevs/search` (`$text` en español + filtros + facetas) a una página con gráficos chart.js y buscador cuya URL es el estado.

**Tech Stack:** TS 4.9 CommonJS + mongoose 6 + vitest 4 (raíz); Nuxt 4 + Vuetify 4.1.5 + chart.js 4 + vitest (app).

**Spec:** `docs/superpowers/specs/2026-09-15-charruadevs-mercado-it-design.md`

## Global Constraints

- Worktree: `C:/Users/airau/Documents/GitHub/cambio-uruguay/.claude/worktrees/charruadevs`, rama `feat/charruadevs-mercado-it`. Nunca trabajar en el root compartido.
- Sólo `classes/gemini.ts` contiene `generativelanguage.googleapis.com` (`tests/gemini_key_ownership.test.ts`).
- Todo `dist/sync_*.js` del ecosystem va en `OTHER_APPS` de `scripts/deploy-backend.sh`; cron con `autorestart: false` (`tests/sync/pm2_registration.test.ts`).
- Los módulos nuevos no importan `classes/database.ts` (sólo APP DB vía `classes/appdb.ts`).
- Modelos APP DB: espejo backend (`classes/models/*`, `appModel`) + app (`app/server/models/*`) con los mismos campos top-level; el app schema con campos a 4 espacios y cierre `\n  },` (`tests/appdb/schema_parity.test.ts`).
- API del app: lee Mongo por pedido, cache en la capa HTTP (`setResponseHeader(... 'cache-control' ...)`), nunca `defineCachedEventHandler`.
- Página: raíz `VContainer`, un solo `<h1>`, `useSeoMeta` + `rel: 'canonical'` (comillas simples) + `application/ld+json` + `defineOgImageComponent('Cambio', …)`; nada de `VChip` dentro de `<p>`; componentes de `components/charts/` importados explícitos; gráficos en `<ClientOnly>` con `VSkeletonLoader` de fallback.
- Ningún nombre de usuario se guarda ni se muestra. Lo borrado hoy en Reddit (`gone: true`) no aparece en buscador ni citas.
- Mensajes i18n sin `|`.
- Modelo clasificador: `gemini-3.5-flash-lite` (env `CHARRUADEVS_MODEL` lo cambia).

## File Structure

Backend (raíz):
- `classes/charruadevs/types.ts` — constantes (temas, eventos…) y tipos compartidos.
- `classes/charruadevs/filter.ts` — qué comentario es candidato, qué hilo es "de mercado", qué texto está borrado.
- `classes/charruadevs/rubric.ts` — rúbrica, esquemas JSON, render de prompts, `normalizeLabel`.
- `classes/charruadevs/lexicon.ts` — frases de alarma (control sin IA).
- `classes/charruadevs/analyze.ts` — filas → snapshot (puro).
- `classes/charruadevs/fred.ts` — serie Indeed (FRED) → puntos mensuales.
- `classes/charruadevs/harvest.ts` — Arctic Shift por rango.
- `classes/charruadevs/classify.ts` — lotes a Gemini.
- `classes/charruadevs/validation.ts` — resultado de la validación ciega (constante fechada).
- `classes/charruadevs/store.ts` — lecturas/escrituras APP DB.
- `classes/charruadevs/refresh.ts` — orquestación (+ `--seed`).
- `classes/models/CharruaText.ts`, `classes/models/CharruaSnapshot.ts`.
- `sync_charruadevs.ts` — entrada pm2.
- Modifica: `classes/gemini.ts` (+`askJSON`), `classes/reddit.ts` (+`fetchInfoLive`), `ecosystem.config.js`, `scripts/deploy-backend.sh`, `package.json`, `AGENTS.md`, `classes/AGENTS.md`, `tests/appdb/schema_parity.test.ts`, `tests/gemini.test.ts`.
- Tests: `tests/charruadevs/{filter,rubric,lexicon,analyze,fred,harvest,classify,refresh}.test.ts`.
- Doc: `docs/app/CHARRUADEVS.md`.

App:
- `app/utils/charruadevs.ts` — tipos del snapshot, etiquetas, query de búsqueda (normalizar/serializar), resaltado, contexto fechado.
- `app/server/utils/charruadevsSearch.ts` — `$match`/orden/extracto (puro).
- `app/server/models/CharruaText.ts`, `app/server/models/CharruaSnapshot.ts`.
- `app/server/api/charruadevs/summary.get.ts`, `app/server/api/charruadevs/search.get.ts`.
- `app/components/mercadoIt/{LikertChart,ThemesTable,QuoteCard,SearchPanel,ResultCard}.vue`.
- `app/pages/mercado-it-uruguay.vue`.
- Modifica: `app/utils/siteNav.ts`, `app/i18n/locales/json/{es,en,pt}.json`.
- Tests: `app/tests/unit/charruadevs.test.ts`, `app/tests/unit/charruadevsSearch.test.ts`.

---

### Task 1: Tipos, filtro y rúbrica (puros)

**Files:**
- Create: `classes/charruadevs/types.ts`, `classes/charruadevs/filter.ts`, `classes/charruadevs/rubric.ts`
- Test: `tests/charruadevs/filter.test.ts`, `tests/charruadevs/rubric.test.ts`

**Interfaces:**
- Produces: `SUB`, `THEMES`, `RATE_THEMES`, `AI_VIEWS`, `EVENTS`, `PERSONAS`, `LEX_KEYS`, tipos `Theme`, `AiView`, `LifeEvent`, `Persona`, `Kind`, `Label`, `CharruaText`, `MonthRow`, `HarvestState`; `isGone(s)`, `isMarketThread(title, text)`, `isCandidateComment(c, threadIsMarket)`; `RUBRIC`, `POST_SCHEMA`, `COMMENT_SCHEMA`, `normalizeLabel(raw, kind)`, `renderPostsPrompt(posts)`, `renderCommentsPrompt(comments, threads, parents)`.

- [ ] **Step 1: tests que fallan**

`tests/charruadevs/filter.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import { isCandidateComment, isGone, isMarketThread } from "../../classes/charruadevs/filter";

describe("charruadevs filter", () => {
  it("treats deleted/removed/empty as gone", () => {
    expect(isGone("[removed]")).toBe(true);
    expect(isGone("[deleted]")).toBe(true);
    expect(isGone("")).toBe(true);
    expect(isGone(undefined)).toBe(true);
    expect(isGone("hola")).toBe(false);
  });
  it("recognises a market thread by title or text", () => {
    expect(isMarketThread("¿Cómo ven el mercado IT para 2026?", "")).toBe(true);
    expect(isMarketThread("Duda con React", "tengo un bug en useEffect")).toBe(false);
  });
  it("a comment is a candidate by its own words or by its thread", () => {
    expect(isCandidateComment({ body: "no hay laburo para juniors", author: "x" }, false)).toBe(true);
    expect(isCandidateComment({ body: "usá un Map en vez de un objeto", author: "x" }, false)).toBe(false);
    expect(isCandidateComment({ body: "usá un Map en vez de un objeto", author: "x" }, true)).toBe(true);
  });
  it("never picks bots, gone or tiny comments", () => {
    expect(isCandidateComment({ body: "no hay laburo, gente", author: "AutoModerator" }, true)).toBe(false);
    expect(isCandidateComment({ body: "[removed]", author: "x" }, true)).toBe(false);
    expect(isCandidateComment({ body: "jaja", author: "x" }, true)).toBe(false);
  });
});
```

`tests/charruadevs/rubric.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import { normalizeLabel, renderCommentsPrompt, renderPostsPrompt, POST_SCHEMA, COMMENT_SCHEMA } from "../../classes/charruadevs/rubric";

describe("charruadevs rubric", () => {
  it("keeps a valid post label", () => {
    expect(
      normalizeLabel({ id: "a", rel: true, stance: -1, themes: ["ia", "junior"], ai: "amenaza", event: "busca", persona: "junior" }, "post")
    ).toEqual({ rel: true, stance: -1, themes: ["ia", "junior"], ai: "amenaza", event: "busca", persona: "junior" });
  });
  it("clamps stance, drops unknown themes and caps them at three", () => {
    const out = normalizeLabel({ id: "a", rel: true, stance: -7, themes: ["ia", "x", "sueldos", "exterior", "junior"], ai: "nope", event: "?" }, "comment");
    expect(out).toEqual({ rel: true, stance: -2, themes: ["ia", "sueldos", "exterior"], ai: null, event: "ninguno" });
  });
  it("an off-topic label has no stance", () => {
    expect(normalizeLabel({ id: "a", rel: false, stance: 1, themes: [], ai: null, event: "ninguno" }, "comment")?.stance).toBeNull();
  });
  it("rejects garbage", () => {
    expect(normalizeLabel(null, "post")).toBeNull();
    expect(normalizeLabel({ id: "a", rel: "yes" }, "post")).toBeNull();
    expect(normalizeLabel({ id: "a", rel: true, stance: "muy mal" }, "post")).toBeNull();
  });
  it("renders one line per item with the id the model must echo", () => {
    const p = renderPostsPrompt([{ id: "p1", created_utc: 1704067200, title: "No hay laburo", selftext: "[removed]", link_flair_text: "Pregunta" }]);
    expect(p).toContain("id: p1");
    expect(p).toContain("2024-01");
    expect(p).not.toContain("[removed]");
    const c = renderCommentsPrompt(
      [{ id: "c1", link_id: "t3_p1", parent_id: "t1_c0", created_utc: 1704067200, body: "coincido" }],
      new Map([["p1", { title: "No hay laburo", month: "2024-01", flair: "Pregunta" }]]),
      new Map([["c0", "el mercado está muerto"]])
    );
    expect(c).toContain("HILO p1");
    expect(c).toContain('responde a: "el mercado está muerto"');
    expect(c).toContain("id: c1");
  });
  it("schemas require the id and the label fields", () => {
    expect(POST_SCHEMA.properties.items.items.required).toContain("persona");
    expect(COMMENT_SCHEMA.properties.items.items.required).toEqual(["id", "rel", "stance", "themes", "ai", "event"]);
  });
});
```

- [ ] **Step 2: correr y ver que fallan**

Run: `npx vitest run tests/charruadevs/filter.test.ts tests/charruadevs/rubric.test.ts`
Expected: FAIL (módulos inexistentes).

- [ ] **Step 3: implementar**

`classes/charruadevs/types.ts`:
```ts
// Tipos y constantes del termómetro de r/CharruaDevs (job currency-charruadevs → /mercado-it-uruguay).
export const SUB = "CharruaDevs";

export const THEMES = [
  "ia", "despidos", "busqueda", "junior", "sueldos", "dolar_costos", "exterior", "saturacion",
  "entrevistas", "estudio", "condiciones", "emigrar", "empresas_uy", "emprender", "otro",
] as const;
export type Theme = (typeof THEMES)[number];
/** Los temas que se miden: "otro" no dice nada de la conversación. */
export const RATE_THEMES: readonly Theme[] = THEMES.filter((t) => t !== "otro");

export const AI_VIEWS = ["amenaza", "herramienta", "hype", "mixto"] as const;
export type AiView = (typeof AI_VIEWS)[number];

export const EVENTS = ["busca", "consiguio", "despedido", "contrata", "ninguno"] as const;
export type LifeEvent = (typeof EVENTS)[number];

export const PERSONAS = ["estudiante", "junior", "semisenior", "senior", "empresa_reclutador", "cambio_carrera", "desconocido"] as const;
export type Persona = (typeof PERSONAS)[number];

export type Kind = "post" | "comment";

export interface Label {
  rel: boolean;
  stance: number | null;
  themes: Theme[];
  ai: AiView | null;
  event: LifeEvent;
  persona?: Persona;
}

/** Un documento de `charruadevstexts`. */
export interface CharruaText {
  rid: string;
  kind: Kind;
  thread: string;
  title: string;
  body: string;
  createdAt: Date;
  month: string;
  score: number;
  comments?: number;
  flair?: string | null;
  rel: boolean;
  stance: number | null;
  themes: Theme[];
  ai: AiView | null;
  event: LifeEvent;
  persona?: Persona;
  gone: boolean;
  url: string;
  model: string;
}

export const LEX_KEYS = ["no_hay_laburo", "saturado", "despidos", "reemplazo_ia", "ia_menciones", "optimismo"] as const;
export type LexKey = (typeof LEX_KEYS)[number];

/** Una fila mensual que el job no puede recalcular sin volver a bajar el mes entero. */
export interface MonthRow {
  m: string;
  posts: number;
  comments: number;
  candidates: number;
  classified: number;
  lex: Record<LexKey, number>;
  lexN: number;
}

export interface HarvestState {
  months: MonthRow[];
  seededAt?: string;
  lastRunAt?: string;
}

/** Forma cruda de Arctic Shift (sólo los campos que usamos). */
export interface ArcticPost {
  id: string;
  created_utc: number;
  title: string;
  selftext?: string;
  author?: string;
  score?: number;
  num_comments?: number;
  link_flair_text?: string | null;
  permalink?: string;
  removed_by_category?: string | null;
}
export interface ArcticComment {
  id: string;
  link_id: string;
  parent_id?: string;
  created_utc: number;
  body: string;
  author?: string;
  score?: number;
}
```

`classes/charruadevs/filter.ts`:
```ts
// Qué entra al corpus. Todos los posts se clasifican; de los comentarios, sólo los "candidatos":
// los que usan palabras de trabajo/mercado o cuelgan de un hilo que es de mercado. Medido sobre el
// historial completo: 140k de 207k comentarios pasan; el resto es charla técnica pura.
const KEYWORDS =
  /(\bIA\b|\bAI\b|inteligencia artificial|chatgpt|gpt|copilot|claude|cursor|llm|vibe ?cod|agente|laburo|trabaj|mercado|junior|senior|trainee|sueldo|salari|pagan|cobr|tarifa|despid|layoff|recort|echar|contrat|busc|entrevist|oferta|postul|ghost|saturad|futuro|reemplaz|carrera|estudi|facultad|fing|ort|bootcamp|contractor|exterior|afuera|remoto|d[oó]lar|usd|u\$s|crisis|burbuja|freelance|empleo|desemple|rubro|industria|profesi[oó]n|irse|emigr|burnout|quemad)/i;
const MARKET_THREAD =
  /(laburo|trabaj|mercado|junior|senior|trainee|sueldo|salari|despid|layoff|contrat|entrevist|oferta|carrera|estudi|facultad|contractor|exterior|remoto|empleo|\bIA\b|\bAI\b|chatgpt|futuro|rubro|industria|profesi|pagan|cobr)/i;

export function isGone(s: string | null | undefined): boolean {
  return !s || s === "[removed]" || s === "[deleted]";
}

export function isMarketThread(title: string, text: string | null | undefined): boolean {
  return MARKET_THREAD.test(`${title || ""} ${text || ""}`);
}

export function isCandidateComment(c: { body: string; author?: string }, threadIsMarket: boolean): boolean {
  if (isGone(c.body) || /^AutoModerator$/i.test(c.author || "")) return false;
  const body = c.body.trim();
  if (body.length < 12) return false;
  return KEYWORDS.test(body) || threadIsMarket;
}
```

`classes/charruadevs/rubric.ts`:
```ts
// La rúbrica y los esquemas con los que Gemini clasifica. Es la misma que produjo el corpus
// sembrado (validada a ciegas, ver validation.ts): cambiarla cambia la serie, así que un cambio acá
// es un cambio de metodología y va con fecha en docs/app/CHARRUADEVS.md.
import { AI_VIEWS, EVENTS, PERSONAS, THEMES } from "./types";
import type { AiView, ArcticComment, ArcticPost, Kind, Label, LifeEvent, Persona, Theme } from "./types";
import { isGone } from "./filter";

export const RUBRIC = `Sos analista de un estudio sobre r/CharruaDevs, el subreddit de desarrolladores de software de Uruguay (español rioplatense: "laburo" = trabajo, "gurises" = chicos, "burises", "IA", "contractor" = trabaja facturando para afuera, "SAS"/"unipersonal" = forma de facturar).

Objetivo: medir QUÉ TAN NEGATIVA es la visión sobre el FUTURO/PRESENTE DEL DESARROLLO DE SOFTWARE COMO PROFESIÓN Y MERCADO LABORAL (en Uruguay o en general).

Para cada ítem devolvé:
- rel: true SOLO si el texto expresa o pregunta algo sobre el mercado laboral IT, conseguir/perder trabajo, sueldos/tarifas, trabajar para el exterior, la carrera o si conviene estudiar programación, el efecto de la IA sobre el trabajo de los devs, despidos, condiciones laborales, la industria IT uruguaya o el futuro de la profesión. false para dudas técnicas puras, proyectos, hardware, humor sin relación, cursos puntuales sin opinión sobre la carrera, etc.
- stance (entero o null; null si rel=false): la postura sobre las perspectivas de la profesión/mercado que EXPRESA el autor:
  -2 = catastrofista ("se terminó", "no estudies programación", "la IA nos reemplaza a todos", "no hay laburo para nadie")
  -1 = pesimista o preocupado ("está difícil", "el mercado está muerto para juniors", "cada vez pagan menos", frustración o angustia por no conseguir)
   0 = neutral, mixto, puramente informativo, o una pregunta sin postura
  +1 = optimista ("hay laburo si sabés", "sigue siendo buena carrera", "conseguí rápido")
  +2 = muy optimista ("nunca estuvo mejor", "sobra trabajo")
  Ojo con sarcasmo e ironía rioplatense: puntuá lo que el autor realmente cree. Una pregunta ansiosa ("¿vale la pena seguir estudiando si la IA...?") es -1, no 0. Una oferta de empleo sin opinión es 0.
- themes: 0 a 3 temas de esta lista que realmente trate: ia (IA/automatización y el trabajo), despidos (despidos, recortes, empresas que cierran o congelan contrataciones), busqueda (buscar trabajo, postulaciones, ghosting, tiempo sin conseguir), junior (entrada al mercado, primer empleo, trainees), sueldos (salarios, aumentos, tarifas), dolar_costos (dólar, costo de vida, impuestos/IRPF/BPS que afectan el ingreso), exterior (trabajar para afuera, contractor, remoto, clientes extranjeros), saturacion (demasiados devs, bootcamps, competencia de otros países), entrevistas (procesos de selección, pruebas técnicas, exigencias), estudio (facultad, carreras, cursos, si conviene estudiar), condiciones (burnout, estrés, maltrato, ambiente), emigrar (irse del país), empresas_uy (empresas locales concretas y su situación), emprender (freelance, productos propios), otro.
- ai (string o null): SOLO si el texto habla de IA: "amenaza" (va a reemplazar o reducir puestos), "herramienta" (ayuda/productividad, no reemplaza), "hype" (exagerada, burbuja), "mixto". null si no habla de IA.
- event: lo que el AUTOR cuenta de sí mismo: "busca" (está buscando y le cuesta/no consigue o pide ayuda para conseguir), "consiguio" (consiguió trabajo/oferta/aumento), "despedido" (lo echaron a él o a su equipo), "contrata" (ofrece un puesto o su empresa busca gente), "ninguno".`;

const ITEM_PROPS = {
  id: { type: "STRING" },
  rel: { type: "BOOLEAN" },
  stance: { type: "INTEGER", nullable: true },
  themes: { type: "ARRAY", items: { type: "STRING", enum: [...THEMES] } },
  ai: { type: "STRING", enum: [...AI_VIEWS], nullable: true },
  event: { type: "STRING", enum: [...EVENTS] },
};
export const POST_SCHEMA = {
  type: "OBJECT",
  properties: {
    items: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: { ...ITEM_PROPS, persona: { type: "STRING", enum: [...PERSONAS] } },
        required: ["id", "rel", "stance", "themes", "ai", "event", "persona"],
        propertyOrdering: ["id", "rel", "stance", "themes", "ai", "event", "persona"],
      },
    },
  },
  required: ["items"],
};
export const COMMENT_SCHEMA = {
  type: "OBJECT",
  properties: {
    items: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: ITEM_PROPS,
        required: ["id", "rel", "stance", "themes", "ai", "event"],
        propertyOrdering: ["id", "rel", "stance", "themes", "ai", "event"],
      },
    },
  },
  required: ["items"],
};

const oneOf = <T extends string>(list: readonly T[], v: unknown): T | null =>
  typeof v === "string" && (list as readonly string[]).includes(v) ? (v as T) : null;

/** Una etiqueta cruda del modelo → etiqueta válida, o null si no se puede confiar en ella. */
export function normalizeLabel(raw: unknown, kind: Kind): Label | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  if (typeof r.rel !== "boolean") return null;
  let stance: number | null = null;
  if (r.rel) {
    if (typeof r.stance !== "number" || !Number.isFinite(r.stance)) return null;
    stance = Math.max(-2, Math.min(2, Math.round(r.stance)));
  }
  const themes = (Array.isArray(r.themes) ? r.themes : [])
    .map((t) => oneOf<Theme>(THEMES, t))
    .filter((t): t is Theme => !!t)
    .slice(0, 3);
  const label: Label = {
    rel: r.rel,
    stance,
    themes,
    ai: oneOf<AiView>(AI_VIEWS, r.ai),
    event: oneOf<LifeEvent>(EVENTS, r.event) ?? "ninguno",
  };
  if (kind === "post") label.persona = oneOf<Persona>(PERSONAS, r.persona) ?? "desconocido";
  return label;
}

const clip = (s: string | null | undefined, n: number): string => {
  const t = (s || "").replace(/\s+/g, " ").trim();
  return t.length > n ? t.slice(0, n) + "…" : t;
};
const ym = (t: number): string => new Date(t * 1000).toISOString().slice(0, 7);

export function renderPostsPrompt(posts: Array<Pick<ArcticPost, "id" | "created_utc" | "title" | "selftext" | "link_flair_text">>): string {
  const lines = posts.map((p) => {
    const body = isGone(p.selftext) ? "" : clip(p.selftext, 1400);
    return `- id: ${p.id} | ${ym(p.created_utc)} | flair: ${p.link_flair_text || "-"}\n  TÍTULO: ${clip(p.title, 300)}${body ? `\n  TEXTO: ${body}` : ""}`;
  });
  return `Clasificá estos ${posts.length} posts. Devolvé exactamente un ítem por id.\n\n${lines.join("\n")}`;
}

export interface ThreadInfo {
  title: string;
  month: string;
  flair?: string | null;
}

export function renderCommentsPrompt(
  comments: Array<Pick<ArcticComment, "id" | "link_id" | "parent_id" | "created_utc" | "body">>,
  threads: Map<string, ThreadInfo>,
  parents: Map<string, string>
): string {
  const lines: string[] = [];
  let last = "";
  for (const c of comments) {
    const pid = (c.link_id || "").replace("t3_", "");
    if (pid !== last) {
      const t = threads.get(pid);
      lines.push(`\n### HILO ${pid} (${t?.month || ym(c.created_utc)}, flair ${t?.flair || "-"}): ${clip(t?.title || "?", 200)}`);
      last = pid;
    }
    let ctx = "";
    if (c.parent_id && c.parent_id.startsWith("t1_")) {
      const parent = parents.get(c.parent_id.slice(3));
      if (parent && !isGone(parent)) ctx = ` [responde a: "${clip(parent, 160)}"]`;
    }
    lines.push(`- id: ${c.id}${ctx}\n  ${clip(c.body, 700)}`);
  }
  return `Clasificá estos ${comments.length} COMENTARIOS (el título del hilo y "responde a" son sólo contexto; evaluá lo que dice cada comentario). Devolvé exactamente un ítem por id.\n${lines.join("\n")}`;
}
```

- [ ] **Step 4: correr y ver que pasan**

Run: `npx vitest run tests/charruadevs/filter.test.ts tests/charruadevs/rubric.test.ts`
Expected: PASS.

- [ ] **Step 5: commit**

```bash
git add classes/charruadevs/types.ts classes/charruadevs/filter.ts classes/charruadevs/rubric.ts tests/charruadevs/filter.test.ts tests/charruadevs/rubric.test.ts
git commit -m "feat(charruadevs): tipos, filtro de candidatos y rúbrica"
```

---

### Task 2: Léxico, FRED y análisis (puros)

**Files:**
- Create: `classes/charruadevs/lexicon.ts`, `classes/charruadevs/fred.ts`, `classes/charruadevs/validation.ts`, `classes/charruadevs/analyze.ts`
- Test: `tests/charruadevs/lexicon.test.ts`, `tests/charruadevs/fred.test.ts`, `tests/charruadevs/analyze.test.ts`

**Interfaces:**
- Consumes: tipos de Task 1.
- Produces: `LEX: Record<LexKey, RegExp>`, `lexCounts(bodies): { n: number; counts: Record<LexKey, number> }`; `parseFredCsv(csv): FredPoint[]`, `fetchFred(): Promise<FredPoint[] | null>`; `VALIDATION`; `AnalyzeRow`, `SnapshotInput`, `CharruaSnapshot`, `bucketStats`, `buildSnapshot(input)`.

- [ ] **Step 1: tests que fallan**

`tests/charruadevs/lexicon.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import { lexCounts } from "../../classes/charruadevs/lexicon";

describe("lexicon", () => {
  it("counts each alarm phrase once per comment and skips gone ones", () => {
    const out = lexCounts(["no hay laburo, está saturado", "me echaron ayer", "la IA nos va a reemplazar", "[removed]", "conseguí laburo en dos semanas"]);
    expect(out.n).toBe(4);
    expect(out.counts.no_hay_laburo).toBe(1);
    expect(out.counts.saturado).toBe(1);
    expect(out.counts.despidos).toBe(1);
    expect(out.counts.reemplazo_ia).toBe(1);
    expect(out.counts.ia_menciones).toBe(1);
    expect(out.counts.optimismo).toBe(1);
  });
});
```

`tests/charruadevs/fred.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import { parseFredCsv } from "../../classes/charruadevs/fred";

describe("fred", () => {
  it("averages the daily series by month and skips missing values", () => {
    const csv = "observation_date,IHLIDXUSTPSOFTDEVE\n2020-02-01,100\n2020-02-02,98\n2020-03-01,.\n2020-03-02,90\n";
    expect(parseFredCsv(csv)).toEqual([{ m: "2020-02", v: 99 }, { m: "2020-03", v: 90 }]);
  });
  it("returns [] for garbage", () => {
    expect(parseFredCsv("<html>")).toEqual([]);
  });
});
```

`tests/charruadevs/analyze.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import { bucketStats, buildSnapshot, type AnalyzeRow } from "../../classes/charruadevs/analyze";
import type { CharruaText, MonthRow } from "../../classes/charruadevs/types";
import { VALIDATION } from "../../classes/charruadevs/validation";

const lex = { no_hay_laburo: 2, saturado: 1, despidos: 0, reemplazo_ia: 0, ia_menciones: 5, optimismo: 1 };
const month = (m: string, over: Partial<MonthRow> = {}): MonthRow => ({ m, posts: 2, comments: 10, candidates: 2, classified: 1, lex, lexN: 10, ...over });
const row = (over: Partial<AnalyzeRow>): AnalyzeRow => ({
  rid: "t3_x", kind: "post", createdAt: new Date("2024-01-10T00:00:00Z"), month: "2024-01", score: 1,
  rel: true, stance: 0, themes: [], ai: null, event: "ninguno", gone: false, ...over,
});

describe("analyze", () => {
  it("bucketStats weighs every unit and ignores off-topic ones", () => {
    const s = bucketStats([{ stance: -2, w: 1 }, { stance: 1, w: 1 }, { stance: -1, w: 2 }, { stance: null, w: 5 }]);
    expect(s.n).toBe(4);
    expect(s.neg).toBeCloseTo(0.75);
    expect(s.pos).toBeCloseTo(0.25);
    expect(s.negOfOpinion).toBeCloseTo(0.75);
  });

  it("weights sampled comments by candidates/classified of their month", () => {
    const snap = buildSnapshot({
      rows: [
        row({ rid: "t3_a", stance: -2 }),
        row({ rid: "t3_b", stance: 1 }),
        row({ rid: "t1_c", kind: "comment", stance: -1 }),
      ],
      months: [month("2024-01", { candidates: 2 })],
      quotePool: [],
      fred: [],
      validation: VALIDATION,
      now: new Date("2024-01-31T00:00:00Z"),
      model: "m",
    });
    const jan = snap.monthly.find((m) => m.m === "2024-01")!;
    expect(jan.neg).toBeCloseTo(0.75);
    expect(jan.pos).toBeCloseTo(0.25);
    expect(snap.corpus.relPosts).toBe(2);
    expect(snap.corpus.relComments).toBe(1);
  });

  it("an empty corpus produces nulls, never NaN", () => {
    const snap = buildSnapshot({ rows: [], months: [], quotePool: [], fred: [], validation: VALIDATION, now: new Date("2026-09-15T00:00:00Z"), model: "m" });
    expect(snap.windows.last90.neg).toBeNull();
    expect(JSON.stringify(snap)).not.toContain("NaN");
  });

  it("quotes skip gone texts and neutral ones, and never carry an author", () => {
    const base: CharruaText = {
      rid: "t1_q1", kind: "comment", thread: "p", title: "Hilo", body: "no hay laburo", createdAt: new Date("2026-09-01T00:00:00Z"),
      month: "2026-09", score: 50, rel: true, stance: -2, themes: ["busqueda"], ai: null, event: "ninguno", gone: false,
      url: "https://www.reddit.com/r/CharruaDevs/comments/p/_/q1/", model: "m",
    };
    const snap = buildSnapshot({
      rows: [],
      months: [],
      quotePool: [base, { ...base, rid: "t1_q2", gone: true, score: 99 }, { ...base, rid: "t1_q3", stance: 0, score: 80 }],
      fred: [],
      validation: VALIDATION,
      now: new Date("2026-09-15T00:00:00Z"),
      model: "m",
    });
    expect(snap.quotesNeg.map((q) => q.rid)).toEqual(["t1_q1"]);
    expect(JSON.stringify(snap.quotesNeg)).not.toContain("author");
  });
});
```

- [ ] **Step 2: correr y ver que fallan**

Run: `npx vitest run tests/charruadevs/lexicon.test.ts tests/charruadevs/fred.test.ts tests/charruadevs/analyze.test.ts`
Expected: FAIL.

- [ ] **Step 3: implementar**

`classes/charruadevs/lexicon.ts`:
```ts
// El control que no pasa por ningún modelo: frases de alarma literales por cada 1.000 comentarios.
// Si el clasificador inventara el pesimismo, esta curva no lo acompañaría.
import { isGone } from "./filter";
import { LEX_KEYS } from "./types";
import type { LexKey } from "./types";

export const LEX: Record<LexKey, RegExp> = {
  no_hay_laburo: /no hay (m[aá]s )?(laburo|trabajo|ofertas)|no (consigo|encuentro) (laburo|trabajo)|mercado (est[aá] )?(muerto|horrible|p[eé]simo|complicad[oa]|dif[ií]cil|jodido|saturado)/i,
  saturado: /saturad[oa]|sobreoferta|demasiados (devs|programadores)/i,
  despidos: /despid|layoff|recorte|echaron|reestructura/i,
  reemplazo_ia: /\b(ia|ai|chatgpt|llm|agentes?)\b[^.]{0,60}(reemplaz|sustitu|quitar(nos)? el trabajo|dejar sin trabajo)|reemplaz[a-z]* (por|con) (la )?(ia|ai)\b/i,
  ia_menciones: /\b(ia|ai|chatgpt|gpt-?\d*|copilot|claude|cursor|llms?|gemini|vibe ?cod\w*|agentes?)\b/i,
  optimismo: /(hay|sobra) (mucho )?(laburo|trabajo)|consegu[ií] (laburo|trabajo)|me (contrataron|sali[oó] (una|el) (laburo|trabajo|oferta))|buena carrera/i,
};

export function lexCounts(bodies: readonly string[]): { n: number; counts: Record<LexKey, number> } {
  const counts = Object.fromEntries(LEX_KEYS.map((k) => [k, 0])) as Record<LexKey, number>;
  let n = 0;
  for (const b of bodies) {
    if (isGone(b)) continue;
    n++;
    for (const k of LEX_KEYS) if (LEX[k].test(b)) counts[k]++;
  }
  return { n, counts };
}
```

`classes/charruadevs/fred.ts`:
```ts
// Avisos de desarrollo de software en Indeed EE.UU. (FRED: IHLIDXUSTPSOFTDEVE), feb-2020 = 100.
// El contexto externo del termómetro: EE.UU. es el mayor comprador de software uruguayo.
import axios from "axios";

export interface FredPoint {
  m: string;
  v: number;
}
const URL = "https://fred.stlouisfed.org/graph/fredgraph.csv?id=IHLIDXUSTPSOFTDEVE";

export function parseFredCsv(csv: string): FredPoint[] {
  const acc = new Map<string, number[]>();
  for (const line of csv.trim().split(/\r?\n/).slice(1)) {
    const [d, v] = line.split(",");
    if (!d || !/^\d{4}-\d{2}-\d{2}$/.test(d) || !v || v === "." || !Number.isFinite(Number(v))) continue;
    const k = d.slice(0, 7);
    const list = acc.get(k) || [];
    list.push(Number(v));
    acc.set(k, list);
  }
  return [...acc.entries()]
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .map(([m, vs]) => ({ m, v: Math.round((vs.reduce((a, b) => a + b, 0) / vs.length) * 10) / 10 }));
}

export async function fetchFred(): Promise<FredPoint[] | null> {
  try {
    const res = await axios.get<string>(URL, { timeout: 20000, responseType: "text", headers: { "User-Agent": "Mozilla/5.0 cambio-uruguay" } });
    const pts = parseFredCsv(String(res.data));
    return pts.length ? pts : null;
  } catch {
    return null;
  }
}
```

`classes/charruadevs/validation.ts`:
```ts
// Validación ciega del clasificador (2026-09-15): 60 posts y 60 comentarios al azar leídos por
// Claude SIN ver la etiqueta del modelo, comparados después. Se recalcula a mano si cambia la
// rúbrica o el modelo; el número va a la página tal cual, con fecha.
export interface ValidationRow {
  n: number;
  relAgreement: number;
  signAgreement: number;
  within1: number;
  kappa4: number;
  bias: number;
}
export interface ValidationSet {
  date: string;
  reader: string;
  posts: ValidationRow;
  comments: ValidationRow;
}
export const VALIDATION: ValidationSet = {
  date: "2026-09-15",
  reader: "Claude (lectura ciega)",
  posts: { n: 60, relAgreement: 0.783, signAgreement: 0.69, within1: 1, kappa4: 0.333, bias: -0.119 },
  comments: { n: 60, relAgreement: 0.667, signAgreement: 0.611, within1: 1, kappa4: 0.249, bias: -0.056 },
};
```

`classes/charruadevs/analyze.ts`:
```ts
// Filas clasificadas → el snapshot que dibuja /mercado-it-uruguay. Puro.
//
// Ponderación: los posts son la población entera (peso 1). Los comentarios pesan
// candidatos/clasificados de su mes, así un mes con huecos de clasificación (Gemini caído) no pesa
// menos de lo que pesa. Con el corpus completo el peso es ~1.
import { RATE_THEMES } from "./types";
import type { AiView, CharruaText, LexKey, LifeEvent, MonthRow, Theme } from "./types";
import { LEX_KEYS } from "./types";
import type { FredPoint } from "./fred";
import type { ValidationSet } from "./validation";

export interface AnalyzeRow {
  rid: string;
  kind: "post" | "comment";
  createdAt: Date;
  month: string;
  score: number;
  rel: boolean;
  stance: number | null;
  themes: Theme[];
  ai: AiView | null;
  event: LifeEvent;
  persona?: string;
  gone: boolean;
  title?: string;
  url?: string;
  comments?: number;
  flair?: string | null;
}

export interface SnapshotInput {
  rows: AnalyzeRow[];
  months: MonthRow[];
  quotePool: CharruaText[];
  fred: FredPoint[];
  validation: ValidationSet;
  now: Date;
  model: string;
}

type Unit = AnalyzeRow & { w: number; t: number };
type StanceKey = "-2" | "-1" | "0" | "1" | "2";
const STANCE_KEYS: StanceKey[] = ["-2", "-1", "0", "1", "2"];
const DAY = 86400000;

const round = (x: number | null | undefined, d = 3): number | null =>
  x == null || !Number.isFinite(x) ? null : Math.round(x * 10 ** d) / 10 ** d;
const yq = (t: number): string => {
  const d = new Date(t);
  return `${d.getUTCFullYear()}-T${Math.floor(d.getUTCMonth() / 3) + 1}`;
};
const yr = (t: number): number => new Date(t).getUTCFullYear();

export function median(a: number[]): number | null {
  if (!a.length) return null;
  const s = [...a].sort((x, y) => x - y);
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

export interface Bucket {
  n: number;
  raw: number;
  dist: Record<StanceKey, number>;
  mean: number | null;
  neg: number | null;
  pos: number | null;
  net: number | null;
  negOfOpinion: number | null;
}

export function bucketStats(list: ReadonlyArray<{ stance: number | null; w: number }>): Bucket {
  const dist: Record<StanceKey, number> = { "-2": 0, "-1": 0, "0": 0, "1": 0, "2": 0 };
  let n = 0;
  let raw = 0;
  let sum = 0;
  for (const x of list) {
    if (x.stance == null) continue;
    const s = Math.max(-2, Math.min(2, x.stance));
    dist[String(s) as StanceKey] += x.w;
    n += x.w;
    raw++;
    sum += s * x.w;
  }
  const neg = dist["-2"] + dist["-1"];
  const pos = dist["1"] + dist["2"];
  return {
    n,
    raw,
    dist,
    mean: n ? sum / n : null,
    neg: n ? neg / n : null,
    pos: n ? pos / n : null,
    net: n ? (pos - neg) / n : null,
    negOfOpinion: neg + pos ? neg / (neg + pos) : null,
  };
}

const out = (b: Bucket) => ({ n: round(b.n, 0), raw: b.raw, mean: round(b.mean), neg: round(b.neg), pos: round(b.pos), net: round(b.net), negOfOpinion: round(b.negOfOpinion) });
const sumW = (l: Unit[]): number => l.reduce((a, x) => a + x.w, 0);
const has = (x: { themes: Theme[] }, th: Theme): boolean => (x.themes || []).includes(th);
function groupBy<T>(list: T[], key: (x: T) => string): Map<string, T[]> {
  const m = new Map<string, T[]>();
  for (const x of list) {
    const k = key(x);
    const arr = m.get(k);
    if (arr) arr.push(x);
    else m.set(k, [x]);
  }
  return m;
}

export interface Quote {
  rid: string;
  date: string;
  score: number;
  stance: number;
  themes: Theme[];
  ai: AiView | null;
  event: LifeEvent;
  text: string;
  thread: string;
  url: string;
}
export interface TopPost {
  rid: string;
  date: string;
  title: string;
  score: number;
  comments: number;
  stance: number;
  themes: Theme[];
  url: string;
}

export function buildSnapshot(input: SnapshotInput) {
  const { rows, months, now } = input;
  const NOW = now.getTime();
  const monthsByKey = new Map(months.map((m) => [m.m, m]));
  const classifiedComments = new Map<string, number>();
  for (const r of rows) if (r.kind === "comment") classifiedComments.set(r.month, (classifiedComments.get(r.month) || 0) + 1);
  const weightOf = (m: string): number => {
    const c = classifiedComments.get(m) || 0;
    const cand = monthsByKey.get(m)?.candidates || 0;
    return c && cand > c ? cand / c : 1;
  };
  const units: Unit[] = rows.map((r) => ({ ...r, t: new Date(r.createdAt).getTime(), w: r.kind === "comment" ? weightOf(r.month) : 1 }));
  const rel = units.filter((x) => x.rel && x.stance != null);
  const since = (days: number) => NOW - days * DAY;

  // ---- monthly ----
  const monthKeys = [...new Set([...months.map((m) => m.m), ...units.map((u) => u.month)])].sort();
  const relByM = groupBy(rel, (x) => x.month);
  const unitsByM = groupBy(units, (x) => x.month);
  const postsByM = groupBy(units.filter((u) => u.kind === "post"), (x) => x.month);
  const current = new Date(NOW).toISOString().slice(0, 7);
  const monthly = monthKeys.map((m, i) => {
    const r = relByM.get(m) || [];
    const s = bucketStats(r);
    const win = monthKeys.slice(Math.max(0, i - 2), i + 1).flatMap((k) => relByM.get(k) || []);
    const s3 = bucketStats(win);
    const u = unitsByM.get(m) || [];
    return {
      m,
      partial: m === current,
      posts: monthsByKey.get(m)?.posts ?? (postsByM.get(m) || []).length,
      comments: monthsByKey.get(m)?.comments ?? 0,
      rel: s.raw,
      relShare: round(sumW(r) / (sumW(u) || 1)),
      neg: round(s.neg),
      pos: round(s.pos),
      net: round(s.net),
      negOfOpinion: round(s.negOfOpinion),
      rel3: s3.raw,
      neg3: round(s3.neg),
      pos3: round(s3.pos),
      net3: round(s3.net),
      negOfOpinion3: round(s3.negOfOpinion),
      aiShare3: win.length ? round(sumW(win.filter((x) => has(x, "ia"))) / sumW(win)) : null,
      offers: (postsByM.get(m) || []).filter((p) => /oferta/i.test(p.flair || "")).length,
    };
  });

  // ---- yearly ----
  const years = [...new Set(rel.map((x) => yr(x.t)))].sort();
  const yearly = years.map((y) => {
    const r = rel.filter((x) => yr(x.t) === y);
    const s = bucketStats(r);
    return {
      y,
      ...out(s),
      dist: Object.fromEntries(STANCE_KEYS.map((k) => [k, round(s.dist[k], 1)])) as Record<StanceKey, number | null>,
      aiShare: round(sumW(r.filter((x) => has(x, "ia"))) / (sumW(r) || 1)),
      negPosts: round(bucketStats(r.filter((x) => x.kind === "post")).neg),
      negComments: round(bucketStats(r.filter((x) => x.kind === "comment")).neg),
    };
  });

  // ---- quarterly ----
  const quarters = [...new Set(units.map((x) => yq(x.t)))].sort();
  const quarterly = quarters.map((q) => {
    const all = units.filter((x) => yq(x.t) === q);
    const r = rel.filter((x) => yq(x.t) === q);
    const ev = { busca: 0, consiguio: 0, despedido: 0, contrata: 0 };
    for (const x of all) if (x.event !== "ninguno") ev[x.event] += x.w;
    const themeShare: Record<string, number | null> = {};
    for (const th of RATE_THEMES) themeShare[th] = r.length ? round(sumW(r.filter((x) => has(x, th))) / sumW(r)) : null;
    const ai = { amenaza: 0, herramienta: 0, hype: 0, mixto: 0 };
    let aiRaw = 0;
    for (const x of all) if (x.ai) { ai[x.ai] += x.w; aiRaw++; }
    return {
      q,
      ...out(bucketStats(r)),
      all: round(sumW(all), 0),
      ev: { busca: round(ev.busca, 1), consiguio: round(ev.consiguio, 1), despedido: round(ev.despedido, 1), contrata: round(ev.contrata, 1) },
      themeShare,
      ai: { n: round(ai.amenaza + ai.herramienta + ai.hype + ai.mixto, 0), raw: aiRaw, amenaza: round(ai.amenaza, 1), herramienta: round(ai.herramienta, 1), hype: round(ai.hype, 1), mixto: round(ai.mixto, 1) },
    };
  });

  // ---- themes ----
  const rel12 = rel.filter((x) => x.t >= since(365));
  const themes = RATE_THEMES.map((th) => {
    const r = rel.filter((x) => has(x, th));
    const r12 = r.filter((x) => x.t >= since(365));
    const byYear: Record<string, number | null> = {};
    const byYearNeg: Record<string, number | null> = {};
    for (const y of years) {
      const ry = rel.filter((x) => yr(x.t) === y);
      byYear[y] = ry.length ? round(sumW(ry.filter((x) => has(x, th))) / sumW(ry)) : null;
      const rt = r.filter((x) => yr(x.t) === y);
      byYearNeg[y] = rt.length >= 30 ? round(bucketStats(rt).neg) : null;
    }
    const s = bucketStats(r);
    const s12 = bucketStats(r12);
    return { th, n: s.raw, neg: round(s.neg), net: round(s.net), n12: s12.raw, neg12: round(s12.neg), net12: round(s12.net), share12: rel12.length ? round(sumW(r12) / sumW(rel12)) : null, byYear, byYearNeg };
  });

  // ---- persona (posts) ----
  const personas = groupBy(rel.filter((x) => x.kind === "post"), (x) => x.persona || "desconocido");
  const persona = [...personas.entries()].map(([k, r]) => {
    const r12 = r.filter((x) => x.t >= since(365));
    return { persona: k, n: r.length, neg: round(bucketStats(r).neg), net: round(bucketStats(r).net), n12: r12.length, neg12: round(bucketStats(r12).neg) };
  });

  // ---- engagement (¿el sub premia el pesimismo?) ----
  const engagement = (kind: "post" | "comment") =>
    Object.fromEntries(
      [-2, -1, 0, 1, 2].map((s) => {
        const sc = rel.filter((x) => x.kind === kind && x.stance === s).map((x) => x.score);
        return [String(s), { n: sc.length, median: median(sc), mean: round(sc.reduce((a, b) => a + b, 0) / (sc.length || 1), 1) }];
      })
    ) as Record<StanceKey, { n: number; median: number | null; mean: number | null }>;

  // ---- lexicon control ----
  const lexMonthly = months.map((mr) => {
    const rowOut: Record<string, number | string | null> = { m: mr.m, n: mr.lexN };
    for (const k of LEX_KEYS) rowOut[k] = mr.lexN ? round(((mr.lex[k as LexKey] || 0) / mr.lexN) * 1000, 1) : null;
    return rowOut as { m: string; n: number } & Record<LexKey, number | null>;
  });

  // ---- windows ----
  const windowStats = (from: number, to: number) => {
    const r = rel.filter((x) => x.t >= from && x.t < to);
    const ai = r.filter((x) => has(x, "ia"));
    return {
      ...out(bucketStats(r)),
      aiShare: r.length ? round(sumW(ai) / sumW(r)) : null,
      aiNeg: round(bucketStats(ai).neg),
      negPosts: round(bucketStats(r.filter((x) => x.kind === "post")).neg),
      negComments: round(bucketStats(r.filter((x) => x.kind === "comment")).neg),
    };
  };
  const Y = (y: number) => Date.UTC(y, 0, 1);
  const thisYear = new Date(NOW).getUTCFullYear();
  const windows: Record<string, ReturnType<typeof windowStats>> = {
    last90: windowStats(since(90), NOW + 1),
    prev90: windowStats(since(180), since(90)),
    sameLastYear: windowStats(since(365 + 90), since(365)),
    last365: windowStats(since(365), NOW + 1),
    all: windowStats(0, NOW + 1),
  };
  for (let y = 2022; y <= thisYear; y++) windows[`y${y}`] = windowStats(Y(y), Math.min(Y(y + 1), NOW + 1));

  // ---- quotes & top posts (nunca autores, nunca lo borrado) ----
  const quote = (q: CharruaText): Quote => ({
    rid: q.rid,
    date: new Date(q.createdAt).toISOString().slice(0, 10),
    score: q.score,
    stance: q.stance as number,
    themes: q.themes,
    ai: q.ai,
    event: q.event,
    text: (q.body || "").slice(0, 900),
    thread: q.title || "",
    url: q.url,
  });
  const pool = input.quotePool.filter((q) => !q.gone && q.rel && q.stance != null && q.stance !== 0 && new Date(q.createdAt).getTime() >= since(365));
  const byScore = (a: { score: number }, b: { score: number }) => b.score - a.score;
  const quotesNeg = pool.filter((q) => (q.stance as number) < 0).sort(byScore).slice(0, 30).map(quote);
  const quotesPos = pool.filter((q) => (q.stance as number) > 0).sort(byScore).slice(0, 15).map(quote);
  const topPost = (x: Unit): TopPost => ({ rid: x.rid, date: new Date(x.t).toISOString().slice(0, 10), title: x.title || "", score: x.score, comments: x.comments || 0, stance: x.stance as number, themes: x.themes, url: x.url || "" });
  const posts12 = rel.filter((x) => x.kind === "post" && !x.gone && x.t >= since(365));
  const postsNeg12 = posts12.filter((x) => (x.stance as number) < 0).sort(byScore).slice(0, 20).map(topPost);
  const postsPos12 = posts12.filter((x) => (x.stance as number) > 0).sort(byScore).slice(0, 10).map(topPost);

  const allT = units.map((u) => u.t);
  return {
    generatedAt: now.toISOString(),
    model: input.model,
    corpus: {
      posts: months.reduce((a, m) => a + m.posts, 0),
      comments: months.reduce((a, m) => a + m.comments, 0),
      candidates: months.reduce((a, m) => a + m.candidates, 0),
      texts: rows.length,
      classifiedPosts: rows.filter((r) => r.kind === "post").length,
      classifiedComments: rows.filter((r) => r.kind === "comment").length,
      relPosts: rel.filter((x) => x.kind === "post").length,
      relComments: rel.filter((x) => x.kind === "comment").length,
      from: allT.length ? new Date(Math.min(...allT)).toISOString().slice(0, 10) : null,
      to: allT.length ? new Date(Math.max(...allT)).toISOString().slice(0, 10) : null,
    },
    windows,
    monthly,
    yearly,
    quarterly,
    themes,
    persona,
    engagementPosts: engagement("post"),
    engagementComments: engagement("comment"),
    lexMonthly,
    quotesNeg,
    quotesPos,
    postsNeg12,
    postsPos12,
    fred: input.fred,
    validation: input.validation,
  };
}

export type CharruaSnapshot = ReturnType<typeof buildSnapshot>;
```

- [ ] **Step 4: correr y ver que pasan**

Run: `npx vitest run tests/charruadevs/lexicon.test.ts tests/charruadevs/fred.test.ts tests/charruadevs/analyze.test.ts`
Expected: PASS.

- [ ] **Step 5: commit**

```bash
git add classes/charruadevs/lexicon.ts classes/charruadevs/fred.ts classes/charruadevs/validation.ts classes/charruadevs/analyze.ts tests/charruadevs/lexicon.test.ts tests/charruadevs/fred.test.ts tests/charruadevs/analyze.test.ts
git commit -m "feat(charruadevs): análisis puro, control léxico y serie Indeed"
```

---

### Task 3: Gemini con esquema JSON y clasificación por lotes

**Files:**
- Modify: `classes/gemini.ts` (agregar `askJSON` al final)
- Create: `classes/charruadevs/classify.ts`
- Test: `tests/gemini.test.ts` (agregar casos), `tests/charruadevs/classify.test.ts`

**Interfaces:**
- Consumes: `RUBRIC`, `POST_SCHEMA`, `COMMENT_SCHEMA`, `normalizeLabel`, `renderPostsPrompt`, `renderCommentsPrompt`, `ThreadInfo` (Task 1).
- Produces: `askJSON<T>(prompt, schema, opts?): Promise<T | null>`; `CLASSIFIER_MODEL`; `classifyPosts(posts): Promise<Map<string, Label>>`; `classifyComments(comments, threads, parents): Promise<Map<string, Label>>`.

- [ ] **Step 1: tests que fallan**

Agregar al final de `tests/gemini.test.ts` (dentro del mismo archivo, nuevo `describe`, reutiliza `post` y el mock de axios):
```ts
import { askJSON } from "../classes/gemini";

describe("askJSON", () => {
  beforeEach(() => {
    post.mockReset();
    process.env.GEMINI_API_KEY = "k";
  });
  afterEach(() => {
    delete process.env.GEMINI_API_KEY;
  });

  it("sends the schema and parses the JSON reply", async () => {
    post.mockResolvedValue({ data: { candidates: [{ content: { parts: [{ text: '{"items":[{"id":"a"}]}' }] } }] } });
    const out = await askJSON<{ items: Array<{ id: string }> }>("p", { type: "OBJECT" }, { system: "s", model: "gemini-3.5-flash-lite" });
    expect(out).toEqual({ items: [{ id: "a" }] });
    const [url, body] = post.mock.calls[0];
    expect(url).toContain("gemini-3.5-flash-lite:generateContent");
    expect(body.generationConfig.responseMimeType).toBe("application/json");
    expect(body.generationConfig.responseSchema).toEqual({ type: "OBJECT" });
    expect(body.systemInstruction.parts[0].text).toBe("s");
  });

  it("is null on bad JSON, on HTTP errors and without a key", async () => {
    post.mockResolvedValue({ data: { candidates: [{ content: { parts: [{ text: "{roto" }] } }] } });
    expect(await askJSON("p", {})).toBeNull();
    post.mockRejectedValue(Object.assign(new Error("400"), { response: { status: 400 } }));
    expect(await askJSON("p", {})).toBeNull();
    delete process.env.GEMINI_API_KEY;
    expect(await askJSON("p", {})).toBeNull();
  });
});
```

`tests/charruadevs/classify.test.ts`:
```ts
import { describe, expect, it, vi, beforeEach } from "vitest";

const askJSON = vi.fn();
vi.mock("../../classes/gemini", () => ({ askJSON: (...a: unknown[]) => askJSON(...a) }));

import { classifyComments, classifyPosts } from "../../classes/charruadevs/classify";

const post = (id: string) => ({ id, created_utc: 1704067200, title: `t ${id}`, selftext: "", link_flair_text: null });

describe("classify", () => {
  beforeEach(() => askJSON.mockReset());

  it("returns only the ids the model answered with a valid label", async () => {
    askJSON.mockResolvedValue({
      items: [
        { id: "a", rel: true, stance: -1, themes: ["ia"], ai: "amenaza", event: "ninguno", persona: "senior" },
        { id: "zzz", rel: true, stance: 1, themes: [], ai: null, event: "ninguno", persona: "junior" },
        { id: "b", rel: "?" },
      ],
    });
    const out = await classifyPosts([post("a"), post("b")]);
    expect([...out.keys()]).toEqual(["a"]);
    expect(out.get("a")?.stance).toBe(-1);
  });

  it("a failed batch leaves its items unlabelled instead of inventing", async () => {
    askJSON.mockResolvedValue(null);
    const out = await classifyComments(
      [{ id: "c", link_id: "t3_a", parent_id: "t3_a", created_utc: 1704067200, body: "no hay laburo" }],
      new Map(),
      new Map()
    );
    expect(out.size).toBe(0);
  });

  it("splits posts in batches of 40", async () => {
    askJSON.mockResolvedValue({ items: [] });
    await classifyPosts(Array.from({ length: 81 }, (_, i) => post(`p${i}`)));
    expect(askJSON).toHaveBeenCalledTimes(3);
  });
});
```

- [ ] **Step 2: correr y ver que fallan**

Run: `npx vitest run tests/gemini.test.ts tests/charruadevs/classify.test.ts`
Expected: FAIL (`askJSON` no exportado; módulo classify inexistente).

- [ ] **Step 3: implementar**

Al final de `classes/gemini.ts`:
```ts
/**
 * One NON-grounded question whose answer must be JSON matching `schema` (Gemini structured output:
 * responseMimeType + responseSchema). Same key, pacing and retries as the rest of this module.
 * Returns the parsed object, or null on anything at all going wrong — a bad parse is null, never a
 * hand-repaired guess.
 */
export async function askJSON<T>(
  prompt: string,
  schema: unknown,
  opts: { system?: string; model?: string; temperature?: number; maxOutputTokens?: number; timeoutMs?: number } = {}
): Promise<T | null> {
  const apiKey = process.env.GEMINI_API_KEY || process.env.NUXT_GEMINI_API_KEY;
  if (!apiKey) return null;
  const model = (opts.model || GEMINI_MODEL).trim();
  try {
    const res = await postGemini(
      {
        ...(opts.system ? { systemInstruction: { parts: [{ text: opts.system }] } } : {}),
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: opts.temperature ?? 0.1,
          maxOutputTokens: opts.maxOutputTokens ?? 32768,
          responseMimeType: "application/json",
          responseSchema: schema,
        },
      },
      opts.timeoutMs ?? 120000,
      apiKey,
      `${MODELS_BASE}/${model}:generateContent`
    );
    const text = (res.data?.candidates?.[0]?.content?.parts ?? []).map((p) => p.text ?? "").join("").trim();
    if (!text) return null;
    return JSON.parse(text) as T;
  } catch (error: any) {
    console.warn("[gemini] json call failed:", error?.message || error);
    return null;
  }
}
```

`classes/charruadevs/classify.ts`:
```ts
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
      const id = (raw as { id?: unknown })?.id;
      if (typeof id !== "string" || !wanted.has(id) || labels.has(id)) continue;
      const label = normalizeLabel(raw, kind);
      if (label) labels.set(id, label);
    }
  });
  return labels;
}

export function classifyPosts(posts: Array<Pick<ArcticPost, "id" | "created_utc" | "title" | "selftext" | "link_flair_text">>): Promise<Map<string, Label>> {
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
  const sorted = [...comments].sort((a, b) => (a.link_id < b.link_id ? -1 : a.link_id > b.link_id ? 1 : a.created_utc - b.created_utc));
  return run(
    "comment",
    chunks(sorted, COMMENTS_PER_CALL).map((b) => ({ ids: b.map((c) => c.id), prompt: renderCommentsPrompt(b, threads, parents) }))
  );
}
```

- [ ] **Step 4: correr y ver que pasan (incluye el dueño único de Gemini)**

Run: `npx vitest run tests/gemini.test.ts tests/charruadevs/classify.test.ts tests/gemini_key_ownership.test.ts`
Expected: PASS.

- [ ] **Step 5: commit**

```bash
git add classes/gemini.ts classes/charruadevs/classify.ts tests/gemini.test.ts tests/charruadevs/classify.test.ts
git commit -m "feat(gemini): askJSON con esquema; clasificación por lotes de CharruaDevs"
```

---

### Task 4: Cosecha (Arctic Shift) y votos vivos (Reddit)

**Files:**
- Create: `classes/charruadevs/harvest.ts`
- Modify: `classes/reddit.ts` (agregar `fetchInfoLive` después de `fetchPublicCommentBodies`)
- Test: `tests/charruadevs/harvest.test.ts`

**Interfaces:**
- Consumes: `ArcticPost`, `ArcticComment`, `SUB` (Task 1).
- Produces: `fetchRange<T>(kind: "posts" | "comments", fromUtc: number, toUtc: number): Promise<T[]>`; `fetchInfoLive(fullnames): Promise<Map<string, LiveInfo> | null>` con `LiveInfo = { score: number; gone: boolean; numComments?: number }`.

- [ ] **Step 1: test que falla**

`tests/charruadevs/harvest.test.ts`:
```ts
import { describe, expect, it, vi, afterEach } from "vitest";
import { fetchRange } from "../../classes/charruadevs/harvest";

const page = (items: Array<{ id: string; created_utc: number }>) => new Response(JSON.stringify({ data: items }), { status: 200 });

describe("harvest", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("pages forward by created_utc, dedupes the boundary and stops at the end", async () => {
    const calls: string[] = [];
    const responses = [
      page([{ id: "a", created_utc: 100 }, { id: "b", created_utc: 101 }]),
      page([{ id: "b", created_utc: 101 }, { id: "c", created_utc: 150 }]),
      page([]),
    ];
    vi.stubGlobal("fetch", vi.fn(async (url: string) => { calls.push(url); return responses.shift()!; }));
    const out = await fetchRange<{ id: string; created_utc: number }>("comments", 100, 200);
    expect(out.map((x) => x.id)).toEqual(["a", "b", "c"]);
    expect(calls[0]).toContain("subreddit=CharruaDevs");
    expect(calls[0]).toContain("after=99");
    expect(calls[0]).toContain("before=200");
    expect(calls[1]).toContain("after=101");
  });

  it("steps one second when a whole page was already seen", async () => {
    const responses = [page([{ id: "a", created_utc: 100 }]), page([{ id: "a", created_utc: 100 }]), page([])];
    const urls: string[] = [];
    vi.stubGlobal("fetch", vi.fn(async (url: string) => { urls.push(url); return responses.shift()!; }));
    await fetchRange("posts", 100, 200);
    expect(urls[2]).toContain("after=101");
  });

  it("throws on a 400 (a bad query must not look like an empty month)", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response('{"error":"bad"}', { status: 400 })));
    await expect(fetchRange("posts", 1, 2)).rejects.toThrow(/400/);
  });
});
```

- [ ] **Step 2: correr y ver que falla**

Run: `npx vitest run tests/charruadevs/harvest.test.ts`
Expected: FAIL.

- [ ] **Step 3: implementar**

`classes/charruadevs/harvest.ts`:
```ts
// Arctic Shift (archivo público de Reddit): trae todo lo publicado en r/CharruaDevs en un rango,
// incluso lo que después se borró. El job pide cada corrida los dos últimos meses completos: así
// recalcula las filas mensuales y recoge lo que el archivo ingirió tarde.
import { SUB } from "./types";

const BASE = "https://arctic-shift.photon-reddit.com/api";
const UA = "cambio-uruguay/1.0 (+https://cambio-uruguay.com/mercado-it-uruguay)";
const COMMENT_FIELDS = "id,link_id,parent_id,created_utc,body,author,score";
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function getPage(url: string): Promise<Array<{ id: string; created_utc: number }>> {
  let last = "";
  for (let attempt = 0; attempt < 6; attempt++) {
    const res = await fetch(url, { headers: { "User-Agent": UA } }).catch((e) => {
      last = String(e);
      return null;
    });
    if (!res) {
      await sleep(3000 * (attempt + 1));
      continue;
    }
    if (res.status === 429 || res.status >= 500) {
      last = `HTTP ${res.status}`;
      await sleep((Number(res.headers.get("retry-after")) || 5 * (attempt + 1)) * 1000);
      continue;
    }
    if (!res.ok) throw new Error(`arctic-shift HTTP ${res.status}: ${(await res.text()).slice(0, 160)}`);
    const json = (await res.json()) as { data?: Array<{ id: string; created_utc: number }> };
    return json.data ?? [];
  }
  throw new Error(`arctic-shift sin respuesta: ${last}`);
}

export async function fetchRange<T extends { id: string; created_utc: number }>(
  kind: "posts" | "comments",
  fromUtc: number,
  toUtc: number
): Promise<T[]> {
  const seen = new Set<string>();
  const out: T[] = [];
  let after = fromUtc - 1;
  for (let guard = 0; guard < 20000; guard++) {
    const fields = kind === "comments" ? `&fields=${COMMENT_FIELDS}` : "";
    const url = `${BASE}/${kind}/search?subreddit=${SUB}&after=${after}&before=${toUtc}&sort=asc&limit=auto${fields}`;
    const data = await getPage(url);
    if (!data.length) break;
    let fresh = 0;
    for (const o of data) {
      if (seen.has(o.id)) continue;
      seen.add(o.id);
      out.push(o as T);
      fresh++;
    }
    const last = data[data.length - 1].created_utc;
    after = fresh === 0 ? last + 1 : last;
    if (after >= toUtc) break;
  }
  return out;
}
```

En `classes/reddit.ts`, después de `fetchPublicCommentBodies`:
```ts
export interface LiveInfo {
  score: number;
  gone: boolean;
  numComments?: number;
}

/**
 * Votos actuales y si el texto sigue público, por fullname (`t1_…`/`t3_…`). `null` cuando la API no
 * contestó — quien pregunta decide; con [] se leería "todo borrado" ante un 429.
 */
export async function fetchInfoLive(fullnames: readonly string[]): Promise<Map<string, LiveInfo> | null> {
  if (!redditConfigured() || !fullnames.length) return null;
  const out = new Map<string, LiveInfo>();
  for (let i = 0; i < fullnames.length; i += 100) {
    const batch = fullnames.slice(i, i + 100);
    const res = await api<
      Listing<{ name?: string; score?: number; body?: string; selftext?: string; num_comments?: number; removed_by_category?: string | null }>
    >("/api/info", { id: batch.join(","), raw_json: 1 });
    if (!res) return null;
    const seen = new Set<string>();
    for (const child of res.data?.children ?? []) {
      const d = child.data;
      if (!d?.name) continue;
      seen.add(d.name);
      const text = child.kind === "t1" ? d.body : d.selftext;
      const gone = text === "[removed]" || text === "[deleted]" || (child.kind === "t3" && !!d.removed_by_category);
      out.set(d.name, { score: d.score ?? 0, gone, numComments: d.num_comments });
    }
    for (const name of batch) if (!seen.has(name)) out.set(name, { score: 0, gone: true });
  }
  return out;
}
```

- [ ] **Step 4: correr y ver que pasa**

Run: `npx vitest run tests/charruadevs/harvest.test.ts tests/reddit*.test.ts`
Expected: PASS.

- [ ] **Step 5: commit**

```bash
git add classes/charruadevs/harvest.ts classes/reddit.ts tests/charruadevs/harvest.test.ts
git commit -m "feat(charruadevs): cosecha por rango en Arctic Shift y votos vivos vía Reddit"
```

---

### Task 5: Modelos APP DB (backend + app) y store

**Files:**
- Create: `classes/models/CharruaText.ts`, `classes/models/CharruaSnapshot.ts`, `app/server/models/CharruaText.ts`, `app/server/models/CharruaSnapshot.ts`, `classes/charruadevs/store.ts`
- Modify: `tests/appdb/schema_parity.test.ts`

**Interfaces:**
- Consumes: `CharruaText`, `HarvestState` (Task 1), `AnalyzeRow`, `CharruaSnapshot` (Task 2), `LiveInfo` (Task 4).
- Produces: `CharruaTextModel`, `CharruaSnapshotModel` (backend y app); store: `ensureIndexes()`, `upsertTexts(docs)`, `knownRids(rids)`, `threadInfo(threadIds)`, `recentRids(since)`, `applyLive(map)`, `loadAnalyzeRows()`, `loadQuotePool(since)`, `loadState()`, `saveState(state)`, `saveSnapshot(snapshot)`, `storedTextCount()`.

- [ ] **Step 1: test de paridad que falla**

En `tests/appdb/schema_parity.test.ts` agregar imports y casos:
```ts
import { CharruaTextModel } from "../../classes/models/CharruaText";
import { CharruaSnapshotModel } from "../../classes/models/CharruaSnapshot";
```
```ts
  it("CharruaText declares exactly the app's top-level fields", () => {
    // El corpus del buscador de /mercado-it-uruguay: un campo que el backend escribe y el app no
    // declara es un filtro que devuelve cero resultados sin avisar.
    expect(Object.keys(CharruaTextModel.schema.obj).sort()).toEqual(appFields(appModel("CharruaText")).sort());
    expect(CharruaTextModel.collection.name).toBe("charruadevstexts");
  });

  it("CharruaSnapshot declares exactly the app's top-level fields", () => {
    expect(Object.keys(CharruaSnapshotModel.schema.obj).sort()).toEqual(appFields(appModel("CharruaSnapshot")).sort());
    expect(CharruaSnapshotModel.collection.name).toBe("charruadevssnapshots");
  });
```

- [ ] **Step 2: correr y ver que falla**

Run: `npx vitest run tests/appdb/schema_parity.test.ts`
Expected: FAIL (módulos inexistentes).

- [ ] **Step 3: implementar**

`classes/models/CharruaText.ts`:
```ts
// Espejo de app/server/models/CharruaText.ts sobre la base del APP (classes/appdb.ts). Un doc por
// post o comentario clasificado de r/CharruaDevs; lo lee el buscador de /mercado-it-uruguay.
// Sin autores a propósito. `createdAt` es la fecha de Reddit, no un timestamp de mongoose.
import { Schema } from "mongoose";
import { appModel } from "../appdb";
import type { CharruaText } from "../charruadevs/types";

const CharruaTextSchema = new Schema(
  {
    rid: { type: String, required: true },
    kind: { type: String, required: true },
    thread: { type: String, required: true },
    title: { type: String, default: "" },
    body: { type: String, default: "" },
    createdAt: { type: Date, required: true },
    month: { type: String, required: true },
    score: { type: Number, default: 0 },
    comments: { type: Number, default: 0 },
    flair: { type: String, default: null },
    rel: { type: Boolean, default: false },
    stance: { type: Number, default: null },
    themes: { type: [String], default: [] },
    ai: { type: String, default: null },
    event: { type: String, default: "ninguno" },
    persona: { type: String, default: null },
    gone: { type: Boolean, default: false },
    url: { type: String, default: "" },
    model: { type: String, default: "" },
  },
  { versionKey: false }
);

CharruaTextSchema.index({ rid: 1 }, { unique: true });
CharruaTextSchema.index({ createdAt: -1 });
CharruaTextSchema.index({ rel: 1, gone: 1, stance: 1, createdAt: -1 });
CharruaTextSchema.index({ themes: 1, createdAt: -1 });
CharruaTextSchema.index({ kind: 1, month: 1 });
CharruaTextSchema.index(
  { title: "text", body: "text" },
  { weights: { title: 2, body: 1 }, default_language: "spanish", name: "text_es" }
);

export const CharruaTextModel = appModel<CharruaText>("CharruaText", CharruaTextSchema, "charruadevstexts");
```

`classes/models/CharruaSnapshot.ts`:
```ts
// Espejo de app/server/models/CharruaSnapshot.ts. Dos docs: key "snapshot" (lo que dibuja la
// página) y key "state" (filas mensuales que el job no puede recalcular sin rebajar todo).
import { Schema } from "mongoose";
import { appModel } from "../appdb";

export interface CharruaSnapshotDoc {
  key: string;
  generatedAt: Date;
  data: unknown;
}

const CharruaSnapshotSchema = new Schema(
  {
    key: { type: String, required: true, unique: true },
    generatedAt: { type: Date, required: true },
    data: { type: Schema.Types.Mixed, default: {} },
  },
  { versionKey: false, minimize: false }
);

export const CharruaSnapshotModel = appModel<CharruaSnapshotDoc>("CharruaSnapshot", CharruaSnapshotSchema, "charruadevssnapshots");
```

`app/server/models/CharruaText.ts`:
```ts
import mongoose, { Schema, type Model } from 'mongoose'

export interface CharruaTextDoc {
  rid: string
  kind: 'post' | 'comment'
  thread: string
  title: string
  body: string
  createdAt: Date
  month: string
  score: number
  comments: number
  flair: string | null
  rel: boolean
  stance: number | null
  themes: string[]
  ai: string | null
  event: string
  persona: string | null
  gone: boolean
  url: string
  model: string
}

const CharruaTextSchema = new Schema<CharruaTextDoc>(
  {
    rid: { type: String, required: true },
    kind: { type: String, required: true },
    thread: { type: String, required: true },
    title: { type: String, default: '' },
    body: { type: String, default: '' },
    createdAt: { type: Date, required: true },
    month: { type: String, required: true },
    score: { type: Number, default: 0 },
    comments: { type: Number, default: 0 },
    flair: { type: String, default: null },
    rel: { type: Boolean, default: false },
    stance: { type: Number, default: null },
    themes: { type: [String], default: [] },
    ai: { type: String, default: null },
    event: { type: String, default: 'ninguno' },
    persona: { type: String, default: null },
    gone: { type: Boolean, default: false },
    url: { type: String, default: '' },
    model: { type: String, default: '' },
  },
  { versionKey: false, autoIndex: false }
)

export const CharruaTextModel: Model<CharruaTextDoc> =
  (mongoose.models.CharruaText as Model<CharruaTextDoc>) ||
  mongoose.model<CharruaTextDoc>('CharruaText', CharruaTextSchema, 'charruadevstexts')
```
(`autoIndex: false`: los índices los crea el job; el app nunca intenta construir el índice de texto al arrancar.)

`app/server/models/CharruaSnapshot.ts`:
```ts
import mongoose, { Schema, type Model } from 'mongoose'

export interface CharruaSnapshotDoc {
  key: string
  generatedAt: Date
  data: unknown
}

const CharruaSnapshotSchema = new Schema<CharruaSnapshotDoc>(
  {
    key: { type: String, required: true },
    generatedAt: { type: Date, required: true },
    data: { type: Schema.Types.Mixed, default: {} },
  },
  { versionKey: false, minimize: false, autoIndex: false }
)

export const CharruaSnapshotModel: Model<CharruaSnapshotDoc> =
  (mongoose.models.CharruaSnapshot as Model<CharruaSnapshotDoc>) ||
  mongoose.model<CharruaSnapshotDoc>('CharruaSnapshot', CharruaSnapshotSchema, 'charruadevssnapshots')
```

`classes/charruadevs/store.ts`:
```ts
// Lecturas y escrituras del corpus en la base del APP.
import { CharruaSnapshotModel } from "../models/CharruaSnapshot";
import { CharruaTextModel } from "../models/CharruaText";
import type { LiveInfo } from "../reddit";
import type { AnalyzeRow, CharruaSnapshot } from "./analyze";
import type { CharruaText, HarvestState } from "./types";

const CHUNK = 1000;

export async function ensureIndexes(): Promise<void> {
  await CharruaTextModel.createIndexes();
  await CharruaSnapshotModel.createIndexes();
}

export async function upsertTexts(docs: CharruaText[]): Promise<number> {
  let n = 0;
  for (let i = 0; i < docs.length; i += CHUNK) {
    const ops = docs.slice(i, i + CHUNK).map((d) => ({ updateOne: { filter: { rid: d.rid }, update: { $set: d }, upsert: true } }));
    const res = await CharruaTextModel.bulkWrite(ops, { ordered: false });
    n += (res.upsertedCount || 0) + (res.modifiedCount || 0);
  }
  return n;
}

export async function knownRids(rids: string[]): Promise<Set<string>> {
  const out = new Set<string>();
  for (let i = 0; i < rids.length; i += 5000) {
    const found = await CharruaTextModel.find({ rid: { $in: rids.slice(i, i + 5000) } }, { rid: 1, _id: 0 }).lean<Array<{ rid: string }>>();
    for (const f of found) out.add(f.rid);
  }
  return out;
}

export async function threadInfo(threadIds: string[]): Promise<Map<string, { title: string; body: string; month: string; flair: string | null }>> {
  const out = new Map<string, { title: string; body: string; month: string; flair: string | null }>();
  for (let i = 0; i < threadIds.length; i += 5000) {
    const rids = threadIds.slice(i, i + 5000).map((t) => `t3_${t}`);
    const docs = await CharruaTextModel.find({ rid: { $in: rids } }, { thread: 1, title: 1, body: 1, month: 1, flair: 1, _id: 0 }).lean<
      Array<{ thread: string; title: string; body: string; month: string; flair: string | null }>
    >();
    for (const d of docs) out.set(d.thread, { title: d.title, body: d.body, month: d.month, flair: d.flair });
  }
  return out;
}

export async function recentRids(since: Date): Promise<string[]> {
  const docs = await CharruaTextModel.find({ createdAt: { $gte: since } }, { rid: 1, _id: 0 }).lean<Array<{ rid: string }>>();
  return docs.map((d) => d.rid);
}

export async function applyLive(live: Map<string, LiveInfo>): Promise<number> {
  const entries = [...live.entries()];
  let n = 0;
  for (let i = 0; i < entries.length; i += CHUNK) {
    const ops = entries.slice(i, i + CHUNK).map(([rid, v]) => ({
      updateOne: {
        filter: { rid },
        update: { $set: { score: v.score, gone: v.gone, ...(v.numComments != null ? { comments: v.numComments } : {}) } },
      },
    }));
    const res = await CharruaTextModel.bulkWrite(ops, { ordered: false });
    n += res.modifiedCount || 0;
  }
  return n;
}

export async function loadAnalyzeRows(): Promise<AnalyzeRow[]> {
  return CharruaTextModel.find({}, { body: 0, _id: 0, thread: 0, model: 0 }).lean<AnalyzeRow[]>();
}

export async function loadQuotePool(since: Date, limit = 600): Promise<CharruaText[]> {
  return CharruaTextModel.find({ kind: "comment", rel: true, gone: false, createdAt: { $gte: since }, stance: { $in: [-2, -1, 1, 2] } }, { _id: 0 })
    .sort({ score: -1 })
    .limit(limit)
    .lean<CharruaText[]>();
}

export async function storedTextCount(): Promise<number> {
  return CharruaTextModel.estimatedDocumentCount();
}

export async function loadState(): Promise<HarvestState | null> {
  const doc = await CharruaSnapshotModel.findOne({ key: "state" }).lean<{ data?: HarvestState }>();
  return doc?.data ?? null;
}

export async function saveState(state: HarvestState): Promise<void> {
  await CharruaSnapshotModel.updateOne({ key: "state" }, { $set: { key: "state", generatedAt: new Date(), data: state } }, { upsert: true });
}

export async function storedSnapshotTexts(): Promise<number> {
  const doc = await CharruaSnapshotModel.findOne({ key: "snapshot" }, { "data.corpus.texts": 1 }).lean<{ data?: { corpus?: { texts?: number } } }>();
  return doc?.data?.corpus?.texts ?? 0;
}

export async function loadStoredFred(): Promise<CharruaSnapshot["fred"]> {
  const doc = await CharruaSnapshotModel.findOne({ key: "snapshot" }, { "data.fred": 1 }).lean<{ data?: { fred?: CharruaSnapshot["fred"] } }>();
  return doc?.data?.fred ?? [];
}

export async function saveSnapshot(snapshot: CharruaSnapshot): Promise<void> {
  await CharruaSnapshotModel.updateOne(
    { key: "snapshot" },
    { $set: { key: "snapshot", generatedAt: new Date(snapshot.generatedAt), data: snapshot } },
    { upsert: true }
  );
}
```

- [ ] **Step 4: correr y ver que pasa**

Run: `npx vitest run tests/appdb/schema_parity.test.ts`
Expected: PASS.

- [ ] **Step 5: commit**

```bash
git add classes/models/CharruaText.ts classes/models/CharruaSnapshot.ts app/server/models/CharruaText.ts app/server/models/CharruaSnapshot.ts classes/charruadevs/store.ts tests/appdb/schema_parity.test.ts
git commit -m "feat(charruadevs): modelos APP DB con paridad y store"
```

---

### Task 6: Orquestación, entrada pm2, siembra y registro

**Files:**
- Create: `classes/charruadevs/refresh.ts`, `sync_charruadevs.ts`, `docs/app/CHARRUADEVS.md`
- Modify: `ecosystem.config.js` (nuevo app después de `currency-videos`), `scripts/deploy-backend.sh` (línea 51), `package.json` (script), `AGENTS.md` (tabla pm2 + lista de entradas + dirs de classes), `classes/AGENTS.md` (tabla de subsistemas)
- Test: `tests/charruadevs/refresh.test.ts`

**Interfaces:**
- Consumes: todo lo anterior.
- Produces: `runRefresh(opts: { seedDir?: string; now?: Date; dryRun?: boolean }): Promise<RefreshReport>`, `RefreshReport = { mode: "seed" | "daily"; newPosts: number; newComments: number; classified: number; failed: number; live: number; texts: number; wrote: boolean; reason?: string }`; `isThin(texts, previous)`.

- [ ] **Step 1: test que falla**

`tests/charruadevs/refresh.test.ts`:
```ts
import { describe, expect, it, vi, beforeEach } from "vitest";

const store = {
  ensureIndexes: vi.fn(), upsertTexts: vi.fn(async (d: unknown[]) => d.length), knownRids: vi.fn(async () => new Set<string>()),
  threadInfo: vi.fn(async () => new Map()), recentRids: vi.fn(async () => []), applyLive: vi.fn(async () => 0),
  loadAnalyzeRows: vi.fn(async () => []), loadQuotePool: vi.fn(async () => []), loadState: vi.fn(),
  saveState: vi.fn(), storedSnapshotTexts: vi.fn(async () => 0), loadStoredFred: vi.fn(async () => []), saveSnapshot: vi.fn(),
  storedTextCount: vi.fn(async () => 0),
};
vi.mock("../../classes/charruadevs/store", () => store);
const fetchRange = vi.fn();
vi.mock("../../classes/charruadevs/harvest", () => ({ fetchRange: (...a: unknown[]) => fetchRange(...a) }));
const classifyPosts = vi.fn();
const classifyComments = vi.fn();
vi.mock("../../classes/charruadevs/classify", () => ({
  CLASSIFIER_MODEL: "m",
  classifyPosts: (...a: unknown[]) => classifyPosts(...a),
  classifyComments: (...a: unknown[]) => classifyComments(...a),
}));
vi.mock("../../classes/charruadevs/fred", () => ({ fetchFred: async () => null }));
vi.mock("../../classes/reddit", () => ({ fetchInfoLive: async () => null }));

import { isThin, runRefresh } from "../../classes/charruadevs/refresh";

const emptyMonth = (m: string) => ({ m, posts: 0, comments: 0, candidates: 0, classified: 0, lex: { no_hay_laburo: 0, saturado: 0, despidos: 0, reemplazo_ia: 0, ia_menciones: 0, optimismo: 0 }, lexN: 0 });

describe("refresh", () => {
  beforeEach(() => {
    for (const f of Object.values(store)) (f as ReturnType<typeof vi.fn>).mockClear();
    fetchRange.mockReset();
    classifyPosts.mockReset();
    classifyComments.mockReset();
    store.loadState.mockResolvedValue({ months: [emptyMonth("2026-08")] });
  });

  it("refuses to run without a seeded state", async () => {
    store.loadState.mockResolvedValue(null);
    await expect(runRefresh({ now: new Date("2026-09-15T12:00:00Z") })).rejects.toThrow(/--seed/);
  });

  it("classifies only what is new and never stores an unlabelled text", async () => {
    fetchRange.mockImplementation(async (kind: string) =>
      kind === "posts"
        ? [{ id: "p1", created_utc: 1757000000, title: "No hay laburo", selftext: "", permalink: "/r/CharruaDevs/comments/p1/x/" }, { id: "p2", created_utc: 1757000100, title: "Duda con React", selftext: "" }]
        : [{ id: "c1", link_id: "t3_p1", parent_id: "t3_p1", created_utc: 1757000200, body: "el mercado está muerto", author: "u" }]
    );
    store.knownRids.mockResolvedValue(new Set(["t3_p2"]));
    classifyPosts.mockResolvedValue(new Map([["p1", { rel: true, stance: -1, themes: ["busqueda"], ai: null, event: "busca", persona: "junior" }]]));
    classifyComments.mockResolvedValue(new Map());
    const report = await runRefresh({ now: new Date("2026-09-15T12:00:00Z") });
    expect(classifyPosts.mock.calls[0][0].map((p: { id: string }) => p.id)).toEqual(["p1"]);
    const stored = store.upsertTexts.mock.calls.flatMap((c) => c[0] as Array<{ rid: string; author?: string }>);
    expect(stored.map((d) => d.rid)).toEqual(["t3_p1"]);
    expect(stored.some((d) => "author" in d)).toBe(false);
    expect(report.failed).toBe(1);
  });

  it("does not overwrite the board with a thin snapshot", async () => {
    fetchRange.mockResolvedValue([]);
    store.storedSnapshotTexts.mockResolvedValue(1000);
    const report = await runRefresh({ now: new Date("2026-09-15T12:00:00Z") });
    expect(report.wrote).toBe(false);
    expect(store.saveSnapshot).not.toHaveBeenCalled();
  });

  it("isThin only trips on a real drop", () => {
    expect(isThin(950, 1000)).toBe(false);
    expect(isThin(800, 1000)).toBe(true);
    expect(isThin(10, 0)).toBe(false);
  });
});
```

- [ ] **Step 2: correr y ver que falla**

Run: `npx vitest run tests/charruadevs/refresh.test.ts`
Expected: FAIL.

- [ ] **Step 3: implementar**

`classes/charruadevs/refresh.ts`:
```ts
// Una corrida del termómetro. Modo diario: baja los DOS últimos meses completos de Arctic Shift,
// clasifica lo que no está en la base, recalcula esas filas mensuales, refresca votos y borrados
// de lo de los últimos 30 días y rehace el snapshot. Modo semilla (--seed <dir>): importa el corpus
// clasificado de una vez (texts.jsonl + state.json) y rehace el snapshot.
import fs from "fs";
import path from "path";
import { buildSnapshot } from "./analyze";
import { classifyComments, classifyPosts, CLASSIFIER_MODEL } from "./classify";
import { isCandidateComment, isGone, isMarketThread } from "./filter";
import { fetchFred } from "./fred";
import { fetchRange } from "./harvest";
import { lexCounts } from "./lexicon";
import { fetchInfoLive } from "../reddit";
import * as store from "./store";
import type { ThreadInfo } from "./rubric";
import type { ArcticComment, ArcticPost, CharruaText, HarvestState, Label, MonthRow } from "./types";
import { VALIDATION } from "./validation";

export interface RefreshReport {
  mode: "seed" | "daily";
  newPosts: number;
  newComments: number;
  classified: number;
  failed: number;
  live: number;
  texts: number;
  wrote: boolean;
  reason?: string;
}

const DAY = 86400000;
const ym = (t: number) => new Date(t * 1000).toISOString().slice(0, 7);
const clip = (s: string, n: number) => (s.length > n ? s.slice(0, n - 1) + "…" : s);

/** Un snapshot con 10 % menos de textos que el guardado es una corrida rota, no una noticia. */
export function isThin(texts: number, previous: number): boolean {
  return previous > 0 && texts < previous * 0.9;
}

function monthBounds(now: Date): { from: number; to: number; months: string[] } {
  const y = now.getUTCFullYear();
  const m = now.getUTCMonth();
  const from = Date.UTC(y, m - 1, 1) / 1000;
  const to = Math.floor(now.getTime() / 1000) + 1;
  return { from, to, months: [new Date(from * 1000).toISOString().slice(0, 7), now.toISOString().slice(0, 7)] };
}

function postDoc(p: ArcticPost, k: Label): CharruaText {
  return {
    rid: `t3_${p.id}`,
    kind: "post",
    thread: p.id,
    title: p.title || "",
    body: isGone(p.selftext) ? "" : clip(p.selftext || "", 1500),
    createdAt: new Date(p.created_utc * 1000),
    month: ym(p.created_utc),
    score: p.score ?? 0,
    comments: p.num_comments ?? 0,
    flair: p.link_flair_text ?? null,
    rel: k.rel,
    stance: k.stance,
    themes: k.themes,
    ai: k.ai,
    event: k.event,
    persona: k.persona,
    gone: !!p.removed_by_category || p.title === "[deleted by user]",
    url: `https://www.reddit.com${p.permalink || `/r/CharruaDevs/comments/${p.id}/`}`,
    model: CLASSIFIER_MODEL,
  };
}

function commentDoc(c: ArcticComment, k: Label, threadTitle: string): CharruaText {
  const pid = (c.link_id || "").replace("t3_", "");
  return {
    rid: `t1_${c.id}`,
    kind: "comment",
    thread: pid,
    title: threadTitle,
    body: clip((c.body || "").trim(), 1500),
    createdAt: new Date(c.created_utc * 1000),
    month: ym(c.created_utc),
    score: c.score ?? 0,
    rel: k.rel,
    stance: k.stance,
    themes: k.themes,
    ai: k.ai,
    event: k.event,
    gone: false,
    url: `https://www.reddit.com/r/CharruaDevs/comments/${pid}/_/${c.id}/`,
    model: CLASSIFIER_MODEL,
  };
}

async function importSeed(dir: string): Promise<{ texts: number; state: HarvestState }> {
  const state = JSON.parse(fs.readFileSync(path.join(dir, "state.json"), "utf8")) as HarvestState;
  const lines = fs.readFileSync(path.join(dir, "texts.jsonl"), "utf8").split("\n").filter(Boolean);
  let batch: CharruaText[] = [];
  let n = 0;
  for (const line of lines) {
    const d = JSON.parse(line) as CharruaText & { createdAt: string };
    batch.push({ ...d, createdAt: new Date(d.createdAt) });
    if (batch.length >= 5000) {
      n += await store.upsertTexts(batch);
      batch = [];
    }
  }
  if (batch.length) n += await store.upsertTexts(batch);
  return { texts: n, state };
}

async function daily(state: HarvestState, now: Date, report: RefreshReport): Promise<HarvestState> {
  const { from, to, months } = monthBounds(now);
  const posts = await fetchRange<ArcticPost>("posts", from, to);
  const comments = await fetchRange<ArcticComment>("comments", from, to);

  const known = await store.knownRids([...posts.map((p) => `t3_${p.id}`), ...comments.map((c) => `t1_${c.id}`)]);
  const newPosts = posts.filter((p) => !known.has(`t3_${p.id}`) && !(p.title === "[deleted by user]" && isGone(p.selftext)));
  report.newPosts = newPosts.length;
  const postLabels = newPosts.length ? await classifyPosts(newPosts) : new Map<string, Label>();

  // Hilos: los del mes vienen en la cosecha; los viejos, de la base.
  const threads = new Map<string, ThreadInfo & { market: boolean }>();
  for (const p of posts) threads.set(p.id, { title: p.title, month: ym(p.created_utc), flair: p.link_flair_text, market: isMarketThread(p.title, p.selftext) });
  const missing = [...new Set(comments.map((c) => (c.link_id || "").replace("t3_", "")))].filter((t) => !threads.has(t));
  for (const [id, t] of await store.threadInfo(missing)) threads.set(id, { title: t.title, month: t.month, flair: t.flair, market: isMarketThread(t.title, t.body) });

  const candidates = comments.filter((c) => isCandidateComment({ body: c.body, author: c.author }, !!threads.get((c.link_id || "").replace("t3_", ""))?.market));
  const newComments = candidates.filter((c) => !known.has(`t1_${c.id}`));
  report.newComments = newComments.length;
  const parents = new Map(comments.map((c) => [c.id, c.body]));
  const commentLabels = newComments.length ? await classifyComments(newComments, threads, parents) : new Map<string, Label>();

  const docs: CharruaText[] = [];
  for (const p of newPosts) {
    const k = postLabels.get(p.id);
    if (k) docs.push(postDoc(p, k));
  }
  for (const c of newComments) {
    const k = commentLabels.get(c.id);
    if (k) docs.push(commentDoc(c, k, threads.get((c.link_id || "").replace("t3_", ""))?.title || ""));
  }
  report.classified = docs.length;
  report.failed = newPosts.length + newComments.length - docs.length;
  if (docs.length) await store.upsertTexts(docs);

  // Filas mensuales de los dos meses cosechados, recalculadas desde el mes completo.
  const byMonth = new Map<string, MonthRow>();
  for (const m of months) {
    const mp = posts.filter((p) => ym(p.created_utc) === m);
    const mc = comments.filter((c) => ym(c.created_utc) === m);
    const lex = lexCounts(mc.map((c) => c.body));
    const cand = candidates.filter((c) => ym(c.created_utc) === m);
    const classifiedIds = new Set([...known, ...docs.map((d) => d.rid)]);
    byMonth.set(m, {
      m,
      posts: mp.length,
      comments: mc.length,
      candidates: cand.length,
      classified: cand.filter((c) => classifiedIds.has(`t1_${c.id}`)).length,
      lex: lex.counts,
      lexN: lex.n,
    });
  }
  const merged = new Map(state.months.map((r) => [r.m, r]));
  for (const [m, r] of byMonth) if (r.posts + r.comments > 0 || !merged.has(m)) merged.set(m, r);

  // Votos y borrados de lo reciente (lo borrado hoy deja de mostrarse).
  const recent = await store.recentRids(new Date(now.getTime() - 30 * DAY));
  const live = recent.length ? await fetchInfoLive(recent) : null;
  if (live) report.live = await store.applyLive(live);

  return { ...state, months: [...merged.values()].sort((a, b) => (a.m < b.m ? -1 : 1)), lastRunAt: now.toISOString() };
}

export async function runRefresh(opts: { seedDir?: string; now?: Date; dryRun?: boolean } = {}): Promise<RefreshReport> {
  const now = opts.now ?? new Date();
  const report: RefreshReport = { mode: opts.seedDir ? "seed" : "daily", newPosts: 0, newComments: 0, classified: 0, failed: 0, live: 0, texts: 0, wrote: false };
  await store.ensureIndexes();

  let state: HarvestState;
  if (opts.seedDir) {
    const seeded = await importSeed(opts.seedDir);
    state = { ...seeded.state, seededAt: now.toISOString() };
    report.classified = seeded.texts;
  } else {
    const stored = await store.loadState();
    if (!stored) throw new Error("sin estado en charruadevssnapshots: sembrar primero con --seed <dir>");
    state = await daily(stored, now, report);
  }

  const [rows, quotePool, previous, freshFred] = await Promise.all([
    store.loadAnalyzeRows(),
    store.loadQuotePool(new Date(now.getTime() - 365 * DAY)),
    store.storedSnapshotTexts(),
    fetchFred(),
  ]);
  const fred = freshFred ?? (await store.loadStoredFred());
  const snapshot = buildSnapshot({ rows, months: state.months, quotePool, fred, validation: VALIDATION, now, model: CLASSIFIER_MODEL });
  report.texts = snapshot.corpus.texts;

  if (opts.dryRun) {
    report.reason = "dry-run";
    return report;
  }
  await store.saveState(state);
  if (isThin(snapshot.corpus.texts, previous)) {
    report.reason = `corrida flaca: ${snapshot.corpus.texts} textos contra ${previous} guardados`;
    return report;
  }
  await store.saveSnapshot(snapshot);
  report.wrote = true;
  return report;
}
```

`sync_charruadevs.ts`:
```ts
// Termómetro del mercado IT (pm2 `currency-charruadevs`): r/CharruaDevs → clasificación con Gemini
// → `charruadevstexts` + `charruadevssnapshots` en la base del APP → /mercado-it-uruguay.
//
// Por qué un cron del backend y no una Nitro task: el app corre en cluster ×2 y toda tarea
// programada ahí dispara dos veces. Este job es single-instance por construcción.
//
//   node dist/sync_charruadevs.js                 corrida diaria
//   node dist/sync_charruadevs.js --seed <dir>    siembra (texts.jsonl + state.json)
//   node dist/sync_charruadevs.js --dry-run       calcula todo, no escribe el snapshot ni el estado
import dotenv from "dotenv";
dotenv.config();

import { appDbConfigured } from "./classes/appdb";
import { runRefresh } from "./classes/charruadevs/refresh";

async function main(): Promise<void> {
  if (!appDbConfigured()) {
    console.error(
      "[charruadevs] APP_MONGO_URI is not set — refusing to run. El corpus vive en la base del app " +
        "(copiar el MONGO_URI de app/.env); escribirlo en la del backend dejaría /mercado-it-uruguay vacía sin error."
    );
    process.exit(1);
  }
  const seedIdx = process.argv.indexOf("--seed");
  const seedDir = seedIdx >= 0 ? process.argv[seedIdx + 1] : undefined;
  try {
    const report = await runRefresh({ seedDir, dryRun: process.argv.includes("--dry-run") });
    console.log(`[charruadevs] ${JSON.stringify(report)}`);
    if (report.failed) console.warn(`[charruadevs] ${report.failed} textos sin etiqueta (Gemini); se reintentan mañana`);
    process.exit(report.wrote || report.reason === "dry-run" ? 0 : 1);
  } catch (err) {
    console.error("[charruadevs] falló:", err);
    process.exit(1);
  }
}

void main();
```

`ecosystem.config.js` — nuevo objeto inmediatamente después del de `currency-videos`:
```js
    {
      // Termómetro del mercado IT (/mercado-it-uruguay): r/CharruaDevs desde Arctic Shift, cada
      // post y cada comentario "de mercado" clasificado con Gemini (postura −2…+2, tema, IA,
      // relato), votos vivos vía la API de Reddit y un snapshot en la base del APP. Diario 12:14 UTC:
      // minuto 14, fuera de los */5 de currency-sync; ~100 textos nuevos por día. Necesita
      // APP_MONGO_URI y la clave de Gemini.
      name: "currency-charruadevs",
      autorestart: false,
      exec_mode: "fork",
      script: "dist/sync_charruadevs.js",
      cron_restart: "14 12 * * *",
      log_date_format: "YYYY-MM-DD HH:mm Z",
    },
```

`scripts/deploy-backend.sh` línea 51: agregar ` currency-charruadevs` antes del `)` final.

`package.json` scripts: `"sync_charruadevs": "ts-node sync_charruadevs.ts",` (después de `sync_regional_backfill`).

`AGENTS.md`: fila en la tabla pm2 (después de `currency-combustibles`):
```
| currency-charruadevs | dist/sync_charruadevs.js | 14 12 * * * | `/mercado-it-uruguay`: r/CharruaDevs (Arctic Shift + API de Reddit para votos/borrados) → Gemini con esquema JSON (`askJSON` en `classes/gemini.ts`) → APP DB `charruadevstexts` (buscador, índice `$text` español, sin autores) + `charruadevssnapshots` (`snapshot` + `state`). Cada corrida baja los DOS últimos meses completos y sólo clasifica lo que no está; lo que Gemini no etiqueta no se guarda y se reintenta mañana. Lo borrado hoy en Reddit queda `gone` y no se muestra. Se niega a pisar el tablero con un snapshot 10 % más flaco. Sembrado una vez con `--seed <dir>`. Ver `docs/app/CHARRUADEVS.md` |
```
y `sync_charruadevs.ts` en la lista de entradas; `charruadevs` en la lista de dirs de `classes/`.

`classes/AGENTS.md`: fila en la tabla de subsistemas: `charruadevs/ | termómetro de r/CharruaDevs → /mercado-it-uruguay (job currency-charruadevs) |`.

`docs/app/CHARRUADEVS.md`: método, rúbrica, validación, siembra, operación (ver Task 11 para el contenido final con cifras).

- [ ] **Step 4: correr y ver que pasa, más los tripwires del registro**

Run: `npx vitest run tests/charruadevs tests/sync/pm2_registration.test.ts tests/sync/connect_tripwire.test.ts tests/no_scheduler_in_api.test.ts tests/redditbot/solo_comenta.test.ts`
Expected: PASS.

- [ ] **Step 5: build del backend**

Run: `npx tsc -p tsconfig.production.json --noEmit`
Expected: sin errores.

- [ ] **Step 6: commit**

```bash
git add classes/charruadevs/refresh.ts sync_charruadevs.ts ecosystem.config.js scripts/deploy-backend.sh package.json AGENTS.md classes/AGENTS.md docs/app/CHARRUADEVS.md tests/charruadevs/refresh.test.ts
git commit -m "feat(charruadevs): job diario currency-charruadevs con siembra y guardas"
```

Nota de ejecución: `npx tsc -p tsconfig.production.json --noEmit` en un worktree fresco falla por
`sync_sheet.ts` (importa `sheet_key.json`, gitignored y sólo en el VPS). Gate: cero errores fuera de
ese archivo.

---

### Task 7: Utilidades puras del app (query, resaltado, tipos del snapshot)

**Files:**
- Create: `app/utils/charruadevs.ts`, `app/server/utils/charruadevsSearch.ts`
- Test: `app/tests/unit/charruadevs.test.ts`, `app/tests/unit/charruadevsSearch.test.ts`

**Interfaces:**
- Produces: `STANCE_META`, `stanceMeta(v)`, `THEME_LABELS`, `AI_LABELS`, `EVENT_LABELS`, `PERSONA_LABELS`, `SearchQuery`, `DEFAULT_SEARCH_QUERY`, `SEARCH_PER_PAGE` (20), `SEARCH_MAX_PAGE` (250), `normalizeSearchQuery(raw)`, `searchQueryToParams(q)`, `isDefaultSearch(q)`, `fold(text)`, `queryTerms(q)`, `highlightSegments(text, terms)`, `excerptAround(body, terms, max)`, `SearchItem`/`SearchFacets`/`SearchResponse`, tipos del snapshot (`CharruaSnapshot` y sus filas), `monthLabel`, `quarterLabel`, `fmtPct`, `fmtInt`, `outOfTen`, `fmtPts`, `MARKET_CONTEXT` (cifras externas fechadas y con fuente); `buildSearchMatch(q)`, `buildSearchSort(q)`, `shapeFacets(raw)`.

Reglas que los tests fijan: parámetros de URL cortos (`q`, `s`, `k`, `t`, `ia`, `ev`, `desde`, `hasta`, `orden`, `p`) que omiten los valores por defecto y hacen ida y vuelta; todo valor inventado cae al defecto (incluido `t=toString`); `relevance` sin texto se vuelve `recent`; el resaltado es por unidad UTF-16 plegada (sin tildes ni mayúsculas) y nunca produce HTML; el `$match` siempre lleva `rel: true, gone: false`, `$text` en español y NUNCA collation.

Colores de `STANCE_META`: tokens "Sentiment" de DESIGN.md (canónico para ±1, un paso más profundo de la misma rampa para ±2); rellenos, nunca texto.

- [x] Tests primero, implementación, `npx vitest run tests/unit/charruadevs.test.ts tests/unit/charruadevsSearch.test.ts` en verde.

### Task 8: API del app

**Files:**
- Create: `app/server/api/charruadevs/summary.get.ts` (el snapshot; `cache-control: public, max-age=900, s-maxage=3600, stale-while-revalidate=86400`; `null` ante error), `app/server/api/charruadevs/search.get.ts` (`find` con proyección + orden + página y un `$facet` con total, reparto por postura y `{año, signo}`; extractos armados en el servidor con `excerptAround`; `503` con `no-store` ante error).

### Task 9: Componentes y página

**Files:**
- Create: `app/components/mercadoIt/LikertChart.vue` (barras divergentes con `BarChart`: neutral partido al medio, negativos apilados hacia la izquierda), `ThemesTable.vue` (peso y tono por tema, barras CSS), `QuoteCard.vue`, `ResultCard.vue` (resaltado con `<mark>` sobre segmentos, sin `v-html`), `SearchPanel.vue` (texto + chips de sentimiento + selects; la URL es el estado; `useFetch` sólo en cliente; ignora el eco de los controles al montar comparando parámetros; facetas de la búsqueda y tono por año), `app/pages/mercado-it-uruguay.vue` (raíz `VContainer`, un `<h1>`, SEO + canonical + JSON-LD con BreadcrumbList/Article/Dataset, OG image, textos calculados desde el snapshot para que no queden viejos, FAQ con `FaqSection`).
- Modify: `app/utils/siteNav.ts` (entrada después de `/contractor-en-uruguay`), `app/i18n/locales/json/{es,en,pt}.json` (`nav.mercadoIt`).

- [x] `npx eslint` sobre los archivos nuevos en cero; suite completa del app en verde (442 archivos).

### Task 10: Verificación local contra datos reales

- [x] Mongo en memoria (`mongodb-memory-server`) en el scratchpad; siembra con el entrypoint real: `APP_MONGO_URI=mongodb://127.0.0.1:27018/app npx ts-node -T sync_charruadevs.ts --seed <dir>` → `{"mode":"seed","classified":154691,"texts":154691,"wrote":true}`.
- [ ] Corrida diaria en `--dry-run` con credenciales reales contra ese Mongo (Arctic Shift + Gemini + Reddit).
- [ ] `nuxi dev --port 3100` con `MONGO_URI` local: página sin errores de consola, gráficos dibujados, buscador con texto y filtros, ancho de teléfono.

### Task 11: Despliegue y siembra en producción

- [ ] Merge a `main` desde un worktree temporal, push (CI despliega app y backend).
- [ ] Subir `texts.jsonl.gz` + `state.json` al VPS fuera del repo (`/root/charruadevs-seed/`), `node dist/sync_charruadevs.js --seed /root/charruadevs-seed`.
- [ ] Verificar en producción: `/api/charruadevs/summary`, `/api/charruadevs/search?q=IA`, la página, y que `currency-charruadevs` quedó registrado en pm2 con su cron.
