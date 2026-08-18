// La pregunta diaria: qué se considera repetido y qué post no sale nunca.
//
// La medida de novedad es el corazón del pedido ("validando que no sea algo repetitivo") y es lo
// único que el modelo no puede hacer solo: al modelo la pregunta obvia le parece original, porque
// es obvia. Los tests fijan dónde está la línea entre compartir tema y repetir pregunta.
import { describe, expect, it } from "vitest";
import { checkNovelty, contentWords, similarity } from "../../classes/redditbot/ask/novelty";
import { askRetryHint, validateAsk } from "../../classes/redditbot/ask/validate";
import { todayInMontevideo } from "../../classes/redditbot/ask/run";
import { hasEngagement } from "../../classes/redditbot/ask/reap";

describe("ask/novelty — ¿esto ya se preguntó?", () => {
  it("ignora las palabras que están en todos los títulos del sub", () => {
    // "uruguay" y "gente" no distinguen nada acá: si contaran, cualquier par de títulos del sub
    // parecería la misma pregunta.
    expect(contentWords("¿Qué opinan los uruguayos de la gente que hace esto?")).not.toContain("uruguayos");
    expect(contentWords("¿Cuánto pagan de alquiler en Montevideo?")).toContain("alquiler");
  });

  it("detecta la misma pregunta con otras palabras", () => {
    const a = "¿Cuál es la comida uruguaya más sobrevalorada?";
    const b = "¿Qué comida uruguaya está sobrevalorada según ustedes?";
    expect(similarity(a, b)).toBeGreaterThan(0.45);
  });

  it("no confunde dos preguntas del mismo tema", () => {
    // Compartir tema es inevitable en un país chico; compartir pregunta es repetirse.
    const a = "¿Cuánto pagan de alquiler en Montevideo?";
    const b = "¿Qué barrio de Montevideo les parece el más lindo para vivir?";
    expect(similarity(a, b)).toBeLessThan(0.45);
  });

  it("marca como repetida la que se parece a algo ya publicado", () => {
    const existentes = [
      "¿Qué lugar turístico de Uruguay está sobrevalorado?",
      "¿Cuál es su plato uruguayo favorito?",
      "¿Dónde consiguen repuestos de bici en Montevideo?",
    ];
    const repetida = checkNovelty("¿Qué lugar turístico del Uruguay les pareció sobrevalorado?", existentes);
    expect(repetida.fresh).toBe(false);
    expect(repetida.nearest[0].title).toContain("sobrevalorado");

    const nueva = checkNovelty("¿Qué trámite les llevó más tiempo del que esperaban?", existentes);
    expect(nueva.fresh).toBe(true);
  });

  it("con el sub vacío nada es repetido", () => {
    expect(checkNovelty("¿Qué costumbre uruguaya extrañan cuando viajan?", []).fresh).toBe(true);
  });
});

describe("ask/validate — qué post no sale nunca", () => {
  const body = "Me quedé pensando en esto ayer y no tengo idea de qué me van a contestar.";

  it("deja pasar una pregunta abierta y de vos", () => {
    expect(validateAsk("¿Qué trámite les llevó mucho más tiempo del que esperaban?", body).ok).toBe(true);
  });

  it("no publica algo que no pregunta nada", () => {
    expect(validateAsk("Les cuento lo que me pasó ayer en el ómnibus", body).reason).toBe("not_a_question");
  });

  it("acepta la pregunta sin signo cuando arranca preguntando", () => {
    expect(validateAsk("Qué trámite les llevó mucho más tiempo del que esperaban", body).ok).toBe(true);
  });

  it("no toca política, que en un sub de país es una pelea garantizada", () => {
    expect(validateAsk("¿Qué opinan de lo que dijo el presidente esta semana?", body).reason).toBe("politics");
    expect(validateAsk("¿Cómo los afectó la última decisión del gobierno?", body).reason).toBe("politics");
  });

  it("rechaza la pregunta de sí o no: da cien síes y cien noes, no conversación", () => {
    expect(validateAsk("¿Es normal que me cobren esto en el super?", body).reason).toBe("yes_no");
    expect(validateAsk("¿Soy el único al que le pasa esto con el ómnibus?", body).reason).toBe("yes_no");
  });

  it("rechaza enlaces y menciones del sitio", () => {
    expect(validateAsk("¿Qué opinan de esto?", "Lo vi en https://cambio-uruguay.com y me quedé pensando.").reason).toBe("has_link");
    expect(validateAsk("¿Qué trámite les llevó más tiempo?", "Lo leí en cambio uruguay el otro día.").reason).toBe("mentions_site");
  });

  it("rechaza el tuteo y los emojis", () => {
    expect(validateAsk("¿Qué trámite les llevó más tiempo?", "Si tienes uno peor, contámelo.").reason).toBe("tuteo");
    expect(validateAsk("¿Qué trámite les llevó más tiempo? 🇺🇾", body).reason).toBe("emoji");
  });

  it("rechaza el título que se corta en el celular", () => {
    const largo = `¿${"Qué trámite les llevó muchísimo más tiempo del que esperaban ".repeat(4)}?`;
    expect(validateAsk(largo, body).reason).toBe("title_too_long");
  });

  it("le explica al modelo qué corregir", () => {
    expect(askRetryHint({ ok: false, reason: "yes_no", detail: "es normal que" })).toContain("sí o no");
    expect(askRetryHint({ ok: false, reason: "repetitive", detail: 'se parece a "x"' })).toContain("ya se hizo");
  });
});

describe("ask/run — el hoy que importa", () => {
  it("fecha en Montevideo, no en UTC", () => {
    // El cron corre en UTC; a las 23:30 de Montevideo, "hoy" en UTC ya es mañana, y el post pediría
    // noticias de un día que todavía no pasó.
    const tarde = new Date("2026-08-18T02:30:00Z"); // 23:30 del 17 en Montevideo
    expect(todayInMontevideo(tarde)).toContain("17");
  });
});

describe("ask/reap — qué cuenta como interacción", () => {
  it("un post recién nacido no tiene ninguna", () => {
    // Reddit no da cero: todo post arranca con score 1 (el voto propio) y 0 comentarios.
    expect(hasEngagement({ score: 1, numComments: 0 })).toBe(false);
  });

  it("un comentario alcanza, y un voto también", () => {
    expect(hasEngagement({ score: 1, numComments: 1 })).toBe(true);
    expect(hasEngagement({ score: 2, numComments: 0 })).toBe(true);
  });

  it("un voto negativo es interacción: alguien lo leyó y decidió algo", () => {
    // No se borra un hilo que la gente contestó aunque haya salido mal — eso sería borrar el
    // trabajo de quien se tomó la molestia de responder.
    expect(hasEngagement({ score: 0, numComments: 3 })).toBe(true);
  });

  it("el hundido sin respuestas sí se retira", () => {
    expect(hasEngagement({ score: 0, numComments: 0 })).toBe(false);
  });
});
