import { describe, expect, it } from 'vitest'
import { getGuide } from '../../utils/guides'

/**
 * Los cinco títulos de guía que NOMBRABAN el tema mientras su propia descripción ya traía la
 * respuesta.
 *
 * POR QUÉ FALTABA ESTE ARREGLO, Y POR QUÉ NO ERA UN DESCUIDO. Las once tandas de snippet de
 * octubre se eligieron por PRESUPUESTO: `guideSnippetBudget.test.ts` lista las guías pasadas de 60
 * caracteres de título o de 155 de descripción, y esas listas fueron la cola de trabajo («la tanda
 * salió de las 64 libres, por mayor sobrante total»). El criterio funcionó —los dos pozos están
 * pagados— pero no puede ver a una guía cuyo título ENTRA en el presupuesto y no contesta nada: no
 * sobra ni un carácter, así que nunca aparece en ninguna lista. Las cinco de acá llegaron a su
 * descripción por esa misma cola —las filas `descripciones-de-las-guias-respuesta-primero` (1/10) y
 * `-2` (7/10)— y salieron de ella con la respuesta adelante en la descripción y el título intacto,
 * que es el renglón sobre el que se hace clic. Es el mismo modo de fallar que
 * `seoDescriptionBudget.test.ts` se anotó el 2026-11-02: no una medición en rojo, una medición que
 * no alcanza a la página.
 *
 * QUÉ FIJA ESTE ARCHIVO. No que el título «conteste» —eso no es mecanizable y una lista de deuda
 * con falsos positivos es peor que ninguna—, sino que la respuesta que el título publica siga
 * siendo la que la guía afirma en su propio cuerpo. Es el contrapeso que `rentAdjustment.test.ts`
 * le pone al coeficiente literal de `/coeficiente-de-reajuste-de-alquileres-uruguay`: una cifra en
 * el título es una cifra que puede envejecer en silencio, y acá el único ancla honesto es el texto
 * de la misma página. Si alguien reescribe el cuerpo y la respuesta cambia, el título se cae con
 * él en vez de quedar mintiendo en el SERP.
 *
 * El largo no se mide acá: lo mide `guideSnippetBudget.test.ts` sobre las 154 guías, con la marca
 * incluida (`rendered()` suma « | Cambio Uruguay», o sea 17 caracteres, así que el techo real del
 * título del catálogo es 43).
 */
const textoDe = (slug: string) => {
  const guia = getGuide(slug)
  expect(guia, `falta la guía ${slug}`).toBeDefined()
  const g = guia!
  const partes = [g.description, ...g.sections.flatMap(s => [s.heading, s.body])]
  for (const faq of g.faqs ?? []) partes.push(faq.q, faq.a)
  for (const step of g.steps ?? []) partes.push(step.name, step.text)
  return partes.join('\n')
}

/**
 * Por guía: el título que se publica hoy, el que nombraba el tema y no contestaba, y las marcas
 * que la respuesta del título tiene que seguir teniendo en el cuerpo.
 */
const TITULOS = [
  {
    slug: 'alquilar-sin-garantia-uruguay',
    titulo: 'Alquilar sin garantía: seguro, ANDA o LUC',
    nombrabaElTema: 'Cómo alquilar sin garantía en Uruguay',
    respaldo: [/seguro de fianza/i, /ANDA/, /Ley de Urgente Consideración/i],
  },
  {
    slug: 'legitima-y-herederos-forzosos-uruguay',
    titulo: 'Legítima: mitad con un hijo, 2/3 con dos',
    nombrabaElTema: 'Legítima y herederos forzosos en Uruguay',
    respaldo: [/la mitad del patrimonio/i, /dos tercios/i],
  },
  {
    slug: 'hay-impuesto-a-la-herencia-uruguay',
    titulo: 'No hay impuesto a la herencia: sí el ITP',
    nombrabaElTema: '¿Hay impuesto a la herencia en Uruguay?',
    respaldo: [/no hay un impuesto sucesorio o a la herencia/i, /\bITP\b/],
  },
  {
    slug: 'licencia-y-salario-vacacional-uruguay',
    titulo: 'Licencia: 20 días y uno más cada 4 años',
    nombrabaElTema: 'Licencia y salario vacacional en Uruguay',
    respaldo: [/veinte días/i, /cada cuatro años/i],
  },
  {
    slug: 'elegir-o-cambiar-de-afap-uruguay',
    titulo: 'Cambiar de AFAP: gratis, mirá la comisión',
    nombrabaElTema: 'Cómo elegir o cambiarte de AFAP en Uruguay',
    respaldo: [/trámite gratuito/i, /comisión de administración/i],
  },
] as const

describe('los cinco títulos de guía que pasaron a contestar', () => {
  it.each(TITULOS.map(t => [t.slug, t] as const))(
    '%s publica el título nuevo y no vuelve al que nombraba el tema',
    (_slug, caso) => {
      const guia = getGuide(caso.slug)
      expect(guia, `falta la guía ${caso.slug}`).toBeDefined()
      expect(guia!.title).toBe(caso.titulo)
      expect(guia!.title).not.toBe(caso.nombrabaElTema)
    }
  )

  // La razón por la que este archivo existe: la respuesta del título tiene que estar afirmada en el
  // cuerpo de la misma guía. Ninguna cifra del título es nueva.
  it.each(TITULOS.map(t => [t.slug, t] as const))(
    '%s sostiene en su cuerpo la respuesta que publica en el título',
    (_slug, caso) => {
      const texto = textoDe(caso.slug)
      for (const marca of caso.respaldo) expect(texto, `${caso.slug} ${marca}`).toMatch(marca)
    }
  )
})
