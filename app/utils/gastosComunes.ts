// Deuda de gastos comunes: qué pueden hacerte, cuánto se recarga y cuándo prescribe.
//
// POR QUÉ ESTA PÁGINA. La eligió el job `currency-search-demand`: "ley gastos comunes uruguay" y
// "prescripcion gastos comunes uruguay" salieron juntas de la cosecha, y el SERP uruguayo del
// 2026-09-03 las contesta con el texto crudo de IMPO, dos revistas jurídicas universitarias, tres
// estudios de abogados y vLex. Ninguna página escrita para quien tiene la deuda.
//
// El sitio ya hablaba de gastos comunes, pero desde el otro lado del mostrador: `rentFaq.ts`
// contesta quién los paga en un alquiler. Estas consultas son del PROPIETARIO que debe, que es
// otra pregunta y otra norma.
//
// TODO SALE DEL TEXTO VIGENTE, leído en impo.com.uy el 2026-09-03:
//   * Decreto-Ley 14.560, art. 14 — con la redacción que le dio la Ley 19.604 (2018). Es la norma
//     central: título ejecutivo, actualización, interés, no capitalización, prescripción y orden
//     público. La redacción anterior (Decreto-Ley 15.220, 1981) decía otra cosa.
//   * Ley 10.751, arts. 5 y 6 — cómo se reparte y qué paga cada uno.
//   * Decreto-Ley 14.560, art. 7 — qué aprueba la asamblea y por qué su acta prueba.
// En IMPO, `/bases/leyes/<n>` es el vigente y `/bases/leyes-originales/<n>` el de la promulgación.

export interface ReglaGasto {
  titulo: string
  texto: string
  articulo: string
  /** True cuando la norma NO contesta la pregunta y hay que decirlo. */
  sinRespuesta?: boolean
}

/**
 * Lo que pasa con la deuda, en orden.
 *
 * El primer punto es el que cambia todo y casi nadie sabe: la cuenta aprobada por la asamblea ya es
 * título ejecutivo. No hay juicio previo que discuta si se debe; se va directo a ejecutar.
 */
export const LA_DEUDA: readonly ReglaGasto[] = Object.freeze([
  {
    titulo: 'La cuenta aprobada por la asamblea ya es título ejecutivo',
    texto:
      'La cuenta de expensas formulada por el administrador y aprobada por la asamblea constituye título ejecutivo, siempre que esos hechos estén acreditados como manda la ley. No hace falta un juicio previo que discuta si se debe: se ejecuta.',
    articulo: 'Decreto-Ley 14.560, art. 14',
  },
  {
    titulo: 'El acta de la asamblea prueba como instrumento público',
    texto:
      'El testimonio notarial del acta de una asamblea celebrada conforme al reglamento o a la ley tiene el valor probatorio de un instrumento público. Por eso alcanza para armar el título: lo que se discute después es el monto, no que la asamblea haya resuelto.',
    articulo: 'Decreto-Ley 14.560, art. 7',
  },
  {
    titulo: 'La deuda se actualiza aunque nadie te reclame',
    texto:
      'El monto se actualiza según el Decreto-Ley 14.500 con independencia de que el pago se reclame o no por la vía judicial o arbitral. Esperar no la congela: la mantiene al día contra la inflación mientras corre el interés.',
    articulo: 'Decreto-Ley 14.560, art. 14',
  },
  {
    titulo: 'El interés es del 12 % anual, y es el techo',
    texto:
      'La ley fija un interés del 12 % anual sobre la deuda actualizada. No es un mínimo ni una sugerencia: es lo que la norma establece, y abajo está lo que pasa cuando el reglamento del edificio dice otra cosa.',
    articulo: 'Decreto-Ley 14.560, art. 14',
  },
  {
    titulo: 'Los intereses NO se capitalizan',
    texto:
      'La ley lo dice con esas palabras. No hay interés sobre interés: la deuda crece de forma lineal y no exponencial, que es la diferencia entre una deuda que se puede alcanzar y una que no.',
    articulo: 'Decreto-Ley 14.560, art. 14',
  },
  {
    titulo: 'Prescriben a los cuatro años',
    texto:
      'Las deudas por expensas y gastos comunes prescriben en cuatro años, y la propia norma remite al artículo 1222 del Código Civil. Cada cuota tiene su propio reloj desde que se hizo exigible.',
    articulo: 'Decreto-Ley 14.560, art. 14',
  },
])

/**
 * La frase que hace que todo lo anterior no se pueda pactar en contra.
 *
 * Va aparte porque es la que más cambia una situación real: muchos reglamentos de copropiedad
 * fijan intereses más altos, capitalización o plazos más largos, y esos renglones no valen.
 */
export const ORDEN_PUBLICO: ReglaGasto = Object.freeze({
  titulo: 'Nada de esto se puede cambiar por contrato ni por reglamento',
  texto:
    'La norma dice que lo dispuesto en ese artículo es de orden público y se aplica a todos los regímenes de propiedad horizontal y a los condominios ya existentes, cualesquiera fuesen las estipulaciones contractuales o de los reglamentos de la copropiedad. Un reglamento que fije un interés mayor, que capitalice, o que estire la prescripción, no vale en esa parte — por más que lo hayas firmado y por más viejo que sea el edificio.',
  articulo: 'Decreto-Ley 14.560, art. 14',
})

/** Cómo se reparte lo que se paga, que es de dónde salen la mitad de las discusiones. */
export const EL_REPARTO: readonly ReglaGasto[] = Object.freeze([
  {
    titulo: 'Cada uno paga en proporción al valor de su unidad',
    texto:
      'La contribución a las expensas de administración, conservación y reparación de los bienes comunes, y a la prima del seguro, es proporcional al valor del piso o departamento, sin perjuicio de lo que las partes hayan pactado expresamente.',
    articulo: 'Ley 10.751, art. 5',
  },
  {
    titulo: 'El piso bajo y el subsuelo no pagan escaleras ni ascensores',
    texto:
      'La ley los exceptúa expresamente de contribuir al mantenimiento y la reparación de escaleras y ascensores, porque no son condóminos en ellos.',
    articulo: 'Ley 10.751, art. 5',
  },
  {
    titulo: 'Lo de puertas adentro lo paga el propietario de la unidad',
    texto:
      'Suelo, puertas, ventanas, cielorraso, revoques, pinturas y las reparaciones interiores corren por cuenta de quien vive ahí adentro, no de la copropiedad.',
    articulo: 'Ley 10.751, art. 6',
  },
])

/**
 * Lo que estas normas NO contestan.
 *
 * Es deliberado que esté en la página: la pregunta que más se busca —si el que compra hereda la
 * deuda— no la contestan ni el art. 14 ni la Ley 10.751, y decir que sí o que no citando estas
 * normas sería inventar. Lo que sí se puede decir es qué hacer al respecto.
 */
export const SIN_RESPUESTA: readonly ReglaGasto[] = Object.freeze([
  {
    titulo: 'Si comprás un apartamento con deuda, ¿la pagás vos?',
    texto:
      'Ni el artículo 14 del Decreto-Ley 14.560 ni la Ley 10.751 dicen que la deuda siga a la unidad. Lo que sí dicen es contra quién es el título: el copropietario deudor. Eso no alcanza para afirmar que un comprador queda libre, porque la respuesta puede venir de otras normas y del propio negocio. Lo práctico, y lo que no depende de la interpretación: pedir al administrador la constancia de deuda de la unidad ANTES de firmar, y que el estado de la deuda quede escrito en el boleto y en la escritura.',
    articulo: 'no está en estas normas',
    sinRespuesta: true,
  },
])

export interface FuenteGasto {
  label: string
  url: string
}

export const GASTOS_COMUNES_SOURCES: readonly FuenteGasto[] = Object.freeze([
  {
    label: 'Decreto-Ley N.º 14.560, art. 14 — texto vigente (IMPO)',
    url: 'https://www.impo.com.uy/bases/decretos-ley/14560-1976/14',
  },
  {
    label: 'Ley N.º 19.604 — la que le dio al art. 14 su redacción vigente (2018)',
    url: 'https://www.impo.com.uy/bases/leyes/19604-2018',
  },
  {
    label: 'Ley N.º 10.751 — Propiedad Horizontal (IMPO)',
    url: 'https://www.impo.com.uy/bases/leyes/10751-1946',
  },
])

export const GASTOS_COMUNES_VERIFIED_AT = '2026-09-03'

export interface FaqEntryGasto {
  question: string
  answer: string
}

/** Las preguntas son las que sugiere el autocompletado uruguayo, no las que se nos ocurrieron. */
export const GASTOS_COMUNES_FAQ: readonly FaqEntryGasto[] = Object.freeze([
  {
    question: '¿Cuándo prescribe una deuda de gastos comunes en Uruguay?',
    answer:
      'A los cuatro años. Lo dice el artículo 14 del Decreto-Ley 14.560, en la redacción que le dio la Ley 19.604 de 2018, y remite al artículo 1222 del Código Civil. Cada cuota corre su propio plazo desde que se hizo exigible.',
  },
  {
    question: '¿Qué interés pueden cobrarme por los gastos comunes atrasados?',
    answer:
      'Un 12 % anual sobre la deuda actualizada, y los intereses no se capitalizan: no hay interés sobre interés. Además el monto se actualiza según el Decreto-Ley 14.500 aunque nadie te lo reclame judicialmente.',
  },
  {
    question: '¿El reglamento del edificio puede fijar otro interés o otro plazo?',
    answer:
      'No. La norma dice que lo dispuesto en ese artículo es de orden público y se aplica a todos los regímenes de propiedad horizontal y a los condominios ya existentes, cualesquiera fuesen las estipulaciones contractuales o de los reglamentos de la copropiedad. Un reglamento que fije un interés mayor, que capitalice o que estire la prescripción no vale en esa parte.',
  },
  {
    question: '¿Pueden ejecutarme sin juicio por gastos comunes?',
    answer:
      'La cuenta de expensas formulada por el administrador y aprobada por la asamblea constituye título ejecutivo, siempre que esos hechos estén acreditados como manda la ley. O sea que no hay un juicio previo que discuta si corresponde la deuda: se va directo a la ejecución, y el acta de la asamblea prueba como instrumento público.',
  },
  {
    question: '¿Quién paga el ascensor si vivo en planta baja?',
    answer:
      'No lo pagás. La Ley 10.751 exceptúa expresamente al dueño del piso bajo y del subsuelo de contribuir al mantenimiento y la reparación de escaleras y ascensores, porque no son condóminos en ellos.',
  },
  {
    question: '¿Cómo se reparte el gasto común entre los apartamentos?',
    answer:
      'En proporción al valor de cada piso o departamento, sin perjuicio de las estipulaciones expresas de las partes. No se reparte por partes iguales salvo que así se haya pactado.',
  },
  {
    question: 'Si compro un apartamento con deuda de gastos comunes, ¿la pago yo?',
    answer:
      'Ni el artículo 14 del Decreto-Ley 14.560 ni la Ley 10.751 dicen que la deuda siga a la unidad: lo que dicen es contra quién es el título, el copropietario deudor. Eso no alcanza para afirmar que el comprador queda libre, porque la respuesta puede venir de otras normas y del propio negocio. Lo que no depende de la interpretación es pedirle al administrador la constancia de deuda de la unidad antes de firmar y dejar el estado de la deuda por escrito en el boleto y en la escritura.',
  },
  {
    question: '¿Sirve dejar de pagar y esperar a que prescriba?',
    answer:
      'La deuda no se congela mientras esperás: se actualiza por el Decreto-Ley 14.500 aunque nadie te reclame, y corre el 12 % anual. Y como la cuenta aprobada es título ejecutivo, la copropiedad no necesita un juicio largo para empezar a ejecutar. Los cuatro años de prescripción existen, pero contar con ellos es apostar a que nadie haga nada en cuatro años.',
  },
])
