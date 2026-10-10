// Las fotos de la ficha propia de un aviso, para los portales cuya tarjeta de búsqueda trae sólo la
// portada: Mercado Libre (mlDetail.ts) y Casasweb (casaswebDetail.ts). Medido el 2026-10-09: los
// avisos de esos dos portales tenían CERO fotos de galería guardadas, sólo la portada de la tarjeta.
//
// La portada es la primera foto de la galería en otro tamaño y con otra URL (ML:
// `D_NQ_NP_2X_<id>-C.webp` contra `D_NQ_NP_<id>-F.webp`; Casasweb: `/fotos/<n>s.jpg` contra
// `/fotos/<n>.jpg`). La página arma la galería con `[image, ...details.images]` y saca repetidas por
// URL, así que la misma foto salía dos veces. La portada se queda como `image` —es la miniatura de
// la tarjeta— y la galería guarda las DEMÁS fotos.
//
// Igual que los gastos comunes y el pin: lo escribe el job de la ficha apenas la lee
// (`writeOfferGallery`) y la cosecha lo reaplica (`applyGallery`), porque cada hora vuelve a llegar
// la tarjeta sin galería y la oferta fresca reemplaza a la guardada (store.ts, `mergeOffers`). Sólo
// cuando trae MÁS fotos que las que el aviso ya tiene: nunca achica una galería.
import { appConnection } from "../appdb";
import { rentalImages, rentalOfferDetails } from "./details";
import type { RawRental } from "./types";

/** What makes two URLs the same photo (the portal's own photo id); the URL itself otherwise. */
export type PhotoKey = (url: string) => string;

/** The page's photos without the cover, which the advert already shows as its `image`. */
export function galleryWithoutCover(images: readonly string[], cover: string | null | undefined, photoKey: PhotoKey): string[] {
  const coverKey = cover ? photoKey(cover) : null;
  return rentalImages(images.filter(url => photoKey(url) !== coverKey));
}

/**
 * The harvest's half: puts the stored gallery on a raw advert, only when it has more photos than the
 * advert carries. A card without `details` gets them built field by field. Returns whether it did.
 */
export function applyGallery(
  row: Pick<RawRental, "image" | "details">,
  images: readonly string[] | null | undefined,
  photoKey: PhotoKey
): boolean {
  if (!Array.isArray(images) || !images.length) return false;
  const gallery = galleryWithoutCover(images, row.image, photoKey);
  if (gallery.length <= (row.details?.images?.length ?? 0)) return false;
  row.details = row.details ? { ...row.details, images: gallery } : rentalOfferDetails({ images: gallery });
  return true;
}

interface StoredOffer {
  listingId?: unknown;
  image?: unknown;
  details?: { images?: unknown };
}

/**
 * The stored advert's gallery, right away. Compare-and-set on the advert itself: an offer without
 * `details` gets a whole explicit one; an offer with them, only a longer photo list.
 */
export async function writeOfferGallery(
  target: { key: string; listingId: string },
  images: readonly string[],
  photoKey: PhotoKey
): Promise<boolean> {
  const listings = appConnection().collection("rentallistings");
  const row = await listings.findOne(
    { key: target.key },
    { projection: { "offers.listingId": 1, "offers.image": 1, "offers.details.images": 1 } }
  );
  const offers: StoredOffer[] = row && Array.isArray(row.offers) ? row.offers : [];
  const offer = offers.find(item => item?.listingId === target.listingId);
  if (!offer) return false;
  const gallery = galleryWithoutCover(images, typeof offer.image === "string" ? offer.image : null, photoKey);
  const stored = offer.details?.images;
  if (!gallery.length || gallery.length <= (Array.isArray(stored) ? stored.length : 0)) return false;
  const result = offer.details
    ? await listings.updateOne(
        { key: target.key },
        { $set: { "offers.$[o].details.images": gallery } },
        { arrayFilters: [{ "o.listingId": target.listingId, "o.details": { $type: "object" }, [`o.details.images.${gallery.length - 1}`]: { $exists: false } }] }
      )
    : await listings.updateOne(
        { key: target.key },
        { $set: { "offers.$[o].details": rentalOfferDetails({ images: gallery }) } },
        { arrayFilters: [{ "o.listingId": target.listingId, "o.details": { $exists: false } }] }
      );
  return result.modifiedCount > 0;
}
