// Guías de la tanda del 2026-10-21 (primavera de 2026), elegidas con los datos de Search Console,
// del autocompletado uruguayo y de GA4: cada una contesta una consulta que el sitio no tenía y cae en
// una familia de temas de plata, donde la guía rinde más que la página suelta. Cada guía la redactó
// un agente que verificó cada cifra en fuente primaria el mismo día; las fuentes van en `sources`.
//
// - /guias/como-saber-si-tengo-deudas-uruguay (tema deudas-y-credito-uruguay)
// - /guias/comprar-en-shein-desde-uruguay (tema importaciones-y-aduana-uruguay)
// - /guias/irpf-de-alquileres-uruguay (tema alquiler-y-vivienda-uruguay)
//
// Cada una tiene su test (`tests/unit/guiasPrimavera2026*.test.ts`) y su fila en
// `docs/seo/experiments.json`.

import { URUGUAY } from './calculators'
import {
  GENERAL_RULE,
  RENT_WITHHOLDING_PCT,
  SMALL_LANDLORD_MAX_BPC,
  SMALL_LANDLORD_OTHER_CAPITAL_MAX_BPC,
} from './capitalTax'
import type { Guide } from './guides'
import {
  FRANCHISE_ANNUAL_USD,
  FRANCHISE_MAX_SHIPMENTS,
  LAST_RESEARCHED,
  POSTAL_IVA_MIN_USD,
  SIMPLIFIED_RATE_PCT,
} from './importRules'
import { courierImport } from './importTax'

// Cómo saber si tengo deudas: el mapa por acreedor. Demanda: autocompletado gl=uy («como saber si
// tengo deudas en uruguay», «con mi número de cédula», «a mi nombre», «en antel / dgi / bps / el
// banco», «consultar deuda con bps», «deuda intendencia montevideo consulta») y GSC («consulta
// central de riesgos», «sucive consulta de deuda»). El SERP sólo muestra herramientas sueltas.
//
// Todo leído el 2026-10-21 en la fuente, la mayoría con el navegador porque son formularios:
// la pantalla de ingreso de consultadeuda.bcu.gub.uy (hoy EXIGE registrarse con un correo; la ayuda
// sigue describiendo mes y año, país, documento y pregunta de seguridad), subsitio.bcu.gub.uy
// (quién informa, qué no se publica), usuariofinanciero.bcu.gub.uy (reclamo y denuncia), IMPO (Ley
// 18.331 arts. 14, 15 y 22 en su texto actualizado, y la guía «Clearing de informes»), la FAQ de
// Equifax, sucive.gub.uy (consulta_deuda y consulta_multas: matrícula, padrón y departamento, sin
// cédula), los dos trámites de deudas de la Intendencia de Montevideo, la consulta de adeudos y los
// certificados del BPS, el menú de servicios en línea de la DGI, el duplicado de facturas impagas de
// UTE, Mi Factura y la constancia de la Ley 14.497 de OSE y la FAQ de facturación de Antel.
//
// LO QUE NO SE PUBLICA A PROPÓSITO:
// - Que la consulta del BCU sea «gratis»: ninguna página del BCU lo dice (la FAQ de la Central de
//   Riesgos da 404) y el resultado queda detrás del registro. Se dice lo que se vio: la pantalla de
//   ingreso no pide pago.
// - Que el certificado único de la DGI se consulte «sin usuario»: el listado de servicios lo dice,
//   pero en el menú de hoy esa consulta está entre los servicios de usuarios registrados y el marco
//   que carga para un visitante dice «Entrada deshabilitada».
// - Una consulta de deudas propia de las otras dieciocho intendencias: no se leyó ninguna.
// - Los teléfonos y precios del informe de Equifax: ya están en /salir-del-clearing.

export const comoSaberSiTengoDeudasGuide: Guide = {
  slug: 'como-saber-si-tengo-deudas-uruguay',
  title: 'Deudas: Central de Riesgos y Clearing',
  description:
    'No hay un registro único: bancos en la Central de Riesgos del BCU, el Clearing gratis cada 6 meses y la patente en el SUCIVE, con matrícula y padrón.',
  tag: 'DEUDAS',
  updatedAt: '2026-10-21',
  sections: [
    {
      heading: 'No hay un registro único: se mira acreedor por acreedor',
      body: 'Ningún organismo junta todas las deudas de una persona, así que la respuesta a dónde averiguarlas es una lista, no un lugar. Y casi ninguna consulta sale con la cédula sola: el Banco Central te pide crear una cuenta, el SUCIVE busca por la matrícula y el padrón del vehículo, la Intendencia de Montevideo por el número de cuenta de cada tributo, y UTE y OSE por el número de cuenta que figura en la factura. Hay dos registros que reúnen a muchos acreedores a la vez y por eso conviene empezar por ellos: la Central de Riesgos del Banco Central, con los créditos de bancos, financieras y administradoras de crédito, y el Clearing de Informes, la base privada de Equifax. Lo que no está en ninguno de los dos, como la patente, los tributos de la intendencia o las facturas de los servicios, se consulta en cada acreedor. La tabla resume dónde y qué te piden, tal como lo vimos el 21 de octubre de 2026.',
      table: {
        headers: ['Acreedor', 'Dónde se consulta', 'Qué te piden'],
        rows: [
          [
            'Bancos, financieras y administradoras de crédito',
            'Central de Riesgos del BCU (consultadeuda.bcu.gub.uy)',
            'Una cuenta con tu correo; después, mes y año, tipo y número de documento y una pregunta de seguridad',
          ],
          [
            'Acreedores que informan a una base privada',
            'Clearing de Informes, de Equifax',
            'Acreditar tu identidad; es gratis cada seis meses por la Ley 18.331',
          ],
          [
            'Patente e infracciones de tránsito',
            'SUCIVE (sucive.gub.uy)',
            'Matrícula, padrón y departamento del vehículo, más una verificación',
          ],
          [
            'Contribución inmobiliaria y tributos de Montevideo',
            'Información de deudas, de la Intendencia',
            'Usuario ID Uruguay o cédula electrónica, y el número de cuenta corriente de cada tributo',
          ],
          [
            'Tributos de otro departamento',
            'La intendencia de ese departamento',
            'Lo que pida cada una: consultá en la tuya',
          ],
          [
            'BPS, si sos titular de una empresa',
            'Consultar obligaciones pendientes, financiación de deudas y pagos realizados',
            'Usuario personal BPS, cédula electrónica o usuario gub.uy',
          ],
          [
            'DGI',
            'Servicios en línea para usuarios registrados',
            'Cédula y clave, o cédula electrónica',
          ],
          ['UTE', 'Duplicado de facturas impagas', 'Número de cuenta y una verificación'],
          [
            'OSE',
            'Mi Factura, con la consulta de saldos',
            'Número de cuenta; el portal de facturas tiene ingreso con usuario y clave',
          ],
          [
            'Antel',
            '123, opción 1, para fija e internet; *611 desde un móvil de Antel',
            'Una llamada: te dicen el importe y el vencimiento de la factura',
          ],
        ],
      },
    },
    {
      heading: 'Bancos y financieras: la Central de Riesgos del BCU',
      body: 'Es el registro del Banco Central y lo más parecido a una consulta por cédula que existe, porque busca por tipo y número de documento. Para usarlo hay que registrarse: creás una cuenta con tu correo electrónico y el sistema te manda la contraseña a esa dirección, así que tiene que ser un correo válido. Ya adentro elegís el mes y el año que querés ver, el país, el tipo y el número de documento, y respondés una pregunta de seguridad. El resultado es un cuadro con tu total en el sistema y su apertura por institución, separado por moneda de origen, que suma los créditos que tomaste como titular y aquellos en los que figurás como segunda firma; sólo aparecen los renglones con saldo. Le informan las instituciones de intermediación financiera, las administradoras de crédito de mayores activos, las empresas de servicios financieros con actividad crediticia y otros informantes, y las instituciones clasifican tus créditos todos los meses en una categoría de riesgo. El BCU aclara que la responsable de que el dato sea veraz y esté actualizado es la institución que lo informa. Si el problema es técnico, la mesa de ayuda del BCU atiende en el 1967, interno 2090, y en mesadeayuda@bcu.gub.uy. Lo que no informa un banco puede estar en el Clearing de Informes, la base privada de Equifax, que registra lo que le comunican los acreedores: la Ley 18.331 te da acceso gratis a lo que tenga de vos cada seis meses, con respuesta en cinco días hábiles. Cómo pedir ese informe, las siete categorías del BCU y tus derechos están en nuestra página sobre el Clearing.',
      links: [{ label: 'El Clearing y las categorías del BCU', to: '/salir-del-clearing' }],
    },
    {
      heading: 'Patente y multas: por matrícula, no por cédula',
      body: 'La deuda de un vehículo no se busca por la persona sino por el vehículo. La consulta de deuda del SUCIVE pide el origen, nacional o extranjero, la matrícula, el padrón y el gobierno departamental donde está empadronado, más una verificación, y todos los campos son obligatorios. El padrón figura en la libreta o en una factura del vehículo. Las infracciones de tránsito tienen una consulta aparte en el mismo sitio, con los mismos datos. Si tuviste un auto o una moto a tu nombre y querés saber si quedó algo pendiente, juntá primero esos datos, y para cualquier otra consulta el SUCIVE te manda a la intendencia donde está empadronado el vehículo. Un aviso del propio SUCIVE que vale repetir: no manda mensajes con enlaces, así que un SMS con un link por una supuesta multa no es suyo y no hay que abrirlo. Cuándo vence la patente, cómo se paga y qué pasa con las multas están en nuestras dos páginas del tema.',
      links: [
        { label: 'Pagar la patente del SUCIVE', to: '/guias/pagar-patente-sucive-uruguay' },
        { label: 'Multas de tránsito y patente', to: '/multas-de-transito-y-patente-uruguay' },
      ],
    },
    {
      heading: 'Intendencia: contribución inmobiliaria y tributos',
      body: 'En Montevideo el trámite se llama Información de deudas: muestra los saldos vencidos y a vencer de las cuentas de tributos, precios y otros ingresos, y la Intendencia dice que no tiene costo. En línea se entra con usuario ID Uruguay y contraseña o con la cédula electrónica, y después cargás los datos del titular y el número de cuenta corriente que querés consultar. Ese número es distinto para cada tributo y figura en la factura junto con el padrón: la contribución inmobiliaria tiene el suyo y los tributos domiciliarios, otro. Si no lo tenés a mano hay otras vías: el WhatsApp 099 019 500, escribiendo «chatear» y eligiendo Tributos; el 1950 3000, opción 2; la atención con agenda en el Servicio de Gestión de Contribuyentes de la sede, con entrada por la calle Soriano, o un centro comunal zonal sin agenda. En los otros dieciocho departamentos cada intendencia tiene su propio sistema, así que la consulta es en la tuya.',
      links: [{ label: 'Contribución inmobiliaria', to: '/contribucion-inmobiliaria-uruguay' }],
    },
    {
      heading: 'BPS y DGI: con tu usuario, no con una búsqueda abierta',
      body: 'En el BPS, la consulta de deuda en línea es para empresas. El servicio «Consultar obligaciones pendientes, financiación de deudas y pagos realizados» muestra los adeudos pendientes, los convenios, los pagos y las observaciones sobre lo declarado, y lo usan los titulares de empresas de todas las aportaciones, sus representantes o terceros habilitados; se entra con el usuario personal BPS, con la cédula electrónica o con el usuario gub.uy. Si lo que necesitás es probar que no debés, el certificado especial acredita que no registrás adeudos «de especie alguna» y se pide para actos concretos, como vender un establecimiento o disolver una empresa; su vigencia y su costo están en nuestra página de certificados. Por teléfono, el BPS atiende en el *1997 desde el celular y en el 0800 1997 desde un fijo, de lunes a viernes de 8 a 18. En la DGI, entre los servicios abiertos a todos los usuarios no hay una consulta de deuda: entrás como usuario registrado, con tu cédula y la clave o con la cédula electrónica, y ahí están la bandeja de comunicaciones, las declaraciones presentadas, los pagos y los convenios y facilidades de pago. Si ya presentaste una declaración de IRPF o IASS, la clave se genera en línea con tu cédula, tu fecha de nacimiento y el total de ingresos de la última declaración; si no, se pide con la cédula en Abitab o en la DGI y se habilita una hora después. Qué es el certificado único y a quién no se le emite está en su propia página.',
      links: [
        { label: 'Certificados del BPS', to: '/certificados-bps-uruguay' },
        { label: 'Certificado Único de DGI', to: '/certificado-unico-dgi-uruguay' },
      ],
    },
    {
      heading: 'UTE, OSE y Antel: por número de cuenta',
      body: 'Las tres consultas que encontramos se hacen con el número de cuenta o por teléfono, no con la cédula. En UTE, el duplicado de facturas impagas sale con el número de cuenta, que está en la factura, y una verificación; también podés llamar a Telegestiones UTE, al 0800 1930 desde un fijo o al *1930 desde el celular, sin costo. En OSE, la página Mi Factura recomienda tener identificado el número de cuenta que figura en el recibo, y desde ahí se llega al duplicado y a la consulta de saldos de su portal de facturas, que tiene ingreso con usuario y clave. Para un padrón, OSE expide además una constancia de deuda por costo de obra de red (Decreto-Ley 14.497): se pide con usuario web OSE y cuesta 1 UR más IVA. En Antel, el 123, opción 1 «Facturación», te dice el importe y el vencimiento de la factura de fija e internet, y el *611 desde un móvil de Antel te da la del móvil; los convenios de pago se hacen en los locales habilitados o en MiAntel. Qué pasa si no pagás y cómo se lee cada factura están en nuestras páginas de cada servicio.',
      links: [
        { label: 'Qué pasa si no pago Antel', to: '/que-pasa-si-no-pago-antel' },
        { label: 'La factura de UTE', to: '/factura-de-ute-uruguay' },
        { label: 'La factura de OSE', to: '/factura-de-ose-uruguay' },
      ],
    },
    {
      heading: 'Si te compraron la deuda o te llama un estudio',
      body: 'Una deuda vendida puede no aparecer donde la buscás. La Central de Riesgos la alimentan las instituciones que enumera el BCU, y un comprador de carteras que no es ninguna de ellas puede no reportar ahí: la deuda desaparece del Banco Central y sigue en una base privada como el Clearing. Por eso, cuando te llama un estudio jurídico por algo que no reconocés, lo primero es pedir por escrito quién es hoy el acreedor, si gestiona la cobranza por cuenta del acreedor original o si compró el crédito, y el saldo desglosado con sus fechas. Con esa respuesta cruzás los datos con tus dos informes, el del BCU y el del Clearing, antes de pagar o firmar nada. Cuándo te obliga una cesión y qué puede hacer y qué no un estudio de cobranza están en dos guías aparte.',
      links: [
        { label: 'Me compraron la deuda', to: '/guias/me-compraron-la-deuda-uruguay' },
        { label: 'Te llama un estudio de cobranza', to: '/guias/estudio-de-cobranza-uruguay' },
      ],
    },
    {
      heading: 'Si encontrás un error o una deuda que no es tuya',
      body: 'El camino depende del registro. Para la Central de Riesgos, el BCU indica que primero se reclama ante la institución que informó el dato: tiene que darte un número de reclamo y contestarte a los 15 días corridos, un plazo que puede prorrogar avisándote. Si la respuesta no te convence o no llega, hacés la denuncia ante el BCU con el formulario del trámite en gub.uy o en persona en Diagonal Fabini 777, Montevideo, de lunes a viernes de 12 a 16. Para una base privada como el Clearing rige el artículo 15 de la Ley 18.331: podés pedir sin costo que rectifiquen, actualicen o supriman un dato con error o falso, y el responsable tiene cinco días hábiles para hacerlo o explicarte por qué no corresponde; el detalle está en nuestra página sobre el Clearing. Si la deuda viene de una cédula perdida o robada, hacé la denuncia de la cédula: según la guía de IMPO sobre el Clearing, por un convenio con el Ministerio del Interior esas denuncias pasan de inmediato a esa base.',
      links: [{ label: 'Tus derechos ante el Clearing', to: '/salir-del-clearing' }],
    },
    {
      heading: '¿Prescribió? Que no figure no quiere decir que no la debas',
      body: 'Figurar en un registro y deber son dos cosas que corren por separado. En el Clearing, una deuda impaga se registra por cinco años desde que se incorpora, y si sigue impaga el acreedor puede pedir por única vez otros cinco; una deuda pagada queda marcada como cancelada hasta cinco años desde el pago, sin renovación (Ley 18.331, artículo 22), y Equifax declara que conserva la operación cancelada con atraso tres años. La Central de Riesgos no publica las deudas con más de 15 años de su vencimiento, ni los créditos ya prescriptos ni los extinguidos por remisión. La prescripción es otra cosa: es el plazo que tiene el acreedor para reclamarte en un juicio, con sus propias reglas. Una deuda puede dejar de figurar y seguir siendo exigible, o prescribir y seguir en el registro. Los plazos de las deudas privadas y los de las deudas con el Estado, que van por otro régimen, están en sus guías.',
      links: [
        {
          label: 'Cuándo prescribe una deuda privada',
          to: '/guias/cuando-prescribe-una-deuda-uruguay',
        },
        {
          label: 'Prescripción de deudas con el Estado',
          to: '/prescripcion-de-deudas-con-el-estado-uruguay',
        },
      ],
    },
  ],
  faqs: [
    {
      q: '¿Dónde puedo averiguar todas las deudas que tengo?',
      a: 'En ningún lugar único: no hay un organismo que junte todas las deudas de una persona. Lo más cerca son dos registros que reúnen a muchos acreedores, la Central de Riesgos del Banco Central, con bancos, financieras y administradoras de crédito, y el Clearing de Informes de Equifax, con lo que le informan los acreedores que reportan a esa base. Lo demás se consulta en cada acreedor: la patente en el SUCIVE, los tributos en tu intendencia, el BPS y la DGI con tu usuario, y UTE, OSE y Antel con el número de cuenta o por teléfono.',
    },
    {
      q: '¿Cómo saber si tengo deudas con mi número de cédula?',
      a: 'Con el número de documento se buscan dos cosas: la Central de Riesgos del BCU, que primero te pide crear una cuenta con tu correo y después el tipo y número de documento, el mes y el año y una pregunta de seguridad, y el informe del Clearing, que se pide acreditando tu identidad. Las demás consultas no salen con la cédula sola: el SUCIVE busca por matrícula y padrón, la Intendencia de Montevideo por el número de cuenta corriente de cada tributo, y UTE y OSE por el número de cuenta de la factura.',
    },
    {
      q: '¿Es gratis consultar si tengo deudas?',
      a: 'Casi siempre. La Ley 18.331 (artículo 14) hace gratuito el acceso a lo que una base de datos tenga de vos, a intervalos de seis meses, y la Intendencia de Montevideo dice que su consulta de deudas «no tiene costo». En las consultas del BCU, el SUCIVE, UTE y OSE que abrimos el 21 de octubre de 2026 no apareció ningún cobro para entrar. Lo que se paga es el informe de Equifax por internet o en las redes de cobranza, y algunos certificados, como la constancia de deuda por obra de red de OSE, que cuesta 1 UR más IVA.',
    },
    {
      q: '¿Cuánto tiempo queda registrada una deuda?',
      a: 'En el Clearing, una deuda impaga puede figurar cinco años desde que se incorpora, y si sigue impaga el acreedor puede pedir por única vez otros cinco, dentro de los treinta días anteriores al vencimiento. Si la pagaste, queda registrada como cancelada hasta cinco años desde el pago, sin renovación (Ley 18.331, art. 22), y según la guía de IMPO y la propia Equifax, el Clearing la conserva tres años. En la Central de Riesgos del BCU no se publican las deudas con más de 15 años de su vencimiento, ni las prescriptas ni las extinguidas por remisión.',
    },
    {
      q: '¿Cómo saber si tengo deudas con BPS?',
      a: 'Si sos titular de una empresa o la representás, el servicio en línea «Consultar obligaciones pendientes, financiación de deudas y pagos realizados» muestra los adeudos pendientes, los convenios y los pagos. Se entra con el usuario personal BPS, con la cédula electrónica o con el usuario gub.uy. También podés llamar al *1997 desde el celular o al 0800 1997 desde un fijo, de lunes a viernes de 8 a 18.',
    },
    {
      q: '¿Cómo saber si tengo deudas con DGI?',
      a: 'Entrando a los servicios en línea como usuario registrado, con tu cédula y la clave o con la cédula electrónica: ahí están la bandeja de comunicaciones, las declaraciones presentadas, los pagos y los convenios y facilidades de pago. Si presentaste una declaración de IRPF o IASS, la clave se genera en línea con tu cédula, tu fecha de nacimiento y el total de ingresos de la última declaración; si no, se pide con la cédula en Abitab o en la DGI. El teléfono de la DGI es el 1344.',
    },
    {
      q: '¿Cómo consulto la deuda con la Intendencia de Montevideo?',
      a: 'Con el trámite Información de deudas, que muestra los saldos vencidos y a vencer de tus cuentas de tributos y no tiene costo. En línea entrás con usuario ID Uruguay o con la cédula electrónica y cargás el número de cuenta corriente, que es distinto para cada tributo y figura en la factura. Sin ese número, podés escribir al WhatsApp 099 019 500 («chatear» y la opción Tributos), llamar al 1950 3000, opción 2, o ir a un centro comunal zonal.',
    },
  ],
  related: [
    { label: 'Salir del clearing', to: '/salir-del-clearing' },
    { label: 'Mejorar tu historial crediticio', to: '/guias/mejorar-historial-crediticio-uruguay' },
    { label: 'Saldar y negociar deudas', to: '/saldar-deudas-uruguay' },
    { label: 'Cuándo prescribe una deuda', to: '/guias/cuando-prescribe-una-deuda-uruguay' },
    { label: 'Te llama un estudio de cobranza', to: '/guias/estudio-de-cobranza-uruguay' },
    {
      label: 'Prescripción de deudas con el Estado',
      to: '/prescripcion-de-deudas-con-el-estado-uruguay',
    },
  ],
  sources: [
    {
      label:
        'Consulta de Central de Riesgos, ayuda: se busca con «el mes y año que se desea consultar, país, tipo y número de documento del deudor» y una pregunta de seguridad; muestra el total en el sistema y su apertura por institución, por moneda de origen, como titular o segunda firma; reclamos primero ante la institución reportante; mesa de ayuda 1967 int. 2090',
      url: 'https://consultadeuda.bcu.gub.uy/consultadeuda/ayuda.html',
      publisher: 'Banco Central del Uruguay',
    },
    {
      label:
        'Consulta a la Central de Riesgos Crediticios, pantalla de ingreso: «Para hacer uso del sistema es necesario registrarse»; la contraseña se envía al correo indicado',
      url: 'https://consultadeuda.bcu.gub.uy/consultadeuda/',
      publisher: 'Banco Central del Uruguay',
    },
    {
      label:
        'Central de Riesgos: quiénes informan, las siete categorías de riesgo y lo que no se publica («deudas con más de 15 años de su vencimiento», créditos prescriptos o extinguidos por remisión)',
      url: 'https://subsitio.bcu.gub.uy/central-de-riesgos/',
      publisher: 'Banco Central del Uruguay',
    },
    {
      label:
        'Reclamos y denuncias: número de reclamo, respuesta de la institución a los 15 días corridos (prorrogable con aviso) y denuncia ante el BCU por gub.uy o en Diagonal Fabini 777, de 12 a 16',
      url: 'https://usuariofinanciero.bcu.gub.uy/reclamos-y-denuncias/',
      publisher: 'Banco Central del Uruguay',
    },
    {
      label:
        'Ley 18.331, art. 14 (texto actualizado) — acceso gratuito «a intervalos de seis meses» y entrega «dentro de los cinco días hábiles»',
      url: 'https://www.impo.com.uy/bases/leyes/18331-2008/14',
      publisher: 'IMPO',
    },
    {
      label:
        'Ley 18.331, art. 15 — rectificación, actualización, inclusión o supresión en cinco días hábiles, sin cargo, con constancia de revisión mientras se verifica',
      url: 'https://www.impo.com.uy/bases/leyes/18331-2008/15',
      publisher: 'IMPO',
    },
    {
      label:
        'Ley 18.331, art. 22 (texto actualizado) — cinco años desde la incorporación, una renovación por otros cinco pedida en los treinta días anteriores, y hasta cinco años no renovables para lo cancelado',
      url: 'https://www.impo.com.uy/bases/leyes/18331-2008/22',
      publisher: 'IMPO',
    },
    {
      label:
        'Clearing de informes, guía de orientación a los consumidores — plazos de permanencia, los tres años de lo cancelado y el convenio con el Ministerio del Interior por las denuncias de cédula',
      url: 'https://www.impo.com.uy/revista/clearing-de-informes-guia-de-orientacion-a-los-consumidores/',
      publisher: 'IMPO',
    },
    {
      label:
        'Preguntas frecuentes para personas — informe gratis cada seis meses, versión en línea y en redes de cobranza con costo, y la operación cancelada con atraso conservada tres años',
      url: 'https://www.equifax.uy/personas/preguntas-frecuentes/',
      publisher: 'Equifax Uruguay',
    },
    {
      label:
        'Consulta de deuda: origen, matrícula, padrón y gobierno departamental, todos obligatorios',
      url: 'https://www.sucive.gub.uy/consulta_deuda',
      publisher: 'SUCIVE',
    },
    {
      label:
        'Portada: consulta de infracciones de tránsito aparte y aviso de que el SUCIVE no envía mensajes con enlaces',
      url: 'https://www.sucive.gub.uy/',
      publisher: 'SUCIVE',
    },
    {
      label:
        'Información de deudas: saldos vencidos y a vencer de tributos, «No tiene costo», en línea con usuario ID Uruguay o cédula electrónica y el número de cuenta corriente',
      url: 'https://tramites.montevideo.gub.uy/tramites-y-tributos/consulta/informacion-web-de-deudas',
      publisher: 'Intendencia de Montevideo',
    },
    {
      label:
        'Información de deudas y duplicados de facturas: un número de cuenta corriente por tributo, WhatsApp 099 019 500, 1950 3000 opción 2 y centros comunales zonales',
      url: 'https://tramites.montevideo.gub.uy/tramites-y-tributos/solicitud/informacion-de-deudas-y-duplicados-de-facturas-de-tributos-y-precios',
      publisher: 'Intendencia de Montevideo',
    },
    {
      label:
        'Nueva consulta para aportes, adeudos y formas de financiación — «Consultar obligaciones pendientes, financiación de deudas y pagos realizados», para titulares de empresas, representantes o terceros habilitados',
      url: 'https://www.bps.gub.uy/20282/nueva-consulta-para-aportes-adeudos-y-formas-de-financiacion.html',
      publisher: 'BPS',
    },
    {
      label:
        'Certificados especiales — acreditan que el contribuyente no registra adeudos de especie alguna a la fecha del acto',
      url: 'https://www.bps.gub.uy/865/certificados-especiales.html',
      publisher: 'BPS',
    },
    {
      label:
        'Contribuyentes con adeudos — atención telefónica *1997 y 0800 1997, de lunes a viernes de 8 a 18',
      url: 'https://www.bps.gub.uy/17802/contribuyentes-con-adeudos.html',
      publisher: 'BPS',
    },
    {
      label:
        'Servicios en línea: lo abierto a todos los usuarios y lo de usuarios registrados (bandeja de comunicaciones, declaraciones presentadas, pagos, convenios y facilidades de pago)',
      url: 'https://servicios.dgi.gub.uy/serviciosenlinea',
      publisher: 'DGI',
    },
    {
      label:
        'Cómo acceder a los Servicios en Línea — cédula y clave o cédula electrónica; «Generar Clave Web» con cédula, fecha de nacimiento y total de ingresos de la última declaración, o clave en Abitab o en la DGI',
      url: 'https://servicios.dgi.gub.uy/serviciosenlinea/ampliar/como-acceder-a-los-servicios-en-linea-copia',
      publisher: 'DGI',
    },
    {
      label:
        'Imprima su factura — duplicado de facturas impagas con el número de cuenta; Telegestiones 0800 1930 y *1930',
      url: 'https://www.ute.com.uy/imprima-su-factura',
      publisher: 'UTE',
    },
    {
      label:
        'Mi Factura — tener identificado el número de cuenta del recibo; duplicado y consulta de saldos',
      url: 'https://www.ose.com.uy/clientes/mi-factura',
      publisher: 'OSE',
    },
    {
      label:
        'Solicitud de constancia de deuda, Ley 14.497 — costo de obra de red, 1 UR + IVA, con usuario web OSE',
      url: 'https://www.ose.com.uy/tramite/solicitud-de-constancia-de-deuda-ley-14497',
      publisher: 'OSE',
    },
    {
      label:
        'Preguntas frecuentes de facturación — 123 opción 1 «Facturación» para importe y vencimiento, *611 desde el móvil, convenios en locales habilitados o MiAntel',
      url: 'https://www.antel.com.uy/personas/preguntas-frecuentes/facturacion',
      publisher: 'Antel',
    },
  ],
}

// Comprar en Shein desde Uruguay: cómo llega el pedido, separado de cuánto se paga.
//
// La demanda sale del autocompletado uruguayo ("comprar en shein desde uruguay", "puedo comprar en
// shein desde uruguay", "shein envia a uruguay", "es seguro comprar en shein desde uruguay"). En el
// SERP, siete de diez resultados son redes sociales que se contradicen sobre si Shein manda directo.
//
// Verificado el 2026-10-21:
//   - Envío: la página oficial https://www.shein.com/Shipping-Info-a-280.html se arma en el
//     navegador. Con Playwright, eligiendo "Uruguay" en "Ubicación", la API del propio sitio
//     (`bff-api/user-api/article/shipping_detail`) devolvió country_id 228 / shippingCountryName
//     "Uruguay" con UN método, "Envío estándar": transport_interval 8-13, US$ 12,90 con
//     full_amount US$ 79, isAvailable 1. La página dice "8-13 Días laborables",
//     "$12.90—importe entre 0 y $79.00", "Gratis - pedidos superiores a $79.00" y "(1-3 días de
//     procesado)". Los avisos por país (`article/tips?countryId=228`) vuelven vacíos: Shein no
//     publica ninguna nota propia para Uruguay (sí para Honduras).
//   - Devoluciones: https://www.shein.com/Return-Policy-a-281.html con el sitio en contexto UY
//     (`address/update_country` → countryId 228, countryAbbr UY): 30 días desde la recepción, la
//     lista de no retornables, sólo "Devolución Autogestionada" con costo a cargo del cliente que
//     "No reembolsamos", 180 días para defectuosos. Reembolso: https://www.shein.com/refund-a-1610.html
//     ("Los gastos originales de envío ... no son reembolsables").
//   - Normas en IMPO: Decreto 50/026 arts. 3, 4, 5, 7, 8 y 10; T.O. 2023 Título 10 arts. 13 (mínimo
//     de US$ 20, agregado por la Ley 20.446 art. 660) y 34 (tasa básica 22 %); T.O. 2023 Título 11
//     art. 1 num. 8 (IMESI a cosméticos y perfumería); Ley 19.920 art. 50 lit. E num. 3; Ley 17.250
//     arts. 3 y 16. DNA: consulta de franquicias utilizadas.
//
// Las cifras del régimen (22 %, US$ 20) aparecen UNA vez, en la sección de impuestos, alineadas con
// `utils/temuTax.ts`, `utils/guidesImportacion.ts` y `pages/franquicia-aduana-uruguay.vue`, que
// son la fuente de verdad del sitio: el resto de la guía enlaza esas páginas en vez de repetirlas.
//
// Releído el 2026-11-20 (Search Console 21/10–17/11: la gente que llega pregunta cómo se compra,
// cuánto DEMORA —95 de 99 impresiones dicen «demora»—, si hay sitio, app o local y cuánto sale):
//   - La tabla de envío para Uruguay sigue igual (country_id 228, 8-13, US$ 12,90, gratis desde
//     US$ 79, `starting_num` 0: no hay mínimo de compra publicado).
//   - Términos y Condiciones (https://www.shein.com/Terms-and-Conditions-a-399.html, vigentes desde
//     el 15/3/2022): 1.1 (Roadget opera el sitio; quien pide el envío a otro país puede ser
//     redirigido al sitio local de ese país y queda bajo sus términos: por eso la guía NO concluye
//     nada sobre el IVA de un pedido a un casillero de Miami, que en us.shein.com vende SHEIN
//     Distribution Corporation o un tercero, términos de EE. UU. 1.1 y 5.4), 2.5 (datos de aduana
//     válidos), 5.1 (total = productos + envío; cargo al hacer el pedido; pago posterior "sólo en
//     ciertos países"), 5.4 (varios almacenes, pedido partido "a nuestra propia discreción", demoras
//     en temporada alta), 5.5 (vende Fashion Choice; faltantes o daños, cinco días desde la
//     recepción) y 13.5 (ley de Singapur fuera de la lista de países, donde no está Uruguay).
//   - Ayuda de Shein, `faq/detail?id=`: 57522 (entrega = procesamiento + envío), 57687 (1-3 días
//     hábiles de procesamiento), 57527 (48 horas después de la fecha estimada), 57507 y 59422 (los
//     impuestos son del destinatario; un paquete devuelto por no pagarlos reembolsa los artículos,
//     no el envío ni los derechos), 57472 (por qué se parte un pedido) y 57477 (17track).
//   - Método de pago: tarjetas de crédito y débito; su lista de monedas no tiene el peso uruguayo y
//     la página no menciona cuotas. El sitio, pedido desde Uruguay, queda en www.shein.com en español
//     con moneda USD por defecto y UYU en su tabla de monedas. La app de Google Play la publica
//     Roadget Business Pte. Ltd.
//   - Decreto 50/026 art. 9 en IMPO (lo que el operador registra de cada envío) y la FAQ de la DNA
//     (https://www.aduanas.gub.uy/innovaportal/v/28231/1/innova.front/): quién declara, declaración
//     jurada, nunca el número completo de la tarjeta, el registro voluntario y luego obligatorio.
//
// La tabla de «Cuánto pagás» NO se escribe a mano: sale de `courierImport()` con el envío que
// publica Shein, con `today` fijo en `LAST_RESEARCHED` como `utils/temuTax.ts`.
//
// Lo que NO se publica porque no está en ninguna página oficial de Shein para Uruguay: quién
// entrega el paquete dentro del país, un envío exprés, la fecha estimada que el checkout calcula
// para cada pedido y si Uruguay cuenta como "zona remota" para el reintegro del envío de vuelta.
// Tampoco: si Shein cobra el IVA en el checkout para Uruguay (el catálogo y el checkout piden
// captcha y cuenta; un usuario de Reddit lo contó en septiembre de 2026 y no está verificado), en
// qué moneda se debita la tarjeta, y los plazos reales que cuentan los compradores.

const SHEIN_SHIPPING_URL = 'https://www.shein.com/Shipping-Info-a-280.html'
const SHEIN_RETURNS_URL = 'https://www.shein.com/Return-Policy-a-281.html'
const SHEIN_REFUND_URL = 'https://www.shein.com/refund-a-1610.html'
const SHEIN_HOW_TO_ORDER_URL = 'https://www.shein.com/How-to-order-a-276.html'
const SHEIN_HOW_TO_PAY_URL = 'https://www.shein.com/How-to-Pay-a-278.html'
const SHEIN_TERMS_URL = 'https://www.shein.com/Terms-and-Conditions-a-399.html'
const SHEIN_US_TERMS_URL = 'https://us.shein.com/Terms-and-Conditions-a-399.html'
const SHEIN_ABOUT_URL = 'https://www.shein.com/About-Us-a-117.html'
const SHEIN_APP_URL = 'https://play.google.com/store/apps/details?id=com.zzkko'
const sheinFaqUrl = (id: number): string => `https://www.shein.com/faq/detail?id=${id}`
const DNA_FAQ_URL = 'https://www.aduanas.gub.uy/innovaportal/v/28231/1/innova.front/'
const DNA_FRANQUICIA_URL = 'https://www.aduanas.gub.uy/innovaportal/v/28221/1/innova.front/'
const DECRETO_50_026_URL = 'https://www.impo.com.uy/bases/decretos/50-2026'

/** Día en que se releyeron las páginas de Shein, la DNA, el MEF e IMPO de esta guía. */
const SHEIN_VERIFIED_AT = '2026-11-20'
const SHEIN_VERIFIED_LABEL = '20 de noviembre de 2026'

/** Envío estándar que Shein publica para Uruguay: US$ 12,90 hasta US$ 79, gratis por encima. */
export const SHEIN_STD_SHIPPING_USD = 12.9
export const SHEIN_FREE_SHIPPING_OVER_USD = 79
/** Días de procesado antes del despacho y días laborables de envío estándar, [mínimo, máximo]. */
export const SHEIN_PROCESSING_DAYS = [1, 3] as const
export const SHEIN_STD_TRANSIT_DAYS = [8, 13] as const
const SHEIN_TOTAL_MIN_DAYS = SHEIN_PROCESSING_DAYS[0] + SHEIN_STD_TRANSIT_DAYS[0]
const SHEIN_TOTAL_MAX_DAYS = SHEIN_PROCESSING_DAYS[1] + SHEIN_STD_TRANSIT_DAYS[1]
const dias = (n: number): string => `${n} ${n === 1 ? 'día' : 'días'}`

/**
 * Dólares a la uruguaya: "US$ 62,90", "US$ 100". Los `miles`/`pesos` de más abajo se declaran
 * después de esta guía (zona muerta de `const`), y acá ningún importe llega a mil.
 */
export const sheinUsd = (n: number): string => {
  const cents = Math.round(n * 100)
  return cents % 100 === 0
    ? `US$ ${cents / 100}`
    : `US$ ${(cents / 100).toFixed(2).replace('.', ',')}`
}

/** Carritos de ropa de la tabla: tres de un lado del umbral del envío gratis y tres del otro. */
export const SHEIN_CART_EXAMPLES_USD = [30, 50, 75, 80, 120, 200] as const

/** Fecha fija de resolución, para que la tabla no cambie sola con el reloj (ver temuTax.ts). */
const SHEIN_EXAMPLE_DATE = new Date(`${LAST_RESEARCHED}T00:00:00Z`)

export interface SheinCartExample {
  cart: number
  shipping: number
  iva: number
  /** El 22 % de la factura no llega al mínimo por envío, así que paga el mínimo. */
  ivaIsFloor: boolean
  total: number
  totalNoFranchise: number
}

/** Un carrito de Shein con su envío, por franquicia y por la prestación única del 60 %. */
export function sheinCartExample(cart: number): SheinCartExample {
  const shipping = cart > SHEIN_FREE_SHIPPING_OVER_USD ? 0 : SHEIN_STD_SHIPPING_USD
  const input = {
    value: cart,
    sellerShipping: shipping,
    origin: 'other' as const,
    useFranchise: true,
    franchiseAvailable: FRANCHISE_ANNUAL_USD,
    ivaPct: URUGUAY.iva.basica,
    today: SHEIN_EXAMPLE_DATE,
  }
  const withFranchise = courierImport({ ...input, shipmentsUsed: 0 })
  const noQuota = courierImport({ ...input, shipmentsUsed: FRANCHISE_MAX_SHIPMENTS })
  return {
    cart,
    shipping,
    iva: withFranchise.totalTax,
    ivaIsFloor: withFranchise.totalTax === POSTAL_IVA_MIN_USD,
    total: withFranchise.landedCost,
    totalNoFranchise: noQuota.landedCost,
  }
}

const SHEIN_EXAMPLES = SHEIN_CART_EXAMPLES_USD.map(sheinCartExample)
/** Mayor factura (al centavo) cuyo 22 % queda por debajo del mínimo de IVA por envío. */
const SHEIN_FLOOR_UP_TO_USD =
  Math.floor(((POSTAL_IVA_MIN_USD * 100) / URUGUAY.iva.basica) * 100) / 100
const IVA_PCT = `${URUGUAY.iva.basica} %`
const IVA_FLOOR = sheinUsd(POSTAL_IVA_MIN_USD)
const EJ_75 = sheinCartExample(75)
const EJ_80 = sheinCartExample(80)
const EJ_120 = sheinCartExample(120)

export const comprarEnSheinGuide: Guide = {
  slug: 'comprar-en-shein-desde-uruguay',
  title: 'Comprar en Shein desde Uruguay: cómo llega',
  description:
    'Shein envía directo a Uruguay: estándar en 8 a 13 días laborables y gratis en pedidos de más de US$ 79. Quién te cobra el IVA y cómo devolver un talle.',
  tag: 'IMPORTAR',
  updatedAt: SHEIN_VERIFIED_AT,
  sections: [
    {
      heading: '¿Shein envía a Uruguay? Sí, directo',
      body: `Sí. La página oficial de información de envío de Shein, con Uruguay elegido como ubicación, muestra un único método, el envío estándar, con un plazo estimado de 8 a 13 días laborables y de 1 a 3 días de procesado antes de que el paquete salga. Cuesta US$ 12,90 en los pedidos de hasta US$ 79 y es gratis en los de más de US$ 79. Para un pedido común no hace falta casillero ni intermediario: lo cargás con tu dirección en Uruguay y viene a tu nombre. Lo leímos por última vez el ${SHEIN_VERIFIED_LABEL} y Shein lo puede cambiar sin aviso, así que la cifra que manda es la que te muestra el carrito el día que comprás. Lo que esa página no dice es quién te entrega el paquete una vez que entra al país, ni nada sobre la aduana uruguaya: tiene una advertencia propia para Honduras y ninguna para Uruguay.`,
      table: {
        headers: ['Qué', 'Lo que publica Shein para Uruguay'],
        rows: [
          ['Método de envío', 'Envío estándar, el único que figura'],
          ['Procesado antes del despacho', '1 a 3 días'],
          ['Entrega estimada', '8 a 13 días laborables'],
          ['Costo del envío', 'US$ 12,90 en pedidos de hasta US$ 79'],
          ['Envío gratis', 'En pedidos de más de US$ 79'],
          ['Mínimo de compra', 'No publica: el envío estándar figura para importes desde US$ 0'],
          ['Leído por última vez', SHEIN_VERIFIED_LABEL],
        ],
      },
    },
    {
      heading: 'Cómo comprar en Shein desde Uruguay: sitio, app y moneda',
      body: 'Se compra en shein.com o en su app oficial, que en Google Play publica Roadget Business Pte. Ltd., la empresa que según los términos de Shein opera el sitio y la aplicación. Abierto desde Uruguay, el sitio no te manda a una versión local: queda en www.shein.com, en español, con Uruguay como país de envío y los precios en dólares. El pedido sigue los cinco pasos de la página de Shein: elegís talle, color y cantidad y lo agregás a la cesta; vas a la cesta; entrás con tu cuenta o te registrás con tu email; cargás la dirección, el medio de pago y la opción de envío y tocás «Realizar pedido»; completás los datos de pago. Después te llega un email de confirmación. Se paga con tarjeta de crédito o de débito y el cargo se hace en el momento del pedido. La página de métodos de pago no menciona cuotas, y el pago posterior que nombran los términos «solo está disponible en ciertos países», sin decir si Uruguay es uno. El selector de moneda, arriba a la derecha, te deja ver los precios en pesos uruguayos, pero la lista de monedas de esa misma página de pagos no incluye el peso uruguayo: mirá en qué moneda figura el total antes de confirmar. El total es el precio de los productos más el envío, y como la tabla de envío arranca en US$ 0, Shein no publica un mínimo de compra. Shein no publica ninguna tienda física en Uruguay: se describe como un retailer de moda online y su página «Sobre nosotros» no nombra ningún local. Tampoco necesitás tarjeta de crédito, porque la de débito sirve; para la franquicia vale una tarjeta de crédito o débito internacional o el dinero electrónico internacional de una institución regulada por el Banco Central.',
    },
    {
      heading: '¿Cuánto demora en llegar un pedido de Shein a Uruguay?',
      body: `Entre ${SHEIN_TOTAL_MIN_DAYS} y ${SHEIN_TOTAL_MAX_DAYS} días laborables desde que pagás, según lo que publica Shein: de ${SHEIN_PROCESSING_DAYS[0]} a ${SHEIN_PROCESSING_DAYS[1]} días de procesado antes del despacho más ${SHEIN_STD_TRANSIT_DAYS[0]} a ${SHEIN_STD_TRANSIT_DAYS[1]} días laborables de envío estándar, porque su ayuda define el tiempo de entrega como «Tiempo de procesamiento + Tiempo de envío». En el calendario son casi dos semanas como mínimo y algo más de tres como máximo. Es una estimación: la página de envíos avisa que el paquete puede retrasarse por demoras en vuelos, productos en preventa o personalizados, condiciones meteorológicas u otros factores, y los términos agregan que en períodos de gran actividad comercial las entregas pueden demorar más. Shein no dice si ese plazo incluye el despacho en la Aduana uruguaya y el pago del IVA, que vienen cuando el paquete ya está en el país. La fecha más precisa es la del seguimiento de tu pedido: Shein pide que contactes a su atención al cliente si el paquete sigue sin entregarse 48 horas después de la fecha estimada, y el reclamo por un pedido que no llegó se hace dentro de los 90 días desde el pago.`,
      table: {
        headers: ['Desde el pago', 'Plazo'],
        rows: [
          [
            `Mínimo publicado (${dias(SHEIN_PROCESSING_DAYS[0])} de procesado + ${SHEIN_STD_TRANSIT_DAYS[0]} de envío)`,
            `${SHEIN_TOTAL_MIN_DAYS} días laborables`,
          ],
          [
            `Máximo publicado (${dias(SHEIN_PROCESSING_DAYS[1])} de procesado + ${SHEIN_STD_TRANSIT_DAYS[1]} de envío)`,
            `${SHEIN_TOTAL_MAX_DAYS} días laborables`,
          ],
          ['Pasó la fecha estimada', 'Reclamo a Shein desde 48 horas después'],
          ['No llegó', 'Reclamo hasta 90 días desde el pago'],
        ],
      },
    },
    {
      heading: 'Cómo comprobarlo con tu propia dirección',
      body: 'La prueba definitiva no es una página informativa sino el checkout. La propia Shein lo aclara: por restricciones logísticas la entrega no está disponible en algunas áreas, y si al hacer el pedido no podés escribir tu dirección, tu zona no está cubierta. Antes de armar un carrito grande, entrá con tu cuenta, cargá la dirección donde vas a recibir y mirá qué método y qué costo te ofrece. Por defecto el sitio te muestra los precios en dólares, y lo que pagás de envío no es un detalle: si figura sumado en la factura de Shein, integra el valor sobre el que se calculan los impuestos, porque el Decreto 50/026 toma el total de la factura original de compra, incluidos todos los conceptos que figuren adicionados en ella (art. 5). Fijate también en el nombre: si pensás usar la franquicia, el titular de la tarjeta, el comprador y el destinatario tienen que ser la misma persona.',
    },
    {
      heading: '¿Directo o por casillero?',
      body: 'Con Shein, el casillero en Miami resuelve un problema que no tenés, porque la tienda ya entrega en Uruguay. Y no cuentes con que te ahorre el IVA. La exoneración de los envíos procedentes de Estados Unidos sigue al vendedor, no al recorrido: el Decreto 50/026 la reserva a los envíos «embarcados por el vendedor residente fiscal en dicho país, con destino al territorio nacional», y esa residencia se acredita con la factura (art. 3). Comprando con tu dirección en Uruguay, los términos de Shein nombran como vendedora a Fashion Choice Pte. Ltd. (5.5). Si cargás una dirección de Miami, esos mismos términos dicen que te pueden redirigir al sitio local del país al que se envía y que quedás sujeto a los términos de ese sitio (1.1), y los del sitio de Estados Unidos nombran otro vendedor según el producto, SHEIN Distribution Corporation o un vendedor tercero (5.4). Shein no publica cómo queda la factura en ese caso, y el art. 3 pide las dos cosas: un vendedor residente fiscal en Estados Unidos y que sea él quien embarque el envío hacia Uruguay. Lo que sí cambia con el casillero es la cuenta, porque se suma el flete por kilo que cobra el courier desde Miami. La comparación completa, ruta por ruta y con los números de tu compra, está en la página de envío directo o casillero, y las tarifas de cada courier, en su comparativa.',
      links: [
        { label: 'Envío directo o casillero', to: '/envio-directo-o-casillero-uruguay' },
        { label: 'Comparativas de couriers', to: '/comparativas/couriers' },
        { label: 'Couriers de Miami a Uruguay', to: '/couriers-uruguay' },
      ],
    },
    {
      heading: 'Cuánto pagás al recibirlo',
      body: `En el carrito de Shein pagás la ropa y el envío; los impuestos uruguayos aparecen después, cuando el paquete ya está en el país. La ayuda de Shein lo dice así: tu pago cubre solo los artículos y el envío, y los aranceles o impuestos de importación son responsabilidad del destinatario; su página de envíos para Uruguay no menciona ningún cobro de impuestos. El Decreto 50/026 hace responsable al operador postal que desconsolida el envío: liquida los tributos, los paga ante la Dirección Nacional de Aduanas y no te puede entregar el paquete hasta haber acreditado ese pago (art. 8). El régimen, en una frase: aunque uses la franquicia, una compra de Shein paga IVA a la tasa básica del ${IVA_PCT} sobre el valor de factura, con un mínimo de ${IVA_FLOOR} por envío. En una factura de hasta ${sheinUsd(SHEIN_FLOOR_UP_TO_USD)} el ${IVA_PCT} da menos que ese mínimo, así que el IVA queda fijo en ${IVA_FLOOR}: por eso ${sheinUsd(EJ_75.cart)} de ropa terminan en ${sheinUsd(EJ_75.total)} y ${sheinUsd(EJ_80.cart)} en ${sheinUsd(EJ_80.total)}, porque al pasar de US$ ${SHEIN_FREE_SHIPPING_OVER_USD} Shein deja de cobrar el envío y el impuesto no sube. Por encima de ${sheinUsd(SHEIN_FLOOR_UP_TO_USD)} de factura manda el ${IVA_PCT}: en el carrito de ${sheinUsd(EJ_120.cart)} de la tabla da ${sheinUsd(EJ_120.iva)}. La tabla suma el envío de Shein a la factura, porque el art. 5 toma el total de la factura con todos sus conceptos. La última columna es la prestación única del ${SIMPLIFIED_RATE_PCT} % sobre la factura, que reemplaza al IVA cuando ya usaste los tres envíos del año o el cupo, o cuando el envío no cumple las condiciones de la franquicia. Los totales no incluyen el cargo que el operador pueda cobrar por su gestión, que no es un tributo. La cuenta con tu propia compra está en la calculadora de impuestos de importación, y lo que cambia cuando se te acaba el cupo, en las páginas del impuesto Temu, que valen igual para Shein.`,
      table: {
        headers: [
          'Ropa en el carrito',
          'Envío de Shein',
          'IVA con franquicia',
          'Total con franquicia',
          `Total sin cupo (${SIMPLIFIED_RATE_PCT} %)`,
        ],
        rows: SHEIN_EXAMPLES.map(e => [
          sheinUsd(e.cart),
          e.shipping ? sheinUsd(e.shipping) : 'Gratis',
          e.ivaIsFloor ? `${sheinUsd(e.iva)} (el mínimo)` : sheinUsd(e.iva),
          sheinUsd(e.total),
          sheinUsd(e.totalNoFranchise),
        ]),
      },
      links: [
        { label: 'Impuesto Temu: la cuenta de cada compra', to: '/impuesto-temu-uruguay' },
        { label: 'Guía del impuesto Temu', to: '/guias/impuesto-temu-uruguay' },
        {
          label: 'Calculadora de impuestos de importación',
          to: '/herramientas/calculadora-impuestos-importacion',
        },
      ],
    },
    {
      heading: 'Después de pagar: quién declara el paquete y qué datos te piden',
      body: 'El seguimiento está en «Mis pedidos». Shein no publica qué empresa trae el pedido a Uruguay: su ayuda dice que pegues el número de seguimiento en 17track para ver qué empresa de mensajería lo tiene y contactarla. Cuando el paquete entra al país, ese operador postal o courier hace la declaración ante la Aduana, y el Decreto 50/026 lo obliga a registrar de cada envío, entre otros datos, el número de documento, el nombre completo del titular de la encomienda y del medio de pago, su domicilio y, de la tarjeta, el tipo, el emisor y los cuatro últimos dígitos (art. 9). Por eso es esperable que después de comprar te pidan la cédula. Poné tu nombre completo tal como figura en ella: los términos de Shein exigen nombres de destinatario, direcciones y nombres del pagador válidos y dicen que no se hace responsable ni da compensación si un dato que falta o está mal impide el despacho aduanero, y la Aduana avisa que la declaración es una declaración jurada y que el envío no se libera hasta que la información sea correcta. La Aduana nunca pide el número completo de la tarjeta ni su código de seguridad. El IVA se paga a través de ese mismo operador, que no puede entregarte el paquete sin haber acreditado el pago ante la Aduana: antes de pagar un enlace que te llegó por mensaje, fijate en 17track, con el número de seguimiento de «Mis pedidos», qué empresa tiene tu paquete, y que el aviso venga de esa empresa. Si no pagás y el paquete vuelve, Shein dice que te reembolsa los artículos, pero no el envío, y que no devuelve los derechos de aduana. Aparte está el registro de identidad de la Aduana para usar la franquicia: por ahora es voluntario, la Aduana anuncia que después será obligatorio, se hace una sola vez y pide identidad digital de nivel intermedio o superior. Si el paquete entra por el Correo Uruguayo, cómo se declara está en la página de declarar una compra del exterior, y si te lo llevan a tu casa o lo retirás en una sucursal o agencia, en la de dónde te entregan el paquete.',
      links: [
        { label: 'Cómo declarar una compra del exterior', to: '/declarar-compra-exterior-uruguay' },
        { label: 'Dónde te entregan el paquete', to: '/donde-te-entregan-el-paquete-uruguay' },
      ],
    },
    {
      heading: 'Cuántas franquicias te quedan',
      body: 'La franquicia no cuenta pedidos, cuenta envíos: el Decreto 50/026 la limita a tres por año civil y por persona, cualquiera sea el monto de cada uno, y todos descuentan del mismo cupo anual (art. 4). Con Shein eso pesa: sus términos dicen que despacha desde almacenes en distintos países y que puede dividir un pedido de más de un artículo en varios paquetes «a nuestra propia discreción», y su ayuda da tres motivos, artículos de almacenes distintos, tiempos de preparación distintos y límites de peso de la aduana o de la mensajería. Si una compra te llega partida en dos paquetes, cada uno puede consumir su propio envío del cupo y pagar su propio mínimo de IVA, así que mirá el seguimiento de cada uno. Los requisitos se chequean y son duros: persona física mayor de edad con documento uruguayo, uso personal y sin fines comerciales, pago con tarjeta de crédito o débito internacional o con dinero electrónico internacional de una institución regulada por el Banco Central, y el mismo titular en el medio de pago, en la compra y en el destino. Cuántos envíos tenés registrados lo consultás en la Aduana con tu identidad digital; los topes de hoy están en la página de la franquicia.',
      links: [
        { label: 'Franquicia de aduana: los topes de hoy', to: '/franquicia-aduana-uruguay' },
      ],
    },
    {
      heading: 'Talles y devoluciones: lo que dice Shein',
      body: 'La política de devolución que Shein muestra para Uruguay acepta, bajo ciertas condiciones, devoluciones dentro de los 30 días posteriores a la recepción de la mayoría de los artículos nuevos. La ropa tiene que volver sin usar, sin lavar, sin modificaciones y con las etiquetas originales, y hay artículos que no se devuelven, entre ellos bodis, trajes de baño, lencería, ropa interior, joyería, artículos de belleza, cosméticos con el precinto roto, personalizados y los marcados como no retornables. La devolución se pide desde "Mis pedidos", y el único método que figura es la devolución autogestionada: el envío de vuelta lo pagás vos a la empresa de logística que elijas, y la tabla de Shein dice que ese costo no se reembolsa. La misma política abre una excepción para artículos de exceso de tamaño o peso y para devoluciones desde zonas remotas, pero no aclara si Uruguay cuenta como una, así que guardá el comprobante y preguntalo antes. Tampoco te devuelve el envío original. El reembolso va al saldo de tu cuenta Shein o al medio de pago original, y es por lo que le pagaste a Shein: el IVA que pagaste al recibir el paquete no fue a Shein, así que no viene incluido. A una tarjeta de crédito o débito, Shein dice que procesa el reembolso en 24 horas y que el banco tarda de 5 a 10 días hábiles, a veces hasta 30. La salida del paquete al exterior la registra el operador postal y, si su valor no pasa de US$ 200, está exenta de tributos (Decreto 50/026, art. 10).',
    },
    {
      heading: 'Si no llega, falta algo o vino fallado',
      body: 'Shein pone tres plazos distintos y cada uno se cuenta desde una fecha diferente. Si el pedido no llegó en el plazo estimado, tenés que contactar a su atención al cliente dentro de los 90 días desde la fecha de pago. Si el seguimiento dice entregado y no lo recibiste, o llegó con artículos de menos o equivocados, el plazo es de 60 días desde la fecha de entrega que figura en el seguimiento. Un artículo defectuoso o dañado se reclama dentro de los 180 días desde la fecha del pedido. Ojo con un cuarto plazo, el de los términos generales: un reclamo por faltantes o daños ocurridos antes de la entrega «debe presentarse» dentro de los cinco días posteriores a la recepción, así que, si te falta algo, reclamá dentro de esos cinco días aunque la página de envíos te dé 60. Además de la política de la tienda está la ley: una compra a distancia que aceptás desde Uruguay se rige por la ley uruguaya (Ley 19.920, art. 50), y la Ley 17.250 cuenta como proveedor también a la empresa extranjera (art. 3), con el derecho de arrepentimiento de cinco días hábiles de su art. 16. Tener la ley de tu lado no es lo mismo que poder hacerla cumplir contra una empresa sin oficina en el país, cuyos términos, para un comprador de Uruguay, ponen la compra bajo las leyes de Singapur: por eso conviene reclamar primero dentro de Shein, por escrito y con capturas, y, si pagaste con tarjeta, saber cómo funciona el contracargo.',
      links: [
        { label: 'Tus derechos en una compra online', to: '/derechos-consumidor-compras-online' },
        { label: 'Si el paquete queda en la Aduana', to: '/problemas-con-la-aduana-uruguay' },
      ],
    },
    {
      heading: 'Lo que no conviene poner en el carrito',
      body: 'El régimen de envíos postales no sirve para todo lo que vende Shein. El Decreto 50/026 no se aplica a la mercadería gravada por IMESI ni a la que necesita la autorización de algún organismo para entrar al país y no la tiene (art. 7), y el IMESI alcanza a los cosméticos y a la perfumería en general (Título 11 del Texto Ordenado 2023, art. 1). En un carrito de Shein eso toca, sobre todo, al maquillaje y a los perfumes, que quedan fuera del régimen postal entero, o sea sin franquicia ni prestación única. Se pueden traer, pero no como un paquete común: según la Aduana, a un envío con mercadería gravada por IMESI le rige el régimen general de importación y hace falta contratar a un despachante de aduana para que lo libere, después de pagar los tributos. La ficha de cosméticos explica qué artículos de higiene, como el champú o el desodorante, quedan fuera del IMESI y sí entran. Si algo así llega sin despachar, el decreto te deja devolverlo a tu costo al lugar de procedencia dentro de los 30 días, siempre que no hayas incumplido la normativa vigente. Antes de sumar algo que no sea ropa, buscalo en la guía de importación por categoría.',
      links: [
        { label: 'Importar según qué compres', to: '/importar' },
        { label: 'Cosméticos y perfumería', to: '/importar/cosmeticos-y-perfumeria' },
        { label: 'Ropa y calzado', to: '/importar/ropa-y-calzado' },
        { label: 'Productos prohibidos', to: '/importar/productos-prohibidos' },
      ],
    },
    {
      heading: '¿Es seguro comprar en Shein?',
      body: 'Si la duda es la tienda y no la aduana, la ficha de Shein en el directorio de tiendas online junta sus señales públicas, cada una con su fecha, sin darte un veredicto; lo que sí depende de vos es comprar en el sitio o la app oficial y pagar con una tarjeta a tu nombre.',
      links: [{ label: 'Shein en el directorio de tiendas', to: '/tiendas-online-uruguay/shein' }],
    },
  ],
  steps: [
    {
      name: 'Cargá tu dirección en Uruguay',
      text: 'Entrá con tu cuenta y escribí la dirección donde vas a recibir: si el checkout no te deja hacerlo, Shein no entrega en tu zona.',
    },
    {
      name: 'Mirá el envío en el carrito',
      text: 'Con Uruguay elegido, Shein publica envío estándar de US$ 12,90 en pedidos de hasta US$ 79 y gratis en los de más de US$ 79; confirmá lo que te muestra a vos.',
    },
    {
      name: 'Pagá con una tarjeta internacional a tu nombre',
      text: 'Para usar la franquicia, el titular de la tarjeta, el comprador y el destinatario del envío tienen que ser la misma persona.',
    },
    {
      name: 'Guardá la factura y el seguimiento',
      text: 'La Aduana toma el total de la factura original de compra, con el envío incluido si figura en ella, y el seguimiento te dice si el pedido viene en uno o en varios paquetes.',
    },
    {
      name: 'Pagá la liquidación cuando te avisen',
      text: 'El operador postal liquida el IVA ante la Aduana y no puede entregarte el paquete hasta haber acreditado ese pago.',
    },
    {
      name: 'Revisá el paquete apenas llega',
      text: 'Si faltan artículos o vino algo dañado, reclamá a Shein dentro de los 5 días desde que lo recibiste, como piden sus términos (5.5), aunque la página de envíos dé 60; para devolver un talle, 30 días desde que lo recibiste.',
    },
  ],
  faqs: [
    {
      q: '¿Shein envía a Uruguay?',
      a: `Sí. Su página oficial de información de envío, con Uruguay elegido, muestra el envío estándar: de 1 a 3 días de procesado y de 8 a 13 días laborables de entrega estimada, US$ 12,90 en pedidos de hasta US$ 79 y gratis en los de más de US$ 79. Lo consultamos el ${SHEIN_VERIFIED_LABEL}; lo que vale es lo que te muestra el checkout con tu dirección.`,
    },
    {
      q: '¿Cómo se compra en Shein desde Uruguay?',
      a: 'En shein.com o en su app oficial: elegís talle, color y cantidad, vas a la cesta, entrás con tu cuenta o te registrás con tu email, cargás tu dirección en Uruguay y el medio de pago y tocás «Realizar pedido». Se paga con tarjeta de crédito o de débito y el cargo se hace en el momento del pedido; después te llega un email de confirmación y el seguimiento queda en «Mis pedidos».',
    },
    {
      q: '¿Cuánto demora en llegar un pedido de Shein a Uruguay?',
      a: `Entre ${SHEIN_TOTAL_MIN_DAYS} y ${SHEIN_TOTAL_MAX_DAYS} días laborables desde que pagás, según Shein: de ${SHEIN_PROCESSING_DAYS[0]} a ${SHEIN_PROCESSING_DAYS[1]} días de procesado más ${SHEIN_STD_TRANSIT_DAYS[0]} a ${SHEIN_STD_TRANSIT_DAYS[1]} días laborables de envío estándar. Es una estimación que puede estirarse por vuelos, preventas, clima o temporada alta, y Shein no dice si incluye el paso por la aduana uruguaya. Si 48 horas después de la fecha estimada no llegó, Shein pide que contactes a su atención al cliente; tenés 90 días desde la fecha de pago para reclamar.`,
    },
    {
      q: '¿Cuánto pago de impuestos por un pedido de Shein?',
      a: `Con la franquicia pagás IVA del ${IVA_PCT} sobre la factura, envío incluido, con un mínimo de ${IVA_FLOOR} por envío. En una factura de hasta ${sheinUsd(SHEIN_FLOOR_UP_TO_USD)} pagás el mínimo: ${sheinUsd(EJ_75.cart)} de ropa más ${sheinUsd(EJ_75.shipping)} de envío terminan en ${sheinUsd(EJ_75.total)}, y ${sheinUsd(EJ_80.cart)}, con envío gratis, en ${sheinUsd(EJ_80.total)}. Si ya usaste los tres envíos del año o el cupo, pagás la prestación única del ${SIMPLIFIED_RATE_PCT} % sobre la factura en lugar del IVA. Lo liquida y lo cobra el operador postal o courier que trae el paquete, no Shein.`,
    },
    {
      q: '¿Los precios de Shein son en dólares o en pesos?',
      a: 'En dólares por defecto. El selector de moneda, arriba a la derecha, te deja verlos en pesos uruguayos, pero la lista de monedas de la página de métodos de pago de Shein no incluye el peso uruguayo, así que mirá en qué moneda figura el total antes de confirmar. Esa página tampoco menciona pagos en cuotas.',
    },
    {
      q: '¿Por qué me piden la cédula después de comprar en Shein?',
      a: 'Porque el operador postal o courier que trae el paquete lo declara ante la Aduana, y el Decreto 50/026 lo obliga a registrar tu número de documento, tu nombre completo y el del titular del medio de pago, tu domicilio y, de la tarjeta, el tipo, el emisor y los cuatro últimos dígitos (art. 9). La Aduana nunca pide el número completo de la tarjeta ni su código de seguridad, y el envío no se libera hasta que los datos sean correctos.',
    },
    {
      q: '¿Hay una tienda de Shein en Uruguay?',
      a: 'Shein no publica ninguna. Se describe como un retailer de moda online, su página «Sobre nosotros» no nombra ningún local y, abierto desde Uruguay, el sitio queda en www.shein.com, sin una versión local. Se compra en el sitio o en la app oficial y el pedido llega por envío estándar.',
    },
    {
      q: '¿Necesito casillero para comprar en Shein desde Uruguay?',
      a: 'No hace falta: Shein entrega directo en Uruguay. Y no cuentes con que el casillero te saque el IVA: la exoneración de los envíos desde Estados Unidos exige que los embarque un vendedor residente fiscal en ese país con destino a Uruguay, y eso se acredita con la factura (Decreto 50/026, art. 3). Comprando con tu dirección en Uruguay, los términos de Shein nombran como vendedora a Fashion Choice Pte. Ltd.; con una dirección de Miami te pueden redirigir al sitio de Estados Unidos, con sus propios términos y su propio vendedor. Lo que el casillero sí agrega es el flete del courier.',
    },
    {
      q: '¿Se puede traer maquillaje de Shein a Uruguay?',
      a: `Sí, pero no como un paquete común: lo gravado por IMESI, como el maquillaje y los perfumes, queda fuera del régimen de envíos postales (Decreto 50/026, art. 7), o sea sin franquicia ni prestación única del ${SIMPLIFIED_RATE_PCT} %. Según la Aduana, rige el régimen general de importación y hace falta un despachante de aduana para liberar el envío, después de pagar los tributos. Si algo así llega sin despachar, el decreto te deja devolverlo a tu costo dentro de los 30 días, siempre que no hayas incumplido la normativa vigente.`,
    },
    {
      q: '¿Shein me cobra los impuestos cuando compro?',
      a: 'No es Shein quien los liquida. Según el Decreto 50/026, el IVA lo liquida el operador postal que trae el paquete, lo paga ante la Aduana y no te puede entregar la mercadería hasta acreditar ese pago (art. 8), y la página de envíos de Shein para Uruguay no menciona ningún cobro de impuestos. Por eso el importe aparece con el aviso de llegada y no al pagar la compra.',
    },
    {
      q: '¿Cómo devuelvo algo a Shein desde Uruguay?',
      a: 'Desde "Mis pedidos", dentro de los 30 días desde que lo recibiste y con la prenda sin usar, sin lavar y con sus etiquetas. El único método que figura es la devolución autogestionada: el envío de vuelta lo pagás vos y Shein dice que no lo reembolsa, salvo las excepciones de su política. La salida al exterior la registra el operador postal y, si su valor no pasa de US$ 200, está exenta de tributos (Decreto 50/026, art. 10).',
    },
    {
      q: '¿Puedo pagar Shein con la tarjeta de otra persona?',
      a: 'Podés, pero ese envío no entra por franquicia: el Decreto 50/026 exige que el titular del medio de pago coincida con el titular de la compra y con el destinatario del envío (art. 4). Si la compra es para vos, pagá con una tarjeta a tu nombre y poné tu nombre en el envío.',
    },
    {
      q: '¿Es seguro comprar en Shein desde Uruguay?',
      a: 'No damos un veredicto sobre la tienda: la ficha de Shein en el directorio de tiendas online reúne sus señales públicas, cada una con su fecha. Lo que sí está en tus manos es comprar en el sitio o la app oficial, pagar con una tarjeta a tu nombre y guardar la factura y el seguimiento hasta que el pedido quede cerrado.',
    },
  ],
  related: [
    { label: 'Impuesto Temu: la cuenta de cada compra', to: '/impuesto-temu-uruguay' },
    { label: 'Guía del impuesto Temu', to: '/guias/impuesto-temu-uruguay' },
    { label: 'Franquicia de aduana', to: '/franquicia-aduana-uruguay' },
    { label: 'Envío directo o casillero', to: '/envio-directo-o-casillero-uruguay' },
    { label: 'Importar de AliExpress', to: '/guias/importar-de-aliexpress-a-uruguay' },
    { label: 'Shein en el directorio de tiendas', to: '/tiendas-online-uruguay/shein' },
  ],
  sources: [
    {
      label: `Información de envío, con Uruguay elegido como ubicación — envío estándar, "8-13 Días laborables", "(1-3 días de procesado)", "$12.90—importe entre 0 y $79.00" y "Gratis - pedidos superiores a $79.00"; demoras por "vuelos, productos en preventa/personalizados, condiciones meteorológicas"; si no podés escribir tu dirección en el pedido, "la entrega no se admite en su área"; 90 días desde el pago y 60 desde la entrega para reclamar (consultado el ${SHEIN_VERIFIED_LABEL})`,
      url: SHEIN_SHIPPING_URL,
      publisher: 'Shein',
    },
    {
      label: `Términos y Condiciones (vigentes desde el 15 de marzo de 2022) — Roadget Business Pte. Ltd. opera el sitio y la aplicación, y quien pide el envío a otro país "es posible que sea redirigido al Sitio local del país" y "estará sujeto a los Términos de ese Sitio local" (1.1); "Todos los nombres del destinatario, direcciones y nombres del pagador deben ser válidos" y sin compensación si un dato impide el despacho aduanero (2.5); "El costo total del pedido es el precio de los productos solicitados más el gasto de envío" y el cargo en la tarjeta "en el momento de su pedido", salvo un pago posterior "que solo está disponible en ciertos países" (5.1); envíos desde distintos almacenes, pedido dividido "a nuestra propia discreción" y entregas que "pueden demorar más" en períodos de gran actividad (5.4); vende Fashion Choice Pte. Ltd. fuera de los países listados y faltantes o daños "dentro de los cinco (5) días posteriores a su recepción" (5.5); "leyes y regulaciones de Singapur" (13.5) (consultado el ${SHEIN_VERIFIED_LABEL})`,
      url: SHEIN_TERMS_URL,
      publisher: 'Shein',
    },
    {
      label: `Terms and Conditions del sitio de Estados Unidos, en inglés — compras a "Third-Party Seller(s)" y/o "SHEIN Distribution Corporation" (1.1) y el vendedor de cada producto, "SHEIN Distribution Corporation if you purchase a product sold by SHEIN or the Third-Party Seller" (5.4) (consultado el ${SHEIN_VERIFIED_LABEL})`,
      url: SHEIN_US_TERMS_URL,
      publisher: 'Shein',
    },
    {
      label: `¿Cuánto tiempo tardará en llegar mi pedido? — "Tiempo de entrega = Tiempo de procesamiento + Tiempo de envío" (consultado el ${SHEIN_VERIFIED_LABEL})`,
      url: sheinFaqUrl(57522),
      publisher: 'Shein',
    },
    {
      label: `¿Puedo recibir mi pedido antes de una determinada fecha? — la ayuda en español de Shein trae la respuesta en inglés: "an order needs 1-3 business days for processing before being shipped"; "there is no exact delivery date, just an approximation" (consultado el ${SHEIN_VERIFIED_LABEL})`,
      url: sheinFaqUrl(57687),
      publisher: 'Shein',
    },
    {
      label: `¿Por qué mi pedido está con retraso? — "Si el paquete sigue sin entregarse 48 horas después de la ETA", contactar a atención al cliente (consultado el ${SHEIN_VERIFIED_LABEL})`,
      url: sheinFaqUrl(57527),
      publisher: 'Shein',
    },
    {
      label:
        '¿Hay gastos adicionales? — "Tu pago cubre solo los artículos y el envío"; los aranceles o impuestos de importación "son responsabilidad del destinatario"; un paquete devuelto por aranceles no pagados recibe "un reembolso completo del artículo"',
      url: sheinFaqUrl(57507),
      publisher: 'Shein',
    },
    {
      label:
        '¿Existe algún canal logístico específico para evitar aranceles? — "SHEIN no reembolsará los derechos de aduana" y, si el paquete vuelve por no pagarlos, el reembolso es "menos los gastos de envío"',
      url: sheinFaqUrl(59422),
      publisher: 'Shein',
    },
    {
      label:
        '¿Por qué se ha dividido mi pedido en dos o más paquetes? — artículos de diferentes almacenes, diferentes tiempos de preparación y "Límite de peso en aduanas o en mensajería"',
      url: sheinFaqUrl(57472),
      publisher: 'Shein',
    },
    {
      label:
        '¿Cómo puedo contactar con la empresa de transporte? — con el número de seguimiento en www.17track.net "sabrá qué empresa de mensajería de envío tiene su pedido"',
      url: sheinFaqUrl(57477),
      publisher: 'Shein',
    },
    {
      label: `Política de devolución — 30 días desde la recepción de la mayoría de los artículos nuevos, artículos no retornables, "Devolución Autogestionada" con la tarifa a cargo del cliente y 180 días desde el pedido para un artículo defectuoso o dañado (consultado el ${SHEIN_VERIFIED_LABEL})`,
      url: SHEIN_RETURNS_URL,
      publisher: 'Shein',
    },
    {
      label: `Reembolso — a la cartera de Shein o a la forma de pago original; a tarjeta de crédito o débito "En 24 Horas" de Shein y "5–10 días hábiles (a veces hasta 30 días)" del banco; "Los gastos originales de envío, la garantía de envío y la tasa de procesamiento, no son reembolsables" (consultado el ${SHEIN_VERIFIED_LABEL})`,
      url: SHEIN_REFUND_URL,
      publisher: 'Shein',
    },
    {
      label:
        'Cómo hacer un pedido — los cinco pasos, el email de confirmación y el seguimiento "de su paquete/s" en Mis Pedidos',
      url: SHEIN_HOW_TO_ORDER_URL,
      publisher: 'Shein',
    },
    {
      label:
        'Sobre nosotros — "SHEIN es un retailer global de moda y estilo de vida online"; la página no nombra locales',
      url: SHEIN_ABOUT_URL,
      publisher: 'Shein',
    },
    {
      label:
        'SHEIN-Compras Online en Google Play — la app oficial, publicada por Roadget Business Pte. Ltd.',
      url: SHEIN_APP_URL,
      publisher: 'Google Play',
    },
    {
      label:
        'Decreto 50/026 — franquicia anual con IVA (art. 3), tres envíos por año civil y titular del pago igual al comprador y al destinatario (art. 4), valor de factura con todos sus conceptos (art. 5), exclusión de lo gravado por IMESI o sin autorización (art. 7), el operador postal liquida y paga antes de entregar (art. 8), el operador registra de cada envío el documento, el "nombre completo del titular de la encomienda y del medio de pago", el domicilio y los "cuatro últimos dígitos" de la tarjeta (art. 9) y exportaciones de hasta US$ 200 exentas (art. 10)',
      url: DECRETO_50_026_URL,
      publisher: 'IMPO',
    },
    {
      label: `Preguntas frecuentes del régimen de envíos postales — "El operador postal o courier realiza la declaración ante la Aduana"; "es una Declaración Jurada"; "La Aduana en ningún momento solicitará el número completo del medio de pago. Tampoco solicitará el código de seguridad"; "El envío no se libera hasta que la información sea correcta"; el registro "Por ahora es voluntario, pero luego será obligatorio", por única vez y con identidad digital "nivel intermedio o superior"; sin las condiciones de la franquicia "Se aplica el régimen del 60%"; con mercadería gravada por IMESI "Rige el Régimen General de Importaciones y se requiere la contratación de un Despachante de Aduana para que libere su envío, luego de pagar los tributos correspondientes" (consultado el ${SHEIN_VERIFIED_LABEL})`,
      url: DNA_FAQ_URL,
      publisher: 'Dirección Nacional de Aduanas',
    },
    {
      label: `Régimen de franquicia — pago con "tarjeta de crédito o débito internacional o instrumento de dinero electrónico internacional, emitidos por instituciones reguladas por el Banco Central" y el mismo titular en el pago, la compra y el destino (consultado el ${SHEIN_VERIFIED_LABEL})`,
      url: DNA_FRANQUICIA_URL,
      publisher: 'Dirección Nacional de Aduanas',
    },
    {
      label:
        'Texto Ordenado 2023, Título 10, art. 13 — el IVA de un envío postal "en ningún caso" puede ser inferior al equivalente a US$ 20 (inciso agregado por la Ley 20.446, art. 660)',
      url: 'https://www.impo.com.uy/bases/todgi2023/101-2024/13_T10',
      publisher: 'IMPO',
    },
    {
      label: 'Texto Ordenado 2023, Título 10, art. 34 — tasa básica del IVA del 22 %',
      url: 'https://www.impo.com.uy/bases/todgi2023/101-2024/34_T10',
      publisher: 'IMPO',
    },
    {
      label:
        'Texto Ordenado 2023, Título 11, art. 1 — el IMESI grava los "cosméticos, perfumería en general" (num. 8)',
      url: 'https://www.impo.com.uy/bases/todgi2023/101-2024/1_T11',
      publisher: 'IMPO',
    },
    {
      label:
        'Ley 19.920, art. 50, lit. E, num. 3 — en los contratos de consumo celebrados a distancia "se aplicará la ley" del domicilio del consumidor, "siempre que el consumidor hubiere prestado su consentimiento en él"',
      url: 'https://www.impo.com.uy/bases/leyes/19920-2020/50',
      publisher: 'IMPO',
    },
    {
      label:
        'Ley 17.250, art. 3 — proveedor es toda persona física o jurídica, "nacional o extranjera", que comercialice productos en una relación de consumo',
      url: 'https://www.impo.com.uy/bases/leyes/17250-2000/3',
      publisher: 'IMPO',
    },
    {
      label:
        'Ley 17.250, art. 16 — en la oferta por medio informático, el consumidor puede rescindir o resolver "dentro de los cinco días hábiles" desde el contrato o la entrega, a su opción',
      url: 'https://www.impo.com.uy/bases/leyes/17250-2000/16',
      publisher: 'IMPO',
    },
    {
      label:
        'Guía de preguntas frecuentes sobre el régimen de envíos postales y franquicias — IVA salvo excepciones, hasta 3 envíos por año y, desde Estados Unidos y hasta 200 dólares, sin IVA por el TIFA; desde el 1.º de mayo los tributos se pagan "exclusivamente a través de los operadores postales"',
      url: 'https://www.gub.uy/ministerio-economia-finanzas/comunicacion/noticias/guia-preguntas-frecuentes-sobre-regimen-envios-postales-franquicias',
      publisher: 'Ministerio de Economía y Finanzas',
    },
    {
      label: `Método de pago — "Pagos con Tarjeta de Crédito/Débito"; la moneda depende del país desde donde comprás y se puede cambiar la que aparece por defecto; la lista de monedas no incluye el peso uruguayo y la página no menciona cuotas (consultado el ${SHEIN_VERIFIED_LABEL})`,
      url: SHEIN_HOW_TO_PAY_URL,
      publisher: 'Shein',
    },
    {
      label: `Sitio de Shein pedido desde Uruguay — queda en www.shein.com, en español, con la moneda en dólares por defecto y el peso uruguayo (UYU) entre sus monedas (consultado el ${SHEIN_VERIFIED_LABEL})`,
      url: 'https://www.shein.com/',
      publisher: 'Shein',
    },
    {
      label:
        'Consulte franquicias utilizadas — "Consulte aquí cuántos envíos tiene registrados bajo el régimen de franquicia", con identidad digital',
      url: 'https://www.aduanas.gub.uy/innovaportal/v/28224/1/innova.front/',
      publisher: 'Dirección Nacional de Aduanas',
    },
    {
      label:
        'Desde el 1.º de mayo comienza a regir el nuevo régimen de franquicias de envíos postales internacionales — los envíos de este régimen están gravados por IVA',
      url: 'https://www.aduanas.gub.uy/innovaportal/v/28455/1/innova.front/desde-el-1%C2%BA-de-mayo-comienza-a-regir-el-nuevo-regimen-de-franquicias-de-envios-postales-internacionales.html',
      publisher: 'Dirección Nacional de Aduanas',
    },
  ],
}

// IRPF de alquileres, del lado del PROPIETARIO: cuánto va al impuesto por cada mes de alquiler,
// quién lo retiene, cómo se paga el anticipo, la exoneración de los 40 BPC y el caso del no
// residente. El inquilino tiene su propia página (/credito-fiscal-por-alquiler-uruguay) y la ley
// del contrato de temporada la suya (/alquiler-de-temporada-uruguay): acá sólo se enlazan.
//
// Verificado el 2026-10-21 en fuente primaria:
// - DGI, «Ingreso por alquileres anuales y de temporada» (publicada el 05/10/2026): 10,5 % mensual,
//   agentes de retención, plataformas que no retienen, boleto 2908 con el código 111 (IRPF) y el
//   200 (IRNR), el ejemplo de $ 30.000 de agosto de 2026 → $ 3.150 con vencimiento el 25/9/2026,
//   vivienda de interés social y no residentes sin exoneración.
// - DGI, «Exoneración de arrendamientos», los dos trámites de solicitud, el de baja, el instructivo
//   de los formularios 5500 y 5600 y la tabla de valores 2026 ($ 274.560 y $ 20.592).
// - DGI, «Vencimientos para contribuyentes del IRPF…» (20/08/2026): pagos a cuenta de 2026.
// - CGN: la ficha del alquiler por Contaduría (retiene el 10,50 %) y el trámite «Presentación de
//   exoneración de IRPF». BPS, valores actuales: BPC de octubre de 2026 = $ 6.864.
// - IMPO: Título 7 arts. 10, 16, 17, 35, 37, 38 lit. J y 51; Título 8 art. 18; Decreto 148/007
//   arts. 34, 36, 37, 38 y 45; Decreto 149/007 arts. 24, 32 y 33; Decreto 309/024 art. 1.
//
// Re-verificado el 2026-11-20, con lo que preguntan en Search Console (formularios 5500 y 5600, «a
// partir de qué monto se paga», el pago y la devolución) y los casos que faltaban:
// - DGI: la tabla de valores de la exoneración (PDF del 23/01/2026, un renglón por año desde 2007:
//   2025 $ 263.040 y $ 19.728, 2024 $ 247.080 y $ 18.531), las fichas de descarga de los formularios
//   5500, 5600 y 5501, la ficha del trámite (actualizada el 09/11/2026: 5500 en una vía, 5600 en
//   dos, sin costo), el instructivo (período con la prórroga, 02/2022, vencimiento vacío = 31/12 del
//   año de la solicitud, documentos, número de carpeta de la CGN) y «Medios habilitados para el pago
//   del IRPF» (Abitab, Red Pagos, BANRED y bancos adheridos, sin clave de la DGI).
// - IMPO: Resolución DGI 662/007 nums. 2 (excedente imputable o en devolución), 7 (moneda
//   extranjera), 17 (la opción por definitivo vale para todos los alquileres) y 18 (10,5 % de los
//   ingresos devengados); Decreto 150/007 art. 74 (interbancario comprador billete del día
//   anterior); Decreto 148/007 art. 13 (incobrable a los tres meses) y art. 36 (su nota sigue sin
//   una suspensión posterior al Decreto 309/024); Ley 19.889 art. 224.
// - El calendario de la DGI sigue sin días de 2027.
//
// LO QUE NO SE PUBLICA A PROPÓSITO:
// - La dirección para el trámite en persona: el instructivo de 2023 dice Av. Daniel Fernández
//   Crespo 1534 y la ficha del 09/11/2026, Mario Cassinoni 1647.
// - Un vencimiento de enero de 2027 y los topes de 2027: no están publicados.
// - Las multas y recargos por pagar tarde: no se verificaron.
// - Un ejemplo en pesos del alquiler en dólares: ataría la guía a una cotización de un día.
//
// Las cifras atadas a la tasa y a la BPC NO se escriben a mano: salen de capitalTax.ts y de
// URUGUAY.bpc, las mismas que usa /impuestos-inversiones-uruguay, para que las dos páginas no
// puedan decir números distintos.

/** Punto de miles a la uruguaya, sin depender del ICU de Node ("3.150", "274.560"). */
const miles = (n: number): string =>
  Math.round(n)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, '.')
const pesos = (n: number): string => `$ ${miles(n)}`
/** "10,5 %", "12 %", "87,5 %": coma decimal y espacio antes del signo. */
const pct = (n: number): string => `${(Math.round(n * 10) / 10).toString().replace('.', ',')} %`

const TASA = GENERAL_RULE.rate ?? 12
const P105 = pct(RENT_WITHHOLDING_PCT)
const P12 = pct(TASA)
/** La retención es la tasa aplicada a este porcentaje del alquiler bruto: 10,5 / 12 = 87,5 %. */
const BASE_PCT = (RENT_WITHHOLDING_PCT / TASA) * 100
const P875 = pct(BASE_PCT)
const P125 = pct(100 - BASE_PCT)

const BPC = URUGUAY.bpc
const TOPE_ALQUILERES = SMALL_LANDLORD_MAX_BPC * BPC
const TOPE_OTRAS_RENTAS = SMALL_LANDLORD_OTHER_CAPITAL_MAX_BPC * BPC

// El ejemplo de la DGI: $ 30.000 de alquiler de agosto de 2026.
const ALQUILER_DGI = 30_000
const ANTICIPO_DGI = (ALQUILER_DGI * RENT_WITHHOLDING_PCT) / 100

// Ejemplo propio (rotulado así en el texto): un año de alquiler y gastos deducibles del 15 %.
const ANUAL = ALQUILER_DGI * 12
const RETENIDO_ANUAL = (ANUAL * RENT_WITHHOLDING_PCT) / 100
const DEDUCCIONES = ANUAL * 0.15
const REAL = ((ANUAL - DEDUCCIONES) * TASA) / 100

// La tabla de montos: alquileres redondos, cuenta propia con la retención de capitalTax.ts.
const ALQUILERES_DE_EJEMPLO = [15_000, 20_000, 25_000, 30_000, 40_000, 50_000, 60_000] as const
const filaDeMontos = (alquiler: number): string[] => [
  pesos(alquiler),
  pesos((alquiler * RENT_WITHHOLDING_PCT) / 100),
  pesos((alquiler * 12 * RENT_WITHHOLDING_PCT) / 100),
  `${pesos(alquiler * 12)}: ${alquiler * 12 <= TOPE_ALQUILERES ? 'dentro del tope' : 'pasa el tope'}`,
]

// Los topes de los dos años anteriores, literales de la tabla de valores de la DGI. El de 2026 sale
// de la BPC (TOPE_ALQUILERES y TOPE_OTRAS_RENTAS).
const TOPES_DGI_ANTERIORES = [
  { anio: '2025', alquileres: 263_040, otras: 19_728 },
  { anio: '2024', alquileres: 247_080, otras: 18_531 },
] as const

export const irpfDeAlquileresGuide: Guide = {
  slug: 'irpf-de-alquileres-uruguay',
  title: `IRPF de alquileres: ${P105} o exoneración`,
  description: `Pagás el ${P105} de cada mes de alquiler: te lo retienen o lo pagás con el boleto 2908, código 111. Con hasta ${SMALL_LANDLORD_MAX_BPC} BPC al año podés pedir la exoneración.`,
  tag: 'IRPF',
  updatedAt: '2026-11-20',
  sections: [
    {
      heading: `Cuánto pagás: el ${P105} de cada mes de alquiler`,
      body: `Si sos residente y alquilás un inmueble, cada mes va al IRPF el ${P105} de lo que cobrás de alquiler, sea un contrato anual o uno de temporada. No hay un monto mínimo: el anticipo corre desde el primer peso de alquiler. Lo que te deja sin pagar es la exoneración de los ${SMALL_LANDLORD_MAX_BPC} BPC, que se le pide a la DGI y alcanza a quien cobra hasta ${pesos(TOPE_ALQUILERES)} de alquileres en el año 2026, ${pesos(TOPE_ALQUILERES / 12)} por mes si cobrás lo mismo los doce meses, y cumple dos condiciones más: está más abajo, junto con la de la vivienda de interés social, que tiene su propio camino. Ese ${P105} no es la tasa del impuesto: es el anticipo que pagás vos, o la retención que te hace un intermediario. La tasa es el ${P12} sobre la renta neta (Título 7, arts. 35 y 37), y el ${P105} sale de aplicar ese ${P12} al ${P875} del alquiler, o sea que es como si un ${P125} se fuera en gastos deducibles. El ejemplo es de la propia DGI: si en agosto de 2026 cobrás un alquiler de ${pesos(ALQUILER_DGI)}, el IRPF a pagar es ${P105} × ${pesos(ALQUILER_DGI)} = ${pesos(ANTICIPO_DGI)}, y vence el 25 de setiembre de 2026. Es la misma cuenta de la página de impuestos sobre inversiones, donde están también las demás rentas de capital, y la calculadora de impuestos sobre inversiones la hace con tus números. La tabla hace la cuenta para alquileres redondos. La última columna compara ese alquiler, cobrado los doce meses y como único alquiler, con el tope de 2026; quedar dentro no exonera solo, hay que pedir la constancia.`,
      table: {
        headers: [
          'Alquiler del mes',
          `IRPF del mes (${P105})`,
          'IRPF en doce meses',
          `Alquiler del año y tope de ${SMALL_LANDLORD_MAX_BPC} BPC`,
        ],
        rows: ALQUILERES_DE_EJEMPLO.map(filaDeMontos),
      },
      links: [
        { label: 'Impuestos sobre inversiones', to: '/impuestos-inversiones-uruguay' },
        {
          label: 'Calculadora de impuestos sobre inversiones',
          to: '/herramientas/calculadora-impuestos-inversiones',
        },
      ],
    },
    {
      heading: 'Si cobrás por inmobiliaria, la Contaduría o ANDA: te lo retienen',
      body: `Cuando el alquiler pasa por un agente de retención, el agente te descuenta el ${P105} y lo paga a la DGI todos los meses. El Decreto 148/007 (art. 36) designa como agentes al Estado y a los demás organismos públicos que te pagan un alquiler, a la Contaduría General de la Nación y a las entidades que prestan juntos los servicios de garantía y cobranza, como ANDA, a las empresas que la DGI tiene en Grandes Contribuyentes o en el grupo CEDE cuando son las que te pagan, y a las entidades que administran propiedades haciendo la cobranza. Ese último detalle importa: la inmobiliaria que sólo te consiguió el inquilino, si después cobrás vos, no es la que retiene, y el anticipo queda de tu lado. Si te retuvieron sobre el total de lo que cobraste, no hacés ningún anticipo, y podés dejar esas retenciones como definitivas sin presentar la declaración jurada anual (Decreto 148/007, art. 45). La Contaduría lo avisa en su propia ficha: de cada alquiler que paga retiene el ${P105}. Hay una trampa cuando el inquilino deja de pagar. Si el agente no cobró, no hubo retención, y para hacer valer el contrato en un juicio, un desalojo por ejemplo, tenés que estar al día con el IRPF (Título 7, art. 17). Por eso la DGI indica que, si el agente no cobró el alquiler, los anticipos los hacés vos. La única excepción de la ley es el desalojo de los alquileres sin garantía del art. 421 de la Ley 19.889.`,
      table: {
        headers: ['Quién te paga', '¿Te retiene?'],
        rows: [
          ['El Estado u otro organismo público', 'Sí'],
          ['Contaduría, ANDA u otra garantía con cobranza', 'Sí'],
          ['Empresa de Grandes Contribuyentes o CEDE', 'Sí'],
          ['Inmobiliaria que administra y cobra', 'Sí'],
          ['Inmobiliaria que sólo consiguió al inquilino', 'No: el anticipo es tuyo'],
          ['Plataforma digital', 'No: informa a la DGI, no retiene'],
          ['Inquilino particular', 'No: el anticipo es tuyo'],
        ],
      },
      links: [
        {
          label: 'Garantías de alquiler: CGN, ANDA y seguros',
          to: '/guias/garantias-de-alquiler-uruguay',
        },
        { label: 'Desalojo de alquiler: plazos', to: '/desalojo-de-alquiler-uruguay' },
      ],
    },
    {
      heading: 'Si cobrás vos o por una plataforma: boleto 2908, código 111',
      body: `Si no hay agente de retención, el anticipo lo pagás vos: el ${P105} de lo que corresponde a cada mes de alquiler, calculado sobre los ingresos devengados en el mes (Resolución DGI 662/007, numeral 18). Vale igual para la temporada y para las plataformas digitales, que según la DGI informan cada operación pero no son agentes de retención y no te retienen nada. Se paga con el boleto de pago 2908, que armás en el portal de la DGI: en el campo RUT va tu cédula, el código de impuesto es el 111 (IRPF, contribuyentes de categoría I, anticipo arrendamiento), en Mes/Año ponés el mes del alquiler y en Importe el monto. Se paga en las redes de cobranza, Abitab o Red Pagos, donde según la DGI no hace falta imprimirlo y alcanza con decir tu cédula, o por internet con la opción de pagar en línea del propio boleto, por BANRED y los bancos adheridos, sin clave de la DGI. Vence al mes siguiente, el día que fija el calendario de la DGI, que no es siempre el mismo: la tabla tiene los de 2026, y el alquiler de diciembre se paga en enero de 2027 con el calendario del año que viene. Una aclaración para el verano: el Decreto 309/024 suspendió la retención de las inmobiliarias en los contratos turísticos de hasta 31 días, pero sólo para los alquileres del 1 de diciembre de 2024 al 30 de abril de 2025, y la nota de IMPO al art. 36 del Decreto 148/007 no registra una suspensión posterior. Si la inmobiliaria no te retuvo, el anticipo es tuyo. Qué hace que un contrato sea de temporada, y los otros riesgos de alquilar por días, están en sus propias páginas.`,
      table: {
        headers: ['Alquiler de', 'Vence el anticipo'],
        rows: [
          ['Diciembre de 2025', '26 de enero de 2026'],
          ['Enero de 2026', '25 de febrero de 2026'],
          ['Febrero de 2026', '25 de marzo de 2026'],
          ['Marzo de 2026', '27 de abril de 2026'],
          ['Abril de 2026', '25 de mayo de 2026'],
          ['Mayo de 2026', '25 de junio de 2026'],
          ['Junio de 2026', '28 de julio de 2026'],
          ['Julio de 2026', '27 de agosto de 2026'],
          ['Agosto de 2026', '25 de setiembre de 2026'],
          ['Setiembre de 2026', '26 de octubre de 2026'],
          ['Octubre de 2026', '25 de noviembre de 2026'],
          ['Noviembre de 2026', '28 de diciembre de 2026'],
        ],
      },
      links: [
        { label: 'Alquiler de temporada: los 120 días', to: '/alquiler-de-temporada-uruguay' },
        { label: 'Alquiler temporario y Airbnb', to: '/guias/alquiler-temporario-uruguay' },
      ],
    },
    {
      heading: 'Dejarlo como definitivo o declarar por lo real',
      body: `Con retención o con anticipos, podés elegir: das esos pagos por definitivos y no presentás la declaración jurada anual por esas rentas, o declarás y liquidás por lo real. La opción es por todos tus alquileres a la vez: si das por definitivo un anticipo o una retención, vale para la totalidad de tus rendimientos inmobiliarios (Resolución DGI 662/007, numeral 17). Lo real es el ${P12} sobre el alquiler bruto menos lo que admite el art. 16 del Título 7: la comisión de la administradora de propiedades, los honorarios profesionales por firmar o renovar el contrato y el IVA de esos servicios, la Contribución Inmobiliaria, el Impuesto de Enseñanza Primaria, el alquiler que pagás vos si subarrendás, y los créditos incobrables. Un alquiler impago se considera incobrable a los tres meses del vencimiento, y si después lo cobrás cuenta como renta del mes en que lo cobrás (Decreto 148/007, art. 13). Si el contrato es de menos de doce meses, la Contribución, Primaria y el subarriendo se descuentan en proporción. Como el ${P105} ya supone un ${P125} de gastos, declarar por lo real baja la cuenta sólo si tus deducciones pasan de ese ${P125} del alquiler. Un ejemplo nuestro, con números redondos: ${pesos(ANUAL)} de alquiler en el año dejan ${pesos(RETENIDO_ANUAL)} de anticipos; si tus gastos deducibles suman ${pesos(DEDUCCIONES)}, el 15 % del alquiler, el impuesto real es el ${P12} de ${pesos(ANUAL - DEDUCCIONES)}, o sea ${pesos(REAL)}, ${pesos(RETENIDO_ANUAL - REAL)} menos. Si liquidás por lo real y lo retenido o anticipado supera el impuesto, el excedente se puede imputar a otras obligaciones tributarias o pedir en devolución (Resolución DGI 662/007, numeral 2). Ojo con las herramientas: la calculadora de IRPF del sitio es la del sueldo; para el alquiler usá la de impuestos sobre inversiones, que pone la retención al lado de lo real.`,
      links: [
        { label: 'Declaración de IRPF: quién y cómo', to: '/declaracion-de-irpf-uruguay' },
        {
          label: 'Calculadora de impuestos sobre inversiones',
          to: '/herramientas/calculadora-impuestos-inversiones',
        },
        { label: 'Calculadora de IRPF del sueldo', to: '/herramientas/calculadora-irpf' },
        { label: 'Contribución Inmobiliaria', to: '/contribucion-inmobiliaria-uruguay' },
        { label: 'Impuesto de Primaria', to: '/impuesto-de-primaria-uruguay' },
      ],
    },
    {
      heading: 'Si cobrás el alquiler en dólares',
      body: `Si el alquiler está en dólares, para calcular la renta y el impuesto se convierte a pesos antes de aplicarle el ${P105}. La regla está en la Resolución DGI 662/007 (numeral 7), que remite al art. 74 del Decreto 150/007: la moneda extranjera se valúa a la cotización interbancaria tipo comprador billete al cierre del día anterior al de la operación, y si ese día no hubo cotización, a la del último día hábil anterior. La pizarra de tu banco o de una casa de cambio no es la que pide la norma. Qué publica el Banco Central y cómo se cuenta el día anterior está en nuestra página de la cotización del BCU.`,
      links: [
        { label: 'Cotización del BCU: la que pide la DGI', to: '/cotizacion-del-bcu' },
        { label: 'Histórico de la cotización del BCU', to: '/historico/bcu/usd' },
      ],
    },
    {
      heading: `A partir de qué monto se paga: la exoneración de ${SMALL_LANDLORD_MAX_BPC} BPC`,
      body: `No hay un monto a partir del cual se empiece a pagar: el alquiler tributa desde el primer peso. Lo que existe es una exoneración para alquileres chicos, y no se aplica sola. El literal J del art. 38 del Título 7 los exonera cuando se cumplen tres condiciones a la vez: que todos tus alquileres juntos no pasen de ${SMALL_LANDLORD_MAX_BPC} BPC en el año civil, que tus demás rendimientos de capital gravados, como los intereses de un depósito a plazo, no pasen de ${SMALL_LANDLORD_OTHER_CAPITAL_MAX_BPC} BPC, y que autorices expresamente el levantamiento del secreto bancario ante la DGI. Con la BPC de 2026, de ${pesos(BPC)}, los topes son ${pesos(TOPE_ALQUILERES)} al año de alquileres, ${pesos(TOPE_ALQUILERES / 12)} por mes si cobrás lo mismo los doce meses, y ${pesos(TOPE_OTRAS_RENTAS)} de otras rentas de capital: las mismas cifras de la tabla de valores que la DGI publicó para 2026. La tabla tiene los topes que publica la DGI para cada año; los de 2027 dependen de la BPC que se fije para ese año. Para no pagar, tenés que pedirle la constancia a la DGI y presentarla a tu agente de retención, si lo tenés, que con ella deja de retenerte (Decreto 148/007, art. 38); si no hay agente, con la constancia no hacés anticipos. Y si dejás de cumplir alguna condición, tenés que pedir la anulación. La vivienda de interés social va por otro camino: no se hace trámite en la DGI, porque la CAIVIS, a través de la Agencia Nacional de Vivienda, emite la constancia con el porcentaje exonerado, y por la parte que no está exonerada se sigue anticipando o reteniendo. El mismo número aparece en una regla que ya no rige: la que obligaba a acreditar en una cuenta bancaria del dueño los alquileres de más de ${SMALL_LANDLORD_MAX_BPC} BPC al año, que la Ley 19.889 (LUC) derogó en 2020.`,
      table: {
        headers: [
          'Año',
          `Alquileres en el año (${SMALL_LANDLORD_MAX_BPC} BPC)`,
          'Promedio por mes',
          `Otras rentas de capital (${SMALL_LANDLORD_OTHER_CAPITAL_MAX_BPC} BPC)`,
        ],
        rows: [
          ['2026', pesos(TOPE_ALQUILERES), pesos(TOPE_ALQUILERES / 12), pesos(TOPE_OTRAS_RENTAS)],
          ...TOPES_DGI_ANTERIORES.map(t => [
            t.anio,
            pesos(t.alquileres),
            pesos(t.alquileres / 12),
            pesos(t.otras),
          ]),
        ],
      },
      links: [
        { label: 'Las otras rentas de capital', to: '/impuestos-inversiones-uruguay' },
        { label: 'Cuánto vale la BPC', to: '/indicadores/bpc' },
        { label: 'Pagar el alquiler en efectivo', to: '/pagar-el-alquiler-en-efectivo-uruguay' },
      ],
    },
    {
      heading: 'Formularios 5500 y 5600: cómo se pide la constancia y cuánto dura',
      body: 'El trámite no tiene costo y se hace en línea: en Servicios en línea de la DGI entrás a Trámites, Solicitud de inicio, y elegís el trámite Exoneración de IRPF Arrendamiento con el subtrámite Solicitud de Constancia de Exoneración por persona física, o por Inmobiliaria si la pide la que te administra. Adjuntás escaneados el formulario 5500, que es la solicitud, y el 5600, que es el levantamiento voluntario del secreto bancario, los dos firmados, tu cédula y el contrato de alquiler, donde tienen que constar el monto, el plazo y quiénes son los arrendadores, junto con el padrón y los datos del inmueble. Si firma un apoderado, hace falta un poder especial que consienta expresamente levantar el secreto bancario ante la DGI, de no más de seis meses. También se puede hacer en persona, con agenda previa, y entonces el 5600 va en dos vías. Se pide al firmar el contrato y cada vez que cambian los datos de los inmuebles declarados. En el 5500 el período va del mes y año de inicio al de finalización contando la prórroga: en el ejemplo de la DGI, un contrato que empieza en febrero de 2020 por un año con opción a otro lleva 02/2022. Si dejás vacío el vencimiento del contrato de un inmueble, la constancia rige para ese inmueble hasta el 31 de diciembre del año de la solicitud. Como documento sirve la cédula, el NIE, el DNI de un país del Mercosur o de Chile, o el pasaporte, y si cobrás por la Contaduría va el número de carpeta. La constancia vale por el período del contrato que pusiste en el 5500, con la prórroga incluida, y se extiende sola un año más. Si el contrato ya venció, la constancia pedida antes del 31 de octubre vale hasta el 31 de diciembre de ese año, y la pedida después, hasta el 31 de diciembre del año siguiente. Si cobrás por la Contaduría, además subís la constancia de la DGI en el trámite Presentación de exoneración de IRPF de la CGN. Para darla de baja está el formulario 5501, por el subtrámite Solicitud Baja de Constancia de Exoneración. Los tres formularios se bajan en PDF del sitio de la DGI; los enlaces están en las fuentes.',
      table: {
        headers: ['Formulario', 'Qué es', 'Cómo se presenta'],
        rows: [
          [
            '5500',
            'Solicitud de constancia de exoneración de arrendamiento de inmuebles: el período del contrato y, por cada inmueble, los datos que lo identifican, tu porcentaje del alquiler y el vencimiento del contrato',
            'Firmado, en una vía',
          ],
          [
            '5600',
            'Solicitud de levantamiento voluntario del secreto bancario',
            'Firmado; en dos vías si el trámite es presencial',
          ],
          [
            '5501',
            'Solicitud de anulación de la constancia, para cuando dejás de cumplir alguna condición',
            'En dos vías si el trámite es presencial',
          ],
        ],
      },
    },
    {
      heading: 'Si el inmueble es de un matrimonio, de varios dueños o de una sucesión',
      body: 'La renta se reparte entre los dueños, y cada uno responde por su parte, también a la hora de cumplir las condiciones de la exoneración. En un matrimonio sin capitulaciones, la DGI mira la escritura de compraventa: si figura un solo cónyuge, el administrador, la renta es toda suya; si figuran los dos, va mitad y mitad. Con capitulaciones matrimoniales, se reparte como digan las capitulaciones. En un condominio o una sucesión, el art. 10 del Título 7 atribuye la renta a los condóminos o a los herederos según las normas o los contratos que correspondan, y en partes iguales si no hay prueba. Por eso el formulario 5500 te pide el porcentaje del alquiler que te toca: 50 % si sos dueño de la mitad. Si el titular del inmueble falleció, los herederos pueden pedir la exoneración cada uno por su lado, siempre que la sucesión esté inscripta en la DGI con los presuntos herederos identificados y que cada uno reúna las condiciones de la ley.',
      links: [
        { label: 'Cómo funciona una sucesión', to: '/guias/como-funciona-una-sucesion-uruguay' },
      ],
    },
    {
      heading: 'Si no sos residente: IRNR, código 200 y sin exoneración',
      body: `Si no sos residente fiscal en Uruguay, en vez de IRPF pagás el Impuesto a las Rentas de los No Residentes, que según la DGI se calcula de la misma forma, con una tasa del ${P12} para estas rentas (Título 8, art. 18). Si nadie te retiene, hacés anticipos mensuales del ${P105} de lo que cobrás, y también podés dar los anticipos o las retenciones por definitivos sin presentar declaración (Decreto 149/007, art. 24). Para pagar tenés que inscribirte en el RUT, donde la DGI te da un número de identificación de extranjero, el NIE, que es lo que ponés en el campo RUT del boleto 2908, con el código 200 (IRNR, contribuyentes, anticipo). La diferencia que más pesa es que un no residente no puede pedir la exoneración de los ${SMALL_LANDLORD_MAX_BPC} BPC: es sólo para contribuyentes de IRPF. Y la lista de agentes de retención es más larga, porque además del Estado, la Contaduría y las inmobiliarias que cobran incluye a cualquier empresa contribuyente de IRAE que sea tu inquilina (Decreto 149/007, art. 32).`,
      links: [{ label: 'Qué es la residencia fiscal', to: '/glosario/residencia-fiscal' }],
    },
    {
      heading: 'Si sos el inquilino: el crédito del 8 %',
      body: 'Del otro lado del contrato hay un beneficio que se confunde con este impuesto. El inquilino de una vivienda permanente puede descontar de su propio IRPF hasta el 8 % del alquiler que paga (Título 7, art. 51), y para eso tiene que identificar al arrendador en su declaración jurada. No es una devolución del impuesto del dueño ni cambia lo que paga el propietario, aunque sí deja al propietario identificado ante la DGI en la declaración de su inquilino. Qué contrato hace falta, qué datos se piden y cómo se cobra está en la página del crédito fiscal por alquiler.',
      links: [
        {
          label: 'Crédito fiscal por alquiler: el 8 %',
          to: '/credito-fiscal-por-alquiler-uruguay',
        },
      ],
    },
  ],
  steps: [
    {
      name: `Calculá el ${P105}`,
      text: `Multiplicá el alquiler del mes por ${P105}: con ${pesos(ALQUILER_DGI)}, el anticipo es de ${pesos(ANTICIPO_DGI)}.`,
    },
    {
      name: 'Generá el boleto 2908',
      text: 'Entrá al boleto de pago 2908 en el portal de la DGI y, en el campo RUT, escribí tu número de cédula.',
    },
    {
      name: 'Elegí el código 111 y el mes',
      text: 'Código 111 (IRPF, contribuyentes de categoría I, anticipo arrendamiento) y, en Mes/Año, el mes del alquiler: el de agosto de 2026 se carga como 08/2026.',
    },
    {
      name: 'Cargá el importe y pagá',
      text: 'Poné el monto en Importe y pagá en Abitab o Red Pagos diciendo tu cédula, sin imprimir nada, o por internet con la opción de pagar en línea del boleto, por BANRED o un banco adherido.',
    },
    {
      name: 'Respetá el vencimiento',
      text: 'Se paga al mes siguiente del alquiler, el día del calendario de la DGI: el alquiler de noviembre de 2026 vence el 28 de diciembre de 2026.',
    },
  ],
  faqs: [
    {
      q: '¿Cuánto IRPF paga el dueño por alquilar un apartamento?',
      a: `Cada mes, el ${P105} del alquiler: como anticipo si cobrás vos, o como retención si cobra una inmobiliaria que te administra, la Contaduría o ANDA. Es un pago a cuenta del impuesto real, que es el ${P12} de la renta neta después de las deducciones del art. 16 del Título 7. Con ${pesos(ALQUILER_DGI)} de alquiler son ${pesos(ANTICIPO_DGI)} por mes. Si tus alquileres no pasan de ${pesos(TOPE_ALQUILERES)} en 2026 y cumplís las otras dos condiciones, podés pedir la exoneración.`,
    },
    {
      q: '¿A partir de qué monto se paga IRPF por alquileres?',
      a: `No hay un mínimo: el ${P105} corre desde el primer peso. Lo que hay es una exoneración que se le pide a la DGI: alcanza a quien cobra hasta ${SMALL_LANDLORD_MAX_BPC} BPC de alquileres en el año, ${pesos(TOPE_ALQUILERES)} en 2026 (${pesos(TOPE_ALQUILERES / 12)} por mes si cobrás lo mismo los doce meses; lo que cuenta es el total del año civil), no tiene otras rentas de capital gravadas por más de ${pesos(TOPE_OTRAS_RENTAS)} y autoriza el levantamiento del secreto bancario. En 2025 el tope fue de ${pesos(TOPES_DGI_ANTERIORES[0].alquileres)}.`,
    },
    {
      q: '¿Cómo se paga el IRPF de un alquiler sin inmobiliaria?',
      a: `Con el boleto de pago 2908 del portal de la DGI: en RUT ponés tu cédula, elegís el código 111, en Mes/Año el mes del alquiler y en Importe el ${P105} de lo que cobraste. En Abitab o Red Pagos alcanza con la cédula, sin imprimir el boleto, y por internet se paga con la opción de pagar en línea del boleto, por BANRED o un banco adherido, sin clave de la DGI.`,
    },
    {
      q: '¿Cuándo vence el anticipo de IRPF por alquileres?',
      a: 'Al mes siguiente del alquiler, el día que fija el calendario de la DGI. El alquiler de octubre de 2026 vence el 25 de noviembre y el de noviembre el 28 de diciembre. El de diciembre se paga en enero de 2027, el día que fije el calendario de 2027 de la DGI.',
    },
    {
      q: '¿Quién está exonerado de pagar IRPF por alquileres?',
      a: `El residente cuyos alquileres no pasan de ${SMALL_LANDLORD_MAX_BPC} BPC en el año, ${pesos(TOPE_ALQUILERES)} en 2026, que no tiene otros rendimientos de capital gravados por más de ${SMALL_LANDLORD_OTHER_CAPITAL_MAX_BPC} BPC, ${pesos(TOPE_OTRAS_RENTAS)}, y que autoriza el levantamiento del secreto bancario. No es automática: hay que pedirle la constancia a la DGI con los formularios 5500 y 5600 y presentársela al agente de retención, si lo hay. Los no residentes no pueden pedirla.`,
    },
    {
      q: '¿Qué son los formularios 5500 y 5600 de la DGI?',
      a: 'El 5500 es la solicitud de la constancia de exoneración de IRPF por arrendamientos y el 5600, la solicitud de levantamiento voluntario del secreto bancario que esa exoneración exige. Se presentan juntos y firmados, con tu cédula y el contrato de alquiler, por Servicios en línea de la DGI o en persona con agenda previa, y el trámite no tiene costo. El 5501 es el que anula la constancia.',
    },
    {
      q: '¿Si alquilo por Airbnb tengo que pagar IRPF?',
      a: `Sí. La DGI trata igual el alquiler anual y el de temporada, y las plataformas digitales informan cada operación pero no son agentes de retención, así que no te retienen. El anticipo del ${P105} lo pagás vos con el boleto 2908, código 111, al mes siguiente de cada alquiler.`,
    },
    {
      q: '¿Tengo que hacer la declaración jurada si me retienen el IRPF del alquiler?',
      a: `No, si optás por dejar las retenciones como definitivas: la DGI te libera de la declaración anual por esas rentas, y lo mismo vale para los anticipos que pagaste vos. Te conviene declarar y liquidar por lo real sólo si tus gastos deducibles pasan del ${P125} del alquiler, porque ahí el ${P12} sobre la renta neta da menos que el ${P105}.`,
    },
    {
      q: '¿Hay devolución de IRPF por alquileres?',
      a: `Para el dueño, sí, si declarás por lo real: cuando lo que te retuvieron o anticipaste supera el impuesto, el excedente se imputa a otras obligaciones tributarias o se pide en devolución (Resolución DGI 662/007, numeral 2), por ejemplo cuando tus gastos deducibles pasan del ${P125} del alquiler. Si dejás el ${P105} como definitivo, no presentás declaración por esas rentas. Del lado del inquilino está el crédito de hasta el 8 % del alquiler de su vivienda permanente, que descuenta de su IRPF en la declaración jurada identificando al arrendador.`,
    },
  ],
  related: [
    { label: 'Impuestos sobre inversiones', to: '/impuestos-inversiones-uruguay' },
    { label: 'Crédito fiscal por alquiler', to: '/credito-fiscal-por-alquiler-uruguay' },
    { label: 'Declaración de IRPF', to: '/declaracion-de-irpf-uruguay' },
    { label: 'Alquiler temporario y Airbnb', to: '/guias/alquiler-temporario-uruguay' },
    { label: 'Alquiler de temporada', to: '/alquiler-de-temporada-uruguay' },
    {
      label: 'Calculadora de impuestos sobre inversiones',
      to: '/herramientas/calculadora-impuestos-inversiones',
    },
  ],
  sources: [
    {
      label: `«Ingreso por alquileres anuales y de temporada» (5 de octubre de 2026): anticipo o retención del ${P105} por mes, plataformas que no retienen, boleto 2908 con el código 111 (IRPF) y el 200 (IRNR), y el ejemplo de ${pesos(ALQUILER_DGI)} de agosto de 2026 que da ${pesos(ANTICIPO_DGI)} con vencimiento el 25 de setiembre`,
      url: 'https://www.gub.uy/direccion-general-impositiva/comunicacion/publicaciones/ingreso-alquileres-anuales-temporada',
      publisher: 'DGI',
    },
    {
      label:
        '«Vencimientos para contribuyentes del IRPF e IVA servicios personales»: días de 2026 para los pagos a cuenta de arrendamientos de inmuebles',
      url: 'https://www.gub.uy/direccion-general-impositiva/comunicacion/publicaciones/vencimientos-para-contribuyentes-del-irpf-iva-servicios-personales',
      publisher: 'DGI',
    },
    {
      label: `«Exoneración de arrendamientos»: las tres condiciones (${SMALL_LANDLORD_MAX_BPC} BPC, ${SMALL_LANDLORD_OTHER_CAPITAL_MAX_BPC} BPC y secreto bancario), sólo para residentes, matrimonio con y sin capitulaciones, herederos y formularios 5500, 5600 y 5501`,
      url: 'https://www.gub.uy/direccion-general-impositiva/comunicacion/publicaciones/exoneracion-arrendamientos',
      publisher: 'DGI',
    },
    {
      label: `Valores anuales para acceder a la exoneración, un renglón por año desde 2007: en 2026, alquileres menores a ${pesos(TOPE_ALQUILERES)} y otros rendimientos de capital menores a ${pesos(TOPE_OTRAS_RENTAS)}; en 2025, ${pesos(TOPES_DGI_ANTERIORES[0].alquileres)} y ${pesos(TOPES_DGI_ANTERIORES[0].otras)}; en 2024, ${pesos(TOPES_DGI_ANTERIORES[1].alquileres)} y ${pesos(TOPES_DGI_ANTERIORES[1].otras)}`,
      url: 'https://www.gub.uy/direccion-general-impositiva/politicas-y-gestion/irpf-exoneracion-arrendamientos-inmuebles-2023',
      publisher: 'DGI',
    },
    {
      label:
        'Trámite de exoneración de IRPF por arrendamientos de persona física: subtrámite en Servicios en línea, documentos, poder de no más de seis meses y 5600 en dos vías si es presencial',
      url: 'https://www.gub.uy/direccion-general-impositiva/comunicacion/publicaciones/tramite-exoneracion-irpf-arrendamientos-inmuebles-persona-fisica',
      publisher: 'DGI',
    },
    {
      label: 'Trámite de exoneración de IRPF por arrendamientos pedido por la inmobiliaria',
      url: 'https://www.gub.uy/direccion-general-impositiva/comunicacion/publicaciones/tramite-exoneracion-irpf-arrendamientos-inmuebles-inmobiliaria',
      publisher: 'DGI',
    },
    {
      label:
        'Instructivo de los formularios 5500 y 5600: cuándo se presentan, el porcentaje de cada dueño, la vigencia de la constancia y la regla del 31 de octubre para contratos vencidos',
      url: 'https://www.gub.uy/direccion-general-impositiva/comunicacion/publicaciones/instructivo-del-formulario-5500-5600',
      publisher: 'DGI',
    },
    {
      label: 'Trámite de baja de la constancia de exoneración con el formulario 5501',
      url: 'https://www.gub.uy/direccion-general-impositiva/comunicacion/publicaciones/tramite-baja-constancia-exoneracion-irpf-arrendamientos',
      publisher: 'DGI',
    },
    {
      label:
        'Formulario 5500, Solicitud de constancia de exoneración de arrendamiento de inmuebles (descarga en PDF)',
      url: 'https://www.gub.uy/direccion-general-impositiva/tramites-y-servicios/formularios/formulario-5500-solicitud-constancia-exoneracion-arrendamiento',
      publisher: 'DGI',
    },
    {
      label:
        'Formulario 5600, Solicitud de levantamiento voluntario del secreto bancario (descarga en PDF)',
      url: 'https://www.gub.uy/direccion-general-impositiva/tramites-y-servicios/formularios/formulario-5600-solicitud-levantamiento-voluntario-del-secreto',
      publisher: 'DGI',
    },
    {
      label:
        'Formulario 5501, Solicitud de anulación de constancia de exoneración de arrendamiento de inmuebles (descarga en PDF)',
      url: 'https://www.gub.uy/direccion-general-impositiva/tramites-y-servicios/formularios/formulario-5501-solicitud-anulacion-constancia-exoneracion',
      publisher: 'DGI',
    },
    {
      label:
        '«Medios habilitados para el pago del IRPF»: Abitab o Red Pagos con el boleto 2908, o por internet en BANRED y bancos adheridos con la opción pagar en línea, sin clave de la DGI',
      url: 'https://www.gub.uy/direccion-general-impositiva/comunicacion/publicaciones/medios-habilitados-para-pago-del-irpf',
      publisher: 'DGI',
    },
    {
      label:
        'Exoneración de IRPF por arrendamientos de inmuebles: requisitos, sin costo, matrimonio y herederos',
      url: 'https://www.gub.uy/tramites/exoneracion-irpf-arrendamientos-inmuebles',
      publisher: 'gub.uy (DGI)',
    },
    {
      label:
        'Alquiler por Contaduría General de la Nación: la CGN es agente de retención y retiene el 10,50 % de cada alquiler; la exoneración se tramita en la DGI y se comunica al Servicio de Garantía de Alquileres',
      url: 'https://www.gub.uy/tramites/alquiler-contaduria-general-nacion',
      publisher: 'Contaduría General de la Nación',
    },
    {
      label:
        'Presentación de exoneración de IRPF: el arrendador con contrato en la Contaduría sube la constancia de la DGI o la de vivienda de interés social',
      url: 'https://www.gub.uy/tramites/presentacion-exoneracion-irpf',
      publisher: 'Contaduría General de la Nación',
    },
    {
      label: `Valores actuales: Base de Prestaciones y Contribuciones de ${pesos(BPC)} en setiembre y octubre de 2026`,
      url: 'https://www.bps.gub.uy/5478/valores-actuales.html',
      publisher: 'BPS',
    },
    {
      label:
        'Título 7, art. 38 lit. J: exoneradas las rentas por arrendamientos que no superen 40 BPC anuales si el titular autoriza el levantamiento del secreto bancario, salvo que tenga otros rendimientos de capital por más de 3 BPC',
      url: 'https://www.impo.com.uy/bases/todgi2023/101-2024/38_T7',
      publisher: 'IMPO',
    },
    {
      label:
        'Título 7, art. 37: alícuota del 12 % para las «restantes rentas» de la categoría I (la base es la renta neta del art. 35)',
      url: 'https://www.impo.com.uy/bases/todgi2023/101-2024/37_T7',
      publisher: 'IMPO',
    },
    {
      label:
        'Título 7, art. 16: deducciones del arrendamiento (administradora, honorarios e IVA, Contribución Inmobiliaria, Primaria, subarriendo) y su proporción en contratos de menos de doce meses',
      url: 'https://www.impo.com.uy/bases/todgi2023/101-2024/16_T7',
      publisher: 'IMPO',
    },
    {
      label:
        'Título 7, art. 17: para hacer valer un contrato de arrendamiento en juicio hay que estar al día con el IRPF, salvo el desalojo de los alquileres sin garantía del art. 421 de la Ley 19.889',
      url: 'https://www.impo.com.uy/bases/todgi2023/101-2024/17_T7',
      publisher: 'IMPO',
    },
    {
      label:
        'Título 7, art. 10: las rentas de sucesiones y condominios se atribuyen a herederos y condóminos, en partes iguales si no hay prueba',
      url: 'https://www.impo.com.uy/bases/todgi2023/101-2024/10_T7',
      publisher: 'IMPO',
    },
    {
      label:
        'Título 7, art. 51: el arrendatario de vivienda permanente imputa hasta el 8 % del alquiler si identifica al arrendador',
      url: 'https://www.impo.com.uy/bases/todgi2023/101-2024/51_T7',
      publisher: 'IMPO',
    },
    {
      label:
        'Decreto 148/007, art. 36: agentes de retención del IRPF por arrendamientos (Estado, CGN y entidades de garantía y cobranza, Grandes Contribuyentes y CEDE, administradoras que cobran)',
      url: 'https://www.impo.com.uy/bases/decretos/148-2007/36',
      publisher: 'IMPO',
    },
    {
      label:
        'Decreto 148/007, arts. 37 y 38: retención del 10,5 % sobre arrendamientos de inmuebles en la República (redacción del Decreto 95/026) y sin retención si el arrendador acredita la exoneración',
      url: 'https://www.impo.com.uy/bases/decretos/148-2007/37',
      publisher: 'IMPO',
    },
    {
      label:
        'Decreto 148/007, art. 45: carácter definitivo de las retenciones y de los anticipos mensuales por arrendamientos sin agente de retención',
      url: 'https://www.impo.com.uy/bases/decretos/148-2007/45',
      publisher: 'IMPO',
    },
    {
      label:
        'Decreto 148/007, art. 13: el alquiler impago se considera incobrable a los tres meses del vencimiento, y si se cobra después es renta del mes del cobro',
      url: 'https://www.impo.com.uy/bases/decretos/148-2007/13',
      publisher: 'IMPO',
    },
    {
      label:
        'Resolución DGI 662/007: numeral 2 (el excedente de retenciones y anticipos se imputa a otras obligaciones o se pide en devolución), 7 (moneda extranjera), 17 (la opción por definitivo vale para todos los rendimientos inmobiliarios) y 18 (anticipo del 10,5 % de los ingresos devengados)',
      url: 'https://www.impo.com.uy/bases/resoluciones-dgi-interes-general/662-2007',
      publisher: 'IMPO',
    },
    {
      label:
        'Decreto 150/007, art. 74: la moneda extranjera se valúa a la cotización interbancaria tipo comprador billete al cierre del día anterior al de la operación, o del último día hábil anterior',
      url: 'https://www.impo.com.uy/bases/decretos/150-2007/74',
      publisher: 'IMPO',
    },
    {
      label:
        'Ley 19.889, art. 224: deroga los artículos de la Ley 19.210 que obligaban a cobrar por banco los alquileres de más de 40 BPC al año',
      url: 'https://www.impo.com.uy/bases/leyes/19889-2020/224',
      publisher: 'IMPO',
    },
    {
      label:
        'Decreto 148/007, art. 34 lit. J: las tres condiciones de la exoneración y la constancia que expide la DGI',
      url: 'https://www.impo.com.uy/bases/decretos/148-2007/34',
      publisher: 'IMPO',
    },
    {
      label: 'Título 8, art. 18: el IRNR grava las restantes rentas al 12 %',
      url: 'https://www.impo.com.uy/bases/todgi2023/101-2024/18_T8',
      publisher: 'IMPO',
    },
    {
      label:
        'Decreto 149/007, arts. 24, 32 y 33: anticipos definitivos, agentes de retención (incluidos los contribuyentes de IRAE) y retención del 10,5 % del IRNR por arrendamientos',
      url: 'https://www.impo.com.uy/bases/decretos/149-2007/33',
      publisher: 'IMPO',
    },
    {
      label:
        'Decreto 309/024, art. 1: suspensión de la retención de las administradoras en arrendamientos turísticos de hasta 31 días, sólo del 1 de diciembre de 2024 al 30 de abril de 2025',
      url: 'https://www.impo.com.uy/bases/decretos/309-2024/1',
      publisher: 'IMPO',
    },
  ],
}

/** Las guías de la tanda del 2026-10-21, en el orden en que se agregan al catálogo. */
export const primavera2026Guides: readonly Guide[] = [
  comoSaberSiTengoDeudasGuide,
  comprarEnSheinGuide,
  irpfDeAlquileresGuide,
]
