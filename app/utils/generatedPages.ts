// Nav entries for pages the Reddit gap pipeline created on its own.
//
// A SEPARATE FILE ON PURPOSE. `siteNav.ts` is 2 200 hand-maintained lines that every projection of
// the site reads — header, drawer, footer, sitemap, search. Having an automated job patch it with
// a regex at 05:35 is how a bad insertion breaks the whole navigation and nobody is awake to see
// it. Here the job appends to a list that belongs to it and to nothing else, and `siteNav.ts`
// spreads that list into the consumer section with one line a person wrote.
//
// Everything here was still written by a model, but only after: the question cleared the site's
// topic list, the sources were downloaded and returned 200, every figure on the page was found in
// the text of those sources, and the app's own lint and tests passed against the generated files.
// See `classes/gaps/publish.ts` for the order those run in.
//
// To retire one, delete its entry here and its page file. Nothing else references it.

import type { NavEntry } from './siteNav'

export const GENERATED_NAV: readonly NavEntry[] = Object.freeze([
  // <<< generated-nav >>>
])
