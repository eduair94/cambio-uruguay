/**
 * Redacts what must never reach Sentry from free text: credentials and the personal data the
 * jobs handle. Every log line, breadcrumb and exception message the backend sends passes here.
 *
 * Why a scrubber and not "just don't log secrets": the jobs log axios errors, proxy URLs and
 * request URLs, and an axios error carries the request's headers and query (the API key of
 * GA4, Gemini or a scraper bridge). `proxy.txt` entries are `http://user:pass@host:port`.
 * Rentals and cars handle phone numbers and e-mails of advertisers, and the API sees visitor
 * IPs. Redacting the shape is cheaper and safer than auditing ~85 entrypoints.
 *
 * Precision over recall is the WRONG trade here: a redacted price in a log costs nothing, a
 * leaked key costs a rotation. Each rule below errs on the side of redacting.
 */

const RULES: Array<[RegExp, string]> = [
  // Credentials inside a URL: scheme://user:password@host (proxies, Mongo, Redis).
  [/\b([a-z][a-z\d+.-]*:\/\/)[^\s/@:'"]+:[^\s/@'"]*@/gi, "$1[redacted]@"],
  // Secret-looking query parameters, whatever the host.
  [
    /([?&;](?:key|api[_-]?key|apikey|token|access[_-]?token|refresh[_-]?token|id[_-]?token|auth|authorization|secret|client[_-]?secret|password|passwd|pass|pwd|signature|sig|session|sessionid|sentry_key|x-api-key)=)[^&\s"'#]+/gi,
    "$1[redacted]",
  ],
  // Authorization header values.
  [/\b(Bearer|Basic|Token|DSN)\s+[\w.~+/=-]{8,}/g, "$1 [redacted]"],
  // `password: "…"`, `"token":"…"`, `apiKey=…` inside a serialized object or a message.
  [
    /\b((?:password|passwd|secret|token|api[_-]?key|apikey|access[_-]?token|client[_-]?secret|authorization|cookie|set-cookie|x-api-key|private[_-]?key)["']?\s*[:=]\s*["']?)[^\s"',;}&]+/gi,
    "$1[redacted]",
  ],
  // Provider key formats that travel without a label.
  [/\bbot\d{6,}:[\w-]{30,}/g, "bot[redacted]"], // Telegram bot token
  [/\bsk-(?:ant-)?[\w-]{20,}/g, "sk-[redacted]"], // Anthropic / OpenAI
  [/\bAIza[\w-]{30,}/g, "AIza[redacted]"], // Google API key
  [/\b(?:ghp|gho|ghs|ghu|github_pat)_[\w]{20,}/g, "gh_[redacted]"], // GitHub
  [/\bxox[abposr]-[\w-]{10,}/g, "xox-[redacted]"], // Slack
  [/\beyJ[\w-]{10,}\.[\w-]{10,}\.[\w-]{10,}/g, "[jwt]"], // JWT
  // A long opaque token (hex digests, random keys): letters AND digits, no word separators,
  // 32+ chars. A URL slug has hyphens and survives; a Mongo ObjectId is 24 and survives.
  [/\b(?=[A-Za-z_]*\d)(?=\d*[A-Za-z_])[A-Za-z\d_]{32,}\b/g, "[token]"],
  // E-mail addresses (advertisers, newsletter readers).
  [/[\w.+-]+@[\w-]+(?:\.[\w-]+)+/g, "[email]"],
  // Uruguayan mobile numbers, with or without +598 and separators (09X XXX XXX).
  [/(?<![\d])(?:\+?598[\s.-]?)?0?9\d(?:[\s.-]?\d){6}(?![\d])/g, "[phone]"],
  // IPv4 (visitors on the API; proxies in the jobs).
  [/(?<![\d.])(?:25[0-5]|2[0-4]\d|1?\d?\d)(?:\.(?:25[0-5]|2[0-4]\d|1?\d?\d)){3}(?![\d.])/g, "[ip]"],
];

export function scrubText(input: unknown, maxLength = 2000): string {
  let text = typeof input === "string" ? input : String(input ?? "");
  if (text.length > maxLength * 2) text = text.slice(0, maxLength * 2);
  for (const [pattern, replacement] of RULES) text = text.replace(pattern, replacement);
  return text.length > maxLength ? `${text.slice(0, maxLength)}…` : text;
}

/**
 * Scrubs every string inside a JSON-like value (depth-limited). Anything that is not a plain
 * string, number, boolean, array or object becomes its scrubbed string form.
 */
export function scrubValue(value: unknown, depth = 0): unknown {
  if (value === null || value === undefined) return value;
  if (typeof value === "string") return scrubText(value);
  if (typeof value === "number" || typeof value === "boolean") return value;
  if (depth >= 4) return "[depth]";
  if (Array.isArray(value)) return value.slice(0, 50).map((item) => scrubValue(item, depth + 1));
  if (typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [key, item] of Object.entries(value as Record<string, unknown>).slice(0, 50)) {
      out[key] = /^(?:authorization|cookie|set-cookie|password|secret|token|api[_-]?key|x-api-key)$/i.test(key)
        ? "[redacted]"
        : scrubValue(item, depth + 1);
    }
    return out;
  }
  return scrubText(String(value));
}
