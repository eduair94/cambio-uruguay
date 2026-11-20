// The admin's Telegram notice for a rental answer that carries a comment. One module for the
// answer (POST /api/rental-feedback) and its follow-up (PATCH /api/rental-feedback/:id): a one-tap
// answer has no comment, so for the micro-survey the notice is sent when the follow-up brings one.
// The hourly cap is shared by both routes, so a burst cannot flood the admin chat.
import {
  FOUND_OPTIONS,
  MISSING_REASONS,
  optionLabel,
  type RentalFeedbackRecord,
} from '../../utils/rentalFeedback'
import { carContactRateOk } from './carContacts'
import { escapeTelegramMarkdown, sendTelegram } from './telegram'

const notices = new Map<string, { count: number; resetAt: number }>()

type NoticeRow = Pick<
  RentalFeedbackRecord,
  'kind' | 'surface' | 'zone' | 'propertyKey' | 'found'
> & {
  comment?: string | null
  reasons?: readonly string[] | null
}

export function noticeRentalFeedback(row: NoticeRow): void {
  const chatId = String(useRuntimeConfig().telegram?.adminChatId || '')
  if (!row.comment || !chatId || !carContactRateOk(notices, 'admin', 10, 3_600_000)) return
  const where = [row.surface, row.zone, row.propertyKey].filter(Boolean).join(' · ')
  const found = row.found ? ` · ${optionLabel(FOUND_OPTIONS, row.found)}` : ''
  const reasons = (row.reasons ?? []).map(reason => optionLabel(MISSING_REASONS, reason))
  const missing = reasons.length ? `\nFaltó: ${reasons.join(', ')}` : ''
  void sendTelegram(
    chatId,
    escapeTelegramMarkdown(
      `Opinión de alquileres (${row.kind}${found}) — ${where}${missing}\n\n${row.comment}`
    )
  )
}
