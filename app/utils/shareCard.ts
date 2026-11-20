/** Draw only explicitly shared public text. No page screenshot, external image or private state. */
export interface ShareCardContent {
  title: string
  description: string
  url: string
  footer: string
}

export function wrapCardText(
  text: string,
  measure: (text: string) => number,
  width: number,
  maxLines: number
): string[] {
  const words = text.replace(/\s+/g, ' ').trim().split(' ')
  const lines: string[] = []
  let line = ''
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word
    if (measure(candidate) <= width) {
      line = candidate
    } else {
      if (line) lines.push(line)
      line = word
      // Long unbroken titles must fit too, without making the card's type smaller.
      while (measure(line) > width && line.length > 1) {
        let count = line.length - 1
        while (count > 1 && measure(line.slice(0, count)) > width) count--
        lines.push(line.slice(0, count))
        line = line.slice(count)
      }
    }
  }
  if (line) lines.push(line)
  if (lines.length <= maxLines) return lines
  const clipped = lines.slice(0, maxLines)
  let last = clipped[maxLines - 1] || ''
  while (last && measure(`${last}…`) > width) last = last.slice(0, -1)
  clipped[maxLines - 1] = `${last}…`
  return clipped
}

export async function renderShareCard(content: ShareCardContent): Promise<Blob> {
  const canvas = document.createElement('canvas')
  canvas.width = 1200
  canvas.height = 630
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas unavailable')

  // Uses the brand's permanent navy + white treatment, independently of the reader's theme.
  ctx.fillStyle = '#121a2e'
  ctx.fillRect(0, 0, 1200, 630)
  ctx.fillStyle = '#64b5f6'
  ctx.fillRect(56, 58, 44, 6)
  ctx.font = '700 24px sans-serif'
  ctx.fillText('CAMBIO URUGUAY', 116, 70)
  ctx.fillStyle = '#ffffff'
  ctx.font = '700 54px sans-serif'
  const title = wrapCardText(content.title, text => ctx.measureText(text).width, 1088, 3)
  title.forEach((line, i) => ctx.fillText(line, 56, 160 + i * 64))
  ctx.font = '28px sans-serif'
  ctx.fillStyle = '#d5dfef'
  const description = wrapCardText(
    content.description,
    text => ctx.measureText(text).width,
    1088,
    3
  )
  description.forEach((line, i) => ctx.fillText(line, 56, 365 + i * 37))
  ctx.fillStyle = '#64b5f6'
  ctx.font = '700 28px sans-serif'
  const url = content.url.replace(/^https?:\/\//, '')
  wrapCardText(url, text => ctx.measureText(text).width, 1088, 1).forEach(line =>
    ctx.fillText(line, 56, 536)
  )
  ctx.fillStyle = '#d5dfef'
  ctx.font = '22px sans-serif'
  wrapCardText(content.footer, text => ctx.measureText(text).width, 1088, 1).forEach(line =>
    ctx.fillText(line, 56, 587)
  )
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      blob => (blob ? resolve(blob) : reject(new Error('PNG unavailable'))),
      'image/png'
    )
  })
}
