// Montar UN componente .vue sin Nuxt, como hace adSlotLifecycle.test.ts.
//
// Se compila el SFC con la plantilla inline y se evalúa el módulo en un contexto donde `require`
// sólo conoce a `vue` y a lo que el test decide inyectar (los auto-imports de Nuxt van como
// globales: `useRoute`, `useTrack`, `useRuntimeConfig`...). Lo que se prueba es el render real
// del componente, no una lectura del archivo — que es lo único que puede decir "no dejó ni un
// nodo en el DOM".
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { runInNewContext } from 'node:vm'
import { compileScript, parse } from '@vue/compiler-sfc'
import ts from 'typescript'
import * as vue from 'vue'

const APP = resolve(__dirname, '../../..')

/** El módulo compilado (script + plantilla inline) de `components/<name>.vue`. */
export function compileComponent(path: string, id: string): string {
  const filename = resolve(APP, path)
  const { descriptor } = parse(readFileSync(filename, 'utf8'), { filename })
  return compileScript(descriptor, { id, inlineTemplate: true }).content
}

/** Evalúa el módulo compilado con `vue` real y los globales que el test inyecta. */
export function evaluateComponent(source: string, globals: Record<string, unknown> = {}) {
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  })
  const context = {
    exports: {} as { default?: vue.Component },
    require: (name: string) => {
      if (name === 'vue') return vue
      throw new Error(`Unexpected import: ${name}`)
    },
    ...vue,
    ...globals,
  }
  runInNewContext(outputText, context)
  return context.exports.default as vue.Component
}

/** Stubs mínimos de lo que Nuxt y Vuetify registran globalmente. */
export function registerStubs(app: vue.App) {
  app.component('NuxtLink', {
    props: { to: { type: [String, Object], default: '' } },
    setup:
      (props: { to: string | object }, { slots }: { slots: Record<string, () => unknown> }) =>
      () =>
        vue.h('a', { href: typeof props.to === 'string' ? props.to : '#' }, slots.default?.()),
  })
  app.component('VIcon', {
    setup:
      (_props: unknown, { slots }: { slots: Record<string, () => unknown> }) =>
      () =>
        vue.h('i', { class: 'v-icon' }, slots.default?.()),
  })
  app.config.globalProperties.$t = (key: string, params?: Record<string, unknown>) =>
    params ? `${key}:${JSON.stringify(params)}` : key
}
