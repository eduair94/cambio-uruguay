/**
 * Which file of a portal photo to ask for, by where it is shown. The portals serve every photo in
 * several sizes; we only ever get the URL of one of them, and showing the big one in a small slot
 * cost a phone 7.8–12.5 MB of images per page of 24 search results (measured on 2026-11-08).
 *
 * Every variant below was fetched live (browser user agent, 2026-11-08) and none is a documented
 * contract, so whoever shows a variant falls back to the original if it fails. Sizes are picked by
 * the height the photo is drawn at, not by the width of its slot: the card's slot is portrait
 * (99×168 on a phone, `object-fit: cover`), so a 3:2 photo is drawn 168 px tall and ~252 wide.
 *
 *  - Mercado Libre `D_NQ_NP_<id>-F` is the gallery photo at up to 1200 px on its long side (11–188
 *    KB in WebP); `-O` is the same photo at 500 px (6–42 KB). 24 of 24 answered both. The cover
 *    `D_NQ_NP_2X_<id>-C` is already 800 px (20–63 KB) and its `-O` is BIGGER (1000 px), so the 2X
 *    files are never shrunk.
 *  - InfoCasas `cdn1|cdn2/repo/img/<file>` is the upload, 720–2048 px and up to 710 KB. Its own
 *    CDN serves `cdn2/repo/img/th.outside<W>x<H>.<file>`, made on the first request and cached a
 *    year: the photo scaled to cover W×H, never enlarged. 21 of 21 uploads (both CDNs, every file
 *    name shape) answered 200 image/jpeg for every variant: 360x240 gave 400×300 (7–32 KB), 800x600
 *    gave 800×600 (22–147 KB), 1200x630 gave 1200×900 (35–228 KB).
 *    The adverts first seen from 2026-11-07 on bring a second shape, `cdn1/web/<id>_infocdn.jpg`
 *    (up to 1600 px and 513 KB; 162 of the 947 InfoCasas photos of the 864 newest adverts on
 *    2026-11-08), whose thumbnails sit in the same folder, `cdn2/web/th.outside<W>x<H>.<file>`: 16
 *    of 16 answered every variant (360x240 10–64 KB, 800x600 39–217 KB, 1200x630 57–268 KB). The
 *    same file asked under `/repo/img/` is a 403, so each photo keeps its folder.
 *  - Casasweb serves each photo as `/fotos/<n>.jpg` (the original, 1024×768, 83–240 KB) and as
 *    `<n>u.jpg` / `<n>s.jpg` (345×230, 17–36 KB): its search card's, and the one our rental adverts
 *    keep as their cover. Next to the gallery's full-size photos in the grid, the small cover was
 *    the one blurred photo, so the grid's lead and the viewer use the original.
 */

const CASASWEB_SMALL = /^(https:\/\/(?:www\.)?casasweb\.com\/fotos\/\d{1,12})[su](\.jpe?g)$/i
const CASASWEB_ORIGINAL = /^(https:\/\/(?:www\.)?casasweb\.com\/fotos\/\d{1,12})(\.jpe?g)$/i
const INFOCASAS =
  /^https:\/\/cdn[12]\.infocasas\.com\.uy\/(repo\/img|web)\/(?:th\.[a-z]+\d+x\d+\.)?([^/?#]+)$/
const MERCADOLIBRE_WEBP = /^(https:\/\/http2\.mlstatic\.com\/D_[^/?#]+-[A-Z])\.webp$/
const MERCADOLIBRE_GALLERY =
  /^(https:\/\/http2\.mlstatic\.com\/D_NQ_NP_)(?!2X_)([^/?#]+)-F\.(webp|jpg)$/

type InfoCasasSize = 'outside360x240' | 'outside800x600' | 'outside1200x630'

function infoCasas(url: string, size: InfoCasasSize): string | null {
  const match = INFOCASAS.exec(url)
  return match ? `https://cdn2.infocasas.com.uy/${match[1]}/th.${size}.${match[2]}` : null
}

function mercadoLibreSmall(url: string): string | null {
  const match = MERCADOLIBRE_GALLERY.exec(url)
  return match ? `${match[1]}${match[2]}-O.${match[3]}` : null
}

function casaswebSmall(url: string): string | null {
  const match = CASASWEB_ORIGINAL.exec(url)
  return match ? `${match[1]}s${match[2]}` : null
}

/**
 * The large version of a photo a portal also serves small, for where the photo is shown big: the
 * full-screen viewer and the property grid's lead (2×2).
 */
export function largePhotoUrl(url: string): string {
  const small = CASASWEB_SMALL.exec(url)
  return small ? `${small[1]}${small[2]}` : url
}

/** A search-result card or the map panel: drawn ~168 px tall on a phone, 210 px on a desktop. */
export function cardPhotoUrl(url: string): string {
  return mercadoLibreSmall(url) ?? infoCasas(url, 'outside800x600') ?? casaswebSmall(url) ?? url
}

/** A thumbnail of the property grid's mosaic: 4:3, ~176×132 on a phone, ~190×143 on a desktop. */
export function gridPhotoUrl(url: string): string {
  return mercadoLibreSmall(url) ?? infoCasas(url, 'outside360x240') ?? casaswebSmall(url) ?? url
}

/**
 * A big photo of the property grid (the lead, and every photo of a grid of two to four) as a
 * `srcset` the browser picks from with `gridPhotoSizes`: on a desktop at 1× the 800-px file is
 * enough, a phone at 2× takes the larger one. Photos with no second size keep their one URL.
 */
export function leadPhotoSources(url: string): { src: string; srcset?: string } {
  const small = mercadoLibreSmall(url)
  if (small) return { src: url, srcset: `${small} 500w, ${url} 1200w` }
  const medium = infoCasas(url, 'outside800x600')
  if (medium) {
    return { src: medium, srcset: `${medium} 800w, ${infoCasas(url, 'outside1200x630')} 1200w` }
  }
  return { src: url }
}

/**
 * `sizes` for a photo of the property grid (components/property/PhotoGrid.vue): the width a 3:2
 * photo is drawn at to COVER its box, which is the box's height × 1.5 when the box is narrower than
 * 3:2. The gallery column is ~790 px on a desktop, the screen minus its margins on a phone.
 *
 *  - Five photos or more, and two: the lead is 2×2 tiles of a four-column grid (~390×294 on a
 *    desktop, drawn 441 px wide); on a phone it spans the screen at 4:3.
 *  - One or four: the lead is the gallery's full width. Three: two thirds of it.
 *  - The other photo of two is the lead's twin; the others of three or four are a third of the
 *    gallery (~257×193, drawn 290 wide). On a phone every non-lead photo is half the screen.
 */
export function gridPhotoSizes(layout: number, position = 0): string {
  if (position > 0) {
    return layout === 2
      ? '(max-width: 959px) 56vw, 440px'
      : '(max-width: 599px) 56vw, (max-width: 959px) 38vw, 290px'
  }
  if (layout === 1 || layout === 4) return '(max-width: 959px) 100vw, 790px'
  if (layout === 3) return '(max-width: 599px) 100vw, (max-width: 959px) 75vw, 590px'
  return '(max-width: 599px) 100vw, (max-width: 959px) 56vw, 440px'
}

const DAY_MS = 86_400_000
const X_EXPIRES = /[?&]x-expires=(\d{9,11})(?=&|#|$)/
const OE = /[?&]oe=([0-9a-f]{8})(?=&|#|$)/i

/**
 * When a signed photo URL stops working, in ms since the epoch, or null when it carries no
 * signature. TikTok signs with `x-expires` (seconds); Facebook and Instagram with `oe` (seconds, in
 * hexadecimal). Past that instant the CDN answers 403: on 2026-11-08, 18 of the 21 signed first
 * photos of the rental sitemap had expired and still sat in the gallery, the sitemap and og:image.
 */
export function photoSignatureExpiry(url: string): number | null {
  const expires = X_EXPIRES.exec(url)?.[1]
  const oe = OE.exec(url)?.[1]
  const seconds = [
    expires === undefined ? null : Number.parseInt(expires, 10),
    oe === undefined ? null : Number.parseInt(oe, 16),
  ].filter((value): value is number => value !== null && Number.isFinite(value))
  return seconds.length ? Math.min(...seconds) * 1000 : null
}

/** True when the photo's signature expires before `now` plus `marginDays`. Unsigned URLs never do. */
export function photoUrlExpired(url: string, now: number, marginDays = 0): boolean {
  const expiry = photoSignatureExpiry(url)
  return expiry !== null && expiry - marginDays * DAY_MS <= now
}

const NO_SHARE_HOST = /(?:^|\.)(?:fbcdn\.net|cdninstagram\.com|tiktokcdn(?:-[a-z]+)?\.com)$/i

/**
 * The file a link preview (og:image) can use, or null when none of this photo's files can be one.
 *
 *  - Facebook, Instagram and TikTok photos are signed for days, and fbcdn's robots.txt disallows
 *    Twitterbot: a share outlives the URL.
 *  - Casasweb's `buscandocasa.com/fotostemp` photos are 320 px wide, under the 600×315 Facebook
 *    asks for a large preview.
 *  - InfoCasas uploads reach 710 KB, over the 600 KB WhatsApp documents: its 1200x630 file.
 *  - Mercado Libre serves the same file as JPEG at `.jpg`, which every preview client reads.
 *  - A Casasweb small photo is swapped for its original, which clears the size minimum.
 */
export function sharePhotoUrl(url: string): string | null {
  const host = /^https?:\/\/([^/?#:]+)/i.exec(url)?.[1]?.toLowerCase()
  if (!host || NO_SHARE_HOST.test(host)) return null
  if (/^(?:www\.)?buscandocasa\.com$/.test(host) && /^https?:\/\/[^/]+\/fotostemp\//i.test(url))
    return null
  const infocasas = infoCasas(url, 'outside1200x630')
  if (infocasas) return infocasas
  const webp = MERCADOLIBRE_WEBP.exec(url)
  if (webp) return `${webp[1]}.jpg`
  return largePhotoUrl(url)
}

/** Days a shared preview should keep working after the page is rendered. */
export const SHARE_PHOTO_MARGIN_DAYS = 2

/**
 * The photo a shared link previews: the first one with a usable file whose signature, if any,
 * outlives `marginDays`. Undefined when none qualifies, so the page keeps its generated card.
 */
export function pickSharePhoto(
  photos: readonly { url: string }[],
  now: number,
  marginDays = SHARE_PHOTO_MARGIN_DAYS
): { url: string; index: number } | undefined {
  for (const [index, photo] of photos.entries()) {
    if (photoUrlExpired(photo.url, now, marginDays)) continue
    const url = sharePhotoUrl(photo.url)
    if (url) return { url, index }
  }
  return undefined
}

/**
 * The slides of a carousel that get a real `src` while slide `index` is shown: it and its two
 * neighbours, so a swipe finds the next photo already there. The others stay empty and keep their
 * number. Chrome loads `loading="lazy"` images of a horizontal strip that sits in the viewport,
 * so without this every card downloaded its eight photos to show one. Inclusive; empty for 0.
 */
export function carouselSrcWindow(index: number, count: number): { start: number; end: number } {
  if (count <= 0) return { start: 0, end: -1 }
  const current = Math.min(Math.max(Math.trunc(index) || 0, 0), count - 1)
  return { start: Math.max(0, current - 1), end: Math.min(count - 1, current + 1) }
}
