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
