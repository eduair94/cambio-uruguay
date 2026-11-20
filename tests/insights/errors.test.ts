// Un error se vuelve texto SÓLO por sanitizeError: un error de axios lleva el token en sus cabeceras.
// Los secretos de mentira se arman en tiempo de ejecución (gitleaks escanea cada commit).
import fs from "fs";
import path from "path";
import { describe, expect, it } from "vitest";
import { nextBlock } from "../../classes/insights/blocks";
import { formatFatal, redact, sanitizeError } from "../../classes/insights/errors";
import { buildTelegramText, sourceLogLine } from "../../classes/insights/refresh";
import { SOURCE_IDS } from "../../classes/insights/types";
import { fakeSecrets, fixture, NOW_ISO } from "./helpers";

const S = fakeSecrets();

function axiosError(status: number, data: any = {}) {
  return Object.assign(new Error(`Request failed Bearer ${S.bearer} apikey=${S.bingKey} key ${S.googleKey}`), {
    isAxiosError: true,
    config: {
      headers: { Authorization: `Bearer ${S.bearer}`, "X-Goog-Api-Key": S.googleKey },
      params: { apikey: S.bingKey },
      url: `https://x/y?apikey=${S.bingKey}`,
    },
    request: { path: `/x?apikey=${S.bingKey}` },
    response: { status, data },
  });
}

const leaks = (text: string) => [S.bearer, S.googleKey, S.bingKey, S.jwt, S.googleAccess].filter((s) => text.includes(s));

describe("sanitizeError", () => {
  it("un error de axios es fuente + código + proveedor, nada más", () => {
    expect(sanitizeError(axiosError(429, { error: { status: "RESOURCE_EXHAUSTED" } }), "ga4Behavior")).toBe(
      "ga4Behavior: http 429 RESOURCE_EXHAUSTED"
    );
    expect(sanitizeError(axiosError(400, { ErrorCode: 3, Message: "x" }), "bing")).toBe("bing: http 400 ErrorCode 3");
    expect(sanitizeError(axiosError(200, fixture("cf_graphql_authz_error")), "cf")).toBe("cf: http 200 authz");
    const net = Object.assign(new Error("boom"), { isAxiosError: true, code: "ECONNRESET", config: {} });
    expect(sanitizeError(net, "crux")).toBe("crux: http sin respuesta ECONNRESET");
  });

  it("ninguna salida lleva un secreto, por ningún camino", () => {
    const e = axiosError(403, { error: { status: "PERMISSION_DENIED" } });
    const failed = nextBlock("clarity", null, { kind: "failed", note: sanitizeError(e, "clarity") }, NOW_ISO);
    const outputs = [
      sanitizeError(e, "clarity"),
      failed.note || "",
      sourceLogLine(failed, 10),
      formatFatal(e),
      formatFatal(new Error(`falló Bearer ${S.bearer} con ${S.googleKey}`)),
      formatFatal(`${S.jwt} y ${S.googleAccess}`),
      formatFatal({ toString: () => `apikey=${S.bingKey}` }),
    ];
    for (const o of outputs) expect(leaks(o), o).toEqual([]);
  });

  it("el texto de Telegram se arma sin errores ni secretos", () => {
    const failed = nextBlock("bing", null, { kind: "failed", note: sanitizeError(axiosError(500), "bing") }, NOW_ISO);
    const snap: any = { day: "2026-11-20", signals: [], sources: {} };
    for (const id of SOURCE_IDS) snap.sources[id] = { status: "ok" };
    snap.sources.bing = failed;
    const prev: any = { sources: { bing: { status: "ok" } } };
    const text = buildTelegramText(snap, prev) || "";
    expect(text).toContain("bing");
    expect(leaks(text)).toEqual([]);
  });

  it("redact cubre cada forma", () => {
    expect(redact(`Bearer ${S.bearer}`)).toBe("[redacted]");
    expect(redact(`?apikey=${S.bingKey}&x=1`)).toBe("?[redacted]&x=1");
    expect(redact(`key=${S.googleKey}`)).toBe("[redacted]");
    expect(redact("access_token=abc123")).toBe("[redacted]");
    expect(redact(S.jwt)).toBe("[redacted]");
    expect(redact(S.googleAccess)).toBe("[redacted]");
    expect(redact(S.googleKey)).toBe("[redacted]");
    const authz = String(fixture("cf_graphql_authz_error").errors[0].message).replace("<redacted>", "abc123def");
    expect(redact(authz)).not.toContain("abc123def");
  });

  it("ningún archivo del job pasa un error directo a la consola", () => {
    const root = path.join(__dirname, "..", "..");
    const files = [path.join(root, "sync_usage_insights.ts")];
    const walk = (dir: string) => {
      for (const n of fs.readdirSync(dir)) {
        const f = path.join(dir, n);
        if (fs.statSync(f).isDirectory()) walk(f);
        else if (n.endsWith(".ts")) files.push(f);
      }
    };
    walk(path.join(root, "classes", "insights"));
    expect(files.length).toBeGreaterThan(10);
    const re = /console\.(?:log|warn|error|info)\((?:[^()]*,\s*)?(?:e|err|error|reason)\s*\)/;
    const offenders = files.filter((f) => re.test(fs.readFileSync(f, "utf8"))).map((f) => path.relative(root, f));
    expect(offenders).toEqual([]);
  });
});
