/**
 * Images a portal serves in place of a photo that was never uploaded.
 *
 * Measured on 2026-10-09 over 96 photos of 8 Inmuebles El País adverts: every 338×253 image was the
 * SAME file (byte for byte) — the portal's "no photo" card — under a different URL each time, while
 * no real photo had that size (they are 1024×768, 1024×682, 576×768…). The URL says nothing, so the
 * only tell is the size once the image has loaded. A grid of five with two of these in it reads as
 * a broken page, so the carousel, the property grid and the viewer all drop what matches.
 */
const PLACEHOLDERS: ReadonlyArray<{ host: string; width: number; height: number }> = [
  { host: 'imagenes.gallito.com.uy', width: 338, height: 253 },
]

export function isPlaceholderPhoto(url: string, width: number, height: number): boolean {
  let host = ''
  try {
    host = new URL(url).hostname
  } catch {
    return false
  }
  return PLACEHOLDERS.some(
    placeholder =>
      placeholder.host === host && placeholder.width === width && placeholder.height === height
  )
}
