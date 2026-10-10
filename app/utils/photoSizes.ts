/**
 * The large version of a photo a portal also serves small, for where the photo is shown big: the
 * property grid (its lead photo is 2×2) and the full-screen viewer. Cards keep the small one.
 *
 * Casasweb serves each photo as `/fotos/<n>.jpg` (the original, ~1200 px on the long side) and as
 * `<n>u.jpg` and `<n>s.jpg` (345×258, its search card's and the one our rental adverts keep as
 * their cover). Measured on 2026-10-09: 20 KB against 290–420 KB, so the card stays small; next to
 * the gallery's full-size photos in the grid, the small cover was the one blurred photo.
 * Mercado Libre's cover (`…_2X_<id>-C.webp`) is already 800 px wide and is left alone.
 */
const CASASWEB_SMALL = /^(https:\/\/(?:www\.)?casasweb\.com\/fotos\/\d{1,12})[su](\.jpe?g)$/i

export function largePhotoUrl(url: string): string {
  const small = CASASWEB_SMALL.exec(url)
  return small ? `${small[1]}${small[2]}` : url
}
