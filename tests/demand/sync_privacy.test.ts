import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const deps = vi.hoisted(() => ({
  configured: vi.fn(),
  refresh: vi.fn(),
  save: vi.fn(),
  regress: vi.fn(),
  notify: vi.fn(),
}));

vi.mock("dotenv/config", () => ({}));
vi.mock("../../classes/appdb", () => ({ appDbConfigured: deps.configured }));
vi.mock("../../classes/demand/refresh", () => ({ refreshDemandQueue: deps.refresh }));
vi.mock("../../classes/demand/store", () => ({ saveDemandQueue: deps.save, queueWouldRegress: deps.regress }));
vi.mock("../../classes/notify", () => ({ notifyAdmin: deps.notify }));

const SENTINEL = "private-demand-query-and-response-sentinel";
const previousArgv = process.argv;

beforeEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
  process.argv = ["node", "sync_search_demand.ts"];
  vi.spyOn(console, "log").mockImplementation(() => {});
  vi.spyOn(console, "warn").mockImplementation(() => {});
  vi.spyOn(console, "error").mockImplementation(() => {});
  vi.spyOn(process, "exit").mockImplementation((() => undefined) as never);
  deps.regress.mockResolvedValue(false);
  deps.configured.mockReturnValue(true);
  deps.save.mockResolvedValue(undefined);
});

afterEach(() => {
  process.argv = previousArgv;
  vi.restoreAllMocks();
});

const output = () => JSON.stringify([
  ...vi.mocked(console.log).mock.calls,
  ...vi.mocked(console.warn).mock.calls,
  ...vi.mocked(console.error).mock.calls,
]);

describe("salida del job de demanda (dependencias simuladas)", () => {
  it("conserva la consulta en la cola privada sin imprimirla ni enviar un aviso nuevo", async () => {
    deps.refresh.mockResolvedValue({
      key: "demand_queue", asOf: "2026-11-02", harvested: 1, local: 1, inScope: 1, probed: 0,
      items: [{ query: SENTINEL, score: 0.4, why: SENTINEL }],
    });
    await import("../../sync_search_demand");
    await vi.waitFor(() => expect(process.exit).toHaveBeenCalledWith(0));
    expect(deps.save).toHaveBeenCalledWith(expect.objectContaining({ items: [expect.objectContaining({ query: SENTINEL })] }));
    expect(output()).not.toContain(SENTINEL);
    expect(deps.notify).not.toHaveBeenCalled();
  });

  it("el error no expone respuesta, consulta, credencial, mensaje ni stack", async () => {
    deps.refresh.mockRejectedValue(Object.assign(new Error(SENTINEL), {
      response: { data: { message: SENTINEL } },
      config: { url: `https://example.test/?query=${SENTINEL}`, headers: { authorization: SENTINEL } },
    }));
    await import("../../sync_search_demand");
    await vi.waitFor(() => expect(process.exit).toHaveBeenCalledWith(1));
    expect(console.error).toHaveBeenCalled();
    expect(output()).not.toContain(SENTINEL);
    expect(deps.save).not.toHaveBeenCalled();
    expect(deps.notify).not.toHaveBeenCalled();
  });

  it("tampoco imprime el error si falla antes del bloque principal", async () => {
    deps.configured.mockImplementation(() => { throw new Error(SENTINEL); });
    await import("../../sync_search_demand");
    await vi.waitFor(() => expect(process.exit).toHaveBeenCalledWith(1));
    expect(console.error).toHaveBeenCalled();
    expect(output()).not.toContain(SENTINEL);
    expect(deps.refresh).not.toHaveBeenCalled();
  });
});
