<template>
  <VContainer class="page py-6 py-md-10">
    <header class="hero mb-6">
      <p class="eyebrow">Advertencias del Banco Central · Uruguay</p>
      <h1 class="text-h4 text-md-h3 font-weight-bold mb-2">¿El BCU advirtió sobre esta empresa?</h1>
      <p class="text-body-1 text-medium-emphasis mb-4">
        Buscá el nombre antes de darle la plata. Acá está, buscable, todo lo que el Banco Central
        publicó sobre empresas que —según el propio BCU—
        <strong>no están autorizadas ni registradas</strong> para operar. Es la pregunta que la
        gente hace <em>después</em> de perder la plata, y debería hacer antes.
      </p>
      <VAlert type="info" variant="tonal" density="comfortable" icon="mdi-information-outline">
        <strong>Esto no es nuestra opinión: son las palabras del BCU.</strong> Nosotros no decimos
        que una empresa esté o no autorizada — reproducimos lo que publicó el Banco Central y te
        linkeamos el comunicado para que lo leas vos.
      </VAlert>
    </header>

    <!-- Search -->
    <section class="mb-6">
      <VTextField
        v-model="query"
        variant="outlined"
        density="comfortable"
        clearable
        prepend-inner-icon="mdi-magnify"
        label="Buscá una empresa, una web o un nombre"
        hide-details
      />
      <p class="text-caption text-medium-emphasis mt-2 mb-0">
        {{ filtered.length }} de {{ warnings.length }} entradas · el BCU publica una cada mes,
        aproximadamente.
        <span v-if="asOfLabel">Actualizado {{ asOfLabel }}.</span>
      </p>
    </section>

    <!-- The single most important thing on the page -->
    <VAlert type="warning" variant="tonal" class="mb-6" icon="mdi-alert-outline" border="start">
      <p class="mb-1"><strong>Que NO aparezca acá no quiere decir que sea confiable.</strong></p>
      <p class="mb-0 text-body-2">
        El BCU advierte sobre lo que detecta, no sobre todo lo que existe: una estafa nueva todavía
        no está en esta lista. La pregunta al revés —<em>¿esta empresa SÍ está habilitada?</em>— se
        contesta en el
        <a :href="BCU_REGISTRY_URL" target="_blank" rel="noopener noreferrer">
          registro de entidades del BCU </a
        >, y ahí también hay un agujero: las plataformas de cripto todavía no tienen registro
        publicado, así que no las vas a encontrar ni entre las autorizadas ni entre las advertidas.
      </p>
    </VAlert>

    <!-- List -->
    <section aria-label="Advertencias publicadas por el BCU">
      <ClientOnly>
        <template #default>
          <VCard v-if="pending" variant="flat" class="pa-6 d-flex align-center placeholder">
            <VProgressCircular indeterminate size="22" width="2" color="primary" class="mr-3" />
            <span class="text-body-2 text-medium-emphasis">Cargando las advertencias…</span>
          </VCard>

          <VCard v-else-if="!warnings.length" variant="flat" class="pa-6 placeholder">
            <p class="text-body-2 text-medium-emphasis mb-0">
              Todavía no pudimos leer la lista del BCU. Mientras tanto, consultala directamente en
              <a :href="BCU_WARNINGS_URL" target="_blank" rel="noopener noreferrer">
                el sitio del Banco Central </a
              >.
            </p>
          </VCard>

          <template v-else>
            <p v-if="!filtered.length" class="text-body-2 text-medium-emphasis">
              El BCU no publicó ninguna advertencia que coincida con “{{ query }}”.
              <strong>Eso no significa que la empresa sea confiable</strong>: significa que el BCU
              no dijo nada sobre ella. Verificá si está en el
              <a :href="BCU_REGISTRY_URL" target="_blank" rel="noopener noreferrer">registro</a>.
            </p>

            <div v-else class="warnings">
              <VCard v-for="w in filtered" :key="w.date + w.title" variant="flat" class="warn pa-4">
                <div class="d-flex align-center flex-wrap ga-2 mb-2">
                  <VChip
                    size="x-small"
                    :color="w.kind === 'cese' ? 'error' : 'warning'"
                    variant="tonal"
                    class="font-weight-bold"
                  >
                    {{ w.kind === 'cese' ? 'Cese de actividades' : 'Advertencia' }}
                  </VChip>
                  <span class="warn-date">{{ formatDate(w.date) }}</span>
                </div>
                <p class="warn-entities mb-1">{{ w.entities }}</p>
                <p class="warn-title mb-2">“{{ w.title }}”</p>
                <div class="d-flex align-center flex-wrap ga-3">
                  <a
                    :href="sourceLink(w)"
                    target="_blank"
                    rel="noopener noreferrer"
                    class="warn-src"
                  >
                    <VIcon size="13" class="mr-1">mdi-file-document-outline</VIcon>
                    Leer el comunicado del BCU
                  </a>
                  <span v-if="w.sharedSource" class="warn-flag">
                    <VIcon size="13" class="mr-1">mdi-alert-outline</VIcon>
                    El BCU publicó esta entrada apuntando a un comunicado compartido con otra: te
                    llevamos al listado oficial en vez de a un documento que puede no nombrarla.
                  </span>
                </div>
              </VCard>
            </div>
          </template>
        </template>
        <template #fallback>
          <VCard variant="flat" class="pa-6 placeholder">
            <span class="text-body-2 text-medium-emphasis">Cargando las advertencias…</span>
          </VCard>
        </template>
      </ClientOnly>
    </section>

    <!-- Cross-link -->
    <VCard :to="localePath('/estafas-uruguay')" variant="flat" class="cross pa-4 mt-6" hover>
      <VIcon color="primary" class="mb-2">mdi-shield-alert-outline</VIcon>
      <h2 class="text-subtitle-1 font-weight-bold mb-1">¿Ya te estafaron?</h2>
      <p class="text-body-2 text-medium-emphasis mb-0">
        Qué te debe el emisor según la ley, los plazos que corren y el reclamo listo para copiar.
      </p>
    </VCard>

    <VAlert
      type="warning"
      variant="tonal"
      density="comfortable"
      class="mt-6"
      icon="mdi-scale-balance"
    >
      Reproducimos comunicados publicados por el <strong>Banco Central del Uruguay</strong>, con
      atribución y enlace a la fuente. No emitimos juicio propio sobre ninguna empresa ni sobre su
      situación regulatoria: para eso están el
      <a :href="BCU_WARNINGS_URL" target="_blank" rel="noopener noreferrer">listado</a> y el
      <a :href="BCU_REGISTRY_URL" target="_blank" rel="noopener noreferrer">registro</a> oficiales.
      Información de referencia, no asesoramiento.
    </VAlert>
  </VContainer>
</template>

<script setup lang="ts">
import {
  BCU_REGISTRY_URL,
  BCU_WARNINGS_URL,
  searchWarnings,
  sourceLink,
  type BcuWarning,
} from '~/utils/bcuWarnings'

const localePath = useLocalePath()
const query = ref('')

interface WarningsPayload {
  warnings: BcuWarning[]
  asOf: string | null
  empty: boolean
}

const { data, pending } = useLazyFetch<WarningsPayload>('/api/advertencias-bcu', { server: false })

const warnings = computed(() => data.value?.warnings ?? [])
const filtered = computed(() => searchWarnings(warnings.value, query.value ?? ''))

const asOfLabel = computed(() => {
  const iso = data.value?.asOf
  if (!iso) return ''
  const d = new Date(iso)
  return isNaN(d.getTime())
    ? ''
    : d.toLocaleDateString('es-UY', { day: 'numeric', month: 'long', year: 'numeric' })
})

function formatDate(iso: string): string {
  const d = new Date(`${iso}T00:00:00Z`)
  return isNaN(d.getTime())
    ? iso
    : d.toLocaleDateString('es-UY', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        timeZone: 'UTC',
      })
}

// --- SEO ---
const canonicalUrl = 'https://cambio-uruguay.com/advertencias-bcu'
const title = 'Advertencias del BCU: empresas sobre las que el Banco Central alertó'
const description =
  'Buscá una empresa antes de darle tu plata. Todas las advertencias publicadas por el Banco Central del Uruguay sobre entidades no autorizadas ni registradas, con el comunicado oficial linkeado. Que no aparezca no significa que sea confiable.'

defineOgImageComponent('Cambio', {
  title: '¿El BCU advirtió sobre esta empresa?',
  subtitle: 'Buscá el nombre antes de darle la plata',
  tag: 'BCU',
})

useSeoMeta({
  title: () => `${title} | Cambio Uruguay`,
  description,
  ogTitle: title,
  ogDescription: description,
  ogType: 'website',
  ogUrl: canonicalUrl,
  twitterCard: 'summary_large_image',
})

useHead(() => ({
  link: [{ rel: 'canonical', href: canonicalUrl }],
  meta: [
    {
      name: 'keywords',
      content:
        'advertencias bcu, empresas no autorizadas uruguay, estafa financiera uruguay, banco central advertencia, es confiable esta empresa, ponzi uruguay, conexion ganadera, registro bcu entidades',
    },
  ],
}))
</script>

<style scoped>
.eyebrow {
  font-size: 0.72rem;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: rgb(var(--v-theme-primary));
  margin-bottom: 4px;
}
.warnings {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.warn,
.placeholder,
.cross {
  border: 1px solid rgba(var(--v-border-color), 0.14);
  border-radius: 14px;
}
.warn {
  border-left: 3px solid rgba(202, 138, 4, 0.7);
}
.warn-date {
  font-size: 0.76rem;
  opacity: 0.65;
}
.warn-entities {
  font-size: 0.98rem;
  font-weight: 700;
  line-height: 1.4;
}
.warn-title {
  font-size: 0.85rem;
  line-height: 1.55;
  opacity: 0.85;
}
.warn-src {
  font-size: 0.78rem;
  display: inline-flex;
  align-items: center;
  white-space: nowrap;
}
.warn-flag {
  font-size: 0.74rem;
  opacity: 0.7;
  line-height: 1.4;
}
</style>
