// app/utils/oseBill.ts
// Datos de la factura de OSE para /factura-de-ose-uruguay.
//
// POR QUÉ EXISTE: el sitio ya tenía la página de la factura de UTE y la de la deuda con Antel, y
// OSE —el tercer servicio del hogar, y la única de las tres que factura el agua dos veces— no
// aparecía en ninguna página propia: sólo suelta, dentro de `stateSupport.ts`, como beneficiaria de
// la tarifa social. Las palabras clave «factura de ose saneamiento» y «tarifa ose 2026» ya estaban
// cargadas en la entrada de nav de la página de UTE, apuntando a una página que no existía.
//
// MÓDULO PURO (sin Vue/Nuxt), compartido por la página y `app/tests/unit/oseBill.test.ts`.
//
// EL DATO QUE LA GENTE NO SABE, y es el motivo de la página: el saneamiento no es un adicional
// chico. Su cargo variable es el 100 % del cargo variable de agua, así que en un hogar con
// saneamiento cada metro cúbico se paga DOS VECES. Y antes del primer metro cúbico ya hay dos
// cargos fijos, uno por cada servicio.
//
// LO QUE ESTE MÓDULO DELIBERADAMENTE NO PUBLICA: la tabla de bloques del cargo variable de agua.
// El decreto la trae, pero sus filas mezclan dos unidades —las dos primeras dicen «por mes» y las
// siguientes «el m3»— y leídas de corrido dan una escala no monótona (el tramo de 10 a 15 m³
// quedaría más barato por m³ que el de 5 a 10). O el importe de esos primeros tramos es un mínimo
// facturable y no un precio por metro, o la transcripción que conseguimos no refleja el original.
// URSEA, por su lado, describe el cargo variable como «por metro cúbico» y creciente por tramos,
// que es lo contrario de lo que sugieren esas dos filas. Con dos lecturas incompatibles y ninguna
// forma de dirimirlas contra una segunda fuente, acá no va ningún número de bloque: la página
// explica la ESTRUCTURA, que sí está doblemente confirmada, y manda al decreto para los tramos.
// Publicar una tabla mal leída de la que sale la cuenta del agua de un hogar sería exactamente el
// tipo de dato que este sitio no publica.
//
// FUENTES PRIMARIAS, verificadas el 2026-09-03:
//   - IMPO, Decreto N.º 340/025 — decreto tarifario de OSE, vigente desde el 1/1/2026. De acá
//     salen los dos cargos fijos y el coeficiente de ajuste.
//     https://www.impo.com.uy/bases/decretos-originales/340-2025
//   - URSEA (gub.uy), «Régimen tarifario» — estructura de la tarifa de agua y saneamiento, y la
//     regla del 100 %. Es la fuente que confirma la estructura de forma independiente del decreto.
//     https://www.gub.uy/unidad-reguladora-servicios-energia-agua/politicas-y-gestion/regimen-tarifario-0
//   - URSEA (gub.uy), «Agua y Saneamiento» (preguntas frecuentes) — composición de la factura.
//     https://www.gub.uy/unidad-reguladora-servicios-energia-agua/institucional/preguntas-frecuentes/agua-saneamiento
//   - URSEA (gub.uy), «Informe de ajuste de tarifario de OSE vigente al 1° de enero de 2026».
//     https://www.gub.uy/unidad-reguladora-servicios-energia-agua/comunicacion/publicaciones/informe-ajuste-tarifario-ose-vigente-1-enero-2026

export const OSE_VERIFIED_AT = '2026-09-03'

/** El decreto tarifario vigente. Los importes de este módulo no valen fuera de él. */
export const OSE_DECREE = Object.freeze({
  numero: 'Decreto N.º 340/025',
  vigenciaDesde: '1 de enero de 2026',
  url: 'https://www.impo.com.uy/bases/decretos-originales/340-2025',
})

export interface OseSource {
  label: string
  url: string
}

export const OSE_SOURCES: readonly OseSource[] = Object.freeze([
  {
    label: 'IMPO — Decreto N.º 340/025, decreto tarifario de OSE vigente desde el 1/1/2026',
    url: 'https://www.impo.com.uy/bases/decretos-originales/340-2025',
  },
  {
    label: 'URSEA — Régimen tarifario de agua potable y saneamiento',
    url: 'https://www.gub.uy/unidad-reguladora-servicios-energia-agua/politicas-y-gestion/regimen-tarifario-0',
  },
  {
    label: 'URSEA — Preguntas frecuentes de Agua y Saneamiento',
    url: 'https://www.gub.uy/unidad-reguladora-servicios-energia-agua/institucional/preguntas-frecuentes/agua-saneamiento',
  },
  {
    label: 'URSEA — Informe de ajuste tarifario de OSE vigente al 1.º de enero de 2026',
    url: 'https://www.gub.uy/unidad-reguladora-servicios-energia-agua/comunicacion/publicaciones/informe-ajuste-tarifario-ose-vigente-1-enero-2026',
  },
])

/**
 * Los dos cargos fijos, en pesos por mes. Son los únicos importes que este módulo publica, y los
 * dos salen del Decreto 340/025.
 *
 * El de agua corresponde a la conexión de 12,5 a 13 mm, que es la del hogar común, en la categoría
 * «Montevideo e Interior excepto zona balnearia»: el decreto tiene otros valores por diámetro y la
 * zona balnearia se tarifa aparte, así que el número no se puede leer como «el cargo fijo de OSE» a
 * secas. El de saneamiento el decreto lo escribe por unidad habitacional.
 */
export const OSE_FIXED_CHARGES = Object.freeze({
  agua: Object.freeze({
    label: 'Cargo fijo de agua',
    monto: 327.5,
    detalle: 'Conexión de 12,5 a 13 mm, Montevideo e Interior excepto zona balnearia.',
  }),
  saneamiento: Object.freeze({
    label: 'Cargo fijo de saneamiento',
    monto: 137.05,
    detalle: 'Saneamiento convencional residencial, por unidad habitacional.',
  }),
})

/**
 * Lo que paga por mes un hogar ANTES del primer metro cúbico. Es una suma, no una tarifa publicada
 * como tal: por eso se calcula acá y no se guarda como constante, para que no pueda quedar
 * desincronizada de sus dos sumandos.
 */
export function fixedMonthlyFloor(withSaneamiento = true): number {
  const agua = OSE_FIXED_CHARGES.agua.monto
  return withSaneamiento ? agua + OSE_FIXED_CHARGES.saneamiento.monto : agua
}

/**
 * La regla del artículo tarifario que duplica la parte variable, en las palabras del decreto.
 *
 * `notaUrsea` existe porque las dos fuentes no dicen exactamente lo mismo y el sitio no elige por
 * el lector: el decreto fija el 100 % sobre el CARGO VARIABLE DE AGUA, mientras que URSEA lo
 * describe sobre «el importe de la factura por consumo de agua, con un máximo». La base del cálculo
 * y ese máximo no se publican acá porque no pudimos fijar su valor contra el texto vigente.
 */
export const SANEAMIENTO_RULE = Object.freeze({
  porcentaje: 100,
  citaDecreto:
    'El cargo variable del servicio de saneamiento convencional en suministros con tarifas ' +
    'residencial, comercial, de obra e industrial será el 100% del importe facturado por cargo ' +
    'variable de agua.',
  notaUrsea:
    'URSEA describe el mismo cargo como equivalente al 100 % del importe de la factura por ' +
    'consumo de agua «con un máximo». Ese tope existe; su valor no se publica en esta página ' +
    'porque no pudimos confirmarlo contra el texto vigente.',
})

/**
 * El ajuste que rige desde enero de 2026. Se publica descompuesto porque el reparto es la parte
 * informativa: 4,8 puntos son inflación proyectada y 3,7 —el 44 % del ajuste— no lo son.
 */
export const OSE_2026_ADJUSTMENT = Object.freeze({
  total: 8.5,
  inflacionProyectada: 4.8,
  desequilibrioEstructural: 3.7,
})

export interface OseBillComponent {
  servicio: 'Agua' | 'Saneamiento'
  concepto: string
  comoSeCalcula: string
}

/** De qué está hecha la factura, según la descripción de URSEA. */
export const OSE_BILL_COMPONENTS: readonly OseBillComponent[] = Object.freeze([
  {
    servicio: 'Agua',
    concepto: 'Cargo fijo',
    comoSeCalcula:
      'Un importe por mes que depende de la categoría y del diámetro de la conexión. Se paga ' +
      'aunque el consumo del período sea cero.',
  },
  {
    servicio: 'Agua',
    concepto: 'Cargo variable',
    comoSeCalcula:
      'Por metro cúbico, con tramos: el precio del metro sube a medida que sube el consumo, así ' +
      'que los últimos metros del mes valen más que los primeros.',
  },
  {
    servicio: 'Saneamiento',
    concepto: 'Cargo fijo',
    comoSeCalcula:
      'Otro importe por mes, distinto del de agua y con su propia tarifa según sea residencial, ' +
      'comercial o industrial. Sólo lo paga quien está conectado a la red.',
  },
  {
    servicio: 'Saneamiento',
    concepto: 'Cargo variable',
    comoSeCalcula:
      'No se mide aparte: es el 100 % del cargo variable de agua. Por eso el agua que usás se ' +
      'paga dos veces si tenés saneamiento.',
  },
])

export interface OseFaq {
  question: string
  answer: string
}

export const OSE_FAQ: readonly OseFaq[] = Object.freeze([
  {
    question: '¿Por qué el saneamiento sale casi lo mismo que el agua?',
    answer:
      'Porque el decreto tarifario lo define así: el cargo variable del saneamiento convencional ' +
      'es el 100 % del importe facturado por cargo variable de agua. No se mide cuánta agua sale ' +
      'de tu casa, se copia lo que se midió al entrar. A eso se le suma un cargo fijo propio de ' +
      '$ 137,05 por unidad habitacional y por mes, aparte del cargo fijo de agua.',
  },
  {
    question: '¿Cuánto pago si no uso nada de agua?',
    answer:
      'Los dos cargos fijos igual. Con el Decreto 340/025, una conexión de 12,5 a 13 mm en ' +
      'Montevideo o el Interior fuera de la zona balnearia paga $ 327,50 por mes de cargo fijo de ' +
      'agua, y si tiene saneamiento se le suman $ 137,05: $ 464,55 por mes antes del primer metro ' +
      'cúbico. Los cargos fijos no dependen del consumo.',
  },
  {
    question: '¿Por qué la factura sube más que el agua que usé?',
    answer:
      'Por dos efectos que se multiplican. El cargo variable de agua es escalonado y creciente: ' +
      'los metros cúbicos de más caen en tramos más caros que los primeros. Y si tenés ' +
      'saneamiento, ese cargo variable se cobra dos veces, porque el del saneamiento es el 100 % ' +
      'del de agua. Un consumo un poco más alto pega en las dos puntas a la vez.',
  },
  {
    question: '¿Cuánto aumentó OSE en 2026?',
    answer:
      'El Decreto 340/025 aprobó un coeficiente de ajuste del 8,5 % a partir del 1.º de enero de ' +
      '2026, compuesto por un 4,8 % de inflación proyectada para el año y un 3,7 % adicional para ' +
      'ajustar el desequilibrio estructural de la empresa. O sea que el 44 % del aumento no ' +
      'responde a la inflación esperada sino a las cuentas del organismo.',
  },
  {
    question: '¿Cuál es el precio del metro cúbico de agua?',
    answer:
      'Depende del tramo de consumo, y esta página no publica la tabla. El Decreto 340/025 la ' +
      'trae, pero sus filas mezclan importes «por mes» con precios «el m3» y las dos lecturas ' +
      'posibles dan resultados distintos para un mismo consumo. Antes que publicar una tabla que ' +
      'podría estar mal leída, preferimos mandarte al decreto, que es el texto que rige.',
  },
])
