// Framework-agnostic helpers for SENDING a generated message to its recipient — distinct from
// `share.ts`, which promotes a page URL. Here the payload is a long body (a rental post, a customs
// claim, a consumer reclamo) that has to reach an authority inbox, a Facebook group, or WhatsApp.
//
// PURE module (no Vue/Nuxt runtime) so it is unit-tested in plain Node and reused by the
// `SendMessage.vue` component. Every builder returns a plain string URL; the component decides how
// to open it and whether to stage the body on the clipboard first.

/**
 * The delivery channels a generated message can be routed through. `link` is a generic
 * "open this URL" action (a Reddit submit page, a reclamo web form, a specific group) whose URL
 * the page supplies via `openUrl` — the component just opens it, optionally staging the body first.
 */
export type SendChannel =
  | 'email'
  | 'whatsapp'
  | 'telegram'
  | 'facebook'
  | 'link'
  | 'native'
  | 'copy'

/** Prefill a subreddit submit page with a title + self-text (best-effort; Reddit may trim length). */
export function redditSubmit(subreddit: string, title: string, text: string): string {
  return (
    `https://www.reddit.com/r/${encodeURIComponent(subreddit)}/submit` +
    `?title=${encodeURIComponent(title)}&text=${encodeURIComponent(text)}`
  )
}

/**
 * One routing option offered for a message. The page builds these (it owns the recipient logic);
 * the component renders and executes them.
 */
export interface SendAction {
  channel: SendChannel
  /** Button label, rioplatense Spanish. */
  label: string
  /** Email recipient. Empty string = the reader fills it in their mail client (seller/bank). */
  to?: string
  /** Email subject line. */
  subject?: string
  /**
   * Explicit URL to open for whatsapp/telegram/facebook (e.g. a specific Facebook group). When
   * omitted, the component builds a text-share URL from the message body.
   */
  openUrl?: string
  /**
   * Stage the full message body on the clipboard before opening the channel. Needed when the
   * channel cannot carry the body: a Facebook group post, or an email whose body exceeds the
   * mailto ceiling. The component shows a "texto copiado, pegalo" hint when this is set.
   */
  copyFirst?: boolean
  /** One-line helper shown under the action (e.g. why we copy first). */
  note?: string
  /** mdi icon name. */
  icon?: string
  /** Brand/semantic colour. */
  color?: string
}

/**
 * Practical ceiling for a mailto body, measured on the URL-ENCODED length — not raw characters.
 * `mailto:` is a URL; Windows (the ShellExecute path) and several webmail handlers truncate or
 * reject long ones (~2000 chars for the WHOLE URL is the commonly cited safe limit). Spanish text
 * with accents/newlines expands ~1.5-1.6x once `encodeURIComponent`'d (á → %C3%A1, \n → %0A), so a
 * raw-length check badly under-counts. We budget the ENCODED body under ~1800 to leave room for the
 * `mailto:` prefix + address + encoded subject and still land under ~2000. A longer body is dropped
 * from the URL and staged on the clipboard instead (see `copyFirst`).
 */
export const MAILTO_MAX_BODY = 1800

/**
 * Is the body too long to safely inline into a mailto: URL? Measured on the ENCODED length, since
 * that is what actually hits the OS/webmail URL-length limits. When true, the body must be pasted.
 */
export function bodyTooLongForMailto(body: string): boolean {
  return encodeURIComponent(body ?? '').length > MAILTO_MAX_BODY
}

/**
 * Build a `mailto:` URL. The address is left raw (it is already a valid email; encoding the `@`
 * to %40 is accepted but ugly). The body is inlined only when it fits under {@link MAILTO_MAX_BODY};
 * past that it is dropped from the URL and the caller is expected to have staged it on the clipboard.
 */
export function encodeMailto(opts: {
  to?: string
  subject?: string
  body?: string
  cc?: string
}): string {
  const params: string[] = []
  if (opts.subject) params.push(`subject=${encodeURIComponent(opts.subject)}`)
  if (opts.cc) params.push(`cc=${encodeURIComponent(opts.cc)}`)
  if (opts.body && !bodyTooLongForMailto(opts.body))
    params.push(`body=${encodeURIComponent(opts.body)}`)
  const query = params.length ? `?${params.join('&')}` : ''
  return `mailto:${(opts.to ?? '').trim()}${query}`
}

/** WhatsApp: text-only message (no separate URL field in wa.me). */
export function whatsappShare(text: string): string {
  return `https://wa.me/?text=${encodeURIComponent(text)}`
}

/**
 * Telegram share. t.me/share/url wants a `url`; for a plain message we pass an optional page URL
 * plus the text. Telegram shows the text and lets the user pick a chat.
 */
export function telegramShare(text: string, url = ''): string {
  return `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`
}

/**
 * Facebook sharer for a PAGE URL. Note Facebook does NOT let a URL pre-fill a group post — to post
 * a generated message into a group you copy the text and open the group (see `copyFirst` + `openUrl`).
 */
export function facebookShare(url: string): string {
  return `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`
}
