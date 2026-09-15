// Un `VChip` adentro de un `<p>` rompe la hidratación de TODA la página.
//
// VChip renderiza `<div class="v-chip__content">`, y un `<div>` no puede vivir
// adentro de un `<p>`: el parser del navegador cierra el `<p>` antes del div,
// el DOM del servidor deja de coincidir con el vdom del cliente y Vue reporta
// "Hydration completed but contains mismatches". El síntoma es que la página
// se ve perfecta y ningún control reacciona (visto en /meal-prep-uruguay el
// 2026-09-15: el peso cambiaba en el input y las kcal no).
//
// `VIcon` (`<i>`) y `VBtn` (`<button>`) son inline y no tienen este problema.
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import { describe, expect, it } from 'vitest'

const ROOT = join(__dirname, '..', '..')

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry)
    if (statSync(full).isDirectory()) walk(full, out)
    else if (full.endsWith('.vue')) out.push(full)
  }
  return out
}

const BLOCK_INSIDE_P = /<(?:VChip|VChipGroup|VAlert|VCard|VRow|VCol|VTable|VProgressLinear)\b/

describe('sin componentes de bloque adentro de <p>', () => {
  const files = [...walk(join(ROOT, 'pages')), ...walk(join(ROOT, 'components'))]

  it('encuentra archivos (guarda de vacuidad)', () => {
    expect(files.length).toBeGreaterThan(100)
  })

  it('ningún <p> contiene VChip', () => {
    const offenders: string[] = []
    for (const file of files) {
      const source = readFileSync(file, 'utf8')
      for (const match of source.matchAll(/<p\b[^>]*>([\s\S]*?)<\/p>/g)) {
        if (/<VChip\b/.test(match[1]!)) {
          const line = source.slice(0, match.index).split('\n').length
          offenders.push(`${relative(ROOT, file)}:${line}`)
        }
      }
    }
    expect(offenders).toEqual([])
  })

  it('la página de meal prep no tiene ningún componente de bloque adentro de <p>', () => {
    const source = readFileSync(join(ROOT, 'pages', 'meal-prep-uruguay.vue'), 'utf8')
    for (const match of source.matchAll(/<p\b[^>]*>([\s\S]*?)<\/p>/g)) {
      expect(BLOCK_INSIDE_P.test(match[1]!), match[0].slice(0, 80)).toBe(false)
    }
  })
})
