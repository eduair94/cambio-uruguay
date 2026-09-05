// Qué garantía de alquiler acepta un aviso.
//
// En Uruguay la garantía decide si alguien puede alquilar o no, más que el precio: quien no tiene
// un propietario que salga de fiador depende de ANDA, de Contaduría General de la Nación o de una
// aseguradora, y cada inmobiliaria acepta unas y otras no. Es el primer filtro real de una búsqueda
// y no estaba en ningún lado.
//
// DE DÓNDE SALE. No del título: sobre 16.295 propiedades vivas, 89 lo mencionan (0,5 %). Sale de
// DOS lugares de InfoCasas:
//
//   * el campo `guarantee`, que es un campo DEDICADO ("ANDA, PORTO SEGURO, FIDECIU O SURA",
//     "ANDA - Contaduría General de la Nación"). Ahí no existe el falso positivo de "portería que
//     garantiza seguridad", así que se lee entero, sin ventana. CORRIJO LO QUE ESCRIBÍ ACÁ ANTES:
//     dije que venía "SIEMPRE null" midiendo 126 avisos, y con muestras más grandes viene cargado
//     en el 4,4 % (13/294 medido por mí) y en el 9,8 % (108/1.098, medido aparte). Aporta avisos
//     que la descripción sola no da.
//
//   * la DESCRIPCIÓN, que InfoCasas publica en el 99,6 % de sus avisos y donde el ~50 % nombra el
//     sustantivo "garantía(s)".
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

/**
 * Frases donde la inmobiliaria se publicita a sí misma, no describe la propiedad.
 *
 * "SOMOS CORREDORES DE PORTO SEGURO - TRAMITÁ CON NOSOTROS TU GARANTÍA" etiquetaba `aseguradora`
 * en avisos que a renglón seguido listan "GARANTIAS: ANDA o CGN" SIN Porto. Medido: 10 falsos
 * positivos, y 8 de ellos CONTRADICEN la lista del propio aviso. Es el peor error posible acá:
 * manda a alguien con póliza de Porto a una casa que sólo toma ANDA.
 *
 * Se borra la ORACIÓN entera que contiene la publicidad, no el documento: los 22 avisos que traen
 * la publicidad Y además su propia lista conservan las etiquetas de esa lista.
 */
const AGENCY_ADVERTISING =
  /(somos|soy)\s+corredor|corredores?\s+de\s+(seguros?|porto)|gestionamos\s+(tu|su)\s+garant|tramit[aá]\s+con\s+nosotros/i;

function stripAgencyAdvertising(text: string): string {
  return text
    .split(/(?<=[.;!?])\s+/)
    .filter((sentence) => !AGENCY_ADVERTISING.test(sentence))
    .join(" ");
}

const PATTERNS: ReadonlyArray<readonly [RentalGuarantee, RegExp]> = [
  // SIN mayúsculas obligatorias. Medido sobre las menciones reales: 34 "ANDA", 25 "Anda", 3 "anda",
  // o sea que el 45 % se perdía con /\bANDA\b/. Y NINGUNA de las 62 apariciones es el verbo andar:
  // la ventana ya exige que esté a menos de 90 caracteres de la palabra "garantía", y un verbo no
  // vive ahí. Si alguien "arregla" esto volviendo a mayúsculas, rompe casi la mitad del filtro.
  ["anda", /\banda\b/i],
  ["contaduria", /contadur[ií]a|\bC\.?G\.?N\.?\b/i],
  // "seguro" a secas NO alcanza: aparece en "cerca eléctrica", "seguridad", "sistema de seguridad".
  // `seguros` en PLURAL a propósito: el singular es adjetival en "sistema de seguridad".
  [
    "aseguradora",
    /aseguradora|p[óo]liza|\bseguros\b|\bporto\b|\bsura\b|\bsurco\b|\bsbi\b|mapfre|sancor|zurich|berkley|fide[cs]iu?|fianza|cauci[óo]n|seguro (privado|de alquiler)/i,
  ],
  ["propietaria", /garant[ií]a propietaria|fiador/i],
  // `deposito` NO va acá: necesita mirar sólo lo que viene DESPUÉS del sustantivo y en la MISMA
  // oración, porque en Uruguay "depósito" también es un galpón. Se resuelve aparte, abajo.
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
/**
 * ¿Hay un depósito en garantía en lo que sigue al sustantivo?
 *
 * Tres condiciones a la vez, y las tres salieron de casos reales:
 *   (a) SÓLO DESPUÉS del sustantivo — si no, "habitación depósito ... GARANTÍAS: ASEGURADORAS" se
 *       etiquetaba como depósito;
 *   (b) en la MISMA ORACIÓN — si no, "Garantías: Anda o Porto. Ideal para empresas, depósitos,
 *       logística" también;
 *   (c) sin una negación pegada ("no depósito", "sin depósito").
 *
 * La guarda de negación se ancla en el token del TIPO y nunca en la palabra "garantía": hay avisos
 * que dicen "Gastos Comunes: NO TIENE. GARANTIAS: ANDA o CGN", y un `/no.*garant/` les borraría
 * etiquetas correctas.
 */
const DEPOSIT_WINDOW = 80;

function hasDepositAfter(text: string, at: number): boolean {
  const after = text.slice(at, at + DEPOSIT_WINDOW).split(/[.;!?]/)[0] ?? "";
  if (!/dep[óo]sito/i.test(after)) return false;
  return !/\b(no|sin)\s+(se\s+)?(acepta|pide|exige)?\s*dep[óo]sito/i.test(after);
}

export function guaranteesFromText(description: string | null | undefined): RentalGuarantee[] {
  const raw = plainText(description);
  if (!raw) return [];
  const text = stripAgencyAdvertising(raw);
  if (!text) return [];

  const found = new Set<RentalGuarantee>();
  NOUN.lastIndex = 0;
  for (const match of text.matchAll(NOUN)) {
    const at = match.index ?? 0;
    const window = text.slice(Math.max(0, at - BEFORE), at + AFTER);
    for (const [guarantee, pattern] of PATTERNS) {
      if (pattern.test(window)) found.add(guarantee);
    }
    if (hasDepositAfter(text, at)) found.add("deposito");
  }

  // El orden de RENTAL_GUARANTEES, no el de aparición: la lista es un conjunto, no una secuencia.
  return RENTAL_GUARANTEES.filter((guarantee) => found.has(guarantee));
}

/**
 * Los tipos que declara el campo `guarantee` de InfoCasas.
 *
 * Sin ventana y sin anclar en el sustantivo: el campo ENTERO es la frase de garantía, así que no
 * hace falta buscar el rótulo — "Aseguradoras", "PORTO - SURA", "Se Evalúan" vienen solos. Por lo
 * mismo, acá el depósito se acepta en cualquier parte del valor.
 */
export function guaranteesFromField(value: string | null | undefined): RentalGuarantee[] {
  const text = plainText(value);
  if (!text) return [];
  const found = new Set<RentalGuarantee>();
  for (const [guarantee, pattern] of PATTERNS) {
    if (pattern.test(text)) found.add(guarantee);
  }
  if (/dep[óo]sito/i.test(text) && !/\b(no|sin)\s+dep[óo]sito/i.test(text)) found.add("deposito");
  if (/^\s*se\s+eval[úu]an?\s*$/i.test(text) || /consultar|convenir|conversar/i.test(text)) {
    found.add("aConvenir");
  }
  return RENTAL_GUARANTEES.filter((guarantee) => found.has(guarantee));
}

/**
 * El País publica la garantía como DATO, no como texto: `rentalGuarantees: [{type: "anda"}, …]` y
 * `guaranteesAccepted: ["bhu", "porto"]`, dos campos con vocabularios distintos que conviven en el
 * mismo aviso. Es la primera fuente además de InfoCasas que lo declara estructurado, y es la más
 * densa: 191 de 481 avisos de Montevideo lo traen (40 %) contra el 4-10 % del campo de InfoCasas.
 *
 * DOS DECISIONES:
 *
 * 1. Las tres aseguradoras que nombra el portal (Porto Seguro, SURA, Mapfre) colapsan en
 *    `aseguradora`, que es el tipo que el sitio publica. Distinguir la marca sería un dato que
 *    nuestro filtro no tiene dónde mostrar, y el usuario pregunta "¿me sirve una aseguradora?",
 *    no "¿cuál?".
 *
 * 2. Un código que no está en esta tabla se DESCARTA, no se aproxima. `mvotma` (1 aviso de 481) es
 *    el caso real: el fondo del ministerio lo administra la Contaduría, así que mapearlo a
 *    `contaduria` es defendible — y sería igual una inferencia nuestra sobre un trámite que el
 *    inquilino hace en otra ventanilla. Un tipo que no sabemos leer se lee "el aviso no lo dice".
 */
const ELPAIS_GUARANTEE_CODES: ReadonlyMap<string, RentalGuarantee> = new Map([
  ["anda", "anda"],
  ["cgn", "contaduria"],
  ["contaduria", "contaduria"],
  ["porto", "aseguradora"],
  ["porto_seguros", "aseguradora"],
  ["porto_seguro", "aseguradora"],
  ["sura", "aseguradora"],
  ["mapfre", "aseguradora"],
  ["aseguradora", "aseguradora"],
  ["propiedad", "propietaria"],
  ["propietaria", "propietaria"],
  ["deposito_bancario", "deposito"],
  ["deposito", "deposito"],
  ["bhu", "bhu"],
  ["a_convenir", "aConvenir"],
]);

/**
 * Lee los dos campos estructurados de El País. Acepta strings sueltos y objetos `{type}` porque el
 * portal usa las dos formas, y no toca el texto del aviso: eso lo sigue haciendo `guaranteesFromText`,
 * y los dos resultados se unen con `mergeGuarantees`.
 */
export function guaranteesFromElpaisCodes(...values: unknown[]): RentalGuarantee[] {
  const found = new Set<RentalGuarantee>();
  for (const value of values) {
    if (!Array.isArray(value)) continue;
    for (const entry of value) {
      const raw = typeof entry === "string" ? entry : (entry as { type?: unknown } | null)?.type;
      if (typeof raw !== "string") continue;
      const guarantee = ELPAIS_GUARANTEE_CODES.get(raw.trim().toLowerCase());
      if (guarantee) found.add(guarantee);
    }
  }
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
