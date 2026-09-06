import { createHash } from 'node:crypto'
import type { RentalAlertCandidate, RentalAlertKind } from '../../utils/rentalAlerts'
import { RentalAlertModel, type RentalAlertDoc } from '../models/RentalAlert'
import {
  RentalAlertEventModel,
  type RentalAlertEventDoc,
  type RentalAlertIndexDoc,
} from '../models/RentalAlertEvent'
import {
  RentalAlertOutboxModel,
  type RentalAlertChannelState,
  type RentalAlertOutboxDoc,
} from '../models/RentalAlertOutbox'
import { connectDb } from './db'
import { refreshRentalAlertIndex, type RentalAlertIndexResult } from './rentalAlertIndex'
import { withRentalAlertLease } from './rentalAlertLease'
import { matchRentalAlertCandidates } from './rentalAlertMatching'
import { deliverRentalAlertChannel } from './rentalAlertDelivery'

const EVENT_PAGE = 500
const DIGEST_LIMIT = 200
const CHANNELS = ['email', 'push'] as const
type Channel = (typeof CHANNELS)[number]
type DeliveryResult = { status: 'sent' | 'unavailable' | 'failed' | 'uncertain'; reason?: string }

export function rentalAlertDeliveryEnabled(): boolean {
  if (
    process.env.NODE_ENV !== 'production' ||
    import.meta.dev ||
    import.meta.prerender ||
    process.env.RENTAL_ALERTS_ENABLED === '0'
  )
    return false
  const enabled = useRuntimeConfig().rentalAlerts?.enabled
  return enabled !== false && String(enabled).toLowerCase() !== 'false' && String(enabled) !== '0'
}
export function rentalAlertChannelRetryable(state: RentalAlertChannelState): boolean {
  return state.status === 'pending' || (state.status === 'failed' && state.attempts < 3)
}

/** Persist intent BEFORE the transport call; an interrupted sending attempt is ambiguous, not safe to repeat. */
export async function executeRentalAlertChannels(deps: {
  channels: RentalAlertOutboxDoc['channels']
  now: number
  save: (channel: Channel, state: RentalAlertChannelState) => Promise<void>
  deliver: (channel: Channel) => Promise<DeliveryResult>
}): Promise<RentalAlertOutboxDoc['channels']> {
  const states = structuredClone(deps.channels)
  for (const channel of CHANNELS) {
    let state = states[channel]
    if (state.status === 'sending') {
      state = { ...state, status: 'uncertain', reason: 'interrupted_delivery', nextAttemptAt: null }
      await deps.save(channel, state)
      states[channel] = state
      continue
    }
    if (
      !rentalAlertChannelRetryable(state) ||
      (state.nextAttemptAt && new Date(state.nextAttemptAt).getTime() > deps.now)
    )
      continue
    state = { status: 'sending', attempts: state.attempts + 1, nextAttemptAt: null, reason: null }
    await deps.save(channel, state)
    let outcome: DeliveryResult
    try {
      outcome = await deps.deliver(channel)
    } catch {
      outcome = { status: 'uncertain', reason: 'transport_interrupted' }
    }
    state = {
      ...state,
      status: outcome.status,
      reason: outcome.reason?.slice(0, 100) || null,
      nextAttemptAt:
        outcome.status === 'failed' && state.attempts < 3
          ? new Date(deps.now + 600_000 * 2 ** (state.attempts - 1))
          : null,
    }
    await deps.save(channel, state)
    states[channel] = state
  }
  return states
}

export function rentalAlertCursor(
  alert: RentalAlertDoc,
  index: RentalAlertIndexDoc
): { at: Date; id: string } {
  const baseline = Math.max(
    new Date(alert.startsAt).getTime(),
    new Date(index.baselineAt).getTime()
  )
  const cursor = alert.cursorAt ? new Date(alert.cursorAt).getTime() : 0
  return cursor > baseline
    ? { at: new Date(cursor), id: alert.cursorId || '' }
    : { at: new Date(baseline), id: '\uFFFF' }
}
export function rentalAlertAfter(cursor: { at: Date; id: string }) {
  return {
    $or: [
      { discoveredAt: { $gt: cursor.at } },
      { discoveredAt: cursor.at, candidateId: { $gt: cursor.id } },
    ],
  }
}

export function rentalAlertDigestDue(
  alert: Pick<RentalAlertDoc, 'frequency' | 'lastNotifiedAt'>,
  createdAt: Date | null,
  now: number
): boolean {
  const latest = Math.max(
    createdAt ? new Date(createdAt).getTime() : 0,
    alert.lastNotifiedAt ? new Date(alert.lastNotifiedAt).getTime() : 0
  )
  return !latest || now - latest >= (alert.frequency === 'daily' ? 86_400_000 : 3_600_000)
}

/** Stop at the last accepted event when a digest fills; following events remain unread. */
export function rentalAlertSelectEvents(
  events: RentalAlertEventDoc[],
  matches: RentalAlertCandidate[],
  remaining: number
) {
  const byId = new Map(matches.map(candidate => [candidate.id, candidate]))
  const selected: RentalAlertCandidate[] = []
  let last: RentalAlertEventDoc | undefined
  for (const event of events) {
    last = event
    const candidate = byId.get(event.candidateId)
    if (candidate) selected.push(candidate)
    if (selected.length === remaining) break
  }
  return { selected, last }
}

const alertFields = '+emailAddress +unsubscribeToken'
async function currentAlert(id: string) {
  return (await RentalAlertModel.findById(id).select(alertFields).lean()) as RentalAlertDoc | null
}
async function persistCursor(
  alert: RentalAlertDoc,
  cursor: { at: Date; id: string },
  guard: () => Promise<void>
) {
  await guard()
  await RentalAlertModel.updateOne(
    { _id: alert._id, active: true, revision: alert.revision },
    { $set: { cursorAt: cursor.at, cursorId: cursor.id, lastCheckedAt: new Date() } }
  )
}

async function gather(alert: RentalAlertDoc, index: RentalAlertIndexResult, now: number) {
  let cursor = rentalAlertCursor(alert, index.state)
  const candidates: RentalAlertCandidate[] = []
  for (;;) {
    const events = (await RentalAlertEventModel.find({
      kind: alert.kind,
      baseline: false,
      $and: [rentalAlertAfter(cursor), { discoveredAt: { $lte: index.state.scannedAt } }],
    })
      .sort({ discoveredAt: 1, candidateId: 1 })
      .limit(EVENT_PAGE)
      .maxTimeMS(15_000)
      .lean()) as RentalAlertEventDoc[]
    // Dry-run additions have not been inserted; merge them into precisely the same event ordering.
    const extra = index.added.filter(
      event =>
        !event.baseline &&
        (event.discoveredAt.getTime() > cursor.at.getTime() ||
          (event.discoveredAt.getTime() === cursor.at.getTime() && event.candidateId > cursor.id))
    )
    const page = [...new Map([...events, ...extra].map(event => [event._id, event])).values()]
      .sort(
        (a, b) =>
          new Date(a.discoveredAt).getTime() - new Date(b.discoveredAt).getTime() ||
          (a.candidateId < b.candidateId ? -1 : a.candidateId > b.candidateId ? 1 : 0)
      )
      .slice(0, EVENT_PAGE)
    if (!page.length) break
    const matches = await matchRentalAlertCandidates(
      alert.kind,
      alert.filters,
      page.map(event => event.candidateId),
      now
    )
    const selected = rentalAlertSelectEvents(page, matches, DIGEST_LIMIT - candidates.length)
    candidates.push(...selected.selected)
    if (selected.last)
      cursor = { at: new Date(selected.last.discoveredAt), id: selected.last.candidateId }
    if (candidates.length === DIGEST_LIMIT || page.length < EVENT_PAGE) break
  }
  return { candidates, cursor }
}

function groupCurrentCandidates(candidates: RentalAlertCandidate[]) {
  const groups = new Map<string, RentalAlertCandidate>()
  for (const candidate of candidates) {
    const group = candidate.propertyKey || candidate.id
    if (!groups.has(group)) groups.set(group, candidate)
  }
  return [...groups.values()]
}

export function rentalAlertOutboxCurrent(
  alert: RentalAlertDoc | null,
  outbox: RentalAlertOutboxDoc,
  index: RentalAlertIndexDoc
): boolean {
  return Boolean(
    alert?.active &&
      alert.uid === outbox.uid &&
      alert.kind === outbox.kind &&
      alert.revision === outbox.revision &&
      index.algorithm === outbox.algorithm &&
      new Date(outbox.createdAt).getTime() >= new Date(index.baselineAt).getTime()
  )
}

async function cancelInactiveOutboxes() {
  let after = ''
  for (;;) {
    const rows = await RentalAlertOutboxModel.find({
      state: 'pending',
      ...(after ? { _id: { $gt: after } } : {}),
    })
      .sort({ _id: 1 })
      .limit(200)
      .lean()
    const ids = rows.map(row => row.alertId).filter(id => /^[a-f0-9]{24}$/i.test(id))
    const alerts = new Map(
      (
        await RentalAlertModel.find({ _id: { $in: ids } })
          .select({ _id: 1, active: 1, revision: 1, uid: 1 })
          .lean()
      ).map(alert => [String(alert._id), alert])
    )
    const cancelled = rows.filter(row => {
      const alert = alerts.get(row.alertId)
      return !alert?.active || alert.revision !== row.revision || alert.uid !== row.uid
    })
    if (cancelled.length)
      await RentalAlertOutboxModel.updateMany(
        { _id: { $in: cancelled.map(row => row._id) }, state: 'pending' },
        { $set: { state: 'cancelled', completedAt: new Date() } }
      )
    if (rows.length < 200) break
    after = rows.at(-1)!._id
  }
}

async function deliverOutbox(
  alert: RentalAlertDoc,
  outbox: RentalAlertOutboxDoc,
  index: RentalAlertIndexDoc,
  guard: () => Promise<void>
) {
  if (!rentalAlertOutboxCurrent(alert, outbox, index)) {
    await RentalAlertOutboxModel.updateOne(
      { _id: outbox._id, state: 'pending' },
      { $set: { state: 'cancelled', completedAt: new Date() } }
    )
    return 0
  }
  await persistCursor(alert, { at: outbox.cursorAt, id: outbox.cursorId }, guard)
  const candidates = groupCurrentCandidates(
    await matchRentalAlertCandidates(alert.kind, alert.filters, outbox.candidateIds)
  )
  if (!candidates.length) {
    await RentalAlertOutboxModel.updateOne(
      { _id: outbox._id },
      { $set: { state: 'cancelled', completedAt: new Date() } }
    )
    return 0
  }
  let sent = 0
  const channels = await executeRentalAlertChannels({
    channels: outbox.channels,
    now: Date.now(),
    save: async (channel, state) => {
      await guard()
      await RentalAlertOutboxModel.updateOne(
        { _id: outbox._id, state: 'pending' },
        { $set: { [`channels.${channel}`]: state } }
      )
      if (state.status === 'sent') {
        sent++
        await RentalAlertModel.updateOne(
          { _id: alert._id, revision: alert.revision },
          { $set: { lastNotifiedAt: new Date() } }
        )
      }
    },
    deliver: async channel => {
      await guard()
      const fresh = await currentAlert(String(alert._id))
      if (!fresh?.active || fresh.revision !== outbox.revision || !fresh.channels[channel])
        return { status: 'unavailable', reason: 'subscription_changed' }
      return deliverRentalAlertChannel({
        channel,
        alert: fresh,
        candidates,
        deliveryId: `${outbox._id}:${channel}`,
      })
    },
  })
  if (CHANNELS.every(channel => !rentalAlertChannelRetryable(channels[channel])))
    await RentalAlertOutboxModel.updateOne(
      { _id: outbox._id },
      { $set: { state: 'complete', completedAt: new Date() } }
    )
  return sent
}

async function processAlert(alertId: string, index: RentalAlertIndexResult, dryRun: boolean) {
  const run = async (guard: () => Promise<void> = async () => {}) => {
    const alert = await currentAlert(alertId)
    if (!alert?.active) return { candidates: 0, sent: 0 }
    if (!dryRun) {
      await RentalAlertOutboxModel.updateMany(
        { alertId, state: 'pending', revision: { $ne: alert.revision } },
        { $set: { state: 'cancelled', completedAt: new Date() } }
      )
      await RentalAlertModel.updateOne(
        { _id: alert._id, revision: alert.revision },
        { $set: { lastCheckedAt: new Date() } }
      )
    }
    const pending = (await RentalAlertOutboxModel.findOne({
      alertId,
      revision: alert.revision,
      state: 'pending',
    })
      .sort({ createdAt: 1 })
      .lean()) as RentalAlertOutboxDoc | null
    if (pending) {
      if (dryRun)
        return {
          candidates: (
            await matchRentalAlertCandidates(alert.kind, alert.filters, pending.candidateIds)
          ).length,
          sent: 0,
        }
      return {
        candidates: pending.candidateIds.length,
        sent: await deliverOutbox(alert, pending, index.state, guard),
      }
    }
    const recent = await RentalAlertOutboxModel.findOne({
      alertId,
      revision: alert.revision,
      state: { $ne: 'cancelled' },
    })
      .sort({ createdAt: -1 })
      .select({ createdAt: 1 })
      .lean()
    if (!rentalAlertDigestDue(alert, recent?.createdAt ?? null, Date.now()))
      return { candidates: 0, sent: 0 }
    const batch = await gather(alert, index, Date.now())
    if (dryRun) return { candidates: batch.candidates.length, sent: 0 }
    if (!batch.candidates.length) {
      await persistCursor(alert, batch.cursor, guard)
      return { candidates: 0, sent: 0 }
    }
    const key = createHash('sha256')
      .update(`${alertId}|${alert.revision}|${batch.cursor.at.toISOString()}|${batch.cursor.id}`)
      .digest('hex')
    const channel = (enabled: boolean): RentalAlertChannelState => ({
      status: enabled ? 'pending' : 'skipped',
      attempts: 0,
      nextAttemptAt: null,
      reason: null,
    })
    const outbox: RentalAlertOutboxDoc = {
      _id: key,
      alertId,
      uid: alert.uid,
      kind: alert.kind,
      revision: alert.revision,
      algorithm: index.state.algorithm,
      candidateIds: batch.candidates.map(candidate => candidate.id),
      cursorAt: batch.cursor.at,
      cursorId: batch.cursor.id,
      state: 'pending',
      channels: { email: channel(alert.channels.email), push: channel(alert.channels.push) },
      createdAt: new Date(),
      completedAt: null,
    }
    await guard()
    await RentalAlertOutboxModel.updateOne({ _id: key }, { $setOnInsert: outbox }, { upsert: true })
    await persistCursor(alert, batch.cursor, guard)
    return {
      candidates: batch.candidates.length,
      sent: await deliverOutbox(alert, outbox, index.state, guard),
    }
  }
  if (dryRun) return run()
  const alert = await RentalAlertModel.findById(alertId).select({ uid: 1 }).lean()
  return alert ? withRentalAlertLease(`uid:${alert.uid}`, run) : { candidates: 0, sent: 0 }
}

export async function runRentalAlerts(options: { dryRun?: boolean } = {}) {
  const dryRun = options.dryRun === true
  if (!dryRun && !rentalAlertDeliveryEnabled())
    return { skipped: 'delivery_disabled', checked: 0, candidates: 0, sent: 0 }
  await connectDb()
  const run = async () => {
    if (!dryRun) await cancelInactiveOutboxes()
    const kinds = (await RentalAlertModel.distinct('kind', { active: true })) as RentalAlertKind[]
    const indexes = new Map<RentalAlertKind, RentalAlertIndexResult>()
    const errors: string[] = []
    for (const kind of kinds)
      try {
        indexes.set(kind, await refreshRentalAlertIndex(kind, { dryRun }))
      } catch {
        errors.push(`index:${kind}`)
      }
    let after = ''
    const totals = { checked: 0, candidates: 0, sent: 0 }
    for (;;) {
      const alerts = await RentalAlertModel.find({
        active: true,
        ...(after ? { _id: { $gt: after } } : {}),
      })
        .select({ _id: 1, kind: 1 })
        .sort({ _id: 1 })
        .limit(100)
        .lean()
      for (const alert of alerts) {
        const index = indexes.get(alert.kind)
        if (!index) continue
        try {
          const result = await processAlert(String(alert._id), index, dryRun)
          totals.checked++
          totals.candidates += result.candidates
          totals.sent += result.sent
        } catch {
          errors.push(`alert:${String(alert._id)}`)
        }
      }
      if (alerts.length < 100) break
      after = String(alerts.at(-1)!._id)
    }
    return { dryRun, ...totals, errors }
  }
  return dryRun ? run() : withRentalAlertLease('runner', run)
}
