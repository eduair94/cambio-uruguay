// Un precio de relleno no es un precio. Hay anunciantes que publican primero con "11111" o "12345"
// y después ponen el real; si el historial lo registra, el cambio siguiente sale como una suba o una
// baja que nadie hizo. Medido el 2026-09-24: 11.111 -> 29.000 (+161 %) encabezaba los cambios de
// alquiler en /cambios-de-precio-uruguay, y 1.111.111 fue el Chery Tiggo 8 que abrió la guarda de 5x
// de `normalize.ts`. En los tres historiales había 49 puntos así en alquileres, 11 en autos, 3 en
// ventas y 9 en pricewatch.
//
// Sólo unos repetidos (cuatro cifras o más) y la secuencia 12345 (cinco o más). Los nueves NO
// (US$ 9.999 y $ 99.999 son precios psicológicos reales), otros dígitos repetidos tampoco (hay sillas
// a $ 2.222 de verdad) y 1234 tampoco (1.234 -> 1.299 en equipar es un repreciado plausible).
//
// Espejo en app/utils/priceHistory.ts; la paridad la vigila app/tests/unit/priceHistory.test.ts.
export function isPlaceholderPrice(price: number): boolean {
  if (typeof price !== "number" || !Number.isInteger(price) || price <= 0) return false;
  const digits = String(price);
  return /^1{4,}$/.test(digits) || /^12345(?:67?)?$/.test(digits);
}
