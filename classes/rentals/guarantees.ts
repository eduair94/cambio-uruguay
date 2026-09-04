// Qué garantía de alquiler acepta un aviso.
//
// En Uruguay la garantía decide si alguien puede alquilar o no, más que el precio: quien no tiene
// un propietario que salga de fiador depende de ANDA, de Contaduría General de la Nación o de una
// aseguradora, y cada inmobiliaria acepta unas y otras no. Es el primer filtro real de una búsqueda
// y no estaba en ningún lado.
//
// DE DÓNDE SALE. No del título: sobre 16.295 propiedades vivas, 89 lo mencionan (0,5 %). Tampoco
// del campo `guarantee` de InfoCasas, que existe en la fila y viene SIEMPRE null. Sale de la
// DESCRIPCIÓN, que InfoCasas publica en el 99,6 % de sus avisos y donde el 49,6 % nombra el
// sustantivo "garantía(s)" (medido sobre 252 avisos el 2026-09-04).
//
// TRES DECISIONES QUE SALIERON DE MEDIR, no de suponer:
//
// 1. Se ancla en el SUSTANTIVO, no en la raíz. `/garant/` matchea "portería que GARANTIZA
//    seguridad" y "amenities que GARANTIZAN comodidad": 12 falsos positivos de 138 (8,7 %).
//
// 2. Se lee una VENTANA alrededor de cada mención, no la descripción entera. Leerla entera sumó
//    UN caso y metió falsos positivos: "depósito" en Uruguay es también un galpón, y aparecía en
//    "gran depósito, corral de aves, invernadero". Cerca del sustantivo, en cambio, es legítimo:
//    "Garantía: 6 meses de depósito", "Aseguradoras privadas o depósito bancario".
//
// 3. NO se publica la negativa. Sobre 336 avisos revisados no apareció ni una negación de un tipo
//    de garantía; los "No acepta" que caen en la ventana son de mascotas o de actividad
//    gastronómica. Lo que sí existe es la EXCLUSIVIDAD ("únicamente aseguradoras", "Garantía
//    exclusivamente mediante Porto Seguro o SURA"), que no cambia lo que se publica: los tipos
//    listados se aceptan igual. Un aviso sin tipo reconocido queda con la lista VACÍA, que se lee
//    "el aviso no lo dice" y nunca "no acepta ninguna".

/** Los tipos que se publican. Cualquier otro texto no se convierte en una etiqueta. */
export type RentalGuarantee =
  | "anda"
  | "contaduria"
  | "aseguradora"
  | "propietaria"
  | "deposito"
  | "bhu"
  | "aConvenir";

export const RENTAL_GUARANTEES: readonly RentalGuarantee[] = Object.freeze([
  "anda",
  "contaduria",
  "aseguradora",
  "propietaria",
  "deposito",
  "bhu",
  "aConvenir",
]);

/**
 * Cuánto texto se mira a cada lado de la palabra "garantía".
 *
 * Asimétrico a propósito: la lista de garantías aceptadas casi siempre va DESPUÉS del rótulo
 * ("Garantías: Aseguradoras, ANDA o Contaduría"), y lo de antes suele ser el precio o los gastos
 * comunes. Los valores salieron de mirar las ventanas reales, no de redondear.
 */
const BEFORE = 90;
const AFTER = 160;

/** El sustantivo. `\b` al final para no comerse "garantiza". */
const NOUN = /garant[ií]as?\b/gi;

const PATTERNS: ReadonlyArray<readonly [RentalGuarantee, RegExp]> = [
  ["anda", /\bANDA\b/],
  ["contaduria", /contadur[ií]a|\bC\.?G\.?N\.?\b/i],
  // "seguro" a secas NO alcanza: aparece en "cerca eléctrica", "seguridad", "sistema de seguridad".
  ["aseguradora", /aseguradora|p[óo]liza|\bporto\b|\bsura\b|mapfre|fianza|cauci[óo]n|seguro (privado|de alquiler)/i],
  ["propietaria", /garant[ií]a propietaria|fiador/i],
  ["deposito", /dep[óo]sito/i],
  ["bhu", /\bBHU\b/],
  ["aConvenir", /garant[ií]as?\s*:?\s*(a\s+)?(consultar|convenir|conversar|evaluar)/i],
];

/** Saca etiquetas HTML y colapsa espacios: las descripciones vienen con `<br>` y `&nbsp;`. */
export function plainText(html: string | null | undefined): string {
  return String(html || "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Los tipos de garantía que menciona una descripción.
 *
 * Devuelve una lista ORDENADA y sin repetidos, para que dos avisos con las mismas garantías
 * produzcan exactamente el mismo arreglo y la propiedad unificada no cambie de forma según el orden
 * en que se leyeron los portales.
 */
export function guaranteesFromText(description: string | null | undefined): RentalGuarantee[] {
  const text = plainText(description);
  if (!text) return [];

  const found = new Set<RentalGuarantee>();
  NOUN.lastIndex = 0;
  for (const match of text.matchAll(NOUN)) {
    const at = match.index ?? 0;
    const window = text.slice(Math.max(0, at - BEFORE), at + AFTER);
    for (const [guarantee, pattern] of PATTERNS) {
      if (pattern.test(window)) found.add(guarantee);
    }
  }

  // El orden de RENTAL_GUARANTEES, no el de aparición: la lista es un conjunto, no una secuencia.
  return RENTAL_GUARANTEES.filter((guarantee) => found.has(guarantee));
}

/**
 * La unión de lo que dicen varios avisos de la misma propiedad.
 *
 * Unión y no intersección por el mismo motivo que las mascotas: que un aviso no nombre ANDA no
 * significa que la inmobiliaria no la acepte, sólo que ese texto no la nombra. Una lista vacía
 * nunca contradice a una llena.
 */
export function mergeGuarantees(lists: ReadonlyArray<readonly RentalGuarantee[]>): RentalGuarantee[] {
  const found = new Set<RentalGuarantee>();
  for (const list of lists) for (const guarantee of list) found.add(guarantee);
  return RENTAL_GUARANTEES.filter((guarantee) => found.has(guarantee));
}
