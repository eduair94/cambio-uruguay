import axios from "axios";
import { afterEach, describe, expect, it, vi } from "vitest";
import { probeSerp } from "../../classes/demand/serp";

const SENTINEL = "private-serp-diagnostic-sentinel";
const privateUrl = `https://private.example/${SENTINEL}`;

const axiosFailure = (extra: Record<string, unknown> = {}) =>
  Object.assign(new Error(SENTINEL), {
    isAxiosError: true,
    config: { url: privateUrl, headers: { authorization: SENTINEL } },
    request: { responseURL: privateUrl },
    ...extra,
  });

afterEach(() => vi.restoreAllMocks());

describe("probeSerp", () => {
  it("consulta Uruguay en español con ocho resultados y el timeout habitual", async () => {
    const get = vi.spyOn(axios, "get").mockResolvedValue({
      data: { results: [{ link: "https://example.com/guia" }] },
    });

    await probeSerp("licencia por duelo uruguay");

    expect(get).toHaveBeenCalledExactlyOnceWith(expect.any(String), expect.objectContaining({
      params: { query: "licencia por duelo uruguay", gl: "uy", lr: "lang_es", num: 8 },
      timeout: 12000,
    }));
  });

  it("respeta un timeout explícito sin reintentar", async () => {
    const get = vi.spyOn(axios, "get").mockRejectedValue(axiosFailure({ code: "ECONNABORTED" }));

    expect(await probeSerp("licencia uruguay", 2300)).toEqual({ status: "failed", reason: "timeout" });
    expect(get).toHaveBeenCalledExactlyOnceWith(expect.any(String), expect.objectContaining({ timeout: 2300 }));
  });

  it.each([
    { name: "foros", urls: ["https://reddit.com/r/uruguay/x"], verdict: "escribir", calculators: 0, institutional: 0, weak: 1 },
    { name: "organismos", urls: ["https://bps.gub.uy/licencias", "http://impo.com.uy/ley"], verdict: "escribir", calculators: 0, institutional: 2, weak: 0 },
    { name: "calculadoras", urls: ["https://misalario.uy/", "https://uy.talent.com/tax-calculator"], verdict: "no-entrar", calculators: 2, institutional: 0, weak: 0 },
    { name: "sin hueco claro", urls: ["https://example.com/guia"], verdict: "dudoso", calculators: 0, institutional: 0, weak: 0 },
  ])("conserva el veredicto de $name sin devolver las URLs", async ({ urls, verdict, calculators, institutional, weak }) => {
    vi.spyOn(axios, "get").mockResolvedValue({
      data: { results: urls.map((url, i) => i % 2 ? { url } : { link: url }) },
    });

    expect(await probeSerp("licencia uruguay")).toEqual({
      status: "classified",
      assessment: { verdict, reason: expect.any(String), calculators, institutional, weak },
    });
  });

  it.each([
    { featured_snippet: { url: "https://bps.gub.uy/respuesta" } },
    { unit_converter: { result: "40" } },
  ])("la caja de respuesta conserva el veto aunque haya un foro", async (box) => {
    vi.spyOn(axios, "get").mockResolvedValue({
      data: { results: [{ link: "https://reddit.com/r/uruguay/x" }], ...box },
    });

    expect(await probeSerp("licencia uruguay")).toEqual({
      status: "classified",
      assessment: {
        verdict: "no-entrar",
        reason: expect.stringMatching(/clic no existe/),
        calculators: 0,
        institutional: 0,
        weak: 1,
      },
    });
  });

  it("un objeto featured_snippet vacío no se interpreta como respuesta", async () => {
    vi.spyOn(axios, "get").mockResolvedValue({
      data: { results: [{ url: "https://example.com/guia" }], featured_snippet: {}, unit_converter: {} },
    });

    expect(await probeSerp("licencia uruguay")).toMatchObject({
      status: "classified", assessment: { verdict: "dudoso" },
    });
  });

  it("descarta registros inválidos y clasifica las URLs válidas de una respuesta mixta", async () => {
    vi.spyOn(axios, "get").mockResolvedValue({
      data: {
        results: [null, { link: "javascript:alert(1)" }, { link: "https://bps.gub.uy/licencias" },
          { link: "invalid", url: "http://impo.com.uy/ley" }, { link: "reddit.com/sin-protocolo" }],
      },
    });

    expect(await probeSerp("licencia uruguay")).toMatchObject({
      status: "classified", assessment: { verdict: "escribir", institutional: 2, weak: 0 },
    });
  });

  it("distingue una lista vacía de una respuesta inválida", async () => {
    vi.spyOn(axios, "get").mockResolvedValue({ data: { results: [] } });
    expect(await probeSerp("licencia uruguay")).toEqual({ status: "failed", reason: "empty-results" });
  });

  it.each([
    undefined,
    null,
    "<html>error</html>",
    {},
    { results: null },
    { results: {} },
    { results: "not-an-array" },
    { results: [null, 42, {}, { link: "" }] },
    { results: [{ link: "reddit.com/x" }, { url: "/relative" }] },
    { results: [{ link: "file:///tmp/private" }, { url: "javascript:alert(1)" }] },
    { results: [{ link: "https://" }, { url: "http://?q=private" }] },
  ])("identifica una respuesta sin URLs HTTP válidas (%j)", async (data) => {
    vi.spyOn(axios, "get").mockResolvedValue({ data });
    expect(await probeSerp("licencia uruguay")).toEqual({ status: "failed", reason: "invalid-response" });
  });

  it.each([100, 429, 503, 599])("conserva únicamente el código HTTP válido %s", async (status) => {
    const get = vi.spyOn(axios, "get").mockRejectedValue(axiosFailure({
      response: { status, data: SENTINEL, headers: { location: privateUrl } },
    }));

    const result = await probeSerp("licencia uruguay");
    expect(result).toEqual({ status: "failed", reason: "http", httpStatus: status });
    expect(JSON.stringify(result)).not.toContain(SENTINEL);
    expect(get).toHaveBeenCalledTimes(1);
  });

  it.each([undefined, 0, 99, 600, 429.5, "429", NaN, Infinity])("no persiste un código HTTP inválido (%s)", async (status) => {
    vi.spyOn(axios, "get").mockRejectedValue(axiosFailure({ response: { status, data: SENTINEL } }));
    expect(await probeSerp("licencia uruguay")).toEqual({ status: "failed", reason: "unexpected" });
  });

  it.each(["ECONNABORTED", "ETIMEDOUT"])("identifica timeout %s sin conservar el error", async (code) => {
    vi.spyOn(axios, "get").mockRejectedValue(axiosFailure({ code }));
    expect(await probeSerp("licencia uruguay")).toEqual({ status: "failed", reason: "timeout" });
  });

  it("identifica un fallo de red de Axios sin respuesta", async () => {
    vi.spyOn(axios, "get").mockRejectedValue(axiosFailure({ code: "ECONNREFUSED" }));
    expect(await probeSerp("licencia uruguay")).toEqual({ status: "failed", reason: "network" });
  });

  it.each([
    new Error(SENTINEL),
    { message: SENTINEL, code: "ETIMEDOUT", request: { url: privateUrl }, response: { status: 503, data: SENTINEL } },
    axiosFailure({ request: undefined }),
  ])("un error no reconocido queda en unexpected sin filtrar detalles", async (error) => {
    vi.spyOn(axios, "get").mockRejectedValue(error);
    const result = await probeSerp("licencia uruguay");
    expect(result).toEqual({ status: "failed", reason: "unexpected" });
    expect(JSON.stringify(result)).not.toContain(SENTINEL);
  });

  it("la clasificación tampoco devuelve URLs, cuerpos ni campos adicionales", async () => {
    vi.spyOn(axios, "get").mockResolvedValue({
      data: {
        results: [{ link: privateUrl, title: SENTINEL, snippet: SENTINEL }],
        message: SENTINEL,
        raw: SENTINEL,
      },
    });

    const result = await probeSerp("licencia uruguay");
    expect(result).toEqual({
      status: "classified",
      assessment: { verdict: "dudoso", reason: expect.any(String), calculators: 0, institutional: 0, weak: 0 },
    });
    expect(JSON.stringify(result)).not.toContain(SENTINEL);
  });
});
