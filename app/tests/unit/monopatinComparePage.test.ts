// El comparador de monopatines (/monopatines-electricos-uruguay/comparar?m=a,b,c).
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const page = readFileSync(
  join(__dirname, '..', '..', 'pages', 'monopatines-electricos-uruguay', 'comparar.vue'),
  'utf8'
)
const template = page.split('<script setup')[0] ?? ''

describe('/monopatines-electricos-uruguay/comparar', () => {
  it('sólo en español: no genera copias en/pt', () => {
    expect(page).toContain("defineI18nRoute({ locales: ['es'] })")
  })

  it('nunca se indexa: cada combinación es una copia elegida por el lector', () => {
    expect(page).toContain("robots: 'noindex, follow'")
  })

  it('lee los modelos de ?m= con el parser que descarta lo desconocido', () => {
    expect(page).toContain('monopatinCompareSlugs(route.query.m, known.value)')
    expect(page).toContain("useFetch<MonopatinModelListResponse>('/api/movilidad/modelos'")
  })

  it('arma las filas con la regla de "mejor" compartida y las dibuja con la tabla común', () => {
    expect(page).toContain('monopatinCompareRows(chosen.value)')
    expect(template).toContain('<MovilidadCompareTable')
    expect(template).toContain('hub="/monopatines-electricos-uruguay"')
  })

  it('un solo H1', () => {
    expect(template.match(/<h1[\s>]/g) ?? []).toHaveLength(1)
  })
})
