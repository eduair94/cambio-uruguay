import { describe, expect, it } from "vitest";
import { hashCredential } from "../../classes/apikeys/credential";
import { createKeyStore, TooManyKeysError } from "../../classes/apikeys/store";
import { FakeKeyModel } from "./fakes";

const input = {
  ownerUid: "uid-1",
  ownerEmail: "ana@empresa.uy",
  label: "Pantalla",
  company: "Cambio Ejemplo",
  useCase: "Mostrar la pizarra en el local",
  website: null,
};

function setup(start = 1_000_000) {
  let clock = start;
  let n = 0;
  const model = new FakeKeyModel();
  const store = createKeyStore(model, {
    now: () => clock,
    generate: () => "cu_" + String(++n).padStart(32, "A"),
    lookupTimeoutMs: 30,
  });
  return { model, store, tick: (ms: number) => (clock += ms) };
}

describe("store de claves", () => {
  it("crea en plan gratuito, guarda sólo el hash y devuelve la clave una vez", async () => {
    const { model, store } = setup();
    const { record, plaintext } = await store.create(input);
    expect(record).toMatchObject({ plan: "free", status: "active", prefix: plaintext.slice(0, 8), label: "Pantalla" });
    expect(JSON.stringify(model.docs)).not.toContain(plaintext);
    expect(model.docs[0].keyHash).toBe(hashCredential(plaintext));
    expect(record).not.toHaveProperty("keyHash");
  });

  it("pone un tope de 3 claves activas por cuenta", async () => {
    const { store } = setup();
    for (let i = 0; i < 3; i++) await store.create(input);
    await expect(store.create(input)).rejects.toBeInstanceOf(TooManyKeysError);
    await expect(store.create({ ...input, ownerUid: "otra" })).resolves.toBeTruthy();
  });

  it("encuentra por hash y recuerda 60 s también la respuesta negativa", async () => {
    const { model, store, tick } = setup();
    const { plaintext } = await store.create(input);
    expect(await store.findActiveByHash(hashCredential(plaintext))).toMatchObject({ label: "Pantalla" });
    const invented = hashCredential("cu_" + "Z".repeat(32));
    expect(await store.findActiveByHash(invented)).toBeNull();
    const calls = model.findOneCalls;
    await store.findActiveByHash(invented);
    await store.findActiveByHash(invented);
    expect(model.findOneCalls).toBe(calls);
    tick(60_001);
    await store.findActiveByHash(invented);
    expect(model.findOneCalls).toBe(calls + 1);
  });

  it("una avalancha de claves inventadas no desaloja de la caché a las claves válidas", async () => {
    const { model, store } = setup();
    const { plaintext } = await store.create(input);
    await store.findActiveByHash(hashCredential(plaintext));
    for (let i = 0; i < 6000; i++) await store.findActiveByHash(`inventada-${i}`);
    const calls = model.findOneCalls;
    expect(await store.findActiveByHash(hashCredential(plaintext))).toMatchObject({ label: "Pantalla" });
    expect(model.findOneCalls).toBe(calls);
  });

  it("revocar rige ya en este proceso y queda fechado", async () => {
    const { store } = setup();
    const { record, plaintext } = await store.create(input);
    await store.findActiveByHash(hashCredential(plaintext));
    const revoked = await store.update(record.id, { status: "revoked" }, "uid-1");
    expect(revoked).toMatchObject({ status: "revoked" });
    expect(revoked?.revokedAt).not.toBeNull();
    expect(await store.findActiveByHash(hashCredential(plaintext))).toBeNull();
  });

  it("el dueño sólo toca sus claves", async () => {
    const { store } = setup();
    const { record } = await store.create(input);
    expect(await store.update(record.id, { status: "revoked" }, "intruso")).toBeNull();
    expect(await store.update("no-es-un-id", { status: "revoked" })).toBeNull();
  });

  it("lista por dueño, más nueva primero", async () => {
    const { store, tick } = setup();
    await store.create({ ...input, label: "Primera" });
    tick(1000);
    await store.create({ ...input, label: "Segunda" });
    await store.create({ ...input, ownerUid: "otra", label: "Ajena" });
    expect((await store.list("uid-1")).map((r) => r.label)).toEqual(["Segunda", "Primera"]);
    expect(await store.list()).toHaveLength(3);
  });

  it("si Mongo se cuelga, corta a tiempo y sirve la última respuesta conocida", async () => {
    const { model, store, tick } = setup();
    const { plaintext } = await store.create(input);
    const hash = hashCredential(plaintext);
    expect(await store.findActiveByHash(hash)).toMatchObject({ label: "Pantalla" });
    tick(61_000);
    model.findOne = (() => ({ lean: () => new Promise(() => undefined) })) as any;
    const started = Date.now();
    expect(await store.findActiveByHash(hash)).toMatchObject({ label: "Pantalla" });
    expect(Date.now() - started).toBeLessThan(1000);
  });

  it("sin respuesta conocida, un Mongo colgado falla rápido y no deja esperando al pedido", async () => {
    const { model, store } = setup();
    model.findOne = (() => ({ lean: () => new Promise(() => undefined) })) as any;
    const started = Date.now();
    await expect(store.findActiveByHash(hashCredential("cu_" + "B".repeat(32)))).rejects.toThrow();
    expect(Date.now() - started).toBeLessThan(1000);
  });

  it("anota el último uso", async () => {
    const { store } = setup();
    const { record } = await store.create(input);
    await store.touchLastUsed([record.id, "basura"], new Date("2026-09-27T12:00:00Z"));
    expect((await store.list("uid-1"))[0].lastUsedAt).toBe("2026-09-27T12:00:00.000Z");
  });
});
