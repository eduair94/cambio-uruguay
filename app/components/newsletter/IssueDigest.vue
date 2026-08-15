<template>
  <div class="issue-digest">
    <!-- Market table -->
    <section v-if="rows.length" class="mb-8">
      <h2 class="text-h6 font-weight-bold mb-3">
        <VIcon start size="small" color="primary">mdi-cash-multiple</VIcon>
        El mercado ese día
      </h2>

      <VTable class="cu-mobile-cards cu-roomy" density="comfortable">
        <thead>
          <tr>
            <th scope="col">Moneda</th>
            <th scope="col" class="text-right">Mejor venta</th>
            <th scope="col" class="text-right">Variación</th>
            <th scope="col">Mejor compra en</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in rows" :key="row.code">
            <td data-label="">
              <NuxtLink v-if="row.to" :to="row.to" class="issue-digest__link font-weight-medium">
                {{ row.name }}
              </NuxtLink>
              <span v-else class="font-weight-medium">{{ row.name }}</span>
              <div class="text-caption text-medium-emphasis">{{ row.code }}</div>
            </td>
            <td data-label="Mejor venta" class="text-right">
              <span class="font-weight-bold">$ {{ formatIssueRate(row.bestSellRate) }}</span>
              <div class="text-caption text-medium-emphasis">por 1 {{ row.code }}</div>
            </td>
            <td data-label="Variación" class="text-right">
              <VChip
                size="x-small"
                :color="row.trend.color"
                variant="tonal"
                class="font-weight-bold"
              >
                <VIcon start size="x-small">{{ row.trend.icon }}</VIcon>
                {{ formatIssuePct(row.changePct) }}
              </VChip>
              <div class="text-caption text-medium-emphasis">vs. el día anterior</div>
            </td>
            <td data-label="Mejor compra en" class="cu-cell-prose">
              {{ row.bestBuyHouse || '—' }}
            </td>
          </tr>
        </tbody>
      </VTable>

      <p class="text-caption text-medium-emphasis mt-3 mb-0">
        «Mejor venta» es el precio más bajo al que una casa de cambio vendía esa moneda ese día;
        «mejor compra» es la casa que mejor la pagaba. La variación compara contra el día anterior.
        Son precios de referencia tomados la mañana de ese día, no una oferta ni un precio de
        cierre.
      </p>
    </section>

    <!-- AI commentary -->
    <section v-if="ai" class="mb-8">
      <h2 class="text-h6 font-weight-bold mb-3">
        <VIcon start size="small" color="primary">mdi-robot-outline</VIcon>
        Lectura del día
      </h2>
      <VCard variant="tonal" class="issue-digest__panel pa-5">
        <!-- eslint-disable-next-line vue/no-v-html -->
        <div class="issue-digest__prose" v-html="aiHtml" />
      </VCard>
      <p class="text-caption text-medium-emphasis mt-3 mb-0">
        Comentario informativo generado con asistencia de inteligencia artificial a partir de los
        datos de mercado y los titulares de abajo. No es asesoramiento financiero.
      </p>
    </section>

    <!-- Headlines -->
    <section v-if="news.length">
      <h2 class="text-h6 font-weight-bold mb-3">
        <VIcon start size="small" color="primary">mdi-newspaper-variant-outline</VIcon>
        Las noticias de ese día
      </h2>
      <VCard variant="tonal" class="issue-digest__panel pa-5">
        <ul class="issue-digest__news">
          <li v-for="(item, i) in news" :key="i">
            <a :href="item.link" target="_blank" rel="noopener noreferrer nofollow">{{
              item.title
            }}</a>
            <span class="text-medium-emphasis"> — {{ item.source }}</span>
          </li>
        </ul>
      </VCard>
    </section>
  </div>
</template>

<script setup lang="ts">
// The body of one newsletter issue: market table, AI reading, headlines.
//
// A component rather than page markup because the same digest is rendered by
// `/newsletter/<fecha>` today and is the natural body for any future "issue
// preview" surface; keeping it here means the archive's 300-odd pages all
// re-render from one definition when the copy or the table contract changes.
import { computed } from 'vue'
import { marked } from 'marked'
import DOMPurify from 'isomorphic-dompurify'
import {
  cleanAiCommentary,
  formatIssuePct,
  formatIssueRate,
  issueTrend,
  issueTrendStyle,
  type IssueCurrency,
  type IssueNews,
} from '~/utils/newsletterIssue'
import { currencyDisplayName, currencySlug, type CurrencyCode } from '~/utils/currencyPages'

const props = defineProps<{
  currencies: IssueCurrency[]
  news: IssueNews[]
  ai: string
}>()

const localePath = useLocalePath()

const KNOWN: readonly string[] = ['USD', 'EUR', 'BRL', 'ARS']

// The commentary is Markdown (`## Sección`, `**dato**`, bullet lists), so it is
// rendered rather than printed — shown as plain text the headings arrive as
// literal `##` in the largest block on the page. Same marked + DOMPurify pass
// the blog body uses, with the same tag allow-list: model output is untrusted
// input, and the sanitiser is what stands between it and the DOM.
//
// `cleanAiCommentary` runs again here on purpose. It is already applied when a
// digest is built, but issues archived before that existed still carry the
// "¡Claro! Aquí tienes…" opener in storage, and those pages re-render from the
// stored text forever.
const aiHtml = computed(() => {
  const md = cleanAiCommentary(props.ai)
  if (!md) return ''
  const html = marked.parse(md, { breaks: true, gfm: true, async: false }) as string
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: [
      'h2',
      'h3',
      'h4',
      'p',
      'br',
      'hr',
      'strong',
      'em',
      'b',
      'i',
      'ul',
      'ol',
      'li',
      'blockquote',
      'table',
      'thead',
      'tbody',
      'tr',
      'th',
      'td',
    ],
    // No `href`: the commentary is grounded in the headlines listed below it,
    // and a link the model invented would be an unvetted outbound from a page
    // that publishes itself unattended every day.
    ALLOWED_ATTR: [],
  })
})

const rows = computed(() =>
  props.currencies
    .filter(c => Number.isFinite(c.bestSellRate) && c.bestSellRate > 0)
    .map(c => {
      // Only the four majors have a `/cotizacion/<slug>` page; anything else
      // renders as plain text rather than a link into a 404.
      const known = KNOWN.includes(c.code)
      return {
        ...c,
        name: known ? currencyDisplayName(c.code as CurrencyCode) : c.code,
        to: known ? localePath(`/cotizacion/${currencySlug(c.code as CurrencyCode)}`) : '',
        trend: issueTrendStyle(issueTrend(c.changePct)),
      }
    })
)
</script>

<style scoped>
.issue-digest__panel {
  border-radius: 12px;
}
.issue-digest__prose {
  line-height: 1.75;
}
/* The rendered Markdown. Sizes track the page's own heading ramp rather than
   the browser defaults, so a model that opens with `##` cannot out-shout the
   section title above it. */
.issue-digest__prose :deep(h2),
.issue-digest__prose :deep(h3),
.issue-digest__prose :deep(h4) {
  font-size: 1.05rem;
  font-weight: 700;
  line-height: 1.4;
  margin: 1.25rem 0 0.5rem;
}
.issue-digest__prose :deep(> :first-child) {
  margin-top: 0;
}
.issue-digest__prose :deep(p) {
  margin: 0 0 0.85rem;
}
.issue-digest__prose :deep(ul),
.issue-digest__prose :deep(ol) {
  margin: 0 0 0.85rem 1.25rem;
  padding: 0;
}
.issue-digest__prose :deep(li) {
  margin-bottom: 0.35rem;
}
.issue-digest__prose :deep(> :last-child) {
  margin-bottom: 0;
}
.issue-digest__prose :deep(table) {
  width: 100%;
  border-collapse: collapse;
  margin: 0 0 0.85rem;
  /* The model occasionally emits a wide table; it scrolls in its own box rather
     than pushing the page past the viewport. */
  display: block;
  overflow-x: auto;
}
.issue-digest__prose :deep(th),
.issue-digest__prose :deep(td) {
  padding: 6px 10px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.12);
  text-align: left;
}
.v-theme--light .issue-digest__prose :deep(th),
.v-theme--light .issue-digest__prose :deep(td) {
  border-bottom-color: rgba(0, 0, 0, 0.12);
}
.issue-digest__link,
.issue-digest__news a {
  color: rgb(var(--v-theme-link));
  text-decoration: none;
}
.issue-digest__link:hover,
.issue-digest__news a:hover {
  text-decoration: underline;
}
.issue-digest__news {
  margin: 0;
  padding-left: 1.1rem;
}
.issue-digest__news li {
  margin-bottom: 0.5rem;
  line-height: 1.5;
  /* The Min-Width Zero Rule: headlines routinely carry an un-breakable URL-like
     token from the feed. */
  min-width: 0;
  overflow-wrap: anywhere;
}
.issue-digest__news li:last-child {
  margin-bottom: 0;
}
</style>
