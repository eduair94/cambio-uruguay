import { describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { aggregateCrimeCsv, crimeCsvRows, crimeReportingPeriod } from '../../classes/propertyzones/sources/crime';
import { loadOfficialPropertyZoneGeometry, officialCrimeNeighborhoodCodes } from '../../classes/propertyzones/sources/geometry';
import { CRIME_CSV_URL, CRIME_METADATA_URL, CRIME_RESOURCE_ID, loadPropertyZoneSources } from '../../classes/propertyzones/sources';

const NOW = new Date('2026-09-08T12:00:00Z');
const PERIOD = { periodFrom: '2025-07-01', periodTo: '2026-06-30' };
const HEADER = 'ID_EVENTO;DELITO;VICT_RAP;VICT_HUR;TENTATIVA;FECHA;AÑO;MES;SEMESTRE;TRIMESTRE;DIA_SEMANA;HORA;DEPTO;JURISDICCION;BARRIO_MONTEVIDEO';
const MONTHS = ['ENERO', 'FEBRERO', 'MARZO', 'ABRIL', 'MAYO', 'JUNIO', 'JULIO', 'AGOSTO', 'SETIEMBRE', 'OCTUBRE', 'NOVIEMBRE', 'DICIEMBRE'];
const zones = loadOfficialPropertyZoneGeometry(NOW).zones;
const row = (index: number, overrides: Record<number, string> = {}) => {
  const date = new Date(Date.UTC(2025, 6 + index % 12, 1));
  const cells = [`synthetic${index}`, 'HURTO', 'UNNEEDED_VICTIM_CATEGORY', 'PRIVATE_FIELD', 'NO',
    `01.${String(date.getUTCMonth() + 1).padStart(2, '0')}.${date.getUTCFullYear()}`,
    String(date.getUTCFullYear()), MONTHS[date.getUTCMonth()], '1', '1', 'LUNES', 'NO CORRESPONDE', 'MONTEVIDEO', '1', 'CORDON'];
  for (const [key, value] of Object.entries(overrides)) cells[Number(key)] = value;
  return cells.join(';');
};
const csv = (count = 12, overrides: Record<number, string> = {}) => `${HEADER}\r\n${Array.from({ length: count }, (_, index) => row(index, overrides)).join('\r\n')}\r\n`;
async function* chunks(value: string | Uint8Array, size = 31) {
  const bytes = typeof value === 'string' ? Buffer.from(value) : value;
  for (let index = 0; index < bytes.length; index += size) yield bytes.subarray(index, index + size);
}
const aggregate = (input: string) => aggregateCrimeCsv(chunks(input), zones, PERIOD, { minimumEvents: 1 });
const metadata = (size: number, override: Record<string, unknown> = {}) => ({
  success: true,
  result: {
    id: '999f2edc-5ef5-4d41-bed7-824a5635ea8d', license_id: 'odc-uy',
    resources: [{ id: CRIME_RESOURCE_ID, state: 'active', format: 'CSV', url: CRIME_CSV_URL, size,
      temporal_coverage: '2013-01 – 2026-06', last_modified: '2026-07-24T13:44:16.419527', datastore_active: true, ...override }],
  },
});
function fixtureFetcher(input = csv(1200), override: Record<string, unknown> = {}) {
  return vi.fn(async (url: string | URL | Request) => {
    if (url === CRIME_METADATA_URL) return Response.json(metadata(Buffer.byteLength(input), override));
    if (url === CRIME_CSV_URL) return new Response(input, { headers: { 'content-length': String(Buffer.byteLength(input)) } });
    throw new Error('Unexpected URL');
  });
}

describe('official INE 2011 neighborhood geometry', () => {
  it('contains exactly the 62 native codes, not the different 63-area cadastral map', () => {
    expect(zones.map(zone => Number(zone.officialCode))).toEqual(Array.from({ length: 62 }, (_, index) => index + 1));
    expect(zones.find(zone => zone.officialCode === '4')?.name).toBe('Cordon');
    expect(zones.every(zone => zone.id === `uy-mo-barrio-${zone.officialCode}` && zone.department === 'Montevideo')).toBe(true);
    expect(zones.some(zone => /puerto/i.test(zone.name))).toBe(false);
  });
  it('contains finite WGS84 closed polygon rings with the source vertices retained', () => {
    let vertices = 0;
    for (const zone of zones) {
      const polygons = zone.geometry.type === 'Polygon' ? [zone.geometry.coordinates] : zone.geometry.coordinates;
      for (const polygon of polygons) for (const ring of polygon) {
        expect(ring.length).toBeGreaterThanOrEqual(4);
        expect(ring.at(-1)).toEqual(ring[0]);
        for (const [lng, lat] of ring) {
          expect(lng).toBeGreaterThan(-56.6); expect(lng).toBeLessThan(-55.9);
          expect(lat).toBeGreaterThan(-35); expect(lat).toBeLessThan(-34.6);
          vertices++;
        }
      }
    }
    expect(vertices).toBeGreaterThan(30_000);
  });
  it('has reproducible source hashes and only exact published labels/one documented DBF expansion', () => {
    const pinned = JSON.parse(readFileSync('classes/propertyzones/sources/ine2011.json', 'utf8'));
    expect(pinned.archiveSha256).toBe('e4cc9f5abc5baee44c43fa54077d540241457186fdbb19a02a93149d403c51c6');
    const codes = officialCrimeNeighborhoodCodes(zones);
    expect(codes.get('CORDON')).toBe('4');
    expect(codes.get('VILLA GARCIA MANGA RURAL')).toBe('61');
    expect(codes.get('PUNTA CARRETAS POCITOS')).toBeUndefined();
    expect(codes.get('MANGA RURAL')).toBeUndefined();
  });
});

describe('crime temporal coverage', () => {
  it('derives July through June from publisher metadata, not the download date', () => {
    expect(crimeReportingPeriod('2013-01 – 2026-06', NOW)).toEqual(PERIOD);
  });
  it.each(['2013-01 – 2026-09', '2026-01 – 2026-06', '2013-00 – 2026-06', '2013-01 – 2026-13', 'hoy', '2026-06'])('rejects incomplete or malformed coverage %s', value => {
    expect(() => crimeReportingPeriod(value, NOW)).toThrow();
  });
});

describe('bounded crime CSV streaming', () => {
  it('handles a BOM, CRLF, UTF-8 characters and quoted delimiters/newlines across single-byte chunks', async () => {
    const rows = [];
    for await (const value of crimeCsvRows(chunks('\ufeffone;"Peñarol; \"\"calle\"\"\ncontinuación"\r\ntwo;three', 1))) rows.push(value);
    expect(rows).toEqual([['one', 'Peñarol; "calle"\ncontinuación'], ['two', 'three']]);
  });
  it.each(['a;"unterminated', 'a;bad"quote', 'a;"closed"bad'])('rejects malformed CSV quoting', async value => {
    await expect((async () => { for await (const _ of crimeCsvRows(chunks(value))) { /* consume */ } })()).rejects.toThrow();
  });
  it('rejects a malformed UTF-8 stream, an oversized row and a stream over the byte budget', async () => {
    const consume = async (input: Uint8Array | string, max?: number) => { for await (const _ of crimeCsvRows(chunks(input), max)) { /* consume */ } };
    await expect(consume(Uint8Array.from([0xc3, 0x28]))).rejects.toThrow();
    await expect(consume('x'.repeat(32769))).rejects.toThrow(/row/);
    await expect(consume('a;b\n', 3)).rejects.toThrow(/byte/);
  });
});

describe('registered events, not victims or neighborhood risk', () => {
  it('counts each event once, keeps attempts, and returns only aggregate fields', async () => {
    const result = await aggregate(csv(12, { 1: 'RAPIÑA', 4: 'SI' }));
    expect(result.countsByOfficialCode['4']).toEqual({ total: 12, byOffense: { hurto: 0, rapina: 12, lesiones: 0, 'violencia-domestica': 0, abigeato: 0 } });
    const serialized = JSON.stringify(result);
    expect(serialized).not.toContain('PRIVATE_FIELD');
    expect(serialized).not.toContain('synthetic');
    expect(serialized).not.toContain('VICT_');
  });
  it('keeps national department counts separate and never invents neighborhoods outside Montevideo', async () => {
    const result = await aggregate(`${csv()}${row(100, { 12: 'CANELONES', 14: 'CORDON' })}\n`);
    expect(result.countsByDepartment.Canelones.total).toBe(1);
    expect(result.countsByOfficialCode['4'].total).toBe(12);
  });
  it('keeps unclassified events visible without assigning their count to any neighborhood', async () => {
    const result = await aggregate(`${csv()}${row(100, { 14: 'SIN CLASIFICAR' })}\n`);
    expect(result.unassignedCount).toBe(1);
    expect(result.countsByDepartment.Montevideo.total).toBe(13);
    expect(result.countsByOfficialCode['4'].total).toBe(12);
  });
  it('abstains on excessive unmatched geography, unknown offenses, missing months, invalid dates and duplicates', async () => {
    for (const value of [csv(12, { 14: 'UNKNOWN' }), csv(12, { 1: 'HOMICIDIO' }), csv(11), csv(12, { 5: '31.02.2026' }), `${csv()}${row(0)}\n`]) await expect(aggregate(value)).rejects.toThrow();
  });
  it('filters by occurrence date and does not move old incidents into the current reporting window', async () => {
    const result = await aggregate(`${csv()}${row(100, { 5: '30.06.2025', 6: '2025', 7: 'JUNIO' })}\n`);
    expect(result.diagnostics.scannedRows).toBe(13);
    expect(result.diagnostics.includedEvents).toBe(12);
  });
  it('rejects malformed headers instead of consuming the broken CKAN DataStore structure', async () => {
    await expect(aggregate('ID_EVENTO;DELITO\n1;1\n')).rejects.toThrow(/header/);
  });
});

describe('offline metadata-versioned source loader', () => {
  it('loads the whole native CSV once and reuses validated aggregates while the resource version is unchanged', async () => {
    const fetcher = fixtureFetcher();
    const first = await loadPropertyZoneSources({ now: NOW, fetchImpl: fetcher as typeof fetch });
    expect(first.crime.countsByOfficialCode['4'].total).toBe(1200);
    expect(first.crime.includesAttempts).toBe(true);
    expect(fetcher.mock.calls.map(call => call[0])).toEqual([CRIME_METADATA_URL, CRIME_CSV_URL]);
    fetcher.mockClear();
    const second = await loadPropertyZoneSources({ now: NOW, fetchImpl: fetcher as typeof fetch, previous: first });
    expect(second).toEqual(first);
    expect(fetcher.mock.calls.map(call => call[0])).toEqual([CRIME_METADATA_URL]);
  });
  it('reloads after a resource modification and never returns old counts when that reload fails', async () => {
    const first = await loadPropertyZoneSources({ now: NOW, fetchImpl: fixtureFetcher() as typeof fetch });
    const fail = vi.fn(async (url: string | URL | Request) => url === CRIME_METADATA_URL
      ? Response.json(metadata(Buffer.byteLength(csv(1200)), { last_modified: '2026-08-01T00:00:00' })) : new Response('', { status: 503 }));
    await expect(loadPropertyZoneSources({ now: NOW, previous: first, fetchImpl: fail as typeof fetch })).rejects.toThrow(/unavailable/);
    expect(fail).toHaveBeenCalledTimes(2);
  });
  it('refuses metadata failure even when a valid previous aggregate exists', async () => {
    const first = await loadPropertyZoneSources({ now: NOW, fetchImpl: fixtureFetcher() as typeof fetch });
    await expect(loadPropertyZoneSources({ now: NOW, previous: first, fetchImpl: vi.fn(async () => new Response('', { status: 503 })) as typeof fetch })).rejects.toThrow();
  });
  it('projects reused cache values without unknown fields or persisted private payloads', async () => {
    const first = await loadPropertyZoneSources({ now: NOW, fetchImpl: fixtureFetcher() as typeof fetch });
    Object.assign(first.crime.countsByOfficialCode['4'], { secret: 'PRIVATE_FIELD' });
    const second = await loadPropertyZoneSources({ now: NOW, previous: first, fetchImpl: fixtureFetcher() as typeof fetch });
    expect(JSON.stringify(second)).not.toContain('PRIVATE_FIELD');
  });
  it('reloads corrupt aggregates and supports explicit forced revalidation', async () => {
    const first = await loadPropertyZoneSources({ now: NOW, fetchImpl: fixtureFetcher() as typeof fetch });
    for (const force of [true, false]) {
      if (!force) first.crime.countsByOfficialCode['4'].total++;
      const fetcher = fixtureFetcher();
      const next = await loadPropertyZoneSources({ now: NOW, previous: first, force, fetchImpl: fetcher as typeof fetch });
      expect(next.crime.countsByOfficialCode['4'].total).toBe(1200);
      expect(fetcher).toHaveBeenCalledTimes(2);
    }
  });
  it.each([{ url: 'https://attacker.invalid/data.csv' }, { size: 512 * 1024 ** 2 + 1 }, { format: 'XLSX' }])('rejects untrusted resource metadata before starting a CSV fetch', async override => {
    const fetcher = fixtureFetcher(csv(1200), override);
    await expect(loadPropertyZoneSources({ now: NOW, fetchImpl: fetcher as typeof fetch })).rejects.toThrow();
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
  it('refuses a truncated download even if all twelve months happen to precede the cut', async () => {
    const input = csv(1200);
    const fetcher = vi.fn(async (url: string | URL | Request) => url === CRIME_METADATA_URL
      ? Response.json(metadata(Buffer.byteLength(input) + 100)) : new Response(input));
    await expect(loadPropertyZoneSources({ now: NOW, fetchImpl: fetcher as typeof fetch })).rejects.toThrow(/metadata size/);
  });
});
