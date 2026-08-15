// Nitro scheduled task: archive the day's issue, then send it to confirmed
// subscribers. Registered in nuxt.config under `nitro.scheduledTasks`.
//
// Two stages, deliberately independent:
//   1. ARCHIVE — always runs. Builds the Spanish digest and persists it as a
//      permanent public page (`/newsletter/<fecha>`). This used to be coupled to
//      the send, which meant an unset SMTP credential silently cost the site a
//      page a day; the archive is the durable asset and must not depend on
//      whether email happens to be configured.
//   2. SEND — gated on SMTP config, and on winning the per-day claim below.
import mongoose, { Schema } from 'mongoose'
import { connectDb } from '../../utils/db'
import { NewsletterSubscriberModel } from '../../models/NewsletterSubscriber'
import { isMailerConfigured, sendMail } from '../../utils/mailer'
import {
  buildDailyEmail,
  buildDailyTelegram,
  buildDigestData,
  normalizeNewsletterLang,
  type DigestData,
  type NewsletterLang,
} from '../../utils/newsletter'
import { ensureIssue, issueToDigest } from '../../utils/newsletterArchive'
import { montevideoToday } from '../../../utils/newsletterIssue'
import { UserModel } from '../../models/User'
import { sendTelegram } from '../../utils/telegram'

// Per-day run marker for dedup.
const runSchema = new Schema({
  key: { type: String, unique: true },
  at: { type: Date, default: () => new Date() },
})
const NewsletterRun = mongoose.models.NewsletterRun || mongoose.model('NewsletterRun', runSchema)

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms))

export default defineTask({
  meta: {
    name: 'newsletter:daily',
    description: 'Archive the daily dollar issue and send it to confirmed subscribers',
  },
  async run() {
    const cfg = useRuntimeConfig()
    const nl = (cfg.newsletter as { delayMs?: string | number }) ?? {}
    const dryRun = process.env.DRY_RUN === '1'
    const site = (
      (cfg.public as { siteUrl?: string }).siteUrl || 'https://cambio-uruguay.com'
    ).replace(/\/$/, '')
    const delayMs = Number(nl.delayMs) || 1000
    // Montevideo, not UTC: the issue's URL is a Uruguayan calendar date, and the
    // send-claim key has to agree with it or a run either side of midnight UTC
    // would claim a different day than the page it is mailing.
    const today = montevideoToday()

    // ---- Stage 1: archive (unconditional) ---------------------------------
    const issue = await ensureIssue(today)

    // Email and Telegram are separate channels with separate credentials, and
    // only the mail one is gated here. Telegram needs a bot token and no SMTP
    // at all, so an unset SMTP_HOST used to silently cancel the Telegram digest
    // too — a delivery nobody had configured anything wrong for.
    const canEmail = isMailerConfigured()
    const canTelegram = Boolean((cfg.telegram as { token?: string } | undefined)?.token)
    if (!canEmail && !canTelegram) {
      return { result: { archived: Boolean(issue), send: 'no-delivery-channel-configured' } }
    }

    await connectDb()

    // ---- Stage 2: claim the day, atomically -------------------------------
    // pm2 runs this app as `cluster` with 2 instances (app/ecosystem.config.cjs)
    // and each instance owns its own Nitro scheduler, so BOTH fire this task in
    // the same second. The previous read-then-write guard (findOne here, upsert
    // after the send loop) left the entire run — subscriber fetch, digest build,
    // every SMTP round-trip — inside the race window, so both instances passed
    // the check and every subscriber got the mail twice.
    //
    // `$setOnInsert` + `upsert` on the unique `key` index makes the claim a
    // single atomic operation: exactly one instance sees `upsertedCount === 1`
    // and sends. Claiming BEFORE sending (rather than marking after) is the
    // deliberate trade — a crash mid-send now means that day is not retried,
    // which is strictly better than mailing everyone twice a day, every day.
    if (!dryRun) {
      const claim = await NewsletterRun.updateOne(
        { key: today },
        { $setOnInsert: { key: today, at: new Date() } },
        { upsert: true }
      )
      const won = claim.upsertedCount === 1
      if (!won) return { result: { archived: Boolean(issue), send: 'already-sent-today' } }
    }

    const subs = canEmail
      ? await NewsletterSubscriberModel.find({ status: 'confirmed' }).lean()
      : []

    // Build one digest per language present among subscribers. Spanish is
    // seeded from the issue the archive stage just built, so the common case
    // spends no second round of rates + AI + feeds.
    const langs = new Set<NewsletterLang>(subs.map(s => normalizeNewsletterLang(s.language)))
    const digestByLang = new Map<NewsletterLang, DigestData>()
    if (issue) digestByLang.set('es', issueToDigest(issue))
    for (const lang of langs) {
      if (digestByLang.has(lang)) continue
      digestByLang.set(lang, await buildDigestData(lang))
    }

    let sent = 0
    let failed = 0
    for (const sub of subs) {
      const lang = normalizeNewsletterLang(sub.language)
      const data = digestByLang.get(lang)!
      const unsubUrl = `${site}/api/newsletter/unsubscribe?token=${sub.unsubToken}`
      const email = buildDailyEmail(data, lang, unsubUrl)
      if (dryRun) {
        console.log(`[DRY_RUN newsletter] -> ${sub.email} (${lang}) :: ${email.subject}`)
        sent++
        continue
      }
      try {
        await sendMail({
          to: sub.email,
          subject: email.subject,
          html: email.html,
          text: email.text,
          listUnsubscribeUrl: unsubUrl,
        })
        sent++
      } catch (err) {
        failed++
        console.error(`newsletter send to ${sub.email} failed:`, err)
      }
      if (delayMs > 0) await sleep(delayMs)
    }

    // Telegram delivery for linked users who opted in. Reuses the per-language
    // digest; builds lazily for any language not already among email subscribers.
    let telegramSent = 0
    const tgUsers = canTelegram
      ? ((await UserModel.find({
          'newsletter.telegram': true,
          telegramChatId: { $ne: null },
        })
          .lean()
          .exec()) as any[])
      : []
    for (const tu of tgUsers) {
      const lang = normalizeNewsletterLang(tu.settings?.locale)
      let digest = digestByLang.get(lang)
      if (!digest) {
        digest = await buildDigestData(lang)
        digestByLang.set(lang, digest)
      }
      const msg = buildDailyTelegram(digest, lang)
      if (dryRun) {
        console.log(`[DRY_RUN newsletter tg] -> ${tu.telegramChatId}: ${msg.slice(0, 60)}…`)
        telegramSent++
        continue
      }
      const ok = await sendTelegram(tu.telegramChatId, msg)
      if (ok) telegramSent++
      if (delayMs > 0) await sleep(delayMs)
    }

    // No marker write here — the day was already claimed atomically above.
    return {
      result: { archived: Boolean(issue), sent, failed, total: subs.length, telegramSent },
    }
  },
})
