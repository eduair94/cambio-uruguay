<template>
  <div v-if="entries.length" class="text-caption text-medium-emphasis mt-2">
    <p v-for="[field, source] in entries" :key="field" class="mb-1">
      {{ sourceText(field) }}:
      <a :href="source.url" target="_blank" rel="noopener noreferrer">{{ source.publisher }}</a>
      · {{ sourceText('verified', { date: formatDate(source.verifiedAt) }) }}.
      {{ sourceText(source.note) }}
    </p>
  </div>
</template>

<script setup lang="ts">
import type { BranchFieldSource, BranchFieldSources } from '~/utils/branchCorrections'

const props = withDefaults(
  defineProps<{ sources?: BranchFieldSources; fields?: Array<'phone' | 'hours'> }>(),
  { sources: undefined, fields: () => ['phone', 'hours'] }
)
const { t: sourceText, locale } = useI18n({
  useScope: 'local',
  messages: {
    es: {
      phone: 'Teléfono',
      hours: 'Horario',
      verified: 'verificado el {date}',
      'phone-conflict':
        'Se usa el número del sitio oficial, que difiere del listado de sucursales del BCU.',
      'hours-refresh': 'Los días sin horario publicado figuran como «Sin informar».',
    },
    en: {
      phone: 'Phone',
      hours: 'Hours',
      verified: 'checked on {date}',
      'phone-conflict':
        'This number comes from the official website and differs from the BCU branch list.',
      'hours-refresh': 'Days without published hours are shown as “Sin informar” (not provided).',
    },
    pt: {
      phone: 'Telefone',
      hours: 'Horário',
      verified: 'verificado em {date}',
      'phone-conflict': 'Este número vem do site oficial e difere da lista de agências do BCU.',
      'hours-refresh': 'Dias sem horário publicado aparecem como “Sin informar” (não informado).',
    },
  },
})
const entries = computed(() =>
  props.fields.flatMap(field => {
    const source = props.sources?.[field]
    return source ? ([[field, source]] as Array<[string, BranchFieldSource]>) : []
  })
)
const formatDate = (date: string) =>
  new Intl.DateTimeFormat(dateLocale(locale.value), {
    day: 'numeric',
    month: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(`${date}T00:00:00Z`))
</script>
