// The rentals kill switch: a JSON file each pm2 worker re-reads at most every 30 s, so a person (or
// P7's audit) turns the memo or the minimal derivation off without a reload or a deploy. Every test
// runs on a fake clock and an in-memory file system, except the last one, which round-trips the real
// one inside a temporary directory.
import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  RENTAL_FLAGS_REFRESH_MS,
  createRentalFlags,
  parseRentalFlags,
  rentalFlagsPath,
  type RentalFlagsFs,
} from '../../server/utils/rentalFlags'

const PATH = '/srv/app/.data/flags/rentals.json'

function fakeFs(initial?: string) {
  const files = new Map<string, string>()
  if (initial !== undefined) files.set(PATH, initial)
  const ops: string[] = []
  let failRead: NodeJS.ErrnoException | null = null
  const readNow = (path: string) => {
    if (failRead) throw failRead
    const text = files.get(path)
    if (text === undefined)
      throw Object.assign(new Error(`ENOENT: ${path}`), {
        code: 'ENOENT',
      }) as NodeJS.ErrnoException
    return text
  }
  const fs: RentalFlagsFs = {
    readFileSync: path => {
      ops.push(`readSync ${path}`)
      return readNow(path)
    },
    readFile: async path => {
      ops.push(`read ${path}`)
      return readNow(path)
    },
    writeFile: async (path, data) => {
      ops.push(`write ${path}`)
      files.set(path, data)
    },
    rename: async (from, to) => {
      ops.push(`rename ${from} -> ${to}`)
      const text = files.get(from)
      if (text === undefined) throw new Error(`missing ${from}`)
      files.delete(from)
      files.set(to, text)
    },
    mkdir: async path => {
      ops.push(`mkdir ${path}`)
    },
    unlink: async path => {
      ops.push(`unlink ${path}`)
      files.delete(path)
    },
  }
  return {
    fs,
    files,
    ops,
    failReadsWith: (error: NodeJS.ErrnoException | null) => {
      failRead = error
    },
  }
}

function harness(initial?: string, failFirstReadWith?: NodeJS.ErrnoException) {
  let clock = 5_000_000
  const disk = fakeFs(initial)
  if (failFirstReadWith) disk.failReadsWith(failFirstReadWith)
  const warnings: string[] = []
  const flags = createRentalFlags({
    path: PATH,
    now: () => clock,
    fs: disk.fs,
    warn: message => warnings.push(message),
  })
  return {
    flags,
    disk,
    warnings,
    advance: (ms: number) => {
      clock += ms
    },
    /** Asks once (which starts the read when one is due) and waits for that read. */
    read: async () => {
      flags.flag('memo')
      await flags.settled()
    },
  }
}

describe('parseRentalFlags', () => {
  it('reads on/off per flag, an absent flag is on, extra keys are ignored', () => {
    expect(parseRentalFlags('{"memo":"off","minimal":"on"}')).toEqual({
      memo: 'off',
      minimal: 'on',
    })
    expect(parseRentalFlags('{"minimal":"off","reason":"audit","at":"2026-11-20"}')).toEqual({
      memo: 'on',
      minimal: 'off',
    })
    expect(parseRentalFlags('{}')).toEqual({ memo: 'on', minimal: 'on' })
  })

  it('refuses anything that is not that object', () => {
    for (const text of ['', 'off', '[]', 'null', '"off"', '{"memo":false}', '{"memo":"OFF"}'])
      expect(parseRentalFlags(text), text).toBeNull()
  })
})

describe('rentalFlag', () => {
  it('reads the file when it is created, so the very first call already follows an "off"', () => {
    // After a reload or a deploy, a switch turned off must stay off from the first request on.
    const h = harness('{"minimal":"off"}')
    expect(h.flags.flag('minimal')).toBe(false)
    expect(h.flags.flag('memo')).toBe(true)
    // The first read is the starting point, not a change: no generation, nobody notified.
    expect(h.flags.generation('minimal')).toBe(0)
    expect(h.disk.ops).toEqual([`readSync ${PATH}`])
  })

  it('applies the same rules to that first read: malformed warns once, missing is silent', () => {
    const bad = harness('{"minimal": off')
    expect(bad.flags.flag('minimal')).toBe(true)
    expect(bad.warnings).toHaveLength(1)
    expect(bad.warnings[0]).toMatch(/malformed/)
    const denied = harness(
      '{"memo":"off"}',
      Object.assign(new Error('EACCES'), { code: 'EACCES' }) as NodeJS.ErrnoException
    )
    expect(denied.flags.flag('memo')).toBe(true)
    expect(denied.warnings[0]).toMatch(/unreadable/)
    const missing = harness()
    expect(missing.flags.flag('memo')).toBe(true)
    expect(missing.warnings).toEqual([])
  })

  it('is on without a file, and a missing file means all on, without a warning', async () => {
    const h = harness()
    expect(h.flags.flag('memo')).toBe(true)
    await h.flags.settled()
    expect(h.flags.flag('memo')).toBe(true)
    expect(h.flags.flag('minimal')).toBe(true)
    expect(h.warnings).toEqual([])
  })

  it('follows an off in the file once it has been read', async () => {
    const h = harness('{"memo":"off"}')
    await h.read()
    expect(h.flags.flag('memo')).toBe(false)
    expect(h.flags.flag('minimal')).toBe(true)
  })

  it('treats a malformed file as all on, with ONE warning however often it is re-read', async () => {
    const h = harness('{"memo": off')
    await h.read()
    expect(h.flags.flag('memo')).toBe(true)
    expect(h.flags.flag('minimal')).toBe(true)
    for (let i = 0; i < 3; i++) {
      h.advance(RENTAL_FLAGS_REFRESH_MS)
      await h.read()
    }
    expect(h.warnings).toHaveLength(1)
    expect(h.warnings[0]).toMatch(/malformed/)
  })

  it('treats an unreadable file as all on, with one warning', async () => {
    const h = harness('{"memo":"off"}')
    h.disk.failReadsWith(
      Object.assign(new Error('EACCES'), { code: 'EACCES' }) as NodeJS.ErrnoException
    )
    h.advance(RENTAL_FLAGS_REFRESH_MS)
    await h.read()
    expect(h.flags.flag('memo')).toBe(true)
    h.advance(RENTAL_FLAGS_REFRESH_MS)
    await h.read()
    expect(h.warnings).toHaveLength(1)
    expect(h.warnings[0]).toMatch(/unreadable/)
  })

  it('warns again only after the file was good in between', async () => {
    const h = harness('nope')
    await h.read()
    h.disk.files.set(PATH, '{"memo":"on"}')
    h.advance(RENTAL_FLAGS_REFRESH_MS)
    await h.read()
    h.disk.files.set(PATH, 'nope again')
    h.advance(RENTAL_FLAGS_REFRESH_MS)
    await h.read()
    expect(h.warnings).toHaveLength(2)
  })

  it('re-reads at most every 30 s, from a request, and serves the cached value meanwhile', async () => {
    const h = harness('{"memo":"on"}')
    await h.read()
    const reads = () => h.disk.ops.filter(op => op.startsWith('read')).length
    expect(reads()).toBe(1)

    h.disk.files.set(PATH, '{"memo":"off"}')
    h.advance(RENTAL_FLAGS_REFRESH_MS - 1)
    expect(h.flags.flag('memo')).toBe(true)
    await h.flags.settled()
    expect(reads()).toBe(1)

    h.advance(1)
    // The request that finds the value due still gets the cached one: the read is asynchronous.
    expect(h.flags.flag('memo')).toBe(true)
    expect(h.flags.flag('minimal')).toBe(true)
    await h.flags.settled()
    expect(reads()).toBe(2)
    expect(h.flags.flag('memo')).toBe(false)
  })

  it('counts a generation and calls each listener once per observed change, nothing otherwise', async () => {
    const h = harness('{"minimal":"on"}')
    const seen: string[] = []
    h.flags.onChange('minimal', value => {
      // Called after the cached value moved, so a listener reading the flag sees the new one.
      seen.push(`${value}:${h.flags.flag('minimal')}`)
    })
    await h.read()
    expect(h.flags.generation('minimal')).toBe(0)

    h.disk.files.set(PATH, '{"minimal":"off"}')
    h.advance(RENTAL_FLAGS_REFRESH_MS)
    await h.read()
    expect(h.flags.generation('minimal')).toBe(1)
    expect(h.flags.generation('memo')).toBe(0)
    expect(seen).toEqual(['off:false'])

    // Unchanged on the next re-read: no generation, no call.
    h.advance(RENTAL_FLAGS_REFRESH_MS)
    await h.read()
    expect(h.flags.generation('minimal')).toBe(1)
    expect(seen).toEqual(['off:false'])

    h.disk.files.delete(PATH)
    h.advance(RENTAL_FLAGS_REFRESH_MS)
    await h.read()
    expect(h.flags.generation('minimal')).toBe(2)
    expect(seen).toEqual(['off:false', 'on:true'])
  })

  it('stops calling a listener once it unsubscribes, and survives a listener that throws', async () => {
    const h = harness('{"memo":"on"}')
    const calls: string[] = []
    h.flags.onChange('memo', () => {
      throw new Error('listener bug')
    })
    const stop = h.flags.onChange('memo', value => calls.push(value))
    await h.read()
    h.disk.files.set(PATH, '{"memo":"off"}')
    h.advance(RENTAL_FLAGS_REFRESH_MS)
    await h.read()
    expect(calls).toEqual(['off'])
    expect(h.flags.flag('memo')).toBe(false)
    stop()
    h.disk.files.set(PATH, '{"memo":"on"}')
    h.advance(RENTAL_FLAGS_REFRESH_MS)
    await h.read()
    expect(calls).toEqual(['off'])
    expect(h.warnings.some(w => /listener/.test(w))).toBe(true)
  })

  it('writes the switch atomically (temp file, then rename) and applies it at once here', async () => {
    const h = harness('{"memo":"on","minimal":"on"}')
    await h.read()
    const changes: string[] = []
    h.flags.onChange('minimal', value => changes.push(value))
    await h.flags.set('minimal', 'off', 'audit mismatch on two ticks')

    const write = h.disk.ops.findIndex(op => op.startsWith('write'))
    const rename = h.disk.ops.findIndex(op => op.startsWith('rename'))
    expect(h.disk.ops).toContain('mkdir /srv/app/.data/flags')
    expect(write).toBeGreaterThan(-1)
    expect(rename).toBeGreaterThan(write)
    const tempPath = h.disk.ops[write]!.slice('write '.length)
    expect(tempPath).not.toBe(PATH)
    expect(h.disk.ops[rename]).toBe(`rename ${tempPath} -> ${PATH}`)
    expect(h.disk.files.has(tempPath)).toBe(false)

    const written = JSON.parse(h.disk.files.get(PATH)!)
    expect(written).toMatchObject({
      memo: 'on',
      minimal: 'off',
      reason: 'audit mismatch on two ticks',
    })
    expect(parseRentalFlags(h.disk.files.get(PATH)!)).toEqual({ memo: 'on', minimal: 'off' })
    expect(h.flags.flag('minimal')).toBe(false)
    expect(h.flags.generation('minimal')).toBe(1)
    expect(changes).toEqual(['off'])

    // The next re-read finds what this worker wrote: no second change.
    h.advance(RENTAL_FLAGS_REFRESH_MS)
    await h.read()
    expect(h.flags.generation('minimal')).toBe(1)
  })

  it('keeps the other flag as the file has it, even when this worker had not re-read it yet', async () => {
    const h = harness('{}')
    h.disk.files.set(PATH, '{"memo":"off"}')
    expect(h.flags.flag('memo')).toBe(true)
    await h.flags.set('minimal', 'off', 'audit')
    expect(parseRentalFlags(h.disk.files.get(PATH)!)).toEqual({ memo: 'off', minimal: 'off' })
    expect(h.flags.flag('memo')).toBe(false)
  })

  it('serialises two writes, so neither puts back the flag the other changed', async () => {
    const h = harness('{"memo":"on","minimal":"on"}')
    await Promise.all([
      h.flags.set('memo', 'off', 'by hand'),
      h.flags.set('minimal', 'off', 'audit'),
    ])
    expect(parseRentalFlags(h.disk.files.get(PATH)!)).toEqual({ memo: 'off', minimal: 'off' })
    expect(h.flags.flag('memo')).toBe(false)
    expect(h.flags.flag('minimal')).toBe(false)
  })

  it('removes the temp file when the rename fails, and the flag keeps its value', async () => {
    const h = harness('{"minimal":"on"}')
    await h.read()
    h.disk.fs.rename = async () => {
      throw new Error('EXDEV')
    }
    await expect(h.flags.set('minimal', 'off', 'audit')).rejects.toThrow('EXDEV')
    expect([...h.disk.files.keys()]).toEqual([PATH])
    expect(h.flags.flag('minimal')).toBe(true)
  })

  it('resolves the default path under the working directory', () => {
    expect(rentalFlagsPath().replace(/\\/g, '/')).toBe(
      `${process.cwd().replace(/\\/g, '/')}/.data/flags/rentals.json`
    )
  })

  it('round-trips through the real file system', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'rental-flags-'))
    try {
      const path = join(dir, '.data', 'flags', 'rentals.json')
      const writer = createRentalFlags({ path })
      await writer.set('memo', 'off', 'by hand')
      expect(JSON.parse(await readFile(path, 'utf8'))).toMatchObject({ memo: 'off', minimal: 'on' })

      const reader = createRentalFlags({ path })
      expect(reader.flag('memo')).toBe(false)
      await reader.settled()
      expect(reader.flag('memo')).toBe(false)
      expect(reader.flag('minimal')).toBe(true)
    } finally {
      await rm(dir, { recursive: true, force: true })
    }
  })
})
