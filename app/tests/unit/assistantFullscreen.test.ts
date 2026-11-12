// La pantalla completa del asistente no pierde la conversación y el botón atrás la cierra.
//
// Se verificó en un navegador (escritorio y 390 px) el 2026-11-11; este archivo fija las dos
// decisiones que lo hacen posible, porque romperlas no falla en ningún otro test y la página sigue
// "andando":
//
// 1. UNA sola tarjeta de chat, mudada por un Teleport entre la página y el diálogo. Renderizarla dos
//    veces (una en la página y otra en el diálogo, con v-if) parece lo mismo hasta que se usa: la
//    instancia del diálogo nace vacía, sin los mensajes, el historial del modelo ni la sesión.
// 2. La pantalla completa es una entrada del historial. El close-on-back de Vuetify sólo intercepta
//    navegaciones de la app; quien llegó desde Google no tiene ninguna antes, y el botón atrás lo
//    devolvía a Google con la conversación perdida.

import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const source = readFileSync(join(__dirname, '../../components/AssistantChat.vue'), 'utf8')
const template = source.slice(0, source.indexOf('<script'))

describe('pantalla completa del asistente', () => {
  it('hay una sola tarjeta de chat, y un Teleport la muda de lugar', () => {
    expect(template.match(/<VCard\b/g)).toHaveLength(1)
    expect(template.match(/<Teleport\b/g)).toHaveLength(1)
    // The card is inside the Teleport, which moves it instead of rendering it twice.
    expect(template.indexOf('<Teleport')).toBeLessThan(template.indexOf('<VCard'))
    expect(template).toMatch(/<Teleport[^>]*:to="`#\$\{fullscreen \? stageId : homeId\}`"/)
  })

  it('el diálogo existe desde el principio, para que el Teleport tenga a dónde ir', () => {
    const dialog = template.slice(template.indexOf('<VDialog'))
    expect(dialog).toMatch(/\bfullscreen\b/)
    expect(dialog).toMatch(/\beager\b/)
  })

  it('el botón atrás lo maneja el chat con su propia entrada de historial', () => {
    expect(template).toMatch(/:close-on-back="false"/)
    expect(source).toMatch(/history\.pushState\(/)
    expect(source).toMatch(/addEventListener\('popstate'/)
    expect(source).toMatch(/removeEventListener\('popstate'/)
    // Closing by the button or Esc takes the entry back off, or the next Back does nothing.
    expect(source).toMatch(/window\.history\.back\(\)/)
  })
})
