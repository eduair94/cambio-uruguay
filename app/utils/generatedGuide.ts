// The shape of a page written by the Reddit gap pipeline.
//
// One type, one renderer (`components/AutoGuide.vue`), one data file per page under
// `utils/generated/`. Keeping the payload a plain typed object rather than markup is what lets the
// backend emit a page it cannot syntactically break: a stray quote in a data string is a string,
// while a stray quote in a template is a build failure at 05:35 with nobody awake.
//
// Written by a model, but only after the question cleared the site's topic list, the sources were
// downloaded and answered 200, every figure was found in the text of those sources, and the app's
// lint and tests passed against the generated files. See `classes/gaps/publish.ts`.

export interface GeneratedGuideSection {
  heading: string
  /** Paragraphs, in order. Plain prose. */
  body: string[]
}

export interface GeneratedGuideFaq {
  question: string
  answer: string
}

/** "La respuesta corta": what the reader believes, and what is actually true. */
export interface GeneratedGuideVerdict {
  claim: string
  answer: string
}

/** An ordered procedure, when the honest answer is "hacé esto, en este orden". */
export interface GeneratedGuideStep {
  title: string
  detail: string
}

export interface GeneratedGuideSource {
  title: string
  url: string
}

export interface GeneratedGuide {
  /** Route without the leading slash. */
  slug: string
  title: string
  /** Short label for nav, breadcrumb and OG. */
  navLabel: string
  /** Human label of the site topic it was filed under. */
  topicLabel: string
  icon: string
  description: string
  intro: string
  /** The first screen: the question, answered before anything else. */
  verdicts: GeneratedGuideVerdict[]
  sections: GeneratedGuideSection[]
  steps: GeneratedGuideStep[]
  faqs: GeneratedGuideFaq[]
  /** Existing routes of this site, validated at generation time. */
  related: string[]
  keywords: string[]
  /** Published, not hidden — see the note in AutoGuide.vue. */
  notConfirmed: string[]
  sources: GeneratedGuideSource[]
  /** ISO date the page was generated. */
  createdAt: string
  /** The Reddit threads that asked for it, for provenance. */
  askedIn: string[]
}
