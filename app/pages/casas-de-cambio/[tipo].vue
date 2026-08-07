<template>
  <CasasComparativa :locked-category="category" />
</template>

<script setup lang="ts">
import { categoryFromTypeSlug } from '~/utils/casasDirectory'

// One indexable page per institution kind — "bancos que venden dólares",
// "fintech para comprar dólares" are distinct searches, and a client-only
// toggle on the parent page can never rank for them.
//
// The allowlist lives in `CASA_TYPE_SLUGS`, so an invented slug 404s instead of
// rendering an empty comparison. definePageMeta is a compiler macro: the
// validate callback must be self-contained, hence the direct import.
definePageMeta({
  validate: route => categoryFromTypeSlug(String(route.params.tipo ?? '')) !== null,
})

const route = useRoute()
const category = computed(() => categoryFromTypeSlug(String(route.params.tipo ?? '')))
</script>
