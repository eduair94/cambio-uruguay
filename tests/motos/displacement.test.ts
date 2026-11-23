// La cilindrada de cada moto, con la cascada de evidencia de la carrocería de autos: la ficha del
// aviso, el título con la unidad, el consenso de los demás avisos del mismo modelo y, al final, el
// número del nombre del modelo. Las dos últimas son estimaciones y nunca votan.
import { describe, expect, it } from "vitest";
import {
  attachDisplacement,
  displacementFromModelName,
  fitsBand,
  parseFichaDisplacement,
  type DisplacementInput,
} from "../../classes/motos/displacement";

let seq = 0;
const moto = (over: Partial<DisplacementInput> = {}): DisplacementInput & { id: number } => ({
  id: ++seq,
  marketSlug: "yumbo-gs",
  model: "GS",
  title: "Yumbo Gs impecable",
  declaredBand: null,
  fichaDisplacement: null,
  electric: false,
  ...over,
});

describe("la fila «Cilindrada» de la ficha", () => {
  it("lee el separador de miles uruguayo y la unidad", () => {
    expect(parseFichaDisplacement("1.590 cc")).toBe(1590);
    expect(parseFichaDisplacement("150 cc")).toBe(150);
    expect(parseFichaDisplacement("125")).toBe(125);
    expect(parseFichaDisplacement("249,5 cc")).toBe(250);
  });
  it("fuera de 30–2.500 no es una cilindrada", () => {
    expect(parseFichaDisplacement("5 cc")).toBeNull();
    expect(parseFichaDisplacement("25.000 cc")).toBeNull();
    expect(parseFichaDisplacement("")).toBeNull();
    expect(parseFichaDisplacement(null)).toBeNull();
    expect(parseFichaDisplacement("no sé")).toBeNull();
  });
});

describe("el número del nombre del modelo", () => {
  it("toma el número que nombra la cilindrada", () => {
    expect(displacementFromModelName("GTR 125")).toBe(125);
    expect(displacementFromModelName("PX 110F")).toBe(110);
    expect(displacementFromModelName("F 800 GS")).toBe(800);
    expect(displacementFromModelName("Z900")).toBe(900);
    expect(displacementFromModelName("752S")).toBe(752);
  });
  it("se abstiene con números chicos, sin número o con dos números distintos", () => {
    expect(displacementFromModelName("MT 03")).toBeNull();
    expect(displacementFromModelName("FZ25")).toBeNull();
    expect(displacementFromModelName("XR")).toBeNull();
    expect(displacementFromModelName("CG 150 125")).toBeNull();
  });
});

describe("el tramo de Mercado Libre como veto", () => {
  it("tolera el borde, que en ML se solapa", () => {
    expect(fitsBand(125, "126-250")).toBe(true);
    expect(fitsBand(250, "mas-250")).toBe(true);
    expect(fitsBand(124, "hasta-125")).toBe(true);
    expect(fitsBand(2000, "126-250")).toBe(false);
    expect(fitsBand(150, "hasta-125")).toBe(false);
    expect(fitsBand(150, null)).toBe(true);
  });
});

describe("la cascada", () => {
  it("la ficha gana al título", () => {
    const [row] = attachDisplacement([moto({ fichaDisplacement: 149, title: "Gs 150cc" })]);
    expect(row).toMatchObject({ displacement: 149, displacementBasis: "ficha", exactDisplacement: 149 });
  });

  it("el título con unidad, si no hay ficha", () => {
    const [row] = attachDisplacement([moto({ title: "Yumbo Gs 200 cc 2020" })]);
    expect(row).toMatchObject({ displacement: 200, displacementBasis: "title", exactDisplacement: 200 });
  });

  it("el tramo declarado veta una ficha fuera de banda", () => {
    const [row] = attachDisplacement([moto({ fichaDisplacement: 2000, declaredBand: "126-250", model: "Pulsar" })]);
    expect(row!.displacement).toBeNull();
    expect(row!.exactDisplacement).toBeNull();
  });

  it("tres votos que concuerdan dan la cilindrada del modelo a los que no la dicen", () => {
    const rows = attachDisplacement([
      moto({ fichaDisplacement: 124 }),
      moto({ fichaDisplacement: 125 }),
      moto({ title: "Gs 125cc" }),
      moto(),
    ]);
    expect(rows[3]).toMatchObject({
      displacement: 125,
      displacementBasis: "model",
      displacementVotes: 3,
      exactDisplacement: null,
    });
  });

  it("dos votos no alcanzan", () => {
    const rows = attachDisplacement([moto({ fichaDisplacement: 125 }), moto({ fichaDisplacement: 125 }), moto()]);
    expect(rows[2]!.displacement).toBeNull();
  });

  it("el consenso no se alimenta de estimaciones", () => {
    // Dos votos reales y dos avisos que dirían 125 por su nombre: siguen siendo dos votos, así que
    // no hay consenso y los dos sin dato quedan con la estimación más floja.
    const rows = attachDisplacement([
      moto({ model: "GS 125", fichaDisplacement: 125 }),
      moto({ model: "GS 125", fichaDisplacement: 125 }),
      moto({ model: "GS 125" }),
      moto({ model: "GS 125" }),
    ]);
    expect(rows[2]).toMatchObject({ displacement: 125, displacementBasis: "model-name", displacementVotes: null });
  });

  it("el nombre del modelo calla si los avisos reales del modelo dicen otra cosa", () => {
    const rows = attachDisplacement([
      moto({ model: "GS 125", fichaDisplacement: 150 }),
      moto({ model: "GS 125", fichaDisplacement: 150 }),
      moto({ model: "GS 125" }),
    ]);
    expect(rows[2]!.displacement).toBeNull();
  });

  it("una ficha que contradice un consenso fuerte es un tipeo", () => {
    const rows = attachDisplacement([
      ...[1, 2, 3, 4].map(() => moto({ marketSlug: "bajaj-pulsar", model: "Pulsar", fichaDisplacement: 200 })),
      moto({ marketSlug: "bajaj-pulsar", model: "Pulsar", fichaDisplacement: 2000 }),
    ]);
    expect(rows[4]).toMatchObject({ displacement: 200, displacementBasis: "model", displacementVotes: 4, exactDisplacement: null });
  });

  it("con tramo declarado, el valor propio que entra en él no se pisa (revisión del 23/11/2026)", () => {
    // Una CB 500 entre CB 190: el consenso (190) no entra en su tramo y el aviso quedaba sin nada.
    const rows = attachDisplacement([
      ...[1, 2, 3, 4].map(() => moto({ marketSlug: "honda-cb", model: "CB", fichaDisplacement: 190, declaredBand: "126-250" })),
      moto({ marketSlug: "honda-cb", model: "CB", fichaDisplacement: 500, declaredBand: "mas-250" }),
    ]);
    expect(rows[4]).toMatchObject({ displacement: 500, displacementBasis: "ficha", exactDisplacement: 500 });
    // Y si el consenso también entra en el tramo, manda lo que dice el aviso: ficha y tramo lo dicen.
    const both = attachDisplacement([
      ...[1, 2, 3, 4].map(() => moto({ marketSlug: "yamaha-fz", model: "FZ", fichaDisplacement: 150 })),
      moto({ marketSlug: "yamaha-fz", model: "FZ", fichaDisplacement: 200, declaredBand: "126-250" }),
    ]);
    expect(both[4]).toMatchObject({ displacement: 200, displacementBasis: "ficha" });
  });

  it("sin tramo, el nombre del modelo que respalda al aviso evita el falso tipeo", () => {
    const rows = attachDisplacement([
      ...[1, 2, 3, 4].map(() => moto({ marketSlug: "honda-cb", model: "CB 190", fichaDisplacement: 190 })),
      moto({ marketSlug: "honda-cb", model: "CB 500", fichaDisplacement: 500 }),
    ]);
    expect(rows[4]).toMatchObject({ displacement: 500, displacementBasis: "ficha" });
  });

  it("el nombre del modelo, al final y nunca contra el tramo", () => {
    const [named, vetoed] = attachDisplacement([
      moto({ marketSlug: "yumbo-gtr-125", model: "GTR 125" }),
      moto({ marketSlug: "yumbo-gtr-125b", model: "GTR 125", declaredBand: "mas-250" }),
    ]);
    expect(named).toMatchObject({ displacement: 125, displacementBasis: "model-name", displacementVotes: null });
    expect(vetoed!.displacement).toBeNull();
  });

  it("sin evidencia no hay número, ni cero ni NaN", () => {
    const [row] = attachDisplacement([moto({ model: "XR" })]);
    expect(row).toMatchObject({ displacement: null, displacementBasis: null, displacementVotes: null, exactDisplacement: null });
  });

  it("una eléctrica no tiene cilindrada ni vota", () => {
    const rows = attachDisplacement([
      moto({ electric: true, fichaDisplacement: 125, model: "GS 125" }),
      moto({ fichaDisplacement: 125 }),
      moto({ fichaDisplacement: 125 }),
      moto(),
    ]);
    expect(rows[0]!.displacement).toBeNull();
    expect(rows[3]!.displacement).toBeNull();
  });
});
