// What an auto-published page must be, and the checks it has to survive to become one.
//
// This file is the reason the pipeline is allowed to publish without a person reading the sentence
// first. The prompt asks for a good page; this decides whether one arrived. Everything here is
// mechanical — no judgement calls, no "seems fine" — because the whole point is that it runs at
// 05:35 with nobody watching.
//
// The rule that carries the weight is the same one that guards the Reddit replies: EVERY figure in
// the page must appear, literally, in the text of a source we downloaded ourselves. Not "the model
// says this source supports it" — the bytes of that page, fetched and checked. A model naming a
// plausible IMPO article it never opened is the normal failure mode, and on these topics — customs
// charges, taxes, loan rates — being confidently wrong costs the reader money.
//
// When a spec fails, nothing is published. There is no "publish with warnings": the alternative to
// a verified page is no page, and no page is fine.

import { inventedNumbers } from "../numbers";

export interface PageSection {
  heading: string;
  /** Paragraphs, in order. Plain prose — no markdown, no lists. */
  body: string[];
}

/**
 * "La respuesta corta": the belief someone arrives with, and what is actually true.
 *
 * The first screen decides whether the page was worth the click. Somebody coming from a Reddit
 * comment has a specific thing they think is true and a specific thing they want to know; a page
 * that opens with three paragraphs of context loses them, and a page that opens with the verdict
 * keeps them for the paragraphs. This is also the block that reads least like generated filler,
 * because it has to commit to an answer.
 */
export interface PageVerdict {
  /** The question or the common belief, in the reader's words. */
  claim: string;
  /** The answer. One or two sentences, committed. */
  answer: string;
}

/** An ordered procedure, when the honest answer is "hacé esto, en este orden". */
export interface PageStep {
  title: string;
  detail: string;
}

export interface PageFaq {
  question: string;
  answer: string;
}

export interface PageSource {
  title: string;
  url: string;
  /** Verbatim text we downloaded from that URL. Empty when the fetch failed. */
  text: string;
  /** Did WE request it and get a 200? */
  verified: boolean;
}

export interface PageSpec {
  /** Route, without the leading slash: `comprar-x-en-uruguay`. */
  slug: string;
  /** `<h1>` and `<title>` base. */
  title: string;
  /** Nav label — short, a few words. */
  navLabel: string;
  /** camelCase i18n key under `nav.`. */
  navKey: string;
  /** `mdi-…` icon for the nav entry. */
  icon: string;
  /** Meta description. */
  description: string;
  /** Lead paragraph, above the fold. */
  intro: string;
  /** The first screen. See {@link PageVerdict}. */
  verdicts: PageVerdict[];
  sections: PageSection[];
  /** Optional: only when the answer really is a procedure. */
  steps: PageStep[];
  faqs: PageFaq[];
  /**
   * Existing pages of this site to link, validated against the real routes.
   *
   * Both halves of the point matter. A reader who got one answer usually has the next question, and
   * sending them to a page that already exists is worth more than a paragraph; and a new page with
   * no inbound or outbound links is an orphan that search engines treat accordingly. Validated
   * because a link to a route that does not exist is a 404 shipped automatically.
   */
  related: string[];
  /** Search synonyms for `siteNav`. */
  keywords: string[];
  /**
   * What the research could NOT confirm.
   *
   * Rendered on the page, not hidden. A page that says "esto no lo pudimos confirmar" is more
   * useful and more honest than one that quietly rounds a gap into a claim, and it is the section
   * a human editor goes to first.
   */
  notConfirmed: string[];
  sources: PageSource[];
}

export const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const NAV_KEY_RE = /^[a-z][a-zA-Z0-9]*$/;
const MDI_RE = /^mdi-[a-z0-9-]+$/;

const MIN_SECTIONS = 3;
const MIN_VERDICTS = 2;
const MAX_VERDICTS = 4;
const MIN_RELATED = 1;
const MAX_RELATED = 4;
const MIN_VERIFIED_SOURCES = 2;
const MIN_INTRO_WORDS = 40;
const MAX_TITLE = 80;
const MAX_DESCRIPTION = 165;

/** Filler that would mark the page as machine-written to any reader. Same list as the replies use. */
const BANNED = [
  "es importante destacar",
  "es importante mencionar",
  "cabe destacar",
  "cabe mencionar",
  "en resumen,",
  "en conclusion,",
  "en definitiva,",
  "espero que esto te ayude",
  "como modelo de lenguaje",
  "en el mundo actual",
  "en la era digital",
];

const strip = (text: string): string =>
  text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/\s+/g, " ")
    .trim();

/** Everything a reader would see, as one string. What the number rule is applied to. */
export function proseOf(spec: PageSpec): string {
  return [
    spec.title,
    spec.description,
    spec.intro,
    ...(spec.verdicts ?? []).flatMap((verdict) => [verdict.claim, verdict.answer]),
    ...spec.sections.flatMap((section) => [section.heading, ...section.body]),
    ...(spec.steps ?? []).flatMap((step) => [step.title, step.detail]),
    ...spec.faqs.flatMap((faq) => [faq.question, faq.answer]),
    ...spec.notConfirmed,
  ].join("\n");
}

/** The text of every source we actually downloaded. The only figures the page may use. */
export function evidenceOf(spec: PageSpec): string {
  return spec.sources
    .filter((source) => source.verified && source.text)
    .map((source) => source.text)
    .join("\n");
}

export interface SpecProblem {
  field: string;
  detail: string;
}

/**
 * Everything wrong with this spec. Empty means it may be published.
 *
 * Returns ALL problems rather than the first, so one research call can be retried against a
 * complete list instead of one round trip per defect.
 */
export function validatePageSpec(
  spec: PageSpec,
  existingRoutes: ReadonlySet<string> = new Set(),
  { requireRelated = true }: { requireRelated?: boolean } = {}
): SpecProblem[] {
  const problems: SpecProblem[] = [];
  const fail = (field: string, detail: string) => problems.push({ field, detail });

  if (!SLUG_RE.test(spec.slug)) fail("slug", `"${spec.slug}" no es un slug kebab-case válido`);
  if (existingRoutes.has(`/${spec.slug}`)) fail("slug", `/${spec.slug} ya existe`);
  if (!spec.title || spec.title.length > MAX_TITLE) fail("title", `1-${MAX_TITLE} caracteres`);
  if (!spec.description || spec.description.length > MAX_DESCRIPTION) {
    fail("description", `1-${MAX_DESCRIPTION} caracteres (son ${spec.description?.length ?? 0})`);
  }
  if (!NAV_KEY_RE.test(spec.navKey)) fail("navKey", `"${spec.navKey}" no es camelCase`);
  if (!spec.navLabel || spec.navLabel.length > 40) fail("navLabel", "1-40 caracteres");
  if (!MDI_RE.test(spec.icon)) fail("icon", `"${spec.icon}" no es un icono mdi-*`);
  if (!spec.keywords?.length) fail("keywords", "hacen falta sinónimos de búsqueda");

  const introWords = (spec.intro || "").split(/\s+/).filter(Boolean).length;
  if (introWords < MIN_INTRO_WORDS) fail("intro", `${introWords} palabras, mínimo ${MIN_INTRO_WORDS}`);

  // The first screen. A page that cannot commit to two plain answers has not understood the
  // question well enough to be published under the site's name.
  const verdicts = spec.verdicts ?? [];
  if (verdicts.length < MIN_VERDICTS || verdicts.length > MAX_VERDICTS) {
    fail("verdicts", `${verdicts.length} respuestas cortas, tienen que ser entre ${MIN_VERDICTS} y ${MAX_VERDICTS}`);
  }
  verdicts.forEach((verdict, i) => {
    if (!verdict.claim?.trim()) fail(`verdicts[${i}]`, "sin pregunta");
    const words = (verdict.answer || "").split(/\s+/).filter(Boolean).length;
    if (words < 6) fail(`verdicts[${i}]`, `la respuesta a "${verdict.claim}" no dice nada (${words} palabras)`);
    if (words > 60) fail(`verdicts[${i}]`, "la respuesta corta no es corta");
  });

  (spec.steps ?? []).forEach((step, i) => {
    if (!step.title?.trim() || !step.detail?.trim()) fail(`steps[${i}]`, "paso vacío");
  });

  if ((spec.sections?.length ?? 0) < MIN_SECTIONS) {
    fail("sections", `${spec.sections?.length ?? 0} secciones, mínimo ${MIN_SECTIONS}`);
  }
  spec.sections?.forEach((section, i) => {
    if (!section.heading) fail(`sections[${i}]`, "sin encabezado");
    if (!section.body?.length || section.body.every((p) => !p.trim())) fail(`sections[${i}]`, "sin cuerpo");
    // A page made of headings with one line each is a listicle, not an answer.
    const words = (section.body || []).join(" ").split(/\s+/).filter(Boolean).length;
    if (words < 25) fail(`sections[${i}]`, `sólo ${words} palabras bajo "${section.heading}"`);
  });

  // Internal links. Checked against the real routes because a generated 404 is a page the site
  // published pointing at nothing — and `requireRelated` is off only when the caller could not
  // supply the route list, where demanding links it cannot validate would block every page.
  const related = spec.related ?? [];
  if (requireRelated && existingRoutes.size) {
    if (related.length < MIN_RELATED) fail("related", "hace falta al menos un enlace a una página existente");
    if (related.length > MAX_RELATED) fail("related", `${related.length} enlaces internos, máximo ${MAX_RELATED}`);
    for (const route of related) {
      if (route === `/${spec.slug}`) fail("related", "se enlaza a sí misma");
      else if (!existingRoutes.has(route)) fail("related", `${route} no existe`);
    }
  }

  const verified = (spec.sources || []).filter((source) => source.verified);
  if (verified.length < MIN_VERIFIED_SOURCES) {
    fail("sources", `${verified.length} fuentes verificadas, mínimo ${MIN_VERIFIED_SOURCES}`);
  }
  // A source the model named and we could not fetch is not merely unhelpful: it is evidence the
  // research invented citations, which taints the rest.
  const unverified = (spec.sources || []).filter((source) => !source.verified);
  if (unverified.length > verified.length) {
    fail("sources", `más fuentes rotas (${unverified.length}) que verificadas (${verified.length})`);
  }

  // THE RULE. Every figure on the page has to be in the bytes of a source we downloaded.
  const invented = inventedNumbers(proseOf(spec), evidenceOf(spec));
  if (invented.length) fail("numbers", `cifras que no están en ninguna fuente descargada: ${invented.join(", ")}`);

  const prose = strip(proseOf(spec));
  const banned = BANNED.find((phrase) => prose.includes(strip(phrase)));
  if (banned) fail("prose", `muletilla de relleno: "${banned}"`);

  return problems;
}

/** A one-line summary for a Telegram message or a commit body. */
export function describeProblems(problems: readonly SpecProblem[]): string {
  return problems.map((p) => `${p.field}: ${p.detail}`).join(" | ");
}

/**
 * The problems, plus what to DO about them, for the retry.
 *
 * Naming the defect is not enough on the one that matters. Told only "the figures 15 and 45 are in
 * no source", a model rewrites the same sentence with different numbers — it treats the claim as
 * required and the figure as negotiable. The instruction it actually needs is the opposite: the
 * claim is what goes, and the honest version of the page says so out loud.
 *
 * Observed: a page about how long customs holds a package failed twice this way, because no
 * official source publishes a timeframe. Refusing was right; a third identical retry would not have
 * been.
 */
export function correctionFor(problems: readonly SpecProblem[]): string {
  const lines = [describeProblems(problems)];

  if (problems.some((p) => p.field === "numbers")) {
    lines.push(
      "",
      "Sobre las cifras: NO las reemplaces por otras. Si el texto descargado no sostiene un número, " +
        "la afirmación entera se cae. Sacá la oración y poné en \"notConfirmed\" qué no se pudo " +
        "confirmar, con esas palabras. Una página que dice \"no hay un plazo publicado\" es más útil " +
        "y más honesta que una que estima uno.",
      "",
      "Si al sacar esas afirmaciones la página queda sin sustancia, devolvé menos secciones pero " +
        "sólidas. Preferimos una página corta y sostenida a una larga y estimada."
    );
  }

  if (problems.some((p) => p.field === "related")) {
    lines.push("", "Los enlaces internos tienen que ser rutas EXACTAS de la lista que te pasé. No inventes ninguna.");
  }

  return lines.join("\n");
}
