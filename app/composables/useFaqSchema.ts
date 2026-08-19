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
    return {
      script: [
        {
          type: 'application/ld+json',
          innerHTML: JSON.stringify(
            $seo.generateFAQData(list.map(i => ({ question: i.question, answer: i.answer })))
          ),
        },
      ],
    }
  })
}
