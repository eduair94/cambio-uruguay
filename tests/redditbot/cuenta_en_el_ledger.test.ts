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

describe("un comentario que retiramos nosotros no es una señal de nada", () => {
  // Segunda pausa falsa de la noche, y de manual: se borró a mano un comentario malo, el vigilante
  // lo releyó, lo encontró invisible desde afuera —que es su señal de shadowban— y pausó el bot 48 h
  // por haber hecho lo correcto. `removed` significa "lo sacó Reddit o un moderador"; retirarlo
  // nosotros es otra cosa y necesitaba su propio campo.
  it("el modelo distingue borrado por otros de retirado por nosotros", () => {
    expect(model).toContain("selfDeleted: boolean;");
    expect(model).toMatch(/selfDeleted:\s*\{\s*type:\s*Boolean/);
    expect(model).toContain("removed: boolean;");
  });

  it("el vigilante no lo relee", () => {
    expect(bodyOf("postedWithin")).toContain("selfDeleted");
  });

  it("hay una forma de marcarlo sin borrar la fila", () => {
    // Borrar la fila haría que `seenPostIds` olvide la decisión y el bot vuelva a evaluar el hilo.
    expect(ledger).toContain("export async function markSelfDeleted");
  });
});

describe("ensayar no puede gastar la cola", () => {
  // El runbook manda dejar el bot en dry-run unos días antes de prenderlo. Cada hilo ensayado
  // quedaba anotado como decidido para siempre, así que al prenderlo las mejores preguntas de la
  // semana —justo las que uno acababa de leer y aprobar en el ensayo— ya estaban descartadas. El
  // procedimiento recomendado se comía la cola, y en silencio.
  it("una fila de ensayo no frena cuando el bot ya publica", () => {
    const body = bodyOf("seenPostIds")
    expect(body).toContain('canPost()')
    expect(body).toContain('"dry_run"')
  })

  it("pero sí frena mientras se ensaya, para no re-gastar cupo cada hora", () => {
    // Los dos lados importan y por eso la condición existe: re-evaluar lo mismo cada hora gasta
    // embeddings y llamadas al juez de un cupo diario.
    expect(bodyOf("seenPostIds")).toMatch(/canPost\(\)\s*\?\s*\[.*dry_run.*\]\s*:\s*\[.*waiting_page.*\]/s)
  })
})
