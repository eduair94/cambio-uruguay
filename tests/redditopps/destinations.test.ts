import fs from "fs";
import path from "path";
import { describe, expect, it } from "vitest";
import type { RedditPostRaw } from "../../classes/reddit";
import type { RetrievedPage } from "../../classes/rag/types";
import { strip } from "../../classes/redditbot/filter";
import { candidatesFor, type LexicalRetriever } from "../../classes/redditopps/candidates";
import { DESTINATIONS, familyOf, intentMatches } from "../../classes/redditopps/destinations";

const PAGES = path.join(__dirname, "..", "..", "app", "pages");
const paths = (text: string) => intentMatches(strip(text)).map((d) => d.path);

const post = (title: string, selftext = ""): RedditPostRaw => ({
  id: "p1",
  sub: "uruguay",
  title,
  selftext,
  author: "alguien",
  score: 1,
  numComments: 0,
  permalink: "https://reddit.com/r/uruguay/comments/p1/x",
  createdUtc: 1_790_000_000,
  url: "",
});

const page = (p: string, tier: "full" | "stub" = "full"): RetrievedPage => ({
  path: p,
  title: `Título de ${p}`,
  tier,
  score: 1,
  cosine: 0,
  chunks: [],
});

const fakeRetriever = (pages: RetrievedPage[]): LexicalRetriever => ({ rankWithVector: () => pages });

describe("redditopps/destinations — reglas", () => {
  it("cada destino es una página estática que existe", () => {
    // Una ruta mal tipeada no falla en ningún lado: el juez la elegiría y la card mandaría a un 404.
    for (const d of DESTINATIONS) {
      const file = path.join(PAGES, `${d.path}.vue`);
      const index = path.join(PAGES, d.path, "index.vue");
      expect(fs.existsSync(file) || fs.existsSync(index), d.path).toBe(true);
    }
  });

  it("no repite rutas", () => {
    const all = DESTINATIONS.map((d) => d.path);
    expect(new Set(all).size).toBe(all.length);
  });

  it("reconoce los pedidos de los directorios", () => {
    expect(paths("Busco apartamento para alquilar en Pocitos, qué portales recomiendan?")).toContain("/alquileres-uruguay");
    const auto = paths("Me quiero comprar mi primer auto usado, qué miro?");
    expect(auto).toContain("/autos-usados-uruguay");
    expect(auto).toContain("/que-auto-comprar-uruguay");
    expect(paths("Recomendación de celular hasta 15 mil pesos")).toContain("/celulares-uruguay");
    expect(paths("Qué heladera me recomiendan comprar?")).toContain("/equipar-casa-uruguay");
    expect(paths("Me retuvieron un paquete de Shein en la aduana")).toContain("/problemas-con-la-aduana-uruguay");
    expect(paths("Dónde conviene cambiar dólares hoy?")).toContain("/mejor-casa-de-cambio");
    expect(paths("Cuánto me queda de sueldo líquido con 60 mil nominal?")).toContain("/herramientas/calculadora-sueldo-liquido");
    expect(paths("Looking for an apartment to rent in Montevideo")).toContain("/alquileres-uruguay");
  });

  it("no inventa intención donde no la hay", () => {
    expect(paths("Antel arena el sábado, alguien va?")).toEqual([]);
    expect(paths("Qué opinan del partido de ayer?")).toEqual([]);
  });

  it("asigna familia a cualquier ruta", () => {
    expect(familyOf("/alquileres-uruguay")).toBe("alquileres");
    expect(familyOf("/alquiler/montevideo/pocitos")).toBe("alquileres");
    expect(familyOf("/conviene-auto-moto-o-omnibus-uruguay")).toBe("movilidad");
    expect(familyOf("/motos-usadas-uruguay")).toBe("motos");
    expect(familyOf("/prestamo-hipotecario-uruguay")).toBe("viviendas");
    expect(familyOf("/guias/franquicia-de-courier")).toBe("aduana");
    expect(familyOf("/algo-que-no-existe")).toBe("otros");
  });
});

describe("redditopps/candidates", () => {
  it("pone las intenciones primero y completa con el índice, sin páginas que no contestan", () => {
    const retriever = fakeRetriever([
      page("/temas-de-dinero-reddit"),
      page("/couriers-uruguay"),
      page("/guias/traer-una-notebook"),
      page("/sucursal/brou-centro", "stub"),
      page("/en/couriers-uruguay"),
    ]);
    const got = candidatesFor(post("¿Cuánto pago de aduana por traer una notebook de Amazon?"), retriever);
    const list = got.map((c) => c.path);
    expect(list[0]).toBe("/couriers-uruguay");
    expect(got[0]!.source).toBe("intent");
    expect(list).toContain("/guias/traer-una-notebook");
    expect(list).not.toContain("/temas-de-dinero-reddit");
    expect(list).not.toContain("/sucursal/brou-centro");
    expect(list).not.toContain("/en/couriers-uruguay");
    expect(new Set(list).size).toBe(list.length);
  });

  it("sin recuperador, sólo intenciones", () => {
    const got = candidatesFor(post("Busco auto usado hasta 8 mil dólares"), null);
    expect(got.every((c) => c.source === "intent")).toBe(true);
    expect(got.map((c) => c.path)).toContain("/autos-usados-uruguay");
  });

  it("un hilo sin intención y sin tema de plata no tiene candidatas", () => {
    const retriever = fakeRetriever([page("/guias/algo")]);
    expect(candidatesFor(post("¿Qué banda toca el sábado en el Antel Arena?"), retriever)).toEqual([]);
  });
});
