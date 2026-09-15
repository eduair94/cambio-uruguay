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

export function renderPostsPrompt(
  posts: Array<Pick<ArcticPost, "id" | "created_utc" | "title" | "selftext" | "link_flair_text">>
): string {
  const lines = posts.map((p) => {
    const body = isGone(p.selftext) ? "" : clip(p.selftext, 1400);
    return `- id: ${p.id} | ${ym(p.created_utc)} | flair: ${p.link_flair_text || "-"}\n  TÍTULO: ${clip(p.title, 300)}${
      body ? `\n  TEXTO: ${body}` : ""
    }`;
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
