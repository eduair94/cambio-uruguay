// @vitest-environment jsdom
// /celulares-uruguay en el teléfono (medido el 19/11/2026 a 390 px):
//
// 1. La grilla de modelos era `minmax(200px, 1fr)`: a ~358 px de contenido entraba UNA columna,
//    89 tarjetas apiladas, un documento de 53.392 px (63 pantallas) y ningún celular en la primera
//    pantalla. Con `minmax(min(150px, 100%), 1fr)` entran dos columnas desde 316 px de contenido
//    (390 px de ancho); a 320 px queda una, y el `min(…, 100%)` evita el desborde en un
//    contenedor de menos de 150 px.
// 2. `<label for="phones-max-price">` apuntaba al id del VSlider, que Vuetify pone en el <input>
//    oculto (tabindex=-1), así que el control que se enfoca —el pulgar, role="slider"— no tenía
//    nombre (axe aria-input-field-name). El rótulo ahora tiene id y el slider lo cita con
//    aria-labelledby, que Vuetify le pasa al pulgar (no es class/style/id/data-*).
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { join } from 'node:path'
import { createSSRApp, h } from 'vue'
import { renderToString } from '@vue/server-renderer'
import { describe, expect, it } from 'vitest'

const require = createRequire(import.meta.url)
const { createVuetify, components } = require('vuetify/dist/vuetify.js')

const src = readFileSync(
  join(__dirname, '..', '..', 'pages', 'celulares-uruguay', 'index.vue'),
  'utf8'
)
const template = src.split('<script setup')[0] ?? ''
const style = src.match(/<style scoped>([\s\S]*?)<\/style>/)?.[1] ?? ''

/** The declarations of one CSS rule of the page's scoped style. */
function rule(selector: string): string {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return style.match(new RegExp(`(?:^|\\n)${escaped}\\s*\\{([^}]*)\\}`))?.[1] ?? ''
}

describe('/celulares-uruguay: grilla de modelos', () => {
  it('dos columnas en el teléfono: minmax(min(150px, 100%), 1fr)', () => {
    const grid = rule('.phone-grid')
    expect(grid).toMatch(
      /grid-template-columns:\s*repeat\(auto-fill,\s*minmax\(min\(150px,\s*100%\),\s*1fr\)\)/
    )
    expect(grid).not.toMatch(/minmax\(200px/)
  })

  it('la unidad intermedia sigue ocupando la fila entera', () => {
    expect(rule('.phone-grid__ad')).toMatch(/grid-column:\s*1\s*\/\s*-1/)
  })

  it('un nombre de modelo largo parte la línea en vez de salirse de una tarjeta de 150 px', () => {
    expect(rule('.phone-card__name')).toMatch(/overflow-wrap:\s*anywhere/)
  })
})

describe('/celulares-uruguay: el slider de precio tiene nombre', () => {
  it('el rótulo tiene id y el VSlider lo cita con aria-labelledby', () => {
    expect(template).toMatch(/<label[^>]*\sid="phones-max-price-label"/)
    const slider = template.match(/<VSlider\b[^>]*>/)?.[0] ?? ''
    expect(slider).toContain('aria-labelledby="phones-max-price-label"')
  })

  it('Vuetify pasa aria-labelledby al pulgar role="slider", no al input oculto', async () => {
    const app = createSSRApp({
      render: () =>
        h('div', [
          h('label', { id: 'phones-max-price-label' }, 'Hasta $ 50.000'),
          h(components.VSlider, {
            id: 'phones-max-price',
            'aria-labelledby': 'phones-max-price-label',
            modelValue: 50000,
            min: 0,
            max: 100000,
            step: 1000,
            hideDetails: true,
          }),
        ]),
    })
    app.use(createVuetify())
    document.body.innerHTML = await renderToString(app)

    const thumb = document.querySelector('[role="slider"]')
    expect(thumb).not.toBeNull()
    expect(thumb!.getAttribute('aria-labelledby')).toBe('phones-max-price-label')
    expect(document.getElementById('phones-max-price-label')?.textContent).toBe('Hasta $ 50.000')
    document.body.innerHTML = ''
  })
})
