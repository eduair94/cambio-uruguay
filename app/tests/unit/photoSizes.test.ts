import { describe, expect, it } from 'vitest'
import {
  SHARE_PHOTO_MARGIN_DAYS,
  cardPhotoUrl,
  carouselSrcWindow,
  gridPhotoSizes,
  gridPhotoUrl,
  largePhotoUrl,
  leadPhotoSources,
  photoSignatureExpiry,
  photoUrlExpired,
  pickSharePhoto,
  sharePhotoUrl,
} from '../../utils/photoSizes'

// Photo URLs as the rental API returns them (2026-11-08).
const INFOCASAS_CDN1 = 'https://cdn1.infocasas.com.uy/repo/img/13651_UY.42.4.188.172.V1_133.jpg'
const INFOCASAS_CDN2 =
  'https://cdn2.infocasas.com.uy/repo/img/6ae8ba1a02e17_infocdn__6435-30337jpg.jpg'
const ML_COVER = 'https://http2.mlstatic.com/D_NQ_NP_2X_893935-MLU121040513313_112026-C.webp'
const ML_GALLERY = 'https://http2.mlstatic.com/D_NQ_NP_605210-MLU118279795314_102026-F.webp'
const TIKTOK =
  'https://p16-common-sign.tiktokcdn.com/tos-alisg-i-photomode-sg/f3fb90ed044d408f96718691ceda898c~tplv-photomode-image.jpeg?dr=14555&x-expires=1793419200&x-signature=N6%2FBsalw8UjhySDHcL3EONcKA00%3D&t=4d5b0474'
const TIKTOK_US =
  'https://p19-common-sign.tiktokcdn-us.com/tos-useast5-i/abc~tplv.jpeg?x-expires=1794024000&x-signature=x'
const FBCDN =
  'https://scontent-yyz1-1.xx.fbcdn.net/v/t39.30808-6/500738122_n.jpg?stp=c0.214.553.553a_dst-jpg_tt6&ctp=s261x260&_nc_cat=107&oh=00_AQQ2tAZ0g&oe=6AF5B93B'
const INSTAGRAM =
  'https://scontent-yyz1-1.cdninstagram.com/v/t51.82787-15/837396363_n.jpg?stp=dst-jpg_e15_tt6&_nc_cat=101&oe=6A0F1C2B'
const BUSCANDOCASA = 'https://www.buscandocasa.com/fotostemp/0F8APAT0212216_20260925111845_99.jpg'
const CASASWEB_SMALL = 'https://casasweb.com/fotos/3246768s.jpg'
const CASASWEB_ORIGINAL = 'https://casasweb.com/fotos/2212445.jpg'
const UNKNOWN = [
  'https://imagenes.gallito.com.uy/rinmu/sinblanco/0f535dae95204.jpg',
  'https://inforealstate-files.s3.us-east-1.amazonaws.com/photos/abc.jpeg',
  'https://static.tokkobroker.com/pictures/7761606_881.jpg',
  'https://example.com/photo.webp',
]

const ON_2026_11_08 = Date.UTC(2026, 10, 8, 12)

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

describe('sharePhotoUrl: the file a link preview gets', () => {
  it("sends InfoCasas' 1200x630 file from cdn2, whichever cdn the upload is on", () => {
    expect(sharePhotoUrl(INFOCASAS_CDN1)).toBe(
      'https://cdn2.infocasas.com.uy/repo/img/th.outside1200x630.13651_UY.42.4.188.172.V1_133.jpg'
    )
    expect(sharePhotoUrl(INFOCASAS_CDN2)).toBe(
      'https://cdn2.infocasas.com.uy/repo/img/th.outside1200x630.6ae8ba1a02e17_infocdn__6435-30337jpg.jpg'
    )
  })

  it("sends Mercado Libre's JPEG of the same variant", () => {
    expect(sharePhotoUrl(ML_COVER)).toBe(
      'https://http2.mlstatic.com/D_NQ_NP_2X_893935-MLU121040513313_112026-C.jpg'
    )
    expect(sharePhotoUrl(ML_GALLERY)).toBe(
      'https://http2.mlstatic.com/D_NQ_NP_605210-MLU118279795314_102026-F.jpg'
    )
  })

  it('refuses signed social photos and the 320-px Casasweb ones', () => {
    for (const url of [TIKTOK, TIKTOK_US, FBCDN, INSTAGRAM, BUSCANDOCASA]) {
      expect(sharePhotoUrl(url), url).toBeNull()
    }
  })

  it("gives a Casasweb card photo's original, which clears the 600×315 minimum", () => {
    expect(sharePhotoUrl(CASASWEB_SMALL)).toBe('https://casasweb.com/fotos/3246768.jpg')
    expect(sharePhotoUrl(CASASWEB_ORIGINAL)).toBe(CASASWEB_ORIGINAL)
  })
})

describe('card and grid files', () => {
  it('shrinks the Mercado Libre gallery photo (-F, 1200 px) to -O (500 px), never the 2X cover', () => {
    const small = 'https://http2.mlstatic.com/D_NQ_NP_605210-MLU118279795314_102026-O.webp'
    expect(cardPhotoUrl(ML_GALLERY)).toBe(small)
    expect(gridPhotoUrl(ML_GALLERY)).toBe(small)
    // The 2X cover is 800 px and ITS -O is 1000 px: it stays.
    expect(cardPhotoUrl(ML_COVER)).toBe(ML_COVER)
    expect(gridPhotoUrl(ML_COVER)).toBe(ML_COVER)
  })

  it("uses InfoCasas' own thumbnails: 800x600 for cards, 360x240 for grid tiles", () => {
    expect(cardPhotoUrl(INFOCASAS_CDN1)).toBe(
      'https://cdn2.infocasas.com.uy/repo/img/th.outside800x600.13651_UY.42.4.188.172.V1_133.jpg'
    )
    expect(gridPhotoUrl(INFOCASAS_CDN1)).toBe(
      'https://cdn2.infocasas.com.uy/repo/img/th.outside360x240.13651_UY.42.4.188.172.V1_133.jpg'
    )
    // A thumbnail URL is re-sized, not nested.
    expect(gridPhotoUrl(cardPhotoUrl(INFOCASAS_CDN2))).toBe(gridPhotoUrl(INFOCASAS_CDN2))
  })

  it('keeps Casasweb on its small file in cards and tiles', () => {
    expect(cardPhotoUrl(CASASWEB_ORIGINAL)).toBe('https://casasweb.com/fotos/2212445s.jpg')
    expect(gridPhotoUrl(CASASWEB_ORIGINAL)).toBe('https://casasweb.com/fotos/2212445s.jpg')
    expect(cardPhotoUrl(CASASWEB_SMALL)).toBe(CASASWEB_SMALL)
  })

  it("gives the grid's lead a srcset where the portal has two sizes", () => {
    expect(leadPhotoSources(ML_GALLERY)).toEqual({
      src: ML_GALLERY,
      srcset: `${cardPhotoUrl(ML_GALLERY)} 500w, ${ML_GALLERY} 1200w`,
    })
    expect(leadPhotoSources(INFOCASAS_CDN1)).toEqual({
      src: 'https://cdn2.infocasas.com.uy/repo/img/th.outside800x600.13651_UY.42.4.188.172.V1_133.jpg',
      srcset:
        'https://cdn2.infocasas.com.uy/repo/img/th.outside800x600.13651_UY.42.4.188.172.V1_133.jpg 800w, https://cdn2.infocasas.com.uy/repo/img/th.outside1200x630.13651_UY.42.4.188.172.V1_133.jpg 1200w',
    })
    for (const url of [ML_COVER, CASASWEB_ORIGINAL, ...UNKNOWN]) {
      expect(leadPhotoSources(url)).toEqual({ src: url })
    }
  })

  it('sizes a big grid photo by the width it is drawn at, per composition and place', () => {
    // Five or more (and two): the lead is 2×2 of a four-column grid, ~441 px on a desktop.
    expect(gridPhotoSizes(5)).toBe('(max-width: 599px) 100vw, (max-width: 959px) 56vw, 440px')
    expect(gridPhotoSizes(2)).toBe(gridPhotoSizes(5))
    // One or four: the gallery's whole width. Three: two thirds of it.
    expect(gridPhotoSizes(1)).toBe('(max-width: 959px) 100vw, 790px')
    expect(gridPhotoSizes(4)).toBe(gridPhotoSizes(1))
    expect(gridPhotoSizes(3)).toBe('(max-width: 599px) 100vw, (max-width: 959px) 75vw, 590px')
    // Not the lead: the twin of two, a third of the gallery with three or four.
    expect(gridPhotoSizes(2, 1)).toBe('(max-width: 959px) 56vw, 440px')
    expect(gridPhotoSizes(3, 2)).toBe('(max-width: 599px) 56vw, (max-width: 959px) 38vw, 290px')
    expect(gridPhotoSizes(4, 1)).toBe(gridPhotoSizes(3, 1))
  })
})

describe('every variant function', () => {
  const all = [
    INFOCASAS_CDN1,
    INFOCASAS_CDN2,
    ML_COVER,
    ML_GALLERY,
    TIKTOK,
    FBCDN,
    INSTAGRAM,
    BUSCANDOCASA,
    CASASWEB_SMALL,
    CASASWEB_ORIGINAL,
    ...UNKNOWN,
  ]

  it('is idempotent', () => {
    for (const url of all) {
      for (const variant of [cardPhotoUrl, gridPhotoUrl, largePhotoUrl]) {
        expect(variant(variant(url)), `${variant.name} ${url}`).toBe(variant(url))
      }
      const shared = sharePhotoUrl(url)
      if (shared) expect(sharePhotoUrl(shared), url).toBe(shared)
    }
  })

  it('lets photos from hosts it does not know pass through untouched', () => {
    for (const url of UNKNOWN) {
      expect(cardPhotoUrl(url)).toBe(url)
      expect(gridPhotoUrl(url)).toBe(url)
      expect(sharePhotoUrl(url)).toBe(url)
      expect(photoUrlExpired(url, ON_2026_11_08)).toBe(false)
    }
  })
})

describe('signed photo URLs', () => {
  it("reads TikTok's x-expires (seconds): 1793419200 ran out on 2026-10-31", () => {
    expect(photoSignatureExpiry(TIKTOK)).toBe(Date.UTC(2026, 9, 31, 4))
    expect(photoUrlExpired(TIKTOK, ON_2026_11_08)).toBe(true)
    expect(photoUrlExpired(TIKTOK, Date.UTC(2026, 9, 30))).toBe(false)
  })

  it("reads Facebook's hexadecimal oe: 6AF5B93B is 2026-11-12 13:03:55 UTC", () => {
    expect(photoSignatureExpiry(FBCDN)).toBe(Date.UTC(2026, 10, 12, 13, 3, 55))
    expect(photoUrlExpired(FBCDN, ON_2026_11_08)).toBe(false)
    // Two days of margin: on the 11th it no longer lasts long enough for a share.
    expect(photoUrlExpired(FBCDN, Date.UTC(2026, 10, 11), SHARE_PHOTO_MARGIN_DAYS)).toBe(true)
    expect(photoUrlExpired(FBCDN, Date.UTC(2026, 10, 11))).toBe(false)
  })

  it('treats a URL without a signature as never expiring', () => {
    expect(photoSignatureExpiry(INFOCASAS_CDN1)).toBeNull()
    expect(photoUrlExpired(ML_COVER, Number.MAX_SAFE_INTEGER, 30)).toBe(false)
    // Malformed values are not a signature.
    expect(photoSignatureExpiry('https://example.com/a.jpg?oe=xyz&x-expires=12')).toBeNull()
  })
})

describe('pickSharePhoto', () => {
  it('takes the first photo a preview can show, with its number in the gallery', () => {
    expect(
      pickSharePhoto([{ url: FBCDN }, { url: TIKTOK }, { url: ML_COVER }], ON_2026_11_08)
    ).toEqual({ url: sharePhotoUrl(ML_COVER), index: 2 })
    expect(pickSharePhoto([{ url: INFOCASAS_CDN1 }, { url: ML_COVER }], ON_2026_11_08)).toEqual({
      url: sharePhotoUrl(INFOCASAS_CDN1),
      index: 0,
    })
  })

  it('returns nothing when no photo qualifies, so the generated card stays', () => {
    expect(
      pickSharePhoto([{ url: FBCDN }, { url: INSTAGRAM }, { url: BUSCANDOCASA }], ON_2026_11_08)
    ).toBeUndefined()
    expect(pickSharePhoto([], ON_2026_11_08)).toBeUndefined()
  })

  it('skips a photo of any host whose signature ends inside the margin', () => {
    const signed = `https://example.com/cover.jpg?x-expires=${Date.UTC(2026, 10, 9) / 1000}`
    expect(pickSharePhoto([{ url: signed }, { url: ML_COVER }], ON_2026_11_08)?.index).toBe(1)
    expect(pickSharePhoto([{ url: signed }], ON_2026_11_08, 0)?.index).toBe(0)
  })
})

describe('carouselSrcWindow', () => {
  it('loads the first slide and the next one on arrival', () => {
    expect(carouselSrcWindow(0, 8)).toEqual({ start: 0, end: 1 })
  })

  it('loads a middle slide with both neighbours', () => {
    expect(carouselSrcWindow(3, 8)).toEqual({ start: 2, end: 4 })
  })

  it('stops at the last slide', () => {
    expect(carouselSrcWindow(7, 8)).toEqual({ start: 6, end: 7 })
  })

  it('handles one photo, none, and an index out of range', () => {
    expect(carouselSrcWindow(0, 1)).toEqual({ start: 0, end: 0 })
    expect(carouselSrcWindow(0, 0)).toEqual({ start: 0, end: -1 })
    expect(carouselSrcWindow(12, 3)).toEqual({ start: 1, end: 2 })
    expect(carouselSrcWindow(-4, 3)).toEqual({ start: 0, end: 1 })
  })
})
