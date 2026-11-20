import { describe, expect, it } from "vitest";
import { buildFeedbackBlock, FEEDBACK_PIPELINES, runFeedback } from "../../classes/insights/sources/feedback";

const FROM = new Date("2026-10-24T03:00:00Z");
const TO = new Date("2026-11-21T03:00:00Z");

describe("pipelines de sitefeedbacks", () => {
  it("proyectan justo después del $match y nunca leen el texto", () => {
    const byPath = FEEDBACK_PIPELINES.byPath(FROM, TO);
    const byDay = FEEDBACK_PIPELINES.byDay(FROM, TO);
    expect(Object.keys(byPath[0])).toEqual(["$match"]);
    expect(byPath[1].$project).toEqual({ _id: 0, path: 1, kind: 1, helpful: 1, createdAt: 1, clientId: 1 });
    expect(byDay[1].$project).toEqual({ _id: 0, kind: 1, helpful: 1, createdAt: 1 });
    const s = JSON.stringify([byPath, byDay]);
    expect(s).not.toMatch(/message|email|userAgent|tech/);
  });

  it("clientId sólo vive dentro del $group y sale como un conteo", () => {
    const byPath = FEEDBACK_PIPELINES.byPath(FROM, TO);
    const groupAt = byPath.findIndex((st) => "$group" in st);
    expect(JSON.stringify(byPath[groupAt].$group.ids)).toBe(JSON.stringify({ $addToSet: { $ifNull: ["$clientId", "__sin_id__"] } }));
    const last = byPath[byPath.length - 1];
    expect(Object.keys(last.$project).sort()).toEqual(["_id", "distinct", "last", "n"]);
    for (const st of byPath.slice(groupAt + 1)) expect(JSON.stringify(st)).not.toMatch(/clientId|"ids"/);
  });

  it("las respuestas sin clientId cuentan como una persona", () => {
    // Lo que haría Mongo: $addToSet con $ifNull junta todos los null en "__sin_id__".
    const answers = [null, null, null, "a"];
    const ids = new Set(answers.map((c) => c ?? "__sin_id__"));
    expect(ids.size).toBe(2);
  });
});

describe("buildFeedbackBlock", () => {
  it("suma por ruta, se queda con el distinct mayor y cuenta los textos sin leerlos", () => {
    const data = buildFeedbackBlock(
      [
        { _id: { path: "/a", kind: "helpful", helpful: "no" }, n: 5, distinct: 2, last: new Date("2026-11-19T10:00:00Z") },
        { _id: { path: "/a?utm=x", kind: "helpful", helpful: "no" }, n: 3, distinct: 3, last: new Date("2026-11-20T10:00:00Z") },
        { _id: { path: "/a", kind: "helpful", helpful: "yes" }, n: 4, distinct: 4 },
        { _id: { path: "/a", kind: "bug", helpful: null }, n: 1, distinct: 1 },
      ],
      [
        { _id: { day: "2026-11-20", kind: "helpful", helpful: "no" }, n: 8 },
        { _id: { day: "2026-11-20", kind: "suggestion", helpful: null }, n: 2 },
      ]
    );
    expect(data.totals).toEqual({ helpfulYes: 4, helpfulNo: 8, suggestion: 0, bug: 1, praise: 0 });
    expect(data.pages[0]).toMatchObject({
      path: "/a",
      helpfulNo: 8,
      distinctNo: 3,
      helpfulYes: 4,
      bug: 1,
      last: "2026-11-20T10:00:00.000Z",
    });
    expect(data.daily).toEqual([{ day: "2026-11-20", helpfulYes: 0, helpfulNo: 8, written: 2 }]);
  });

  it("sin base: skipped; cero filas es una respuesta real", async () => {
    const w = { start: "2026-10-24", end: "2026-11-20", days: 28, tz: "America/Montevideo" as const };
    expect((await runFeedback(w, null)).kind).toBe("skipped");
    const ok = await runFeedback(w, async () => []);
    expect(ok.kind).toBe("ok");
  });
});
