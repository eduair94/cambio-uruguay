// El comentario que pasó todas las puertas y no decía nada.
//
// 2026-08-19, r/monte_video, "Ustedes cómo llegan a fin de mes". Primer comentario en vivo de la
// cuenta nueva. Salió publicado un párrafo que le repetía al autor lo que él acababa de escribir —
// que el costo de vida subió, que los sueldos no acompañan, que es difícil ahorrar— con un enlace
// al final. Cero datos. Hubo que borrarlo a mano.
//
// Lo que duele del caso es que ninguna puerta falló: el filtro vio un hilo de plata (lo era), la
// recuperación encontró una página parecidísima, el juez la aprobó con 0,9 y el validador no
// encontró ninguna cifra inventada — porque no había ninguna cifra. Todo medía que la respuesta no
// dijera nada FALSO. Nada medía que dijera algo.
//
// Dos reglas nuevas salen de ahí, y este archivo es las dos.
import { describe, expect, it } from "vitest";
import { validateReply } from "../../classes/redditbot/validate";
import { linkablePage, linkableOnly, NEVER_LINKED_PREFIXES } from "../../classes/redditbot/linkable";

const URL = "https://cambio-uruguay.com/facturar-en-monotributo-uruguay";

/** Una página con datos duros: la respuesta tiene que usar alguno. */
const CONTEXT_CON_CIFRAS =
  "[/facturar-en-monotributo-uruguay] El monotributo permite facturar hasta 183.000 UI por año. " +
  "El aporte al BPS es del 25% y el talonario cuesta 1.200 pesos. El crédito fiscal de 80 UI no aplica.";

/** Una página cualitativa: exigirle una cifra a la respuesta sería exigirle que la invente. */
const CONTEXT_SIN_CIFRAS =
  "[/prestamos-p2p-uruguay] El BCU no publica el registro de estas empresas, así que no hay forma " +
  "pública de verificar si una está inscripta. Conviene pedir el comprobante directamente.";

const relleno =
  "Te cuento cómo funciona esto en la práctica para que no te agarre de sorpresa cuando tengas que " +
  "decidir, porque el detalle cambia bastante según el caso puntual en el que estés metido vos. ";

describe("una respuesta sin un solo dato no es una respuesta", () => {
  it("rechaza el comentario que sólo le da la razón al autor", () => {
    // Textualmente la forma del que se publicó: acuerdo, paráfrasis y enlace.
    const reply = `${relleno}Es difícil, está claro, y el costo de vida subió muchísimo mientras los sueldos no acompañaron para nada. ${URL}`;
    const verdict = validateReply({ reply, expectedUrl: URL, context: CONTEXT_CON_CIFRAS });
    expect(verdict.reason).toBe("no_substance");
  });

  it("acepta el mismo comentario cuando usa una cifra de la página", () => {
    const reply = `${relleno}Con el monotributo podés facturar hasta 183.000 UI por año, así que fijate ese tope antes que nada. ${URL}`;
    expect(validateReply({ reply, expectedUrl: URL, context: CONTEXT_CON_CIFRAS })).toEqual({ ok: true });
  });

  it("NO exige cifras cuando la página no tiene ninguna", () => {
    // La regla angosta es lo que la hace sostenible: hay respuestas buenas que son cualitativas, y
    // pedirles un número es pedirles que lo inventen — justo lo que la otra regla prohíbe.
    const url = "https://cambio-uruguay.com/prestamos-p2p-uruguay";
    const reply = `${relleno}El BCU no publica ese registro, así que no hay forma pública de chequearlo: pedile el comprobante directo a la empresa. ${url}`;
    expect(validateReply({ reply, expectedUrl: url, context: CONTEXT_SIN_CIFRAS })).toEqual({ ok: true });
  });

  it("no cuenta los dígitos de la URL como sustancia", () => {
    // Si contaran, un enlace tipo /decreto-50-026 volvería a permitir la respuesta vacía.
    const url = "https://cambio-uruguay.com/decreto-50-026";
    const reply = `${relleno}Es difícil, está claro, y el costo de vida subió muchísimo el último tiempo. ${url}`;
    expect(validateReply({ reply, expectedUrl: url, context: CONTEXT_CON_CIFRAS }).reason).toBe("no_substance");
  });
});

describe("hay páginas que hablan de plata sin contestar nada", () => {
  it("no se enlaza el radar de temas de Reddit — la que ganó en el caso real", () => {
    expect(linkablePage("/temas-de-dinero-reddit")).toBe(false);
  });

  it("tampoco las páginas sobre el propio sitio", () => {
    for (const path of ["/estadisticas-del-sitio", "/estadisticas-reddit", "/estado", "/buscar", "/acerca"]) {
      expect(linkablePage(path), path).toBe(false);
    }
  });

  it("ni las noticias: contestan qué pasó, no qué hago", () => {
    expect(linkablePage("/noticias")).toBe(false);
    expect(linkablePage("/newsletter/2026-08-19")).toBe(false);
  });

  it("ni la portada, que es no haber contestado nada", () => {
    expect(linkablePage("/")).toBe(false);
  });

  it("sí se enlazan las páginas que contestan", () => {
    for (const path of ["/facturar-en-monotributo-uruguay", "/cuenta-remunerada-uruguay", "/franquicia-aduana-uruguay"]) {
      expect(linkablePage(path), path).toBe(true);
    }
  });

  it("compara por prefijo de segmento, no por texto", () => {
    // `/estado` no puede arrastrar a `/estadisticas-...`, ni al revés: son rutas distintas y la
    // coincidencia de texto suelta convertiría una lista corta en una guillotina.
    expect(linkablePage("/estados-contables-uruguay")).toBe(true);
    expect(linkablePage("/blog-de-alguien-mas")).toBe(true);
    expect(linkablePage("/blog/lo-que-sea")).toBe(false);
  });

  it("el filtro conserva el orden del ranking", () => {
    const pages = [{ path: "/temas-de-dinero-reddit" }, { path: "/uno" }, { path: "/estado" }, { path: "/dos" }];
    expect(linkableOnly(pages).map(p => p.path)).toEqual(["/uno", "/dos"]);
  });

  it("la lista es fija y no sale de una variable de entorno", () => {
    // No es una preferencia que se calibre: es una propiedad de esas páginas. Un .env mal copiado no
    // puede devolver al bot a enlazar el mapa de temas.
    expect(NEVER_LINKED_PREFIXES.length).toBeGreaterThan(10);
    expect(Object.isFrozen(NEVER_LINKED_PREFIXES)).toBe(true);
  });
});
