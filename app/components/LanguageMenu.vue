<template>
  <div class="text-center">
    <VMenu location="bottom end">
      <template #activator="{ props }">
        <VBtn color="primary" v-bind="props">
          {{ locale }}
          <VIcon end>mdi-chevron-down</VIcon>
        </VBtn>
      </template>
      <VList>
        <VListItem
          v-for="(item, index) in availableLocales"
          :key="index"
          :to="switchLocalePath(item.code)"
        >
          <VListItemTitle>{{ item.name }}</VListItemTitle>
        </VListItem>
      </VList>
    </VMenu>
  </div>
</template>

<script setup lang="ts">
// Get i18n instance from global properties
const { locale, locales } = useI18n()
const switchLocalePath = useSwitchLocalePath()

const availableLocales = computed(() => {
  return locales.value.filter(i => i.code !== locale.value)
})
</script>
