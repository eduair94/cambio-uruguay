// `definePageMeta({ wide: true })` — the directories (filters + a grid of results) trade the
// 1280 px reading column for a 2200 px frame that holds the page and the ad rail together. What
// uses the width inside it is whatever the page marks `cu-listing`; see `.container_custom--wide`
// in layouts/default.vue, DESIGN.md → "The Directory Frame Rule" and
// tests/unit/wideDirectories.test.ts.
declare module '#app' {
  interface PageMeta {
    wide?: boolean
  }
}

export {}
