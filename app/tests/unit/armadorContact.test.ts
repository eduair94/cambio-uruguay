import { describe, expect, it, vi } from 'vitest'
import { createArmadorContactService } from '../../server/utils/armadorContact'

const PLACE = 'ChIJ3_In-kSBn5URWefZSs8yexo'
const details = {
  status: 'OK',
  result: {
    name: 'Armado FAST',
    formatted_phone_number: '099 123 456',
    international_phone_number: '+598 99 123 456',
    website: 'https://armadofast.com/',
    url: 'https://maps.google.com/?cid=1',
  },
}

function service(
  fetcher = vi.fn(async () => details),
  allowed = async (id: string) => id === PLACE
) {
  return { fetcher, read: createArmadorContactService({ fetcher, allowed, now: () => 0 }).read }
}

describe('contacto de un armador de Google, en vivo', () => {
  it('devuelve teléfono, sitio y ficha, y pide sólo esos campos', async () => {
    const { fetcher, read } = service()
    const result = await read({ placeId: PLACE, ip: '1.1.1.1', gmapsBase: 'http://proxy:2221' })
    expect(result.status).toBe(200)
    expect(result.body).toMatchObject({
      ok: true,
      phone: '099 123 456',
      internationalPhone: '+598 99 123 456',
      website: 'https://armadofast.com/',
      mapsUrl: 'https://maps.google.com/?cid=1',
    })
    expect(fetcher).toHaveBeenCalledWith(
      'http://proxy:2221/placeDetails',
      expect.objectContaining({
        params: expect.objectContaining({
          place_id: PLACE,
          fields: 'name,formatted_phone_number,international_phone_number,website,url',
        }),
      })
    )
  })

  it('no consulta un place id que no está en el directorio', async () => {
    const { fetcher, read } = service()
    const result = await read({
      placeId: 'ChIJotroOtroOtroOtro',
      ip: '1.1.1.1',
      gmapsBase: 'http://proxy:2221',
    })
    expect(result.status).toBe(404)
    expect(fetcher).not.toHaveBeenCalled()
  })

  it('rechaza un id con forma inválida y responde sin configuración', async () => {
    const { read } = service()
    expect((await read({ placeId: '../x', ip: '1', gmapsBase: 'http://proxy' })).status).toBe(400)
    expect((await read({ placeId: PLACE, ip: '1', gmapsBase: '' })).status).toBe(503)
  })

  it('limita las consultas por IP', async () => {
    const { read } = service()
    const statuses: number[] = []
    for (let i = 0; i < 12; i++)
      statuses.push(
        (await read({ placeId: PLACE, ip: '2.2.2.2', gmapsBase: 'http://proxy' })).status
      )
    expect(statuses.filter(s => s === 200)).toHaveLength(10)
    expect(statuses.at(-1)).toBe(429)
  })

  it('un error de Google no inventa un teléfono', async () => {
    const { read } = service(vi.fn(async () => ({ status: 'REQUEST_DENIED' })))
    const result = await read({ placeId: PLACE, ip: '3.3.3.3', gmapsBase: 'http://proxy' })
    expect(result.status).toBe(502)
    expect(result.body).toMatchObject({ ok: false })
  })
})
