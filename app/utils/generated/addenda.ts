// Ampliaciones de páginas que ya existen, escritas a partir de lo que Reddit preguntó y la página
// no contestaba.
//
// POR QUÉ ES UN ARCHIVO APARTE Y NO UNA EDICIÓN DE LA PÁGINA. Las páginas del sitio son `.vue`
// escritos a mano, y un job automático parcheando markup es la forma más rápida de romper el build
// a las 05:35 sin nadie despierto. Acá el bot escribe DATOS, y el layout los inyecta en la ruta que
// corresponda: ninguna página existente cambia una línea.
//
// De dónde sale cada entrada: el juez del bot de Reddit, además de decidir si una página contesta
// un hilo, reporta QUÉ parte de la pregunta NO contesta. Cuando varias personas tropiezan con el
// mismo faltante en la misma página, eso se investiga y termina acá.
//
// Mismas reglas que una página generada: cada cifra aparece literal en el texto de una fuente que
// descargamos y respondió 200. Ver classes/gaps/enrich.ts.

export interface AddendumSource {
  title: string
  url: string
}

export interface AddendumItem {
  /** La pregunta como la hizo la gente, no como la reformularía un manual. */
  question: string
  answer: string
  sources: AddendumSource[]
}

export interface PageAddendum {
  /** Ruta de la página que amplía, con la barra inicial. */
  route: string
  items: AddendumItem[]
  /** ISO. Se muestra, porque una ampliación fechada vale más que una sin fecha. */
  updatedAt: string
}

export const PAGE_ADDENDA: readonly PageAddendum[] = Object.freeze([
  {
    route: '/guias/importar-de-aliexpress-a-uruguay',
    updatedAt: '2026-09-24',
    items: [
      {
        question:
          '¿Me conviene el envío directo de AliExpress o usar un courier/casillero tipo Aerobox, y cuál conviene?',
        answer:
          'Con el envío directo no te tenés que registrar en nada: comprás y el vendedor te lo manda a tu casa, pero si elegís la opción gratis tarda entre 30 y 60 días, y aunque pagues por un envío más rápido igual quedás en 15 a 20 días. Con un courier como Aerobox te registrás gratis, te dan una dirección en Miami para usar como destino de tus compras, y después pedís el reenvío a Uruguay cuando te llegaron todos los paquetes; el propio courier lo vende como más rápido y seguro que el correo tradicional, aunque no da un número de días concreto para ese tramo. La diferencia práctica es que el courier suma un paso extra (recibir en Miami y reexpedir) a cambio de evitarte las demoras típicas del envío gratuito directo.',
        sources: [{ title: 'aerobox.com.uy', url: 'https://aerobox.com.uy/aliexpress-uruguay/' }],
      },
      {
        question:
          '¿Unos auriculares Bluetooth como los Moondrop Space Travel necesitan algún trámite de homologación en URSEC para poder importarlos?',
        answer:
          'No: las Resoluciones de URSEC N° 275/2021 y N° 297/2021 dejan exceptuados de la intervención de URSEC a los equipos que funcionan únicamente con Wifi4, Wifi5, Wifi6 y/o Bluetooth, y unos auriculares Bluetooth entran justo en esa excepción. El certificado de URSEC (que cuesta $204, más un adicional de hasta $215 en casos como transmisores-sensores, micrófonos, cámaras o teléfonos inalámbricos) solo hace falta si el equipo usa otra tecnología radioeléctrica que no esté en esa lista de excepciones.',
        sources: [
          {
            title: 'gub.uy',
            url: 'https://www.gub.uy/tramites/certificado-habilitar-ingreso-pais-equipos-radioelectricos-bajo-regimen-franquicia-persona-fisica',
          },
        ],
      },
    ],
  },
  {
    route: '/herramientas/costo-de-vida',
    updatedAt: '2026-09-24',
    items: [
      {
        question:
          "¿Cuánto se necesita para vivir 'cómodo' en Montevideo si tenés auto y querés una zona cara como Carrasco?",
        answer:
          "El alquiler ahí ya es otro mundo: un 2 dormitorios en Carrasco promedia $U68.052 por mes y uno de 3 dormitorios puede llegar a $U98.676, muy por encima de los $U22.000 de zonas como La Blanqueada. Sumale el auto —nafta súper a $88,67 el litro y seguro de unos US$200-300 al año— y salidas a comer más seguido, donde una cena en un restaurante de gama media cuesta entre US$25 y US$30 por persona. Solo con esos tres rubros (zona cara, auto y comer afuera) ya estás muy por encima del presupuesto 'cómodo' que calcula la herramienta para sueldos medios.",
        sources: [
          {
            title: 'cuantomecuesta.com',
            url: 'https://cuantomecuesta.com/uy/alquiler-montevideo/',
          },
          {
            title: 'gub.uy',
            url: 'https://www.gub.uy/ministerio-industria-energia-mineria/comunicacion/noticias/precio-combustibles-julio-2026-baja-principales-combustibles-reduccion-100',
          },
          {
            title: 'esim.holafly.com',
            url: 'https://esim.holafly.com/es/blog/finanzas/costo-vida-montevideo/',
          },
        ],
      },
    ],
  },
  {
    route: '/guias/enviar-recibir-dinero-exterior',
    updatedAt: '2026-10-12',
    items: [
      {
        question:
          '¿Cuánto me cobra el BROU si uso esa cuenta para cobrar mi sueldo en dólares desde el exterior todos los meses?',
        answer:
          'El BROU cobra una comisión del 0,4% sobre cada transferencia recibida del exterior, con un mínimo de USD 35 y un máximo de USD 100 por operación. Esa comisión es la que cobra el BROU, pero no incluye los gastos que puedan sumar los bancos emisores o intermediarios en el camino, así que el costo final a veces es más alto. Además, si alguna vez te llega menos de USD 100, el banco directamente te devuelve esa transferencia al remitente, no te la acredita.',
        sources: [
          {
            title: 'brou.com.uy',
            url: 'https://www.brou.com.uy/personas/servicios/giros-transferencias/recibir-exterior',
          },
          {
            title: 'brou.com.uy',
            url: 'https://www.brou.com.uy/clientes-empresa/empresas/comisiones-transferencias-recibidas-exterior',
          },
        ],
      },
    ],
  },
  {
    route: '/preguntas-frecuentes-aduana-uruguay',
    updatedAt: '2026-10-21',
    items: [
      {
        question:
          'Tengo que comprar solo un procesador para armar una PC, sin wifi ni bluetooth: ¿necesito algún permiso de URSEC o LATU además de la declaración y los impuestos?',
        answer:
          'No. El certificado de URSEC solo se exige para equipos que emiten radiofrecuencias usando el espectro de radiocomunicaciones (routers, cámaras, auriculares, etc.); un procesador de PC no emite nada por el aire, así que ni siquiera entra en esa categoría y no te pide ese trámite en VUCE. Te queda solamente la declaración y los tributos que ya se explican en la nota principal, sin paso adicional en URSEC.',
        sources: [
          {
            title: 'gub.uy',
            url: 'https://www.gub.uy/tramites/certificado-habilitar-ingreso-pais-equipos-radioelectricos-bajo-regimen-importacion-empresa',
          },
        ],
      },
      {
        question:
          'Si compro en Tiendamía, ¿el trámite de declaración ante Aduanas lo hace la plataforma, o yo igual tengo que registrar el envío como con cualquier otro courier?',
        answer:
          'Tiendamía está acreditada ante la Dirección Nacional de Aduanas desde el 22/04/2026 para operar la exoneración de IVA en los envíos postales que llegan desde Estados Unidos, así que es la plataforma la que gestionó esa habilitación directamente con Aduanas, no vos. Aun así, para que te aplique la exoneración la factura tiene que confirmar que el país de residencia fiscal de quien te vende es Estados Unidos, porque ese es el requisito de procedencia que pide la normativa.',
        sources: [
          {
            title: 'aduanas.gub.uy',
            url: 'https://www.aduanas.gub.uy/innovaportal/v/28435/1/innova.front/tiendamia-quedo-habilitada-para-hacer-uso-de-las-exoneraciones-impositivas-previstas-para-el-epi.html',
          },
        ],
      },
    ],
  },
  {
    route: '/declaracion-de-irpf-uruguay',
    updatedAt: '2026-10-27',
    items: [
      {
        question:
          'Tengo dos trabajos y mis ingresos superan el límite: ¿qué tengo que marcar exactamente en el Formulario 3100 y a quién se lo entrego?',
        answer:
          'Si la suma de tus ingresos supera las 7 BPC mensuales, en el Rubro 4 del formulario marcás SI en el casillero de "Aplicación del Mínimo no Imponible ante este Empleador", para indicarle a ese empleador que te retenga sobre la totalidad del ingreso sin aplicar el mínimo no imponible mensualizado. El formulario se presenta en 2 vías (una queda para el empleador y otra para vos) ante el empleador o empleadores correspondientes. Si tus ingresos no llegan a las 7 BPC, dejás ese casillero vacío.',
        sources: [
          {
            title: 'gub.uy',
            url: 'https://www.gub.uy/direccion-general-impositiva/comunicacion/publicaciones/instructivo-formulario-3100',
          },
          {
            title: 'memory.com.uy',
            url: 'https://memory.com.uy/blog/obligaciones-fiscales/guia-formulario-3100-irpf-dgi/',
          },
        ],
      },
      {
        question:
          'Si tengo más de un empleador y me corresponde declarar, ¿cuándo y con qué formulario presento la declaración jurada?',
        answer:
          'Si tuviste multi-ingreso simultáneo (como tener más de un empleador) y no presentaste el Formulario 3100, quedás obligado a hacer la declaración jurada de IRPF. Se presenta con el Formulario 1102 si es individual, o con el 1103 si optás por núcleo familiar, dentro del plazo que va del 29 de junio al 31 de agosto de 2026.',
        sources: [
          {
            title: 'elobservador.com.uy',
            url: 'https://www.elobservador.com.uy/nacional/irpf-2026-quienes-estan-obligados-presentar-declaracion-jurada-la-dgi-y-cual-es-la-fecha-limite-n6044492',
          },
          {
            title: 'elobservador.com.uy',
            url: 'https://www.elobservador.com.uy/nacional/declaracion-jurada-irpf-2026-cuando-hay-que-presentarla-quienes-deben-hacerlo-y-como-realizar-el-tramite-n6047056',
          },
        ],
      },
    ],
  },
  // <<< generated-addenda >>>
])

/** La ampliación de una ruta, si tiene. */
export function addendumFor(route: string): PageAddendum | undefined {
  const clean = route.split('?')[0]!.replace(/\/+$/, '') || '/'
  return PAGE_ADDENDA.find(a => a.route === clean)
}
