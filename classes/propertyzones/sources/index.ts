import { createHash } from 'node:crypto';
import { createReadStream, statSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { aggregateCrimeCsvWindows, CRIME_DEPARTMENTS, CRIME_MAX_BYTES, type CrimePeriod, crimeReportingPeriod, previousCrimePeriod } from './crime';
import { loadOfficialPropertyZoneGeometry } from './geometry';
import { CRIME_OFFENSES, CrimeCounts, PropertyZoneSources } from './types';
export * from './types';
export { loadOfficialPropertyZoneGeometry, officialZoneName } from './geometry';

export const CRIME_DATASET_URL = 'https://catalogodatos.gub.uy/dataset/ministerio-del-interior-delitos_denunciados_en_el_uruguay';
export const CRIME_METADATA_URL = 'https://catalogodatos.gub.uy/api/3/action/package_show?id=ministerio-del-interior-delitos_denunciados_en_el_uruguay';
export const CRIME_DATASET_ID = '999f2edc-5ef5-4d41-bed7-824a5635ea8d';
/**
 * The CSV is found by its published name, not by a pinned id: on 2026-10-20 the Ministry re-uploaded
 * it as a NEW resource (`c8c4cc18…` → `4d76b716…`, `otros-delitos-2.csv`), the old id vanished and
 * the layer froze on 2026-06-30 while the job failed silently every day (Sentry CAMBIO-URUGUAY-BACKEND-1R).
 * Everything else stays as strict as before: the dataset, an active CSV under this dataset's own
 * download path, and exactly one candidate — two would be ambiguous, and nothing is guessed.
 */
export const CRIME_RESOURCE_NAME = 'Denuncias de otros delitos';
const CRIME_CSV_URL_PATTERN = /^https:\/\/catalogodatos\.gub\.uy\/dataset\/999f2edc-5ef5-4d41-bed7-824a5635ea8d\/resource\/([\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12})\/download\/otros-delitos[\w.-]*\.csv$/;
/** The resource as published on 2026-10-20 (tests and documentation; the job resolves it by name). */
export const CRIME_RESOURCE_ID = '4d76b716-a06a-45dd-ba1c-01fc6d88ee99';
export const CRIME_CSV_URL = `https://catalogodatos.gub.uy/dataset/${CRIME_DATASET_ID}/resource/${CRIME_RESOURCE_ID}/download/otros-delitos-2.csv`;

/** The one active CSV named like the crime file, under this dataset's own download path; else null. */
export function findCrimeResource(resources: unknown[]): Record<string, any> | null {
  const candidates = resources.map(item => object(item)).filter(item => {
    const url = typeof item.url === 'string' ? item.url : '';
    const id = CRIME_CSV_URL_PATTERN.exec(url)?.[1];
    return id === item.id && item.state === 'active' && item.format === 'CSV'
      && typeof item.name === 'string' && item.name.trim().toLowerCase() === CRIME_RESOURCE_NAME.toLowerCase();
  });
  return candidates.length === 1 ? candidates[0]! : null;
}
const LICENSE_URL = 'https://www.gub.uy/agencia-gobierno-electronico-sociedad-informacion-conocimiento/sites/agencia-gobierno-electronico-sociedad-informacion-conocimiento/files/documentos/publicaciones/licencia_de_datos_abiertos_0.pdf';
const USER_AGENT = 'CambioUruguayBot/1.0 (+https://cambio-uruguay.com)';

export interface PropertyZoneSourcesOptions {
  /** Aggregate output from the previous successful import, never incident records. */
  previous?: PropertyZoneSources;
  force?: boolean;
  now?: Date;
  fetchImpl?: typeof fetch;
  signal?: AbortSignal;
  /** Where a CSV downloaded by hand is looked for (default: crimeCsvLocalDir()). */
  localDir?: string;
}

/**
 * catalogodatos.gub.uy serves the VPS (Montreal) at ~80 KB/s and drops the connection after
 * ~225 s, so the 383 MB file never arrives there (measured 2026-11-22; from Uruguay: 3.7 MB/s).
 * The import therefore also takes the CSV from disk, downloaded in Uruguay and copied over:
 * `<dir>/<resource id>.csv`, used only if its size is EXACTLY the catalog's for that resource.
 * The name carries the id, so a file left from an older upload is never read as the new one, and
 * the aggregator validates the content as it does for the download (header, 12 months, minimum).
 */
export function crimeCsvLocalDir(): string {
  return process.env.PROPERTY_ZONES_CRIME_DIR || join(homedir(), '.cache', 'cambio-uruguay', 'crime');
}

function localFileSize(path: string): number {
  try {
    return statSync(path).size;
  } catch {
    return -1;
  }
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
function previousCrime(previous: PropertyZoneSources | undefined, version: string, periods: CrimePeriod[]): PropertyZoneSources['crime'] | null {
  const crime = object(previous?.crime);
  const period = periods.find(candidate => crime.periodFrom === candidate.periodFrom && crime.periodTo === candidate.periodTo);
  if (object(crime.source).version !== version || !period
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
    if (metadata.success !== true || result.id !== CRIME_DATASET_ID || result.license_id !== 'odc-uy'
      || !Array.isArray(result.resources)) throw new Error('Unexpected crime metadata');
    const resource = object(findCrimeResource(result.resources));
    if (typeof resource.id !== 'string' || typeof resource.url !== 'string'
      || typeof resource.temporal_coverage !== 'string' || !Number.isSafeInteger(resource.size)
      || resource.size < 1 || resource.size > CRIME_MAX_BYTES || typeof resource.last_modified !== 'string'
      || !Number.isFinite(Date.parse(resource.last_modified))) throw new Error('Unexpected crime resource');
    const period = crimeReportingPeriod(resource.temporal_coverage, now);
    const version = createHash('sha256').update(JSON.stringify({
      parser: 1, geometry: geometry.source.version, id: resource.id,
      modified: resource.last_modified, size: resource.size, ...period,
    })).digest('hex');
    const source = {
      name: 'Ministerio del Interior · AECA · Delitos denunciados',
      url: CRIME_DATASET_URL, licenseUrl: LICENSE_URL,
      dataAsOf: period.periodTo, fetchedAt: now.toISOString(), version, resourceModified: resource.last_modified,
    };
    // The declared window first, then one month earlier (previousCrimePeriod): the version still
    // names the file, and the window is whichever the file proves complete.
    const periods = [period, previousCrimePeriod(period)];
    const cached = !options.force && previousCrime(options.previous, version, periods);
    if (cached) return { geometry, crime: { ...cached, source: { ...source, dataAsOf: cached.periodTo } } };
    clearTimeout(timeout);
    timeout = setTimeout(abort, 240_000);
    const localPath = join(options.localDir ?? crimeCsvLocalDir(), `${resource.id}.csv`);
    let received = 0;
    let aggregated: Awaited<ReturnType<typeof aggregateCrimeCsvWindows>>;
    if (localFileSize(localPath) === resource.size) {
      clearTimeout(timeout);
      async function* fromDisk() {
        for await (const chunk of createReadStream(localPath, { highWaterMark: 1024 * 1024 })) {
          received += (chunk as Buffer).byteLength;
          yield chunk as Uint8Array;
        }
      }
      aggregated = await aggregateCrimeCsvWindows(fromDisk(), geometry.zones, periods);
    } else {
      try {
        const response = await fetcher(resource.url, { signal: controller.signal, redirect: 'error', headers: { 'User-Agent': USER_AGENT, Accept: 'text/csv' } });
        if (response.status !== 200) throw new Error('Official crime CSV unavailable');
        async function* counted() {
          for await (const chunk of responseChunks(response, Math.min(resource.size, CRIME_MAX_BYTES))) { received += chunk.byteLength; yield chunk; }
        }
        aggregated = await aggregateCrimeCsvWindows(counted(), geometry.zones, periods);
      } catch (error) {
        // The one line an operator needs, in the job's log and in Sentry Logs.
        console.warn(`[property-zones] crime CSV not imported (${error instanceof Error ? error.message : 'error'}): download ${resource.url} from Uruguay and copy it to ${localPath} (exactly ${resource.size} bytes)`);
        throw error;
      }
    }
    if (received !== resource.size) throw new Error('Official crime CSV does not match metadata size');
    return {
      geometry,
      crime: {
        ...aggregated.period, countsByOfficialCode: aggregated.aggregation.countsByOfficialCode,
        countsByDepartment: aggregated.aggregation.countsByDepartment,
        unassignedCount: aggregated.aggregation.unassignedCount, includesAttempts: true,
        source: { ...source, dataAsOf: aggregated.period.periodTo },
      },
    };
  } finally {
    controller.abort();
    clearTimeout(timeout);
    options.signal?.removeEventListener('abort', abort);
  }
}
