// Los defectos que encontró la auditoría adversaria del 18 de agosto de 2026.
//
// Un archivo aparte a propósito. Cada uno de estos es un bug que ya estaba escrito, que pasaba el
// resto de la suite, y que se veía en producción como otra cosa: el filtro de voseo se veía como
// "el modelo escribe mal", el barrido se habría visto como "el sub nos está borrando todo". Los
// tests están agrupados por lo que se rompía, no por el archivo donde vivía la línea.

import { describe, expect, it } from "vitest";
import { hasEngagement } from "../../classes/redditbot/ask/reap";
import { validateAsk } from "../../classes/redditbot/ask/validate";
import { validateSocial } from "../../classes/redditbot/social/validate";
import { BARE_DOMAIN, TUTEO, validateReply } from "../../classes/redditbot/validate";
import { DISCLOSURE } from "../../classes/redditbot/compose";

describe("el filtro de tuteo rechazaba el voseo, que es lo que protege", () => {
  // strip() borra las tildes antes de comparar, y la tilde es lo ÚNICO que separa "hacés" de
  // "haces". Un comentario en voseo perfecto se rechazaba por tuteo; en los logs eso se lee como
  // "el modelo escribe mal", y la reacción natural habría sido tocar el prompt, que estaba bien.
  const ctx = "¿Dónde consigo repuestos de bici en Montevideo?";

  it("deja pasar el voseo con tilde", () => {
    for (const texto of [
      "Fijate que en la Ciudad Vieja hay varias casas de repuestos, ahí lo hacés en el día.",
      "Si sabés la medida exacta te lo consiguen enseguida en cualquiera de esas.",
      "Andá con la rueda, que necesitás que te la midan y así no errás el repuesto.",
    ]) {
      expect(validateSocial(texto, ctx, "util").ok, texto).toBe(true);
    }
  });

  it("pero sigue rechazando el tuteo de verdad", () => {
    for (const texto of [
      "Fijate que en la Ciudad Vieja hay varias, ahí lo haces en el día sin problema.",
      "Si sabes la medida te lo consiguen enseguida en cualquiera de esas casas.",
      "Ten en cuenta que hay que llevar la rueda para que te la midan bien primero.",
    ]) {
      expect(validateSocial(texto, ctx, "util").reason, texto).toBe("tuteo");
    }
  });

  it("la lista vieja ya no contiene las formas que dependen de la tilde", () => {
    // Si alguien las devuelve a TUTEO, el bug vuelve: esa lista se compara sin tildes.
    for (const forma of ["haces", "sabes", "necesitas", "puedes", "tienes", "debes"]) {
      expect(TUTEO, forma).not.toContain(forma);
    }
  });

  it("el bot de respuestas tampoco rechaza el voseo", () => {
    const respuesta =
      "Si traés la notebook de Estados Unidos entrás por el régimen de courier, que tiene un tope " +
      "por envío y un mínimo de IVA. Lo importante es que el tope se mide sobre el total de la " +
      "factura, no sobre lo que declarás vos, así que fijate bien el número que figura ahí antes " +
      "de comprar. Si te pasás, cambia el régimen entero y ahí ya necesitás despachante, que es " +
      "otro costo aparte. En la página está el detalle con los números actuales y una calculadora " +
      "para ver cuánto te queda: https://cambio-uruguay.com/franquicia-aduana-uruguay\n\n" +
      DISCLOSURE;
    const check = validateReply({
      reply: respuesta,
      expectedUrl: "https://cambio-uruguay.com/franquicia-aduana-uruguay",
      context: "courier tope IVA despachante factura",
    });
    expect(check.reason).not.toBe("tuteo");
  });
});

describe("un dominio escrito a mano dirige igual que un enlace", () => {
  // La regla que importa no es "no pongas URLs" sino "no mandes a la gente a otro lado", y para
  // eso alcanza con escribir el dominio: quien lo lee lo copia.
  const ctx = "¿Dónde miro la cotización del dólar?";

  it("lo detecta sin esquema", () => {
    expect(BARE_DOMAIN.test("fijate en cambio-uruguay.com que está todo")).toBe(true);
    expect(BARE_DOMAIN.test("mirá en www.brou.com.uy antes de ir")).toBe(true);
  });

  it("no confunde una frase común con un dominio", () => {
    expect(BARE_DOMAIN.test("no sé, capaz que sí, fijate vos")).toBe(false);
    expect(BARE_DOMAIN.test("el trámite se hace en el día, sin costo")).toBe(false);
  });

  it("el comentario que escribe el dominio se rechaza igual que el que pone el link", () => {
    expect(validateSocial("Fijate en brou.com.uy que ahí lo tenés actualizado siempre.", ctx, "util").reason).toBe("has_link");
  });
});

describe("el veto de temas corría sobre el hilo y nunca sobre lo que escribíamos", () => {
  it("rechaza el comentario que se va a un tema donde la cuenta no opina", () => {
    // El hilo puede ser inocente y la respuesta irse igual: lo que importa es dónde termina el
    // comentario, no de dónde salió.
    const ctx = "¿Qué barrio recomiendan para mudarse con familia?";
    const desvio = "Pocitos está bien, aunque con la inseguridad que hay ahora yo lo pensaría dos veces.";
    expect(validateSocial(desvio, ctx, "util").reason).toBe("off_limits");
  });
});

describe("la anécdota inventada tiene infinitas formas y la lista tenía agujeros", () => {
  const ctx = "¿Cuánto tarda el trámite del pasaporte?";

  it("agarra el pretérito que la lista de frases no tenía", () => {
    for (const texto of [
      "Lo saqué el año pasado y tardó tres semanas en llegarme a casa.",
      "Cuando pedí turno me lo dieron para dos meses después, una locura.",
      "Llamé para consultar y me dijeron que ahora es más rápido que antes.",
    ]) {
      expect(validateSocial(texto, ctx, "util").reason, texto).toBe("fake_experience");
    }
  });

  it("no confunde palabras que terminan en vocal acentuada con verbos", () => {
    // "así", "aquí", "ahí" y "café" también terminan así, y sin la excepción la regla rechazaba
    // comentarios perfectamente normales — peor que el agujero que vino a tapar.
    for (const texto of [
      "El trámite tiene fama de lento, así que conviene sacar turno con tiempo.",
      "Aquí eso depende mucho de la oficina, no hay un plazo parejo para todos.",
      "Ahí te lo dan en el día si vas temprano, según lo que dicen siempre.",
    ]) {
      expect(validateSocial(texto, ctx, "util").ok, texto).toBe(true);
    }
  });
});

describe("el barrido de posts no puede confiar en el silencio de la API", () => {
  it("un post que ya tuvo interacción no se vuelve a juzgar por la foto del momento", () => {
    // El caso: a las 14:00 tenía score 2 y se guardó como vivo; a las 14:30 alguien retira el voto
    // y vuelve a 1. Sin memoria, se borra un post que la gente sí leyó.
    const foto = { score: 1, numComments: 0 };
    const historico = { score: 2, numComments: 0 };
    const mejor = { score: Math.max(foto.score, historico.score), numComments: Math.max(foto.numComments, historico.numComments) };
    expect(hasEngagement(foto)).toBe(false);
    expect(hasEngagement(mejor)).toBe(true);
  });
});

describe("el pase de posts no controlaba las cifras, y el prompt las prohíbe", () => {
  it("rechaza una cifra que no salió de la actualidad investigada", () => {
    const check = validateAsk(
      "¿Cómo hacen para bancar el aumento?",
      "Leí que el boleto sube 40 pesos este mes y me quedé pensando en cómo lo acomoda la gente.",
      "el boleto de Montevideo aumenta a partir de agosto"
    );
    expect(check.reason).toBe("invented_number");
  });

  it("acepta la cifra que sí está en lo que se investigó", () => {
    const check = validateAsk(
      "¿Cómo hacen para bancar el aumento?",
      "Con el boleto en 62 pesos me quedé pensando en cómo lo acomoda la gente en el mes.",
      "el boleto de Montevideo pasa a 62 pesos en agosto"
    );
    expect(check.ok).toBe(true);
  });
});

describe("los filtros del post se salteaban por la puerta de atrás", () => {
  const body = "Me quedé pensando en esto y no tengo idea de qué me van a contestar.";

  it("la política en plural es la misma política", () => {
    expect(validateAsk("¿Qué opinan de los candidatos de este año?", body).reason).toBe("politics");
    expect(validateAsk("¿Cómo los afectan los sindicatos en su laburo?", body).reason).toBe("politics");
  });

  it("la pregunta de sí o no no se salva con dos palabras adelante", () => {
    expect(validateAsk("Che, ¿es normal que me cobren esto en el súper?", body).reason).toBe("yes_no");
  });
});
