<template>
  <ToolShell slug="widget-dolar" :faq="faq" hide-disclaimer>
    <VCard class="pa-4 pa-sm-6">
      <!-- Options -->
      <div class="text-subtitle-2 font-weight-bold mb-2">1. Elegí el estilo</div>
      <div class="d-flex flex-wrap ga-6 mb-2">
        <div>
          <div class="text-caption text-grey mb-1">Tema</div>
          <VBtnToggle
            v-model="theme"
            mandatory
            density="comfortable"
            color="primary"
            variant="outlined"
            rounded="lg"
          >
            <VBtn value="dark" size="small">
              <VIcon start size="small">mdi-weather-night</VIcon>
              Oscuro
            </VBtn>
            <VBtn value="light" size="small">
              <VIcon start size="small">mdi-white-balance-sunny</VIcon>
              Claro
            </VBtn>
          </VBtnToggle>
        </div>

        <div>
          <div class="text-caption text-grey mb-1">Ancho</div>
          <VBtnToggle
            v-model="responsive"
            mandatory
            density="comfortable"
            color="primary"
            variant="outlined"
            rounded="lg"
          >
            <VBtn :value="false" size="small">
              <VIcon start size="small">mdi-arrow-collapse-horizontal</VIcon>
              Fijo (320px)
            </VBtn>
            <VBtn :value="true" size="small">
              <VIcon start size="small">mdi-arrow-expand-horizontal</VIcon>
              Adaptable
            </VBtn>
          </VBtnToggle>
        </div>
      </div>

      <!-- Live preview -->
      <div class="text-subtitle-2 font-weight-bold mb-2 mt-4">2. Vista previa en vivo</div>
      <div class="preview-stage d-flex justify-center pa-4 rounded-lg mb-2">
        <iframe
          :key="previewSrc"
          :src="previewSrc"
          :width="responsive ? '100%' : 320"
          height="170"
          title="Vista previa del widget de cotización del dólar"
          class="preview-frame"
          loading="lazy"
        />
      </div>
      <p class="text-caption text-grey-lighten-1 mb-4">
        Se actualiza solo cada 10 minutos con la mejor cotización de compra y venta del dólar.
      </p>

      <!-- Embed code -->
      <div class="text-subtitle-2 font-weight-bold mb-2">
        3. Copiá el código y pegalo en tu sitio
      </div>
      <VTextarea
        :model-value="embedCode"
        readonly
        variant="outlined"
        rows="3"
        auto-grow
        hide-details
        class="embed-code mb-3"
        @focus="selectAll"
      />
      <div class="d-flex flex-wrap ga-3">
        <VBtn
          color="primary"
          variant="flat"
          rounded="lg"
          prepend-icon="mdi-content-copy"
          @click="copy"
        >
          {{ copied ? '¡Copiado!' : 'Copiar código' }}
        </VBtn>
        <VBtn
          :href="previewSrc"
          target="_blank"
          rel="noopener"
          variant="outlined"
          rounded="lg"
          prepend-icon="mdi-open-in-new"
        >
          Abrir el widget
        </VBtn>
      </div>

      <VSnackbar v-model="copied" color="success" :timeout="2000" location="bottom">
        <VIcon start>mdi-check-circle</VIcon>
        Código copiado al portapapeles
      </VSnackbar>
    </VCard>

    <template #content>
      <h2 class="text-h6 font-weight-bold mb-3">¿Cómo funciona?</h2>
      <p class="text-body-2 mb-3">
        El widget es un pequeño recuadro que muestra la cotización del dólar en Uruguay (compra y
        venta) tomada en vivo de más de 40 casas de cambio. Lo agregás a tu web pegando una línea de
        código <strong>iframe</strong>, sin instalar nada.
      </p>
      <ul class="text-body-2 ps-4 mb-3">
        <li class="mb-1">Gratis y sin registro.</li>
        <li class="mb-1">Se actualiza solo cada 10 minutos.</li>
        <li class="mb-1">Funciona en cualquier web, blog, WordPress o CMS.</li>
        <li class="mb-1">Tema claro u oscuro para combinar con tu diseño.</li>
      </ul>
      <p class="text-body-2 mb-0">
        Al usarlo ayudás a difundir el comparador y tus lectores acceden siempre al mejor precio.
      </p>
    </template>
  </ToolShell>
</template>

<script setup lang="ts">
import { buildWidgetEmbed, widgetSrc, type WidgetTheme } from '~/utils/widgetEmbed'

const theme = ref<WidgetTheme>('dark')
const responsive = ref(false)
const copied = ref(false)

// Preview uses the current origin (works on localhost + prod); the copyable
// embed code always points at the production widget (buildWidgetEmbed default).
const origin = useRequestURL().origin
const previewSrc = computed(() => widgetSrc({ theme: theme.value, baseUrl: origin }))
const embedCode = computed(() =>
  buildWidgetEmbed({ theme: theme.value, width: responsive.value ? '100%' : 320, height: 170 })
)

const copy = async (): Promise<void> => {
  try {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      await navigator.clipboard.writeText(embedCode.value)
    }
    copied.value = true
  } catch {
    /* clipboard unavailable (insecure context) — the field is selectable instead */
  }
}

const selectAll = (e: FocusEvent): void => {
  const el = e.target as HTMLTextAreaElement | null
  el?.select?.()
}

const faq = [
  {
    q: '¿El widget es gratis?',
    a: 'Sí, es completamente gratuito y no requiere registro. Solo copiás el código y lo pegás en tu sitio.',
  },
  {
    q: '¿Cada cuánto se actualiza la cotización?',
    a: 'Los valores se actualizan automáticamente cada 10 minutos con la mejor cotización de compra y venta del dólar entre más de 40 casas de cambio.',
  },
  {
    q: '¿Cómo lo agrego en WordPress?',
    a: 'Pegá el código en un bloque "HTML personalizado" (o "Custom HTML") dentro de la entrada o página donde quieras mostrar la cotización.',
  },
  {
    q: '¿Puedo cambiar el tamaño o el color?',
    a: 'Sí. Elegí el tema claro u oscuro y el ancho fijo o adaptable arriba; el código se genera con esas opciones.',
  },
]
</script>

<style scoped>
.preview-stage {
  background: repeating-conic-gradient(rgba(255, 255, 255, 0.04) 0% 25%, transparent 0% 50%) 50% /
    22px 22px;
  border: 1px solid rgba(255, 255, 255, 0.08);
}

.preview-frame {
  border: 0;
  max-width: 420px;
}

.embed-code :deep(textarea) {
  font-family: 'Roboto Mono', ui-monospace, monospace;
  font-size: 0.82rem;
  line-height: 1.5;
}
</style>
