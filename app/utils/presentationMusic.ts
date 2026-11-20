/**
 * La música de fondo de la presentación, sintetizada en el navegador: sin archivo de audio (no hay
 * licencia que cuidar ni bytes que bajar) y sin IA. Un colchón suave de acordes, un bajo y un
 * arpegio, a 60 pulsos por minuto, que entra y sale con fundido.
 *
 * `musicNotes` es puro (qué suena y cuándo) y se prueba sin audio; `renderPresentationMusic` lo
 * pasa a un `AudioBuffer` con un `OfflineAudioContext`, que para 40 s tarda unos milisegundos.
 */

export interface MusicNote {
  /** Segundos desde el comienzo. */
  time: number
  duration: number
  frequency: number
  voice: 'pad' | 'bass' | 'pluck'
  /** 0..1, antes del volumen general. */
  gain: number
}

/** Un compás = 4 s. I – vi – IV – V en Do mayor, con séptimas para que no suene a timbre. */
const BAR = 4
const PROGRESSION = [
  [60, 64, 67, 71], // Cmaj7
  [57, 60, 64, 67], // Am7
  [53, 57, 60, 64], // Fmaj7
  [55, 59, 62, 69], // G6/9
]
/** El orden del arpegio dentro del acorde, en corcheas. */
const ARPEGGIO = [0, 2, 1, 3, 2, 1, 3, 2]

export const midiToHz = (midi: number) => 440 * 2 ** ((midi - 69) / 12)

export function musicNotes(durationSeconds: number): MusicNote[] {
  const notes: MusicNote[] = []
  const bars = Math.ceil(durationSeconds / BAR)
  for (let bar = 0; bar < bars; bar++) {
    const chord = PROGRESSION[bar % PROGRESSION.length]!
    const start = bar * BAR
    for (const midi of chord) {
      notes.push({
        time: start,
        duration: BAR + 0.6,
        frequency: midiToHz(midi),
        voice: 'pad',
        gain: 0.16,
      })
    }
    notes.push({
      time: start,
      duration: BAR,
      frequency: midiToHz(chord[0]! - 24),
      voice: 'bass',
      gain: 0.32,
    })
    // El arpegio recién desde el segundo compás: el primero es la entrada.
    if (bar === 0) continue
    ARPEGGIO.forEach((step, index) => {
      notes.push({
        time: start + index * (BAR / ARPEGGIO.length),
        duration: 0.9,
        frequency: midiToHz(chord[step]! + 12),
        voice: 'pluck',
        gain: index % 2 === 0 ? 0.13 : 0.09,
      })
    })
  }
  return notes.filter(note => note.time < durationSeconds)
}

export const MUSIC_SAMPLE_RATE = 48_000
const MASTER = 0.42

export async function renderPresentationMusic(durationMs: number): Promise<AudioBuffer | null> {
  const Offline =
    typeof window !== 'undefined'
      ? (window.OfflineAudioContext ??
        (window as unknown as { webkitOfflineAudioContext?: typeof OfflineAudioContext })
          .webkitOfflineAudioContext)
      : undefined
  if (!Offline) return null
  const seconds = Math.max(1, durationMs / 1000)
  const context = new Offline(2, Math.ceil(seconds * MUSIC_SAMPLE_RATE), MUSIC_SAMPLE_RATE)

  const master = context.createGain()
  master.gain.setValueAtTime(0, 0)
  master.gain.linearRampToValueAtTime(MASTER, Math.min(1.5, seconds / 2))
  master.gain.setValueAtTime(MASTER, Math.max(1.5, seconds - 2.5))
  master.gain.linearRampToValueAtTime(0, seconds)
  master.connect(context.destination)

  // Un eco corto le da aire sin necesidad de una reverberación.
  const echo = context.createDelay(1)
  echo.delayTime.value = 0.375
  const feedback = context.createGain()
  feedback.gain.value = 0.28
  const wet = context.createGain()
  wet.gain.value = 0.35
  echo.connect(feedback).connect(echo)
  echo.connect(wet).connect(master)

  const padFilter = context.createBiquadFilter()
  padFilter.type = 'lowpass'
  padFilter.frequency.value = 1400
  padFilter.connect(master)

  for (const note of musicNotes(seconds)) {
    const end = Math.min(seconds, note.time + note.duration)
    const gain = context.createGain()
    if (note.voice === 'pad') {
      gain.gain.setValueAtTime(0, note.time)
      gain.gain.linearRampToValueAtTime(note.gain, note.time + 0.9)
      gain.gain.setValueAtTime(note.gain, Math.max(note.time + 0.9, end - 0.8))
      gain.gain.linearRampToValueAtTime(0, end)
      gain.connect(padFilter)
      // Dos osciladores apenas desafinados: el coro que hace "colchón".
      for (const detune of [-7, 7]) {
        const osc = context.createOscillator()
        osc.type = 'triangle'
        osc.frequency.value = note.frequency
        osc.detune.value = detune
        osc.connect(gain)
        osc.start(note.time)
        osc.stop(end)
      }
      continue
    }
    const osc = context.createOscillator()
    osc.type = note.voice === 'bass' ? 'sine' : 'triangle'
    osc.frequency.value = note.frequency
    gain.gain.setValueAtTime(0, note.time)
    gain.gain.linearRampToValueAtTime(note.gain, note.time + 0.01)
    gain.gain.exponentialRampToValueAtTime(
      0.0001,
      note.time + (note.voice === 'bass' ? note.duration : 0.7)
    )
    osc.connect(gain)
    gain.connect(master)
    if (note.voice === 'pluck') gain.connect(echo)
    osc.start(note.time)
    osc.stop(end)
  }
  try {
    return await context.startRendering()
  } catch {
    return null
  }
}
