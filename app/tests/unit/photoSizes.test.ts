import { describe, expect, it } from 'vitest'
import { largePhotoUrl } from '../../utils/photoSizes'

describe('largePhotoUrl', () => {
  it("swaps Casasweb's small card photo for its original", () => {
    expect(largePhotoUrl('https://casasweb.com/fotos/3246768s.jpg')).toBe(
      'https://casasweb.com/fotos/3246768.jpg'
    )
    expect(largePhotoUrl('https://www.casasweb.com/fotos/3246768u.jpeg')).toBe(
      'https://www.casasweb.com/fotos/3246768.jpeg'
    )
  })

  it('leaves every other photo as it is', () => {
    for (const url of [
      'https://casasweb.com/fotos/3246768.jpg',
      'https://casasweb.com/fotos/otra/3246768s.jpg',
      'http://casasweb.com/fotos/3246768s.jpg',
      'https://casasweb.com.evil.test/fotos/3246768s.jpg',
      'https://http2.mlstatic.com/D_NQ_NP_2X_783373-MLU119051193773_102026-C.webp',
      'https://imagenes.gallito.com.uy/rinmu/sinblanco/0f535dae95204.jpg',
      'https://static.tokkobroker.com/pictures/7761606_881.jpg',
    ]) {
      expect(largePhotoUrl(url)).toBe(url)
    }
  })
})
