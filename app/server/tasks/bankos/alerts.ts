// Daily "new discount" push for /descuentos-con-tarjeta-uruguay subscribers.
//
// Reads the same cached catalog the page uses (live first, backend snapshot as fallback), diffs it
// against the ledger of discounts already announced, and pushes ONLY to users who opted in and who
// actually carry a card of the issuer that moved. Every decision is in utils/bankosAlerts (tested);
// this file is the wiring.
//
// Two safety rules that matter more than the feature:
//   1. FIRST RUN SEEDS, NEVER NOTIFIES. Without this the first execution would treat all ~1.8k
//      discounts as new and blast every subscriber.
//   2. ONE RUN PER DAY, CLUSTER-WIDE. The app is pm2 cluster x2, so this task fires twice; the
//      day claim below ($setOnInsert on a unique key) lets exactly one instance proceed.
import { connectDb } from '../../utils/db'
import { getRawCatalog } from '../../utils/bankos'
import { BankosAlertStateModel } from '../../models/BankosAlertState'
import { BankosUserCardsModel } from '../../models/BankosUserCards'
import { UserModel } from '../../models/User'
import { sendPush } from '../../utils/push'
import { BANKOS_BANK_BY_ID, bankIdsForCards } from '../../../utils/bankos'
import {
  currentPairs,
  groupByBank,
  newPairs,
  notificationFor,
  trimSeen,
} from '../../../utils/bankosAlerts'

const LEDGER_KEY = 'latest'

export default defineTask({
  meta: {
    name: 'bankos:alerts',
    description: 'Push new card discounts to subscribers (Bankos catalog diff)',
  },
  async run() {
    await connectDb()

    // --- 1. Claim the day (pm2 cluster x2 fires this twice) ------------------
    const today = new Date().toISOString().slice(0, 10)
    const claim = await BankosAlertStateModel.updateOne(
      { key: `run:${today}` },
      { $setOnInsert: { key: `run:${today}`, at: new Date(), pairs: [] } },
      { upsert: true }
    )
    if (!claim.upsertedCount) {
      return { result: 'skipped: another instance already ran today' }
    }

    // --- 2. What the catalog says now ---------------------------------------
    const { catalog } = await getRawCatalog()
    const pairs = currentPairs(
      (catalog.data?.bankBrands ?? {}) as Record<string, Record<string, unknown>>
    )
    if (!pairs.length) return { result: 'skipped: empty catalog' }

    const ledger = await BankosAlertStateModel.findOne({ key: LEDGER_KEY }).lean().exec()

    // --- 3. First run seeds the ledger and tells nobody ----------------------
    if (!ledger) {
      await BankosAlertStateModel.updateOne(
        { key: LEDGER_KEY },
        { $set: { key: LEDGER_KEY, pairs: trimSeen(pairs), at: new Date() } },
        { upsert: true }
      )
      return { result: `seeded ${pairs.length} discounts, no notifications sent` }
    }

    const fresh = newPairs(pairs, ledger.pairs ?? [])
    if (!fresh.length) return { result: 'no new discounts' }

    // Record BEFORE sending: a crash mid-send must not re-announce tomorrow.
    await BankosAlertStateModel.updateOne(
      { key: LEDGER_KEY },
      { $set: { pairs: trimSeen([...(ledger.pairs ?? []), ...fresh]), at: new Date() } }
    )

    // --- 4. Who wants to hear about it --------------------------------------
    const news = groupByBank(fresh)
    const brands = catalog.data?.brands ?? {}
    const brandName = (id: string) => brands[id]?.name ?? id
    const bankName = (id: string) => BANKOS_BANK_BY_ID[id]?.name ?? id

    const subscribers = await BankosUserCardsModel.find({ notify: true }).lean().exec()
    let sent = 0
    for (const sub of subscribers) {
      const message = notificationFor(news, bankIdsForCards(sub.cards ?? []), bankName, brandName)
      if (!message) continue
      const user = await UserModel.findById(sub.uid).lean().exec()
      const tokens = user?.fcmTokens ?? []
      if (!tokens.length) continue
      const invalid = await sendPush(tokens, message.title, message.body)
      if (invalid.length) {
        await UserModel.updateOne({ _id: sub.uid }, { $pull: { fcmTokens: { $in: invalid } } })
      }
      sent++
    }

    return { result: `${fresh.length} new discounts, notified ${sent}/${subscribers.length}` }
  },
})
