<!--
  AffiliateLink — un enlace de afiliado que sólo existe cuando hay un acuerdo configurado.

  Sin URL en runtimeConfig (`public.affiliates.<id>`) no dibuja NADA: ni el enlace orgánico, ni un
  hueco. Con URL: `target="_blank"`, `rel="noopener noreferrer sponsored"`, el dominio de destino
  impreso al lado y `data-cta="affiliate-<id>"` para que `plugins/track-clicks.client.ts` emita
  `outbound_click` + `cta_click` sin código propio. Va siempre acompañado de `AffiliateDisclosure`.
-->
<template>
  <a
    v-if="link"
    :href="link.href"
    target="_blank"
    rel="noopener noreferrer sponsored"
    class="affiliate-link"
    :data-cta="`affiliate-${link.id}`"
    :aria-label="$t('affiliates.ctaLabel', { partner: link.partner })"
  >
    <span class="affiliate-link__label">
      {{ label || link.label }}
      <VIcon size="16" aria-hidden="true">mdi-open-in-new</VIcon>
    </span>
    <span class="affiliate-link__host">{{ link.host }}</span>
  </a>
</template>

<script setup lang="ts">
const props = defineProps<{
  /** Id del registro `utils/affiliates.ts` (`payoneer`, `wise`, ...). */
  id: string
  /** Texto del enlace; por defecto el `label` del registro. */
  label?: string
}>()

const route = useRoute()
const { linkFor } = useAffiliates()
// `utm_content` = la ruta sin locale, para saber desde qué guía se abrió la cuenta.
const link = computed(() => linkFor(props.id, route.path.replace(/^\/(en|pt)(?=\/|$)/, '')))
</script>

<style scoped>
.affiliate-link {
  display: inline-flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 2px;
  padding: 10px 16px;
  border: 1px solid rgba(var(--v-theme-primary), 0.4);
  border-radius: 8px;
  color: rgb(var(--v-theme-primary));
  text-decoration: none;
  min-height: 44px;
}

.affiliate-link:hover,
.affiliate-link:focus-visible {
  border-color: rgb(var(--v-theme-primary));
  background: rgba(var(--v-theme-primary), 0.06);
}

.affiliate-link__label {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-weight: 700;
  font-size: 0.9rem;
}

.affiliate-link__host {
  font-size: 0.75rem;
  color: rgba(var(--v-theme-on-surface), 0.6);
  overflow-wrap: anywhere;
}
</style>
