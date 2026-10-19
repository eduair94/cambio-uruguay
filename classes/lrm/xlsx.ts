// Leer hojas de un .xlsx sin dependencias.
//
// Un .xlsx es un ZIP con XML adentro, y el repo ya sabe abrir un ZIP por nombre de entrada
// (`classes/transporte/sources/zip.ts`). Lo que falta es lo de Excel: qué archivo es cada hoja
// (workbook.xml + sus relaciones), la tabla de textos compartidos y las celdas. Es poco, y una
// librería de planillas entera para leer dos hojas de una planilla que el BCU arma a mano sería
// más superficie que lo que resuelve.
//
// Se leen SÓLO las hojas pedidas: la planilla de operaciones del BCU trae una hoja de recompras que
// inflada pesa 40 MB y que esta página no usa.
import { readZipEntry } from "../transporte/sources/zip";

/** Una fila de la hoja: el número de fila de Excel y sus celdas por letra de columna. */
export interface SheetRow {
  row: number;
  cells: Record<string, string>;
}

function decodeXml(text: string): string {
  return text
    .replace(/&#x([0-9a-f]+);/gi, (_, hex: string) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec: string) => String.fromCodePoint(Number(dec)))
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&");
}

/** Los textos de una celda `<si>` o `<is>`, uniendo los tramos con formato (`<r><t>…</t></r>`). */
function joinRuns(xml: string): string {
  const parts: string[] = [];
  for (const match of xml.matchAll(/<t(?:\s[^>]*)?>([\s\S]*?)<\/t>/g)) parts.push(decodeXml(match[1]));
  return parts.join("");
}

/** `xl/sharedStrings.xml` → la lista indexada que referencian las celdas `t="s"`. */
export function parseSharedStrings(xml: string): string[] {
  const out: string[] = [];
  for (const match of xml.matchAll(/<si>([\s\S]*?)<\/si>|<si\/>/g)) out.push(match[1] ? joinRuns(match[1]) : "");
  return out;
}

/**
 * Nombre de hoja → ruta de su XML dentro del ZIP.
 *
 * El nombre visible ("LRM") no dice qué archivo es: `workbook.xml` lo asocia a un `r:id`, y las
 * relaciones del libro asocian ese id a "worksheets/sheet2.xml". El orden de las pestañas no sirve:
 * en esta planilla «LRM» es la segunda pestaña y tiene `sheetId="1"`.
 */
export function sheetTargets(workbookXml: string, relsXml: string): Map<string, string> {
  const rels = new Map<string, string>();
  for (const match of relsXml.matchAll(/<Relationship\b([^>]*?)\/?>/g)) {
    const id = /\bId="([^"]+)"/.exec(match[1])?.[1];
    const target = /\bTarget="([^"]+)"/.exec(match[1])?.[1];
    if (id && target) rels.set(id, target);
  }
  const out = new Map<string, string>();
  for (const match of workbookXml.matchAll(/<sheet\b([^>]*?)\/?>/g)) {
    const name = /\bname="([^"]+)"/.exec(match[1])?.[1];
    const rid = /\br:id="([^"]+)"/.exec(match[1])?.[1];
    const target = rid ? rels.get(rid) : undefined;
    if (!name || !target) continue;
    const path = target.startsWith("/") ? target.slice(1) : `xl/${target.replace(/^\.\//, "")}`;
    out.set(decodeXml(name), path);
  }
  return out;
}

/**
 * Las filas de una hoja con el VALOR de cada celda como texto.
 *
 * Una celda con fórmula trae su último resultado en `<v>`, que es lo que se lee: la fórmula no se
 * evalúa. Las celdas vacías (sólo formato, `<c r="E5" s="3"/>`) no aparecen en `cells`.
 */
export function parseSheetRows(xml: string, shared: readonly string[]): SheetRow[] {
  const rows: SheetRow[] = [];
  // `<row r="7" …/>` (una fila con sólo formato) se reconoce aparte: con un `<row …>` a secas el
  // patrón se tragaría la fila siguiente y le pondría a sus celdas el número de ésta.
  for (const rowMatch of xml.matchAll(/<row\b([^>]*?)(?:\/>|>([\s\S]*?)<\/row>)/g)) {
    if (rowMatch[2] === undefined) continue;
    const rowNumber = Number(/\br="(\d+)"/.exec(rowMatch[1])?.[1] ?? NaN);
    const cells: Record<string, string> = {};
    for (const cellMatch of rowMatch[2].matchAll(/<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
      const attrs = cellMatch[1];
      const inner = cellMatch[2] ?? "";
      const column = /\br="([A-Z]+)\d+"/.exec(attrs)?.[1];
      if (!column) continue;
      const type = /\bt="([^"]+)"/.exec(attrs)?.[1] ?? "n";
      const raw = /<v>([\s\S]*?)<\/v>/.exec(inner)?.[1];
      let value: string;
      if (type === "s") value = raw === undefined ? "" : shared[Number(raw)] ?? "";
      else if (type === "inlineStr") value = joinRuns(inner);
      else value = raw === undefined ? "" : decodeXml(raw);
      if (value !== "") cells[column] = value;
    }
    if (Number.isFinite(rowNumber) && Object.keys(cells).length) rows.push({ row: rowNumber, cells });
  }
  return rows;
}

/** Día de calendario de un serial de Excel (sistema 1900, el de Windows). */
export function excelSerialToIso(serial: number): string | null {
  if (!Number.isFinite(serial) || serial < 1 || serial > 2958465) return null;
  // 1899-12-30 absorbe el 29/2/1900 que Excel cree que existió.
  const ms = Date.UTC(1899, 11, 30) + Math.floor(serial) * 86_400_000;
  return new Date(ms).toISOString().slice(0, 10);
}

/** Las hojas pedidas de un .xlsx en disco, ya parseadas. Una hoja que no existe no aparece. */
export async function readXlsxSheets(path: string, names: readonly string[]): Promise<Map<string, SheetRow[]>> {
  const read = async (entry: string): Promise<string> => {
    const found = await readZipEntry(path, (name) => name === entry);
    if (!found) throw new Error(`xlsx: falta ${entry}`);
    return found.data.toString("utf8");
  };
  const targets = sheetTargets(await read("xl/workbook.xml"), await read("xl/_rels/workbook.xml.rels"));
  const sharedEntry = await readZipEntry(path, (name) => name === "xl/sharedStrings.xml");
  const shared = sharedEntry ? parseSharedStrings(sharedEntry.data.toString("utf8")) : [];
  const out = new Map<string, SheetRow[]>();
  for (const name of names) {
    const target = targets.get(name);
    if (!target) continue;
    out.set(name, parseSheetRows(await read(target), shared));
  }
  return out;
}
