<template>
  <nav
    v-if="items.length"
    class="related-inline"
    :aria-label="t('related.title')"
    data-link-area="related_inline"
  >
    <p class="related-inline-label text-overline mb-1">{{ t('related.title') }}</p>
    <ul class="related-inline-list">
      <li v-for="item in items" :key="item.to">
        <NuxtLink
          :to="localePath(item.query ? { path: item.to, query: item.query } : item.to)"
          class="related-inline-link"
        >
          <VIcon size="18" color="primary" aria-hidden="true">{{ item.icon }}</VIcon>
          <span>{{ t(item.labelKey) }}</span>
          <VIcon size="18" class="related-inline-arrow" aria-hidden="true">mdi-arrow-right</VIcon>
        </NuxtLink>
      </li>
    </ul>
  </nav>
</template>

<script setup lang="ts">
// "Seguí leyendo", pero AL LADO de la respuesta.
//
// El bloque del layout (`RelatedPages`) vive al final de la página. En una calculadora o un
// indicador el lector ya tiene su número en la primera pantalla y se va: medido el 16/11/2026
// (Uruguay, 28 días), 1,03–1,12 páginas por sesión en el conversor de UI, la UR y el sueldo
// líquido, y el bloque del pie en la pantalla 5–7 del teléfono. Esto pone las TRES primeras
// recomendaciones de la misma lista (`relatedFor`, mismo orden) justo debajo del resultado.
//
// El bloque del pie no las repite: llama a la MISMA función con los mismos argumentos y las
// excluye, así se llena con otras tres. Nada de estado compartido: con un `useState` escrito desde
// un `watchEffect`, el servidor pintaba el pie antes de la anotación en las páginas con `await` y
// cada tarjeta quedaba con el título de una página y el enlace de otra (utils/relatedInline.ts).
// Sin ClientOnly, como el del pie: los enlaces van en el HTML del servidor.
import { relatedInlineItems } from '~/utils/relatedInline'

const route = useRoute()
const localePath = useLocalePath()
const { t } = useI18n()

const items = computed(() => relatedInlineItems(route.path, route.query))
</script>

<style scoped>
.related-inline {
  margin-top: 16px;
  padding: 12px 16px;
  border: 1px solid rgba(var(--v-theme-on-surface), 0.12);
  border-radius: 12px;
}

.related-inline-label {
  color: rgba(var(--v-theme-on-surface), 0.72);
}

.related-inline-list {
  margin: 0;
  padding: 0;
  list-style: none;
}

.related-inline-link {
  display: flex;
  align-items: center;
  gap: 10px;
  min-height: 44px;
  padding-block: 8px;
  color: rgb(var(--v-theme-link));
  font-weight: 600;
  line-height: 1.4;
  text-decoration: underline;
  text-underline-offset: 0.2em;
  overflow-wrap: anywhere;
}

.related-inline-link:focus-visible {
  outline: 2px solid rgb(var(--v-theme-link));
  outline-offset: 4px;
}

.related-inline-arrow {
  margin-inline-start: auto;
  flex-shrink: 0;
}
</style>
