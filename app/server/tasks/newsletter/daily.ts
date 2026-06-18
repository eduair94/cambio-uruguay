// Nitro scheduled task: send the daily newsletter to confirmed subscribers.
// Registered in nuxt.config under `nitro.scheduledTasks`. Feature-gated by SMTP
// config; idempotent per day; DRY_RUN renders+logs instead of sending.
import mongoose, { Schema } from 'mongoose'
import { connectDb } from '../../utils/db'
import { NewsletterSubscriberModel } from '../../models/NewsletterSubscriber'
import { isMailerConfigured, sendMail } from '../../utils/mailer'
import {
  buildDailyEmail,
  buildDigestData,
  normalizeNewsletterLang,
  type DigestData,
  type NewsletterLang,
} from '../../utils/newsletter'

// Per-day run marker for dedup.
const runSchema = new Schema({ key: { type: String, unique: true }, at: { type: Date, default: () => new Date() } })
const NewsletterRun = mongoose.models.NewsletterRun || mongoose.model('NewsletterRun', runSchema)

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

export default defineTask({
  meta: {
    name: 'newsletter:daily',
    description: 'Send the daily dollar newsletter to confirmed subscribers',
  },
  async run() {
    if (!isMailerConfigured()) return { result: 'mailer-not-configured' }

    const cfg = useRuntimeConfig()
    const nl = (cfg.newsletter as { delayMs?: string | number }) ?? {}
    const dryRun = process.env.DRY_RUN === '1'
    const site = ((cfg.public as { siteUrl?: string }).siteUrl || 'https://cambio-uruguay.com').replace(/\/$/, '')
    const delayMs = Number(nl.delayMs) || 1000
    const today = new Date().toISOString().slice(0, 10)

    await connectDb()

    if (!dryRun) {
      const existing = await NewsletterRun.findOne({ key: today }).lean()
      if (existing) return { result: 'already-sent-today' }
    }

    const subs = await NewsletterSubscriberModel.find({ status: 'confirmed' }).lean()
    if (subs.length === 0) return { result: 'no-subscribers' }

    // Build one digest per language present among subscribers.
    const langs = new Set<NewsletterLang>(subs.map((s) => normalizeNewsletterLang(s.language)))
    const digestByLang = new Map<NewsletterLang, DigestData>()
    for (const lang of langs) digestByLang.set(lang, await buildDigestData(lang))

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

    if (!dryRun) await NewsletterRun.updateOne({ key: today }, { $set: { at: new Date() } }, { upsert: true })

    return { result: { sent, failed, total: subs.length } }
  },
})
