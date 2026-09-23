// Fixtures del comparador de transporte: un ZIP y un DBF armados byte a byte.
//
// POR QUÉ A MANO Y NO UN ARCHIVO DE MUESTRA COMMITEADO: los dos archivos reales de la Intendencia
// pesan 0,7 MB y 10,6 MB, así que recortar una muestra y versionarla tiene dos problemas — el
// archivo entra al repo y, peor, deja de probar lo que importa. Lo que estos lectores tienen que
// resolver son casos de FORMATO (la marca de borrado del dBASE, el método de compresión 0 contra el
// 8, el latin-1 de "CORUÑA"), y un recorte del archivo real sólo trae los casos que el archivo real
// tenía ese día. Armándolos acá, cada caso se escribe a propósito.
//
// El CRC32 se calcula de verdad aunque `classes/transporte/sources/zip.ts` no lo verifique: un
// fixture que `unzip` rechazaría no probaría que leemos ZIPs, probaría que leemos nuestros propios
// bytes.
import { deflateRawSync } from "node:zlib";

export interface ZipFixtureEntry {
  name: string;
  data: Buffer;
  /** 0 = guardado sin comprimir, 8 = deflate. Los dos aparecen en archivos reales. */
  method?: 0 | 8;
}

function crc32(buffer: Buffer): number {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = crc & 1 ? (crc >>> 1) ^ 0xedb88320 : crc >>> 1;
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

/** Un ZIP completo en memoria: cabeceras locales, directorio central y fin del directorio. */
export function buildZip(entries: readonly ZipFixtureEntry[]): Buffer {
  const locals: Buffer[] = [];
  const centrals: Buffer[] = [];
  let offset = 0;

  for (const entry of entries) {
    const method = entry.method ?? 8;
    const raw = method === 0 ? entry.data : deflateRawSync(entry.data);
    const name = Buffer.from(entry.name, "utf8");
    const checksum = crc32(entry.data);

    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4); // versión necesaria
    local.writeUInt16LE(0, 6); // sin banderas: nada de descriptor de datos diferido
    local.writeUInt16LE(method, 8);
    local.writeUInt16LE(0, 10); // hora
    local.writeUInt16LE(0x215c, 12); // fecha: 2026-10-28, cualquiera sirve
    local.writeUInt32LE(checksum, 14);
    local.writeUInt32LE(raw.length, 18);
    local.writeUInt32LE(entry.data.length, 22);
    local.writeUInt16LE(name.length, 26);
    local.writeUInt16LE(0, 28); // sin campo extra
    locals.push(local, name, raw);

    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(20, 4);
    central.writeUInt16LE(20, 6);
    central.writeUInt16LE(0, 8);
    central.writeUInt16LE(method, 10);
    central.writeUInt16LE(0, 12);
    central.writeUInt16LE(0x215c, 14);
    central.writeUInt32LE(checksum, 16);
    central.writeUInt32LE(raw.length, 20);
    central.writeUInt32LE(entry.data.length, 24);
    central.writeUInt16LE(name.length, 28);
    central.writeUInt16LE(0, 30);
    central.writeUInt16LE(0, 32);
    central.writeUInt16LE(0, 34);
    central.writeUInt16LE(0, 36);
    central.writeUInt32LE(0, 38);
    central.writeUInt32LE(offset, 42);
    centrals.push(central, name);

    offset += 30 + name.length + raw.length;
  }

  const centralBuffer = Buffer.concat(centrals);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(0, 4);
  end.writeUInt16LE(0, 6);
  end.writeUInt16LE(entries.length, 8);
  end.writeUInt16LE(entries.length, 10);
  end.writeUInt32LE(centralBuffer.length, 12);
  end.writeUInt32LE(offset, 16);
  end.writeUInt16LE(0, 20);

  return Buffer.concat([...locals, centralBuffer, end]);
}

export interface DbfFixtureField {
  name: string;
  /** `C` (texto) o `N` (número). El lector devuelve todo como string; el tipo es sólo de formato. */
  type?: "C" | "N";
  length: number;
}

export interface DbfFixtureRow {
  values: Record<string, string>;
  /** Una fila dada de baja: el primer byte del registro es `*` (0x2a) y no debe leerse. */
  deleted?: boolean;
}

/** Una tabla dBASE III mínima, en latin-1 como la escribe el generador de la Intendencia. */
export function buildDbf(fields: readonly DbfFixtureField[], rows: readonly DbfFixtureRow[]): Buffer {
  const headerLength = 32 + 32 * fields.length + 1;
  const recordLength = 1 + fields.reduce((sum, field) => sum + field.length, 0);

  const header = Buffer.alloc(headerLength);
  header.writeUInt8(0x03, 0); // dBASE III sin memo
  header.writeUInt8(126, 1); // año 2026 contado desde 1900
  header.writeUInt8(9, 2);
  header.writeUInt8(22, 3);
  header.writeUInt32LE(rows.length, 4); // incluye las filas borradas: así lo escribe dBASE
  header.writeUInt16LE(headerLength, 8);
  header.writeUInt16LE(recordLength, 10);

  let cursor = 32;
  for (const field of fields) {
    header.write(field.name.slice(0, 11), cursor, "latin1");
    header.writeUInt8((field.type ?? "C").charCodeAt(0), cursor + 11);
    header.writeUInt8(field.length, cursor + 16);
    cursor += 32;
  }
  header.writeUInt8(0x0d, headerLength - 1); // fin de los descriptores de campo

  const records: Buffer[] = [];
  for (const row of rows) {
    const record = Buffer.alloc(recordLength, 0x20);
    record.writeUInt8(row.deleted ? 0x2a : 0x20, 0);
    let position = 1;
    for (const field of fields) {
      const value = Buffer.from(row.values[field.name] ?? "", "latin1").subarray(0, field.length);
      // dBASE alinea el texto a la izquierda y los números a la derecha; el lector hace trim igual,
      // pero el fixture imita el archivo real para que también pruebe el trim.
      const start = (field.type ?? "C") === "N" ? position + field.length - value.length : position;
      value.copy(record, start);
      position += field.length;
    }
    records.push(record);
  }

  return Buffer.concat([header, ...records, Buffer.from([0x1a])]);
}

/**
 * El CSV de horarios tal como lo publica la Intendencia: `;` como separador, encabezado en la
 * primera línea y la hora como entero `hmm`.
 */
export function buildScheduleCsv(
  rows: readonly {
    dayType: number;
    variantId: number;
    /** La hora de salida del recorrido en `hmm` multiplicada por diez: 07:00 son 7000. */
    frequency: number;
    stopId: number;
    ordinal: number;
    /** La hora de paso por esa parada en `hmm`: 12:45 son 1245. */
    hora: number;
  }[]
): Buffer {
  const lines = ["tipo_dia;cod_variante;frecuencia;cod_ubic_parada;ordinal;hora;dia_anterior"];
  for (const row of rows) {
    lines.push(`${row.dayType};${row.variantId};${row.frequency};${row.stopId};${row.ordinal};${row.hora};0`);
  }
  return Buffer.from(`${lines.join("\n")}\n`, "latin1");
}
