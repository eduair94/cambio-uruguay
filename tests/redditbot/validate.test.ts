// The gate that decides whether a generated comment becomes public. If any suite in this repo is
// worth keeping honest, it is this one: everything it rejects is something the bot would otherwise
// have said out loud, under the site's name, to strangers.
import { describe, expect, it } from "vitest";
import { DISCLOSURE } from "../../classes/redditbot/compose";
import {
  extractLinks,
  inventedNumbers,
  numericTokens,
  trailingSignature,
  validateReply,
} from "../../classes/redditbot/validate";

const URL = "https://cambio-uruguay.com/importar-para-revender-uruguay";
const CONTEXT =
  "[/importar-para-revender-uruguay] El régimen de courier admite hasta US$ 800 y 20 kg por envío, " +
  "con un tope de 3 envíos por año y un mínimo de US$ 20 de IVA. El recargo es del 60%.";

// El comentario ya no lleva firma: la aclaración de que es un bot vive en la bio de la cuenta y
// `identity.ts` la exige antes de publicar. `body` quedó como identidad para que los tests que
// hablan de otra cosa sigan diciendo lo mismo que decían.
const body = (text: string): string => text;

/** 50 words of filler so a test about numbers is not also a test about length. */
const filler =
  "Te cuento cómo funciona esto en la práctica para que no te agarre de sorpresa cuando llegue el " +
  "paquete y tengas que decidir qué hacer con la factura y con el courier que te lo trae hasta la " +
  "puerta de tu casa sin que tengas que ir hasta el aeropuerto a buscarlo vos mismo en persona. ";

describe("redditbot/validate — numericTokens", () => {
  it("treats 1.000, 1000 and 1,000 as the same quantity", () => {
    expect(numericTokens("1.000")).toEqual(numericTokens("1000"));
    expect(numericTokens("1,000")).toEqual(numericTokens("1000"));
  });

  it("reads a lone comma as a decimal point, the way Uruguay writes it", () => {
    expect(numericTokens("23,97%")).toEqual(["23.97"]);
  });

  it("does not swallow the full stop that ends a sentence", () => {
    expect(numericTokens("Son 800.")).toEqual(["800"]);
  });

  it("finds numbers glued to a currency symbol or a unit", () => {
    expect(numericTokens("US$ 800 y 20 kg")).toEqual(["800", "20"]);
  });
});

describe("redditbot/validate — inventedNumbers", () => {
  it("says nothing when every figure came from the context", () => {
    expect(inventedNumbers("Hasta US$ 800 y 20 kg, con 60% de recargo.", CONTEXT)).toEqual([]);
  });

  it("names the figure the model made up", () => {
    expect(inventedNumbers("El recargo es del 45%.", CONTEXT)).toEqual(["45"]);
  });

  it("does not care how the figure was punctuated", () => {
    expect(inventedNumbers("Hasta US$ 800,00", CONTEXT)).toEqual([]);
  });
});

describe("redditbot/validate — extractLinks", () => {
  it("finds a bare URL", () => {
    expect(extractLinks(`mirá ${URL} ahí está`)).toEqual([URL]);
  });

  it("does not take the sentence's final period as part of the URL", () => {
    expect(extractLinks(`mirá ${URL}.`)).toEqual([URL]);
  });

  it("finds a markdown link whose target is a bare path — it still renders as a link on Reddit", () => {
    expect(extractLinks("está [acá](/importar)")).toEqual(["/importar"]);
  });
});

describe("redditbot/validate — validateReply", () => {
  const good = body(`${filler}El tope del régimen de courier es de US$ 800 por envío. ${URL}`);

  it("accepts a reply that answers first, links once, and invents nothing", () => {
    expect(validateReply({ reply: good, expectedUrl: URL, context: CONTEXT })).toEqual({ ok: true });
  });

  it("rejects a figure that is not in the context", () => {
    const reply = body(`${filler}El tope del régimen de courier es de US$ 950 por envío. ${URL}`);
    const result = validateReply({ reply, expectedUrl: URL, context: CONTEXT });
    expect(result.ok).toBe(false);
    expect(result.reason).toBe("invented_number");
    expect(result.detail).toContain("950");
  });

  it("rejects a second link", () => {
    const reply = body(`${filler}El tope es de US$ 800. ${URL} y también https://otra.com/x`);
    expect(validateReply({ reply, expectedUrl: URL, context: CONTEXT }).reason).toBe("multiple_links");
  });

  it("rejects a link to somewhere else", () => {
    const reply = body(`${filler}El tope es de US$ 800. https://example.com/otra`);
    expect(validateReply({ reply, expectedUrl: URL, context: CONTEXT }).reason).toBe("wrong_link");
  });

  it("rejects a reply with no link at all", () => {
    const reply = body(`${filler}El tope es de US$ 800 por envío.`);
    expect(validateReply({ reply, expectedUrl: URL, context: CONTEXT }).reason).toBe("no_link");
  });

  it("rechaza la firma al pie, que es lo que se sacó", () => {
    const reply = `${filler}El tope es de US$ 800. ${URL}

${DISCLOSURE}`;
    expect(validateReply({ reply, expectedUrl: URL, context: CONTEXT }).reason).toBe("trailing_signature");
  });

  it("rechaza también una firma inventada por el modelo, que es la que de verdad aparece", () => {
    const reply = `${filler}El tope es de US$ 800. ${URL}

— soy un bot que responde dudas de plata`;
    expect(validateReply({ reply, expectedUrl: URL, context: CONTEXT }).reason).toBe("trailing_signature");
  });

  it("acepta el mismo comentario sin la firma", () => {
    const reply = `${filler}El tope es de US$ 800. ${URL}`;
    expect(validateReply({ reply, expectedUrl: URL, context: CONTEXT })).toEqual({ ok: true });
  });

  it("rejects a two-line link drop — a comment that gives nothing is spam with extra steps", () => {
    expect(validateReply({ reply: body(`Mirá acá: ${URL}`), expectedUrl: URL, context: CONTEXT }).reason).toBe("too_short");
  });

  it("rejects an essay", () => {
    const reply = body(`${filler.repeat(6)}${URL}`);
    expect(validateReply({ reply, expectedUrl: URL, context: CONTEXT }).reason).toBe("too_long");
  });

  it("rejects the chatbot openers", () => {
    const reply = body(`¡Excelente pregunta! ${filler}El tope es de US$ 800. ${URL}`);
    expect(validateReply({ reply, expectedUrl: URL, context: CONTEXT }).reason).toBe("banned_phrase");
  });

  it("catches the opener even when it was written with different accents", () => {
    const reply = body(`Espero que estés bien. ${filler}El tope es de US$ 800. ${URL}`);
    expect(validateReply({ reply, expectedUrl: URL, context: CONTEXT }).reason).toBe("banned_phrase");
  });

  it("rejects tuteo — the single most reliable tell that nobody here wrote it", () => {
    const reply = body(`${filler}Ten en cuenta que el tope es de US$ 800 por envío. ${URL}`);
    const result = validateReply({ reply, expectedUrl: URL, context: CONTEXT });
    expect(result.reason).toBe("tuteo");
    expect(result.detail).toBe("ten en cuenta");
  });

  it("catches tuteo written with accents", () => {
    const reply = body(`${filler}Si querés traerlo vos, tú puedes hacerlo hasta US$ 800. ${URL}`);
    expect(validateReply({ reply, expectedUrl: URL, context: CONTEXT }).reason).toBe("tuteo");
  });

  it("does not mistake third-person 'puede' or 'tiene' for tuteo", () => {
    const reply = body(`${filler}El courier puede cobrarte aparte y el envío tiene un tope de US$ 800. ${URL}`);
    expect(validateReply({ reply, expectedUrl: URL, context: CONTEXT })).toEqual({ ok: true });
  });

  it("accepts voseo, which is the point", () => {
    const reply = body(`${filler}Si lo traés por courier tenés hasta US$ 800 por envío, fijate el peso. ${URL}`);
    expect(validateReply({ reply, expectedUrl: URL, context: CONTEXT })).toEqual({ ok: true });
  });

  it("rejects a bulleted answer — a comment is a paragraph, not a report", () => {
    const reply = body(`Te resumo:\n- El tope es de US$ 800\n- El peso es 20 kg\n${filler}${URL}`);
    expect(validateReply({ reply, expectedUrl: URL, context: CONTEXT }).reason).toBe("bullet_list");
  });

  it("rejects a numbered list too", () => {
    const reply = body(`${filler}\n1. Primero esto\n2. Después lo otro\n${URL}`);
    expect(validateReply({ reply, expectedUrl: URL, context: CONTEXT }).reason).toBe("bullet_list");
  });

  it("does not mistake a hyphenated word at the start of a line for a bullet", () => {
    const reply = body(`${filler}El tope es de US$ 800.\ne-commerce incluido. ${URL}`);
    expect(validateReply({ reply, expectedUrl: URL, context: CONTEXT })).toEqual({ ok: true });
  });

  it("rejects emojis", () => {
    const reply = body(`${filler}El tope es de US$ 800 por envío 🚀 ${URL}`);
    expect(validateReply({ reply, expectedUrl: URL, context: CONTEXT }).reason).toBe("emoji");
  });

  it("rejects the manual-sounding connectors", () => {
    for (const phrase of ["Es importante destacar que", "Cabe mencionar que", "En definitiva,"]) {
      const reply = body(`${filler}${phrase} el tope es de US$ 800. ${URL}`);
      expect(validateReply({ reply, expectedUrl: URL, context: CONTEXT }).reason).toBe("banned_phrase");
    }
  });

  it("rejects the empty referral to a professional", () => {
    const reply = body(`${filler}El tope es de US$ 800. Te recomiendo consultar con un profesional. ${URL}`);
    expect(validateReply({ reply, expectedUrl: URL, context: CONTEXT }).reason).toBe("banned_phrase");
  });

  it("rejects markdown headings", () => {
    const reply = body(`## Respuesta\n${filler}El tope es de US$ 800. ${URL}`);
    expect(validateReply({ reply, expectedUrl: URL, context: CONTEXT }).reason).toBe("markdown_heading");
  });

  it("rejects an empty reply", () => {
    expect(validateReply({ reply: "   ", expectedUrl: URL, context: CONTEXT }).reason).toBe("empty");
  });

  it("lets the reply echo a number the person themselves wrote", () => {
    // The case that made this rule: asked about a US$ 19,15 order billed at 26, the model wrote
    // "con 19,15 dólares ya estás pagando el mínimo… y ahí te da cerca de los 26 que te piden".
    // Neither figure is in our pages; both came from the poster. Rejecting that would throw out the
    // one reply that proved it had read the thread.
    const reply = body(`${filler}Con esos 19,15 pagás el mínimo de US$ 20 y por eso te dan 26. ${URL}`);
    const post = "Compré unos auriculares a 19,15 dólares y me piden 26 para retirarlo.";
    expect(validateReply({ reply, expectedUrl: URL, context: CONTEXT, postText: post })).toEqual({ ok: true });
  });

  it("still rejects a figure that is in neither the context nor the post", () => {
    const reply = body(`${filler}Con esos 19,15 pagás un cargo fijo de US$ 47. ${URL}`);
    const post = "Compré unos auriculares a 19,15 dólares y me piden 26 para retirarlo.";
    const result = validateReply({ reply, expectedUrl: URL, context: CONTEXT, postText: post });
    expect(result.reason).toBe("invented_number");
    expect(result.detail).toContain("47");
  });

  it("does not count digits inside the URL as invented figures", () => {
    const dated = "https://cambio-uruguay.com/decreto-50-026";
    const reply = body(`${filler}El tope es de US$ 800 por envío. ${dated}`);
    expect(validateReply({ reply, expectedUrl: dated, context: CONTEXT })).toEqual({ ok: true });
  });
});

describe("redditbot/validate — trailingSignature", () => {
  it("no confunde una oración común que nombra el sitio con una firma", () => {
    // Sin guión inicial no es una firma, es el final de la respuesta. Confundirlos rechazaría los
    // comentarios que enlazan bien.
    expect(trailingSignature("El detalle está en cambio-uruguay.com y ahí lo ves.")).toBeNull();
  });

  it("no marca una raya que no nos nombra", () => {
    expect(trailingSignature("Contestá si te queda alguna duda.\n\n— igual fijate el vencimiento")).toBeNull();
  });

  it("no marca nada cuando el comentario es una sola línea", () => {
    expect(trailingSignature("— bot de cambio-uruguay.com")).toBeNull();
  });

  it("marca la raya final que nos nombra", () => {
    expect(trailingSignature("Respuesta larga acá.\n\n— bot de cambio-uruguay.com, corregime")).toContain("bot de");
  });
});
