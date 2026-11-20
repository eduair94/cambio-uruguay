import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { runInNewContext } from 'node:vm'
import { destr } from 'destr'
import ts from 'typescript'
import { describe, expect, it } from 'vitest'
import { CONSENT_COOKIE_NAME, parseConsent } from '../../utils/consent'

// El borde guarda UNA variante del HTML por URL: la de la primera visita, con el aviso de cookies
// adentro. Quien ya decidió veía el aviso hasta que hidrataba y la columna entera subía 123 px
// (CLS 0,135 en /alquileres-uruguay). El servidor no puede saber quién mira, así que lo decide un
// script en el <head>, antes de que se pinte nada, marcando <html data-cu-consent>, y critical.css
// no pinta el aviso. Este test corre ESE script, el string que viaja en el HTML, contra un
// documento falso.

const APP = join(__dirname, '..', '..')
const read = (path: string): string => readFileSync(join(APP, path), 'utf8')
const CONFIG = read('nuxt.config.ts')

/** El valor de `PREPAINT_CONSENT_SCRIPT` tal como lo declara nuxt.config.ts (sólo literales). */
function prepaintScript(): string {
  const file = ts.createSourceFile('nuxt.config.ts', CONFIG, ts.ScriptTarget.ES2022, true)
  let init: ts.Expression | undefined
  file.forEachChild(node => {
    if (!ts.isVariableStatement(node)) return
    for (const decl of node.declarationList.declarations)
      if (ts.isIdentifier(decl.name) && decl.name.text === 'PREPAINT_CONSENT_SCRIPT')
        init = decl.initializer
  })
  if (!init) throw new Error('PREPAINT_CONSENT_SCRIPT no está en nuxt.config.ts')
  // Sólo literales concatenados: nada que dependa de un import (los tests que evalúan la config
  // con un conjunto cerrado de imports no lo conocerían).
  const onlyLiterals = (e: ts.Expression): boolean =>
    ts.isStringLiteral(e) ||
    ts.isNoSubstitutionTemplateLiteral(e) ||
    (ts.isBinaryExpression(e) &&
      e.operatorToken.kind === ts.SyntaxKind.PlusToken &&
      onlyLiterals(e.left) &&
      onlyLiterals(e.right)) ||
    (ts.isParenthesizedExpression(e) && onlyLiterals(e.expression))
  if (!onlyLiterals(init)) throw new Error('PREPAINT_CONSENT_SCRIPT tiene que ser sólo literales')
  return new Function(`return ${init.getText(file)}`)() as string
}

const SCRIPT = prepaintScript()

function run(cookie?: string): Record<string, string> {
  const attrs: Record<string, string> = {}
  const context = {
    document: {
      cookie: cookie ?? '',
      documentElement: {
        setAttribute: (name: string, value: string) => {
          attrs[name] = String(value)
        },
      },
    },
  }
  runInNewContext(SCRIPT, context)
  return attrs
}

/** Lo que decide la app al hidratar: `useCookie` (decodeURIComponent + destr) y `parseConsent`. */
function appDecision(raw: string): string | null {
  let decoded: string
  try {
    decoded = decodeURIComponent(raw)
  } catch {
    return null
  }
  const value = destr<unknown>(decoded)
  return parseConsent(typeof value === 'string' ? value : null)
}

const RAW_VALUES = [
  'granted',
  'denied',
  '%22granted%22',
  '%22denied%22',
  '"granted"',
  'granted%22',
  '%22granted',
  'gr%22anted',
  'granted"',
  'GRANTED',
  'foo',
  '',
  'grantedx',
  'xgranted',
  ' granted',
  '%E0%A4%A',
  'null',
  'true',
]

describe('prepaint: el aviso de cookies ya decidido no se pinta', () => {
  it('es chico, va inline en el <head> y no rompe la página si algo falla', () => {
    // Va inline en el <head> de TODAS las páginas.
    expect(SCRIPT.length).toBeLessThan(400)
    expect(SCRIPT).toContain('try{')
    expect(() => runInNewContext(SCRIPT, { document: {} })).not.toThrow()
    expect(() => runInNewContext(SCRIPT, {})).not.toThrow()
    expect(CONFIG).toMatch(
      /script:\s*\[\s*\{\s*innerHTML:\s*PREPAINT_CONSENT_SCRIPT,\s*tagPosition:\s*'head'\s*\}\s*\]/
    )
    // Sin import nuevo: gtagEnvironment y workerEntryConfig evalúan la config con un conjunto
    // cerrado de imports.
    expect(CONFIG).not.toMatch(/from '\.\/utils\/prepaint'/)
  })

  it('lee la cookie de la app', () => {
    expect(SCRIPT).toContain(`${CONSENT_COOKIE_NAME}=`)
  })

  it('marca sólo una decisión válida', () => {
    expect(run('cu_consent=granted')['data-cu-consent']).toBe('granted')
    expect(run('cu_consent=denied')['data-cu-consent']).toBe('denied')
    expect(run('cu_consent=%22granted%22')['data-cu-consent']).toBe('granted')
    expect(run('_ga=GA1; cu_consent=denied; lang=en')['data-cu-consent']).toBe('denied')
    expect(run('cu_consent=foo')).not.toHaveProperty('data-cu-consent')
    expect(run('cu_consent=GRANTED')).not.toHaveProperty('data-cu-consent')
    expect(run('cu_consent=')).not.toHaveProperty('data-cu-consent')
    expect(run('xcu_consent=granted')).not.toHaveProperty('data-cu-consent')
    expect(run('cu_consent=%E0%A4%A')).not.toHaveProperty('data-cu-consent')
    expect(run()).not.toHaveProperty('data-cu-consent')
  })

  it('comillas desparejas no cuentan: esconder el aviso a quien no decidió sería lo peor', () => {
    // Nada saca el atributo después, y el aviso en línea que la hidratación conserva quedaría
    // oculto toda la sesión: nunca se pediría el consentimiento.
    expect(run('cu_consent=granted%22')).not.toHaveProperty('data-cu-consent')
    expect(run('cu_consent=%22granted')).not.toHaveProperty('data-cu-consent')
    expect(run('cu_consent=gr%22anted')).not.toHaveProperty('data-cu-consent')
  })

  it('decide lo mismo que la app al hidratar, para cada valor crudo', () => {
    for (const raw of RAW_VALUES) {
      const got = run(`${CONSENT_COOKIE_NAME}=${raw}`)['data-cu-consent'] ?? null
      expect(got, `cu_consent=${raw}`).toBe(appDecision(raw))
    }
  })

  it('critical.css esconde sólo el aviso en línea, nunca el diálogo de "Configurar cookies"', () => {
    const css = read('assets/css/critical.css').replace(/\s+/g, ' ')
    // El diálogo (VDialog, clase .v-dialog) lo abre el pie cuando el visitante ya decidió.
    expect(css).toContain('html[data-cu-consent] .cookie-consent:not(.v-dialog) { display: none; }')
    expect(SCRIPT).toContain("'data-cu-consent'")
    // Ninguna otra regla de pre-pintado (el aviso de idioma sigue siendo client-only).
    expect(css).not.toContain('data-lang-hint')
  })

  it('el aviso de cookies sigue en el HTML del servidor para todos', () => {
    // La regla esconde; no saca nada del servidor. tests/e2e/consent.spec.ts sigue igual.
    const banner = read('components/CookieConsent.vue')
    expect(banner).not.toMatch(/<ClientOnly/)
    expect(banner).toContain('class="cookie-consent"')
    expect(read('layouts/default.vue')).toContain('<CookieConsent />')
  })

  it('el servidor no le pregunta a la cookie si renderiza el aviso', () => {
    // El borde guarda una sola copia del HTML por URL y se la da a todos: si el servidor mirara
    // `cu_consent`, la copia guardada sería la de quien la pidió primero (medido el 20/11/2026: un
    // pedido con la cookie dejó guardado el HTML SIN aviso y el siguiente visitante, sin cookie, lo
    // recibió). La regla vive en utils/consent.ts y sólo cambia después de montar.
    const banner = read('components/CookieConsent.vue')
    expect(banner).toMatch(/consentBannerRendered\(\{/)
    expect(banner).toMatch(/const settled = ref\(false\)/)
    expect(banner).toMatch(/onMounted\(\(\) => \{\s*settled\.value = true\s*\}\)/)
    // La visibilidad ya no se calcula directo de la cookie.
    expect(banner).not.toMatch(/visible = computed\(\(\) => !hasDecided\.value/)
  })

  it('el aviso de idioma no cambió: sigue client-only (v-if, fuera del HTML del servidor)', () => {
    const hint = read('components/LanguageHint.vue')
    expect(hint).toMatch(/<div v-if="show" class="lang-hint"/)
    expect(hint).not.toContain('v-show')
  })
})
