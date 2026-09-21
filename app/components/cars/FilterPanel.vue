<template>
  <component
    :is="mobile ? VDialog : 'div'"
    v-bind="dialogProps"
    @update:model-value="syncOpen"
    @after-enter="focusHeading"
  >
    <form
      class="car-panel"
      :class="{ 'car-panel--dialog': mobile, 'car-panel--sidebar': !mobile }"
      aria-label="Filtros"
      @submit.prevent="emit('apply')"
    >
      <header v-if="mobile" class="car-panel__header">
        <h2 id="car-filters-title" ref="heading" tabindex="-1">Filtros</h2>
        <VBtn
          icon="mdi-close"
          variant="text"
          aria-label="Cerrar filtros"
          data-testid="car-filters-close"
          @click="emit('update:open', false)"
        />
      </header>
      <div class="car-panel__scroll">
        <slot />
      </div>
      <footer class="car-panel__footer">
        <VBtn variant="text" data-testid="car-filters-clear" @click="emit('clear')"> Limpiar </VBtn>
        <VBtn color="primary" type="submit" data-testid="car-filters-apply">
          {{ applyLabel }}
        </VBtn>
      </footer>
    </form>
  </component>
</template>

<script setup lang="ts">
import { VDialog } from 'vuetify/components'

const props = withDefaults(
  defineProps<{
    /** En mobile el panel es un cajón a pantalla completa; en desktop, la columna de siempre. */
    mobile: boolean
    open?: boolean
    /**
     * Cuántos avisos va a mostrar lo que hay cargado a la izquierda. El botón dice el
     * número porque en mobile el panel tapa los resultados: sin eso, aplicar es a ciegas.
     * Es el total de la consulta YA aplicada, no una previsualización del borrador.
     */
    total?: number | null
    noun?: string
    nounPlural?: string
  }>(),
  { open: false, total: null, noun: 'aviso', nounPlural: 'avisos' }
)
const emit = defineEmits<{
  apply: []
  clear: []
  'update:open': [value: boolean]
}>()

const heading = ref<HTMLElement | null>(null)
const applyLabel = computed(() => {
  if (!props.mobile) return 'Aplicar'
  if (props.total === null) return 'Ver resultados'
  const noun = props.total === 1 ? props.noun : props.nounPlural
  return `Ver ${props.total.toLocaleString('es-UY')} ${noun}`
})

// El teclado del celular achica la ventana visual sin tocar innerHeight: sin esto el pie
// del cajón queda debajo del teclado justo cuando se tipea un precio. Mismo arreglo que
// `components/rentals/SearchFilters.vue`.
const viewportHeight = ref<number | null>(null)
const viewportTop = ref(0)
const dialogProps = computed(() =>
  props.mobile
    ? {
        modelValue: props.open,
        /*
         * Una transición CSS con nombre, NO la que VDialog trae por defecto: este repo
         * registra Vuetify a mano (`app/plugins/vuetify.ts`) y `VDialogTransition` no está
         * en esa lista. Mismo rodeo que `components/rentals/SearchFilters.vue`.
         */
        transition: 'car-drawer-transition',
        class: 'car-filters-drawer',
        id: 'car-mobile-filters-dialog',
        'data-testid': 'car-mobile-filters-dialog',
        'aria-labelledby': 'car-filters-title',
        scrim: true,
        contentProps: {
          style: {
            width: 'min(420px, calc(100vw - 24px))',
            maxWidth: 'calc(100vw - 24px)',
            height: viewportHeight.value ? `${viewportHeight.value}px` : '100dvh',
            maxHeight: '100%',
            top: `${viewportTop.value}px`,
            right: '0',
            left: 'auto',
            margin: '0',
            overflow: 'hidden',
          },
        },
      }
    : // El envoltorio de desktop necesita clase propia: `position: sticky` se mide contra el
      // BLOQUE CONTENEDOR, y ese envoltorio mide lo mismo que el formulario (535 px), así que
      // pegar el formulario a él no alcanzaba — se despegaba a los 535 px y desaparecía. El
      // que se pega es el envoltorio, que sí vive en la celda entera de la grilla.
      { class: 'car-panel-shell' }
)

/**
 * VDialog reemite su propio modelo mientras se monta, así que el `false` de recién nacido
 * volvía al padre y cerraba el cajón en el mismo tick en que se abría: se tocaba «Filtros»
 * y no pasaba nada, sin error en consola. Sólo se propaga un cambio real.
 * Es la trampa 1 de las que documenta el repo para los controles de Vuetify.
 */
function syncOpen(value: boolean) {
  if (value === props.open) return
  emit('update:open', value)
}

function syncViewport() {
  viewportHeight.value = window.visualViewport?.height ?? window.innerHeight
  viewportTop.value = window.visualViewport?.offsetTop ?? 0
}
function focusHeading() {
  if (heading.value?.closest('form')?.contains(document.activeElement)) return
  heading.value?.focus({ preventScroll: true })
}
/*
 * Abrir un diálogo tiene que llevar el foco adentro: si no, el teclado y el lector de
 * pantalla siguen parados en el botón que quedó detrás del cajón. El gancho de la
 * transición no alcanza (no siempre llega), así que se mira el estado.
 */
watch(
  () => props.open,
  async open => {
    if (!open || !props.mobile) return
    await nextTick()
    focusHeading()
  }
)
onMounted(() => {
  syncViewport()
  window.visualViewport?.addEventListener('resize', syncViewport)
  window.visualViewport?.addEventListener('scroll', syncViewport)
  window.addEventListener('resize', syncViewport)
})
onBeforeUnmount(() => {
  window.visualViewport?.removeEventListener('resize', syncViewport)
  window.visualViewport?.removeEventListener('scroll', syncViewport)
  window.removeEventListener('resize', syncViewport)
})
</script>

<style scoped>
.car-panel {
  display: flex;
  flex-direction: column;
  min-width: 0;
}
.car-panel--sidebar {
  gap: 12px;
}
/*
 * En desktop la columna ACOMPAÑA el scroll. Antes no: la regla vivía en el `<style scoped>`
 * de la página como `.cars-layout__filters :deep(.car-panel--sidebar)`, y el compilador la
 * emite como `.cars-layout__filters[data-v-pagina] .car-panel--sidebar` — pero esa celda es
 * de `CarsSidebarLayout`, no de la página, así que no lleva ese atributo y la regla no
 * enganchaba con nada: el panel quedaba `static` y a las dos filas de autos los filtros ya
 * no estaban. La regla vive acá, donde la clase es propia y no hace falta `:deep`.
 */
@media (min-width: 960px) {
  .car-panel-shell {
    position: sticky;
    /* 65 px de barra fija + aire. */
    top: 80px;
    /* Nunca más alto que la ventana: con "Más filtros" abierto el panel pasa los 1.000 px
       y sin esto el botón de aplicar queda debajo del borde, inalcanzable sin cerrar el
       grupo. Con tope, la lista de campos scrollea por dentro y el pie no se mueve. */
    max-height: calc(100vh - 96px);
    display: flex;
    flex-direction: column;
  }
  .car-panel--sidebar {
    /* Hijo de un flex con tope: sin esto no se deja achicar y el scroll interno no existe. */
    min-height: 0;
  }
  .car-panel--sidebar .car-panel__scroll {
    flex: 1 1 auto;
    min-height: 0;
    overflow-y: auto;
    overscroll-behavior: contain;
    /* El foco de un campo dibuja su anillo 2 px afuera: sin este aire, el scroll lo corta. */
    padding: 2px;
    margin: -2px;
  }
}
.car-panel--dialog {
  height: 100%;
  background: rgb(var(--v-theme-surface));
}
.car-panel__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 8px 8px 8px 16px;
  border-bottom: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  flex: 0 0 auto;
}
.car-panel__header h2 {
  /* Rol Title de DESIGN.md, con el peso del rol Headline: es el encabezado del cajón. */
  font-size: 1.25rem;
  font-weight: 700;
  margin: 0;
  line-height: 1.3;
  letter-spacing: -0.01em;
}
.car-panel__header h2:focus-visible {
  outline: 2px solid rgb(var(--v-theme-primary));
  outline-offset: 4px;
  border-radius: 4px;
}
.car-panel__scroll {
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-width: 0;
}
/*
 * `.v-input` trae `flex: 1 1 auto`. En una columna flex con lugar de sobra eso estira CADA
 * campo hasta llenar el alto: en el cajón los seis primeros quedaban de 80 px y "Km máximo"
 * parecía un cuadro de texto. Los campos miden lo que miden.
 */
.car-panel__scroll > * {
  flex: 0 0 auto;
}
.car-panel--dialog .car-panel__scroll {
  flex: 1 1 auto;
  overflow-y: auto;
  overscroll-behavior: contain;
  -webkit-overflow-scrolling: touch;
  padding: 16px;
}
.car-panel__footer {
  display: flex;
  gap: 8px;
  flex: 0 0 auto;
}
.car-panel--sidebar .car-panel__footer {
  flex-direction: column-reverse;
}
.car-panel--sidebar .car-panel__footer > .v-btn {
  width: 100%;
}
.car-panel--dialog .car-panel__footer {
  align-items: center;
  padding: 12px 16px;
  /* El pie flota sobre la lista de campos: el borde lo separa cuando hay scroll detrás. */
  border-top: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  background: rgb(var(--v-theme-surface));
  padding-bottom: max(12px, env(safe-area-inset-bottom));
}
.car-panel--dialog .car-panel__footer > .v-btn {
  min-height: 48px;
}
.car-panel__footer > .v-btn {
  /* Sin versales, como la barra: "Ver 18.982 avisos" lleva una cifra adentro. */
  text-transform: none;
  letter-spacing: 0;
}
.car-panel--dialog .car-panel__footer > .v-btn:last-child {
  flex: 1 1 auto;
  font-size: 0.95rem;
}
</style>

<style>
/* El cajón entra desde la derecha y ocupa el alto entero: no es un diálogo centrado. */
.car-filters-drawer > .v-overlay__content {
  border-radius: 0;
  align-items: stretch;
}
.car-filters-drawer > .v-overlay__content.car-drawer-transition-enter-active,
.car-filters-drawer > .v-overlay__content.car-drawer-transition-leave-active {
  transition: transform 220ms cubic-bezier(0.16, 1, 0.3, 1);
}
.car-filters-drawer > .v-overlay__content.car-drawer-transition-enter-from,
.car-filters-drawer > .v-overlay__content.car-drawer-transition-leave-to {
  transform: translateX(100%);
}
@media (prefers-reduced-motion: reduce) {
  .car-filters-drawer > .v-overlay__content {
    transition: none !important;
  }
}
</style>
