// Los diales de la pregunta diaria.
//
// Interruptor PROPIO, no heredado del bot de comentarios. Publicar un hilo es un acto distinto de
// comentar en uno ajeno: se ve más, dura más y si sale mal deja rastro en la cuenta. Que encender
// una cosa encienda la otra sería exactamente la clase de sorpresa que no se quiere en algo que
// habla en nombre de un sitio.

const num = (name: string, fallback: number): number => {
  const raw = Number(process.env[name]);
  return Number.isFinite(raw) ? raw : fallback;
};

export interface AskConfig {
  enabled: boolean;
  dryRun: boolean;
  sub: string;
  /** Horas mínimas entre dos posts nuestros. Una por día es una por día, no dos por las dudas. */
  minGapHours: number;
  /** Rondas de candidatas antes de rendirse. Cada ronda es una llamada a Claude. */
  maxAttempts: number;
  /** Parecido máximo con un título que ya existe. Ver novelty.ts. */
  noveltyLimit: number;
  model: "sonnet" | "opus";
}

export function askConfig(): AskConfig {
  return {
    enabled: process.env.REDDIT_ASK_ENABLED === "1",
    // Default TRUE, igual que el resto: desplegar el archivo no puede ser lo que empieza a publicar.
    dryRun: process.env.REDDIT_ASK_DRY_RUN !== "0",
    sub: (process.env.REDDIT_ASK_SUB || "AskUruguayan").trim(),
    minGapHours: num("REDDIT_ASK_MIN_GAP_HOURS", 20),
    maxAttempts: num("REDDIT_ASK_MAX_ATTEMPTS", 2),
    noveltyLimit: num("REDDIT_ASK_NOVELTY_LIMIT", 0.45),
    // Opus por pedido explícito, y acá se justifica: es UNA llamada por día, contra las 200 diarias
    // que comparte el endpoint con el uso interactivo de una persona. El pase de comentarios, que
    // corre veinte veces al día, sigue en el default del servidor.
    model: (process.env.REDDIT_ASK_MODEL || "opus").trim() === "sonnet" ? "sonnet" : "opus",
  };
}
