// app/utils/bcuWarnings.ts
// Parser for the BCU's public list of "advertencias al público" — the entities it has publicly
// said are NOT authorised / NOT registered to operate.
//
// PURE (string → data) so it can be unit-tested against a captured fixture, like the other
// scrapers in this repo.
//
// ─────────────────────────────────────────────────────────────────────────────────────────
// WHAT WE MAY AND MAY NOT PUBLISH — read this before changing anything here.
//
// This page NAMES COMPANIES, so getting it wrong is not a bug, it is a defamation risk. Two
// hard rules, both verified with counsel-grade sourcing:
//
//  1. WE REPRODUCE THE BCU, WE DO NOT JUDGE. Código Penal art. 336 lit. B exempts whoever
//     "reprodujere cualquier clase de manifestación sobre asuntos de interés público, cuando el
//     autor de las mismas se encuentre identificado" — i.e. it protects us QUOTING the BCU with
//     attribution. It does NOT protect us answering "¿está autorizada?" in our own voice. So
//     every string we publish is the BCU's own headline, always attributed and linked, and we
//     never assert an authorisation status ourselves. `entities` below is the BCU's wording,
//     not our conclusion.
//
//  2. THE BCU'S OWN PAGE HAS A DATA BUG, AND WE MUST NOT LAUNDER IT. Two entries ("Kredimio",
//     29/07/2024, and "Remesas Tres Cruces", 19/11/2024) link the SAME comunicado — which only
//     discusses one of them. If we linked an accusation to a PDF that does not name the accused
//     entity, we would be publishing a claim its own source does not support, and we would lose
//     the art. 336 defence precisely where we need it. So a comunicado shared by more than one
//     entry is flagged (`sharedSource`) and the UI links to the BCU's listing instead of the PDF.
// ─────────────────────────────────────────────────────────────────────────────────────────

/** What the BCU published. `cese` = it ordered the activity to stop. */
export type WarningKind = 'advertencia' | 'cese' | 'otro'

export interface BcuWarning {
  /** 'YYYY-MM-DD' (the page publishes DD/MM/YYYY). */
  date: string
  /** The BCU's own headline, verbatim. Never our paraphrase. */
  title: string
  /** The entity/entities as the BCU names them. Their words, not our verdict. */
  entities: string
  kind: WarningKind
  /** Where the BCU published it. */
  url: string
  /**
   * True when another entry links this exact document. The BCU has at least one such pair, and
   * the shared PDF does not name both entities — so we must not present it as that entity's
   * source. The UI links to the BCU index instead.
   */
  sharedSource: boolean
}

/** The BCU's public listing. The only page we cite as the source of these claims. */
export const BCU_WARNINGS_URL =
  'https://usuariofinanciero.bcu.gub.uy/recomendaciones-y-advertencias/'

/** The BCU's registry of entities that ARE authorised — for the positive question. */
export const BCU_REGISTRY_URL =
  'https://www.bcu.gub.uy/Servicios-Financieros-SSF/Paginas/buscador_Registros.aspx'

/** Strip tags and collapse whitespace — the text as a reader sees it. */
function text(html: string): string {
  return html
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#8220;|&#8221;|&ldquo;|&rdquo;/gi, '"')
    .replace(/\s+/g, ' ')
    .trim()
}

function toIsoDate(ddmmyyyy: string): string {
  const [d, m, y] = ddmmyyyy.split('/')
  return `${y}-${m}-${d}`
}

function kindOf(title: string): WarningKind {
  const t = title.toUpperCase()
  if (/\bCESE\b|CESAR|CESE INMEDIATO/.test(t)) return 'cese'
  if (/ADVERTENCIA/.test(t)) return 'advertencia'
  return 'otro'
}

/**
 * Pull the entity names out of the BCU's headline.
 *
 * The shape is `DD/MM/YYYY - <entidades> - ADVERTENCIA sobre …`, but it is not reliable: some
 * entries have no separating dash before the verdict, and the entity list itself contains commas
 * and dashes. So we take everything between the date and the first occurrence of the verdict
 * word, and fall back to the whole remainder. Whatever we get, it is still the BCU's wording.
 */
function splitEntities(rest: string): string {
  const verdict = rest.search(/\bADVERTENCIA\b|\bCESE\b|\bSE\s+DISPONE\b/i)
  const raw = verdict > 0 ? rest.slice(0, verdict) : rest
  return raw
    .replace(/^[\s\-–—]+/, '')
    .replace(/[\s\-–—]+$/, '')
    .trim()
}

/**
 * Parse the BCU listing page.
 *
 * Three traps, all confirmed against the live page:
 *  - the `.reporte_anual` class is NOT clean: of 61 anchors, 5 are prevention/news cards and one
 *    is an empty `href="#"`. Only entries whose text STARTS with a date are advertencias.
 *  - the href has three shapes (`/Comunicados/seggco*.pdf`, `/Servicios-Financieros-SSF/
 *    Resoluciones_SSF/RR-SSF-*.pdf`, and `Detalle-Noticia.aspx`), and some are plain `http`.
 *  - one comunicado is shared by two entries (see the header). We flag it rather than drop it.
 */
export function parseBcuWarnings(html: string): BcuWarning[] {
  const anchors = [
    ...html.matchAll(
      /<a[^>]*class="[^"]*reporte_anual[^"]*"[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi
    ),
  ]

  const rows: BcuWarning[] = []
  for (const m of anchors) {
    const href = (m[1] ?? '').trim()
    const label = text(m[2] ?? '')

    // Match ONLY the date, then slice. A single regex spanning the whole label ("date, optional
    // dash, then anything") backtracks super-linearly on a hostile string — and this input comes
    // off the public internet.
    const dated = label.match(/^\d{2}\/\d{2}\/\d{4}/)
    if (!dated || !href || href === '#') continue // recommendations/news cards, not advertencias

    const rest = label
      .slice(dated[0].length)
      .replace(/^[\s\-–—]+/, '')
      .trim()
    if (!rest) continue

    rows.push({
      date: toIsoDate(dated[0]),
      title: rest,
      entities: splitEntities(rest),
      kind: kindOf(rest),
      url: href.replace(/^http:\/\//i, 'https://'),
      sharedSource: false,
    })
  }

  // Flag any document that more than one entry points at (the BCU's bug).
  const byUrl = new Map<string, number>()
  for (const r of rows) byUrl.set(r.url, (byUrl.get(r.url) ?? 0) + 1)
  for (const r of rows) r.sharedSource = (byUrl.get(r.url) ?? 0) > 1

  return rows.sort((a, b) => b.date.localeCompare(a.date))
}

/** Free-text search over the BCU's own words. Accent- and case-insensitive. */
export function searchWarnings(rows: readonly BcuWarning[], query: string): BcuWarning[] {
  const q = norm(query.trim())
  if (!q) return [...rows]
  return rows.filter(r => norm(`${r.entities} ${r.title}`).includes(q))
}

function norm(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
}

/**
 * The link we publish for an entry. For a comunicado shared by several entries we deliberately
 * send the reader to the BCU's own index instead of to a document that may not name the entity.
 */
export function sourceLink(w: BcuWarning): string {
  return w.sharedSource ? BCU_WARNINGS_URL : w.url
}

// ─────────────────────────────────────────────────────────────────────────────────────────
// THE MISSING HALF: THE NAMES PEOPLE ACTUALLY TYPE.
//
// Somebody who just got invited to a "telar de la abundancia" over WhatsApp does not search
// "esquema piramidal", and cannot search a company name because there is no company — the
// invitation comes from a friend. Before this block, "telar", "célula de la abundancia" and
// "flor / mesa / rueda de la abundancia" had ZERO occurrences in the entire repo, so that reader
// never landed here at all. Meanwhile the ANSWER has been published for a year in
// /guias/errores-y-estafas-al-invertir-uruguay: stop sending money, gather the evidence, file the
// police report, tell the BCU if a financial entity is involved. Only discoverability was broken.
//
// WHAT WE DELIBERATELY DO NOT PUBLISH HERE: a legal verdict. We did not locate a Uruguayan norm
// banning the chain-contribution scheme AS SUCH, and this page's founding rule (see the file
// header) is that we reproduce the BCU and never rule on anyone's legal or regulatory status.
// Writing "es ilegal por la ley X" without a primary source would be inventing law — which is a
// worse failure than saying nothing. So this block does exactly two things: it makes the popular
// names findable, and it points at what the site already verified and published.
//
// Checked against the BCU listing on 2026-08-10: its "Recomendaciones" section has four entries
// (Prevención de intentos de estafa · Mejora en la toma de decisiones en el acceso al crédito ·
// Operaciones financieras seguras · Seguro te conectás) and none of them is about these schemes,
// and no advertencia headline uses these popular names. Hence the note below: searching "telar"
// here returns nothing, and that nothing means nothing.
// ─────────────────────────────────────────────────────────────────────────────────────────

/** The names the invitation actually arrives under. Rendered verbatim so the page is findable. */
export const CHAIN_SCHEME_ALIASES: readonly string[] = Object.freeze([
  'telar de la abundancia',
  'célula de la abundancia',
  'flor de la abundancia',
  'mesa de la abundancia',
  'rueda de la abundancia',
  'mandala de la abundancia',
  'telar de los sueños',
  'cadena de la abundancia',
])

/** Where the answer already lives. We point, we do not re-litigate it. */
export const CHAIN_SCHEME_GUIDE = Object.freeze({
  to: '/guias/errores-y-estafas-al-invertir-uruguay',
  label: 'Qué hacer si ya pusiste plata',
})

/**
 * Published copy. Note what it does NOT say: it does not call the scheme legal or illegal, and it
 * does not name a norm. It explains why the search came up empty, and hands over the part of the
 * answer that is actually verified.
 */
export const CHAIN_SCHEME_NOTE =
  'Si llegaste buscando «telar», «célula de la abundancia», «flor», «mesa», «rueda» o «mandala de la abundancia», no lo vas a encontrar en esta lista — y esa ausencia no dice nada. El BCU publica advertencias sobre empresas identificadas con su nombre; el nombre popular con el que una invitación circula entre conocidos no es el nombre de ninguna empresa. Acá tampoco vamos a dictaminar si eso es legal o no: esta página reproduce al Banco Central, no emite veredictos. Lo que sí está verificado y publicado es qué hacer si ya pusiste plata: dejá de enviar más —el pedido de «un pago más para liberar el retiro» es parte del libreto—, juntá las pruebas (mensajes, comprobantes, quién te invitó), hacé la denuncia policial y, si hay una entidad financiera involucrada, informá al BCU.'

/**
 * Substrings that mean "this person is asking about a chain scheme, not about a company".
 * Compared against the accent-stripped query, so «pirámide» and «piramide» both land.
 */
const CHAIN_SCHEME_TRIGGERS: readonly string[] = [
  'telar',
  'abundancia',
  'mandala',
  'piramide',
  'piramidal',
  'ponzi',
  'cadena de dinero',
]

/**
 * True when the search box is being used to ask about the scheme rather than about an entity.
 * Prefixes count (`pira` → `piramide`) so the hint appears while the reader is still typing, but
 * we require 4 characters: shorter than that matches half the alphabet.
 */
export function isChainSchemeQuery(query: string): boolean {
  const q = norm(query.trim())
  if (q.length < 4) return false
  return CHAIN_SCHEME_TRIGGERS.some(t => q.includes(t) || t.startsWith(q))
}
