/** Send a Telegram message via the Bot API. Returns false if unconfigured or failed. */
export async function sendTelegram(
  chatId: string,
  text: string,
  fetchImpl: typeof fetch = fetch
): Promise<boolean> {
  const token = useRuntimeConfig().telegram?.token
  if (!token || !chatId) return false
  try {
    const res = await fetchImpl(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: 'Markdown',
        link_preview_options: { is_disabled: true },
      }),
    })
    const data: any = await res.json().catch(() => ({}))
    return Boolean(data?.ok)
  } catch {
    return false
  }
}

/**
 * Escapa lo que el Markdown (legacy) de Telegram interpreta. Sin esto, un identificador de casa como
 * `la_favorita` abre una cursiva que nunca cierra y Telegram rechaza el mensaje entero en silencio.
 */
export function escapeTelegramMarkdown(text: string): string {
  return text.replace(/[_*`[]/g, c => `\\${c}`)
}
