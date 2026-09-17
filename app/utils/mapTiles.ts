// Tiles de los mapas Leaflet.
//
// Los servidores de OpenStreetMap exigen Referer desde el navegador y, sin él,
// devuelven con 200 la imagen "403 Access blocked" en cada casilla. Pasó el
// 2026-09-16 en /descuentos-con-tarjeta-uruguay: el sitio declaraba
// `<meta name="referrer" content="no-referrer">` y ningún tile salía con Referer.
// El meta ya manda sólo el origen, pero cada capa de tiles pide su política
// igual: la del elemento le gana a la del documento, así que un cambio futuro
// del meta no vuelve a tapar los mapas.
//
// Sin subdominio a/b/c: OSM los dejó de recomendar; con HTTP/2 no suman nada.
export const MAP_TILE_URL_FALLBACK = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png'

export const MAP_TILE_REFERRER_POLICY = 'strict-origin-when-cross-origin'
