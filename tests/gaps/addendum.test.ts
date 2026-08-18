// Emitir la ampliación de una página que ya existe.
//
// Es el caso frecuente: no "no hay página" sino "hay página, es buena, y no dice esto". El primer
// comentario real del bot terminó admitiendo que no tenía datos sobre Monotributo Social MIDES,
// sobre una página de facturación que existe. Ese faltante es el material de una ampliación.
import { describe, expect, it } from "vitest";
import { ADDENDA_MARKER, emitAddendum, type AddendumPayload } from "../../classes/gaps/emit";

const FILE = `import type { NavEntry } from './x'

export const PAGE_ADDENDA = Object.freeze([
${ADDENDA_MARKER}
])
`;

const payload = (over: Partial<AddendumPayload> = {}): AddendumPayload => ({
  route: "/facturar-en-monotributo-uruguay",
  updatedAt: "2026-08-18",
  items: [
    {
      question: '¿El Monotributo Social MIDES tiene que facturar "electrónicamente"?',
      answer: "No: está entre las excepciones.\nEl talonario sigue siendo su régimen normal.",
      sources: [{ title: "dgi.gub.uy", url: "https://dgi.gub.uy/a" }],
    },
  ],
  ...over,
});

describe("gaps/emit — emitAddendum", () => {
  it("inserta en el marcador y lo deja para la próxima", () => {
    const file = emitAddendum(FILE, payload());
    expect(file.path).toBe("app/utils/generated/addenda.ts");
    expect(file.content).toContain('route: "/facturar-en-monotributo-uruguay"');
    expect(file.content).toContain(ADDENDA_MARKER);
  });

  it("escapa comillas y saltos de línea en vez de romper el módulo", () => {
    const file = emitAddendum(FILE, payload());
    expect(file.content).toContain('\\"electrónicamente\\"');
    expect(file.content).toContain("excepciones.\\nEl talonario");
  });

  it("reemplaza la ampliación anterior de la misma ruta, no la duplica", () => {
    // Una ampliación es la respuesta ACTUAL a lo que preguntan sobre esa página; dos bloques para
    // una ruta se renderizarían dos veces.
    const once = emitAddendum(FILE, payload());
    const twice = emitAddendum(once.content, payload({ updatedAt: "2026-09-01" }));
    const matches = twice.content.split('route: "/facturar-en-monotributo-uruguay"').length - 1;
    expect(matches).toBe(1);
    expect(twice.content).toContain('updatedAt: "2026-09-01"');
    expect(twice.content).not.toContain('updatedAt: "2026-08-18"');
  });

  it("no toca la ampliación de otra ruta", () => {
    const otra = emitAddendum(FILE, payload({ route: "/alquilar-en-uruguay" }));
    const dos = emitAddendum(otra.content, payload());
    expect(dos.content).toContain('route: "/alquilar-en-uruguay"');
    expect(dos.content).toContain('route: "/facturar-en-monotributo-uruguay"');
  });

  it("balancea llaves y corchetes", () => {
    const file = emitAddendum(FILE, payload());
    const opens = (file.content.match(/[[{]/g) ?? []).length;
    const closes = (file.content.match(/[\]}]/g) ?? []).length;
    expect(opens).toBe(closes);
  });

  it("se queja fuerte si alguien borró el marcador", () => {
    expect(() => emitAddendum("export const PAGE_ADDENDA = []\n", payload())).toThrow(/marcador/);
  });
});
