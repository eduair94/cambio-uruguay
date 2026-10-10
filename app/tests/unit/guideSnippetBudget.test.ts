import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { guides } from '../../utils/guides'

/**
 * El presupuesto de caracteres del snippet de las guías de `/guias/*`.
 *
 * `seoTitleBudget.test.ts` y `seoDescriptionBudget.test.ts` ya miden esto, pero los dos leen
 * `pages/**\/*.vue`: buscan el literal que la página escribe en su `useSeoMeta`. Las guías no
 * escriben ninguno. Las 146 viven en una ruta sola, `pages/guias/[slug].vue`, que compone su
 * `<title>` y su `description` con los campos del catálogo (`utils/guides.ts` y los nueve módulos
 * que le agrega), así que los dos presupuestos las leen como UNA página y los otros 145 snippets
 * no los medía nadie.
 *
 * No es un rincón del sitio: es el tramo `contenido`, que rinde 8× el promedio del sitio
 * (`classes/revenueplan/value.ts`), o sea el lugar donde un snippet cortado cuesta más caro. La
 * primera medición, el 2026-10-01, encontró **116 de 146 títulos pasados de 60 caracteres y 89
 * descripciones pasadas de 155** — más de la mitad del catálogo en cada señal, con el mismo
 * defecto que la primera corrida sobre las páginas: lo que se pierde es la cola, que es donde
 * está la cifra.
 *
 * LOS DOS NÚMEROS SÓLO PUEDEN BAJAR. Si CI falla acá, la guía que agregaste o editaste no entra
 * entera en el SERP: dejá el dato adelante y recortá (43 caracteres o menos para el título, que
 * los otros 17 se los lleva la marca; 155 para la descripción).
 */
const MAX_TITLE = 60
const MAX_DESCRIPTION = 155

/**
 * Espejo del `<title>` de `pages/guias/[slug].vue`, que lo arma como
 * `` `${guide.value?.title ?? 'Guía'} | Cambio Uruguay` ``: la marca se agrega SIEMPRE, sin la
 * condición del `titleTemplate` de `app.vue`. Medir el título solo daría 17 caracteres de más y
 * dejaría pasar exactamente el título que el SERP recorta. El último test de este archivo es el
 * que impide que esta copia mienta.
 */
const rendered = (title: string) => `${title} | Cambio Uruguay`

const GUIDE_PAGE = readFileSync(join(__dirname, '..', '..', 'pages', 'guias', '[slug].vue'), 'utf8')

/**
 * Cuántas guías tiene el catálogo. Es el contrapeso de los dos presupuestos de abajo: sin un piso,
 * borrar una guía larga bajaría la deuda sin arreglar nada.
 */
const MEASURED = 146

/**
 * 116 → 104 el 2026-10-02: los doce títulos más largos del catálogo, de 104 a 84 caracteres
 * contando la marca (el peor era más de dos veces el presupuesto).
 *
 * Mismo criterio que las corridas de descripciones, y el mismo patrón, que acá pesa más porque el
 * título es lo único del snippet que decide el clic: los doce gastaban el renglón en la ETIQUETA
 * DEL TEMA y después anunciaban el ÍNDICE de la guía («Precio del oro en Uruguay: cómo se cotiza y
 * dónde comprarlo o venderlo», «Cajeros automáticos en Uruguay para turistas: redes, límites y
 * comisiones», «Cómo elegir la tarjeta de crédito con mejores beneficios en Uruguay»), o sea
 * prometían las secciones en vez de contestar. Y la cola —la parte que el SERP corta— era justo
 * donde estaba la respuesta.
 *
 * Ahora cada título la trae adelante: que la onza troy son 31,1035 g, que 1 USDT vale casi USD 1 y
 * no es un dólar billete, que el domingo casi todas las casas de cambio cierran, que con tarjeta
 * del exterior el hotel va sin IVA, que en el cajero pagás dos comisiones (la de la red y la de tu
 * banco), que en AliExpress la cuenta es la franquicia anual de USD 800 o el 60 % del régimen
 * simplificado, que el depósito de alquiler es tuyo, que lo que baja el precio de un dólar es el
 * deterioro y no la «cara chica», que el dólar no se predice, que una moneda poco operada se paga
 * con más spread, que al casarte sin capitulaciones rige la sociedad conyugal y que la mejor
 * tarjeta depende de cómo gastás.
 *
 * Ninguna cifra es nueva: todas ya estaban en el cuerpo de su guía. Y ninguna se escribió con más
 * firmeza que la fuente — el cuerpo dice que en Carrasco se cambia «prácticamente las 24 horas»,
 * así que el título usa el dato que sí es categórico (el domingo cierran) y no inventa un horario.
 *
 * 104 → 92 el 2026-10-03, segunda tanda de títulos: doce pasados del presupuesto, de 83 a 77
 * caracteres contando la marca. Mismo defecto y misma cura, con un cuidado extra: estos doce no
 * eran sólo largos, eran la ETIQUETA seguida del índice en su forma más pura («Criptomonedas en
 * Uruguay: regulación e impuestos (qué dice la ley)», «Comisión inmobiliaria en Uruguay: cuánto
 * cobran y quién paga»), o sea prometían las secciones y la respuesta caía del lado cortado.
 *
 * Ahora cada uno contesta: que el dólar fiscal es la cotización de COMPRA del BROU del día hábil
 * anterior, que las criptomonedas son activos y no moneda de curso legal, que en una cuenta
 * conjunta indistinta cualquiera de los dos retira todo el saldo sin consultar, que los billetes
 * van de $ 20 a $ 2.000 y las monedas de 1 a 50, que la UI ajusta por el IPC, que un préstamo se
 * compara por su costo total y nunca por la cuota, que primero se ahorra y mucho después se
 * invierte, que en una compra del exterior la cuenta es la franquicia anual de USD 800 o el 60 %
 * del régimen simplificado, que la reforma jubilatoria sube la edad por generación y no para todos
 * a la vez, que la separación de bienes se pacta ANTES de casarse (después ya no hay
 * capitulaciones, hay disolución judicial), que la comisión inmobiliaria no tiene tope legal —el
 * 3 % más IVA sale de un arancel privado de la Cámara, de 2007— y que el débito gasta lo tuyo
 * mientras el crédito te presta.
 *
 * Ninguna cifra es nueva y ninguna se escribió con más firmeza que su fuente, que acá descartó dos
 * títulos ya redactados: la guía de cripto dice expresamente que el tratamiento impositivo NO está
 * resuelto, así que el título afirma lo único categórico y se calla el impuesto; y la de débito vs
 * crédito iba a decir que el débito baja el IVA y el crédito no, cuando su propio cuerpo dice que
 * la rebaja de la Ley 19.210 es de «la tarjeta de débito y otros medios electrónicos» —el crédito
 * es uno— y que el porcentaje vigente hay que verificarlo. Por la misma razón el de jubilaciones
 * dice «edad por generación» y no una edad.
 *
 * Y TRES de los doce títulos más largos se quedaron sin tocar aunque estaban redactados: sus rutas
 * (`/guias/me-certifique-subsidio-por-enfermedad-uruguay`,
 * `/guias/no-pagar-prestamo-e-irse-del-pais-uruguay`,
 * `/guias/trabajar-para-el-exterior-desde-uruguay`) están dentro de la ventana abierta de
 * `descripciones-de-las-guias-respuesta-primero`, que cierra el 2026-10-29, y `AGENTS.md` es
 * explícito en que dos filas sobre las mismas rutas arruinan la medición de las dos. Entraron en su
 * lugar los tres más largos con la ruta libre. Esos tres entran cuando su ventana cierre.
 *
 * 92 → 80 el 2026-10-03, tercera tanda: doce más, de 78 a 74 caracteres contando la marca.
 *
 * Misma cura y, otra vez, el mismo defecto de origen: once de los doce eran la ETIQUETA DEL TEMA
 * seguida del índice de la guía («Alquiler temporario y Airbnb en Uruguay: lo que hay que saber»,
 * «Billeteras digitales en Uruguay: cómo funcionan y cuál elegir», «TEA, TNA y CFT: cómo entender
 * el costo real de un crédito»), o sea prometían las secciones y dejaban la respuesta del lado que
 * el SERP corta. El doceavo, `/guias/garantias-de-alquiler-uruguay`, era lo contrario de una
 * etiqueta y fallaba igual: enumeraba los cinco proveedores («ANDA, Contaduría, Porto, Sura o
 * Mapfre») sin decir cuánto cuesta ninguno, que es la pregunta.
 *
 * Ahora cada uno contesta: que el anfitrión de un temporario paga IRPF, que una billetera de
 * dinero electrónico no es un banco, que en la garantía de alquiler se paga 3 % mensual (retención)
 * o una prima (seguro de fianza), que los derechos posesorios se titulan a los veinte años, que la
 * cédula de un argentino sale de la residencia Mercosur y no de un trámite propio, que BILLETE es
 * el dólar en efectivo y CABLE el que va o viene del exterior, que si no pagás el prendario te
 * rematan el auto, que al cobrar del exterior el costo está en el retiro y no en la acreditación,
 * que una suba de tasas de la Fed tiende a un dólar global más fuerte, que un crédito se compara
 * por el costo total y nunca por la cuota, que para comprar dólares online hace falta cuenta
 * habilitada, y que en pareja lo que rompe la confianza son las deudas ocultas.
 *
 * Ninguna cifra es nueva: el 3 % y los veinte años ya estaban en el cuerpo de su guía. Y ninguna se
 * escribió con más firmeza que su fuente, que acá descartó dos redacciones: el de billeteras iba a
 * decir «sin garantía COPAB» cuando su propio cuerpo dice que el saldo no está cubierto
 * «directamente» —el matiz no es adorno, los fondos sí quedan respaldados según la normativa del
 * BCU—, así que el título afirma la diferencia que la guía sí da por categórica; y el de la Fed
 * conserva el «tiende» porque el cuerpo avisa que «no es una regla matemática», y además dice
 * «dólar global» para no prometer la cotización uruguaya, que la guía explica que tiene su propia
 * dinámica.
 *
 * 80 → 68 el 2026-10-04, cuarta tanda, y la primera que arregla las DOS señales de la misma guía.
 *
 * Las tres tandas anteriores tocaron sólo el título y la corrida de descripciones del 2026-10-01
 * sólo la descripción, así que cada guía gastaba una fila del libro de cambios por mitad de
 * snippet. Los dos contadores miden el MISMO renglón de doce guías, y de las 146 hay 43 pasadas de
 * los dos presupuestos con la ruta libre: arreglar las dos en la misma fila baja los dos
 * contadores doce y declara UN sujeto, que es además el único honesto —el visitante ve el título y
 * la descripción juntos, y medirlos por separado sobre la misma URL es lo que `AGENTS.md` prohíbe.
 *
 * Mismo defecto de siempre en los doce: la ETIQUETA DEL TEMA seguida del índice («Cómo comprar
 * criptomonedas en Uruguay (sin perderte)», «Cómo pagar la patente SUCIVE: dónde, cuándo y
 * convenios», «Comparativa de crédito hipotecario en Uruguay»), con la respuesta del lado que el
 * SERP corta. Ahora cada título contesta: que los feriados pagos son cinco y el resto no se paga
 * doble, que la plataforma de cripto tiene que estar registrada como PSAV ante el BCU, que el
 * trabajo en negro se comprueba en tu propia historia laboral del BPS, que Mercado Libre cobra
 * entre 11,5 % y 17 % por venta, que la patente vence el 20 de cada mes impar, que el BHU presta
 * sólo en UI, que una unipersonal se abre inscribiéndose en DGI y BPS, que para cambiar dólares
 * piden documento desde el orden de USD 3.000 diarios, que no hay derecho general a cancelar un
 * préstamo antes de tiempo, que los comprobantes de la DGI se guardan 5 años y las constancias de
 * deuda 10, que el interés compuesto gana sobre los intereses ya acumulados y que entre cashback y
 * millas lo decide cuánto viajás.
 *
 * Ninguna cifra es nueva: las cinco fechas del artículo 18 de la Ley 12.590, el IVA mínimo del
 * Literal E, el 11,5–17 %, el umbral de USD 3.000 y los plazos del Código Tributario ya estaban en
 * el cuerpo de su guía. Y ninguna se escribió con más firmeza que su fuente: el umbral de dólares
 * va como «desde USD 3.000» porque el cuerpo dice «del orden de»; el de cancelación anticipada cita
 * a Defensa del Consumidor en vez de afirmar la regla por su cuenta; y el de cripto se calla el
 * impuesto, que la propia guía declara sin resolver.
 *
 * Y uno de los doce dejó un hallazgo que no era del SERP: el BUSCADOR DEL PROPIO SITIO. La guía del
 * hipotecario iba a titularse «Crédito hipotecario: el BHU presta sólo en UI», y `scoreDocs` de
 * `utils/siteNav.ts` puntúa 74 un título que EMPIEZA por lo tipeado contra 56 uno que sólo lo tiene
 * como palabra, así que escribir «Crédito» adelante le robaba a `/prestamos-uruguay` el primer
 * resultado de la palabra «credito» —justo la página que `searchIndex.test.ts` exige primera porque
 * un lector la reportó inalcanzable—. El título quedó «El crédito hipotecario del BHU, sólo en UI»:
 * contesta igual y no empieza por el término. Vale para toda tanda futura: un título de guía que
 * arranca con una palabra genérica que otra página reclama se mide en los dos buscadores, no en uno.
 *
 * 68 → 58 el 2026-10-05, quinta tanda, otra vez el snippet entero de las mismas doce guías. Lo que
 * cambia en esta tanda no es el criterio sino CÓMO SE ELIGEN las doce: de las cien guías que
 * quedaban pasadas de alguno de los dos presupuestos, treinta y seis están dentro de una ventana de
 * medición abierta de `docs/seo/experiments.json` —las cuatro tandas anteriores, que se declararon
 * entre el 1 y el 4 de octubre y cierran hasta el 1 de noviembre—. Tocarles el snippet hoy le
 * cambia el sujeto al experimento que las está midiendo, así que la tanda se eligió entre las 64
 * libres y por mayor sobrante total (título más descripción), no por la lista cruda de las más
 * largas. Es la misma reserva que `seoContract.test.ts` aplica a las migas y
 * `temaHuerfanas.test.ts` a las huérfanas.
 *
 * Diez de los doce títulos estaban pasados, de 74 a 63 caracteres contando la marca, y el defecto
 * es el de siempre: la pregunta en vez de la respuesta («¿Cómo obtener la ciudadanía uruguaya?
 * Requisitos y plazos», «Saldo a favor en la tarjeta de crédito: cómo funciona», «Alias para
 * transferir: cómo funciona con tu celular»). Ahora contestan: tres años de residencia con familia
 * constituida y cinco sin ella, que el saldo a favor no se pierde, que el alias uruguayo es el
 * celular y no tres palabras, que la cesión de la deuda no te obliga hasta que te notifiquen, que
 * en Argentina el dólar lo pone la red de la tarjeta y que recibir un SWIFT arranca en US$ 17,50.
 *
 * Y dos aplicaciones de la regla del buscador propio que este comentario dejó escrita en la tanda
 * anterior. El título de la bolsa de Estados Unidos no puede arrancar por «Invertir» —`scoreDocs`
 * puntúa 74 un título que EMPIEZA por lo tipeado contra 56 el que sólo lo contiene, y la palabra la
 * reclaman `/inversiones-uruguay` y `/invertir-en-proyectos-uruguayos`, que `searchIndex.test.ts`
 * exige primera—, así que quedó «Bolsa de USA desde Uruguay: broker e IRPF». Y el del supergás no
 * lleva la fecha en el título porque no entra, así que la cifra va con su fecha en la descripción:
 * un precio regulado que el Ejecutivo revisa todos los meses no se publica como si fuera perpetuo.
 *
 *
 * 58 → 46 el 2026-10-06, sexta tanda, otra vez el snippet entero de las mismas doce guías y con el
 * criterio de selección que dejó escrito la quinta: de las guías pasadas de alguno de los dos
 * presupuestos, las que están dentro de una ventana de medición abierta de
 * `docs/seo/experiments.json` no se tocan. Lo que cambió hoy es de dónde salen las doce. Las cinco
 * tandas anteriores vaciaron el solapamiento grande: de las 146 guías quedan **23 pasadas de los
 * DOS presupuestos a la vez y sólo 21 con la ruta libre**, así que la tanda ya no se elige entre
 * decenas de candidatas sino que es casi todo lo que queda arreglable en una fila honesta del libro
 * de cambios. Los sobrantes también se achicaron —de 17 a 10 caracteres sumando las dos señales,
 * contra los 44 de la primera tanda de títulos—, que es la forma que tiene este ratchet de decir
 * que la deuda que sobra ya no es de longitud sino de redacción: lo que queda pasado de un solo
 * presupuesto se arregla cuando cierren las ventanas que lo miden.
 *
 * El defecto, en cambio, es el mismo y vale nombrarlo porque acá convive con su variante: seis de
 * los doce títulos eran la PREGUNTA del lector en vez de la respuesta («¿Cuál es la moneda de
 * Uruguay?», «¿Puedo pedir que me despidan en vez de renunciar?», «Devoluciones en tiendas: ¿te
 * las tienen que aceptar?», «Monto mínimo para pagar con débito: ¿es legal?»), que es peor que la
 * etiqueta: repite la consulta que el visitante acaba de escribir y no le adelanta nada. Los otros
 * seis eran la etiqueta del tema seguida del índice («Costos de escrituración al comprar una casa
 * en Uruguay», «Monotributo en Uruguay: qué es y cuándo conviene», «Cuántos dólares llevar de
 * viaje y cómo conseguirlos»).
 *
 * Ahora cada uno contesta: que la moneda es el peso (UYU), que el título del auto NO es
 * obligatorio, que el despido lo decide la empresa y no el trabajador, que devolver en el local no
 * es un derecho, que escriturar una casa sale entre el 5 % y el 8 % del precio, que antes de
 * invertir se salda la deuda cara, que el monotributo es un pago mensual al BPS, que la jubilación
 * del BPS se gira al exterior, que cuántos dólares llevar se decide por el gasto y no por la
 * cotización, que el mínimo para el débito es legal, que el sepelio lo reintegra el BPS a quien
 * pagó y que casi siempre conviene pagar en pesos.
 *
 * Ninguna cifra es nueva: el 5-8 % y el 3 % de honorarios, el 2 % del ITP, los topes de 183.000 y
 * 305.000 UI, los US$ 8 del BROU, los 90 días de fe de vida, los $ 44.716 y los 180 días del
 * sepelio, el art. 224 de la LUC y el art. 85 de la Ley 16.871 ya estaban en el cuerpo de su guía.
 * Y ninguna se escribió con más firmeza que su fuente, que acá descartó tres redacciones. El de
 * escrituración lleva «Orientativo» en la descripción porque el cuerpo dice «como referencia
 * práctica y orientativa» y además avisa que los porcentajes cambian. El del título del auto no
 * publica la tasa del Registro ($ 2.530) en el snippet: el cuerpo la fecha en «setiembre de 2026»
 * y una tasa sin su fecha es el error recurrente del repo, así que el snippet se queda con lo que
 * no se mueve —que la inscripción es voluntaria y que es carga del comprador—. Y el del sepelio
 * deja los $ 44.716 en la DESCRIPCIÓN, con el mes desde el que rigen, y usa el título para la
 * respuesta estructural que nadie espera (el BPS le paga a quien pagó el sepelio, aunque sea un
 * tercero, y no a la familia por ser familia).
 *
 * Y una tercera aplicación de la regla del buscador propio. `scoreDocs` puntúa 110 un título que
 * EMPIEZA por lo tipeado, y medido antes de redactar: «invertir» lo gana `/inversiones-uruguay`
 * (68) y «despido» lo gana `/guias/despido-y-liquidacion-uruguay` (110). Por eso el título de
 * cómo empezar a invertir quedó «Antes de invertir, saldá la deuda cara» y el de pedir el despido
 * «El despido lo decide la empresa, no vos»: los dos contestan y ninguno abre con la palabra que
 * otra página ya reclama. Se verificó después del cambio que los dos primeros puestos siguen
 * siendo los mismos.
 *
 * 46 → 37 el 2026-10-07, séptima tanda: nueve guías elegidas por estar pasadas en LAS DOS señales
 * a la vez, así que la misma reescritura baja los dos presupuestos y entra como una sola fila del
 * libro de cambios. Los títulos iban de 69 a 61 caracteres contando la marca.
 *
 * Siete de los nueve eran otra vez la ETIQUETA DEL TEMA seguida del índice («Euros y reales en
 * Uruguay: dónde y cómo cambiarlos», «Errores comunes y estafas al invertir en Uruguay», «Comprar
 * una casa en remate en Uruguay: cómo funciona»), y los otros dos eran la PREGUNTA del visitante
 * devuelta sin contestar («¿Cuál es el mejor momento para cambiar divisas?», «¿Cuándo prescribe
 * una deuda privada en Uruguay?»), que es el mismo defecto con otra cara: gasta el renglón en
 * repetir la consulta y deja la respuesta del lado que el SERP corta.
 *
 * Ahora cada uno contesta: que al comprar lo que te cuesta es la VENTA de la casa y no su compra
 * (la columna que todo el mundo mira al revés), que fuera del día hábil el precio queda congelado
 * en la última referencia, que el euro y el real se arbitran contra el dólar, que un rendimiento
 * alto y garantizado no existe, que la acción personal prescribe a los diez años, que en 2025 la
 * canasta del BPS fue de $ 3.151, que del nominal se descuenta 15 % de jubilatorio, que los
 * gananciales se reparten por mitades y que el remate judicial va sin base y al mejor postor.
 *
 * Ninguna cifra es nueva: todas ya estaban en el cuerpo de su guía. Y ninguna se escribió con más
 * firmeza que su fuente, que acá descartó dos redacciones. El título del remate iba a decir que la
 * seña «es 10 %», cuando el CGP dice que NO PUEDE SER MENOR al 10 % que fija el tribunal: es un
 * piso, no la cifra, así que el título se queda con lo que sí es categórico (sin base, al mejor
 * postor) y el piso va en la descripción con su «no menor al». Y la descripción del remate NO
 * publica las condiciones de la ANV (base del 50 %, seña del 5 %, comisión del 1 % más IVA): el
 * cuerpo las fecha «a setiembre de 2026» y el snippet no tiene lugar para esa fecha, que es el
 * error recurrente del repo, así que dice que la ANV va con otras reglas y deja los números
 * fechados en el cuerpo. Por lo mismo el recibo de sueldo conserva los matices del cuerpo en el
 * snippet («aprox. 3 % a 8 %» para el FONASA, «del orden del 0,1 %» para el FRL) en vez de
 * publicar esos dos porcentajes como exactos, y la canasta del BPS lleva el año adelante («En 2025
 * …») porque es un monto que un decreto nuevo cambia cada año.
 *
 * 37 → 25 el 2026-10-08, octava tanda: doce títulos de 73 a 66 caracteres contando la marca, y la
 * tanda se eligió con un filtro nuevo que conviene dejar escrito, porque de acá en adelante decide
 * más que el largo. De los 37 títulos pasados, 35 pertenecen a guías que están DENTRO de una
 * ventana de medición abierta de `docs/seo/experiments.json` (las siete tandas anteriores se
 * declararon entre el 2 y el 7 de octubre), y `AGENTS.md` es explícito: dos filas sobre las mismas
 * rutas arruinan la medición de las dos. Reescribir hoy el título que una fila está midiendo le
 * cambia el sujeto al experimento. Así que la tanda sale de las 23 que NO tienen ventana abierta
 * —la misma reserva que `temaHuerfanas.test.ts` y `seoDescriptionBudget.test.ts` ya aplican— y
 * toma sus doce más largas; las 14 reservadas entran cuando su ventana cierre.
 *
 * De las catorce más largas sin ventana quedaron dos afuera, las dos por la misma razón, que es la
 * que marca el techo de este trinquete: su término de cabecera no deja lugar para una respuesta.
 * «Certificado Único Departamental» son 31 caracteres de los 43 disponibles, así que contestar
 * —que el particular que no tributa IRAE ni IMEBA no lo necesita (Decreto 502/007 art. 3)— exige
 * sacar la frase del título Y del H1 y dejarla sólo en el cuerpo. Puede ser el cambio correcto,
 * pero es una apuesta sobre el término de cabecera de la página y no un recorte, así que no se
 * hace de paso en una tanda de doce. `glosario-terminos-cambiarios` queda afuera por lo de abajo.
 *
 * El defecto era otra vez el de la cuarta y la séptima tanda: nueve de los doce gastaban el
 * renglón que el SERP publica en la ETIQUETA DEL TEMA seguida del índice de la guía («Cambiar
 * pesos argentinos en Uruguay: qué tener en cuenta», «Comprar tu primera vivienda en Uruguay:
 * guía paso a paso», «Saldo retenido en el débito: qué es y cómo se libera»), y los otros tres
 * devolvían la pregunta sin contestarla («¿Conviene ahorrar en dólares o en pesos en Uruguay?»,
 * «Casas de cambio vs bancos: ¿dónde conviene cambiar?», «Refinanciar o unificar deudas en
 * Uruguay: ¿conviene?»).
 *
 * Ahora cada uno contesta: que al cambiar pesos argentinos el spread es más ancho que el del
 * dólar, que a la primera vivienda hay que sumarle del 5 % al 8 % del precio en escribano, ITP y
 * certificados, que el saldo retenido casi nunca es un préstamo sino una preautorización o una
 * comisión impaga, que la moneda del ahorro se elige por la del gasto futuro, que el banco propio
 * no siempre da el mejor cambio, que lo que decide una refinanciación es el total y no la cuota,
 * que la unión concubinaria pide cinco años Y sentencia, que el contrato de alquiler manda sobre
 * lo que se dijo de palabra, que para rescindir el aviso vale por telegrama colacionado, que la
 * comisión del cambio se esconde en la cotización y que en un 0km la depreciación es el costo que
 * no se factura.
 *
 * Ninguna cifra es nueva: todas ya estaban en el cuerpo de su guía. Y donde el cuerpo hedgea, el
 * título no afirma, que es lo que descartó dos redacciones. En la rescisión iba a decir «60 días
 * de preaviso», y el cuerpo dice «suele ser de unos 60 días en el régimen común» contra «unos 30
 * días» en el arrendamiento sin garantía de la LUC: dos regímenes y las dos cifras aproximadas, o
 * sea que un título con un número sería más firme que su fuente y además falso para la mitad de
 * los contratos. Se queda con lo que sí es categórico —la forma de notificar, que el cuerpo llama
 * «la forma segura y estándar»— y los plazos quedan en el cuerpo con su «suelen». Y en el 0km iba
 * a decir «lo decide la depreciación», pero el mismo cuerpo aclara que una tasa subsidiada de la
 * marca puede dar vuelta el total, así que el título publica el hecho («no se factura») y no el
 * veredicto.
 *
 * Y una cuarta aplicación de la regla del buscador propio, que acá además arregló una
 * canibalización. `scoreDocs` puntúa 110 un título que EMPIEZA por lo tipeado, y medido sobre el
 * índice ya reescrito: «casas de cambio» lo gana `/casas-de-cambio` (112) y «glosario» lo gana
 * `/glosario` (142), así que ni el comparador de casas contra bancos abre por «Casas de cambio»
 * —pasó a «Tu banco no siempre da el mejor cambio»— ni se tocó `glosario-terminos-cambiarios`,
 * que habría tenido que abrir por la palabra que el hub ya reclama; queda para una tanda que le
 * encuentre un frente propio. La canibalización es la de ahorro: el título viejo de
 * `ahorrar-en-dolares-o-pesos` («¿Conviene ahorrar en dólares o en pesos en Uruguay?») era casi la
 * misma cadena que el de `conviene-ahorrar-en-dolares-uruguay` («¿Conviene ahorrar en dólares en
 * Uruguay?»), o sea dos guías disputándose una intención; el nuevo («Dólares o pesos: la moneda de
 * tu gasto») dice lo que esta guía tiene y la otra no. Se verificó después del cambio que cada una
 * de las doce sigue ganando su propia consulta («rescindir» 80, «refinanciar» 80, «saldo retenido»
 * 80, «primera vivienda» 80, «0km» 80, «concubinaria» 62, «telegrama» 62, «depreciacion» 62).
 *
 * 25 → 16 el 2026-10-09, octava tanda y la primera que toca SÓLO el título: son las NUEVE guías
 * con la ruta libre que pasan de 60 con la descripción ya dentro de los 155, así que no hay
 * descripción que reescribir y la tanda se nombra por la mitad del snippet que arregla. Es la
 * simétrica de la del 2026-10-07, que hizo lo mismo del lado de la descripción, y con esto las dos
 * señales terminaron de separarse: de los 24 excedidos en descripción que quedan, NINGUNO tiene la
 * ruta libre.
 *
 * Iban de 66 a 61 caracteres contando la marca —los sobrantes más chicos de las ocho tandas, 1 a 6
 * caracteres— y por eso vale decir por qué entraron igual: lo que el SERP les corta es apenas la
 * marca, así que el defecto que las traía acá no era la longitud sino el de siempre, y en su forma
 * más pura. Las nueve eran la ETIQUETA DEL TEMA, seis de ellas abriendo literalmente con «Cómo»
 * («Cómo mejorar tu historial crediticio en Uruguay», «Cómo armar un presupuesto personal en
 * Uruguay», «Cómo salir de las deudas de tarjeta de crédito», «Cómo proteger tu patrimonio en
 * pareja en Uruguay», «Cómo leer la cotización del dólar paso a paso», «Fondo de emergencia: cómo
 * armarlo en Uruguay»), y las otras tres prometían el índice sin contestar nada («Comprar un
 * terreno en Uruguay: qué verificar», «Ser garante o codeudor en Uruguay: los riesgos»,
 * «Inflación y dólar en Uruguay: cómo se relacionan»). Un título que abre por «Cómo» promete el
 * procedimiento y gasta el renglón entero sin decir una sola cosa que el visitante no supiera al
 * tipear.
 *
 * Ahora cada uno contesta: que la inflación y el dólar no van siempre juntos, que en pareja lo que
 * no puedas probar propio se presume ganancial, que el historial son DOS registros y no uno (el
 * Clearing privado y la Central de Riesgos del BCU), que al garante solidario le pueden cobrar
 * directamente a él, que con el pago mínimo no se sale de la deuda de la tarjeta, que en la
 * cotización la «compra» es lo que la casa TE paga, que el 50/30/20 acá arranca más bien en
 * 60/25/15, que en un terreno el estudio de título va primero y que el fondo de emergencia son
 * 3 a 6 meses de gastos.
 *
 * Ninguna cifra es nueva: todas ya estaban en el cuerpo de su guía. Y donde el cuerpo hedgea, el
 * título no afirma, que acá descartó dos redacciones. El presupuesto iba a decir «acá es
 * 60/25/15», y el cuerpo dice que «mucha gente arranca más cerca de 60/25/15 y está bien» sobre
 * una regla que él mismo llama «una guía, no una ley»: queda «acá más bien 60/25/15». Y el
 * patrimonio en pareja iba a decir «es ganancial», cuando el cuerpo dice que «la normativa presume
 * ganancial lo que no puedas probar como propio» — una presunción que se rebate con papeles no es
 * un hecho, así que el título publica la presunción.
 *
 * Y una quinta aplicación de la regla del buscador propio, que acá además corrigió la tanda a
 * mitad de camino. Las nueve primeras redacciones ganaban el término corto y PERDÍAN la frase del
 * slug, que es la que el visitante tipea: medido sobre el índice, «historial crediticio» se lo
 * llevaba `/saldar-deudas-uruguay` (38 contra 36), «deudas de tarjeta» lo ganaba `/temas` (42
 * contra 36), «presupuesto personal» `/salud-financiera` (68 contra 62) y «inflacion y dolar» se
 * caía del top 6. Cinco títulos se reescribieron para ABRIR por esa frase, que es lo que paga el
 * 110 de `scoreDocs`, y después del cambio las nueve guías ganan su propia consulta y cinco
 * mejoraron su puntaje («historial crediticio» 92→110, «deudas de tarjeta» 92→110, «presupuesto
 * personal» 92→110, «terreno» 92→110, «leer la cotizacion» 62→80, «garante» 62→80). Ninguna
 * página perdió una consulta contra una guía: `/cotizacion` sigue ganando «cotizacion» (142) y
 * `/salir-del-clearing` sigue siendo el destino de «clearing». La única concesión es «codeudor»,
 * que baja de 62 a 32 porque el título conserva la precisión del cuerpo («garante SOLIDARIO», que
 * es el único al que se le puede reclamar sin perseguir antes al titular) en vez de enumerar los
 * tres roles; sigue siendo el único resultado de esa consulta.
 *
 * Y `glosario-terminos-cambiarios` se quedó sin tocar por quinta vez, con la ruta libre: es la
 * única guía libre que queda pasada del presupuesto y sigue sin frente propio, porque el término
 * por el que tendría que abrir lo gana el hub `/glosario` (142 contra los 110 que pagaría el
 * prefijo). Las otras quince excedidas están dentro de ventanas abiertas del libro de cambios y
 * entran cuando cierren.
 *
 * 16 → 16 el 2026-10-10, novena tanda, y que el número NO se mueva es exactamente el punto. Son
 * CATORCE títulos de guía con la ruta libre que ya entraban en el presupuesto (31 a 43
 * caracteres), así que un trinquete que cuenta caracteres no podía verlos: la octava tanda vació
 * el conjunto «ruta libre Y pasada de 60», y lo que quedó libre fueron guías DENTRO del
 * presupuesto cuyo título era la etiqueta del tema de punta a punta, nueve abriendo por «Cómo»,
 * «Cuánto» o «Qué» («Cómo funciona el IRPF en Uruguay», «Cómo se calcula el aguinaldo en
 * Uruguay», «Cuánto cuesta tener un auto en Uruguay», «Cómo abrir una cuenta bancaria en
 * Uruguay»...). Un título que cabe entero en el SERP y no dice NADA que el visitante no supiera al
 * tipear no es deuda de longitud: es el renglón gastado igual, y es lo que las ocho tandas
 * anteriores venían arreglando de paso mientras recortaban. Acá se arregla solo, sin recorte que
 * lo motive.
 *
 * El presupuesto real son 43 caracteres y no 60, y conviene decirlo acá porque es el error que
 * esta tanda cometió primero: `rendered()` agrega SIEMPRE « | Cambio Uruguay», o sea 17
 * caracteres, así que un título de 59 —cómodo si uno mide el literal— son 76 publicados y quince
 * ofensores nuevos de un saque. Las catorce redacciones se rehicieron enteras contra los 43, que
 * es la misma envolvente en la que entraron las nueve de la octava tanda (41 a 45).
 *
 * Ahora cada uno contesta: que el IRPF no grava todo a la tasa máxima, que el aguinaldo es la
 * doceava parte de lo ganado, que al costo de un auto hay que sumarle la depreciación, que la
 * deuda de patente sigue al auto, que la cuenta básica es gratis por ley, que las deudas SÍ se
 * heredan y hay cómo limitarlas, que sin sucesión no se vende lo heredado, que la promesa de
 * compraventa se inscribe y eso protege, que la renta sube una vez al año, que los seguros se
 * ordenan por lo que te funde, que en el retiro manda el tiempo, que si te cobran por adelantado
 * es estafa, que los gastos en pareja son 50/50, proporcional o pozo, y que el BHU da el crédito
 * y la ANV no.
 *
 * Ninguna cifra es nueva y donde el cuerpo hedgea el título no afirma, que acá descartó tres
 * redacciones. El BHU iba a decir «presta en UI» y el cuerpo dice que sus créditos «suelen
 * otorgarse» en UI «o en pesos». El retiro iba a decir «la jubilación no iguala tu sueldo», cuando
 * el cuerpo dice «suele ser menor» y que la tasa de reemplazo «casi nunca es del cien por ciento»:
 * en su lugar va la tesis que el cuerpo SÍ afirma sin matices, que «no es ganar mucho, es el
 * tiempo». Y las deudas heredadas iban a decir «se heredan hasta lo que recibís», que es verdad
 * sólo CON beneficio de inventario —aceptando pura y simplemente se responde con el patrimonio
 * propio—, así que el título afirma lo que vale siempre («se heredan») y promete el mecanismo sin
 * mutilar el término legal.
 *
 * Y una sexta aplicación de la regla del buscador propio, que acá atajó el error más caro de todas
 * las tandas: una guía apropiándose del término de OTRA página. Tres redacciones se cayeron por
 * eso, medidas sobre el índice. «El BHU es el banco de la vivienda» le ganaba la consulta pelada
 * «vivienda» a `/venta-viviendas-uruguay` (92 contra 86) — quien tipea «vivienda» no busca una
 * guía sobre un banco. «IRPF: por franjas...» le ganaba «irpf» a `/glosario/irpf` (110 contra
 * 105), porque abrir con el término paga el prefijo. Y «Evitar estafas: te cobran antes de
 * prestar» le sacaba «prestar» a `/prestamos-p2p-uruguay`. Las tres se reescribieron para NO abrir
 * por el término ajeno ni nombrarlo: el BHU pasó a la distinción con la ANV (que el cuerpo también
 * nombra como la confusión frecuente), el IRPF a «El IRPF no grava todo a la tasa máxima» y las
 * estafas a «por adelantado», que además es la frase textual del cuerpo. Una cuarta se corrigió
 * por lo contrario: «Aguinaldo: la doceava parte del semestre» le quitaba «semestre» a
 * `/herramientas/calculadora-aguinaldo`, y «de lo ganado» dice lo mismo sin pisarla.
 *
 * Después de las correcciones las catorce ganan su propia consulta: tres mejoraron su puntaje
 * («planificar el retiro» 36→110, «las deudas se heredan» 46→80, «transferir un auto» 62→80),
 * tres quedaron igual («bhu» 62, «sucesion» 92, «cuanto cuesta tener un auto» 80) y ocho bajaron
 * conservando el primer puesto con margen, porque un título de 43 que CONTESTA no puede además
 * repetir la frase larga del slug que paga el 110: «derechos del inquilino» 110→62 contra 32,
 * «que seguros conviene tener» 110→62 contra 32, «como se calcula el aguinaldo» y «como funciona
 * el irpf» 110→62 contra los 42 del hub `/guias`, «promesa de compraventa» 110→92 contra 32,
 * «dividir gastos en pareja» 92→62 contra 45, «evitar estafas financieras» 92→62 contra 36, y
 * «abrir una cuenta bancaria» 92→62 siendo el único resultado. Ese canje es deliberado: el puntaje
 * del buscador propio sólo tiene que alcanzar para no perder la consulta, mientras el renglón del
 * SERP lo lee todo el tráfico de Google. Ninguna página perdió una consulta que tuviera: lo que
 * cambió de dueño fuera de estas catorce son consultas que nadie ganaba («doceava»,
 * «limitarlas»), que su dueño anterior matcheaba en 0 («heredado», «funde») o que eran ruido de
 * una palabra en 38 («anv», «tiempo»).
 *
 * `conviene-comprar-dolares-hoy` quedó FUERA de la tanda teniendo la ruta libre, y es el otro
 * descarte medido: su título es ya la pregunta exacta del visitante, y toda redacción que contesta
 * y entra en 43 o pierde la frase del slug o abre por «Comprar dólares», que empata en 80 con
 * `/guias/comprar-dolares-online-uruguay` y queda primera por desempate. Vale más la pregunta
 * literal que un empate ganado a otra guía.
 *
 * Esta tanda toca SÓLO el título, como la octava, y por una razón medida y no por simetría: las
 * catorce descripciones ya entran en los 155 (117 a 155), así que no hay nada que reescribir del
 * otro lado. Con esto ninguna guía de ruta libre queda excedida en ninguna de las dos mitades del
 * snippet; las 24 descripciones que siguen pasadas están todas dentro de ventanas abiertas.
 *
 * `glosario-terminos-cambiarios` se quedó sin tocar por sexta vez, por la razón de siempre: el
 * término por el que tendría que abrir lo gana el hub `/glosario`.
 *
 * SÓLO PUEDE BAJAR.
 */
const TITLE_OVER_BUDGET = 16

/**
 * 89 → 77 el 2026-10-01: las doce más largas del catálogo, de 306 a 215 caracteres.
 *
 * Mismo criterio que las nueve corridas que `seoDescriptionBudget.test.ts` documenta para las
 * páginas, y el mismo patrón: once de las doce abrían con la ETIQUETA DEL TEMA («El subsidio por
 * enfermedad en Uruguay:», «Cómo facturar y tributar si trabajás freelance…», «Qué puede hacer
 * legalmente una empresa de cobranza…», «Consecuencias reales de no pagar un préstamo…»), que es
 * justo el renglón que el SERP publica, y la respuesta caía del lado cortado. Ahora arranca el
 * dato: el 70 % desde el cuarto día con tope de $ 67.754 (01/2026), que la exportación de
 * servicios no está gravada y la «tasa cero» no existe, que ninguna ley obliga a dar tolerancia
 * en el privado, el día 10 corrido de la Ley 10.449 y el recargo automático del 10 % de la
 * 18.572, los $ 55.000 del Consultorio Jurídico, el piso del 35 % de la Ley 17.829 y los 10 años
 * del Clearing, el 100 %/150 % de la Ley 15.996, el art. 52 de la Constitución, el mes de sueldo
 * por año con tope de seis mensualidades, los 5 de 15 puntos desde el 1/12/2023, los 20 días de
 * la Ley 12.590 y el «todo o nada» de los USD 200 de EE.UU.
 *
 * La doceava no era una etiqueta sino una afirmación de menos: `/guias/abogado-gratis-uruguay`
 * enumeraba las cuatro puertas sin decir cuál te toca, que es la pregunta.
 *
 * Ninguna cifra es nueva: todas ya estaban en la descripción vieja o en el cuerpo de su guía. Y
 * una que SÍ estaba se dejó afuera a propósito: la guía de Amazon fecha el registro del vendedor
 * el 1/10/2026 y en la misma línea avisa que esa fecha «ya se postergó dos veces», así que
 * publicarla en el snippet como vigente es el error recurrente del repo
 * ([[cifra-vieja-pasa-la-banda-de-plausibilidad]]); en su lugar entró la franquicia anual, que no
 * se mueve.
 *
 * 77 → 65 el 2026-10-04: las doce descripciones de la cuarta tanda de títulos, en la misma fila del
 * libro de cambios y por la razón que ese comentario explica. Diez de las doce abrían con la
 * etiqueta del tema o repetían el título («Cómo comprar criptomonedas en Uruguay paso a paso:
 * exchanges locales…», «Cómo abrir una empresa unipersonal en Uruguay paso a paso: inscripción en
 * DGI y BPS…»), y las otras dos ya arrancaban por el dato y sólo estaban largas.
 *
 * 65 → 53 el 2026-10-05, las doce descripciones de la quinta tanda de títulos, en la misma fila del
 * libro de cambios y elegidas con el criterio que explica el comentario de `TITLE_OVER_BUDGET`.
 * Iban de 202 a 161 caracteres y once abrían describiendo el ÍNDICE de la guía («Cómo facturar como
 * freelancer o emprendedor en Uruguay: por qué necesitás…, cómo funciona…, cómo le facturás…, qué
 * impuestos pagás», «Lo que cobran BROU, Itaú, Santander, BBVA y Scotiabank…»), que es la forma más
 * cara del defecto: enumera las secciones y la respuesta no aparece en ningún renglón. Ahora
 * arranca el dato: que sin inscribirse no se factura y que el monotributista está exceptuado de la
 * factura electrónica, que a quien empezó a trabajar antes de diciembre de 2023 y gana por debajo
 * del tope A no le entra nada a una AFAP, que el banco no debita sin autorización del titular, que
 * el alias es el celular, que la red convierte la compra a dólares, los tres y cinco años del
 * artículo 75, el artículo 1758 para la deuda cedida, el kilo de supergás con su fecha, que en
 * Carrasco se cambia lo justo, el IRPF que desde 2026 grava también la ganancia al vender, el piso
 * de US$ 17,50 del SWIFT y que el saldo a favor no se pierde.
 *
 * Ninguna cifra es nueva: todas ya estaban en la descripción vieja o en el cuerpo de su guía. Y
 * ninguna se escribió con más firmeza que su fuente: el supergás va con el día desde el que rige y
 * con el mes en que el Ejecutivo lo mantuvo, y el tope A de la AFAP va SIN su monto —el cuerpo lo
 * fecha el 10 de agosto de 2026 y se actualiza, así que en el snippet, donde la fecha no entra,
 * queda como el umbral que es—.
 *
 * 53 → 41 el 2026-10-06, las doce descripciones de la sexta tanda de títulos, en la misma fila del
 * libro de cambios y elegidas con el criterio que explica el comentario de `TITLE_OVER_BUDGET`.
 * Iban de 168 a 156 caracteres —los sobrantes más chicos de las seis tandas— y el patrón se partió
 * en dos mitades parejas. Seis enumeraban el ÍNDICE de la guía («Qué es el monotributo en Uruguay,
 * cuánto se paga y los topes…, y cuándo conviene frente a…», «Cómo pedir la jubilación del BPS
 * viviendo afuera, cómo te llega el giro, la fe de vida… y cómo se suman tus años»), y dos de ésas
 * además arrancaban repitiendo el título con «Guía para…» o «Guía práctica para…». Las otras seis
 * YA abrían por la respuesta y sólo estaban largas: ahí la reescritura no movió el arranque, sumó
 * el dato que la cola se comía (que el vale de cambio no puede vencer, que el artículo derogado es
 * el 64 por el 224 de la LUC, que la pensión a la vejez no se gira).
 *
 * Ninguna cifra es nueva y ninguna se escribió con más firmeza que su fuente: ver el comentario de
 * `TITLE_OVER_BUDGET` para las tres redacciones que eso descartó.
 *
 * 41 → 32 el 2026-10-07, las nueve descripciones de la séptima tanda, en la misma fila del libro de
 * cambios y por la razón que explica el comentario de `TITLE_OVER_BUDGET`: las nueve guías estaban
 * pasadas en las dos señales, así que se reescribieron las dos juntas. Iban de 161 a 156 caracteres
 * —otra vez los sobrantes más chicos— y el patrón se partió como la vez pasada. Cinco abrían con la
 * etiqueta del tema o anunciando el índice («Cómo cambiar euros y reales en Uruguay, por qué su
 * precio se mueve…», «Errores comunes y estafas al invertir en Uruguay: rendimiento garantizado,
 * esquemas Ponzi, cripto fraudulento…», «Remate judicial o de la ANV: seña, comisión del rematador,
 * plazos…»), que es la forma más cara del defecto porque enumera las secciones y la respuesta no
 * aparece en ningún renglón. Las otras cuatro YA abrían por la respuesta y sólo estaban largas: ahí
 * la reescritura no movió el arranque, sumó la norma que la cola se comía (el art. 1216 del Código
 * Civil para los diez años, el Decreto 264/025 para los $ 3.151) o el paso que faltaba (que antes
 * de repartir los gananciales se descuentan las deudas de la sociedad).
 *
 * Ninguna cifra es nueva y ninguna se escribió con más firmeza que su fuente: ver el comentario de
 * `TITLE_OVER_BUDGET` para las dos redacciones que eso descartó y para los matices que el snippet
 * conserva.
 *
 * 32 → 24 el 2026-10-07, en su propia fila del libro de cambios y la primera tanda que toca SÓLO la
 * descripción: son las ocho guías con la ruta libre que pasan de 155 con el título ya dentro de los
 * 60, así que no hay título que reescribir y la tanda se nombra por la mitad del snippet que arregla.
 * Las siete tandas anteriores se comieron el solapamiento entre las dos señales —la del 2026-10-07
 * ya anota que de las 11 guías pasadas en ambas sólo 9 tenían la ruta libre— y de acá en adelante
 * cada señal baja por su cuenta.
 *
 * Iban de 171 a 160 caracteres y seis de las ocho enumeraban el ÍNDICE de la guía, que es la forma
 * más cara del defecto: «Guía básica de bonos y renta fija en Uruguay: qué es, deuda soberana
 * uruguaya, letras de regulación monetaria, riesgo y rendimiento…», «Plazo fijo en Uruguay: cómo
 * funciona, pesos vs UI vs dólares, tasa real frente a la inflación, impuestos, garantía de
 * COPAB…», «Opciones reales para alquilar sin garante propietario en Uruguay: seguro de fianza,
 * régimen sin garantía de la LUC, adelanto de meses, ANDA…». Y dos abrían REPITIENDO LA PREGUNTA
 * que el visitante acaba de escribir sin contestarla («¿Conviene ahorrar en dólares en Uruguay?
 * Economía bimonetaria, cuándo tiene sentido…», «¿Existe impuesto a la herencia en Uruguay? No hay
 * impuesto sucesorio…»), que es peor: gasta el arranque en devolver la consulta.
 *
 * Ahora arranca la respuesta, y en cuatro casos es una cifra que ya estaba en el cuerpo y no en el
 * snippet: los topes del Fondo de Garantía de Depósitos (UI 250.000 en moneda nacional y US$ 10.000
 * en extranjera, por persona e institución), las tres fracciones de la legítima (1/2 con un hijo,
 * 2/3 con dos, 3/4 con tres o más), el mínimo de US$ 20 de IVA por envío postal y el valor de
 * Catastro como base del ITP. Las otras cuatro son categóricas: que el bono se vende antes del
 * vencimiento pero a precio de mercado y sin la garantía que sí cubre al plazo fijo, que dolarizar
 * tiene sentido cuando la meta está en dólares, que por debajo del laudo de tu categoría se reclama
 * en vez de pedir, y que las vías sin garante propietario son cinco.
 *
 * Ninguna cifra es nueva y ninguna se escribió con más firmeza que su fuente. Dos matices que eso
 * conservó: los intereses del plazo fijo «suelen pagar IRPF» y no «pagan», porque así lo dice el
 * cuerpo; y el plazo del ITP por causa de muerte quedó AFUERA aunque era el dato más accionable,
 * porque el cuerpo lo escribe «en general, alrededor de un año, pero confirmá el plazo vigente ante
 * la DGI» y un snippet no tiene lugar para esa salvedad — publicar «un año» a secas sería
 * exactamente el error recurrente del repo.
 */
const DESCRIPTION_OVER_BUDGET = 24

describe('los snippets de las guías entran en el SERP', () => {
  it(`mide las ${MEASURED} guías del catálogo`, () => {
    expect(guides.length).toBeGreaterThanOrEqual(MEASURED)
  })

  it('ninguna guía deja vacío su título o su descripción', () => {
    // La otra forma de bajar los contadores sin arreglar nada: una cadena vacía entra en cualquier
    // presupuesto y publica un snippet que Google reescribe entero.
    const offenders = guides
      .filter(guide => !guide.title.trim() || !guide.description.trim())
      .map(guide => guide.slug)
    expect(offenders).toEqual([])
  })

  it('ningún título trae ya la marca', () => {
    // La página la agrega siempre, así que un título que la traiga la publicaría dos veces.
    const offenders = guides
      .filter(guide => /cambio uruguay/i.test(guide.title))
      .map(guide => guide.slug)
    expect(offenders).toEqual([])
  })

  it(`tiene como mucho ${TITLE_OVER_BUDGET} títulos pasados de ${MAX_TITLE} caracteres`, () => {
    const offenders = guides
      .map(guide => ({ slug: guide.slug, title: rendered(guide.title) }))
      .filter(guide => guide.title.length > MAX_TITLE)
      .map(guide => `${guide.title.length} ${guide.slug}: ${guide.title}`)
      .sort()
    expect(offenders.length, offenders.join('\n')).toBeLessThanOrEqual(TITLE_OVER_BUDGET)
  })

  it(`tiene como mucho ${DESCRIPTION_OVER_BUDGET} descripciones pasadas de ${MAX_DESCRIPTION} caracteres`, () => {
    const offenders = guides
      .filter(guide => guide.description.length > MAX_DESCRIPTION)
      .map(guide => `${guide.description.length} ${guide.slug}: ${guide.description}`)
      .sort()
    expect(offenders.length, offenders.join('\n')).toBeLessThanOrEqual(DESCRIPTION_OVER_BUDGET)
  })

  // Dos guías con el mismo título o la misma descripción se disputan la misma intención y Google
  // reparte las impresiones entre las dos. Es la regla que `seoTitleBudget.test.ts` y
  // `seoDescriptionBudget.test.ts` ya aplican al directorio de páginas, acá sobre el catálogo.
  it.each([
    ['título', (guide: (typeof guides)[number]) => guide.title],
    ['descripción', (guide: (typeof guides)[number]) => guide.description],
  ] as const)('ningún %s se repite entre dos guías', (_what, pick) => {
    const byText = new Map<string, string[]>()
    for (const guide of guides) {
      const text = pick(guide).trim()
      byText.set(text, [...(byText.get(text) ?? []), guide.slug])
    }
    const repeated = [...byText.entries()]
      .filter(([, slugs]) => slugs.length > 1)
      .map(([text, slugs]) => `${slugs.join(' + ')}: ${text}`)
    expect(repeated, repeated.join('\n')).toEqual([])
  })

  // El guardarraíl que hace honesto a todo lo anterior: si la página dejara de componer su snippet
  // con estos dos campos, este archivo seguiría contando cadenas que el SERP no ve, y los dos
  // presupuestos quedarían en verde sobre nada.
  it('la página de la guía compone su snippet con el título y la descripción del catálogo', () => {
    expect(GUIDE_PAGE).toContain('${guide.value?.title ?? ')
    expect(GUIDE_PAGE).toContain('| Cambio Uruguay`')
    expect(GUIDE_PAGE).toContain('description: () => guide.value?.description')
  })
})
