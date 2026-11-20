// Las descripciones de guía que pasaron de ANUNCIAR el tema a dar el dato, y la norma que lo sostiene.
//
// POR QUÉ ESTE ARCHIVO. `seoDescriptionBudget` y `guideSnippetBudget` miden el LARGO de la
// descripción y `titulosDeGuiaQueContestan` ancla el TÍTULO en el cuerpo y en las fuentes. Entre los
// dos quedaba un hueco con forma de descripción genérica: «Qué es el aguinaldo, cómo se calcula y
// cuándo se cobra» entra perfecto en 155 caracteres, no contradice ningún título y sirve igual para
// cualquier otra página sobre el tema — que es exactamente lo que la medición de este sitio dice que
// no hay que publicar (una descripción con el dato del día corre a ~1,4 % de CTR; una genérica, a
// 0,03–0,2 % desde la misma posición).
//
// Lo que se vigila cuando una descripción así se arregla: que el dato nuevo esté TAMBIÉN en el
// cuerpo (si no, el snippet promete algo que la página no contesta) y que la guía cite la norma de
// la que sale. Es la misma regla de las tandas de octubre, escrita como test para que la próxima
// revisión no pueda deshacerla sin ponerse en rojo.
//
// SÓLO PUEDE CRECER: cada tanda de descripciones agrega sus casos acá.
import { describe, expect, it } from 'vitest'
import { getGuide, type Guide } from '../../utils/guides'

const MAX_DESCRIPTION = 155

interface Caso {
  /** La guía arreglada. */
  slug: string
  /** Lo que la descripción tiene que decir: el dato, no el tema. */
  dato: RegExp[]
  /** El mismo dato, escrito en el cuerpo de la guía (secciones, pasos o preguntas). */
  respaldo: RegExp[]
  /** La fuente que lo sostiene, por URL exacta. Vacío si el dato es del propio cuerpo y no legal. */
  fuentes: string[]
}

const CASOS: Caso[] = [
  {
    // Seasonal: la mitad de diciembre se busca «cuándo se cobra el aguinaldo», y la descripción
    // anunciaba «cuándo se cobra en Uruguay: junio y diciembre» sin decir ningún plazo. El cuerpo
    // decía «alrededor de junio» y «cerca de fin de año», más vago todavía que lo que el propio
    // sitio ya publica con fuente en `/cuando-se-cobra-el-aguinaldo-uruguay`.
    slug: 'como-se-calcula-el-aguinaldo-uruguay',
    dato: [/diez días anteriores al 24 de diciembre/, /Ley 12\.840/, /adelanta a junio/],
    respaldo: [
      /«dentro de los diez días anteriores al 24 de diciembre de cada año»/,
      /Decreto-Ley 14\.525/,
      /lo generado hasta el 31 de mayo dentro del mes de junio/,
    ],
    fuentes: [
      'https://www.impo.com.uy/bases/leyes/12840-1960',
      'https://www.impo.com.uy/bases/decretos-ley/14525-1976',
    ],
  },
  {
    // La descripción devolvía la pregunta sin contestarla («¿Se heredan las deudas en Uruguay?») y
    // listaba los temas del cuerpo. La respuesta —el límite del beneficio de inventario y el efecto
    // del repudio sobre los propios hijos— ya estaba escrita en las dos primeras secciones.
    slug: 'las-deudas-se-heredan-uruguay',
    dato: [/beneficio de inventario/, /hasta donde alcancen los bienes/, /repudiás/],
    respaldo: [
      /solo hasta donde alcanzan los bienes heredados/,
      /derecho de representación/,
      /repudiar/,
    ],
    fuentes: [],
  },
]

const cuerpoDe = (g: Guide) =>
  [
    ...g.sections.flatMap(s => [s.heading, s.body]),
    ...(g.faqs ?? []).flatMap(f => [f.q, f.a]),
    ...(g.steps ?? []).flatMap(s => [s.name, s.text]),
  ].join('\n')

describe('las descripciones arregladas dan el dato y la guía lo sostiene', () => {
  it('hay casos declarados', () => {
    expect(CASOS.length).toBeGreaterThan(0)
  })

  for (const caso of CASOS) {
    describe(`/guias/${caso.slug}`, () => {
      const guia = getGuide(caso.slug)

      it('existe', () => {
        expect(guia, caso.slug).toBeDefined()
      })

      it('su descripción trae el dato y entra en el SERP', () => {
        expect(guia!.description.length).toBeLessThanOrEqual(MAX_DESCRIPTION)
        for (const dato of caso.dato) expect(guia!.description).toMatch(dato)
      })

      // El defecto que esto atrapa no es una descripción fea: es una que promete un dato que la
      // página no publica. Google muestra el snippet, el lector entra y no encuentra la respuesta.
      it('el mismo dato está escrito en el cuerpo', () => {
        const cuerpo = cuerpoDe(guia!)
        for (const respaldo of caso.respaldo) expect(cuerpo, caso.slug).toMatch(respaldo)
      })

      it('cita la norma de la que sale', () => {
        const urls = (guia!.sources ?? []).map(s => s.url)
        for (const fuente of caso.fuentes) expect(urls, caso.slug).toContain(fuente)
      })
    })
  }
})
