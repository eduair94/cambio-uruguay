// El histórico del bot de Reddit: qué se guarda, y por qué guardarlo es distinto de consultarlo.
//
// El ledger (`redditbotreplies`) ya tiene una fila por hilo evaluado, en esta misma base. La
// tentación obvia es que la página agregue en vivo y listo. Lo que este archivo fija es la razón por
// la que no: el ledger es memoria OPERATIVA —existe para que el bot no re-evalúe lo mismo— y el día
// que alguien borre las filas rechazadas viejas, cosa razonable, el histórico se iría con ellas.
//
// De ahí la única regla que no puede aflojarse: los días se MEZCLAN contra lo ya guardado, no se
// recalculan enteros.
import { describe, expect, it } from "vitest";
import { mergeDays, dayKey } from "../classes/redditstats/refresh";

const day = (date: string, posted = 0, gaps = 0) => ({
  date,
  posted,
  rejected: 0,
  gaps,
  score: 0,
  removed: 0,
});

describe("redditstats — el histórico sobrevive al ledger", () => {
  it("conserva un día guardado que el recálculo ya no ve", () => {
    // El caso entero: las filas del 1 se borraron, así que el recálculo no lo trae. Si `mergeDays`
    // devolviera sólo lo fresco, ese día desaparecería del gráfico para siempre.
    const stored = [day("2026-08-01", 3), day("2026-08-02", 1)];
    const fresh = [day("2026-08-02", 1), day("2026-08-03", 4)];

    const merged = mergeDays(stored, fresh);
    expect(merged.map(d => d.date)).toEqual(["2026-08-01", "2026-08-02", "2026-08-03"]);
    expect(merged.find(d => d.date === "2026-08-01")!.posted).toBe(3);
  });

  it("el recálculo gana cuando el día existe en los dos", () => {
    // El fresco es el que vio las filas: si un comentario se borró o cambió de votos, el número
    // nuevo es el bueno.
    const merged = mergeDays([day("2026-08-02", 1)], [day("2026-08-02", 5)]);
    expect(merged).toHaveLength(1);
    expect(merged[0]!.posted).toBe(5);
  });

  it("devuelve los días en orden, que es como los lee un gráfico", () => {
    const merged = mergeDays([day("2026-08-10")], [day("2026-08-03"), day("2026-08-07")]);
    expect(merged.map(d => d.date)).toEqual(["2026-08-03", "2026-08-07", "2026-08-10"]);
  });

  it("no inventa días: sin datos, no hay histórico", () => {
    expect(mergeDays([], [])).toEqual([]);
  });
});

describe("redditstats — la fecha de un día", () => {
  it("es UTC, para que el corte no dependa de dónde corra el job", () => {
    // 23:30 UTC del 19 es todavía el 19, aunque en Montevideo sean las 20:30 y en Tokio ya sea el 20.
    expect(dayKey(new Date("2026-08-19T23:30:00Z"))).toBe("2026-08-19");
    expect(dayKey(new Date("2026-08-20T00:10:00Z"))).toBe("2026-08-20");
  });
});
