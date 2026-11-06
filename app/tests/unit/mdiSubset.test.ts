import { readFileSync, readdirSync, statSync } from 'node:fs'
import { createRequire } from 'node:module'
import { join, resolve } from 'node:path'

import { describe, expect, it } from 'vitest'

import { iconCodepoints, iconTokens, subsetCss } from '../../modules/mdi-subset'

// modules/mdi-subset.ts recorta la fuente de íconos en el build a los nombres que aparecen en el
// código. Medido el 6/11/2026: 7.448 reglas y 394 KB de fuente en cada página, para ~730 íconos.
const APP = resolve(__dirname, '../..')
const require = createRequire(join(APP, 'package.json'))
const fullCss = readFileSync(require.resolve('@mdi/font/css/materialdesignicons.css'), 'utf8')

function sourceFiles(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    if (name.startsWith('.') || name === 'node_modules' || name === 'tests') continue
    const path = join(dir, name)
    if (statSync(path).isDirectory()) sourceFiles(path, out)
    else if (/\.(?:vue|ts|js|mjs)$/.test(name)) out.push(path)
  }
  return out
}

describe('recorte de la fuente de íconos', () => {
  it('lee todos los íconos de @mdi/font', () => {
    const codepoints = iconCodepoints(fullCss)
    expect(codepoints.size).toBeGreaterThan(7000)
    expect(codepoints.get('ab-testing')).toBe(0xf01c9)
  })

  it('encuentra los nombres en plantillas y en datos', () => {
    expect([...iconTokens('<v-icon>mdi-home</v-icon> icon: "mdi-bank-outline"')]).toEqual([
      'home',
      'bank-outline',
    ])
  })

  it('deja sólo las reglas usadas y conserva todo lo demás', () => {
    const css = subsetCss(fullCss, new Set(['home', 'spin-me-not']), 'x.woff2')
    expect(css).toContain('.mdi-home::before')
    expect(css).not.toContain('.mdi-ab-testing::before')
    expect(css).toContain('.mdi:before')
    expect(css).toContain('@keyframes mdi-spin')
    expect(css).toContain('.mdi-rotate-90:before')
    expect(css).toContain('url("./x.woff2") format("woff2")')
    expect(css).not.toContain('.eot')
    expect(css.length).toBeLessThan(fullCss.length / 10)
  })

  it('ningún ícono se arma en tiempo de ejecución, que es lo único que el recorte no ve', () => {
    const offenders: string[] = []
    const dirs = [
      'components',
      'composables',
      'layouts',
      'pages',
      'plugins',
      'server',
      'stores',
      'utils',
    ]
    for (const file of dirs.flatMap(dir => sourceFiles(join(APP, dir)))) {
      const text = readFileSync(file, 'utf8')
      if (/['"`]mdi-['"`]\s*\+|mdi-\$\{/.test(text)) offenders.push(file)
    }
    expect(offenders).toEqual([])
  })
})
