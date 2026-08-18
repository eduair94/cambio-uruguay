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
  sections: PageSection[];
  faqs: PageFaq[];
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
    ...spec.sections.flatMap((section) => [section.heading, ...section.body]),
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
export function validatePageSpec(spec: PageSpec, existingRoutes: ReadonlySet<string> = new Set()): SpecProblem[] {
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
