import { describe, it, expect } from 'vitest'
import { parseBcuCsv } from '../../server/utils/cashPoints'

const HEADER = 'Codigo;Tipo;CodigoPunto;Nombre;Ubicacion - Latitud;Ubicacion - Longitud;Direccion;Barrio;Depto;Pais;Telefonos;Horario;Servicios;RUT;Ref'
const rp = [
  HEADER,
  '6500;PTO;1;CAMBIO MATRIZ PLAZA MATRIZ;-34.907198;-56.203703;Sarandi 556 esq. Ituzaingo;CIUDAD VIEJA - MONTEVIDEO;MO;UY;29150800;Lunes a Viernes 09:00 a 18:00;25 - 30;214549310013;',
  '6500;PTO;2;SUC SIN COORD;;;Calle Falsa 123;X;MO;UY;;;;;', // no coords -> skipped
  '6500;PTO;3;FUERA DE UY;10.0;20.0;Otro pais;Y;XX;UY;;;;;',  // outside UY bbox -> skipped
].join('\n')

describe('parseBcuCsv', () => {
  it('parses valid rows and tags the network', () => {
    const out = parseBcuCsv(rp, 'redpagos')
    expect(out).toHaveLength(1)
    expect(out[0]).toMatchObject({
      network: 'redpagos', id: 'redpagos-1', name: 'CAMBIO MATRIZ PLAZA MATRIZ',
      address: 'Sarandi 556 esq. Ituzaingo', locality: 'CIUDAD VIEJA - MONTEVIDEO', dept: 'MO',
      phone: '29150800',
    })
    expect(out[0].lat).toBeCloseTo(-34.907198)
    expect(out[0].lng).toBeCloseTo(-56.203703)
  })

  it('skips rows with missing/zero coords and rows outside the Uruguay bbox', () => {
    expect(parseBcuCsv(rp, 'redpagos').map(p => p.id)).toEqual(['redpagos-1'])
  })

  it('tolerates comma-decimal coordinates', () => {
    const csv = HEADER + '\n6509;PTO;434;Agencia 01/01;-34,8484573;-56,1698608;Avda San Martin 4250;Cerrito;MO;UY;22166045;L-V;;;'
    const out = parseBcuCsv(csv, 'abitab')
    expect(out).toHaveLength(1)
    expect(out[0].lat).toBeCloseTo(-34.8484573)
    expect(out[0].network).toBe('abitab')
  })

  it('returns empty for header-only or blank input', () => {
    expect(parseBcuCsv(HEADER, 'abitab')).toEqual([])
    expect(parseBcuCsv('', 'abitab')).toEqual([])
  })
})
