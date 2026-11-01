import type { Guide } from './guides'

/**
 * El Impuesto al Patrimonio de las personas físicas: desde cuánto se paga y cómo la DGI valúa cada
 * bien para llegar a ese número.
 *
 * POR QUÉ ESTA GUÍA. El sitio tenía el impuesto nombrado de costado —una línea de `keywords` en
 * `/impuestos-inversiones-uruguay`, que habla del impuesto a las RENTAS— y ninguna página que
 * contestara la única pregunta que la gente hace: «¿me toca a mí?». Medido el 2026-11-01 con el
 * buscador propio del sitio (`scoreDocs('impuesto al patrimonio')` sobre `buildSearchIndex`): el
 * mejor resultado era `/impuestos-inversiones-uruguay` con **38 puntos**, que es la banda más débil
 * del scorer —coincidencia en el pajar, no en el título—. En el mismo commit ese keyword se saca de
 * ahí, para que la consulta tenga un solo dueño y sea el que la contesta.
 *
 * LO QUE ESTA GUÍA NO PUBLICA, Y POR QUÉ. **La tasa.** El artículo 53 del Título 14 (T.O. 2023)
 * trae una escala progresiva del 0,70 % al 2,75 % en múltiplos del mínimo no imponible, y el mismo
 * artículo ordena reducir esas tasas «un 0,10 % anual» desde 2016 con piso de 0,10 %, así que la
 * escala escrita NO es la que se aplica. El instructivo oficial del ejercicio 2025 —que sí trae el
 * mínimo no imponible, las cotizaciones al 31/12 y hasta el coeficiente de reajuste de los
 * inmuebles rurales— no publica la escala efectiva, y tampoco la publica la ficha de contribuyentes
 * ni las preguntas frecuentes de la DGI. Aplicar la reducción año por año y publicar el resultado
 * sería una cuenta NUESTRA presentada como dato oficial, que es justo lo que este repo no hace: la
 * guía dice por qué no hay porcentaje y manda al simulador de la DGI, que es quien tiene la tasa.
 *
 * Tampoco publica el mínimo no imponible del ejercicio 2026 —el que se mide al 31/12/2026—, porque
 * lo fija un decreto anual que al 1/11/2026 no estaba publicado. Lo que se publica es el del
 * ejercicio 2025, con su fecha, que es el último que existe.
 *
 * LO QUE SÍ PUBLICA. El umbral y las REGLAS DE AVALÚO, que es donde está la sorpresa y lo que
 * decide si alguien cruza el mínimo: el auto entra por **25 veces la patente** del año, un
 * apartamento alquilado por **15 veces el alquiler anual**, la casa propia se descuenta a la mitad
 * con tope del propio mínimo, el saldo de la AFAP no cuenta, y al activo se le **suma** un ficto
 * del 10 %/20 % por el ajuar. Todas salen textuales del instructivo 2025 de la DGI, con su URL.
 */
export const patrimonioGuides: readonly Guide[] = [
  {
    slug: 'impuesto-al-patrimonio-uruguay',
    title: 'Impuesto al Patrimonio: desde $ 6.653.000',
    description:
      'Se declara arriba de $ 6.653.000 al 31/12 ($ 13.306.000 el núcleo familiar). El auto cuenta 25 veces la patente y el alquilado, 15 alquileres anuales.',
    tag: 'PATRIMONIO',
    updatedAt: '2026-11-01',
    sections: [
      {
        heading: '¿A quién le toca declarar?',
        body: 'La DGI lo dice con montos: son contribuyentes las personas físicas cuyo patrimonio fiscal al 31 de diciembre de 2025 supera 6.653.000 pesos, los núcleos familiares cuando excede 13.306.000 y las sucesiones indivisas que pasan los 6.653.000 mientras no esté ejecutoriado el auto de declaratoria de herederos. Son los montos del ejercicio 2025, los últimos publicados: el del ejercicio 2026 lo fija un decreto anual que todavía no salió, así que acá no lo vas a encontrar adelantado. Dos cosas que conviene tener claras antes de hacer cualquier cuenta. La primera es que el impuesto es una foto de un día y no un promedio del año: lo que vendiste el 30 de diciembre no está, y lo que cobraste el 29 sí. La segunda es que el núcleo familiar es una OPCIÓN de los cónyuges que conviven al 31 de diciembre, se elige año a año y duplica el mínimo, pero los vuelve responsables solidarios del impuesto; si no optan, cada uno declara sus bienes propios más la mitad de los gananciales. Los bienes de los hijos menores nunca entran al núcleo: ellos declaran por separado a través de su representante legal.',
        table: {
          headers: ['Quién declara', 'Patrimonio fiscal al 31/12/2025 que obliga a declarar'],
          rows: [
            ['Persona física', 'Más de $ 6.653.000'],
            ['Núcleo familiar (cónyuges que conviven)', 'Más de $ 13.306.000'],
            ['Sucesión indivisa', 'Más de $ 6.653.000'],
          ],
        },
      },
      {
        heading: 'El patrimonio fiscal no es el que tenés en la cabeza',
        body: 'Nadie suma lo que pagó por las cosas. Cada bien tiene su regla de avalúo en el instructivo de la DGI, y dos de ellas pueden mover a alguien de un lado al otro del mínimo no imponible sin que su plata haya cambiado. La primera es el auto: los vehículos automotores, cualquiera sea el lugar de empadronamiento, se computan por el valor por el que debió pagarse la Patente de Rodados del año multiplicado por el factor 25, sin considerar bonificaciones ni sanciones de mora. No es el precio de venta ni el aforo del SUCIVE: es la patente por veinticinco, así que una patente de 12.000 pesos son 300.000 pesos de patrimonio fiscal. La segunda es el inmueble que tenés alquilado a otro: si al 31 de diciembre estaba arrendado, vale 15 veces el arrendamiento anual —los doce meses, se haya cobrado o no—, y ese valor no puede superar el valor real del padrón. Un apartamento alquilado a 30.000 pesos por mes son 5.400.000 pesos, casi el mínimo no imponible entero. Lo demás es más previsible: los inmuebles urbanos van por el valor base que emite la Dirección Nacional de Catastro según el Decreto 334/025, los rurales por el valor real de 2012 reajustado por el índice de la producción agropecuaria del INE (para 2025, el valor fiscal de 2024 por 1,052894, sin pasar el valor real que fija Catastro), y los créditos a tu favor documentados con vales, pagarés, conformes o letras de cambio están gravados plenamente. El pasivo se deduce, con una regla que conviene conocer: cuando hay activos en el exterior, exentos, excluidos o no computables, sólo se computa como pasivo lo que las deudas deducibles exceden el valor de esos activos, porque primero los absorben ellos. Y hay una buena noticia que la DGI contesta expresamente: el saldo acumulado en tu cuenta de la AFAP no se computa.',
        table: {
          headers: ['Bien', 'Cómo se valúa', 'Ejemplo'],
          rows: [
            ['Auto o camioneta', '25 veces la patente del año', 'Patente de $ 12.000: $ 300.000'],
            [
              'Inmueble que alquilás a otro',
              '15 veces el alquiler anual, tope en el valor real',
              'Alquiler de $ 30.000: $ 5.400.000',
            ],
            [
              'Inmueble urbano propio',
              'El valor base que emite Catastro (Dto. 334/025)',
              'Se consulta por padrón',
            ],
            [
              'Inmueble rural',
              'Valor real 2012 reajustado, sin pasar el valor real actual',
              'Para 2025: el de 2024 por 1,052894',
            ],
            [
              'Vales, pagarés y letras a tu favor',
              'Gravados plenamente',
              'Por su valor, documentados o no',
            ],
            ['Saldo de tu AFAP', 'No se computa', 'Queda afuera del activo'],
            ['Tus deudas', 'Se deducen, con la regla de absorción', 'Lo que exceda esos activos'],
          ],
        },
        links: [
          { label: 'Cómo consultar el valor real de un padrón', to: '/valor-catastral-uruguay' },
        ],
      },
      {
        heading: 'La casa en la que vivís se descuenta a la mitad, pero con tope',
        body: 'Al valor real del inmueble destinado a casa-habitación se le deduce el 50 por ciento, con un máximo igual al mínimo no imponible que corresponda. El tope es lo que casi nadie tiene presente y es lo que decide: la deducción crece hasta que el valor real llega al doble del mínimo —13.306.000 pesos para una persona física en el ejercicio 2025— y a partir de ahí deja de crecer, así que una casa de 20.000.000 se descuenta lo mismo que una de 13.306.000. El beneficio se aplica a un solo inmueble y tiene que ser la vivienda que ocupás como residencia habitual. Si la casa está construida sobre dos padrones, la DGI contesta que se toma el 50 por ciento de la suma de los valores reales de los dos. Y las sucesiones indivisas no tienen casa-habitación, así que no pueden aplicar la deducción ni, por el mismo motivo, el ficto por ajuar.',
      },
      {
        heading: 'El ajuar: el ficto que suma en vez de restar',
        body: 'Los muebles de tu casa no se declaran pieza por pieza: se agrega al activo un valor ficto que representa el ajuar y los muebles de la casa-habitación, y según la DGI incluye además las obras de arte, las colecciones, los documentos, los repositorios y los libros. Se calcula sobre los bienes gravados y exentos computables a ese solo efecto, deducido el pasivo admitido, y el porcentaje tiene dos tramos: 10 por ciento hasta el doble del mínimo no imponible del declarante y 20 por ciento sobre el monto que lo exceda. Es la vuelta de tuerca que a mucha gente le hace cruzar el umbral, porque no depende de lo que tenga adentro de su casa sino de un porcentaje de todo lo demás. Hay dos excepciones frecuentes, las dos por la misma razón —no hay casa-habitación—: las sucesiones indivisas y las personas domiciliadas en el exterior que tienen un inmueble en Uruguay donde no residen o residen esporádicamente. En esos casos corresponde hacer avaluar los muebles por persona idónea, aunque la DGI admite que el declarante use igual el método de los porcentajes fictos.',
      },
      {
        heading: 'Acá no vas a encontrar la tasa, y vale la pena explicar por qué',
        body: 'El artículo 53 del Título 14 del Texto Ordenado 2023 trae una escala progresiva en múltiplos del mínimo no imponible que va del 0,70 por ciento en el primer tramo al 2,75 por ciento sobre el excedente de catorce veces el mínimo. Pero el mismo artículo ordena reducir esas tasas: un 0,25 por ciento anual desde 2008 para los dos últimos tramos, un 0,20 por ciento anual desde 2011 para los tramos 2 a 7 y un 0,10 por ciento anual desde 2016 para todos, sin que la reducción pueda determinar una tasa inferior al 0,10 por ciento. O sea que la escala que está escrita en la ley no es la que se aplica hoy, y ninguna publicación oficial de la DGI imprime el resultado: no está en el instructivo del ejercicio 2025, que sí trae el mínimo no imponible, las cotizaciones al 31 de diciembre y hasta el coeficiente de reajuste de los inmuebles rurales. Podríamos aplicar la reducción año por año y publicar un número, pero sería una cuenta nuestra presentada como dato oficial, y es exactamente lo que no hacemos. Para estimar el importe está el simulador que publica la DGI, que es quien tiene la tasa; la escala de la ley sirve para entender la forma del impuesto, que es progresiva y por tramos del propio mínimo, no una alícuota única sobre todo el patrimonio.',
        table: {
          headers: [
            'Tramo (veces el mínimo no imponible)',
            'Tasa escrita en el art. 53 (antes de las reducciones anuales)',
          ],
          rows: [
            ['Hasta 1 vez', '0,70 %'],
            ['Más de 1 y hasta 2', '1,10 %'],
            ['Más de 2 y hasta 4', '1,40 %'],
            ['Más de 4 y hasta 6', '1,90 %'],
            ['Más de 6 y hasta 9', '2,00 %'],
            ['Más de 9 y hasta 14', '2,45 %'],
            ['El excedente', '2,75 %'],
          ],
        },
      },
      {
        heading: 'Cuándo se declara y cuándo se paga',
        body: 'El impuesto se anticipa sobre el año en curso y se declara el anterior, así que en el mismo año conviven los pagos a cuenta de un ejercicio y la declaración jurada del otro. Para el ejercicio 2025, la DGI publicó el 14 de mayo de 2026 para el pago del saldo y el 15 de mayo de 2026 para la presentación de la declaración jurada. Los pagos a cuenta del ejercicio 2026 vencieron el 22 de setiembre y el 21 de octubre, y el tercero vence el 22 de diciembre de 2026, el mismo día que la opción de pagar un único anticipo equivalente al 80 por ciento del impuesto del ejercicio anterior, prevista en el artículo 6 del Decreto 30/015. Los anticipos se pueden reducir hasta el impuesto estimado, pero para eso hay que presentar una declaración jurada provisoria dentro del plazo del anticipo: sin ella, lo que no se pagó se considera pagado fuera de fecha. La declaración se hace con el formulario 2104 a través de la aplicación Sigma de la DGI y no se puede confeccionar a mano; el boleto de pago lleva el código 321 para personas físicas y el 331 para la sobretasa, que sólo alcanza a los propietarios de inmuebles rurales explotados por terceros.',
        table: {
          headers: ['Vencimiento', 'Día'],
          rows: [
            ['Pago del saldo del ejercicio 2025', '14 de mayo de 2026'],
            ['Declaración jurada del ejercicio 2025', '15 de mayo de 2026'],
            ['Primer pago a cuenta del ejercicio 2026', '22 de setiembre de 2026'],
            ['Segundo pago a cuenta del ejercicio 2026', '21 de octubre de 2026'],
            [
              'Tercer pago a cuenta, y la opción del anticipo único del 80 %',
              '22 de diciembre de 2026',
            ],
          ],
        },
      },
    ],
    faqs: [
      {
        q: '¿Desde qué patrimonio se paga Impuesto al Patrimonio en Uruguay?',
        a: 'Según la DGI, son contribuyentes las personas físicas cuyo patrimonio fiscal al 31 de diciembre de 2025 supera $ 6.653.000 y los núcleos familiares cuando excede $ 13.306.000. Las sucesiones indivisas tienen el mismo umbral que la persona física mientras no esté ejecutoriado el auto de declaratoria de herederos. Son los montos del ejercicio 2025, los últimos publicados.',
      },
      {
        q: '¿Cuánto cuenta mi auto en el Impuesto al Patrimonio?',
        a: 'El instructivo de la DGI dice que los vehículos automotores, cualquiera sea el lugar de empadronamiento, se computan por el valor por el que debió pagarse la Patente de Rodados del año multiplicado por el factor 25, sin considerar bonificaciones ni sanciones de mora. No es el precio de venta ni el aforo: es la patente por veinticinco.',
      },
      {
        q: '¿La casa en la que vivo se descuenta?',
        a: 'Sí, a la mitad: al valor real del inmueble destinado a casa-habitación se le deduce el 50 %, con un máximo igual al mínimo no imponible que corresponda. Como ese tope existe, la deducción deja de crecer cuando el valor real llega al doble del mínimo. Se aplica a un solo inmueble y tiene que ser la vivienda que ocupás como residencia habitual; las sucesiones indivisas no pueden aplicarlo.',
      },
      {
        q: '¿Qué es el ajuar y por qué me sube el patrimonio?',
        a: 'Es un valor ficto que representa los muebles y enseres de la casa-habitación y se suma al activo en vez de declararse pieza por pieza. Se calcula sobre los bienes gravados y exentos computables a ese solo efecto, menos el pasivo admitido: 10 % hasta el doble del mínimo no imponible y 20 % sobre el excedente. Según la DGI incluye además obras de arte, colecciones, documentos y libros.',
      },
      {
        q: '¿El saldo de mi AFAP entra en el patrimonio?',
        a: 'No. La DGI lo contesta expresamente en sus preguntas frecuentes: los saldos acumulados en las cuentas de ahorro individual administradas por las AFAP no se computan en el activo del Impuesto al Patrimonio.',
      },
      {
        q: '¿Cuál es la tasa del Impuesto al Patrimonio de personas físicas?',
        a: 'El artículo 53 del Título 14 fija una escala progresiva que va del 0,70 % al 2,75 % según múltiplos del mínimo no imponible, pero el mismo artículo manda reducir esas tasas un 0,10 % anual desde 2016, con piso de 0,10 %, así que la escala escrita no es la vigente. Ninguna publicación oficial de la DGI imprime la escala efectiva, ni siquiera el instructivo del ejercicio, así que acá no publicamos un porcentaje: el importe se estima con el simulador de la DGI.',
      },
      {
        q: '¿Conviene declarar como núcleo familiar?',
        a: 'Es una opción de los cónyuges que conviven al 31 de diciembre y se elige año a año: duplica el mínimo no imponible a $ 13.306.000, pero los hace responsables solidarios del impuesto. Si no optan, cada uno declara sus bienes propios más la mitad de los gananciales. Los bienes de los hijos menores no entran al núcleo: ellos declaran por separado a través de su representante legal.',
      },
      {
        q: '¿Cuándo se presenta la declaración jurada?',
        a: 'La DGI publicó el 15 de mayo de 2026 para la declaración jurada del ejercicio 2025 y el 14 de mayo para el pago del saldo. Los pagos a cuenta del ejercicio 2026 vencieron el 22 de setiembre y el 21 de octubre, y el tercero vence el 22 de diciembre de 2026, el mismo día que la opción del anticipo único del 80 % del artículo 6 del Decreto 30/015. Se declara con el formulario 2104 por la aplicación Sigma.',
      },
    ],
    related: [
      { label: 'El valor real de un padrón', to: '/valor-catastral-uruguay' },
      { label: 'Contribución inmobiliaria', to: '/contribucion-inmobiliaria-uruguay' },
      { label: 'Impuesto de primaria', to: '/impuesto-de-primaria-uruguay' },
      { label: 'Impuestos sobre inversiones', to: '/impuestos-inversiones-uruguay' },
    ],
    sources: [
      {
        label:
          'Contribuyentes del impuesto al patrimonio: persona física más de $ 6.653.000, núcleo familiar más de $ 13.306.000, sucesión indivisa más de $ 6.653.000 (publicada el 16/01/2026)',
        url: 'https://www.gub.uy/direccion-general-impositiva/comunicacion/publicaciones/contribuyentes-del-impuesto-patrimonio-persona-fisica-nucleos-familiares',
        publisher: 'DGI',
      },
      {
        label:
          'Instructivo Impuesto al Patrimonio personas físicas 2025: mínimos no imponibles del Cuadro 1, factor 25 de los vehículos, 15 veces el arrendamiento anual, deducción del 50 % de la casa-habitación con tope del mínimo, ficto por ajuar del 10 % y 20 %, coeficiente 1,052894 de los inmuebles rurales y formulario 2104',
        url: 'https://www.gub.uy/direccion-general-impositiva/sites/direccion-general-impositiva/files/documentos/publicaciones/PATRIMONIO%20PF%202025.pdf',
        publisher: 'DGI',
      },
      {
        label:
          'Pagos y vencimientos: saldo 2025 el 14/05/2026, declaración jurada el 15/05/2026, pagos a cuenta 2026 el 22/09, el 21/10 y el 22/12, opción del 80 % del art. 6 del Dto. 30/015 el 22/12, códigos 321 y 331',
        url: 'https://www.gub.uy/direccion-general-impositiva/comunicacion/publicaciones/pagos-vencimientos-del-impuesto-patrimonio-personas-fisicas-nucleos',
        publisher: 'DGI',
      },
      {
        label:
          'Preguntas frecuentes: los saldos de las AFAP no se computan, qué incluye el ajuar y sus porcentajes, el 50 % sobre la suma de dos padrones, y cómo se reducen los anticipos',
        url: 'https://www.gub.uy/direccion-general-impositiva/comunicacion/publicaciones/preguntas-frecuentes-sobre-impuesto-patrimonio-personas-fisicas-nucleos',
        publisher: 'DGI',
      },
      {
        label:
          'Título 14 T.O. 2023, artículo 53: la escala del 0,70 % al 2,75 % y las reducciones anuales de 0,25 %, 0,20 % y 0,10 % con piso de 0,10 %',
        url: 'https://www.impo.com.uy/bases/todgi2023/101-2024/53_T14',
        publisher: 'IMPO',
      },
      {
        label: 'Simulador del Impuesto al Patrimonio 2025, que es quien aplica la tasa vigente',
        url: 'https://www.gub.uy/direccion-general-impositiva/politicas-y-gestion/simulador-del-impuesto-patrimonio-2025-0',
        publisher: 'DGI',
      },
    ],
  },
]
