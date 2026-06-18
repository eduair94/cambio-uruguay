import { connectDb } from '../../utils/db'
import { UserModel } from '../../models/User'
import { FavoriteModel } from '../../models/Favorite'
import { fetchCurrentRates } from '../../utils/rates'
import { sendTelegram } from '../../utils/telegram'
import { buildSummary } from '../../utils/telegramSummary'

export default defineTask({
  meta: {
    name: 'telegram:summary',
    description: 'Daily personalized Telegram summary for linked users',
  },
  async run() {
    await connectDb()
    const users = await UserModel.find({ telegramChatId: { $ne: null } })
      .lean()
      .exec()
    if (!users.length) return { result: { sent: 0 } }
    const rates = await fetchCurrentRates().catch(() => [])
    let sent = 0
    for (const u of users as any[]) {
      const favs = await FavoriteModel.find({ uid: u._id }).lean().exec()
      const ok = await sendTelegram(u.telegramChatId, buildSummary(favs as any, rates))
      if (ok) sent++
    }
    return { result: { sent } }
  },
})
