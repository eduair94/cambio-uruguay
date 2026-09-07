<script setup lang="ts">
import { agencyPath } from '~/utils/propertyAdvertiser'
import { propertyExperienceMessages } from '~/utils/propertyExperienceMessages'
const agency = defineModel<string>({ required: true })
const agencyName = useAgencySelection(() => agency.value)
const localePath = useLocalePath()
const { t } = useI18n({ useScope: 'local', messages: propertyExperienceMessages })
</script>
<template>
  <div v-if="agency" class="agency-filter" data-testid="selected-agency-filter">
    <NuxtLink :to="localePath(agencyPath(agency))">{{
      agencyName || t('selectedAgency')
    }}</NuxtLink>
    <VBtn icon="mdi-close" variant="text" :aria-label="t('removeAgency')" @click="agency = ''" />
  </div>
</template>
<style scoped>
.agency-filter {
  display: flex;
  gap: 8px;
  justify-content: space-between;
  align-items: center;
}
.agency-filter a {
  min-width: 0;
  overflow-wrap: anywhere;
  color: rgb(var(--v-theme-link));
  display: inline-flex;
  align-items: center;
  min-height: 44px;
  font-size: 0.85rem;
  text-underline-offset: 3px;
}
.agency-filter .v-btn {
  flex-shrink: 0;
  min-height: 44px;
  min-width: 44px;
}
</style>
