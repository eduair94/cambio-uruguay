import type { ChairMedia, ChairPurchaseOffer } from "./types";

// These are verified Uruguay-facing offers, not affiliate links. Keep the observation date fixed:
// the UI must never imply that a stored price was checked more recently than it really was.
const VERIFIED_AT = "2026-07-25";

const offers: Record<string, ChairPurchaseOffer[]> = {
  "herman-miller-aeron": [
    {
      id: "aeron-bertoni-new",
      seller: "Bertoni",
      channel: "local-store",
      title: "New Aeron con Forward Tilt",
      price: 2795,
      currency: "USD",
      url: "https://bertoni.com.uy/productos/silla-new-aeron-con-forward-tilt_AER1C23DWALPG1G1G1C7BK23103_AER1B23DWALPG1G1G1C7BK23103",
      condition: "new",
      verifiedAt: VERIFIED_AT,
      note: "Talles B y C; precio promocional observado.",
    },
    {
      id: "aeron-mercadolibre-new",
      seller: "Mercado Libre Uruguay",
      channel: "marketplace",
      title: "Herman Miller Aeron Carbon",
      price: 850,
      currency: "USD",
      url: "https://www.mercadolibre.com.uy/silla-de-escritorio-herman-miller-aeron-ergonomica-carbon/p/MLU15242909",
      condition: "new",
      verifiedAt: VERIFIED_AT,
      note: "Oferta de marketplace; confirmar vendedor, talle y garantía.",
    },
    {
      id: "aeron-tiendamia-refurbished",
      seller: "Tiendamia Uruguay",
      channel: "importer",
      title: "Aeron reacondicionada vía eBay",
      price: 643.31,
      currency: "USD",
      url: "https://tiendamia.com.uy/search/ebay/herman%2Bmiller%2Bsilla",
      condition: "refurbished",
      verifiedAt: VERIFIED_AT,
      note: "Precio desde; revisar peso, importación y costo final antes de pagar.",
    },
  ],
  "vigo-atlas": [
    {
      id: "atlas-world-vigo",
      seller: "World Vigo",
      channel: "local-store",
      title: "Silla VIGO Atlas",
      price: 22000,
      currency: "UYU",
      url: "https://www.worldvigo.com/products/silla-vigo-atlas",
      condition: "new",
      verifiedAt: VERIFIED_AT,
      note: "Tienda local; garantía informada de 3 años.",
    },
    {
      id: "atlas-mercadolibre",
      seller: "Mercado Libre Uruguay",
      channel: "marketplace",
      title: "Vigo Atlas negra",
      price: 22000,
      currency: "UYU",
      url: "https://www.mercadolibre.com.uy/sillon-ejecutivo-operativo-ergonomico-vigo-atlas-negro-giratorio-reclinable/p/MLU18916911",
      condition: "new",
      verifiedAt: VERIFIED_AT,
      note: "Vendida por World Vigo dentro de Mercado Libre.",
    },
    {
      id: "atlas-habitta",
      seller: "Habitta",
      channel: "comparator",
      title: "Comparador de precio VIGO Atlas",
      price: 22000,
      currency: "UYU",
      url: "https://habitta.uy/producto/vigo/silla-vigo-atlas-70305",
      condition: "new",
      verifiedAt: VERIFIED_AT,
      note: "Comparador uruguayo; la compra redirige a World Vigo.",
    },
  ],
  "vigo-apolo": [
    {
      id: "apolo-world-vigo",
      seller: "World Vigo",
      channel: "local-store",
      title: "Vigo Apolo Black",
      price: 14535,
      currency: "UYU",
      url: "https://www.worldvigo.com/products/vigo-apollo",
      condition: "new",
      verifiedAt: VERIFIED_AT,
      note: "Precio promocional observado; precio de lista UYU 15.300.",
    },
    {
      id: "apolo-mercadolibre",
      seller: "Mercado Libre Uruguay",
      channel: "marketplace",
      title: "Vigo Apolo ergonómica",
      price: 15300,
      currency: "UYU",
      url: "https://articulo.mercadolibre.com.uy/MLU-476857179-silla-vigo-apolo-ergonomica-ejecutiva-apoya-brazos-3d-_JM",
      condition: "new",
      verifiedAt: VERIFIED_AT,
      note: "Vendida por World Vigo dentro de Mercado Libre.",
    },
  ],
  "vigo-5k": [
    {
      id: "vigo-5k-world-vigo",
      seller: "World Vigo",
      channel: "local-store",
      title: "Vigo 5K Black",
      price: 13300,
      currency: "UYU",
      url: "https://www.worldvigo.com/products/vigo-5k-black",
      condition: "new",
      verifiedAt: VERIFIED_AT,
      note: "Precio promocional observado; confirmar color y stock.",
    },
  ],
};

export function offersForChair(slug: string): ChairPurchaseOffer[] {
  return offers[slug]?.map((offer) => ({ ...offer })) ?? [];
}

// Photo galleries come from the seller's own product page for the exact colourway we quote, so the
// alt text can name the angle without guessing. Lead photo first: the page shows it before opening
// the viewer, and the structured data publishes it as the product image.
const bertoniAeron = (path: string, alt: string): ChairMedia => ({
  url: `https://f.fcdn.app/imgs/ddeaf9/bertoni.com.uy/bertuy/5020/webp/catalogo/${path}/1024-1024/silla-new-aeron-con-forward-tilt.jpg`,
  alt,
  sourceName: "Bertoni",
  sourceUrl:
    "https://bertoni.com.uy/productos/silla-new-aeron-con-forward-tilt_AER1C23DWALPG1G1G1C7BK23103_AER1B23DWALPG1G1G1C7BK23103",
});

const worldVigo = (id: string, alt: string, product: string): ChairMedia => ({
  url: `https://api.crowhop.pro/uploads/shopify-${id}.jpg`,
  alt,
  sourceName: "World Vigo",
  sourceUrl: `https://www.worldvigo.com/products/${product}`,
});

const galleries: Record<string, ChairMedia[]> = {
  "herman-miller-aeron": [
    bertoniAeron(
      "AER1C23DWALPG1G1G1C7BK23103_AER1B23DWALPG1G1G1C7BK23103_1",
      "Silla Herman Miller New Aeron color grafito, vista tres cuartos"
    ),
  ],
  "vigo-atlas": [
    worldVigo(
      "c2518bca119d47babc7277737984034e",
      "Silla VIGO Atlas negra, vista frontal",
      "silla-vigo-atlas"
    ),
    worldVigo(
      "9b6deadda5ed035fa3a2f73c750958fd",
      "Silla VIGO Atlas negra, perfil lateral",
      "silla-vigo-atlas"
    ),
    worldVigo(
      "49671498bfdf49cb718f775328dc583a",
      "Silla VIGO Atlas negra, vista tres cuartos",
      "silla-vigo-atlas"
    ),
    worldVigo(
      "f8933f11d1c921426b534a128e6165b0",
      "Silla VIGO Atlas negra, respaldo y apoyacabezas",
      "silla-vigo-atlas"
    ),
  ],
  "vigo-apolo": [
    worldVigo(
      "844a07e973d78943fea7bc871212d34d",
      "Silla Vigo Apolo negra, vista frontal",
      "vigo-apollo"
    ),
    worldVigo(
      "d67f8045e1d10d80a6b5d23658ca7880",
      "Silla Vigo Apolo negra, vista tres cuartos",
      "vigo-apollo"
    ),
    worldVigo(
      "c5c1e499dd135d1a8a70295537a2c6af",
      "Silla Vigo Apolo negra, perfil lateral",
      "vigo-apollo"
    ),
  ],
  "vigo-5k": [
    worldVigo(
      "df3814c5a0e8da90d8e513d3e56fe6cc",
      "Silla Vigo 5K negra, vista frontal",
      "vigo-5k-black"
    ),
    worldVigo(
      "a76e4afe61ecdc44c1d02b806544e012",
      "Silla Vigo 5K negra, vista tres cuartos",
      "vigo-5k-black"
    ),
    worldVigo(
      "978603f9440915d0f053b551313a4b69",
      "Silla Vigo 5K negra, perfil lateral",
      "vigo-5k-black"
    ),
    worldVigo(
      "6fe275c2a8ab1bd3dbdcef9b85e9f6ab",
      "Silla Vigo 5K negra, respaldo",
      "vigo-5k-black"
    ),
  ],
};

export function galleryForChair(slug: string): ChairMedia[] {
  return (galleries[slug] ?? []).map((photo) => ({ ...photo }));
}

export function mediaForChair(slug: string): ChairMedia | null {
  const [lead] = galleries[slug] ?? [];
  return lead ? { ...lead } : null;
}
