// Las fuentes que agregó la búsqueda más profunda (23/11/2026): búsquedas web con Gemini y el texto
// de los posts de las curadoras. Sin red.
import { describe, expect, it } from "vitest";
import { mentionsIn, normalizeHandle } from "../../classes/emprendimientos/handles";
import { captionFromHtml, parseProfile } from "../../classes/emprendimientos/instagram";
import { publicListing } from "../../classes/emprendimientos/listing";
import { newCandidate, postsToMine, runOnce } from "../../classes/emprendimientos/run";
import { handlesFromReply, readWeb, WEB_PLACES, WEB_PRODUCTS, webPrompt, webQueries } from "../../classes/emprendimientos/sources/web";
import { memoryStore, type CandidateRow } from "../../classes/emprendimientos/store";
import type { Classification, ProfileRead } from "../../classes/emprendimientos/types";
import { post, profile, profileHtml } from "./fixtures";

const NOW = new Date("2026-11-23T19:00:00.000Z");

describe("búsqueda web", () => {
  it("rota cada producto en cada lugar e intercala una búsqueda de curadoras cada cinco", () => {
    const queries = webQueries();
    expect(queries.filter(q => q.kind === "producto")).toHaveLength(WEB_PRODUCTS.length * WEB_PLACES.length);
    expect(queries[5]).toMatchObject({ kind: "curadoras" });
    expect(queries[0]!.text).toBe(`${WEB_PRODUCTS[0]} en ${WEB_PLACES[0]}`);
    expect(new Set(queries.map(q => q.text)).size).toBe(queries.length);
    expect(webPrompt(queries[0]!)).toContain("de Uruguay");
  });

  it("toma las cuentas del texto: @menciones y enlaces, sin repetir y nunca un correo", () => {
    const text = "@retroka.uy — Retroka\n@vintage_vibe_uy — Vintage\ninstagram.com/ripped.uy\nescribí a hola@retroka.uy\n@retroka.uy";
    expect(handlesFromReply(text, ["https://www.instagram.com/ciclosegundamano.uy/"])).toEqual(["ripped.uy", "ciclosegundamano.uy", "retroka.uy", "vintage_vibe_uy"]);
  });

  it("avanza el cursor, vuelve a empezar al final y no cuenta como respuesta lo que no contestó", async () => {
    const total = webQueries().length;
    let calls = 0;
    const res = await readWeb(total - 1, 3, "2026-11-23", async () => {
      calls++;
      return calls === 2 ? null : { text: "@tortas.de.ana — Tortas", sourceUris: [] };
    });
    expect(res.cursor).toBe(2);
    expect(res.answered).toBe(2);
    expect(res.finds).toEqual([{ handle: "tortas.de.ana", source: expect.objectContaining({ kind: "web", day: "2026-11-23" }) }]);
  });
});

describe("textos de las curadoras", () => {
  const curator = (handle: string, codes: string[], mined: string[] = []): CandidateRow => ({
    ...newCandidate(handle, { kind: "semilla", day: "2026-11-23" }, NOW),
    state: "curadora",
    profile: profile({ handle, posts: codes.map(code => post({ code, owner: handle })) }),
    minedCodes: mined,
  });

  it("reparte las lecturas entre curadoras y saltea lo ya leído", () => {
    const a = curator("feria.a", ["A1", "A2", "A3"], ["A1"]);
    const b = curator("feria.b", ["B1", "B2"]);
    expect(postsToMine([a, b], 3)).toEqual([
      { code: "A2", owner: "feria.a" },
      { code: "B1", owner: "feria.b" },
      { code: "A3", owner: "feria.a" },
    ]);
    expect(postsToMine([a, b], 0)).toEqual([]);
  });

  it("cada @mención de un post leído es una candidata nueva, y el post queda marcado", async () => {
    const store = memoryStore({ candidates: [curator("feria.a", ["A1", "A2"])] });
    const classify = async (inputs: readonly { profile: ProfileRead }[]) =>
      new Map<string, Classification>(inputs.map(i => [i.profile.handle, { tipo: "emprendimiento", uruguaya: "si", rubro: "comida", etiquetas: [], resumen: "Tortas.", ofrece: "productos", envios: "local", departamento: null, barrio: null, raro: false, riesgo: null, model: "t", at: NOW.toISOString(), inputHash: "h" }]));
    await runOnce({
      now: NOW,
      store,
      classify,
      options: { maxReads: 0, maxPostReads: 5, webQueriesPerRun: 0 },
      readProfiles: async plan => ({
        reads: new Map(),
        launched: true,
        closed: false,
        note: null,
        captions: (plan.postCodes ?? []).map(code => ({ code, owner: "feria.a", text: code === "A1" ? "Gracias @tortas.de.ana y @velas.uy por venir! @feria.a" : "" })),
      }),
    });
    expect(store.candidates.get("tortas.de.ana")).toMatchObject({ state: "pendiente", sources: [{ kind: "mencion", via: "feria.a" }] });
    expect(store.candidates.has("velas.uy")).toBe(true);
    expect(store.candidates.get("feria.a")!.minedCodes).toEqual(["A1", "A2"]);
  });
});

describe("el texto de un post", () => {
  it("suma las cuentas etiquetadas en la foto y los coautores, además del texto", () => {
    const node = {
      code: "Cq3_4YoJxTf",
      taken_at: 1_763_000_000,
      user: { username: "feria.a", full_name: "Feria A" },
      caption: { text: "Expositores de este sábado: @tortas.de.ana" },
      usertags: { in: [{ user: { username: "velas.uy" } }] },
      carousel_media: [{ usertags: { in: [{ user: { username: "mates.del.sur" } }] } }],
      coauthor_producers: [{ username: "feria.b" }],
    };
    const html = `<script type="application/json">${JSON.stringify({ data: { items: [node] } })}</script>`;
    const caption = captionFromHtml(html, "Cq3_4YoJxTf")!;
    expect(caption.owner).toBe("feria.a");
    expect(mentionsIn(caption.text).sort()).toEqual(["feria.b", "mates.del.sur", "tortas.de.ana", "velas.uy"]);
    expect(captionFromHtml(html, "OTRO_CODIGO")).toBeNull();
  });
});

describe("el límite de Instagram", () => {
  it("una lectura de una corrida limitada no suma racha y se reintenta en 3 horas", async () => {
    const store = memoryStore({ candidates: [newCandidate("tortas.de.ana", { kind: "sugerencia", day: "2026-11-23" }, NOW)] });
    await runOnce({
      now: NOW,
      store,
      options: { maxReads: 50, maxPostReads: 0, webQueriesPerRun: 0 },
      classify: async () => new Map(),
      readProfiles: async plan => ({
        reads: new Map(plan.handles.map(h => [h, { ...profile({ handle: h }), status: "unreadable" as const }])),
        launched: true,
        closed: false,
        limited: true,
        note: "limitado",
      }),
    });
    const row = store.candidates.get("tortas.de.ana")!;
    expect(row.unreadableStreak).toBe(0);
    expect(row.state).toBe("pendiente");
    expect(row.dueAt.getTime() - NOW.getTime()).toBe(3 * 3_600_000);
    expect(store.meta!.lastRun!.note).toContain("limitado");
  });

  it("un handle que es una web pegada no es una cuenta", () => {
    expect(normalizeHandle("www.mielpura.webs")).toBeNull();
  });
});

describe("arreglos de la primera corrida en producción", () => {
  it("un perfil con nodo y SIN grilla no se rechaza: es una página que no terminó de dibujarse", () => {
    const read = parseProfile(profileHtml({ handle: "red_de_emprendedores.uy", posts: [] }), "red_de_emprendedores.uy", "https://www.instagram.com/red_de_emprendedores.uy/", NOW.toISOString());
    expect(read.status).toBe("unreadable");
  });

  it("una cuenta de la búsqueda web dice de dónde salió sin publicar la consulta", () => {
    const row = {
      ...newCandidate("tortas.de.ana", { kind: "web", day: "2026-11-23", label: "tortas por encargo en Montevideo" }, NOW),
      state: "publicada" as const,
      profile: profile({ handle: "tortas.de.ana", posts: [1, 2, 3].map(i => post({ code: `AAAAAAAAAA${i}`, owner: "tortas.de.ana" })) }),
      classification: { tipo: "emprendimiento" as const, uruguaya: "si" as const, rubro: "comida", etiquetas: [], resumen: "Tortas.", ofrece: "productos" as const, envios: "local" as const, departamento: null, barrio: null, raro: false, riesgo: null, model: "t", at: NOW.toISOString(), inputHash: "h" },
    };
    expect(publicListing(row, null, NOW)!.sources).toEqual([{ kind: "web", label: "Encontrada en una búsqueda web", url: null }]);
  });
});
