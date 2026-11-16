// Los mensajes de vue-i18n se pedían al origen en CADA carga. Medido el 16/11/2026:
// `/_i18n/<hash>/es/messages.json`, 127 KB, `cache-control: max-age=-1`, `cf-cache-status: DYNAMIC`,
// 57.000 pedidos por semana y 4,5 % abortados; cuando uno fallaba (522) el cliente hidrataba sin
// mensajes y el aviso de cookies decía CONSENT.REJECT. Y no se podía simplemente guardar esa URL:
// el hash del módulo es del archivo cargador, no del JSON, así que no cambia cuando cambia un texto.
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { I18N_MESSAGE_SOURCES, i18nMessagesVersion } from '../../i18n/messagesVersion'
import {
  I18N_MESSAGES_CACHE_CONTROL,
  anyMessagesLocale,
  currentMessagesPath,
  versionedMessagesLocale,
} from '../../utils/i18nMessagesCache'

const APP = join(__dirname, '..', '..')
const read = (path: string): string => readFileSync(join(APP, path), 'utf8')

function tree(files: Record<string, string>): string {
  const root = mkdtempSync(join(tmpdir(), 'cu-i18n-'))
  for (const [name, content] of Object.entries(files)) {
    mkdirSync(join(root, name, '..'), { recursive: true })
    writeFileSync(join(root, name), content)
  }
  return root
}

describe('la versión de los mensajes sale del CONTENIDO', () => {
  const base = {
    'locales/es.ts': 'loader',
    'locales/json/es.json': '{"a":"uno"}',
    'extra/fr.json': '{}',
  }

  it('es estable para el mismo árbol y no depende del orden en que se nombran las fuentes', () => {
    const a = i18nMessagesVersion(tree(base), ['locales', 'extra'])
    const b = i18nMessagesVersion(tree(base), ['extra', 'locales'])
    expect(a).toMatch(/^[0-9a-f]{12}$/)
    expect(b).toBe(a)
  })

  it('cambia cuando cambia un JSON que el cargador importa (lo que el hash del módulo no ve)', () => {
    const before = i18nMessagesVersion(tree(base), ['locales', 'extra'])
    const after = i18nMessagesVersion(tree({ ...base, 'locales/json/es.json': '{"a":"dos"}' }), [
      'locales',
      'extra',
    ])
    expect(after).not.toBe(before)
  })

  it('cambia cuando un texto se muda de archivo, aunque los bytes sumen lo mismo', () => {
    const moved = {
      'locales/es.ts': 'loader',
      'locales/json/pt.json': '{"a":"uno"}',
      'extra/fr.json': '{}',
    }
    expect(i18nMessagesVersion(tree(moved), ['locales', 'extra'])).not.toBe(
      i18nMessagesVersion(tree(base), ['locales', 'extra'])
    )
  })

  it('cubre los tres idiomas propios, los traducidos y la config', () => {
    expect([...I18N_MESSAGE_SOURCES].sort()).toEqual(['extra', 'i18n.config.ts', 'locales'])
    expect(i18nMessagesVersion(join(APP, 'i18n'), I18N_MESSAGE_SOURCES)).toMatch(/^[0-9a-f]{12}$/)
  })
})

describe('qué ruta se puede guardar un año', () => {
  it('la versionada: versión de 12 hex + hash del módulo + idioma', () => {
    expect(versionedMessagesLocale('/_i18n/0123456789ab/5a7fab61/es/messages.json')).toBe('es')
    expect(versionedMessagesLocale('/_i18n/0123456789ab/0/pt/messages.json?x=1')).toBe('pt')
    expect(versionedMessagesLocale(currentMessagesPath('0123456789ab', 'fr'))).toBe('fr')
  })

  it('NO la del módulo sin versión: si `serverRoutePrefix` deja de leerse, falla a "sin caché"', () => {
    expect(versionedMessagesLocale('/_i18n/5a7fab61/es/messages.json')).toBeNull()
    expect(versionedMessagesLocale('/_i18n/0123456789ab/es/messages.json')).toBeNull()
    expect(versionedMessagesLocale('/api/_i18n/0123456789ab/h/es/messages.json')).toBeNull()
    expect(versionedMessagesLocale('/_i18n/0123456789ab/h/es/other.json')).toBeNull()
  })

  it('inmutable y por un año, público para que también lo guarde el borde', () => {
    expect(I18N_MESSAGES_CACHE_CONTROL).toBe('public, max-age=31536000, immutable')
  })
})

describe('la red de una versión que ya no existe', () => {
  it('reconoce el idioma en cualquier forma de la ruta, vieja o nueva', () => {
    expect(anyMessagesLocale('/_i18n/5a7fab61/es/messages.json')).toBe('es')
    expect(anyMessagesLocale('/_i18n/aaaaaaaaaaaa/5a7fab61/en/messages.json?v=1')).toBe('en')
  })

  it('no inventa un idioma donde no hay ruta de mensajes', () => {
    expect(anyMessagesLocale('/_i18n/messages.json')).toBeNull()
    expect(anyMessagesLocale('/_i18n/es/messages.json')).toBeNull()
    expect(anyMessagesLocale('/_i18n/a/es/other.json')).toBeNull()
    expect(anyMessagesLocale('/otra/a/es/messages.json')).toBeNull()
  })
})

describe('el cableado', () => {
  it('nuxt.config pone la versión del contenido en la ruta del módulo y la pasa al servidor', () => {
    const config = read('nuxt.config.ts')
    expect(config).toContain(
      'const i18nMessagesVersionId = i18nMessagesVersion(I18N_DIR, I18N_MESSAGE_SOURCES)'
    )
    expect(config).toContain('serverRoutePrefix: `/_i18n/${i18nMessagesVersionId}`')
    expect(config).toContain('i18nMessagesVersion: i18nMessagesVersionId,')
  })

  it('la cabecera sólo va en un 200 o un 304 de la ruta versionada', () => {
    const plugin = read('server/plugins/i18n-messages-cache.ts')
    expect(plugin).toContain("hooks.hook('beforeResponse'")
    expect(plugin).toContain('if (!versionedMessagesLocale(event.path')
    expect(plugin).toContain('if (status !== 200 && status !== 304) return')
  })

  it('la red redirige a la versión vigente, no se guarda y no puede entrar en bucle', () => {
    const route = read('server/routes/_i18n/[...path].ts')
    expect(route).toContain("setResponseHeader(event, 'cache-control', 'no-store')")
    expect(route).toContain('alreadyCurrent')
    expect(route).toContain('sendRedirect(event, target, 302)')
  })

  it('la caché interna del módulo sigue apagada: prendida, 35 idiomas comparten cargador', () => {
    expect(read('nuxt.config.ts')).not.toMatch(/cacheLifetime\s*:/)
  })
})
