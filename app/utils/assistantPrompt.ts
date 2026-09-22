/**
 * The bridge from a directory to /asistente-ia: the question travels in `?q=` so the visitor lands
 * with it written and only has to press «Empezar».
 *
 * It is built only from what the page's own URL already says (the filter chips), never from a
 * reference address, an income or anything typed into a private form: the question ends up in the
 * URL, in the server's access log and in the model provider's hands.
 */
export const ASSISTANT_PATH = '/asistente-ia'
export const ASSISTANT_PROMPT_MAX = 400

/** Which directory the call comes from; picks the question and the copy. */
export const ASSISTANT_TOPICS = [
  'alquiler',
  'hogar',
  'oportunidadesAlquiler',
  'oportunidadesVenta',
  'autos',
  'oportunidadesAutos',
  'equipar',
  'celulares',
  'sillas',
  'monopatines',
  'bicicletas',
  'super',
] as const
export type AssistantTopic = (typeof ASSISTANT_TOPICS)[number]

/** A question read back from the URL: plain text, one line, bounded. '' when unusable. */
export function readAssistantPrompt(raw: unknown): string {
  const value = Array.isArray(raw) ? raw[0] : raw
  if (typeof value !== 'string') return ''
  const text = value
    .normalize('NFC')
    .replace(/[\p{Cc}\p{Cf}]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, ASSISTANT_PROMPT_MAX)
    .trim()
  return text.length >= 4 ? text : ''
}

/**
 * Joins the page's filter labels into the question. Empty labels are dropped and the list is
 * capped so a heavily filtered search still fits in ASSISTANT_PROMPT_MAX.
 */
export function assistantFilterList(labels: readonly string[], max = 8): string {
  return labels
    .map(label => label.replace(/\s+/g, ' ').trim())
    .filter(Boolean)
    .slice(0, max)
    .join(' · ')
}

/** The link target, or the bare page when there is no question to carry. */
export function assistantLink(prompt: string): { path: string; query?: { q: string } } {
  const q = readAssistantPrompt(prompt)
  return q ? { path: ASSISTANT_PATH, query: { q } } : { path: ASSISTANT_PATH }
}
