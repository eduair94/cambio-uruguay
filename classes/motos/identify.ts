// Qué ES y qué NO es una moto, y cuál es su cilindrada.
//
// Todo lo de este archivo se midió el 2026-09-22 contra la categoría MLU1763 ("Motos") leída por el
// mismo puente que usa autos (`AUTOS_ML_API`, :9656), con `ITEM_CONDITION=2230581`: 1.391 avisos
// usados, 97 marcas, y una muestra de 164 tarjetas (5 páginas del listado general más las facetas
// de cuatriciclo, triciclo, motocarro y eléctrico completas).
import { fold, slugify, wordText } from "../autos/normalize";
import type { MotoDisplacementBandId, MotoType } from "./types";

/**
 * La CILINDRADA EXACTA sale del título y de ningún otro lado.
 *
 * Mercado Libre publica una faceta `ENGINE_DISPLACEMENT`, pero medida el 2026-09-22 devuelve TRES
 * TRAMOS y no un número: `(*-125cc]` (434 avisos), `[125cc-250cc]` (568) y `[250cc-*)` (634). Eso no
 * distingue una Yumbo 125 de una Yumbo 200, que es exactamente la cohorte que este directorio
 * necesita, así que la faceta no sirve para la identidad y el número se lee del título. El TRAMO sí
 * se toma de la faceta, y es lo único que la mayoría de los avisos permite saber — ver
 * {@link MOTO_DISPLACEMENT_FACETS}.
 *
 * Se exige la unidad escrita: `125cc`, `125 cc`, `125 c.c.`, `1700 Cc.`, `125 cm3`. Nunca un número
 * suelto — "Kawasaki Z900 Z 900 Zr 900" y "Benda Dark Flag 500" nombran la cilindrada en el modelo y
 * no en un campo, y leer "900" de ahí haría pasar por medición lo que es una coincidencia de nombre.
 * El costo está medido y se acepta: de las 100 tarjetas del listado general, 11 declaran la unidad.
 */
const DISPLACEMENT = /(?:^|[^a-z0-9.,])(\d{2,4})\s?(?:cc|c\.c\.?|cm3)(?![a-z0-9])/g;

/**
 * Ninguna moto de calle tiene menos de 30 cc ni más de 2.500. Fuera de la banda el número es otra
 * cosa (una potencia, un código de modelo) y la fila queda sin cilindrada en vez de con una inventada.
 */
export const MOTO_DISPLACEMENT_RANGE = { min: 30, max: 2_500 } as const;

/**
 * Los centímetros cúbicos que declara el título, o null.
 *
 * Si el título declara DOS cilindradas distintas se abstiene: "Bmw F 650 Gs Motor 800 Cc" es el caso
 * feliz (el 650 no lleva unidad, así que sólo matchea el 800, que es el motor real de esa moto),
 * pero dos números CON unidad en el mismo título son dos afirmaciones que no se pueden arbitrar
 * desde acá. Es la misma abstención bimodal de celulares: antes de elegir mal, no elegir.
 */
export function displacementOf(title: string): number | null {
  const text = fold(title);
  const found = new Set<number>();
  DISPLACEMENT.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = DISPLACEMENT.exec(text))) {
    const value = Number(match[1]);
    if (value >= MOTO_DISPLACEMENT_RANGE.min && value <= MOTO_DISPLACEMENT_RANGE.max) found.add(value);
    // Una alternancia que puede casar vacío colgaría el bucle; acá no puede, pero el guardarraíl es
    // el mismo que usa `affirmedMatches` en autos y no cuesta nada.
    if (match.index === DISPLACEMENT.lastIndex) DISPLACEMENT.lastIndex++;
  }
  return found.size === 1 ? [...found][0]! : null;
}

/**
 * El TRAMO de cilindrada, que es lo que la faceta `ENGINE_DISPLACEMENT` del propio Mercado Libre sí
 * sabe de casi todos los avisos.
 *
 * Hace falta porque la medición dejó sin discusión que el título casi nunca declara la cilindrada:
 * en la primera corrida real de este job (2026-09-22, las tres marcas más grandes — Honda, Yumbo y
 * Yamaha, 73 avisos publicables), **sólo 2 títulos escribieron la unidad**. Publicar únicamente la
 * cilindrada exacta dejaría al directorio sin su dimensión propia para el 97 % del catálogo.
 *
 * **Los tramos de ML se SOLAPAN en los bordes**: `(*-125cc]` es "125 cc o menos", `[125cc-250cc]` es
 * "125 a 250 cc" y `[250cc-*)` es "250 cc o más", así que una moto de 125 cc está en los dos
 * primeros y una de 250 en los dos últimos. Medido el 2026-09-22: 434 + 568 + 634 = 1.636 contra
 * 1.391 avisos, o sea 245 de solapamiento. Un aviso que aparece en dos tramos adyacentes está
 * exactamente en el borde, y se lo asigna al tramo de ABAJO — que es el tramo cuyo límite superior
 * iguala, así que las etiquetas de acá ("hasta 125 cc", "126 a 250 cc", "más de 250 cc") son
 * literalmente ciertas para él. Un aviso en los tres tramos no existe, y si apareciera no se le
 * asigna ninguno.
 */
export const MOTO_DISPLACEMENT_FACETS: ReadonlyArray<{
  id: string;
  band: MotoDisplacementBandId;
  label: string;
  /** Límite superior inclusivo del tramo, para poder derivarlo de una cilindrada leída del título. */
  max: number;
  adverts: number;
}> = [
  { id: "(*-125cc]", band: "hasta-125", label: "hasta 125 cc", max: 125, adverts: 434 },
  { id: "[125cc-250cc]", band: "126-250", label: "126 a 250 cc", max: 250, adverts: 568 },
  { id: "[250cc-*)", band: "mas-250", label: "más de 250 cc", max: Number.POSITIVE_INFINITY, adverts: 634 },
];

/** El tramo que le corresponde a una cilindrada exacta ya leída del título. */
export function displacementBandOf(displacement: number | null): MotoDisplacementBandId | null {
  if (displacement === null || !Number.isFinite(displacement)) return null;
  return MOTO_DISPLACEMENT_FACETS.find(band => displacement <= band.max)?.band ?? null;
}

/**
 * Resuelve el tramo de un aviso a partir de los tramos en los que la cosecha lo vio. Uno solo manda;
 * dos ADYACENTES son el borde y gana el de abajo; cualquier otra combinación no decide nada.
 */
export function resolveDisplacementBand(facetIds: readonly string[]): MotoDisplacementBandId | null {
  const indexes = facetIds
    .map(id => MOTO_DISPLACEMENT_FACETS.findIndex(band => band.id === id))
    .filter(index => index >= 0)
    .sort((a, b) => a - b);
  const unique = [...new Set(indexes)];
  if (unique.length === 1) return MOTO_DISPLACEMENT_FACETS[unique[0]!]!.band;
  if (unique.length === 2 && unique[1]! - unique[0]! === 1) return MOTO_DISPLACEMENT_FACETS[unique[0]!]!.band;
  return null;
}

/**
 * La taxonomía de tipos es la de Mercado Libre (faceta `MOTO_TYPE`), no una propia: el origen ya
 * publica la suya y es la que eligió el vendedor al publicar. Los identificadores y los volúmenes
 * son los medidos el 2026-09-22 sobre los 1.391 avisos usados.
 *
 * `title` es la palabra con la que el título nombra ese mismo tipo, para los avisos que la corrida
 * no alcanzó a barrer por faceta: es evidencia de SEGUNDA (`typeBasis: "title"`), nunca se mezcla
 * con la del origen y la tarjeta la puede imprimir con un "≈", igual que la carrocería de autos.
 */
export const MOTO_TYPES: ReadonlyArray<{ id: string; type: MotoType; label: string; adverts: number; title: RegExp }> = [
  { id: "2343326", type: "calle", label: "Calle", adverts: 236, title: /\bde calle\b/ },
  { id: "381238", type: "naked", label: "Naked", adverts: 208, title: /\bnaked\b/ },
  { id: "494426", type: "doble-proposito", label: "Doble propósito", adverts: 99, title: /\b(doble proposito|multiproposito|dual ?sport|adventure)\b/ },
  { id: "381239", type: "scooter", label: "Scooter", adverts: 89, title: /\b(scooters?|ciclomotor|motoneta)\b/ },
  { id: "399551", type: "deportiva", label: "Deportiva", adverts: 88, title: /\b(deportivas?|supersport)\b/ },
  { id: "399550", type: "custom", label: "Custom", adverts: 81, title: /\bcustom\b/ },
  { id: "381234", type: "cross", label: "Cross", adverts: 74, title: /\b(cross|motocross|mx)\b/ },
  { id: "381240", type: "turismo", label: "Turismo", adverts: 56, title: /\b(turismo|touring)\b/ },
  { id: "381237", type: "enduro", label: "Enduro", adverts: 40, title: /\benduro\b/ },
  { id: "399555", type: "trial", label: "Trial", adverts: 25, title: /\btrial\b/ },
  { id: "381233", type: "chopper", label: "Chopper", adverts: 19, title: /\bchopper\b/ },
  { id: "494425", type: "crucero", label: "Crucero", adverts: 5, title: /\bcrucero\b/ },
  { id: "399552", type: "mini", label: "Mini moto", adverts: 3, title: /\b(mini ?moto|pit ?bike)\b/ },
];

/**
 * Los tres tipos de la propia taxonomía de ML que NO son una moto: cuatriciclo (26 avisos),
 * triciclo (5) y motocarro (1). Se excluyen por faceta y no por título, y la razón está medida: de
 * los 23 títulos distintos de esas tres facetas, **16 no nombran su clase en ninguna parte** —
 * "Can Am Outlander Max 850", "Honda Trx 420", "Kawasaki Brute Force 750i V-twin", "Suzuki Lt500r",
 * "Segway Villain Sx10", "Yumbo Cargo 200cc", "Zanella Tricargo 200 Cc", "Yumbo Milistone". Una
 * exclusión por palabra dejaría pasar dos de cada tres.
 *
 * Son 32 avisos de 1.391 y cuestan cuatro páginas del puente: barato para lo que compra.
 */
export const MOTO_EXCLUDED_TYPES: ReadonlyArray<{ id: string; label: string; adverts: number }> = [
  { id: "399553", label: "Cuatriciclos", adverts: 26 },
  { id: "399554", label: "Triciclos", adverts: 5 },
  { id: "494427", label: "Motocarros", adverts: 1 },
];

/**
 * Una PIEZA o un accesorio que ABRE el título. La regla y su medición son las de `IS_A_PART` en
 * autos y las de `PIEZA_ABRE_EL_TITULO` en movilidad: la pieza vale sólo si es el sujeto de la
 * oración, porque buscar la palabra en cualquier posición convierte en repuesto a todo aviso que
 * nombra su equipamiento ("con escape deportivo", "cubiertas nuevas", "baúl incluido").
 *
 * `motor` NO está en la lista, exactamente por el mismo motivo por el que autos lo dejó afuera, y
 * acá hay un ejemplo medido: "Motor Original, Carburadores Originales. Al Dia. No Permuto" (US$ 2.600,
 * 2009) es una moto entera cuyo vendedor eligió empezar hablando del motor.
 */
const PIEZA_ABRE_EL_TITULO =
  /^(casco|cascos|cubierta|cubiertas|neumatico|neumaticos|llanta|llantas|camara|camaras|escape|silenciador|espejo|espejos|manubrio|guardabarro|guardabarros|cadena|pinon|corona|disco|discos|pastilla|pastillas|amortiguador|amortiguadores|horquilla|carburador|bujia|bujias|filtro|filtros|bateria|baterias|cargador|asiento|tanque|carenado|cubre|funda|baul|alforja|alforjas|parrilla|protector|manija|maneta|palanca|puno|punos|ruleman|reten|embrague|kit|alarma|gps|guante|guantes|campera|chaleco|botas|antiparras|repuesto|repuestos|cableado|velocimetro|tablero|juego de)\b/;

/**
 * Un monopatín, un patinete o una bicicleta eléctrica NO son una moto, aunque Mercado Libre los
 * deje publicar en MLU1763: son el catálogo de `/monopatines-electricos-uruguay` y
 * `/bicicletas-electricas-uruguay`, que `currency-movilidad` ya publica.
 *
 * Medido el 2026-09-22 sobre las 34 tarjetas de la faceta `FUEL_TYPE=Eléctrico`: cuatro son
 * monopatines o bicicletas ("Monopatin Xiaomi Lite 4 Gen 2", "Monopatín Eléctrico 4 Meses De Uso",
 * "Monopatín Andando Con Su Cargador", "Bicicleta Electrica Wheele") y dos más se anuncian como las
 * dos cosas a la vez ("Moto/bici Eléctrica Michael Blast Outsider 5.0"). La palabra va DESNUDA, sin
 * ancla de posición, con el mismo argumento que `conversion` en movilidad: un aviso de moto de
 * verdad no la escribe nunca, así que no cuesta nada; y el daño del falso positivo es asimétrico —
 * un monopatín de US$ 650 metido en la banda tira el p25 para abajo, y el p25 es justo el número
 * que ancla el comparador de transporte.
 */
const OTRO_VEHICULO = /\b(monopatin|monopatines|patinete|patinetes|hoverboard|bicicleta|bicicletas|bici|e-?bike|ebike)\b/;

/**
 * Un aviso de ALQUILER, que publica un precio por mes y no un precio de venta: el mercado de motos
 * de delivery alquila por temporada. Sólo los verbos de alquilar; "mensual" y "cuotas" quedan fuera
 * a propósito porque una venta financiada los dice todo el tiempo ("Hasta 60 Cuotas", medido).
 */
const ES_ALQUILER = /\b(alquiler|alquilo|alquila|alquilamos|arriendo|arrienda|rent ?a ?moto)\b/;

/** Cuatriciclos y triciclos que SÍ se nombran en el título: el respaldo de la exclusión por faceta. */
const NO_ES_UNA_MOTO = /\b(cuatriciclo|cuatriciclos|cuadriciclo|atv|utv|side ?by ?side|triciclo|triciclos|motocarro|motocarros|karting|kart)\b/;

export type MotoRejection = "pieza" | "otro-vehiculo" | "alquiler" | "no-es-moto" | "cero-km";

/**
 * Por qué este aviso no entra al directorio de motos usadas, o null si entra.
 *
 * `cero-km` es distinto de los demás: el aviso es una moto de verdad, pero es una moto NUEVA que la
 * automotora publicó en la categoría de usados. Medido: 8 de las 100 tarjetas del listado general
 * lo dicen con todas las letras en el título ("Moto Motocicleta Benda Dark Flag 500 - 0km 100%
 * Financiada", "Zanella Zt 0 Km"). Se saca porque su precio es de moto nueva y distorsiona la banda
 * de usados; el que afirma es el vendedor y se le cree sólo a lo que escribió — un `km: 1` sin esa
 * frase NO alcanza, porque en este catálogo el 1 es el placeholder de "no declaré kilometraje"
 * (medido: "Vespa 125" de 2009, "Honda 50, C-70" de 1979 y "Moto Zanela Due 50 Cc" de 1991 vienen
 * todas con 1 km).
 */
export function motoRejection(title: string): MotoRejection | null {
  const text = wordText(title);
  const flat = fold(title);
  if (PIEZA_ABRE_EL_TITULO.test(text.trimStart())) return "pieza";
  if (OTRO_VEHICULO.test(text)) return "otro-vehiculo";
  if (ES_ALQUILER.test(text)) return "alquiler";
  if (NO_ES_UNA_MOTO.test(text)) return "no-es-moto";
  if (/(?:^|[^a-z0-9])0\s?kms?(?![a-z0-9])/.test(flat) || /\bcero\s?kms?\b/.test(text)) return "cero-km";
  return null;
}

/** El tipo que nombra el título, cuando la faceta del origen no llegó a este aviso. */
export function motoTypeFromTitle(title: string): MotoType | null {
  const text = wordText(title);
  const hits = MOTO_TYPES.filter(entry => entry.title.test(text));
  // Dos tipos nombrados en el mismo título ("Enduro Harenduro Motocross", medido) no deciden nada:
  // la evidencia de título es la más débil de las dos y no se arbitra entre dos palabras sueltas.
  return hits.length === 1 ? hits[0]!.type : null;
}

/**
 * La identidad de producto de la spec: `marca|modelo|cilindrada`. Sin cilindrada declarada la clave
 * lleva `sincc`, así que esa fila convive con las demás del modelo pero NUNCA entra a una cohorte de
 * cilindrada — que es la regla de "precisión sobre recall" escrita como dato y no como comentario.
 */
export function motoProductKey(brand: string, model: string, displacement: number | null): string {
  return `${slugify(brand)}|${slugify(model)}|${displacement ?? "sincc"}`;
}
