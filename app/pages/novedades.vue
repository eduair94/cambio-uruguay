<template>
  <VContainer class="nov-page py-6 py-md-10">
    <header class="nov-hero mb-8">
      <p class="nov-eyebrow mb-2">Cambio Uruguay · actualizado el {{ lastUpdated }}</p>
      <h1 class="nov-title mb-3">Novedades del sitio</h1>
      <p class="nov-lead text-body-1 mb-5">
        Cada semana mejoramos el sitio y arreglamos lo que nos reportan. Acá queda registrado qué
        cambió y cuándo llegó al sitio, para que veas en qué estamos trabajando.
      </p>
      <div class="d-flex flex-wrap ga-3">
        <VBtn
          color="primary"
          :href="localePath('/contacto') + '?tipo=bug#sugerencias'"
          prepend-icon="mdi-bug-outline"
          data-cta="novedades_bug"
        >
          Reportar un error
        </VBtn>
        <VBtn
          variant="tonal"
          color="primary"
          :href="localePath('/contacto') + '#sugerencias'"
          prepend-icon="mdi-lightbulb-on-outline"
          data-cta="novedades_suggest"
        >
          Sugerir una mejora
        </VBtn>
      </div>
      <p class="text-body-2 text-medium-emphasis mt-4 mb-0">
        Leemos cada mensaje. Cuando un arreglo sale de algo que nos escribieron, lo marcamos acá.
      </p>
    </header>

    <nav class="mb-6" aria-label="Filtrar novedades">
      <VChipGroup v-model="filter" mandatory selected-class="text-primary" column>
        <VChip value="todo" variant="outlined" filter>Todo ({{ SITE_CHANGES.length }})</VChip>
        <VChip v-for="kind in CHANGE_KINDS" :key="kind" :value="kind" variant="outlined" filter>
          {{ kindPlural[kind] }} ({{ counts[kind] }})
        </VChip>
      </VChipGroup>
    </nav>

    <section v-for="group in groups" :key="group.month" class="mb-8">
      <h2 class="nov-month mb-3">{{ formatChangeMonth(group.month) }}</h2>
      <ol class="nov-list">
        <li v-for="change in group.items" :key="change.date + change.title" class="nov-item">
          <article>
            <div class="nov-meta">
              <time :datetime="change.date">{{ formatChangeDate(change.date) }}</time>
              <span class="nov-kind" :class="`nov-kind--${change.kind}`">
                {{ CHANGE_KIND_LABELS[change.kind] }}
              </span>
              <span v-if="change.origin" class="nov-origin">
                <VIcon size="16" aria-hidden="true">{{ originIcon[change.origin] }}</VIcon>
                {{ CHANGE_ORIGIN_LABELS[change.origin] }}
              </span>
            </div>
            <h3 class="nov-item-title">{{ change.title }}</h3>
            <p class="text-body-2 mb-0">
              {{ change.body }}
              <NuxtLink v-if="change.to" :to="localePath(change.to)" class="nov-link">
                Ir a la página
              </NuxtLink>
            </p>
          </article>
        </li>
      </ol>
    </section>

    <VCard variant="tonal" color="primary" class="pa-4 pa-md-6">
      <h2 class="nov-month mb-2">¿Algo no anda?</h2>
      <p class="text-body-2 mb-3">
        Contanos qué página, qué esperabas ver y qué pasó. Si dejás tu correo, te avisamos cuando
        esté arreglado. El estado de cada fuente de cotizaciones, en vivo, está en
        <NuxtLink :to="localePath('/estado')">la página de estado</NuxtLink>.
      </p>
      <VBtn
        color="primary"
        :href="localePath('/contacto') + '?tipo=bug#sugerencias'"
        prepend-icon="mdi-bug-outline"
        data-cta="novedades_bug_footer"
      >
        Reportar un error
      </VBtn>
    </VCard>
  </VContainer>
</template>

<script setup lang="ts">
import {
  CHANGE_KINDS,
  CHANGE_KIND_LABELS,
  CHANGE_ORIGIN_LABELS,
  SITE_CHANGES,
  changesByMonth,
  formatChangeDate,
  formatChangeMonth,
  type ChangeKind,
  type ChangeOrigin,
} from '~/utils/siteChangelog'

const localePath = useLocalePath()

const kindPlural: Record<ChangeKind, string> = {
  nuevo: 'Nuevo',
  mejora: 'Mejoras',
  arreglo: 'Arreglos',
}
const originIcon: Record<ChangeOrigin, string> = {
  reporte: 'mdi-email-check-outline',
  uso: 'mdi-gesture-tap',
  comunidad: 'mdi-account-group-outline',
}

const filter = ref<'todo' | ChangeKind>('todo')
const counts = computed(
  () =>
    Object.fromEntries(
      CHANGE_KINDS.map(kind => [kind, SITE_CHANGES.filter(c => c.kind === kind).length])
    ) as Record<ChangeKind, number>
)
const groups = computed(() =>
  changesByMonth(
    filter.value === 'todo' ? SITE_CHANGES : SITE_CHANGES.filter(c => c.kind === filter.value)
  )
)
const lastUpdated = formatChangeDate(SITE_CHANGES[0]?.date ?? '2026-11-22')

const title = 'Novedades del sitio: mejoras y arreglos'
const description =
  'Qué mejoramos y arreglamos en Cambio Uruguay, semana a semana: páginas nuevas, datos más confiables y los errores que nos reportaron.'
const canonicalUrl = 'https://cambio-uruguay.com/novedades'

useSeoMeta({
  title: () => `${title} | Cambio Uruguay`,
  description,
  ogTitle: title,
  ogDescription: description,
  ogType: 'website',
  ogUrl: canonicalUrl,
  twitterCard: 'summary_large_image',
  twitterTitle: title,
  twitterDescription: description,
})
useHead(() => ({
  link: [{ rel: 'canonical', href: canonicalUrl }],
  script: [
    {
      type: 'application/ld+json',
      innerHTML: JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: [
          {
            '@type': 'ListItem',
            position: 1,
            name: 'Cambio Uruguay',
            item: 'https://cambio-uruguay.com',
          },
          { '@type': 'ListItem', position: 2, name: 'Novedades del sitio', item: canonicalUrl },
        ],
      }),
    },
  ],
}))
defineOgImageComponent('Cambio', {
  title,
  subtitle: 'Lo que mejoramos y arreglamos, semana a semana',
  tag: 'NOVEDADES',
})
</script>

<style scoped>
.nov-page {
  max-width: 860px;
}
.nov-eyebrow {
  /* Rol Label de DESIGN.md. */
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.0333em;
  text-transform: uppercase;
  color: rgb(var(--v-theme-primary));
}
.nov-title {
  /* Rol Display de DESIGN.md. */
  font-size: clamp(1.55rem, 4.4vw, 2.5rem);
  font-weight: 800;
  line-height: 1.1;
  letter-spacing: -0.02em;
  text-wrap: balance;
}
.nov-lead {
  max-width: 65ch;
  line-height: 1.6;
}
.nov-month {
  /* Rol Title de DESIGN.md. */
  font-size: 1.25rem;
  font-weight: 500;
  line-height: 1.6;
  text-transform: capitalize;
}
.nov-list {
  list-style: none;
  padding: 0;
  margin: 0;
  border-top: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
}
.nov-item {
  padding: 16px 0;
  border-bottom: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
}
.nov-meta {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px 12px;
  margin-bottom: 4px;
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.0333em;
  color: rgba(var(--v-theme-on-surface), var(--v-medium-emphasis-opacity));
}
.nov-kind {
  padding: 1px 8px;
  border-radius: 999px;
}
.nov-kind--nuevo {
  background: rgba(var(--v-theme-primary), 0.14);
  color: rgb(var(--v-theme-primary));
}
.nov-kind--mejora {
  background: rgba(var(--v-theme-success), 0.16);
  color: rgb(var(--v-theme-on-surface));
}
.nov-kind--arreglo {
  background: rgba(255, 143, 0, 0.22);
  color: rgb(var(--v-theme-on-surface));
}
.nov-origin {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-weight: 600;
}
.nov-item-title {
  font-size: 1rem;
  font-weight: 700;
  line-height: 1.4;
  margin: 0 0 4px;
}
.nov-link {
  white-space: nowrap;
  color: rgb(var(--v-theme-link));
  text-underline-offset: 3px;
}
</style>
