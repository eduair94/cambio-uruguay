// El clon del bot tiene que instalar lo que dice SU lockfile, no lo que había el día que alguien
// corrió `npm install` a mano.
//
// `syncWorkspace` deja el árbol en `origin/main` con un `reset --hard`, pero `app/node_modules` no
// está versionado y nadie lo volvía a instalar. El 30/9/2026 el frontend subió a ESLint 10 y a un
// `@nuxt/eslint-config` que exporta `createConfigForNuxt`; el clon siguió con el ESLint 9.28 que se
// instaló el 18/8, así que `npm run lint` moría cargando la config —"does not provide an export
// named 'createConfigForNuxt'"— antes de mirar un solo archivo. Desde ese día TODA ampliación y toda
// página generada salió rechazada (la última publicada es del 24/9), y el aviso de Telegram sólo
// mostraba la cola del stack trace, sin la línea que decía por qué.
//
// El instalador es de mentira a propósito: así la prueba corre sin red y sin npm, y verifica lo que
// importa — cuándo se instala, cuándo no, y que una instalación fallida frena el portón.
import crypto from "crypto";
import fs from "fs";
import os from "os";
import path from "path";
import { afterEach, describe, expect, it, vi } from "vitest";

const LOCK = '{"name":"app","lockfileVersion":3,"packages":{"node_modules/eslint":{"version":"10.11.0"}}}\n';
const STAMP = path.join("app", "node_modules", ".genpage-lock.sha256");

let workspace = "";

function makeWorkspace({ lock = LOCK as string | null, stamp = null as string | null } = {}): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "genpage-deps-"));
  fs.mkdirSync(path.join(dir, "app", "node_modules"), { recursive: true });
  if (lock !== null) fs.writeFileSync(path.join(dir, "app", "package-lock.json"), lock, "utf8");
  if (stamp !== null) fs.writeFileSync(path.join(dir, STAMP), stamp, "utf8");
  return dir;
}

function sha(text: string): string {
  return crypto.createHash("sha256").update(text).digest("hex");
}

async function loadWorkspaceModule(dir: string) {
  process.env.GENPAGE_WORKSPACE = dir;
  vi.resetModules();
  return await import("../../classes/gaps/workspace");
}

afterEach(() => {
  delete process.env.GENPAGE_WORKSPACE;
  if (workspace && fs.existsSync(workspace)) fs.rmSync(workspace, { recursive: true, force: true });
  workspace = "";
});

describe("dependencias del clon al día con su lockfile", () => {
  it("instala cuando nunca se instaló con este control, y deja la marca del lockfile", async () => {
    workspace = makeWorkspace();
    const { ensureDependencies } = await loadWorkspaceModule(workspace);
    const install = vi.fn(async () => ({ ok: true, detail: "instalado" }));

    const result = await ensureDependencies(install);

    expect(result.ok).toBe(true);
    expect(install).toHaveBeenCalledTimes(1);
    expect(install).toHaveBeenCalledWith(path.join(workspace, "app"));
    expect(fs.readFileSync(path.join(workspace, STAMP), "utf8").trim()).toBe(sha(LOCK));
  });

  it("no reinstala si el lockfile es el mismo que se instaló", async () => {
    workspace = makeWorkspace({ stamp: `${sha(LOCK)}\n` });
    const { ensureDependencies } = await loadWorkspaceModule(workspace);
    const install = vi.fn(async () => ({ ok: true, detail: "instalado" }));

    const result = await ensureDependencies(install);

    expect(result.ok).toBe(true);
    expect(install).not.toHaveBeenCalled();
  });

  it("reinstala cuando main cambió el lockfile", async () => {
    workspace = makeWorkspace({ stamp: sha('{"name":"app","viejo":true}\n') });
    const { ensureDependencies } = await loadWorkspaceModule(workspace);
    const install = vi.fn(async () => ({ ok: true, detail: "instalado" }));

    const result = await ensureDependencies(install);

    expect(result.ok).toBe(true);
    expect(install).toHaveBeenCalledTimes(1);
    expect(fs.readFileSync(path.join(workspace, STAMP), "utf8").trim()).toBe(sha(LOCK));
  });

  it("marca el lockfile de main aunque npm lo reescriba al instalar", async () => {
    // `npm install --force` puede tocar `package-lock.json`; el próximo `reset --hard` lo devuelve a
    // lo de main, así que la marca tiene que ser la de main o reinstalaría en cada corrida.
    workspace = makeWorkspace();
    const { ensureDependencies } = await loadWorkspaceModule(workspace);
    const install = vi.fn(async (appDir: string) => {
      fs.writeFileSync(path.join(appDir, "package-lock.json"), '{"reescrito":true}\n', "utf8");
      return { ok: true, detail: "instalado" };
    });

    await ensureDependencies(install);

    expect(fs.readFileSync(path.join(workspace, STAMP), "utf8").trim()).toBe(sha(LOCK));
  });

  it("una instalación fallida no deja marca, así la próxima corrida lo vuelve a intentar", async () => {
    workspace = makeWorkspace();
    const { ensureDependencies } = await loadWorkspaceModule(workspace);
    const install = vi.fn(async () => ({ ok: false, detail: "ERESOLVE could not resolve" }));

    const result = await ensureDependencies(install);

    expect(result.ok).toBe(false);
    expect(result.detail).toContain("ERESOLVE");
    expect(fs.existsSync(path.join(workspace, STAMP))).toBe(false);
  });

  it("sin lockfile no hay contra qué comparar y no instala", async () => {
    workspace = makeWorkspace({ lock: null });
    const { ensureDependencies } = await loadWorkspaceModule(workspace);
    const install = vi.fn(async () => ({ ok: true, detail: "instalado" }));

    const result = await ensureDependencies(install);

    expect(result.ok).toBe(true);
    expect(install).not.toHaveBeenCalled();
  });

  it("verifyWorkspace instala antes de formatear, y una instalación fallida frena el portón ahí", async () => {
    // Formatear con el Prettier viejo también es formatear con la versión equivocada: la instalación
    // va primero. Sin prettier en el clon, si el formateo hubiera corrido antes el detalle hablaría
    // de prettier y no de la instalación.
    workspace = makeWorkspace();
    const { verifyWorkspace } = await loadWorkspaceModule(workspace);
    const install = vi.fn(async () => ({ ok: false, detail: "ERESOLVE could not resolve" }));

    const result = await verifyWorkspace([{ path: "app/utils/generated/addenda.ts" }], { install });

    expect(install).toHaveBeenCalledTimes(1);
    expect(result.ok).toBe(false);
    expect(result.detail).toContain("ERESOLVE");
    expect(result.detail).not.toContain("prettier");
  });
});

describe("la suite del app en el VPS", () => {
  it("corre con un timeout por test que aguanta la carga de producción", async () => {
    // Medido el 11/10/2026 con load average 27 sobre 32 núcleos: a 5 s fallaban 3-4 tests de
    // matriz por timeout, distintos en cada corrida; a 30 s, la suite entera en verde.
    workspace = makeWorkspace();
    const { GATE_TEST_ARGS } = await loadWorkspaceModule(workspace);

    const flag = GATE_TEST_ARGS.find((a) => a.startsWith("--testTimeout="));
    expect(flag).toBeDefined();
    expect(Number(flag!.split("=")[1])).toBeGreaterThanOrEqual(30000);
  });
});

describe("el extracto del aviso de rechazo", () => {
  it("conserva el principio y el final cuando el detalle es largo", async () => {
    workspace = makeWorkspace();
    const { failureExcerpt } = await loadWorkspaceModule(workspace);
    // La forma real del 11/10/2026: la causa arriba, 2.000 caracteres de stack trace abajo.
    const detail =
      "lint falló:\nOops! Something went wrong! :(\n\nESLint: 9.28.0\n\n" +
      "SyntaxError: The requested module '@nuxt/eslint-config' does not provide an export named 'createConfigForNuxt'\n" +
      "    at async loadConfigFile (config-loader.js:276:9)\n".repeat(40) +
      "    at async NodeHfs.walk (hfs.js:614:3)";

    const excerpt = failureExcerpt(detail, 1200);

    expect(excerpt.length).toBeLessThanOrEqual(1200);
    expect(excerpt).toContain("createConfigForNuxt");
    expect(excerpt).toContain("NodeHfs.walk");
  });

  it("un detalle corto sale entero", async () => {
    workspace = makeWorkspace();
    const { failureExcerpt } = await loadWorkspaceModule(workspace);

    expect(failureExcerpt("✖ 2 problems (2 errors, 0 warnings)", 1200)).toBe("✖ 2 problems (2 errors, 0 warnings)");
  });
});
