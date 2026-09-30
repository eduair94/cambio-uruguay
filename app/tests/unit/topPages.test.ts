import { describe, expect, it } from 'vitest'
import {
  channelChange,
  deviceLabel,
  familyHub,
  familyTopic,
  topicOf,
  weekShares,
} from '../../utils/topPages'

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

describe('familyTopic', () => {
  it('usa la navegación cuando el hub es una página', () => {
    expect(familyTopic('/historico/*', t)).toEqual({ label: 'historico', to: '/historico' })
  })

  it('los hubs sin página propia llevan su nombre y su destino a mano', () => {
    // /alquileres y /casa no tienen index: enlazarlos daría 404.
    expect(familyTopic('/alquileres/*', t)).toEqual({
      label: 'Fichas de alquiler',
      to: '/alquileres-uruguay',
    })
    expect(familyTopic('/casa/*', t)?.to).toBe('/casas-de-cambio')
  })

  it('un hub desconocido se nombra legible y sin enlace', () => {
    expect(familyTopic('/algo-nuevo/*', t)).toEqual({ label: 'Algo nuevo', to: null })
  })
})
