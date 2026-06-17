// Cached FAQ data route. Deterministic items from utils/faqAnswers, plus one
// optional qualitative AI context sentence appended to the key USD answers
// (reusing the backend /ai/insights endpoint, exactly like where-to-change).
// Fail-graceful at every step: rates down -> evergreen-only; AI down -> deterministic only.
import type { ExchangeRate } from '../../types/api'
import { buildFaqItems, FAQ_LANGS, type FaqItem, type FaqLang } from '../../utils/faqAnswers'

export function normalizeFaqLang(raw: unknown): FaqLang {
  const lang = String(raw ?? 'es').slice(0, 2)
  return (FAQ_LANGS as readonly string[]).includes(lang) ? (lang as FaqLang) : 'es'
}

export function appendContext(item: FaqItem, sentence: string | null): FaqItem {
  const s = sentence?.trim()
  return s ? { ...item, answer: `${item.answer} ${s}` } : item
}

const CONTEXT_INSTR: Record<FaqLang, string> = {
  es: 'Escribe UNA sola frase corta de contexto cualitativo del mercado del dólar en Uruguay (tendencia/orientación). NO menciones ningún número ni cotización concreta. Responde solo la frase, sin comillas.',
  en: 'Write ONE short qualitative context sentence about the Uruguayan dollar market (trend/orientation). Do NOT mention any specific number or rate. Reply with the sentence only, no quotes.',
  pt: 'Escreva UMA única frase curta de contexto qualitativo do mercado do dólar no Uruguai (tendência/orientação). NÃO mencione nenhum número ou cotação concreta. Responda apenas a frase, sem aspas.',
}

async function fetchContextSentence(lang: FaqLang, apiBase: string): Promise<string | null> {
  try {
    const res = await $fetch<{ insight?: string }>('/ai/insights', {
      baseURL: apiBase,
      method: 'POST',
      body: { type: 'custom', language: lang, customPrompt: CONTEXT_INSTR[lang] },
      timeout: 20000,
    })
    const s = res?.insight
      ?.replace(/<think>[\s\S]*?<\/think>/gi, '')
      .replace(/["“”]/g, '')
      .trim()
    // Guard: drop if it leaked digits (defensive — must stay qualitative) or is too long.
    if (!s || /\d/.test(s) || s.length > 160) return null
    return s
  } catch {
    return null
  }
}

async function buildPayload(lang: FaqLang): Promise<{ generatedAt: string; items: FaqItem[] }> {
  const config = useRuntimeConfig()
  const apiBase = config.public.apiBase as string

  const rates = await $fetch<ExchangeRate[]>('/', { baseURL: apiBase }).catch(
    () => [] as ExchangeRate[]
  )

  let items = buildFaqItems(rates, lang)

  // Decorate only the headline USD answer with one qualitative context sentence.
  const sentence = rates.length ? await fetchContextSentence(lang, apiBase) : null
  if (sentence) {
    items = items.map(it => (it.id === 'rate-USD' ? appendContext(it, sentence) : it))
  }

  return { generatedAt: new Date().toISOString(), items }
}

export default defineCachedEventHandler(
  async event => {
    const lang = normalizeFaqLang(getQuery(event).lang)
    return buildPayload(lang)
  },
  {
    maxAge: 60 * 10, // 10 min, matches the data refresh cadence
    staleMaxAge: 60 * 60, // serve stale up to 1h while revalidating
    name: 'faq-uy',
    getKey: event => `faq-${normalizeFaqLang(getQuery(event).lang)}`,
  }
)
