import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

// Unit tests target framework-agnostic logic (pure functions in utils/composables).
// Keep tested logic free of Nuxt auto-imports so no Nuxt runtime is needed here.
export default defineConfig({
  // Los stores de pinia importan con el alias `~` de Nuxt. Resolverlo acá es lo que permite
  // testearlos sin levantar el runtime de Nuxt; el resto de los tests siguen siendo de lógica pura.
  resolve: {
    alias: {
      '~': fileURLToPath(new URL('.', import.meta.url)),
      '@': fileURLToPath(new URL('.', import.meta.url)),
    },
  },
  // Sin el runtime de Nuxt, `import.meta.client` es undefined y todo lo que vive detrás de esa
  // condición se saltea — un test que ejercita un store se volvería verde sin ejecutar nada.
  define: {
    'import.meta.client': 'true',
    'import.meta.server': 'false',
  },
  test: {
    include: ['tests/unit/**/*.{test,spec}.ts'],
    environment: 'node',
    globals: true,
  },
})
