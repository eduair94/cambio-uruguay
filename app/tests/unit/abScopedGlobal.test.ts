import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import fg from 'fast-glob'
import { describe, expect, it } from 'vitest'

// 28/11/2026: el brazo `b` de `alquiler-tarjeta` dejó /alquileres-uruguay en blanco en el celular.
// La regla vivía en el <style scoped> de la página como `:global(html[data-ab-…]) .rental-card …` y
// Vue la compiló a `html[data-ab-…] { display: none }`: lo que sigue a un `:global(...)` se pierde.
// Las variantes A/B van en CSS global (critical.css) con selectores comunes.

const APP = join(__dirname, '..', '..')

describe('las variantes A/B no van en CSS con scope', () => {
  it('ningún componente usa :global(html…) ni el atributo data-ab dentro de <style scoped>', () => {
    const offenders: string[] = []
    for (const file of fg.sync(['pages/**/*.vue', 'components/**/*.vue', 'layouts/**/*.vue'], {
      cwd: APP,
    })) {
      const source = readFileSync(join(APP, file), 'utf8')
      for (const style of source.matchAll(/<style\s[^>]*scoped[^>]*>([\s\S]*?)<\/style>/g)) {
        if (/:global\(\s*html\b/.test(style[1]!) || /data-ab-/.test(style[1]!)) offenders.push(file)
      }
    }
    expect(offenders).toEqual([])
  }, 60_000)

  it('las reglas del brazo b de alquiler-tarjeta nunca ocultan <html> ni la tarjeta entera', () => {
    const css = readFileSync(join(APP, 'assets', 'css', 'critical.css'), 'utf8')
    const rules = [...css.matchAll(/([^{}]*data-ab-alquiler-tarjeta[^{}]*)\{([^}]*)\}/g)]
    expect(rules.length).toBeGreaterThan(0)
    for (const [, selector, body] of rules) {
      for (const part of selector!.split(',')) {
        const sel = part.trim()
        if (/display:\s*none/.test(body!)) {
          expect(sel).toMatch(/\]\s+\.rental-card(__footnote|\s+\.zone-bars)$/)
        }
      }
    }
  })
})
