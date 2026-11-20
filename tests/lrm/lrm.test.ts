import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { parseCalendarText } from "../../classes/lrm/calendar";
import { dropOutliers, latestByTerm, parseLrmSheet, parseTreasurySheet, toPercent } from "../../classes/lrm/parse";
import { buildLrmSnapshot, refuseReasons } from "../../classes/lrm/refresh";
import type { LrmAuction, LrmSnapshot } from "../../classes/lrm/types";
import {
  excelSerialToIso,
  parseSharedStrings,
  parseSheetRows,
  readXlsxSheets,
  sheetTargets,
  type SheetRow,
} from "../../classes/lrm/xlsx";

// El texto real del calendario_deuda.pdf publicado el viernes 16/10/2026, extraído con unpdf (el
// mismo extractor que usa el job). Un rediseño del PDF aparece como un test rojo y no como una
// página que deja de anunciar la próxima licitación sin avisar.
const CALENDAR = readFileSync(join(__dirname, "fixtures", "calendario-deuda-2026-10-16.txt"), "utf8");

// --- Filas de la hoja «LRM» tal como las devuelve parseSheetRows, con valores REALES de la planilla
// «Operaciones BCU y MEF local.xlsx» descargada el 19/10/2026 (fila 10 = encabezados).
const LRM_HEADER: SheetRow = {
  row: 10,
  cells: {
    A: "Fecha",
    B: "Hora",
    C: "Liquidación",
    D: "Serie/Venta",
    E: "Plazo",
    F: "Plazo ref.",
    G: "Vencimiento",
    H: "Licitado OP",
    K: "Adjudicado OP",
    V: "Licitado",
    Y: "Adjudicado",
    AA: "Tasa de corte",
  },
};

let nextRow = 11;
function lrmRow(
  date: number,
  settlement: number,
  series: string,
  days: number,
  ref: number,
  maturity: number,
  auctioned: number,
  awarded: number,
  cut: number | string
): SheetRow {
  return {
    row: nextRow++,
    cells: {
      A: String(date),
      B: "14.00",
      C: String(settlement),
      D: series,
      E: String(days),
      F: String(ref),
      G: String(maturity),
      H: "1",
      K: "1",
      V: String(auctioned),
      Y: String(awarded),
      AA: String(cut),
    },
  };
}

const REAL_ROWS: SheetRow[] = [
  // 2026-10-13: 30 días (34 reales), corte 6,04 %
  lrmRow(46308, 46308, "13845-1", 34, 30, 46342, 15000, 16914.510000000002, "6.0400000000000002E-2"),
  // 2026-10-14: 90 días (83 reales), corte 6,26 %
  lrmRow(46309, 46309, "13844-2", 83, 90, 46392, 15000, 8681.7099999999991, "6.2600000000000003E-2"),
  // 2026-10-15: 360 días (364 reales, liquida el 16), corte 6,20 %
  lrmRow(46310, 46311, "13842-2", 364, 360, 46675, 6000, 5900, "6.2E-2"),
  // 2026-10-09: 180 días (175 reales), corte 6,12 %
  lrmRow(46304, 46304, "13808-3", 175, 180, 46479, 3960, 4372.42, "6.1199999999999997E-2"),
];

describe("xlsx: lo mínimo de Excel", () => {
  it("lee los textos compartidos, con tramos de formato y entidades", () => {
    const xml =
      '<sst count="3"><si><t>Fecha</t></si><si><r><t>Tasa de </t></r><r><t xml:space="preserve">corte</t></r></si>' +
      "<si><t>Liquidaci&#243;n &amp; plazo</t></si></sst>";
    expect(parseSharedStrings(xml)).toEqual(["Fecha", "Tasa de corte", "Liquidación & plazo"]);
  });

  it("encuentra cada hoja por su nombre y no por su posición", () => {
    const workbook =
      '<workbook><sheets><sheet name="DIN" sheetId="2" r:id="rId1"/><sheet name="LRM" sheetId="1" r:id="rId2"/>' +
      '<sheet name="NT MEF" sheetId="5" r:id="rId4"/></sheets></workbook>';
    const rels =
      '<Relationships><Relationship Id="rId2" Type="x" Target="worksheets/sheet2.xml"/>' +
      '<Relationship Id="rId1" Type="x" Target="worksheets/sheet1.xml"/>' +
      '<Relationship Id="rId4" Type="x" Target="/xl/worksheets/sheet4.xml"/></Relationships>';
    const targets = sheetTargets(workbook, rels);
    expect(targets.get("LRM")).toBe("xl/worksheets/sheet2.xml");
    expect(targets.get("DIN")).toBe("xl/worksheets/sheet1.xml");
    expect(targets.get("NT MEF")).toBe("xl/worksheets/sheet4.xml");
  });

  it("lee celdas compartidas, numéricas e inline, y no deja que una fila vacía se trague la siguiente", () => {
    const xml =
      '<sheetData><row r="7" spans="1:3" ht="15"/>' +
      '<row r="8"><c r="A8" t="s"><v>1</v></c><c r="B8" s="4"/><c r="C8"><f>B8*2</f><v>0.0604</v></c>' +
      '<c r="D8" t="inlineStr"><is><t>13845-1</t></is></c></row></sheetData>';
    const rows = parseSheetRows(xml, ["Fecha", "Tasa de corte"]);
    expect(rows).toEqual([{ row: 8, cells: { A: "Tasa de corte", C: "0.0604", D: "13845-1" } }]);
  });

  it("convierte el serial de Excel en el día de calendario", () => {
    // La primera fila de la hoja «LRM»: miércoles 2 de enero de 2019.
    expect(excelSerialToIso(43467)).toBe("2019-01-02");
    expect(excelSerialToIso(43466)).toBe("2019-01-01");
    expect(excelSerialToIso(46310)).toBe("2026-10-15");
    expect(excelSerialToIso(46310.6)).toBe("2026-10-15");
    expect(excelSerialToIso(NaN)).toBeNull();
    expect(excelSerialToIso(0)).toBeNull();
  });

  it("lee las hojas pedidas de un .xlsx de verdad (ZIP con workbook, relaciones y textos)", async () => {
    const dir = mkdtempSync(join(tmpdir(), "lrm-test-"));
    try {
      const file = join(dir, "book.xlsx");
      writeFileSync(
        file,
        storedZip({
          "xl/workbook.xml": '<workbook><sheets><sheet name="LRM" sheetId="1" r:id="rId9"/></sheets></workbook>',
          "xl/_rels/workbook.xml.rels": '<Relationships><Relationship Id="rId9" Target="worksheets/sheet7.xml"/></Relationships>',
          "xl/sharedStrings.xml": "<sst><si><t>Fecha</t></si></sst>",
          "xl/worksheets/sheet7.xml": '<sheetData><row r="1"><c r="A1" t="s"><v>0</v></c><c r="B1"><v>46310</v></c></row></sheetData>',
        })
      );
      const sheets = await readXlsxSheets(file, ["LRM", "No existe"]);
      expect([...sheets.keys()]).toEqual(["LRM"]);
      expect(sheets.get("LRM")).toEqual([{ row: 1, cells: { A: "Fecha", B: "46310" } }]);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe("parseLrmSheet contra filas reales de la planilla", () => {
  const parsed = parseLrmSheet([LRM_HEADER, ...REAL_ROWS]);

  it("lee las cuatro licitaciones, de la más nueva a la más vieja", () => {
    expect(parsed.problem).toBeNull();
    expect(parsed.rejected).toEqual([]);
    expect(parsed.auctions.map((a) => a.date)).toEqual(["2026-10-15", "2026-10-14", "2026-10-13", "2026-10-09"]);
  });

  it("toma la tasa de corte en porcentaje y el plazo real, no el de referencia", () => {
    const year = parsed.auctions[0];
    expect(year).toEqual({
      date: "2026-10-15",
      settlement: "2026-10-16",
      maturity: "2027-10-15",
      series: "13842-2",
      days: 364,
      termRef: 360,
      auctioned: 6000,
      awarded: 5900,
      cutRate: 6.2,
    });
    expect(parsed.auctions.find((a) => a.termRef === 30)?.cutRate).toBe(6.04);
  });

  it("sin los encabezados no adivina columnas", () => {
    const out = parseLrmSheet(REAL_ROWS);
    expect(out.auctions).toEqual([]);
    expect(out.problem).toMatch(/encabezados/);
  });

  it("descarta la desierta, la tasa absurda y la fila cuyo plazo no cierra con sus fechas", () => {
    const bad = [
      lrmRow(43553, 43553, "13198-2", 91, 90, 43644, 800, 0, 0), // desierta (2019)
      lrmRow(46316, 46316, "13999-1", 35, 30, 46351, 1000, 900, 0.85), // 85 %: no es una tasa
      lrmRow(46316, 46316, "13999-2", 35, 30, 46400, 1000, 900, 0.06), // 35 días que no son 84
    ];
    const out = parseLrmSheet([LRM_HEADER, ...REAL_ROWS, ...bad]);
    expect(out.auctions).toHaveLength(4);
    expect(out.rejected.map((r) => r.reason)).toEqual([
      "desierta",
      "tasa 85 % fuera de banda",
      "el plazo (35) no cierra con las fechas",
    ]);
  });
});

function auction(date: string, termRef: 30 | 90 | 180 | 360, cutRate: number): LrmAuction {
  return {
    date,
    settlement: date,
    maturity: "2030-01-01",
    series: `x-${date}`,
    days: termRef,
    termRef,
    auctioned: 1000,
    awarded: 1000,
    cutRate,
  };
}

const weekly = (start: string, n: number, rate: (i: number) => number, termRef: 30 | 90 = 30): LrmAuction[] =>
  Array.from({ length: n }, (_, i) =>
    auction(new Date(Date.parse(`${start}T00:00:00Z`) + i * 7 * 86_400_000).toISOString().slice(0, 10), termRef, rate(i))
  );

describe("dropOutliers: un tipeo no pasa, una suba de verdad sí", () => {
  it("saca el 0,62 que era 6,2", () => {
    const series = weekly("2026-01-05", 10, (i) => (i === 7 ? 0.62 : 6 + (i % 2) * 0.05));
    const { kept, dropped } = dropOutliers(series);
    expect(dropped.map((a) => a.cutRate)).toEqual([0.62]);
    expect(kept).toHaveLength(9);
  });

  it("una suba permanente de tres puntos entra apenas la ventana se corre", () => {
    const series = weekly("2026-01-05", 16, (i) => (i < 8 ? 6 : 9));
    const { dropped, kept } = dropOutliers(series);
    // Las primeras de la tasa nueva se rechazan contra una mediana de 6; después la mediana es 9.
    expect(dropped.length).toBeGreaterThan(0);
    expect(dropped.length).toBeLessThanOrEqual(4);
    expect(kept[kept.length - 1]?.cutRate).toBe(9);
  });

  it("no compara un plazo contra otro", () => {
    const thirty = weekly("2026-01-05", 8, () => 5);
    const year = weekly("2026-01-06", 8, () => 8, 90);
    expect(dropOutliers([...thirty, ...year]).dropped).toEqual([]);
  });
});

describe("latestByTerm", () => {
  it("la más reciente de cada plazo dentro de la ventana, en orden de plazo", () => {
    const all = [
      auction("2026-10-13", 30, 6.04),
      auction("2026-10-05", 30, 5.88),
      auction("2026-10-14", 90, 6.26),
      auction("2025-01-10", 180, 9),
    ];
    expect(latestByTerm(all, "2025-10-15").map((a) => [a.termRef, a.cutRate])).toEqual([
      [30, 6.04],
      [90, 6.26],
    ]);
  });
});

describe("toPercent", () => {
  it("acepta fracción o porcentaje y redondea a dos decimales", () => {
    expect(toPercent(0.0604)).toBe(6.04);
    expect(toPercent(5.7500000000000002e-2)).toBe(5.75);
    expect(toPercent(6.2)).toBe(6.2);
    expect(Number.isNaN(toPercent(NaN))).toBe(true);
  });
});

describe("parseTreasurySheet", () => {
  const header: SheetRow = {
    row: 10,
    cells: {
      A: "Fecha",
      C: "Serie",
      D: "Venta",
      F: "Moneda",
      G: "Cupón",
      I: "Vencimiento",
      J: "Plazo original (años)",
      O: "Adjudicado",
      S: "TIR",
    },
  };
  const nt = (row: number, date: number, serie: string, venta: string, moneda: string, cupon: string, venc: number, anios: string, adj: string, tir: string): SheetRow => ({
    row,
    cells: { A: String(date), C: serie, D: venta, F: moneda, G: cupon, I: String(venc), J: anios, O: adj, S: tir },
  });

  it("la última con TIR de cada moneda, y la desierta no cuenta (valores reales)", () => {
    const rows = [
      header,
      nt(11, 46301, "32", "14", "Unidades Indexadas", "3.125E-2", 49733, "12.008219178082191", "146.4", "3.0006399999999999E-2"),
      nt(12, 46308, "13", "10", "Pesos uruguayos", "8.1250000000000003E-2", 47663, "4.8986301369863012", "4500", "7.2541099999999997E-2"),
      nt(13, 46287, "4", "18", "Unidades Previsionales", "2.4500000000000001E-2", 50067, "17.013698630136986", "2140.5", "1.86412E-2"),
      // 2026-09-15, UP desierta: TIR "-", adjudicado 0
      nt(14, 46280, "5", "21", "Unidades Previsionales", "0.02", 53936, "26.016438356164382", "0", "-"),
      nt(15, 46245, "13", "8", "Pesos uruguayos", "8.1250000000000003E-2", 47663, "4.8986301369863012", "4500", "7.1827299999999997E-2"),
    ];
    const out = parseTreasurySheet(rows);
    expect(out.map((t) => [t.currency, t.date, t.series, t.yield, t.coupon, t.years])).toEqual([
      ["UYU", "2026-10-13", "13-10", 7.25, 8.125, 4.9],
      ["UI", "2026-10-06", "32-14", 3, 3.125, 12],
      ["UP", "2026-09-22", "4-18", 1.86, 2.45, 17],
    ]);
  });
});

describe("parseCalendarText contra el calendario real del 16/10/2026", () => {
  const calendar = parseCalendarText(CALENDAR);

  it("lee el período, la fecha de publicación y las seis licitaciones de LRM", () => {
    expect(calendar).not.toBeNull();
    expect(calendar!.from).toBe("2026-10-19");
    expect(calendar!.to).toBe("2026-10-30");
    expect(calendar!.publishedOn).toBe("2026-10-16");
    expect(calendar!.items.map((i) => [i.date, i.series, i.days, i.amount, i.nonCompetitive])).toEqual([
      ["2026-10-19", "13846-1", 35, 13300, 2660],
      ["2026-10-21", "13847-1", 84, 8400, 1680],
      ["2026-10-23", "13848-1", 189, 4100, 820],
      ["2026-10-26", "13849-1", 35, 13300, 2660],
      ["2026-10-28", "13847-2", 77, 8400, 1680],
      ["2026-10-29", "13842-3", 350, 4100, 820],
    ]);
  });

  it("no toma las Notas del Tesoro, que vienen con las columnas corridas", () => {
    expect(calendar!.items.every((i) => /^\d+-\d+$/.test(i.series))).toBe(true);
    expect(calendar!.items.some((i) => i.series.startsWith("5-") || i.series.startsWith("14-"))).toBe(false);
  });

  it("una fila cuyo plazo no cierra con sus fechas se descarta", () => {
    const broken = CALENDAR.replace("23/11/2026 LRM S. 13846 vta. 1 35", "23/11/2026 LRM S. 13846 vta. 1 36");
    expect(parseCalendarText(broken)!.items.map((i) => i.series)).not.toContain("13846-1");
  });

  it("un texto que no es el calendario devuelve null", () => {
    expect(parseCalendarText("Tasas medias de interés")).toBeNull();
    expect(parseCalendarText("")).toBeNull();
  });
});

function sheetsFrom(rows: SheetRow[]): Map<string, SheetRow[]> {
  return new Map([["LRM", [LRM_HEADER, ...rows]]]);
}

function manyWeeks(n: number): SheetRow[] {
  // n semanas de 30 y 90 días, todas con fechas que cierran, para pasar el mínimo de licitaciones.
  const out: SheetRow[] = [];
  for (let i = 0; i < n; i++) {
    const monday = 46308 - 7 * i;
    out.push(lrmRow(monday, monday, `a-${i}`, 35, 30, monday + 35, 1000, 1000, 0.06));
    out.push(lrmRow(monday + 2, monday + 2, `b-${i}`, 91, 90, monday + 2 + 91, 1000, 1000, 0.061));
  }
  return out;
}

describe("buildLrmSnapshot y refuseReasons", () => {
  const now = new Date("2026-10-19T23:31:00Z");

  it("una planilla completa arma la foto y se guarda", () => {
    const { snapshot, notes } = buildLrmSnapshot(
      { sheets: sheetsFrom(manyWeeks(60)), calendarText: CALENDAR, operationsModified: null, now },
      null
    );
    expect(notes).toEqual(["la hoja «NT MEF» no se pudo leer: se conservan las Notas del Tesoro anteriores"]);
    expect(snapshot!.counts.auctions).toBe(120);
    expect(snapshot!.latest.map((a) => a.termRef)).toEqual([30, 90]);
    expect(snapshot!.calendar!.items).toHaveLength(6);
    expect(refuseReasons(snapshot!, null)).toEqual([]);
  });

  it("una planilla flaca no pisa nada", () => {
    const { snapshot } = buildLrmSnapshot(
      { sheets: sheetsFrom(REAL_ROWS), calendarText: CALENDAR, operationsModified: null, now },
      null
    );
    expect(refuseReasons(snapshot!, null).join(" ")).toMatch(/sólo 4 licitaciones/);
  });

  it("una copia vieja de la planilla, o una que perdió historia, tampoco", () => {
    const fresh = buildLrmSnapshot(
      { sheets: sheetsFrom(manyWeeks(60)), calendarText: CALENDAR, operationsModified: null, now },
      null
    ).snapshot!;
    const old = buildLrmSnapshot(
      { sheets: sheetsFrom(manyWeeks(60).slice(4)), calendarText: CALENDAR, operationsModified: null, now },
      null
    ).snapshot!;
    expect(refuseReasons(old, fresh).join(" ")).toMatch(/copia vieja/);
    const shorter = buildLrmSnapshot(
      { sheets: sheetsFrom(manyWeeks(50)), calendarText: CALENDAR, operationsModified: null, now },
      null
    ).snapshot!;
    expect(refuseReasons(shorter, fresh).join(" ")).toMatch(/100 licitaciones contra 120/);
  });

  it("si el calendario no se lee, arrastra el anterior en vez de quedarse sin próxima licitación", () => {
    const previous = buildLrmSnapshot(
      { sheets: sheetsFrom(manyWeeks(60)), calendarText: CALENDAR, operationsModified: null, now },
      null
    ).snapshot as LrmSnapshot;
    const { snapshot, notes } = buildLrmSnapshot(
      { sheets: sheetsFrom(manyWeeks(60)), calendarText: null, operationsModified: null, now },
      previous
    );
    expect(snapshot!.calendar).toEqual(previous.calendar);
    expect(notes.join(" ")).toMatch(/calendario no se pudo leer/);
  });

  it("sin la hoja «LRM» no hay foto", () => {
    const out = buildLrmSnapshot({ sheets: new Map(), calendarText: CALENDAR, operationsModified: null, now }, null);
    expect(out.snapshot).toBeNull();
  });
});

/** Un ZIP sin compresión (método 0), suficiente para que el lector del repo lo abra. */
function storedZip(files: Record<string, string>): Buffer {
  const locals: Buffer[] = [];
  const centrals: Buffer[] = [];
  let offset = 0;
  for (const [name, content] of Object.entries(files)) {
    const nameBuf = Buffer.from(name, "utf8");
    const data = Buffer.from(content, "utf8");
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(0, 8); // stored
    local.writeUInt32LE(data.length, 18);
    local.writeUInt32LE(data.length, 22);
    local.writeUInt16LE(nameBuf.length, 26);
    locals.push(local, nameBuf, data);
    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(20, 4);
    central.writeUInt16LE(20, 6);
    central.writeUInt16LE(0, 10);
    central.writeUInt32LE(data.length, 20);
    central.writeUInt32LE(data.length, 24);
    central.writeUInt16LE(nameBuf.length, 28);
    central.writeUInt32LE(offset, 42);
    centrals.push(central, nameBuf);
    offset += 30 + nameBuf.length + data.length;
  }
  const centralBuf = Buffer.concat(centrals);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(Object.keys(files).length, 8);
  end.writeUInt16LE(Object.keys(files).length, 10);
  end.writeUInt32LE(centralBuf.length, 12);
  end.writeUInt32LE(offset, 16);
  return Buffer.concat([...locals, centralBuf, end]);
}
