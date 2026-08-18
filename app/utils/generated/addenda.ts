// Ampliaciones de páginas que ya existen, escritas a partir de lo que Reddit preguntó y la página
// no contestaba.
//
// POR QUÉ ES UN ARCHIVO APARTE Y NO UNA EDICIÓN DE LA PÁGINA. Las páginas del sitio son `.vue`
// escritos a mano, y un job automático parcheando markup es la forma más rápida de romper el build
// a las 05:35 sin nadie despierto. Acá el bot escribe DATOS, y el layout los inyecta en la ruta que
// corresponda: ninguna página existente cambia una línea.
//
// De dónde sale cada entrada: el juez del bot de Reddit, además de decidir si una página contesta
// un hilo, reporta QUÉ parte de la pregunta NO contesta. Cuando varias personas tropiezan con el
// mismo faltante en la misma página, eso se investiga y termina acá.
//
// Mismas reglas que una página generada: cada cifra aparece literal en el texto de una fuente que
// descargamos y respondió 200. Ver classes/gaps/enrich.ts.

export interface AddendumSource {
  title: string
  url: string
}

export interface AddendumItem {
  /** La pregunta como la hizo la gente, no como la reformularía un manual. */
  question: string
  answer: string
  sources: AddendumSource[]
}

export interface PageAddendum {
  /** Ruta de la página que amplía, con la barra inicial. */
  route: string
  items: AddendumItem[]
  /** ISO. Se muestra, porque una ampliación fechada vale más que una sin fecha. */
  updatedAt: string
}

export const PAGE_ADDENDA: readonly PageAddendum[] = Object.freeze([
  // <<< generated-addenda >>>
])

/** La ampliación de una ruta, si tiene. */
export function addendumFor(route: string): PageAddendum | undefined {
  const clean = route.split('?')[0]!.replace(/\/+$/, '') || '/'
  return PAGE_ADDENDA.find(a => a.route === clean)
}
