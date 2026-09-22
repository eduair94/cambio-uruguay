<!--
  AffiliateDisclosure — el aviso que acompaña a todo AffiliateLink.

  Siempre visible, nunca detrás de un desplegable ni de un tooltip: el lector tiene que saber que
  el sitio cobra una comisión ANTES de hacer clic, no después. Enlaza a /publicidad, donde están
  las reglas completas (el enlace no cambia el texto de la guía ni ningún ranking).
-->
<template>
  <p class="affiliate-disclosure text-caption">
    <VIcon size="14" aria-hidden="true" class="affiliate-disclosure__icon">
      mdi-information-outline
    </VIcon>
    <span>
      {{ text || $t('affiliates.disclosure') }}
      <NuxtLink :to="localePath('/publicidad')" class="affiliate-disclosure__link">
        {{ $t('affiliates.policy') }}
      </NuxtLink>
    </span>
  </p>
</template>

<script setup lang="ts">
defineProps<{
  /** El aviso propio del socio (`Affiliate.disclosure`); si falta, el genérico i18n. */
  text?: string
}>()

const localePath = useLocalePath()
</script>

<style scoped>
.affiliate-disclosure {
  display: flex;
  align-items: flex-start;
  gap: 6px;
  margin-top: 8px;
  color: rgba(var(--v-theme-on-surface), 0.7);
  line-height: 1.5;
}

.affiliate-disclosure__icon {
  flex: 0 0 auto;
  margin-top: 2px;
}

.affiliate-disclosure__link {
  color: inherit;
  text-decoration: underline;
}
</style>
