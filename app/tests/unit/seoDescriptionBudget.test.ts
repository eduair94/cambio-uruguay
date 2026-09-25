import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, relative, sep } from 'node:path'
import { describe, expect, it } from 'vitest'

/**
 * El presupuesto de caracteres de las descripciones escritas a mano.
 *
 * `seoTitleBudget.test.ts` hace esto con el `<title>`; esta es la otra mitad del snippet,
 * y falla igual de silenciosamente. Google recorta la meta description cerca de los 920 px
 * —unos 155 caracteres— y lo que sobra no se acorta: desaparece. El plan de crecimiento del
 * propio sitio ya escribía "≤155" al redactar descripciones nuevas
 * (`docs/seo/2026-07-10-organic-growth-plan.md`), pero nadie lo medía, así que la regla valía
 * para las páginas que alguien recordaba y no para las demás.
 *
 * Medido el 2026-09-20: de las 133 descripciones que se pueden leer del archivo, **121 pasaban
 * de 155** y la peor llegaba a 464 — tres veces lo que entra. Y lo que se perdía era
 * sistemáticamente la cola, que es donde estaba el dato concreto: "cuándo vencen los puntos",
 * "qué banco lidera cada rubro", "cuántos hay en cada directorio y la fecha del dato". Lo que
 * sobrevivía era la parte genérica de adelante ("Guía de los programas de fidelidad…",
 * "Comparativa honesta entre…"), que es exactamente la descripción que no diferencia nada.
 * Por eso el arreglo no fue sólo recortar: la cifra o el nombre propio se movió al frente.
 *
 * ALCANCE. Sólo se leen las descripciones que son literales en el `.vue`: una sola cadena, o
 * una cadena partida en varias líneas con `+`, escrita en el `useSeoMeta` o en un `const` del
 * mismo archivo. Las que se arman con datos en tiempo de render quedan fuera y eso es correcto:
 * ésas llevan la cifra del día, que es justamente lo que queremos que lleven, y su largo depende
 * del dato. `RESOLVED` es el contrapeso: si alguien vuelve dinámica una descripción para sacarla
 * de la cuenta, el piso baja y el test lo dice.
 *
 * OVER_BUDGET SÓLO PUEDE BAJAR. Si CI falla acá, la descripción que escribiste no entra entera
 * en el SERP: dejá el dato adelante y recortá a 155 caracteres o menos.
 */
const MAX_DESCRIPTION = 155

const PAGES_DIR = join(__dirname, '..', '..', 'pages')

function pageFiles(dir: string = PAGES_DIR): string[] {
  return readdirSync(dir).flatMap(name => {
    const full = join(dir, name)
    if (statSync(full).isDirectory()) return pageFiles(full)
    if (!name.endsWith('.vue')) return []
    return [relative(PAGES_DIR, full).split(sep).join('/')]
  })
}

/**
 * Las líneas del objeto de `useSeoMeta`. Se recorre por líneas y no con una expresión regular
 * sobre todo el archivo: el `})` de cierre va anclado a la columna 0 (la llamada vive siempre
 * en el nivel superior del `<script setup>`), así que el recorrido es exacto y no arrastra el
 * backtracking de un `[\s\S]*?` sobre archivos de mil líneas.
 */
function seoMetaLines(lines: string[]): string[] {
  const start = lines.findIndex(line => line.startsWith('useSeoMeta({'))
  if (start === -1) return []
  const end = lines.indexOf('})', start)
  return end === -1 ? [] : lines.slice(start + 1, end)
}

/**
 * El valor de `key:` dentro del bloque, con las líneas de continuación pegadas. Devuelve el
 * propio nombre ante la forma abreviada (`description,`), que es la que usan las páginas que
 * declaran la cadena en un `const` de arriba: para el resolver es lo mismo que `description:
 * description`.
 */
function entryExpression(lines: string[], key: string): string | null {
  if (lines.some(line => line.trim() === `${key},`)) return key
  const head = lines.findIndex(line => new RegExp(`^\\s{2}${key}:`).test(line))
  if (head === -1) return null
  const parts = [lines[head]!.replace(new RegExp(`^\\s{2}${key}:`), '')]
  for (let i = head + 1; i < lines.length; i++) {
    if (/^\s{2}[A-Z]+:/i.test(lines[i]!)) break
    parts.push(lines[i]!)
  }
  return parts.join('\n').trim().replace(/,$/, '')
}

/**
 * `'a' + 'b' + 'c'` -> `'abc'`, y `null` ante cualquier otra cosa. Que sobre un token que no
 * sea una cadena, un `+` o espacio significa que hay un dato adentro: ahí el largo se decide
 * en tiempo de render y esta medición no aplica.
 */
function literalChain(expression: string): string | null {
  const parts = [...expression.matchAll(/'((?:[^'\\]|\\.)*)'/g)].map(match => match[1]!)
  if (parts.length === 0) return null
  const leftovers = expression.replace(/'(?:[^'\\]|\\.)*'/g, '').replace(/[+\s]/g, '')
  return leftovers === '' ? parts.join('') : null
}

/** El valor de un `const NAME = ...` del nivel superior, incluidas sus líneas de continuación. */
function constantExpression(lines: string[], name: string): string | null {
  const head = lines.findIndex(line => new RegExp(`^(?:const|let) ${name} =`).test(line))
  if (head === -1) return null
  const first = lines[head]!.replace(new RegExp(`^(?:const|let) ${name} =`), '')
  const parts = [first]
  let previous = first
  for (let i = head + 1; i < lines.length; i++) {
    if (
      previous.trim() !== '' &&
      !previous.trimEnd().endsWith('+') &&
      !previous.trimEnd().endsWith('=')
    )
      break
    parts.push(lines[i]!)
    previous = lines[i]!
  }
  return parts.join('\n').trim().replace(/,$/, '')
}

/** La meta description de una página, o `null` si no se puede leer del archivo. */
function staticDescription(source: string): string | null {
  const lines = source.split('\n')
  const block = seoMetaLines(lines)
  if (block.length === 0) return null
  const expression = entryExpression(block, 'description')
  if (expression === null) return null

  const direct = literalChain(expression)
  if (direct !== null) return direct

  const identifier = expression.match(/^([A-Z_$][\w$]*)$/i)
  if (!identifier) return null
  const declaration = constantExpression(lines, identifier[1]!)
  return declaration === null ? null : literalChain(declaration)
}

const measured = pageFiles()
  .map(file => ({
    file,
    description: staticDescription(readFileSync(join(PAGES_DIR, file), 'utf8')),
  }))
  .filter((page): page is { file: string; description: string } => page.description !== null)

// 141 el 2026-09-24 (133 el 2026-09-20), que es el conteo real y no un número redondo: el sobrante
// de un piso más bajo alcanzaría para que una descripción nueva saliera cortada sin poner nada en
// rojo. Sube con cada página nueva que declara su descripción como literal, y baja sólo si alguien
// vuelve dinámica una que hoy se mide — que es justamente lo que este piso tiene que delatar.
const RESOLVED = 141
// 121 → 96 el 2026-09-20, la primera medición: veinte hubs (la home de cada directorio, las de
// descuentos y las de guías) más las cinco peores de todas, entre 376 y 464 caracteres. En las
// cinco largas el recorte no fue podar la cola: la cifra que las distingue se movió al frente
// ($ 464,55 de cargos fijos de OSE, los 5 años de la Ley 18.331, los trece sueldos del
// dependiente), que es justo la parte que el SERP sí muestra.
//
// 96 → 76 el mismo 2026-09-20, segunda corrida: las veinte más largas que quedaban, de 371 a 305
// caracteres, TODAS del tramo `contenido` (guías y páginas de problema), que es el que más rinde
// por vista — ver `classes/revenueplan/value.ts`. Mismo criterio que la primera tanda y no un
// recorte a ciegas: lo que ahora entra en el SERP es el dato que decide el clic (los 5 años de
// prescripción de DGI, los 15/30/60/120 días para presentar un cheque, el 9,6 % de vivienda vacía
// de Montevideo en el Censo 2023, UR 1,25 de la libreta, el tope de usura de 55 %), y lo genérico
// —«Guía de…», «La cuenta completa…»— pasó al final o se fue. Ninguna cifra es nueva: todas ya
// estaban en la descripción vieja y en el cuerpo de su página.
//
// 76 → 64 el 2026-09-23, tercera corrida: las doce más largas que quedaban, de 341 a 267
// caracteres. Mismo criterio otra vez, y conviene decir por qué no es cosmético: la descripción
// de `/cotizacion-del-bcu` gastaba sus primeros 155 caracteres definiendo el fondo de cierre y
// recién después llegaba a lo único que decide el clic —que para la DGI vale el interbancario del
// día anterior—, así que el SERP publicaba la definición y tiraba la respuesta. Lo que ahora entra
// entero es el dato: el padrón exonerado en 2026 ($ 282.612), los 2 y 9 puntos de IVA con la fecha
// en que bajan a 5 (30/9/2026), los tres feriados que se corren al lunes, el 100 %/150 % de la
// hora extra, las 200.000 UI de tope en efectivo, los US$ 800 y 20 kg del courier y los 3 días
// hábiles por fallecimiento. Ninguna cifra es nueva: todas ya estaban en la descripción vieja y en
// el cuerpo de su página.
//
// 64 → 52 el 2026-09-23, cuarta corrida: las doce más largas que quedaban, de 265 a 237
// caracteres, TODAS del tramo `contenido`. Y acá el patrón que las une es el que más cuesta ver
// leyendo la página: las doce empezaban nombrando LO QUE LA PÁGINA ES («Directorio de apps
// útiles…», «Tier list interactiva de…», «Guía completa para…», «Radar en vivo de…»), o sea
// gastaban el renglón que el SERP sí publica en una etiqueta de formato que no diferencia nada, y
// el dato que decide el clic quedaba del lado cortado. Ahora arranca la respuesta: los 4 años y el
// 12 % de los gastos comunes, el Decreto 274/017 y las 0,4 UR del carné de salud, los US$ 500 y
// US$ 300 de la franquicia de viajero, que la Ley 19.210 le prohíbe a una billetera pagar
// intereses, que si el corredor quiebra no hay COPAB, cuáles prestan estando en el clearing, y los
// nombres propios con los que se busca (BROU, Itaú, Mercado Pago, Prex). Ninguna cifra es nueva:
// todas ya estaban en la descripción vieja y en el cuerpo de su página.
//
// 52 → 51 el 2026-09-24: `/cotizaciones-de-la-region` (263 caracteres), la que quedó afuera de la
// cuarta corrida porque es del tramo `dato-vivo`. Arrancaba por «Tablero regional con todos los
// mercados que publica cada país», y lo que se busca —los siete dólares argentinos, el PTAX— quedaba
// del lado cortado. `/fecha-de-cobro-bps-uruguay` (156, uno de más) se deja para después del
// 2026-10-18: su fila del libro de cambios está midiendo hasta esa fecha.
//
// 51 → 48 el 2026-09-25, quinta corrida: las tres más largas que quedaban (233, 231 y 231
// caracteres). Mismo criterio que la cuarta, y las tres fallaban igual pero por motivos
// distintos. `/estafas-uruguay` enumeraba los cuatro fraudes antes de llegar a lo único que
// contesta la pregunta —que la carga de la prueba es del EMISOR y no de la víctima—, así que el
// SERP publicaba la lista y cortaba la respuesta; ahora la enumeración se acorta a tres y el dato
// entra. `/conviene-pagar-todo-con-credito-uruguay` gastaba el primer renglón describiendo la
// maniobra («Dejar la plata rindiendo … hasta el vencimiento») y dejaba el 1,64 % afuera.
// `/certificado-de-antecedentes-judiciales-uruguay` abría con un matiz de formato («La ficha
// oficial lo cobra en UI, no en pesos») y empujaba las dos tarifas al borde; se le cae además la
// cola de la Ley 19.791, que es otro trámite y tiene su propio lugar en el cuerpo de la página.
// Ninguna cifra es nueva: todas ya estaban en la descripción vieja y en el cuerpo de su página.
//
// 48 → 36 el 2026-09-25, sexta corrida: las doce más largas que quedaban, de 225 a 209 caracteres,
// TODAS del tramo `contenido`. Esta tanda se partió en dos mitades y conviene distinguirlas, porque
// sólo una es un recorte. En cuatro páginas la respuesta YA estaba adelante y sobraba la cola que
// nombraba el formato («Matriz completa … con fuentes primarias», «Con calculadoras y un generador
// de reclamo»): ahí se podó y listo. En las otras ocho el primer renglón —el único que el SERP
// publica— lo gastaba una etiqueta de género («Guía uruguaya para reclamar…», «Guía para pagar…»,
// «Cómo se clona una tarjeta … según lo que realmente se reporta», «La comparación con precios
// reales de las dos puntas»), y la respuesta quedaba del lado cortado. Ahora arranca el dato: el
// art. 33 de la Ley 17.250 y los 5 días hábiles de retracto, los US$ 800 que Estados Unidos ya no
// exonera, el piso de IVA de US$ 20 del régimen postal, los US$ 10.000 del efectivo y el 30 % de
// multa de la Ley 19.574, el carné del INAU a los 15 años con sus 6 horas, la culpa grave que la
// Ley 16.074 no castiga, y que el nombre y el domicilio del destinatario son requisitos de la
// franquicia. Ninguna cifra es nueva: todas ya estaban en la descripción vieja o en el cuerpo de
// su página.
//
// Una precisión que no es de estilo: `/pagar-cuentas-con-tarjeta` decía «si acumula millas o
// puntos» y la página aclara, en un recuadro, que eso es una INFERENCIA y no una confirmación de
// Itaú. La descripción nueva dice «lo esperable es que sumen millas» y adelanta lo que sí está
// publicado —que Totalnet procesa como compra y no como red de cobranza, y que el 3,75 % es
// comisión de adquirencia que se le retiene al cobrador—. Una descripción que afirma de más gana
// el clic y lo devuelve.
//
// `/fecha-de-cobro-bps-uruguay` (156, uno solo de más) SIGUE reservada hasta después del
// 2026-10-18: su fila del libro de cambios está midiendo hasta esa fecha y tocarle la descripción
// ahora le cambia el sujeto al experimento.
//
// Quedan 36 para las próximas corridas, y este número SÓLO PUEDE BAJAR.
const OVER_BUDGET = 36

describe('las descripciones escritas a mano entran en el SERP', () => {
  it(`lee la descripción de ${RESOLVED} páginas sin ejecutar la app`, () => {
    expect(measured.length).toBeGreaterThanOrEqual(RESOLVED)
  })

  it(`tiene como mucho ${OVER_BUDGET} descripciones pasadas de ${MAX_DESCRIPTION} caracteres`, () => {
    const offenders = measured
      .filter(page => page.description.length > MAX_DESCRIPTION)
      .map(page => `${page.description.length} ${page.file}: ${page.description}`)
      .sort()
    expect(offenders.length, offenders.join('\n')).toBeLessThanOrEqual(OVER_BUDGET)
  })

  // Dos páginas con la misma descripción compiten por la misma intención y ninguna dice qué la
  // diferencia de la otra. El sitio ya tiene un test para el título del hub de casa contra el de
  // la moneda (`seoContract.test.ts`); esto es la misma regla, aplicada a todo el directorio.
  it('ninguna descripción se repite entre dos páginas', () => {
    const byText = new Map<string, string[]>()
    for (const page of measured) {
      const key = page.description.trim()
      byText.set(key, [...(byText.get(key) ?? []), page.file])
    }
    const repeated = [...byText.entries()]
      .filter(([, pages]) => pages.length > 1)
      .map(([text, pages]) => `${pages.join(' + ')}: ${text}`)
    expect(repeated, repeated.join('\n')).toEqual([])
  })

  it('lee las dos formas que usan las páginas y ninguna otra', () => {
    const inline = ['useSeoMeta({', "  description: 'Una sola línea.',", '})'].join('\n')
    expect(staticDescription(inline)).toBe('Una sola línea.')

    const fromConstant = [
      'const seoDescription =',
      "  'Primera parte ' +",
      "  'y segunda parte.'",
      '',
      'useSeoMeta({',
      '  description: seoDescription,',
      '})',
    ].join('\n')
    expect(staticDescription(fromConstant)).toBe('Primera parte y segunda parte.')

    const dynamic = ['useSeoMeta({', '  description: () => `Hoy a $${price.value}.`,', '})'].join(
      '\n'
    )
    expect(staticDescription(dynamic)).toBeNull()
  })
})
