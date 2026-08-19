// Dónde dice esta cuenta que es un bot, y qué pasa si no lo dice.
//
// La firma al pie de cada comentario se sacó, así que la única declaración que queda vive en la bio
// del perfil — un campo de un sitio ajeno que nadie de este repositorio controla. Este archivo
// existe porque una promesa así se rompe sola y en silencio: alguien edita el perfil, cambia de
// cuenta, y no hay ningún síntoma. La puerta es lo que convierte "está en la bio" en algo
// verificable, y estos casos son los que la mantienen honesta.
import { describe, expect, it } from "vitest";
import { bioDeclaresBot, SUGGESTED_BIO } from "../../classes/redditbot/identity";

describe("redditbot/identity — bioDeclaresBot", () => {
  it("acepta la bio sugerida, que es la que va a estar puesta", () => {
    expect(bioDeclaresBot(SUGGESTED_BIO).ok).toBe(true);
  });

  it("no poder leerla NO es tenerla", () => {
    // Al revés que subrules.ts, donde un fallo de red contesta que sí. Allá la red no es lo que
    // protege; acá la lectura ES la protección.
    const verdict = bioDeclaresBot(null);
    expect(verdict.ok).toBe(false);
    expect(verdict.reason).toContain("no se pudo leer");
  });

  it("rechaza el perfil vacío", () => {
    expect(bioDeclaresBot("   ").ok).toBe(false);
  });

  it("rechaza la que dice el sitio pero no que es automatizada", () => {
    const verdict = bioDeclaresBot("Comparto cotizaciones de cambio-uruguay.com");
    expect(verdict.ok).toBe(false);
    expect(verdict.reason).toContain("automatizada");
  });

  it("rechaza la que dice que es un bot pero no de quién", () => {
    const verdict = bioDeclaresBot("Bot que contesta preguntas de plata");
    expect(verdict.ok).toBe(false);
    expect(verdict.reason).toContain("de qué sitio");
  });

  it("acepta variantes razonables, porque el texto exacto no se puede exigir", () => {
    // El campo lo edita una persona en la web de Reddit. Pedir una frase literal significa que el
    // bot se apaga el día que alguien le corrige una coma.
    expect(bioDeclaresBot("Cuenta automática de Cambio Uruguay").ok).toBe(true);
    expect(bioDeclaresBot("bot · cambiouruguay").ok).toBe(true);
    expect(bioDeclaresBot("Script que responde con datos de CAMBIO-URUGUAY.COM").ok).toBe(true);
  });

  it("no se conforma con una palabra que apenas contiene 'bot'", () => {
    // "robot" contiene "bot" y esto lo acepta a propósito: cualquier frase con la palabra robot
    // dentro está diciendo lo mismo. Lo que NO puede pasar es que una bio sin ninguna de las dos
    // señales pase.
    expect(bioDeclaresBot("Uruguayo, hincha de Peñarol, me gusta el mate").ok).toBe(false);
  });
});
