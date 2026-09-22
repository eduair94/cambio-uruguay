// Contrato de la cabecera de /sucursales/<casa>/<departamento>, sobre el fuente,
// igual que deptCanonical.test.ts y por la misma razón: lo que hay que garantizar
// es lo que la plantilla DECLARA, no reproducir un render con Vuetify.
//
// Medido en producción el 2026-09-22 sobre /en/sucursales/brou/montevideo:
//   * <h1> «Branches - BROU» en todos los departamentos (en castellano
//     «Sucursales - BROU»), sin el lugar ni la palabra «horarios» del título;
//   * descripción «BROU hoy: dólar $39,35 compra / $40,75 venta. BROU has 26
//     branches…» — castellano delante del inglés, y Google servía la URL /en
//     para consultas en castellano;
//   * canónica hacia /sucursales/brou/montevideo (la versión en español), que
//     contradice el hreflang que el layout emite para /en;
//   * «26 sucursales encontradas» sin decir de dónde sale la cifra.
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const src = readFileSync(
  join(__dirname, '..', '..', 'pages', 'sucursales', '[origin]', '[[location]].vue'),
  'utf8'
)
const template = src.slice(0, src.indexOf('<script'))
const script = src.slice(src.indexOf('<script'))

describe('el encabezado de nivel 1 de /sucursales/<casa>/<departamento>', () => {
  it('dice «<Casa> en <Departamento>: sucursales y horarios» a través de una clave', () => {
    const h1 = template.slice(template.indexOf('<h1'), template.indexOf('</h1>'))
    expect(h1).toContain(
      "$t('sucursalesHeading', { origin: exchangeHouseName, location: locationLabel })"
    )
    expect(h1).toContain("$t('sucursalesHeadingAll', { origin: exchangeHouseName })")
    // El literal anterior (menú + guion + casa) ya no existe.
    expect(h1).not.toContain("$t('sucursalesMenu') - ")
  })

  it('sigue siendo el único h1 de la plantilla', () => {
    expect(template.match(/<h1[\s>]/g)).toHaveLength(1)
  })
})

describe('la cifra de sucursales nombra su fuente', () => {
  it('usa el conteo del padrón (/api/branches), el mismo del título, y no el largo de la tabla', () => {
    expect(template).toContain("$t('sucursalesCountSource', { count: branchCount })")
    expect(template).not.toContain(
      "{{ branchesData?.length || 0 }} {{ $t('sucursalesEncontradas') }}"
    )
  })

  it('enlaza la ficha de la institución en el BCU cuando el directorio la trae', () => {
    expect(template).toContain(':href="bcuRegistryUrl"')
    expect(template).toContain("$t('sucursalesBcuLink')")
    expect(script).toContain('directory.value?.casas?.[origin]?.bcu')
  })
})

describe('la descripción y la canónica respetan el idioma de la página', () => {
  it('la primera frase sale de una clave y la cifra se formatea en el locale del lector', () => {
    expect(script).toContain(
      "t('seo.sucursalesLead', { origin: name, buy: money(usd.buy), sell: money(usd.sell) })"
    )
    expect(script).toContain('value.toLocaleString(dateLocale(locale.value)')
    // El literal que salía en /en ya no está en el CÓDIGO (el comentario que lo
    // documenta sí lo cita, así que se busca la forma de plantilla, no la frase).
    expect(script).not.toContain('${name} hoy: dólar $${money(')
  })

  it('cada idioma es canónico de sí mismo: la canónica pasa por localePath', () => {
    const at = script.indexOf("rel: 'canonical'")
    expect(at).toBeGreaterThan(0)
    expect(script.slice(at, at + 400)).toContain('`https://cambio-uruguay.com${localePath(path)}`')
  })
})
