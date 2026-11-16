// Cuándo ofrecerle la versión en español a quien cayó en otra.
//
// El idioma lo decide SÓLO la URL (nuxt.config → `detectBrowserLanguage: false`), y eso no cambia:
// nadie es redirigido. Pero los buscadores y los asistentes de IA a veces citan la versión `/en/`
// a un lector uruguayo — medido el 16/11/2026: 359 sesiones desde Uruguay entraron por `/en/` en 28
// días, y `/en/celulares-uruguay` fue el tercer aterrizaje que más mandó ChatGPT. Ese lector no
// sabe que la misma página existe en su idioma.
//
// La regla mira el PRIMER idioma del navegador, no cualquiera de la lista: quien tiene el teléfono
// en inglés y el español de segundo eligió leer en inglés, y a ése no se le pregunta nada.
//
// PURE: el componente le pasa lo que leyó del navegador.

/** localStorage: el lector cerró el aviso o ya eligió. No se vuelve a preguntar. */
export const LANGUAGE_HINT_DISMISS_KEY = 'cu_lang_hint'

export function shouldSuggestSpanish(opts: {
  /** El idioma de la página (el de la URL). */
  locale: string
  /** `navigator.languages`, en orden de preferencia. */
  languages: readonly string[]
  dismissed: boolean
}): boolean {
  if (opts.dismissed || opts.locale === 'es') return false
  const first = String(opts.languages[0] ?? '').toLowerCase()
  return first === 'es' || first.startsWith('es-')
}
