import { promises as fs } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createInterface } from "node:readline";
import { deflateRawSync } from "node:zlib";
import { describe, expect, it } from "vitest";
import { aggregateClaims, claimCategory, splitCsvLine } from "../../classes/utilities/claims/aggregate";
import { openFirstZipEntry } from "../../classes/utilities/claims/zip";

function zip(name: string, content: Buffer, stored = false): Buffer {
  const data = stored ? content : deflateRawSync(content);
  const nameBytes = Buffer.from(name, "utf8");
  const local = Buffer.alloc(30);
  local.writeUInt32LE(0x04034b50, 0); local.writeUInt16LE(stored ? 0 : 8, 8);
  local.writeUInt32LE(data.length, 18); local.writeUInt32LE(content.length, 22); local.writeUInt16LE(nameBytes.length, 26);
  const central = Buffer.alloc(46);
  central.writeUInt32LE(0x02014b50, 0); central.writeUInt16LE(stored ? 0 : 8, 10);
  central.writeUInt32LE(data.length, 20); central.writeUInt32LE(content.length, 24); central.writeUInt16LE(nameBytes.length, 28);
  central.writeUInt32LE(0, 42);
  const directoryOffset = local.length + nameBytes.length + data.length;
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0); end.writeUInt16LE(1, 8); end.writeUInt16LE(1, 10);
  end.writeUInt32LE(central.length + nameBytes.length, 12); end.writeUInt32LE(directoryOffset, 16);
  return Buffer.concat([local, nameBytes, data, central, nameBytes, end]);
}
async function readAll(path: string): Promise<string> {
  const entry = await openFirstZipEntry(path);
  const chunks: Buffer[] = [];
  for await (const chunk of entry.stream) chunks.push(chunk as Buffer);
  return Buffer.concat(chunks).toString("utf8");
}
async function* lines(values: string[]) { for (const value of values) yield value; }

const HEADER = "NUMERO_RECLAMO,FECHA_INGRESO_RECLAMO,CODIGO_ESTADO,DESC_ESTADO,FECHA_DESDE_EN_ESTADO,CODIGO_AREA,DESC_AREA,CODIGO_GRUPO,DESC_GRUPO,CODIGO_TIPOPROBLEMA,DESC_TIPOPROBLEMA,LATITUD,LONGITUD";
const row = (day: string, area: string, group: string, lat = "-34.9", lng = "-56.15") =>
  `1,${day} 00:00:00,40,Finalizado,${day} 00:00:00,1,${area},2,"${group}",3,x,${lat},${lng}`;
const filler = Array.from({ length: 1000 }, () => row("2020-01-01", "Arbolado", "Arbolado"));
const locate = (lng: number, lat: number) => (lat === -34.9 ? "8" : lat === -34.8 ? "35" : null);

describe("ZIP reader", () => {
  it("inflates the first entry of a deflated and a stored archive", async () => {
    const dir = await fs.mkdtemp(join(tmpdir(), "zip-test-"));
    const text = "a,b\n" + "1,2\n".repeat(5000);
    await fs.writeFile(join(dir, "d.zip"), zip("Reclamos.csv", Buffer.from(text)));
    await fs.writeFile(join(dir, "s.zip"), zip("Reclamos.csv", Buffer.from(text), true));
    expect(await readAll(join(dir, "d.zip"))).toBe(text);
    expect(await readAll(join(dir, "s.zip"))).toBe(text);
    expect((await openFirstZipEntry(join(dir, "d.zip"))).name).toBe("Reclamos.csv");
    await fs.writeFile(join(dir, "bad.zip"), Buffer.from("not a zip"));
    await expect(openFirstZipEntry(join(dir, "bad.zip"))).rejects.toThrow();
    await fs.rm(dir, { recursive: true, force: true });
  });
});

describe("SUR aggregate", () => {
  it("splits quoted CSV fields with commas", () => {
    expect(splitCsvLine('1,"Solicitud de retiro de poda, escombros",x')).toEqual(["1", "Solicitud de retiro de poda, escombros", "x"]);
    expect(splitCsvLine('1,"abierto')).toBeNull();
  });

  it("keeps only the four families about living in a street", () => {
    expect(claimCategory("Alumbrado", "Alumbrado")).toBe("alumbrado");
    expect(claimCategory("Saneamiento", "Bocas de Tormenta")).toBe("saneamiento");
    expect(claimCategory("Limpieza", "Estado de los contenedores")).toBe("limpieza");
    expect(claimCategory("Limpieza", "Solicitud de retiro de poda, escombros o residuos de gran tamaño")).toBeNull();
    expect(claimCategory("Calles y veredas", "Viales")).toBe("calles");
    expect(claimCategory("Arbolado", "Arbolado")).toBeNull();
  });

  it("counts the last twelve complete months per barrio", async () => {
    const result = await aggregateClaims(lines([
      HEADER, ...filler,
      row("2025-08-31", "Alumbrado", "Alumbrado"),
      row("2025-09-01", "Alumbrado", "Alumbrado"),
      row("2026-08-31", "Saneamiento", "Conexiones y Colectores", "-34.8"),
      row("2026-09-10", "Alumbrado", "Alumbrado"),
      row("2026-01-10", "Alumbrado", "Alumbrado", "-40"),
      row("2026-01-10", "Limpieza", "Problema de limpieza"),
    ]), locate, new Date("2026-09-19T00:00:00Z"));
    expect(result.periodFrom).toBe("2025-09-01");
    expect(result.periodTo).toBe("2026-08-31");
    expect(result.countsByOfficialCode["8"]).toEqual({ alumbrado: 1, saneamiento: 0, limpieza: 1, calles: 0 });
    expect(result.countsByOfficialCode["35"].saneamiento).toBe(1);
    expect(result.unassigned).toBe(1);
  });

  it("treats the newest month as complete only when it reaches its last day, and ignores the future", async () => {
    const result = await aggregateClaims(lines([HEADER, ...filler, row("2026-08-31", "Alumbrado", "Alumbrado"), row("2031-01-01", "Alumbrado", "Alumbrado")]),
      locate, new Date("2026-09-19T00:00:00Z"));
    expect(result.periodTo).toBe("2026-08-31");
  });

  it("refuses a file that is not the archive", async () => {
    await expect(aggregateClaims(lines(["a,b", "1,2"]), locate)).rejects.toThrow();
    await expect(aggregateClaims(lines([HEADER, row("2026-01-01", "Alumbrado", "Alumbrado")]), locate)).rejects.toThrow("too small");
  });
});

describe("readline over the ZIP stream", () => {
  it("feeds the aggregator from a real archive", async () => {
    const dir = await fs.mkdtemp(join(tmpdir(), "zip-test-"));
    const csv = [HEADER, ...filler, row("2026-08-31", "Alumbrado", "Alumbrado")].join("\r\n");
    await fs.writeFile(join(dir, "r.zip"), zip("Reclamos.csv", Buffer.from(csv)));
    const entry = await openFirstZipEntry(join(dir, "r.zip"));
    const result = await aggregateClaims(createInterface({ input: entry.stream, crlfDelay: Infinity }), locate, new Date("2026-09-19T00:00:00Z"));
    expect(result.countsByOfficialCode["8"].alumbrado).toBe(1);
    await fs.rm(dir, { recursive: true, force: true });
  });
});
