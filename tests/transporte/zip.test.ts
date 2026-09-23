// El lector de ZIP del comparador, que NO es el que ya tenía el repo.
//
// `classes/utilities/claims/zip.ts` abre la primera entrada de un archivo que tiene una sola; acá
// hacen falta entradas CONCRETAS por nombre (el `.dbf` de un shapefile que trae además `.shp`,
// `.shx`, `.prj`…), así que se recorre el directorio central entero. Eso es lo que se prueba: que
// lista todo y que devuelve la entrada pedida, no la primera.
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { readZipDirectory, readZipEntry } from "../../classes/transporte/sources/zip";
import { buildZip } from "./fixtures";

// El lector abre un descriptor sobre una RUTA (los archivos reales pesan 10,6 MB y no se cargan
// enteros para encontrar una entrada), así que el fixture tiene que existir en disco.
let directory: string;
let file: string;

const DBF = Buffer.from("registros del .dbf, con Ñ latin-1: \xd1", "latin1");
const PRJ = Buffer.from('PROJCS["WGS 84 / UTM zone 21S"]', "latin1");
const CSV = Buffer.from(`tipo_dia;cod_variante\n${"1;2601\n".repeat(500)}`, "latin1");

beforeAll(() => {
  directory = mkdtempSync(join(tmpdir(), "cu-transporte-zip-"));
  file = join(directory, "v_uptu_paradas.zip");
  writeFileSync(
    file,
    buildZip([
      { name: "v_uptu_paradas.prj", data: PRJ, method: 0 },
      { name: "v_uptu_paradas.dbf", data: DBF, method: 8 },
      { name: "uptu_pasada_variante.csv", data: CSV, method: 8 },
    ])
  );
});

afterAll(() => {
  rmSync(directory, { recursive: true, force: true });
});

describe("readZipDirectory", () => {
  it("lista TODAS las entradas, en el orden del directorio central", async () => {
    const entries = await readZipDirectory(file);
    expect(entries.map(entry => entry.name)).toEqual([
      "v_uptu_paradas.prj",
      "v_uptu_paradas.dbf",
      "uptu_pasada_variante.csv",
    ]);
  });

  it("declara el método y los dos tamaños de cada entrada", async () => {
    const entries = await readZipDirectory(file);
    const prj = entries.find(entry => entry.name.endsWith(".prj"))!;
    const dbf = entries.find(entry => entry.name.endsWith(".dbf"))!;
    const csv = entries.find(entry => entry.name.endsWith(".csv"))!;

    expect(prj.method).toBe(0);
    expect(prj.compressedSize).toBe(prj.uncompressedSize);
    expect(dbf.method).toBe(8);
    expect(dbf.uncompressedSize).toBe(DBF.length);
    // El CSV repetido comprime muchísimo: es el caso real (10,6 MB comprimidos, 61 MB de texto).
    expect(csv.uncompressedSize).toBe(CSV.length);
    expect(csv.compressedSize).toBeLessThan(csv.uncompressedSize);
  });

  it("los desplazamientos locales apuntan a cabeceras locales de verdad", async () => {
    const entries = await readZipDirectory(file);
    expect(entries.every(entry => entry.localOffset >= 0)).toBe(true);
    // Estrictamente crecientes: es lo que permite leer una entrada sin recorrer las anteriores.
    const offsets = entries.map(entry => entry.localOffset);
    expect([...offsets].sort((a, b) => a - b)).toEqual(offsets);
  });
});

describe("readZipEntry", () => {
  it("devuelve la entrada pedida por nombre, no la primera del archivo", async () => {
    // La primera entrada del fixture es el `.prj`, a propósito: es exactamente el caso que el lector
    // viejo del repo no podía resolver.
    const entry = await readZipEntry(file, name => /\.dbf$/i.test(name));
    expect(entry).not.toBeNull();
    expect(entry!.name).toBe("v_uptu_paradas.dbf");
    expect(entry!.data.equals(DBF)).toBe(true);
  });

  it("infla el método 8 (deflate) y devuelve el método 0 (guardado) tal cual", async () => {
    const stored = await readZipEntry(file, name => name.endsWith(".prj"));
    expect(stored!.data.equals(PRJ)).toBe(true);

    const deflated = await readZipEntry(file, name => name.endsWith(".csv"));
    expect(deflated!.data.equals(CSV)).toBe(true);
    expect(deflated!.data.toString("latin1").split("\n")[0]).toBe("tipo_dia;cod_variante");
  });

  it("devuelve null cuando no hay ninguna entrada que cumpla, sin inventar una", async () => {
    // `parseStops` distingue este null de un error para poder decir "el ZIP no trae la tabla .dbf",
    // que es un diagnóstico distinto de "el ZIP está roto".
    expect(await readZipEntry(file, name => name.endsWith(".shp"))).toBeNull();
  });

  it("falla ruidosamente si el archivo no es un ZIP", async () => {
    // El generador de la Intendencia devuelve una página HTML en vez del archivo cuando se le pide
    // el ZIP directamente: eso tiene que romper acá y no convertirse en "cero paradas".
    const html = join(directory, "no-es-un-zip.html");
    writeFileSync(html, "<html><body>Generando archivo…</body></html>");
    await expect(readZipDirectory(html)).rejects.toThrow(/fin del directorio central/i);
  });
});
