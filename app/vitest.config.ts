import { defineConfig } from 'vitest/config'

// Unit tests target framework-agnostic logic (pure functions in utils/composables).
// Keep tested logic free of Nuxt auto-imports so no Nuxt runtime is needed here.
export default defineConfig({
  test: {
    include: ['tests/unit/**/*.{test,spec}.ts'],
    environment: 'node',
    globals: true,
  },
})
