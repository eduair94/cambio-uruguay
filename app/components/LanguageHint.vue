<template>
  <div v-if="show" class="lang-hint" role="region" aria-label="Idioma de la página">
    <span class="lang-hint-text">Esta página también está en español.</span>
    <a :href="spanishUrl" class="lang-hint-link" data-cta="lang_hint_es" @click="remember">
      Ver en español
    </a>
    <button type="button" class="lang-hint-close" aria-label="Cerrar" @click="dismiss">
      <VIcon size="18" aria-hidden="true">mdi-close</VIcon>
    </button>
  </div>
</template>

<script setup lang="ts">
// El aviso de "esta página también está en español" (regla y porqué en utils/languageHint.ts).
//
// Sólo en el navegador y sólo después de montar: el HTML es el mismo para todos y lo guarda el
// borde, así que lo que depende de quién mira no puede estar en el render del servidor. El texto
// va en español a propósito — es para quien lee español y está mirando otra cosa.
import { LANGUAGE_HINT_DISMISS_KEY, shouldSuggestSpanish } from '~/utils/languageHint'

const { locale } = useI18n()
const switchLocalePath = useSwitchLocalePath()
const show = ref(false)
const spanishUrl = computed(() => switchLocalePath('es') || '/')

function evaluate(): void {
  let dismissed = false
  try {
    dismissed = localStorage.getItem(LANGUAGE_HINT_DISMISS_KEY) === '1'
  } catch {
    // Sin almacenamiento se pregunta, y la respuesta dura lo que dure la página.
  }
  show.value = shouldSuggestSpanish({
    locale: locale.value,
    languages: navigator.languages?.length ? navigator.languages : [navigator.language],
    dismissed,
  })
}

function remember(): void {
  try {
    localStorage.setItem(LANGUAGE_HINT_DISMISS_KEY, '1')
  } catch {
    // Nada que hacer: la navegación sigue igual.
  }
}

function dismiss(): void {
  remember()
  show.value = false
}

onMounted(evaluate)
watch(locale, evaluate)
</script>

<style scoped>
.lang-hint {
  display: flex;
  align-items: center;
  gap: 8px 12px;
  flex-wrap: wrap;
  max-width: 1200px;
  margin: 0 auto;
  padding: 6px 12px;
  font-size: 0.875rem;
  line-height: 1.4;
}

.lang-hint-link {
  display: inline-flex;
  align-items: center;
  min-height: 44px;
  color: rgb(var(--v-theme-link));
  font-weight: 600;
  text-underline-offset: 3px;
}

.lang-hint-close {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  margin-inline-start: auto;
  border: 0;
  background: none;
  color: inherit;
  cursor: pointer;
}

.lang-hint-link:focus-visible,
.lang-hint-close:focus-visible {
  outline: 2px solid rgb(var(--v-theme-link));
  outline-offset: 2px;
  border-radius: 4px;
}
</style>
