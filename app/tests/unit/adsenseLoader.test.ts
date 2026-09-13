import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { adsenseLoaderScripts } from '../../composables/useAds'

// El loader de AdSense va DESPUÉS de hidratar, nunca en el HTML del servidor.
//
// Medido en producción el 2026-09-12 (/avanzado, /alquilar-en-uruguay): con el script en el <head>,
// Auto Ads corre antes de que Vue termine de hidratar y mete su `<div class="google-auto-placed">`
// como primer hijo de <main>, justo donde Vue espera el `div.container_custom` del layout. Mismo
// tag, así que Vue lo adopta sin tocarle la clase, vuelve a renderizar la página adentro y borra el
// contenedor real: la consola dice "Hydration completed but contains mismatches", AdSense tira
// `no_div` por el anuncio que acaba de perder, y todo lo que no trae su propio contenedor —"Seguí
// leyendo", el pedido del newsletter— queda pegado al borde de la pantalla.

const PUB = 'ca-pub-1'

describe('AdSense loader', () => {
  it('stays out of the server HTML and out of hydration', () => {
    expect(adsenseLoaderScripts(PUB, true, false)).toEqual([])
  })

  it('loads once hydrated, on the routes that allow ads', () => {
    expect(adsenseLoaderScripts(PUB, true, true)).toEqual([
      {
        src: `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${PUB}`,
        async: true,
        crossorigin: 'anonymous',
      },
    ])
  })

  it('keeps the route gate and the missing id as hard stops', () => {
    expect(adsenseLoaderScripts(PUB, false, true)).toEqual([])
    expect(adsenseLoaderScripts('', true, true)).toEqual([])
  })

  it('is what app.vue injects, behind a flag only onNuxtReady raises', () => {
    const source = readFileSync(resolve(__dirname, '../../app.vue'), 'utf8')
    expect(source).not.toContain('adsbygoogle.js')
    expect(source).toMatch(/const hydrated = ref\(false\)/)
    expect(source).toMatch(/onNuxtReady\(\(\) => \{\s*hydrated\.value = true\s*\}\)/)
    expect(source).toMatch(
      /adsenseLoaderScripts\(\s*adsensePubId,\s*scriptAllowed\.value,\s*hydrated\.value\s*\)/
    )
  })
})
