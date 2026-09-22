import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { parse } from '@vue/compiler-sfc'
import { describe, expect, it } from 'vitest'

// El aire ARRIBA de cada página lo pone el layout. Medido en producción el 2026-09-22 a 1440 px:
// cada página arranca con su propio <VContainer> y su padding-top era 16, 24, 32, 40 o 48 según la
// clase que le tocó (py-6 py-md-10 en 56 páginas, py-8 py-md-12 en 43), más los 16 px propios de
// las migas cuando abren la página. En /celulares-uruguay el texto de las migas quedaba a 67 px de
// la barra y el H1 a 115: la miga estaba más lejos de la barra que del título al que pertenece.
//
// La regla vive en layouts/default.vue, al lado de `.container_custom`, y es la hermana de la que
// FamiliaNav.vue aplica al contenedor que sigue a la barra (familiaNav.test.ts): el primer
// contenedor lleva 16 y las migas que lo abren 0, así el contenido empieza a 12 + 16 = 28 px de la
// barra, el mismo margen que tiene a los costados. Depende de que toda página arranque con un
// <VContainer>, que es lo que vigila pageContainer.test.ts.

const filename = resolve(__dirname, '../../layouts/default.vue')
const { descriptor } = parse(readFileSync(filename, 'utf8'), { filename })

interface Rule {
  selectors: string[]
  body: string
  scoped: boolean
}

/** Every rule of the layout's CSS, with whether its block is `scoped`. */
const rules: Rule[] = descriptor.styles.flatMap(style =>
  [...style.content.replace(/\/\*[\s\S]*?\*\//g, '').matchAll(/([^{}]+)\{([^}]*)\}/g)].map(
    ([, selector, body]) => ({
      // Prettier wraps a long selector over several lines: one space between compounds.
      selectors: selector!
        .split(',')
        .map(s => s.replace(/\s+/g, ' ').trim())
        .filter(Boolean),
      body: body!,
      scoped: Boolean(style.scoped),
    })
  )
)

/** The rule whose selector list contains `selector` exactly. */
function ruleOf(selector: string): Rule {
  const rule = rules.find(r => r.selectors.includes(selector))
  expect(rule, selector).toBeDefined()
  return rule!
}

function bodyOf(selector: string): string {
  return ruleOf(selector).body
}

function px(declarations: string, property: string): number[] {
  const value = declarations.match(new RegExp(`(?:^|;|\\s)${property}\\s*:\\s*([^;]+)`))?.[1] ?? ''
  return [...value.matchAll(/(\d+(?:\.\d+)?)px/g)].map(m => Number(m[1]))
}

const FIRST_CONTAINER = [
  '.container_custom > .v-container:first-child',
  '.container_custom > :first-child:not(.v-container) > .v-container:first-child',
]

describe('el aire arriba de la página', () => {
  it('lo pone el layout: el primer contenedor de toda página lleva 16 px, con !important', () => {
    for (const selector of FIRST_CONTAINER) {
      const body = bodyOf(selector)
      expect(body, selector).toMatch(/padding-top\s*:\s*16px\s*!important/)
    }
  })

  // El <VContainer> es de la página: no lleva el atributo de scope del layout, así que con scope
  // la regla compila a `.v-container:first-child[data-v-…]`, no matchea nada y no avisa. Es el
  // mismo motivo por el que FamiliaNav.vue tiene su regla en un <style> aparte.
  it('vive en un bloque sin scope, porque el contenedor es de la página', () => {
    for (const selector of FIRST_CONTAINER) {
      expect(ruleOf(selector).scoped, selector).toBe(false)
      expect(ruleOf(`${selector} > .v-breadcrumbs:first-child`).scoped, selector).toBe(false)
    }
  })

  it('anula el padding-top de las migas que abren la página', () => {
    for (const selector of FIRST_CONTAINER) {
      const body = bodyOf(`${selector} > .v-breadcrumbs:first-child`)
      expect(body, selector).toMatch(/padding-top\s*:\s*0\s*!important/)
    }
  })

  // 12 del layout + 16 del contenedor = 28, la columna de "The Page Brings Its Container Rule":
  // el contenido queda a la misma distancia de la barra que del borde.
  it('deja el contenido a la misma distancia de la barra que del borde', () => {
    const layout = px(bodyOf('.container_custom'), 'padding')
    const layoutTop = layout[0]!
    const layoutInline = layout[1] ?? layout[0]!
    const containerTop = px(bodyOf(FIRST_CONTAINER[0]!), 'padding-top')[0]!
    const pageInline = px(bodyOf('.layout-tail'), 'padding-inline')[0]!
    expect(layoutTop + containerTop).toBe(layoutInline + pageInline)
  })

  // Cuando la barra de la familia está, ella es la primera hija de `.container_custom` y pone el
  // aire con su margin-bottom (FamiliaNav.vue): estas reglas tienen que quedarse fuera.
  it('no toca al contenedor que sigue a la barra de la familia', () => {
    for (const selector of FIRST_CONTAINER) {
      // Both selectors anchor on the FIRST child of `.container_custom`; the container that
      // follows the bar is its second child, so neither can reach it.
      const [, firstCompound] = selector.match(/^\.container_custom > (\S+)/) ?? []
      expect(firstCompound, selector).toContain(':first-child')
    }
  })
})
