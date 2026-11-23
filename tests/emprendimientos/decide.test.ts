// Qué se publica y qué no: la evidencia de Uruguay, la clasificación validada, la decisión y la
// ficha pública (que no lleve nada privado).
import { describe, expect, it } from "vitest";
import { accountBlock, classifyAccounts, needsClassification, validateItem } from "../../classes/emprendimientos/classify";
import { decide, INACTIVE_DAYS, schedule, uruguayVerdict } from "../../classes/emprendimientos/decide";
import { barrioFromText, publicListing, signedUrlExpiry } from "../../classes/emprendimientos/listing";
import type { Candidate, Classification, SourceRef } from "../../classes/emprendimientos/types";
import { textSaysUruguay, uruguayEvidence } from "../../classes/emprendimientos/uruguay";
import { OE, post, profile } from "./fixtures";

const NOW = new Date("2026-11-23T19:00:00.000Z");

const cls = (over: Partial<Classification> = {}): Classification => ({
  tipo: "emprendimiento",
  uruguaya: "si",
  rubro: "accesorios",
  etiquetas: ["tote bag"],
  resumen: "Tote bags personalizadas a pedido, con retiro o envío.",
  ofrece: "productos",
  envios: "no-dice",
  departamento: null,
  barrio: null,
  raro: false,
  riesgo: null,
  model: "test",
  at: NOW.toISOString(),
  inputHash: "x",
  ...over,
});

const reddit: SourceRef = { kind: "reddit", day: "2026-11-23", url: "https://www.reddit.com/r/uruguay/comments/x/", label: "hilo", text: "Llamame al 099 123 456" };

const candidate = (over: Partial<Candidate> = {}): Candidate => ({
  handle: "luperouy",
  state: "pendiente",
  reason: null,
  sources: [reddit],
  firstSeenAt: NOW.toISOString(),
  profile: profile(),
  lastReadAt: NOW.toISOString(),
  lastReadStatus: "ok",
  unreadableStreak: 0,
  goneStreak: 0,
  classification: cls(),
  listedAt: null,
  ...over,
});

describe("evidencia de Uruguay", () => {
  const ev = (biography: string, handle = "tienda", links: string[] = []) => uruguayEvidence({ handle, fullName: "Tienda", biography, links });

  it("encuentra las marcas escritas", () => {
    expect(ev("📍 Montevideo").markers).toContain("montevideo");
    expect(ev("Hecho en 🇺🇾").markers).toContain("🇺🇾");
    expect(ev("Pedidos al 099 123 456").markers).toContain("teléfono uruguayo");
    expect(ev("", "bombshop.uy").markers).toContain("handle .uy");
    expect(ev("", "x", ["https://wa.me/59899123456"]).markers).toContain("WhatsApp +598");
    expect(ev("Pickup Pocitos").barrio).toBe("Pocitos");
    expect(ev("📍 Maldonado").departamento).toBe("maldonado");
  });

  it("una palabra común no alcanza sola, y una marca extranjera sola rechaza", () => {
    expect(textSaysUruguay(ev("Perfumes y colonia"))).toBe(false);
    expect(textSaysUruguay(ev("Envíos a todo el país 🇦🇷 CABA"))).toBe(false);
    expect(ev("Envíos a todo el país 🇦🇷 CABA").foreign.length).toBeGreaterThan(0);
    // Dos marcas uruguayas ganan sobre una mención a Buenos Aires ("envíos a Buenos Aires también").
    expect(textSaysUruguay(ev("📍 Montevideo, Uruguay. Envíos también a Buenos Aires"))).toBe(true);
  });

  it("veredicto: texto, o fuente uruguaya fuerte, o contexto + la IA", () => {
    const none = ev("Tote bags personalizadas");
    expect(uruguayVerdict([reddit], none, cls({ uruguaya: "si" })).ok).toBe(true);
    expect(uruguayVerdict([reddit], none, cls({ uruguaya: "dudoso" })).ok).toBe(false);
    expect(uruguayVerdict([{ kind: "uruguay-emprendedor", day: "2026-11-23" }], none, cls({ uruguaya: "dudoso" })).ok).toBe(true);
    expect(uruguayVerdict([{ kind: "mencion", day: "2026-11-23" }], ev("Envíos CABA 🇦🇷"), cls({ uruguaya: "si" })).ok).toBe(false);
  });
});

describe("decidir", () => {
  it("publica un emprendimiento uruguayo activo", () => {
    expect(decide(candidate(), profile(), cls(), NOW).state).toBe("publicada");
  });

  it("rechaza por lo que la cuenta ES, nunca por si parece confiable", () => {
    expect(decide(candidate(), profile(), cls({ tipo: "personal" }), NOW)).toMatchObject({ state: "rechazada", reason: "es personal" });
    expect(decide(candidate(), profile(), cls({ riesgo: "vapeadores" }), NOW).state).toBe("rechazada");
    expect(decide(candidate(), profile({ followers: 400_000 }), cls(), NOW).state).toBe("rechazada");
    expect(decide(candidate(), profile({ posts: [post({ code: "AAAAAAAAAA1" })] }), cls(), NOW).state).toBe("rechazada");
  });

  it("una cuenta quieta más de dos años es inactiva; un año y medio todavía no", () => {
    const old = new Date(NOW.getTime() - (INACTIVE_DAYS + 5) * 86_400_000).toISOString().slice(0, 10);
    const quiet = new Date(NOW.getTime() - 540 * 86_400_000).toISOString().slice(0, 10);
    const grid = (date: string) => profile({ posts: [1, 2, 3].map(i => post({ code: `AAAAAAAAAA${i}`, date })) });
    expect(decide(candidate(), grid(old), cls(), NOW).state).toBe("inactiva");
    expect(decide(candidate(), grid(quiet), cls(), NOW).state).toBe("publicada");
  });

  it("redes y tiendas colectivas uruguayas quedan como curadoras (para descubrir), no en la grilla", () => {
    expect(decide(candidate(), profile({ biography: "Red de emprendedores de Uruguay" }), cls({ tipo: "medio-o-comunidad" }), NOW).state).toBe("curadora");
  });

  it("'no existe' tiene que repetirse; una lectura sin perfil no cambia nada", () => {
    const listed = candidate({ state: "publicada" });
    expect(decide({ ...listed, goneStreak: 1 }, { ...profile(), status: "missing" }, cls(), NOW).state).toBe("publicada");
    expect(decide({ ...listed, goneStreak: 2 }, { ...profile(), status: "missing" }, cls(), NOW).state).toBe("inexistente");
    expect(decide(listed, { ...profile(), status: "unreadable" }, cls(), NOW).state).toBe("publicada");
  });

  it("sin clasificación espera; una baja es para siempre", () => {
    expect(decide(candidate(), profile(), null, NOW).state).toBe("pendiente");
    expect(decide(candidate({ state: "baja" }), profile(), cls(), NOW).state).toBe("baja");
  });

  it("una publicada se relee antes de que venzan sus fotos", () => {
    const expiry = signedUrlExpiry(`https://x.cdninstagram.com/a.jpg?oe=${OE}`)!;
    expect(new Date(expiry).toISOString()).toBe("2026-11-28T03:20:54.000Z");
    const due = schedule({ ...candidate({ state: "publicada" }), lastReadAt: NOW.toISOString() }, expiry, NOW).dueAt.getTime();
    expect(due).toBeLessThan(expiry);
    expect(due).toBeLessThanOrEqual(NOW.getTime() + 3 * 86_400_000);
    // Una sugerencia sin leer va primero que todo.
    expect(schedule({ ...candidate({ state: "pendiente", sources: [{ kind: "sugerencia", day: "x" }] }), lastReadAt: null }, null, NOW).priority).toBe(0);
  });
});

describe("clasificación", () => {
  it("valida contra listas cerradas y limpia el resumen", () => {
    const ok = validateItem({ handle: "x", tipo: "emprendimiento", uruguaya: "si", rubro: "comida", etiquetas: ["Torta", "torta", "alfajor"], resumen: "¡Tortas por encargo! 🎂", ofrece: "productos", envios: "local", departamento: "montevideo", barrio: "", raro: false, riesgo: "" }, "h", "m", NOW.toISOString());
    expect(ok).toMatchObject({ rubro: "comida", etiquetas: ["torta", "alfajor"], departamento: "montevideo", barrio: null, riesgo: null });
    expect(ok!.resumen).not.toMatch(/[!🎂]/u);
    expect(validateItem({ tipo: "emprendimiento", uruguaya: "si", rubro: "joyería", ofrece: "productos", envios: "local" }, "h", "m", "t")).toBeNull();
    expect(validateItem({ tipo: "tienda", uruguaya: "si", rubro: "comida", ofrece: "productos", envios: "local" }, "h", "m", "t")).toBeNull();
  });

  it("no reclasifica si la bio no cambió, sí a los 60 días o con bio nueva", () => {
    const p = profile();
    const first = (async () => (await classifyAccounts([{ profile: p, sources: [] }], async () => ({ cuentas: [{ handle: "luperouy", tipo: "emprendimiento", uruguaya: "si", rubro: "accesorios", etiquetas: [], resumen: "Tote bags.", ofrece: "productos", envios: "no-dice", departamento: "ninguno", barrio: "", raro: false, riesgo: "" }] }) as never, NOW)).get("luperouy")!)();
    return first.then(c => {
      expect(needsClassification(c, p, NOW)).toBe(false);
      expect(needsClassification(c, { ...p, biography: "otra" }, NOW)).toBe(true);
      expect(needsClassification(c, p, new Date(NOW.getTime() + 61 * 86_400_000))).toBe(true);
    });
  });

  it("una respuesta con un handle que no se pidió no entra", async () => {
    const out = await classifyAccounts([{ profile: profile(), sources: [] }], async () => ({ cuentas: [{ handle: "otra", tipo: "emprendimiento", uruguaya: "si", rubro: "comida", etiquetas: [], resumen: "x", ofrece: "productos", envios: "local", departamento: "ninguno", barrio: "", raro: false, riesgo: "" }] }) as never, NOW);
    expect(out.size).toBe(0);
  });

  it("el bloque del prompt lleva bio, fotos y pistas de la fuente", () => {
    const block = accountBlock({ profile: profile({ posts: [post({ code: "AAAAAAAAAA1", alt: "Puede ser una imagen de bolso" })] }), sources: [{ kind: "uruguay-emprendedor", day: "x", label: "Lupero", departamentoHint: "montevideo" }] });
    expect(block).toContain("@luperouy");
    expect(block).toContain("Puede ser una imagen de bolso");
    expect(block).toContain("uruguay-emprendedor: Lupero: montevideo");
  });
});

describe("ficha pública", () => {
  it("sale sólo de lo publicado, sin texto de las fuentes ni teléfonos", () => {
    const row = candidate({ state: "publicada", listedAt: NOW.toISOString(), profile: profile({ links: ["https://wa.me/59899123456"], biography: "Pedidos al 099 123 456 📍 Montevideo" }) });
    const listing = publicListing(row, uruguayEvidence(row.profile!), NOW)!;
    expect(listing).not.toBeNull();
    const json = JSON.stringify(listing);
    expect(json).not.toContain("099 123 456");
    expect(json).not.toContain("59899123456");
    expect(json).not.toContain("Llamame");
    expect(listing.whatsapp).toBe(true);
    expect(listing.soloInstagram).toBe(true);
    expect(listing.departamento).toBe("montevideo");
    expect(listing.sources).toEqual([{ kind: "reddit", label: "Recomendada en Reddit: «hilo»", url: "https://www.reddit.com/r/uruguay/comments/x/" }]);
    expect(Object.keys(listing).sort()).toEqual(
      ["barrio", "departamento", "envios", "followers", "handle", "lastPostAt", "listedAt", "name", "ofrece", "photosExpireAt", "posts", "postsLast90", "profilePic", "raro", "readAt", "rubro", "search", "soloInstagram", "sources", "summary", "tags", "website", "whatsapp"].sort()
    );
  });

  it("el barrio sale del diccionario, nunca del texto libre de la IA", () => {
    // Lo que escribió la IA en la primera prueba (23/11/2026).
    expect(barrioFromText("ninguno", "montevideo")).toBeNull();
    expect(barrioFromText("próxima a Antel Arena", "montevideo")).toBeNull();
    expect(barrioFromText("Pocitos", "montevideo")).toBe("Pocitos");
    expect(barrioFromText("Pando", null)).toBe("Pando");
    const row = candidate({ state: "publicada", classification: cls({ barrio: "ninguno", departamento: "montevideo" }) });
    expect(publicListing(row, null, NOW)!.barrio).toBeNull();
  });

  it("no publica colaboraciones de otras cuentas en su grilla, ni una ficha leída hace más de 14 días", () => {
    const row = candidate({ state: "publicada", profile: profile({ posts: [post({ code: "AAAAAAAAAA1" }), post({ code: "AAAAAAAAAA2", owner: "otra" })] }) });
    expect(publicListing(row, null, NOW)!.posts.map(p => p.code)).toEqual(["AAAAAAAAAA1"]);
    expect(publicListing(row, null, new Date(NOW.getTime() + 15 * 86_400_000))).toBeNull();
    expect(publicListing(candidate({ state: "rechazada" }), null, NOW)).toBeNull();
  });
});
