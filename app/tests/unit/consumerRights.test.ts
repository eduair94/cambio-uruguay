// app/tests/unit/consumerRights.test.ts
//
// This page tells people what the Ley 17.250 actually gives them when an online purchase goes
// wrong. The tests are about DISCIPLINE: every claim cites an article, the deadlines and figures
// match the verified law text, and the article-number corrections our adversarial pass found
// (burden of publicity proof = art. 26 not 24; contrapublicidad = art. 51; sanctions in art. 47)
// are pinned so a future edit cannot silently reintroduce the wrong citation.
//
// The 2026-08-10 additions carry two guards against inventing law that merely SOUNDS right, because
// both errors are one careless search away:
//   - Black Friday: there is NO Uruguayan reference-price rule. The "previous price must have been
//     in force for 30 days" line is the EU Omnibus directive. The test forces any day-count next to
//     "precio anterior" to be flagged as foreign, so nobody can paste it back in as Uruguayan law.
//   - Closed shop: the importer is NOT jointly liable for the legal garantía. Art. 34 climbs the
//     chain only for DAMAGES. The test bans the word "solidari*" from that scenario outright.
//
// The fact-audit of the same day added five more pins, each one re-read on IMPO first. Every one of
// them FAILS against the version that shipped that morning, which is the point:
//   - "los precios son libres" is banned outright: it was a categorical legal claim with no article
//     behind it. Only the verified ABSENCE gets published (neither Ley 17.250 nor Decreto 244/000
//     caps or conditions a price increase).
//   - art. 3 defines proveedor by professional ACTIVITY, so "proveedor es quien emitió esa factura"
//     is banned too — it would make a reader drop a viable claim against the marketplace.
//   - the concursal remedy must NOT come out as a Ley 17.250 letter to the shop: art. 95 says it is
//     filed at the Juzgado, addressed to the síndico/interventor. The letter test pins the routing.
//   - art. 21 publishes the EXTRACTO, not the sentencia.
//   - the art. 37 interruption lives in numeral 1 (vicios APARENTES) only; it must never be stated
//     generically, because that invites reading it onto the 3-month vicio oculto deadline.
//
// SECOND PASS (same day): fixing the STRING was not enough. The escrito came out headed "esto no se
// envía al comercio ni a Defensa del Consumidor" while the page around it still said "mandáselo al
// comercio", labelled the picker "qué querés que haga el comercio", and put an "Enviar el reclamo"
// button next to it offering mail-to-shop / the UDC form / the UDC phone. The expensive mistake was
// still one click away, and the page now contradicted its own document. So the wrapper stopped
// living in the template: `complaintDelivery()` owns the heading, the copy, the labels and whether
// there is anything to SEND — and these tests pin both halves, the routing AND the page that must
// derive it instead of hardcoding the consumo version.
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import {
  buildConsumerComplaint,
  COMPLAINT_STEPS,
  complaintDelivery,
  CONSUMER_FAQS,
  CONSUMER_RIGHTS,
  CONSUMER_RIGHTS_CORE_VERIFIED_AT,
  CONSUMER_RIGHTS_VERIFIED_AT,
  CONSUMER_SCENARIO_GROUPS,
  CONSUMER_SCENARIOS,
  CONSUMER_SOURCES,
  type ConsumerScenario,
  GOLDEN_RULE,
  KEY_FIGURES,
  RETRACT_EXCEPTIONS,
  scenarioById,
} from '../../utils/consumerRights'

/** Todo el texto publicado de un escenario, para poder prohibir una afirmación en cualquier campo. */
function scenarioText(s: ConsumerScenario): string {
  return [
    s.label,
    s.short,
    s.lever,
    s.answer,
    ...s.articles,
    ...s.deadlines,
    ...s.evidence,
    ...s.complaintFacts,
    ...s.remedies.flatMap(r => [r.label, r.request]),
  ].join(' \n ')
}

describe('consumer scenario integrity', () => {
  it('has unique ids', () => {
    const ids = CONSUMER_SCENARIOS.map(s => s.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('never publishes a scenario without citing the article it comes from', () => {
    for (const s of CONSUMER_SCENARIOS) {
      expect(s.articles.length, s.id).toBeGreaterThan(0)
      for (const a of s.articles) {
        expect(a, `${s.id}: "${a}"`).toMatch(/Ley 17\.250|art\./i)
      }
    }
  })

  it('gives every scenario a deadline (or explicit note) and evidence to collect', () => {
    for (const s of CONSUMER_SCENARIOS) {
      expect(s.deadlines.length, s.id).toBeGreaterThan(0)
      expect(s.evidence.length, s.id).toBeGreaterThan(0)
      expect(s.lever.length, s.id).toBeGreaterThan(0)
      expect(s.complaintFacts.length, s.id).toBeGreaterThan(0)
      expect(s.remedies.length, s.id).toBeGreaterThan(0)
      expect(
        CONSUMER_SCENARIO_GROUPS.some(group => group.id === s.group),
        s.id
      ).toBe(true)
      expect(new Set(s.remedies.map(remedy => remedy.id)).size, s.id).toBe(s.remedies.length)
    }
  })

  it('covers the AMV-STORE case: cobraron, no entregan, no cancelan, no devuelven', () => {
    for (const id of ['cobraron-no-entregan', 'no-cancelan', 'no-devuelven', 'esta-en-cadeteria']) {
      expect(scenarioById(id), id).toBeTruthy()
    }
  })

  it('covers delivery, product, charge and service incidents comprehensively', () => {
    expect(CONSUMER_SCENARIOS.length).toBeGreaterThanOrEqual(14)
    for (const id of [
      'pedido-incompleto-equivocado-danado',
      'producto-defectuoso',
      'garantia-reparacion-incumplida',
      'usado-como-nuevo',
      'producto-peligroso',
      'precio-cargo-no-informado',
      'renovacion-cobro-recurrente',
      'servicio-digital-no-prestado',
      'producto-servicio-no-solicitado',
      'precio-erroneo-cancelado',
    ]) {
      expect(scenarioById(id), id).toBeTruthy()
    }
  })

  it('answers the two Reddit gaps: fake Black Friday discount and closed shop / intermediary', () => {
    expect(CONSUMER_SCENARIOS.length).toBeGreaterThanOrEqual(17)
    for (const id of ['precio-inflado-antes-de-la-oferta', 'comercio-cerro-o-intermediario']) {
      expect(scenarioById(id), id).toBeTruthy()
    }
  })

  it('declares when the articles and figures were last checked against IMPO and gub.uy', () => {
    expect(CONSUMER_RIGHTS_VERIFIED_AT).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    expect(CONSUMER_RIGHTS_CORE_VERIFIED_AT).toMatch(/^\d{4}-\d{2}-\d{2}$/)

    // la fecha nueva sólo cubre lo agregado o corregido ese día; el núcleo de la 17.250 tiene su
    // propia fecha y es ANTERIOR. Colapsarlas en una sola sería decir que se recorrió todo de nuevo.
    expect(CONSUMER_RIGHTS_CORE_VERIFIED_AT < CONSUMER_RIGHTS_VERIFIED_AT).toBe(true)
    expect(CONSUMER_RIGHTS_VERIFIED_AT <= new Date().toISOString().slice(0, 10)).toBe(true)
  })
})

describe('incident-specific complaint builder', () => {
  it('changes both the facts and legal request with the selected incident', () => {
    const delivery = buildConsumerComplaint('cobraron-no-entregan', 'entrega')
    const defective = buildConsumerComplaint('producto-defectuoso', 'reparacion')

    expect(delivery).toContain('Tipo de incidente: Me cobraron y no entregan')
    expect(delivery).toContain('entrega efectiva')
    expect(defective).toContain('Tipo de incidente: Llegó un producto fallado')
    expect(defective).toContain('reparación integral')
    expect(defective).toContain('Defecto detectado')
    expect(delivery).not.toBe(defective)
  })

  it('changes the requested remedy without losing the selected incident', () => {
    const repair = buildConsumerComplaint('producto-defectuoso', 'reparacion')
    const refund = buildConsumerComplaint('producto-defectuoso', 'devolucion-defecto')

    expect(repair).toContain('reparación integral')
    expect(refund).toContain('Resuelvo el contrato')
    expect(repair).toContain('Ley 17.250')
    expect(refund).toContain('Ley 17.250')
  })

  it('returns an empty letter for an unknown incident', () => {
    expect(buildConsumerComplaint('no-existe')).toBe('')
  })
})

describe('the verified legal facts must not regress', () => {
  it('arrepentimiento is 5 días hábiles, from contract OR delivery at your option', () => {
    const s = scenarioById('no-cancelan')!
    expect(s.articles.join(' ')).toMatch(/art\. 16/)
    expect(s.deadlines.join(' ')).toMatch(/5 d[íi]as h[áa]biles/i)
    expect(s.deadlines.join(' ')).toMatch(/contrato o desde la entrega/i)
  })

  it('the not-delivered case gives the consumer the choice of remedy (art. 33)', () => {
    const s = scenarioById('cobraron-no-entregan')!
    expect(s.articles.join(' ')).toMatch(/art\. 33/)
    expect(s.answer).toMatch(/elecci[óo]n es TUYA|eleg[íi]s vos/i)
  })

  it('treats an online price error as contextual instead of promising automatic enforcement', () => {
    const s = scenarioById('precio-erroneo-cancelado')!

    expect(s.answer).toMatch(/fácilmente advertible/i)
    expect(s.answer).toMatch(/buena fe/i)
    expect(s.answer).toMatch(/factura.*no.*por sí solas/i)
    expect(s.articles.join(' ')).toMatch(/art\. 12/)
    expect(s.articles.join(' ')).toMatch(/art\. 1291/)
  })

  it('is honest that a card chargeback is not a Ley 17.250 right', () => {
    const s = scenarioById('cobraron-no-entregan')!
    expect(s.answer).toMatch(/no es un derecho de la ley/i)
    // transfers / Abitab / RedPagos have no chargeback — say so
    expect(s.answer).toMatch(/no hay contracargo/i)
  })

  it('puts the burden of publicity proof on the advertiser via art. 26 (NOT art. 24)', () => {
    const s = scenarioById('publicidad-enganosa')!
    const arts = s.articles.join(' ')
    expect(arts).toMatch(/art\. 26/)
    expect(arts).toMatch(/art\. 51/) // contrapublicidad
    // the burden-of-proof / contrapublicidad claims must not be attributed to art. 24
    expect(s.answer).toMatch(/carga de probar.*anunciante \(art\. 26\)/i)
    expect(s.answer).toMatch(/contrapublicidad.*\(art\. 51\)/i)
  })

  it('frames the inflated Black Friday price on arts. 24, 26, 14 and 51', () => {
    const s = scenarioById('precio-inflado-antes-de-la-oferta')!
    const arts = s.articles.join(' ')

    expect(arts).toMatch(/art\. 24/) // engaña sobre el PRECIO
    expect(arts).toMatch(/art\. 26/) // probarlo es del anunciante
    expect(arts).toMatch(/art\. 14/) // el precio anunciado integra el contrato
    expect(arts).toMatch(/art\. 51/) // suspensión del aviso + contrapublicidad
    expect(s.answer).toMatch(/carga de probar.*ANUNCIANTE/s)
  })

  it('publishes only the verified absence about raising a price, never "los precios son libres"', () => {
    const s = scenarioById('precio-inflado-antes-de-la-oferta')!

    // "los precios son libres" es una generalidad MÁS ANCHA que lo comprobado, y ninguno de los
    // artículos citados la dice. Lo verificado es la ausencia en esas dos normas, y sólo eso se afirma.
    expect(scenarioText(s)).not.toMatch(/precios son libres/i)
    expect(s.answer).toMatch(
      /ni la Ley 17\.250 ni el Decreto 244\/000 le ponen tope ni condición a subir un precio/i
    )
    // y lo que sí muerde es el aviso, no el número
    expect(s.answer).toMatch(/ataca es el AVISO, no el número/)
  })

  it('publishes the ABSENCE of a Uruguayan reference-price rule instead of inventing one', () => {
    const s = scenarioById('precio-inflado-antes-de-la-oferta')!

    expect(s.answer).toMatch(/no existe norma de precio de referencia/i)
    expect(s.answer).toMatch(/Decreto 244\/000/)
    // no le atribuye a la ley un deber que la ley no tiene
    expect(scenarioText(s)).not.toMatch(/el precio anterior (?:deb|ten[íi]a|tuvo)/i)
  })

  it('never lets the EU Omnibus 30-day rule pass as Uruguayan law', () => {
    const s = scenarioById('precio-inflado-antes-de-la-oferta')!
    const entries = [s.answer, ...s.deadlines, ...s.articles, ...s.evidence]
    const withDayCount = entries.filter(entry => /\b(?:30|treinta)\s+d[íi]as/i.test(entry))

    // si alguien vuelve a escribir "30 días", tiene que ser para desmentirlo
    expect(withDayCount.length).toBeGreaterThan(0)
    for (const entry of withDayCount) {
      expect(entry, entry).toMatch(/europe|no rige|no existe/i)
    }
  })

  it('routes the closed-shop garantía by art. 23 without inventing importer solidarity', () => {
    const s = scenarioById('comercio-cerro-o-intermediario')!
    const text = scenarioText(s)

    expect(s.articles.join(' ')).toMatch(/art\. 23/)
    expect(s.answer).toMatch(/resultan obligados por el contrato accesorio de garant[íi]a/i)
    // el art. 34 sube por la cadena SÓLO para daños, y aun así al revés de lo que se cree
    expect(s.articles.join(' ')).toMatch(/art\. 34.*DAÑOS/s)
    expect(s.answer).toMatch(/ninguna norma uruguaya hace responder al importador/i)
    // ninguna variante de "responde solidariamente" puede aparecer en este caso
    expect(text).not.toMatch(/solidari/i)
  })

  it('turns a bankrupt seller into a credit to verify, with the Ley 18.387 deadlines', () => {
    const s = scenarioById('comercio-cerro-o-intermediario')!
    const d = s.deadlines.join(' ')

    expect(s.articles.join(' ')).toMatch(/Ley 18\.387/)
    expect(d).toMatch(/60 d[íi]as/)
    expect(d).toMatch(/declaraci[óo]n judicial del concurso/i)
    expect(d).toMatch(/Diario Oficial/)
    expect(s.remedies.some(r => r.id === 'verificar-credito')).toBe(true)
  })

  it('publishes the EXTRACTO of the sentencia as what the Diario Oficial runs (art. 21)', () => {
    const s = scenarioById('comercio-cerro-o-intermediario')!
    const diarioOficial = s.deadlines.find(d => /Diario Oficial/.test(d))!

    // el art. 21 se titula "Publicación del extracto de la sentencia": lo que sale son 3 días de EXTRACTO
    expect(diarioOficial).toMatch(/extracto de la sentencia/i)
    expect(diarioOficial).toMatch(/3 d[íi]as/)
  })

  it('keeps art. 3 a definition by professional activity, not "whoever issued the factura"', () => {
    const s = scenarioById('comercio-cerro-o-intermediario')!
    const art3 = s.articles.find(a => /art\. 3 /.test(a))!

    // el art. 3 es AMPLIO: un marketplace que comercializa profesionalmente entra en la definición
    expect(art3).toMatch(/profesional/i)
    expect(art3).toMatch(/no dice "quien emitió la factura"/i)
    // la regla cerrada que haría descartar un reclamo viable contra la plataforma
    expect(scenarioText(s)).not.toMatch(/proveedor es quien emiti[óo] esa factura/i)
    expect(s.answer).toMatch(/se discute caso a caso/i)
    expect(s.answer).toMatch(/no descartes a la plataforma/i)
  })

  it('limits the art. 37 interruption to vicios aparentes, where the text actually puts it', () => {
    const s = scenarioById('comercio-cerro-o-intermediario')!
    const art37 = s.articles.find(a => /art\. 37/.test(a))!

    // la interrupción está en el numeral 1 (aparentes); el numeral 2 (ocultos) no la tiene
    expect(art37).toMatch(/APARENTES/)
    expect(art37).not.toMatch(/ocultos/i)
    expect(s.evidence.join(' ')).toMatch(/oculto.*no prev[ée] interrupci[óo]n/i)
  })

  it('points the intermediary case at whoever issued the factura', () => {
    const s = scenarioById('comercio-cerro-o-intermediario')!
    expect(s.answer).toMatch(/raz[óo]n social y el RUT de la factura/i)
    expect(s.evidence.join(' ')).toMatch(/marketplace/i)
  })

  it('builds a usable letter for the Black Friday incident', () => {
    const price = buildConsumerComplaint(
      'precio-inflado-antes-de-la-oferta',
      'acreditar-precio-anterior'
    )

    expect(price).toContain('precio anterior exhibido estuvo efectivamente vigente')
    expect(price).toContain('Ley 17.250 art. 24')
    // la carta de consumo sí escala a la UDC (el salto de línea del template parte la frase)
    expect(price).toMatch(/Unidad Defensa del\s+Consumidor/)
  })

  it('files the concursal remedy at the Juzgado instead of mailing it to the shop', () => {
    const closed = buildConsumerComplaint('comercio-cerro-o-intermediario', 'verificar-credito')

    // art. 95: se presenta EN EL JUZGADO, en escrito dirigido al síndico o al interventor
    expect(closed).toMatch(/NO SE ENVÍA AL COMERCIO NI A DEFENSA DEL CONSUMIDOR/)
    expect(closed).toContain('SOLICITUD DE VERIFICACIÓN DE CRÉDITO')
    expect(closed).toMatch(/s[íi]ndico o (?:al )?interventor/i)
    expect(closed).toContain('Ley 18.387')
    expect(closed).toContain('fecha, causa, cuantía, vencimiento y calificación solicitada')

    // y NADA del andamiaje de consumo: ni destinatario comercio, ni fundamento 17.250,
    // ni plazo de 48/72 h, ni escalada a Defensa del Consumidor
    expect(closed).not.toContain('Ley 17.250')
    expect(closed).not.toContain('A: [nombre legal del comercio o proveedor]')
    expect(closed).not.toContain('RECLAMO EN MATERIA DE RELACIÓN DE CONSUMO')
    expect(closed).not.toMatch(/dentro de \[48\/72\] horas/)
    expect(closed).not.toMatch(/presentaré el reclamo .* ante la Unidad Defensa del Consumidor/s)
  })

  it('still builds the ordinary consumo letter for the non-concursal remedies of that scenario', () => {
    const garantia = buildConsumerComplaint(
      'comercio-cerro-o-intermediario',
      'garantia-al-otorgante'
    )

    expect(garantia).toContain('RECLAMO EN MATERIA DE RELACIÓN DE CONSUMO')
    expect(garantia).toContain('Ley 17.250 art. 23')
    expect(garantia).not.toMatch(/SOLICITUD DE VERIFICACIÓN DE CRÉDITO/)
  })

  it('states garantía legal caducidad plazos exactly (30/90 días, 6 meses/3 meses)', () => {
    const s = scenarioById('producto-defectuoso')!
    const d = s.deadlines.join(' ')
    expect(d).toMatch(/30 d[íi]as/)
    expect(d).toMatch(/90 d[íi]as/)
    expect(d).toMatch(/6 meses/)
    expect(d).toMatch(/3 meses/)
    expect(s.articles.join(' ')).toMatch(/art\. 37/)
  })
})

describe('the section around the document has to agree with the document', () => {
  const pageSource = readFileSync(
    resolve(
      dirname(fileURLToPath(import.meta.url)),
      '../../pages/derechos-consumidor-compras-online.vue'
    ),
    'utf8'
  )

  it('offers NO send channel for the concursal escrito: it is filed at the Juzgado', () => {
    const d = complaintDelivery('comercio-cerro-o-intermediario', 'verificar-credito')

    // art. 95, textual: "Los acreedores deberán presentarse en el Juzgado en escrito dirigido al
    // síndico o al interventor". No hay canal de envío, así que se publica esa ausencia.
    expect(d.forum).toBe('concursal')
    expect(d.sendable).toBe(false)
    expect(d.intro).toMatch(/NO se envía al comercio ni a Defensa del Consumidor/)
    expect(d.intro).toMatch(/no hay a d[óo]nde mandarlo desde\s+acá/i)
    expect(d.intro).toMatch(/presentarse en el Juzgado/i)
    expect(d.intro).toMatch(/s[íi]ndico o al interventor/i)
    expect(d.intro).toMatch(/art\. 95/)
    // y el plazo que se pierde si lo mandás al lugar equivocado
    expect(d.intro).toMatch(/60 d[íi]as/)
    expect(d.intro).toMatch(/art\. 94/)
    expect(d.intro).toMatch(/art\. 99/)

    // ni el título ni el rótulo del selector pueden seguir hablando del comercio
    expect(d.heading).not.toMatch(/reclamo/i)
    expect(d.remedyLabel).not.toMatch(/comercio/i)
    expect(d.copyLabel).not.toMatch(/reclamo/i)
  })

  it('keeps the ordinary consumo wrapper for every other remedy', () => {
    const d = complaintDelivery('comercio-cerro-o-intermediario', 'garantia-al-otorgante')

    expect(d.forum).toBe('consumo')
    expect(d.sendable).toBe(true)
    expect(d.heading).toBe('El reclamo, listo para copiar')
    expect(d.intro).toMatch(/Mand[áa]selo al comercio/)
    expect(d.remedyLabel).toMatch(/comercio/i)
  })

  it('never wraps a concursal document in the consumo scaffolding, nor the reverse', () => {
    for (const s of CONSUMER_SCENARIOS) {
      for (const r of s.remedies) {
        const doc = buildConsumerComplaint(s.id, r.id)
        const d = complaintDelivery(s.id, r.id)
        const isConcursal = /NO SE ENVÍA AL COMERCIO/.test(doc)

        expect(d.sendable, `${s.id}/${r.id}`).toBe(!isConcursal)
        expect(d.forum, `${s.id}/${r.id}`).toBe(isConcursal ? 'concursal' : 'consumo')
      }
    }
  })

  it('makes the page DERIVE that wrapper instead of hardcoding the consumo one', () => {
    expect(pageSource).toMatch(/complaintDelivery/)

    // los rótulos viven en el módulo: si vuelven al template vuelven a quedar fijos, y el escrito
    // concursal vuelve a salir bajo "El reclamo, listo para copiar / mandáselo al comercio".
    expect(pageSource).not.toContain('El reclamo, listo para copiar')
    expect(pageSource).not.toContain('Mandáselo al comercio')
    expect(pageSource).not.toContain('label="Qué querés que haga el comercio"')
    expect(pageSource).not.toContain("{{ copied ? 'Copiado' : 'Copiar el reclamo' }}")
  })

  it('hides the sender — and empties its actions — when there is nowhere to send', () => {
    const sendTag = pageSource.match(/<SendMessage[\s\S]*?\/>/)

    expect(
      sendTag,
      'la página tiene que seguir teniendo el enviador para el caso de consumo'
    ).not.toBeNull()
    expect(sendTag![0]).toMatch(/v-if="delivery\.sendable"/)
    // cinturón y tiradores: aunque alguien borre ese v-if, no hay destino que ofrecer
    expect(pageSource).toMatch(/if \(!delivery\.value\.sendable\) return \[\]/)
  })
})

describe('rights, steps, figures and sources', () => {
  it('every right cites at least one article', () => {
    for (const r of CONSUMER_RIGHTS) {
      expect(r.articles.length, r.title).toBeGreaterThan(0)
    }
  })

  it('the abusive-clause right kills "no se aceptan devoluciones"', () => {
    const r = CONSUMER_RIGHTS.find(x => /abusiva/i.test(x.title))!
    expect(r.articles.join(' ')).toMatch(/art\. 31/)
    expect(r.practical).toMatch(/nulo/i)
  })

  it('the escalation ends in a sancionatorio with multa 20 a 4.000 UR', () => {
    const last = COMPLAINT_STEPS[COMPLAINT_STEPS.length - 1]!
    expect(last.detail).toMatch(/20 a 4\.000 UR/)
    expect(last.detail).toMatch(/0800 7005/)
  })

  it('exposes the free Defensa del Consumidor channel and its phone', () => {
    expect(KEY_FIGURES.some(f => /0800 7005/.test(f.value))).toBe(true)
    expect(KEY_FIGURES.some(f => /gratuito/i.test(f.value))).toBe(true)
  })

  it('sources are all official (impo.com.uy or gub.uy) primary links', () => {
    expect(CONSUMER_SOURCES.length).toBeGreaterThanOrEqual(6)
    for (const s of CONSUMER_SOURCES) {
      expect(s.url, s.label).toMatch(/^https:\/\/(www\.)?(impo\.com\.uy|gub\.uy)/)
    }
  })

  it('lets the reader open every Ley 18.387 article the concurso card leans on', () => {
    const urls = CONSUMER_SOURCES.map(s => s.url).join(' ')

    // el art. 99 es la consecuencia más dura de la tarjeta (verificás a tu costa y perdés los
    // repartos ya hechos) y era justamente el único sin link propio
    for (const article of ['21', '94', '95', '99']) {
      expect(urls, `Ley 18.387 art. ${article}`).toContain(
        `https://www.impo.com.uy/bases/leyes/18387-2008/${article}`
      )
    }
  })

  it('has at least 10 FAQs, each with a question and an answer', () => {
    expect(CONSUMER_FAQS.length).toBeGreaterThanOrEqual(10)
    for (const f of CONSUMER_FAQS) {
      expect(f.q.length).toBeGreaterThan(0)
      expect(f.a.length).toBeGreaterThan(0)
    }
  })

  it('pins all eight statutory retract exceptions', () => {
    expect(RETRACT_EXCEPTIONS).toHaveLength(8)
    expect(RETRACT_EXCEPTIONS.join(' ')).toMatch(/personalizados/i)
    expect(RETRACT_EXCEPTIONS.join(' ')).toMatch(/contenido digital/i)
  })

  it('publishes the official 45-day estimate as calendar days', () => {
    const duration = KEY_FIGURES.find(f => /duraci[oó]n estimada/i.test(f.label))!
    expect(duration.value).toMatch(/45 d[ií]as corridos/i)
    expect(duration.value).not.toMatch(/h[aá]biles/i)
  })

  it('states the golden rule: orden público, derechos irrenunciables', () => {
    expect(GOLDEN_RULE).toMatch(/orden p[úu]blico/i)
    expect(GOLDEN_RULE).toMatch(/irrenunciable/i)
  })
})
