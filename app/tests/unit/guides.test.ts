import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { getGuide, guideSlugs, guides } from '../../utils/guides'

describe('getGuide', () => {
  it('returns the matching guide for a known slug', () => {
    const guide = getGuide('billete-cable-transferencia')
    expect(guide).toBeDefined()
    expect(guide?.slug).toBe('billete-cable-transferencia')
    expect(guide?.title).toContain('BILLETE')
  })

  it('returns undefined for an unknown slug', () => {
    expect(getGuide('zzz-does-not-exist')).toBeUndefined()
    expect(getGuide('')).toBeUndefined()
  })
})

describe('guideSlugs', () => {
  it('matches the slugs of every guide, in catalogue order', () => {
    expect(guideSlugs()).toEqual(guides.map(g => g.slug))
  })

  it('contains the four original guides in catalogue order', () => {
    expect(guideSlugs().slice(0, 4)).toEqual([
      'conviene-comprar-dolares-hoy',
      'billete-cable-transferencia',
      'comprar-dolares-mejor-precio',
      'mejor-momento-cambiar-divisas',
    ])
  })
})

describe('guides catalogue integrity', () => {
  it('has been expanded with additional guides', () => {
    expect(guides.length).toBeGreaterThanOrEqual(16)
  })

  it('has unique slugs', () => {
    const slugs = guides.map(g => g.slug)
    expect(new Set(slugs).size).toBe(slugs.length)
  })

  it('has required, non-empty top-level fields on every guide', () => {
    for (const guide of guides) {
      expect(guide.slug.trim().length).toBeGreaterThan(0)
      expect(guide.title.trim().length).toBeGreaterThan(0)
      expect(guide.description.trim().length).toBeGreaterThan(0)
      expect(guide.tag.trim().length).toBeGreaterThan(0)
      // updatedAt must be a valid ISO YYYY-MM-DD date.
      expect(guide.updatedAt).toMatch(/^\d{4}-\d{2}-\d{2}$/)
      expect(Number.isNaN(Date.parse(guide.updatedAt))).toBe(false)
    }
  })

  it('has at least one section, each with non-empty heading and body', () => {
    for (const guide of guides) {
      expect(guide.sections.length).toBeGreaterThanOrEqual(1)
      for (const section of guide.sections) {
        expect(section.heading.trim().length).toBeGreaterThan(0)
        expect(section.body.trim().length).toBeGreaterThan(0)
      }
    }
  })

  it('gives every section table consistent, non-empty rows', () => {
    for (const guide of guides) {
      for (const section of guide.sections) {
        if (!section.table) continue
        expect(section.table.headers.length).toBeGreaterThan(1)
        for (const row of section.table.rows) {
          expect(row.length).toBe(section.table.headers.length)
          for (const cell of row) expect(cell.trim().length).toBeGreaterThan(0)
        }
      }
    }
  })

  it('gives every related link and step the required fields', () => {
    for (const guide of guides) {
      for (const link of guide.related ?? []) {
        expect(link.label.trim().length).toBeGreaterThan(0)
        expect(link.to.startsWith('/')).toBe(true)
      }
      for (const step of guide.steps ?? []) {
        expect(step.name.trim().length).toBeGreaterThan(0)
        expect(step.text.trim().length).toBeGreaterThan(10)
      }
    }
  })

  it('exposes every slug through getGuide', () => {
    for (const slug of guideSlugs()) {
      expect(getGuide(slug)?.slug).toBe(slug)
    }
  })
})

// A guide body is plain text: `pages/guias/[slug].vue` interpolates it with `{{ }}`, so a tool
// named in prose is NOT a link. For months several guides said "usá nuestra calculadora de
// impuestos de importación" and the reader had no way to reach it — the page was a dead end.
// This guard makes naming a tool in prose imply linking it, from either the section's own
// `links` or the guide's `related` chips.
const TOOL_MENTIONS: Array<{ phrase: RegExp; to: string }> = [
  {
    phrase: /calculadora de impuestos de importación|calculadora de importación/i,
    to: '/herramientas/calculadora-impuestos-importacion',
  },
  { phrase: /carrito de importación/i, to: '/herramientas/carrito-importacion' },
  { phrase: /calculadora de sueldo líquido/i, to: '/herramientas/calculadora-sueldo-liquido' },
  { phrase: /calculadora de IRPF/i, to: '/herramientas/calculadora-irpf' },
  { phrase: /calculadora de costo de vida/i, to: '/herramientas/costo-de-vida' },
]

describe('guides link the tools they name', () => {
  it('never names a tool in prose without linking it somewhere on the page', () => {
    const offenders: string[] = []

    for (const guide of guides) {
      const guideLinks = new Set((guide.related ?? []).map(l => l.to))

      for (const section of guide.sections) {
        const sectionLinks = new Set([...guideLinks, ...(section.links ?? []).map(l => l.to)])
        const text = `${section.heading} ${section.body}`
        for (const { phrase, to } of TOOL_MENTIONS) {
          if (phrase.test(text) && !sectionLinks.has(to)) {
            offenders.push(`${guide.slug} › «${section.heading}» menciona ${to} sin enlazarlo`)
          }
        }
      }

      // FAQ answers render as plain text too, so their only possible link is `related`.
      for (const faq of guide.faqs ?? []) {
        const text = `${faq.q} ${faq.a}`
        for (const { phrase, to } of TOOL_MENTIONS) {
          if (phrase.test(text) && !guideLinks.has(to)) {
            offenders.push(`${guide.slug} › FAQ «${faq.q}» menciona ${to} sin enlazarlo`)
          }
        }
      }
    }

    expect(offenders).toEqual([])
  })

  it('gives every section link and source the required fields', () => {
    for (const guide of guides) {
      for (const section of guide.sections) {
        for (const link of section.links ?? []) {
          expect(link.label.trim().length).toBeGreaterThan(0)
          expect(link.to.startsWith('/')).toBe(true)
        }
      }
      for (const source of guide.sources ?? []) {
        expect(source.label.trim().length).toBeGreaterThan(0)
        expect(source.url).toMatch(/^https?:\/\//)
      }
    }
  })
})

// ---------------------------------------------------------------------------
// Correcciones verificadas (2026-08-10)
//
// Cada bloque de acá abajo existe porque la guía DECÍA ALGO FALSO y alguien lo leyó como cierto.
// No testean redacción: testean que la afirmación equivocada no vuelva, y que la corrección siga
// citando la norma. Ver el encabezado de `utils/guidesReddit.ts` para el detalle de cada una.
// ---------------------------------------------------------------------------

/** Todo el texto visible de una guía: headings, prose, tablas, pasos y FAQ. */
function guideText(slug: string): string {
  const guide = getGuide(slug)
  expect(guide, `falta la guía ${slug}`).toBeDefined()
  const g = guide!
  const parts: string[] = [g.title, g.description]
  for (const s of g.sections) {
    parts.push(s.heading, s.body)
    for (const row of s.table?.rows ?? []) parts.push(...row)
  }
  for (const step of g.steps ?? []) parts.push(step.name, step.text)
  for (const faq of g.faqs ?? []) parts.push(faq.q, faq.a)
  return parts.join('\n')
}

function sourceUrls(slug: string): string[] {
  return (getGuide(slug)?.sources ?? []).map(s => s.url)
}

/**
 * Cada trozo de texto que el lector ve como una unidad: una sección o una respuesta de FAQ.
 * Sirve para exigir que una afirmación y su condición viajen JUNTAS, no sueltas por la página.
 */
function guideBlocks(slug: string): Array<{ donde: string; texto: string }> {
  const guide = getGuide(slug)
  expect(guide, `falta la guía ${slug}`).toBeDefined()
  const g = guide!
  return [
    ...g.sections.map(s => ({ donde: s.heading, texto: `${s.heading}\n${s.body}` })),
    ...(g.faqs ?? []).map(f => ({ donde: `FAQ «${f.q}»`, texto: `${f.q}\n${f.a}` })),
    ...(g.steps ?? []).map(s => ({ donde: `paso «${s.name}»`, texto: `${s.name}\n${s.text}` })),
  ]
}

describe('correcciones verificadas › IVA y exportación de servicios', () => {
  // La "tasa cero" no existe en el IVA uruguayo (Título 10 art. 34 publica 22% y 10%). Decirlo
  // contradecía de frente a `companyTypes.ts`, que ya explicaba lo contrario con la norma al lado.
  // Nombrar el error para desmentirlo SÍ vale —es la única forma de desarmarlo en la cabeza del
  // lector, que lo escuchó en otro lado—, así que el guard descuenta la forma «no es una "tasa
  // cero"» antes de buscar usos afirmativos.
  const DEBUNK = /no es (?:una|lo mismo que) «?"?tasa (?:cero|0\s*%)"?»?/gi
  it('ninguna guía del catálogo vuelve a afirmar que el IVA es a "tasa cero"', () => {
    const offenders = guides
      .filter(g => /tasa\s+(?:cero|0\s*%)/i.test(guideText(g.slug).replace(DEBUNK, '')))
      .map(g => g.slug)
    expect(offenders).toEqual([])
  })

  it('desmiente el término explícitamente en la guía donde estaba', () => {
    expect(guideText('trabajar-para-el-exterior-desde-uruguay')).toMatch(DEBUNK)
  })

  it('la guía de trabajar para el exterior explica el no-gravado por territorialidad', () => {
    const text = guideText('trabajar-para-el-exterior-desde-uruguay')
    expect(text).toMatch(/no está gravada/i)
    expect(text).toMatch(/territorialidad/i)
    // La lista del Poder Ejecutivo es cerrada: "el cliente está afuera" no alcanza.
    expect(text).toMatch(/220\/998/)
    expect(text).toMatch(/lista cerrada/i)
    // Y el crédito de IVA de compras se conserva, que es la consecuencia en plata.
    expect(text).toMatch(/crédito/i)
  })

  it('cita las cuatro normas del IVA de exportación', () => {
    const urls = sourceUrls('trabajar-para-el-exterior-desde-uruguay')
    expect(urls).toContain('https://www.impo.com.uy/bases/todgi2023/101-2024/5_T10')
    expect(urls).toContain('https://www.impo.com.uy/bases/decretos/220-1998/34')
    expect(urls).toContain('https://www.impo.com.uy/bases/todgi2023/101-2024/14_T10')
    expect(urls).toContain('https://www.impo.com.uy/bases/todgi2023/101-2024/34_T10')
  })
})

describe('correcciones verificadas › el 15% jubilatorio se reparte con la AFAP', () => {
  const SLUGS = ['entender-tu-recibo-de-sueldo-uruguay', 'salario-minimo-uruguay-cuanto-es']

  it.each(SLUGS)('%s nombra el reparto BPS/AFAP y las dos leyes en juego', slug => {
    const text = guideText(slug)
    expect(text).toMatch(/15\s*%/)
    expect(text).toMatch(/AFAP/)
    expect(text).toMatch(/20\.130/)
    expect(text).toMatch(/16\.713/)
  })

  it.each(SLUGS)('%s cita la ley que fija el reparto', slug => {
    expect(sourceUrls(slug)).toContain('https://www.impo.com.uy/bases/leyes/20130-2023/22')
  })

  // ---- Segunda pasada de auditoría: LA PUERTA DE ENTRADA del art. 22 --------------------
  // El art. 22 abre con una cláusula de ámbito: "Los aportes personales de las personas cuyo
  // PRIMER INGRESO AL MERCADO DE TRABAJO ocurra a partir de la vigencia prevista en el numeral 4)
  // del artículo 6º…". La primera corrección la borró y publicó el 10+5 como si fuera el régimen
  // de todos, marcando con "todavía" a la Ley 16.713 — que es la que le rige a casi cualquiera
  // que hoy mire un recibo. Estos guards existen para que el ámbito no se vuelva a caer.

  /** La cláusula de ámbito, verbatim del art. 22. */
  const COHORTE = /primer ingreso al mercado de trabajo/i
  /** La vigencia del SPC, que el BPS publica como 1/12/2023 en bps.gub.uy/5478. */
  const VIGENCIA_SPC = /diciembre de 2023/i

  it.each(SLUGS)('%s: ningún bloque invoca la Ley 20.130 sin decir a quién le aplica', slug => {
    const offenders = guideBlocks(slug)
      .filter(b => /20\.130|\bart(?:ículo)?\.?\s*22\b/i.test(b.texto))
      .filter(b => !(COHORTE.test(b.texto) && VIGENCIA_SPC.test(b.texto)))
      .map(b => `${slug} › ${b.donde}`)
    expect(offenders).toEqual([])
  })

  it.each(SLUGS)('%s ya no llama "todavía" al régimen que gobierna a casi todos', slug => {
    const text = guideText(slug)
    expect(text).not.toMatch(/te aplica todavía/i)
    expect(text).not.toMatch(/todavía el esquema/i)
  })

  it.each(SLUGS)('%s publica la regla de la 16.713, que es la que le toca a la mayoría', slug => {
    const text = guideText(slug)
    expect(text).toMatch(/tope A/)
    expect(text).toMatch(/art(?:ículo)?\.?\s*8\b/i)
  })

  // El error original fue atribuirle el aporte entero al BPS SIN CONDICIÓN. Que vaya todo al BPS
  // es cierto —bajo la 16.713, sin la opción del art. 8 y hasta el tope A—, así que lo que el
  // guard exige ahora no es el silencio sino el límite escrito al lado.
  it.each(SLUGS)('%s nunca manda el aporte entero al BPS sin decir hasta dónde', slug => {
    const offenders = guideBlocks(slug)
      .filter(b => /\b(?:todo|entero|íntegro|integro)\b[^.]{1,60}\bal BPS\b/i.test(b.texto))
      .filter(b => !/tope A/.test(b.texto))
      .map(b => `${slug} › ${b.donde}`)
    expect(offenders).toEqual([])
  })

  it.each(SLUGS)('%s cita el artículo que fija la vigencia del SPC', slug => {
    expect(sourceUrls(slug)).toContain('https://www.impo.com.uy/bases/leyes/20130-2023/6')
    expect(sourceUrls(slug)).toContain('https://www.bps.gub.uy/5478/')
  })

  // Los cortes en pesos los mueve el BPS cada año: si se publican, se publican con la fuente,
  // con la fecha de consulta y —desde la segunda pasada— con la cohorte a la que le corresponden.
  it('el recibo de sueldo publica los topes con el link del BPS y la fecha de consulta', () => {
    const guide = getGuide('entender-tu-recibo-de-sueldo-uruguay')!
    const text = guideText(guide.slug)
    expect(text).toMatch(/144\.418/)
    expect(text).toMatch(/agosto de 2026/i)
    expect(sourceUrls(guide.slug)).toContain('https://www.bps.gub.uy/5478/')
  })

  it('el recibo de sueldo no publica los dos juegos de cortes en una lista corrida', () => {
    const text = guideText('entender-tu-recibo-de-sueldo-uruguay')
    // Cada juego de cifras tiene que nombrar su ley: "topes A, B y C de la Ley 16.713" y
    // "niveles del artículo 22", no una enumeración sin dueño.
    expect(text).toMatch(/topes A, B y C de la Ley 16\.713/)
    expect(text).toMatch(/niveles del artículo 22/)
  })
})

describe('correcciones verificadas › patente unificada por el SUCIVE', () => {
  const SLUG = 'costos-de-tener-auto-uruguay'

  it('no vuelve a decir que cada intendencia pone sus propias bonificaciones', () => {
    expect(guideText(SLUG)).not.toMatch(/cada intendencia puede aplicar sus propias/i)
  })

  it('ancla la unificación en la Ley 18.860 y las bonificaciones en el Texto Ordenado', () => {
    const text = guideText(SLUG)
    expect(text).toMatch(/18\.860/)
    expect(text).toMatch(/Congreso de Intendentes/)
    expect(text).toMatch(/Texto Ordenado del SUCIVE/)
    expect(text).toMatch(/20\s*%/)
    expect(text).toMatch(/10\s*%/)
    const urls = sourceUrls(SLUG)
    expect(urls).toContain('https://www.impo.com.uy/bases/leyes/18860-2011/4')
    expect(urls.some(u => u.includes('texto-ordenado-del-sucive-2026'))).toBe(true)
  })

  // Segunda pasada: la fecha estaba pegada al artículo equivocado. El art. 31 del Texto Ordenado
  // 2026 cierra con "FUENTE: CI Sesión 41 (30/11/12)" — la regla del 20/10% no acumulables es de
  // 2012. Del 14/11/2025 es la aprobación del texto ordenado COMPLETO (6.ª Sesión Plenaria). Tal
  // como estaba, el lector entendía que las bonificaciones eran novedad de noviembre pasado.
  it('no le atribuye a noviembre de 2025 la regla de las bonificaciones', () => {
    const text = guideText(SLUG)
    expect(text).not.toMatch(/art\.\s*31,\s*aprobado el 14 de noviembre de 2025/i)
    // La fecha tiene que quedar pegada al documento, y el origen de la regla dicho aparte.
    expect(text).toMatch(/Texto Ordenado del SUCIVE 2026[\s\S]{0,140}14 de noviembre de 2025/)
    expect(text).toMatch(/30 de noviembre de 2012/)
  })

  // La Comisión del art. 4 eleva la propuesta "antes del 31 de octubre de cada año" (verbatim de
  // IMPO). El sitio llegó a publicar 30 y 31 para el mismo plazo en páginas distintas.
  it('publica el 31 de octubre del art. 4, no el 30', () => {
    const text = guideText(SLUG)
    expect(text).toMatch(/antes del 31 de octubre/i)
    expect(text).not.toMatch(/antes del 30 de octubre/i)
    expect(text).toMatch(/15 de noviembre/)
  })
})

describe('correcciones verificadas › licencia: sólo lo que la norma dice', () => {
  const SLUG = 'licencia-y-salario-vacacional-uruguay'

  // "No se computan los domingos" no sale de ninguna de las fuentes citadas: el MTSS los excluye
  // expresamente sólo para el trabajador RURAL. Los feriados sí (Ley 12.590 art. 1: "dentro del
  // que no se computarán los feriados") y los sábados también (MTSS, Dec. 497/78). Se publica la
  // ausencia; no se inventa la regla.
  it('no vuelve a excluir los domingos del cómputo sin norma que lo diga', () => {
    const text = guideText(SLUG)
    expect(text).not.toMatch(/no se computan los domingos/i)
    expect(text).toMatch(/sólo para el trabajador rural/i)
  })

  it('mantiene con norma lo que sí está escrito: feriados fuera, sábados dentro', () => {
    const text = guideText(SLUG)
    expect(text).toMatch(/no se computan los feriados/i)
    expect(text).toMatch(/497\/978|497\/78/)
    expect(text).toMatch(/día de descanso semanal/i)
  })

  // El art. 5 dice A QUIÉN se comunica. Sin destinatario la frase se leía como un aviso personal
  // al trabajador, que es otra cosa.
  it('nombra al destinatario de la comunicación del art. 5 y cómo se instrumenta hoy', () => {
    const text = guideText(SLUG)
    expect(text).toMatch(/Instituto Nacional del Trabajo/i)
    expect(text).toMatch(/Libro Único/i)
    expect(text).toMatch(/648\/990/)
    expect(text).toMatch(/658\/991/)
    // Y ya no puede volver a insinuar que el patrono te notifica a vos por el art. 5.
    expect(text).not.toMatch(/y de la notificación al trabajador/i)
  })
})

describe('correcciones verificadas › la escala de licencia por antigüedad', () => {
  const SLUG = 'licencia-y-salario-vacacional-uruguay'

  it('ya no describe la escala sin números', () => {
    const text = guideText(SLUG)
    expect(text).not.toMatch(/cierta cantidad de años/i)
    expect(text).not.toMatch(/cada cierto tramo de años/i)
  })

  it('publica base, umbral de antigüedad, paso y un total de ejemplo', () => {
    const text = guideText(SLUG)
    expect(text).toMatch(/veinte días/i)
    expect(text).toMatch(/cada cuatro años de antigüedad/i)
    expect(text).toMatch(/cinco años/i)
    expect(text).toMatch(/22 días/)
  })

  it('cubre quién fija la fecha, el plazo para gozarla y el fraccionamiento', () => {
    const text = guideText(SLUG)
    expect(text).toMatch(/la fija el empleador/i)
    expect(text).toMatch(/año inmediato siguiente/i)
    expect(text).toMatch(/convenio colectivo/i)
    expect(text).toMatch(/diez días/i)
  })

  // La trampa del falso positivo: la sección del salario vacacional ya hablaba de "fraccionar",
  // pero de PRORRATEAR EL COMPLEMENTO, no del derecho a partir la licencia. Son cosas distintas
  // y la guía tiene que decir las dos, en secciones distintas.
  it('separa el fraccionamiento de la licencia del prorrateo del salario vacacional', () => {
    const guide = getGuide(SLUG)!
    const licencia = guide.sections.find(s => /convenio colectivo/i.test(s.body))
    const complemento = guide.sections.find(s =>
      /el complemento también se fracciona/i.test(s.body)
    )
    expect(licencia).toBeDefined()
    expect(complemento).toBeDefined()
    expect(licencia!.heading).not.toBe(complemento!.heading)
  })

  it('cita la Ley 12.590 y el MTSS', () => {
    const urls = sourceUrls(SLUG)
    expect(urls).toContain('https://www.impo.com.uy/bases/leyes/12590-1958/2')
    expect(urls).toContain('https://www.impo.com.uy/bases/leyes/12590-1958/5')
    expect(urls.some(u => u.includes('regimen-licencia'))).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// Tercera pasada (2026-08-10)
//
// Las dos correcciones anteriores arreglaron la guía donde se encontró el error y dejaron la
// MISMA afirmación falsa publicada en otras. Por eso los guards de acá abajo corren sobre TODO el
// catálogo, no sobre la lista de slugs que se tocó: un guard con lista de slugs no ve la guía de
// al lado, que es exactamente lo que pasó.
// ---------------------------------------------------------------------------

describe('correcciones verificadas › la AFAP no es obligatoria para todo el mundo', () => {
  // Ley 20.130 art. 22 (IMPO, texto vigente): el reparto 10 + 5 alcanza a las personas "cuyo
  // primer ingreso al mercado de trabajo ocurra a partir de la vigencia prevista en el numeral 4)
  // del artículo 6º" (el BPS la ubica el 1/12/2023), y su inciso final deja los artículos 7 y 8 de
  // la Ley 16.713 "aplicables exclusivamente a los afiliados al Banco de Previsión Social que,
  // antes de [esa fecha], estuvieren comprendidos en los Títulos I a IV de la misma". Para el
  // afiliado viejo que gana por debajo del tope A y no hizo la opción del art. 8 —la enorme
  // mayoría— NO entra nada a una AFAP y el aporte no es obligatorio.

  // El guard corre por ORACIÓN, no por bloque. Un guard de bloque no sirve acá: estos párrafos
  // son largos, así que una oración falsa ("el aporte a la AFAP es obligatorio") convive
  // tranquilamente en el mismo bloque con otra que sí nombra la cohorte, y el bloque pasa. Se
  // verificó empíricamente: con la redacción vieja, la versión por bloque daba verde.
  // Corta en punto (o ? / !) seguido de mayúscula, así "art. 22", "$96.279" y "1.º de diciembre"
  // no parten. Las preguntas quedan fuera: una FAQ se titula con la duda del lector («¿Ahora es
  // obligatorio aportar a una AFAP?») y eso no es una afirmación del sitio — la afirmación está
  // en la respuesta, que sí se audita.
  const oraciones = (texto: string) =>
    texto
      .split(/(?<=[.?!])\s+(?=[A-ZÁÉÍÓÚÑ¿«"])/u)
      .filter(o => !(o.trim().startsWith('¿') || o.trim().endsWith('?')))

  const AFAP = /AFAP|ahorro individual|cuenta individual/i
  /** Dice que el aporte a la AFAP es forzoso. */
  const OBLIGA = /obligatori|sí o sí/i
  /** Dice que el reparto le pasa a cualquiera: "una parte de tu aporte […] a una AFAP". */
  const REPARTO_UNIVERSAL =
    /parte de (?:tu|tus) aportes?[^.]{0,90}(?:AFAP|ahorro individual|cuenta individual)/i
  /**
   * El acotamiento tiene que viajar EN LA MISMA ORACIÓN. La lista es corta a propósito: son los
   * cinco marcadores que efectivamente delimitan el ámbito. "depende", "según" o "puede" no
   * entran, porque la oración vieja («…es obligatorio, pero cuál AFAP administra tu ahorro no es
   * un detalle: de eso dependen la comisión…») los tenía y era falsa igual.
   */
  const ACOTADO =
    /primer ingreso al mercado de trabajo|diciembre de 2023|16\.713|tope A|no es obligatorio para todos|sólo para una cohorte/i

  /** Cada oración visible del catálogo, con su dirección para el mensaje de error. */
  function oracionesDelCatalogo(): Array<{ donde: string; oracion: string }> {
    const out: Array<{ donde: string; oracion: string }> = []
    for (const guide of guides) {
      const bloques = [
        { donde: 'description', texto: guide.description },
        ...guideBlocks(guide.slug),
      ]
      for (const b of bloques) {
        for (const oracion of oraciones(b.texto)) {
          out.push({ donde: `${guide.slug} › ${b.donde}`, oracion })
        }
      }
    }
    return out
  }

  it('ninguna oración del catálogo llama obligatorio al aporte a la AFAP sin decir a quién', () => {
    const offenders = oracionesDelCatalogo()
      .filter(o => AFAP.test(o.oracion) && OBLIGA.test(o.oracion))
      .filter(o => !ACOTADO.test(o.oracion))
      .map(o => `${o.donde}: «${o.oracion.slice(0, 110)}…»`)
    expect(offenders).toEqual([])
  })

  it('ninguna oración da el reparto BPS/AFAP por universal', () => {
    const offenders = oracionesDelCatalogo()
      .filter(o => REPARTO_UNIVERSAL.test(o.oracion))
      .filter(o => !ACOTADO.test(o.oracion))
      .map(o => `${o.donde}: «${o.oracion.slice(0, 110)}…»`)
    expect(offenders).toEqual([])
  })

  // El guard de la segunda pasada corría sobre dos slugs; ahora es de catálogo, porque las guías
  // de jubilación publican la misma regla de la 16.713 y también tienen que decir hasta dónde.
  it('ningún bloque manda el aporte entero al BPS sin decir hasta dónde', () => {
    const offenders: string[] = []
    for (const guide of guides) {
      for (const b of guideBlocks(guide.slug)) {
        if (!/\b(?:todo|entero|íntegro|integro)\b[^.]{1,60}\bal BPS\b/i.test(b.texto)) continue
        if (/tope A/.test(b.texto)) continue
        offenders.push(`${guide.slug} › ${b.donde}`)
      }
    }
    expect(offenders).toEqual([])
  })

  const AFAP_SLUGS = [
    'jubilacion-y-afap-como-funciona-uruguay',
    'reforma-jubilatoria-uruguay-que-cambia',
    'elegir-o-cambiar-de-afap-uruguay',
  ]

  it.each(AFAP_SLUGS)('%s publica las dos cohortes y el régimen de la 16.713', slug => {
    const text = guideText(slug)
    expect(text).toMatch(/primer ingreso al mercado de trabajo/i)
    expect(text).toMatch(/diciembre de 2023/i)
    expect(text).toMatch(/16\.713/)
    expect(text).toMatch(/tope A/)
    expect(text).toMatch(/art(?:ículo)?\.?\s*8\b/i)
  })

  it.each(AFAP_SLUGS)('%s dice la consecuencia en plata, no sólo la regla', slug => {
    // "nada a una AFAP" es la frase que le contesta al lector la pregunta que trajo.
    expect(guideText(slug)).toMatch(/nada a una AFAP/i)
  })

  it.each(AFAP_SLUGS)('%s cita el art. 22 y la vigencia del régimen', slug => {
    const urls = sourceUrls(slug)
    expect(urls).toContain('https://www.impo.com.uy/bases/leyes/20130-2023/22')
    expect(urls.some(u => u.includes('bps.gub.uy'))).toBe(true)
  })

  // Coherencia interna: la guía del recibo y las de jubilación tienen que decir LO MISMO. Esto es
  // lo que falló — el recibo decía "hoy no está entrando nada a tu cuenta AFAP" y, a un click de
  // distancia (bloque `related` de la guía de la reforma), otra guía decía "sí, es obligatorio".
  it('el recibo y las guías de jubilación no se contradicen', () => {
    expect(guideText('entender-tu-recibo-de-sueldo-uruguay')).toMatch(
      /no está entrando nada a tu cuenta AFAP/i
    )
    const reforma = getGuide('reforma-jubilatoria-uruguay-que-cambia')!
    expect((reforma.related ?? []).map(l => l.to)).toContain(
      '/guias/entender-tu-recibo-de-sueldo-uruguay'
    )
  })
})

describe('correcciones verificadas › el corte por cohorte no es de por vida', () => {
  // El art. 22 se reserva una excepción para el afiliado viejo: "Las personas afiliadas antes de
  // la fecha de vigencia […] a cualquier entidad previsional que, con posterioridad a dicha fecha,
  // ingresen por primera vez en actividades comprendidas en el ámbito de afiliación de otra, se
  // regirán por lo dispuesto en el presente artículo en la nueva actividad".
  const SLUGS = ['entender-tu-recibo-de-sueldo-uruguay', 'salario-minimo-uruguay-cuanto-es']

  it.each(SLUGS)('%s acota el régimen viejo a mientras siga en el BPS', slug => {
    const text = guideText(slug)
    expect(text).toMatch(/(?:sigas|seguís) en el BPS/i)
    expect(text).toMatch(/nueva actividad|otra caja/i)
  })

  it.each(SLUGS)('%s nunca dice que el art. 22 no te aplica, a secas', slug => {
    const offenders = guideBlocks(slug)
      .filter(b => /art(?:ículo)?\.?\s*22|20\.130/i.test(b.texto))
      .filter(b => /no te (?:aplica|rige|alcanza)/i.test(b.texto))
      .filter(b => !/(?:sigas|seguís) en el BPS/i.test(b.texto))
      .map(b => `${slug} › ${b.donde}`)
    expect(offenders).toEqual([])
  })
})

describe('correcciones verificadas › el art. 5 delega la notificación al trabajador', () => {
  // Sobrecorrección: "está obligado a comunicar esas fechas, pero no a vos" le hacía leer al
  // trabajador que NO existe deber de avisarle. El art. 5 no se agota en la comunicación al INT:
  // cierra con "La reglamentación fijará […] y todo lo relativo a la notificación a los
  // trabajadores y la documentación que acredite el cumplimiento de la ley".
  const SLUG = 'licencia-y-salario-vacacional-uruguay'

  it('ya no niega que exista deber de avisarle al trabajador', () => {
    expect(guideText(SLUG)).not.toMatch(/comunicar esas fechas,? pero no a vos/i)
  })

  it('publica la segunda mitad del art. 5, y que está delegada en la reglamentación', () => {
    const text = guideText(SLUG)
    expect(text).toMatch(/notificación a los trabajadores/i)
    expect(text).toMatch(/reglamentación/i)
    // El destinatario de la comunicación del art. 5 sigue siendo el INT: eso no se toca.
    expect(text).toMatch(/Instituto Nacional del Trabajo/i)
  })

  it('la fuente del art. 5 cita también la parte delegada', () => {
    const source = (getGuide(SLUG)?.sources ?? []).find(s =>
      s.url.endsWith('/bases/leyes/12590-1958/5')
    )
    expect(source, 'falta la fuente del art. 5').toBeDefined()
    expect(source!.label).toMatch(/notificación a los trabajadores/i)
  })
})

// ---------------------------------------------------------------------------
// Guía nueva (2026-08-10): subsidio por enfermedad
//
// El sitio tenía 350 líneas sobre el subsidio por DESEMPLEO y ni una sobre el de ENFERMEDAD. Los
// guards de acá abajo no testean redacción: fijan las cifras que salieron de fuente primaria (BPS
// 4774 y el texto VIGENTE del Decreto-Ley 14.407 + Decreto 7/976 + leyes 18.725, 19.003 y 20.075)
// y, sobre todo, protegen las DOS AUSENCIAS que la guía publica a propósito — la excepción por
// cirugía y los tres primeros días —, que son justo las que un editor de buena fe "completa" con un
// dato que no existe.
//
// (Este comentario decía "BPS 4802/4774". 4802 es la página del subsidio por DESEMPLEO, la que usa
// `utils/unemploymentBenefit.ts`: ni una cifra de esta guía sale de ahí. Corregido 2026-08-10 — un
// archivo que audita procedencias no puede documentar una procedencia falsa.)
// ---------------------------------------------------------------------------

describe('subsidio por enfermedad › cifras verificadas en fuente primaria', () => {
  const SLUG = 'me-certifique-subsidio-por-enfermedad-uruguay'

  it('la guía existe y está en el catálogo', () => {
    expect(getGuide(SLUG), 'falta la guía del subsidio por enfermedad').toBeDefined()
  })

  it('publica el 70 %, la base de cálculo y los dos topes', () => {
    const text = guideText(SLUG)
    expect(text).toMatch(/70\s*%/)
    expect(text).toMatch(/materia gravada/i)
    expect(text).toMatch(/180 días/)
    expect(text).toMatch(/67\.754/)
    expect(text).toMatch(/40\.655/)
  })

  // Cifra que caduca: BPS mueve los topes cada enero. Ningún bloque puede publicar un importe
  // suelto, sin la vigencia pegada al lado.
  it('nunca publica un tope sin su fecha de vigencia en el mismo bloque', () => {
    const offenders = guideBlocks(SLUG)
      .filter(b => /67\.754|40\.655/.test(b.texto))
      .filter(b => !/01\/2026|enero de 2026/i.test(b.texto))
      .map(b => `${SLUG} › ${b.donde}`)
    expect(offenders).toEqual([])
  })

  // La trampa que ya mordió a `unemploymentBenefit.ts`: el art. 27 escribe el máximo como "el
  // triple del salario mínimo nacional" y esa unidad NO gobierna. La Ley 19.003 art. 2 lit. A lo
  // nombra expresamente, y su art. 1 vigente (redacción del art. 739 de la Ley 19.924) lo indexa
  // por BPC desde el 1/1/2021. El guard exige que el art. 27 nunca aparezca como fórmula usable.
  it('desactiva el tope del art. 27 en vez de invitar a calcularlo', () => {
    const text = guideText(SLUG)
    expect(text).toMatch(/triple del monto del salario mínimo nacional/)
    expect(text).toMatch(/19\.003/)
    expect(text).toMatch(/Base de Prestaciones y Contribuciones/)
    expect(text).toMatch(/no lo calcules/i)
    const offenders = guideBlocks(SLUG)
      .filter(b => /triple del monto del salario mínimo/i.test(b.texto))
      .filter(b => !/19\.003/.test(b.texto))
      .map(b => `${SLUG} › ${b.donde}`)
    expect(offenders).toEqual([])
  })

  it('publica el cuarto día y la internación como su única excepción', () => {
    const text = guideText(SLUG)
    expect(text).toMatch(/cuarto día/i)
    expect(text).toMatch(/internación/i)
    expect(text).toMatch(/primer día/i)
  })
})

describe('subsidio por enfermedad › las dos ausencias que se publican a propósito', () => {
  const SLUG = 'me-certifique-subsidio-por-enfermedad-uruguay'

  // AUSENCIA 1. El hueco llegó pedido como «la excepción por internación o intervención
  // quirúrgica». La cirugía NO existe como causal autónoma: el art. 14 habla de hospitalización
  // ("no habrá período de pérdida del subsidio, a partir de la internación"), BPS la extiende al
  // domicilio, y el Decreto 7/976 no la menciona — ahí "quirúrgica" aparece sólo dentro de
  // "asistencia médica, quirúrgica y medicación", que es la prestación de salud, no el disparador
  // del pago. Se publica la regla real y la ausencia; no la tranquilidad inventada.
  it('nunca nombra la cirugía sin decir que la puerta es la internación', () => {
    const offenders = guideBlocks(SLUG)
      .filter(b => /quirúrgic|cirugía|operan\b|me operan/i.test(b.texto))
      .filter(b => !/internación/i.test(b.texto))
      .map(b => `${SLUG} › ${b.donde}`)
    expect(offenders).toEqual([])
  })

  it('dice con todas las letras que la cirugía no figura como causal aparte', () => {
    const text = guideText(SLUG)
    expect(text).toMatch(/ninguna de las tres fuentes/i)
    expect(text).toMatch(/intervención quirúrgica no figura como causal aparte/i)
  })

  // AUSENCIA 2. Ni el Decreto-Ley 14.407 ni el Decreto 7/976 ponen los tres primeros días a cargo
  // del empleador: quedan fuera de la prestación y nada más. Afirmar que la empresa "los debe" es
  // inventar una obligación patronal; el texto manda a mirar el convenio.
  it('no le inventa al empleador la obligación de pagar los tres primeros días', () => {
    const text = guideText(SLUG)
    expect(text).toMatch(/tres primeros días/i)
    expect(text).toMatch(/7\/976/)
    expect(text).toMatch(/convenio colectivo/i)
    expect(text).not.toMatch(
      /(?:la empresa|el empleador)[^.]{0,40}(?:debe|tiene que|está obligad\w+ a)[^.]{0,40}(?:pagar|abonar)[^.]{0,40}(?:tres|3) primeros días/i
    )
  })
})

describe('subsidio por enfermedad › el artículo 23 y el plazo del subsidio', () => {
  const SLUG = 'me-certifique-subsidio-por-enfermedad-uruguay'

  it('publica la prohibición, los treinta días y su disparador', () => {
    const text = guideText(SLUG)
    expect(text).toMatch(/no podrán despedir ni suspender/i)
    expect(text).toMatch(/treinta días/i)
    expect(text).toMatch(/veinticuatro horas hábiles/i)
    expect(text).toMatch(/doble de la normal/i)
    expect(text).toMatch(/notoria mala conducta/i)
  })

  // La sobrecorrección posible es leer "no podrán despedir" como nulidad. El art. 23 no anula el
  // despido ni manda reinstalar: tarifa la violación en el doble de la indemnización.
  it('no promete nulidad del despido ni reinstalación', () => {
    const text = guideText(SLUG)
    expect(text).toMatch(/no dice que el despido sea nulo/i)
    expect(text).not.toMatch(/el despido es nulo/i)
  })

  it('publica el plazo, la prórroga y el final del amparo', () => {
    const text = guideText(SLUG)
    expect(text).toMatch(/votación unánime/i)
    expect(text).toMatch(/unidad de dolencia/i)
    expect(text).toMatch(/sin indemnización/i)
    expect(text).toMatch(/ciento ochenta días/i)
  })

  it('separa lo que la certificación conserva de lo que recorta', () => {
    const text = guideText(SLUG)
    expect(text).toMatch(/como si realmente hubiera trabajado/i)
    expect(text).toMatch(/proporcional al período trabajado/i)
    expect(text).toMatch(/salario vacacional/i)
    expect(text).toMatch(/no es acumulable/i)
  })

  // Las dos ASSE. La de 1975 es la "Administración de los Seguros Sociales por Enfermedad" que
  // creó el art. 1 del decreto-ley (y por eso la norma dice "ASSE" en cada artículo); la de hoy es
  // la "Administración de los Servicios de Salud del Estado", Ley 18.161 de 2007. Sin la
  // aclaración, cualquiera que abra IMPO cree que su prestador le paga el subsidio.
  it('desambigua las dos ASSE', () => {
    const text = guideText(SLUG)
    expect(text).toMatch(/Administración de los Seguros Sociales por Enfermedad/)
    expect(text).toMatch(/Administración de los Servicios de Salud del Estado/)
    expect(sourceUrls(SLUG)).toContain('https://www.impo.com.uy/bases/leyes/18161-2007/1')
  })

  it('marca el borde del sector público con sus propios números', () => {
    const text = guideText(SLUG)
    expect(text).toMatch(/20\.075/)
    expect(text).toMatch(/20\.446/)
    expect(text).toMatch(/doce días/i)
    expect(text).toMatch(/decimotercer día/i)
    expect(text).toMatch(/75\s*%/)
    expect(text).toMatch(/100\s*%/)
  })
})

describe('subsidio por enfermedad › cada norma invocada tiene su fuente', () => {
  const SLUG = 'me-certifique-subsidio-por-enfermedad-uruguay'

  it.each([9, 10, 13, 14, 15, 16, 17, 21, 22, 23, 24, 25, 27, 28])(
    'cita el art. %i del Decreto-Ley 14.407',
    art => {
      expect(sourceUrls(SLUG)).toContain(
        `https://www.impo.com.uy/bases/decretos-ley/14407-1975/${art}`
      )
    }
  )

  it.each([
    'https://www.impo.com.uy/bases/decretos/7-1976/10',
    'https://www.impo.com.uy/bases/decretos/7-1976/12',
    'https://www.impo.com.uy/bases/leyes/19003-2012/1',
    'https://www.impo.com.uy/bases/leyes/19003-2012/2',
    'https://www.impo.com.uy/bases/leyes/20075-2022/13',
    'https://www.impo.com.uy/bases/leyes/20075-2022/14',
    'https://www.impo.com.uy/bases/leyes/20075-2022/15',
    'https://www.impo.com.uy/bases/leyes/20075-2022/18',
    'https://www.impo.com.uy/bases/leyes/20446-2025/3',
    'https://www.bps.gub.uy/4774/subsidio-por-enfermedad.html',
  ])('cita %s', url => {
    expect(sourceUrls(SLUG)).toContain(url)
  })

  // IMPO sirve dos versiones y `/…-originales/` puede estar derogada y decir LO CONTRARIO. Ningún
  // enlace de esta guía puede apuntar ahí.
  it('nunca enlaza la versión original de IMPO, sólo el texto vigente', () => {
    const offenders = sourceUrls(SLUG).filter(u => /-originales\//.test(u))
    expect(offenders).toEqual([])
  })

  it('enlaza al seguro de paro, que es la otra mitad de la misma pregunta', () => {
    const links = (getGuide(SLUG)?.related ?? []).map(l => l.to)
    expect(links).toContain('/seguro-de-paro-uruguay')
  })
})

// ---------------------------------------------------------------------------
// Auditoría 2026-08-10 sobre la guía del subsidio por enfermedad.
//
// Todo lo de acá abajo se releyó en fuente primaria antes de tocar una coma. El patrón que se
// repite es siempre el mismo: la guía citaba bien un texto y se detenía UN ESLABÓN ANTES del que
// manda hoy.
// ---------------------------------------------------------------------------

describe('subsidio por enfermedad › la Ley 18.725 es el eslabón que faltaba', () => {
  const SLUG = 'me-certifique-subsidio-por-enfermedad-uruguay'

  // BASE DE CÁLCULO. La guía publicaba como divergencia sin resolver entre la norma y el BPS algo
  // que el art. 2 de la Ley 18.725 zanjó desde el 1/1/2011: "serán remuneraciones computables […]
  // todas las que constituyan materia gravada". El art. 13 num. 2 es la base ORIGINAL de 1975. El
  // BPS no liquida con criterio propio, liquida la ley vigente — y mandar al lector a pedir
  // liquidaciones para dirimirlo le instalaba la sospecha de que el organismo se aparta de la norma.
  it('no deja la base de cálculo como una divergencia que el lector deba dirimir', () => {
    const text = guideText(SLUG)
    expect(text).not.toMatch(/pedí el detalle de la liquidación en lugar de deducirla/i)
    expect(text).not.toMatch(/vale marcar una diferencia/i)
  })

  it('el bloque que nombra el art. 13 num. 2 cita también la ley que lo sustituyó', () => {
    const offenders = guideBlocks(SLUG)
      .filter(b => /art\.\s*13,\s*numeral 2/i.test(b.texto))
      .filter(b => !/18\.725/.test(b.texto))
      .map(b => `${SLUG} › ${b.donde}`)
    expect(offenders).toEqual([])
  })

  it('publica la fecha y el texto de la sustitución', () => {
    const text = guideText(SLUG)
    expect(text).toMatch(/1º de enero de 2011/)
    expect(text).toMatch(/serán remuneraciones computables/i)
    expect(sourceUrls(SLUG)).toContain('https://www.impo.com.uy/bases/leyes/18725-2010/2')
  })

  // TOPE. La cadena publicada saltaba del art. 27 (triple del SMN, 1975) directo a la Ley 19.003.
  // Quien cambió la UNIDAD fue la Ley 18.725 art. 1 (4 BPC en 2011 → 8 BPC en 2015); la 19.003 sólo
  // INDEXA un tope ya expresado en BPC, y por eso su art. 2 lit. A dice "con las modificaciones de
  // la Ley Nº 18.725". Sin ese eslabón, el "y este es el motivo" no cierra.
  it('el bloque del tope encadena art. 27 → Ley 18.725 → Ley 19.003, en ese orden', () => {
    const bloque = guideBlocks(SLUG).find(b => /triple del monto del salario mínimo/i.test(b.texto))
    expect(bloque, 'falta el bloque que desactiva el art. 27').toBeDefined()
    const t = bloque!.texto
    expect(t).toMatch(/18\.725/)
    expect(t).toMatch(/19\.003/)
    expect(t).toMatch(/8 BPC/)
    expect(t.indexOf('18.725')).toBeLessThan(t.indexOf('19.003'))
  })

  it('cita el art. 1 de la Ley 18.725, que es donde el tope pasa a BPC', () => {
    expect(sourceUrls(SLUG)).toContain('https://www.impo.com.uy/bases/leyes/18725-2010/1')
  })
})

describe('subsidio por enfermedad › en el Estado no paga el BPS', () => {
  const SLUG = 'me-certifique-subsidio-por-enfermedad-uruguay'

  // El rango publicado ("arts. 13 a 19") cortaba justo antes del art. 20, que es el que responde la
  // pregunta del título para el sector público: el subsidio "estará a cargo del organismo al que
  // pertenece el funcionario". La Sección II de la Ley 20.075 va del 13 al 29 (24 = pérdida del
  // derecho, 25 = instrumentación, 29 = derogaciones); el 26 ya es el cronograma de incorporación.
  it('ya no cierra el régimen público en el artículo 19', () => {
    expect(guideText(SLUG)).not.toMatch(/13 a 19/)
  })

  it('publica el rango completo de la Sección II', () => {
    expect(guideText(SLUG)).toMatch(/13 a 29/)
  })

  it('dice que en el sector público paga el organismo empleador, no el BPS', () => {
    const text = guideText(SLUG)
    expect(text).toMatch(/a cargo del organismo al que pertenece el funcionario/i)
    expect(sourceUrls(SLUG)).toContain('https://www.impo.com.uy/bases/leyes/20075-2022/20')
  })

  // La primera sección de la guía se titula "no es tu empresa, es el BPS". Si la sección del Estado
  // no corrige esa premisa EN SU PROPIO BLOQUE, el funcionario se va creyendo que le paga el BPS.
  it('la corrección viaja en el mismo bloque que el régimen público', () => {
    // Sólo los bloques que EXPLICAN el régimen (los que lo delimitan por su rango de artículos), no
    // los que se limitan a nombrar la ley como procedencia de un dato.
    const offenders = guideBlocks(SLUG)
      .filter(b => /13 a 29/.test(b.texto))
      .filter(b => !/no (?:paga|lo paga) el BPS|a cargo del organismo/i.test(b.texto))
      .map(b => `${SLUG} › ${b.donde}`)
    expect(offenders).toEqual([])
    expect(offenders.length + guideBlocks(SLUG).filter(b => /13 a 29/.test(b.texto)).length).toBe(2)
  })
})

describe('subsidio por enfermedad › los 4 años son la ventana, no el techo', () => {
  const SLUG = 'me-certifique-subsidio-por-enfermedad-uruguay'

  // BPS 4774 escribe el plazo de dos formas y la guía citaba sólo la ambigua ("hasta 4 años
  // interrumpidos por la misma dolencia"), que leída suelta publica el doble del máximo real. El
  // párrafo de apertura de la MISMA página lo acota a "2 años alternados dentro de los últimos 4
  // años", y el art. 15 confirma que los 4 años son el lapso en que los tramos se ACUMULAN.
  it('nunca cita los «4 años interrumpidos» sin la frase que los acota', () => {
    const offenders = guideBlocks(SLUG)
      .filter(b => /4 años interrumpidos/i.test(b.texto))
      .filter(b => !/2 años alternados dentro de los últimos 4 años/i.test(b.texto))
      .map(b => `${SLUG} › ${b.donde}`)
    expect(offenders).toEqual([])
  })

  it('dice explícitamente que los cuatro años son la ventana de acumulación', () => {
    const text = guideText(SLUG)
    expect(text).toMatch(/ventana/i)
    expect(text).toMatch(/máximo a cobrar son dos años/i)
  })
})

describe('subsidio por enfermedad › citas completas y obligaciones bien contadas', () => {
  const SLUG = 'me-certifique-subsidio-por-enfermedad-uruguay'

  // Los requisitos van separados como los separa BPS: la coletilla de "una o más empresas […]
  // consecutivos o interrumpidamente" es SÓLO del mensual, y al jornalero el año se le cuenta desde
  // su último día trabajado, no desde la enfermedad.
  it('separa los requisitos del jornalero y del mensual con su propio punto de partida', () => {
    const text = guideText(SLUG)
    expect(text).toMatch(
      /75 jornales efectivos, trabajados en el año anterior a la fecha del último día trabajado/i
    )
    expect(text).toMatch(
      /3 meses de actividad efectiva en el año inmediato anterior a la enfermedad, en una o más empresas/i
    )
  })

  // Dos elisiones sin marcar dentro de comillas del art. 23. La primera borraba el sujeto que
  // otorga el alta en una guía que dedica un párrafo a explicar cuál ASSE es cuál.
  it('cita el art. 23 sin recortar el sujeto del alta ni el segundo destinatario', () => {
    const text = guideText(SLUG)
    expect(text).toMatch(/dado de alta por ASSE/)
    expect(text).toMatch(/SENADEMP/)
  })

  // "Tu única obligación formal" contradecía al paso 4 de la propia guía (presentarse dentro de las
  // 24 horas hábiles del alta, Decreto 7/976 art. 10), que es la obligación cuyo incumplimiento
  // borra el punto de partida documentado de los treinta días del art. 23.
  it('no llama «única obligación formal» a la primera de dos', () => {
    const text = guideText(SLUG)
    expect(text).not.toMatch(/única obligación formal/i)
    expect(text).toMatch(/veinticuatro horas hábiles/i)
  })

  // Único enunciado jurídico de la guía que estaba sin norma al lado. El dato es correcto y otra
  // guía del mismo archivo ya lo atribuye bien.
  it('atribuye la interrupción de la prescripción a la Ley 18.091 art. 3', () => {
    const text = guideText(SLUG)
    expect(text).toMatch(/18\.091/)
    expect(text).toMatch(/interrumpe la prescripción/i)
    expect(sourceUrls(SLUG)).toContain('https://www.impo.com.uy/bases/leyes/18091-2007/3')
  })
})

// ---------------------------------------------------------------------------
// Ampliaciones a guías existentes (2026-08-10)
//
// Tres huecos medidos contra el barrido de Reddit. Los guards no testean redacción: fijan lo que
// salió de fuente primaria y, sobre todo, protegen las inversiones de regla que un editor de buena
// fe "arregla" en el sentido equivocado — quién prueba en el despido indirecto, que el mínimo de la
// doméstica NO se publica en pesos, y que una empresa del exterior SÍ puede quedar inscripta.
// ---------------------------------------------------------------------------

describe('ampliación › despido indirecto en la guía donde le está pasando', () => {
  const SLUG = 'despido-y-liquidacion-uruguay'

  it('la figura ya no vive sólo en la guía de llegar tarde', () => {
    expect(guideText(SLUG)).toMatch(/despido indirecto/i)
  })

  it('publica la ausencia de norma general y la marca como construcción jurisprudencial', () => {
    const text = guideText(SLUG)
    expect(text).toMatch(/no hay una ley general que lo regule/i)
    expect(text).toMatch(/construcción de doctrina y jurisprudencia/i)
    // El sitio ya usa esa misma salvedad para el ius variandi: se nombra para que se lea igual.
    expect(text).toMatch(/ius variandi/i)
  })

  // La ausencia se afirma sobre dos páginas del MTSS que se leyeron: el índice de temas y la ficha
  // del régimen común. Si alguien borra las fuentes, la afirmación se queda sin respaldo.
  it('respalda la ausencia con las dos páginas del MTSS que se leyeron', () => {
    const urls = sourceUrls(SLUG)
    expect(urls).toContain(
      'https://www.gub.uy/ministerio-trabajo-seguridad-social/institucional/derecho-laboral-uruguayo/despido-regimen-comun'
    )
    expect(urls).toContain(
      'https://www.gub.uy/ministerio-trabajo-seguridad-social/politicas-y-gestion/derecho-laboral-uruguayo'
    )
  })

  it('exige gravedad y descarta que cualquier incumplimiento alcance', () => {
    const text = guideText(SLUG)
    expect(text).toMatch(/no es necesario demostrar una intencionalidad/i)
    expect(text).toMatch(/no todo incumplimiento causa mecánicamente/i)
    expect(text).toMatch(/objetivamente valuables/i)
    expect(text).toMatch(/no deben confundirse con estados síquicos/i)
  })

  // LA INVERSIÓN DE LA CARGA es el dato que evita que alguien renuncie creyendo que cobra seguro.
  // En el despido común prueba el EMPLEADOR (Ley 12.597 art. 10); en el indirecto, el trabajador.
  it('publica la inversión de la carga de la prueba con sus dos anclajes', () => {
    const text = guideText(SLUG)
    expect(text).toMatch(
      /el empleador deberá probar los hechos constitutivos de la notoria mala conducta/i
    )
    expect(text).toMatch(
      /es el trabajador quien debe probar los graves incumplimientos patronales/i
    )
    expect(text).toMatch(/139\.1/)
    const urls = sourceUrls(SLUG)
    expect(urls).toContain('https://www.impo.com.uy/bases/leyes/12597-1958/10')
    expect(urls).toContain('https://www.impo.com.uy/bases/codigo-general-proceso/15982-1988/139')
  })

  // Ningún bloque que le prometa plata al lector por esta vía puede omitir que la prueba es SUYA:
  // la consecuencia de perder es no cobrar nada, porque para el expediente renunció. "Salvo prueba
  // en contrario" (la presunción del art. 12 de la 18.561) NO cuenta como cumplir esto: es otra
  // regla, de otro caso, y por eso el guard pide el verbo en segunda persona o la atribución.
  const CARGA = /prob(?:ar|ás)|pruebes/i
  it('ningún bloque promete cobrar por despido indirecto sin decir quién prueba', () => {
    const offenders = guideBlocks(SLUG)
      .filter(b => /despido indirecto|considerarte despedido|considerarse despedido/i.test(b.texto))
      .filter(b => /cobr|indemnización/i.test(b.texto))
      .filter(b => !CARGA.test(b.texto))
      .map(b => `${SLUG} › ${b.donde}`)
    expect(offenders).toEqual([])
  })

  it('contesta la intimación previa sin inventar un requisito legal', () => {
    const text = guideText(SLUG)
    expect(text).toMatch(/ninguna norma (?:te )?(?:lo )?exig/i)
    expect(text).toMatch(/razonable proporcionalidad/i)
    expect(text).toMatch(/agotar los medios a su alcance/i)
  })

  it('dice que se cobra la común y nombra los dos casos donde la ley agrega algo', () => {
    const text = guideText(SLUG)
    expect(text).toMatch(/misma indemnización/i)
    expect(text).toMatch(/acumulable a la indemnización común/i)
    expect(text).toMatch(/ciento ochenta días/i)
    expect(text).toMatch(/trabajo reducido/i)
    const urls = sourceUrls(SLUG)
    expect(urls).toContain('https://www.impo.com.uy/bases/leyes/18561-2009/11')
    expect(urls).toContain('https://www.impo.com.uy/bases/leyes/18561-2009/12')
    expect(urls).toContain('https://www.impo.com.uy/bases/decretos-ley/15180-1981/9')
  })

  // La atribución importa: lo leído son sentencias de los Tribunales de Apelaciones del Trabajo en
  // la BJN, no de la Suprema Corte. Atribuirlo mal sería una cita falsa.
  //
  // CORRECCIÓN 2026-08-10 — y es la razón de ser de este guard. La versión anterior exigía que el
  // cuerpo dijera «116/2011» y «174/2025» contra una sola URL: la de la BJN. Esa URL es el
  // FORMULARIO de búsqueda (app JSF con jsessionid: sin sesión ni JS no devuelve un resultado), así
  // que ninguna de las frases citadas estaba en la página que las respaldaba. Peor: las dos frases
  // de la definición aparecen atribuidas públicamente a T.A.T. 2.º T. Nº 389/2002 y T.A.T. 3.º T.
  // Nº 380/2011, y ni 116/2011 ni 174/2025 se encuentran en la web abierta ni en vLex. No pudiendo
  // confirmar el número correcto, se publica la AUSENCIA: se conserva la atribución al tribunal
  // —que sí se sostiene— y se saca el número, diciendo por qué. Un test que exige un número de
  // sentencia que nadie puede abrir no protege una cita: la fija.
  // El guard descuenta la forma NEGADA («no la Suprema Corte»), que es la única manera de decirle al
  // lector por qué la cita va al tribunal de apelaciones, y después busca menciones afirmativas:
  // atribuirle a la Corte lo que dijo un T.A.T. seguiría siendo una cita falsa.
  const NIEGA_SCJ = /no (?:de )?la Suprema Corte/gi
  it('atribuye al tribunal pero NO publica números de sentencia que la BJN no deja verificar', () => {
    const text = guideText(SLUG)
    expect(text).toMatch(/Tribunal(?:es)? de Apelaciones del Trabajo/i)
    expect(text.replace(NIEGA_SCJ, '')).not.toMatch(/Suprema Corte/i)
    // Los dos números que estaban mal citados no pueden volver.
    expect(text).not.toMatch(/116\/2011/)
    expect(text).not.toMatch(/174\/2025/)
    // Y tampoco ningún otro, mientras la fuente siga siendo un buscador sin enlace por fallo.
    const numeradas = guideBlocks(SLUG)
      .filter(b =>
        /sentencia\s+(?:n\.?[º°]?\s*)?\d+\/\d{4}|\d+\/\d{4}\s+del\s+Tribunal|Turno,?\s+\d+\/\d{4}/i.test(
          b.texto
        )
      )
      .map(b => `${SLUG} › ${b.donde}`)
    expect(numeradas).toEqual([])
  })

  // Publicar la ausencia es parte de la corrección: si el lector no sabe POR QUÉ no hay número, lee
  // una cita floja en vez de una limitación de la fuente, y no sabe cómo llegar al texto él mismo.
  it('explica por qué no hay número de sentencia y describe la BJN como lo que es', () => {
    const text = guideText(SLUG)
    expect(text).toMatch(/no (?:publicamos|damos) número de sentencia/i)
    expect(text).toMatch(/enlace permanente/i)
    expect(text).toMatch(/buscando «despido indirecto»/i)

    const bjn = (getGuide(SLUG)?.sources ?? []).find(s =>
      s.url.includes('bjn.poderjudicial.gub.uy')
    )
    expect(
      bjn,
      'la BJN sigue siendo el canal: la fuente no se borra, se describe bien'
    ).toBeDefined()
    // La etiqueta no puede seguir prometiendo «salen las sentencias citadas acá»: es un formulario.
    expect(bjn!.label).toMatch(/buscador/i)
    expect(bjn!.label).not.toMatch(/116\/2011|174\/2025/)
  })

  // El paso previo y la interrupción de la prescripción son afirmaciones jurídicas categóricas, y
  // estaban sin una sola norma al lado en la única guía del tema que tiene card de Fuentes — cuando
  // el propio sitio ya las ancla en la guía de horas extra. Acá se nombran y se citan.
  it('nombra la norma del paso previo obligatorio y la de la interrupción de la prescripción', () => {
    const offenders = guideBlocks(SLUG)
      .filter(b => /paso previo obligatorio|conciliación (?:previa|en el MTSS)/i.test(b.texto))
      .filter(b => !/18\.572/.test(b.texto) || !/18\.091/.test(b.texto))
      .map(b => `${SLUG} › ${b.donde}`)
    expect(offenders).toEqual([])

    const urls = sourceUrls(SLUG)
    expect(urls).toContain('https://www.impo.com.uy/bases/leyes/18572-2009/3')
    expect(urls).toContain('https://www.impo.com.uy/bases/leyes/18091-2007/3')
  })
})

// ---------------------------------------------------------------------------
// CORRECCIÓN 2026-08-10 — EL TOPE DE SEIS MENSUALIDADES ES DEL MENSUAL.
//
// El art. 7 de la Ley 18.065 nombra a los dos colectivos («tanto mensuales como jornaleros») y
// remite «en lo demás» a las normas generales sobre despido. La guía leía esa remisión como si las
// normas generales fueran una sola y le aplicaba a la jornalera el tope del mensual. La ficha del
// MTSS que la propia guía ya citaba dice lo contrario: el jornalero cobra «25 jornales por año de
// trabajo, si en el año han completado 240 jornadas» (o «2 jornales cada 25 trabajados» si no las
// completó), con «150 jornales como máximo», y «si no ha llegado a trabajar 100 jornales, no nace
// el derecho a la indemnización».
//
// No es nicho: en casa de familia la jornalera de dos o tres días por semana es lo más común, y es
// justo quien puede quedar por debajo de las 100 jornadas. Un empleador que liquidara con la
// versión vieja pagaba mal y una trabajadora reclamaba un número que no le correspondía.
// ---------------------------------------------------------------------------
describe('corrección › el tope de seis mensualidades es del mensual, no del jornalero', () => {
  const SLUG = 'despido-y-liquidacion-uruguay'

  // EL GUARD CENTRAL: el tope nunca viaja solo. Donde se nombra, tiene que estar el otro régimen.
  //
  // OJO CON CÓMO SE MIDE «está el otro régimen»: pedir /jornal/ NO alcanza y probarlo importa. El
  // bloque equivocado decía «Lo dice la Ley 18.065 art. 7 para mensuales y jornaleros […] con el
  // mismo tope de seis mensualidades» — o sea que NOMBRABA al jornalero y acto seguido le aplicaba
  // el tope del mensual. Un guard por la palabra habría pasado justo sobre el error que existe. Lo
  // que tiene que estar es el régimen en sí: nombrado, o con sus números.
  const TOPE = /seis mensualidades|tope de seis\b/i
  const REGIMEN_JORNALES = /régimen en jornales|25 jornales|150 jornales/i
  it('ningún bloque publica el tope de seis mensualidades sin el régimen en jornales al lado', () => {
    const offenders = guideBlocks(SLUG)
      .filter(b => TOPE.test(b.texto))
      .filter(b => !REGIMEN_JORNALES.test(b.texto))
      .map(b => `${SLUG} › ${b.donde}`)
    expect(offenders).toEqual([])
  })

  it('publica los cuatro números del régimen en jornales que da el MTSS', () => {
    const text = guideText(SLUG)
    expect(text).toMatch(/25 jornales por año/i)
    expect(text).toMatch(/240 jornadas/)
    expect(text).toMatch(/150 jornales/)
    expect(text).toMatch(/100 jornales/)
    expect(sourceUrls(SLUG)).toContain(
      'https://www.gub.uy/ministerio-trabajo-seguridad-social/institucional/derecho-laboral-uruguayo/despido-regimen-comun'
    )
  })

  // El piso es el dato que más duele omitir: por debajo de 100 jornales NO nace el derecho, así que
  // quien lea sólo el tope se lleva la mitad de la regla.
  it('dice que por debajo de 100 jornales no nace el derecho', () => {
    expect(guideText(SLUG)).toMatch(
      /no nace el derecho a la indemnización|ninguna indemnización si no llegó a trabajar 100 jornales|nada por debajo de 100 jornales/i
    )
  })

  // Donde se cruza con el doméstico, que es donde el error pegaba más fuerte.
  it('el bloque del despido de la doméstica distingue mensual de jornalera', () => {
    const offenders = guideBlocks(SLUG)
      .filter(b => /doméstic|casa de familia|empleada/i.test(b.texto))
      .filter(b => /noventa días corridos|90 días corridos/i.test(b.texto))
      .filter(b => !REGIMEN_JORNALES.test(b.texto))
      .map(b => `${SLUG} › ${b.donde}`)
    expect(offenders).toEqual([])
  })

  // La etiqueta de la fuente es donde el lector ve el texto presentado COMO cita del MTSS: si ahí
  // el jornalero aparece recortado, el card de Fuentes desmiente al cuerpo.
  it('la etiqueta del MTSS trae el régimen del jornalero completo, no sólo los 25 jornales', () => {
    const mtss = (getGuide(SLUG)?.sources ?? []).find(s => s.url.includes('despido-regimen-comun'))
    expect(mtss).toBeDefined()
    expect(mtss!.label).toMatch(/240 jornadas/)
    expect(mtss!.label).toMatch(/150 jornales/)
    expect(mtss!.label).toMatch(/100 jornales/)
  })

  // MTSS publica TRES plazos de pago según modalidad. La etiqueta traía sólo el del mensual, sin el
  // calificador que el cuerpo sí tenía: el empleador de una jornalera leía el plazo equivocado justo
  // en el único lugar donde el texto se presenta como cita de la fuente.
  it('la etiqueta del MTSS de trabajo doméstico no da el plazo del mensual como si fuera el único', () => {
    const mtss = (getGuide(SLUG)?.sources ?? []).find(s => s.url.includes('trabajo-domestico'))
    expect(mtss).toBeDefined()
    expect(mtss!.label).toMatch(/5 días hábiles/)
    expect(mtss!.label).toMatch(/mensual/i)
    expect(mtss!.label).toMatch(/quincena/i)
    expect(mtss!.label).toMatch(/semana/i)
  })

  it('el cuerpo tampoco publica el plazo de pago sin decir de qué modalidad es', () => {
    const offenders = guideBlocks(SLUG)
      .filter(b => /5 días hábiles/i.test(b.texto))
      .filter(b => !/mensual/i.test(b.texto))
      .map(b => `${SLUG} › ${b.donde}`)
    expect(offenders).toEqual([])
  })
})

describe('ampliación › trabajo doméstico: el régimen que va por otro lado', () => {
  const SLUG = 'despido-y-liquidacion-uruguay'

  it('nombra la ley del sector y su decreto reglamentario', () => {
    const text = guideText(SLUG)
    expect(text).toMatch(/18\.065/)
    expect(text).toMatch(/224\/007/)
  })

  it('publica jornada y los descansos propios de con y sin retiro', () => {
    const text = guideText(SLUG)
    expect(text).toMatch(/ocho horas diarias/i)
    expect(text).toMatch(/cuarenta y cuatro horas semanales/i)
    expect(text).toMatch(/con retiro/i)
    expect(text).toMatch(/sin retiro/i)
    expect(text).toMatch(/treinta y seis horas ininterrumpidas/i)
    expect(text).toMatch(/nueve horas continuas/i)
  })

  // El dato que cambia la liquidación: antes de los 90 días corridos NO hay indemnización.
  it('publica los noventa días corridos del art. 7 y su remisión al régimen general', () => {
    const text = guideText(SLUG)
    expect(text).toMatch(/noventa días corridos/i)
    expect(text).toMatch(/rigiéndose en lo demás por las normas generales sobre despido/i)
    expect(sourceUrls(SLUG)).toContain('https://www.impo.com.uy/bases/leyes/18065-2006/7')
  })

  it('nunca menciona el despido de la doméstica sin el umbral de los 90 días', () => {
    const offenders = guideBlocks(SLUG)
      .filter(b => /doméstic/i.test(b.texto))
      .filter(b => /indemnización por despido/i.test(b.texto))
      .filter(b => !/noventa días corridos/i.test(b.texto))
      .map(b => `${SLUG} › ${b.donde}`)
    expect(offenders).toEqual([])
  })

  it('publica el registro en BPS con su plazo y su multa', () => {
    const text = guideText(SLUG)
    expect(text).toMatch(/10 días antes y hasta la fecha de ingreso/i)
    expect(text).toMatch(/multas de 1 UR/i)
    expect(text).toMatch(/Banco de Seguros del Estado/i)
    expect(sourceUrls(SLUG)).toContain(
      'https://www.bps.gub.uy/10805/ingreso-de-trabajador-domestico.html'
    )
  })

  // EL MÍNIMO EN PESOS CADUCA POR RONDA: se publica el canal, no la cifra. El guard busca importes
  // en pesos, NO cualquier número con separador de miles: la primera versión marcaba "Ley 11.577" y
  // "Ley Nº 10.449" como si fueran plata, que es exactamente el falso positivo que vuelve inútil a
  // un guard. Lo que no puede aparecer es un importe.
  it('no publica el mínimo de la doméstica en pesos: publica el canal', () => {
    const text = guideText(SLUG)
    expect(text).toMatch(/Grupo 21 del Consejo de Salarios/i)
    expect(text).toMatch(/cuidados, general y cocina/i)
    expect(text).toMatch(/1\.° de julio de 2026|1\.º de julio de 2026/)
    const offenders = guideBlocks(SLUG)
      .filter(b =>
        /grupo 21|laudo|categorías laborales|salario mínimo|sueldo mínimo/i.test(b.texto)
      )
      .filter(b => /\$\s?\d/.test(b.texto))
      .map(b => `${SLUG} › ${b.donde}`)
    expect(offenders).toEqual([])
  })

  it('cita la ley artículo por artículo y las páginas de BPS y MTSS', () => {
    const urls = sourceUrls(SLUG)
    for (const art of [2, 3, 4, 5, 6, 7, 8, 11, 12, 13]) {
      expect(urls).toContain(`https://www.impo.com.uy/bases/leyes/18065-2006/${art}`)
    }
    expect(urls).toContain('https://www.impo.com.uy/bases/decretos/224-2007')
    expect(urls).toContain('https://www.bps.gub.uy/10809/guia-de-aportacion.html')
    expect(urls).toContain('https://www.bps.gub.uy/4789/remuneraciones.html')
    expect(urls).toContain(
      'https://www.bps.gub.uy/24308/nuevas-categorias-laborales-para-trabajo-domestico.html'
    )
    expect(urls).toContain(
      'https://www.gub.uy/ministerio-trabajo-seguridad-social/politicas-y-gestion/trabajo-domestico'
    )
  })
})

describe('ampliación › empresas del exterior, BPS y CFE', () => {
  const SLUG = 'trabajar-para-el-exterior-desde-uruguay'

  // El mito era "sólo una entidad local puede ser empleador". El trámite del BPS existe y dice lo
  // contrario, así que el guard exige la afirmación positiva Y su fuente.
  it('desarma el mito de que sólo una entidad local puede inscribirse', () => {
    const text = guideText(SLUG)
    expect(text).toMatch(/sin establecimiento permanente/i)
    expect(text).toMatch(/REC\. 211/)
    expect(text).toMatch(/dentro del mes en curso de inicio de actividades/i)
    expect(sourceUrls(SLUG)).toContain(
      'https://www.bps.gub.uy/20844/inscribir-dependientes-de-empresas-extranjeras-sin-establecimiento-en-el-pais.html'
    )
  })

  it('explica cómo se verifica, no sólo que exista el trámite', () => {
    const text = guideText(SLUG)
    expect(text).toMatch(/historia laboral nominada/i)
    expect(text).toMatch(/Consultar mis aportes/i)
    expect(text).toMatch(/1\/4\/1996/)
    expect(text).toMatch(/código QR/i)
    expect(sourceUrls(SLUG)).toContain(
      'https://www.bps.gub.uy/11438/constancia-de-historia-laboral-nominada.html'
    )
  })

  // Encargo explícito: NO comparar plataformas, porque cambia por producto y por país. El guard
  // prohíbe además que una tabla de la guía las nombre.
  it('no compara plataformas y dice por qué', () => {
    const text = guideText(SLUG)
    expect(text).toMatch(/no vamos a hacer acá es comparar plataformas|No comparamos plataformas/i)
    const guide = getGuide(SLUG)!
    const offenders = guide.sections
      .filter(s => s.table)
      .filter(s => /deel|payoneer/i.test(JSON.stringify(s.table)))
      .map(s => `${SLUG} › ${s.heading}`)
    expect(offenders).toEqual([])
  })

  it('publica la obligación de documentar con CFE y su calendario', () => {
    const text = guideText(SLUG)
    expect(text).toMatch(/debidamente documentadas/i)
    expect(text).toMatch(/36\/012/)
    expect(text).toMatch(/798\/2012/)
    expect(text).toMatch(/2548\/2023/)
    expect(text).toMatch(/1\/1\/2025|01\/01\/2025/)
    // El monotributo queda exceptuado: omitirlo mandaba a facturar electrónicamente a quien no debe.
    expect(text).toMatch(/[Mm]onotributo/)
    const urls = sourceUrls(SLUG)
    expect(urls).toContain(
      'https://www.gub.uy/direccion-general-impositiva/comunicacion/publicaciones/documentacion-operaciones-parte-contribuyentes'
    )
    expect(
      urls.some(u => u.includes('efactura.dgi.gub.uy') && u.includes('universalizacion'))
    ).toBe(true)
  })

  // CORRECCIÓN 2026-08-10 — LA LISTA DE EXCEPTUADOS VA COMPLETA O NO VA. La página de efactura
  // publica SIETE y la guía publicaba cinco, presentadas como enumeración cerrada («quedan fuera de
  // esa obligación los contribuyentes de…»). Faltaban dos, y una de ellas manda: quien realiza
  // exclusivamente actos de agregación de valor en la construcción sobre inmuebles leía que le
  // tocaba emitir CFE cuando la resolución lo exceptúa. La etiqueta de la fuente repetía el mismo
  // recorte, así que el lector que abría el card de Fuentes tampoco veía las que faltaban.
  const FALTANTES: ReadonlyArray<[string, RegExp]> = [
    ['agregación de valor en la construcción', /agregación de valor en la construcción/i],
    ['exonerados salvo usuarios de zona franca', /zona franca/i],
  ]
  it.each(FALTANTES)('el cuerpo publica el exceptuado que faltaba: %s', (_, re) => {
    expect(guideText(SLUG)).toMatch(re)
  })

  it.each(FALTANTES)('la etiqueta de la fuente también lo publica: %s', (_, re) => {
    const efactura = (getGuide(SLUG)?.sources ?? []).find(s =>
      s.url.includes('efactura.dgi.gub.uy')
    )
    expect(efactura).toBeDefined()
    expect(efactura!.label).toMatch(re)
  })

  // Y que no vuelva a presentarse como cerrada estando incompleta: si alguien enumera exceptuados,
  // o están los siete o la enumeración queda abierta.
  it('no presenta la lista de exceptuados como cerrada si le falta alguno', () => {
    const offenders = guideBlocks(SLUG)
      .filter(b => /exceptuad|quedan fuera de esa obligación/i.test(b.texto))
      .filter(b => !/entre otras|siete/i.test(b.texto) || !/zona franca/i.test(b.texto))
      .map(b => `${SLUG} › ${b.donde}`)
    expect(offenders).toEqual([])
  })
})

describe('ampliaciones › ninguna fuente nueva apunta al texto original de IMPO', () => {
  // IMPO sirve dos versiones y `/…-originales/` puede estar derogada y decir LO CONTRARIO.
  it.each(['despido-y-liquidacion-uruguay', 'trabajar-para-el-exterior-desde-uruguay'])(
    '%s enlaza sólo texto vigente',
    slug => {
      expect(sourceUrls(slug).filter(u => /-originales\//.test(u))).toEqual([])
    }
  )
})

// ---------------------------------------------------------------------------
// CORRECCIÓN 2026-08-10 — el encabezado de `guidesReddit.ts` es el registro que las próximas
// sesiones van a creer cuando busquen duplicaciones o contradicciones en el corpus. Decía que la
// única mención del trabajo doméstico en el sitio vivía en un JSDoc de `wageCouncils.ts` que no se
// renderiza, y es falso: el doméstico ya se publicaba en el seguro de paro (con sus requisitos
// propios) y en el catálogo de apps. No cambiaba nada de lo que lee el usuario, pero dejaba mal
// mapeado el corpus. El guard fija las dos mitades: que la afirmación falsa no vuelva, y que lo que
// la reemplaza siga siendo cierto — si mañana alguien borra el doméstico del seguro de paro, este
// test avisa antes de que el comentario vuelva a mentir por omisión.
// ---------------------------------------------------------------------------
describe('corrección › el encabezado no miente sobre dónde ya vivía el trabajo doméstico', () => {
  const fuente = readFileSync(
    fileURLToPath(new URL('../../utils/guidesReddit.ts', import.meta.url)),
    'utf8'
  )
  // Sin los `//` y en una sola línea: el comentario va envuelto a 100 columnas, así que cualquier
  // frase que se busque puede venir partida por un salto de línea.
  const encabezado = fuente
    .slice(0, fuente.indexOf('import type { Guide }'))
    .replace(/^\s*\/\/ ?/gm, '')
    .replace(/\s+/g, ' ')

  // La afirmación puede seguir escrita —conviene, para que nadie la reintroduzca creyendo que es un
  // dato perdido—, pero sólo citada y marcada como falsa. Afirmada, no.
  it('no deja en pie la afirmación falsa: si la cita, es para desmentirla', () => {
    const claim = /única mención del sitio vivía en un JSDoc/i
    const m = encabezado.match(claim)
    if (m) {
      const alrededor = encabezado.slice(Math.max(0, m.index! - 240), m.index! + 400)
      expect(alrededor, 'la afirmación sólo puede aparecer marcada como falsa').toMatch(/es falso/i)
    }
  })

  it('nombra los lugares del sitio donde el doméstico ya se renderizaba', () => {
    expect(encabezado).toMatch(/unemploymentBenefit\.ts/)
    expect(encabezado).toMatch(/moneyApps\.ts/)
  })

  it('y esos lugares siguen tratando el doméstico', () => {
    const paro = readFileSync(
      fileURLToPath(new URL('../../utils/unemploymentBenefit.ts', import.meta.url)),
      'utf8'
    )
    expect(paro).toMatch(/servicio doméstico/i)
    const apps = readFileSync(
      fileURLToPath(new URL('../../utils/moneyApps.ts', import.meta.url)),
      'utf8'
    )
    expect(apps).toMatch(/BPS Trabajo Doméstico/i)
  })
})
