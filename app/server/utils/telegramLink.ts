const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567' // base32, no 0/1/8/9

/** Short, URL/Telegram-safe single-use link code. */
export function makeLinkCode(len = 8): string {
  let out = ''
  const bytes =
    typeof crypto !== 'undefined' && crypto.getRandomValues
      ? crypto.getRandomValues(new Uint8Array(len))
      : Array.from({ length: len }, () => Math.floor(Math.random() * 256))
  for (let i = 0; i < len; i++) out += ALPHABET[bytes[i]! % ALPHABET.length]
  return out
}
