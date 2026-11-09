import { fnv1a } from '~/utils/contentOverlay'
import type { FaqItem } from '~/utils/faqAnswers'

/**
 * Emit FAQPage JSON-LD for a list of Q&As.
 *
 * Shared by `FaqBlock` (own centred container, used on the home and the FAQ hub) and
 * `FaqSection` (inherits the page's width). The schema must stay identical between the two —
 * keeping it here means a fix to the markup of one can never silently change the structured data
 * of the other. Visible text === schema text, because both read the same `items`.
 */
export function useFaqSchema(items: () => FaqItem[], enabled: () => boolean = () => true) {
  const { $seo } = useNuxtApp() as {
    $seo: { generateFAQData: (qa: { question: string; answer: string }[]) => unknown }
  }

  useHead(() => {
    const list = items()
    if (!enabled() || !list.length) return {}
    // Named after the QUESTIONS. An answer can depend on the day (the next LRM auction); the
    // question does not. Without a key unhead matches a <script> by its content, so an answer
    // that differed between the server render and hydration left the server's FAQPage in place
    // and appended a second one (reproduced 2026-11-09 with /letras-de-regulacion-monetaria-uruguay
    // and its live data). Two FAQ blocks with different questions keep two names.
    const schemaName = `faq-${fnv1a(list.map(i => i.question).join('\n'))}-jsonld`
    return {
      script: [
        {
          key: schemaName,
          type: 'application/ld+json',
          innerHTML: JSON.stringify(
            $seo.generateFAQData(list.map(i => ({ question: i.question, answer: i.answer })))
          ),
        },
      ],
    }
  })
}
