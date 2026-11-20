import { describe, expect, it } from 'vitest'

import { getGuide } from '../../utils/guides'
import {
  PAYROLL_ACCOUNT_CHOICE_DAYS,
  PAYROLL_ACCOUNT_DEADLINES,
  PAYROLL_ACCOUNT_FREE_SERVICES,
  PAYROLL_ACCOUNT_NOTICE_DAYS,
  PAYROLL_ACCOUNT_REVIEWED,
  PAYROLL_ACCOUNT_SOURCES,
  PAYROLL_FREE_CARD_REPLACEMENTS,
  PAYROLL_FREE_TRANSFERS,
  PAYROLL_FREE_TRANSFER_UI,
  PAYROLL_FREE_WITHDRAWALS,
  PAYROLL_NETWORK_MIN_POPULATION,
  PAYROLL_NETWORK_NEARBY_KM,
  payrollDeadline,
  payrollFreeService,
  payrollFreeTransferCap,
  payrollMiles,
} from '../../utils/payrollAccount'

const GUIDE = 'cuenta-sueldo-elegir-banco-uruguay'

describe('el catálogo de la cuenta donde se cobra el sueldo', () => {
  it('publica los mínimos que el artículo 16 del Decreto 263/015 fija, sin redondear', () => {
    expect(PAYROLL_FREE_WITHDRAWALS).toBe(5)
    expect(PAYROLL_FREE_TRANSFERS).toBe(8)
    expect(PAYROLL_FREE_TRANSFER_UI).toBe(2000)
    expect(PAYROLL_FREE_CARD_REPLACEMENTS).toBe(2)
  })

  it('publica los plazos en días hábiles, como los escribe el artículo 9', () => {
    expect(PAYROLL_ACCOUNT_NOTICE_DAYS).toBe(10)
    expect(PAYROLL_ACCOUNT_CHOICE_DAYS).toBe(10)
    for (const deadline of PAYROLL_ACCOUNT_DEADLINES.filter(d =>
      ['aviso', 'eleccion'].includes(d.key)
    ))
      expect(deadline.value).toContain('días hábiles')
  })

  it('escribe la red del artículo 23 con sus dos cifras', () => {
    expect(PAYROLL_NETWORK_MIN_POPULATION).toBe(2000)
    expect(PAYROLL_NETWORK_NEARBY_KM).toBe(3)
  })

  // El separador de miles va a mano a propósito: `toLocaleString` depende del ICU del runtime y
  // puede imprimir «2,000», que en una guía de dinero se lee como otro número.
  it('agrupa los miles con punto, sin depender del ICU del runtime', () => {
    expect(payrollMiles(2000)).toBe('2.000')
    expect(payrollMiles(999)).toBe('999')
    expect(payrollMiles(1234567)).toBe('1.234.567')
    expect(payrollFreeTransferCap()).toBe('UI 2.000')
  })

  it('da a cada fila una clave única, su valor y el artículo que lo fija', () => {
    const keys = [
      ...PAYROLL_ACCOUNT_FREE_SERVICES.map(s => s.key),
      ...PAYROLL_ACCOUNT_DEADLINES.map(d => d.key),
    ]
    expect(new Set(keys).size).toBe(keys.length)
    for (const row of [...PAYROLL_ACCOUNT_FREE_SERVICES, ...PAYROLL_ACCOUNT_DEADLINES]) {
      expect(row.label.length).toBeGreaterThan(5)
      expect(row.value.length).toBeGreaterThan(3)
      expect(row.article).toMatch(/[Aa]rts?\./)
    }
  })

  it('busca por clave y devuelve null para una desconocida', () => {
    expect(payrollFreeService('extracciones')?.value).toContain('5')
    expect(payrollFreeService('no-existe')).toBeNull()
    expect(payrollDeadline('nuevo-trabajo')?.value).toContain('no es exigible')
    expect(payrollDeadline('no-existe')).toBeNull()
  })

  // La regla del repo: ninguna cifra legal sin una URL de fuente real. Acá además se exige que sea
  // normativa en IMPO o una vía oficial del MTSS, que son las dos únicas clases de fuente que esta
  // guía usa — un tarifario de banco no sostiene un mínimo de la norma.
  it('respalda cada afirmación con IMPO o con gub.uy, y nunca con un tarifario', () => {
    expect(PAYROLL_ACCOUNT_SOURCES.length).toBeGreaterThanOrEqual(10)
    for (const source of PAYROLL_ACCOUNT_SOURCES) {
      expect(source.url).toMatch(/^https:\/\/(www\.impo\.com\.uy|www\.gub\.uy)\//)
      expect(source.label.length).toBeGreaterThan(20)
      expect(source.publisher).toMatch(/^(IMPO|MTSS)$/)
    }
    const impo = PAYROLL_ACCOUNT_SOURCES.filter(s => s.publisher === 'IMPO').map(s => s.url)
    // Los artículos sin los que la guía no se sostiene: el derecho, los plazos, la excepción por
    // nueva relación laboral, la notificación con constancia y las características de la cuenta.
    for (const url of [
      'https://www.impo.com.uy/bases/leyes/19210-2014/11',
      'https://www.impo.com.uy/bases/decretos/263-2015/9',
      'https://www.impo.com.uy/bases/decretos/263-2015/11',
      'https://www.impo.com.uy/bases/decretos/263-2015/14',
      'https://www.impo.com.uy/bases/decretos/263-2015/16',
    ])
      expect(impo).toContain(url)
  })

  it('fecha la lectura de las fuentes', () => {
    expect(PAYROLL_ACCOUNT_REVIEWED).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    expect(Number.isNaN(Date.parse(PAYROLL_ACCOUNT_REVIEWED))).toBe(false)
  })
})

describe('la guía que compone ese catálogo', () => {
  const guide = getGuide(GUIDE)

  it('existe, cita sus fuentes y se fecha con la lectura del catálogo', () => {
    expect(guide).toBeDefined()
    expect(guide?.updatedAt).toBe(PAYROLL_ACCOUNT_REVIEWED)
    expect(guide?.sources?.length).toBe(PAYROLL_ACCOUNT_SOURCES.length)
  })

  it('contesta en el título, sin anunciar el índice', () => {
    expect(guide?.title).toBe('Cuenta sueldo: el banco lo elegís vos')
    expect(`${guide?.title} | Cambio Uruguay`.length).toBeLessThanOrEqual(60)
    expect(guide?.description.length).toBeLessThanOrEqual(155)
  })

  // La descripción es la que corre a ~1,4 % de CTR contra 0,03–0,2 % de una genérica: tiene que
  // traer los números, y tienen que ser los del catálogo y no un literal que pueda separarse.
  it('trae en la descripción las tres cifras que la página afirma', () => {
    for (const figure of [
      String(PAYROLL_ACCOUNT_CHOICE_DAYS),
      String(PAYROLL_FREE_WITHDRAWALS),
      String(PAYROLL_FREE_TRANSFERS),
    ])
      expect(guide?.description).toContain(figure)
    expect(guide?.description).toContain('19.210')
  })

  it('no publica el tope de la transferencia convertido a pesos', () => {
    const texto = [
      ...(guide?.sections ?? []).map(s => `${s.heading} ${s.body}`),
      ...(guide?.faqs ?? []).map(f => `${f.q} ${f.a}`),
    ].join(' ')
    expect(texto).toContain('UI 2.000')
    expect(texto).not.toMatch(/\$\s?[\d.]*2\.000/)
  })

  it('dice que el año de permanencia no corre al entrar a un trabajo nuevo', () => {
    const faq = (guide?.faqs ?? []).find(f => /trabajo nuevo/i.test(f.q))
    expect(faq?.a).toContain('nueva relación laboral')
  })
})
