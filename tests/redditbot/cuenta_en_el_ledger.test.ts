// El ledger sobrevive al cambio de cuenta; las decisiones no.
//
// Cuando el bot pasó de `AskUruguayanBot` a `SizeSouthern112`, la primera corrida en vivo salió
// "run bloqueado: paused". El motivo guardado era "todos los comentarios invisibles para terceros
// (¿shadowban?)" — cierto, y sobre la OTRA cuenta: a la vieja le borraba todo AutoModerator por no
// tener karma, que es exactamente el problema que el cambio de cuenta venía a resolver. El pasado de
// una cuenta silenció a la otra cuarenta y ocho horas.
//
// Tres consultas tenían el mismo defecto y las tres se arreglan igual: la cuenta se guarda en cada
// fila, y lo que pregunta "cómo me está yendo" filtra por ella. Lo que pregunta "¿ya hablamos en
// este hilo?" NO filtra, y eso también se verifica acá: para quien lee el hilo somos un solo sitio.
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const ledger = readFileSync(join(__dirname, "..", "..", "classes", "redditbot", "ledger.ts"), "utf8");
const model = readFileSync(join(__dirname, "..", "..", "classes", "models", "RedditBotReply.ts"), "utf8");

/** El cuerpo de una función exportada del ledger, para poder afirmar sobre UNA y no sobre el archivo. */
function bodyOf(name: string): string {
  const start = ledger.indexOf(`export async function ${name}`);
  expect(start, `no existe ${name}`).toBeGreaterThan(-1);
  const next = ledger.indexOf("\nexport ", start + 10);
  return ledger.slice(start, next === -1 ? undefined : next);
}

describe("la cuenta viaja en cada fila del ledger", () => {
  it("el modelo la guarda y la indexa", () => {
    expect(model).toContain("account: string;");
    expect(model).toMatch(/account:\s*\{\s*type:\s*String/);
    // Sin índice, el filtro por cuenta convierte cada corrida en un scan de la colección entera.
    expect(model).toContain("index({ account: 1, status: 1, postedAt: -1 })");
  });

  it("se estampa en un solo lugar, no en cada llamador", () => {
    // Son diez sitios que escriben decisiones. Bastaría que uno se olvide para que su fila quede
    // huérfana: fuera de los cupos y fuera de las estadísticas.
    expect(bodyOf("recordDecision")).toContain("botConfig().username");
  });
});

describe("lo que pregunta 'cómo me está yendo' filtra por cuenta", () => {
  for (const fn of ["readSnapshot", "lastLinkedAt", "lastRepliedToAuthorAt", "postedWithin"]) {
    it(`${fn} sólo mira las filas de la cuenta actual`, () => {
      expect(bodyOf(fn)).toContain("ofCurrentAccount()");
    });
  }

  it("la pausa del breaker es por cuenta", () => {
    // Una pausa es una afirmación sobre cómo le está yendo a UNA cuenta. La fila global vieja sigue
    // en la base y deja de aplicar sola, que es lo correcto: era sobre otra cuenta.
    expect(ledger).toContain("`__paused__:${botConfig().username}`");
    expect(bodyOf("readPausedUntil")).toContain("pauseSentinel()");
    expect(bodyOf("pauseUntil")).toContain("pauseSentinel()");
  });
});

describe("lo que pregunta '¿ya hablamos acá?' NO filtra por cuenta", () => {
  // Es la distinción entera. Un hilo donde ya comentó la cuenta anterior está hablado: dos
  // comentarios con el mismo enlace desde dos cuentas distintas es peor que uno, no mejor.
  for (const fn of ["seenPostIds", "hasPostedTo"]) {
    it(`${fn} mira todas las filas`, () => {
      expect(bodyOf(fn)).not.toContain("ofCurrentAccount()");
    });
  }
});
