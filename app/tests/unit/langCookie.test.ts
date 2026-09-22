// Las cadenas de este test son las que manda el servidor de producción, copiadas de la respuesta
// real del 2026-09-03. El bug que arregla no se veía en ningún test: se veía en la cabecera
// `cf-cache-status` — BYPASS sin cookie, HIT con cookie, y diez veces de diferencia en el TTFB.
//
// La segunda tanda (2026-09-22) es el mismo bug en /en y /pt: `/en/guias` sin cookie respondía
// `Set-Cookie: lang=en`, y como el prefijo ya decide el idioma esa cookie tampoco dice nada.
import { describe, expect, it } from 'vitest'
import {
  isDefaultLangCookie,
  redundantLangLocale,
  withoutDefaultLangCookie,
} from '../../utils/langCookie'

const LANG_ES = 'lang=es; Path=/; Expires=Fri, 03 Sep 2027 04:48:23 GMT; SameSite=Lax'
const LANG_EN = 'lang=en; Path=/; Expires=Fri, 03 Sep 2027 04:48:23 GMT; SameSite=Lax'
const LANG_PT = 'lang=pt; Path=/; Expires=Fri, 03 Sep 2027 04:48:23 GMT; SameSite=Lax'
const SESSION = 'dc_state=abc123; Path=/; HttpOnly; SameSite=Lax'

describe('isDefaultLangCookie', () => {
  it('reconoce la cookie del idioma por defecto tal como la manda el servidor', () => {
    expect(isDefaultLangCookie(LANG_ES)).toBe(true)
  })

  it('no toca la de un idioma elegido: esa sí dice algo', () => {
    expect(isDefaultLangCookie(LANG_EN)).toBe(false)
  })

  it('no toca ninguna otra cookie', () => {
    expect(isDefaultLangCookie(SESSION)).toBe(false)
  })

  it('no se confunde con una cookie cuyo nombre termina en lang', () => {
    expect(isDefaultLangCookie('site_lang=es; Path=/')).toBe(false)
  })

  it('no se confunde con un valor que empieza igual', () => {
    expect(isDefaultLangCookie('lang=es-AR; Path=/')).toBe(false)
    expect(isDefaultLangCookie('lang=espanol; Path=/')).toBe(false)
  })
})

describe('redundantLangLocale', () => {
  it('en una ruta sin prefijo, la cookie redundante es la del idioma por defecto', () => {
    expect(redundantLangLocale('/')).toBe('es')
    expect(redundantLangLocale('/guias/x')).toBe('es')
    expect(redundantLangLocale('')).toBe('es')
  })

  it('en /en y /pt, la del prefijo: la ruta ya decidió el idioma', () => {
    expect(redundantLangLocale('/en')).toBe('en')
    expect(redundantLangLocale('/en/guias/x')).toBe('en')
    expect(redundantLangLocale('/pt')).toBe('pt')
    expect(redundantLangLocale('/pt/comparativas/dolar')).toBe('pt')
  })

  it('compara el segmento entero: /entrar y /english-uruguay no son inglés', () => {
    expect(redundantLangLocale('/entrar')).toBe('es')
    expect(redundantLangLocale('/english-uruguay')).toBe('es')
    expect(redundantLangLocale('/entrar/en')).toBe('es')
    expect(redundantLangLocale('/pta')).toBe('es')
  })

  it('tolera query string y barra final, como isBareRoute', () => {
    expect(redundantLangLocale('/en/')).toBe('en')
    expect(redundantLangLocale('/en?x=1')).toBe('en')
    expect(redundantLangLocale('/en/guias/x/?utm=1')).toBe('en')
    expect(redundantLangLocale('/guias/x?lang=en')).toBe('es')
  })

  it('no reconoce un idioma que el router no prefija', () => {
    expect(redundantLangLocale('/es/guias')).toBe('es')
    expect(redundantLangLocale('/fr/guias')).toBe('es')
  })
})

describe('withoutDefaultLangCookie', () => {
  it('saca sólo la del idioma por defecto', () => {
    expect(withoutDefaultLangCookie([LANG_ES, SESSION])).toEqual([SESSION])
  })

  it('deja pasar una respuesta que no la trae, sin copiarla', () => {
    const values = [SESSION, LANG_EN]
    expect(withoutDefaultLangCookie(values)).toBe(values)
  })

  it('puede vaciar la lista, que es el caso que hace cacheable la home', () => {
    expect(withoutDefaultLangCookie([LANG_ES])).toEqual([])
  })

  describe('con el idioma que la ruta ya decide', () => {
    it('saca lang=en en /en/..., que es el caso que hace cacheable /en/guias', () => {
      const locale = redundantLangLocale('/en/guias/x')
      expect(withoutDefaultLangCookie([LANG_EN], locale)).toEqual([])
      expect(withoutDefaultLangCookie([LANG_EN, SESSION], locale)).toEqual([SESSION])
    })

    it('saca lang=pt en /pt/...', () => {
      expect(withoutDefaultLangCookie([LANG_PT], redundantLangLocale('/pt'))).toEqual([])
    })

    it('NO saca lang=en en una ruta sin prefijo: ahí sí es una elección', () => {
      const values = [LANG_EN]
      expect(withoutDefaultLangCookie(values, redundantLangLocale('/'))).toBe(values)
      expect(withoutDefaultLangCookie(values, redundantLangLocale('/guias/x'))).toBe(values)
    })

    it('en /en/... deja pasar lang=es (no es la del prefijo) y no la reordena', () => {
      const values = [SESSION, LANG_ES]
      expect(withoutDefaultLangCookie(values, redundantLangLocale('/en/guias'))).toBe(values)
    })

    it('/entrar y /english-uruguay siguen sacando sólo lang=es', () => {
      for (const path of ['/entrar', '/english-uruguay']) {
        const locale = redundantLangLocale(path)
        expect(withoutDefaultLangCookie([LANG_ES, LANG_EN], locale), path).toEqual([LANG_EN])
      }
    })
  })
})
