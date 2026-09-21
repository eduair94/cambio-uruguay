// Model text → safe HTML for the /asistente-ia chat, with marked alone: raw HTML and images are
// dropped, links survive only as http(s) and open in a new tab, headings shrink to h3/h4. No DOM
// is needed (DOMPurify on the server would pull jsdom into the bundle for a client-only chat).
import { Marked, type Tokens } from 'marked'

const escapeAttr = (value: string) =>
  value.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

const chatMarked = new Marked({
  gfm: true,
  breaks: true,
  async: false,
  renderer: {
    html() {
      return ''
    },
    image() {
      return ''
    },
    link(
      this: { parser: { parseInline(tokens: Tokens.Generic[]): string } },
      { href, tokens }: Tokens.Link
    ) {
      const text = this.parser.parseInline(tokens)
      if (!/^https?:\/\//i.test(href)) return text
      return `<a href="${escapeAttr(href)}" target="_blank" rel="noopener noreferrer nofollow">${text}</a>`
    },
    heading(
      this: { parser: { parseInline(tokens: Tokens.Generic[]): string } },
      { tokens, depth }: Tokens.Heading
    ) {
      const level = Math.max(3, Math.min(4, depth))
      return `<h${level}>${this.parser.parseInline(tokens)}</h${level}>`
    },
  },
})

export function renderChatMarkdown(text: string): string {
  return chatMarked.parse(text) as string
}
