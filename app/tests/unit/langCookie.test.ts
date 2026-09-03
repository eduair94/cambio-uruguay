// Las cadenas de este test son las que manda el servidor de producción, copiadas de la respuesta
// real del 2026-09-03. El bug que arregla no se veía en ningún test: se veía en la cabecera
// `cf-cache-status` — BYPASS sin cookie, HIT con cookie, y diez veces de diferencia en el TTFB.
import { describe, expect, it } from 'vitest'
import { isDefaultLangCookie, withoutDefaultLangCookie } from '../../utils/langCookie'

const LANG_ES = 'lang=es; Path=/; Expires=Fri, 03 Sep 2027 04:48:23 GMT; SameSite=Lax'
const LANG_EN = 'lang=en; Path=/; Expires=Fri, 03 Sep 2027 04:48:23 GMT; SameSite=Lax'
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
})
