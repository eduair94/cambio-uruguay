import { createReadStream, promises as fs } from "node:fs";
import { createInflateRaw } from "node:zlib";
import type { Readable } from "node:stream";

/**
 * The first entry of a ZIP file as a stream, without a dependency: the SUR archive is one CSV
 * (44 MB deflated, 300 MB inflated), so reading the central directory and inflating the entry's
 * byte range is all that is needed. Stored and deflated entries only; ZIP64 sizes are read from the
 * extra field when the 32-bit fields are saturated.
 */
export async function openFirstZipEntry(path: string): Promise<{ name: string; size: number; stream: Readable }> {
  const handle = await fs.open(path, "r");
  try {
    const { size } = await handle.stat();
    const tailLength = Math.min(size, 65_557);
    const tail = Buffer.alloc(tailLength);
    await handle.read(tail, 0, tailLength, size - tailLength);
    let end = -1;
    for (let i = tailLength - 22; i >= 0; i--) if (tail.readUInt32LE(i) === 0x06054b50) { end = i; break; }
    if (end < 0) throw new Error("ZIP end of central directory not found");
    const directoryOffset = tail.readUInt32LE(end + 16);
    const header = Buffer.alloc(46);
    await handle.read(header, 0, 46, directoryOffset);
    if (header.readUInt32LE(0) !== 0x02014b50) throw new Error("ZIP central directory entry not found");
    const method = header.readUInt16LE(10);
    let compressed = header.readUInt32LE(20);
    let uncompressed = header.readUInt32LE(24);
    const nameLength = header.readUInt16LE(28), extraLength = header.readUInt16LE(30);
    let localOffset = header.readUInt32LE(42);
    const variable = Buffer.alloc(nameLength + extraLength);
    await handle.read(variable, 0, variable.length, directoryOffset + 46);
    const name = variable.subarray(0, nameLength).toString("utf8");
    const extra = variable.subarray(nameLength);
    for (let i = 0; i + 4 <= extra.length;) {
      const id = extra.readUInt16LE(i), length = extra.readUInt16LE(i + 2);
      if (id === 0x0001) {
        let cursor = i + 4;
        if (uncompressed === 0xffffffff) { uncompressed = Number(extra.readBigUInt64LE(cursor)); cursor += 8; }
        if (compressed === 0xffffffff) { compressed = Number(extra.readBigUInt64LE(cursor)); cursor += 8; }
        if (localOffset === 0xffffffff) { localOffset = Number(extra.readBigUInt64LE(cursor)); }
      }
      i += 4 + length;
    }
    if (method !== 0 && method !== 8) throw new Error(`ZIP compression method ${method} not supported`);
    const local = Buffer.alloc(30);
    await handle.read(local, 0, 30, localOffset);
    if (local.readUInt32LE(0) !== 0x04034b50) throw new Error("ZIP local header not found");
    const start = localOffset + 30 + local.readUInt16LE(26) + local.readUInt16LE(28);
    if (start + compressed > size) throw new Error("ZIP entry exceeds the file");
    const raw = createReadStream(path, { start, end: start + compressed - 1 });
    if (method === 0) return { name, size: uncompressed, stream: raw };
    const inflate = createInflateRaw();
    raw.on("error", error => inflate.destroy(error));
    return { name, size: uncompressed, stream: raw.pipe(inflate) };
  } finally {
    await handle.close();
  }
}
