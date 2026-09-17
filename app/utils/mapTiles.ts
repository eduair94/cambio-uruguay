// Tiles de los mapas Leaflet.
//
// El sitio declara `<meta name="referrer" content="no-referrer">` en
// nuxt.config.ts, así que un `<img>` de tile sale SIN cabecera Referer. Los
// servidores de OpenStreetMap exigen Referer desde el navegador y, sin él,
// devuelven con 200 la imagen "403 Access blocked" en cada casilla (visto en
// /descuentos-con-tarjeta-uruguay el 2026-09-16: curl con Referer trae el tile,
// sin Referer trae el cartel). La política por elemento le gana a la del
// documento, por eso cada capa de tiles la pide explícitamente — y sólo manda el
// origen, nunca la ruta.
//
// Sin subdominio a/b/c: OSM los dejó de recomendar; con HTTP/2 no suman nada.
export const MAP_TILE_URL_FALLBACK = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png'

export const MAP_TILE_REFERRER_POLICY = 'strict-origin-when-cross-origin'
