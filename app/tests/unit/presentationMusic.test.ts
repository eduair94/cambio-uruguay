import { describe, expect, it } from 'vitest'
import { midiToHz, musicNotes } from '../../utils/presentationMusic'
import { canEncodeFast, encodePresentation, frameCount } from '../../utils/presentationExport'

describe('musicNotes', () => {
  it('afina en La 440', () => {
    expect(midiToHz(69)).toBe(440)
    expect(midiToHz(81)).toBeCloseTo(880)
  })

  it('un acorde de cuatro notas y un bajo por compás, el arpegio desde el segundo', () => {
    const notes = musicNotes(10)
    const firstBar = notes.filter(note => note.time < 4)
    expect(firstBar.filter(note => note.voice === 'pad')).toHaveLength(4)
    expect(firstBar.filter(note => note.voice === 'bass')).toHaveLength(1)
    expect(firstBar.some(note => note.voice === 'pluck')).toBe(false)
    expect(notes.some(note => note.voice === 'pluck' && note.time >= 4)).toBe(true)
  })

  it('nada empieza después del final, y siempre suena igual', () => {
    const notes = musicNotes(9.5)
    expect(notes.every(note => note.time < 9.5)).toBe(true)
    expect(musicNotes(9.5)).toEqual(notes)
  })
})

describe('presentationExport', () => {
  it('cuenta los cuadros a 30 por segundo', () => {
    expect(frameCount(1000)).toBe(30)
    expect(frameCount(38_850)).toBe(1166)
    expect(frameCount(0)).toBe(1)
  })

  it('sin WebCodecs devuelve null y el reproductor graba en tiempo real', async () => {
    expect(canEncodeFast()).toBe(false)
    const result = await encodePresentation({
      presentation: { kind: 'car', title: 'x', duration: 1000, scenes: [] },
      format: 'landscape',
      images: new Map(),
      focus: new Map(),
      reducedMotion: false,
      music: null,
    })
    expect(result).toBeNull()
  })
})
