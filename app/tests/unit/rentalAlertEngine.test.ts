import { describe, expect, it, vi } from 'vitest'
import {
  executeRentalAlertChannels,
  rentalAlertCursor,
  rentalAlertSelectEvents,
  rentalAlertOutboxCurrent,
  rentalAlertDigestDue,
  runRentalAlerts,
} from '../../server/utils/rentalAlertRunner'
import type {
  RentalAlertChannelState,
  RentalAlertOutboxDoc,
} from '../../server/models/RentalAlertOutbox'
import type { RentalAlertDoc } from '../../server/models/RentalAlert'
import type { RentalAlertEventDoc, RentalAlertIndexDoc } from '../../server/models/RentalAlertEvent'
import type { RentalAlertCandidate } from '../../utils/rentalAlerts'

vi.mock('../../server/utils/rentalAlertDelivery', () => ({ deliverRentalAlertChannel: vi.fn() }))
vi.mock('../../server/utils/db', () => ({ connectDb: vi.fn() }))

const channel = (
  status: RentalAlertChannelState['status'] = 'pending'
): RentalAlertChannelState => ({ status, attempts: 0, nextAttemptAt: null, reason: null })
const pending = (): RentalAlertOutboxDoc['channels'] => ({ email: channel(), push: channel() })
const at = new Date('2026-09-06T12:00:00Z')
const candidate = (id: string): RentalAlertCandidate => ({
  id,
  propertyKey: id,
  title: 'Alquiler',
  url: '/alquileres/test',
  price: { amount: 30000, currency: 'UYU' },
  expenses: null,
  department: 'Montevideo',
  neighborhood: 'Cordón',
  bedrooms: 1,
  image: null,
})

describe('rental alert durable delivery decisions', () => {
  it('counts a successful late retry in the hourly and daily digest limits', () => {
    const alert = { frequency: 'hourly' as const, lastNotifiedAt: new Date(+at + 40 * 60000) }
    expect(rentalAlertDigestDue(alert, at, +at + 60 * 60000)).toBe(false)
    expect(rentalAlertDigestDue(alert, at, +at + 100 * 60000)).toBe(true)
    expect(rentalAlertDigestDue({ ...alert, frequency: 'daily' }, at, +at + 24 * 3600000)).toBe(
      false
    )
    expect(rentalAlertDigestDue({ frequency: 'hourly', lastNotifiedAt: null }, null, +at)).toBe(
      true
    )
  })
  it('keeps a successful email when push fails and retries only push', async () => {
    const saved = pending()
    const save = async (key: 'email' | 'push', state: RentalAlertChannelState) => {
      saved[key] = state
    }
    const deliver = vi.fn(async (key: string) => ({
      status: key === 'email' ? ('sent' as const) : ('failed' as const),
    }))
    await executeRentalAlertChannels({ channels: saved, now: at.getTime(), save, deliver })
    expect(saved.email.status).toBe('sent')
    expect(saved.push.status).toBe('failed')
    const retry = vi.fn(async () => ({ status: 'sent' as const }))
    await executeRentalAlertChannels({
      channels: saved,
      now: at.getTime() + 600001,
      save,
      deliver: retry,
    })
    expect(retry.mock.calls).toEqual([['push']])
    expect(saved.email.attempts).toBe(1)
    expect(saved.push.attempts).toBe(2)
  })

  it('does not retry a timeout whose provider acceptance is unknown', async () => {
    const states = { email: channel(), push: channel('skipped') }
    const save = async (key: 'email' | 'push', value: RentalAlertChannelState) => {
      states[key] = value
    }
    await executeRentalAlertChannels({
      channels: states,
      now: +at,
      save,
      deliver: async () => {
        throw new Error('timeout')
      },
    })
    expect(states.email.status).toBe('uncertain')
    const retry = vi.fn()
    await executeRentalAlertChannels({
      channels: states,
      now: +at + 86400000,
      save,
      deliver: retry,
    })
    expect(retry).not.toHaveBeenCalled()
  })

  it('recovers a crash after SMTP acceptance but before recording success without sending twice', async () => {
    const states = { email: channel(), push: channel('skipped') }
    const deliver = vi.fn(async () => ({ status: 'sent' as const }))
    const save = async (key: 'email' | 'push', value: RentalAlertChannelState) => {
      if (value.status === 'sent') throw new Error('database disconnected')
      states[key] = value
    }
    await expect(
      executeRentalAlertChannels({ channels: states, now: +at, save, deliver })
    ).rejects.toThrow()
    expect(states.email.status).toBe('sending')
    await executeRentalAlertChannels({ channels: states, now: +at + 5000, save, deliver })
    expect(states.email.status).toBe('uncertain')
    expect(deliver).toHaveBeenCalledTimes(1)
  })

  it('never calls a provider before its sending state is durably saved', async () => {
    const deliver = vi.fn()
    await expect(
      executeRentalAlertChannels({
        channels: pending(),
        now: +at,
        save: async () => {
          throw new Error('write failed')
        },
        deliver,
      })
    ).rejects.toThrow()
    expect(deliver).not.toHaveBeenCalled()
  })

  it('respects backoff, unavailable channels and the maximum retry count', async () => {
    const deliver = vi.fn()
    await executeRentalAlertChannels({
      channels: {
        email: { ...channel('failed'), attempts: 3 },
        push: { ...channel('failed'), attempts: 1, nextAttemptAt: new Date(+at + 60000) },
      },
      now: +at,
      save: vi.fn(),
      deliver,
    })
    expect(deliver).not.toHaveBeenCalled()
  })

  it('does not send, connect or initialize a baseline during an ordinary development task', async () => {
    const { connectDb } = await import('../../server/utils/db')
    expect(await runRentalAlerts()).toMatchObject({ skipped: 'delivery_disabled', sent: 0 })
    expect(connectDb).not.toHaveBeenCalled()
  })

  it('excludes the entire activation boundary, including IDs later in lexical order', () => {
    const alert = { startsAt: at, cursorAt: null, cursorId: '' } as RentalAlertDoc
    const index = { baselineAt: new Date(+at - 1000) } as RentalAlertIndexDoc
    expect(rentalAlertCursor(alert, index)).toEqual({ at, id: '\uFFFF' })
    expect(
      rentalAlertCursor(
        { ...alert, cursorAt: new Date(+at + 1), cursorId: 'rent:infocasas:99' },
        index
      ).id
    ).toBe('rent:infocasas:99')
    expect(
      rentalAlertCursor(alert, { ...index, baselineAt: new Date(+at + 1000) }).at.getTime()
    ).toBe(+at + 1000)
  })

  it('does not skip matching IDs past a full digest or unmatched events inside its page', () => {
    const events = Array.from(
      { length: 501 },
      (_, i): RentalAlertEventDoc => ({
        _id: `event-${i}`,
        candidateId: String(i).padStart(4, '0'),
        kind: 'rental-search',
        discoveredAt: at,
        baseline: false,
      })
    )
    const matches = events.filter((_, i) => i % 2 === 0).map(event => candidate(event.candidateId))
    const first = rentalAlertSelectEvents(events, matches, 200)
    expect(first.selected).toHaveLength(200)
    expect(first.last?.candidateId).toBe('0398')
    const remainder = events.filter(event => event.candidateId > first.last!.candidateId)
    expect(rentalAlertSelectEvents(remainder, matches, 200).selected).toHaveLength(51)
  })

  it('invalidates pending deliveries after pause, revision, user mismatch or algorithm change', () => {
    const alert = { active: true, uid: 'a', kind: 'rental-search', revision: 2 } as RentalAlertDoc
    const outbox = {
      uid: 'a',
      kind: 'rental-search',
      revision: 2,
      algorithm: 'v1',
      createdAt: at,
    } as RentalAlertOutboxDoc
    const index = { algorithm: 'v1', baselineAt: new Date(+at - 1) } as RentalAlertIndexDoc
    expect(rentalAlertOutboxCurrent(alert, outbox, index)).toBe(true)
    for (const changed of [
      { ...alert, active: false },
      { ...alert, revision: 3 },
      { ...alert, uid: 'b' },
      null,
    ])
      expect(rentalAlertOutboxCurrent(changed, outbox, index)).toBe(false)
    expect(rentalAlertOutboxCurrent(alert, outbox, { ...index, algorithm: 'v2' })).toBe(false)
    expect(
      rentalAlertOutboxCurrent(alert, outbox, { ...index, baselineAt: new Date(+at + 1) })
    ).toBe(false)
  })
})
