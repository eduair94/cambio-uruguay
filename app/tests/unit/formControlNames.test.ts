// @vitest-environment jsdom
// Los controles de formulario sin nombre de dos herramientas (análisis de accesibilidad del
// 20/11/2026, axe sobre producción): en /herramientas/costo-de-vida el campo del ingreso es un
// <input type="number"> con aria-labelledby="input-v-…-label" que no apunta a nada y el <label>
// de al lado no tenía `for` (axe `label`, crítico); en /conviene-auto-moto-o-omnibus-uruguay los
// deslizadores «Días por semana» y «Horizonte» sólo tenían un <span> hermano, y el pulgar
// role="slider" salía sin nombre (axe `aria-input-field-name`, serio).
//
// Dos mitades: el código fuente de cada página declara el par (for/id, aria-labelledby/id), y
// Vuetify 4 de verdad lleva esos atributos al elemento que nombra el lector de pantalla.
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { resolve } from 'node:path'
import { createSSRApp, h } from 'vue'
import { renderToString } from '@vue/server-renderer'
import { describe, expect, it } from 'vitest'

const require = createRequire(import.meta.url)
const { createVuetify, components } = require('vuetify/dist/vuetify.js')
const APP = resolve(__dirname, '../..')
const template = (path: string) => {
  const src = readFileSync(resolve(APP, path), 'utf8')
  const start = src.indexOf('<template>')
  const end = src.lastIndexOf('</template>')
  return src.slice(start, end)
}

/** Every static id="…" in a template. */
const idsOf = (tpl: string) => new Set([...tpl.matchAll(/\sid="([^"]+)"/g)].map(m => m[1]))

/** The opening tag of every <Tag …> in a template (attributes can span lines). */
const openingTags = (tpl: string, tag: string) =>
  [...tpl.matchAll(new RegExp(`<${tag}\\b[^>]*>`, 'g'))].map(m => m[0])

function ssr(render: () => unknown) {
  const app = createSSRApp({ render })
  app.use(createVuetify())
  return renderToString(app)
}

describe('/herramientas/costo-de-vida: the income field has a name', () => {
  const tpl = template('pages/herramientas/costo-de-vida.vue')

  it('the label points at the VTextField by for/id', () => {
    const label = openingTags(tpl, 'label').find(t => /for="cv-income"/.test(t))
    expect(label).toBeDefined()
    // Vuetify gives the input aria-labelledby="<id>-label": that id is the label itself, so the
    // reference resolves instead of pointing at nothing.
    expect(label).toMatch(/id="cv-income-label"/)
    const field = openingTags(tpl, 'VTextField').find(t => /v-model\.number="income"/.test(t))
    expect(field).toMatch(/\sid="cv-income"/)
  })

  it('Vuetify puts that id on the <input> and labels it with <id>-label', async () => {
    const html = await ssr(() => h(components.VTextField, { id: 'cv-income', type: 'number' }))
    const input = html.match(/<input[^>]*>/)?.[0] ?? ''
    expect(input).toMatch(/\sid="cv-income"/)
    expect(input).toMatch(/aria-labelledby="cv-income-label"/)
  })
})

describe('/conviene-auto-moto-o-omnibus-uruguay: every slider has a name', () => {
  const tpl = template('pages/conviene-auto-moto-o-omnibus-uruguay.vue')
  const ids = idsOf(tpl)
  const sliders = openingTags(tpl, 'VSlider')

  it('each VSlider is aria-labelledby an id that exists in the template', () => {
    expect(sliders.length).toBeGreaterThanOrEqual(2)
    for (const slider of sliders) {
      const ref = slider.match(/aria-labelledby="([^"]+)"/)?.[1]
      expect(ref, slider).toBeDefined()
      expect(ids.has(ref!), `${ref} is not an id in the template`).toBe(true)
    }
  })

  it('the two sliders are named by their visible captions', () => {
    const caption = (id: string) =>
      tpl
        .match(new RegExp(`id="${id}"[^>]*>([\\s\\S]*?)</span>`))?.[1]
        .replace(/\s+/g, ' ')
        .trim()
    expect(caption('tp-dias-label')).toBe('Días por semana: {{ scenario.daysPerWeek }}')
    expect(caption('tp-horizonte-label')).toBe(
      'Horizonte de la comparación: {{ scenario.horizonMonths }} meses'
    )
  })

  it('Vuetify forwards aria-labelledby to the role="slider" thumb', async () => {
    const html = await ssr(() =>
      h(components.VSlider, { modelValue: 3, min: 1, max: 7, 'aria-labelledby': 'tp-dias-label' })
    )
    const thumb = html.match(/<div[^>]*role="slider"[^>]*>/)?.[0] ?? ''
    expect(thumb).toMatch(/aria-labelledby="tp-dias-label"/)
  })
})
