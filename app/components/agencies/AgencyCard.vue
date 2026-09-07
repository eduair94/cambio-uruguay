<template>
  <article class="agency-card">
    <div class="agency-card__identity">
      <p class="agency-card__source">{{ source }}</p>
      <h2>
        <NuxtLink :to="localePath(agencyPath(item.agency.key))">{{ item.agency.name }}</NuxtLink>
      </h2>
      <p>{{ item.departments.join(' · ') }}</p>
    </div>
    <div class="agency-card__actions">
      <NuxtLink v-if="item.rentals" :to="localePath(links.rentals)" class="agency-card__link">
        <span>{{ item.rentals.toLocaleString(locale) }} {{ t('rentals') }}</span>
        <VIcon icon="mdi-arrow-right" size="18" />
      </NuxtLink>
      <NuxtLink v-if="item.sales" :to="localePath(links.sales)" class="agency-card__link">
        <span>{{ item.sales.toLocaleString(locale) }} {{ t('sales') }}</span>
        <VIcon icon="mdi-arrow-right" size="18" />
      </NuxtLink>
      <NuxtLink :to="localePath(agencyPath(item.agency.key))" class="agency-card__profile">{{
        t('profile')
      }}</NuxtLink>
    </div>
  </article>
</template>
<script setup lang="ts">
import { agencyCatalogueLinks, agencyPath, type AgencySummary } from '../../utils/agencies'
import { agencyMessage } from '../../utils/agencyMessages'
import { RENTAL_SOURCE_LABEL, type RentalSource } from '../../utils/rentals'
const props = defineProps<{ item: AgencySummary }>()
const { locale } = useI18n()
const localePath = useLocalePath()
const t = (key: Parameters<typeof agencyMessage>[1]) => agencyMessage(locale.value, key)
const links = computed(() => agencyCatalogueLinks(props.item.agency.key))
const source = computed(
  () =>
    RENTAL_SOURCE_LABEL[props.item.agency.key.split(':')[0] as RentalSource] ||
    props.item.agency.key.split(':')[0]
)
</script>
<style scoped>
.agency-card {
  display: flex;
  justify-content: space-between;
  gap: 20px;
  padding: 20px 0;
  border-bottom: 1px solid rgba(var(--v-theme-on-surface), 0.16);
}
.agency-card__identity {
  min-width: 0;
}
.agency-card p {
  margin: 4px 0 0;
}
.agency-card h2 {
  font-size: 1.125rem;
  margin: 4px 0;
  overflow-wrap: anywhere;
}
.agency-card a {
  color: rgb(var(--v-theme-link));
  text-underline-offset: 3px;
}
.agency-card__source {
  font-size: 0.8rem;
}
.agency-card__actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: flex-end;
  gap: 8px 16px;
  flex-shrink: 0;
  max-width: 55%;
}
.agency-card__link,
.agency-card__profile {
  display: inline-flex;
  align-items: center;
  min-height: 44px;
  gap: 6px;
}
.agency-card__link {
  font-weight: 650;
}
@media (max-width: 600px) {
  .agency-card {
    flex-direction: column;
    gap: 8px;
    padding: 16px 0;
  }
  .agency-card__actions {
    max-width: none;
    justify-content: flex-start;
    gap: 4px 16px;
  }
}
</style>
