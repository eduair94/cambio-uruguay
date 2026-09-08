import { createHash } from 'node:crypto';
import { aggregateCrimeCsv, CRIME_DEPARTMENTS, CRIME_MAX_BYTES, crimeReportingPeriod } from './crime';
import { loadOfficialPropertyZoneGeometry } from './geometry';
import { CRIME_OFFENSES, CrimeCounts, PropertyZoneSources } from './types';
export * from './types';
export { loadOfficialPropertyZoneGeometry, officialZoneName } from './geometry';

export const CRIME_DATASET_URL = 'https://catalogodatos.gub.uy/dataset/ministerio-del-interior-delitos_denunciados_en_el_uruguay';
export const CRIME_METADATA_URL = 'https://catalogodatos.gub.uy/api/3/action/package_show?id=ministerio-del-interior-delitos_denunciados_en_el_uruguay';
export const CRIME_RESOURCE_ID = 'c8c4cc18-57cf-448b-9c68-901b3752fc11';
export const CRIME_CSV_URL = `https://catalogodatos.gub.uy/dataset/999f2edc-5ef5-4d41-bed7-824a5635ea8d/resource/${CRIME_RESOURCE_ID}/download/otros-delitos.csv`;
const LICENSE_URL = 'https://www.gub.uy/agencia-gobierno-electronico-sociedad-informacion-conocimiento/sites/agencia-gobierno-electronico-sociedad-informacion-conocimiento/files/documentos/publicaciones/licencia_de_datos_abiertos_0.pdf';
const USER_AGENT = 'CambioUruguayBot/1.0 (+https://cambio-uruguay.com)';

export interface PropertyZoneSourcesOptions {
  /** Aggregate output from the previous successful import, never incident records. */
  previous?: PropertyZoneSources;
  force?: boolean;
  now?: Date;
  fetchImpl?: typeof fetch;
  signal?: AbortSignal;
}

function object(value: unknown): Record<string, any> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, any> : {};
}

async function* responseChunks(response: Response, maximumBytes: number): AsyncGenerator<Uint8Array> {
  const length = response.headers.get('content-length');
  if (!response.body) throw new Error('Official source body unavailable');
  const reader = response.body.getReader();
  let bytes = 0;
  try {
    if (length && (!/^\d+$/.test(length) || Number(length) > maximumBytes)) throw new Error('Official source exceeds byte limit');
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      bytes += value.byteLength;
      if (bytes > maximumBytes) throw new Error('Official source exceeds byte limit');
      yield value;
    }
    if (length && bytes !== Number(length)) throw new Error('Official source truncated');
  } finally {
    await reader.cancel().catch(() => {});
    reader.releaseLock();
  }
}

function projectCounts(raw: unknown): CrimeCounts | null {
  const value = object(raw), fields = object(value.byOffense);
  if (!Number.isSafeInteger(value.total) || value.total < 0 || value.total > 1_000_000) return null;
  const byOffense = {} as CrimeCounts['byOffense'];
  for (const key of CRIME_OFFENSES) {
    if (!Number.isSafeInteger(fields[key]) || fields[key] < 0) return null;
    byOffense[key] = fields[key];
  }
  if (CRIME_OFFENSES.reduce((sum, key) => sum + byOffense[key], 0) !== value.total) return null;
  return { total: value.total, byOffense };
}

/** Validate/project persisted aggregates; unknown fields are not republished. */
function previousCrime(previous: PropertyZoneSources | undefined, version: string, period: { periodFrom: string; periodTo: string }): PropertyZoneSources['crime'] | null {
  const crime = object(previous?.crime);
  if (object(crime.source).version !== version || crime.periodFrom !== period.periodFrom || crime.periodTo !== period.periodTo
    || crime.includesAttempts !== true || !Number.isSafeInteger(crime.unassignedCount) || crime.unassignedCount < 0) return null;
  const countsByOfficialCode: Record<string, CrimeCounts> = {}, countsByDepartment: Record<string, CrimeCounts> = {};
  for (let code = 1; code <= 62; code++) {
    const counts = projectCounts(object(crime.countsByOfficialCode)[String(code)]);
    if (!counts) return null;
    countsByOfficialCode[String(code)] = counts;
  }
  for (const department of CRIME_DEPARTMENTS) {
    const counts = projectCounts(object(crime.countsByDepartment)[department]);
    if (!counts) return null;
    countsByDepartment[department] = counts;
  }
  if (Object.values(countsByOfficialCode).reduce((sum, counts) => sum + counts.total, 0) + crime.unassignedCount !== countsByDepartment.Montevideo.total
    || !countsByDepartment.Montevideo.total || crime.unassignedCount > countsByDepartment.Montevideo.total * 0.1) return null;
  const nationalTotal = Object.values(countsByDepartment).reduce((sum, counts) => sum + counts.total, 0);
  if (nationalTotal < 1000 || nationalTotal > 1_000_000 || CRIME_OFFENSES.some(offense =>
    Object.values(countsByOfficialCode).reduce((sum, counts) => sum + counts.byOffense[offense], 0) > countsByDepartment.Montevideo.byOffense[offense])) return null;
  return { ...period, countsByOfficialCode, countsByDepartment, unassignedCount: crime.unassignedCount, includesAttempts: true, source: crime.source };
}

/** Offline job only: one small metadata GET, and a streaming CSV import only when its version changes. */
export async function loadPropertyZoneSources(options: PropertyZoneSourcesOptions = {}): Promise<PropertyZoneSources> {
  const now = options.now ?? new Date();
  const geometry = loadOfficialPropertyZoneGeometry(now);
  const fetcher = options.fetchImpl ?? fetch;
  const controller = new AbortController();
  const abort = () => controller.abort();
  if (options.signal?.aborted) abort();
  else options.signal?.addEventListener('abort', abort, { once: true });
  let timeout = setTimeout(abort, 20_000);
  try {
    const metadataResponse = await fetcher(CRIME_METADATA_URL, { signal: controller.signal, redirect: 'error', headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' } });
    if (metadataResponse.status !== 200) throw new Error('Official crime metadata unavailable');
    const chunks: Buffer[] = [];
    for await (const chunk of responseChunks(metadataResponse, 1024 * 1024)) chunks.push(Buffer.from(chunk));
    const metadata = object(JSON.parse(Buffer.concat(chunks).toString('utf8')));
    const result = object(metadata.result);
    if (metadata.success !== true || result.id !== '999f2edc-5ef5-4d41-bed7-824a5635ea8d' || result.license_id !== 'odc-uy'
      || !Array.isArray(result.resources)) throw new Error('Unexpected crime metadata');
    const resource = object(result.resources.find((item: unknown) => object(item).id === CRIME_RESOURCE_ID));
    if (resource.url !== CRIME_CSV_URL || resource.format !== 'CSV' || resource.state !== 'active'
      || typeof resource.temporal_coverage !== 'string' || !Number.isSafeInteger(resource.size)
      || resource.size < 1 || resource.size > CRIME_MAX_BYTES || typeof resource.last_modified !== 'string'
      || !Number.isFinite(Date.parse(resource.last_modified))) throw new Error('Unexpected crime resource');
    const period = crimeReportingPeriod(resource.temporal_coverage, now);
    const version = createHash('sha256').update(JSON.stringify({
      parser: 1, geometry: geometry.source.version, id: CRIME_RESOURCE_ID,
      modified: resource.last_modified, size: resource.size, ...period,
    })).digest('hex');
    const source = {
      name: 'Ministerio del Interior · AECA · Delitos denunciados',
      url: CRIME_DATASET_URL, licenseUrl: LICENSE_URL,
      dataAsOf: period.periodTo, fetchedAt: now.toISOString(), version, resourceModified: resource.last_modified,
    };
    const cached = !options.force && previousCrime(options.previous, version, period);
    if (cached) return { geometry, crime: { ...cached, source } };
    clearTimeout(timeout);
    timeout = setTimeout(abort, 240_000);
    const response = await fetcher(CRIME_CSV_URL, { signal: controller.signal, redirect: 'error', headers: { 'User-Agent': USER_AGENT, Accept: 'text/csv' } });
    if (response.status !== 200) throw new Error('Official crime CSV unavailable');
    let received = 0;
    async function* counted() {
      for await (const chunk of responseChunks(response, Math.min(resource.size, CRIME_MAX_BYTES))) { received += chunk.byteLength; yield chunk; }
    }
    const aggregated = await aggregateCrimeCsv(counted(), geometry.zones, period);
    if (received !== resource.size) throw new Error('Official crime CSV does not match metadata size');
    return {
      geometry,
      crime: {
        ...period, countsByOfficialCode: aggregated.countsByOfficialCode,
        countsByDepartment: aggregated.countsByDepartment,
        unassignedCount: aggregated.unassignedCount, includesAttempts: true, source,
      },
    };
  } finally {
    controller.abort();
    clearTimeout(timeout);
    options.signal?.removeEventListener('abort', abort);
  }
}
