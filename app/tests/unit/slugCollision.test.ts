import { readdirSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { guides } from '../../utils/guides'

/**
 * Dos URLs del sitio con el MISMO slug y el mismo tema: `/<x>` y `/guias/<x>`.
 *
 * POR QUÉ ES UN DEFECTO Y NO UNA REDUNDANCIA INOFENSIVA. Las dos responden 200, las dos salen
 * `index, follow`, cada una se declara canónica de sí misma y las dos entran al sitemap, así que
 * Google recibe dos candidatas para la misma consulta y reparte entre ellas los enlaces internos,
 * las impresiones y los clics. Es la definición de canibalización, y el síntoma es el peor posible
 * para medir: ninguna de las dos aparece mal, simplemente las dos rankean peor que una.
 *
 * Y NO ES HIPOTÉTICO: YA PASÓ DOS VECES. La primera se atajó a mano y quedó escrita en la cabecera
 * de `utils/guidesTramites.ts` —«La guía del certificado de antecedentes judiciales se sacó antes de
 * publicar: otra sesión publicó el mismo día la página /certificado-de-antecedentes-judiciales-uruguay
 * y las dos competían por la consulta»—. O sea que el riesgo está identificado desde setiembre, se
 * resolvió por memoria de quien estaba mirando, y nada lo vigila. La segunda se publicó y sigue
 * viva: `impuesto-temu-uruguay` es a la vez página raíz y guía.
 *
 * POR QUÉ NINGÚN TRINQUETE LO VEÍA. `siteNav-coverage.test.ts` camina de `pages/` a `siteNav.ts` y
 * vuelve, así que ve que las dos están registradas y eso le alcanza. `seoContract.test.ts` exige que
 * cada página declare su canónica, y las dos la declaran —apuntando a sí mismas, que es justamente
 * el problema—. `temaHuerfanas.test.ts` y `enlacesDeContexto.test.ts` miden que cada página esté
 * enlazada, y las dos lo están. Cada trinquete mira UNA página; el defecto está en el par.
 *
 * ES EL MODO DE FALLAR DE ESTE REPO EN PARTICULAR, porque las páginas de contenido viven en dos
 * formas (`pages/<x>.vue` y una entrada del catálogo de guías) y la cola de trabajo se arma por
 * consulta sin demanda: una sesión que busca si un tema ya existe greppea `pages/` y `utils/`, y el
 * slug de una guía vive dentro de un `utils/guides*.ts` de miles de líneas donde un `grep | head`
 * lo pierde. Este test es la respuesta mecánica a esa pregunta.
 */
const PAGES_DIR = join(__dirname, '..', '..', 'pages')

/** Los slugs de las páginas RAÍZ: `pages/<x>.vue`, sin las familias programáticas ni los índices. */
const rootSlugs = readdirSync(PAGES_DIR, { withFileTypes: true })
  .filter(entry => entry.isFile() && entry.name.endsWith('.vue'))
  .map(entry => entry.name.slice(0, -4))
  .filter(slug => slug !== 'index' && !slug.includes('['))
  .sort()

const guideSlugs = guides.map(guide => guide.slug).sort()

/**
 * Los pares que ya están publicados compitiendo. **SÓLO PUEDE BAJAR.**
 *
 * Uno, medido el 2026-11-12: `impuesto-temu-uruguay`. La página raíz nació el 2026-09-21 con la fila
 * `impuesto-temu-nombre-popular` (el nombre con el que la gente pregunta, que `/franquicia-aduana-uruguay`
 * no usaba) y la guía ya existía; nadie cruzó los dos slugs. Hoy sirven «Impuesto Temu: cuánto pagás
 * en Uruguay» y «Impuesto Temu: qué es y cuánto pagás», que es la misma intención escrita dos veces,
 * y las dos reciben enlaces internos desde varios módulos (`storeProfiles.ts`, `guidesPrimavera2026.ts`,
 * `linkedinPosts.ts`, `/franquicia-aduana-uruguay`).
 *
 * NO SE ARREGLA HOY, Y EL MOTIVO ES EL MISMO QUE ORDENA TODA LA DEUDA DE SEO DE ESTE REPO: la ruta
 * `/impuesto-temu-uruguay` está RESERVADA por la fila `impuesto-temu-tema-y-enlace` del 2026-10-20,
 * que se libera el **2026-11-18** (la reserva es de 29 días porque `experiments_overlap.test.ts`
 * marca el solape en `|Δfecha| ≤ 28`). Consolidar el par mueve clics HACIA esa página, que es
 * exactamente la variable que esa fila está midiendo: arreglarlo antes del 18 no corrige el defecto,
 * corrige el defecto Y arruina la medición abierta. La guía, por su lado, está libre desde el
 * 2026-11-05.
 *
 * CUANDO SE LIBERE, el arreglo es del lado de la GUÍA y no de la página: la página tiene el nombre
 * popular con el que se busca, dos filas del libro de cambios medidas sobre ella y el gancho del
 * mínimo legal de IVA. La guía pasa a canónica hacia `/impuesto-temu-uruguay` y sale del sitemap
 * (`sitemap.exclude` + su `robots`, como pide `robotsMetaContract.test.ts`), conservando sus enlaces
 * entrantes, que es lo que consolida la señal en vez de tirarla.
 *
 * Subirlo es publicar una segunda URL para una consulta que el sitio ya contesta.
 */
const PARES_QUE_COMPITEN = [
  // El comentario va DENTRO de la lista por lo que `DEUDA_SIN_ENLACE` en `enlacesDeContexto.test.ts`
  // deja escrito: prettier aplasta a una sola línea cualquier array que entre en 100 columnas salvo
  // los que llevan un comentario, y el cierre tiene que abrir su propia línea.
  'impuesto-temu-uruguay',
]

describe('ninguna consulta tiene dos URLs del sitio compitiendo por ella', () => {
  const colisiones = rootSlugs.filter(slug => guideSlugs.includes(slug))

  // Guarda la guarda: si el catálogo de guías dejara de cargarse, o `pages/` se leyera vacío, el
  // cruce daría cero colisiones y este archivo pasaría sin haber mirado nada.
  it('lee los dos inventarios que cruza', () => {
    expect(rootSlugs.length).toBeGreaterThan(200)
    expect(guideSlugs.length).toBeGreaterThan(100)
  })

  it(`tiene como mucho ${PARES_QUE_COMPITEN.length} pares publicados compitiendo`, () => {
    expect(colisiones.length, colisiones.join('\n')).toBeLessThanOrEqual(PARES_QUE_COMPITEN.length)
  })

  // La deuda dice la verdad: un par ya consolidado tiene que delatarse acá en vez de inflar el
  // presupuesto y dejar que el próximo nazca duplicado contra un contador que sobra.
  it('cada slug declarado sigue duplicado, y la deuda nombra a todos los que lo están', () => {
    expect(colisiones).toEqual([...PARES_QUE_COMPITEN].sort())
  })

  // Lo que el cruce de slugs NO puede ver: dos rutas distintas sobre el mismo tema. Esto al menos
  // frena el caso que el repo ya sufrió dos veces, que es el slug repetido literal.
  it('la deuda sólo nombra slugs que existen de los dos lados', () => {
    for (const slug of PARES_QUE_COMPITEN) {
      expect(rootSlugs, slug).toContain(slug)
      expect(guideSlugs, slug).toContain(slug)
    }
  })
})
