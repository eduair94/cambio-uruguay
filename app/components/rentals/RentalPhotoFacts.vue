<template>
  <section
    v-if="facts.length"
    class="rental-photo-facts"
    data-testid="rental-photo-facts"
    aria-labelledby="rental-photo-facts-title"
  >
    <div class="rental-photo-facts__head">
      <h3 id="rental-photo-facts-title">{{ t('title') }}</h3>
    </div>
    <ul class="rental-photo-facts__list">
      <li v-for="item in facts" :key="item.fact">
        <VIcon icon="mdi-image-search-outline" size="16" aria-hidden="true" />
        <span>{{ t(item.fact) }}</span>
        <a
          :href="item.photo"
          target="_blank"
          rel="noopener nofollow"
          class="rental-photo-facts__link"
          >{{ t('seePhoto') }}</a
        >
        <button
          v-if="!reported.has(item.fact)"
          type="button"
          class="rental-photo-facts__report"
          :aria-label="t('reportLabel', { fact: t(item.fact) })"
          @click="report(item.fact)"
        >
          {{ t('report') }}
        </button>
        <span v-else class="rental-photo-facts__thanks" role="status">{{ t('thanks') }}</span>
      </li>
    </ul>
    <p class="rental-photo-facts__note">{{ t('note') }}</p>
  </section>
</template>

<script setup lang="ts">
// Lo que las fotos del aviso muestran y el aviso no dice (utils/photoFactsPublic.ts). Lo pide el
// navegador después de pintar la ficha: no cambia el HTML que lee Google ni lo que mide la ventana
// abierta sobre las fichas, y si el pedido falla no aparece nada.
import type { PublicPhotoFact, PublicPhotoFacts } from '~/utils/photoFactsPublic'

const props = defineProps<{ propertyKey: string; listingId: string }>()

const { t } = useI18n({
  useScope: 'local',
  messages: {
    es: {
      title: 'Según las fotos del aviso',
      amueblada: 'Se ve amueblada',
      sin_muebles: 'Se ve sin muebles',
      cocina_integrada: 'Cocina integrada al living',
      seePhoto: 'ver la foto',
      report: '¿Está mal?',
      reportLabel: 'Avisar que «{fact}» está mal',
      thanks: 'Gracias, lo revisamos',
      note: 'Lo detectó una inteligencia artificial mirando las fotos publicadas, no el anunciante: puede equivocarse. Lo que dice el aviso siempre manda.',
    },
    en: {
      title: 'According to the listing photos',
      amueblada: 'Looks furnished',
      sin_muebles: 'Looks unfurnished',
      cocina_integrada: 'Kitchen open to the living room',
      seePhoto: 'see the photo',
      report: 'Wrong?',
      reportLabel: 'Report that “{fact}” is wrong',
      thanks: 'Thanks, we will check it',
      note: 'Detected by artificial intelligence looking at the published photos, not stated by the advertiser: it can be wrong. What the listing says always prevails.',
    },
    pt: {
      title: 'Segundo as fotos do anúncio',
      amueblada: 'Parece mobiliado',
      sin_muebles: 'Parece sem móveis',
      cocina_integrada: 'Cozinha integrada à sala',
      seePhoto: 'ver a foto',
      report: 'Está errado?',
      reportLabel: 'Avisar que «{fact}» está errado',
      thanks: 'Obrigado, vamos revisar',
      note: 'Detectado por inteligência artificial olhando as fotos publicadas, não informado pelo anunciante: pode errar. O que o anúncio diz sempre prevalece.',
    },
  },
})

const facts = ref<PublicPhotoFacts['facts']>([])
const reported = ref(new Set<PublicPhotoFact>())
const track = useTrack()

async function load(): Promise<void> {
  facts.value = []
  if (!props.propertyKey || !props.listingId) return
  try {
    const response = await $fetch<{ facts: PublicPhotoFacts | null }>(
      `/api/rentals/fotos/${encodeURIComponent(props.propertyKey)}`,
      { query: { oferta: props.listingId } }
    )
    facts.value = response.facts?.facts ?? []
  } catch {
    facts.value = []
  }
}

async function report(fact: PublicPhotoFact): Promise<void> {
  reported.value = new Set([...reported.value, fact])
  track('photo_fact_report', { fact })
  try {
    await $fetch('/api/rentals/fotos-reporte', {
      method: 'POST',
      body: { listingId: props.listingId, fact },
    })
  } catch {
    // Best-effort: the thanks stays; a lost report is not worth an error on the page.
  }
}

onMounted(load)
watch(() => [props.propertyKey, props.listingId], load)
</script>

<style scoped>
.rental-photo-facts__head {
  margin-top: 24px;
}
.rental-photo-facts__list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  padding: 0;
  margin-top: 12px;
  list-style: none;
}
.rental-photo-facts__list li {
  display: inline-flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
  padding: 6px 12px 6px 10px;
  border: 1px dashed rgba(var(--v-border-color), var(--v-border-opacity));
  border-radius: 999px;
  font-size: 0.875rem;
}
.rental-photo-facts__list .v-icon {
  color: rgb(var(--v-theme-primary));
}
.rental-photo-facts__link,
.rental-photo-facts__report {
  font-size: 0.8rem;
  color: rgb(var(--v-theme-primary));
  text-decoration: underline;
  background: none;
  border: 0;
  padding: 0;
  cursor: pointer;
}
.rental-photo-facts__report {
  color: rgba(var(--v-theme-on-surface), 0.72);
}
.rental-photo-facts__thanks {
  font-size: 0.8rem;
  color: rgba(var(--v-theme-on-surface), 0.72);
}
.rental-photo-facts__note {
  margin-top: 8px;
  font-size: 0.8rem;
  line-height: 1.5;
  color: rgba(var(--v-theme-on-surface), 0.72);
}
</style>
