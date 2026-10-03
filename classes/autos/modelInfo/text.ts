// Comparar nombres de modelo contra títulos ajenos (Wikipedia, YouTube) sin acentos ni signos.

export const normalizeText = (value: string): string =>
  value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

const compact = (value: string): string => normalizeText(value).replace(/ /g, "");

const hasWords = (haystack: string, needle: string): boolean => {
  const words = normalizeText(needle).split(" ").filter(Boolean);
  if (!words.length) return false;
  const padded = ` ${normalizeText(haystack)} `;
  return words.every((word) => padded.includes(` ${word} `));
};

/**
 * Palabras comunes que también son nombres de modelo: "uno", "up", "ka", "one". Un título que dice
 * "probamos uno de los más vendidos" no habla del Fiat Uno; con estas hace falta la marca al lado.
 */
const COMMON_WORDS = new Set(["uno", "up", "ka", "one", "gol", "polo", "fox", "move", "sail", "go", "line", "cross", "plus", "sport"]);

/** El título nombra al modelo (con todas sus palabras, o pegadas: "HB 20" = "HB20", "CR-V" = "CRV"). */
export function namesModel(title: string, model: string): boolean {
  if (hasWords(title, model)) return true;
  const target = compact(model);
  // Pegado sólo para nombres que se escriben de varias formas ("HB 20", "CR-V") y desde tres
  // letras. Una palabra sola sin dígitos va siempre entera: pegado, "Gol" aparece dentro de "Golf".
  const variable = normalizeText(model).includes(" ") || /\d/.test(model);
  return variable && target.length >= 3 && compact(title).includes(target);
}

/**
 * El título habla de ESTE auto: nombra el modelo y, si el nombre del modelo es corto o una palabra
 * común, también la marca.
 */
export function namesCar(title: string, brand: string, model: string): boolean {
  if (!namesModel(title, model)) return false;
  const target = compact(model);
  const ambiguous = target.length < 4 || COMMON_WORDS.has(normalizeText(model));
  return !ambiguous || hasWords(title, brand) || compact(title).includes(compact(brand));
}
