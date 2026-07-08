export interface MarkerStyle {
  pointRadius: number[]
  pointBackgroundColor: string[]
}

const UP_COLOR = '#16c784'
const DOWN_COLOR = '#ea3943'

const dayKey = (d: string) => d.slice(0, 10)

/**
 * Per-index chart.js point styling: highlights the dates that match a notable
 * move (colored by direction), leaving every other point at the dataset's
 * existing default radius/color. Matches by calendar day so a full ISO
 * datetime chart date still lines up with a plain YYYY-MM-DD move date.
 */
export function markPoints(
  dates: string[],
  moves: { date: string; direction: 'up' | 'down' | 'flat' }[],
  defaultColor: string,
  defaultRadius = 3,
  highlightRadius = 6
): MarkerStyle {
  const moveByDay = new Map(moves.map(m => [dayKey(m.date), m.direction]))
  const pointRadius: number[] = []
  const pointBackgroundColor: string[] = []
  for (const date of dates) {
    const direction = moveByDay.get(dayKey(date))
    if (direction === undefined) {
      pointRadius.push(defaultRadius)
      pointBackgroundColor.push(defaultColor)
      continue
    }
    pointRadius.push(highlightRadius)
    pointBackgroundColor.push(direction === 'up' ? UP_COLOR : direction === 'down' ? DOWN_COLOR : defaultColor)
  }
  return { pointRadius, pointBackgroundColor }
}
