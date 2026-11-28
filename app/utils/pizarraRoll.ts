// The one authored motion of the site (DESIGN.md → Motion, "La pizarra"): when today's rate lands
// on the home, its digits roll into place like the board of an exchange house, right to left.
//
// The element keeps its text node untouched, so what Vue renders, what a screen reader reads and
// what a visitor copies is always the real figure. The roll is a decoration laid OVER that text for
// under a second: an aria-hidden overlay with one column per character, while the text underneath
// is painted transparent. When the overlay ends (or Vue replaces the text meanwhile) it removes
// itself and the text paints again. Reduced motion: nothing happens.
import { animate } from 'motion/mini'

import { EASE_ARRIVE, MOTION_DURATION, motionReduced } from './motionPresets'

const DIGITS = '0123456789'
const COLUMN_STEP = 0.045 // s between columns, from the rightmost digit leftwards

/** The characters a column would show, top to bottom, ending on `digit`. Pure, for tests. */
export function pizarraStrip(digit: number, turns = 1): string[] {
  const out: string[] = []
  const total = turns * 10 + digit
  for (let i = 0; i <= total; i++) out.push(DIGITS[i % 10]!)
  return out
}

export function rollPizarra(el: HTMLElement | null | undefined): void {
  if (!el || motionReduced() || el.dataset.pizarra === 'rolling') return
  // What the browser paints: template whitespace collapsed, ends trimmed.
  const text = (el.textContent ?? '').replace(/\s+/g, ' ').trim()
  if (!/\d/.test(text)) return

  // The overlay copies the host's ink and line box exactly, so the last frame of the roll and the
  // real text underneath are the same pixels (the host sets tabular figures, so a digit column is
  // as wide as the digit it covers).
  const style = getComputedStyle(el)
  const fontSize = parseFloat(style.fontSize) || 16
  const lineHeight = parseFloat(style.lineHeight) || fontSize * 1.2

  el.dataset.pizarra = 'rolling'
  const overlay = document.createElement('span')
  overlay.className = 'pizarra-roll'
  overlay.setAttribute('aria-hidden', 'true')
  overlay.style.color = style.color
  overlay.style.lineHeight = `${lineHeight}px`
  overlay.style.justifyContent =
    style.textAlign === 'center'
      ? 'center'
      : style.textAlign === 'right' || style.textAlign === 'end'
        ? 'flex-end'
        : 'flex-start'

  const strips: HTMLElement[] = []
  for (const ch of text) {
    const cell = document.createElement('span')
    cell.className = 'pizarra-roll__cell'
    cell.style.height = `${lineHeight}px`
    if (DIGITS.includes(ch)) {
      const strip = document.createElement('span')
      strip.className = 'pizarra-roll__strip'
      // Every column turns at least once; the digit decides where it stops.
      strip.textContent = pizarraStrip(Number(ch)).join('\n')
      cell.appendChild(strip)
      strips.push(strip)
    } else {
      cell.textContent = ch
    }
    overlay.appendChild(cell)
  }

  el.classList.add('pizarra-host')
  el.appendChild(overlay)

  const finish = () => {
    overlay.remove()
    el.classList.remove('pizarra-host')
    delete el.dataset.pizarra
  }

  const n = strips.length
  const runs = strips.map((strip, i) => {
    const rows = strip.textContent!.split('\n').length
    return animate(
      strip,
      { transform: ['translateY(0px)', `translateY(${-(rows - 1) * lineHeight}px)`] },
      {
        duration: MOTION_DURATION.board,
        ease: EASE_ARRIVE,
        delay: (n - 1 - i) * COLUMN_STEP,
      }
    ).finished
  })
  Promise.all(runs).then(finish, finish)
}
