// app/utils/rentalBarrioName.ts
// Qué puede ser el nombre de un barrio. Vive en un módulo propio (rentalBarrio.ts lo reexporta)
// para que la ficha y las tarjetas del directorio lo usen sin arrastrar al cliente el lector del
// snapshot de zonas, que pesa dos mil líneas.

/**
 * La regla del lector de Casasweb (`plausibleCasaswebNeighborhood`, classes/rentals/sources/
 * casasweb.ts), copiada tal cual porque `app/` no puede importar de la raíz:
 * `rentalBarrioNameParity.test.ts` corre las dos sobre los mismos casos.
 *
 * Por qué existe: desde el 2026-11-03 Casasweb guardó la superficie en el campo del barrio
 * ("40 m2 40 m2", "10 m2", "4 H") en unos 1.350 avisos, y cada grafía nueva abrió una página
 * /alquiler/<departamento>/<barrio> indexable, entró al sitemap, a los chips de barrios parecidos y
 * al título de las fichas. "Uruguay" llega de los geocodificadores como si fuera un barrio. El
 * backend la aplica al leer Casasweb; acá cubre a todas las fuentes, y a la próxima deriva.
 *
 * No es un barrio: una superficie en cualquier parte del nombre ("40 m2 40 m2", "60 mts",
 * "45 metros"), un número suelto ("1234", "1.234"), una cantidad de hectáreas ("4 H", "2 ha") o el
 * país. Sí lo es un nombre que sólo EMPIEZA con un número: "25 de Mayo" y "18 de Julio".
 */
const MEASUREMENT = /\d[\d.,]*\s*(?:m2|m²|mts?\.?|metros?)(?![a-záéíóúñ])/i
const NUMBER_ONLY = /^[\d\s.,]+$/
const HECTARES = /^\d+(?:[.,]\d+)?\s*(?:h|has?|hect[aá]reas?)\.?$/i

export function rentalBarrioNamePlausible(name: unknown): boolean {
  if (typeof name !== 'string') return false
  const value = name.replace(/\s+/g, ' ').trim()
  if (!value || MEASUREMENT.test(value) || NUMBER_ONLY.test(value) || HECTARES.test(value))
    return false
  return rentalPlaceKey(value) !== 'uruguay'
}

/**
 * La forma plegada de un nombre de lugar: sin tildes, en minúsculas y con un solo espacio. Es la
 * misma que `rentalZoneName` (utils/rentalZones.ts), que agrupa los barrios de las páginas; se
 * repite acá por el mismo motivo que la regla de arriba, y un test vigila que no se separen.
 */
export const rentalPlaceKey = (value: string): string =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036F]/g, '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ')
