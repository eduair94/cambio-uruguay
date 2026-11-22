// 2026-11-22: usuario-personal-bps-uruguay. Media docena de páginas del sitio mandan al lector a
// hacer algo «con tu Usuario personal BPS» —la historia laboral, los recibos, la devolución de
// FONASA— y ninguna explicaba cómo se saca; el autocompletado uruguayo lo pide así («cómo
// realizar usuario bps», «servicios en línea bps», «servicios en línea dgi»). Verificado el
// 2026-11-22 contra el BPS (fichas 11444 «Solicitar Usuario personal BPS» y 18292 la activación,
// 9170 el acceso, 20814 el cambio de correo, 23496 la baja, 12138 la asistencia, 10004 las apps,
// 11438 y 12728 para qué sirve, la pantalla de ingreso del portal y el formulario «Restablecer mi
// contraseña»), la ficha de BPS Personas en Google Play, ID Uruguay (la tabla de métodos),
// AGESIC (crear y elevar el Usuario gub.uy, la videollamada), la DGI en gub.uy (identidades
// digitales y Usuario DGI) y el Consulado General en Asunción. Los dos datos que ninguna otra
// página del sitio publica: que el usuario NO se saca por internet, y que el portal web del BPS
// tiene una segunda puerta con ID Uruguay cuyo nivel intermedio sí se consigue por videollamada.
// Las cifras, los pasos y las citas viven en `utils/usuarioBps.ts` y esta guía las compone.
import type { Guide } from './guides'
import {
  DGI_IDENTITIES,
  DGI_USER_DGI,
  IDUY_METHODS,
  IDUY_RAISE_LEVEL,
  IDUY_VIDEOCALL_HOURS,
  UBPS_ACTIVATION_LINK_DAYS,
  UBPS_ADULT_REQUIREMENTS,
  UBPS_AGENTS_ONLY_IN_2024_NOTE,
  UBPS_APP_FEATURES,
  UBPS_APP_LOGIN,
  UBPS_EXTERNAL_AGENTS,
  UBPS_FAQ,
  UBPS_GAPS,
  UBPS_OFFICE_HOURS,
  UBPS_PASSWORD_MIN_CHARS,
  UBPS_PASSWORD_WARNING,
  UBPS_PHONES,
  UBPS_RESET_FIELDS,
  UBPS_RESET_LINK_HOURS,
  UBPS_ROUTES,
  UBPS_SERVICES,
  UBPS_SMS_CODE_DAYS,
  UBPS_SMS_CODE_MAX_REQUESTS,
  UBPS_SOURCES,
  UBPS_SUPPORT_EMAIL,
  UBPS_VERIFIED_AT,
} from './usuarioBps'

const MESES = [
  'enero',
  'febrero',
  'marzo',
  'abril',
  'mayo',
  'junio',
  'julio',
  'agosto',
  'setiembre',
  'octubre',
  'noviembre',
  'diciembre',
]

const fecha = (iso: string) => {
  const [year, month, day] = iso.split('-').map(Number) as [number, number, number]
  return `${day === 1 ? '1.º' : day} de ${MESES[month - 1]} de ${year}`
}

/** «a, b y c», para listas que la prosa lee de corrido. */
const enumerar = (items: readonly string[], conjuncion = 'y') =>
  items.length <= 1
    ? (items[0] ?? '')
    : `${items.slice(0, -1).join(', ')} ${conjuncion} ${items.at(-1)}`

/** Primera letra en minúscula, para meter un ítem de lista dentro de una oración. */
const enMinuscula = (s: string) => `${s.charAt(0).toLowerCase()}${s.slice(1)}`

const locales = UBPS_EXTERNAL_AGENTS.join(', ')
const [videollamada, firmaDigital, presencial] = IDUY_RAISE_LEVEL as [string, string, string]

export const usuarioBpsGuide: Guide = {
  slug: 'usuario-personal-bps-uruguay',
  title: 'Usuario BPS: en Abitab, Red Pagos o ANDA',
  description:
    'En persona: cédula, correo y celular en Abitab, Red Pagos, ANDA o el BPS, y lo activás por mail y SMS. Al portal web también se entra con ID Uruguay.',
  tag: 'BPS',
  updatedAt: '2026-11-22',
  sections: [
    {
      heading: 'Qué es y para qué lo vas a necesitar',
      body: `El BPS lo define como «un usuario único e intransferible para cada persona física que permite acceder a los servicios en línea que requieren registro». En la web esos servicios llevan un candado, y los que son para trabajadores, jubilados y pensionistas quedan habilitados solos en el momento en que activás el usuario. Con él podés, entre otras cosas: ${UBPS_SERVICES.map(enMinuscula).join('; ')}. Por eso aparece en tantas páginas de este sitio como el primer paso de otra cosa.`,
      links: [
        { label: 'Cómo ver tu historia laboral', to: '/guias/historia-laboral-bps-uruguay' },
        { label: 'Devolución de FONASA', to: '/devolucion-fonasa-uruguay' },
      ],
    },
    {
      heading: 'Dónde se saca: en persona, con cédula, correo y celular',
      body: `El BPS no publica una forma de sacarlo por internet: la ficha del trámite dice que la modalidad es presencial, y el botón «Registrarme» del portal lleva a esa misma ficha. Si sos mayor de edad, vas a ${locales} o a una sucursal del BPS con tres cosas: ${enumerar(UBPS_ADULT_REQUIREMENTS.map(enMinuscula))}. El correo pesa más de lo que parece, porque es adonde llega el enlace para activarlo, adonde llega después el enlace para restablecer la contraseña y adonde el BPS manda los recibos de cobro. En las oficinas del BPS de Montevideo, el buscador de lugares del propio trámite indica que no hace falta reservar cita, ${UBPS_OFFICE_HOURS}. Una aclaración sobre los locales: una nota del BPS de enero de 2024 nombraba además ${enumerar(UBPS_AGENTS_ONLY_IN_2024_NOTE)}, pero la ficha vigente, actualizada el 17 de marzo de 2026, ya no los nombra; si pensás ir a uno de esos, preguntá antes. Los demás casos tienen su propio lugar y sus propios papeles, y la tabla los ordena tal como los despliega la ficha.`,
      table: {
        headers: ['Tu caso', 'Dónde', 'Qué llevás'],
        rows: UBPS_ROUTES.map(route => [route.quien, route.donde, route.que]),
      },
    },
    {
      heading: 'Después del local: lo activás vos, por correo y por SMS',
      body: `En el local se inicia la solicitud; la activación la terminás vos. Primero te llega al correo que declaraste un enlace a la web del BPS, que vale ${UBPS_ACTIVATION_LINK_DAYS} días: si no lo ves, buscalo en correo no deseado o spam, y si se vence hay que iniciar la solicitud de nuevo. Al entrar, el botón «Solicitar» te manda un código por SMS al celular que declaraste; el código vale ${UBPS_SMS_CODE_DAYS} días y lo podés pedir hasta ${UBPS_SMS_CODE_MAX_REQUESTS} veces. Lo ingresás, tocás «Validar», aceptás los términos y condiciones, y te llega un segundo correo con el enlace para crear la contraseña. Si declaraste un celular extranjero, los pasos del SMS no existen: pasás directo del enlace a los términos y condiciones.`,
    },
    {
      heading: 'La otra puerta: entrar al portal con ID Uruguay',
      body: `La pantalla de ingreso de los servicios en línea del BPS tiene dos caminos: «Ingresar con usuario personal BPS» y, debajo, «Ingresar con Cédula Electrónica o Usuario gub.uy». El segundo te manda a ID Uruguay, el sistema de identificación digital del Estado, donde elegís con qué identificarte; la cédula aparece ahí como «documento nacional de identidad», que es como ID Uruguay la llama ahora. No sirve cualquier cuenta: AGESIC aclara que para la mayoría de los trámites en línea del Estado, «como por ejemplo los de BPS y DGI», el Usuario gub.uy tiene que estar en nivel intermedio, y el que creás solo en la web arranca en básico. El intermedio también se consigue sin salir de tu casa. ${videollamada} El horario de atención para agendarla es ${IDUY_VIDEOCALL_HOURS}. Las otras dos formas son estas. ${firmaDigital} ${presencial} Dos límites, para que no te lleves una sorpresa: la app BPS Personas pide en su ficha de la tienda ${UBPS_APP_LOGIN}, o sea el Usuario personal, y el BPS no publica qué servicios de la web aceptan ID Uruguay y cuáles exigen su propio usuario.`,
      table: {
        headers: [
          'Método de ID Uruguay',
          'Nivel',
          'Qué necesitás',
          'Vigencia',
          '¿Sirve para el BPS?',
        ],
        rows: IDUY_METHODS.map(method => [
          method.metodo,
          method.nivel,
          method.necesitas,
          method.vigencia,
          method.alcanzaParaBps ? 'Sí' : 'No: hay que elevarlo a intermedio',
        ]),
      },
    },
    {
      heading: 'Olvidé la contraseña, o cambié de correo',
      body: `En la pantalla de ingreso está «Olvidé mi contraseña», que abre el servicio «Restablecer mi contraseña». Te pide ${enumerar(UBPS_RESET_FIELDS)}, y te manda un enlace al correo asociado al usuario. Ese enlace vale ${UBPS_RESET_LINK_HOURS} horas: si se vence, hay que pedir otro. La contraseña nueva tiene que tener al menos ${UBPS_PASSWORD_MIN_CHARS} caracteres, y el formulario rechaza una que ya hayas usado antes. Si el problema es que ese correo ya no lo tenés, el orden cambia. Con la contraseña a mano, el correo lo cambiás vos en el portal, en el campo «Correo electrónico Contrato». Sin contraseña, tenés que ir a una oficina del BPS con la cédula vigente y en buen estado; desde el exterior, al consulado habilitado más cercano, con el documento con el que estás registrado.`,
    },
    {
      heading: 'Si el usuario quedó bloqueado o lo usa otra persona',
      body: `Sobre el bloqueo, el BPS no publica nada: ni cuántos intentos fallidos lo traban ni un trámite propio para destrabarlo. Lo que sí publica son tres caminos: restablecer la contraseña, escribir a la casilla de soporte ${UBPS_SUPPORT_EMAIL} y llamar al ${UBPS_PHONES.celular} desde celular, al ${UBPS_PHONES.fijo} desde fijo o al ${UBPS_PHONES.exterior} desde el exterior, ${UBPS_PHONES.horario} h. Si lo que pasa es que otra persona está usando tu usuario, existe el trámite «Bajar Usuario personal». Es presencial: va el titular, o un apoderado general registrado en el BPS, con la cédula vigente y una nota que diga que querés darlo de baja y el motivo detallado —por ejemplo, uso indebido o gestiones que no autorizaste—; si hay una denuncia penal o judicial, se agrega una copia. Y una regla que el portal escribe arriba del formulario de ingreso: «${UBPS_PASSWORD_WARNING}».`,
    },
    {
      heading: 'La app BPS Personas',
      body: `Es la aplicación del BPS para el celular, en Android y en iPhone, y se usa con el mismo usuario: su ficha en Google Play dice que «es requisito contar con ${UBPS_APP_LOGIN}». El BPS la relanzó con un diseño nuevo el 19 de diciembre de 2024. Según su página de aplicaciones, con ella podés ${enumerar(UBPS_APP_FEATURES.map(enMinuscula))}.`,
      links: [{ label: 'Otras apps útiles en Uruguay', to: '/apps-utiles-uruguay' }],
    },
    {
      heading: 'No es la clave de la DGI',
      body: `Es la confusión más común, porque los dos organismos hablan de «servicios en línea». La DGI tiene su propio portal y el Usuario personal BPS no está en su lista: las personas entran con una de cuatro identidades digitales, que son ${enumerar(DGI_IDENTITIES)}. En sus guías, que siguen publicadas, la DGI escribe que esas identidades «van a sustituir progresivamente a la clave de DGI» y que un Usuario gub.uy obtenido sólo por autorregistro web no alcanza: hay que elevarlo, igual que para el BPS. O sea que un Usuario gub.uy en nivel intermedio te abre las dos puertas. El «Usuario DGI» de siempre queda para las empresas que no son unipersonales y para quien tiene número de identificación extranjera, y se entra con ${DGI_USER_DGI}; los contribuyentes del IASS pueden usar cualquiera de las dos formas.`,
      links: [
        { label: 'Certificado único de la DGI', to: '/certificado-unico-dgi-uruguay' },
        { label: 'Declaración de IRPF', to: '/declaracion-de-irpf-uruguay' },
      ],
    },
    {
      heading: 'Lo que esta guía no publica',
      body: `${UBPS_GAPS.join(' ')} Preferimos decirlo antes que inventar una cifra. Las fuentes se leyeron el ${fecha(UBPS_VERIFIED_AT)} y están todas enlazadas abajo.`,
    },
  ],
  steps: [
    {
      name: 'Juntá la cédula, un correo y un celular',
      text: 'La cédula vigente y en buen estado, un correo que uses y que no esté asociado a otro usuario, y un número de celular.',
    },
    {
      name: `Andá a ${locales} o al BPS`,
      text: 'Si sos mayor de edad, cualquiera de esos lugares sirve. Los menores, los apoderados y quien lo pide por otra persona tienen que ir a una sucursal del BPS.',
    },
    {
      name: 'Abrí el enlace del correo',
      text: `Llega al correo que declaraste y vale ${UBPS_ACTIVATION_LINK_DAYS} días; si no lo ves, buscalo en correo no deseado o spam.`,
    },
    {
      name: 'Pedí el código por SMS y validalo',
      text: `Con «Solicitar» te llega el código al celular: vale ${UBPS_SMS_CODE_DAYS} días y lo podés pedir hasta ${UBPS_SMS_CODE_MAX_REQUESTS} veces. Con un celular extranjero este paso no existe.`,
    },
    {
      name: 'Aceptá los términos y creá la contraseña',
      text: 'Después de aceptar los términos y condiciones te llega un segundo correo con el enlace para generar la contraseña.',
    },
    {
      name: 'Entrá a los servicios en línea',
      text: 'En la web del BPS, por «Ingresar con usuario personal BPS», o en la app BPS Personas, con el usuario y la contraseña.',
    },
  ],
  faqs: UBPS_FAQ.map(item => ({ q: item.question, a: item.answer })),
  related: [
    { label: 'Cómo ver tu historia laboral', to: '/guias/historia-laboral-bps-uruguay' },
    { label: 'Certificados del BPS', to: '/certificados-bps-uruguay' },
    { label: 'Fecha de cobro del BPS', to: '/fecha-de-cobro-bps-uruguay' },
    { label: 'Devolución de FONASA', to: '/devolucion-fonasa-uruguay' },
    { label: 'Apps útiles en Uruguay', to: '/apps-utiles-uruguay' },
    { label: 'Certificado único de la DGI', to: '/certificado-unico-dgi-uruguay' },
    { label: 'Declaración de IRPF', to: '/declaracion-de-irpf-uruguay' },
  ],
  sources: UBPS_SOURCES.map(source => ({ ...source })),
}
