// El paso que hacía falta para que el portón fuera alcanzable.
//
// `emit.ts` escribe texto a mano: `JSON.stringify` para cada string (comillas dobles, donde el
// Prettier del app quiere simples) y un campo por línea, que un título de fuente largo pasa de 100
// columnas. Las dos cosas son errores `prettier/prettier`, así que el archivo emitido NUNCA pasaba
// `npm run lint` tal cual salía: medido el 2026-09-23 sobre una ampliación real, 6 errores antes y
// 0 después de formatear. Por eso `verifyWorkspace` formatea primero y por eso lo hace adentro y no
// en cada llamador.
//
// El binario de Prettier acá es de mentira a propósito: registra su argv y toca los archivos. Así
// la prueba corre sin `app/node_modules` y verifica lo único que importa además del formato — que
// se le pasen EXACTAMENTE los archivos de esta corrida y nunca el árbol entero.
import fs from "fs";
import os from "os";
import path from "path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const FAKE_PRETTIER = `
const fs = require('fs')
const path = require('path')
const argv = process.argv.slice(2)
fs.writeFileSync(path.join(process.cwd(), 'prettier-argv.json'), JSON.stringify(argv), 'utf8')
for (const arg of argv) {
  if (arg.startsWith('--')) continue
  const full = path.join(process.cwd(), arg)
  fs.writeFileSync(full, fs.readFileSync(full, 'utf8') + '\\n// formateado\\n', 'utf8')
}
`;

const EMITTED = "app/utils/generated/addenda.ts";

let workspace: string;

function makeWorkspace({ withPrettier }: { withPrettier: boolean }): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "genpage-ws-"));
  fs.mkdirSync(path.join(dir, "app", "node_modules"), { recursive: true });
  fs.mkdirSync(path.join(dir, path.dirname(EMITTED)), { recursive: true });
  fs.writeFileSync(path.join(dir, EMITTED), "export const addenda = []\n", "utf8");
  if (withPrettier) {
    const bin = path.join(dir, "app", "node_modules", "prettier", "bin");
    fs.mkdirSync(bin, { recursive: true });
    fs.writeFileSync(path.join(bin, "prettier.cjs"), FAKE_PRETTIER, "utf8");
  }
  return dir;
}

async function loadWorkspaceModule(dir: string) {
  process.env.GENPAGE_WORKSPACE = dir;
  // El módulo lee la env una sola vez, al cargarse.
  vi.resetModules();
  return await import("../../classes/gaps/workspace");
}

afterEach(() => {
  delete process.env.GENPAGE_WORKSPACE;
  if (workspace && fs.existsSync(workspace)) fs.rmSync(workspace, { recursive: true, force: true });
});

describe("formatear lo emitido antes de lintearlo", () => {
  beforeEach(() => {
    workspace = "";
  });

  it("le pasa a prettier exactamente los archivos de la corrida, y ninguno más", async () => {
    workspace = makeWorkspace({ withPrettier: true });
    const { formatFiles } = await loadWorkspaceModule(workspace);

    const result = await formatFiles([{ path: EMITTED }]);

    expect(result.ok).toBe(true);
    const argv = JSON.parse(fs.readFileSync(path.join(workspace, "prettier-argv.json"), "utf8"));
    expect(argv).toEqual(["--write", EMITTED]);
    expect(fs.readFileSync(path.join(workspace, EMITTED), "utf8")).toContain("// formateado");
  });

  it("sin archivos no invoca a prettier", async () => {
    workspace = makeWorkspace({ withPrettier: true });
    const { formatFiles } = await loadWorkspaceModule(workspace);

    const result = await formatFiles([]);

    expect(result.ok).toBe(true);
    expect(fs.existsSync(path.join(workspace, "prettier-argv.json"))).toBe(false);
  });

  it("si falta prettier lo dice en vez de publicar sin formatear", async () => {
    workspace = makeWorkspace({ withPrettier: false });
    const { formatFiles } = await loadWorkspaceModule(workspace);

    const result = await formatFiles([{ path: EMITTED }]);

    expect(result.ok).toBe(false);
    expect(result.detail).toContain("prettier");
  });

  it("verifyWorkspace formatea antes de correr el lint", async () => {
    // Sin prettier el formateo falla, y el portón tiene que morir AHÍ: si el lint hubiera corrido
    // primero, el detalle hablaría de npm y no de prettier.
    workspace = makeWorkspace({ withPrettier: false });
    const { verifyWorkspace } = await loadWorkspaceModule(workspace);

    const result = await verifyWorkspace([{ path: EMITTED }]);

    expect(result.ok).toBe(false);
    expect(result.detail).toContain("prettier");
  });
});
