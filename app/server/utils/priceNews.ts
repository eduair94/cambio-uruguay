import { connectDb } from './db'
import { fetchNews } from './news'
import { montevideoToday } from '../../utils/blog'
import { PriceNewsModel } from '../models/PriceNews'

/**
 * Snapshot today's Uruguay dollar/economy headlines into PriceNews so past days
 * stay explainable (the RSS feed itself keeps no history). Idempotent per day.
 */
export async function archiveTodayNews(currency = 'USD'): Promise<{ date: string; count: number }> {
  await connectDb()
  const date = montevideoToday()
  const items = await fetchNews(12)
  const headlines = items.map(n => ({
    title: n.title,
    source: n.source,
    link: n.link,
    pubDate: n.pubDate,
  }))
  await PriceNewsModel.updateOne(
    { date, currency },
    { $set: { headlines } },
    { upsert: true }
  )
  return { date, count: headlines.length }
}
