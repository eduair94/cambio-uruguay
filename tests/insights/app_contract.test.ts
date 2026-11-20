// La página privada copia el contrato a mano (`app/utils/usageInsights.ts`). Las dos listas de ids
// tienen que ser las mismas y en el mismo orden: un id que el backend agrega y el app no conoce es una
// señal que nunca se ve.
import fs from "fs";
import path from "path";
import { describe, expect, it } from "vitest";
import { SIGNAL_IDS, SOURCE_IDS } from "../../classes/insights/types";

const APP = path.join(__dirname, "..", "..", "app");

function constList(src: string, name: string): string[] {
  const body = new RegExp(`export const ${name}\\s*=\\s*\\[([\\s\\S]*?)\\]\\s*as const`).exec(src)?.[1];
  if (!body) throw new Error(`${name} no está en app/utils/usageInsights.ts`);
  return [...body.matchAll(/['"]([^'"]+)['"]/g)].map((m) => m[1]);
}

describe("contrato con el app", () => {
  const src = fs.readFileSync(path.join(APP, "utils", "usageInsights.ts"), "utf8");

  it("UI_SOURCE_IDS = SOURCE_IDS, en orden", () => {
    expect(constList(src, "UI_SOURCE_IDS")).toEqual([...SOURCE_IDS]);
  });

  it("UI_SIGNAL_IDS = SIGNAL_IDS, en orden", () => {
    expect(constList(src, "UI_SIGNAL_IDS")).toEqual([...SIGNAL_IDS]);
  });

  it("la ruta lee `key: 'site'` y saca el estado", () => {
    const route = fs.readFileSync(path.join(APP, "server", "api", "usage-insights.get.ts"), "utf8");
    expect(route).toMatch(/key: 'site'/);
    expect(route).toMatch(/state: 0/);
  });
});
