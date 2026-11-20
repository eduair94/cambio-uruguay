// @vitest-environment jsdom
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { compileScript, parse } from '@vue/compiler-sfc'
import ts from 'typescript'
import * as vue from 'vue'
import { afterEach, describe, expect, it } from 'vitest'
import * as autoTranslateUtils from '../../utils/autoTranslate'
import * as carsUtils from '../../utils/cars'
import { CAR_COLORS, CAR_FUELS, normalizeCarsQuery, type CarsQuery } from '../../utils/cars'

// El cajón de filtros de /autos-usados-uruguay tardaba 1.224 ms en abrir a 4× de CPU (+467 nodos)
// y la mitad de esos nodos eran los doce controles de «Más filtros»: el <details> nativo sólo
// cambiaba `open`, así que el grupo cerrado montaba igual sus nueve VSelect y tres VCheckbox. La
// regla: el grupo cerrado no monta sus campos (v-if="moreOpen"), pero lo que el lector eligió ahí
// —o lo que trae la URL— se sigue aplicando, porque vive en `draft` y no en los controles.
// Excepción: en una página traducida por máquina el grupo se monta siempre, porque la traducción
// del cuerpo sólo conoce las frases que el servidor dibujó (plugins/auto-translate.ts).

const APP = join(__dirname, '..', '..')
const filename = join(APP, 'components/cars/Filters.vue')
const { descriptor } = parse(readFileSync(filename, 'utf8'), { filename })

function elements(node: any): any[] {
  return [node, ...(node.children || []).flatMap(elements)]
}

const FACETS = { brands: [], models: [], departments: [], sources: [], bodies: [] }

/** Lo que plugins/auto-translate.ts deja en `useState('auto-translate')`; null = sin plugin. */
type TranslationState = { locale: string; embargoed: boolean } | null

/** El componente compilado de verdad, con Vuetify y el panel reemplazados por stubs mínimos. */
function loadFilters(translation: TranslationState): vue.Component {
  const { content } = compileScript(descriptor, { id: 'car-filters-more', inlineTemplate: true })
  const { outputText } = ts.transpileModule(content, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  })
  const modules: Record<string, unknown> = {
    vue,
    '~/utils/cars': carsUtils,
    '~/utils/autoTranslate': autoTranslateUtils,
  }
  const exports = {} as { default: vue.Component }
  // Las auto-importaciones de Nuxt que usa el componente.
  new Function(
    'exports',
    'require',
    'reactive',
    'ref',
    'computed',
    'watch',
    'useState',
    outputText
  )(
    exports,
    (name: string) => {
      if (name in modules) return modules[name]
      throw new Error(`Unexpected module ${name}`)
    },
    vue.reactive,
    vue.ref,
    vue.computed,
    vue.watch,
    (key: string) => {
      if (key !== 'auto-translate') throw new Error(`Unexpected state ${key}`)
      return vue.ref(translation)
    }
  )
  return exports.default
}

/** Los controles montados, por etiqueta: así el test escribe en uno como lo haría el lector. */
const fields = new Map<string, (value: unknown) => void>()

/** Un control de Vuetify reducido a su etiqueta y su v-model. */
const field = vue.defineComponent({
  props: { label: { type: String, default: '' }, modelValue: { default: null } },
  emits: ['update:modelValue'],
  setup(props, { emit }) {
    fields.set(props.label, value => emit('update:modelValue', value))
    vue.onUnmounted(() => fields.delete(props.label))
    return () => vue.h('div', { 'data-field': props.label })
  },
})

const panel = vue.defineComponent({
  emits: ['apply', 'clear', 'update:open'],
  setup:
    (_, { slots, emit }) =>
    () =>
      vue.h('form', [
        slots.default?.(),
        vue.h('button', { type: 'button', 'data-testid': 'apply', onClick: () => emit('apply') }),
      ]),
})

let mounted: { app: vue.App; root: HTMLElement } | null = null
afterEach(() => {
  mounted?.app.unmount()
  mounted?.root.remove()
  mounted = null
  fields.clear()
})

function mountFilters(initial: CarsQuery, translation: TranslationState = null) {
  const Filters = loadFilters(translation)
  const query = vue.shallowRef(initial)
  const applied: CarsQuery[] = []
  const app = vue.createApp({
    render: () =>
      vue.h(Filters, {
        query: query.value,
        facets: FACETS,
        onApply: (next: CarsQuery) => applied.push(next),
      }),
  })
  app.component('CarsFilterPanel', panel)
  for (const name of ['VSelect', 'VTextField', 'VCheckbox']) app.component(name, field)
  app.config.warnHandler = () => {}
  const root = document.createElement('div')
  document.body.appendChild(root)
  app.mount(root)
  mounted = { app, root }
  const details = () => root.querySelector('details.car-filters__group') as HTMLDetailsElement
  return {
    root,
    query,
    applied,
    details,
    has: (label: string) => root.querySelector(`[data-field="${label}"]`) !== null,
    async toggle(open: boolean) {
      details().open = open
      details().dispatchEvent(new Event('toggle'))
      await vue.nextTick()
    },
    async apply() {
      ;(root.querySelector('[data-testid="apply"]') as HTMLButtonElement).click()
      await vue.nextTick()
      return applied.at(-1)!
    },
  }
}

describe('«Más filtros» del directorio de autos', () => {
  it('el grupo de campos sólo se monta abierto o con el cuerpo traducido', () => {
    const groupFields = elements(descriptor.template!.ast).find(node =>
      node.props?.some(
        (prop: any) => prop.name === 'class' && prop.value?.content === 'car-filters__group-fields'
      )
    )
    expect(groupFields, '.car-filters__group-fields').toBeTruthy()
    const vIf = groupFields.props.find((prop: any) => prop.type === 7 && prop.name === 'if')
    expect(vIf?.exp?.content).toBe('moreOpen || translatedBody')
    // El resumen sigue en el HTML, con su testid, aunque el grupo esté cerrado.
    const summary = elements(descriptor.template!.ast).find(node => node.tag === 'summary')
    expect(summary.props.some((p: any) => p.value?.content === 'car-filters-more')).toBe(true)
  })

  it('cerrado y sin filtros puestos no monta ninguno de sus controles', async () => {
    const view = mountFilters(normalizeCarsQuery({}))
    await vue.nextTick()
    expect(view.details().open).toBe(false)
    expect(view.root.querySelector('[data-testid="car-filters-more"]')).not.toBeNull()
    for (const label of ['Combustible', 'Caja', 'Color', 'Departamento', 'Bajó de precio']) {
      expect(view.has(label), label).toBe(false)
    }
    // Los campos de arriba sí están.
    expect(view.has('Marca')).toBe(true)
    expect(view.has('Km máximo')).toBe(true)
  })

  it('abrirlo monta los campos y cerrarlo los saca', async () => {
    const view = mountFilters(normalizeCarsQuery({}))
    await view.toggle(true)
    expect(view.has('Combustible')).toBe(true)
    expect(view.has('Sin deuda ni choque declarados')).toBe(true)
    await view.toggle(false)
    expect(view.has('Combustible')).toBe(false)
  })

  it('un filtro de la URL abre el grupo solo, y se sigue aplicando con el grupo cerrado', async () => {
    const fuel = CAR_FUELS[0]!
    const view = mountFilters(normalizeCarsQuery({ fuel, priceDrop: '1' }))
    await vue.nextTick()
    expect(view.details().open).toBe(true)
    expect(view.has('Combustible')).toBe(true)
    await view.toggle(false)
    expect(view.has('Combustible')).toBe(false)
    const applied = await view.apply()
    expect(applied.fuel).toBe(fuel)
    expect(applied.priceDrop).toBe(true)
  })

  it('lo elegido adentro del grupo sobrevive a cerrarlo', async () => {
    const color = CAR_COLORS[0]!
    const view = mountFilters(normalizeCarsQuery({}))
    await view.toggle(true)
    fields.get('Color')!(color)
    await vue.nextTick()
    await view.toggle(false)
    expect(view.has('Color')).toBe(false)
    const applied = await view.apply()
    expect(applied.color).toBe(color)
  })

  it('una URL nueva con un filtro del grupo lo abre aunque el lector lo haya cerrado', async () => {
    const view = mountFilters(normalizeCarsQuery({}))
    await view.toggle(true)
    await view.toggle(false)
    expect(view.details().open).toBe(false)
    expect(view.has('Departamento')).toBe(false)
    view.query.value = normalizeCarsQuery({ department: carsUtils.CAR_DEPARTMENTS[0] })
    await vue.nextTick()
    await vue.nextTick()
    expect(view.details().open).toBe(true)
    expect(view.has('Departamento')).toBe(true)
    expect((await view.apply()).department).toBe(carsUtils.CAR_DEPARTMENTS[0])
  })

  it('una URL nueva con otro valor del mismo filtro se aplica con el grupo cerrado y sin montar', async () => {
    const [first, second] = CAR_FUELS
    const view = mountFilters(normalizeCarsQuery({ fuel: first }))
    await vue.nextTick()
    expect(view.details().open).toBe(true)
    await view.toggle(false)
    view.query.value = normalizeCarsQuery({ fuel: second })
    await vue.nextTick()
    await vue.nextTick()
    // El conteo sigue en 1: el grupo no se reabre y sus campos siguen sin montarse.
    expect(view.details().open).toBe(false)
    expect(view.has('Combustible')).toBe(false)
    expect((await view.apply()).fuel).toBe(second)
  })

  it('en una página traducida por máquina el grupo cerrado monta sus campos igual', async () => {
    const view = mountFilters(normalizeCarsQuery({}), { locale: 'en', embargoed: false })
    await vue.nextTick()
    expect(view.details().open).toBe(false)
    for (const label of ['Combustible', 'Color', 'Sin deuda ni choque declarados']) {
      expect(view.has(label), label).toBe(true)
    }
    // Siguen montados al cerrarlo: el texto tiene que estar en el HTML del servidor.
    await view.toggle(true)
    await view.toggle(false)
    expect(view.has('Combustible')).toBe(true)
  })

  it('en español, o con la traducción reservada por el libro de cambios, no los monta', async () => {
    for (const translation of [
      { locale: 'es', embargoed: false },
      { locale: 'en', embargoed: true },
    ]) {
      const view = mountFilters(normalizeCarsQuery({}), translation)
      await vue.nextTick()
      expect(view.has('Combustible'), JSON.stringify(translation)).toBe(false)
      mounted?.app.unmount()
      mounted?.root.remove()
      mounted = null
    }
  })
})
