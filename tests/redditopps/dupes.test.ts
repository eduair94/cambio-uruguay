import { describe, expect, it } from "vitest";
import { dupKeyOf, groupDuplicates, type DupRow } from "../../classes/redditopps/dupes";

const BODY = "Tengo dos trabajos y no sé si tengo que hacer la declaración jurada de IRPF este año.";

const row = (postId: string, sub: string, over: Partial<DupRow> = {}): DupRow => ({
  postId,
  title: "Consulta IRPF por dos trabajos",
  excerpt: BODY,
  sub,
  permalink: `https://reddit.com/r/${sub}/comments/${postId}/x`,
  createdAt: new Date(Date.UTC(2026, 9, 20)),
  state: "open",
  ...over,
});

describe("redditopps/dupes", () => {
  it("deja una card por hilo repetido: la más vieja, que es el original", () => {
    const groups = groupDuplicates([
      row("b", "monte_video", { createdAt: new Date(Date.UTC(2026, 9, 21)) }),
      row("a", "uruguay", { createdAt: new Date(Date.UTC(2026, 9, 20)) }),
      row("c", "LegalUruguay", { title: "consulta irpf por DOS trabajos!", createdAt: new Date(Date.UTC(2026, 9, 22)) }),
      row("d", "AutosUy", { title: "Swift o HB20 para primer auto", excerpt: "otro texto" }),
    ]);
    expect(groups.get("a")).toEqual({
      duplicateOf: "",
      alsoIn: [
        { sub: "monte_video", permalink: "https://reddit.com/r/monte_video/comments/b/x" },
        { sub: "LegalUruguay", permalink: "https://reddit.com/r/LegalUruguay/comments/c/x" },
      ],
    });
    expect(groups.get("b")!.duplicateOf).toBe("a");
    expect(groups.get("c")!.duplicateOf).toBe("a");
    expect(groups.get("d")).toEqual({ duplicateOf: "", alsoIn: [] });
  });

  it("la copia ya contestada manda, aunque otra sea más vieja", () => {
    const groups = groupDuplicates([
      row("viejo", "uruguay", { createdAt: new Date(Date.UTC(2026, 9, 19)) }),
      row("contestado", "monte_video", { createdAt: new Date(Date.UTC(2026, 9, 21)), state: "answered" }),
    ]);
    expect(groups.get("contestado")!.duplicateOf).toBe("");
    expect(groups.get("viejo")!.duplicateOf).toBe("contestado");
  });

  it("dos personas con el mismo título y distinto texto no son el mismo hilo", () => {
    const groups = groupDuplicates([
      row("a", "uruguay", { title: "Recomendación de celular", excerpt: "Hasta 15 mil pesos, uso básico." }),
      row("b", "Burises", { title: "Recomendación de celular", excerpt: "Busco uno para sacar fotos, presupuesto alto." }),
    ]);
    expect(groups.get("a")!.duplicateOf).toBe("");
    expect(groups.get("b")!.duplicateOf).toBe("");
  });

  it("un título genérico sin texto no se agrupa con nada", () => {
    expect(dupKeyOf({ title: "Consulta", excerpt: "" })).toBeNull();
    expect(dupKeyOf({ title: "Recomendación de celular", excerpt: "" })).toBeNull();
    expect(dupKeyOf({ title: "¿El BHU acepta préstamo hipotecario para casa a reciclar?", excerpt: "" })).not.toBeNull();
  });
});
