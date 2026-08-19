// Tarjetas de socio y programas de beneficios uruguayos que NO son de credito ni de debito.
//
// Cada ficha se investigo contra la web oficial del programa y despues paso por un verificador
// adversarial que intento refutarla; solo entraron las que sobrevivieron, con el texto ya
// corregido por esa auditoria. Los importes y porcentajes son los que publicaba la fuente el
// 2026-08-19: los programas los cambian sin aviso, por eso cada ficha lleva sus URLs.
//
// Regla de la casa: aca no se inventa una cifra. Lo que no se pudo verificar vive en `caveat`,
// nunca en `benefits`.

export type MembershipCategory =
  | 'medio'
  | 'shopping'
  | 'supermercado'
  | 'combustible'
  | 'entretenimiento'
  | 'joven'
  | 'otro'

export interface MembershipCard {
  id: string
  name: string
  issuer: string
  category: MembershipCategory
  /** true = no hay que pagar nada para tenerla. */
  isFree: boolean
  /** Texto exacto sobre el costo, con los importes de la fuente. */
  cost: string
  /** Soporte: app, plastico, ambos o sin confirmar. */
  digital: string
  howToGet: string[]
  requirements: string[]
  benefits: string[]
  whereValid: string
  /** La letra chica y lo que NO se pudo verificar. */
  caveat: string
  sources: string[]
  /** Que tan firme quedo la ficha despues de la auditoria. */
  confidence: 'alta' | 'media' | 'baja'
}

export const MEMBERSHIP_CARDS: MembershipCard[] = [
  {
    id: 'ancapuntos',
    name: 'ANCAPuntos',
    issuer:
      'DUCSA (Distribuidora Uruguaya de Combustibles S.A.), la distribuidora de ANCAP — domicilio Juan Benito Blanco 3340, Montevideo',
    category: 'combustible',
    isFree: true,
    cost: 'Gratis. La tarjeta de fidelidad "es de distribución gratuita y no implica ningún costo mensual" (FAQ oficial ANCAPuntos). No tiene cuota de ingreso ni de mantenimiento. Ojo: la tarjeta BROU ANCAP es otro producto — es de crédito o prepaga, sin costo el primer año y después "el costo será el dispuesto por el BROU".',
    digital: 'ambos',
    howToGet: [
      "Camino más rápido (app): bajás la app 'Estaciones ANCAP' (desarrollada por DUCSA) de Google Play o App Store, te registrás y 'automáticamente quedás adherido al programa de Fidelidad'. Ahí mismo tenés la versión digital de la tarjeta y podés empezar a canjear.",
      "Camino plástico (online): entrás a www.ancapuntos.com.uy, completás el formulario de alta / el menú 'Tarjetas' y elegís la estación ANCAP donde la retirás.",
      'Camino plástico (presencial): pedís la tarjeta directamente en cualquiera de las estaciones ANCAP adheridas al programa.',
      'Camino telefónico: llamás al 0800-6006 y la solicitás.',
      'Requisitos: ser mayor de 18 años y residir en Uruguay con domicilio registrado. Una sola tarjeta por persona (los T&C prohíben duplicados).',
      "Para acumular: pagás la carga y pasás la tarjeta o la app. Si el QR falla, la app deja subir la foto del ticket; también hay un botón 'Acumular ANCAPuntos' en el menú para acumular sin pagar con la app.",
    ],
    requirements: [
      'Ser mayor de 18 años.',
      'Residir en Uruguay y tener domicilio registrado.',
      'Una sola tarjeta por persona; los puntos no se transfieren entre socios.',
      'No estar recibiendo otra bonificación de la estación o de DUCSA — los T&C excluyen de la acumulación a quien ya tenga otro beneficio vigente.',
      'Las acreditaciones tienen topes por transacción y por mes, que varían según la categoría del cliente.',
    ],
    benefits: [
      'Acumulación por combustible: 1,22 ANCAPuntos por cada litro de gasolinas o gasoil especial, y 0,86 ANCAPuntos por cada litro de gasoil común (FAQ oficial).',
      'También acumulás comprando lubricantes seleccionados y productos del catálogo de la tienda online.',
      "Canjes directos desde la app: estacionamiento tarifado, telepeaje, datos / minutos / SMS de ANTEL, combos y Cajita Feliz de McDonald's, y entradas de cine.",
      'Tienda online con canje total (solo puntos) o canje mixto variable (puntos + plata), lanzado en 2024. Envío gratis en compras mayores a $1.500. En 2024 el 30% de los canjes ya pasaba por la tienda online.',
      'Catálogo de productos: artículos de auto, electrodomésticos, tecnología, hogar e higiene personal. Canje en estación con entrega inmediata o reserva en menos de 10 días.',
      'Red de descuentos en comercios: 10% en Burger King, 15% en Europcar, 2x1 en entradas al Museo CARS, descuentos en hoteles (Dazzler Colonia, Dazzler Montevideo, Esplendor Cervantes, Sheraton Colonia, Nueva Palmira), Hertz y cupones de PedidosYa. El sitio lista 34 beneficios en total.',
      'Categorías que escalan: Cliente Preferencial con un promedio de consumo mayor a $4.000 mensuales en tres meses, y Cliente VIP con promedio mensual superior a $8.000 en el año (este último con tarjeta diferenciada).',
      "Promos por temporada: 'Cargá y Viajá' está vigente del 11/05/2026 al 31/08/2026 — con cargas mayores a $500 participás por 12 premios de un viaje con crédito de hasta USD 10.000. Pagar con la tarjeta ANCAPuntos da chance doble y hacerlo por la app da chance triple.",
    ],
    whereValid:
      'Más de 230 estaciones ANCAP adheridas en todo el país, la tienda online ancapuntos.com.uy, y la red de comercios de beneficios (gastronomía, hoteles, rent-a-car, cine, ANTEL, telepeaje y estacionamiento tarifado).',
    caveat:
      'Tres cosas para tener claras antes de anotarse. (1) La tarjeta de fidelidad común NO deja canjear puntos por combustible: eso solo lo habilita la tarjeta BROU ANCAP, que ya es crédito o prepaga y por lo tanto es otro producto (acumula 10 puntos cada $50 gastados dentro de estaciones ANCAP y 10 cada $120 fuera). (2) El vencimiento de los puntos tiene DOS reglas distintas y conviene no confundirlas: en la tarjeta de fidelidad "los puntos vencen cuando la tarjeta no registra movimientos durante un período de 2 años", mientras que en el cobranding BROU ANCAP la cláusula 4.2 los limita a "un año desde el mes de generación del primer punto". (3) DUCSA no publica cuánto vale un ANCAPunto en pesos:',
    sources: [
      'https://www.ancapuntos.com.uy/',
      'https://www.ancapuntos.com.uy/preguntas-frecuentes-ancapuntos',
      'https://www.ancapuntos.com.uy/terminos-y-condiciones',
      'https://www.ancapuntos.com.uy/preguntas-frecuentes-brou-ancap',
      'https://www.ancapuntos.com.uy/bases-y-condiciones-cobranding-brou-ancap',
      'https://www.ancapuntos.com.uy/promo-carga-y-viaja',
    ],
    confidence: 'alta',
  },
  {
    id: 'beneficios-antel-entretenimiento-2x1-en-cine',
    name: 'Beneficios Antel — Entretenimiento (2x1 en cines, Sodre y Gravity)',
    issuer:
      'ANTEL (Administración Nacional de Telecomunicaciones), empresa estatal uruguaya de telecomunicaciones. Es un beneficio incluido en el servicio móvil, no un producto financiero: no hay tarjeta de crédi',
    category: 'entretenimiento',
    isFree: true,
    cost: 'Gratis. No hay cuota de socio, alta ni membresía: viene incluido por ser cliente móvil de Antel, y ninguna de las fichas oficiales menciona un costo de adhesión. No es un producto financiero: no interviene tarjeta de crédito, débito ni prepaga (no confundir con el «Banco República 2x1» de Visa/Mastercard que Grupocine ofrece en paralelo en la misma cartelera). Sin confirmar: Antel no publica en ninguna parte si marcar el USSD (*789*1#, *789*6#, *789#) tiene costo. Fuente: https://www.antel.com.uy/personas/promociones/beneficios/descuentos/entretenimiento',
    digital: 'app',
    howToGet: [
      'No hay que inscribirse ni sacar ninguna tarjeta: alcanza con tener un servicio móvil Antel activo. La ficha de Cine Impacto lo dice textual: «Válido solamente para clientes móviles de Antel».',
      'Pedís el código en el momento, cada vez que lo vas a usar. Dos caminos equivalentes: marcar el código USSD desde el celular, o entrar a la app MiAntel (también sirve la versión web).',
      'Para CINES (Grupocine, Cinemateca, LIFE, MOVIE Vivilo, Cines del Este, Cine Impacto Fray Bentos): marcá *789*1# desde tu celular. Texto oficial: «Para obtener el beneficio ingresá en la app MiAntel o llamá al *789*1#».',
      'Para GRAVITY (parques de trampolines): marcá *789*6#. Texto oficial: «Ingresá a la app MiAntel (versión app o web) o marcando desde tu celular *789*6# y obtené tu código promocional».',
      'Para el SODRE (ballet nacional y cuerpos estables): marcá *789#. Texto oficial: «Para obtener el beneficio digitá *789# o descarga la App Miantel».',
      'Te llega un SMS con un código de 6 dígitos. Ese código ES la credencial: no hay plástico ni carné.',
      'Canjeás el código donde corresponda, y acá cambia según la sala: Grupocine y LIFE aceptan web Y boletería; MOVIE Vivilo es SOLO compra WEB («El beneficio aplica solo para compras WEB»); Cinemateca, Cines del Este y Cine Impacto son solo boletería. En Gravity presentás el código en la boletería del…',
    ],
    requirements: [
      'Tener un servicio móvil Antel activo. No pide antigüedad, plan mínimo ni registro previo.',
      'Tener el celular a mano: el código llega por SMS a esa línea, así que no lo podés pedir para otro.',
      'El beneficio no es acumulable con otras promociones vigentes y está sujeto a disponibilidad.',
      'En cines no aplica a películas Avant premiére, funciones especiales, festivales ni salas donde se proyecte contenido alternativo.',
      'Grupocine agrega una exclusión que Antel NO lista: «No aplica para butacas VIP en Punta del Este». (Fuente: la propia web de Grupocine.)',
      'Gravity: 1 uso cada 30 días por servicio móvil; no incluye medias de alquiler; en CarOne Center el 2x1 vale únicamente para el sector de Trampolines, no para el acceso completo; y no vale en carnaval, Día de la Niñez, Día de Reyes,…',
    ],
    benefits: [
      'Grupocine — 2x1 en la entrada para películas 3D y 2D todos los días. Se canjea ingresando el código en la web de Grupocine o presentándolo en boletería. Salas: Punta Carretas Shopping, Torre de los Profesionales y Ejido (Montevideo), Las Piedras Shopping (Canelones), Punta del Este (Maldonado) y Siñeriz Rivera (Rivera). Referencia de…',
      'LIFE Cinemas — 2x1 en la entrada para películas 3D y 2D todos los días. Textual: «El beneficio aplica para compras WEB y en boleterías de todas las salas». Salas: Punta Carretas Shopping, Shopping Tres Cruces, LIFE 21 y Cultural Alfabeta (Montevideo), Punta Shopping (Maldonado) y Shopping Costa Urbana (Canelones).',
      'MOVIE Vivilo — 2x1 en 2D y 3D todos los días, con una restricción fuerte: «El beneficio aplica solo para compras WEB». El código de 6 dígitos se ingresa en la web de MOVIE. Salas: Punta Carretas Shopping, Portones Shopping, Montevideo Shopping y Nuevocentro Shopping (todas en Montevideo).',
      'Cinemateca — 2x1 en la entrada para películas 3D y 2D, todos los días. Se presenta el código de 6 dígitos en la boletería; la ficha no habilita canje web.',
      'Cines del Este — 2x1 en la entrada para películas 3D y 2D, todos los días, presentando el código de 6 dígitos en la boletería. Antel no publica dirección ni listado de salas para este comercio.',
      'Cine Impacto Fray Bentos (Río Negro) — 2x1 en la entrada para películas 3D y 2D, en 18 de Julio y Wilson Ferreira Aldunate. Solo boletería: «Aplica para compras en la boletería. Válido solamente para clientes móviles de Antel».',
      'Sodre — 2x1 en la entrada para el ballet nacional del Sodre y para los espectáculos de los cuerpos estables. Cupos limitados. Es la ficha más escueta del programa: se pide con *789# o por la app MiAntel, y Antel no publica en qué espectáculos concretos aplica ni cómo se canjea.',
      'Gravity — 2x1 en el pase de 1 hora en los 4 parques de trampolines: Shopping Plaza Italia (Montevideo), Punta Shopping (Maldonado), CarOne Center (Canelones) y Florida Shopping (Florida). Se presenta el código promocional en la boletería del parque. Utilizable una vez cada 30 días por servicio móvil, de lunes a domingo.',
    ],
    whereValid:
      'Uruguay. Cubre Montevideo (Grupocine ×3, LIFE ×4, MOVIE ×4, Cinemateca, Gravity Plaza Italia, Sodre), Canelones (Grupocine Las Piedras, LIFE Costa Urbana, Gravity CarOne), Maldonado (Grupocine Punta del Este, LIFE Punta Shopping, Gravity Punta Shopping, Cines del Este), Rivera (Grupocine Siñeriz), R',
    caveat:
      'Lo que SÍ quedó firme: la página oficial responde hoy (19-08-2026), y Grupocine confirma el beneficio del lado del comercio con el mismo código: «Antel 2x1 — Marcá al *789*1#, recibirás un código por SMS... Válido todos los días en todos los complejos comprando en boleterías y canje web». Es decir, no es una página vieja olvidada: hay convenio vivo. Lo que NO pude confirmar: 1) OJO CON LOS CÓDIGOS VIEJOS QUE CIRCULAN. El código vigente para cines es *789*1#, confirmado por Antel Y por Grupocine. Pero el propio Antel tuiteó *789*2# para Grupocine en febrero de 2025, y hay artículos de terceros (descuento.uy, del 02-08-2017) con una tabla completamente distinta (*789*2*#, *789*2*2#, *789*3#.',
    sources: [
      'https://www.antel.com.uy/personas/promociones/beneficios/descuentos/entretenimiento',
      'https://www.antel.com.uy/personas/promociones/beneficios/descuentos',
      'https://www.antel.com.uy/personas/promociones/beneficios',
      'https://grupocine.com.uy/precios-y-promociones',
    ],
    confidence: 'alta',
  },
  {
    id: 'montevideo-libre-ex-tarjeta-montevideo-libre',
    name: 'Montevideo Libre (ex «Tarjeta Montevideo Libre»)',
    issuer:
      'Departamento de Cultura de la Intendencia de Montevideo. Oficina de atención al estudiante en el Edificio Anexo de la IM, Soriano 1426 esq. Santiago de Chile, piso 2 (lunes a viernes de 13 a 18 h), te',
    category: 'joven',
    isFree: true,
    cost: 'Gratis. No hay cuota ni copago por entrada. Las preguntas frecuentes oficiales dicen textualmente «¡No, las entradas son gratuitas!» y «Montevideo Libre no realiza convenios que impliquen desembolso de dinero por parte de los estudiantes»; además aclaran que «Montevideo Libre no acepta descuentos ni promociones» y que si una sala te quiere cobrar hay que avisarle a la oficina con sala, espectáculo, día, hora y nombre de quien te atendió (https://montevideo.gub.uy/app/mvdlibre/publico/preguntasFrecuentes.xhtml).',
    digital: 'sin confirmar',
    howToGet: [
      '1) Chequeá que tu centro de estudio esté en Montevideo y sea de los habilitados. Según las preguntas frecuentes oficiales entran: 4º, 5º y 6º de liceo (incluidos Liceo Militar, Impulso, Jubilar, Ánima y Proces, en turnos matutino, vespertino y nocturno), bachilleratos y cursos terciarios de UTU,…',
      '2) Creá un usuario gub.uy de nivel básico (autorregistro / ID Uruguay) con tu número de cédula. Esto se hace online y es el único requisito previo: «Para acceder a los beneficios de Montevideo Libre necesitás un usuario GUB.UY». Si el usuario gub.uy te quedó bloqueado o te olvidaste la contraseña,…',
      '3) Entrá a https://montevideo.gub.uy/app/mvdlibre/publico/home.xhtml y tocá el botón «Acceder» del menú superior. Si el sistema te reconoce como estudiante activo (la IM cruza contra la base de ANEP), quedás dado de alta y se te abre la cartelera con los cupos disponibles en tiempo real. No hay…',
      '4) Si el sistema NO te reconoce (la cartelera te devuelve «Ups! Necesitas ser dado de alta para acceder a la cartelera de espectáculos»), tenés que escribir, llamar o ir a la oficina del Anexo con una constancia de estudiante autenticada (sellada y firmada por la bedelía de tu centro) y actual. El…',
      '5) Para usar el beneficio: elegí la función en la solapa «Espectáculos» del sitio y andá personalmente a la boletería de la sala con tu cédula de identidad a retirar la entrada. La reserva online está desactivada («Por el momento, la reserva de entradas a través de la página está desactivada»),…',
    ],
    requirements: [
      'Cursar en Montevideo alguno de los cursos habilitados: 4º, 5º y 6º de liceo público (incluidos Militar, Impulso, Jubilar, Ánima y Proces), bachilleratos y cursos terciarios de UTU, Formación en Educación (IPA, IINN, IFES, INET, ATPI) o…',
      'Sin límite de edad. EMAD y EMVA piden ser mayor de 15 años.',
      'Tener usuario gub.uy de nivel básico (autorregistro / ID Uruguay).',
      'Mantenerse como estudiante activo: «Si abandonás tus estudios, los beneficios caducarán. Estudiar es tu compromiso».',
      'Tope de años de uso: 4 años para bachillerato, Formación en Educación y escuelas de formación artística de la IM; 2 años para nivel terciario de UTU. Se cuentan desde el alta al programa, se usen o no los beneficios, y se acumulan entre…',
      'Vigencia dentro del año: los beneficios siguen habilitados durante el año académico que cursás y también en enero, febrero y marzo siguientes.',
    ],
    benefits: [
      'Entradas GRATIS, no descuentos: el programa entrega localidades sin costo para todos los espectáculos publicados en su cartelera. Hay tres tipos de beneficio (semanales, mensuales e ilimitados) y se pueden usar en simultáneo, incluso combinados el mismo día.',
      '1 salida por semana a elección entre teatro, danza, música, ópera y ballet en las salas adheridas. La semana se cuenta de lunes a domingo.',
      'Toda la cartelera de Cinemateca Uruguaya (Bartolomé Mitre 1236 esq. Reconquista).',
      'Toda la cartelera de Cine Universitario (Canelones 1280), además con el beneficio 1+1.',
      'Todos los conciertos de la Orquesta Filarmónica de Montevideo y de la Banda Sinfónica de Montevideo.',
      'Toda la temporada de Carnaval en el Velódromo (Av. Ramón V. Benzano 3471, Parque Batlle).',
      'Beneficio 1+1: en los espectáculos marcados con 1+1 pedís DOS entradas sin costo e invitás a quien quieras (que no sea beneficiario). El sitio lo diferencia a propósito del 2x1 comercial: «Montevideo Libre no realiza convenios que impliquen desembolso de dinero por parte de los estudiantes». Se pierde el 1+1 si devolvés la entrada para…',
      'Todos los espectáculos publicados en cartelera del Teatro Solís (Sala Principal, Zavala Muniz y Delmira Agustini), Sala Verdi, Sala Zitarrosa, salas de teatro independiente, Sala Lazaroff y Sala Experimental (Decroly 4971, Malvín).',
      'Estudiantes con hijos o hijas de hasta 12 años inclusive: en vacaciones de julio y de primavera acceden a todas las obras infantiles «sin restricción semanal y con el beneficio de 1+1». Se gestiona por mail a montevideolibre@imm.gub.uy.',
      'El buscador oficial de «Locales» muestra 61 filas, pero seis son «Cine comercial 1-6 (SIN CONVENIO VIGENTE)»: quedan 55 locales con convenio vigente. Entre ellos, Teatro Solís, Sala Zitarrosa, Sala Verdi, Teatro Florencio Sánchez, Teatro de Verano, Velódromo, Sala Lazaroff, Cinemateca Uruguaya, Cine Universitario, Teatro Circular, El…',
    ],
    whereValid:
      'Solo Montevideo, y solo en las salas y funciones publicadas en la cartelera de Montevideo Libre. El listado oficial de locales tiene 61 entradas: teatros municipales y estatales (Solís, Verdi, Zitarrosa, Florencio Sánchez, Teatro de Verano, Sala Lazaroff, Sala Experimental de Malvín, Auditorio Adela',
    caveat:
      'Formato: NO pude confirmar que hoy se emita ninguna tarjeta plástica ni que exista una app. El material oficial vigente no menciona plástico en ningún lado: el acceso es una habilitación en base de datos que se consulta iniciando sesión con usuario gub.uy en la web, y en la boletería lo que se presenta es la cédula de identidad, no una tarjeta. El plástico que se retiraba en el Teatro Solís pidiéndolo al 1950 5013 pertenece al lanzamiento de noviembre de 2013 (fuente: Municipio C, 07/11/2013) y ya no figura en ninguna página actual. Por eso marqué «sin confirmar» en vez de elegir app o plástico: la realidad es «cuenta web gub.uy + cédula», que el enum no contempla. La Intendencia además dejó',
    sources: [
      'https://montevideo.gub.uy/app/mvdlibre/publico/home.xhtml',
      'https://montevideo.gub.uy/app/mvdlibre/publico/preguntasFrecuentes.xhtml',
      'https://www.montevideo.gub.uy/app/mvdlibre/publico/consultaLocales.xhtml',
      'https://www.montevideo.gub.uy/app/mvdlibre/publico/consultaEspectaculos.xhtml',
      'https://montevideo.gub.uy/area-tematica/cultura-y-tiempo-libre/montevideo-libre',
      'https://comedianacional.montevideo.gub.uy/educacion/tarjeta-montevideo-libre',
    ],
    confidence: 'alta',
  },
  {
    id: 'la-barra-de-tremendo',
    name: 'La Barra de Tremendo',
    issuer:
      'Montevideo Shopping — SHOPPING CENTERS (Uruguay) S.A., RUT 211383670010, Luis Alberto de Herrera 1290, Montevideo',
    category: 'shopping',
    isFree: true,
    cost: 'Gratis, sin cuota de socio ni obligación de compra. La web oficial dice textual: "Pueden inscribirse de forma gratuita en nuestro Stand de Atención al cliente con su cédula y recibir su Tarjeta de Tremendo, con 10 tazos de bienvenida" (montevideoshopping.com.uy/tremendo). La nota de montevideo.com.uy del 04-07-2024 confirma: "Su participación no implica obligación de compras". No es tarjeta de crédito, débito ni prepaga: es un carné plástico de club infantil, sin función de pago y fuera de la órbita del BCU.',
    digital: 'plastico',
    howToGet: [
      'Ir presencialmente a Montevideo Shopping (Luis Alberto de Herrera 1290, Montevideo). No hay alta online.',
      'Acercarse al Stand de Atención al Cliente.',
      'Llevar la cédula de identidad del niño o niña. Tiene que tener entre 3 y 11 años.',
      'Inscribirse sin costo: te entregan la Tarjeta de Tremendo con 10 tazos de bienvenida.',
      'A partir de ahí te llegan las novedades de las próximas actividades.',
      "Para la actividad '¿Dónde está Tremendo?' (búsqueda de pistas que da tazos) hay que registrarse y retirar el mapa, también en Atención al Cliente.",
      "Los tazos se canjean por premios en Atención al Cliente, 'sujeto a disponibilidad del momento'.",
    ],
    requirements: [
      "Edad: de 3 a 11 años (así lo define la web oficial como 'grupo de afinidad para los niños de 3 a 11 años').",
      'Cédula de identidad del chico o chica al momento de asociarse.',
      'Trámite presencial en el Stand de Atención al Cliente de Montevideo Shopping.',
      'No exige compras ni consumo mínimo.',
    ],
    benefits: [
      '10 tazos de bienvenida al asociarse, sin costo.',
      '30 tazos por asistir a las actividades a las que el club invita.',
      '30 tazos por mostrar la libreta del colegio con buenas notas.',
      '20 tazos por acercar un elemento para donar en una campaña de Bien Público, válido solo durante el período de recepción de donaciones.',
      '10 tazos cada 10 tapitas que lleves, con un tope de 50 tapitas por mes (hasta 50 tazos mensuales por esa vía).',
      '10 tazos el día de tu cumpleaños.',
      'Acceso a la actividad "¿Dónde está Tremendo?", una búsqueda de pistas por el shopping que da tazos: hay que registrarse y retirar el mapa en Atención al Cliente.',
      'Al asociarte recibís los avisos de las próximas actividades gratuitas con los personajes Tremendo, Lupita y Gaviotín.',
      'Catálogo de premios leído el 19-08-2026 (27 premios). Gama baja: 60 tazos = kit de marcadores Faber-Castell; 70 = peluche de Tremendo o Lupita; 80 = Ramón pelo verde, cartas de ciencia, kit para colorear Acrilex o block recreo Pika.',
      'Gama media (19-08-2026): 100 tazos = kit de 24+4 lápices de color Faber-Castell, block para colorear Pika o pase de 1 hora en Cheers; 120 = juego de cartas Pika, libro de bacterias, libro de abejas del Uruguay, libro de juegos o libros de Karina Macadar; 125 = libro de Mónica Grobert; 130 = kit para aprender la hora o libros de lectura…',
    ],
    whereValid:
      'Solo en Montevideo Shopping (Luis Alberto de Herrera 1290, Montevideo). El alta y el canje de premios se hacen en el Stand de Atención al Cliente. Algunos premios se usan en el propio shopping (entradas de cine en MOVIE, que figura como local del centro) y otros en Cheers.',
    caveat:
      "Lo verificado sale del HTML crudo de la página oficial (mecánica de tazos, edades, alta gratuita) y del catálogo de premios renderizado el 19-08-2026. Lo que NO pude confirmar: 1) Los precios en tazos de los premios están DENTRO de imágenes (el catálogo es un embed de ShortStack sin texto), los leí de las imágenes y la propia web aclara 'Canje sujeto a disponibilidad del momento', así que pueden cambiar sin aviso. De hecho, la lista vieja de premios que estaba escrita en la página (entrada de cine a 60, peluches a 70, teatro portátil a 150) está COMENTADA en el HTML: quedó desactualizada y no coincide con el catálogo vigente. 2) La web no dice si los tazos vencen, si la tarjeta es nominativa",
    sources: [
      'https://montevideoshopping.com.uy/tremendo',
      'https://montevideoshopping.com.uy/premios-tremendo',
      'https://m.shortstack.page/rBtsK6?embed=4&script=0',
      'https://montevideoshopping.com.uy/benefits-club/kids',
      'https://montevideoshopping.com.uy/novedades',
      'https://montevideoshopping.com.uy/locales',
    ],
    confidence: 'media',
  },
  {
    id: 'programa-amigos-punta-carretas-shopping',
    name: 'Programa Amigos (Punta Carretas Shopping)',
    issuer:
      'ALIAN S.A. — titular, administradora y organizadora del programa. Las bases la habilitan a que Comisión Administradora Punta Carretas Shopping Center S.A. participe en la organización y administración',
    category: 'shopping',
    isFree: true,
    cost: 'Gratis, verificado en dos fuentes oficiales: las bases (sección 2) dicen textual "El registro es gratuito e intransferible" y la FAQ oficial (Q22) responde "La adhesión al programa es gratuita". La app figura como gratuita en la App Store, con ALIAN SA como desarrollador (la misma sociedad que las bases declaran titular del programa). No hay cuota de alta ni de mantenimiento. Nota: no se pudo abrir la ficha de Google Play (se arma por JavaScript), así que el "gratis" en Android queda sin verificar de forma directa.',
    digital: 'app',
    howToGet: [
      'Descargá la app "Punta Carretas" (gratis) desde App Store o Google Play. Es el único canal de alta: el registro se hace exclusivamente por la app.',
      'Registrate creando un perfil personal con nombre, apellido, documento de identidad y correo electrónico, aceptando las bases y la política de privacidad. Tenés que declarar que sos mayor de 18 años, bajo tu responsabilidad.',
      'Verificá tu mail: llega un código de verificación por correo (si no aparece, revisá Spam; se puede pedir reenvío desde la app). Después del alta te llega un e-mail de bienvenida.',
      'Para sumar puntos: entrá a la app, tocá "Escanear Facturas" en el menú y escaneá el QR de cada factura. Las facturas se escanean de a una y tenés plazo hasta el día siguiente de la compra.',
      'Excepciones de carga: las facturas de Fresh Market y las facturas en dólares se cargan a mano en el Stand de Atención al Cliente (para las de USD hay que ir con el QR ID de la app). Las facturas dañadas o mal impresas también se gestionan ahí o se piden reimpresas en el local.',
      'Si ya eras socio del programa viejo, tenés que registrarte de nuevo: la FAQ (Q20) aclara que tras la reformulación incluso los clientes del programa anterior deben registrarse para quedar activos.',
      'Para usar un beneficio: activalo en la app recién cuando el vendedor te confirme que puede escanearlo. Se genera un token que vale 90 segundos; si no se valida en ese lapso, el beneficio se cae por ese día y vuelve al día siguiente.',
      'Guardar una tarjeta bancaria es opcional: sirve solo para pagar el estacionamiento desde la app. Si no querés, pagás en los tótems o en la cabina mostrando tu QR ID.',
    ],
    requirements: [
      'Ser mayor de 18 años y declararlo al registrarte. El shopping se reserva el derecho de pedirte el documento de identidad al momento de canjear o acceder a un beneficio.',
      'Smartphone con la app oficial instalada y conexión a internet (Wi-Fi, 3G, 4G o 5G) para validar credenciales, ver puntos y enviar facturas.',
      'Datos personales verificados: nombre, apellido, documento de identidad y un correo electrónico con verificación por código.',
      'El alta es personal e intransferible, y todos los beneficios son personales e intransferibles salvo que se indique lo contrario.',
      'Cargar las facturas hasta el día siguiente de la compra. Cada factura se puede ingresar una sola vez.',
      'NO es obligatorio registrar tarjeta de crédito o débito: sirve solo para pagar el estacionamiento con comodidad desde la app. Los datos quedan tokenizados en Mercado Pago; el shopping declara que no almacena número, código de seguridad,…',
    ],
    benefits: [
      'Acumulación: 1 punto cada $200 de compra. Se suman todas las facturas del día, incluso de distintos locales, siempre que se presenten dentro de las 24 horas del día de emisión. Los saldos no arrastran ni generan fracción de punto (bases, sección 7).',
      'Tres niveles por puntaje, con recategorización cada 4 meses: cada período nuevo arranca con cero puntos en el nivel que te corresponda. Si subís de nivel en el medio del período, conservás los puntos excedentes (las bases dan el ejemplo de 450 puntos en Nivel 2: subís a Nivel 3 y te quedan 50).',
      'Estacionamiento, base para todos por igual: 60 minutos sin costo. Las bases lo dicen expresamente para clientes registrados en la app y para los que no lo están (sección 10).',
      'Una hora extra de estacionamiento sin costo (total 2 horas) cargando en el día facturas de gastronomía por $500 o más, o facturas de compras por $1.000 o más. Ojo con cómo se rotula: la FAQ (Q13) lo presenta como beneficio del Nivel 1, pero las bases (sección 10) dicen literal que el Nivel 1 no tiene beneficios especiales por nivel y…',
      'Estacionamiento Nivel 2: 1 hora adicional bonificada. Nivel 3: 2 horas adicionales bonificadas.',
      'Los beneficios de estacionamiento NO son acumulables entre sí y se usan una sola vez por día: las bases (sección 10) dicen "solo podrán utilizarse una única vez al día y no son acumulables" y la FAQ (Q13) repite "Beneficios no acumulables". Es decir, la hora por consumo y la hora del nivel no se suman.',
      'Estacionamiento sin costo y sin tope de tiempo, sin importar el nivel, si registrás compras por $15.000 o más en una misma visita, cargadas correctamente en la app.',
      'Pago del estacionamiento desde la app vía pasarela de Mercado Pago, o en tótems de autopago / cabina escaneando el QR ID. Tras cerrar la estadía las bases dan 20 minutos para retirarte (y cobran la diferencia si te pasás); la FAQ, para el pago con tarjeta desde la app, dice 15 minutos.',
      'Catálogo de descuentos en locales adheridos dentro de la app, filtrable por marca, categoría, porcentaje de descuento y día de la semana. Como regla los beneficios son de uso diario: una vez por día, y se reestablecen automáticamente a las 03:00 a.m.',
      'Beneficios especiales, de uso único y de cumpleaños. La web oficial promete beneficios "todos los días y la semana de tu cumpleaños"; las bases aclaran que estos se reactivan solo cuando se repite la promoción o la fecha especial, no todos los días.',
    ],
    whereValid:
      'Solo dentro de Punta Carretas Shopping Center (José Ellauri 350, Montevideo), en los locales con beneficio activo, más las marcas que tengan alianzas con el plan de fidelidad Amigos. Para acumular puntos quedan EXCLUIDOS siete comercios que no participan: Supermercado Disco, estación de servicio DIS',
    caveat:
      'Lo que NO pude verificar: el catálogo de descuentos concretos vive únicamente dentro de la app; ni la web ni los PDF oficiales publican qué local da qué porcentaje, ni en qué consiste exactamente el beneficio de cumpleaños. Así que no hay un solo porcentaje de descuento verificable desde afuera. LETRA CHICA Y CONTRADICCIONES DETECTADAS: (1) Las propias bases se contradicen con los niveles. La sección 5 los define como "Nivel 1: 0 a 150 puntos / Nivel 2: 0 a 400 puntos / Nivel 3: 0 a 600 puntos", rangos superpuestos que arrancan todos en 0 y que parecen un error de redacción; lo operativo surge de la sección 6, que dice que pasando los 150 puntos subís a Nivel 2 y pasando los 400 subís a Nive',
    sources: [
      'https://www.puntacarretas.com.uy/programas/6/programa-amigos/',
      'https://www.puntacarretas.com.uy/uploads/attachs/202510/20251017180124_1363558929.pdf',
      'https://www.puntacarretas.com.uy/uploads/attachs/202510/20251017175244_1559967434.pdf',
      'https://www.puntacarretas.com.uy/programas/9/app-punta-carretas-/',
      'https://www.puntacarretas.com.uy/novedades/274/app-punta-carretas-/',
      'https://www.puntacarretas.com.uy/novedades/298/viaja-a-nueva-york-con-la-app-punta-carretas/',
    ],
    confidence: 'alta',
  },
  {
    id: 'tarjeta-comprador-frecuente',
    name: 'Tarjeta Comprador Frecuente',
    issuer:
      'Montevideo Shopping — SHOPPING CENTERS (Uruguay) S.A., RUT 211383670010, Luis Alberto de Herrera 1290, Montevideo',
    category: 'shopping',
    isFree: true,
    cost: '"Sin costo publicado. Ninguna fuente oficial dice que la tarjeta base sea gratuita: la web no informa costo de emisión, cuota, anualidad ni renovación en ningún lado, y el único requisito económico documentado es haber gastado $4.500 en el shopping en los 30 días previos (esas boletas son tuyas, no se entregan como pago). La única variante que el sitio declara textualmente \\"gratuita\\" es WTC Montevideo Member. El reglamento completo no está publicado —el propio consentimiento remite a que \\"las condiciones del programa Comprador Frecuente están disponibles en Atención al Cliente\\"—, así que puede haber letra chica que solo se ve en el mostrador. No es una tarjeta bancaria: no otorga crédito',
    digital: 'plastico',
    howToGet: [
      'Juntá boletas de compras hechas en Montevideo Shopping por $4.500 en total, dentro de los 30 días anteriores al día que vayas a pedirla. Son acumulables: pueden ser de varios locales y de días distintos.',
      'Ojo con qué boletas NO cuentan para llegar a los $4.500: supermercados (Tienda Inglesa), Tiendas Montevideo, comprobantes del banco, locales de cambio de monedas, agencias de viaje y redes de pago quedan todos afuera.',
      'Andá al stand de Atención al Cliente de Montevideo Shopping (2do piso) con tu documento de identidad vigente y las boletas. Horario del shopping: domingos a jueves de 10:00 a 21:00, viernes y sábados de 10:00 a 22:00.',
      'Tenés que ser mayor de 18 años y firmar el consentimiento de datos personales (Ley 18.331): el programa te va a poder contactar por teléfono, mail, SMS o apps.',
      "Atajo si trabajás ahí: si sos funcionario de algún local o de la administración del shopping, la pedís en Atención al Cliente SIN presentar boletas (variante 'Mi Shopping').",
      'Otros atajos sin boletas por convenio: socios del Club de Golf (acreditando la membresía, en Atención al Cliente), socias de OMEU (escribiendo a secretaria@omeu.org.uy) y quienes trabajan en el complejo World Trade Center Montevideo (formulario online en montevideoshopping.com.uy/wtc-member).',
      'Consultas: (+598) 2622 1005 o msc@montevideoshopping.com.uy',
    ],
    requirements: [
      'Ser mayor de 18 años',
      "Documento de identidad vigente (el sitio dice 'documento de identidad', no exige cédula uruguaya de forma explícita)",
      'Boletas de compra en Montevideo Shopping por $4.500 en total, de los 30 días previos a la solicitud, acumulables entre locales y días',
      'Que esas boletas NO sean de supermercados (Tienda Inglesa), Tiendas Montevideo, comprobantes del banco, locales de cambio de monedas, agencias de viaje ni redes de pago',
      'Presentarse personalmente en Atención al Cliente (2do piso) — no hay trámite online para la tarjeta base',
      'Firmar el consentimiento de tratamiento de datos personales (Ley 18.331)',
    ],
    benefits: [
      'Tres ejes, textuales en el catálogo oficial: descuento diario de lunes a domingo, descuento durante la semana de cumpleaños (semana calendario, de lunes a domingo) y un beneficio especial de 20% los segundos jueves de cada mes.',
      "Los segundos jueves, ese 20% se acumula con los descuentos de las Tarjetas Gaviotas de Scotiabank: 'Los descuentos son acumulables con los otorgados por las Tarjetas Gaviotas de Scotiabank los segundos jueves'. Fuera de eso, la regla general es que los beneficios NO se acumulan con otras ofertas, descuentos ni mercadería en liquidación…",
      'En el shopping, los descuentos por local van de 10% a 20% según la tienda, con condiciones propias muy variables (días de la semana, medio de pago, exclusiones por producto).',
      "Cine: '2X1 válido de lunes a jueves para películas 2D. Películas seleccionadas.' En funciones 4D, los lunes el acompañante paga la mitad.",
      'SODRE: 2x1 en la entrada de cualquier localidad para obras producidas por los Cuerpos Estables (Orquesta Sinfónica, Coro Nacional, Conjunto Nacional de Música de Cámara, Orquesta Juvenil, Coro Nacional de Niños); 50% en las Galas y 20% en las funciones habituales del Ballet Nacional y de la Temporada de Ópera, en localidades de Galería…',
      'Ópticas: en uno de los locales adheridos, 15% en lentes de sol y lentes de contacto y 25% en lentes completos (armazón y cristales), no acumulable con otras promociones. Las demás ópticas del catálogo tienen porcentajes distintos y condiciones propias.',
      'Joyería: en una de las joyerías, 12% en alhajas de plata y de plata y oro, 10% en alhajas de oro y 5% en relojes, hasta en 3 pagos. En la semana de cumpleaños suben a 14%, 12% y 6% respectivamente, también hasta en 3 pagos. Es el único local del catálogo que publica sus porcentajes de cumpleaños.',
      'Hotelería fuera del shopping: 37% sobre la tarifa Rack vigente en Hotel del Lago, reservando en hoteldellago.com.uy con el código promocional 2026MVDSHOPPING (fines de semana mínimo 2 noches, períodos especiales 3 noches). Beneficios adicionales: 50% en alquiler de canchas de paddle (1 hora diaria), 10% en Spa & Wellness, 5% en…',
      'Otros dos hoteles adheridos dan 20% válido en alojamiento y restaurante, solo sobre tarifas de venta al público. Ojo: esas dos promociones NO son válidas para la Tarjeta Comprador Frecuente Turista.',
      'Educación: 40% en Carreras Universitarias, Postgrados y Maestrías y 50% en Carreras y Cursos Técnicos en una institución adherida; para las carreras de la Facultad de Ciencias de la Salud y la Facultad de Ciencias Agrarias baja a 25% y 30%. Aplica exclusivamente en nuevas inscripciones y no se acumula con otros beneficios.',
    ],
    whereValid:
      'Locales adheridos de Montevideo Shopping (Luis Alberto de Herrera 1290, Montevideo) — el sitio los lista por nivel (Nivel 1, Nivel 2, Exterior, Servicios subsuelo) y por rubro. Además hay una red "Fuera del Shopping" con comercios y servicios que no están en el mall: hoteles (Hotel del Lago, Hilton',
    caveat:
      'Lo que NO pude verificar: (1) El reglamento completo no está publicado — el propio consentimiento aclara que "las condiciones del programa Comprador Frecuente están disponibles en Atención al Cliente", así que hay letra chica que solo se ve en el mostrador. (2) El formato no está dicho en ninguna parte: el sitio nunca escribe "plástico" ni "digital", no hay app oficial de Montevideo Shopping ni tarjeta digital publicada; lo inferí de que se retira en persona en un mostrador y se presenta en boletería. (3) No se publica vigencia ni renovación de la TARJETA en sí — lo que tiene fecha son los beneficios: el catálogo dice "válidos hasta el 31 de marzo de 2027". (4) Que sea gratis surge de la aus',
    sources: [
      'https://montevideoshopping.com.uy/mi-shopping',
      'https://montevideoshopping.com.uy/files/beneficios.pdf',
      'https://montevideoshopping.com.uy/programas-de-afinidad',
      'https://montevideoshopping.com.uy/club-de-golf',
      'https://montevideoshopping.com.uy/omeu',
      'https://montevideoshopping.com.uy/wtc-member',
    ],
    confidence: 'media',
  },
  {
    id: 'tarjeta-de-beneficios-sonrisas',
    name: 'Tarjeta de Beneficios Sonrisas',
    issuer: 'Tres Cruces Shopping y Terminal (Montevideo)',
    category: 'shopping',
    isFree: true,
    cost: 'Gratis. La página oficial lo dice textual: «Gratis, sin costo y sin requisitos». No tiene costo de emisión, ni cuota mensual, ni anualidad. (Verificado literal en trescruces.com.uy/sonrisas/ y en la página de promoción.)',
    digital: 'app',
    howToGet: [
      'Entrá a https://www.trescruces.com.uy/sonrisas/ y bajá hasta el bloque «Solicitá tu tarjeta».',
      'Completá el formulario. La web aclara «Todos los campos son obligatorios» y los campos que efectivamente valida como requeridos son: tipo de documento (desplegable con dos opciones, «CI (Cédula de identidad)» o «Documento extranjero»), número de documento, nombres, apellidos, fecha de nacimiento y…',
      'Tildá la casilla «Leí y estoy de acuerdo con las condiciones», que enlaza al Formulario de Habeas Data digital (PDF) de Tres Cruces.',
      'Dale «Enviar». La web dice: «Completá el formulario con tus datos y te enviaremos tu tarjeta al mail».',
      'Abrí el mail, guardá la tarjeta en el celular y usala en el momento: «La solicitás en nuestra web, la descargás en tu celular y la usás en el momento».',
      'Mostrala en la caja del local adherido antes de pagar. Conviene llevar el documento de identidad, porque el alta se hace contra CI o documento extranjero.',
      'Si la perdés, en la misma página hay un bloque «Recuperá tu tarjeta»: ponés el mail con el que te registraste y te la reenvían.',
      'Si sos turista extranjero, existe la variante «Sonrisas Turistas» y esa se pide en persona: «Solicite la tarjeta gratis en el Servicio al Cliente» del shopping.',
    ],
    requirements: [
      'Ser mayor de edad no está exigido explícitamente en la web, pero sí pide fecha de nacimiento y documento.',
      'Documento de identidad: cédula uruguaya o documento extranjero.',
      'Una casilla de email válida (es por donde te mandan la tarjeta y es la llave para recuperarla).',
      'Aceptar el Formulario de Habeas Data (consentimiento de datos personales).',
      'No pide ser cliente de ningún banco, ni tener tarjeta de crédito, ni ingreso mínimo, ni compra mínima: la web dice «sin requisitos».',
    ],
    benefits: [
      'Descuentos directos en el momento de pagar en locales adheridos de Tres Cruces. La web promete «+125 beneficios directos»; el listado que la propia página publica tiene 98 entradas (95 nombres distintos, algunos locales figuran con más de un mostrador).',
      'El rango real de descuento que publica el listado oficial va de 10% a 50%.',
      "Beneficio extra en la semana de tu cumpleaños: 36 de los 98 locales listados suben el porcentaje esa semana (ej. Arredo 15% → 30%, Díster Joyas 15% → 25%, Market.com.uy 15% → 25%, McDonald's 10% → 20%).",
      'LIFE Cinemas: 50% en entradas y en packs de pop y refresco, de lunes a miércoles.',
      'Colonia Express: 20% en pasajes de bus ida y vuelta (tarifas Super Express o Super Flex), válido para el titular + 3 acompañantes, solo con salida desde Tres Cruces.',
      'Ópticas: Estela Jinchuk 25% en armazón y cristales, 15% en lentes de sol, 10% en lentes de contacto descartables; Óptica Florida 25% en lentes de receta completos y 10% en lentes de sol.',
      'Indumentaria y deporte: Adidas, Puma, Crocs, Skechers, Vans, Columbia 10%; New Balance, Hush Puppies, Cat, Umbro, XL Extra Large 15%.',
      "Gastronomía: McDonald's, McCafé, Burger King, Subway, Cinnabon, Piece of Cake, Porto Vanila 10% (McDonald's y McCafé solo en mostrador, no vale por McDelivery ni por la app).",
      'Tecnología y servicios: Samsung 15%, Garbil–Antel 15% en accesorios y 10% en equipos libres (tope de descuento $3.000), Kilómetro Cero 20%, Cerrajería Tres Cruces 15% en servicios (solo efectivo o transferencia), UY Remises 10% todos los días.',
      'Canjes a precios especiales, sorteos y acciones exclusivas para «la comunidad Sonrisas».',
    ],
    whereValid:
      "Solo dentro del complejo Tres Cruces Shopping y Terminal (Bvar. Artigas 1825, Montevideo), en los locales adheridos del listado oficial —incluye tanto locales del shopping como mostradores de la terminal (McDonald's Terminal, Burger King Terminal, Subway Terminal, Market.com.uy Terminal, Atención al",
    caveat:
      'Ojo con el nombre: «Sonrisas» identifica TRES cosas distintas y una de ellas sí se discontinuó. (1) La Tarjeta de Beneficios Sonrisas, que es esta: gratis, digital, emitida por el shopping, no es tarjeta de crédito ni de débito, y está plenamente activa. (2) El programa de puntos «Sonrisas» de Scotiabank, que SÍ se terminó: se acumularon Sonrisas hasta el 31/01/2026, desde el 01/02/2026 pasó a llamarse Scotia Puntos, y el saldo viejo se puede canjear hasta el 31/12/2026 en el Centro de Atención al Cliente del Tres Cruces Shopping. La página del shopping «Canjeá tus Puntos Sonrisas» hoy da 404. (3) La tarjeta de crédito VISA Sonrisas Scotiabank, que es un producto bancario y queda fuera de es',
    sources: [
      'https://www.trescruces.com.uy/sonrisas/',
      'https://www.trescruces.com.uy/shopping/promocion/beneficios-sonrisas/',
      'https://www.trescruces.com.uy/sonrisas-turistas/',
      'https://content-trescruces.s3.sa-east-1.amazonaws.com/2025/09/Formulario-Habeas-Data-Digital.pdf',
      'https://www.scotiabank.com.uy/Personas/Tarjetas/Programas-de-premios/sonrisas',
      'https://www.scotiabank.com.uy/Personas/ScotiaPuntos/home',
    ],
    confidence: 'alta',
  },
  {
    id: 'plus-comunidad-plus-ta-ta',
    name: 'Plus (Comunidad Plus) — Grupo Ta-Ta',
    issuer:
      'No existe un programa "PLUS" de Grupo Disco Uruguay. PLUS es de TA-TA S.A. (Ta-Ta, Multi Ahorro Hogar y BAS). Grupo Disco Uruguay (GDU) emite Tarjeta Más (Disco y Géant) e Hipercard (Devoto).',
    category: 'supermercado',
    isFree: true,
    cost: 'Gratis. Ta-Ta S.A. lo describe textualmente en la ficha oficial de su app: «Plus es el programa de beneficios gratuito de Ta-Ta, BAS y Multi Ahorro Hogar». Los Términos y Condiciones de Ta-Ta no establecen cuota de ingreso, cuota anual ni costo de mantenimiento, y el formulario de alta de plus.uy/registro no pide ningún dato de pago. No es una tarjeta de crédito ni de débito: plus.uy no ofrece financiación, cuotas ni producto bancario alguno.',
    digital: 'sin confirmar',
    howToGet: [
      'OJO, primero lo importante: no existe un programa PLUS de Disco/Devoto. Si lo que querés es PLUS, es el programa de TA-TA S.A. y te asociás en cualquier local de Ta-Ta, Multi Ahorro Hogar o BAS, o desde tata.com.uy (según sus T&C: persona física mayor de 18 años, con nombre, apellido, documento,…',
      'Si lo que querés es el programa de Disco/Devoto, se llama Tarjeta Más (en Disco y Géant) o Hipercard (en Devoto): son los dos programas de fidelidad de Grupo Disco, unificados entre sí.',
      "Pedila online: en el pie de página de disco.com.uy entrá a 'Solicitá la Tarjeta Más' (https://www.disco.com.uy/tarjeta-mas). En Devoto el enlace equivalente del pie es 'Solicitá la Tarjeta Hipercard'; en geant.com.uy también figura 'Solicitá la Tarjeta Más'. Los tres enlaces están vivos hoy (HTTP…",
      'Alternativa presencial: registrarte en el sector Atención al Cliente de cualquier local con tu documento de identidad, y empezás a sumar en el momento. ATENCIÓN: esto surge de los T&C de Géant que hoy están fuera de línea (food.geant.com.uy devuelve error 400), así que tomalo como SIN CONFIRMAR.',
      "Consultá tu saldo de puntos en https://www.disco.com.uy/consulta-de-puntos (el mismo enlace 'Consulta de Puntos' existe en Devoto y Géant).",
      'Canjeá los puntos por productos del catálogo de regalos en locales de Disco, Devoto o Géant (dato de los T&C indexados, hoy no verificable en línea).',
    ],
    requirements: [
      'Para PLUS (Ta-Ta): persona física mayor de 18 años y capaz; datos de alta: nombre, apellido, documento, género, fecha de nacimiento, email, dirección, departamento, localidad y celular (T&C oficiales de Ta-Ta).',
      'Para Tarjeta Más / Hipercard (Grupo Disco): documento de identidad para registrarte. SIN CONFIRMAR: los T&C indexados mencionaban edad mínima de 14 años para Hipercard, pero esa página ya no está en línea y no pude leerla.',
    ],
    benefits: [
      'Acumulás puntos por tus compras y los canjeás por productos del catálogo de regalos de Disco, Devoto, Géant y Fresh Market.',
      'Los puntos se suman indistintamente compres en Devoto, Disco o Géant: Grupo Disco unificó los planes de fidelidad el 1/10/2012 (Tarjeta Más suma puntos, Hipercard suma hipermillas).',
      'Consulta de saldo de puntos online, sin ir al local, desde el sitio de cada cadena.',
      'Los puntos se generan pagando en efectivo, con débito, cheque o gift card (no hace falta tarjeta de crédito). SIN CONFIRMAR: el dato viene de T&C hoy fuera de línea.',
      'NO puedo confirmar el ritmo de acumulación: circulan cifras contradictorias en sitios no oficiales (2 puntos cada $420, 1 punto cada $70, 1 punto cada $650 fuera de las cadenas). No publico ninguna porque no hay fuente oficial legible.',
      'NO pude verificar descuentos exclusivos de socio, ni el vencimiento de los puntos (un sitio no oficial dice 6 meses de inactividad; no lo confirmo).',
    ],
    whereValid:
      'Si buscás PLUS: vale en locales de Ta-Ta, Multi Ahorro Hogar y BAS (no en Disco/Devoto). El programa de Grupo Disco (Tarjeta Más / Hipercard) vale en Disco, Devoto, Devoto Express, Géant y Fresh Market: desde el 1/10/2012 los puntos se suman indistintamente en las tres cadenas, y los canjes se hacen',
    caveat:
      'La confianza ALTA es sobre el hallazgo principal, no sobre las cifras: verifiqué contra fuentes oficiales que el programa "PLUS" NO pertenece a Grupo Disco / Devoto. PLUS es el programa de fidelidad de TA-TA S.A. (cadenas Ta-Ta, Multi Ahorro Hogar y BAS), y así lo dicen sus propios términos y condiciones. En los tres sitios oficiales de Grupo Disco (disco.com.uy, devoto.com.uy, geant.com.uy) no aparece la palabra PLUS: el programa de socios se llama Tarjeta Más (Disco y Géant) e Hipercard (Devoto), y ambos siguen activos hoy (los enlaces "Solicitá la Tarjeta Más" / "Solicitá la Tarjeta Hipercard" y "Consulta de Puntos" están vivos en los pies de página, agosto 2026). Por eso puse status "dud',
    sources: [
      'https://www.tata.com.uy/lp/terminos-y-condiciones — T&C oficiales: PLUS fue creado por TA-TA S.A. para Ta-Ta, Multi Ahorro Hogar y BAS (1 punto cada $100, mayor de 18 años, canje mínimo 51 puntos, caducidad por 3 meses de inactividad). Confirma que PLUS NO es de Grupo Disco.',
      "https://www.disco.com.uy/ — pie de página oficial con los enlaces vivos 'Solicitá la Tarjeta Más' y 'Consulta de Puntos'. No aparece 'PLUS' por ningún lado.",
      "https://www.disco.com.uy/tarjeta-mas — página oficial viva (HTTP 200, título 'Solicitá la Tarjeta Más').",
      "https://www.disco.com.uy/consulta-de-puntos — página oficial viva (HTTP 200, título 'Consulta de Puntos').",
      "https://www.devoto.com.uy/terminos-y-condiciones — pie de página oficial de Devoto con 'Solicitá la Tarjeta Hipercard' y 'Consulta de Puntos'.",
      "https://www.geant.com.uy/terminos-y-condiciones — pie de página oficial de Géant con 'Solicitá la Tarjeta Más' y 'Consulta de Puntos'.",
    ],
    confidence: 'alta',
  },
  {
    id: 'abono-cultural-bps-tarjeta-socio-espectacula',
    name: 'Abono Cultural BPS (Tarjeta Socio Espectacular)',
    issuer:
      'Banco de Previsión Social (BPS) junto con Socio Espectacular (sistema creado por Teatro El Galpón y Teatro Circular); el préstamo se otorga "con el apoyo del BROU"',
    category: 'entretenimiento',
    isFree: false,
    cost: '"NO es gratis: es un abono anual subsidiado, financiado con un préstamo del BPS \\"con el apoyo del BROU\\". OJO, las dos fuentes oficiales NO coinciden y ninguna de las dos es un error de tipeo. Socio Espectacular (el operador): $1.580 contado, 6 cuotas de $274 o 12 cuotas de $142. BPS (bps.gub.uy/21073, \\"Última actualización: 11/12/2025\\"): $1.525 contado, 6 cuotas de $265 o 12 cuotas de $137. Cuál manda, con evidencia: en la captura del 16-abr-2026 la propia página del operador todavía decía $1.525/$265/$137, y en la de julio de 2025 también, o sea que el operador subió a $1.580/$274/$142 después de abril de 2026 y el BPS quedó con la cifra vieja (su página actualizó el tope de 8 BPC al va',
    digital: 'plastico',
    howToGet: [
      '1) Verificá que tu pasividad del BPS no supere las 8 BPC ($54.912 a enero 2026).',
      "2) Andá a la sección Préstamos del BPS, en cualquiera de sus dos edificios de Montevideo: Colonia 1921 (Edificio Nuevo) o Fernández Crespo 1621 (Edificio Sede). Ojo: el nombre 'BPS, Colonia y Fernández Crespo' no son tres lugares ni una esquina, son los DOS edificios centrales del BPS.",
      '3) Horario del trámite: lunes a viernes de 9:15 a 15:30 h (según Socio Espectacular; el horario general de sucursales del BPS es 9:15 a 16:00 h).',
      '4) Llevá el original y la fotocopia de tu cédula. Tiene que ir el titular en persona: el trámite es presencial, no hay vía en línea.',
      '5) Ahí pedís el préstamo (no te lo dan en efectivo: es al solo efecto de comprar el abono) y elegís cómo pagarlo: contado en las cajas del BPS en ese mismo momento, o en 6 o 12 cuotas que te descuentan del recibo de jubilación o pensión.',
      '6) Con el vale que te dan, andá a sacar una fotocopia y entregala en la oficina de Socio Espectacular, 18 de Julio 1618, entrepiso (edificio del Teatro El Galpón).',
      '7) Ahí te dan la Tarjeta Socio Espectacular, que vale 12 meses y después se renueva.',
      '8) Si sos funcionario del BPS: podés pagarlo directo en las oficinas de Socio Espectacular al contado o con tarjeta de crédito, presentando recibo de sueldo y cédula; o en oficinas del BPS al contado o con préstamo en 12 cuotas descontadas del sueldo. Incluye hasta 1 acompañante, a $3.395 cada uno.',
    ],
    requirements: [
      'Cobrar del BPS jubilación, pensión de sobrevivencia, pensión graciable, pensión especial reparatoria (Ley 18.033), pensión de vejez o invalidez, o asistencia a la vejez',
      'Que ese haber mensual NO supere las 8 BPC = $54.912 (BPC 2026 = $6.864)',
      'Presentarse el titular en persona con original y fotocopia de la cédula de identidad vigente y en buen estado (requisito textual del BPS)',
      'Vía alternativa: ser funcionario del BPS (ahí no rige el tope de 8 BPC; se acredita con recibo de sueldo y cédula)',
      'Se puede sumar un acompañante: la cuota se le descuenta al titular de su pasividad, o el titular paga por él el importe contado',
    ],
    benefits: [
      'TEATRO: entrada libre a las producciones de Teatro El Galpón, Teatro Circular, Comedia Nacional, Teatro El Tinglado y Teatro La Gaviota. Cada obra con entrada libre se puede ver una vez por temporada; si reestrena en una temporada siguiente, se puede volver a ver (FAQ del operador, textual).',
      'CINE — Cinemateca Uruguaya: 2 entradas mensuales a estrenos. Sábados y domingos no es gratis: se abonan $80 de complemento (eran $70 hasta mediados de 2025).',
      'CINE — Cinemateca Uruguaya: entrada libre también a Ciclos y Reposiciones, con el mismo complemento de $80 los sábados y domingos.',
      'CINE — Cine Universitario: entrada a $30 todos los días.',
      'CINE — Cine Sodre: entrada libre con cupo limitado; una vez cubierto el cupo, 50% de descuento.',
      'MÚSICA: entrada libre con cupo limitado a los espectáculos del SODRE y a la Orquesta Filarmónica; cubierto el cupo, 50% de descuento.',
      'CARNAVAL: entrada libre al carnaval en el escenario del Velódromo.',
      'DANZA: Ballet Nacional del SODRE con 20% de descuento y Gala de Ballet del SODRE con 50% de descuento, ambos con cupo limitado.',
      'OTROS: una entrada libre a la Criolla del Prado.',
      'Acceso a la Biblioteca Digital de Socio Espectacular.',
    ],
    whereValid:
      'Solo Montevideo, en la práctica. Todas las salas del convenio son montevideanas: Teatro El Galpón, Teatro Circular, Comedia Nacional, Teatro El Tinglado, Teatro La Gaviota, Cinemateca Uruguaya (Bartolomé Mitre 1236, edificio CAF), Cine Universitario, Cine y Auditorio del SODRE, Orquesta Filarmónica,',
    caveat:
      'Lo que NO pude confirmar y la letra chica: (1) EL PRECIO ESTÁ EN CONFLICTO ENTRE DOS FUENTES OFICIALES. Socio Espectacular publica $1.580/$274/$142 y el BPS publica $1.525/$265/$137. Comparando con el Wayback Machine quedó claro que el BPS arrastra la cifra vieja: su página dice "Última actualización: 11/12/2025" y el monto de $1.525 no cambió desde al menos julio de 2025, aunque el tope de 8 BPC sí se actualizó al valor 2026. Igual no pude confirmar con un comunicado ni una resolución del BPS que $1.580 sea el precio efectivamente cobrado hoy en la caja, así que quien vaya puede encontrarse con cualquiera de los dos. (2) Es un PRÉSTAMO, no una bonificación: la modalidad en cuotas sale más c',
    sources: [
      'https://socioespectacular.com.uy/convenios/abono-cultural-bps/',
      'https://www.bps.gub.uy/21073/abono-cultural.html',
      'https://www.bps.gub.uy/21074/abono-cultural---tarjeta-socio-espectacular.html',
      'https://socioespectacular.com.uy/preguntas-frecuentes/',
      'https://socioespectacular.com.uy/beneficios/',
      'https://socioespectacular.com.uy/convenios/',
    ],
    confidence: 'media',
  },
  {
    id: 'abono-sodre-2026-abono-30-abono-joven-abono-',
    name: 'Abono Sodre 2026 (Abono 30%, Abono Joven, Abono Obsequio y Abono Club El País)',
    issuer:
      'SODRE — Servicio Oficial de Difusión, Radiotelevisión y Espectáculos (Auditorio Nacional Adela Reta y Auditorio Nelly Goitiño, Montevideo)',
    category: 'entretenimiento',
    isFree: false,
    cost: "\"No hay cuota de socio ni costo de emisión: la tarjeta de abonado se entrega gratis al comprar el abono. Para acceder hay que comprar 5 o más espectáculos, así que el gasto real depende del elenco, la sala y el sector — no hay precio fijo publicado y el monto en pesos solo se ve después de iniciar sesión en Tickantel, porque 'Armá tu abono' exige cuenta. Al 19/08/2026 la única modalidad comprable es el 'Abono Web 30% 2026' (mínimo 5, máximo 100 espectáculos, a la venta hasta el 31/12/2026). Las dos modalidades que tenían precio cerrado — Abono Obsequio de 3 vales a $3.500 y de 6 vales a $6.800, según la página oficial archivada el 05/07/2026 — figuran hoy como 'Ya no está a la venta' en Tick",
    digital: 'plastico',
    howToGet: [
      'Elegí la modalidad. Al 19/08/2026 la única viva es el "Abono Web 30% 2026" en Tickantel (a la venta hasta el 31/12/2026). El Abono Joven 50%, el Obsequio x3 y el Obsequio x6 devuelven "Ya no está a la venta" — el período de venta 2026 de esas modalidades ya cerró.',
      'Entrá a https://tickantel.com.uy/inicio/abono/40000722/abono/Abono%20Web%2030%25%202026 y tocá "Armá tu abono". Verificado en el navegador el 19/08/2026: el botón te manda a iniciar sesión, así que necesitás cuenta Tickantel.',
      'Armá la selección: mínimo 5 espectáculos y máximo 100. Cada tanda de 5 admite hasta 2 obras del Ballet Nacional y 1 lírica, más Orquesta Sinfónica Nacional, Conjunto Nacional de Música de Cámara, Coro Nacional, Orquesta Juvenil Nacional y Coro Nacional de Niños y Juvenil. Se amplía sumando más…',
      'Pagá online con Visa, Oca, eBROU o transferencia desde BROU, Santander, BBVA, Banque Heritage, TuApp, Scotiabank, Itaú, Bandes o HSBC.',
      'Si preferís presencial: boletería del Auditorio Nacional Adela Reta con agenda previa (reservás día y hora llamando al 2900 7084 a partir de las 11 h) o boletería del Auditorio Nelly Goitiño. En febrero también hubo stand en Montevideo Shopping. Presencial se paga con efectivo, Mastercard, Visa,…',
      'Retirá la tarjeta de abonado: según la web oficial "será entregada al momento de la compra". Es la que tenés que presentar para los descuentos en comercios adheridos.',
      'Si vas por el Abono Club El País: es exclusivamente presencial y lo tiene que comprar el/la titular presentando la tarjeta Club El País y la cédula. La tarjeta Club El País no se compra suelta: viene sin costo con una suscripción paga a El País (plan Full Digital o Diario Papel).',
      'Si vas por el Abono Joven: solo se adquiere a título personal, la persona beneficiaria tiene que ser quien lo use y no puede tener más de 29 años.',
    ],
    requirements: [
      'Comprar 5 o más espectáculos del Sodre en una misma operación (mínimo 5, máximo 100 en la venta web).',
      'Abono Joven: tener hasta 29 años. Se compra únicamente a título personal y la web oficial aclara que "No está permitido que personas mayores de 29 años utilicen un Abono Joven".',
      'Abono Club El País: ser titular de la tarjeta Club El País (que exige suscripción paga a El País) y comprar presencialmente presentando tarjeta + cédula de identidad.',
      'Cuenta de Tickantel para la compra web.',
      'Los espectáculos hay que elegirlos durante el período de venta del abono: la FAQ oficial dice que no se pueden agregar funciones después, salvo espectáculos que se incorporen a la programación de abonos más adelante en el año.',
    ],
    benefits: [
      '30% de descuento comprando 5 o más espectáculos del Sodre. Es la ÚNICA modalidad a la venta: verificado en Tickantel el 19/08/2026, disponible hasta el 31/12/2026, con mínimo 5 y máximo 100 espectáculos.',
      'Composición del abono web: por cada selección de 5 espectáculos podés incluir hasta 2 obras del Ballet Nacional O 2 líricas, combinadas libremente (2 ballet, 2 líricas, o 1 y 1), más Orquesta Sinfónica Nacional, Conjunto Nacional de Música de Cámara, Coro Nacional, Orquesta Juvenil Nacional y Coro Nacional de Niños y Juvenil. Se amplía…',
      'Se puede agregar Star Wars: El retorno del Jedi al abono del 30% (queda excluido de las modalidades joven y obsequio).',
      'Entrada adicional para espectáculos ya incluidos en el abono con el mismo descuento exclusivo.',
      'Tarjeta de abonado sin costo, entregada al momento de la compra, que habilita todos los beneficios de comercios adheridos (aplica a todas las modalidades de abono).',
      'Descuentos con la tarjeta de abonado: Cine Sodre 20%, Tienda del Sodre 10% y Revista Dossier 15% en la suscripción.',
      'Gastronomía con la tarjeta de abonado: Amaranto 15% en el menú diario, Oro del Rihn 15% en el local y 10% para llevar, The Lab Coffee Roasters 10% en todas las sucursales, Ruffino 15%, Martei 15% en cafetería, Dalbertt Gluten Free 10% y Danubio Azul 10%.',
      'Cortesías con la tarjeta de abonado: café en Bar Facal, postre en Baco Vino & Bistró y en Positano Trattoría pidiendo plato principal, copa de vino o trago en Parrilla La Vaca Gourmet, copa de vino Los Cerros de San Juan en Bar Tabaré, y café, té, agua saborizada o copa de vino en Pacharán. Estacionamiento Colonia y Andes ofrece…',
      "Descuento BROU que se suma al del abono (el Sodre lo dice expreso: 'Al descuento del abono se le suma este beneficio'). Según BROU: 50% pagando con Recompensa Mastercard Platino/Black o VISA Platino/Infinite, con tope de $4.000 por cuenta y por mes; 20% con Visa BROU y Recompensa Mastercard crédito y débito, con tope de $1.000 por…",
      'Abono Club El País: 2x1 comprando 5 espectáculos, sujeto a cupos limitados, con hasta dos obras del Ballet Nacional incluidas y sin lírica ni Star Wars. Venta exclusivamente presencial, la debe hacer el/la titular con tarjeta y cédula. Requiere tarjeta Club El País, que es sin costo pero solo se entrega a suscriptores pagos de El País.…',
    ],
    whereValid:
      'Montevideo. Los espectáculos son en el Auditorio Nacional Adela Reta (Andes esq. Mercedes) y el Auditorio Nelly Goitiño (18 de Julio 930). La tarjeta de abonado además da descuentos en comercios adheridos de Montevideo: Cine Sodre, Tienda del Sodre, Revista Dossier, una lista de bares y restaurantes',
    caveat:
      'OJO, tres cosas que cambian el cuadro respecto de la pista original. (1) La página oficial murió: https://sodre.gub.uy/abono/ hoy devuelve un 301 hacia https://sodre.gub.uy/prensa/abono-sodre-2026/, que es una tapa de recortes de prensa sin una sola condición del abono, y no queda NINGUNA página de abono en el sitemap oficial (https://sodre.gub.uy/page-sitemap.xml). Todos los términos que documento acá salen del snapshot del 05/07/2026 de la página oficial en Wayback; el Sodre podría haberlos cambiado sin aviso al bajar la página. (2) Tres de las cuatro modalidades ya no se venden: verifiqué en el navegador el 19/08/2026 que Tickantel responde textual "Ya no está a la venta el abono" para el',
    sources: [
      'https://sodre.gub.uy/abono/',
      'http://web.archive.org/web/20260705072725/https://sodre.gub.uy/abono/',
      'https://sodre.gub.uy/prensa/abono-sodre-2026/',
      'https://sodre.gub.uy/page-sitemap.xml',
      'https://tickantel.com.uy/inicio/abono/40000722/abono/Abono%20Web%2030%25%202026',
      'https://tickantel.com.uy/inicio/abono/40000723/abono/Abono%20Joven%20Web%2050%25%202026',
    ],
    confidence: 'media',
  },
  {
    id: 'bns-amigos-amigos-del-bns-circulo-de-amigos',
    name: 'BNS Amigos (Amigos del BNS / Círculo de Amigos)',
    issuer: 'BNS | Ballet Nacional Sodre (compañía estatal, órbita SODRE)',
    category: 'entretenimiento',
    isFree: false,
    cost: '$ 10.000 al año (pesos uruguayos), en un solo pago. Textual de la web oficial: "Valor: $ 10.000. Se abona anualmente y en un solo pago. El pago se realiza a través de transferencia o depósito bancario." Ojo: la página escribe "$" sin aclarar moneda; en Uruguay eso son pesos. Los beneficios corren un año calendario desde que se acredita el pago ("Una vez efectivizado el pago comienzan a aplicarse los beneficios durante un año calendario"). ADVERTENCIA: la cifra está publicada sin ningún cambio desde julio de 2019 —verificada una por una en los snapshots del Wayback Machine de 2019-07, 2022-05, 2024-08 y 2025-11, y en la página viva de hoy—, o sea siete años sin ajuste por inflación, y la pági',
    digital: 'plastico',
    howToGet: [
      "Escribí a amigos@bns.gub.uy o llamá al 2901 3972 (la página escribe '29013972 int.' pero le falta el número de interno; el teléfono general del sitio es +598 2901 3972). No hay formulario de alta online: el único camino publicado es mail o teléfono.",
      'Pedíles los datos bancarios: la cuenta NO está publicada en la web, te la tienen que pasar ellos.',
      'Pagá los $ 10.000 por transferencia o depósito bancario, en un único pago anual (no hay cuotas ni débito automático publicados).',
      'Una vez acreditado el pago te entregan la tarjeta de socio física y arrancan los beneficios por un año calendario.',
      'No hace falta ser cliente de ningún banco ni tener tarjeta de crédito: es una membresía institucional, no un producto financiero.',
    ],
    requirements: [
      'No hay requisitos de edad, residencia, profesión ni vínculo previo con el SODRE publicados en la web.',
      'El único requisito real es pagar los $ 10.000 anuales por transferencia o depósito bancario.',
      'Es un pago único anual: no hay versión gratuita ni escalonada para personas físicas en esta página.',
      'Para aprovechar los beneficios en serio necesitás poder ir presencialmente al Auditorio en Montevideo.',
    ],
    benefits: [
      'Preventa exclusiva de entradas para todos los espectáculos de la temporada BNS, con acceso a las mejores ubicaciones del Auditorio (sujeto a disponibilidad al momento de la compra).',
      'Descuento especial del 50 % para la compra de dos entradas, pero aplicable a UNA sola obra de la temporada, definida de antemano por el BNS (no es 50 % en cualquier función).',
      "Descuento especial en la compra del libro '80 Años del BNS' y en artículos de la Tienda SODRE. El porcentaje NO está publicado.",
      'Presenciar ensayos de la compañía e ingresar a ensayos generales con público.',
      'Presenciar las clases de calentamiento previas a cada estreno.',
      'Participar de reuniones con el director artístico y de actividades junto a los bailarines.',
      'Asistir a los brindis previo y posterior al estreno.',
      'Ingresar a funciones matiné junto con dos acompañantes menores de edad (sujeto a disponibilidad).',
      'Visitar los talleres del Auditorio para conocer el trabajo relacionado a una producción especial del BNS.',
      'Invitación a las conferencias de prensa y acceso a eventos privados del BNS junto a un acompañante.',
    ],
    whereValid:
      'Espectáculos de la temporada del BNS en el Auditorio Nacional del SODRE (Montevideo) y Tienda SODRE. Es un programa de una sola institución: no sirve en comercios adheridos ni fuera del circuito SODRE/BNS. Las actividades de acceso (ensayos, talleres, brindis) son presenciales en el Auditorio, o sea',
    caveat:
      'Lo que NO pude confirmar y la letra chica: (1) EL PRECIO PUEDE ESTAR DESACTUALIZADO. Comparé la página actual contra los snapshots del Wayback Machine de 2019-07, 2022-05, 2024-08 y 2025-11: los cuatro dicen exactamente lo mismo, $ 10.000. O sea que el valor está publicado sin tocarse desde hace unos siete años, sin ningún ajuste por inflación, y la página no tiene fecha. Es el precio OFICIAL vigente publicado, pero no hay garantía de que sea el que te van a cobrar: confirmalo por mail antes de transferir. (2) El porcentaje del "descuento especial" en Tienda SODRE y en el libro no está publicado en ningún lado: no se puede cuantificar. (3) El 50 % es para dos entradas y en una única obra que',
    sources: [
      'https://www.bns.gub.uy/es/amigos-del-bns',
      'https://www.bns.gub.uy/es/amigos-del-bns/circulo-de-amigos',
      'https://bns.gub.uy/es/',
      'http://web.archive.org/web/20190720080326/https://www.bns.gub.uy/es/amigos-del-bns',
      'http://web.archive.org/web/20220524193005/https://www.bns.gub.uy/es/amigos-del-bns',
      'http://web.archive.org/web/20240814015636/https://www.bns.gub.uy/es/amigos-del-bns',
    ],
    confidence: 'media',
  },
  {
    id: 'membresias-de-la-fundacion-amigos-del-teatro',
    name: 'Membresías de la Fundación Amigos del Teatro Solís',
    issuer:
      'Fundación Amigos del Teatro Solís (fundación privada sin fines de lucro constituida el 26/08/2008, con sede en el Teatro Solís, Montevideo). El Teatro Solís es de la Intendencia de Montevideo; la Fund',
    category: 'entretenimiento',
    isFree: false,
    cost: '"Sin confirmar. HOY la web oficial de Membresías no publica ningún precio. Lo último que llegó a publicarse fueron cinco categorías mensuales —Bronce $U 250, Plata $U 700, Oro $U 1.600, Platino $3.300 y Diamante $U 6.600—, que aparecen IDÉNTICAS en las copias archivadas de abril de 2019, mayo de 2024 y 10 de febrero de 2025, y ya no están en la copia del 23 de enero de 2026: se borraron, no se actualizaron. Ojo con la antigüedad: las tres copias llevan el mismo sello de contenido de la propia página (09/08/2018), o sea que ese cuadro estuvo sin tocar al menos seis años y medio. NO lo tomes como vigente; hay que pedir precios por mail. Nunca fue gratis: la membresía es un aporte mensual (mece',
    digital: 'sin confirmar',
    howToGet: [
      'No hay proceso publicado. Hoy el único canal oficial que aparece en la página de Membresías es escribir a coordfundacion@gmail.com; no hay formulario de alta, ni categorías, ni pasos, ni medios de pago publicados.',
      'Si vas a consultar, pedí POR ESCRITO y antes de pagar: qué categorías existen hoy, cuánto cuesta cada una, qué beneficios concretos incluye, cómo se acredita la membresía (¿tarjeta física?, ¿nombre en una lista de boletería?) y en qué espectáculos aplica el descuento. La web no responde ninguna de…',
      "Si sos empresa u organización, el camino es otro: el Teatro publica que 'a través de un aporte anual, las organizaciones pueden integrar el grupo de empresas amigas de la Fundación', y para eso el contacto listado es fveiro@teatrosolis.org.uy. Ese canal sí parece ser el vivo (la página actual de…",
      'Teléfono histórico de la Fundación: 2915 0039 (figuraba en la versión anterior de la página y en la ficha del Mapeo de la Sociedad Civil). No está publicado en la página actual, así que no está confirmado que siga en uso.',
      "Señal de alerta antes de gestionar: la página de Membresías fue sacada del menú del sitio. El submenú 'Fundación Amigos' hoy solo enlaza 'Quiénes somos' y 'Qué hacemos'; a Membresías solo se llega por URL directa o por el link viejo 'Click aquí para ser parte de la Fundación' que quedó en…",
    ],
    requirements: [
      'No hay requisitos publicados: la web no indica edad mínima, documentación, permanencia mínima ni forma de pago.',
      "Es un aporte económico periódico, o sea que el 'requisito' de fondo es pagar una cuota mensual (o un aporte anual, en el caso de organizaciones).",
      'Alcance práctico: los beneficios que alguna vez se publicaron se usaban presencialmente en el Teatro Solís, en Montevideo. Si no vivís o no venís a Montevideo, no hay nada que aprovechar.',
    ],
    benefits: [
      "NINGÚN beneficio concreto está publicado hoy. La página oficial de Membresías, verificada el 19/08/2026, no lista un solo descuento, porcentaje ni ventaja: solo texto institucional de agradecimiento, la mención de que 'más de 20 organizaciones de distintos rubros nos acompañan' y un mail de contacto.",
      "Prueba en contra, y es fuerte: el Teatro Solís mantiene una página de 'Descuentos y beneficios' que enumera sus convenios vigentes —Comunidad La Diaria (2x1), Club El País (2x1), TUS Trans (ingreso sin costo), APLU/AUPUM/FOSMETAL/ADAJU (20%), Hospital Británico (20%), Proyecto Moebius (20% en sala Zavala Muniz y 50% en sala principal),…",
      "Las fichas de la Temporada 2026 tampoco la mencionan. En 'Cascanueces' los descuentos publicados son Tarjeta Dorada, jubilados y precio joven (50%), FUCVAM y Samsung Members (20%), Montevideo Libre y TUS Trans sin costo, y La Diaria 2x1; en 'Gala aniversario' el listado es equivalente. La Fundación Amigos no figura en ninguna de las dos.",
      "El único '-30% para Miembros Fundación Amigos del Teatro Solís' que sigue online está en la ficha de 'Aires de mujer - El musical', función del 26 de marzo de la Temporada 2020. Es una página vieja que quedó publicada, no un beneficio de la cartelera actual.",
      'Referencia histórica de lo que se ofrecía (copias archivadas de 2024 y del 10/02/2025, hoy borrado; tomalo como pasado, no como oferta): Bronce = descuento en tienda y cafetería + descuento en una selección de espectáculos de la sala principal + invitación para dos a visita guiada. Plata = descuento en tienda y cafetería, descuento en…',
      "Solo en la copia de abril de 2019 (ya no en las de 2024 ni 2025) las categorías Plata y Oro incluían además 'descuento en restaurante Rara Avis - Teatro Solís'. Ese beneficio se dejó de publicar en algún momento entre 2019 y 2024: no lo cuentes como parte de la última oferta conocida.",
      "Convenio con el Club de Golf del Uruguay (informado por Montevideo Portal el 11/02/2020): los socios Oro, Platino y Diamante de la Fundación accedían a un 'importante descuento' en el club y a precios especiales en alquiler de salones, y a la inversa los socios del club a descuentos en la Temporada de Ópera. La nota no da ningún…",
      'Beneficio indirecto real y no discutido: el aporte financia programación del Teatro (temporada de ópera, presentaciones internacionales, mantenimiento edilicio y tecnológico y proyectos de acceso). Si tu interés es mecenazgo cultural y no ahorro, eso sí está documentado.',
    ],
    whereValid:
      'Solo en el Teatro Solís, Montevideo (Reconquista esq. Bartolomé Mitre): boletería y salas del teatro, y —según la versión archivada de la página— la tienda, la cafetería, el restaurante Rara Avis y las visitas guiadas. El convenio con el Club de Golf del Uruguay (2020) extendía un beneficio de matrí',
    caveat:
      'La Fundación existe y está activa (constituida en 2008; el Consejo actual —presidenta Laura Blois, tesorero Miguel Brechner— figura en la web y el sitio del Teatro se actualiza: la página de convenios tiene fecha 07/08/2026). Lo que NO está confirmado es que siga existiendo hoy una membresía individual comprable con beneficios definidos. Tres cosas no pude verificar y todas apuntan al mismo lado: (1) el cuadro de categorías y precios (Bronce/Plata/Oro/Platino/Diamante, $U 250 a $U 6.600 mensuales) estuvo publicado en esa misma URL hasta al menos el 10/02/2025 y ya no está el 23/01/2026 — se borró, no se actualizó; (2) la página de Membresías fue sacada del menú de navegación y quedó huérfana',
    sources: [
      'https://www.teatrosolis.org.uy/NOSOTROS/Membresias-uc50',
      'https://www.teatrosolis.org.uy/QUIENES-SOMOS/Membresias-uc50',
      'https://www.teatrosolis.org.uy/MAS-SOLIS/Descuentos-y-beneficios-uc3032',
      'https://www.teatrosolis.org.uy/QUIENES-SOMOS/Quienes-somos-uc52',
      'https://www.teatrosolis.org.uy/categoria/Que-hacemos-46',
      'https://www.teatrosolis.org.uy/INFORMACION/Se-parte-del-TEATRO-SOLIS-uc51',
    ],
    confidence: 'baja',
  },
  {
    id: 'pases-periodicos-de-cine-universitario-del-u',
    name: 'Pases periódicos de Cine Universitario del Uruguay',
    issuer:
      'Cine Universitario del Uruguay (organización de la sociedad civil sin fines de lucro, fundada el 28/12/1949; independiente en funcionamiento y financiamiento de la Udelar, aunque el Rector es Presiden',
    category: 'entretenimiento',
    isFree: false,
    cost: 'Pago. Tarifario oficial vigente (leído el 19/08/2026 en cineuniversitariodeluruguay.org.uy/sumate/): General $450/mes o $4.500/año; General 2×1 $800/mes o $8.000/año; Estudiantes UdelaR $300/mes o $3.000/año; Egresades y funcionaries UdelaR $350/mes o $3.500/año. El pase se saca en la boletería y la web pide llevar «dinero en efectivo para abonar» (no aclara si acepta otros medios de pago). Como referencia, quien no tiene pase paga un bono de colaboración de $200 por función de martes a jueves y $250 de viernes a domingo. La tarifa se viene ajustando (General: $370 en marzo 2025, $400 en noviembre 2025, $450 desde abril 2026, verificado en Wayback), así que conviene confirmar el precio en bo',
    digital: 'sin confirmar',
    howToGet: [
      'Ir EN PERSONA a la boletería del Cine, Canelones 1280, Montevideo. La web lo dice textual: «Conseguí tu pase en la boletería del Cine». No hay trámite online ni formulario.',
      'Ir en horario de boletería: martes a domingo de 17:00 a 22:00 (los lunes está cerrado).',
      'Llevar la cédula u otro documento con tu nombre: «Recordá llevar tu cédula (u otro documento con tu nombre)».',
      'Llevar EFECTIVO: la web pide «dinero en efectivo para abonar». No figura tarjeta, transferencia ni débito automático.',
      'Si vas por la tarifa UdelaR (estudiante, egresade, funcionarie o docente), sumar un comprobante que acredite el vínculo: «es necesario presentar un comprobante que acredite tu asociación con la universidad».',
      'Elegir modalidad mensual o anual en el mostrador. La anual cuesta exactamente 10 mensualidades, así que pagando el año te ahorrás 2 meses.',
      'Consultas previas: 2 901 6768 o cineuniversitariodeluruguay@gmail.com.',
    ],
    requirements: [
      'Cédula de identidad u otro documento con tu nombre.',
      'Efectivo (único medio de pago que menciona la web).',
      'Presentarte físicamente en Canelones 1280 dentro del horario de boletería (martes a domingo 17:00-22:00).',
      'Para las tarifas UdelaR ($300 y $350): comprobante que acredite ser estudiante, egresade, funcionarie o docente de la Udelar.',
      'No pide edad mínima, socio previo, ni residencia en Montevideo.',
    ],
    benefits: [
      'Precio publicado y verificable: el tarifario oficial (leído el 19/08/2026) lista General $450/mes o $4.500/año, General 2×1 $800/mes o $8.000/año, Estudiantes UdelaR $300/mes o $3.000/año y Egresades y funcionaries UdelaR $350/mes o $3.500/año.',
      'En ese mismo tarifario, la fila «Socies (martes a domingo)» figura como «Libre», frente al «Bono colaboración» de $200 (martes a jueves) y $250 (viernes a domingo) que paga el público sin pase. Ojo: el sitio no define qué es «Socies» ni dice en ninguna parte que el pase equivalga a entrada libre — es la lectura de la tabla, no una…',
      'Si esa lectura es correcta, la cuenta sobre las cifras publicadas da: el pase General ($450/mes) se cubre con 2,25 funciones de martes a jueves ($200 c/u) o 1,8 de viernes a domingo ($250 c/u); el de estudiante UdelaR ($300/mes), con 1,5 funciones de martes a jueves.',
      'Hay una tarifa UdelaR diferenciada y sostenida en el tiempo: las categorías «Estudiantes UdelaR» y «Egresades y funcionaries UdelaR» aparecen en los tres snapshots verificados (marzo 2025, noviembre 2025 y abril 2026), aunque los montos se actualizaron en cada uno ($250/$270 → $270/$300 → $300/$350). Exige presentar un comprobante que…',
      'La modalidad anual cuesta exactamente 10 mensualidades, en todas las categorías y en los tres snapshots ($4.500 = 10 × $450 hoy; $3.700 = 10 × $370 en marzo 2025). El sitio no aclara qué período cubre el «Anual», así que conviene preguntarlo en boletería.',
      'Existe una modalidad «General 2×1» a $800/mes u $8.000/año. El sitio publica el precio pero no explica en ninguna parte qué incluye, así que no puede darse por sentado que sea un pase para dos personas.',
      'Los socies participan de la programación: hay un ciclo oficial llamado «Les socies programan», verificado en cartelera (Ginger snaps, de John Fawcett, miércoles 19/08/2026, 19:45, Sala Chaplin).',
      'Cartelera de cineclub fuera del circuito comercial, verificada para la semana del 19 al 23/08/2026: «Estudio Ghibli. Primeros años» (Porco Rosso), «Maestros del cine: Abbas Kiarostami» (Five, El sabor de las cerezas), «Trilogias escenciales Vol.1» (Tres colores: Rojo), «Ciencia ficción latinoamericana» (Moebius) y un Estreno Nacional…',
      'El trámite es simple y sin letra chica digital: se saca en persona en la boletería (Canelones 1280, martes a domingo de 17:00 a 22:00) con cédula, sin contrato, sin débito automático y sin permanencia — no existe compra online ni app.',
    ],
    whereValid:
      'Solo en la sede del Cine Universitario, Canelones 1280, Montevideo (salas Chaplin y Lumière). Funciones y boletería de martes a domingo de 17:00 a 22:00. No hay sedes en otros departamentos ni beneficios fuera de esa sala.',
    caveat:
      'Lo que NO pude confirmar en fuente oficial: (1) La web NUNCA dice explícitamente «el pase te da entradas ilimitadas». La conclusión de que el pase = entrada libre martes a domingo sale de que el tarifario lista la fila «Socies (martes a domingo) — Libre» junto al «Bono colaboración» que paga el resto; el sitio no define en ninguna parte qué es «Socies» ni si equivale a tener el pase. (2) Qué es exactamente el «General 2×1»: el sitio solo publica el precio, no explica si es un pase para dos personas, dos entradas por función o dos funciones. No lo asumas. (3) El formato: no hay app, ni compra online, ni área de socios en todo el sitio (por eso el pago es en efectivo y presencial), pero tampoc',
    sources: [
      'https://cineuniversitariodeluruguay.org.uy/sumate/',
      'https://cineuniversitariodeluruguay.org.uy/',
      'https://cineuniversitariodeluruguay.org.uy/cine/',
      'https://cineuniversitariodeluruguay.org.uy/programacion/',
      'https://cineuniversitariodeluruguay.org.uy/actividad/ginger-snaps-2/',
      'https://web.archive.org/web/20260415030330/https://cineuniversitariodeluruguay.org.uy/sumate/',
    ],
    confidence: 'media',
  },
  {
    id: 'socio-espectacular',
    name: 'Socio Espectacular',
    issuer:
      'Socio Espectacular — emprendimiento cultural fundado en febrero de 1997 por el Teatro El Galpón y el Teatro Circular de Montevideo. Oficina: 18 de Julio 1618 (entrepiso), Montevideo. Tel. 2402 9017. D',
    category: 'entretenimiento',
    isFree: false,
    cost: '"NO es gratis: es una cuota mensual. Planes oficiales publicados en https://socioespectacular.com.uy/beneficios (verificados también contra la API que alimenta esa página): (1) Socio Espectacular $500/mes — pago inicial $1.500 (cubre 3 meses); (2) Socio Espectacular + Cine $800/mes — inicial $2.400; (3) Socio Espectacular + Carnaval $1.080/mes — inicial $3.240 (marcado \\"Recomendado\\"); (4) Socio Full $1.320/mes — inicial $3.960. Modalidades acotadas a una sola sala: Tarjeta Galponauta $200/mes (solo El Galpón) y Tarjeta Circular $200/mes (solo Teatro Circular). PREPAGO con bonificación, textual del sitio: \\"Pagando 6 meses abonás solo 5 meses\\" y \\"Pagando 12 meses abonás solo 10 meses\\" (h',
    digital: 'sin confirmar',
    howToGet: [
      "Online, en https://socioespectacular.com.uy/hacete-socio — el alta es un asistente de 3 pasos: 'Elegir plan' → 'Datos' → 'Pagar'.",
      "Primero elegís una de las 3 vías de alta que ofrece el formulario: 'Asociación común', 'Asociación por beneficio ANTEL' (si tenés el código promocional que se obtiene marcando *789*8# o en la sección de beneficios de la app MiAntel) o 'Asociación por convenio' (si trabajás/estás afiliado a alguna…",
      'Elegís el plan y la modalidad de pago: mensual, 6 meses (pagás 5) o anual (pagás 10). Ojo: la Tarjeta Galponauta solo se ofrece en modalidad mensual, y si la elegís el sitio te redirige a teatroelgalpon.org.uy/hacete-socio para completar el alta ahí.',
      'Cargás los datos personales que pide el formulario: número de documento, fecha de nacimiento y correo electrónico.',
      "Pagás. El flujo redirige a la pasarela de pago; también existe el alta por suscripción, que registra una tarjeta para el débito automático de la cuota (el área de socios tiene secciones 'Gestionar suscripción' y 'Medios de pago').",
      "Hay que abonar 3 meses por adelantado. Textual de la FAQ oficial: 'Para asociarse deben abonarse tres meses por anticipado y se activarán los beneficios en forma inmediata.'",
      'Presencial (alternativa): oficina de 18 de Julio 1618, Montevideo, lunes a viernes de 10 a 19 hs y sábados de 10 a 14 hs. Tel. 2402 9017, info@socioespectacular.com.uy.',
      'Requisito documental: cédula de identidad. Pueden asociarse personas de cualquier edad.',
    ],
    requirements: [
      'Cédula de identidad uruguaya (es el documento que pide el alta y el que se presenta en boletería).',
      "Sin límite de edad: 'Pueden asociarse personas de cualquier edad', incluidos menores.",
      'Abonar 3 meses por adelantado al darse de alta (pago inicial de $1.500 a $3.960 según el plan). Ese es el mínimo de permanencia.',
      'Correo electrónico y fecha de nacimiento para completar el formulario online.',
      'Una tarjeta para pagar por la pasarela o para dejar registrada la suscripción (o débito del sueldo, en los convenios que lo permiten).',
      'Para el precio de convenio: acreditar la pertenencia a la institución (según el convenio, recibo de sueldo con número de funcionario, constancia de socio o carné del gremio).',
    ],
    benefits: [
      "Entrada libre a las producciones de los teatros participantes. Ojo con el alcance de la fuente: /beneficios dice solo 'los teatros participantes' sin nombrarlos. Los cinco nombres —Teatro El Galpón, Teatro Circular, Comedia Nacional, Teatro El Tinglado y La Gaviota— figuran únicamente en la ficha del Abono Cultural BPS dentro de…",
      '2x1 en cines comerciales, en TODOS los planes: Life Cinemas (Montevideo y Ciudad de la Costa), Grupocine (Montevideo y Las Piedras) y Movie.',
      'Entradas libres para estrenos de cine (Cinemateca, Life, Grupocine o Movie), y acá está la diferencia real entre planes: el plan base $500 NO trae ninguna; +Cine trae 1 por mes; +Carnaval trae 2 por mes; Full trae 3 por mes.',
      'Cine Universitario: entrada libre de lunes a viernes. Sábados y domingos, entrada bonificada a $30 (el sitio compara contra $200 de precio general).',
      'Cinemateca Uruguaya, ciclos y reposiciones: entrada libre de lunes a viernes. Sábados y domingos, $80 (contra $460 de precio general).',
      'Cinearte del SODRE: entrada libre con cupos limitados por función; agotado el cupo, 50% de descuento sobre el precio de la entrada.',
      'Música con entrada libre y cupo limitado: Orquesta Filarmónica de Montevideo, Orquesta Sinfónica del SODRE, Conjunto de Música de Cámara, Orquesta Juvenil del SODRE y Coro del SODRE. En todos los casos, agotado el cupo queda 50% de descuento.',
      'Danza: Ballet Nacional del SODRE con 20% de descuento; Gala de Ballet del SODRE con 50% de descuento.',
      'Carnaval: entrada libre al escenario del Velódromo — SOLO en los planes + Carnaval ($1.080) y Full ($1.320).',
      'Entrada libre a la Criolla del Prado (todos los planes).',
    ],
    whereValid:
      'Montevideo y área metropolitana, NO es un programa de alcance nacional. Todas las salas de teatro del sistema están en Montevideo (El Galpón, Circular, El Tinglado, Stella-La Gaviota, Solís y Sala Verdi para la Comedia Nacional), igual que Cinemateca, Cine Universitario, el SODRE (Auditorio Adela Re',
    caveat:
      'Lo que NO pude confirmar y la letra chica que importa: (1) FORMATO DE LA CREDENCIAL — no hay app (no existe listado en tiendas ni se menciona en el sitio, y el sitemap oficial solo tiene 22 páginas web, ninguna de app). La FAQ vigente dice que en boletería se presenta la CI, no una tarjeta. Históricamente sí había un plástico con banda magnética leído por POS, y así lo sigue describiendo la FAQ de teatroelgalpon.org.uy —que además cobra $50 por la tarjeta—, pero esa página está claramente desactualizada (anuncia un ciclo "en el 2018" y publica precios viejos de $320/$460/$600 y un mínimo de DOS meses en vez de tres). El sitio oficial actual no dice si se sigue entregando plástico ni cuánto c',
    sources: [
      'https://socioespectacular.com.uy/beneficios',
      'https://socioespectacular.com.uy/preguntas-frecuentes/',
      'https://socioespectacular.com.uy/convenios/',
      'https://socioespectacular.com.uy/nosotros/',
      'https://socioespectacular.com.uy/hacete-socio/',
      'https://socioespectacular.com.uy/pagar-cuota',
    ],
    confidence: 'media',
  },
  {
    id: 'socio-de-cinemateca-uruguaya',
    name: 'Socio de Cinemateca Uruguaya',
    issuer:
      'Cinemateca Uruguaya (asociación civil sin fines de lucro, fundada en 1952). Sede: Bartolomé Mitre 1236, Montevideo. Tel. (+598) 2914 75 69',
    category: 'entretenimiento',
    isFree: false,
    cost: 'PAGA. Cuota verificada el 19/08/2026 en cinemateca.org.uy/usuario/suscripcion: Mensual $860/mes (boton \\"Suscribirme\\", suscripcion recurrente); Trimestral $2.580 (3 meses); Semestral $4.300 (6 meses); Anual $8.300 (1 ano) — estos tres con boton \\"Comprar ahora\\" (pago unico por el periodo). Cuenta hecha sobre esas cifras oficiales: el trimestral NO tiene descuento (3 x $860 = $2.580 exacto); el semestral ahorra $860 frente a pagar 6 meses sueltos ($5.160); el anual ahorra $2.020 frente a 12 meses sueltos ($10.320). Existe una categoria estudiante \\"con precios bonificados\\" (alumno universitario, de Secundaria o UTU, mayor de 16 anos, subiendo comprobante), pero su precio NO esta publicado',
    digital: 'sin confirmar',
    howToGet: [
      '1) Crear la cuenta en https://cinemateca.org.uy/web/signup. El formulario pide solo cuatro datos: correo, nombre, contraseña y confirmación de contraseña. No pide cédula ni tarjeta en este paso.',
      '2) Entrar a https://cinemateca.org.uy/usuario/suscripcion y elegir plan. Ojo con la diferencia de botones: el mensual dice "Suscribirme" (suscripción recurrente) y los de 3, 6 y 12 meses dicen "Comprar ahora" (pago único por el período).',
      '3) El botón lleva a /cinema/subscription/<id> y ahí exige estar logueado: sin sesión te redirige a /web/login. O sea, no se puede pagar como invitado; primero sí o sí la cuenta del paso 1.',
      '4) Pagar en línea y quedar asociado. Verificado que el checkout está detrás del login, así que no pude ver qué medios de pago acepta el sitio principal.',
      'VÍA ESTUDIANTE (es otro camino, no se compra en la tabla): en la misma página de suscripción, el bloque "¿SOS ESTUDIANTE?" abre un formulario aparte con Nombre y Apellido, mail, teléfono, selector de comprobante y asunto, y un botón "SUBIR COMPROBANTE". Se manda el certificado de estudiante y…',
      'VÍA REGALO: en https://cinemateca.org.uy/regala-cine se puede regalar la suscripción. Solo trimestral, semestral y anual (no mensual), a los mismos precios: $2.580 / $4.300 / $8.300. El circuito es: cargás los datos de quien recibe y los tuyos (pide tipo y número de documento, cédula uruguaya o…',
      'PRESENCIAL: la sede está en Bartolomé Mitre 1236 y el teléfono es (+598) 2914 75 69, pero el sitio no documenta un trámite de alta presencial; todo el flujo publicado es web.',
    ],
    requirements: [
      'Para la membresía general: no hay requisito de edad, ingreso ni vínculo institucional. Alcanza con crear una cuenta y pagar la cuota.',
      'Correo electrónico válido: es la llave de todo el sistema. El FAQ oficial de +Cinemateca lo dice expreso: para que corran los beneficios hay que "tener su cuota al día y tener el mismo usuario (mail) que utiliza en Cinemateca".',
      'Cuota al día: es condición explícita para el streaming, y la ECU pide "recibo al día" para el 50% de la matrícula.',
      'Para la categoría estudiante: ser mayor de 16 años y alumno universitario, de Secundaria o UTU, y subir un documento que acredite esa condición.',
      'Para el beneficio de parking: presentar la entrada del día.',
      'Para el streaming: estar físicamente en Uruguay al momento de reproducir.',
    ],
    benefits: [
      'Estrenos a $80 en vez de $480. Es el beneficio central y esta publicado textual en la home de Cinemateca: "ESTRENOS: Socios: $80, No Socios: $480". Son $400 de ahorro por entrada, asi que la cuota mensual de $860 se paga sola con 2,15 estrenos al mes.',
      'Ciclos GRATIS ($0) contra $480 que paga el no socio ("CICLOS: Socios: gratis, No Socios: $480"). Y no es marginal: la propia pagina de suscripcion dice "Al menos 2 de las peliculas que exhibimos cada dia pertenecen a ciclos de archivo (sobre directores, actores o con tematicas similares)", en su mayoria exhibidas en 35 mm. Con dos…',
      'El primer acompanante paga la mitad del precio general: "El primer acompanante de un Socio paga la mitad del valor de la entrada general", o sea $240 en lugar de $480.',
      'Streaming +Cinemateca (mascinemateca.org.uy) incluido. La pagina de suscripcion dice que los socios ven gratis "una seleccion de peliculas que se renueva mensualmente" y que los estrenos de plataforma les salen $90 por pelicula. Hay app Android confirmada (+Cinemateca, com.mascinemateca.app, VOD de Cinemateca Uruguaya) ademas de la web;…',
      '15% de descuento en la cafeteria de la sede, que funciona de 11 a 21 hs en el hall con cafe y comidas caseras: "Nuestros socios tienen un descuento del 15% en su consumicion".',
      '10% de descuento en la tienda del hall, con libros de cine y novedades: "Aqui los socios tienen un 10% de descuento".',
      'Parking propio: 3 horas gratis por dia a partir de las 16 hs, presentando la entrada. El parking esta en Bartolome Mitre 1224 (casi Reconquista), abre de 7:30 a 23:30 de lunes a domingo y la tarifa normal es $100 la hora de auto, asi que son hasta $300 diarios de ahorro. Los espectadores no socios solo acceden a "una tarifa bonificada…',
      'Abono del Festival Cinematografico Internacional a $500 para socios: "los socios pueden comprar un abono por $500 que les permite ver todos las peliculas que integran el catalogo".',
      'Entrada gratis a los festivales uruguayos que se alojan en sus salas: el sitio nombra DocMontevideo, Detour, Llamale H, Atlantic Doc, DiverCine, Festival de Cine Cannabico, Festival de Escuelas de Cine y Tenemos que ver ("En todos estos, nuestros socios son invitados").',
      '"Los socios programan": solo los socios pueden proponer peliculas del archivo para que se programen, y si la elegida es la tuya te mandan "una entrada para vos y tu acompanante". Textual del sitio: "Solo los socios pueden participar".',
    ],
    whereValid:
      'Sede única en Montevideo: Bartolomé Mitre 1236 (tres salas, edificio en el predio de CAF detrás del Teatro Solís, abierto el 13/12/2018), más el parking propio en Bartolomé Mitre 1224. No hay sucursales en el interior. El beneficio de streaming (+Cinemateca / mascinemateca.org.uy) funciona en web, A',
    caveat:
      'Lo que NO pude confirmar y la letra chica que importa: (1) EL PRECIO DE ESTUDIANTE NO EXISTE PUBLICADO. La tabla solo trae los cuatro planes generales; la categoría estudiante se tramita subiendo un comprobante y el monto hay que preguntarlo. No lo invento. (2) Cuidado con cómo está redactado el beneficio estudiantil: dice que pagás "sólo 80 pesos en los estrenos", pero $80 es exactamente lo que paga CUALQUIER socio según la tabla oficial de entradas. La bonificación estudiantil está en la CUOTA, no en la entrada; el texto de la web se presta a confusión. (3) DOS FUENTES OFICIALES SE CONTRADICEN SOBRE EL STREAMING: la página de suscripción habla de "una selección de películas que se renueva',
    sources: [
      'https://cinemateca.org.uy/usuario/suscripcion',
      'https://cinemateca.org.uy/kc_cinema/snippet/ticket_prices',
      'https://cinemateca.org.uy/',
      'https://cinemateca.org.uy/web/signup',
      'https://cinemateca.org.uy/parking',
      'https://cinemateca.org.uy/los-socios-programan',
    ],
    confidence: 'alta',
  },
  {
    id: 'tarjeta-circular',
    name: 'Tarjeta Circular',
    issuer:
      'Socio Espectacular (sistema de socios fundado en febrero de 1997 por el Teatro El Galpón y el Teatro Circular de Montevideo). La tarjeta es la modalidad "sala única" del Teatro Circular y se contrata',
    category: 'entretenimiento',
    isFree: false,
    cost: "\"$200 por mes (pesos uruguayos), con $600 de pago inicial que cubre los tres primeros meses. Las dos cifras tienen distinto respaldo y conviene no mezclarlas: el precio de $200 figura en el catálogo oficial de https://socioespectacular.com.uy/beneficios (bloque 'Otras modalidades': 'Tarjeta Circular — $200 por mes') y se repite en los datos del formulario de alta. El pago inicial de $600 NO aparece en ese catálogo (a diferencia de los planes principales, que sí lo publican) y surge de un solo lugar: los datos que alimentan el formulario de https://socioespectacular.com.uy/hacete-socio/, donde el plan figura con costo 200 y detalle '$600 pago inicial (Cubre 3 meses)'. Es el mismo criterio que",
    digital: 'sin confirmar',
    howToGet: [
      "Entrá a https://socioespectacular.com.uy/hacete-socio y elegí el plan 'Tarjeta Circular' dentro de los planes tradicionales. Ojo con un detalle no obvio: la tarjeta hermana (Galponauta, de El Galpón) te saca del sitio y te manda a teatroelgalpon.org.uy, pero la Circular se completa entera dentro…",
      "Completá el formulario 'Completá tus datos': nombre, apellido, fecha de nacimiento, número de documento (con dígito verificador, sin guion ni puntos), correo electrónico y celular.",
      "Apretá 'Ir a pagar': el sitio te redirige a la pasarela de pago. Se abonan los tres primeros meses por adelantado ($600) y, según la web, los beneficios se activan en forma inmediata.",
      'Alternativa presencial: sede de Socio Espectacular, 18 de Julio 1618, Montevideo (entrepiso del Teatro El Galpón), lunes a viernes de 10 a 19 h y sábados de 10 a 14 h. Teléfono 2402 9017, info@socioespectacular.com.uy.',
      'Para usar el beneficio en la sala: presentás tu cédula de identidad en la boletería del Teatro Circular (boletería de martes a sábado de 18 a 22 h y domingos de 17 a 20 h).',
      'Para sacar entradas online: en algunos espectáculos el sitio te manda a Tickantel, donde el número de socio son los 8 dígitos de tu cédula sin puntos ni guion más un PIN que tenés que pedir al 2402 9017 interno 0 o a info@socioespectacular.com.uy. Cuando la venta es por Redtickets solo te piden el…',
    ],
    requirements: [
      'Cédula de identidad: es el único documento que piden para asociarse y el que tenés que presentar en boletería.',
      'No hay límite de edad: la web dice expresamente que pueden asociarse personas de cualquier edad, incluidos menores.',
      'Permanencia mínima de tres meses, que se pagan por adelantado al darte de alta.',
      'Los beneficios son de uso exclusivo del titular y son intransferibles.',
      'Datos que pide el formulario online: nombre, apellido, fecha de nacimiento, documento, correo electrónico y celular.',
      'El pago del alta se hace con la pasarela de pago del sitio (tarjeta); la web menciona además débito automático para la cuota mensual, con la salvedad de la baja antes del 22 que figura en la letra chica.',
    ],
    benefits: [
      "Entrada libre a producciones del Teatro Circular (texto literal del emisor en el catálogo oficial: 'Entrada libre a producciones del Teatro Circular.'). Ojo con el alcance: son las producciones del teatro, no todo lo que se presenta en la sala.",
      "Pre estrenos exclusivos (texto literal del emisor: 'Pre estrenos exclusivos.').",
      "Beneficios en espectáculos nacionales e internacionales en el Teatro Circular (texto literal del emisor: 'Beneficios en espectáculos nacionales e internacionales en el Teatro Circular.'). El emisor no detalla en qué consisten esos beneficios ni de cuánto son.",
      'Costo comparado, que es el argumento de la tarjeta: $200 por mes contra $500 por mes del plan Socio Espectacular completo, ambos precios del mismo catálogo oficial. La contrapartida es el alcance: la Tarjeta Circular sirve para una sola sala; si querés el resto de la red (El Galpón, Comedia Nacional, El Tinglado, La Gaviota, SODRE,…',
      'Las obras con entrada libre se pueden ver una vez por temporada; si la obra reestrena en la temporada siguiente, se puede volver a ver (preguntas frecuentes del emisor).',
    ],
    whereValid:
      'Solo en el Teatro Circular de Montevideo, Av. Gral. Rondeau 1388, Montevideo. Es una tarjeta de sala única: los tres beneficios que publica el emisor se refieren exclusivamente a esa sala. NO habilita el resto de la red de Socio Espectacular (Teatro El Galpón, Comedia Nacional, El Tinglado, La Gavio',
    caveat:
      "Cuatro cosas que no pude cerrar y una advertencia de conflicto de fuentes. PRIMERO: no puedo confirmar si te dan un plástico, una credencial digital o nada. La web actual de Socio Espectacular no lo dice en ninguna parte, no tiene app propia, y todo el uso descrito funciona con la cédula de identidad (en boletería) o con el número de cédula más un PIN (en Tickantel). Las preguntas frecuentes hablan de 'el titular de la tarjeta', así que el concepto de tarjeta existe, pero el soporte físico no está documentado. Hay páginas de terceros que mencionan una tarjeta magnética con un costo de emisión de $50, pero traen precios de socio viejísimos ($450 / $730 / $980 / $1200 contra los $500 / $800 /",
    sources: [
      'https://socioespectacular.com.uy/beneficios',
      'https://socioespectacular.com.uy/hacete-socio/',
      'https://socioespectacular.com.uy/preguntas-frecuentes/',
      'https://socioespectacular.com.uy/nosotros/',
      'https://socioespectacular.com.uy/lugares/teatro-circular/',
      'https://socioespectacular.com.uy/pagar-cuota',
    ],
    confidence: 'alta',
  },
  {
    id: 'tarjeta-galponauta',
    name: 'Tarjeta Galponauta',
    issuer:
      'Teatro El Galpón (Av. 18 de Julio 1618, Montevideo). Se emite y administra dentro del sistema Socio Espectacular, que El Galpón fundó junto al Teatro Circular en febrero de 1997.',
    category: 'entretenimiento',
    isFree: false,
    cost: '$200 por mes. Para darte de alta pagás los primeros tres meses juntos: $600, que son también el mínimo de permanencia. Confirmado el 19/08/2026 en las dos webs oficiales: teatroelgalpon.org.uy/socio ("Convertite en Galponauta por sólo $200 mensuales... los primeros tres meses juntos, lo que equivale a $600") y socioespectacular.com.uy/beneficios ("Tarjeta Galponauta $200 por mes"). Los datos del formulario de alta repiten la cifra (plan id 49, costo 200, "$600 pago inicial (Cubre 3 meses)"). La diaria ya publicaba los $200 en abril de 2024, así que el precio lleva más de dos años sin cambios, pero ninguna fuente oficial informa si se ajusta por inflación ni cuándo.',
    digital: 'sin confirmar',
    howToGet: [
      'Camino web más directo: entrá a https://www.teatroelgalpon.org.uy/socio/ y completá el formulario. Pide nombre, apellido, email, celular y número de documento (solo números, sin puntos ni guion, con el dígito verificador). El tipo de tarjeta viene fijado por el propio formulario, así que no te…',
      'Al enviar el formulario te redirige a la pasarela de pago para abonar los $600 iniciales. El sitio avisa que hay inconvenientes con la tarjeta CABAL y pide usar otro medio de pago.',
      "Camino alternativo: https://socioespectacular.com.uy/hacete-socio/ , elegí la modalidad Mensual y seleccioná 'Tarjeta Galponauta' entre las 'otras modalidades'. Ahí el formulario pide nombre, apellido, fecha de nacimiento, número de documento, correo y celular, y ofrece tres vías de alta:…",
      'Presencial: oficina de Socio Espectacular en 18 de Julio 1618 (lunes a viernes de 10 a 19, sábados de 10 a 14) o boletería de El Galpón (martes a sábado de 18 a 21, domingo de 17 a 19). Teléfonos: 2402 9017 (Socio Espectacular) y (+598) 2408 3366 / 098 801 119 (El Galpón).',
      'Requisito de identidad: cédula de identidad. Pueden asociarse personas de cualquier edad, incluidos menores.',
      'Permanencia: el mínimo son tres meses (los que pagás al inicio). Después la cuota se cobra mes a mes y podés darte de baja cuando quieras; si pagás por débito automático de sueldo o tarjeta, la baja se pide antes del 22 del mes corriente.',
      'La cuota mensual posterior se puede pagar online en https://socioespectacular.com.uy/pagar-cuota ingresando solo el número de documento.',
      'La cuenta se gestiona en el Área de Socios de Socio Espectacular (https://socioespectacular.com.uy/login): historial de uso, forma de pago y datos personales.',
    ],
    requirements: [
      'Cédula de identidad (es el documento que pide el sistema; el número de socio son los 8 dígitos de la CI sin puntos ni guion).',
      'No hay edad mínima: pueden asociarse personas de cualquier edad.',
      'Pagar los tres primeros meses juntos ($600) al darte de alta; ese es el mínimo de permanencia.',
      'Medio de pago electrónico para la pasarela (el sitio de El Galpón avisa que CABAL está con problemas).',
      'Vivir o moverte por Montevideo: el beneficio se usa presencialmente en 18 de Julio 1618.',
    ],
    benefits: [
      'Entrada libre a todas las producciones de Teatro El Galpón. Es el beneficio central y el único que repiten las tres fuentes oficiales: la web de El Galpón, la ficha de la tarjeta en Socio Espectacular y los datos del propio formulario de alta.',
      'Preestrenos exclusivos para socios.',
      'Beneficios (entradas bonificadas) en los espectáculos invitados nacionales e internacionales que se presentan en las salas de El Galpón.',
      'Letra chica de la entrada libre, según las Preguntas Frecuentes generales de Socio Espectacular: cada obra se puede ver una vez por temporada; si reestrena en la temporada siguiente, la podés volver a ver. Dentro de la misma temporada, verla de nuevo se paga con descuento. Las FAQ no mencionan la Galponauta: es la regla del sistema, no…',
      'Las entradas se retiran en la boletería presentando la cédula, y podés mandar a otra persona con tu documento o una fotocopia. Para los espectáculos con entrada libre de El Galpón también se pueden sacar por web. (También es regla general del sistema, no específica de la Galponauta.)',
      'El precio: $200 por mes contra los $500 del plan base de Socio Espectacular, es decir 60% menos, porque el alcance se reduce a una sola sala. Existe una tarjeta gemela, la Tarjeta Circular, también a $200 por mes, con los mismos tres beneficios pero para el Teatro Circular: si dudás entre las dos, la pregunta es a qué sala vas.',
    ],
    whereValid:
      'Solo en las salas de Teatro El Galpón (Av. 18 de Julio 1618, Montevideo) para sus producciones y espectáculos invitados, más la Biblioteca Digital de Socio Espectacular (online). NO habilita el resto de la red de Socio Espectacular: los cines 2x1, Cinemateca, Cine Universitario, SODRE, carnaval en e',
    caveat:
      'Lo que NO pude confirmar y la letra chica: (1) Formato de la credencial. No hay app: el área de socios y la biblioteca son web. La web de El Galpón dice que al asociarte se entrega una tarjeta plástica personalizada con banda magnética que se lee con un POS en boletería, pero esa página de Preguntas Frecuentes está claramente desactualizada (habla de tres tipos de tarjeta a $320, $460 y $600 y de "abonar los dos primeros meses", cifras y condiciones que ya no existen). Las FAQ vigentes de Socio Espectacular, en cambio, dicen que "el/la socio/a deberá presentar su CI en las boleterías para obtener sus entradas", sin mencionar plástico. Por eso marco el formato como sin confirmar: preguntá en',
    sources: [
      'https://www.teatroelgalpon.org.uy/socio/',
      'https://socioespectacular.com.uy/beneficios',
      'https://socioespectacular.com.uy/hacete-socio/',
      'https://socioespectacular.com.uy/preguntas-frecuentes',
      'https://socioespectacular.com.uy/libros',
      'https://socioespectacular.com.uy/pagar-cuota',
    ],
    confidence: 'alta',
  },
  {
    id: 'beneficios-para-suscriptores-de-brecha',
    name: 'Beneficios para suscriptores de Brecha',
    issuer:
      'Semanario Brecha (publicación periodística independiente, fundada en 1985, Montevideo)',
    category: 'medio',
    isFree: false,
    cost: '"NO es gratis: los beneficios son un adicional de una suscripción paga, no un producto aparte. No existe cuota separada por el club. Planes mensuales en pesos uruguayos, verificados el 19 de agosto de 2026 en la web oficial: Digital $460/mes, Digital + Cinemateca $580/mes, Papel y Digital $830/mes (https://brecha.com.uy/suscribirse/). El plan de $460 aparece además dentro del propio formulario de registro, como «$460 / Mes» (https://brecha.com.uy/registro/mensual-digital/), lo que da doble confirmación de ese precio.\\n\\nLa web no publica fecha de vigencia de estos precios: son nominales y, con inflación, deben leerse como el valor a agosto de 2026, no como una cifra permanente.\\n\\nSobre el p',
    digital: 'sin confirmar',
    howToGet: [
      'Suscribirte a Brecha en https://brecha.com.uy/suscribirse/ eligiendo uno de los tres planes (Digital $460, Digital+Cinemateca $580, o Papel y Digital $830 por mes).',
      'Completar el formulario de registro con nombre, apellido, teléfono, documento de identidad, correo electrónico y contraseña (todos obligatorios, según https://brecha.com.uy/registro/mensual-digital/).',
      'Pagar. La web menciona transferencia a caja de ahorro BROU 001569133-00001 y existe una página de suscripción por MercadoPago (https://brecha.com.uy/suscripcion-mercadopago/).',
      'Una vez activa la cuenta, entrás a brecha.com.uy con tu mail y contraseña. El sitio confirma la activación en https://brecha.com.uy/gracias-suscribirte-brecha/',
      'IMPORTANTE — paso no documentado: la web oficial NO explica cómo se acredita la condición de suscriptor en el comercio (no dice si hay que mostrar cédula, número de suscriptor, un mail de confirmación o algo impreso). Para eso hay que preguntar a Brecha: suscriptores@brecha.com.uy, WhatsApp 091…',
      'Atajo al revés: si ya sos Socio Espectacular, tenés 20% de descuento sobre la suscripción a Brecha Digital, en todos los planes de Socio Espectacular (fuente: https://socioespectacular.com.uy/beneficios).',
      'Si estás afiliado a SINTEP, el sindicato ofrece un 15% adicional sobre la suscripción digital escribiendo a formacion@sintep.org.uy (fuente: https://sintep.org.uy/convenios/).',
    ],
    requirements: [
      'Ser suscriptor pago activo de Brecha (cualquiera de los tres planes; la página de beneficios no distingue entre plan digital y papel).',
      'Registro con documento de identidad, teléfono y correo electrónico obligatorios.',
      'No hay requisito de edad, profesión, gremio ni zona: alcanza con la suscripción paga.',
      'Sin confirmar: si el suscriptor mensual accede desde el primer mes o si hay antigüedad mínima. La web no lo aclara.',
      'Sin confirmar: cómo se acredita la condición de suscriptor en el mostrador del comercio.',
    ],
    benefits: [
      'Alianza Francesa: 20% de descuento en cursos regulares, semintensivos y en línea.',
      'Academia Montevideo: 20% de descuento en la cuota de cursos regulares grupales (portugués, alemán, francés, italiano, inglés).',
      'Instituto Fénix: 20% de descuento en cualquiera de los idiomas (chino, japonés, coreano, ruso y español para extranjeros).',
      'Alianza Uruguay-EEUU: 20% de descuento en cursos de inglés.',
      'Goethe Institut: 20% de descuento en cursos de alemán.',
      'ICUB: 25% de descuento en cursos de portugués (el porcentaje más alto del listado).',
      'Cafelino: 15% de descuento en menú ejecutivo gluten free, más un café de obsequio, de lunes a viernes de 12 a 14:45 (único beneficio con franja horaria publicada).',
      'Minerva Café: 10% de descuento.',
      'Fellini: 15% de descuento.',
      'Socio Espectacular: 20% de descuento en tarjetas.',
    ],
    whereValid:
      'Comercios e instituciones adheridos en Uruguay, concentrados en Montevideo: institutos de idiomas (Alianza Francesa, Academia Montevideo, Instituto Fénix, Alianza Uruguay-EEUU, Goethe Institut, ICUB), gastronomía (Cafelino, Minerva Café, Fellini), librerías y cultura (Casa Editorial HUM, Lecturas Có',
    caveat:
      'Lo que SÍ está sólido: los 18 beneficios con sus porcentajes salen textualmente de la página oficial https://brecha.com.uy/beneficios/, que está viva y es específica (nombra comercios, porcentajes, y hasta condiciones finas como el horario de Cafelino o el corte por medio de pago en Minerva Libros y Óptica Briozzo). Los tres precios de los planes están confirmados en la web oficial, y el de $460 además aparece dentro del propio formulario de registro. Lo que NO pude confirmar, y es el hueco grande de este programa: la página de beneficios enumera descuentos pero NO da ninguna instrucción operativa. No dice cómo se valida que sos suscriptor en el comercio — si mostrás cédula, número de suscr',
    sources: [
      'https://brecha.com.uy/beneficios/',
      'https://brecha.com.uy/suscribirse/',
      'https://brecha.com.uy/registro/mensual-digital/',
      'https://brecha.com.uy/contacto/',
      'https://brecha.com.uy/gracias-suscribirte-brecha/',
      'https://brecha.com.uy/suscripcion-mercadopago/',
    ],
    confidence: 'media',
  },
  {
    id: 'club-el-pais',
    name: 'Club El País',
    issuer:
      'EL PAIS S.A. — el diario El País (Zelmar Michelini 1287, CP 11100, Montevideo). Tel. 2900 41 41, lunes a viernes de 8 a 20 hs.',
    category: 'medio',
    isFree: false,
    cost: '"El plástico es gratis, el programa no. La FAQ dice textual \\"La tarjeta del CLUB ¡no tiene costo! Es un obsequio para nuestros lectores\\", pero para obtenerla hay que contratar una suscripción paga. Planes leídos en clubelpais.com.uy/suscribite/ el 2026-08-19: Digital $524/mes, \\"A partir del 4to mes $1048\\"; Digital + Papel sábado y domingo $1.755/mes; Digital + Papel todos los días $4.335/mes con tres tarjetas. Los dos planes con papel aclaran \\"Calculado en base a 4 semanas\\", así que en un mes calendario con cinco fines de semana se paga más. A eso hay que sumarle el cargo de administración y mantenimiento de $35 (IVA incluido) que habilitan los T&C 1.5, ajustable durante el contrato: e',
    digital: 'plastico',
    howToGet: [
      'Entrá a https://www.clubelpais.com.uy/ y tocá el botón "Pedí tu tarjeta", que te lleva a https://www.clubelpais.com.uy/suscribite/',
      'Elegí uno de los tres planes: Digital ($524/mes, luego $1.048), Digital + Papel sábado y domingo ($1.755/mes, 1 tarjeta) o Digital + Papel todos los días ($4.335/mes, 3 tarjetas)',
      'Completá tus datos en el formulario del sitio. Alternativa sin web: llamá al 2900 41 41, de lunes a viernes de 8 a 20 hs',
      'Tenés que ser mayor de 18 años y residir en Uruguay (T&C cláusula 1.1)',
      'Elegí medio de pago: débito automático en tarjeta de crédito (Visa, Mastercard, OCA, American Express o Creditel) o pago en Abitab o RedPagos, dentro de los primeros 15 días de cada mes',
      'Recibís la tarjeta física a tu nombre. Si contrataste el plan de todos los días, pedí además las 2 adicionales para familiares o amigos',
      'Registrate en https://autogestion.clubelpais.com.uy para gestionar la suscripción, ver "Mi Factura" y participar de sorteos',
      'Para usar un beneficio, presentá la tarjeta de socio junto con tu Cédula de Identidad ANTES de que te emitan la factura. Es personal e intransferible',
    ],
    requirements: [
      'Ser mayor de 18 años y residir en cualquier lugar del territorio de la República Oriental del Uruguay (T&C 1.1)',
      'Tener una suscripción paga vigente al diario El País: plan Full Digital o plan de Diario Papel',
      'Plazo mínimo de suscripción de 3 meses; los plazos son de 3, 6 o 12 meses (T&C 1.2)',
      'La suscripción se renueva automáticamente por igual período sin necesidad de ninguna comunicación (T&C 1.8)',
      'Estar al día en el pago mensual: el pago vence los primeros 15 días de cada mes',
      'Presentar la tarjeta física de socio junto con la Cédula de Identidad ante el establecimiento (T&C 2.1 literal c)',
    ],
    benefits: [
      'El sitemap oficial publica 180 fichas de comercio y 89 fichas de evento (crawleadas una por una el 2026-08-19)',
      'El badge más repetido es 20%: lo muestran 165 de los 180 comercios (92%). Pero ojo, es el cartel de la ficha, no necesariamente el beneficio: solo 61 de esos 165 lo dan todos los días, los otros 104 están restringidos a días fijos',
      'Los badges más altos, y estos sí todos los días: 50% en PuntoVet y Pulso (bienestar) y en Teatrix (entretenimiento, solo online), y 35% en Bath & Body Works (bienestar)',
      '25% en seis comercios, cuatro de ellos todos los días (Colonia Express, Barraca Malvín, School of Rock Montevideo, Detrés Escuela de Música) y dos solo lunes, martes y miércoles (Óptica Garese y Estela Jinchuk)',
      'El 25% de Colonia Express aplica según sus propios T&C a pasajes de ida y vuelta en tarifa económica, express o clásica (15% en otras), sin bodega, sin tasas ni impuestos, sin Day Tours, válido para el titular + 3 acompañantes y solo por Call Center o sucursales',
      '2x1 en los 89 eventos listados, sin excepción (teatro, música y danza: Daniel Drexler, Malena Muyala y Ana Prada, Las Pastillas del Abuelo, OSSODRE, Ballet Nacional Sodre, entre otros), más 2x1 en tres comercios fijos: Mundo Cartoon, Movie y FutVolt',
      'Reparto exacto por rubro de las 180 fichas: Vestimenta 59, Hogar 35, Turismo 31, Gastronomía 27, Bienestar 8, Niños 8, Educación 7, Entretenimiento 5',
      'Por modalidad de compra: 104 solo en local, 65 en local y online, 9 exclusivamente online, 1 online/boletería y 1 ficha que no declara modalidad',
      'Hoteles y alojamiento con 20% todos los días: Radisson Colonia del Sacramento, Real Colonia Hotel & Suites y Posada Plaza Mayor (Colonia del Sacramento), Gran Hotel Fray Bentos (Río Negro), Barradas Parque Hotel & Spa y Entre Pinos Eco Box (Punta del Este), Hampton by Hilton (Canelones) y Salinas del Almirón (Paysandú)',
      'Dos comercios están por debajo del estándar, con 15%: Palacio de la Música y Club del Bosque',
    ],
    whereValid:
      'Todo Uruguay. Los 180 comercios adheridos se concentran en Montevideo, pero hay presencia fuerte en Maldonado y Punta del Este (La Corniche en Punta Colorada, Entre Pinos Eco Box en Rincón del Indio), Colonia del Sacramento (Radisson, Real Colonia, Posada Plaza Mayor), Fray Bentos (Gran Hotel), Rive',
    caveat:
      'La letra chica más importante, y que el marketing no muestra: 106 de los 180 comercios (59%) NO dan el descuento todos los días — 102 de ellos lo limitan a lunes, martes y miércoles. Solo 74 comercios (41%) valen los siete días. Si pensás usarlo un viernes o un sábado, el catálogo real se te reduce a menos de la mitad. Segundo: el sitio y la prensa hablan de "más de 200 marcas", pero el sitemap oficial publica 180 fichas de comercio; el número recién cierra si le sumás los 89 eventos, así que no pude confirmar 200+ comercios como tales. Tercero: hay una contradicción sin resolver entre los T&C y los planes vigentes — los T&C (cláusula 1.2) exigen comprar un mínimo de 3 diarios por semana, re',
    sources: [
      'https://www.clubelpais.com.uy/',
      'https://www.clubelpais.com.uy/que-es-club-el-pais/',
      'https://www.clubelpais.com.uy/suscribite/',
      'https://www.clubelpais.com.uy/terminos-y-condiciones/',
      'https://www.clubelpais.com.uy/preguntas-frecuentes/',
      'https://www.clubelpais.com.uy/sitemap.xml',
    ],
    confidence: 'media',
  },
  {
    id: 'comunidad-la-diaria-programa-de-beneficios',
    name: 'Comunidad la diaria (programa de beneficios)',
    issuer: 'la diaria (diario uruguayo, Montevideo)',
    category: 'medio',
    isFree: false,
    cost: '"El programa no tiene costo adicional: «Viene incluido con cualquier suscripción de pago de la diaria» (comunidad.ladiaria.com.uy). Pero NO es gratis, porque exige suscripción paga. La puerta de entrada más barata es la Suscripción digital: $255/mes los dos primeros meses y $510/mes a partir del tercero (ladiaria.com.uy/usuarios/suscribite/DDIGM/). Otros planes publicados en ladiaria.com.uy/usuarios/planes/: Digital + fin de semana $805/mes y $1.060/mes a partir del tercer mes; Fin de semana $275/mes y $550/mes a partir del CUARTO mes; Lunes a viernes $1.100/mes y $1.750/mes a partir del cuarto mes; Lunes a sábados $2.025/mes y $2.116/mes a partir del cuarto mes; Lento $420/mes; Gigantes $40',
    digital: 'sin confirmar',
    howToGet: [
      "Contratá cualquier suscripción PAGA de la diaria en ladiaria.com.uy/usuarios/planes/. Sirve cualquier publicación del grupo (la diaria digital o papel, Lento, Gigantes, Le Monde diplomatique): el sitio dice 'Elegí cualquier suscripción de pago de la diaria para formar parte de Comunidad la…",
      'Conseguí tu número de suscripción: entrá con tu cuenta a ladiaria.com.uy, andá a tu perfil y buscalo en la sección «Tus datos», debajo de tu nombre.',
      'Si no tenés cuenta web, pedilo por teléfono al 2900 08 08 (lunes a viernes de 9:00 a 17:00) o por WhatsApp al 099128821.',
      'No hay que tramitar ninguna credencial aparte: la suscripción vigente ES la membresía. Mirá el catálogo actualizado en beneficios.ladiaria.com.uy.',
      'En el local adherido: pedí el descuento al pagar dando alguno de estos datos: número de suscripción, correo electrónico o número de celular asociado a la suscripción.',
      'Para entradas en Tickantel: registrate si no tenés usuario, elegí la función, seleccioná la tarifa «2x1 la diaria» seguida de tu número de suscripción, la cantidad de entradas y el medio de pago.',
      'Para entradas en RedTickets: elegí la función, seleccioná la tarifa «la diaria 2x1» e ingresá tu número de suscripción.',
      'Para entradas en MiEntrada: ingresá tu número de suscriptor en el campo que dice «cupón de descuento».',
    ],
    requirements: [
      'Tener una suscripción PAGA y vigente a cualquier publicación de la diaria (digital, papel, Lento, Gigantes o Le Monde diplomatique).',
      "Mantener el pago al día: el número de suscripción, según el centro de ayuda, 'indica que mantenés tu pago vigente'.",
      'Saber tu número de suscripción (o tener a mano el correo o el celular asociado a la suscripción) para pedir el beneficio.',
      'Para las compras de entradas online, tener usuario en la plataforma correspondiente (Tickantel, RedTickets o MiEntrada).',
      'Para el convenio Casmu, además hay que gestionar la afiliación directamente con Casmu por teléfono.',
    ],
    benefits: [
      'Librerías: 20% o 15% de descuento en una red de 17 librerías adheridas — La Lupa, Club Cultural Charco, Moebius, América Latina, El Virrey, Lecturas Comics, Amazonia, Osolibros, Lautréamont, Librería Montevideo, Librería Pocho, Afrodita Libros, La Libélula, Librería Lannister, Pocitos Libros, El Yelmo del Mambrino y Amuleto. El portal…',
      'Librería Montevideo (Tristán Narvaja 1536): 15% de descuento en locales Y en la web, según su ficha oficial.',
      'Guarida (Héctor Miranda 2410), centro cultural y librería: 15% de descuento, válido para la librería y NO para los talleres. La ficha aclara además que quienes forman parte de la comunidad de Guarida suman un 15% adicional al descuento de suscriptor.',
      'Café la diaria (Bacacay 1306 esq. Buenos Aires): 15% de descuento todos los días, con una exclusión que la ficha publica al pie: no vale para el menú ejecutivo.',
      'Teatro y música: 2x1 en espectáculos. La Comedia Nacional (Intendencia de Montevideo) lo lista en su propia página con la línea textual «Comunidad La Diaria: 2x1», junto a otros convenios como Club El País (2x1) y FUCVAM (20% de descuento).',
      'El 2x1 se aplica comprando en las boleterías online Tickantel (tarifa «2x1 la diaria»), RedTickets (tarifa «la diaria 2x1») y MiEntrada (número de suscriptor en el campo «cupón de descuento»).',
      'Cartelera 2x1 publicada al momento de la consulta —rota y caduca sola—: Comerse un Hipopótamo, Bruno Roth «vengo del sur», El Herrero y la Muerte, Autopsia de un buzo marrón, Santi Wirth «Mapa» y Ecléctico.',
      'Salud (convenio Casmu): cuota bonificada del plan 1727 el primer año ($727 por mes) y 3 medicamentos PIAS para todos sin importar edad. De 0 a 39 años (Fonasa o particular) suma órdenes de urgencia, especialistas, pediatría, fisioterapia, emergencia móvil, análisis de sangre y orina, sesiones de gimnasio y piscina, 3 tickets de…',
      'El portal organiza el catálogo en las categorías vigentes: espectáculos, formación, librerías, gastronomía, infantiles y otros.',
      'No hay credencial: te identificás con el número de suscripción, el correo o el celular asociados a la suscripción. Las preguntas frecuentes oficiales no mencionan ni plástico ni app.',
    ],
    whereValid:
      'Uruguay, con red concentrada en Montevideo. Comercios físicos adheridos (librerías, gastronomía, centros culturales), más algunos casos con web propia (Librería Montevideo aclara "15% de descuento en locales y web"). Para espectáculos vale en las boleterías online Tickantel, RedTickets y MiEntrada,',
    caveat:
      'No pude confirmar varias cosas y conviene decirlas: (1) NO hay tarjeta. Ni plástico ni app dedicada: te identificás cantando tu número de suscripción, correo o celular, y en las boleterías lo tipeás como tarifa o cupón. Las preguntas frecuentes oficiales no mencionan credencial física ni aplicación, así que marqué "sin confirmar" en vez de elegir una opción que el sitio no respalda. (2) El sitio agrupa las librerías bajo "20% o 15% de descuento" sin decir cuál da cuál; el único porcentaje que verifiqué por ficha individual es el 15% de Librería Montevideo y el 15% de Guarida. No sé qué comercio da el 20%. (3) Las fichas no publican vigencia, tope de usos por mes, ni si el beneficio es acumul',
    sources: [
      'https://beneficios.ladiaria.com.uy/',
      'https://beneficios.ladiaria.com.uy/preguntas-frecuentes/',
      'https://beneficios.ladiaria.com.uy/accede-a-tus-libros-favoritos/',
      'https://beneficios.ladiaria.com.uy/libreria-montevideo-15-de-descuento/',
      'https://beneficios.ladiaria.com.uy/guarida/',
      'https://beneficios.ladiaria.com.uy/casmu/',
    ],
    confidence: 'media',
  },
  {
    id: 'programa-de-beneficios-el-observador-member',
    name: 'Programa de beneficios El Observador Member',
    issuer:
      'El Observador (diario uruguayo). El portal de beneficios lo opera Bonda / Cuponstar como plataforma white-label (site id 911451, contacto beneficioselobservador@bonda.com).',
    category: 'medio',
    isFree: false,
    cost: '"NO es gratis: es un adicional de la suscripción paga a El Observador. Precios leídos en elobservador.com.uy/planes el 19/08/2026, en USD y con el descuento promocional de 50% los primeros 3 meses: Member Básico USD 3,45/mes los primeros 3 meses y USD 6,90/mes desde el 4º (anual USD 72,45); Member Pro USD 5,95 y luego USD 11,90 (anual USD 124,95); Member Full USD 9,45 y luego USD 18,90 (anual USD 198,45). Sobre qué plan habilita el portal hay una contradicción SIN RESOLVER en la propia web del diario: el anuncio oficial del 02/07/2025 dice que es para los planes Pro y Full y que desde Básico hay que cambiar de categoría, pero la página /planes vigente muestra el bullet de sorteos y beneficio',
    digital: 'app',
    howToGet: [
      'Suscribirte a un plan Member Pro o Member Full en https://www.elobservador.com.uy/planes (se paga en USD, mensual o anual). Si ya sos Member Básico, tenés que cambiar de categoría desde Mi Cuenta > Datos de facturación > Cambiar plan.',
      'Entrar a https://beneficios.elobservador.com.uy/ (el catálogo se puede mirar sin loguearse, pero no canjear).',
      "Tocar 'Iniciar sesión' en el menú (o en el menú hamburguesa en el celular). El usuario de la plataforma es tu CÉDULA DE IDENTIDAD, no el mail de El Observador: la configuración del sitio declara accesstype 'Cédula de Identidad'.",
      "Buscar el cupón en la sección 'Descuentos' (filtros, buscador y 'ordenar por').",
      "Tocar 'Quiero este cupón': te lleva a la página de la orden con el código. Si registraste tu email, también te llega el código o el enlace por ahí.",
      "Usar el código según la etiqueta: 'En tienda' = lo presentás al pagar en el local adherido; 'Online' = lo pegás en el checkout del sitio de la marca.",
      'Opcional: agregar el sitio a la pantalla de inicio del celular (es una PWA; no hay app nativa en App Store ni Play Store, ni tarjeta de plástico).',
    ],
    requirements: [
      'Tener una suscripción paga ACTIVA a El Observador Member en plan Pro o Full. El plan Básico queda afuera según el anuncio oficial.',
      'Cédula de identidad uruguaya: es el identificador con el que se inicia sesión en el portal de beneficios.',
      "La plataforma valida contra el padrón de socios: si tu CI no está o dejaste de ser suscriptor, el sitio devuelve 'Oops! Parece ser que ya no formás parte del programa de beneficios'.",
      'Para las clases de Bienestar en vivo hace falta tener Zoom instalado.',
      'Los cupones en general NO son acumulables con otras promociones del comercio (salvo excepciones como Samsung).',
    ],
    benefits: [
      'El Observador anunció el 02/07/2025 un programa de beneficios para suscriptores Member con "más de 450 beneficios". Es la cifra que declara el propio anuncio, no un conteo verificado: el catálogo rota y el número redondo es comunicación institucional.',
      'Según ese anuncio oficial, los descuentos cubren gastronomía, indumentaria, educación, turismo, entretenimiento, gimnasios y vehículos.',
      'El programa no es solo cupones: el anuncio menciona además actividades de bienestar y de capacitación para suscriptores.',
      'Se accede por un portal aparte, beneficios.elobservador.com.uy, enlazado desde la propia sección Member del diario.',
      'El portal no es desarrollo del diario: es una plataforma white-label de Bonda / Cuponstar. Se comprueba en el HTML servido: carga el bundle desde cdn.cuponstar.com (PWA v7.14.3), las imágenes desde cuponstar-ar.s3.amazonaws.com, declara el tenant "(911451) Beneficios El Observador" y ofrece ayuda en web@bonda.com. Implica que varios…',
      'Es una web/PWA instalable, no una tarjeta de plástico: el manifest.json declara display standalone e íconos de instalación, así que se agrega a la pantalla de inicio del celular.',
      'El portal está activo y mantenido: responde 200 y su build declarado es del 21/07/2026.',
    ],
    whereValid:
      'Uruguay. El filtro de localidades del portal lista departamentos y ciudades uruguayas (Montevideo, Canelones, Ciudad de la Costa, Las Piedras, Maldonado, Punta del Este, José Ignacio, Colonia, Rocha, La Paloma, Paysandú, Rivera, Artigas, Cerro Largo, Durazno, Flores, Florida, Lavalleja, Río Negro y',
    caveat:
      'Lo que NO pude confirmar y la letra chica: (1) No tengo suscripción, así que no verifiqué el canje logueado de punta a punta; leí el catálogo sin login porque el portal está configurado como sitio abierto, pero obtener el código exige iniciar sesión con CI. (2) Hay una contradicción en la propia web de El Observador: la página /planes muestra el mismo bullet "Sorteos y beneficios exclusivos" en los TRES planes, incluido Básico, y su FAQ "¿Qué ofrece cada plan?" ni menciona el portal de beneficios (está desactualizada, es anterior al lanzamiento). Me quedé con el anuncio oficial del 02/07/2025, que dice que hay que ser Pro o Full y que desde Básico hay que cambiar de categoría; si te importa',
    sources: [
      'https://beneficios.elobservador.com.uy/',
      'https://www.elobservador.com.uy/cafe-y-negocios/el-observador-lanza-un-programa-mas-450-beneficios-suscriptores-member-n6006839',
      'https://www.elobservador.com.uy/planes',
      'https://www.elobservador.com.uy/nota/-que-es-el-observador-member--20181117192839',
      'https://www.elobservador.com.uy/member',
    ],
    confidence: 'media',
  },
]

/**
 * Programas que la gente busca y NO existen (o no son lo que parecen).
 *
 * Cada uno es un hallazgo NEGATIVO verificado: alguien ya fue a buscarlo y confirmó que no hay
 * club, que el programa es de otro país o que el "programa" es en realidad una tarjeta bancaria.
 * Publicarlo ahorra la búsqueda.
 */
export interface MembershipMyth {
  name: string
  finding: string
}

export const MEMBERSHIP_MYTHS: MembershipMyth[] = [
  {
    name: 'Tarjeta Joven (INJU/MIDES)',
    finding:
      'Hoy es una tarjeta de DÉBITO Visa del BROU emitida en el marco del convenio con INJU/MIDES, no una credencial de socio: por eso queda fuera de esta lista, que es de tarjetas no bancarias.',
  },
  {
    name: 'Grupocine y LIFE Cinemas',
    finding:
      'No tienen club de socios, tarjeta de fidelidad ni programa de puntos propio. Los descuentos que aparecen en sus salas los pone un tercero (por ejemplo el beneficio de Antel).',
  },
  {
    name: 'Cines Movie',
    finding:
      'Tampoco tiene club propio: su API pública de beneficios devuelve promociones cuyo emisor es siempre un tercero, y sus preguntas frecuentes no mencionan socios, club ni membresía.',
  },
  {
    name: 'YPF ServiClub',
    finding:
      'Existe, pero es argentino: el reglamento vigente está fechado en Buenos Aires y el portal no contempla Uruguay. No hay versión uruguaya.',
  },
  {
    name: 'Puma Pris',
    finding:
      'El sitio de Puma Pris lista seis países (Argentina, El Salvador, Guatemala, Honduras, Nicaragua y Panamá) y Uruguay no está entre ellos.',
  },
  {
    name: 'Búsqueda / Galería',
    finding:
      'La suscripción da acceso a contenido, no a un club de beneficios: no hay comercios adheridos, credencial ni reintegros.',
  },
  {
    name: 'Montevideo Portal y Ovación',
    finding:
      'No tienen club de socios ni membresía de beneficios; tampoco muro de pago para lectores.',
  },
]
