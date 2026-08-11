// app/tests/unit/impuestosMitos.test.ts
//
// Los dos mitos que empujan a conductas OPUESTAS y las dos equivocadas: no traer la plata por
// miedo al impuesto, o declarar cero porque «nunca giré nada». El array `myths` vive dentro del
// `<script setup>` de la página, así que el test lee el archivo — igual que bcuWarnings.test.ts
// lee su fixture. Lo que se protege acá no es el render: es que no se cuele una cifra sin fuente
// y que el borde de cripto siga cerrado.
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { describe, expect, it } from 'vitest'

const here = dirname(fileURLToPath(import.meta.url))
const src = readFileSync(join(here, '../../pages/impuestos-inversiones-uruguay.vue'), 'utf8')

/** El bloque `truth` que sigue al `myth` dado, para poder auditarlo aislado. */
function truthOf(mythFragment: string): string {
  const i = src.indexOf(mythFragment)
  expect(i, `no se encontró el mito «${mythFragment}»`).toBeGreaterThan(-1)
  const rest = src.slice(i)
  const start = rest.indexOf('truth:')
  const end = rest.indexOf('\n  },', start)
  expect(start).toBeGreaterThan(-1)
  expect(end).toBeGreaterThan(start)
  return rest.slice(start, end)
}

describe('mito: «el impuesto se dispara cuando traés la plata»', () => {
  const truth = truthOf('El impuesto se dispara cuando traigo la plata a Uruguay')

  // El hecho generador es la OBTENCIÓN de la renta, no la transferencia. Los tres artículos
  // salen del Texto Ordenado vigente (Tít. 7 arts. 1, 13 y 28) y ninguno condiciona el gravamen
  // a que el dinero entre al país.
  it('apoya la respuesta en los artículos del hecho generador y de la imputación', () => {
    expect(truth).toMatch(/art\.\s*1\b/)
    expect(truth).toMatch(/art\.\s*13\b/)
    expect(truth).toMatch(/art\.\s*28\b/)
    expect(truth).toMatch(/devengado/i)
    expect(truth).toMatch(/enajenaci[oó]n/i)
  })

  it('dice las dos mitades: no girar no difiere, y girar no crea impuesto', () => {
    expect(truth).toMatch(/no difiere ni evita/i)
    expect(truth).toMatch(/no crea uno nuevo/i)
  })

  // EL REVERSO QUE HAY QUE PUBLICAR: traer la plata no genera impuesto, pero sí la obligación de
  // justificar el origen ante el banco. Eso es la Ley 19.574 art. 15, no un tributo.
  it('publica el reverso: justificar el origen ante el banco no es un impuesto', () => {
    expect(truth).toMatch(/19\.574/)
    expect(truth).toMatch(/origen de los fondos/i)
    expect(truth).toMatch(/no un tributo|no un impuesto/i)
  })

  it('no inventa una tasa nueva para el traslado de fondos', () => {
    expect(truth).not.toMatch(/\d+(,\d+)?\s*%/)
  })
})

describe('mito: «fondear el bróker paga»', () => {
  const truth = truthOf('Fondear la cuenta del bróker ya paga impuesto')

  it('explica por qué mover plata propia no es renta', () => {
    expect(truth).toMatch(/no es una renta/i)
    expect(truth).toMatch(/art\.\s*13\b/)
    expect(truth).toMatch(/art\.\s*28\b/)
  })

  // La conducta opuesta y también equivocada: declarar cero porque no se giró nada.
  it('desarma «nunca giré nada» como excusa para declarar cero', () => {
    expect(truth).toMatch(/nunca gir[eé] nada/i)
    expect(truth).toMatch(/no habilita a declarar cero/i)
    expect(truth).toMatch(/aunque el dinero siga all[aá]/i)
  })

  // EL BORDE. El sitio se niega POR DISEÑO a fijar una tasa para cripto: el mito tiene que
  // desarmar «no girar = no declarar» sin publicar ningún porcentaje de cripto.
  it('menciona cripto SIN publicar una tasa', () => {
    expect(truth).toMatch(/criptomonedas/i)
    expect(truth).toMatch(/sin estar fijada por ley|no publicamos ning[uú]n porcentaje/i)
    expect(truth).not.toMatch(/\d+(,\d+)?\s*%/)
  })
})

describe('fuentes de los mitos nuevos', () => {
  // LA TRAMPA DE IMPO: `/bases/leyes/` es el texto VIGENTE, `/bases/leyes-originales/` es el
  // original y puede decir lo contrario. Citamos el vigente por esa regla general, no porque este
  // artículo esté modificado: IMPO no le cuelga al art. 15 ninguna nota «Redacción dada por»
  // (sólo «Ver en esta norma, artículos: 16 y 21»). Los modificados de la 19.574 son otros — el
  // art. 12 por la Ley 19.889 art. 226, y el art. 13 con «Redacción dada por: Ley N° 20.469 de
  // 19/03/2026 artículo 1». Documentar mal el motivo es lo que dispara el próximo error de ruta.
  it('cita la Ley 19.574 por su texto VIGENTE, no por el original', () => {
    expect(src).toContain('https://www.impo.com.uy/bases/leyes/19574-2017/15')
    expect(src).not.toContain('leyes-originales/19574')
  })

  it('cita la comunicación de la DGI sobre las rentas del exterior', () => {
    expect(src).toMatch(/gub\.uy\/direccion-general-impositiva[^'"]*rentas-obtenidas-exterior/)
  })

  it('la pregunta también entra al FAQPage, que es donde la busca la gente', () => {
    expect(src).toContain('¿Pago IRPF cuando traigo la plata del exterior a Uruguay?')
  })
})
