// La Ley de Usura (18.212) en castellano: qué tope te aplica, qué entra en la cuenta, y qué pasa
// si te cobraron de más.
//
// POR QUÉ ESTA PÁGINA. La eligió el job `currency-search-demand` y el SERP la confirmó: para "ley
// usura uruguay", medido el 2026-09-03 con gl=uy, los ocho primeros resultados son el texto crudo
// de IMPO, el BCU, una copia archivada de Presidencia, un artículo de revista jurídica, un estudio
// de abogados, vLex, una empresa de cobranzas, y un archivo del MEF cuyo título muestra una ruta
// de Windows. Ni una sola página que conteste la pregunta. Y en Search Console el sitio no aparece
// para ninguna consulta de usura o topes: cero impresiones en 28 días.
//
// LA DIVISIÓN CON /adelanto-de-efectivo-tarjeta-de-credito, que usa la misma tabla del BCU: esa
// página contesta "cuánto me cuesta sacar efectivo"; esta contesta "cuál es el límite legal y qué
// hago si lo pasaron". Los títulos y los H1 lo dicen distinto a propósito — dos páginas propias
// peleando la misma consulta es lo que ya le costó al sitio 34.259 impresiones y 52 clics en el
// grupo de marca de BROU.
//
// TODO SALE DEL TEXTO VIGENTE de la Ley 18.212, leído en impo.com.uy el 2026-09-03. El artículo 11
// tiene la redacción que le dio la Ley 19.732 (2018): en IMPO, `/bases/leyes/<n>` es el vigente y
// `/bases/leyes-originales/<n>` el de la promulgación, y citar el segundo acá publicaría topes
// derogados. Los porcentajes son de la ley y no cambian solos; las tasas medias sobre las que se
// aplican las publica el BCU cada mes y las trae `/api/bcu-rates` (job `currency-bcu-rates`).

export interface TopeUsura {
  /** El caso, como lo reconocería quien lo está viviendo. */
  caso: string
  /** El recargo máximo sobre la tasa media publicada por el BCU, en puntos porcentuales. */
  recargo: number
  detalle: string
  articulo: string
}

/**
 * Los seis topes del artículo 11, que son más de los dos que suele citarse.
 *
 * El de 20 % es el más barato de todos y el menos conocido: si el préstamo se cobra por retención
 * del sueldo y es un Crédito de Nómina, el techo legal es una fracción del que aplica a un crédito
 * común.
 */
export const TOPES: readonly TopeUsura[] = Object.freeze([
  {
    caso: 'Crédito común de menos de 2.000.000 UI',
    recargo: 55,
    detalle:
      'Es el caso más frecuente: cualquier préstamo, financiación o compra en cuotas por debajo de ese capital. Hay usura cuando la tasa implícita supera la tasa media del BCU en más de un 55 %.',
    articulo: 'Ley 18.212, art. 11, inciso 1',
  },
  {
    caso: 'Crédito de Nómina (se descuenta del sueldo o de la pasividad)',
    recargo: 20,
    detalle:
      'El techo más bajo de la ley, y el menos conocido. Aplica a los Créditos de Nómina definidos en el art. 30 de la Ley 19.210. Si te lo descuentan del recibo, el límite no es el 55 %.',
    articulo: 'Ley 18.212, art. 11, inciso 2.i',
  },
  {
    caso: 'Otros créditos cobrados por retención del sueldo o de la pasividad',
    recargo: 30,
    detalle:
      'Los que se cobran con retención pero no encuadran como Crédito de Nómina. Sigue siendo la mitad del tope de un crédito común.',
    articulo: 'Ley 18.212, art. 11, inciso 2.ii',
  },
  {
    caso: 'Mora, en cualquiera de los créditos de menos de 2.000.000 UI',
    recargo: 80,
    detalle:
      'Cuando se configura mora el techo sube, pero sigue habiendo techo. Y la multa por mora se computa dentro de la tasa implícita, así que no es una vía para esquivarlo.',
    articulo: 'Ley 18.212, arts. 11 inciso 3 y 19',
  },
  {
    caso: 'Crédito de 2.000.000 UI o más',
    recargo: 90,
    detalle:
      'Por encima de ese capital la ley presume una contraparte con más espalda para negociar y afloja el techo.',
    articulo: 'Ley 18.212, art. 11, inciso 4',
  },
  {
    caso: 'Mora en un crédito de 2.000.000 UI o más',
    recargo: 120,
    detalle: 'El techo más alto de la ley, y el único que llega a triplicar la tasa media.',
    articulo: 'Ley 18.212, art. 11, inciso 5',
  },
])

export interface ReglaUsura {
  titulo: string
  texto: string
  articulo: string
}

/**
 * Qué entra en la cuenta.
 *
 * Es la parte que más se ignora y la que cambia el resultado: el tope no se mide contra la tasa
 * que dice el contrato, sino contra la tasa implícita de TODO lo que pagás.
 */
export const QUE_CUENTA: readonly ReglaUsura[] = Object.freeze([
  {
    titulo: 'No se mira la tasa del contrato, se mira la tasa implícita',
    texto:
      'La ley manda calcular la tasa interna de retorno que iguala lo que te desembolsaron con todo el flujo que devolvés. Una tasa nominal baja con cargos altos puede ser usuraria igual.',
    articulo: 'Ley 18.212, art. 10',
  },
  {
    titulo: 'Entra todo, no sólo el interés',
    texto:
      'Capital, intereses, compensaciones, comisiones, gastos, seguros u otros cargos por cualquier concepto, incluidas las cláusulas penales. Todo eso va adentro del mismo cálculo.',
    articulo: 'Ley 18.212, art. 10',
  },
  {
    titulo: 'La multa por mora también cuenta',
    texto:
      'Los montos cobrados como multa se computan para el cálculo de la tasa implícita. La ley admite penas mayores sólo en casos acotados, cuando el máximo por mora que habilita el art. 11 queda por debajo de 50 UI.',
    articulo: 'Ley 18.212, art. 19',
  },
  {
    titulo: 'La tasa media que se compara es la del trimestre anterior',
    texto:
      'No la de hoy: la del trimestre móvil anterior a la fecha en que se constituyó la obligación. Un préstamo firmado hace dos años se juzga contra la tabla de aquel momento, no contra la actual.',
    articulo: 'Ley 18.212, art. 11',
  },
  {
    titulo: 'En una compra en cuotas se compara contra el precio de lista',
    texto:
      'Cuando el crédito nace de la venta de un bien o servicio por el propio proveedor, la tasa implícita se calcula igualando el precio de lista al momento de la transacción con el flujo de pagos. La diferencia entre el contado y las cuotas es el interés.',
    articulo: 'Ley 18.212, art. 10',
  },
])

/** Qué pasa cuando se configura usura. Es más de lo que la mayoría cree. */
export const CONSECUENCIAS: readonly ReglaUsura[] = Object.freeze([
  {
    titulo: 'Se cae todo lo accesorio, no se "ajusta" la tasa',
    texto:
      'Configurada la usura, caduca el derecho a exigir intereses, compensaciones, comisiones, gastos u otros cargos de cualquier naturaleza. Queda el capital que subsista, y las costas y costos.',
    articulo: 'Ley 18.212, art. 21',
  },
  {
    titulo: 'Lo que ya te cobraron se descuenta del capital',
    texto:
      'Los intereses, comisiones, gastos y demás cargos ya cobrados deben descontarse del crédito que se ejecute. No es que dejen de cobrarte de ahora en más: lo cobrado se resta.',
    articulo: 'Ley 18.212, art. 21',
  },
  {
    titulo: 'El juez la aplica aunque vos no la plantees',
    texto:
      'La usura se releva de oficio. Y quedó incorporada a las excepciones oponibles en el juicio ejecutivo de títulos valores, que es donde suelen terminar estas deudas.',
    articulo: 'Ley 18.212, art. 23',
  },
  {
    titulo: 'El juez tiene que denunciar al infractor',
    texto:
      'Los jueces deben comunicar a la autoridad administrativa competente la identidad de quien cobró usura.',
    articulo: 'Ley 18.212, art. 21',
  },
  {
    titulo: 'Además es delito',
    texto:
      'Quien, aprovechando la necesidad, ligereza o inexperiencia de una persona, le hace dar o prometer intereses usurarios, tiene seis meses de prisión a cuatro años de penitenciaría. Agrava, entre otras cosas, dedicarse a prestar de forma profesional o habitual, exigir garantías extorsivas, e incluir como capital lo que en realidad son intereses.',
    articulo: 'Ley 18.212, art. 22',
  },
])

/**
 * El artículo que casi nadie cita y que resuelve muchas deudas viejas y chicas.
 *
 * Va aparte porque no es un tope: es una caducidad automática, y opera sin que el deudor haga nada.
 */
export const PEQUENOS_CREDITOS: readonly ReglaUsura[] = Object.freeze([
  {
    titulo: 'En deudas de menos de 20.000 UI, la mora caduca a los 24 meses',
    texto:
      'En préstamos en efectivo y financiación de bienes y servicios cuyo capital inicial sea menor a 20.000 UI, la generación de intereses moratorios caduca de pleno derecho —sin que el deudor tenga que hacer nada— a los veinticuatro meses desde que cada obligación se hizo exigible, salvo que el acreedor haya iniciado acción judicial dentro de ese plazo.',
    articulo: 'Ley 18.212, art. 20',
  },
  {
    titulo: 'Después de esa caducidad sólo corre el ajuste del Decreto-Ley 14.500',
    texto:
      'Sobre la totalidad de lo adeudado, cualquiera sea su naturaleza, se aplican únicamente los ajustes e intereses de los arts. 1, 2 y 4 del Decreto-Ley 14.500, salvo que la tasa pactada fuera menor, en cuyo caso se aplica la pactada.',
    articulo: 'Ley 18.212, art. 20',
  },
])

/** A quién reclamarle, que depende de quién te prestó. */
export const CONTROL: readonly ReglaUsura[] = Object.freeze([
  {
    titulo: 'Banco Central del Uruguay',
    texto:
      'Controla a las empresas de intermediación financiera y a las demás personas físicas y jurídicas que realicen regularmente operaciones crediticias. O sea: bancos, financieras, y quien preste de forma habitual.',
    articulo: 'Ley 18.212, art. 24',
  },
  {
    titulo: 'Área de Defensa del Consumidor (MEF)',
    texto:
      'Tiene competencia sobre el crédito comercial que dan proveedores de bienes y servicios no financieros dentro de una relación de consumo, y sobre el resto de los casos en general. Es la puerta cuando el que financió fue el comercio.',
    articulo: 'Ley 18.212, art. 24',
  },
])

export interface FuenteUsura {
  label: string
  url: string
}

export const LEY_USURA_SOURCES: readonly FuenteUsura[] = Object.freeze([
  {
    label: 'Ley N.º 18.212 — Tasas de interés y usura (texto vigente, IMPO)',
    url: 'https://www.impo.com.uy/bases/leyes/18212-2007',
  },
  {
    label: 'Ley N.º 19.732, art. 22 — la redacción vigente del art. 11',
    url: 'https://www.impo.com.uy/bases/leyes/19732-2018',
  },
  {
    label: 'BCU — Tasas medias de interés (la tabla contra la que se mide el tope)',
    url: 'https://www.bcu.gub.uy/Servicios-Financieros-SSF/Tasas-Medias/tasas-medias-interes.pdf',
  },
])

export const LEY_USURA_VERIFIED_AT = '2026-09-03'

export interface FaqEntryUsura {
  question: string
  answer: string
}

/** Las preguntas son las que sugiere el autocompletado uruguayo, no las que se nos ocurrieron. */
export const LEY_USURA_FAQ: readonly FaqEntryUsura[] = Object.freeze([
  {
    question: '¿Cuál es la tasa máxima legal en Uruguay?',
    answer:
      'No es un número fijo: es un porcentaje por encima de la tasa media que publica el Banco Central, y depende del crédito. En un crédito común de menos de 2.000.000 UI el tope es la tasa media más un 55 %. Si te lo descuentan del sueldo y es un Crédito de Nómina, el tope baja a un 20 %; si es otra retención, a un 30 %. En mora sube a un 80 %, y por encima de 2.000.000 UI a un 90 % (120 % en mora).',
  },
  {
    question: '¿La tasa que figura en el contrato es la que se compara con el tope?',
    answer:
      'No. La ley compara la tasa implícita, que es la tasa interna de retorno de todo lo que pagás: intereses, compensaciones, comisiones, gastos, seguros, cualquier otro cargo y hasta las cláusulas penales. Una tasa nominal baja con cargos altos puede ser usuraria igual.',
  },
  {
    question: '¿Qué pasa si me cobraron intereses usurarios?',
    answer:
      'Caduca el derecho a cobrarte intereses, compensaciones, comisiones, gastos y cualquier otro cargo: queda el capital que subsista más costas y costos. Y lo que ya te cobraron por esos conceptos debe descontarse del crédito a ejecutar. Además el juez tiene que comunicar la identidad del infractor a la autoridad administrativa.',
  },
  {
    question: '¿Tengo que plantear la usura yo en el juicio?',
    answer:
      'No hace falta: la usura se releva de oficio, y quedó incorporada como excepción oponible en el juicio ejecutivo de títulos valores, que es donde suelen terminar estas deudas. Igual, plantearla y aportar los números ayuda.',
  },
  {
    question: '¿La usura es delito en Uruguay?',
    answer:
      'Sí. Quien, aprovechando la necesidad, la ligereza o la inexperiencia de una persona, le hace dar o prometer intereses usurarios tiene seis meses de prisión a cuatro años de penitenciaría. Agravan, entre otras, prestar de forma profesional o habitual, exigir garantías extorsivas e incluir como capital lo que son intereses.',
  },
  {
    question: '¿Los intereses de una deuda vieja siguen creciendo para siempre?',
    answer:
      'En deudas chicas, no. Si el capital inicial era menor a 20.000 UI, los intereses moratorios caducan de pleno derecho a los veinticuatro meses desde que cada obligación se hizo exigible, salvo que el acreedor haya iniciado acción judicial dentro de ese plazo. Después de eso sólo corren los ajustes del Decreto-Ley 14.500.',
  },
  {
    question: '¿Contra qué tasa media se compara mi préstamo?',
    answer:
      'Contra la del trimestre móvil anterior a la fecha en que se constituyó la obligación, no contra la de hoy. Un préstamo firmado hace dos años se juzga con la tabla de aquel momento.',
  },
  {
    question: '¿Dónde denuncio que me están cobrando de más?',
    answer:
      'Depende de quién prestó. El Banco Central controla a las empresas de intermediación financiera y a quienes hacen operaciones de crédito con regularidad. El Área de Defensa del Consumidor del Ministerio de Economía tiene competencia sobre el crédito comercial de proveedores no financieros y sobre el resto de los casos en general.',
  },
])
