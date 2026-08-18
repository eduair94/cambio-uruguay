# Radar de tendencias — 18 de agosto de 2026

Barrido multi-modal de redes sociales, prensa y búsquedas para decidir qué publicar.
Seis canales barridos en paralelo, tres estrategas rankeando con sesgos distintos, y
cuatro ángulos de investigación sobre el tema ganador.

**Regla del barrido**: cada señal se reporta con su métrica real y su URL. Lo que no se
pudo medir está anotado como no medido, no estimado.

---

## 1. Lo que está caliente ahora

### Convergencia en tres canales: el IMESI a los autos eléctricos

Es la única señal que apareció, de forma independiente, en YouTube, en X y en los datos
propios de Search Console.

| canal | señal medida |
|---|---|
| YouTube UY | «¿Conviene comprar un auto eléctrico en Uruguay en 2026?» **100.748 vistas**; «¿Vale la pena un Tesla en Uruguay?» **34.073 en 3 semanas**; «Llegó Tesla a Uruguay» **33.667 en 1 mes** |
| X / Twitter | @DerechaDiarioUY (17-ago): 54 likes / 19 RT / 755 views sobre el IMESI a eléctricos; @ObservadorUY 2.031 views entrevistando al líder del mercado por «distorsión de precios» |
| Search Console (propio) | cluster «IMESI»: **507 impresiones, 0 clics**, posición 9,3–10,1 — hoy lo atiende una ficha de glosario que no gana nada |

Tiene además reloj: el decreto rige desde el **1° de enero de 2027**, así que hasta el
31 de diciembre de 2026 la decisión de compra cambia de precio según la fecha.

**→ Se convirtió en la página nueva.** Ver sección 3.

### El resto del ranking, por si sirve después

| tema | señal | estado |
|---|---|---|
| Rendición de Cuentas 2026 | aprobada en Diputados 50-49 tras 18 h de sesión (17-ago). Se financia con el «impuesto Temu» y el IRPF a rentas de capital del exterior | sin página; la respuesta honesta es «a la mayoría no le cambia nada» |
| Dólar arriba de $40 | 41 jornadas consecutivas por encima de $40; interbancario 40,319; pizarra BROU 39,10 / 41,50 | ya cubierto por /por-que-sube-el-dolar y la pizarra |
| Brecha con Argentina | saltó de 15 % (mayo) a **25,03 %** (julio), empujada por el tipo de cambio | encaja con /frontera/\<ruta\>; sin página de «¿conviene cruzar?» |
| Ticketmaster desembarcó en Uruguay | r/uruguay 100 pts / 85 comentarios; la SERP más vacía que se midió (~56 resultados indexados) | tema lejos del core; ningún porcentaje es publicable sin medir el checkout real |
| «¿Me pueden descontar una deuda del sueldo?» | dos hilos en 3 semanas (77 y 46 comentarios) | la norma (Ley 17.829 art. 3, piso del 35 %) YA está en `utils/debtRelief.ts` — es expandir, no crear |
| Costos de comprar vivienda | r/uruguay 47 pts / 46 comentarios con el desglose real de una compra de US$ 155.000 | candidato fuerte para una calculadora de gastos de escrituración |
| Rendimiento del saldo en billeteras | r/Burises: 62 comentarios; 5,32 % anunciado vs ≈1,2 % percibido | ya cubierto por /cuenta-remunerada-uruguay |

### Lo que el barrido dejó anotado como riesgo

- **Los datos de Search Console del repo tienen 6 semanas** (ventana 2026-04-05 a
  2026-07-04) y están truncados en 1.000 filas: cualquier consulta con 0 clics y menos de
  31 impresiones es invisible. El «cero absoluto» de aduana / IRPF / alquiler **no prueba
  que no haya demanda**, prueba que no pasó ese corte.
- **Instagram y Facebook no se pudieron medir sin login.** Lo que se reporta de redes
  sociales sale de YouTube (donde las vistas son legibles por HTTP) y de X vía
  `api.fxtwitter.com`. Anotado como hueco, no completado a ojo.
- **Un conflicto con el plan de julio**: §P1.2 manda canonicalizar
  `/historico/[origin]/INTERBANCARIO` hacia `/usd`. Medido, esa URL tiene 2.107
  impresiones y hay 410 impresiones de consulta explícita por «dólar interbancario».
  Ejecutar esa canonicalización tal cual apaga el único punto de captura de ese intent.

---

## 2. Lo que el barrido corrigió del propio análisis

Tres cosas que los estrategas dieron por buenas y la investigación contra fuente primaria
desarmó. Quedan acá porque son el tipo de error que vuelve:

1. **El decreto no es «MEF 403»** (como publicó Autoblog). Es el **147/026**, promulgado
   el 30/06/2026.
2. **No existe el «factor 2» ni el «doble IMESI»** como regla jurídica. El Decreto 520/007
   art. 1 fija la base en el precio REAL de venta al distribuidor; el único factor del
   numeral 11) es 0,90, que la reduce. Se iba a publicar como «el hallazgo diferencial de
   la página» y habría sido un error de hecho.
3. **Hay que citar el Texto Ordenado 2023, no el de 1996.** La página de IMPO del TO 1996
   conserva la redacción vieja del inciso final del numeral 11), sin «valor en aduana» —
   citarla haría parecer que el decreto no tiene base legal.

---

## 3. La página que salió: /impuesto-autos-electricos-uruguay

Generada con Claude corriendo en el servidor 104 (`/root/claude-agent-api`, pm2
`Claude_Agent_API`), contra un dossier de investigación ya verificado.

### El hallazgo que la justifica

**Toda la prensa uruguaya publicó una sola columna de una tabla de cuatro.**

El Decreto 147/026 no fija tres tasas (0 / 5 / 9 %). Fija una **matriz** de 3 tramos de
valor en aduana × 4 columnas de motorización × 6 filas de cilindrada. El 0 / 5 / 9 % es
sólo la columna de eléctricos puros. Las 18 celdas de híbridos no las publicó nadie.

De ahí salen dos consecuencias que ningún medio contó:

- **El tramo de hasta US$ 19.000 no es «exento».** El 0 % es exclusivo de los eléctricos
  puros; un híbrido en ese mismo tramo paga entre 2 % y 34,5 %.
- **Para los híbridos de valor en aduana bajo no cambia nada**: las tasas del decreto
  nuevo son idénticas a las vigentes. Lo que cambia empieza en US$ 19.001, y ahí un
  enchufable pasa de 2 % a 7 %, y a 11 % por encima de US$ 27.000.

Las tasas **no están en el HTML de IMPO** — los literales a), b) y c) aparecen con la
celda vacía. Están sólo en la imagen del Diario Oficial Nº 31.948, carillas 224-225, y de
ahí se transcribieron, celda por celda.

### Lo que la página se niega a publicar

- **Una tabla «modelo → precio final».** El valor en aduana por modelo no es público y no
  existe canal donde consultarlo. El propio subsecretario del MEF dijo que «no hay una
  regla única» para convertirlo en precio de vidriera.
- **El «doble IMESI»**, por lo dicho arriba.
- **Una fecha de corte para el stock importado en 2026 que se vende en 2027.** El decreto
  no tiene artículo transitorio. Se publica como agujero, con lo que sí fija la norma
  (hecho generador = primera enajenación del importador; anticipo con la alícuota de la
  fecha de importación) y con el consejo de dejar fecha y precio por escrito en la reserva.

---

## 4. Distribución sugerida (NO ejecutada)

Nada de esto se publicó: las cuentas sociales quedan a criterio del maintainer.

- **X**: el ángulo con novedad real es la matriz de híbridos, no «llegó el impuesto». El
  hilo tiene que abrir con «la prensa publicó una columna de cuatro» y cerrar en la
  página. El publicador ya existe (`bots/src/publish/twitter.ts`), detrás de
  `CONTENT_PROMO_ENABLED`.
- **Reddit**: hay un hilo vivo y pertinente en r/AutosUy («Cambio en IMESI de autos
  eléctricos», 42 comentarios) donde los usuarios están calculando mal (aplican la tasa
  directo sobre el valor en aduana e ignoran margen e IVA). **Pero la cuenta del bot está
  baneada en r/AskUruguayan desde el 18-ago y los pipelines sociales están apagados** — no
  conviene tocar Reddit con esa cuenta hasta resolver eso.
- **Momento**: el tema tiene fecha de vencimiento el 31/12/2026. Cuanto más cerca de
  diciembre, más valor tiene la ventana de compra; después del 1/1/2027 la intención muta
  a «cuánto IMESI paga este modelo», que es permanente.

---

## 5. Borradores listos (sin publicar)

Escritos para publicarse tal cual si el maintainer da el OK. El ángulo no es «llegó el
impuesto» —eso ya lo contaron todos— sino que la prensa publicó una columna de cuatro.

### Hilo para X

> 1/ El decreto que le pone IMESI a los autos eléctricos desde enero de 2027 no fija tres
> tasas. Fija una matriz de 3 tramos × 4 motorizaciones × 6 cilindradas.
> Todos los medios publicaron una sola columna: la de eléctricos puros.
>
> 2/ La razón de que nadie la publicara: las tasas **no están** en el texto del decreto en
> IMPO. Los literales a), b) y c) aparecen con la celda vacía y una nota que remite a "la
> imagen electrónica". Están sólo en el PDF del Diario Oficial Nº 31.948, carillas 224-225.
>
> 3/ Lo que aparece cuando la leés: "hasta US$ 19.000 no paga" es falso. El 0 % de ese
> tramo es exclusivo del eléctrico puro. Un híbrido en el mismo tramo paga entre 2 % y
> 34,5 %.
>
> 4/ Y al revés: para los híbridos de valor en aduana bajo **no cambia nada**. Esas tasas
> son idénticas a las que ya rigen. El cambio arranca en US$ 19.001: ahí un enchufable
> pasa de 2 % a 7 %, y arriba de US$ 27.000 a 11 %.
>
> 5/ Dos cosas más que conviene saber antes de firmar algo:
> · el umbral es **valor en aduana**, no precio de vidriera (≈ US$ 29-30 mil según el MEF)
> · el decreto no tiene artículo transitorio: qué pasa con lo importado en 2026 y vendido
> en 2027 no está resuelto por norma
>
> 6/ La matriz completa, las definiciones de cada subcategoría de híbrido (con la aclaración
> de que start/stop no cuenta) y por qué "9 % de IMESI" no es "el auto sube 9 %":
> cambio-uruguay.com/impuesto-autos-electricos-uruguay

### Comentario para r/AutosUy (hilo «Cambio en IMESI de autos eléctricos»)

Pendiente de resolver el estado de la cuenta — ver sección 4. El aporte útil ahí es
concreto: en ese hilo se está calculando el impacto como `tasa × valor en aduana`, y eso
ignora que la base del IMESI es el precio de venta del importador al distribuidor
(Decreto 520/007 art. 1) y que el IVA se calcula sobre una base que ya incluye el IMESI
(Título 10 art. 12). El comentario tiene que aportar eso **sin enlace** si la cuenta sigue
con problemas de karma.
