// app/utils/authorEntity.ts
// La entidad Person del autor, UNA sola, con @id, para que todo el sitio apunte a la misma.
//
// Hasta el 2026-09-22 el autor vivía como cuatro Person distintas escritas a mano: dos en
// /acerca (founder y author de la Organization), una en `useLongformSeo` y otra en la página de
// guías. Ninguna tenía @id ni `sameAs`, así que para un motor eran cuatro personas homónimas y
// ninguna era "el autor de Cambio Uruguay". JSON-LD une nodos por @id a lo largo del documento
// (el layout ya se apoya en eso para la Organization `#identity`), y ese es el mecanismo acá: el
// nodo completo se emite en /acerca, y el resto del sitio referencia ese @id.
//
// La referencia lleva `name` y `url` además del @id. No es redundancia: Google no sigue el @id
// a otra página, así que un `author: { '@id': ... }` pelado en una guía es un autor sin nombre en
// esa guía. Con nombre y URL el nodo vale solo, y con el @id se fusiona cuando el lector tiene
// las dos páginas.
//
// Módulo PURO (sin Vue/Nuxt): lo importan un layout, un composable, dos páginas y el test.

export const SITE_URL = 'https://cambio-uruguay.com'

/** El @id de la Organization que el módulo @nuxtjs/seo emite y `layouts/default.vue` completa. */
export const ORGANIZATION_ID = `${SITE_URL}/#identity`

/** El @id del autor. Vive en /acerca porque esa es la página que habla de él. */
export const AUTHOR_ID = `${SITE_URL}/acerca#eduardo-airaudo`
export const AUTHOR_NAME = 'Eduardo Airaudo'
/** La página propia sobre el autor (la sección "Quién está detrás" de /acerca). */
export const AUTHOR_PAGE_URL = `${SITE_URL}/acerca`
export const AUTHOR_JOB_TITLE = 'Founder & Developer'

/**
 * Perfiles del AUTOR (no del proyecto). Cada URL tiene que responder y hablar de Eduardo Airaudo:
 * `sameAs` es lo que un motor usa para atar la entidad a sus perfiles, y una URL rota o ajena la
 * confunde en vez de reforzarla. Verificado con curl el 2026-09-22: GitHub responde 200; LinkedIn
 * devuelve 999 a cualquier cliente que no sea un navegador (es su bloqueo anti-bot, no un error
 * del perfil), y es la misma URL que /acerca publica como enlace visible desde 2026-06. Quedaron
 * afuera x.com/eduair94 (404) y npmjs.com/~eduair94 (403): no se lista lo que no se puede abrir.
 */
export const AUTHOR_SAME_AS: readonly string[] = Object.freeze([
  'https://www.linkedin.com/in/eduardo-airaudo/',
  'https://github.com/eduair94',
])

/** Temas que el autor cubre, alineados con el `knowsAbout` de la Organization del layout. */
export const AUTHOR_KNOWS_ABOUT: readonly string[] = Object.freeze([
  'Cotización del dólar en Uruguay',
  'Casas de cambio Uruguay',
  'Unidad Indexada (UI)',
  'Unidad Reajustable (UR)',
  'Base de Prestaciones y Contribuciones (BPC)',
  'Desarrollo de software',
])

/**
 * La referencia que usan las páginas que NO son /acerca: Article.author, Organization.founder.
 * Con @id para fusionarse con el nodo completo, y con nombre y URL para valer por sí sola.
 */
export function authorReference(): {
  '@type': 'Person'
  '@id': string
  name: string
  url: string
} {
  return { '@type': 'Person', '@id': AUTHOR_ID, name: AUTHOR_NAME, url: AUTHOR_PAGE_URL }
}

/** El nodo completo, que se emite UNA vez, en /acerca. */
export function authorPersonNode(): Record<string, unknown> {
  return {
    ...authorReference(),
    jobTitle: AUTHOR_JOB_TITLE,
    description:
      'Desarrollador uruguayo. Creó Cambio Uruguay en 2023 y mantiene los datos, el código y las guías del sitio.',
    nationality: {
      '@type': 'Country',
      name: 'Uruguay',
      sameAs: 'https://www.wikidata.org/wiki/Q77',
    },
    worksFor: { '@id': ORGANIZATION_ID },
    knowsAbout: [...AUTHOR_KNOWS_ABOUT],
    sameAs: [...AUTHOR_SAME_AS],
  }
}
