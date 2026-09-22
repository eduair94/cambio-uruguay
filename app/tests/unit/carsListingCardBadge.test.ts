import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { parse } from '@vue/compiler-sfc'
import { describe, expect, it } from 'vitest'
import { CAR_FLAG_LABELS } from '../../utils/cars'

// Las etiquetas de la tarjeta de auto ("Bajó US$ 500", "12 % bajo la mediana", la bandera de
// financiación) eran píldoras: border-radius 999px con 4px 8px de padding. Una píldora supone UNA
// línea. En la fila angosta de mobile la bandera "El precio publicado puede ser una entrega, no el
// precio del auto" envuelve en tres, la caja mide ~55 px de alto, el radio pasa a ser la mitad de
// eso y la curva se come el texto en las cuatro esquinas (visto en producción el 2026-09-22).
// Regla: una etiqueta que puede envolver lleva un radio fijo, chico frente a su alto de una línea,
// y aire suficiente a los costados para que ni una esquina redondeada toque una letra.

const filename = resolve(__dirname, '../../components/cars/ListingCard.vue')
const { descriptor } = parse(readFileSync(filename, 'utf8'), { filename })
const css = descriptor.styles
  .map(style => style.content.replace(/\/\*[\s\S]*?\*\//g, ''))
  .join('\n')

function bodyOf(selector: string): string {
  const match = css.match(
    new RegExp(`(?:^|\\})\\s*${selector.replace(/\./g, '\\.')}\\s*\\{([^}]*)\\}`)
  )
  expect(match, selector).not.toBeNull()
  return match![1]!
}

function px(declarations: string, property: string): number[] {
  const value = declarations.match(new RegExp(`(?:^|;|\\s)${property}\\s*:\\s*([^;]+)`))?.[1] ?? ''
  return [...value.matchAll(/(\d+(?:\.\d+)?)px/g)].map(m => Number(m[1]))
}

describe('la etiqueta de la tarjeta de auto', () => {
  const badge = bodyOf('.car-badge')

  it('tiene una bandera larga que envuelve en la fila angosta de mobile', () => {
    // La causa de la regla: una etiqueta que no entra en una línea de ~200 px a 12 px de fuente.
    expect(CAR_FLAG_LABELS.financing.length).toBeGreaterThan(40)
  })

  it('no es una píldora: el radio es fijo y menor que el alto de una línea', () => {
    const [radius] = px(badge, 'border-radius')
    expect(radius).toBeDefined()
    // Una línea de 12 px con 4 px de padding arriba y abajo mide ~24 px: el radio queda por debajo
    // de la mitad de eso, así que en tres líneas la curva sigue lejos de las letras.
    expect(radius!).toBeLessThanOrEqual(10)
  })

  it('deja al menos 10 px de aire a los costados para que las esquinas no toquen el texto', () => {
    const padding = px(badge, 'padding')
    const horizontal =
      padding.length === 1 ? padding[0]! : padding.length === 2 ? padding[1]! : padding[3]!
    expect(horizontal).toBeGreaterThanOrEqual(10)
  })
})
