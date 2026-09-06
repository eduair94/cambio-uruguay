<template>
  <dl v-if="rows.length" class="rental-alert-summary">
    <div v-for="row in rows" :key="`${row.label}:${row.value}`">
      <dt>{{ row.label }}</dt>
      <dd>{{ row.value }}</dd>
    </div>
  </dl>
  <p v-else class="rental-alert-summary__all">
    {{ t(kind === 'rental-search' ? 'allFilters' : 'allOpportunities') }}
  </p>
</template>

<script setup lang="ts">
import { rentalAlertMessages } from '~/utils/rentalAlertMessages'
import { rentalAvailabilityCopy } from '~/utils/rentalAvailabilityMessages'
import { normalizeRentalQuery, RENTAL_SOURCE_LABEL } from '~/utils/rentals'
import { normalizeOpportunityQuery } from '~/utils/propertyOpportunityQuery'
import { MUTUALISTA_SEDES } from '~/utils/mutualistaSedes'
import type { RentalAlertKind } from '~/utils/rentalAlerts'

const props = defineProps<{ kind: RentalAlertKind; filters: Record<string, unknown> }>()
const { t, locale } = useI18n({ useScope: 'local', messages: rentalAlertMessages })
const number = (n: number) =>
  new Intl.NumberFormat(locale.value, { maximumFractionDigits: 2 }).format(n)
const rows = computed(() => {
  const result: { label: string; value: string }[] = []
  const availability = rentalAvailabilityCopy(locale.value)
  const addAvailability = (value: 'all' | 'hide_multiple' | 'hide_any') => {
    if (value !== 'all') result.push({ label: availability.filter, value: availability[value] })
  }
  const add = (label: string, value: unknown) => {
    if (value !== '' && value !== null && value !== undefined && value !== false)
      result.push({ label: t(label), value: String(value) })
  }
  const typeLabels: Record<string, string> = {
    apartamento: 'apartment',
    casa: 'house',
    habitacion: 'room',
    local: 'commercial',
    oficina: 'office',
    terreno: 'land',
    otro: 'other',
  }
  if (props.kind === 'rental-search') {
    const q = normalizeRentalQuery(props.filters)
    addAvailability(q.availability)
    add('text', q.q)
    add('department', q.department)
    add(
      'anyNeighborhood',
      (q.neighborhoods.length ? q.neighborhoods : [q.neighborhood]).filter(Boolean).join(' · ')
    )
    if (q.type && q.type !== 'all') add('type', t(typeLabels[q.type] || q.type))
    if (q.source && q.source !== 'all')
      add('source', RENTAL_SOURCE_LABEL[q.source as keyof typeof RENTAL_SOURCE_LABEL] || q.source)
    if (q.bedrooms !== null)
      add(
        'bedrooms',
        q.bedrooms === 0 ? t('studio') : t(q.bedroomsExact ? 'exact' : 'minimum', { n: q.bedrooms })
      )
    if (q.bathrooms !== null) add('bathrooms', t('minimum', { n: q.bathrooms }))
    for (const key of ['priceMin', 'priceMax', 'monthlyMax', 'expensesMax'] as const)
      if (q[key] !== null) add(key, `UYU ${number(q[key]!)}`)
    if (q.currency) add('currency', q.currency)
    for (const key of ['areaMin', 'areaMax'] as const)
      if (q[key] !== null) add(key, `${number(q[key]!)} m²`)
    for (const key of ['pets', 'parking', 'furnished', 'owner', 'multi'] as const)
      if (q[key]) add('features', t(key))
    if (q.withExpenses) add('features', t('expensesKnown'))
    if (q.guarantees.length) add('anyGuarantee', q.guarantees.map(value => t(value)).join(' · '))
    if (q.sedes.length) {
      add(
        'healthCenters',
        q.sedes
          .map(id => {
            const sede = MUTUALISTA_SEDES.find(row => row.osmId === id)
            return sede ? `${sede.mutualista} · ${sede.nombre}` : String(id)
          })
          .join(' / ')
      )
      add('nearby', t('radius', { n: q.radioKm }))
    }
  } else {
    const q = normalizeOpportunityQuery(props.filters)
    addAvailability(q.availability)
    add('department', q.department)
    add('neighborhood', q.neighborhood)
    if (q.type !== 'all') add('type', t(typeLabels[q.type]))
    if (q.bedrooms !== '')
      add('bedrooms', q.bedrooms === 0 ? t('studio') : t('exact', { n: q.bedrooms }))
    if (q.maxPrice !== null) add('maxRent', `UYU ${number(q.maxPrice)}`)
    if (q.signal !== 'all') add('signalFilter', t(q.signal))
    if (q.evidence !== 'all') add('evidenceFilter', t(q.evidence))
    if (q.confidence !== 'all') add('confidence', t(q.confidence))
  }
  return result
})
</script>

<style scoped>
.rental-alert-summary {
  margin: 0;
  display: grid;
  gap: 12px;
}
.rental-alert-summary > div {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1.2fr);
  gap: 12px;
}
.rental-alert-summary dt {
  color: rgba(var(--v-theme-on-surface), 0.76);
}
.rental-alert-summary dd {
  margin: 0;
  font-weight: 600;
  overflow-wrap: anywhere;
}
.rental-alert-summary__all {
  margin: 0;
  font-weight: 600;
}
@media (max-width: 359px) {
  .rental-alert-summary > div {
    grid-template-columns: 1fr;
    gap: 2px;
  }
}
</style>
