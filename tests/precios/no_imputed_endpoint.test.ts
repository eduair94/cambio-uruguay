// `compararCanasta` tienta: una llamada de 65 s contra los 341 s del barrido
// por artículo, y encima devuelve el total de la canasta por local calculado
// por el propio Estado. Y miente.
//
// Medido el 2026-09-07 para "Nalga vacuna con hueso" (artículo 114): 28
// observaciones reales, y la matriz muestra el mismo "$509.32 (*)" en 722 de
// 722 locales, con 694 celdas sin fecha. Por eso los totales por local se
// aplastan a 1,18× mientras los artículos sueltos se abren hasta 4,86×: quien
// rankee supermercados con ese total ordena promedios, no góndolas. Y su matriz
// tiene 6 claves de columna duplicadas, así que tampoco se puede unir a locales.
//
// Este test existe para que nadie lo reintroduzca por eficiencia.
import fs from "fs";
import path from "path";
import { describe, expect, it } from "vitest";

const ROOT = path.resolve(__dirname, "../..");

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else if (entry.name.endsWith(".ts")) out.push(full);
  }
  return out;
}

/**
 * El archivo sin comentarios.
 *
 * Hace falta porque los comentarios de este pipeline NOMBRAN el endpoint
 * prohibido para explicar por que no se usa —eso es documentacion y tiene que
 * seguir permitido—; lo que no se permite es que aparezca en el CODIGO. La
 * primera version de este test buscaba en el archivo entero y se disparaba
 * contra sus propias explicaciones.
 */
const codeOf = (file: string): string =>
  fs
    .readFileSync(file, "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/^\s*\/\/.*$/gm, " ");

describe("el endpoint que imputa esta prohibido", () => {
  it("ningun modulo del pipeline lo llama", () => {
    const files = [...walk(path.join(ROOT, "classes/precios")), path.join(ROOT, "sync_precios.ts")];
    const offenders = files.filter((file) => codeOf(file).includes("compararCanasta"));
    expect(offenders.map((file) => path.relative(ROOT, file))).toEqual([]);
  });

  it("el parseo sigue rechazando la marca de imputacion", () => {
    const source = fs.readFileSync(path.join(ROOT, "classes/precios/parse.ts"), "utf8");
    expect(source).toContain('includes("(*)")');
  });

  it("el unico endpoint POST del barrido es compararArticulo", () => {
    const posts = codeOf(path.join(ROOT, "classes/precios/sweep.ts")).match(/\$\{SIPC_BASE\}\/(\w+)/g) || [];
    expect(posts).toEqual(["${SIPC_BASE}/compararArticulo"]);
  });
});
