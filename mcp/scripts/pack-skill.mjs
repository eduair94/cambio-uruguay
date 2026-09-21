// Packs mcp/skills/buscador-uruguay into a deterministic zip (method 0 = stored,
// fixed 1980-01-01 timestamps) for Claude.ai "upload a skill", served from
// app/public/descargas/. No dependencies: zlib.crc32 needs Node >= 22.2.
// Line endings are normalised to LF so a Windows checkout packs the same bytes.
// test/skill.test.ts fails when the zip drifts from the folder.

import { mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { crc32 } from "node:zlib";

const here = dirname(fileURLToPath(import.meta.url));
export const SKILL_DIR = join(here, "..", "skills", "buscador-uruguay");
export const ZIP_PATH = join(here, "..", "..", "app", "public", "descargas", "buscador-uruguay-skill.zip");

export function skillFiles(dir = SKILL_DIR) {
  const out = [];
  const walk = (d) => {
    for (const name of readdirSync(d).sort()) {
      const full = join(d, name);
      if (statSync(full).isDirectory()) walk(full);
      else out.push({ name: `buscador-uruguay/${relative(dir, full).split(sep).join("/")}`, data: Buffer.from(readFileSync(full, "utf8").replace(/\r\n/g, "\n"), "utf8") });
    }
  };
  walk(dir);
  return out;
}

export function buildZip(files) {
  const DOS_DATE = (0 << 9) | (1 << 5) | 1; // 1980-01-01
  const locals = [];
  const centrals = [];
  let offset = 0;
  for (const file of files) {
    const name = Buffer.from(file.name, "utf8");
    const crc = crc32(file.data) >>> 0;
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(0x0800, 6); // UTF-8 names
    local.writeUInt16LE(0, 8);
    local.writeUInt16LE(0, 10);
    local.writeUInt16LE(DOS_DATE, 12);
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(file.data.length, 18);
    local.writeUInt32LE(file.data.length, 22);
    local.writeUInt16LE(name.length, 26);
    local.writeUInt16LE(0, 28);
    locals.push(local, name, file.data);
    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(20, 4);
    central.writeUInt16LE(20, 6);
    central.writeUInt16LE(0x0800, 8);
    central.writeUInt16LE(0, 10);
    central.writeUInt16LE(0, 12);
    central.writeUInt16LE(DOS_DATE, 14);
    central.writeUInt32LE(crc, 16);
    central.writeUInt32LE(file.data.length, 20);
    central.writeUInt32LE(file.data.length, 24);
    central.writeUInt16LE(name.length, 28);
    central.writeUInt32LE(offset, 42);
    centrals.push(central, name);
    offset += 30 + name.length + file.data.length;
  }
  const centralSize = centrals.reduce((n, b) => n + b.length, 0);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(files.length, 8);
  end.writeUInt16LE(files.length, 10);
  end.writeUInt32LE(centralSize, 12);
  end.writeUInt32LE(offset, 16);
  return Buffer.concat([...locals, ...centrals, end]);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const zip = buildZip(skillFiles());
  mkdirSync(dirname(ZIP_PATH), { recursive: true });
  writeFileSync(ZIP_PATH, zip);
  console.log(`wrote ${ZIP_PATH} (${zip.length} bytes)`);
}
