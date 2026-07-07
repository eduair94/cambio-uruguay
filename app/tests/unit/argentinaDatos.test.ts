import { describe, it, expect } from 'vitest'
import { parseArgentinaDatos } from '../../utils/drivers/argentinaDatos'

describe('parseArgentinaDatos', () => {
  it('maps fecha/venta into a sorted {date,value} series', () => {
    const rows = [
      { casa: 'blue', compra: 1180, venta: 1200, fecha: '2026-06-02' },
      { casa: 'blue', compra: 1170, venta: 1190, fecha: '2026-06-01' },
    ]
    expect(parseArgentinaDatos(rows)).toEqual([
      { date: '2026-06-01', value: 1190 },
      { date: '2026-06-02', value: 1200 },
    ])
  })
  it('can select compra and drops rows missing fecha or value', () => {
    const rows = [
      { compra: 1170, venta: 1190, fecha: '2026-06-01' },
      { compra: 1180, venta: 1200 },
      { venta: 1210, fecha: '2026-06-03' },
    ]
    expect(parseArgentinaDatos(rows, 'compra')).toEqual([{ date: '2026-06-01', value: 1170 }])
  })
  it('tolerates undefined', () => {
    expect(parseArgentinaDatos(undefined)).toEqual([])
  })
})
