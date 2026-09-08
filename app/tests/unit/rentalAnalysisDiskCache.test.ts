import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { randomUUID } from 'node:crypto'
import { promises as fs } from 'node:fs'
import { resolve, sep } from 'node:path'
import {
  createRentalAnalysisDiskCache,
  projectRentalAnalysisSnapshot,
} from '../../server/utils/rentalAnalysisDiskCache'
import {
  RENTAL_ANALYSIS_CACHE_VERSION,
  rentalAnalysisCutoff,
  type RentalAnalysisSnapshot,
} from '../../server/utils/rentalAnalysisCache'
import { projectRentalAnalysisProperty } from '../../server/utils/rentalAnalysis'

const at = Date.parse('2026-09-08T12:00:00Z')
const base = resolve(process.cwd(), '.data')
let directory: string
const snapshot = (): RentalAnalysisSnapshot => ({
  version: RENTAL_ANALYSIS_CACHE_VERSION,
  loadedAt: at,
  cutoff: rentalAnalysisCutoff(at),
  value: {
    generatedAt: '2026-09-08T11:00:00Z',
    catalogueProperties: 1,
    listings: [
      {
        propertyKey: 'property-1',
        advertId: 'rent:infocasas:123',
        title: 'Alquiler apartamento en Cordón',
        url: 'https://www.infocasas.com.uy/apartamento/123',
        source: 'infocasas',
        department: 'Montevideo',
        neighborhood: 'Cordón',
        type: 'apartamento',
        currency: 'UYU',
        price: 20000,
        area: 50,
        areaBasis: 'built',
        areas: { built: 50, total: 55 },
        bedrooms: 1,
        bathrooms: 1,
        parkingSpaces: null,
        commonExpenses: 0,
        lastSeen: '2026-09-08T10:00:00Z',
        advertiserKey: 'infocasas:agency-1',
      },
    ],
  },
})
beforeEach(async () => {
  directory = resolve(base, `rental-analysis-cache-test-${randomUUID()}`)
  await fs.mkdir(directory, { recursive: true })
})
afterEach(async () => {
  // Recursive cleanup is confined to the exact test-owned workspace directory.
  if (!directory.startsWith(`${base}${sep}rental-analysis-cache-test-`))
    throw new Error('Unexpected test cleanup path')
  await fs.rm(directory, { recursive: true, force: true })
})

describe('private shared rental analysis snapshot', () => {
  it('accepts the real own-offer normalizer output without persisting its raw evidence', async () => {
    const data = snapshot()
    data.value.listings = projectRentalAnalysisProperty(
      {
        key: 'property-1',
        offers: [
          {
            source: 'infocasas',
            listingId: '123',
            title: 'Alquiler mensual apartamento',
            url: 'https://www.infocasas.com.uy/apartamento/123',
            price: 20000,
            currency: 'UYU',
            commonExpenses: 0,
            commonExpensesCurrency: 'UYU',
            lastSeen: '2026-09-08T10:00:00Z',
            identity: {
              version: 1,
              propertyType: 'apartamento',
              department: 'Montevideo',
              neighborhood: 'Cordón',
              bedrooms: 1,
              bathrooms: 1,
              description: 'Alquiler mensual sin gastos comunes.',
            },
            details: { builtArea: 40, totalArea: 48 },
          },
        ],
      } as Parameters<typeof projectRentalAnalysisProperty>[0],
      new Date(at)
    )
    expect(data.value.listings).toHaveLength(1)
    const store = createRentalAnalysisDiskCache({ directory })
    await store.write(data)
    expect(await store.read()).toEqual(data)
    expect(await fs.readFile(resolve(directory, 'catalogue-v1.json'), 'utf8')).not.toMatch(
      /description|identity/
    )
  })
  it('survives a new store instance and publishes only complete files', async () => {
    const first = createRentalAnalysisDiskCache({ directory })
    expect(await first.read()).toBeNull()
    await first.write(snapshot())
    const second = createRentalAnalysisDiskCache({ directory })
    expect(await second.read()).toEqual(snapshot())
    expect(await fs.readdir(directory)).toEqual(['catalogue-v1.json'])
    const next = snapshot()
    next.value.listings[0]!.price = 22000
    await first.write(next)
    expect((await second.read())?.value.listings[0]?.price).toBe(22000)
  })

  it('strips private additions before persistence and after reading', async () => {
    const data = snapshot()
    Object.assign(data.value.listings[0]!, {
      description: 'PRIVATE-DESCRIPTION',
      identity: { address: 'PRIVATE-ADDRESS' },
      contact: 'PRIVATE-CONTACT',
    })
    const store = createRentalAnalysisDiskCache({ directory })
    await store.write(data)
    const contents = await fs.readFile(resolve(directory, 'catalogue-v1.json'), 'utf8')
    expect(contents).not.toMatch(/PRIVATE-|description|identity|contact/)
    expect(contents).toContain('infocasas:agency-1')
    const raw = JSON.parse(contents)
    raw.value.listings[0].extraPrivateField = 'PRIVATE-LATER'
    await fs.writeFile(resolve(directory, 'catalogue-v1.json'), JSON.stringify(raw))
    expect(JSON.stringify(await store.read())).not.toContain('PRIVATE-LATER')
  })

  it('rejects malformed, incompatible, invalid or oversized files without retaining a partial catalogue', async () => {
    const store = createRentalAnalysisDiskCache({ directory, maxBytes: 2000 })
    for (const value of [
      '{"version":1',
      JSON.stringify({ ...snapshot(), version: 9 }),
      'x'.repeat(2001),
    ]) {
      await fs.writeFile(resolve(directory, 'catalogue-v1.json'), value)
      expect(await store.read()).toBeNull()
    }
    const bad = snapshot()
    bad.value.listings[0]!.price = NaN
    expect(projectRentalAnalysisSnapshot(bad)).toBeNull()
    expect(projectRentalAnalysisSnapshot({ ...snapshot(), cutoff: '2020-01-01' })).toBeNull()
    expect(projectRentalAnalysisSnapshot({ ...snapshot(), loadedAt: NaN })).toBeNull()
  })

  it('does not overwrite the good file when a replacement exceeds its byte budget', async () => {
    await createRentalAnalysisDiskCache({ directory }).write(snapshot())
    const constrained = createRentalAnalysisDiskCache({ directory, maxBytes: 10 })
    await expect(constrained.write(snapshot())).rejects.toThrow('byte budget')
    expect(await createRentalAnalysisDiskCache({ directory }).read()).toEqual(snapshot())
    expect((await fs.readdir(directory)).some(name => name.endsWith('.tmp'))).toBe(false)
  })

  it('coalesces concurrent normalizers and releases a lock after work fails', async () => {
    const a = createRentalAnalysisDiskCache({ directory, pollMs: 2 })
    const b = createRentalAnalysisDiskCache({ directory, pollMs: 2 })
    let active = 0,
      maximum = 0
    const work = async () => {
      active++
      maximum = Math.max(maximum, active)
      await new Promise(resolve => setTimeout(resolve, 15))
      active--
      return true
    }
    await Promise.all([a.withLock(work), b.withLock(work)])
    expect(maximum).toBe(1)
    await expect(
      a.withLock(async () => {
        throw new Error('scan failed')
      })
    ).rejects.toThrow('scan failed')
    expect(await b.withLock(async () => 'recovered')).toBe('recovered')
    expect(await fs.readdir(directory)).toEqual([])
  })

  it('recovers a dead worker lease but never evicts a live owner', async () => {
    const lock = resolve(directory, 'catalogue-v1.lock')
    await fs.writeFile(
      lock,
      JSON.stringify({ token: 'dead-worker', pid: 123, createdAt: at - 120_000 })
    )
    const recovering = createRentalAnalysisDiskCache({
      directory,
      now: () => at,
      processAlive: () => false,
      pollMs: 1,
    })
    expect(await recovering.withLock(async () => 'recovered')).toBe('recovered')
    await fs.writeFile(
      lock,
      JSON.stringify({ token: 'live-worker', pid: 123, createdAt: at - 120_000 })
    )
    const bounded = createRentalAnalysisDiskCache({
      directory,
      now: () => at,
      processAlive: () => true,
      pollMs: 1,
      waitMs: 10,
    })
    await expect(bounded.withLock(async () => 'should not run')).rejects.toThrow('already running')
    expect(JSON.parse(await fs.readFile(lock, 'utf8')).token).toBe('live-worker')
  })

  it('recovers an old empty or malformed lease without stealing a newly created file', async () => {
    const lock = resolve(directory, 'catalogue-v1.lock')
    const store = createRentalAnalysisDiskCache({ directory, now: () => at, pollMs: 1 })
    for (const contents of ['', '{"token":', '{"pid":3}']) {
      await fs.writeFile(lock, contents)
      const old = new Date(at - 120_000)
      await fs.utimes(lock, old, old)
      expect(await store.withLock(async () => 'recovered')).toBe('recovered')
    }
    await fs.writeFile(lock, '')
    await fs.utimes(lock, new Date(at), new Date(at))
    const bounded = createRentalAnalysisDiskCache({
      directory,
      now: () => at,
      pollMs: 1,
      waitMs: 10,
    })
    await expect(bounded.withLock(async () => 'not owned')).rejects.toThrow('already running')
    expect(await fs.readFile(lock, 'utf8')).toBe('')
  })

  it('keeps a validated scan usable if the cache directory cannot be created', async () => {
    const obstacle = resolve(directory, 'a-file')
    await fs.writeFile(obstacle, 'not a directory')
    const store = createRentalAnalysisDiskCache({ directory: resolve(obstacle, 'cache') })
    expect(await store.withLock(async () => 'complete-read')).toBe('complete-read')
    expect(await store.read()).toBeNull()
  })
})
