// ¿En qué idioma está escrito esto?
//
// r/AskUruguayan es el único sub que hoy acepta a la cuenta, y buena parte de lo que se pregunta ahí
// lo escriben extranjeros en inglés: mudanzas, escuelas, visas, cuánto cuesta vivir acá. La primera
// respuesta útil que dejó el bot contestaba en español impecable una pregunta hecha en inglés — se
// entiende, pero se lee como alguien que no leyó del todo, y la gracia era ser útil.
//
// El método es tonto a propósito: contar palabras funcionales, que son las que ningún texto puede
// evitar. Nada de librerías ni de modelos para decidir entre dos idiomas.

const EN = new Set([
  "the", "and", "is", "are", "was", "were", "for", "with", "that", "this", "have", "has", "had",
  "you", "your", "what", "when", "where", "how", "why", "would", "could", "should", "about",
  "there", "their", "they", "from", "been", "being", "does", "did", "doesn", "don", "just",
  "like", "know", "any", "some", "here", "much", "many", "will", "can", "get", "got",
]);

const ES = new Set([
  "que", "de", "la", "el", "en", "los", "las", "un", "una", "por", "para", "con", "es", "son",
  "se", "no", "su", "al", "lo", "como", "pero", "sus", "le", "ya", "si", "me", "sin", "sobre",
  "hay", "donde", "cuando", "porque", "muy", "mas", "esta", "este", "todo", "tiene", "ser",
  "hacer", "eso", "algo", "vos", "tenes", "podes", "acá", "aca", "nomas",
]);

export type Lang = "es" | "en";

const words = (text: string): string[] =>
  text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean);

/**
 * Español salvo prueba en contrario.
 *
 * El desempate va para el español a propósito: equivocarse hacia el español en un sub uruguayo es
 * contestar en el idioma del lugar, y equivocarse hacia el inglés es contestarle en inglés a un
 * uruguayo, que es mucho más raro de leer.
 */
export function detectLang(text: string): Lang {
  const all = words(text);
  if (all.length < 6) return "es";
  let en = 0;
  let es = 0;
  for (const word of all) {
    if (EN.has(word)) en++;
    if (ES.has(word)) es++;
  }
  return en > es * 1.5 ? "en" : "es";
}
