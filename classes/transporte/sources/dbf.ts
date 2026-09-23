// Lector mínimo de dBASE III/IV, el formato de la tabla de atributos de un shapefile.
//
// POR QUÉ ESTO Y NO UNA LIBRERÍA DE SHAPEFILES: el archivo de paradas de la Intendencia
// (`v_uptu_paradas`) trae las coordenadas COMO COLUMNAS de la tabla (`X` e `Y`, en UTM 21S), no sólo
// en la geometría. Leer el `.dbf` alcanza entera para lo que necesita el comparador —código de
// parada, línea, variante, ordinal y posición— y evita tener que interpretar el `.shp`, que es el
// formato binario de verdad complicado. Medido el 22/9/2026: 42.839 filas, 245 bytes por registro,
// diez campos.
//
// El encoding es latin-1 porque así lo escribe el generador de la IM: "CORUÑA" viene como un byte
// 0xD1, que leído como UTF-8 es basura.

export interface DbfField {
  name: string;
  type: string;
  length: number;
}

export interface DbfTable {
  fields: DbfField[];
  rows: Record<string, string>[];
}

/** El header dice cuántos registros hay, dónde empiezan y cuánto mide cada uno. */
export function readDbf(buffer: Buffer, options: { encoding?: BufferEncoding } = {}): DbfTable {
  const encoding = options.encoding ?? "latin1";
  if (buffer.length < 32) throw new Error("DBF: archivo demasiado corto");

  const recordCount = buffer.readUInt32LE(4);
  const headerLength = buffer.readUInt16LE(8);
  const recordLength = buffer.readUInt16LE(10);
  if (!recordLength || headerLength < 33) throw new Error("DBF: cabecera inválida");

  const fields: DbfField[] = [];
  let cursor = 32;
  while (cursor < headerLength - 1 && buffer[cursor] !== 0x0d) {
    const rawName = buffer.subarray(cursor, cursor + 11);
    const zero = rawName.indexOf(0);
    const name = rawName.subarray(0, zero === -1 ? 11 : zero).toString(encoding).trim();
    fields.push({
      name,
      type: String.fromCharCode(buffer[cursor + 11] ?? 0),
      length: buffer[cursor + 16] ?? 0,
    });
    cursor += 32;
  }
  if (!fields.length) throw new Error("DBF: no se encontró ningún campo");

  const rows: Record<string, string>[] = [];
  for (let index = 0; index < recordCount; index += 1) {
    const start = headerLength + index * recordLength;
    if (start + recordLength > buffer.length) break;
    // El primer byte de cada registro es la marca de borrado: `*` significa que la fila está dada de
    // baja y no debe leerse.
    if (buffer[start] === 0x2a) continue;
    const row: Record<string, string> = {};
    let offset = start + 1;
    for (const field of fields) {
      row[field.name] = buffer.subarray(offset, offset + field.length).toString(encoding).trim();
      offset += field.length;
    }
    rows.push(row);
  }

  return { fields, rows };
}
