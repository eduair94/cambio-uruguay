/**
 * Llevar la vista al comienzo de los resultados después de cambiar de página.
 *
 * Sin esto, tocar "2" deja al usuario a la altura del PIE de la lista anterior: la página
 * nueva ya se cargó arriba y lo que tiene delante son los últimos avisos del listado, o
 * directamente el bloque de texto que va después. Hay que subir a mano cada vez.
 *
 * Va al comienzo de la LISTA, no al tope del documento: así el encabezado, los filtros
 * activos y el contador siguen a la vista y no se pierde de qué listado se trata. Si el
 * ancla no existe (todavía no se renderizó, o la página no declara ninguna), cae al tope,
 * que es el comportamiento que esperaría cualquiera.
 *
 * El salto es INSTANTÁNEO, no suave, y eso es a propósito. Un desplazamiento animado de
 * cuatro mil píxeles compite con el re-armado de la lista: medido en mobile, la animación
 * aterrizaba 69 px de más porque mientras corría cambiaba el alto del documento y el
 * navegador recortaba el destino; recién se acomodaba sola dos segundos después, con un
 * tironcito a la vista. Además es lo que hace cualquier buscador al cambiar de página:
 * la página nueva empieza arriba, sin espectáculo. De paso, nada que animar es también
 * lo que corresponde con `prefers-reduced-motion`.
 *
 * El ancla se posiciona con `scroll-margin-top` en su propio CSS, porque la barra del sitio
 * es `position: fixed` y sin ese margen el encabezado de la lista queda tapado debajo.
 */
export function scrollToPageTop(anchorId?: string): void {
  if (typeof window === 'undefined') return
  const anchor = anchorId ? document.getElementById(anchorId) : null
  if (anchor) {
    anchor.scrollIntoView({ behavior: 'auto', block: 'start' })
    return
  }
  window.scrollTo({ top: 0, behavior: 'auto' })
}
