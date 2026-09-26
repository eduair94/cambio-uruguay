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

// 145 el 2026-09-26 (141 el 2026-09-24, 133 el 2026-09-20), que es el conteo real y no un número
// redondo: el sobrante de un piso más bajo alcanzaría para que una descripción nueva saliera cortada
// sin poner nada en rojo. Sube con cada página nueva que declara su descripción como literal, y baja
// sólo si alguien vuelve dinámica una que hoy se mide — que es justamente lo que este piso tiene que
// delatar. Las cuatro que subieron el piso desde el 24/9 se habían publicado sin volver a apretarlo,
// que es la única forma en que este número se queda flojo.
const RESOLVED = 145
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
// 36 → 24 el 2026-09-26, séptima corrida: las doce más largas que quedaban, de 222 a 194
// caracteres. El patrón de esta tanda es el de la cuarta y la sexta, y vale nombrarlo otra vez
// porque es el que se repite: once de las doce gastaban el primer renglón —el único que el SERP
// publica— en una etiqueta de género o de formato («Comparativa de…», «Guía completa para…»,
// «Buscador de…», «Qué impuestos paga cada tipo de artículo…», «Los videos de YouTube…,
// actualizados todos los días»), y el dato que decide el clic caía del lado cortado. Ahora arranca
// la respuesta: el 6–7 % que se apila sobre un ítem de US$ 49,99 (2,5 % + US$ 0,50 + IVA más el
// spread), los US$ 800 al año en 3 envíos de la franquicia, el 100 % de TEA que una financiera
// puede cobrar por debajo de 10.000 UI sin salirse del tope de usura, el art. 12 de la Ley 17.250 y
// el Decreto 244/000 de la factura como prueba, el 3 % mensual o los 5 meses de depósito en el BHU
// y el 8 % del alquiler que se descuenta del IRPF, los 15 couriers medidos sobre un paquete de 2 kg,
// y los 13 temas de los videos. Ninguna cifra es nueva: todas ya estaban en la descripción vieja o
// en el cuerpo de su página.
//
// La doceava no era un recorte de etiqueta sino de afirmación. `/api-cotizacion-intradia` cerraba
// con «publicado a pedido de un estudiante de UTEC», que es cierto y está en la página, pero no es
// lo que busca quien necesita el endpoint; lo que sí decide usarlo —que no pide autenticación ni
// declara límite de llamadas— estaba en el cuerpo y no en el snippet. La anécdota del pedido se
// mudó a `/hecho-a-pedido`, que es la página cuyo tema es exactamente eso.
//
// 24 → 13 el 2026-09-26, octava corrida: las ONCE que quedaban del tramo `contenido`, de 188 a 156
// caracteres — o sea la tanda se eligió por TRAMO y no por largo, que es el cambio respecto de las
// siete anteriores. Con el ratchet ya en el rango 156–192, lo que decide cuál recortar primero no es
// cuántos caracteres sobran sino cuánto vale la vista que se gana: el tramo `contenido` rinde 8× el
// promedio del sitio y el `directorio` 0,2× (`classes/revenueplan/value.ts`), así que las trece que
// quedan —informes de mercado, endpoints, evoluciones de precio, tableros— pueden esperar.
//
// Seis de las once gastaban el primer renglón en el formato o en la pregunta en vez de la respuesta:
// «Cuánto cobra cada banco y billetera…» cuando el hallazgo de la página es que Itaú↔Prex está
// exonerado por nombre propio en los dos tarifarios y desde cualquier otro banco la vuelta cuesta
// $ 45 o U$S 1,90; «Independiente, monotributista o con ingresos variables» cuando lo que desbloquea
// el alquiler es el certificado contable (ANDA acepta hasta el 40 % del ingreso nominal, Porto el
// 30 % del líquido); «Descubrí qué figura legal te conviene» cuando la compuerta es el tope
// ($ 1.175.537 el monotributo unipersonal, 305.000 UI el Literal E, y arriba IVA e IRAE reales); «Paso a paso para declarar»
// cuando la respuesta es Ahíva para el correo común y el portal del courier para el courier, con el
// operador postal pagando a la DNA desde el 1/5/2026; «Guía 2026 para recibir compras» cuando lo
// decisivo es que sin cédula uruguaya no hay franquicia (60 % hasta US$ 800, mínimo US$ 20); y «Por
// qué sube tu factura de UTE», que es literalmente la pregunta y no el 4,0 % medio del Dto. 339/025
// desde el 1/1/2026.
//
// Las otras cinco ya tenían la respuesta adelante y sobraba cola (`/cuanto-sale-el-pasaporte-uruguayo`
// perdió un «vigentes»), o el dato del cuerpo no llegaba al snippet: `/cambiar-de-mutualista-uruguay`
// entraba con el calendario por dígito pero cortaba la EXCEPCIÓN —a ASSE se pasa en cualquier
// momento del año, Dto. 344/020 art. 17— que es la otra mitad de la misma consulta;
// `/plan-de-vida-uruguay` describía el orden («lo esencial, la deuda cara, el colchón…») en vez de
// decir por qué ese orden; `/me-cobran-algo-que-no-autorice` enumeraba los tres casos y dejaba
// afuera que el que supervisa no es el que ordena devolver; y `/vender-mi-auto-uruguay` prometía
// «medido sobre los avisos vigentes» sin decir la conclusión, que el precio lo fijan los otros
// avisos del mismo modelo y año y no una tabla.
//
// Ninguna cifra es nueva: todas ya estaban en la descripción vieja o en el cuerpo de su página. Las
// que no son literales en el `.vue` —el margen de negociación de `/vender-mi-auto-uruguay`, la tasa
// media del BCU de `/plan-de-vida-uruguay`— NO se copiaron a la descripción a propósito: una cifra
// viva congelada en un literal es el error recurrente del repo.
//
// `/fecha-de-cobro-bps-uruguay` (156, uno solo de más) SIGUE reservada hasta después del 2026-10-18:
// su fila del libro de cambios está midiendo hasta esa fecha y tocarle la descripción ahora le
// cambia el sujeto al experimento.
//
// Quedan 13 para las próximas corridas, y este número SÓLO PUEDE BAJAR.
const OVER_BUDGET = 13

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
