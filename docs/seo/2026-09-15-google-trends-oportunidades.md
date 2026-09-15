# Google Trends Uruguay: temas para captar más visitas — 15 de setiembre de 2026

Barrido de Google Trends (geo=UY) sobre unas 55 semillas dentro de las 13 temáticas del sitio
(`classes/gaps/topics.ts`), cruzado con lo que el sitio ya rinde en Search Console (ventana
2026-08-15 → 2026-09-11), con la cola de demanda del 2026-09-13 y con prensa de los últimos 60 días.

**Regla del barrido**: cada señal lleva su número y su fuente. Trends no da volúmenes absolutos; da
un índice 0–100 por grupo de hasta cinco términos. Para comparar temas entre sí se metió "dolar" en
cada grupo como ancla y se expresa todo como porcentaje del promedio de "dolar" a 12 meses.

---

## 1. Resumen ejecutivo

Seis temas tienen demanda medida, encajan en el sitio, no los contesta Google en su propia caja y
tienen una ventana concreta. En orden:

| # | tema | demanda (12 m, % de "dólar") | estado del sitio | ventana |
|---|---|---|---|---|
| 1 | **Precio de la nafta y combustibles** | 23 % (picos mensuales ×2,5) | **cero páginas** | antes del ajuste de fin de setiembre |
| 2 | **Patente 2027 / SUCIVE** | SUCIVE 48 % + patente 23 %; enero ×5 | página existe y rinde (30 clics/28 d) | publicar 10–15 dic |
| 3 | **Devolución FONASA 2026** | 14 %, pico AHORA (30 ago = 100) | página sin año, sin "cómo consultar" | esta semana |
| 4 | **"Impuesto Temu" + BFE Express** | Temu 35 %; "impuesto temu" +450 %, "bfe express" +2.150 % | mecánica cubierta, **el nombre no aparece en ningún archivo** | ahora |
| 5 | **Aguinaldo diciembre 2026** | 9 % promedio, diciembre ×6 | dos páginas, ninguna en el top 300 de GSC | antes del 25 nov |
| 6 | **IRPF 2027 (declaración → devolución) + crédito por alquiler** | 43 %; todo "2026" es breakout | una sola URL, fuera del top 300 | mayo y julio 2027 |

Detrás vienen ocho huecos de demanda estable (garantías de alquiler, préstamos sin recibo, cola de
BPS, elecciones del BPS del 22 de noviembre, comisiones de Mercado Pago para cobrar, UTE, y
secciones a agregar en páginas que ya existen). Y una lista de lo que Trends dice que **no** hay que
perseguir.

El contexto que manda, medido en la misma ventana de GSC: 563.625 impresiones, 2.635 clics,
CTR 0,47 %. El 51 % de las impresiones (128.490) son 56 consultas de dólar/conversión que rindieron
34 clics: Google las contesta solo. Los clics viven en `/importar/*` (2,5–5,7 % por página) y en
`/guias/*` (1–5 %). Por eso todo lo de abajo es **explicador con fecha**, no cotización.

---

## 2. Escala relativa de los temas (Trends UY, promedio 12 meses, ancla "dólar" = 100 %)

| término | % de "dólar" | naturaleza | qué parte es captable |
|---|---|---|---|
| antel | 182 % | marca / navegacional | casi nada (factura, reclamo ya cubiertos) |
| bps | 182 % | institución | la cola: fecha de cobro, devolución FONASA, suplemento, elecciones |
| brou | 167 % | marca | ya capturado (`/historico/brou/usd` es la mejor página del sitio) |
| itau | 98 % | marca | ya capturado (`/historico/itau`, `/sucursales/itau`) |
| ute | 58 % | institución | Plan Redondo, corte de luz, duplicado |
| alquiler | ≈55 % (derivado vía "temu") | genérico + clasificados | garantías, IRPF alquiler, rescisión |
| sucive | 48 % | trámite | TODA: preguntas sin caja de respuesta |
| irpf | 43 % | trámite estacional | toda la cola "2026/2027" |
| temu | 35 % | marca extranjera | "impuesto temu", "bfe express", cupones, cómo comprar |
| patente | 23 % | trámite estacional | toda |
| nafta | 23 % | precio | toda: "cuánto sube", "cuándo sube", precio por tipo |
| préstamo | 17 % | comercial | comparativas y explicadores |
| fonasa | 14 % | trámite estacional | toda (pico actual) |
| mercado pago | 11 % | marca | comisiones para cobrar, Point, prepaga |
| aguinaldo | 9 % | estacional | toda (junio/diciembre) |
| tarjeta de crédito | 9 % | comercial (marcas) | ya cubierto |
| estafa | 6 % | ruido (películas) | nada |
| reclamo | 6 % | servicios | corte de luz |
| jubilación | 4 % | trámite | mínima, incapacidad, "mi jubilación estimada" |
| garantía de alquiler | 2 % | comercial | comparativa Sura/Porto/Anda/Mapfre/Contaduría |

Las marcas grandes (Antel, BROU, Itaú) son navegacionales: la gente busca el sitio del banco.
Sólo cuenta su cola larga, que sí está listada abajo.

---

## 3. Las seis oportunidades principales

### 3.1 Precio de la nafta y los combustibles — página nueva

**Demanda.** "nafta" promedia 23 % de "dólar" con **picos mensuales** en la última semana de cada
mes: 26 abr 2026 = 100, 29 mar = 75, 24 may = 70, 28 jun = 68 (promedio 41 en su propio índice).
Es el ajuste mensual de precios del Ejecutivo. Consultas relacionadas top: "precio nafta" 86,
"nafta super" 26, "litro de nafta" 23, "nafta premium" 13. En ascenso: **"cuánto sube la nafta en
uruguay" (breakout)**, "aumento nafta" +550 %, "sube la nafta en uruguay" +350 %, "cuándo sube la
nafta en uruguay" +110 %, "imesi nafta" +80 %. Para "combustible": "aumento combustible junio 2026"
(breakout), "cuánto sube el combustible" +450 %, "suba de combustible uruguay" +150 %.

**Sitio.** Cero páginas sobre el precio del combustible. "nafta" aparece sólo como rubro de
descuentos con tarjeta (`utils/bankosPages.ts`, `utils/cardRewards.ts`) y en la página del IMESI a
eléctricos. Está dentro del alcance declarado: `costos: … combustible`.

**Qué hacer.** `/precio-de-la-nafta-uruguay` (o `/precio-combustibles-uruguay`): precio vigente
por producto (Super 95, Premium 97, Gasoil 50-S, supergás), fecha del último ajuste y del próximo,
cuánto subió o bajó en pesos y en porcentaje, histórico mensual como tabla, y el mecanismo (el
precio de paridad de importación de URSEA y la decisión mensual del Poder Ejecutivo) explicado en
una pantalla. Enlazar los descuentos con tarjeta en estaciones que el sitio ya tiene.

**Dato.** Hace falta una serie mensual. Hoy no hay job para esto: o un job pm2 chico que lea el
comunicado mensual (MIEM/ANCAP/URSEA) o una tabla versionada a mano en `app/utils/`, con fecha.
Sin la serie la página es prosa; con la serie es la única del país que muestra la curva.

**Cuándo.** Antes del anuncio de fin de setiembre. Cada fin de mes vuelve a picar.

### 3.2 Patente 2027 y SUCIVE — refrescar y responder las siete preguntas

**Demanda.** SUCIVE es el 48 % de "dólar" y "patente" el 23 %. Estacionalidad brutal: "patente"
4 ene 2026 = 100, 11 ene = 73, 18 ene = 56, contra un promedio de 10. Todo lo que sube es
"patente 2026" (vencimiento, valor, cuándo se paga, consulta, "oca patente"). Top de SUCIVE:
"multas sucive" 100, "deuda sucive" 68, "convenio sucive" 9, "certificado sucive" 9.

La **cola de demanda propia** (2026-09-13) trae siete consultas de SUCIVE con veredicto
"escribir" porque el SERP es institucional y crudo: *cuánto debo, cuándo vence, cómo hacer
convenio, cómo pagar, cuándo se paga, cuánto debe mi moto, puedo pagar con OCA*.

**Sitio.** `/multas-de-transito-y-patente-uruguay`: 2.597 impresiones, 30 clics, 1,16 %,
posición 7,6 — quinta página del sitio por clics. Título actual: "Multas y patente (SUCIVE)".

**Qué hacer.** Sección "Patente 2027" con valor, vencimientos por cuota, dónde y cómo pagar
(SUCIVE en línea, redes, OCA), convenio por deuda, motos, y las siete preguntas como FAQ con
respuesta corta arriba. Si la página se vuelve larga, separar `/patente-2027-uruguay` con un solo
intent y enlazarla desde la actual, sin duplicar la parte de multas.

**Cuándo.** Publicar entre el 10 y el 15 de diciembre. Las búsquedas arrancan la última semana de
diciembre y el pico es la primera quincena de enero.

### 3.3 Devolución FONASA 2026 — refrescar esta semana

**Demanda.** El pico anual es **ahora**: "fonasa" 30 ago 2026 = 100, 6 sept = 72 (promedio 15).
En 90 días pasó de 2 a 18. Todo lo que sube es breakout: "bps devolución fonasa", "consultar
devolución fonasa", **"cómo saber si tengo devolución fonasa"**, "a quién le corresponde",
"cuándo es la devolución de fonasa 2026", "consulta de devolución fonasa ¿estoy comprendido?".
Dentro de BPS, "bps devolución fonasa" subió +3.100 %. Trending Now (7 días) trae a BPS con
"confirmó qué opciones hay para cobrar la devolución Fonasa 2026" y "vence el plazo clave para
elegir cómo cobrar". Prensa: BPS habilitó la consulta para más de 152 mil beneficiarios
(El Observador, 3 sep); pagos habilitados desde el 7 sep (Montevideo Portal).

**Sitio.** `/devolucion-fonasa-uruguay`: 698 impresiones, 7 clics, 1,0 %, posición 9,4. Título
"Devolución de FONASA" **sin año**; dos menciones de "consulta"; ninguna de calendario, cronograma
ni fecha de pago. Cero cobertura de "anticipo FONASA" (72 en el índice de "fonasa"; es el anticipo
de servicios personales).

**Qué hacer.** Título y descripción con "2026" y la fecha de pago; bloque arriba "Cómo consultar si
estás comprendido (BPS)"; opciones de cobro y plazo para elegir; monto típico; y una sección nueva
de "Anticipo FONASA para servicios personales". Es la misma receta que subió el CTR de
`/historico/bcu`: el número en el snippet.

### 3.4 "Impuesto Temu" y BFE Express — el nombre que la gente usa

**Demanda.** "temu" es el 35 % de "dólar" (promedio 43 contra 68 de "alquiler" en el mismo
grupo). En ascenso a 12 meses: **"bfe express" +2.150 %**, **"impuesto temu" +450 %**, "impuesto
temu uruguay" +400 %, "temu impuestos" +190 %, "cupones temu" +170 %. Shein: "cómo comprar en shein
desde uruguay" +100 %, "cupones shein" (breakout), "shein uruguay" +140 %.

**Hecho verificado.** El "impuesto Temu" rige desde el **1 de mayo de 2026**: IVA del 22 % a las
compras web del exterior que entran por franquicia, salvo las que llegan de EE.UU. (acuerdo TIFA)
hasta US$ 200 por envío y tres al año; la franquicia anual pasó de US$ 600 a **US$ 800 en tres
envíos**; el IVA se liquida en el despacho y lo cobra el courier o el Correo antes de entregar
([Telenoche](https://www.telenoche.com.uy/nacionales/desde-mayo-rige-el-impuesto-temu-compras-web-del-exterior-pagaran-iva-y-cambian-las-franquicias-n5394059),
[Ámbito](https://www.ambito.com/uruguay/comenzo-regir-el-impuesto-temu-cuales-son-las-claves-n6273075),
[Infobae](https://www.infobae.com/america/agencias/2026/05/01/comienza-a-regir-en-uruguay-el-conocido-como-impuesto-temu/)).
Efecto medido por prensa: las compras web al exterior caen por tercer mes consecutivo (El País,
20 ago) y un 62 % (26 ago).

**Sitio.** `/franquicia-aduana-uruguay` ya explica los US$ 800 en tres envíos y el IVA del 22 %
con el mínimo de US$ 20 por paquete chino. Pero la frase "impuesto Temu" está en **cero archivos**
y "BFE Express" también. La familia `/importar/*` es la de mejor CTR del sitio (2,5–5,7 %).

**Qué hacer.**
- Guía **"Impuesto Temu: qué es, cuánto pagás y cuándo no"**, con el nombre popular en el título,
  tres ejemplos numéricos (paquete de US$ 19, de US$ 150, de US$ 250), la excepción EE.UU., qué
  cambió el 1/5/2026 y cómo afecta a Temu, Shein y AliExpress. Enlazar desde franquicia y desde
  las guías de AliExpress y Amazon.
- Guía **"BFE Express: qué es y cómo rastrear tu pedido de Temu en Uruguay"**: es el operador
  logístico con el que Temu entrega en Uruguay; hay que verificar plazos y canales antes de
  escribir, porque las fuentes son redes y rastreadores
  ([17track](https://www.17track.net/en/carriers/bfe), [postal.ninja](https://postal.ninja/en/p/bfeexpress/tracking)).
  Cerrar con "qué hacer si no llega" hacia `/problemas-con-la-aduana-uruguay` y
  `/donde-te-entregan-el-paquete-uruguay`.

### 3.5 Aguinaldo de diciembre 2026 — preparar antes del 25 de noviembre

**Demanda.** Promedio 9 % de "dólar" pero con picos de ×6: 7 dic 2025 = 20, 7 jun 2026 = 18 sobre
un promedio de 3. Todo lo que sube lleva año: "aguinaldo 2026", "cuándo pagan aguinaldo 2026",
"pago aguinaldo diciembre 2025" +1.550 %, **"aguinaldo de la construcción 2026" +950 %**,
"aguinaldo jubilados". Top: "medio aguinaldo" 36, "calcular aguinaldo" 33, "cómo se calcula" 31,
"cuándo se cobra" 21. Cola de demanda propia: *puedo recibir aguinaldo si llevo 3 meses
trabajando*, *si estoy incapacitado*, *qué pasa si no pagan aguinaldo a tiempo*, *cuántos días*.

**Sitio.** `/cuando-se-cobra-el-aguinaldo-uruguay` y `/guias/como-se-calcula-el-aguinaldo-uruguay`
existen y las dos están fuera del top 300 de GSC en la ventana de agosto–setiembre. Eso es normal
fuera de temporada; la prueba es diciembre.

**Qué hacer.** Título con "diciembre 2026" y la fecha límite legal en el snippet; calculadora
arriba; sección propia para la construcción (régimen distinto, hay que verificar quién paga y
cuándo); qué pasa con jubilados (aclarar que la prestación no es aguinaldo); y las cuatro preguntas
de la cola como FAQ. Repetir en mayo para junio 2027.

### 3.6 IRPF 2027: dos URLs por intent, y el crédito por alquiler

**Demanda.** "irpf" es el 43 % de "dólar". A 12 meses todo lo que sube es breakout con año:
"devolución irpf 2026", "consulta irpf 2026", "simulador irpf 2026", "franjas irpf 2026",
"devolución irpf con cédula 2026", "cálculo irpf 2026", "cobro irpf 2026". A 90 días el pico fue el
26 de junio (cierre de declaraciones) y ahora baja (48 → 5), pero siguen subiendo "agenda dgi irpf"
+350 % y "declaración jurada irpf" +140 %. En alquiler: **"irpf alquiler" +120 %**.

**Sitio.** Una sola URL, `/declaracion-de-irpf-uruguay`, título "¿Tenés que declarar IRPF?", fuera
del top 300. No hay página de devolución ni de crédito fiscal por alquiler (aparece de paso en
`/por-que-no-baja-el-alquiler-uruguay`).

**Qué hacer.** Tres URLs con un intent cada una: **(a)** "Declaración jurada de IRPF 2027: quién
debe, agenda DGI, formularios 1102/1103" (mayo–junio); **(b)** "Devolución de IRPF 2027: calendario,
consulta con cédula, franjas" (julio–agosto); **(c)** guía "Crédito fiscal de IRPF por alquiler:
cuánto descontás y cómo se declara" (todo el año, pico en mayo). Las fechas y montos se cargan el
día que DGI publica, no antes.

---

## 4. Segundo escalón: huecos con demanda estable

| tema | señal de Trends | sitio hoy | página o sección propuesta |
|---|---|---|---|
| **Garantías de alquiler, comparativa** | "sura garantía de alquiler" 100, "porto" 95, "anda" 80, "mapfre" 44, "contaduría" 8; "alquiler sin garantía" 6 | Sura: **0** menciones; Porto 2; Anda 11. Las páginas de alquiler tienen el mejor CTR del sitio (`/alquilar-estando-en-clearing` 4,2 %, 62 clics) | `/garantia-de-alquiler-uruguay`: costo mensual/anual, requisitos de ingresos, plazos, qué cubre, cómo se contrata; enlazada desde todas las páginas de alquiler |
| **Préstamo sin recibo de sueldo** | +300 % en 90 días | 0 (sólo `/alquilar-sin-recibo-de-sueldo`) | explicador de qué opciones reales hay y qué evitar; encaja en `credito` sin recomendar producto |
| **Limpia Sueldos BROU** | "limpia sueldo brou" +2.700 %, "limpia sueldos brou" breakout | 0 | plan del BROU para refinanciar deudas atrasadas de ~300 mil trabajadores (200 mil públicos, 100 mil privados) con retención de haberes y hasta 72 cuotas; ventana especial 10 mar–abr 2026; convenio con COFE (ene) e intendencias ([El Observador](https://www.elobservador.com.uy/free/brou-lanzo-plan-limpia-sueldos-destinado-unos-300-mil-trabajadores-como-acceder-y-cuando-hay-tiempo-n6035801), [La Mañana](https://www.xn--lamaana-7za.uy/actualidad/limpia-sueldos-el-brou-y-las-intendencias-lanzan-un-plan-para-refinanciar-deudas-de-funcionarios-municipales/)). Sección en `/saldar-deudas-uruguay` o guía propia si se repite en 2027 |
| **Préstamo hipotecario** | 85 en el índice de "préstamo", "simulador préstamo" 82, "préstamo soñado BHU" +90 % | mencionado en 5 páginas, ninguna dedicada | comparativa BHU/ANV/bancos + simulador; alimenta `/comprar-o-alquilar-uruguay` |
| **Calendario de pagos BPS** | "bps cobro" 100, "fecha de cobro bps" 37, "bps fecha y lugar de cobro" 18; prensa "pagos BPS de octubre 2026" | 0 | página mensual "Pagos BPS de <mes> 2026: fecha y lugar por prestación". Es página nueva porque el mes es nuevo, la misma lógica del archivo del newsletter |
| **Suplemento solidario BPS** | Trending Now 10 sep: **10.000+** búsquedas; prensa: "más de $ 17 mil", pasivos | 0 | "quién lo cobra, cuánto, cómo se calcula" |
| **Pensión por vejez** | Trending Now 13 sep: 2.000+ | 0 | requisitos y monto 2026 |
| **Jubilación mínima / por incapacidad / "mi jubilación estimada"** | "jubilación mínima" 26; "por enfermedad" +90 %, "por incapacidad" +50 %; "bps mi jubilación estimada" breakout | `/cuando-me-puedo-jubilar-uruguay` fuera del top 300 | tres secciones en la página existente |
| **Elecciones del BPS, 22 nov 2026** | "elecciones bps 2026 son obligatorias" breakout, "circuitos" +2.350 %, "padrón" +1.000 % | 0 | voto obligatorio; multa de 1 UR (trabajadores, jubilados), 2 UR (funcionarios públicos y profesionales UdelaR), 6/12/20 UR empresas; exentos mayores de 75 y prestaciones por incapacidad ([El Observador](https://www.elobservador.com.uy/nacional/elecciones-obligatorias-bps-2026-cuando-se-vota-quienes-estan-obligados-y-cuanto-sale-la-multa-no-hacerlo-n6054566), [Montevideo Portal](https://www.montevideo.com.uy/Noticias/Elecciones-del-BPS-2026-quienes-votan-como-consultar-el-padron-y-cuales-son-las-multas-uc973797)). **Ángulo único**: el sitio tiene la UR del día, así que puede publicar la multa en pesos actualizada. Vale sólo si sale en las próximas dos semanas |
| **Mercado Pago para cobrar** | "cuánto es la comisión de mercado pago" breakout, "mercado pago pos" +1.150 %, "point smart" breakout, "tarjeta prepaga" breakout, "préstamo mercado pago" +120 % | comisiones de MP: 0 | "Comisiones de Mercado Pago en Uruguay para cobrar: Point, QR, link, plazos de liberación"; conecta con monotributo y qué empresa abrir |
| **UTE** | "plan redondo ute" +350 %, "ute premia", "reclamo por corte de luz" +70 %, "duplicado factura" 32 | `/factura-de-ute-uruguay` existe; Plan Redondo y corte de luz: 0 | dos secciones: "Plan Redondo: cuándo conviene" y "corte de luz: cómo reclamar y qué compensación corresponde" |
| **Monotributo categorías 2026** | "categorías monotributo 2026" breakout, "mides monotributo" 99 | `/facturar-en-monotributo-uruguay` 509 impr / 8 clics | tabla de categorías 2026 + monotributo social MIDES |
| **Seguro de paro** | "seguro de paro parcial" +150 %, "cuánto se cobra" +160 % | 1.477 impr, 6 clics, **0,41 %** | el monto en la descripción (hoy no está) y sección de paro parcial |
| **Salario vacacional** | "simulador de licencia y salario vacacional" 15; pico diciembre | página existe, sin simulador | calculadora de licencia + salario vacacional antes de diciembre |
| **AFAP / Ley 20.130** | "ley 20130" +300 %, pico abril 2026 | `/desvincularme-de-la-afap-uruguay` 401 impr / 2 clics / 0,5 % | refrescar antes de abril 2027 con la ventana y el número en el snippet |
| **Cédula nueva / pasaporte** | "nueva cédula de identidad uruguay" breakout; "qué necesito para sacar el pasaporte" +100 %, "pasaporte precio" 14 | páginas existen | secciones cortas en las páginas de costo de cédula y pasaporte |
| **Prex y BROU, utilidades** | "cómo transferir de brou a prex" +50 %, "payoneer" +1.150 % en 90 d, "prextamo" +60 %, "conversor de cuentas brou" +60 %, "llave digital brou" +70 % | las páginas de Prex son las de mejor CTR del sitio (`prex cotizacion dolar` 31 %) | guía corta "Cobrar como freelancer: Payoneer → Prex o BROU, costos y plazos"; FAQ de transferencias BROU→Prex |

---

## 5. Calendario de publicación que sale de la estacionalidad medida

| cuándo | qué | por qué esa fecha |
|---|---|---|
| **ahora → 30 sep** | FONASA 2026 (refresh); nafta (página nueva); impuesto Temu y BFE Express | pico de FONASA en curso; ajuste de combustibles a fin de mes |
| **oct** | Elecciones BPS (22 nov); calendario de pagos BPS de octubre; Mercado Pago comisiones | padrón cerrado el 14 sep, campaña en marcha |
| **10–15 dic** | Patente 2027; aguinaldo diciembre 2026; simulador de licencia y salario vacacional | búsquedas arrancan la última semana de diciembre; aguinaldo pica el 7 dic |
| **ene** | comparativa de garantías de alquiler (publicada antes) | "alquiler" pica 4–25 ene (96–100) |
| **mar–abr** | AFAP Ley 20.130; Limpia Sueldos si se repite | pico de "afap" 19–26 abr 2026 |
| **may–jun** | Declaración IRPF 2027; aguinaldo junio | cierre de declaraciones el 26 jun 2026 fue el pico de "irpf" |
| **jul–ago** | Devolución IRPF 2027; FONASA 2027 | devolución IRPF desde fines de julio; FONASA pica 30 ago |
| **mensual** | precio de la nafta (última semana); pagos BPS (primera semana) | picos mensuales medidos |

---

## 6. Lo que Trends dice que NO hay que perseguir

- **Dólar, euro y conversiones.** Ya está medido: 56 consultas, 128.490 impresiones (51 % del
  total), 34 clics. Lo que sube en "dólar" es "bitcoin valor dólar" +150 % y "dólar hoy colombia"
  +90 %: ruido. Nada nuevo que hacer más allá del CTR de las páginas propias.
- **"real"**: el índice lo domina el Real Madrid (100 contra "real a peso" 2). Ninguna página con
  "real" en el título va a medirse por Trends.
- **bitcoin**: fuera de alcance por política del sitio y además la cola es en inglés y global
  ("bitcoin price", "how to buy bitcoin safely").
- **"estafa"**: películas ("la gran estafa" 100). `/estafas-uruguay` no se mueve por acá.
- **inflación, canasta básica, mutualista**: promedio ≤ 1 en su índice; no hay demanda que
  justifique páginas nuevas (sí existe "calculadora inflación", 26 impresiones en GSC).
- **Trending Now a 7 días**: 256 ítems, casi todos fútbol y clima. Lo único de plata fue BPS
  (10.000+ y 1.000+) y "pensión" (2.000+, dos veces). El filtro por categoría de la API devolvió lo
  mismo para Negocios, Compras y Ley: no sirve para acotar.

---

## 7. Hallazgos colaterales en Search Console (no son Trends, pero aparecieron al cruzar)

- `/indicadores/unidad-reajustable`: **25.028 impresiones, 12 clics, 0,05 %**, posición 9,7. La
  consulta "valor de la ur hoy" es nueva con 1.193 impresiones, más "unidades reajustables" 464 y
  "precio unidad reajustable" 347, y el job de GSC la marca como canibalizada con el conversor.
  Es el mismo defecto que tenía `/historico/bcu`: el snippet no trae el número. Poner el valor de
  la UR en título y descripción.
- `/herramientas/conversor-unidad-indexada`: 24.924 impresiones, 66 clics, 0,26 %.
- "cambio principal": 3.869 impresiones en posición 6,3 con dos URLs propias compitiendo; el job
  estima 53 clics potenciales.
- Totales de la ventana: 563.625 impresiones y 2.635 clics contra 459.971 y 1.951 de la ventana
  anterior; posición 8,6.

---

## 8. Método y límites

- **Explore de Google Trends** (`geo=UY`, `today 12-m` y `today 3-m`) leído desde un navegador
  real con sesión: la API interna (`/trends/api/explore` → `widgetdata/relatedsearches` y
  `widgetdata/multiline`) devuelve 429 al primer intento en frío; hay que cargar la home de Trends
  antes (cookie) y dejar **4 segundos entre widgets**; más rápido corta a partir del sexto.
- **Semillas** (≈55): dólar, euro, real, peso argentino, casa de cambio, tarjeta de crédito,
  préstamo, BROU, Prex, IRPF, aguinaldo, BPS, seguro de paro, salario vacacional, sueldo, alquiler,
  garantía de alquiler, Temu, Shein, aduana, plazo fijo, jubilación, AFAP, monotributo, FONASA,
  patente, SUCIVE, libreta de conducir, cédula, pasaporte, UTE, Antel, mutualista, supermercado,
  inflación, Mercado Pago, Itaú, Santander, OCA, tarjeta de débito, nafta, combustible, boleto,
  canasta básica, bitcoin, garantía, estafa, reclamo, auto usado, auto eléctrico.
- **Escala**: cada grupo de cinco se normaliza a su propio máximo; por eso "dólar" promedia 59,7 en
  un grupo y 32,3 en otro. El porcentaje "de dólar" es siempre dentro del mismo grupo. "alquiler"
  no compartió grupo con "dólar" (429 en tres intentos) y se derivó vía "temu"; tomarlo como
  aproximado.
- **Trending Now** (`batchexecute`, rpc `i0OFE`, 168 h) funciona sin cookie; el parámetro de
  categoría en esa posición no filtra. **RSS diario** (`/trending/rss?geo=UY`) es lo que ya usa
  `currency-trends`.
- Trends mide búsquedas, no clics disponibles. Toda oportunidad se cruzó con el pozo cero-clic de
  GSC antes de listarla.
