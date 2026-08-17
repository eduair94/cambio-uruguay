// The gate that decides whether a generated comment becomes public. If any suite in this repo is
// worth keeping honest, it is this one: everything it rejects is something the bot would otherwise
// have said out loud, under the site's name, to strangers.
import { describe, expect, it } from "vitest";
import { DISCLOSURE } from "../../classes/redditbot/compose";
import {
  extractLinks,
  inventedNumbers,
  numericTokens,
  validateReply,
} from "../../classes/redditbot/validate";

const URL = "https://cambio-uruguay.com/importar-para-revender-uruguay";
const CONTEXT =
  "[/importar-para-revender-uruguay] El régimen de courier admite hasta US$ 800 y 20 kg por envío, " +
  "con un tope de 3 envíos por año y un mínimo de US$ 20 de IVA. El recargo es del 60%.";

const body = (text: string): string => `${text}\n\n${DISCLOSURE}`;

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

  it("rejects a reply that dropped the bot disclosure", () => {
    const reply = `${filler}El tope es de US$ 800. ${URL}`;
    expect(validateReply({ reply, expectedUrl: URL, context: CONTEXT }).reason).toBe("missing_disclosure");
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

  it("rejects markdown headings", () => {
    const reply = body(`## Respuesta\n${filler}El tope es de US$ 800. ${URL}`);
    expect(validateReply({ reply, expectedUrl: URL, context: CONTEXT }).reason).toBe("markdown_heading");
  });

  it("rejects an empty reply", () => {
    expect(validateReply({ reply: "   ", expectedUrl: URL, context: CONTEXT }).reason).toBe("empty");
  });

  it("does not count digits inside the URL as invented figures", () => {
    const dated = "https://cambio-uruguay.com/decreto-50-026";
    const reply = body(`${filler}El tope es de US$ 800 por envío. ${dated}`);
    expect(validateReply({ reply, expectedUrl: dated, context: CONTEXT })).toEqual({ ok: true });
  });
});
