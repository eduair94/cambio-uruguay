// A validated spec, turned into the exact files a commit needs.
//
// Pure on purpose: every function here takes the current contents of a file and returns the new
// contents, so the whole emission can be tested without a checkout, a network or a git tree. The
// part that touches disk is `workspace.ts`, and it does nothing but write what this returns.
//
// Two rules shape the output.
//
//   Everything the model produced becomes a STRING in a data file, never markup. `JSON.stringify`
//   makes a stray quote or a newline inert; the same character inside an emitted `<template>` is a
//   build failure nobody is awake to see.
//
//   The only hand-maintained files touched are the three i18n catalogues, and those are edited as
//   parsed JSON rather than as text. `siteNav.ts` is never touched at all — the nav entry goes into
//   `generatedPages.ts`, which exists for exactly this.

import type { PageSpec } from "./pageSpec";

export interface EmittedFile {
  /** Repo-relative, forward slashes. */
  path: string;
  content: string;
}

/** Where the nav array waits for its next entry. */
export const NAV_MARKER = "  // <<< generated-nav >>>";
/** Where the addenda array waits for its next entry. */
export const ADDENDA_MARKER = "  // <<< generated-addenda >>>";

const q = (value: string): string => JSON.stringify(value);
const list = (values: readonly string[], indent: string): string =>
  values.length ? `[\n${values.map((v) => `${indent}  ${q(v)},`).join("\n")}\n${indent}]` : "[]";

export interface EmitContext {
  spec: PageSpec;
  /** Human label of the topic it was filed under. */
  topicLabel: string;
  /** ISO date. Injected so a run is reproducible and tests are not clock-dependent. */
  today: string;
  /** Permalinks of the threads that asked for it. */
  askedIn: readonly string[];
}

/** `app/utils/generated/<slug>.ts` — the page's content as data. */
export function emitDataFile({ spec, topicLabel, today, askedIn }: EmitContext): EmittedFile {
  const sections = spec.sections
    .map(
      (section) =>
        `    {\n      heading: ${q(section.heading)},\n      body: ${list(section.body, "      ")},\n    },`
    )
    .join("\n");

  const verdicts = spec.verdicts
    .map((verdict) => `    { claim: ${q(verdict.claim)}, answer: ${q(verdict.answer)} },`)
    .join("\n");

  const steps = spec.steps
    .map((step) => `    { title: ${q(step.title)}, detail: ${q(step.detail)} },`)
    .join("\n");

  const faqs = spec.faqs
    .map((faq) => `    { question: ${q(faq.question)}, answer: ${q(faq.answer)} },`)
    .join("\n");

  const sources = spec.sources
    .filter((source) => source.verified)
    .map((source) => `    { title: ${q(source.title)}, url: ${q(source.url)} },`)
    .join("\n");

  const content = `// ${spec.title}
//
// Página escrita automáticamente por el pipeline de huecos de Reddit el ${today}, a partir de
// preguntas reales que el sitio no contestaba. Antes de publicarse: la pregunta pasó la lista de
// temáticas del sitio, cada fuente se descargó y devolvió 200, y CADA cifra de este archivo se
// encontró literal en el texto de una de esas fuentes. Ver classes/gaps/publish.ts.
//
// Se puede editar a mano sin problema: a partir de ese momento es una página más.

import type { GeneratedGuide } from '../generatedGuide'

export const guide: GeneratedGuide = {
  slug: ${q(spec.slug)},
  title: ${q(spec.title)},
  navLabel: ${q(spec.navLabel)},
  topicLabel: ${q(topicLabel)},
  icon: ${q(spec.icon)},
  description: ${q(spec.description)},
  intro: ${q(spec.intro)},
  verdicts: [
${verdicts}
  ],
  sections: [
${sections}
  ],
  steps: [
${steps}
  ],
  faqs: [
${faqs}
  ],
  related: ${list(spec.related, "  ")},
  keywords: ${list(spec.keywords, "  ")},
  notConfirmed: ${list(spec.notConfirmed, "  ")},
  sources: [
${sources}
  ],
  createdAt: ${q(today)},
  askedIn: ${list([...askedIn], "  ")},
}
`;

  return { path: `app/utils/generated/${spec.slug}.ts`, content };
}

/** `app/pages/<slug>.vue` — a wrapper thin enough that it cannot be malformed. */
export function emitPageFile(spec: PageSpec): EmittedFile {
  const content = `<template>
  <AutoGuide :guide="guide" />
</template>

<script setup lang="ts">
// Generada por el pipeline de huecos de Reddit. Todo el contenido vive en el archivo de datos;
// el layout, el SEO y los schema los pone components/AutoGuide.vue.
import { guide } from '~/utils/generated/${spec.slug}'
</script>
`;
  return { path: `app/pages/${spec.slug}.vue`, content };
}

/** Insert the nav entry at the marker in `generatedPages.ts`. Idempotent by route. */
export function emitNavEntry(current: string, spec: PageSpec): EmittedFile | null {
  const route = `/${spec.slug}`;
  if (current.includes(`to: '${route}'`)) return null; // already registered
  if (!current.includes(NAV_MARKER)) {
    throw new Error(`app/utils/generatedPages.ts perdió el marcador ${NAV_MARKER.trim()}`);
  }

  const keywords = spec.keywords.map((k) => `      ${JSON.stringify(k).replace(/"/g, "'")},`).join("\n");
  const entry = [
    "  {",
    `    to: '${route}',`,
    `    labelKey: 'nav.${spec.navKey}',`,
    `    icon: '${spec.icon}',`,
    "    priority: 0.6,",
    "    changefreq: 'monthly',",
    "    keywords: [",
    keywords,
    "    ],",
    "  },",
  ].join("\n");

  return {
    path: "app/utils/generatedPages.ts",
    content: current.replace(NAV_MARKER, `${entry}\n${NAV_MARKER}`),
  };
}

/**
 * Add `nav.<key>` to one locale catalogue.
 *
 * Edited as parsed JSON, not as text: these three files are hand-maintained and large, and a regex
 * insertion that lands one brace off corrupts every translation on the site.
 *
 * The label is the same Spanish string in all three locales, because the page itself only exists in
 * Spanish. A translated nav entry pointing at a Spanish-only page would be a worse lie than an
 * untranslated one.
 */
export function emitLocaleEntry(current: string, spec: PageSpec, locale: string): EmittedFile | null {
  const parsed = JSON.parse(current) as Record<string, any>;
  const nav = (parsed.nav ??= {});
  if (nav[spec.navKey] === spec.navLabel) return null;
  nav[spec.navKey] = spec.navLabel;
  return {
    path: `app/i18n/locales/json/${locale}.json`,
    // Two-space indent and a trailing newline: what the existing files use.
    content: `${JSON.stringify(parsed, null, 2)}\n`,
  };
}

export interface EmitInputs extends EmitContext {
  /** Current contents of the files that get patched rather than created. */
  generatedPagesTs: string;
  locales: Record<string, string>;
}

/** Every file the commit should write. */
export function emitAll(inputs: EmitInputs): EmittedFile[] {
  const files: EmittedFile[] = [emitDataFile(inputs), emitPageFile(inputs.spec)];

  const nav = emitNavEntry(inputs.generatedPagesTs, inputs.spec);
  if (nav) files.push(nav);

  for (const [locale, content] of Object.entries(inputs.locales)) {
    const patched = emitLocaleEntry(content, inputs.spec, locale);
    if (patched) files.push(patched);
  }

  return files;
}

export interface AddendumPayload {
  route: string;
  updatedAt: string;
  items: Array<{ question: string; answer: string; sources: Array<{ title: string; url: string }> }>;
}

/**
 * Añadir o reemplazar la ampliación de una página en `app/utils/generated/addenda.ts`.
 *
 * Reemplaza, no acumula: una ampliación es la respuesta actual a lo que la gente venía preguntando
 * sobre esa página, y dos bloques para la misma ruta se renderizarían dos veces.
 *
 * Igual que el resto de este archivo, el contenido sale como STRINGS de datos. La página que se
 * amplía no se toca: el layout inyecta esto por ruta.
 */
export function emitAddendum(current: string, addendum: AddendumPayload): EmittedFile {
  if (!current.includes(ADDENDA_MARKER)) {
    throw new Error(`app/utils/generated/addenda.ts perdió el marcador ${ADDENDA_MARKER.trim()}`);
  }

  const items = addendum.items
    .map((item) => {
      const sources = item.sources
        .map((s) => `          { title: ${q(s.title)}, url: ${q(s.url)} },`)
        .join("\n");
      return [
        "      {",
        `        question: ${q(item.question)},`,
        `        answer: ${q(item.answer)},`,
        "        sources: [",
        sources,
        "        ],",
        "      },",
      ].join("\n");
    })
    .join("\n");

  const block = [
    "  {",
    `    route: ${q(addendum.route)},`,
    `    updatedAt: ${q(addendum.updatedAt)},`,
    "    items: [",
    items,
    "    ],",
    "  },",
  ].join("\n");

  // Sacar el bloque anterior de esta ruta, si lo había. Por búsqueda de texto y no por regex:
  // una ruta lleva barras y guiones, y armar la expresión escapada correctamente a través de
  // capas de comillas es justo donde este archivo ya se rompió una vez.
  const head = `  {
    route: ${q(addendum.route)},`;
  let cleaned = current;
  const at = cleaned.indexOf(head);
  if (at >= 0) {
    const end = cleaned.indexOf(`
  },`, at);
    if (end >= 0) cleaned = cleaned.slice(0, at) + cleaned.slice(end + 5);
  }
  return {
    path: "app/utils/generated/addenda.ts",
    content: cleaned.replace(ADDENDA_MARKER, `${block}\n${ADDENDA_MARKER}`),
  };
}
