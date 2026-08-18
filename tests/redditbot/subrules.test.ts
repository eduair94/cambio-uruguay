// El portón que faltaba: dónde NO puede hablar esta cuenta.
//
// Escrito después de que r/AskUruguayan baneara permanentemente a la cuenta el 18 de agosto de
// 2026. Lo que estos tests fijan no es el ban en sí —eso es un dato— sino las dos formas en que el
// código podía volver a meterse donde no lo quieren: reintentando un sub que ya baneó, y entrando
// a uno que lo prohíbe por escrito en unas reglas que el propio código ya sabía leer.
import { describe, expect, it, vi } from "vitest";
import { BANNED_SUBS, looksLikeBan, subWritable } from "../../classes/redditbot/subrules";

vi.mock("../../classes/reddit", () => ({
  fetchSubredditRules: vi.fn(async (sub: string) => {
    if (sub === "CharruaDevs") {
      return [
        "Autopromoción y spam: Está permitido publicitar sus proyectos siempre que no resulten excesivos.",
        "Bots y pruebas: No está permitido probar bots ni otros programas dentro del sub, para ello se deberá designar un espacio apropiado.",
      ];
    }
    if (sub === "uruguay") return ["Respeto: no se permiten agresiones.", "Spam: no publiques lo mismo cinco veces."];
    if (sub === "caido") return [];
    return ["Regla cualquiera."];
  }),
}));

describe("subrules — el sub que ya nos baneó", () => {
  it("r/AskUruguayan está en la lista y no se reintenta", async () => {
    // Escribir en un sub que te baneó no es un error recuperable: es evasión de ban, y Reddit la
    // sanciona a nivel de cuenta y de dominio.
    expect(BANNED_SUBS.has("askuruguayan")).toBe(true);
    const verdict = await subWritable("AskUruguayan");
    expect(verdict.allowed).toBe(false);
    expect(verdict.reason).toContain("baneada");
  });

  it("no depende de cómo esté escrito el nombre", async () => {
    expect((await subWritable("askuruguayan")).allowed).toBe(false);
    expect((await subWritable("AskUruguayan")).allowed).toBe(false);
  });
});

describe("subrules — el sub que lo dice por escrito", () => {
  it("r/CharruaDevs prohíbe probar bots y queda afuera", async () => {
    // Estaba publicado en la API desde siempre, y el código que lee las reglas ya existía: se usaba
    // para redactar mejor, nunca para decidir si se podía hablar.
    const verdict = await subWritable("CharruaDevs");
    expect(verdict.allowed).toBe(false);
    expect(verdict.reason).toContain("no está permitido probar bots");
  });

  it("un sub sin esa regla sigue habilitado", async () => {
    expect((await subWritable("uruguay")).allowed).toBe(true);
  });

  it("si no se pueden leer las reglas no se apaga todo", async () => {
    // Negar por no haber podido leer apagaría el trabajo entero cada vez que la API tosa; lo que de
    // verdad protege —el registro de baneos— no depende de la red.
    expect((await subWritable("caido")).allowed).toBe(true);
  });
});

describe("subrules — reconocer un ban cuando Reddit lo dice", () => {
  it("SUBREDDIT_NOTALLOWED es un ban, no un fallo cualquiera", () => {
    // Reddit lo manda dentro de un 200. Un pase que sólo mira res.ok lo reintenta mañana, y pasado,
    // que es el patrón por el que un ban de sub escala a una suspensión de cuenta.
    expect(looksLikeBan([["SUBREDDIT_NOTALLOWED", "you aren't allowed to post there", "sr"]])).toBe(true);
    expect(looksLikeBan([["USER_BANNED", "banned", null]])).toBe(true);
  });

  it("un rate limit no es un ban", () => {
    expect(looksLikeBan([["RATELIMIT", "you are doing that too much", "ratelimit"]])).toBe(false);
    expect(looksLikeBan([])).toBe(false);
    expect(looksLikeBan(undefined)).toBe(false);
  });
});
