// Cuándo "Antes de coordinar la visita" suma las tres líneas contra estafas.
//
// Las publicaciones de redes (Marketplace, TikTok, Instagram, Reels) y las de dueño directo no pasan
// por una inmobiliaria que responda por la unidad, y es donde se concentra la estafa de la seña: el
// directorio tenía 13.239 propiedades de Facebook Marketplace y 439 de TikTok, Instagram y Reels el
// 8/11/2026, y la lista de la ficha no decía nada. Mercado Libre muestra sus "Consejos de seguridad"
// en todos sus avisos.
//
// El tono es de información, nunca de acusación: las líneas dicen qué revisar, no que ESTE aviso
// sea sospechoso, y por eso no nombran al anunciante ni comparan su precio.
import type { RentalOffer, RentalSource } from './rentals'

export const RENTAL_SCAM_WARNING_SOURCES: readonly RentalSource[] = [
  'facebook',
  'facebookreels',
  'tiktok',
  'instagram',
]

export const RENTAL_SCAM_LINES = ['scamDeposit', 'scamTitle', 'scamPrice'] as const

export function rentalScamWarning(
  offer:
    (Pick<RentalOffer, 'source'> & Partial<Pick<RentalOffer, 'ownerDirect'>>) | null | undefined
): boolean {
  if (!offer) return false
  return RENTAL_SCAM_WARNING_SOURCES.includes(offer.source) || offer.ownerDirect?.declared === true
}
