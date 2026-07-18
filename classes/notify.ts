// Admin Telegram ping for backend sync jobs. Mirrors app/server/utils/telegram.ts, but reads the
// creds straight off the root process env (the backend has no Nuxt runtimeConfig). Degrades
// gracefully: no creds, or any network/API error, returns false and NEVER throws — a sync job must
// never fail because an alert could not be delivered. Unconfigured is logged, not silent, so a
// missing TELEGRAM_* on the VPS is visible in pm2 logs rather than mistaken for "nothing happened".
export async function notifyAdmin(text: string, fetchImpl: typeof fetch = fetch): Promise<boolean> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_ADMIN_CHAT_ID;
  if (!token || !chatId) {
    console.warn("[notify] no TELEGRAM_BOT_TOKEN / TELEGRAM_ADMIN_CHAT_ID — admin ping skipped");
    return false;
  }
  try {
    const res = await fetchImpl(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: "Markdown",
        link_preview_options: { is_disabled: true },
      }),
    });
    const data: any = await (res as any).json().catch(() => ({}));
    return Boolean(data?.ok);
  } catch (e) {
    console.warn("[notify] telegram send failed:", e);
    return false;
  }
}
