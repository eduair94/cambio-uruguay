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
