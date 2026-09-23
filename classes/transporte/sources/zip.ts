// Leer entradas de un ZIP por nombre, sin dependencias.
//
// El repo ya tiene un lector de ZIP (`classes/utilities/claims/zip.ts`) y este NO es una copia: aquel
// abre LA PRIMERA entrada de un archivo que tiene una sola (el CSV de reclamos de la IM); acá hacen
// falta DOS entradas concretas de un shapefile (`.dbf` para los atributos) y saber cuáles hay, así
// que se recorre el directorio central entero y se devuelve la entrada pedida por nombre.
//
// Los dos archivos que esto lee son chicos comparados con aquel (10,6 MB comprimido el de horarios,
// 0,7 MB el de paradas), así que acá se inflan a memoria en vez de a un stream: el CSV de horarios
// son 61 MB inflados, que es perfectamente manejable y evita toda la maquinaria de streams para
// después tener que indexarlo igual en memoria.
import { promises as fs } from "node:fs";
import { inflateRawSync } from "node:zlib";

export interface ZipEntry {
  name: string;
  compressedSize: number;
  uncompressedSize: number;
  method: number;
  localOffset: number;
}

/** El directorio central completo: qué hay adentro y dónde. */
export async function readZipDirectory(path: string): Promise<ZipEntry[]> {
  const handle = await fs.open(path, "r");
  try {
    const { size } = await handle.stat();
    const tailLength = Math.min(size, 65_557);
    const tail = Buffer.alloc(tailLength);
    await handle.read(tail, 0, tailLength, size - tailLength);

    let end = -1;
    for (let index = tailLength - 22; index >= 0; index -= 1) {
      if (tail.readUInt32LE(index) === 0x06054b50) {
        end = index;
        break;
      }
    }
    if (end < 0) throw new Error("ZIP: no se encontró el fin del directorio central");

    const entryCount = tail.readUInt16LE(end + 10);
    let offset = tail.readUInt32LE(end + 16);
    const entries: ZipEntry[] = [];

    for (let index = 0; index < entryCount; index += 1) {
      const header = Buffer.alloc(46);
      await handle.read(header, 0, 46, offset);
      if (header.readUInt32LE(0) !== 0x02014b50) break;
      const method = header.readUInt16LE(10);
      let compressedSize = header.readUInt32LE(20);
      let uncompressedSize = header.readUInt32LE(24);
      const nameLength = header.readUInt16LE(28);
      const extraLength = header.readUInt16LE(30);
      const commentLength = header.readUInt16LE(32);
      let localOffset = header.readUInt32LE(42);

      const variable = Buffer.alloc(nameLength + extraLength);
      await handle.read(variable, 0, variable.length, offset + 46);
      const name = variable.subarray(0, nameLength).toString("utf8");
      const extra = variable.subarray(nameLength);
      for (let cursor = 0; cursor + 4 <= extra.length; ) {
        const id = extra.readUInt16LE(cursor);
        const length = extra.readUInt16LE(cursor + 2);
        if (id === 0x0001) {
          let inner = cursor + 4;
          if (uncompressedSize === 0xffffffff) {
            uncompressedSize = Number(extra.readBigUInt64LE(inner));
            inner += 8;
          }
          if (compressedSize === 0xffffffff) {
            compressedSize = Number(extra.readBigUInt64LE(inner));
            inner += 8;
          }
          if (localOffset === 0xffffffff) localOffset = Number(extra.readBigUInt64LE(inner));
        }
        cursor += 4 + length;
      }

      entries.push({ name, compressedSize, uncompressedSize, method, localOffset });
      offset += 46 + nameLength + extraLength + commentLength;
    }
    return entries;
  } finally {
    await handle.close();
  }
}

/** El contenido de una entrada, inflado. `predicate` recibe el nombre tal cual está en el ZIP. */
export async function readZipEntry(
  path: string,
  predicate: (name: string) => boolean
): Promise<{ name: string; data: Buffer } | null> {
  const entries = await readZipDirectory(path);
  const entry = entries.find(candidate => predicate(candidate.name));
  if (!entry) return null;

  const handle = await fs.open(path, "r");
  try {
    const local = Buffer.alloc(30);
    await handle.read(local, 0, 30, entry.localOffset);
    if (local.readUInt32LE(0) !== 0x04034b50) throw new Error("ZIP: cabecera local no encontrada");
    const start = entry.localOffset + 30 + local.readUInt16LE(26) + local.readUInt16LE(28);
    const raw = Buffer.alloc(entry.compressedSize);
    await handle.read(raw, 0, entry.compressedSize, start);
    if (entry.method === 0) return { name: entry.name, data: raw };
    if (entry.method !== 8) throw new Error(`ZIP: método de compresión ${entry.method} no soportado`);
    return { name: entry.name, data: inflateRawSync(raw) };
  } finally {
    await handle.close();
  }
}
