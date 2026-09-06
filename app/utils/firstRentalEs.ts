import type { FirstRentalCopy } from './firstRental'

export const firstRentalEs: FirstRentalCopy = {
  title: 'Primer alquiler en Uruguay: gastos y trámites al mudarte',
  description:
    'Qué pagar además del alquiler, cómo cambiar UTE y OSE a tu nombre y qué revisar al recibir las llaves. CGN, tributos, saneamiento y presupuesto de entrada.',
  eyebrow: 'Vivienda · Ya encontraste dónde vivir',
  intro:
    'Estás por firmar y lo que falta es saber cómo funciona la casa: qué cuentas llegan, a nombre de quién y qué conviene dejar resuelto antes de entrar.',
  quickTitle: 'Casa, CGN y sin gastos comunes: ¿qué te queda por pagar?',
  quickAnswer:
    'Alquiler + 3 % mensual de CGN, luz, agua y los tributos y el saneamiento que correspondan a la vivienda. Sumá internet, gas u otros servicios que contrates. Que no haya gastos comunes no significa que el alquiler incluya las demás cuentas.',
  scope:
    'La guía parte de una casa con UTE y OSE independientes. Los detalles de tributo domiciliario y facturación municipal de saneamiento son de Montevideo; más abajo explicamos qué cambia en el interior.',
  navLabel: 'En esta guía',
  nav: [
    { id: 'llaves', label: 'Antes de entrar' },
    { id: 'cuentas', label: 'Qué vas a pagar' },
    { id: 'tramites', label: 'UTE y OSE' },
    { id: 'presupuesto', label: 'Tu presupuesto' },
  ],
  checklistTitle: 'Lo que te llevás junto con las llaves',
  checklistIntro:
    'Marcá lo que ya tenés. Esta lista se mantiene mientras permanezcas en la página; no se guarda al salir.',
  checklist: [
    {
      id: 'contract',
      title: 'Contrato y detalle de lo que pagaste',
      text: 'Copia firmada, fecha desde la que corre el alquiler, reajuste, honorarios acordados y recibos. Confirmá cuándo empieza el descuento de CGN y cómo se liquida el primer período.',
    },
    {
      id: 'accounts',
      title: 'Últimas facturas y cuentas sin atrasos',
      text: 'Pedí UTE, OSE, tributos y saneamiento, con números de cuenta y períodos. El arrendador con CGN debe entregar la vivienda libre de deudas accesorias; dejá constancia de cualquier pendiente.',
    },
    {
      id: 'meters',
      title: 'Fotos de medidores y de la vivienda',
      text: 'Anotá lecturas y fecha de entrega. Comprobá que cada medidor corresponde a tu casa; fotografiá humedad, vidrios, grifería y artefactos. Las fotos acompañan el inventario, no lo sustituyen.',
    },
    {
      id: 'inventory',
      title: 'Inventario revisado',
      text: 'Comparalo con el estado real antes de firmar. Si encontrás diferencias, comunicalas y tramitá su corrección enseguida con la inmobiliaria y SGA; no las dejes para el final del contrato.',
    },
    {
      id: 'contacts',
      title: 'Titulares, vencimientos y contacto para reparaciones',
      text: 'Coordiná UTE y OSE a tu nombre. Confirmá cómo recibir cada factura, quién atiende una pérdida o rotura, y dónde están la llave de paso del agua y el tablero eléctrico.',
    },
  ],
  checked: '{done} de {total} resueltos',
  reset: 'Desmarcar la lista',
  billsTitle: 'Las cuentas que siguen después de la mudanza',
  billsIntro:
    'Pedí importes reales de esta vivienda. Una factura de otro hogar no te dice cuánto vas a consumir, y una boleta con deuda no sirve como presupuesto ordinario.',
  bills: [
    {
      id: 'rent',
      title: 'Alquiler y comisión de CGN · Todos los meses',
      text: 'CGN-SGA cobra al inquilino un 3 % del alquiler por mes. Ejemplo ilustrativo: $25.000 de alquiler + $750 de comisión = $25.750 antes de servicios. La comisión del propietario es independiente: no se suma otro 3 % a tu cuenta.',
      sources: ['cgnFee'],
    },
    {
      id: 'utilities',
      title: 'UTE y OSE · Según cada factura',
      text: 'Pagás la electricidad y el agua de tu período. Confirmá fecha de lectura, cargos fijos, tarifa y vencimiento; el consumo cambia con tus hábitos. No des por hecho que CGN paga estas cuentas por vos: acordá el canal de pago y guardá los comprobantes.',
      sources: ['cgnBills', 'cgnRights'],
    },
    {
      id: 'tax',
      title: 'Tributo domiciliario · Cada dos meses en Montevideo',
      text: 'Es el llamado impuesto de puerta y CGN lo incluye entre los accesorios del inquilino. Pedí el número de cuenta y una factura ordinaria. Si llega por $1.200 cada dos meses, reservá $600 por mes; es un ejemplo de organización, no una tarifa.',
      sources: ['homeTax', 'cgnBills'],
    },
    {
      id: 'sanitation',
      title: 'Saneamiento · Revisá prestador y conexión',
      text: 'En Montevideo lo factura la IM cada dos meses a los ocupantes de inmuebles que usan la red. Es una cuenta distinta del agua potable de OSE. Tiene una parte fija y otra asociada al consumo: pedí la boleta de esta casa, no un importe genérico.',
      sources: ['sanitation'],
    },
    {
      id: 'common',
      title: 'Gastos comunes · Solo si existen',
      text: 'En una casa sin gastos comunes confirmados, este rubro es cero. En un apartamento, pedí el desglose: puede incluir agua o saneamiento que no debés sumar otra vez. Separá los cargos ordinarios de las obras o gastos del propietario.',
      sources: ['cgnBills'],
    },
  ],
  territoryTitle: 'El departamento y la conexión cambian la cuenta',
  territory: [
    {
      id: 'montevideo',
      title: 'Si la casa está en Montevideo',
      text: 'Tributo domiciliario, saneamiento y Contribución Inmobiliaria son conceptos distintos. El adicional de Contribución destinado a drenaje pluvial es del propietario; no es la tarifa de saneamiento del ocupante.',
      sources: ['sanitation', 'propertyTax'],
    },
    {
      id: 'interior',
      title: 'Si está en otro departamento',
      text: 'OSE presta saneamiento en el interior, además del agua en todo el país. Revisá la factura local y la conexión de la vivienda: si ya ingresaste una cuenta de OSE que incluye saneamiento, no lo agregues de nuevo. Los tributos se consultan en la intendencia correspondiente. Si hay pozo negro, preguntá por el servicio de barométrica y acordá quién lo gestiona y paga.',
      sources: ['oseCoverage'],
    },
  ],
  proceduresTitle: 'Cómo poner luz y agua a tu nombre',
  procedures: [
    {
      id: 'ute',
      title: 'UTE: cambio de nombre del servicio',
      text: 'Lo pide el nuevo titular. Tené a mano el número de cuenta o los datos de la dirección y del titular actual, además de tus datos personales. UTE exige ser mayor de edad y no tener deuda propia pendiente. Si el servicio está cortado o no hay conexión, consultá la gestión y el costo aplicables: cambiar de nombre no equivale a un alta nueva.',
      sources: ['ute'],
    },
    {
      id: 'ose',
      title: 'OSE: cambio de nombre del servicio',
      text: 'Prepará identificación y un documento que acredite el padrón, como recibo de tributos o cédula catastral; llevá también el contrato. Si aparece deuda, OSE prevé presentar el vínculo con la vivienda y una declaración jurada para solicitar la desvinculación. No desaparece sola por decir que recién te mudás. El trámite se informa sin costo, salvo timbre profesional para esa desvinculación; una conexión nueva o independización es otra gestión.',
      sources: ['ose'],
    },
    {
      id: 'municipal',
      title: 'Tributos y saneamiento: asegurá que la factura te llegue',
      text: 'Pedí los números de cuenta a la inmobiliaria y verificá con el prestador cómo consultar deuda, recibir la boleta y registrar al ocupante cuando corresponda. Agendá vencimientos. Si una factura cruza la fecha de entrega, acordá por escrito cómo separar el período anterior del tuyo usando las lecturas y fechas.',
      sources: ['homeTax', 'sanitation'],
    },
  ],
  ownerTitle: 'Lo que conviene separar de tus consumos',
  ownerText:
    'Contribución Inmobiliaria e Impuesto de Primaria no son el tributo domiciliario. Sus sujetos incluyen propietarios y otros titulares de derechos sobre la vivienda; no los agregues automáticamente como si fueran luz o agua. Si el contrato pretende trasladártelos, consultá esa cláusula con SGA antes de firmar.',
  repairsText:
    'CGN distingue las reparaciones necesarias para la habitabilidad, a cargo del arrendador, de las reparaciones locativas por el uso, a cargo del inquilino. Ante humedad, pérdidas o fallas, documentá y avisá; no descuentes un arreglo del alquiler por tu cuenta ni hagas mejoras sin autorización escrita.',
  entryTitle: 'La plata para entrar va por separado',
  entryText:
    'Pedí una liquidación escrita: primer período de alquiler, honorarios inmobiliarios acordados con impuestos, mudanza y cualquier alta o reconexión necesaria. CGN no cobra por elaborar o celebrar el contrato, pero eso no elimina los honorarios de la inmobiliaria. No agregues una garantía o depósito extra por costumbre: verificá qué se acordó. Sumá equipamiento básico y un margen para imprevistos.',
  budgetTitle: 'Pasá tus facturas a un presupuesto mensual',
  budgetIntro:
    'Ingresá tus propios importes en pesos uruguayos, sin separador de miles: por ejemplo, 25000. Sumá cada gasto una sola vez; escribí 0 si no corresponde y dejá vacío lo que todavía no sabés. Estos datos no se guardan ni se envían.',
  fields: {
    rent: { label: 'Alquiler mensual', hint: 'Solo alquiler, antes de la comisión de CGN.' },
    monthly: {
      label: 'Otros gastos por mes',
      hint: 'Sumá UTE, OSE, internet, gas y gastos comunes, si hay. Si usás otra garantía, incluí aquí su costo mensual equivalente.',
    },
    bimonthly: {
      label: 'Total de facturas cada dos meses',
      hint: 'Por ejemplo, tributo domiciliario + saneamiento de IM. Ingresá la suma completa de ambas boletas, sin deudas; la dividimos entre 2.',
    },
    entry: {
      label: 'Gastos de entrada, por única vez',
      hint: 'Honorarios, mudanza, altas y equipamiento. Excluí alquiler y cuentas ya ingresados arriba.',
    },
  },
  cgnLabel: 'Mi garantía es CGN: sumar 3 % mensual',
  cgnHint: 'Se aplica únicamente al alquiler. No es una comisión universal para otras garantías.',
  monthlyResult: 'Reserva mensual para la vivienda',
  entryResult: 'Un mes de reserva + gastos de entrada',
  feeResult: 'Comisión mensual de CGN',
  missing: 'Cálculo parcial: faltan importes. Los campos vacíos no se suman.',
  budgetEmpty: 'Ingresá el alquiler para ver el cálculo.',
  invalid: 'Usá un importe entre 0 y 1.000.000.000, sin separador de miles.',
  budgetNote:
    'La reserva reparte los gastos bimestrales entre dos meses; no cambia sus vencimientos. No es la liquidación de la firma ni predice la primera factura. Comida, transporte y otros gastos personales van aparte.',
  faqTitle: 'Dudas de un primer alquiler',
  faq: [
    {
      q: '¿CGN me descuenta todo junto con el alquiler?',
      a: 'No asumas que el descuento incluye luz, agua, tributos o saneamiento. Identificá cada cuenta, cómo se paga y qué comprobantes tenés que conservar. La comisión mensual del inquilino es el 3 % del alquiler.',
    },
    {
      q: '¿Pagar OSE incluye el saneamiento?',
      a: 'En Montevideo, el agua potable de OSE y la tarifa de saneamiento de la IM son cuentas distintas. En el interior, OSE presta saneamiento: revisá la conexión y el desglose de la factura. Si un rubro ya está incluido, no lo sumes dos veces.',
    },
    {
      q: '¿Tengo que pagar deudas que dejó el inquilino anterior?',
      a: 'Con CGN, el arrendador debe entregar la vivienda libre de deudas accesorias. Pedí estado de cuentas y documentá los períodos. Si OSE muestra deuda, solicitá la desvinculación con los documentos que exige; no presupongas que un cambio de nombre la resuelve automáticamente.',
    },
    {
      q: '¿Qué diferencia hay entre una casa y un apartamento?',
      a: 'La casa puede no tener gastos comunes, pero sigue teniendo servicios y tributos aplicables. En un apartamento, algunos consumos pueden venir dentro de gastos comunes. Lo decisivo es el desglose real, si los medidores son propios y si la vivienda tiene conexión a saneamiento.',
    },
  ],
  relatedTitle: 'Para el siguiente paso',
  related: [
    { path: '/alquilar-en-uruguay', label: 'Garantías, contrato y búsqueda de vivienda' },
    { path: '/alquileres-uruguay', label: 'Buscar casas y apartamentos en alquiler' },
    { path: '/herramientas/costo-de-vida', label: 'Sumar los demás gastos de vivir en Uruguay' },
  ],
  sourcesTitle: 'Fuentes para comprobar cada trámite',
  sourceNewTab: 'Abrir fuente en otra pestaña',
  reviewed:
    'Fuentes revisadas el 6 de septiembre de 2026. Los importes del presupuesto los ingresás vos; consultá tus facturas y las condiciones de tu contrato.',
  sourceLabels: {
    cgnFee: 'CGN · Comisión mensual',
    cgnBills: 'CGN · Servicios accesorios',
    cgnRights: 'CGN · Derechos y obligaciones',
    homeTax: 'IM · Tributos domiciliarios',
    propertyTax: 'IM · Contribución inmobiliaria',
    primaryTax: 'DGI · Impuesto de Primaria',
    ose: 'OSE · Cambio de nombre',
    ute: 'UTE · Cambio de nombre',
    sanitation: 'IM · Tarifa de saneamiento',
    oseCoverage: 'OSE · Agua y saneamiento',
    landlord: 'CGN · Obligaciones del arrendador',
  },
}
