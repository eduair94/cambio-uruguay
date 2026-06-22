// Server-only client for the OpenAI-compatible wormgpt endpoint, used by the
// daily blog generator. Calls the chat-completions API directly with the
// configured (latest) model and sanitizes the provider's known output quirks
// (<think> blocks, "WormGPT:" prefix, LaTeX math, odd currency glyphs) before
// returning, mirroring the backend AIService.sanitizeContent.
//
// Configuration comes from runtimeConfig.ai (baseUrl, apiKey, model). When no
// apiKey is set in this app's environment the caller should fall back to the
// backend /ai/insights endpoint.

interface ChatOptions {
  system: string
  user: string
  maxTokens?: number
  temperature?: number
}

interface ChatResult {
  content: string
  model: string
}

/** Convert a LaTeX snippet into readable plain text. */
function deLatex(expr: string): string {
  return expr
    .replace(/\\(?:text|mathrm|mathbf|boxed|operatorname)\s*\{([^}]*)\}/g, '$1')
    .replace(/\\frac\s*\{([^}]*)\}\s*\{([^}]*)\}/g, '($1)/($2)')
    .replace(/\\left|\\right/g, '')
    .replace(/\\times/g, '×')
    .replace(/\\div/g, '÷')
    .replace(/\\cdot/g, '·')
    .replace(/\\approx/g, '≈')
    .replace(/\\pm/g, '±')
    .replace(/\\(?:leq|le)\b/g, '≤')
    .replace(/\\(?:geq|ge)\b/g, '≥')
    .replace(/\\neq/g, '≠')
    .replace(/\\%/g, '%')
    .replace(/\\\$/g, '$')
    .replace(/\\([#&_{}])/g, '$1')
    .replace(/\\(?:quad|qquad)/g, ' ')
    .replace(/\\[,;:!]/g, ' ')
    .replace(/\\\\/g, ' ')
    .replace(/[{}]/g, '')
    .replace(/[ \t]{2,}/g, ' ')
    .trim()
}

/** Clean a raw model response (think blocks, prefixes, LaTeX, odd glyphs). */
export function sanitizeAi(content: string): string {
  if (!content) return ''
  let s = content
  s = s.replace(/<think>[\s\S]*?<\/think>/gi, '')
  s = s.replace(/<\/?think>/gi, '')
  s = s.replace(/^\s*(?:\*+\s*)?\w*GPT\s*:\s*/i, '')
  s = s.replace(/^\s*(?:\*+\s*)?\w*GPT\s*:.*$/gim, '')
  // Display + inline math
  s = s.replace(/\$\$([\s\S]*?)\$\$/g, (_m, inner) => ' ' + deLatex(inner) + ' ')
  s = s.replace(/\\\[([\s\S]*?)\\\]/g, (_m, inner) => ' ' + deLatex(inner) + ' ')
  s = s.replace(/\\\(([\s\S]*?)\\\)/g, (_m, inner) => deLatex(inner))
  // Stray tokens outside delimiters
  s = s
    .replace(/\\(?:text|mathrm|mathbf|boxed|operatorname)\s*\{([^}]*)\}/g, '$1')
    .replace(/\\times/g, '×')
    .replace(/\\%/g, '%')
    .replace(/\\\$/g, '$')
    .replace(/\\([#&_])/g, '$1')
    .replace(/\\[,;:!]/g, ' ')
  // Odd currency glyphs
  s = s.replace(/[＄﹩]/g, '$')
  s = s.replace(/[₵¢](?=\s*[\d.,])/g, '$')
  s = s.replace(/�/g, '')
  s = s
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/ +\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
  return s.trim()
}

/** True when the app has direct AI credentials configured. */
export function aiConfigured(): boolean {
  const cfg = useRuntimeConfig().ai as { apiKey?: string } | undefined
  return Boolean(cfg?.apiKey)
}

/**
 * Low-level call to the configured wormgpt chat-completions endpoint. Returns the
 * sanitized content (no minimum-length guard) + the model used, or null on
 * failure / when not configured. Use this for short structured answers; use
 * {@link generateChat} for prose (it additionally rejects too-short replies).
 */
export async function chatCompletion(opts: ChatOptions): Promise<ChatResult | null> {
  const cfg = useRuntimeConfig().ai as
    | { baseUrl?: string; apiKey?: string; model?: string }
    | undefined
  if (!cfg?.apiKey || !cfg.baseUrl) return null

  const model = cfg.model || 'wormv5.1'
  try {
    const res = await $fetch<{
      choices?: Array<{ message?: { content?: string } }>
    }>(`${cfg.baseUrl.replace(/\/$/, '')}/chat/completions`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${cfg.apiKey}`, 'Content-Type': 'application/json' },
      body: {
        model,
        messages: [
          { role: 'system', content: opts.system },
          { role: 'user', content: opts.user },
        ],
        max_tokens: opts.maxTokens ?? 4096,
        temperature: opts.temperature ?? 0.7,
        stream: false,
      },
      timeout: 70000,
    })
    const content = sanitizeAi(res?.choices?.[0]?.message?.content || '').trim()
    return content ? { content, model } : null
  } catch {
    return null
  }
}

/**
 * Call the configured wormgpt chat-completions endpoint with the latest model.
 * Returns the sanitized content + the model used, or null on failure / when not
 * configured / when the reply is too short to be a real article (the caller can
 * fall back to the backend).
 */
export async function generateChat(opts: ChatOptions): Promise<ChatResult | null> {
  const res = await chatCompletion(opts)
  if (!res || res.content.length < 40) return null
  return res
}
