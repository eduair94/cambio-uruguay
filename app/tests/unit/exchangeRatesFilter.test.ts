// El filtro de monedas del composable compartido, y por qué está en la clave del caché.
//
// Medido el 2026-09-03 en /convertir/100000-pesos-argentinos-a-pesos-uruguayos: el bloque
// __NUXT_DATA__ pesa 41.029 b y la clave `tool-exchange-rates` sola son 95.364 b de JSON con las
// 196 filas de las dieciocho monedas. La página lee DOS números de UNA. Las 158 filas que no son
// ARS ocupan el 54 % del bloque, y la fila del oro viaja sin pintarse. Son 114 URLs con 130.784
// impresiones en 28 días, la familia de más impresiones después de la home.
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const APP = join(__dirname, '..', '..')
const composable = readFileSync(join(APP, 'composables', 'useExchangeRates.ts'), 'utf8')
const pagina = readFileSync(join(APP, 'pages', 'convertir', '[slug].vue'), 'utf8')

describe('useExchangeRates acepta un filtro de monedas', () => {
  it('el filtro entra en la clave del useAsyncData', () => {
    // Sin esto, dos consumidores con filtros distintos se pisan el caché y el segundo recibe las
    // filas del primero.
    expect(composable).toContain('tool-exchange-rates-${wanted.join')
    expect(composable).toContain("'tool-exchange-rates'")
  })

  it('el recorte va en transform, no en un computed', () => {
    // Lo que se serializa en __NUXT_DATA__ es lo que devuelve el transform: filtrar después no
    // ahorraría un solo byte, que es el defecto original.
    const at = composable.indexOf('transform:')
    expect(at).toBeGreaterThan(-1)
    expect(composable.slice(at, at + 200)).toContain('wanted.includes')
  })

  it('sin filtro se comporta igual que antes', () => {
    expect(composable).toMatch(/wanted\s*\?\s*rows\.filter[\s\S]{0,80}:\s*rows/)
  })

  it('normaliza y ordena para que dos llamadas equivalentes compartan clave', () => {
    expect(composable).toContain('new Set(')
    expect(composable).toContain('.sort()')
    expect(composable).toContain('.toUpperCase()')
  })
})

describe('/convertir pide sólo su moneda', () => {
  it('pasa el par de la conversión', () => {
    expect(pagina).toContain('useExchangeRates([foreign.value as CurrencyCode])')
  })
})
