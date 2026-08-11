import { describe, expect, it } from 'vitest'
import {
  FAQ_CATEGORIES,
  FAQ_CATEGORY_ICONS,
  PERSONAL_FAQS,
  PERSONAL_FAQ_CONTENT_UPDATED_AT,
  PERSONAL_FAQ_LAST_REVIEWED,
  PERSONAL_FAQ_NORMS_VERIFIED_AT,
  PERSONAL_FAQ_SOURCES,
  faqHaystack,
  faqsByCategory,
  getFaq,
} from '../../utils/personalFinanceFaq'
import { TOPIC_DEFS } from '../../utils/redditTopics'

describe('personal-economy FAQ catalogue', () => {
  it('covers every non-customs Reddit topic exactly once, plus fundamentals', () => {
    const categoryIds = FAQ_CATEGORIES.map(category => category.id)
    const expected = [
      'fundamentos',
      ...TOPIC_DEFS.filter(topic => topic.id !== 'compras-import').map(topic => topic.id),
    ]

    expect(new Set(categoryIds).size).toBe(categoryIds.length)
    expect([...categoryIds].sort()).toEqual([...expected].sort())

    for (const category of FAQ_CATEGORIES) {
      expect(FAQ_CATEGORY_ICONS[category.id].startsWith('mdi-')).toBe(true)
      expect(category.label.trim().length).toBeGreaterThan(2)
      expect(category.description.trim().length).toBeGreaterThan(20)
    }
  })

  it('has unique, sourced and substantive answers', () => {
    const ids = PERSONAL_FAQS.map(faq => faq.id)
    const categoryIds = new Set(FAQ_CATEGORIES.map(category => category.id))

    expect(PERSONAL_FAQS.length).toBeGreaterThanOrEqual(90)
    expect(new Set(ids).size).toBe(ids.length)
    for (const faq of PERSONAL_FAQS) {
      expect(faq.question.trim().length).toBeGreaterThan(8)
      expect(faq.shortAnswer.trim().length).toBeGreaterThan(8)
      expect(faq.answer.trim().length).toBeGreaterThan(40)
      expect(categoryIds.has(faq.category)).toBe(true)
      expect(faq.sourceIds.length).toBeGreaterThan(0)
      expect(faq.tags.length).toBeGreaterThan(0)
      for (const sourceId of faq.sourceIds) {
        expect(PERSONAL_FAQ_SOURCES[sourceId], `${faq.id}: ${sourceId}`).toBeDefined()
      }
      for (const related of faq.related ?? []) {
        expect(related.to.startsWith('/')).toBe(true)
      }
    }
  })

  it('groups every FAQ into a populated category', () => {
    const grouped = faqsByCategory()
    const count = grouped.reduce((total, group) => total + group.items.length, 0)

    expect(count).toBe(PERSONAL_FAQS.length)
    expect(grouped).toHaveLength(FAQ_CATEGORIES.length)
    for (const group of grouped) expect(group.items.length).toBeGreaterThanOrEqual(4)
  })

  it('only cites named HTTPS primary or official sources', () => {
    expect(Object.keys(PERSONAL_FAQ_SOURCES).length).toBeGreaterThanOrEqual(50)
    for (const source of Object.values(PERSONAL_FAQ_SOURCES)) {
      expect(source.label.trim().length).toBeGreaterThan(5)
      expect(source.authority.trim().length).toBeGreaterThan(2)
      expect(source.url.startsWith('https://')).toBe(true)
      expect(['norma', 'fuente-oficial', 'estadistica']).toContain(source.kind)
    }
  })

  it('never promises an article the cited URL does not serve', () => {
    // Trazabilidad: si el label dice "art. N", la URL de IMPO tiene que terminar en ese N. Dos
    // fuentes prometían dos artículos ("arts. 64 y 65", "arts. 1 y 3") y linkeaban uno solo, así
    // que el lector que iba a chequear el 64 o el 1 no los encontraba.
    for (const [id, source] of Object.entries(PERSONAL_FAQ_SOURCES)) {
      const article = /impo\.com\.uy\/bases\/.+\/(\d+)$/.exec(source.url)?.[1]
      if (!article) continue

      const cited = /arts?\.\s*([\d\s,y]+)/.exec(source.label)?.[1]
      expect(cited, `${id}: el label no dice qué artículo se linkea`).toBeDefined()

      const numbers = cited!.split(/\D+/).filter(Boolean)
      expect(
        numbers,
        `${id}: el label promete los arts. ${cited!.trim()} y la URL sirve sólo el ${article}`
      ).toHaveLength(1)
      expect(numbers[0], `${id}: label art. ${numbers[0]} vs URL /${article}`).toBe(article)
    }
  })

  it('dates the page by its most recent change, not by the last full audit', () => {
    // El dato que ve el lector y el dateModified del FAQPage no pueden ser anteriores a las
    // respuestas más nuevas: PERSONAL_FAQ_LAST_REVIEWED sola fechaba la página en julio mientras
    // incorporaba respuestas escritas en agosto.
    expect(PERSONAL_FAQ_CONTENT_UPDATED_AT).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    expect(
      PERSONAL_FAQ_CONTENT_UPDATED_AT >= PERSONAL_FAQ_LAST_REVIEWED &&
        PERSONAL_FAQ_CONTENT_UPDATED_AT >= PERSONAL_FAQ_NORMS_VERIFIED_AT
    ).toBe(true)
    expect([PERSONAL_FAQ_LAST_REVIEWED, PERSONAL_FAQ_NORMS_VERIFIED_AT]).toContain(
      PERSONAL_FAQ_CONTENT_UPDATED_AT
    )
  })

  it('resolves by id and builds an accent-insensitive haystack', () => {
    const faq = PERSONAL_FAQS[0]!
    expect(getFaq(faq.id)).toBeDefined()
    expect(faqHaystack(faq)).toBe(faqHaystack(faq).toLowerCase())
    expect(getFaq('definitely-not-real')).toBeUndefined()
    expect(
      faqHaystack({
        id: 'x',
        question: '¿Cómo ahorrar en dólares?',
        shortAnswer: 'a',
        answer: 'b',
        category: 'ahorro-inversion',
        sourceIds: ['bcu-presupuesto'],
        basis: 'criterio',
        tags: [],
      })
    ).toContain('como ahorrar en dolares')
  })

  it('pins the high-risk facts that replaced common outdated answers', () => {
    expect(getFaq('salario-minimo-2026')?.shortAnswer).toMatch(/1\.º de julio de 2026.+25\.383/)
    expect(getFaq('clearing-despues-pagar')?.shortAnswer).toMatch(
      /cinco días hábiles.+tres días hábiles/
    )
    expect(getFaq('central-riesgos-despues-pagar')?.answer).toMatch(
      /actualiza mensualmente.+historial crediticio/
    )
    expect(getFaq('cripto-regulada-uruguay-2026')?.answer).toMatch(
      /22 de julio de 2026.+ninguna licencia promete rentabilidad/
    )
    expect(getFaq('impuestos-cripto-uruguay')?.basis).toBe('zona-gris')
    expect(getFaq('reclamo-o-denuncia-consumidor')?.shortAnswer).toMatch(
      /reclamo.+mediación.+denuncia.+sanción.+no una compensación/
    )
    expect(getFaq('bancarrota-personal-uruguay')?.answer).toMatch(
      /persona física que realiza actividad empresaria.+concurso civil/
    )
    expect(getFaq('consulta-laboral-gratuita-mtss')?.answer).toMatch(
      /no tiene costo.+no es vinculante/
    )
  })

  it('pins the norms verified in the August 2026 batch, article by article', () => {
    expect(PERSONAL_FAQ_NORMS_VERIFIED_AT).toMatch(/^\d{4}-\d{2}-\d{2}$/)

    // Ley 19.210 art. 11 en su redacción VIGENTE (Ley 19.889 art. 216): la elección que hace el
    // empleador rige "hasta tanto el trabajador haga uso de su facultad de elegir", o sea que al
    // trabajador no le corre ningún plazo para pisarla. El "un año de CADA elección" es la
    // redacción ORIGINAL, derogada, que sólo vive en /bases/leyes-originales/: si vuelve a
    // aparecer, este test cae.
    const banco = getFaq('sueldo-banco-que-elige-la-empresa')
    expect(banco?.answer).toMatch(
      /elegir libremente la institución de intermediación financiera.+hasta tanto el trabajador haga uso de su facultad de elegir la institución/
    )
    expect(banco?.answer).not.toMatch(/cada elección/)
    expect(banco?.shortAnswer).not.toMatch(/cada elección/)

    // Decreto 263/015 art. 11: el año se cuenta desde la APERTURA DE LA CUENTA, y no se exige
    // cuando el cambio se asocia al inicio de una nueva relación laboral. Esa excepción es la
    // parte accionable de la respuesta (es exactamente el caso que la pregunta plantea).
    expect(banco?.answer).toMatch(
      /un año de concretada la apertura de la cuenta o instrumento de dinero electrónico/
    )
    expect(banco?.answer).toMatch(
      /no será exigible.+inicio de una nueva relación laboral.+podés cambiar sin esperar/
    )
    expect(banco?.sourceIds).toContain('decreto-263-015-cambio')

    // Ley 17.738: afiliación por ejercicio (art. 43), permanente (art. 50), y la única salida
    // es la declaración de no ejercicio a 90 días (arts. 64 y 65). La escala de aportes NO se
    // publica: el repo se la autoimpone y el test lo custodia.
    const caja = getFaq('caja-profesionales-dejar-de-aportar')
    expect(caja?.answer).toMatch(/no hay darse de baja.+dentro de los 90 días/)
    expect(caja?.answer).toMatch(/No publicamos la escala de aportes/)
    expect(caja?.answer).toMatch(/Fondo de Solidaridad es otro tributo y otro organismo/)

    // Art. 55 (redacción Ley 20.410): el atraso congela la categoría SÓLO por encima de un piso
    // —segunda en la escala de diez, cuarta en la de quince—, y lo que se repite es el trienio o
    // el bienio. Publicarlo sin el umbral se lo aplicaba a todo afiliado atrasado.
    expect(caja?.answer).toMatch(/segunda categoría como mínimo.+un nuevo trienio/)
    expect(caja?.answer).toMatch(/cuarta categoría como mínimo.+bienio/)

    // Ley 16.524 art. 3: no contribuye todo egresado. Umbral de 8 BPC y recién desde el quinto
    // año del egreso; sin eso, la respuesta le cobraba el Fondo a un egresado reciente.
    expect(caja?.answer).toMatch(/superiores a 8 BPC/)
    expect(caja?.answer).toMatch(/quinto año del egreso/)
    expect(caja?.sourceIds).toContain('ley-fondo-solidaridad-contribuyentes')

    // Ley 16.524 art. 3 lit. B): el cese opera a los veinticinco años DESDE EL COMIENZO de la
    // aportación. Escribir "veinticinco años de aportación" le exige veinticinco años pagos a
    // quien aportó con interrupciones y ya tiene la causal cumplida. Y el lit. A) no es
    // "jubilación" a secas: exige además cesar en toda actividad profesional remunerada con
    // directa relación con la formación.
    expect(caja?.answer).toMatch(/veinticinco años desde el comienzo de la aportación/)
    expect(caja?.answer).not.toMatch(/veinticinco años de aportación/)
    expect(caja?.answer).toMatch(/toda actividad profesional remunerada/)

    // El "llega menos" no es la comisión que te informaron, y el precio por banco no se publica.
    expect(getFaq('mandar-plata-al-exterior')?.answer).toMatch(
      /no incluye eventuales gastos y tarifas que cobren los bancos receptores, intermediarios o corresponsales/
    )
    expect(getFaq('mandar-plata-al-exterior')?.answer).toMatch(
      /El precio de cada banco no lo publicamos/
    )

    // Ley 16.906 art. 5 está en la Ley de INVERSIONES y garantiza sumas vinculadas con la
    // inversión: no es fundamento de una remesa personal ni prueba que no haya control de
    // cambios. El fundamento publicado es la ausencia de norma, declarada como tal.
    const giro = getFaq('mandar-plata-al-exterior')
    expect(giro?.answer).toMatch(/no de mandarle plata a un familiar/)
    expect(giro?.answer).not.toMatch(/no hay control de cambios/)

    // Ley 19.210 art. 10 (redacción Ley 19.889 art. 215) está redactado con "podrá": ESE artículo
    // solo no cierra la lista, y decir que "tasa" los medios o que es "el universo admitido" era
    // una calificación jurídica que ninguna fuente citada afirma.
    const cripto = getFaq('cobrar-sueldo-en-cripto')
    expect(cripto?.answer).toMatch(
      /acreditación en cuenta en instituciones de intermediación financiera o en instrumento de dinero electrónico/
    )
    expect(cripto?.answer).toMatch(/no declara que sean los únicos admitidos ni prohíbe/)
    expect(cripto?.answer).not.toMatch(/universo admitido/)
    expect(cripto?.shortAnswer).not.toMatch(/La ley tasa/)
    expect(cripto?.basis).toBe('zona-gris')

    // Pero de "el art. 10 no cierra la lista" NO se sigue "no hay norma". Publicar «no encontramos
    // norma que cierre esa lista» era una ausencia falsa —y contradecía al propio sitio, que en
    // /guias ya cita el Convenio 95 de la OIT y la Ley 12.030—. El Convenio 95 lo aprobó el art. 1
    // de la Ley 12.030 (https://www.impo.com.uy/bases/leyes/12030-1953/1, lista nominal "95
    // Relativo a la protección del salario"), Uruguay lo ratificó el 18/03/1954 y NORMLEX lo da
    // en vigor; su art. 3 manda pagar los salarios pagaderos en efectivo "exclusivamente en moneda
    // de curso legal" y prohibir pagarés, vales, cupones "o en cualquier otra forma que se
    // considere representativa" de ella, y su art. 4 sólo admite pago PARCIAL en especie donde sea
    // de uso corriente. La zona gris real es la calificación del criptoactivo, no un vacío.
    expect(cripto?.answer).not.toMatch(/no encontramos norma/)
    expect(cripto?.answer).toMatch(/Convenio 95 de la Organización Internacional del Trabajo/)
    expect(cripto?.answer).toMatch(/artículo 1 de la Ley 12\.030/)
    expect(cripto?.answer).toMatch(/18 de marzo de 1954/)
    expect(cripto?.answer).toMatch(
      /los salarios que deban pagarse en efectivo se pagarán exclusivamente en moneda de curso legal/
    )
    expect(cripto?.answer).toMatch(/pagarés, vales, cupones/)
    expect(cripto?.answer).toMatch(/pago parcial/)
    expect(cripto?.answer).toMatch(/prestaciones en especie/)
    expect(cripto?.shortAnswer).toMatch(/Convenio 95/)
    expect(cripto?.sourceIds).toContain('ley-convenios-oit-95')
    expect(cripto?.sourceIds).toContain('oit-convenio-95')
    expect(cripto?.sourceIds).toContain('oit-convenio-95-ratificacion')

    // El art. 35 sólo topea el efectivo, en UI y sin conversión a pesos (la ley manda tomar la
    // UI del 1.º de cada mes).
    const inmueble = getFaq('pagar-inmueble-en-cripto')
    expect(inmueble?.basis).toBe('zona-gris')
    expect(inmueble?.answer).toMatch(/200\.000 Unidades Indexadas/)
    expect(inmueble?.answer).toMatch(/450\.000 Unidades Indexadas/)
    expect(inmueble?.answer).not.toMatch(/\$\s?\d/)

    // Código Civil: la cesión no te es oponible sin notificación, y hay tres días para negarla.
    expect(getFaq('compraron-mi-deuda-cesion')?.answer).toMatch(
      /ineficaz en cuanto al deudor.+dentro de los tres días de notificada la cesión/
    )

    // Ley 17.250 art. 31 lit. I: 60 días para rescindir, 15 para que procesen la baja. Y decimos
    // que no hay plazo publicado para cerrar una cuenta bancaria en vez de inventar uno.
    const baja = getFaq('dar-de-baja-tarjeta-o-cuenta')
    expect(baja?.answer).toMatch(/sesenta días corridos.+quince días corridos/)
    expect(baja?.answer).toMatch(/no encontramos norma del BCU que lo fije/)
  })
})
