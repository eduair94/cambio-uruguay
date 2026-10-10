import { readdirSync, readFileSync } from 'node:fs'
import { join, relative, resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

// Nitro names a task after its FILE (server/tasks/rentals/directory-warm.ts → rentals:directory-warm),
// not after `meta.name`, and silently drops a scheduled entry whose name matches no file. Found
// 2026-10-09: five scheduled tasks had a camelCase file and a kebab-case schedule, so the built server
// never ran rentals:directory-warm, rentals:analysis-weekly, casas:reviews, withdraw:iva-check nor the
// new rentals:fit-warm — no error, no log, just missing from the server's own list.
const root = resolve(__dirname, '../..')
const tasksDir = join(root, 'server/tasks')

function taskFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap(entry =>
    entry.isDirectory() ? taskFiles(join(dir, entry.name)) : [join(dir, entry.name)]
  )
}
const nameOf = (file: string) =>
  relative(tasksDir, file)
    .replace(/\.[cm]?ts$/, '')
    .split(/[\\/]/)
    .join(':')

function scheduledNames(): string[] {
  const config = readFileSync(join(root, 'nuxt.config.ts'), 'utf8')
  const start = config.indexOf('scheduledTasks: {')
  expect(start).toBeGreaterThan(0)
  const block = config.slice(start, config.indexOf('\n    },', start))
  return [...block.matchAll(/'[^']+':\s*\[([^\]]*)\]/g)].flatMap(match =>
    [...match[1]!.matchAll(/'([^']+)'/g)].map(task => task[1]!)
  )
}

describe('scheduled Nitro tasks', () => {
  it('every scheduled task has a file of that name, so Nitro registers and runs it', () => {
    const files = new Set(taskFiles(tasksDir).map(nameOf))
    const scheduled = scheduledNames()
    expect(scheduled.length).toBeGreaterThan(10)
    expect(scheduled.filter(name => !files.has(name))).toEqual([])
  })

  it("each task's meta.name is its file's name, so the code says what Nitro calls it", () => {
    for (const file of taskFiles(tasksDir)) {
      const declared = readFileSync(file, 'utf8').match(/name:\s*'([^']+)'/)?.[1]
      expect(declared, file).toBe(nameOf(file))
    }
  })
})
