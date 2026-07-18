// The admin-facing summary of one weekly run: one Telegram line per STATE CHANGE, nothing on a quiet
// week. Kept pure and separate from sync_aduana.ts so the exact copy is unit-tested — an alert that
// silently stops firing is the failure mode this whole feature exists to prevent.
import type { NormCandidate } from "./discover";

export interface AlertInput {
  /** Facts the guardrail auto-published this run. */
  published: { id: string; value: number | string; prevValue: number | string }[];
  /** Fact ids the AI wants to change but could not safely publish — a human must look. */
  flagged: string[];
  /** Resoluciones newer than we cite, surfaced by discovery. */
  discovered: NormCandidate[];
}

export function buildAlerts(input: AlertInput): string[] {
  const msgs: string[] = [];

  for (const p of input.published) {
    msgs.push(
      `🟢 *Aduana — auto-publicado* \`${p.id}\` = ${p.value} (antes: ${p.prevValue}). ` +
        `2 fuentes oficiales independientes. Sin verificación humana: confirmá o revertí editando \`baseline.ts\`.`
    );
  }

  if (input.flagged.length) {
    msgs.push(
      `🟡 *Aduana — necesita revisión humana*: ${input.flagged.join(", ")}. ` +
        `La IA detectó un posible cambio que no pudo publicar con seguridad.`
    );
  }

  if (input.discovered.length) {
    const list = input.discovered.map((d) => d.title || d.url).join(", ");
    msgs.push(`🔵 *Aduana — resolución(es) nueva(s) detectada(s)*: ${list}`);
  }

  return msgs;
}
