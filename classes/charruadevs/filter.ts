// Qué entra al corpus. Todos los posts se clasifican; de los comentarios, sólo los "candidatos":
// los que usan palabras de trabajo/mercado o cuelgan de un hilo que es de mercado. Medido sobre el
// historial completo (2026-09-15): 140k de 207k comentarios pasan; el resto es charla técnica pura.
const KEYWORDS =
  /(\bIA\b|\bAI\b|inteligencia artificial|chatgpt|gpt|copilot|claude|cursor|llm|vibe ?cod|agente|laburo|trabaj|mercado|junior|senior|trainee|sueldo|salari|pagan|cobr|tarifa|despid|layoff|recort|echar|contrat|busc|entrevist|oferta|postul|ghost|saturad|futuro|reemplaz|carrera|estudi|facultad|fing|ort|bootcamp|contractor|exterior|afuera|remoto|d[oó]lar|usd|u\$s|crisis|burbuja|freelance|empleo|desemple|rubro|industria|profesi[oó]n|irse|emigr|burnout|quemad)/i;
const MARKET_THREAD =
  /(laburo|trabaj|mercado|junior|senior|trainee|sueldo|salari|despid|layoff|contrat|entrevist|oferta|carrera|estudi|facultad|contractor|exterior|remoto|empleo|\bIA\b|\bAI\b|chatgpt|futuro|rubro|industria|profesi|pagan|cobr)/i;

export function isGone(s: string | null | undefined): boolean {
  return !s || s === "[removed]" || s === "[deleted]";
}

export function isMarketThread(title: string, text: string | null | undefined): boolean {
  return MARKET_THREAD.test(`${title || ""} ${text || ""}`);
}

export function isCandidateComment(c: { body: string; author?: string }, threadIsMarket: boolean): boolean {
  if (isGone(c.body) || /^AutoModerator$/i.test(c.author || "")) return false;
  const body = c.body.trim();
  if (body.length < 12) return false;
  return KEYWORDS.test(body) || threadIsMarket;
}
