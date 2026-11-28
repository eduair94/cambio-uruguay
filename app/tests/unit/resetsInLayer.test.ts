// Un reset de márgenes FUERA de una capa le gana a `mt-*`/`mb-*` de Vuetify 4.
//
// Vuetify 4 sirve sus utilidades en `@layer vuetify-utilities` y sin `!important`.
// En la cascada, una regla sin capa le gana a TODA regla en capa, sin importar la
// especificidad: `:where(.x) :where(p) { margin: 0 }` puntúa (0,0,0) y aun así borra el
// `mb-3` de cualquier párrafo debajo de `.x`, incluidos los de los componentes hijos.
// Medido en producción el 2026-11-28: el título y la bajada de «Quién nos cita» en
// /acerca quedaban a 0 px de su tarjeta (pedían 4 y 12), y en /prestamos-p2p-uruguay
// catorce `mt-2`/`mt-3`/`mt-4` no se aplicaban. El arreglo de 2026-09-09 (pasar los
// resets de `:is()` a `:where()`) no lo veía: la especificidad no juega entre capas.
//
// La regla: todo reset (`… :where(p, h2…) { margin… }` o con `:is()`) va dentro de
// `@layer vuetify-overrides.cu-reset { … }`. Ahí le sigue ganando a la hoja del
// navegador y pierde contra las utilidades y contra cualquier regla sin capa de la
// página. Ver docs/app/CSS_RESET_SPECIFICITY.md.
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import { parse } from '@vue/compiler-sfc'
import { describe, expect, it } from 'vitest'

const ROOT = join(__dirname, '..', '..')
const LAYER = 'vuetify-overrides.cu-reset'
const DIRS = ['assets', 'components', 'layouts', 'pages']
/** Un selector que elige elementos de texto pelados: la forma de un reset. */
const RESET_SELECTOR =
  /:(?:where|is)\(\s*(?:h[1-6]|p|ul|ol|dl|dt|dd|figure|blockquote|fieldset|legend|pre)\b/
const SPACING_DECL = /(?:^|;|\s)(?:margin|padding)[\w-]*\s*:/

function walk(dir: string, out: string[] = []): string[] {
  let entries: string[]
  try {
    entries = readdirSync(dir)
  } catch {
    return out
  }
  for (const entry of entries) {
    if (entry === 'node_modules' || entry.startsWith('.')) continue
    const full = join(dir, entry)
    if (statSync(full).isDirectory()) walk(full, out)
    else if (/\.(?:vue|css|scss)$/.test(entry)) out.push(full)
  }
  return out
}

function styleText(file: string): string {
  const src = readFileSync(file, 'utf8')
  // El parser de Vue y no una expresión regular: SurfaceCard nombra `<style` en un
  // comentario del script, y una regex se llevaba el script entero como CSS.
  const css = file.endsWith('.vue')
    ? parse(src, { filename: file })
        .descriptor.styles.map(s => s.content)
        .join('\n')
    : src
  return css.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/^\s*\/\/.*$/gm, ' ')
}

/** Reglas de reset que no están adentro de la capa, como `archivo: selector`. */
export function unlayeredResets(file: string, css: string): string[] {
  const found: string[] = []
  const stack: string[] = []
  let prelude = ''
  let i = 0
  while (i < css.length) {
    const ch = css[i]
    if (ch === '{') {
      const head = prelude.trim()
      if (RESET_SELECTOR.test(head) && !head.startsWith('@')) {
        const close = css.indexOf('}', i)
        const body = css.slice(i + 1, close === -1 ? css.length : close)
        const inLayer = stack.some(s => s.replace(/\s+/g, ' ') === `@layer ${LAYER}`)
        if (SPACING_DECL.test(body) && !inLayer)
          found.push(`${relative(ROOT, file)}: ${head.replace(/\s+/g, ' ')}`)
      }
      stack.push(head)
      prelude = ''
    } else if (ch === '}') {
      stack.pop()
      prelude = ''
    } else if (ch === ';') {
      prelude = ''
    } else {
      prelude += ch
    }
    i++
  }
  return found
}

describe('resets de márgenes en capa', () => {
  const files = [
    ...DIRS.flatMap(d => walk(join(ROOT, d))),
    ...readdirSync(ROOT)
      .filter(f => f.endsWith('.vue'))
      .map(f => join(ROOT, f)),
  ]
  // Se lee una sola vez y al recolectar: parsear ~1.000 SFC pasa los 5 s de un `it` en una
  // máquina cargada, y los dos casos de abajo leen lo mismo.
  const styles = new Map(files.map(f => [f, styleText(f)]))

  it('encuentra los archivos que tiene que mirar', () => {
    // Si el barrido deja de ver los resets conocidos, el test pasaría en vacío.
    const names = files.map(f => relative(ROOT, f).replace(/\\/g, '/'))
    expect(names).toContain('assets/css/critical.css')
    expect(names).toContain('components/SurfaceCard.vue')
    const layered = files.filter(f => styles.get(f)!.includes(`@layer ${LAYER}`))
    expect(layered.length).toBeGreaterThanOrEqual(40)
  })

  it('ningún reset de márgenes vive fuera de @layer ' + LAYER, () => {
    const offenders = files.flatMap(f => unlayeredResets(f, styles.get(f)!))
    expect(
      offenders,
      `Estos resets le ganan a mt-*/mb-* de Vuetify (una regla sin capa le gana a una en capa ` +
        `sin importar la especificidad). Envolvelos en \`@layer ${LAYER} { … }\`:\n` +
        offenders.join('\n')
    ).toEqual([])
  })

  it('detecta un reset suelto y acepta uno en capa', () => {
    const loose = ':where(.x) :where(p, h2) { margin: 0; }'
    const layered = `@layer ${LAYER} {\n  :where(.x) :where(p, h2) { margin: 0; }\n}`
    const typography = '.x :is(h1, h2) { font-size: 2rem; }'
    expect(unlayeredResets(join(ROOT, 'x.vue'), loose)).toHaveLength(1)
    expect(unlayeredResets(join(ROOT, 'x.vue'), layered)).toEqual([])
    expect(unlayeredResets(join(ROOT, 'x.vue'), typography)).toEqual([])
  })

  it('Vuetify sigue poniendo vuetify-overrides por debajo de vuetify-utilities', () => {
    // Si una versión de Vuetify renombra o deja de declarar `vuetify-overrides`, nuestra
    // capa pasa a ser una capa NUEVA declarada después de las utilidades — o sea, por
    // ENCIMA — y los resets vuelven a borrar los mt-*/mb-* sin que nada falle.
    const main = readFileSync(
      join(ROOT, 'node_modules', 'vuetify', 'lib', 'styles', 'main.css'),
      'utf8'
    )
    const overrides = main.indexOf('@layer vuetify-overrides')
    const utilities = main.indexOf('@layer vuetify-utilities')
    expect(overrides, 'Vuetify ya no declara @layer vuetify-overrides').toBeGreaterThanOrEqual(0)
    expect(utilities, 'Vuetify ya no declara @layer vuetify-utilities').toBeGreaterThan(overrides)
  })
})
