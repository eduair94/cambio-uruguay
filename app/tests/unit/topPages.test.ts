import { describe, expect, it } from 'vitest'
import { channelChange, deviceLabel, familyHub, topicOf, weekShares } from '../../utils/topPages'

// `t` de mentira: devuelve la clave, así el test no depende del catálogo de traducciones.
const t = (key: string) => key

describe('topicOf', () => {
  it('encuentra la entrada exacta de la navegación', () => {
    expect(topicOf('/', t)).toEqual({ label: 'inicio', section: 'search.section.market' })
    expect(topicOf('/historico', t)?.label).toBe('historico')
  })

  it('una hoja cae en su hub por el prefijo más largo', () => {
    expect(topicOf('/historico/brou/usd', t)).toEqual({
      label: 'historico',
      section: 'search.section.market',
    })
  })

  it('una ruta que no está en la navegación no tiene tema', () => {
    expect(topicOf('/no-existe-esta-ruta', t)).toBeNull()
  })
})

describe('familyHub', () => {
  it('saca el comodín de la familia', () => {
    expect(familyHub('/historico/*')).toBe('/historico')
    expect(familyHub('/alquileres-uruguay')).toBe('/alquileres-uruguay')
  })
})

describe('channelChange', () => {
  it('última semana contra la primera', () => {
    expect(channelChange([548, 641, 784, 896])).toBeCloseTo(896 / 548 - 1)
    expect(channelChange([42, 50, 101, 153])).toBeCloseTo(153 / 42 - 1)
  })

  it('sin primera semana no hay cambio que decir', () => {
    expect(channelChange([0, 0, 5, 9])).toBeNull()
    expect(channelChange([])).toBeNull()
  })
})

describe('weekShares', () => {
  it('porción de cada serie en una semana', () => {
    const series = [
      { label: 'mobile', weeks: [529, 800] },
      { label: 'desktop', weeks: [576, 580] },
      { label: 'tablet', weeks: [2, 6] },
    ]
    const last = weekShares(series, 1)
    expect(last.map(s => s.label)).toEqual(['mobile', 'desktop', 'tablet'])
    expect(last[0].share).toBeCloseTo(800 / 1386)
    expect(weekShares([], 0)).toEqual([])
  })
})

describe('deviceLabel', () => {
  it('traduce los dispositivos de GA4 y deja pasar lo desconocido', () => {
    expect(deviceLabel('mobile')).toBe('Celular')
    expect(deviceLabel('desktop')).toBe('Computadora')
    expect(deviceLabel('smart tv')).toBe('smart tv')
  })
})
