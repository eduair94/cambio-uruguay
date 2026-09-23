// El lector de dBASE: los atributos del shapefile de paradas de la Intendencia.
//
// Las tres cosas que este lector tiene que resolver y que no se ven en ningún número publicado:
// respetar el largo declarado de cada campo (un byte de más corre TODAS las columnas siguientes),
// leer latin-1 (si no, "CORUÑA" viaja roto al índice y la parada queda sin nombre) y saltear las
// filas dadas de baja (si no, una parada levantada vuelve al índice y el ómnibus "para" donde ya no
// para).
import { describe, expect, it } from "vitest";
import { readDbf } from "../../classes/transporte/sources/dbf";
import { buildDbf } from "./fixtures";

const FIELDS = [
  { name: "COD_UBIC_P", type: "N" as const, length: 8 },
  { name: "CALLE", type: "C" as const, length: 12 },
  { name: "X", type: "N" as const, length: 18 },
];

describe("readDbf", () => {
  it("lee los campos declarados en la cabecera, con su nombre y su largo", () => {
    const table = readDbf(
      buildDbf(FIELDS, [{ values: { COD_UBIC_P: "1234", CALLE: "CORUÑA", X: "577981.398" } }])
    );
    expect(table.fields.map(field => field.name)).toEqual(["COD_UBIC_P", "CALLE", "X"]);
    expect(table.fields.map(field => field.length)).toEqual([8, 12, 18]);
    expect(table.fields.map(field => field.type)).toEqual(["N", "C", "N"]);
  });

  it("devuelve una fila por registro vivo, con los valores sin el relleno de espacios", () => {
    const table = readDbf(
      buildDbf(FIELDS, [
        { values: { COD_UBIC_P: "1234", CALLE: "CORUÑA", X: "577981.398" } },
        { values: { COD_UBIC_P: "5678", CALLE: "ROLETTI", X: "578012.5" } },
      ])
    );
    expect(table.rows).toHaveLength(2);
    expect(table.rows[0]).toEqual({ COD_UBIC_P: "1234", CALLE: "CORUÑA", X: "577981.398" });
    expect(table.rows[1]!.CALLE).toBe("ROLETTI");
    // Es el valor que después pasa por `Number()` en `parseStops`: un espacio de más lo rompería.
    expect(Number(table.rows[0]!.X)).toBeCloseTo(577981.398, 3);
  });

  it("lee latin-1: la Ñ es el byte 0xD1 y leída como UTF-8 sería basura", () => {
    const buffer = buildDbf(FIELDS, [{ values: { COD_UBIC_P: "1", CALLE: "CORUÑA", X: "0" } }]);
    // El byte crudo está ahí, sin secuencia multibyte: es lo que escribe el generador de la IM.
    expect(buffer.includes(Buffer.from([0xd1]))).toBe(true);
    expect(readDbf(buffer).rows[0]!.CALLE).toBe("CORUÑA");
    expect(readDbf(buffer, { encoding: "utf8" }).rows[0]!.CALLE).not.toBe("CORUÑA");
  });

  it("saltea la fila marcada como borrada (0x2a) y no la cuenta", () => {
    const table = readDbf(
      buildDbf(FIELDS, [
        { values: { COD_UBIC_P: "1", CALLE: "VIVA", X: "1" } },
        { values: { COD_UBIC_P: "2", CALLE: "BORRADA", X: "2" }, deleted: true },
        { values: { COD_UBIC_P: "3", CALLE: "OTRA VIVA", X: "3" } },
      ])
    );
    expect(table.rows).toHaveLength(2);
    expect(table.rows.map(row => row.CALLE)).toEqual(["VIVA", "OTRA VIVA"]);
    expect(table.rows.map(row => row.CALLE)).not.toContain("BORRADA");
  });

  it("no se sale del buffer si el archivo viene cortado a la mitad de un registro", () => {
    // Un archivo truncado por una descarga cortada declara N registros y trae menos: leerlos igual
    // devolvería columnas de ceros como si fueran datos.
    const full = buildDbf(FIELDS, [
      { values: { COD_UBIC_P: "1", CALLE: "VIVA", X: "1" } },
      { values: { COD_UBIC_P: "2", CALLE: "CORTADA", X: "2" } },
    ]);
    const truncated = full.subarray(0, full.length - 20);
    expect(readDbf(truncated).rows).toHaveLength(1);
  });

  it("rechaza una cabecera imposible en vez de devolver una tabla vacía que parece correcta", () => {
    expect(() => readDbf(Buffer.alloc(10))).toThrow(/demasiado corto/i);
    // Largo de registro cero: el bucle de filas no avanzaría nunca.
    const broken = buildDbf(FIELDS, []);
    broken.writeUInt16LE(0, 10);
    expect(() => readDbf(broken)).toThrow(/cabecera inválida/i);
  });
});
