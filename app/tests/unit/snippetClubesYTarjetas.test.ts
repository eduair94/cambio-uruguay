// Las dos descripciones del racimo de tarjetas y beneficios que PROMETÍAN una cifra y no publicaban
// ninguna: `/tarjetas-de-socio-uruguay` decía «qué cuestan y qué descuentan» y
// `/apps-de-beneficios-uruguay` decía «cuánto devuelve cada club», las dos sin un solo número. Son
// el mismo defecto que `snippetConLaRespuesta.test.ts` ya documenta para cinco páginas de contenido
// —la consulta pide un dato y el dato estaba en el cuerpo— aplicado al otro renglón del snippet.
//
// Lo que este archivo vigila es que la cifra del snippet sea la MISMA que rinde el catálogo. Las dos
// descripciones son literales dentro del `.vue` porque es la única forma que `seoDescriptionBudget`
// sabe leer sin ejecutar la app, y un literal no se entera cuando alguien agrega una tarjeta al
// catálogo o Tienda Inglesa cambia su reglamento. El día que eso pase, esto se pone en rojo en vez
// de publicar en el SERP una cuenta que la página ya no hace.
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

import { BENEFIT_PROGRAMS, measurablePrograms } from '../../utils/benefitPrograms'
import { MEMBERSHIP_CARDS } from '../../utils/membershipCards'

const MAX_DESCRIPTION = 155

const pageSource = (file: string) =>
  readFileSync(join(__dirname, '..', '..', 'pages', file), 'utf8')

/** El literal de un `const <name> = '…'` del nivel superior, como en `snippetConLaRespuesta`. */
function pageLiteral(source: string, name: string): string {
  const match = source.match(new RegExp(`\\nconst ${name} =\\s*\\n?\\s*'((?:[^'\\\\]|\\\\.)*)'`))
  if (!match) throw new Error(`no se pudo leer el literal \`${name}\` de la página`)
  return match[1]!
}

describe('/tarjetas-de-socio-uruguay', () => {
  const source = pageSource('tarjetas-de-socio-uruguay.vue')
  const description = pageLiteral(source, 'seoDescription')

  it('la descripción abre por cuántas tarjetas hay y cuántas no cuestan nada', () => {
    const free = MEMBERSHIP_CARDS.filter(card => card.isFree).length
    expect(description.startsWith(`${MEMBERSHIP_CARDS.length} tarjetas de socio relevadas`)).toBe(
      true
    )
    expect(description).toContain(`y ${free} sin costo`)
  })

  it('las dos cifras son las que el catálogo rinde hoy', () => {
    // Si estás acá porque esto se puso rojo: actualizá la descripción de la página, no este número.
    expect(MEMBERSHIP_CARDS.length).toBe(21)
    expect(MEMBERSHIP_CARDS.filter(card => card.isFree).length).toBe(8)
  })

  it('la descripción usa `useSeoMeta` y entra en el SERP', () => {
    expect(source).toContain('description: seoDescription,')
    expect(description.length, description).toBeLessThanOrEqual(MAX_DESCRIPTION)
  })
})

describe('/apps-de-beneficios-uruguay', () => {
  const source = pageSource('apps-de-beneficios-uruguay.vue')
  const description = pageLiteral(source, 'seoDescription')

  it('la descripción publica cuántos clubes se relevaron y cuántos se pueden medir', () => {
    expect(description.startsWith(`De ${BENEFIT_PROGRAMS.length} clubes de beneficios`)).toBe(true)
    expect(description).toContain('sólo Tienda Inglesa')
  })

  it('el único medible sigue siendo Tienda Inglesa, con el retorno que publica la tabla', () => {
    const measurable = measurablePrograms()
    expect(measurable).toHaveLength(1)
    expect(measurable[0]!.operator).toContain('Tienda Inglesa')
    // La prosa escribe el porcentaje a la uruguaya: coma decimal.
    const pct = (measurable[0]!.returnPct as number).toLocaleString('es-UY', {
      maximumFractionDigits: 2,
    })
    expect(description).toContain(`${pct} %`)
  })

  it('la descripción usa `useSeoMeta` y entra en el SERP', () => {
    expect(source).toContain('description: seoDescription,')
    expect(description.length, description).toBeLessThanOrEqual(MAX_DESCRIPTION)
  })
})
