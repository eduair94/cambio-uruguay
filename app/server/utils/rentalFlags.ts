/**
 * The rentals directory's kill switch: a file, not an environment variable and not a deploy.
 *
 * `app/.data/flags/rentals.json` holds `{"memo":"on"|"off","minimal":"on"|"off"}`. Each pm2 worker
 * reads it once, synchronously, when this module loads (so a switch turned off stays off across a
 * reload or a deploy, from the very first request), then re-reads it at most every 30 s,
 * asynchronously and only when a request asks (no timer: the request that finds the value due
 * still uses the cached one, the next ones the new one). So turning the memo off on the VPS is
 * writing that JSON into `/root/cambio-uruguay/app/.data/flags/rentals.json`; both workers follow
 * within 30 s, without a reload. `.data` is gitignored and survives deploys.
 *
 * Fail-open on purpose: a missing file means everything on (the normal state carries no file), and
 * an unreadable or malformed one also means everything on, with one warning per bad streak. A
 * switch that breaks the directory when someone mistypes a brace would be worse than no switch.
 *
 * `setRentalFlag` is for the production audit (spec P7): it writes a temp file and renames it over
 * the real one, so the other worker never reads half a file.
 */
import {
  mkdir as fsMkdir,
  readFile as fsReadFile,
  rename as fsRename,
  unlink as fsUnlink,
  writeFile as fsWriteFile,
} from 'node:fs/promises'
import { readFileSync as fsReadFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'

export type RentalFlagName = 'memo' | 'minimal'
export type RentalFlagValue = 'on' | 'off'
export type RentalFlagValues = Record<RentalFlagName, RentalFlagValue>

export const RENTAL_FLAG_NAMES: readonly RentalFlagName[] = Object.freeze(['memo', 'minimal'])
export const RENTAL_FLAGS_REFRESH_MS = 30_000

const ALL_ON: Readonly<RentalFlagValues> = Object.freeze({ memo: 'on', minimal: 'on' })

/** Resolved on every read, so the path follows the process's working directory (`app/` on the VPS). */
export function rentalFlagsPath(): string {
  return resolve(process.cwd(), '.data/flags/rentals.json')
}

/**
 * The file's two flags, or null when it is not that object. An absent flag is on; keys other than
 * the two flags (the audit writes `reason` and `at`) are ignored; any other value is malformed.
 */
export function parseRentalFlags(text: string): RentalFlagValues | null {
  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch {
    return null
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null
  const record = parsed as Record<string, unknown>
  const values: RentalFlagValues = { ...ALL_ON }
  for (const name of RENTAL_FLAG_NAMES) {
    if (!Object.hasOwn(record, name)) continue
    const value = record[name]
    if (value !== 'on' && value !== 'off') return null
    values[name] = value
  }
  return values
}

export interface RentalFlagsFs {
  /** Only for the one read at creation, before any request can ask. */
  readFileSync(path: string): string
  readFile(path: string): Promise<string>
  writeFile(path: string, data: string): Promise<void>
  rename(from: string, to: string): Promise<void>
  mkdir(path: string): Promise<void>
  unlink(path: string): Promise<void>
}

const NODE_FS: RentalFlagsFs = {
  readFileSync: path => fsReadFileSync(path, 'utf8'),
  readFile: path => fsReadFile(path, 'utf8'),
  writeFile: (path, data) => fsWriteFile(path, data, 'utf8'),
  rename: fsRename,
  mkdir: async path => {
    await fsMkdir(path, { recursive: true })
  },
  unlink: fsUnlink,
}

export interface RentalFlagsOptions {
  /** Default: {@link rentalFlagsPath}, resolved on each read. */
  path?: string | (() => string)
  now?: () => number
  fs?: RentalFlagsFs
  warn?: (message: string, detail?: unknown) => void
  refreshMs?: number
}

export type RentalFlagListener = (value: RentalFlagValue) => void

export interface RentalFlags {
  /** The cached value; starts a re-read when the last one is at least `refreshMs` old. */
  flag(name: RentalFlagName): boolean
  /** Starts at 0, +1 each time a read (or this worker's own write) observes the value change. */
  generation(name: RentalFlagName): number
  /** Called once per observed change, after the cached value moved. Returns the unsubscribe. */
  onChange(name: RentalFlagName, listener: RentalFlagListener): () => void
  /** Writes the file atomically and applies the value to this worker at once. */
  set(name: RentalFlagName, value: RentalFlagValue, reason: string): Promise<void>
  /** Resolves when the read in flight, if any, has been applied. For tests and for `set`. */
  settled(): Promise<void>
}

const errorCode = (error: unknown) =>
  error && typeof error === 'object' ? (error as { code?: unknown }).code : undefined

export function createRentalFlags(options: RentalFlagsOptions = {}): RentalFlags {
  const now = options.now ?? Date.now
  const fs = options.fs ?? NODE_FS
  const warn = options.warn ?? ((message, detail) => console.warn(message, detail ?? ''))
  const refreshMs = options.refreshMs ?? RENTAL_FLAGS_REFRESH_MS
  const pathOf = () =>
    typeof options.path === 'function' ? options.path() : (options.path ?? rentalFlagsPath())

  const values: RentalFlagValues = { ...ALL_ON }
  const generations: Record<RentalFlagName, number> = { memo: 0, minimal: 0 }
  const listeners: Record<RentalFlagName, Set<RentalFlagListener>> = {
    memo: new Set(),
    minimal: new Set(),
  }
  let lastReadAt = Number.NEGATIVE_INFINITY
  let inFlight: Promise<void> | null = null
  /** The problem last warned about; cleared by a good read, so each bad streak warns once. */
  let warnedFor: 'malformed' | 'unreadable' | null = null
  let writing: Promise<void> = Promise.resolve()

  const problem = (kind: 'malformed' | 'unreadable', path: string, detail?: unknown) => {
    if (warnedFor !== kind) warn(`[rentals-flags] ${path} is ${kind}; every flag stays on`, detail)
    warnedFor = kind
  }

  const apply = (next: RentalFlagValues) => {
    const changed = RENTAL_FLAG_NAMES.filter(name => next[name] !== values[name])
    for (const name of changed) {
      values[name] = next[name]
      generations[name]++
    }
    for (const name of changed) {
      for (const listener of [...listeners[name]]) {
        try {
          listener(values[name])
        } catch (error) {
          warn(`[rentals-flags] a ${name} listener failed`, error)
        }
      }
    }
  }

  /** The file's values for a write: what it says, or this worker's view when it says nothing usable. */
  const readForWrite = async (path: string): Promise<RentalFlagValues> => {
    try {
      return parseRentalFlags(await fs.readFile(path)) ?? { ...values }
    } catch {
      return { ...values }
    }
  }

  /** The file's values under the fail-open rules (missing: silent; bad: one warning per streak). */
  const interpret = (path: string, read: () => string): RentalFlagValues => {
    try {
      const parsed = parseRentalFlags(read())
      if (parsed) {
        warnedFor = null
        return parsed
      }
      problem('malformed', path)
    } catch (error) {
      if (errorCode(error) === 'ENOENT') warnedFor = null
      else problem('unreadable', path, error)
    }
    return { ...ALL_ON }
  }

  const refresh = (): Promise<void> => {
    if (inFlight) return inFlight
    lastReadAt = now()
    const path = pathOf()
    inFlight = (async () => {
      let text: string | undefined
      let failure: unknown
      try {
        text = await fs.readFile(path)
      } catch (error) {
        failure = error
      }
      apply(
        interpret(path, () => {
          if (text === undefined) throw failure
          return text
        })
      )
    })().finally(() => {
      inFlight = null
    })
    return inFlight
  }

  // The first read, synchronous and before any request: it is the starting point, not a change, so
  // it moves no generation and calls no listener. Without it every worker would start "on" after a
  // reload, and the first requests would run what the file switched off.
  {
    lastReadAt = now()
    const path = pathOf()
    Object.assign(
      values,
      interpret(path, () => fs.readFileSync(path))
    )
  }

  return {
    flag(name) {
      if (now() - lastReadAt >= refreshMs) void refresh()
      return values[name] === 'on'
    },
    generation: name => generations[name],
    onChange(name, listener) {
      listeners[name].add(listener)
      return () => {
        listeners[name].delete(listener)
      }
    },
    set(name, value, reason) {
      // One write at a time: two concurrent writes would each read the file before the other's
      // rename, and the second would put back the first one's flag.
      const write = writing.then(() => writeFlag(name, value, reason))
      writing = write.catch(() => {})
      return write
    },
    settled: () => inFlight ?? Promise.resolve(),
  }

  async function writeFlag(name: RentalFlagName, value: RentalFlagValue, reason: string) {
    // No re-read may start while this writes, and one that started before must land first:
    // otherwise it would apply the file's old value after this write applied the new one.
    lastReadAt = now()
    if (inFlight) await inFlight
    const path = pathOf()
    const next = { ...(await readForWrite(path)), [name]: value }
    const body = `${JSON.stringify(
      {
        memo: next.memo,
        minimal: next.minimal,
        changed: name,
        reason: String(reason).slice(0, 500),
        at: new Date(now()).toISOString(),
      },
      null,
      2
    )}\n`
    const temp = `${path}.${process.pid}.${now()}.tmp`
    await fs.mkdir(dirname(path))
    try {
      await fs.writeFile(temp, body)
      await fs.rename(temp, path)
    } catch (error) {
      await fs.unlink(temp).catch(() => {})
      throw error
    }
    lastReadAt = now()
    apply(next)
  }
}

const rentalFlags = createRentalFlags()

/** Whether the named part of the rentals directory is on in this worker (cached, ≤ 30 s old). */
export function rentalFlag(name: RentalFlagName): boolean {
  return rentalFlags.flag(name)
}

export function setRentalFlag(
  name: RentalFlagName,
  value: RentalFlagValue,
  reason: string
): Promise<void> {
  return rentalFlags.set(name, value, reason)
}

export function rentalFlagGeneration(name: RentalFlagName): number {
  return rentalFlags.generation(name)
}

export function onRentalFlagChange(name: RentalFlagName, listener: RentalFlagListener): () => void {
  return rentalFlags.onChange(name, listener)
}
