// La guía `/guias/cuanto-cuesta-un-sepelio-uruguay`: qué se paga cuando muere alguien, qué parte
// es pública y qué cobertura la paga.
//
// La demanda sale del autocompletado uruguayo («servicios fúnebres uruguay», «cuánto cuesta un
// sepelio», «cuánto sale un velorio», «cuánto cuesta una cremación en Uruguay»), donde el sitio no
// aparecía. No duplica `/guias/subsidio-expensas-funerarias-bps-uruguay`: aquélla explica el
// reintegro del BPS en detalle y ésta lo nombra en un párrafo y la enlaza.
//
// Todas las cifras, plazos y listas se componen desde `utils/costoSepelio.ts`, donde cada una tiene
// su fuente y su fecha de lectura (2026-11-22). Acá no se escribe ningún número a mano.

import type { Guide } from './guides'
import {
  ANDA_CARENCIA,
  ANDA_CUOTA_AFILIADOS_DESDE,
  ANDA_CUOTA_FUNEBRE,
  ANDA_CUOTA_VIGENCIA,
  ANDA_RUBROS_MONTEVIDEO,
  BPS_GASTOS_COMPLEMENTARIOS_TOPE,
  BPS_PARTIDA_VIGENCIA_DIAS,
  BPS_SUBSIDIO_PLAZO_DIAS,
  BPS_SUBSIDIO_TOPE,
  BPS_SUBSIDIO_VIGENCIA,
  CANELONES_FICTO_FOSA,
  CANELONES_FICTO_NICHO,
  CANELONES_PCT_FOSA,
  CANELONES_PCT_NICHO,
  CANELONES_TARIFAS,
  INSCRIPCION_DIAS_HABILES,
  INSCRIPCION_DIAS_HABILES_RURAL,
  LICENCIA_DUELO,
  MVD_CREMACION_HORAS_MINIMAS,
  MVD_SERVICIO_GRATUITO,
  MVD_TARIFAS,
  MVD_TASA_ANUAL_NICHO_UI,
  MVD_TUBULAR_YEARS,
  PARTIDA_MANUSCRITA_COMUN,
  PARTIDA_MANUSCRITA_URGENTE,
  SEPELIO_FAQ,
  SEPELIO_SOURCES,
  SEPELIO_UI_VALUE,
  SEPELIO_UI_VALUE_AT,
  SEPELIO_VERIFIED_AT,
  canelonesTarifa,
  fechaUy,
  listaEs as lista,
  mvdTarifa,
  sepelioPesos,
  sepelioUi,
  uiEnPesos,
} from './costoSepelio'

/** Una tarifa de Montevideo escrita como la lee una persona: `1.720 UI (unos $ 11.544)`. */
const mvd = (id: string) => {
  const { ui } = mvdTarifa(id)
  return `${sepelioUi(ui)} (unos ${sepelioPesos(uiEnPesos(ui))})`
}

const uiDelDia = fechaUy(SEPELIO_UI_VALUE_AT)
const uiValor = SEPELIO_UI_VALUE.toString().replace('.', ',')
const nichoMin = Math.min(...Object.values(MVD_TASA_ANUAL_NICHO_UI))
const nichoMax = Math.max(...Object.values(MVD_TASA_ANUAL_NICHO_UI))
const cementeriosCon = (ui: number) =>
  lista(
    Object.entries(MVD_TASA_ANUAL_NICHO_UI)
      .filter(([, value]) => value === ui)
      .map(([name]) => name)
  )
const tope = sepelioPesos(BPS_SUBSIDIO_TOPE)
const cremacionCanelones = sepelioPesos(canelonesTarifa('cremacion').uyu)

export const costoSepelioGuide: Guide = {
  slug: 'cuanto-cuesta-un-sepelio-uruguay',
  title: `Sepelio: cremar en la IM cuesta ${sepelioUi(mvdTarifa('cremacion-cadaver').ui)}`,
  description: `Las empresas no publican precios; las tasas sí: en Montevideo cremar cuesta ${sepelioUi(mvdTarifa('cremacion-cadaver').ui)} y la fosa, ${sepelioUi(mvdTarifa('inhumacion-fosa').ui)}. Sin cobertura ni recursos, puede ser gratis.`,
  tag: 'SEPELIO',
  updatedAt: '2026-11-22',
  sections: [
    {
      heading: 'Cuánto cuesta un sepelio: lo que se publica y lo que no',
      body: `Un sepelio tiene dos partes que se pagan por separado, y conviene tenerlo claro antes de llamar a nadie. Una es el servicio fúnebre: ataúd, sala velatoria, traslados, carroza, trámites y aviso. Lo presta una empresa privada y ninguna de las que revisamos publica un precio; Martinelli lo contesta así en sus preguntas frecuentes: «Los costos son variables según el tipo de servicio fúnebre elegido». La otra parte es lo que cobra el cementerio, y eso sí es público porque lo fija la Intendencia. En Montevideo, cremar un cuerpo cuesta ${mvd('cremacion-cadaver')} y la sepultura en fosa o tubular ${mvd('inhumacion-fosa')}, al valor de la UI del ${uiDelDia}. Antes que cualquier presupuesto, lo que más cambia la cuenta es si la persona tenía cobertura: una mutualista, una emergencia móvil o un plan de previsión puede pagar el servicio entero. Si no la tenía, el BPS le reintegra hasta ${tope} a quien pagó, siempre que el fallecido fuera jubilado, trabajador o estuviera en alguno de los otros casos que fija. Y si no había cobertura ni recursos, las intendencias de Montevideo y de Canelones tienen un sepelio sin costo para ciertos casos.`,
      links: [
        {
          label: 'El reintegro del BPS, paso a paso',
          to: '/guias/subsidio-expensas-funerarias-bps-uruguay',
        },
      ],
    },
    {
      heading: 'Lo que cobra la Intendencia de Montevideo',
      body: `Las tarifas del Servicio Fúnebre y Necrópolis están en el artículo A.210.1 del Digesto Departamental, en la redacción del Decreto 38.513 de diciembre de 2023, y van en unidades indexadas. La cifra en UI es la que fija la norma; la conversión a pesos de la tabla usa el valor de la UI del ${uiDelDia} (${uiValor}), así que otro día da un poco distinto. Son tasas del cementerio, no el servicio: los trámites de inhumación pueden ir dentro de lo que hace la empresa fúnebre —el plan de ANDA los incluye—, pero la tasa se paga aparte, y ese mismo reglamento la deja a cargo del afiliado aunque el servicio esté cubierto. Tres datos que conviene saber antes de elegir. En los nichos tubulares del Cementerio del Norte el cuerpo queda ${MVD_TUBULAR_YEARS} años; vencido el plazo hay que reducir o trasladar los restos, y lo que no se retira se crema de oficio. Si la familia ya tiene un nicho o un sepulcro, para cualquier trámite tiene que estar al día con la tasa anual de mantenimiento, que para un nicho de un ataúd va de ${sepelioUi(nichoMin)} en ${cementeriosCon(nichoMin)} a ${sepelioUi(nichoMax)} en ${cementeriosCon(nichoMax)}. Y no se puede cremar antes de que pasen ${MVD_CREMACION_HORAS_MINIMAS} horas del fallecimiento; según el Municipio D, el Cementerio del Norte es el único de los cementerios municipales donde se hacen cremaciones, tanto de servicios privados como municipales.`,
      table: {
        headers: ['Concepto', 'Tarifa', `En pesos, UI del ${uiDelDia}`, 'Norma'],
        rows: MVD_TARIFAS.map(row => [
          row.concepto,
          sepelioUi(row.ui),
          sepelioPesos(uiEnPesos(row.ui)),
          row.norma,
        ]),
      },
      links: [{ label: 'Valor de la Unidad Indexada hoy', to: '/indicadores/unidad-indexada' }],
    },
    {
      heading: 'Lo que cobra la Intendencia de Canelones',
      body: `Canelones publica sus tasas en pesos, en una planilla por semestre; la vigente es la del segundo semestre de 2026. La tasa de sepultura no es un monto fijo sino un porcentaje de un ficto según el tipo de sepultura: para un cuerpo del propio departamento, el ${CANELONES_PCT_FOSA} % de ${sepelioPesos(CANELONES_FICTO_FOSA)} en fosa, con un permiso por tres años, y el ${CANELONES_PCT_NICHO} % de ${sepelioPesos(CANELONES_FICTO_NICHO)} en nicho o panteón, por dos años. Si el cuerpo viene de otro departamento o del exterior, el porcentaje es más alto. La cremación funciona distinto que en Montevideo: la ficha de la Intendencia se llama «Cremaciones en cementerios y hornos privados», porque los hornos los gestionan empresas privadas, y lo que cobra la Intendencia es una tasa de ${cremacionCanelones} por cada cremación, que recauda la empresa. Esa tasa no es el precio de cremar: ése lo fija la empresa y no está publicado.`,
      table: {
        headers: ['Concepto', 'Tasa', 'Qué es la cifra'],
        rows: CANELONES_TARIFAS.map(row => [row.concepto, sepelioPesos(row.uyu), row.nota]),
      },
    },
    {
      heading: 'Qué incluye un servicio fúnebre, rubro por rubro',
      body: `Como las empresas no publican sus paquetes, la descripción pública más completa de un servicio básico es el reglamento con el que ANDA contrata el suyo. Para socios de Montevideo incluye ${lista(ANDA_RUBROS_MONTEVIDEO)}. Dos cláusulas de ese reglamento sirven para leer cualquier otro presupuesto. Si la familia quiere mejorar o ampliar el servicio, paga la diferencia directamente a la empresa. Y los tributos por inhumación y entierro quedan a cargo del afiliado, sea cual sea el cementerio: ni con el servicio cubierto la tasa del cementerio es gratis. Con eso en la mano, lo práctico es pedir el presupuesto por escrito y separado por rubro, incluida la tasa del cementerio, para saber qué estás pagando y qué parte entra en el reintegro del BPS. Si la idea es cremar, tené en cuenta que la cremación no reemplaza al servicio; Martinelli lo responde así: «La cremación, no reemplaza el servicio fúnebre, el cual debe ser realizado previamente».`,
    },
    {
      heading: 'Si tenía cobertura: mutualista, emergencia móvil o plan de previsión',
      body: `Antes de contratar nada, llamá a la mutualista del fallecido, a su emergencia móvil y a cualquier asociación o cooperativa de la que fuera socio, porque algunas ofrecen una cobertura fúnebre aparte de la cuota de salud. Las que revisamos la ofrecen pero no publican el precio: la SMI tiene un convenio de cobertura fúnebre con Martinelli, el Hospital Evangélico un servicio previsional con empresas adheridas y la emergencia móvil SEMM una cobertura de servicio fúnebre y cremación. La excepción es ANDA, que publica la cuota: ${sepelioPesos(ANDA_CUOTA_FUNEBRE)} por mes desde el ${fechaUy(ANDA_CUOTA_VIGENCIA)} para quien se afilió después del ${fechaUy(ANDA_CUOTA_AFILIADOS_DESDE)}, que se paga además de la cuota social. Estos planes tienen carencia, un tiempo de espera desde que se firma el contrato: en el de ANDA son ${lista(ANDA_CARENCIA.map(c => `${c.meses} meses para quien lo contrata ${c.edad}`))}. Un seguro de vida es otra cosa: no presta el servicio, le paga a los beneficiarios la suma que diga la póliza. Y si había cobertura fúnebre, el BPS no paga el subsidio completo, pero sí puede reintegrar a quien los pagó los gastos complementarios que esa cobertura no incluía, con un tope de ${sepelioPesos(BPS_GASTOS_COMPLEMENTARIOS_TOPE)}.`,
      links: [
        { label: 'Qué seguros conviene tener', to: '/guias/que-seguros-conviene-tener-uruguay' },
        {
          label: 'Los gastos complementarios del BPS',
          to: '/guias/subsidio-expensas-funerarias-bps-uruguay',
        },
      ],
    },
    {
      heading: `El BPS reintegra hasta ${tope} a quien pagó`,
      body: `Si el fallecido era jubilado, trabajaba —sin importar cuánto tiempo—, cobraba subsidio por desempleo o por enfermedad, o estaba en alguno de los demás casos que enumera el BPS, el organismo reintegra hasta ${tope} por todo concepto, valor al ${fechaUy(BPS_SUBSIDIO_VIGENCIA)}. No es un depósito automático: se pide con la factura detallada y el recibo, dentro de los ${BPS_SUBSIDIO_PLAZO_DIAS} días desde el día siguiente al fallecimiento, y se puede ceder a la empresa fúnebre para que lo cobre ella en forma directa. Quién lo genera, qué papeles pide y cómo funciona la cesión está explicado en la guía del subsidio. Para el presupuesto importa una sola cosa: decidí antes de pagar quién figura en la factura, porque el BPS se lo paga a los causahabientes con derecho a pensión que se hicieron cargo del sepelio y, si no fueron ellos, a quien acredite haber pagado.`,
      links: [
        {
          label: 'Subsidio por expensas funerarias del BPS',
          to: '/guias/subsidio-expensas-funerarias-bps-uruguay',
        },
        { label: 'Pensión por sobrevivencia', to: '/pension-por-sobrevivencia-uruguay' },
      ],
    },
    {
      heading: 'Sin cobertura y sin recursos: el sepelio de la Intendencia',
      body: `En Montevideo, la Intendencia presta un servicio velatorio y sepelio sin costo que comprende ${lista(MVD_SERVICIO_GRATUITO.incluye)}. Está destinado a menores de ${MVD_SERVICIO_GRATUITO.edadMenores} años y a adultos que al morir recibían ${lista(MVD_SERVICIO_GRATUITO.prestaciones, 'o')}. La ficha agrega tres condiciones: que no haya cobertura del BPS ni afiliación a un servicio fúnebre privado; que «Personas trabajadoras en actividad y jubiladas no tienen derecho», que son justamente quienes generan el subsidio del BPS; y que la persona haya fallecido en Montevideo. Se pide en persona en las salas velatorias de ${lista(MVD_SERVICIO_GRATUITO.salas)}, con ${lista(MVD_SERVICIO_GRATUITO.requisitos)}; el teléfono de consultas es el ${MVD_SERVICIO_GRATUITO.telefono}. Para esos mismos casos, el artículo 210.1.3 exonera también los trámites posteriores del Servicio Fúnebre, como la reducción de los restos, salvo la renovación del urnario. En Canelones, el servicio fúnebre gratuito exonera de tributos municipales a quien fallece con escasos recursos, con una constancia de precariedad del Juez de Paz o, los fines de semana y feriados, de la comisaría, y deja exonerados además la reducción posterior y un ornato simple. En los demás departamentos no lo verificamos: preguntá en la oficina de necrópolis de la Intendencia antes de contratar.`,
      links: [
        { label: 'Pensión a la vejez', to: '/pension-a-la-vejez-uruguay' },
        { label: 'Asignación familiar', to: '/asignacion-familiar-uruguay' },
      ],
    },
    {
      heading: 'Los trámites y sus plazos',
      body: `El primer papel es el certificado de defunción, que el médico completa en el sistema en línea del MSP; si la persona murió en su casa y no hay certificado, la ficha de la Intendencia de Montevideo indica que el traslado a la morgue lo hace el Instituto Técnico Forense. Después, la defunción se inscribe en el Registro Civil dentro de los ${INSCRIPCION_DIAS_HABILES} días hábiles desde el día siguiente al fallecimiento (${INSCRIPCION_DIAS_HABILES_RURAL} en zonas rurales), con dos declarantes mayores de 18 años y sin costo; pasado ese plazo es una inscripción tardía. La partida de defunción digital no tiene costo, y la manuscrita sale ${sepelioPesos(PARTIDA_MANUSCRITA_COMUN)} la común y ${sepelioPesos(PARTIDA_MANUSCRITA_URGENTE)} la urgente. Para el Registro Civil las partidas no vencen, pero cada oficina fija su validez: el BPS la pide con ${BPS_PARTIDA_VIGENCIA_DIAS} días, así que conviene sacarla cuando ya tengas los demás papeles del subsidio. Si trabajás en la actividad privada, por el fallecimiento de padre, madre, hijos, cónyuge, concubino o hermanos te corresponden ${LICENCIA_DUELO.dias} pagos de licencia por duelo. Lo que viene después —la pensión por sobrevivencia, la sucesión y las deudas del fallecido— tiene sus propios trámites, y ninguno arranca solo.`,
      links: [
        { label: 'Licencia por duelo y otras licencias', to: '/licencias-especiales-uruguay' },
        { label: 'Cómo funciona una sucesión', to: '/guias/como-funciona-una-sucesion-uruguay' },
        { label: '¿Las deudas se heredan?', to: '/guias/las-deudas-se-heredan-uruguay' },
      ],
    },
    {
      heading: 'Lo que esta guía no publica',
      body: `Ningún precio de empresa fúnebre: las que revisamos no lo publican, y un rango sacado de la prensa no le sirve a nadie para decidir. Tampoco las tarifas de Maldonado, cuyo digesto no respondió el día de la lectura, ni las de los demás departamentos, que no revisamos. Las cifras en UI de Montevideo son las de la norma y no envejecen; las conversiones a pesos usan la UI del ${uiDelDia}. Las tasas de Canelones son las del segundo semestre de 2026 y el tope del BPS es el vigente desde el ${fechaUy(BPS_SUBSIDIO_VIGENCIA)}: Canelones publica una planilla nueva cada semestre y el BPS actualiza el tope cada enero. Todas las fuentes se leyeron el ${fechaUy(SEPELIO_VERIFIED_AT)} y están enlazadas abajo.`,
    },
  ],
  steps: [
    {
      name: 'Conseguí el certificado de defunción',
      text: 'Lo completa el médico en el sistema en línea del MSP, y es el papel que piden la empresa fúnebre, el cementerio y el Registro Civil.',
    },
    {
      name: 'Averiguá si había cobertura fúnebre',
      text: 'Llamá a la mutualista, a la emergencia móvil y a cualquier asociación o plan del fallecido: si había cobertura, el servicio puede estar pago.',
    },
    {
      name: 'Pedí el presupuesto por escrito y por rubro',
      text: 'Ataúd, sala, traslados, carroza, aviso, trámites y la tasa del cementerio por separado, y decidí antes de pagar quién figura en la factura.',
    },
    {
      name: `Inscribí la defunción en ${INSCRIPCION_DIAS_HABILES} días hábiles`,
      text: `El plazo corre desde el día siguiente al fallecimiento (${INSCRIPCION_DIAS_HABILES_RURAL} días hábiles en zonas rurales) y el trámite no tiene costo.`,
    },
    {
      name: `Pedí el reintegro al BPS en ${BPS_SUBSIDIO_PLAZO_DIAS} días`,
      text: `Si corresponde, con la factura y el recibo: el tope es de ${tope} por todo concepto desde el ${fechaUy(BPS_SUBSIDIO_VIGENCIA)}.`,
    },
  ],
  faqs: SEPELIO_FAQ.map(item => ({ q: item.question, a: item.answer })),
  related: [
    {
      label: 'Subsidio por expensas funerarias',
      to: '/guias/subsidio-expensas-funerarias-bps-uruguay',
    },
    { label: 'Pensión por sobrevivencia', to: '/pension-por-sobrevivencia-uruguay' },
    { label: 'Cómo funciona una sucesión', to: '/guias/como-funciona-una-sucesion-uruguay' },
    { label: '¿Las deudas se heredan?', to: '/guias/las-deudas-se-heredan-uruguay' },
    { label: 'Qué seguros conviene tener', to: '/guias/que-seguros-conviene-tener-uruguay' },
    { label: 'Licencias especiales', to: '/licencias-especiales-uruguay' },
  ],
  sources: SEPELIO_SOURCES.map(source => ({ ...source })),
}
