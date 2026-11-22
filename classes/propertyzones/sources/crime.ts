import { TextDecoder } from 'node:util';
import { officialCrimeNeighborhoodCodes, officialZoneName } from './geometry';
import { CRIME_OFFENSES, CrimeCounts, CrimeOffense, OfficialPropertyZone } from './types';

export const CRIME_MAX_BYTES = 512 * 1024 * 1024;
const MAX_ROW_BYTES = 32 * 1024;
const MAX_ROWS = 10_000_000;
const MONTH_NAMES = ['ENERO', 'FEBRERO', 'MARZO', 'ABRIL', 'MAYO', 'JUNIO', 'JULIO', 'AGOSTO', 'SETIEMBRE', 'OCTUBRE', 'NOVIEMBRE', 'DICIEMBRE'];
const HEADER = ['ID_EVENTO', 'DELITO', 'VICT_RAP', 'VICT_HUR', 'TENTATIVA', 'FECHA', 'AÑO', 'MES', 'SEMESTRE', 'TRIMESTRE', 'DIA_SEMANA', 'HORA', 'DEPTO', 'JURISDICCION', 'BARRIO_MONTEVIDEO'];
export const CRIME_DEPARTMENTS = ['Artigas', 'Canelones', 'Cerro Largo', 'Colonia', 'Durazno', 'Flores', 'Florida', 'Lavalleja', 'Maldonado', 'Montevideo', 'Paysandú', 'Río Negro', 'Rivera', 'Rocha', 'Salto', 'San José', 'Soriano', 'Tacuarembó', 'Treinta y Tres'];
const OFFENSES: Record<string, CrimeOffense> = {
  HURTO: 'hurto', RAPINA: 'rapina', LESIONES: 'lesiones', 'VIOLENCIA DOMESTICA': 'violencia-domestica', ABIGEATO: 'abigeato',
};
const emptyCounts = (): CrimeCounts => ({ total: 0, byOffense: Object.fromEntries(CRIME_OFFENSES.map(key => [key, 0])) as CrimeCounts['byOffense'] });

/** Last twelve whole months explicitly covered by the publisher, never guessed from the file mtime. */
export function crimeReportingPeriod(coverage: string, now = new Date()): { periodFrom: string; periodTo: string } {
  const match = /^(\d{4})-(\d{2})\s*[–-]\s*(\d{4})-(\d{2})$/.exec(coverage.trim());
  if (!match) throw new Error('Invalid crime temporal coverage');
  const [, fromY, fromM, toY, toM] = match.map(Number);
  if (fromY < 2013 || fromM < 1 || fromM > 12 || toM < 1 || toM > 12 || toY > 2100) throw new Error('Invalid crime temporal coverage');
  const endExclusive = new Date(Date.UTC(toY, toM, 1));
  const start = new Date(Date.UTC(toY, toM - 12, 1));
  if (endExclusive.getTime() > Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)
    || Date.UTC(fromY, fromM - 1, 1) > start.getTime()) throw new Error('Incomplete crime temporal coverage');
  return { periodFrom: start.toISOString().slice(0, 10), periodTo: new Date(endExclusive.getTime() - 86400000).toISOString().slice(0, 10) };
}

export type CrimePeriod = { periodFrom: string; periodTo: string };

/**
 * The twelve whole months ending one month before `period`. The catalog's coverage can run ahead
 * of the file: the upload of 2026-10-20 says "2013-01 – 2026-10" and its last event is from
 * 2026-09, so the declared window holds 11 months and is rightly refused. This is the only other
 * window ever tried, and the aggregation still has to prove it complete.
 */
export function previousCrimePeriod(period: CrimePeriod): CrimePeriod {
  const [year, month] = period.periodTo.split('-').map(Number);
  const endExclusive = new Date(Date.UTC(year, month - 1, 1));
  const start = new Date(Date.UTC(year, month - 13, 1));
  return { periodFrom: start.toISOString().slice(0, 10), periodTo: new Date(endExclusive.getTime() - 86400000).toISOString().slice(0, 10) };
}

/** Bounded UTF-8 CSV parser: quoted delimiters/newlines and escaped quotes work across stream boundaries. */
export async function* crimeCsvRows(stream: AsyncIterable<Uint8Array>, maximumBytes = CRIME_MAX_BYTES): AsyncGenerator<string[]> {
  const decoder = new TextDecoder('utf-8', { fatal: true });
  let bytes = 0, rowBytes = 0, rows = 0;
  let field = '', row: string[] = [], quoted = false, afterQuote = false, skipLf = false;
  const parse = function* (text: string): Generator<string[]> {
    for (const character of text) {
      if (skipLf) { skipLf = false; if (character === '\n') continue; }
      rowBytes += character.charCodeAt(0) < 128 ? 1 : Buffer.byteLength(character);
      if (rowBytes > MAX_ROW_BYTES) throw new Error('Crime CSV row exceeds limit');
      if (quoted) {
        if (character === '"') { quoted = false; afterQuote = true; } else field += character;
        continue;
      }
      if (afterQuote && character === '"') { field += '"'; quoted = true; afterQuote = false; continue; }
      if (character === ';') { row.push(field); field = ''; afterQuote = false; if (row.length > HEADER.length) throw new Error('Invalid crime CSV columns'); continue; }
      if (character === '\n' || character === '\r') {
        row.push(field); field = ''; afterQuote = false; rowBytes = 0; skipLf = character === '\r';
        if (++rows > MAX_ROWS) throw new Error('Crime CSV exceeds row limit');
        yield row; row = []; continue;
      }
      if (afterQuote) throw new Error('Invalid crime CSV quoting');
      if (character === '"') { if (field) throw new Error('Invalid crime CSV quoting'); quoted = true; }
      else field += character;
    }
  };
  for await (const chunk of stream) {
    bytes += chunk.byteLength;
    if (bytes > Math.min(CRIME_MAX_BYTES, maximumBytes)) throw new Error('Crime CSV exceeds byte limit');
    yield* parse(decoder.decode(chunk, { stream: true }));
  }
  yield* parse(decoder.decode());
  if (quoted) throw new Error('Unterminated crime CSV value');
  if (field || row.length || afterQuote) { row.push(field); yield row; }
}

export interface CrimeAggregation {
  countsByOfficialCode: Record<string, CrimeCounts>;
  countsByDepartment: Record<string, CrimeCounts>;
  unassignedCount: number;
  /** Aggregate diagnostics only: no identifiers, dates of individual events, victims or locations. */
  diagnostics: { scannedRows: number; includedEvents: number; months: number; unmatchedNeighborhoodNames: string[] };
}

export async function aggregateCrimeCsv(
  stream: AsyncIterable<Uint8Array>,
  zones: OfficialPropertyZone[],
  period: CrimePeriod,
  options: { maximumBytes?: number; minimumEvents?: number } = {},
): Promise<CrimeAggregation> {
  return (await aggregateCrimeCsvWindows(stream, zones, [period], options)).aggregation;
}

/**
 * One pass over the CSV for several candidate windows (in order of preference), each with its own
 * counts and its own completeness test; the first complete window wins. One pass because the file
 * is 383 MB. A row that is malformed fails the whole import whatever window it falls in, as before.
 */
export async function aggregateCrimeCsvWindows(
  stream: AsyncIterable<Uint8Array>,
  zones: OfficialPropertyZone[],
  periods: CrimePeriod[],
  options: { maximumBytes?: number; minimumEvents?: number } = {},
): Promise<{ period: CrimePeriod; aggregation: CrimeAggregation }> {
  if (!periods.length) throw new Error('No crime reporting period');
  const codes = officialCrimeNeighborhoodCodes(zones);
  const departments = new Map(CRIME_DEPARTMENTS.map(name => [officialZoneName(name), name]));
  const windows = periods.map(period => ({
    period,
    result: {
      countsByOfficialCode: Object.fromEntries(zones.map(zone => [zone.officialCode, emptyCounts()])),
      countsByDepartment: Object.fromEntries(CRIME_DEPARTMENTS.map(name => [name, emptyCounts()])),
      unassignedCount: 0,
      diagnostics: { scannedRows: 0, includedEvents: 0, months: 0, unmatchedNeighborhoodNames: [] },
    } as CrimeAggregation,
    seen: new Set<string>(), months: new Set<string>(), unmatched: new Set<string>(),
  }));
  let header = false, scannedRows = 0;
  for await (const row of crimeCsvRows(stream, options.maximumBytes)) {
    if (!header) {
      row[0] = row[0]?.replace(/^\uFEFF/, '');
      if (row.length !== HEADER.length || !HEADER.every((name, index) => row[index] === name)) throw new Error('Unexpected crime CSV header');
      header = true; continue;
    }
    if (row.length !== HEADER.length) throw new Error('Invalid crime CSV columns');
    scannedRows++;
    const dateMatch = /^(\d{2})\.(\d{2})\.(\d{4})$/.exec(row[5]);
    if (!dateMatch) throw new Error('Invalid crime event date');
    const [, dd, mm, yyyy] = dateMatch;
    const date = `${yyyy}-${mm}-${dd}`;
    if (Number(yyyy) !== Number(row[6]) || MONTH_NAMES[Number(mm) - 1] !== row[7]
      || new Date(Date.UTC(Number(yyyy), Number(mm) - 1, Number(dd))).toISOString().slice(0, 10) !== date) throw new Error('Invalid crime event date');
    const inside = windows.filter(window => date >= window.period.periodFrom && date <= window.period.periodTo);
    if (!inside.length) continue;
    const offense = OFFENSES[officialZoneName(row[1])];
    const department = departments.get(officialZoneName(row[12]));
    if (!offense || !department || !['SI', 'NO'].includes(row[4]) || !/^[A-Za-z0-9]{1,64}$/.test(row[0])) throw new Error('Invalid crime event classification');
    const id = row[0];
    const neighborhood = department === 'Montevideo' ? officialZoneName(row[14]) : '';
    const code = neighborhood ? codes.get(neighborhood) : undefined;
    const increment = (counts: CrimeCounts) => { counts.total++; counts.byOffense[offense]++; };
    for (const { result, seen, months, unmatched } of inside) {
      if (seen.has(id)) throw new Error('Duplicate crime event in reporting period');
      seen.add(id);
      if (seen.size > 1_000_000) throw new Error('Crime reporting period exceeds event limit');
      result.diagnostics.includedEvents++;
      months.add(date.slice(0, 7));
      increment(result.countsByDepartment[department]);
      if (department === 'Montevideo') {
        if (code) increment(result.countsByOfficialCode[code]);
        else {
          result.unassignedCount++;
          if (unmatched.size < 100 && neighborhood && neighborhood !== 'SIN CLASIFICAR') unmatched.add(neighborhood);
        }
      }
    }
  }
  for (const { period, result, months, unmatched } of windows) {
    result.diagnostics.scannedRows = scannedRows;
    result.diagnostics.months = months.size;
    result.diagnostics.unmatchedNeighborhoodNames = [...unmatched].sort();
    if (header && months.size === 12 && result.diagnostics.includedEvents >= (options.minimumEvents ?? 1000)
      && result.countsByDepartment.Montevideo.total
      && result.unassignedCount / result.countsByDepartment.Montevideo.total <= 0.1) return { period, aggregation: result };
  }
  throw new Error('Incomplete crime aggregation');
}
