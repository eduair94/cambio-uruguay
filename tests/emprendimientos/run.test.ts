// La corrida entera, sin red: lector de Instagram y clasificador falsos, base en memoria.
import { describe, expect, it } from "vitest";
import type { ProfileReader } from "../../classes/emprendimientos/instagram";
import { newCandidate, runOnce, snowballHandles } from "../../classes/emprendimientos/run";
import { SEEDS } from "../../classes/emprendimientos/seeds";
import { memoryStore } from "../../classes/emprendimientos/store";
import type { Classification, ProfileRead } from "../../classes/emprendimientos/types";
import { post, profile } from "./fixtures";

const NOW = new Date("2026-11-23T19:00:00.000Z");

const ok = (handle: string, over: Partial<ProfileRead> = {}): ProfileRead =>
  profile({
    handle,
    fullName: handle,
    biography: "📍 Montevideo",
    posts: [1, 2, 3].map(i => post({ code: `${handle.replace(/\W/g, "").slice(0, 6)}CODE${i}`, owner: handle })),
    ...over,
  });

const classifyAll = (tipo: Classification["tipo"] = "emprendimiento") => async (inputs: readonly { profile: ProfileRead }[]) =>
  new Map(
    inputs.map(input => [
      input.profile.handle,
      {
        tipo: input.profile.handle.startsWith("red") ? ("medio-o-comunidad" as const) : tipo,
        uruguaya: "si" as const,
        rubro: "comida",
        etiquetas: ["torta"],
        resumen: "Tortas por encargo.",
        ofrece: "productos" as const,
        envios: "local" as const,
        departamento: null,
        barrio: null,
        raro: false,
        riesgo: null,
        model: "test",
        at: NOW.toISOString(),
        inputHash: "h",
      },
    ])
  );

function reader(make: (handle: string) => ProfileRead, closed = false): ProfileReader {
  return async plan => ({
    reads: new Map(plan.handles.map(handle => [handle, make(handle)])),
    launched: true,
    closed,
    note: null,
  });
}

describe("una corrida", () => {
  it("lee las semillas, publica lo que corresponde y descubre por bola de nieve", async () => {
    const store = memoryStore();
    const result = await runOnce({
      now: NOW,
      store,
      readProfiles: reader(handle =>
        ok(handle, handle === "red_de_emprendedores.uy" ? { posts: [1, 2, 3].map(i => post({ code: `REDCODE000${i}`, owner: i === 1 ? "inquietos3d" : handle })) } : {})
      ),
      classify: classifyAll(),
      options: { maxReads: 50 },
    });
    expect(result.instagramClosed).toBe(false);
    expect(store.candidates.size).toBeGreaterThan(SEEDS.length);
    expect(store.candidates.get("red_de_emprendedores.uy")!.state).toBe("curadora");
    // La colaboración de la curadora entra como candidata nueva, sin leer todavía.
    expect(store.candidates.get("inquietos3d")).toMatchObject({ state: "pendiente", sources: [{ kind: "colaboracion", via: "red_de_emprendedores.uy" }] });
    expect(store.listings.has("luperouy")).toBe(true);
    expect(store.listings.has("red_de_emprendedores.uy")).toBe(false);
    expect(store.meta!.listed).toBe(store.listings.size);
    expect(store.meta!.lastRun!.reads).toBeGreaterThan(0);
  });

  it("si Instagram no contesta, no cambia ningún estado y lo dice", async () => {
    const store = memoryStore();
    await runOnce({ now: NOW, store, readProfiles: reader(handle => ok(handle)), classify: classifyAll(), options: { maxReads: 50 } });
    const before = store.candidates.get("luperouy")!.state;
    expect(before).toBe("publicada");
    const later = new Date(NOW.getTime() + 4 * 86_400_000);
    const result = await runOnce({
      now: later,
      store,
      readProfiles: async plan => ({ reads: new Map(plan.handles.slice(0, 5).map(h => [h, { ...ok(h), status: "unreadable" as const }])), launched: true, closed: true, note: "cerrado" }),
      classify: classifyAll(),
      options: { maxReads: 50 },
    });
    expect(result.instagramClosed).toBe(true);
    expect(store.candidates.get("luperouy")!.state).toBe("publicada");
    expect(store.candidates.get("luperouy")!.unreadableStreak).toBe(0);
  });

  it("una baja saca la ficha y la cuenta no vuelve a entrar por ninguna fuente", async () => {
    const store = memoryStore({ optOuts: ["luperouy"] });
    await runOnce({ now: NOW, store, readProfiles: reader(handle => ok(handle)), classify: classifyAll(), options: { maxReads: 50 } });
    expect(store.candidates.has("luperouy")).toBe(false);
    expect(store.listings.has("luperouy")).toBe(false);
  });

  it("una sugerencia se lee en la misma corrida, antes que el resto", async () => {
    const store = memoryStore({ suggestions: ["tortas.de.ana"] });
    const seen: string[] = [];
    await runOnce({
      now: NOW,
      store,
      readProfiles: async plan => {
        seen.push(...plan.handles);
        return reader(handle => ok(handle))(plan);
      },
      classify: classifyAll(),
      options: { maxReads: 3 },
    });
    expect(seen[0]).toBe("tortas.de.ana");
    expect(store.listings.has("tortas.de.ana")).toBe(true);
  });

  it("una cuenta personal sugerida no se publica", async () => {
    const store = memoryStore({ candidates: [newCandidate("juan.perez", { kind: "sugerencia", day: "2026-11-23" }, NOW)] });
    await runOnce({ now: NOW, store, readProfiles: reader(handle => ok(handle)), classify: classifyAll("personal"), options: { maxReads: 50 } });
    expect(store.candidates.get("juan.perez")!.state).toBe("rechazada");
    expect(store.listings.size).toBe(0);
  });

  it("la bola de nieve toma colaboraciones y menciones, nunca a la propia cuenta", () => {
    const p = ok("lacomarca.uy", { biography: "Proyecto de @manos.veneguayas y @lacomarca.uy", posts: [post({ code: "AAAAAAAAAA1", owner: "tuyeito" }), post({ code: "AAAAAAAAAA2", owner: "lacomarca.uy" })] });
    expect(snowballHandles(p)).toEqual([
      { handle: "tuyeito", kind: "colaboracion" },
      { handle: "manos.veneguayas", kind: "mencion" },
    ]);
  });
});
