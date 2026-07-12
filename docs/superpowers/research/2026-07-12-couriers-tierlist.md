# Investigación: couriers e importación en Uruguay — datos verificados

**Fecha:** 2026-07-12
**Alcance:** 21 opciones de importación (16 couriers de casillero, 1 marketplace, 1 postal, 3 express).

## Cómo se produjo esta data

1. **Tarifas y fichas de Google.** Un agente por operador leyó la tarifa publicada y buscó su ficha de Google Maps. Después, un **verificador adversarial** por operador, con la instrucción de *refutar* y de dar por falso todo número que no pudiera confirmar contra la fuente primaria.
   → **19 de 21 perfiles fueron refutados**, con **112 correcciones** en total. Esa es la medida de cuán poco confiable es la primera pasada: casi ningún perfil sobrevivió intacto.
2. **Opiniones.** Se minó Reddit con la API (r/uruguay, r/Burises, r/UruguayFinanzas, r/Montevideo, r/AskUruguay): **1.513 posts y 7.862 comentarios**. Se partió en oraciones, se atribuyó cada una a su sujeto real y se pasó un *guard* anti-misattribution sobre cada cita.
3. **Fusión.** Un agente por entidad aplicó las correcciones sobre el perfil y sumó el análisis de Reddit. Donde el verificador refutó un número **y no pudo dar el correcto**, el campo quedó en `null` y figura en *Gaps*.

### El scorer por keywords no sirve (hallazgo)

Se probó un léxico determinístico contra el corpus real. **Publica falsedades:**

- Tiendamia daba **net −5**; leyendo las oraciones, el neto real es **−70** (27 de 28 opiniones negativas).
- Contó como elogio a Tiendamia la frase *"Yo recomiendo PuntoMio antes que estos chorros"* — un insulto.
- Leyó como positivas frases sarcásticas ("actuó más rápido que la velocidad de la luz").

Las frases **comparativas** invierten el sujeto y el **sarcasmo** invierte la polaridad; ningún léxico agarra ninguna de las dos. Por eso en producción la AI etiqueta cada oración (cacheada por hash) y la agregación queda determinística.

### Envenenamiento de ficha detectado

El investigador de **Correo Uruguayo** pineó una ficha llamada literalmente *"Casilla"* — que es la de **Casilla Mía**. Ambos perfiles traían "2,0 ★ / 89 reseñas". De publicarse, el correo postal habría mostrado el rating de otra empresa. Por eso las fichas se pinean **por `place_id` verificado a mano** y nunca por búsqueda de texto.

---

## Tabla resumen

| Operador | Tipo | Paquete chico | Manejo | TSPU | Google | Reddit | Cumpl. | Aten. | Transp. | Cob. |
|---|---|---|---|---|---|---|---|---|---|---|
| **Gripper** | Courier | US$ 21,9/kg | US$ 5 | +10% | 4,9 ★ (?) | usable (+30) | 74 | 72 | 62 | 55 |
| **SoyCourier** | Courier | US$ 14,99/kg | US$ 14,99 | — | **sin ficha** | **sin muestra** | — | — | 8 | 15 |
| **UruguayCargo** | Courier | US$ 19,5/kg | US$ 4 | +10% | 3,2 ★ (12) | **sin muestra** | — | 40 | 45 | 30 |
| **Envía Mi Compra** | Courier | US$ 21,9/kg | US$ 5 | — | 4,2 ★ (?) | fina (+25) | 60 | 55 | 40 | 45 |
| **Aerobox** | Courier | US$ 23,5/kg | US$ 5 | +10% | 4,2 ★ (?) | usable (+18) | 58 | 66 | 55 | 38 |
| **Casilla Mía** | Courier | US$ 20/kg | — | +10% | **sin ficha** | fina (-40) | 25 | 20 | 45 | 45 |
| **Punto Mío** | Courier | US$ 16/kg | — | — | 4,5 ★ (1392) | usable (+35) | 60 | 50 | 32 | 68 |
| **USX Cargo** | Courier | US$ 17,5/kg | US$ 0 | — | 4,7 ★ (950) | usable (+58) | 82 | 74 | 68 | 64 |
| **Urubox** | Courier | US$ 19,9/kg | US$ 5 | +10% | 4 ★ (576) | usable (+40) | 64 | 58 | 38 | 68 |
| **StarBox Uruguay** | Courier | US$ 21/kg | US$ 5 | +10% | 4,6 ★ (149) | **sin muestra** | 72 | 70 | 55 | 45 |
| **BuyBox** | Courier | US$ 21/kg | US$ 5 | +10% | 3,9 ★ (438) | fina (+55) | 62 | 58 | 55 | 72 |
| **Grinbox** | Courier | US$ 22/kg | US$ 4 | +10% | 4,8 ★ (61) | **sin muestra** | 60 | — | 42 | 55 |
| **Glic** | Courier | US$ 21,5/kg | US$ 5,99 | +10% | 3,6 ★ (506) | fina (+40) | 38 | 30 | 25 | 55 |
| **Miami Box** | Courier | US$ 25,9/kg | US$ 6 | — | **sin ficha** | usable (-35) | 38 | 25 | 30 | 35 |
| **EXUR Envíos** | Courier | US$ 18 fijo | US$ 0 | — | 4,4 ★ (1028) | usable (+60) | 62 | 50 | 33 | 38 |
| **Logistika.US** | Courier | US$ 130 fijo | US$ 10 | — | **sin ficha** | **sin muestra** | — | — | — | 20 |
| **Tiendamia** | Marketplace | US$ 21,99/kg | US$ 1,99 | — | 1,5 ★ (45) | usable (-70) | 32 | 28 | 18 | 60 |
| **Correo Uruguayo (Casilla Mía)** | Postal | US$ 20/kg | — | +10% | **sin ficha** | usable (-70) | 22 | 20 | 18 | 50 |
| **DHL Express Uruguay** | Express | US$ 32,18/kg | US$ 15 | — | 4,6 ★ (616) | usable (-20) | 62 | 58 | 50 | 55 |
| **FedEx Uruguay** | Express | US$ 134,3 fijo | — | — | 4,1 ★ (160) | fina (-30) | 62 | 45 | 70 | 72 |
| **UPS Uruguay (Sibel S.A.)** | Express | US$ 23,9/kg | — | — | 2,7 ★ (148) | **sin muestra** | 30 | 35 | 45 | 60 |


**Leer la tabla con cuidado:** "paquete chico" es el primer tramo de peso y **no es el precio final** — casi todos suman manejo y el 10% de TSPU arriba. Un guión en una columna de score significa *sin evidencia suficiente*, no cero: en el tierlist esa dimensión queda **ausente** y los pesos se re-normalizan.

---

## Ficha por operador

### Gripper `gripper` — Courier

> El premium: llega bien y la web es la mejor, pero pagás de más.

Casillero propio en Miami (Opa Locka, FL), vuelo a Montevideo y entrega a domicilio sin costo en la capital. Solo EE.UU.

**Tarifa** (verificada 2026-07-12, [fuente](https://www.gripper.com.uy/tarifas)):

```json
{
 "quoteOnly": false,
 "tiers": [
  {
   "maxKg": 0.899,
   "flat": 19.8,
   "perKg": null
  },
  {
   "maxKg": 5,
   "flat": null,
   "perKg": 21.9
  },
  {
   "maxKg": 20,
   "flat": null,
   "perKg": 16.5
  },
  {
   "maxKg": 40,
   "flat": null,
   "perKg": 13.2
  }
 ],
 "minChargeUsd": null,
 "handlingUsd": 5,
 "handlingPlusIva": false,
 "tspuPct": 10,
 "clearanceUsd": null,
 "interiorUsd": 4,
 "booksPerKg": 12,
 "insuranceIncluded": null,
 "freeStorageDays": 30,
 "originsPerKg": {
  "us": 21.9,
  "eu": null,
  "cn": null,
  "ar": null
 },
 "transit": "3 a 7 días hábiles según la home; 3 a 6 en /comprar-en-usa — la propia web se contradice. No hay calendario de vuelos publicado: en /tarifas solo corre una cuenta regresiva en JS ('Próximo vuelo MIA-UY cierra en...'), sin frecuencia ni fecha en el HTML."
}
```

**Letra chica:** SOLO MIAMI / EE.UU. No tienen casillero en Europa, China ni Argentina: su propia página de China te dice que triangules la compra por la dirección de Miami y pagues la tarifa normal de EE.UU. Los orígenes eu/cn/ar son null porque no existe el servicio, no porque falte el dato.

LO QUE PAGÁS DE VERDAD: la tarifa publicada NO incluye el 10% de TSPU ('Las tarifas no incluyen el 10% de TSPU') y encima va el manejo. Un paquete de 1 kg anunciado a USD 21,90/kg te termina saliendo ~21,90 + 5 + 10% ≈ USD 29,6 antes de impuestos.

MANEJO: USD 5 por consolidado de hasta 5 envíos; USD 1 por cada envío adicional pasados los 5. Ojo: la home publicita 'Consolidación sin costo' y la página de tarifas cobra ese USD 5. Es una contradicción real, verificada en las dos páginas.

MÍNIMO: cualquier paquete de hasta 899 g paga el flat de USD 19,80. No publican un 'cargo mínimo' como concepto aparte.

LIBROS/CD/DVD/VINILOS: USD 12/kg, mínimo facturable 600 g, y la web dice que NO aplica manejo. Un usuario que los llamó en 2024 dice que le cobraron igual los USD 5 + el 10%. Sin resolver: no lo tomes como all-in.

INTERIOR: USD 4 el primer kg + USD 0,50 por kg adicional, ARRIBA del flete. Dentro de Montevideo, entrega a domicilio sin costo.

DEPÓSITO: 30 días gratis. Del día 31 al 90, USD 1,00 POR DÍA POR KILO — escala con el peso: un paquete de 10 kg te acumula ~USD 10 por día. Pasados los 90 días, mercadería en abandono (la perdés).

DESPACHO (NO es rutina): solo si Aduana te retiene el envío. USD 10 si lo transportó Gripper, USD 25 por guía aérea si no, MÁS ~USD 25 de almacenaje en la terminal de cargas. Un envío retenido suma ~USD 35 extra antes de cualquier impuesto. Por eso dejamos clearanceUsd en null: no es un cargo que pagues en un envío normal.

ARRIBA DE 40 KG: 'Cotizar carga', sin tarifa publicada. Sobrecargo por volumen: lo reconocen ('puede existir un sobrecargo') pero no publican fórmula ni divisor — cotización por mail.

AMBIGÜEDAD DE TRAMOS (importante): la tabla dice 'Costo por kilo' por bracket pero no aclara si el precio se aplica al peso TOTAL o solo al tramo. Leída literal, la escala es no monotónica: 5,0 kg = 5 × 21,90 = USD 109,50, pero 5,1 kg = 5,1 × 16,50 = USD 84,15 — el paquete más pesado sale MÁS BARATO. No le creas a ninguna calculadora sin confirmarlo con ellos.

OTROS CARGOS PUBLICADOS: devolución dentro de EE.UU. USD 20 + envío; reenvío dentro de EE.UU. USD 20 por dirección + envío local; retiro en el depósito de Miami USD 5 por envío + USD 10 de manejo; verificación de mercadería USD 5 (1-5 piezas) / USD 10 (6-10) / USD 20 (11-20).

**Google:** `ChIJaxnp_IZ_n5URQbshASuZCzU` — "Gripper" · **4,9 ★** (? reseñas) · [ficha](https://www.google.com/maps/place/?q=place_id:ChIJaxnp_IZ_n5URQbshASuZCzU)

**Reddit:** muestra **usable** · neto **+30** sobre 12 opiniones

Reddit trata a Gripper como el courier 'premium': las opiniones sobre el servicio son buenas y bastante parejas (rápidos, responden, resuelven, casi nadie reporta que un envío falle), pero el reproche es constante y atraviesa todos los años del muestreo: es caro, 'sale un huevo'. La queja concreta más útil es que cobra depósito si no retirás el paquete a tiempo; casi todos los otros hilos donde 'algo salió mal' son en realidad problemas de Aduana/URSEC, no de Gripper. Ojo: de 41 frases muestreadas solo 12 son opiniones reales, y dos de los elogios más fuertes salen del mismo comentario del mismo usuario.

> *"1- Vengo usando Gripper y la verdad que lo super recomiendo porque trabajan re bien, rapidísimo y la atención al cliente es muy buena pero sale un huevo."* — [r/uruguay, 2019-03-21](https://reddit.com/r/uruguay/comments/b3w177/preguntas_sobre_couriers_y_grabr/) (mixto)

> *"Usa Gripper, el servicio es bueno y siempre me atendieron bien, respondieron consultas y todo."* — [r/uruguay, 2026-05-07](https://reddit.com/r/uruguay/comments/1t6gkg8/hice_una_compra_por_tiendamia_y_resulta_que_al/okhhkyu/) (positivo)

> *"Lo que tiene gripper en contra es que te retiene los paquetes por pocos días y si no te comienza a cobrar, busca otro que no haga eso"* — [r/uruguay, 2024-04-05](https://reddit.com/r/uruguay/comments/1bwsp0v/me_cagaron/ky8fgbn/) (negativo)

**Scores propuestos:** cumplimiento **74** · atención **72** · transparencia **62** · cobertura **55**

- *cumplimiento:* Muestra de Reddit usable (12 opiniones reales): casi nadie reporta un envío fallido, y en el hilo 'USX son unos cagadores' (2026-02) lo usan como contraste favorable ('nunca me había pasado con gripper ni urubox'). Google 4,9 (rating confirmado por el fact-checker). Le descontamos por incidentes concretos y fechados: un error de Gripper cargando el valor declarado (2022-03-29, puede quemarte una franquicia), reseñas de cajas entregadas abiertas, y una última milla doméstica lenta (llegó el vuelo del martes, liberado el viernes de tarde).
- *atencion:* Reddit no tiene una sola queja de atención en las 41 frases muestreadas: responden consultas, atienden bien, y a un usuario le resolvieron un envío mal entregado en EE.UU. Contrapeso verificado: el dato más reciente (2026-07-07) dice 'si tenes que comunicarte con algún problema, te deseo suerte', y reseñas de Google señalan que el chat humano pasó a ser un bot. Bien en el camino feliz, discutido en el camino de falla.
- *transparencia:* Publican la tarifa completa y verificable: el fact-checker re-chequeó cada tramo, precio, mínimo y borde contra /tarifas y no encontró UN solo error — eso es evidencia dura y es más de lo que hace la mayoría. Pero el precio de vidriera no es el precio (el 10% de TSPU va arriba y el manejo no está en el titular), la home dice 'Consolidación sin costo' mientras la tarifa cobra USD 5, el tránsito se contradice entre sus propias páginas (3-7 vs 3-6 días), del seguro no publican absolutamente nada, y la tabla por kilo es ambigua al punto de ser no monotónica.
- *cobertura:* Determinístico: un solo origen de cuatro (solo Miami/EE.UU.; China se triangula por Miami; nada de Europa ni Argentina) — es la limitación más pesada. A favor: entrega al interior tarifada (USD 4 + 0,50/kg), domicilio gratis en Montevideo, 30 días de depósito sin costo y tarifa de libros a USD 12/kg. En contra: seguro no publicado y ninguna mención a descuento de IVA.

**Banderas rojas:**

- El precio publicado NO es el precio final: el 10% de TSPU está explícitamente excluido ('Las tarifas no incluyen el 10% de TSPU') y encima va el manejo de USD 5. Un paquete de 1 kg anunciado a USD 21,90/kg te sale ~USD 29,6 antes de impuestos.
- Contradicción en su propia web: la home publicita 'Consolidación sin costo — Puedes unir la cantidad de envíos que quieras, sin costo adicional', pero la página de tarifas cobra 'un cargo único de USD 5 por manejo' en consolidados de hasta 5 envíos. Consolidar no es gratis.
- El depósito después de los 30 días gratis es USD 1,00 por día POR KILO, no por paquete: un paquete de 10 kg te acumula ~USD 10 por día y en una semana se come el flete. A los 90 días la mercadería queda 'en abandono' y la perdés.
- La tabla por kilo no aclara si el precio se aplica al peso TOTAL o solo al tramo. Leída literal es no monotónica: 5,0 kg = USD 109,50 (a 21,90) pero 5,1 kg = USD 84,15 (a 16,50) — el paquete más pesado sale más barato. No le creas a ninguna calculadora sin confirmar con Gripper cuál es la lectura correcta.
- La tarifa de libros (USD 12/kg) está discutida: la web dice 'No aplica manejo', pero a un usuario que los llamó (2024-05-09) le dijeron que igual le cobraban los USD 5 de manejo y el 10%. No la cotices como all-in sin reconfirmar.
- Solo Miami/EE.UU. No hay casillero en Europa, China ni Argentina — su propia página de China te manda a triangular por Miami pagando la tarifa normal de EE.UU. Si necesitás origen europeo o argentino, Gripper no te sirve.
- Del seguro no publican NADA: ni cobertura, ni tope, ni precio, ni declaración de responsabilidad. No asumas que estás cubierto.
- Es más estricto que la competencia con artículos restringidos: cosas que Gripper te tranca (arrancadores de auto, litio) pasan en USX (2025-07-28). Si traés algo con batería o de categoría rara, es el courier más probable que te lo pare.
- Al menos una vez cargó mal un valor declarado (2022-03-29: puso el costo de envío de ~USD 10 como valor del producto), en una factura que el cliente ni siquiera había subido. Bajo el régimen de franquicia un valor declarado mal te puede costar una franquicia o una retención.
- La atención se cae justo cuando la necesitás: el reporte más reciente (2026-07-07) dice 'si tenes que comunicarte con algún problema, te deseo suerte', y reseñas de Google señalan que el chat humano lo reemplazaron por un bot. El 4,9 refleja el camino feliz, no el de falla.
- Si Aduana te retiene el envío, el despacho suma: USD 10 (si lo transportó Gripper) o USD 25 por guía aérea, MÁS ~USD 25 de almacenaje en la terminal de cargas. Un retenido típico son ~USD 35 extra antes de cualquier impuesto.
- El tránsito anunciado se contradice entre sus propias páginas: '3 a 7 días hábiles' en la home vs '3 a 6 días hábiles' en /comprar-en-usa. Y ese plazo es Miami-Montevideo, no hasta tu puerta en el interior.
- La última milla al interior es la pata floja: no dan número de remito por defecto ('no informan número de remito y una vez que uno lo pide, demoran en pasarlo') y no trabajan fines de semana — a un reseñador el paquete le llegó en el vuelo del martes, se lo liberaron el viernes de tarde y salió al interior recién el lunes. Ojo: Gripper NO publica quién hace esa entrega, así que no podemos afirmar con qué agencia la terceriza.

**A favor:** 
- Publica la tarifa completa y es verdadera: re-chequeamos cada tramo, precio y borde contra gripper.com.uy/tarifas el 2026-07-12 y coincidieron todos, sin una sola trampa (ni per-kg disfrazado de flat, ni bordes corridos, ni manejo +IVA escondido).
- 4,9 en Google, y el listado es inequívocamente el de Gripper: dirección (Av. Italia 6530) y teléfono (2605 4736) coinciden con el pie de su propia web.
- Reddit no está enojado con ellos, que es raro en este rubro: en 12 opiniones reales casi nadie reporta un envío fallido. 'Trabajan re bien, rapidísimo' (2019); 'usé Exur y Gripper también sin inconvenientes'.
- Entrega a domicilio dentro de Montevideo SIN COSTO — diferencia concreta contra USX, que te la cobra ('USX es más barato, pero te cobran el envío dentro de MVD', 2026-05-27).
- No te cobra comisión por pagar los impuestos, algo que USX sí empezó a hacer ('ahora para pagar los impuestos te cobran comisión. Gripper no y la web es mucho mejor', 2026-07-07).
- El trámite de importación simplificada se hace entero desde la web y es lo que más le elogian: 'Generalmente uso Gripper, porque para hacer el trámite de importación simplificada es muy fácil todo y desde la web' (2025-07-28).
- 30 días de depósito gratis y tarifa promocional para libros, CDs, DVDs y vinilos a USD 12/kg (mínimo 600 g).
- Poca fricción con Aduana en el uso normal: 'Con ellos nunca he tenido que interactuar con la aduana' (2026-05-27).

**En contra:** 
- Es caro y es la queja transversal de Reddit desde 2019 hasta hoy: 'sale un huevo', 'gripper me pide un huevo, Miami box es de lo más barato que ví' (2022), y en 2026 lo recomiendan como 'opción premium' aclarando que se paga de más. Nadie en la muestra defiende el precio.
- El precio de vidriera engaña: TSPU 10% arriba + USD 5 de manejo que no están en el titular.
- Solo Miami. Ni Europa, ni China, ni Argentina.
- Del seguro no publican nada.
- El depósito post-30-días es por día Y por kilo: un paquete pesado olvidado se vuelve caro rapidísimo.
- El más estricto del mercado con artículos restringidos: lo que Gripper te tranca, en USX pasa.
- La atención en el caso de problema está discutida — es el dato más reciente que tenemos en contra (2026-07-07) y el chat humano pasó a bot.
- La estructura de tramos por kilo es ambigua y, leída literal, no monotónica: no se puede modelar sin confirmarla.
- Última milla al interior lenta y sin remito por defecto; no trabajan fines de semana.

**Para quién:** El que compra en Estados Unidos, quiere hacer el trámite de importación entero desde la web sin hablar con nadie, vive en Montevideo (la entrega a domicilio le sale gratis) y acepta pagar entre un 20% y un 40% más que la competencia por esa comodidad. También es la mejor opción para libros y vinilos, si confirmás antes que no te cobran el manejo. NO es para vos si el precio es lo que te decide, si comprás en Europa, China o Argentina, si traés algo con batería de litio o de categoría rara, o si vivís en el interior y el plazo te importa.

**Veredicto:** Gripper es el courier premium del mercado uruguayo y hay que decir las dos partes de eso. La parte buena es real y verificable: es de los pocos operadores cuya tarifa publicada resistió una auditoría número por número — re-chequeamos cada tramo, cada borde y cada mínimo contra su web el 2026-07-12 y no encontramos un solo error ni una sola trampa. Tiene 4,9 en Google con un listado que sin dudas es el suyo, la mejor web del rubro, el trámite de importación simplificada se hace solo, entrega gratis en Montevideo, no te cobra comisión por pagarte los impuestos, y Reddit —que en este rubro está enojado con casi todos— casi no reporta envíos fallidos con ellos. La parte cara también es real: es caro y esa queja es la única que se repite en TODOS los años del muestreo, de 2019 a 2026. Y el precio que ves no es el que pagás: el 10% de TSPU va arriba y el manejo de USD 5 tampoco está en el titular, así que un kilo anunciado a USD 21,90 aterriza cerca de USD 30 antes de impuestos — mientras la home te promete una 'Consolidación sin costo' que la página de tarifas desmiente. Tres cosas más que tenés que saber antes de decidir: no publican absolutamente nada sobre seguro, la tabla por kilo es tan ambigua que leída literal un paquete de 5,1 kg sale más barato que uno de 5,0 kg (no la metas en ninguna calculadora sin preguntarles), y son los más estrictos del mercado con lo restringido — lo que acá te trancan, en USX pasa. El tradeoff, dicho sin vueltas: pagás de más y a cambio comprás la probabilidad más alta de que no pase nada. Si algo igual pasa, el dato más reciente que tenemos (2026-07-07) dice que ahí la cosa se pone difícil: 'si tenes que comunicarte con algún problema, te deseo suerte'.

**Gaps (resolver a mano):**

- CANTIDAD DE RESEÑAS DE GOOGLE: sin confirmar. El investigador reportó 2.252 reseñas como verificado en vivo, pero el fact-checker no pudo reproducir ese número por ninguna vía de renderizado, y el único espejo disponible (yorugupino) dice 2.110. El rating 4,9 y la identidad del listado SÍ están confirmados. Publicamos el 4,9 sin número de reseñas: hay que contarlas a mano antes de mostrar una cifra.
- SEGURO: Gripper no publica absolutamente nada — ni cobertura, ni tope, ni precio de opt-in, ni declaración de responsabilidad. No se pudo establecer si existe. Es 'desconocido', no 'cero'. Hay que preguntárselo directamente.
- ESTRUCTURA DE TRAMOS: la web no dice si el precio por kilo se aplica al peso TOTAL o solo al peso dentro del tramo. Las dos lecturas difieren ~30% alrededor de los 5 kg y la lectura literal es no monotónica. Es el mayor riesgo de modelado de esta tarifa: hay que confirmarlo con Gripper antes de meterlo en ninguna calculadora.
- MANEJO EN LIBROS: la página de tarifas dice que a libros/CD/DVD/vinilos NO les aplica el manejo de USD 5; un usuario que llamó en 2024 dice que se lo cobraron igual (más el 10%). Sin resolver — puede ser un cambio de política a favor del cliente desde 2024, o la página puede estar mal.
- SOBRECARGO POR VOLUMEN: lo reconocen ('puede existir un sobrecargo en el transporte de cargas o envíos de gran tamaño y poco peso') pero no publican fórmula, divisor ni tarifa. Cotización por mail únicamente. No tenemos divisor volumétrico.
- TARIFAS ARRIBA DE 40 KG: 'Cotizar carga'. Sin precio publicado.
- SI EL 10% DE TSPU SE APLICA TAMBIÉN sobre el manejo, el depósito y el despacho, o solo sobre el flete. La web solo dice que las tarifas de flete lo excluyen.
- CALENDARIO DE VUELOS MIA-UY: no hay ninguno publicado. En /tarifas solo corre una cuenta regresiva en JavaScript, sin frecuencia ni fecha en el HTML servido. El 'vuelo semanal, los miércoles' que circula viene de un posteo de foro de 2024 y NO está confirmado — no lo publicamos como hecho.
- QUIÉN HACE LA ENTREGA AL INTERIOR: Gripper no lo publica en ninguna parte de su sitio. El 'terceriza en DAC' que traía el perfil original era una inferencia sobre una única reseña anónima y sin fecha en un espejo de terceros (el reseñador pedía poder elegir 'otras agencias como UES o Mirtrans que son mucho más rápidas ... que Dac'). No lo afirmamos.
- FRACCIONAMIENTO DEL PESO: un usuario de Reddit (2024) reportó que Gripper factura cada 100 g, pero eso NO está en la página de tarifas y no se pudo confirmar en el sitio. No lo tratamos como verificado.
- DESCUENTO DE IVA: no hay dato de si aplica ni de cómo. No se encontró mención en el sitio.
- DESPACHANTE PARA IMPORTACIONES COMERCIALES: sin precio publicado, solo contacto.
- QUÉ PASA CUANDO GRIPPER PIERDE UN PAQUETE: no se encontró ni un solo caso fechado. Hay historias de paquetes perdidos de MiamiBox y Enviamicompra en los mismos hilos, ninguna de Gripper. Es ausencia de evidencia, no evidencia de ausencia.
- No existe perfil de Trustpilot ni registro público de reclamos para couriers (no hay un equivalente al listado del BCU). Toda la reputación se apoya en Google y r/uruguay.

**Fuentes:** [Gripper — Tarifas (fuente de todos los precios, verificada 2026-07-12)](https://www.gripper.com.uy/tarifas) · [Gripper — Despacho de envío retenido en Aduana](https://www.gripper.com.uy/despacho-envio-retenido-aduana-uruguay) · [Gripper — Home ('3 a 7 días hábiles', 'Consolidación sin costo')](https://www.gripper.com.uy/) · [Gripper — Comprar en USA ('3 a 6 días hábiles', contradice la home)](https://www.gripper.com.uy/comprar-en-usa) · [Gripper — Comprar en China (te manda a triangular por Miami)](https://www.gripper.com.uy/comprar-en-china-desde-uruguay) · [Google Maps — listado de Gripper (place_id verificado)](https://www.google.com/maps/place/?q=place_id:ChIJaxnp_IZ_n5URQbshASuZCzU) · [Reddit — Gripper, USX u otro para traer algo de Amazon (2026-07-07)](https://reddit.com/r/uruguay/comments/1towdyd/gripper_usx_u_otro_para_traer_algo_de_amazon/) · [Reddit — Cuáles son los mejores couriers hoy (2025-07-28)](https://reddit.com/r/uruguay/comments/1maxz1d/cuales_son_los_mejores_couriers_hoy_para_ustedes/) · [Reddit — Couriers para traer libros de USA (2024-05-09, manejo en libros)](https://reddit.com/r/uruguay/comments/1cnjsbi/couriers_para_traer_libros_de_usa/) · [Reddit — Gripper se equivocó con el precio de un producto (2022-03-29)](https://reddit.com/r/uruguay/comments/tr59f4/gripper_se_equivocó_con_el_precio_de_un_producto/) · [Reddit — Envío de Gripper retenido (2022-12-19)](https://reddit.com/r/uruguay/comments/zq23qm/envío_de_gripper_retenido/) · [Reddit — Qué courier cobra más barato para importar (2022-11-16)](https://reddit.com/r/uruguay/comments/ywr02t/que_courrier_cobra_más_barato_para_importar/) · [Reddit — Preguntas sobre couriers y Grabr (2019-03-21)](https://reddit.com/r/uruguay/comments/b3w177/preguntas_sobre_couriers_y_grabr/) · [Reddit — Me cagaron (2024-04-05, cobro por depósito)](https://reddit.com/r/uruguay/comments/1bwsp0v/me_cagaron/ky8fgbn/) · [Espejo de reseñas de Google (yorugupino) — dice 2.110 opiniones, no 2.252](https://yorugupino.com/servicio-de-mensajeria/ciudad-del-plata/gripper/)

---

### SoyCourier `soycourier` — Courier

> USD 14.99/kg de gancho: su propia calculadora lo desmiente

Courier con casillero en Miami (8005 NW 64th St), sitio armado en Lovable.dev, sin ninguna huella verificable en Uruguay.

**Tarifa** (verificada 2026-07-12, [fuente](https://www.soycourier.com/assets/index-N7PBsN9A.js)):

```json
{
 "quoteOnly": false,
 "tiers": [
  {
   "maxKg": 20,
   "perKg": 14.99,
   "flat": null
  }
 ],
 "minChargeUsd": null,
 "handlingUsd": 14.99,
 "handlingPlusIva": null,
 "tspuPct": 0,
 "clearanceUsd": null,
 "interiorUsd": null,
 "booksPerKg": null,
 "insuranceIncluded": true,
 "freeStorageDays": null,
 "originsPerKg": {
  "us": 14.99,
  "eu": null,
  "cn": null,
  "ar": null
 },
 "transit": "3-7 días hábiles desde que el paquete llega a Miami (lo dice el sitio; no hay un solo reporte de usuario que lo confirme ni que lo desmienta)"
}
```

**Letra chica:** OJO: los USD 14.99/kg NO son el precio final. El FAQ promete textualmente "Solo USD 14.99 por kilogramo. Sin costos ocultos. Este precio incluye gestión de aduanas, impuestos, seguro y entrega en tu domicilio", pero la calculadora del mismo sitio suma por encima USD 14.99 fijos de "Manejo" MÁS la entrega: USD 4.99 a domicilio o USD 1.99 si retirás en el Pick Up. Cuentas de su propia calculadora: 2 kg a domicilio = 29.98 + 14.99 + 4.99 = USD 49.96, o sea ~USD 25/kg efectivo, no 14.99. El envío más barato posible (0,1 kg con retiro en Pick Up) te sale USD 18.48. Peor todavía: la calculadora te pide el valor declarado y NUNCA lo usa en el total — el "Costo total del envío" que te muestra no tiene un peso de tributos, cuando fuera de franquicia el régimen courier uruguayo cobra ~60% del valor. La cifra que te muestran subestima materialmente lo que vas a pagar en la puerta. Tarifa sin escalones: un solo tramo de 0,1 a 20 kg (arriba de 20 kg es "consultanos", sin precio). Solo origen Miami/EE.UU.: no hay Europa, China ni Argentina. TSPU/URSEC: no lo mencionan en NINGUNA parte del sitio. Lo dejamos en 0 porque no hay recargo declarado, pero eso NO prueba que no se cobre — está sin declarar (ver dataGaps). Tampoco publican despacho separado, recargo al interior, tarifa de libros ni días libres de almacenaje. El "seguro incluido" no tiene póliza, ni tope de cobertura, ni condiciones publicadas. Y el meta description del propio sitio todavía anuncia "Solo USD 9.90 por kg" mientras la página cobra 14.99: el precio con el que te enganchan en Google ya no existe.

**Google:** **SIN FICHA CONFIABLE — pinear a mano antes de publicar cualquier rating.**

**Reddit:** muestra **none**

**Scores propuestos:** cumplimiento **—** · atención **—** · transparencia **8** · cobertura **15**

- *cumplimiento:* SIN EVIDENCIA. Cero reseñas de Google (no tienen ficha), cero muestra en Reddit, cero menciones en gameover.uy, comprasporinternet.uy o courieruy, y ningún reporte de incidente — ni bueno ni malo. No hay base para puntuar si cumplen, así que no lo puntuamos.
- *atencion:* SIN EVIDENCIA. No hay una sola experiencia de cliente documentada en ningún lado. Publican WhatsApp y mail, pero no existe testimonio público real que permita evaluar la respuesta.
- *transparencia:* 8/100. Es de las pocas cosas medibles acá, porque la evidencia es de primera mano y quedó verificada en el código fuente del propio sitio, no en reputación de terceros: (1) el FAQ jura "sin costos ocultos" y la calculadora agrega manejo + entrega encima; (2) el meta description anuncia USD 9.90/kg y la página cobra 14.99; (3) la calculadora pide el valor declarado y lo ignora, mostrando un total sin tributos mientras afirma que "incluye impuestos"; (4) el sitio se autoadjudica "4.9★ Calificación promedio" y "8.000+ envíos" sin tener una sola reseña en ninguna parte; (5) los 8 testimonios están escritos a mano en el bundle JS. No es opacidad: es información publicada que se contradice a sí misma.
- *cobertura:* 15/100, determinista a partir de los hechos: un solo origen (Miami/EE.UU.) de cuatro posibles — sin Europa, China ni Argentina; sin entrega al interior publicada; sin tarifa de libros; sin días libres de almacenaje; sin descuento de IVA; tope de 20 kg. El "seguro incluido" no suma puntos porque no hay póliza, tope ni condiciones publicadas, y viene del mismo FAQ que miente sobre los impuestos. Lo único que suma: la opción de retiro en Pick Up (USD 1.99) y un portal de cliente funcional.

**Banderas rojas:**

- El precio anunciado NO es el precio final. El FAQ promete "sin costos ocultos, incluye entrega en tu domicilio", pero la propia calculadora suma USD 14.99 de "Manejo" + USD 4.99 de "Entrega" (o USD 1.99 si retirás en Pick Up) arriba de los USD 14.99/kg. Un envío de 2 kg cuesta USD 49.96, no USD 29.98: el costo efectivo es ~USD 25/kg. El envío más barato posible (0,1 kg, retiro en Pick Up) es USD 18.48.
- Reseñas fabricadas, y no solo en los testimonios: el sitio publica como estadística propia "4.9★ Calificación promedio" y "8.000+ Envíos realizados". Una empresa sin ficha de Google, sin Trustpilot y sin una sola reseña en ningún lado se autoadjudica un promedio de 4,9 estrellas. Además hay OCHO testimonios 5★ escritos a mano en el bundle JS (María González/Montevideo, Carlos Rodríguez/Punta del Este, Ana Martínez/Canelones, Diego Fernández/Maldonado, Lucía Vázquez/Salto, Roberto Silva/Rivera, Valentina Castro/Colonia, Martín López/Tacuarembó).
- Se venden como "15 años de experiencia" cuando el dominio soycourier.com se registró el 2024-08-06: menos de dos años. No es un testimonio suelto, es una de las tres cifras del bloque de estadísticas del propio sitio.
- La calculadora NO calcula impuestos: te pide el valor declarado y lo ignora por completo en el total. El sitio afirma que el precio "incluye impuestos", cosa imposible en el régimen courier uruguayo (fuera de franquicia se tributa ~60% del valor). Si planificás tu compra con esa cifra, te llevás una sorpresa en la puerta.
- Precio inconsistente dentro del propio sitio: el meta description (lo que ve Google y con lo que te enganchan en la búsqueda) dice USD 9.90/kg; la página cobra USD 14.99/kg.
- Huella reputacional NULA: sin ficha de Google Maps, sin reseñas, sin Reddit, sin Trustpilot, sin redes, y ausente de las tres listas de couriers de referencia del país (comprasporinternet.uy, courieruy, gameover.uy). No hay un solo cliente verificable que haya contado su experiencia.
- El dominio expira el 2026-08-06, en menos de un mes desde hoy. Riesgo concreto de que el servicio directamente desaparezca.
- Señales de sitio improvisado: SPA generada con Lovable.dev que todavía usa la imagen OpenGraph por defecto del generador (lovable.dev/opengraph-image-p98pqg.png), y cuyos 6 artículos de blog enlazados desde la home apuntan a blog.soycourier.com, un subdominio que ni siquiera resuelve por DNS. Los seis links están rotos.
- No publican nada de lo que un importador necesita: ni TSPU/URSEC, ni despacho, ni recargo al interior, ni tarifa de libros, ni días libres de almacenaje, ni póliza o tope del seguro. Tampoco RUT, razón social ni domicilio en Uruguay: el único domicilio publicado es el warehouse de Miami.

**A favor:** 
- Detrás del sitio hay una operación real, no solo una landing: registro.soycourier.com y clientes.soycourier.com sirven un portal de gestión courier con alta de cliente completa (documento, departamento, ciudad).
- La tarifa nominal (USD 14.99/kg) sería competitiva en el mercado uruguayo — si fuera el precio que realmente pagás, que no lo es.
- Contacto directo y operativo publicado: WhatsApp +598 94 050 223 y clientes@soycourier.com.
- La opción de retiro en Pick Up (USD 1.99 en vez de USD 4.99 a domicilio) te ahorra tres dólares por envío.

**En contra:** 
- El precio publicitado no es el precio real: sumando manejo y entrega, el costo efectivo de un envío de 2 kg es ~USD 25/kg, no USD 14.99.
- La calculadora no te muestra ni un peso de tributos, así que el total que ves está muy por debajo de lo que vas a pagar puerta a puerta.
- Cero reputación verificable: ninguna reseña real, ningún reporte de usuario, ninguna mención en foros ni directorios uruguayos.
- Las reseñas que muestran son inventadas (están escritas en el código del sitio) y el 4,9★ que exhiben no viene de ninguna plataforma.
- El dominio vence el 2026-08-06 y la empresa tiene menos de dos años de existencia comprobable, aunque se anuncie con "15 años".
- Solo importan desde EE.UU. (Miami). Nada de Europa, China ni Argentina, y el tope son 20 kg.
- Ni siquiera se puede confirmar que estén habilitados como courier ante la DNA: no publican RUT ni razón social uruguaya.

**Para quién:** Para nadie que esté por poner plata sin averiguar antes. Acá la recomendación no es \"conviene o no conviene\", es: antes de mandar un solo paquete, exigiles por WhatsApp el precio final por escrito (envío + manejo + entrega + tributos), el RUT y la razón social uruguaya. Si ya tenés la recomendación personal de alguien que importó con ellos y le llegó, probá con algo barato y descartable. Si no la tenés, andá a un courier con reseñas reales.

**Veredicto:** SoyCourier es el caso más incómodo de la lista y conviene decirlo sin vueltas: no tenemos evidencia de que estafen a nadie, pero tampoco tenemos una sola prueba de que le hayan entregado un paquete a alguien. Hay una operación detrás (el portal de clientes existe, funciona y tiene alta real), pero la vidriera está construida sobre cifras que ellos mismos desmienten. Te prometen USD 14.99/kg \"sin costos ocultos, impuestos incluidos\" y su propia calculadora te suma USD 14.99 de manejo más la entrega: un envío de 2 kg sale USD 49.96, o sea ~USD 25/kg efectivo. Esa misma calculadora te pide el valor declarado y lo tira a la basura, mostrándote un total sin un peso de tributos, cuando fuera de franquicia el régimen courier uruguayo te cobra ~60% del valor. El meta description que ve Google todavía dice USD 9.90/kg. Y la reputación que exhiben es directamente inventada: ocho testimonios 5 estrellas escritos a mano en el JavaScript del sitio, un \"4.9★ de calificación promedio\" que no sale de ninguna plataforma porque no tienen ficha de Google ni Trustpilot ni una sola reseña en ningún lado, y \"15 años de experiencia\" para un dominio registrado en agosto de 2024 — que además vence en agosto de 2026, dentro de menos de un mes. El blog que enlazan desde la home no existe (el subdominio ni resuelve) y la imagen de OpenGraph sigue siendo el placeholder por defecto de Lovable.dev. Nada de esto prueba mala fe, pero todo junto describe a un operador que todavía no le rindió cuentas a nadie y que ya publica números que no son ciertos. Barato en el cartel, caro en la caja, y sin un solo cliente que dé la cara: si vas a importar plata de verdad, hay opciones con historial.

**Gaps (resolver a mano):**

- TSPU/URSEC (10%): el sitio NO lo menciona en ninguna parte (0 coincidencias de tspu/ursec en todo el bundle). Lo dejamos en 0 porque no hay recargo declarado, pero eso NO es evidencia de que no se cobre: está SIN DECLARAR. Tratarlo como dato faltante, no como "no aplica". Preguntarlo antes de enviar.
- Si el manejo de USD 14.99 es con IVA incluido o +IVA (22%): no está declarado (handlingPlusIva = null).
- La tarifa REAL que termina pagando un cliente: la única pública es la de la landing, que se contradice a sí misma. El portal operativo está detrás de login y no expone tarifario (/tarifas, /precios, /calculadora, /rates → 404).
- Tarifa de libros/CD/DVD: no publicada.
- Recargo al interior: no publicado. Los USD 4.99 / USD 1.99 son opciones de entrega ("Envío a domicilio" vs. "Retiro en Pick Up"), NO una tarifa de interior.
- Despacho de aduana como cargo separado: no publicado; afirman que está incluido, sin desglose alguno.
- Días libres de almacenaje: no publicados.
- Alcance del seguro: dicen "seguro incluido" y prometen "reposición o reembolso completo", pero no hay póliza, ni tope de cobertura, ni condiciones, ni un solo reclamo documentado.
- Existencia legal en Uruguay: no publican RUT, razón social ni domicilio local (solo el warehouse de Miami). No se pudo confirmar que estén habilitados como courier ante la DNA — la Aduana no publica una nómina consultable en línea.
- Puntualidad real vs. los 3-7 días prometidos: no existe ni un solo reporte de usuario. No hay base para evaluar el tránsito.
- Cumplimiento y atención: sin ficha de Google, sin muestra de Reddit y sin reportes de incidentes, no hay evidencia para puntuar ninguna de las dos dimensiones. Quedan en null a propósito.
- Qué pasa ante pérdida, daño o retención en aduana: cero casos documentados.
- Estado del dominio después del 2026-08-06: hay que reverificar que el servicio siga en pie antes de recomendarle nada a nadie.

**Fuentes:** [SoyCourier — home (meta description con el precio viejo de USD 9.90/kg)](https://www.soycourier.com/) · [Bundle JS del sitio — tarifa, calculadora, FAQ, 8 testimonios hardcodeados y estadísticas 4.9★/8.000+/15 años](https://www.soycourier.com/assets/index-N7PBsN9A.js) · [Portal de registro de clientes (HTTP 200)](https://registro.soycourier.com/) · [Portal de clientes (HTTP 200)](https://clientes.soycourier.com/) · [RDAP Verisign — dominio registrado 2024-08-06, expira 2026-08-06](https://rdap.verisign.com/com/v1/domain/soycourier.com) · [Google Maps "soycourier uruguay" — sin ficha de SoyCourier (verificado con navegador renderizado)](https://www.google.com/maps/search/soycourier%20uruguay) · [Lista de couriers de Uruguay — SoyCourier no figura (0 menciones)](https://comprasporinternet.uy/herramientas/couriers-lista-uruguay/) · [GameOver Uruguay, hilo "Courier que recomienden?" — SoyCourier no aparece ni una vez](https://www.gameover.uy/archive/index.php/t-15640.html) · [Directorio courieruy — SoyCourier no figura](https://courieruy.webnode.com.uy/) · [DNA — régimen courier](https://www.aduanas.gub.uy/innovaportal/v/5004/3/innova.front/courier.html)

---

### UruguayCargo `uruguaycargo` — Courier

> Tarifa clara y almacenaje largo, pero la atención llega tarde

Courier chico con casillero propio en Miami/Doral y entrega semanal a Montevideo y Punta del Este.

**Tarifa** (verificada 2026-07-12, [fuente](https://www.uruguaycargo.com.uy/tarifas.html)):

```json
{
 "quoteOnly": false,
 "tiers": [
  {
   "maxKg": 0.5,
   "flat": 14.99,
   "perKg": null
  },
  {
   "maxKg": 5,
   "flat": null,
   "perKg": 19.5
  },
  {
   "maxKg": 10,
   "flat": null,
   "perKg": 18.99
  },
  {
   "maxKg": 20,
   "flat": null,
   "perKg": 18.2
  }
 ],
 "minChargeUsd": 14.99,
 "handlingUsd": 4,
 "handlingPlusIva": null,
 "tspuPct": 10,
 "clearanceUsd": null,
 "interiorUsd": null,
 "booksPerKg": null,
 "insuranceIncluded": null,
 "freeStorageDays": 75,
 "originsPerKg": {
  "us": null,
  "eu": null,
  "cn": null,
  "ar": null
 },
 "transit": null
}
```

**Letra chica:** Hasta 500 g pagas un MINIMO FIJO de USD 14,99 (no es precio por kilo). De 501 g en adelante se cobra POR KILO y el precio por kilo BAJA a medida que sube el peso: 19,50 (hasta 5 kg), 18,99 (5-10 kg), 18,20 (10-20 kg). Arriba de 20 kg es 'a cotizar': no extrapoles el 18,20, no hay precio publicado. Encima del flete se suma SIEMPRE: manejo USD 4,00 POR PAQUETE recibido en Miami (si consolidas 4 compras, pagas 4 x USD 4) y la Tasa Postal Universal, 10% del valor del flete (no de la mercaderia). Libros, CDs, DVDs y correspondencia pagan manejo reducido de USD 2,50: es un descuento en el MANEJO, no una tarifa de flete mas barata, el flete se sigue cobrando por los tramos normales. Revistas, catalogos y sobres no pagan manejo. Almacenaje: 75 dias gratis en Miami y 30 dias gratis en Uruguay desde que el paquete queda disponible; despues USD 15 (dias 76-95 en Miami, 31-45 en Uruguay), y pasados esos plazos avisan que 'desincorporan' los paquetes sin aviso. Solo tienen direccion en Miami/Doral: no hay tarifas de Europa, China ni Argentina (comprar 'en China' significa que te lo manden a esa direccion de EE.UU.). NO publican: entrega dentro de Uruguay ('consultar precios'), costo de despacho si Aduana te frena el paquete, seguro, tiempo de transito, peso volumetrico, ni si suman IVA. Con la tarifa publicada NO se puede calcular un costo final: lo que ves es un piso.

**Google:** `ChIJZW2CBSgbdZURDOJ1qc6s9Es` — "Uruguay Cargo" · **3,2 ★** (12 reseñas) · [ficha](https://www.google.com/maps/place/Uruguay+Cargo/@-34.916262,-54.9578687,17z/data=!4m6!3m5!1s0x95751b2805826d65:0x4bf4accea975e20c!8m2!3d-34.916262!4d-54.9578687!16s%2Fg%2F11j0tcq6l3?hl=es)

**Reddit:** muestra **none**

**Scores propuestos:** cumplimiento **—** · atención **40** · transparencia **45** · cobertura **30**

- *cumplimiento:* SIN EVIDENCIA. No hay un solo reporte verificable sobre si los paquetes llegan, se pierden o llegan rotos: de las 12 resenas de Google solo se pudieron leer 3, y las tres hablan de atencion, no de entregas. No hay muestra de Reddit ni foros legibles. No inventamos un puntaje de cumplimiento con esto.
- *atencion:* Base fina pero real: 3 resenas fechadas (una positiva de mediados de 2025 sobre WhatsApp rapido y con una persona real; una negativa de ~feb-2026, 'No resuelven nada. No contestan'; y una negativa que la propia autora EDITO para contar que al dia siguiente le pasaron la guia), mas los chips de temas que arma Google en la ficha ('desastre', 'telefono', 'numero'). El patron es consistente: la respuesta llega, pero tarde y sin avisarte nada mientras tanto, y el cuello de botella es siempre la guia aerea / papeleo de Aduana. 40 y no menos porque el caso mas duro termino resuelto; 40 y no mas porque el reclamo se repite y es el mas reciente que se pudo leer.
- *transparencia:* Mitad y mitad. A favor: publican la tabla completa de tramos de peso, el manejo por paquete, el 10% de TSPU y las tarifas de almacenaje, todo verificado en la fuente. En contra: tres cargos materiales quedan sin publicar (entrega dentro de Uruguay, despacho aduanero, seguro), no hay tiempo de transito en ninguna pagina, y el sitio se contradice solo: una pagina promete entrega 'gratuitamente en la puerta de tu casa u oficina' y otra dice que el envio local 'tiene un costo adicional, consultar precios'. Encima publican DOS direcciones distintas en Miami (3520 y 3510 NW 115th Ave); para un courier cuyo producto es 'mandá todo a esta direccion', eso es un error que te puede costar el paquete.
- *cobertura:* Baja. Un solo origen (Miami/Doral): no hay Europa, ni China, ni Argentina. Sin precio de entrega al interior (ni siquiera a domicilio). Sin seguro publicado. Sin tarifa especial de flete para libros (el USD 2,50 es solo manejo). Sin descuento de IVA. Lo unico fuerte es el almacenaje: 75 dias gratis en Miami, de los mejores del mercado.

**Banderas rojas:**

- Muestra de reputacion casi inexistente: 3,2/5 con apenas 12 resenas de Google. Y ojo con como lo leemos: NO decimos que no exista nada mas, decimos que no se pudo LEER nada mas. Trustpilot y Reddit devolvieron HTTP 403 al consultarlos el 2026-07-12, asi que su contenido es desconocido, no vacio. Tomá el 3,2 como 'casi no hay datos', no como una nota de calidad.
- La atencion que no contesta es el reclamo que se repite. Es el tema de la resena mas reciente que pudimos leer (~feb-2026: 'No resuelven nada. No contestan.') y de los chips de temas de la propia ficha de Google ('desastre', 'telefono', 'numero'). El punto donde te trancas es siempre la guia aerea para el tramite de Aduana.
- Con su tarifa publicada NO podes calcular cuanto vas a pagar. Faltan tres cargos materiales: entrega dentro de Uruguay ('consultar precios'), despacho si Aduana te retiene el paquete, y seguro. Cualquier total que armes es un piso, no un precio.
- El 10% de TSPU va POR ARRIBA del precio por kilo, igual que los USD 4 de manejo. Su calculadora dice 'EL MEJOR PRECIO ASEGURADO': eso es marketing, el precio del titular no incluye ni la tasa ni el manejo.
- El manejo es USD 4,00 POR PAQUETE recibido en Miami, y todo su discurso te empuja a consolidar compras. Consolidas 5 cajas, pagas 5 x USD 4. Es facil subestimarlo.
- No publican tiempo de transito en ningun lado. Lo unico que dicen es que los envios salen y llegan 'semanalmente'. No hay plazo puerta a puerta, asi que no hay nada que reclamarles ni nada que podamos prometerte.
- Clausula de descarte: pasados los 95 dias (Miami) o 45 (Uruguay) dicen que van a 'desincorporar los paquetes sin aviso'. El almacenaje gratis es generoso al principio y duro al final.
- El sitio se contradice de dos formas que te pueden costar plata: promete entrega gratis a domicilio en una pagina y cobra el envio local en otra, y publica dos direcciones distintas en Miami (3520 vs 3510 NW 115th Ave). Confirmá la direccion por WhatsApp ANTES de comprar.
- La unica ficha de Google que existe es la de Punta del Este (dentro de la Terminal de Bus de Maldonado). No encontramos ficha en Montevideo, aunque el sitio anuncia entrega semanal alla. Su presencia fisica en Montevideo esta sin verificar.
- Arriba de 20 kg es 'a cotizar'. No hay precio publicado: no asumas que sigue valiendo el 18,20/kg.

**A favor:** 
- La tabla de tarifas esta publicada y es clara: tramos de peso, manejo, tasa y almacenaje, todo verificable en su web (lo chequeamos en la fuente el 2026-07-12).
- 75 dias de almacenaje gratis en Miami (y 30 en Uruguay): de los plazos mas generosos del rubro, y sirve de verdad si vas juntando compras.
- El precio por kilo BAJA cuando el envio es mas pesado: 19,50 a 18,99 a 18,20. Para envios de 10 a 20 kg queda competitivo.
- No cobran membresia ni cuota anual (lo dicen en las FAQ y en los Terminos).
- Libros, CDs, DVDs y correspondencia pagan manejo reducido (USD 2,50); revistas, catalogos y sobres no pagan manejo.
- Hay al menos un reporte concreto y detallado de atencion por WhatsApp rapida y con una persona real del otro lado, no un bot.

**En contra:** 
- El reclamo que se repite es que no contestan, justo cuando necesitas la guia aerea para el tramite de Aduana: o sea, en el momento en que estas trancado.
- No publican seguro, ni despacho, ni entrega dentro de Uruguay, ni tiempo de transito. Cuatro incognitas sobre tu propio bolsillo.
- Solo origen Miami. Si comprás en Europa, China o Argentina, este courier no te sirve.
- Los USD 4 de manejo son por paquete: consolidar, que es exactamente lo que ellos promueven, multiplica ese cargo.
- Su propio sitio se contradice sobre si la entrega a domicilio es gratis, y publica dos direcciones distintas en Miami.
- 12 resenas en total. No hay forma honesta de decirte si son confiables o no: simplemente no hay datos suficientes.

**Para quién:** El que compra en EE.UU., junta varias compras hasta armar una sola caja de 10 a 20 kg, tiene paciencia para perseguirlos por WhatsApp, y puede retirar en Montevideo o Punta del Este sin depender de una entrega a domicilio con precio incierto. Si necesitas fecha de llegada, seguro o entrega al interior con precio cerrado, no es este.

**Veredicto:** UruguayCargo publica una tarifa honesta y bien armada (tramos de peso reales, minimo de USD 14,99 hasta 500 g, precio por kilo que baja con el peso, manejo y tasa a la vista) y la verificamos linea por linea en su propia pagina. Ese es su punto fuerte, junto con los 75 dias de almacenaje gratis en Miami. El problema no es el precio: es todo lo que NO esta en la tabla. Entrega dentro de Uruguay, despacho aduanero, seguro y tiempo de transito no figuran en ningun lado, asi que lo que calcules es un piso y no un precio final. A eso se suma el unico reclamo que aparece una y otra vez en las poquisimas resenas: no contestan, y no contestan justo en el paso donde te frenan el paquete en Aduana. La version mas justa de la evidencia no es 'no entregan' sino 'entregan, pero tarde y sin decirte nada': la resena mas dura la edito la propia clienta para contar que al dia siguiente le pasaron la guia. Y hay que ser claros con el tamano de la muestra: 3,2/5 sobre 12 resenas no es una mala nota, es casi ninguna nota, y ni Trustpilot ni Reddit respondieron cuando fuimos a mirar, asi que tampoco podemos afirmar que no exista nada mas. Conclusion: barato y previsible en la parte que muestran, opaco y lento en la parte que no. Sirve si sos paciente y comprás en EE.UU.; no lo elijas si necesitas una fecha o un seguro.

**Gaps (resolver a mano):**

- Tiempo de transito puerta a puerta: no lo publican en ninguna pagina. Solo dicen 'semanalmente'. No convertimos eso en dias.
- Seguro: no hay mencion alguna de cobertura, limite de responsabilidad ni costo en tarifas, FAQ ni Terminos. Es DESCONOCIDO, no 'incluido' ni 'cero'.
- Costo de despacho aduanero si Aduana retiene el paquete: sin monto publicado (solo ofrecen 'poner su equipo a disposicion').
- Entrega dentro de Uruguay / interior: sin monto publicado ('consultar precios'), y ademas contradicho por su propia pagina que promete entrega gratis a domicilio.
- Precio arriba de 20 kg: 'a cotizar', sin tarifa publicada.
- Peso volumetrico: nunca lo mencionan. No sabemos si cobran por volumen en articulos voluminosos y livianos, una fuente clasica de sorpresas.
- IVA sobre el servicio, y si redondean el peso hacia arriba: no esta dicho en ningun lado.
- Cargo por consolidacion: promueven consolidar pero no publican si consolidar cuesta algo mas alla de los USD 4 por paquete.
- 9 de las 12 resenas de Google no se pudieron leer (contencion del navegador compartido). La lectura de atencion se apoya en n=3 de 12.
- Trustpilot y Reddit: ambos devolvieron HTTP 403 el 2026-07-12. NO esta verificado que no exista contenido ahi; esta verificado que no se pudo leer.
- Presencia fisica en Montevideo: solo hay ficha de Google en Punta del Este (Terminal de Bus, Maldonado), pese a que anuncian entrega semanal a Montevideo.
- Registro ante la DNA (Direccion Nacional de Aduanas) como courier autorizado: no verificado.

**Fuentes:** [Tarifas oficiales (tramos, manejo, TSPU, almacenaje)](https://www.uruguaycargo.com.uy/tarifas.html) · [Preguntas frecuentes (sin membresia; direccion Miami 3520)](https://www.uruguaycargo.com.uy/preguntasFrecuentes.html) · [Como comprar en USA (promete entrega gratis; direccion Miami 3510)](https://www.uruguaycargo.com.uy/comoComprarEnUSA.html) · [Terminos y condiciones](https://www.uruguaycargo.com.uy/terminos&condiciones.html) · [Normativas y Aduana (su lectura de la franquicia, no es autoridad)](https://www.uruguaycargo.com.uy/normativasAduana.html) · [Ficha de Google Maps (Uruguay Cargo, Punta del Este)](https://www.google.com/maps/place/Uruguay+Cargo/@-34.916262,-54.9578687,17z/data=!4m6!3m5!1s0x95751b2805826d65:0x4bf4accea975e20c!8m2!3d-34.916262!4d-54.9578687!16s%2Fg%2F11j0tcq6l3?hl=es) · [WhatsApp oficial 091 494 029 (confirma la identidad de la ficha)](https://wa.me/59891494029)

---

### Envía Mi Compra `enviamicompra` — Courier

> Cara, pero te muestra el paquete antes de traerlo

Casillero propio en Miami, dos vuelos semanales a Montevideo y reparto a todo el país; solo trae de EE.UU.

**Tarifa** (verificada 2026-07-12, [fuente](https://www.enviamicompra.com.uy/servicios-tarifas)):

```json
{
 "quoteOnly": false,
 "tiers": [
  {
   "maxKg": 5,
   "perKg": 21.9,
   "flat": null
  },
  {
   "maxKg": 10,
   "perKg": 20.9,
   "flat": null
  },
  {
   "maxKg": 20,
   "perKg": 16.5,
   "flat": null
  },
  {
   "maxKg": null,
   "perKg": 11.9,
   "flat": null
  }
 ],
 "minChargeUsd": null,
 "handlingUsd": 5,
 "handlingPlusIva": true,
 "tspuPct": 0,
 "clearanceUsd": null,
 "interiorUsd": null,
 "booksPerKg": null,
 "insuranceIncluded": false,
 "freeStorageDays": 30,
 "originsPerKg": {
  "us": 21.9,
  "eu": null,
  "cn": null,
  "ar": null
 },
 "transit": "Dos vuelos semanales Miami→Montevideo. Cierre martes 5:00 → llega jueves/viernes; cierre viernes 5:00 → llega lunes/martes. La propia empresa aclara que puede correrse por atrasos de la aerolínea."
}
```

**Letra chica:** SOLO MIAMI / EE.UU. No traen de Europa, China ni Argentina.

CÓMO COBRAN: es tarifa por kilo en tramos, NO precio plano. La columna de la página dice literal 'Precio por kilo o fracción': la fracción redondea para arriba y el peso mínimo facturable es 0,500 kg por paquete. A eso se le suma USD 5,00 de manejo (handling) por paquete despachado desde Miami, sin importar cuántas compras consolides adentro. Cartas, revistas y documentos están exentos del handling.

OJO CON EL PRECIO PUBLICADO: la página dice 'En todos los casos los precios son sin impuestos'. O sea que los USD 21,90/kg del titular NO son lo que pagás, y la empresa nunca dice qué impuesto ni a qué tasa se suma al flete. No lo asumimos: el sitio no da forma de calcular lo que vas a pagar. Anotalo como hueco, no como 22%.

INTERIOR: no es un recargo fijo, es una tabla paralela completa por kilo: 24,80 / 23,80 / 19,40 / 11,90 en los mismos tramos. En la práctica son +2,90/kg en los tres primeros tramos y +0,00 arriba de 20 kg. Cartas y documentos al interior: 12,04 por unidad contra 9,04 a Montevideo. El reparto al interior lo terciarizan a DAC (Grupo Agencia Central): retirás en una sucursal DAC o pagás entrega a domicilio. Dejamos interiorUsd en null a propósito porque no existe un número único de recargo.

LIBROS: no publican tarifa de libros/CD/DVD. La única línea que no es paquete es 'Cartas, Revistas y Documentos: u$s 9,04 por unidad' — es POR UNIDAD y no menciona libros. No la uses como tarifa de libros.

DESPACHO DE ADUANA: sin precio publicado, es solo por cotización. Si te retienen el paquete (franquicias agotadas, factura arriba de USD 800, o Aduanas presume fin comercial) o lo despachás vos en Aduanas Carrasco (60% de la factura + unos USD 25 de depósito TCU) o les escribís a info@/impo@enviamicompra.com.uy 'para solicitar una cotización'. Su propia calculadora avisa: 'Los valores presentados no son valores finales y pueden variar en función del despacho de aduana' (https://www.enviamicompra.com.uy/calculator).

SEGURO: no viene incluido. Es opcional, 3% del valor de la factura con mínimo USD 20, hay que contratarlo ANTES de generar el envío, tenés solo 5 días hábiles para reclamar daño, y nunca cubre falla electrónica ni daño del packaging.

DEPÓSITO: 30 días gratis. Después, por kilo por día: días 31-50 USD 1,00; 51-60 USD 1,80; 60+ USD 2,50. Ejemplo de ellos mismos: 2 kg parados 33 días = USD 6,00.

OTROS CARGOS PUBLICADOS: consolidación gratis; foto del contenido gratis; desconsolidar/separar USD 15 por paquete nuevo (hasta 6 ítems) o USD 30 (7-15), no lo hacen arriba de 15; verificación de mercadería USD 10 (hasta 5 ítems) / USD 30 (5-10) / USD 3 por ítem (más de 10); devolución al vendedor en EE.UU. USD 10 con etiqueta paga o USD 15 + costo FedEx sin ella; retiro en Miami USD 10 por paquete; reenvío dentro de EE.UU. USD 15 + FedEx.

RÉGIMEN 2026 (de su propio centro de ayuda, afecta el costo final): franquicia desde el 01/05/2026, USD 800 al año en máximo 3 envíos de hasta 20 kg — mercadería de EE.UU. paga 22% de IVA solo si la factura supera USD 200, otros orígenes pagan IVA con mínimo USD 20, y el flete Miami→Uruguay NO cuenta dentro de la franquicia. Régimen simplificado desde el 20/03/2026: envíos ilimitados de hasta USD 800 y 20 kg, 60% del valor de factura (mínimo USD 20) pago por adelantado y sin retención.

TARIFA VIEJA: el rate card se auto-fecha '29 de Junio de 2018' y sigue publicado igual ocho años después. Los números están verificados contra la página de hoy, pero verificá en el checkout antes de pagar.

**Google:** `ChIJq3loj3OBn5URhK2rvJalKl0` — "Envia Mi Compra Uruguay" · **4,2 ★** (? reseñas) · [ficha](https://www.google.com/maps/place/?q=place_id:ChIJq3loj3OBn5URhK2rvJalKl0)

**Reddit:** muestra **thin** · neto **+25** sobre 9 opiniones

Aparece muchísimo en Reddit, pero casi siempre de pasada: de 52 menciones quedan apenas unas 9 opiniones reales. Los que la usan destacan las fotos de los paquetes antes de despacharlos y que 'siempre vino todo en orden', pero coinciden en que es de las más caras. En contra pesa un caso reciente (julio 2025): unos AirPods que llegaron en una caja vacía y la empresa lo mandó a reclamarle a Amazon.

> *"Yo como vos uso siempre enviamicompra, más que nada porque me gusta que manden fotos de tus paquetes cuando llegan, otros couriers que he usado no te muestran nada o te cobran aparte por el servicio y a mi me gusta chequear que todo esté bien antes de traerlo para acá por si hay que reclamar algo o algo falta."* — [r/uruguay, 2025-07-27](https://reddit.com/r/uruguay/comments/1maxz1d/cuales_son_los_mejores_couriers_hoy_para_ustedes/n5ik1o0/) (positivo)

> *"En Enviamicompra me robaron unos airpods pro, me subieron una foto con una caja vacía y me dijeron que reclamara en Amazon."* — [r/uruguay, 2025-07-28](https://reddit.com/r/uruguay/comments/1maxz1d/cuales_son_los_mejores_couriers_hoy_para_ustedes/n5js9af/) (negativo)

> *"Anteriormente usaba EnviaMiCompra que le sacaba fotos a las cosas y siempre vino todo en orden pero son mucho más caros pero los usaría devuelta para traer algo delicado, habiendo dicho eso hace años que no mando algo con ellos."* — [r/uruguay, 2024-11-19](https://reddit.com/r/uruguay/comments/1guyf97/que_courier_recomiendan/lxyqf11/) (mixto)

**Scores propuestos:** cumplimiento **60** · atención **55** · transparencia **40** · cobertura **45**

- *cumplimiento:* Hay base para puntuar: muestra fina de Reddit (9 opiniones) más de tres reportes fechados. A favor, varios usuarios independientes dicen que les llegó todo bien ('siempre vino todo en orden', 2024; 'no tuve problema', 2024). En contra, un caso grave y reciente: robo de AirPods con foto de caja vacía (julio 2025), una consulta por un paquete que USPS da por entregado y ellos no registran (marzo 2026), y reportes fechados de 2015-2022 de paquetes perdidos en la recepción de Miami, entregas a domicilio que nunca llegaron y parte de un envío dejada atrás. Llega bien la mayoría de las veces; el problema es qué pasa cuando no.
- *atencion:* Lo más elogiado y lo más criticado son la misma cosa. Las fotos del contenido sin cargo extra son EL motivo que la gente cita para elegirla, y hay usuarios que dicen 'a nivel servicio, no tengo queja'. Pero frente al robo de 2025 la respuesta fue derivar el reclamo a Amazon, y hay reportes fechados de mala onda telefónica (2019), de decirte que el paquete está y que no esté (2022) y de rigidez cuando hacía falta buena voluntad. Ojo: casi toda la evidencia negativa vieja viene de un mirror de reseñas (latinoplaces) que está desactualizado y no coincide con el 4,2 actual de Google, así que no la tomamos como confirmada.
- *transparencia:* Puntuada contra lo que publican ellos, no contra opiniones. A favor: publican el rate card completo, por tramos, con tabla de Montevideo y de interior, más el tarifario de depósito, seguro, desconsolidación y verificación — eso es más de lo que publica media plaza. En contra, y es grave: 'los precios son sin impuestos' y nunca dicen qué impuesto ni a qué tasa, así que el precio de tapa no es el que pagás y su propio sitio no te deja calcularlo; el despacho de aduana no tiene precio publicado; la tarifa se auto-fecha en 2018 y sigue ahí ocho años después; no dicen nada sobre TSPU/URSEC; y el footer todavía muestra una oficina vieja (Jaime Zudáñez 2763) distinta a la que dan su centro de ayuda y Google (Francisco Araúcho 1237).
- *cobertura:* Un solo origen: Miami/EE.UU., y nada más. Suma que reparten a todo el interior (tabla propia, vía DAC) y que dan 30 días de depósito gratis, que es generoso. Resta que el seguro no viene incluido (3% del valor, mínimo USD 20, y hay que comprarlo antes), que no hay tarifa de libros, y que no ofrecen ningún descuento de IVA.

**Banderas rojas:**

- El precio de tapa NO es el que pagás. La página dice 'En todos los casos los precios son sin impuestos' y nunca aclara qué impuesto ni a qué tasa se le suma al flete. Los USD 21,90/kg son antes de impuestos y el sitio no te da forma de calcular el total.
- El rate card se auto-fecha en 'el 29 de Junio de 2018' y sigue publicado tal cual ocho años después. Los números están verificados contra la página de hoy, pero pedí el precio en el checkout antes de pagar.
- El despacho de aduana no tiene precio: es solo por cotización. Su propia calculadora avisa que 'los valores presentados no son valores finales y pueden variar en función del despacho de aduana' (https://www.enviamicompra.com.uy/calculator). Si te retienen el paquete, el costo final no se puede saber de antemano.
- Facturan 'por kilo o fracción' (redondea para arriba) con mínimo de 0,500 kg, y hay usuarios que reportan que les cobraron peso de más por el cartón que la propia empresa agregó a la caja.
- Caso reciente y grave: en julio 2025 un usuario de Reddit denuncia que le robaron unos AirPods Pro, que le subieron la foto de la caja vacía y que la empresa lo mandó a reclamarle a Amazon. La foto que todos elogian fue justamente la que dejó el robo al descubierto, y aun así derivaron el reclamo.
- El seguro no está incluido: es opcional, 3% del valor con mínimo USD 20, se compra ANTES de generar el envío, deja solo 5 días hábiles para reclamar y nunca cubre falla electrónica.
- Solo traen de Miami/EE.UU. No hay servicio desde Europa, China ni Argentina.
- El footer del sitio todavía lista una oficina vieja en Montevideo (Jaime Zudáñez 2763) mientras el centro de ayuda y Google dan Francisco Araúcho 1237. Si seguís el footer vas a la dirección equivocada.
- Los atrasos vienen pre-disculpados: su propio FAQ dice que 'las llegada de los pedidos pueden verse modificados por atrasos en la aerolínea'. Hay reportes fechados de entregas a domicilio que nunca llegaron y hubo que ir a buscar el paquete a la oficina, pese a que la tarifa se vende como puerta a puerta.

**A favor:** 
- Publican la tarifa completa: cuatro tramos por kilo para Montevideo y una tabla paralela para el interior, más los precios de depósito, seguro, desconsolidación y verificación. En este rubro eso es más de lo normal.
- Sacan fotos del contenido en el depósito de Miami sin cobrar aparte. Es EL motivo que la gente cita en Reddit para elegirla: te deja chequear que esté todo antes de pagar el flete.
- 30 días de depósito gratis y consolidación sin cargo: podés juntar varias compras en un solo envío.
- Llegan a todo el interior con tabla propia (reparto terciarizado a DAC): retirás en sucursal DAC o pagás entrega a domicilio.
- El centro de ayuda documenta bien los dos regímenes de importación 2026 (franquicia y simplificado), incluso el detalle de que el flete Miami→Uruguay no cuenta dentro de la franquicia.

**En contra:** 
- Es cara, y es el reclamo más consistente que existe sobre ella: es el único tema que se repite entre usuarios distintos y a lo largo de los años. USD 21,90/kg en el primer tramo, y encima sin impuestos.
- El precio publicado es incompleto por diseño: sin impuestos, sin decir cuál, y sin precio de despacho.
- Cuando algo sale mal, derivan. El caso de los AirPods (julio 2025) terminó con la empresa mandando al cliente a reclamarle a Amazon.
- El seguro va aparte y con condiciones duras: 3% del valor, mínimo USD 20, se contrata antes del envío y no cubre falla electrónica.
- Solo EE.UU. Si comprás en Europa, China o Argentina, este courier no te sirve.
- Sin tarifa de libros. La línea de USD 9,04 es cartas, revistas y documentos, por unidad — no es tarifa de libros por kilo.
- La tarifa vigente es de 2018 y la dirección del footer está desactualizada: la casa no cuida sus propios datos publicados.

**Para quién:** Al que trae algo caro o delicado desde EE.UU. y quiere ver la foto del contenido antes de pagar el vuelo — y acepta pagar de más por esa tranquilidad. Si lo tuyo es el precio por kilo más bajo, o comprás fuera de EE.UU., no es acá.

**Veredicto:** Envía Mi Compra es el courier que te muestra la caja antes de traerla, y por eso mucha gente la banca aun sabiendo que paga de más. La tarifa está publicada, es verificable y la comprobamos contra la página de hoy: cuatro tramos por kilo (21,90 / 20,90 / 16,50 / 11,90) más USD 5 de manejo, tabla aparte para el interior y 30 días de depósito gratis. El problema es lo que NO está publicado. La página dice que todos los precios son sin impuestos y jamás aclara qué impuesto ni a qué tasa, así que los USD 21,90/kg no son lo que pagás y ellos mismos no te dan cómo calcularlo; el despacho de aduana es solo por cotización; el rate card se auto-fecha en 2018 y sigue igual; y del 10% de TSPU/URSEC no hay una sola palabra en todo el sitio. En reputación el patrón es claro y honesto de contar: llega bien casi siempre, y cuando no llega bien te derivan. El caso de julio 2025 lo resume — la foto que todos elogian mostró la caja vacía de unos AirPods, y la respuesta de la empresa fue que le reclamara a Amazon. Pagás un plus por control y prolijidad, no por respaldo. Sabé eso antes de mandar algo caro.

**Gaps (resolver a mano):**

- Cantidad de reseñas de Google: no la publicamos porque Google no la expone sin JS. El 4,2 sí está verificado contra el payload propio de Google. El único conteo que aparece (3,1 sobre 59 reseñas) es de un mirror desactualizado que no coincide con el 4,2 actual — no lo usamos.
- TSPU/URSEC: no se sabe si cobran el 10%. No está publicado en ninguna parte del sitio: ni lo cobran declarado ni lo desmienten. Lo dejamos en 0 porque el modelo no acepta vacío, NO porque hayamos confirmado que no lo cobran. Preguntalo antes de pagar.
- Qué impuesto se le suma al flete y a qué tasa. La página dice 'los precios son sin impuestos' y no dice nada más. No asumimos 22% de IVA: no está escrito en ningún lado.
- Precio del despacho de aduana cuando lo gestionan ellos: nunca publicado, siempre por cotización.
- Tarifa de libros/CD/DVD: no existe. La línea de USD 9,04 (Montevideo) / 12,04 (interior) es cartas, revistas y documentos POR UNIDAD, no por kilo. No la conviertas en tarifa de libros.
- Si la tarifa de 2018 sigue siendo la que aplican en 2026. Está publicada y verificada, pero no revisada en ocho años.
- Reglas de peso volumétrico/dimensional: no publican ninguna fórmula, pero los usuarios se quejan de que les cobran el volumen del cartón, así que en la práctica podría existir.
- Si aceptan baterías de litio en vuelos especiales: aparece en una reseña de 2022 recuperada de un mirror no verificable. No lo damos por bueno — confirmalo con la empresa antes de comprar.
- Año de fundación y razón social. El perfil original decía 'desde ~2013-2014, Envia Mi Compra LLC, empresa de Florida': ninguna fuente lo sostiene. Sus páginas institucionales no dan año ni razón social, solo una oficina en Miami (6991 NW 82 Avenue Bay 13, Medley, FL 33166).
- Cargo mínimo en dólares: no publican uno. Publican peso mínimo facturable (0,500 kg por paquete), que es otra cosa.

**Fuentes:** [Tarifas oficiales (rate card, se auto-fecha 29/06/2018)](https://www.enviamicompra.com.uy/servicios-tarifas) · [Calculadora — 'los valores presentados no son valores finales'](https://www.enviamicompra.com.uy/calculator) · [Despachos aduaneros (sin precio, solo cotización)](https://ayuda.enviamicompra.com.uy/support/solutions/articles/12000035282-despachos-aduaneros) · [Nuevo régimen de franquicias (vigente 01/05/2026)](https://ayuda.enviamicompra.com.uy/support/solutions/articles/12000108322-nuevo-r%C3%A9gimen-de-franquicias) · [Régimen de importación simplificado (vigente 20/03/2026)](https://ayuda.enviamicompra.com.uy/support/solutions/articles/12000075522-r%C3%A9gimen-de-importaci%C3%B3n-simplificado) · [Cierre de vuelos y tiempos de tránsito](https://ayuda.enviamicompra.com.uy/support/solutions/articles/12000019266--cu%C3%A1ndo-cierran-los-vuelos-) · [Horarios de atención y reparto (interior vía DAC)](https://ayuda.enviamicompra.com.uy/support/solutions/articles/12000016978-horarios-de-atenci%C3%B3n-al-cliente-y-reparto) · [Oficinas en Uruguay (Francisco Araúcho 1237)](https://ayuda.enviamicompra.com.uy/support/solutions/articles/12000016979-oficinas-en-uruguay) · [Ficha de Google Maps](https://www.google.com/maps/place/?q=place_id:ChIJq3loj3OBn5URhK2rvJalKl0) · [Reddit r/uruguay — 'Cuáles son los mejores couriers hoy' (robo de AirPods, fotos)](https://reddit.com/r/uruguay/comments/1maxz1d/cuales_son_los_mejores_couriers_hoy_para_ustedes/) · [Reddit r/uruguay — 'Qué courier recomiendan' (buen servicio pero cara)](https://reddit.com/r/uruguay/comments/1guyf97/que_courier_recomiendan/) · [Foro mtb.uy — experiencias históricas (2014-2017)](https://mtb.uy/temas/experiencia-con-envia-mi-compra.8632/)

---

### Aerobox `aerobox` — Courier

> El más conocido: buena fama, 75 días de depósito y letra chica

Casillero propio en Miami (5459 NW 72ND AVE) con vuelos a Montevideo los lunes y viernes, oficina en José Enrique Rodó 2261 y tarifa por kilo publicada.

**Tarifa** (verificada 2026-07-12, [fuente](https://aerobox.com.uy/tarifas/)):

```json
{
 "quoteOnly": false,
 "tiers": [
  {
   "maxKg": 0.5,
   "flat": 11.99,
   "perKg": null
  },
  {
   "maxKg": 0.6,
   "flat": 15.5,
   "perKg": null
  },
  {
   "maxKg": 5,
   "flat": null,
   "perKg": 23.5
  },
  {
   "maxKg": 10,
   "flat": null,
   "perKg": 20.5
  },
  {
   "maxKg": 20,
   "flat": null,
   "perKg": 17.5
  }
 ],
 "minChargeUsd": 11.99,
 "handlingUsd": 5,
 "handlingPlusIva": true,
 "tspuPct": 10,
 "clearanceUsd": 25,
 "interiorUsd": null,
 "booksPerKg": null,
 "insuranceIncluded": false,
 "freeStorageDays": 75,
 "originsPerKg": {
  "us": 23.5,
  "eu": null,
  "cn": null,
  "ar": null
 },
 "transit": null
}
```

**Letra chica:** CÓMO SE COBRA EL FLETE: hasta 600 g es precio plano, no por kilo (1–500 g = USD 11,99; 501–600 g = USD 15,50). Desde los 601 g se cobra por kilo y la tarifa de la banda se aplica a TODO el peso, fraccionando cada 100 g: 601 g–5 kg a USD 23,50/kg, 5,1–10 kg a USD 20,50/kg, 10,1–20 kg a USD 17,50/kg. Arriba de 20 kg no hay tarifa publicada: es 'consultar tarifa comercial especial'.

LO QUE NO ESTÁ EN LA TABLA (y es lo que te cambia la cuenta): al flete se le suma 10% de TSPU (Ley 19.009, ellos actúan de agentes de retención y se lo vierten a URSEC) y USD 5 + IVA de manejo documentario por envío consolidado (~USD 6,10). Es decir que 'USD 23,50/kg' en la práctica son ~USD 25,85/kg antes del manejo.

CONSOLIDACIÓN: hasta 5 paquetes sin costo; cada paquete extra consolidado, USD 2. Desconsolidar, USD 5 por paquete. Fotos: la primera es gratis, cada foto adicional USD 5.

DEPÓSITO: 75 días gratis en Miami y 30 días gratis en Montevideo desde que el paquete queda disponible para retirar. Después, USD 10 por cada 15 días extra. Es de lo mejor de plaza para juntar compras.

VOLUMEN: no te cobran volumen hasta el doble del peso real; a partir de ahí, USD 10 por kilo volumétrico adicional. Para cosas grandes y livianas esto pesa.

DESPACHO: envío de hasta USD 200 fuera de la franquicia (paga 60% del FOB) — el trámite lo podés hacer vos sin despachante, o lo hace Aerobox por USD 25 + IVA más el costo de depósito de TCU. Régimen simplificado gestionado por Aerobox: USD 15. Ítems con WiFi/Bluetooth/radio: certificado URSEC USD 15 por ítem, homologación USD 30 (no se devuelve si URSEC la rechaza), liberación USD 25 + IVA más TCU USD 25 sin IVA. Dentro de la franquicia (hasta USD 200, hasta 20 kg, 3 por año) no hay costo de despacho.

INTERIOR Y DOMICILIO: no hay precio publicado. La página te lo pasa directo: el envío de Montevideo al interior 'será abonado por el cliente a la empresa de transporte local designada'. El envío a domicilio dentro de Montevideo tampoco tiene precio publicado, hay que coordinarlo antes. Los USD 5/USD 6 que circulan en resúmenes de terceros NO están en la página: no los uses.

SEGURO: no viene incluido. Es opcional, 3% del valor FOB con mínimo USD 33, y hay que contratarlo sí o sí ANTES de que la carga embarque en origen. Traducido: cuando el paquete se pierde, ya es tarde para asegurarlo.

LIBROS/CD/DVD: no hay flete con descuento. El beneficio es solo regulatorio (no consumen franquicia, están exentos del manejo documentario y van directo a Montevideo sin consolidar); el flete se paga a la tarifa normal por peso.

OTROS: cartas y documentos, tarifa plana USD 20 y exentos de manejo. Devolución al vendedor en EE.UU. USD 10 (con etiqueta prepaga) o USD 15 + franqueo. Retiro propio en Miami USD 10 por paquete. Reenvío dentro de EE.UU. USD 20 por paquete. Verificación de mercadería de USD 5 (1–5 piezas) a USD 20 (11–20 piezas).

ORÍGENES: la única ruta real es Estados Unidos (Miami). No hay tarifa propia de Europa ni de China: lo que comprás en China te llega igual a tu casilla de Miami. La ruta desde Argentina tiene su propio tarifario publicado, pero el alta muestra 'Lo sentimos, servicio suspendido' y la página sigue promocionando una promo de 2023: la damos por no operativa y por eso no publicamos su precio.

VIGENCIA: el tarifario está encabezado 'Tarifas a partir del 1 Agosto 2022' y no cambió desde entonces. Ojo: eso NO quiere decir que la página esté abandonada — el servidor devuelve Last-Modified del 06/07/2026 y hay campañas 2026 activas. Simplemente los precios no se tocan desde 2022. Igual, confirmá el precio del día por WhatsApp antes de comprar.

**Google:** `ChIJW6e9mRmBn5URoXLiRM7AlwA` — "Aerobox" · **4,2 ★** (? reseñas) · [ficha](https://www.google.com/maps/place/?q=place_id:ChIJW6e9mRmBn5URoXLiRM7AlwA)

**Reddit:** muestra **usable** · neto **+18** sobre 19 opiniones

Aerobox es el courier más nombrado del Reddit uruguayo y aparece como el "barato y conocido": lo citan por el precio por kilo y por la consolidación, y varios cuentan que les llegó en tiempo y forma y que la atención es buena. La contracara es real: demoras de semanas, un usuario que se fue en 2024 porque "te abren todos los paquetes", y dos usuarios distintos en julio de 2026 contando que un paquete les desapareció. La transparencia es la dimensión más floja (sospechas de cobros extra), pero se apoya en pocas opiniones y sin casos documentados.

> *"Yo compré x aerobox y me llegó en tiempo y forma y lo q pedí es mucho mejor de lo q esperaba"* — [r/uruguay, 2024-06-06](https://reddit.com/r/uruguay/comments/1d1pacx/sobre_compras_en_temu/l7fzlud/) (positivo)

> *"Nunca más uso Aerobox, te abren todos los paquetes y cero discreción tienen."* — [r/uruguay, 2024-03-08](https://reddit.com/r/uruguay/comments/1b8t405/aduana_prohíbe_juguetes_sexuales_desde_fines_de/ktwta8b/) (negativo)

**Scores propuestos:** cumplimiento **58** · atención **66** · transparencia **55** · cobertura **38**

- *cumplimiento:* Muestra de Reddit usable (19 opiniones reales): hay entregas concretas que salieron bien ("me llegó en tiempo y forma", "0 dramas") pero también demoras de semanas y, lo más nuevo y lo más grave, dos usuarios distintos en julio de 2026 diciendo que se les perdió un paquete. A eso se suma el patrón documentado en tuQuejaSuma contra el brazo argentino (26 reclamos, 46% resueltos): USPS/FedEx muestra entrega en el depósito de Miami y Aerobox dice no haberlo recibido — y ese depósito es el MISMO al que mandan los clientes uruguayos. Y no publican ningún plazo de entrega, así que no hay nada a lo que agarrarse. Aprueba raspando.
- *atencion:* Google 4,2 ★ (calificación confirmada en el payload de Google Maps) y en Reddit el trato se salva: "la atención es 10p", valoran que manden foto del paquete al llegar a Miami y la consolidación. En contra, un usuario dejó de usarlo en 2024 porque abren todos los paquetes sin discreción, y hay quejas de WhatsApp/teléfono sin respuesta (esas son del brazo argentino). Lo mejor puntuado de la ficha.
- *transparencia:* Dos caras. A favor: publican un tarifario inusualmente completo — flete, manejo, TSPU, volumétrico, depósito, seguro, despacho, devoluciones, todo por escrito. En contra: el precio de lista NO es el precio final (10% de TSPU + USD 5 + IVA van por fuera), no publican precio de interior ni de domicilio en Montevideo, no publican plazo de entrega, dejan online una ruta desde Argentina con tarifas y promo de 2023 mientras el alta dice "servicio suspendido", y en su página figura un "mínimo U$S 10" del régimen simplificado que no coincide con la norma vigente. En Reddit hay sospechas de cobros extra, pero son percepción, no casos documentados.
- *cobertura:* Determinístico y flojo: un solo origen real (Estados Unidos vía Miami; China entra por la misma casilla y Argentina figura suspendida), sin precio de entrega al interior (te lo cobra un transportista tercero), sin seguro incluido (3% del FOB, mínimo USD 33, y hay que contratarlo antes de embarcar), sin tarifa de libros con descuento y sin descuento de IVA. Lo único sobresaliente es el almacenamiento: 75 días gratis en Miami + 30 en Montevideo, de lo mejor de plaza.

**Banderas rojas:**

- El precio de lista no es el precio final: al flete le suman 10% de TSPU (Ley 19.009, lo retienen para URSEC) y USD 5 + IVA de manejo documentario por envío. Los "USD 23,50/kg" son en realidad ~USD 25,85/kg antes del manejo.
- No publican NINGÚN plazo de entrega. Lo único concreto que dicen es que los vuelos llegan a Uruguay los lunes y viernes. No hay compromiso al que agarrarse si se demora.
- No publican el precio de entrega al interior: te lo cobra directamente "la empresa de transporte local designada". El envío a domicilio en Montevideo tampoco tiene precio publicado. O sea que el costo final fuera de la oficina es imposible de saber antes de comprar. (Los USD 5/USD 6 que circulan en resúmenes de terceros no están en su página.)
- El seguro no viene incluido y hay que contratarlo ANTES de que la carga embarque en origen (3% del FOB, mínimo USD 33). Cuando el paquete se pierde, ya es tarde — y "se perdió en Miami" es justamente el reclamo más repetido contra el grupo.
- Patrón de reclamos en el depósito de Miami: compradores muestran entrega confirmada de USPS/FedEx en 5459 NW 72ND AVE y Aerobox dice no haber recibido el paquete (26 reclamos, 46% resueltos, empresa no verificada, tuQuejaSuma — son contra Aerobox Argentina, pero los clientes uruguayos mandan a esa misma dirección). En Reddit, dos usuarios distintos en julio de 2026 cuentan que a ellos les pasó lo mismo con Aerobox.
- Consolidar es gratis solo hasta 5 paquetes: cada paquete extra cuesta USD 2 y desconsolidar USD 5 por paquete. La tarifa por kilo esconde estos cargos.
- Sobrecargo volumétrico de USD 10 por kilo de volumen adicional una vez que el volumen supera el doble del peso real. Ningún preview de calculadora te lo muestra.
- El "mínimo U$S 10" del régimen simplificado que figura en su página no coincide con la norma vigente (mínimo USD 20). No te guíes por ese número.
- La tarifa no cambia desde agosto de 2022 ("Tarifas a partir del 1 Agosto 2022"). La página SÍ está mantenida (el servidor devuelve Last-Modified del 06/07/2026 y hay campañas 2026 vivas), así que no es una página abandonada — pero igual confirmá el precio del día antes de comprar.
- La ruta desde Argentina sigue con tarifas publicadas y una promo de "JUNIO, JULIO Y AGOSTO 2023", pero el alta devuelve "Lo sentimos, servicio suspendido". Dejan ofertas muertas arriba.

**A favor:** 
- 75 días de almacenamiento gratis en Miami y 30 en Montevideo: de lo mejor de plaza para juntar compras y consolidar hasta 5 paquetes sin costo.
- Tarifario inusualmente completo y por escrito: flete, manejo, TSPU, volumétrico, depósito, seguro, despacho, devoluciones, retiros. Casi todo el costo está publicado (lo que falta es el interior).
- 4,2 ★ en Google y es el courier más nombrado del Reddit uruguayo, con varios relatos concretos de entregas que salieron bien y de buena atención.
- Te mandan foto del paquete cuando llega a Miami (la primera es gratis).
- No te cobran volumen hasta el doble del peso real: para compras compactas no pagás sobrecargo.
- Libros, CDs y DVDs no consumen franquicia, están exentos del manejo documentario y van directo a Montevideo sin consolidar (aunque el flete se paga igual, sin descuento).
- Podés hacer vos mismo el despacho de envíos de hasta USD 200 sin despachante, o pagarles USD 25 + IVA para que lo hagan ellos.

**En contra:** 
- El precio que ves no es el que pagás: sumale 10% de TSPU y USD 5 + IVA de manejo.
- USD 23,50/kg hasta 5 kg no es barato. Un usuario calculó 196 USD por 10 kg en Aerobox contra 130 en Puntomío.
- No sabés cuánto te sale la entrega fuera de Montevideo — ni el envío a domicilio dentro de Montevideo. No está publicado.
- No prometen ningún plazo de entrega, así que si se demora no incumplen nada.
- El seguro no está incluido y hay que comprarlo antes de que la carga salga de origen. Después de perdido el paquete, no hay red.
- Sirve solo para Estados Unidos: no hay ruta propia a Europa ni a China (China entra por tu casilla de Miami) y la de Argentina figura suspendida.
- Reclamos recurrentes de "el paquete llegó a Miami y ellos dicen que no lo recibieron": documentados contra el brazo argentino, y en julio de 2026 dos usuarios de Reddit dicen que les pasó acá.
- Abren todos los paquetes para fotografiarlos: si te importa la discreción de lo que comprás, tenelo en cuenta.

**Para quién:** El que compra en Estados Unidos, junta varias compras antes de mandarlas (los 75 días de depósito gratis en Miami son de los mejores de plaza) y retira en Montevideo. Si comprás liviano y de a poco, si vivís en el interior, o si necesitás un plazo de entrega prometido por escrito, este no es tu courier.

**Veredicto:** Aerobox es el courier más conocido de la plaza y el que más gente nombra cuando alguien pregunta en Reddit — y eso se le nota: 4,2 estrellas en Google, oficina física en José Enrique Rodó, depósito propio en Miami y un tarifario donde está escrito casi todo, incluso lo feo. Esa transparencia documental es real y la valoramos. El problema es lo que ese tarifario le hace a tu bolsillo: la tarifa por kilo que ves en la tabla no es el precio final, porque el 10% de TSPU y los USD 5 + IVA de manejo van por encima, así que los USD 23,50/kg de la primera banda son unos USD 25,85/kg antes de que empiecen a contar los extras. No es un courier barato: para compras chicas y frecuentes hay opciones más económicas, y la propia gente de Reddit lo compara con Puntomío y le encuentra 60 dólares de diferencia en un envío de 10 kg. Donde sí gana con claridad es en el depósito: 75 días gratis en Miami y 30 en Montevideo son de lo mejor que hay, y si tu estrategia es ir juntando compras para consolidar, eso te ahorra plata de verdad. Ahora, dos cosas nos frenan de recomendarlo con los ojos cerrados. Una: no prometen ningún plazo de entrega, solo que los vuelos llegan lunes y viernes, así que no hay nada que puedas reclamar si se demora. Dos, y más seria: existe un patrón repetido de paquetes que USPS o FedEx entregan en su depósito de Miami y que Aerobox dice no haber recibido — está documentado contra el brazo argentino (26 reclamos, 46% resueltos), pero es el mismo depósito al que mandás vos, y en julio de 2026 dos usuarios uruguayos distintos contaron en Reddit que a ellos les pasó. Y el seguro hay que contratarlo antes de embarcar, o sea que cuando te enterás del problema ya es tarde. Resumen honesto: es sólido, conocido y bien puntuado, pero es caro para lo chico, opaco para el interior, y no te cubre por default en el punto exacto donde más falla el rubro.

**Gaps (resolver a mano):**

- Cantidad de reseñas de Google: el investigador publicó 512, pero el fact-checker no lo pudo confirmar — el mismo payload de Google que sí confirma el 4,2 no trae ningún conteo de reseñas. Publicamos la calificación sin la cantidad. Hay que recapturarlo a mano en un navegador no compartido.
- Precio de entrega al interior: no publicado. Aerobox lo deriva a "la empresa de transporte local designada" y el cliente le paga a ella. Hay que pedirlo por teléfono/WhatsApp para poder calcular el costo final.
- Precio del envío a domicilio dentro de Montevideo: no publicado, requiere coordinación previa.
- Plazo de entrega puerta a puerta: no existe ningún compromiso publicado. Lo único concreto es que los vuelos llegan lunes y viernes. El "7 a 10 días desde Miami" que circula es la experiencia de un usuario argentino en 2022, no un SLA.
- Tarifa de libros/CD/DVD: no hay flete con descuento publicado (el beneficio es solo regulatorio). Falta confirmar si existe alguna tarifa especial no publicada.
- Si los precios por kilo de 2022 son los que efectivamente cobran hoy: la página está mantenida (Last-Modified 06/07/2026) pero el tarifario no se toca desde agosto de 2022. Solo un llamado o WhatsApp lo resuelve.
- Si la ruta desde Argentina está realmente discontinuada o el cartel de "servicio suspendido" es un resto viejo en la página. Por eso no publicamos su precio por kilo aunque figure.
- Los reclamos de tuQuejaSuma no traen año (el sitio oculta los números), así que no sabemos si el patrón de "paquete perdido en Miami" es actual o mayormente histórico.
- Texto de reseñas individuales de Google: no se pudo extraer, así que no tenemos ni un solo incidente uruguayo fechado desde Google. Es el mayor hueco de la ficha reputacional.
- Descuento de IVA: no hay ninguna mención en su sitio. Sin confirmar si aplica algo.
- La calculadora propia de Aerobox no se probó contra la tabla publicada — relevante porque existe un reclamo de "me cobraron casi el doble de lo que decía la calculadora".

**Fuentes:** [Tarifario oficial (verificado 2026-07-12)](https://aerobox.com.uy/tarifas/) · [Preguntas frecuentes (vuelos lunes y viernes)](https://aerobox.com.uy/preguntas-frecuentes/) · [Servicios](https://aerobox.com.uy/servicios/) · [Tarifas desde Argentina ("servicio suspendido")](https://aerobox.com.uy/envios-desde-argentina/envios-desde-argentina-tarifas/) · [Comprar en China (entra por la casilla de Miami)](https://aerobox.com.uy/comprar-en-china-desde-uruguay/) · [Ficha de Google Maps (4,2 ★)](https://www.google.com/maps/place/?q=place_id:ChIJW6e9mRmBn5URoXLiRM7AlwA) · [tuQuejaSuma — Aerobox Argentina (26 reclamos, 46% resueltos)](https://tuquejasuma.com/aerobox-argentina) · [Trustpilot — Aerobox Argentina](https://es.trustpilot.com/review/www.aerobox.com.ar) · [Foro fullaventura — experiencias (usuarios argentinos, 2022)](https://www.fullaventura.com/foro/viewtopic.php?t=188503) · [Reddit r/uruguay — "me llegó en tiempo y forma"](https://reddit.com/r/uruguay/comments/1d1pacx/sobre_compras_en_temu/l7fzlud/) · [Reddit r/uruguay — "te abren todos los paquetes"](https://reddit.com/r/uruguay/comments/1b8t405/aduana_prohíbe_juguetes_sexuales_desde_fines_de/ktwta8b/)

---

### Casilla Mía `casillamia` — Courier

> Carísimo abajo de 5 kg y con 2,0 estrellas en 89 reseñas de Google.

Casillero en Miami operado por el Correo Uruguayo, dos vuelos semanales, entrega final por la red postal nacional.

**Tarifa** (verificada 2026-07-12, [fuente](https://www.casillamia.uy/Tarifas)):

```json
{
 "quoteOnly": false,
 "tiers": [
  {
   "maxKg": 0.5,
   "flat": 10,
   "perKg": null
  },
  {
   "maxKg": 5,
   "perKg": 20,
   "flat": null
  },
  {
   "maxKg": 20,
   "perKg": 8,
   "flat": null
  },
  {
   "maxKg": null,
   "perKg": 12,
   "flat": null
  }
 ],
 "minChargeUsd": 10,
 "handlingUsd": null,
 "handlingPlusIva": null,
 "tspuPct": 10,
 "clearanceUsd": 75,
 "interiorUsd": null,
 "booksPerKg": null,
 "insuranceIncluded": null,
 "freeStorageDays": 90,
 "originsPerKg": {
  "us": 20,
  "eu": null,
  "cn": null,
  "ar": null
 },
 "transit": "Sin plazo comprometido. Dos vuelos semanales Miami→Montevideo; el FAQ se niega explícitamente a prometer un tiempo de entrega. Casos reales reportados: desde ~7 días hábiles (el mejor documentado) hasta 5+ semanas."
}
```

**Letra chica:** OJO: la tarifa se cobra POR TRAMOS DE 500 g (se redondea para arriba), no por kilo. Y la tabla está escrita de forma que parece barata cuando no lo es. "Hasta 500 grs: USD 10" es un MÍNIMO, no una base: el tramo siguiente es "USD 10 adicionales cada 500 grs", o sea USD 20/kg efectivos hasta los 5 kg. Verificado en la calculadora oficial del propio Correo (ahiva.correo.com.uy/TransExpressCalculatorWeb, la que está detrás de casillamia.uy/Calculadora.aspx): 0,5 kg = USD 10 | 1 kg = USD 20 | 2 kg = USD 40 | 3 kg = USD 60 | 5 kg = USD 100 | 6 kg = USD 108 | 10 kg = USD 140 | 20 kg = USD 220 de flete. Recién arriba de los 5 kg el marginal se desploma a USD 4 cada 500 g (= USD 8/kg): por eso un paquete de 5 kg sale USD 100 y uno de 6 kg sale USD 108. La curva es perversa — si andás entre 3 y 5 kg estás pagando la peor tarifa del tablero. TFSPU (10%): va SIEMPRE POR ENCIMA del precio publicado, en un asterisco al pie. Verificado que se aplica sobre flete + gestiones aduaneras, no sobre los derechos (1 kg / USD 100 sin franquicia: flete 20 + derechos 60 + gestiones 75 → TFSPU 9,5 = 10% de 95 → total USD 164,5). Gestiones aduaneras: son OPCIONALES y solo si el envío paga tributos — USD 75 hasta CIF USD 800 y USD 135 por encima. Incluye el DUA pero NO los tributos. No hay handling fijo publicado (por eso va null, no es un dato que falte: no existe). Sí hay dos cargos fijos: USD 2,00 por cada paquete que metas en una consolidación (tope USD 800 de consolidación) y USD 1,34 si el paquete llega a Miami sin tu número de casillero. Almacenaje: 90 días gratis en Miami, y pasado ese plazo el envío "quedará declarado en abandono" — no te cobran depósito, perdés la mercadería. Solo origen EE.UU./Miami: no hay Europa, China ni Argentina. Máximo 30 kg y 36 x 44 x 61 cm. No publican ninguna regla de peso volumétrico. El reempaquetado se cobra aparte y nunca dicen cuánto.

**Google:** **SIN FICHA CONFIABLE — pinear a mano antes de publicar cualquier rating.**

**Reddit:** muestra **thin** · neto **-40** sobre 6 opiniones

Muestra flaca: de 18 menciones, apenas ~6 frases son opinión real sobre Casilla Mía (y salen de unos 5 usuarios distintos). Lo que hay se inclina a negativo y gira casi todo alrededor de la plata —cobros más altos de lo esperado, una "guita mal cobrada" que se devolvió recién tras ir a Defensa al Consumidor— más un caso reciente (2026) de paquete abierto y resellado con faltante; el contrapeso positivo es débil y sobre todo implícito (gente que la usa hace años sin drama). Aclaración importante: buena parte del enojo que se le atribuye es en realidad el impuesto de Aduana, no la tarifa del courier —el propio usuario más enojado lo aclara en el mismo hilo.

> *"A mí lo que me pasó es que hice una compra (amazon-casilla mía) y me llegó el paquete abierto y resellado, con contenido faltante."* — [r/Burises, 2026-04-03](https://reddit.com/r/Burises/comments/1sbd6wy/tutorial_básico_para_dejar_de_regalar_plata_en/oe5hdzi/) (negativo)

> *"Deberías llamar a defensa al consumidor, mi hermano tuvo dramas con los de Casilla Mia, presentó la queja, si bien le llevó algo de tiempo, le terminaron devolviendo una guita mal cobrada y salió ganando en la global."* — [r/uruguay, 2018-02-27](https://reddit.com/r/uruguay/comments/80jel4/entre_todo_este_bardo_de_los_mods_les_cuento_una/duwf013/) (negativo)

> *"Hace años cuando no compraba directo o vía tiendamia usaba casilla mía por ser del correo y bien en general, pero últimamente vi que es pésimo.."* — [r/uruguay, 2020-10-21](https://reddit.com/r/uruguay/comments/jf6q1a/couriers_uruguay_2020/) (mixto)

**Scores propuestos:** cumplimiento **25** · atención **20** · transparencia **45** · cobertura **45**

- *cumplimiento:* 2,0 estrellas sobre 89 reseñas de Google — de lo peor del rubro — y las quejas son consistentes hace una década: demoras de semanas sin visibilidad, paquetes que llegan abiertos o aplastados, un robo denunciado, un paquete perdido, envíos despachados sin que el cliente los pidiera. Hay más de 14 reseñas fechadas con nombre, así que el puntaje está ganado con evidencia, no adivinado. Reddit (muestra flaca) sugería 45 y aporta un caso de abril 2026 de paquete abierto y resellado con faltante. Pesa mucho más el n=89 de Google que las ~6 frases de Reddit; queda en 25 y no en cero porque existe un caso positivo bien documentado (~7 días hábiles de Miami a la entrega) y gente que la usa hace años sin problemas.
- *atencion:* Informacion contradictoria como patrón, no como excepción: 4 llamadas con 4 respuestas distintas (Guille Benítez), tres ubicaciones distintas para el mismo paquete (Denisse Echeverria), agentes que no sabían que la web propia estaba caída (Heber Marco, ~marzo 2026), y un despachante que "trabaja solo los jueves" y no contesta mails. Agravante: la empresa le contesta "Jajaja" a una reseña de 1 estrella en su propia ficha de Google (una instancia confirmada) y "Es Uruguay..." a otra. Atenúa apenas que el personal del call center es descrito como amable en lo personal. Reddit no aporta ni una sola frase sobre atención, así que este puntaje sale entero de Google.
- *transparencia:* Partido en dos. A favor: publican la tarifa completa, tienen calculadora propia funcionando y verificable, y las condiciones de almacenaje y despacho están escritas. Es más de lo que hacen varios competidores. En contra: la tabla está redactada de forma que el precio real se esconde ("Hasta 500 grs: USD 10" cuando el rate efectivo es USD 20/kg), el 10% de TFSPU va por fuera del precio en un asterisco al pie, el reempaquetado se cobra sin decir cuánto, no publican seguro en ningún lado, el tramo de +20 kg está publicado pero su propia calculadora no lo puede calcular, y el sitio se contradice solo sobre la franquicia (/Tarifas dice USD 800, /como_funciona sigue diciendo USD 200). Reddit sugería 40 por las cuentas finales que sorprenden, aunque buena parte de esa sorpresa es impuesto de Aduana y no tarifa del courier.
- *cobertura:* Determinístico. Orígenes: solo EE.UU./Miami — sin Europa, China ni Argentina (1 de 4). Interior: lo mejor del mercado — entrega por la red del Correo Uruguayo, llega a cualquier pueblo o a la sucursal que elijas, sin recargo publicado (aunque no pudimos confirmar que sea efectivamente gratis). Seguro: no publican ninguno. Almacenaje gratis: 90 días, muy por encima del promedio. Tarifa de libros: no existe. Descuento de IVA: no publicado. El techo se lo ponen el origen único y la ausencia de seguro.

**Banderas rojas:**

- LA TARIFA MÁS CARA DEL MERCADO EN PAQUETES CHICOS, Y LA TABLA LO DISIMULA. "Hasta 500 grs: USD 10" se lee barato, pero el tramo siguiente es "USD 10 adicionales cada 500 grs": son USD 20/kg efectivos hasta los 5 kg. Su propia calculadora lo confirma: 1 kg = USD 20, 2 kg = USD 40, 5 kg = USD 100 de flete, antes del 10% de TFSPU. Los casilleros de Miami de la competencia andan en USD 8–11/kg.
- Curva de precios perversa: 5 kg cuesta USD 100 de flete y 6 kg cuesta USD 108, porque el marginal recién se desploma de USD 10 a USD 4 cada 500 g justo a los 5 kg. Si tu paquete pesa entre 3 y 5 kg estás pagando la peor tarifa del tablero, y dividir un envío casi siempre te sale peor que juntarlo.
- El 10% de TFSPU se cobra POR ENCIMA del precio publicado y está en un asterisco al pie. Verificado en su calculadora que se aplica sobre flete + gestiones aduaneras (1 kg / USD 100 con tributos: flete 20 + gestiones 75 → TFSPU 9,5).
- POR DEFECTO TE DESPACHAN LOS PAQUETES SIN PEDIRTE PERMISO. Su propia página "Cómo funciona" dice: "Cada paquete es procesado inmediatamente después de ser recibido y por lo tanto, no serán consolidados". O sea: cada bulto que llega a Miami sale solo, te cobra el mínimo de USD 10 + TFSPU y te descuenta franquicia, salvo que hayas activado la consolidación en tu cuenta. Un usuario lo confirma: "Me han mandado cosas a Uruguay sin yo solicitarlo".
- Cero compromiso de plazo. El FAQ se niega explícitamente a prometer uno y solo dice que hay dos vuelos semanales Miami→Montevideo. Lo reportado va de ~7 días hábiles a más de 5 semanas.
- El almacenaje gratis no termina en cobro, termina en ABANDONO: pasados los 90 días "el envío quedará declarado en abandono". No te facturan depósito, perdés la mercadería.
- Caídas sistémicas de la web que te bloquean el pago. Reportadas por usuarios durante años, otra vez alrededor de marzo de 2026, y reconocidas formalmente por el Correo Uruguayo en un comunicado de 2020. Como tenés que pagar online para liberar el paquete, la web caída te retrasa la entrega directamente.
- Reportes repetidos de paquetes abiertos, manoseados, aplastados y con contenido robado, con la empresa desligándose. NO publican ningún seguro en ninguna parte del sitio, así que no hay remedio declarado. Un caso de abril de 2026 en Reddit: "me llegó el paquete abierto y resellado, con contenido faltante".
- Las trabas en Aduana son frecuentes y el despachante es un cuello de botella: un usuario reporta que el funcionario de gestiones aduaneras "trabaja solo los jueves" y no contesta mails. Clientes del interior cuentan que tuvieron que viajar a Montevideo (3 horas de auto) a rescatar un paquete retenido.
- La empresa le contesta "Jajaja" a una reseña de 1 estrella en su propia ficha de Google (una instancia confirmada, ~marzo 2026) y "Es Uruguay..." a otra. O el soporte desprecia al que reclama, o la ficha no la maneja el operador; ninguna de las dos tranquiliza.
- El sitio se contradice solo sobre el régimen de importación: /Tarifas cita la franquicia de USD 800 (correcta, Decreto 50/026) mientras /como_funciona todavía dice que el paquete se descuenta "de la franquicia de los 200 dólares". No uses su web como fuente autorizada sobre franquicias.

**A favor:** 
- 90 días de almacenaje gratis en Miami — de lo más generoso del mercado si querés ir juntando compras.
- Entrega por la red del Correo Uruguayo: llega a cualquier pueblo del interior, o a la sucursal de Correo que elijas al registrarte, sin recargo publicado. En cobertura de interior no tiene rival.
- Entre 5 y 20 kg el marginal baja a USD 4 cada 500 g (USD 8/kg): en envíos pesados sí es de los baratos.
- El despacho aduanero (USD 75 hasta CIF USD 800, USD 135 por encima) es OPCIONAL y solo se cobra si el envío paga tributos — no te lo clavan por defecto.
- Suscripción gratuita, dirección en EE.UU. sin costo, y tarifa completa publicada con calculadora propia que se puede auditar número por número.
- Algunas tiendas de EE.UU. que rechazan direcciones de otros couriers sí aceptan la de Casilla Mía (caso documentado con switchbot.com).

**En contra:** 
- Abajo de 5 kg es el más caro del tablero: USD 20/kg efectivos. Un kilo son USD 20 de flete; cinco kilos, USD 100. La competencia cobra USD 8–11/kg.
- El 10% de TFSPU no está en el precio que te muestran: va aparte, sobre flete + gestiones aduaneras.
- 2,0 estrellas en 89 reseñas de Google. Las quejas son consistentes hace diez años y son de PROCESO, no de precio: demoras de semanas sin visibilidad, web caída, respuestas contradictorias del soporte.
- No consolida por defecto: cada paquete que llega a Miami sale solo, te cobra el mínimo de USD 10 + TFSPU y te come franquicia. Y consolidar cuesta USD 2 por cada paquete metido adentro.
- No publica seguro en ningún lado, y hay reportes de paquetes abiertos, aplastados y hasta un robo, con la empresa sin hacerse responsable.
- Sin ningún compromiso de plazo de entrega. El propio FAQ evita prometerlo.
- Solo origen EE.UU./Miami. Nada de Europa, China ni Argentina.
- No tiene tarifa preferencial para libros.
- Si el paquete llega a Miami sin tu número de casillero (pasa seguido cuando el vendedor reformatea la dirección), son USD 1,34 extra.

**Para quién:** Al que trae MUCHO PESO desde EE.UU. y no tiene apuro: entre 5 y 20 kg el marginal es USD 8/kg y ahí sí conviene. También al que vive en el interior — la entrega va por la red del Correo Uruguayo y llega a cualquier pueblo o a la sucursal que elijas, sin recargo publicado, cosa que casi nadie más te da. Y al que necesita juntar varias compras con calma: 90 días de almacenaje gratis en Miami. Si tu paquete pesa menos de 5 kg, si te importa el plazo, o si el contenido es caro y querés algún tipo de respaldo si se rompe o desaparece, buscá otro courier: acá vas a pagar la tarifa más cara del mercado por el servicio peor calificado.

**Veredicto:** Casilla Mía es el courier del Correo Uruguayo y arrastra las dos caras de eso. La buena: llega a todo el país por la red postal, te da 90 días de almacenaje gratis en Miami, la suscripción no cuesta nada y el despacho aduanero es opcional. La mala: la reputación es genuinamente mala y lo es desde hace años — 2,0 estrellas en 89 reseñas de Google, con quejas que se repiten idénticas durante una década y que no son sobre el precio sino sobre el proceso: demoras de semanas, la web caída justo cuando tenés que pagar para liberar el paquete, respuestas distintas en cada llamada, paquetes que llegan abiertos. Y encima la tarifa está escrita para que parezca barata cuando no lo es: ese "Hasta 500 grs: USD 10" es un mínimo, no una base — el rate real es USD 20/kg hasta los 5 kg, que es el doble o el triple de lo que cobra un casillero de Miami cualquiera. Lo verificamos dos veces: en la tabla publicada y manejando su propia calculadora. Recién arriba de los 5 kg el marginal se desploma a USD 8/kg y la ecuación se da vuelta. Ese es el trade-off, y hay que decirlo derecho: es caro y lento para paquetes chicos, y es barato y con la mejor cobertura de interior del país para paquetes pesados. Si traés 8 kg a Tacuarembó y podés esperar, es una opción defendible. Si traés unas zapatillas de 1 kg a Montevideo y las querés este mes, estás pagando el precio más alto del mercado por el servicio con peor calificación. Un detalle que pinta a la empresa entera: a una reseña de 1 estrella en su propia ficha de Google le contestaron "Jajaja".

**Gaps (resolver a mano):**

- Google place_id: NO se pudo extraer (Google no lo expone para esta ficha). Solo tenemos el CID 14064921665163253585 y el feature id /g/11cmlpcv1x. Por eso google.trustworthy va en false: hay que fijar la ficha a mano antes de publicar el widget.
- AVISO DE FICHA: el nombre que muestra Google es "Casilla", NO "Casilla Mía". Está confirmado que es el negocio correcto (web casillamia.uy, teléfono 0800 2108 int. 3, Buenos Aires 451 = sede del Correo), pero hay una ficha SEPARADA y distinta de "Correo Uruguayo" (3,8 ★) en la misma dirección. NO fusionar ni sustituir una por la otra — es la misma ficha que envenenó la investigación de Correo Uruguayo.
- Recargo por entrega en el interior: no hay recargo publicado y el sitio dice que entregan "en tu domicilio o en la oficina de Correo Uruguayo del interior del país que hayas escogido", pero NO pudimos confirmar con ninguna fuente que el interior sea efectivamente sin costo extra. interiorUsd queda en null en vez de afirmar 0.
- Seguro: no está publicado en ninguna parte del sitio — ni cobertura incluida, ni seguro opcional, ni límite de responsabilidad por valor declarado. Con los reportes de robo y manipulación que hay, es un hueco material. insuranceIncluded queda null: no pudimos establecer si aplica alguna responsabilidad postal implícita.
- Tarifa preferencial de libros/CD/DVD: no está publicada. No asumir que existe.
- Handling fijo: NO existe uno publicado como tal (por eso null, no es un dato faltante). Los únicos cargos fijos son USD 2,00 por paquete consolidado y USD 1,34 por paquete sin número de casillero.
- El tramo ">20 kg = USD 6 adicionales cada 500 grs" está PUBLICADO en la tabla pero NO se pudo verificar: su propia calculadora no devuelve ningún resultado para 21, 25 ni 30 kg, pese a que ella misma dice que el máximo son 30 kg. O la calculadora está rota arriba de 20 kg, o el tope práctico son 20 kg. Lo dejamos en la tabla porque es un número publicado, pero no está confirmado.
- Peso volumétrico / dimensional: no hay ninguna regla publicada. Solo un límite duro de tamaño (36 x 44 x 61 cm) y de peso (30 kg). Se desconoce si repesan por volumen en la práctica.
- Costo del reempaquetado: dicen que se cobra como cargo adicional si el embalaje original no es seguro, pero nunca dicen cuánto.
- Si el 10% de TFSPU también se aplica sobre los USD 2 de consolidación y los USD 1,34 de almacenaje: la calculadora no permitió cotizar una consolidación sin cantidad de paquetes, así que solo está confirmado sobre flete + gestiones aduaneras.
- Un espejo de terceros (uy.latinoplaces.com) reporta 1,6 ★ / 48 reseñas. Google directo muestra 2,0 ★ / 89 al 2026-07-12. Usamos Google y tratamos el espejo como desactualizado — pero significa que cualquier rating cacheado que ya tengamos puede estar mal.
- Evidencia reciente escasa fuera de Google: no hay perfil en Trustpilot, no hay hilo sustancial en gameover.uy, y la muestra de Reddit es flaca (solo ~6 frases de opinión real, de ~5 usuarios). Hay al menos tres reseñas de Google dentro de los últimos 12 meses, pero todas negativas.

**Fuentes:** [Tarifas oficiales (Casilla Mía)](https://www.casillamia.uy/Tarifas) · [Calculadora oficial (verificada número por número)](https://ahiva.correo.com.uy/TransExpressCalculatorWeb) · [Preguntas frecuentes: 90 días de almacenaje, sin plazo comprometido, dos vuelos semanales](https://www.casillamia.uy/PREGUNTAS_FRECUENTES.aspx) · [Consolidación: USD 2 por paquete, tope USD 800, abandono a los 90 días](https://www.casillamia.uy/Consolidacion.aspx) · [Cómo funciona: "no serán consolidados" (despacho automático por defecto)](https://www.casillamia.uy/como_funciona) · [Ficha de Google (2,0 ★ / 89 reseñas) — figura como "Casilla"](https://maps.google.com/?cid=14064921665163253585) · [Comunicado del Correo Uruguayo reconociendo la caída de la web de Casilla Mía](https://www.correo.com.uy/noticias/-/asset_publisher/x68NfmqmDEKm/content/comunicado-de-casilla-mia) · [Hilo mtb.uy: "Mala experiencia con Casilla Mia" (con contracaso positivo)](https://mtb.uy/temas/mala-experiencia-con-casilla-mia.7294/)

---

### Punto Mío `puntomio` — Courier

> El más barato de la vuelta, pero lento y sin red de seguridad.

Courier con casilla propia en Miami y Madrid, dos vuelos por semana y 23 puntos de retiro.

**Tarifa** (verificada 2026-07-12, [fuente](https://api.puntomio.uy/calculator)):

```json
{
 "quoteOnly": false,
 "tiers": [
  {
   "maxKg": 0.5,
   "flat": 8.99,
   "perKg": null
  },
  {
   "maxKg": null,
   "flat": null,
   "perKg": 16
  }
 ],
 "minChargeUsd": 8.99,
 "handlingUsd": null,
 "handlingPlusIva": null,
 "tspuPct": 0,
 "clearanceUsd": null,
 "interiorUsd": 9,
 "booksPerKg": 8.99,
 "insuranceIncluded": false,
 "freeStorageDays": 60,
 "originsPerKg": {
  "us": 16,
  "eu": 18,
  "cn": null,
  "ar": null
 },
 "transit": "Publican 3 a 7 días hábiles. Vuelos solo martes y viernes desde Miami, y hasta 72 h hábiles para que el paquete aparezca en tu panel. En la práctica hay reportes de 16, 20 y 23 días, y de paquetes 2-3 semanas trancados en Miami figurando como 'enviado'. No hay SLA: los términos se desligan de cualquier demora de la aerolínea."
}
```

**Letra chica:** Precio verificado el 12/07/2026 contra su propia calculadora (api.puntomio.uy/calculator), porque la tarifa de flete NO está publicada en ningún lado del sitio. RETIRANDO EN OFICINA, DESDE MIAMI: hasta 0,5 kg = USD 8,99 fijo; arriba de 0,5 kg = USD 16/kg MÁS un fijo de USD 5 (1 kg = 21, 2 kg = 37, 5 kg = 85, 10 kg = 165, 20 kg = 325). OJO CON ESTO: ese USD 5 va adentro de la línea de flete y no entra en nuestra tabla de tramos — el kilo no sale 16, sale 21. Y ese fijo NO se cobra en el tramo de hasta 0,5 kg: medio kilo son 8,99 y punto. DESDE ESPAÑA (Madrid): hasta 0,5 kg = 8,99; arriba, USD 18/kg sin ningún fijo (1 kg = 18, 10 kg = 180). ENTREGA: retiro en oficina sin costo (23 puntos, Montevideo e interior); domicilio en Montevideo +USD 5 (gratis si el paquete pesa hasta 0,5 kg); interior por UES +USD 9 sobre el retiro en oficina (+USD 5 si pesa hasta 0,5 kg) — ese número no lo publican, sale solo de la calculadora. LIBROS, CDs, DVDs y vinilos (Ley 15.913): USD 8,99/kg, se fracciona por kilo entero, mínimo 1 kg, sin manejo y no te consumen franquicia. Su propia página imprime '8.9 USD por Kg', pero lo que te cobran es 8,99. CONSOLIDACIÓN: USD 5 hasta 4 paquetes, +USD 3 por cada paquete extra. Desconsolidar: USD 50. Embalaje extra: USD 25. ALMACENAMIENTO: 60 días gratis en Miami; después el paquete queda 'en abandono' y lo descartan o donan. Extensión de 30 días: USD 30, y el paquete queda trabado (solo se puede mandar a Uruguay, no pedir devolución ni reenvío dentro de EEUU). SIN SEGURO incluido: podés contratar uno, pero no publican precio ni cobertura. EL TOTAL DE LA CALCULADORA ES FLETE + ENTREGA: no incluye IVA 22%, ni PARS 60%, ni TSPU. Arriba de la franquicia (USD 800 / 20 kg) necesitás despachante, se cotiza aparte por mail y hay que pagar un adelanto; su propia lista de lo que pagás ahí es almacenaje en terminal + impuestos del 60-70% del valor CIF + honorarios. Dicen no cobrar peso volumétrico (solo peso neto): es afirmación de ellos, no la pudimos verificar. Orígenes: Miami y Madrid nada más. No hay depósito en China ni en Argentina — sus páginas de 'Comprar en China/SHEIN/Temu' son guías de compra, no un origen.

**Google:** `ChIJtfBYgS2An5URNm_u7XGcock` — "PuntoMio" · **4,5 ★** (1392 reseñas) · [ficha](https://www.google.com/maps/place/?q=place_id:ChIJtfBYgS2An5URNm_u7XGcock)

**Reddit:** muestra **usable** · neto **+35** sobre 16 opiniones

Para Reddit, Punto Mío es 'el courier barato': lo recomiendan por precio (hablan de unos USD 20 el kilo, sin la 'tarifa TiendaMIA') y por la casilla de Miami que no te suma el tax de EEUU, lo que evita que una compra de ~USD 194 se pase de la franquicia de USD 200. Casi nadie elogia el servicio en sí: los que se quejan cuentan paquetes que el correo de EEUU da por entregados en Miami y que nunca entran al depósito, y una atención que en esos casos los dejó en visto.

> *"Si es por económico, Punto Mío es de lo más barato que vas a encontrar."* — [r/uruguay, 2024-11-19](https://reddit.com/r/uruguay/comments/1guyf97/que_courier_recomiendan/lxxqm97/) (positivo)

> *"Un tip que les dejo independientemente de qué Courier prefieran, si van a hacer una compra donde el articulo sale 200 usd o casi, usen PuntoMio que es el único que Amazon no te pone taxes, sino ese artículo de casi 200 + tax va a pasar los 200 de la franquicia.."* — [r/uruguay, 2025-07-28](https://reddit.com/r/uruguay/comments/1maxz1d/cuales_son_los_mejores_couriers_hoy_para_ustedes/n5ivdij/) (positivo)

> *"El paquete no entra nunca al depósito de PuntoMío y les notifico del problema, me dicen "nono esperá 1 mes y vemos", les explico que no puedo esperar 1 mes porque si espero un mes va a pasar el tiempo de reclamo en Walmart, me clavan el visto."* — [r/uruguay, 2022-04-08](https://reddit.com/r/uruguay/comments/tys6zr/courier_me_ha_perdido_un_paquete_dice_que_lo/) (negativo)

**Scores propuestos:** cumplimiento **60** · atención **50** · transparencia **32** · cobertura **68**

- *cumplimiento:* Hay evidencia de sobra para puntuar: 1.392 reseñas de Google (4,5) más una muestra de Reddit usable con 16 opiniones reales. El agregado es genuinamente bueno y hay usuarios de 4 y 13 años sin un problema. Pero el modo de falla se repite de forma independiente en Google, en latinoplaces y en Reddit (2022, 2023, 2026): paquetes que USPS marca como entregados en el depósito de Miami y que ellos dicen no haber recibido, sin hacerse cargo; consolidaciones mal hechas; y tiempos reales de 16, 20 y 23 días contra los 3-7 días hábiles que publican. Cumple casi siempre, pero cuando no cumple no responde. 60.
- *atencion:* Bimodal y bien documentado. WhatsApp es elogiado, rápido y resolutivo para lo rutinario, y hay reseñas recientes (2026) muy positivas sobre la atención. Ante un problema real, la evidencia se da vuelta entera: 'nono esperá 1 mes y vemos' y visto en Reddit; teléfono ocupado, mails sin responder y 'te tratan como un número' en Google/latinoplaces. Se puntúa porque hay base (Google 1.392 + Reddit usable), pero el promedio castiga que la atención se caiga justo el día que importa. 50.
- *transparencia:* Lo más flojo que tienen, y no es opinión. El precio del flete —el único número que el comprador necesita— NO está publicado en ninguna parte del sitio: lo tuvimos que reconstruir barriendo su propia API de calculadora, que ni siquiera está documentada. La calculadora no incluye ningún impuesto, así que el 'total' que te muestra no es lo que vas a pagar. El recargo al interior no se publica. La tarifa de libros está impresa mal en su propia página (8.9 vs los 8,99 que cobran). Y hay clientes que pagaron más en el mostrador que lo que decía la plataforma, con la explicación 'en la hoja no calculan las consolidaciones'. 32.
- *cobertura:* Determinístico. Suma: entrega al interior sí (por UES), 60 días de almacenamiento gratis (de los mejores del rubro), tarifa de libros/CD/DVD por Ley 15.913, 23 puntos de retiro, sin peso volumétrico (según ellos) y la casilla de Miami sin tax de EEUU. Resta fuerte: NO incluye seguro y encima excluye expresamente la responsabilidad por pérdida o daño en tránsito; y solo cubre dos orígenes (EEUU y España) — no hay China ni Argentina. 68.

**Banderas rojas:**

- No publican la tarifa de flete. El precio por kilo no aparece en texto en ninguna parte de puntomio.uy: la página 'Tarifas' solo lista cargos accesorios. Los USD 16/kg + USD 5 desde Miami (y USD 18/kg desde España) los sacamos barriendo su propia API de calculadora, que no está documentada y puede cambiar sin aviso.
- La calculadora no incluye impuestos. El 'total' que te muestra es flete + entrega, nada más: no devuelve IVA 22%, ni PARS 60%, ni TSPU, ni siquiera con un valor declarado de USD 800 de una tienda que no es de EEUU. Si te guiás por ese número, en aduana te sorprenden.
- Sin seguro, y con la responsabilidad excluida por contrato. Cláusula 7: 'PuntoMio no se responsabiliza por las pérdidas o daños (totales o parciales) que ocurran al transportar las encomiendas postales.' Podés contratar un seguro, pero no publican ni precio ni cobertura. Hay más de un cliente reportando 'vinieron todas las cajas rotas y no se hacen responsables'.
- Reportes repetidos e independientes de paquetes que USPS confirma como entregados en su depósito de Miami y que ellos dicen no haber recibido, negándose a hacerse cargo. Aparece en Google, en latinoplaces y en Reddit (2022 y 2023). También hay relatos de paquetes que desaparecen adentro del propio depósito o que mandaron al país equivocado y no trajeron de vuelta.
- Los 3-7 días hábiles que publican no se cumplen seguido. Casos concretos: 16 días, 20 días, 23 días, y paquetes 2-3 semanas trancados en Miami mientras el panel decía 'enviado'. Salen solo dos vuelos por semana (martes y viernes) y los términos se desligan de cualquier demora del transportista.
- A los 60 días tu paquete queda 'automáticamente en abandono procediéndose al descarte o destrucción del mismo'. La extensión de 30 días cuesta USD 30 y además traba el paquete: 'Los paquetes con extensión solo podrán ser enviados a Uruguay. No se podrá solicitar su devolución ni su envío dentro de los Estados Unidos.'
- Si la Aduana te retiene el envío y vos lo rechazás, igual pagás el flete (cláusula 7 de los términos).
- La consolidación confunde y tiene plata atrás: hay clientes que pagaron más en el mostrador que lo que cotizaba la plataforma, y les dijeron 'en la hoja no calculan las consolidaciones'. Desconsolidar sale USD 50.
- El recargo al interior no está publicado: el sitio solo dice 'tienen un costo adicional y se envían a domicilio vía UES'. Los USD 9 sobre el retiro en oficina salen únicamente de la calculadora.
- Su propia página de tarifas imprime la tarifa de libros como '8.9 USD por Kg' mientras la calculadora y la facturación usan 8,99. Es poco, pero es su tarifa publicada contradiciendo lo que cobran.
- El '7% tax free' es una afirmación de marketing de ellos ('¡Somos el primer courier con Tax Free!'): nunca explican el mecanismo, y no existe un enclave libre de impuestos en Miami-Dade (6% estatal + 1% de condado = justo ese 7%). Los usuarios sí confirman de forma repetida que Amazon no les cobra el tax, así que el beneficio parece real — pero tomalo como anécdota corroborada, no como un régimen documentado.
- Circula un descuento por pagar en efectivo, pero el 10% que se suele citar no está publicado en ningún lado y la reseña que lo menciona solo dice 'te hacen descuento', sin porcentaje. Y avisa: 'trata de llevar dólares porque te lo cobran carísimo por más que digan que es la cotización bancaria.'
- Arriba de la franquicia (USD 800 / 20 kg) el despacho es a cotizar y hay que pagar un adelanto. No publican ninguna cifra. Su propia lista de lo que pagás ahí: almacenaje en terminal de carga + impuestos del 60% al 70% del valor CIF + honorarios del despachante.

**A favor:** 
- Es, con evidencia, el más barato: USD 16/kg desde Miami (1 kg retirando en oficina = USD 21; 5 kg = USD 85). Reddit y Google coinciden en que ese es el motivo por el que la gente se queda.
- 60 días de almacenamiento gratis en Miami, bastante más que la mayoría del rubro.
- Tarifa de libros, CDs, DVDs y vinilos (Ley 15.913) a USD 8,99/kg: barata, sin cargo de manejo y sin consumirte franquicia.
- La base de reseñas más grande de cualquier courier uruguayo: 4,5 con 1.392 reseñas en Google. El agregado es genuinamente bueno, no son cuatro reseñas infladas.
- La casilla de Miami no te suma el 7% de tax de EEUU: sirve justo cuando la compra ronda los USD 200 y el impuesto te haría pasar la franquicia. Confirmado una y otra vez por usuarios.
- Retiro en oficina sin costo en 23 puntos, Montevideo e interior. Consolidación de hasta 4 paquetes por USD 5.
- Dicen no cobrar peso volumétrico: pagás solo peso neto. Es afirmación de ellos, pero la calculadora efectivamente no pide medidas.

**En contra:** 
- La tarifa de flete no está publicada: para saber cuánto vas a pagar dependés de una calculadora que no muestra impuestos y de una API que ellos no documentan.
- Sin seguro incluido y con la responsabilidad por pérdida o daño en tránsito excluida por contrato.
- Lento y con solo dos vuelos por semana. Los tiempos reales se van bien arriba de los 3-7 días hábiles que publican.
- La atención se cae justo cuando hay un problema. Para lo rutinario, WhatsApp anda bien; ante un paquete perdido hay 'esperá un mes' y visto.
- El modo de falla más citado: paquetes entregados en el depósito de Miami según el correo de EEUU que ellos dicen no haber recibido, y no se hacen cargo.
- Solo Miami y Madrid. No hay depósito en China ni en Argentina.
- Sobre la franquicia (USD 800 / 20 kg) el despacho es a cotizar, con adelanto, sin ningún precio publicado.
- Usuarios de años dicen que la ventaja de precio se erosionó: 'Casi 90 dólares para traer un paquete de 6 kilos que me cuesta 75.'

**Para quién:** El que compra en Amazon o tiendas de EEUU, prioriza precio sobre velocidad, retira en oficina y puede bancarse que el paquete demore semanas. Rinde especialmente si tu compra ronda los USD 200 (la casilla sin tax te evita pasarte de la franquicia) o si traés libros, CDs o vinilos. No lo elijas si el envío es urgente, caro o irremplazable: si algo sale mal, no hay seguro ni respaldo.

**Veredicto:** Punto Mío es la opción barata del mercado y no finge ser otra cosa: sus propios defensores en Reddit lo comparan con Gripper diciendo que Gripper es "la opción premium". A USD 16 el kilo desde Miami (más un fijo de USD 5 arriba de medio kilo), con 60 días de almacenaje gratis, sin peso volumétrico, con una tarifa de libros de USD 8,99/kg y con la casilla que te evita el 7% de tax de EEUU, la ecuación de plata cierra: es la razón por la que tiene 1.392 reseñas y 4,5 estrellas, la base más grande del rubro. El problema es todo lo demás. No publican la tarifa de flete en ningún lado del sitio: tuvimos que reconstruirla barriendo su propia API de calculadora, y esa calculadora te muestra un total que NO incluye IVA ni PARS ni TSPU, así que el número que ves no es el que pagás. No hay seguro y los términos excluyen expresamente la responsabilidad por pérdida o daño en tránsito. Y el modo de falla se repite en Google, en latinoplaces y en Reddit desde 2022 con una consistencia incómoda: el correo de EEUU marca el paquete como entregado en el depósito de Miami, Punto Mío dice que nunca llegó, y ahí se termina la conversación. Los 3-7 días hábiles que prometen se convierten con frecuencia en 16, 20 o 23. El trade-off es exactamente ese: pagás menos que con cualquier otro y a cambio comprás lentitud y cero red de seguridad. Si el envío te importa poco y el precio te importa mucho, es la elección racional. Si el paquete es caro, urgente o irremplazable, este ahorro no vale lo que arriesgás.

**Gaps (resolver a mano):**

- El fijo de USD 5 que se suma arriba de 0,5 kg va ADENTRO de la línea de flete y nuestro modelo de tramos no lo puede expresar: la tabla muestra USD 16/kg, pero 1 kg sale USD 21. Dejamos handlingUsd en null a propósito, porque ponerlo en 5 le sumaría USD 5 al tramo de hasta 0,5 kg (que son 8,99 TOTAL, sin fijo) e inflaría el precio del paquete chico un 56%. Alguien tiene que decidir a mano cómo se muestra esto en la ficha.
- tspuPct=0 no está confirmado. El 10% de TSPU/URSEC no se menciona en ninguna parte del sitio y la API nunca devuelve una línea de tspu (existe solo como un campo muerto en el frontend). Verificamos que no aparece ni con valor declarado de USD 800 desde origen no-EEUU, así que emitimos 0 — pero no pudimos establecer si se cobra en aduana por fuera de su cotización. No presentar ese 0 como confirmado.
- clearanceUsd = null: el despacho sobre la franquicia (USD 800 / 20 kg) es solo a cotizar (cotizaciones@puntomio.com.uy, con adelanto). No publican ninguna cifra y no la pudimos obtener.
- Precio y cobertura del seguro: dicen que 'el cliente podrá contratar un seguro' pero no publican tarifa, ni tope de cobertura, ni compañía.
- handlingPlusIva = null: no dicen en ningún lado si los cargos se cotizan con IVA incluido o +22%.
- originsPerKg.us = 16 es la tarifa marginal por kilo: NO incluye el fijo de USD 5. originsPerKg.eu = 18 sí es el precio final por kilo desde España (sin fijo). Los dos orígenes tienen estructura distinta y el campo único no lo refleja.
- La tarifa entera sale de una API sin documentar ni versionar (api.puntomio.uy/calculator), que puede cambiar sin aviso. Hay que re-verificarla antes de cada publicación, no confiar en el snapshot.
- El interior a +USD 9 vale solo arriba de 0,5 kg; hasta 0,5 kg el recargo es +USD 5. El campo interiorUsd guarda 9.
- Las reseñas de latinoplaces son un espejo parcial de Google que borra las fechas: los incidentes son concretos y verbatim, pero no los podemos datar. Su agregado propio (3,4/62) NO sirve; el real es 4,5/1.392.
- La afirmación 'no cobramos peso volumétrico' y el cartel 'Tarifas congeladas desde 01/03/2023' son auto-declaraciones que no pudimos verificar de forma independiente.
- El descuento por pago en efectivo: existe (lo dice una reseña) pero el 10% que circula no tiene fuente. Habría que confirmarlo en mostrador.

**Fuentes:** [Punto Mío — Tarifas y cargos accesorios](https://www.puntomio.uy/herramientas#rates) · [Punto Mío — Calculadora (única fuente del flete)](https://www.puntomio.uy/calculadora) · [API pública de la calculadora (tarifa verificada 12/07/2026)](https://api.puntomio.uy/calculator) · [Punto Mío — Preguntas frecuentes y términos](https://www.puntomio.uy/ayuda) · [Punto Mío — Servicios](https://www.puntomio.uy/servicios) · [Google Maps — PuntoMio (4,5 / 1.392)](https://www.google.com/maps/place/?q=place_id:ChIJtfBYgS2An5URNm_u7XGcock) · [Reseñas espejo (latinoplaces) — incidentes verbatim](https://uy.latinoplaces.com/montevideo/puntomio-635409) · [Reddit r/uruguay — '¿Qué courier recomiendan?'](https://reddit.com/r/uruguay/comments/1guyf97/que_courier_recomiendan/lxxqm97/) · [Reddit r/uruguay — paquete perdido, atención en visto (2022)](https://reddit.com/r/uruguay/comments/tys6zr/courier_me_ha_perdido_un_paquete_dice_que_lo/)

---

### USX Cargo `usxcargo` — Courier

> El más barato por kilo, y lo que pagás es lo que dice la web.

Courier con casillero en Miami y Madrid, tarifa plana por kilo, retiro en mostrador en Montevideo (Nicolás Piaggio 1247).

**Tarifa** (verificada 2026-07-12, [fuente](https://usxcargo.com/)):

```json
{
 "quoteOnly": false,
 "tiers": [
  {
   "maxKg": null,
   "perKg": 17.5
  }
 ],
 "minChargeUsd": null,
 "handlingUsd": 0,
 "handlingPlusIva": null,
 "tspuPct": 0,
 "clearanceUsd": null,
 "interiorUsd": 7.5,
 "booksPerKg": 10.5,
 "insuranceIncluded": null,
 "freeStorageDays": null,
 "originsPerKg": {
  "us": 17.5,
  "eu": 21.5,
  "cn": null,
  "ar": null
 },
 "transit": "Miami: 3–7 días (2 vuelos por semana). Madrid: 9–15 días (1 vuelo por semana)."
}
```

**Letra chica:** NO HAY ESCALONES DE PESO. USX publica una única tarifa plana por kilo, abierta: USD 17,50/kg desde EE.UU. (Miami) y USD 21,50/kg desde Europa (Madrid). Tarifa reducida para libros, discos y películas: USD 10,50/kg desde EE.UU. y USD 14,50/kg desde Europa (el campo de libros guarda el de EE.UU.; el europeo es 14,50).

CÓMO FACTURAN: la propia calculadora del sitio (usxcargo.com/javascripts.js) hace costo = redondeo(peso + 0,041 a un decimal) × tarifa. O sea: fraccionan cada 100 g y no suman NI un fee fijo NI un porcentaje en ningún lado del código. Libros/media tienen peso mínimo facturable de 200 g. Por eso handling = 0 y TSPU = 0: la tarifa se declara todo incluido ("Incluye costos de manejo, consolidación y almacenaje. SIN SORPRESAS!") y los montos que usuarios reportaron pagar en mtb.uy dan exactamente proporcionales (2,4 kg = USD 42,00; 0,4 kg = USD 7,00). Un fee fijo o un 10% arriba romperían esa proporción, y no la rompen. Dato: el USD 17,50/kg no cambió desde al menos fines de 2020.

ENVÍO: por defecto retirás vos en el mostrador de Montevideo, gratis. A domicilio/agencia en Montevideo o al interior: "tarifa aproximada USD 7,50 por los primeros 5 kg" — la palabra "aproximada" es de ellos, y arriba de 5 kg no publican nada. El tramo local lo terciarizan (De Punta Pro-Cargo, UES).

PESO VOLUMÉTRICO: acá está la letra chica que rompe el "SIN SORPRESAS". El sitio avisa que "un paquete voluminoso y ligero puede generar un cargo de la aerolínea adicional a nuestra tarifa". No publican divisor ni umbral, y hay un cliente que se quejó en Google (~abr 2026) justamente por un "cargo de exceso volumétrico".

ALMACENAJE: dicen que está incluido, así que no publican días gratis. Lo único escrito es para el paquete que NO viaja: "incurre gastos de manejo y almacenamiento" (monto nunca especificado) y a los 90 días se considera abandonado, o sea, lo perdés.

SEGURO: no ofrecen ninguno. Lo único que linkean es la Resolución URSEC 185/016 (indemnizaciones postales), que es el piso legal, no un seguro: no hay cobertura ni prima opcional.

ORÍGENES: solo Miami y Madrid. No hay China ni Argentina.

IVA: avisaron por mail a sus clientes que se registraron ante la DNA como empresa extranjera exonerada de IVA (reportado en r/uruguay).

**Google:** `ChIJxUrEa-mBn5URcCFZHhtk0vg` — "USX Cargo" · **4,7 ★** (950 reseñas) · [ficha](https://www.google.com/maps/place/?q=place_id:ChIJxUrEa-mBn5URcCFZHhtk0vg)

**Reddit:** muestra **usable** · neto **+58** sobre 18 opiniones

Es el courier mejor considerado de r/uruguay: lo elogian por precio (el más barato por kilo, fraccionando cada 100 g), por cumplir sin dramas y por responder rápido, y el elogio es consistente desde 2021 hasta julio de 2026. La contracara, chica pero real: cuando Aduana retiene un paquete, hay quien reporta que USX se lava las manos ("andá a la aduana, suerte"). Leelo con una advertencia puesta: el sub es abiertamente pro-USX, y en una planilla comparativa de abril 2026 TiendaMia le gana en al menos un escenario, así que "siempre el más barato" no es exacto.

> *"USX Cargó toda la vida, el más barato, atención excelente   ."* — [r/uruguay, 2026-07-02](https://reddit.com/r/uruguay/comments/1ulkdbw/te_cuento_como_fue_comprar_en_china_y_usar_una_de/ov7jfqp/) (positivo)

> *"UPDATE: Los de USX me pasaron un correo diciendo básicamente, anda a la aduana suerte empila  ."* — [r/uruguay, 2026-05-25](https://reddit.com/r/uruguay/comments/1tnct20/primer_paquete_dentro_de_franquicia_nueva_retenido/) (negativo)

> *"De aduanas no lo dudo, de usx puedo decir que me ha brindado un excelente servicio las veces que traté con ellos, responden rapido y saben resolver."* — [r/uruguay, 2026-05-25](https://reddit.com/r/uruguay/comments/1tnct20/primer_paquete_dentro_de_franquicia_nueva_retenido/onvezun/) (positivo)

**Scores propuestos:** cumplimiento **82** · atención **74** · transparencia **68** · cobertura **64**

- *cumplimiento:* Evidencia real de las dos puntas: Google 4,7 sobre 950 reseñas (histograma verificado: 805 de 5★ y 31 de 1★ = 3,3%) y muestra usable de Reddit (18 opiniones, net 58), sin un solo reporte de paquete perdido ni de plazo incumplido por culpa de ellos. Los tiempos se cumplen o se superan. No llega más alto por dos cosas documentadas: el tramo local terciarizado que reportó "entregado" un paquete que no había entregado (y USX no lo persiguió), y los recargos volumétricos que aparecen después.
- *atencion:* Predomina lo bueno y es consistente: "responden rápido y saben resolver", paquetes trabados en URSEC liberados por WhatsApp en dos minutos, respuestas en minutos u horas. Pero el episodio más duro de todo el corpus es de atención: con un paquete retenido bajo la franquicia nueva (mayo 2026) la respuesta por mail fue que fuera él mismo a la Aduana, y otro usuario del mismo hilo dice que tuvo que sacarles la información "un poco a prepo". Sumale que no hay teléfono: solo mensajes, lunes a viernes de 9 a 20.
- *transparencia:* La tarifa es de las más honestas del mercado: precio publicado = precio pagado, verificable dividiendo lo que la gente realmente pagó. Eso vale mucho. Lo que la baja: el "SIN SORPRESAS!" no es literal (el recargo volumétrico va arriba y no explican cómo se calcula), el bloque de "4,7 / 938 reseñas" y el carrusel de testimonios cinco estrellas de su web están HARDCODEADOS en el HTML —marketing curado a mano, no un feed real—, los gastos de almacenaje del paquete varado se afirman pero nunca se cuantifican, la tarifa al interior arriba de 5 kg no existe en ningún lado, y un fee de USD 10 por hacerte el trámite de URSEC/VUCE apareció reportado por usuarios pero no está publicado.
- *cobertura:* Determinístico: 2 de 4 orígenes (Miami y Madrid; no hay China ni Argentina, lo que deja afuera a todo el que compra en AliExpress o en Buenos Aires), sí entrega al interior (USD 7,50 los primeros 5 kg, "aproximada"), sí tarifa de libros y de las más baratas (USD 10,50/kg), sí registrada ante la DNA como exonerada de IVA, almacenaje declarado incluido pero sin días publicados, y CERO seguro: lo único es el régimen legal de indemnización postal de URSEC.

**Banderas rojas:**

- El "SIN SORPRESAS!" no es literal. La letra chica del propio sitio se reserva pasarte un recargo de la aerolínea por peso volumétrico ARRIBA de la tarifa plana ("un paquete voluminoso y ligero puede generar un cargo de la aerolínea adicional a nuestra tarifa"), y en abril de 2026 un cliente se quejó en Google exactamente por un "cargo de exceso volumétrico". No publican divisor, ni umbral, ni cómo lo calculan. Si traés algo liviano y voluminoso, el precio anunciado se te rompe.
- El envío a domicilio y al interior está terciarizado y no lo supervisan. El subcontratista (De Punta Pro-Cargo) le dijo a un cliente que el paquete estaba entregado cuando no lo estaba, y USX lo dejó corriendo atrás solo: "me hubiese gustado que ellos hubieran hecho el seguimiento hasta su entrega y no que yo tuviera que interceder". La tarifa de USD 7,50 la llaman "aproximada" ellos mismos, y arriba de 5 kg no publican nada.
- Cuando Aduana retiene, te arreglás solo. Con la franquicia nueva (mayo 2026, IVA pagado y factura presentada) la respuesta por mail fue que fuera él mismo a la Aduana. La retención es del régimen, pero la falta de acompañamiento es del courier.
- No hay seguro. Ninguno. Lo único a lo que apuntan es la Resolución URSEC 185/016, el régimen legal de indemnización postal, que topea muy por debajo del valor de cualquier electrónica que valga la pena traer.
- El 4,7 y las "938 reseñas" que muestran en usxcargo.com están escritos a mano dentro del HTML, igual que el carrusel de testimonios todos de cinco estrellas. No es un widget en vivo: es publicidad. El número real de Google hoy es 950. No le creas al rating de su propia web (el 4,7 sí es real, pero lo verificamos aparte en Google).
- Los gastos de almacenamiento del paquete que no viaja se afirman pero nunca se cuantifican, y a los 90 días el paquete "se considera abandonado" — o sea, lo perdés. No hay tarifario de eso en ningún lado.
- Se reportó (nov 2021) un fee de USD 10 para que ellos te hagan el trámite de URSEC/VUCE, cuando hacerlo vos costaba ~$U 200. No está publicado en la web actual y no pudimos confirmar el precio de 2026.
- Solo mensajes: WhatsApp, ticket y mail, lunes a viernes de 9 a 20. No hay teléfono.
- La evidencia negativa pública es finita: 4,7 con 950 reseñas y pocos reportes críticos alcanzables significa que los modos de falla están poco documentados, no necesariamente que no existan. Y r/uruguay es abiertamente fan de USX, así que el consenso positivo viene con sesgo.

**A favor:** 
- El precio que pagás es el precio publicado. Verificable: los montos que la gente reportó haber pagado en mtb.uy dividen exacto por USD 17,50/kg (2,4 kg = USD 42,00; 0,4 kg = USD 7,00). Sin fee fijo, sin porcentaje escondido. En este mercado eso es rarísimo.
- Es el más barato por kilo entre los casilleros grandes, y fracciona cada 100 g, así que el paquete chico no te lo cobran como si pesara un kilo.
- Consolidan bien: sacan las subcajas y meten todo en una sola, así que no pagás flete por cartón. Un usuario pagó USD 13 por lo que estimaba en USD 28–30 en EMC o Gripper.
- Tarifa de libros, discos y películas de USD 10,50/kg desde EE.UU. (14,50 desde Europa) — de las mejores para traer libros.
- Le sacan foto a cada paquete que entra. A un usuario eso le permitió detectar que el vendedor le había mandado llaves Allen en vez del torquímetro que compró, y devolverlo estando todavía en EE.UU., sin pagar flete por el error ajeno.
- Atención rápida cuando el problema es de ellos: paquetes trabados en URSEC liberados por WhatsApp en un par de minutos.
- Se registraron ante la DNA como empresa extranjera exonerada de IVA y avisaron por mail el cambio de régimen a sus clientes.

**En contra:** 
- Solo Miami y Madrid. Si comprás en China (AliExpress, Temu) o en Argentina, no te sirve. Punto.
- El recargo volumétrico de la aerolínea va arriba de la tarifa "todo incluido" y no publican cómo se calcula. Con cosas livianas y grandes te podés llevar una sorpresa después de haber hecho la cuenta.
- El envío al interior está terciarizado, encarece ("lo único que encareció un poco fue el envío dentro de Uruguay por UES") y ya falló al menos una vez con un "entregado" falso que USX no siguió.
- Cero seguro. Si se pierde o se rompe, tu único recurso es el régimen de indemnización postal de URSEC.
- Ante una retención de Aduana, el trámite lo terminás haciendo vos.
- No hay teléfono, y la atención es de lunes a viernes de 9 a 20.
- El rating y los testimonios de su propia web son marketing hardcodeado, no un feed real. Mala señal de honestidad en una empresa que por lo demás es honesta con los números.

**Para quién:** El que compra en EE.UU. (o España) cosas compactas y pesadas para su valor —electrónica, repuestos, libros—, mira el precio antes que cualquier otra cosa, y no tiene drama en ir a retirar al mostrador de Nicolás Piaggio en Montevideo. Si tu paquete es liviano y voluminoso, si comprás en China o Argentina, o si querés seguro y que alguien te acompañe cuando Aduana te retiene algo, buscá otro.

**Veredicto:** USX es, con la evidencia en la mano, el courier más barato y el más honesto con su tarifa: publica USD 17,50/kg desde EE.UU. y USD 21,50/kg desde Europa, fracciona cada 100 g, y su propia calculadora no suma ni un peso fijo ni un porcentaje — lo verificamos leyendo el código del sitio y cruzándolo con lo que usuarios reales dijeron haber pagado, que divide exacto. Google le da 4,7 con 950 reseñas y r/uruguay lo banca desde 2021 hasta hoy. Pero el tradeoff es real y hay que decirlo sin vueltas: es barato porque es un servicio de mostrador, no un servicio de mano. No hay seguro, no hay teléfono, el envío al interior lo hace otro y ya reportó una entrega falsa que USX no persiguió, el almacenaje del paquete varado nunca lo cuantifican (y a los 90 días lo perdés), y el famoso "SIN SORPRESAS!" tiene una excepción escrita por ellos mismos: el recargo volumétrico de la aerolínea, que se cobra arriba y no explican cómo se calcula. Cuando Aduana retiene, la respuesta documentada fue "andá vos". Y una contradicción que molesta en una empresa que por lo demás no miente con los números: el 4,7 y las reseñas cinco estrellas que muestra su propia web están escritos a mano en el HTML. Si tu compra entra en el molde —densa, desde EE.UU. o España, la retirás vos—, es difícil que alguien te la traiga más barato. Si te salís del molde, se nota mucho lo que no te están cobrando.

**Gaps (resolver a mano):**

- insuranceIncluded = null: no ofrecen ningún seguro ni lo mencionan. Queda sin dato en vez de asumir 'false' porque no hay declaración explícita; lo único referenciado es el régimen legal de URSEC.
- freeStorageDays = null: dicen que el almacenaje está 'incluido' en la tarifa, pero nunca publican cuántos días. No inventamos un número.
- clearanceUsd = null: no publican ningún fee de despacho para envíos dentro de franquicia. El USD 10 por el trámite de URSEC/VUCE viene de un post de foro de nov 2021, no del sitio, y no está verificado para 2026 — por eso NO se cargó como clearanceUsd.
- minChargeUsd = null: no hay cargo mínimo en dólares publicado. Lo que sí existe es un peso mínimo facturable: 100 g en tarifa normal y 200 g en libros/media.
- originsPerKg.cn y .ar = null: NO tienen servicio desde China ni desde Argentina. El null acá significa 'no operan ese origen', no 'no sabemos el precio'.
- La tarifa de libros desde EUROPA (USD 14,50/kg) no entra en el esquema — el campo booksPerKg guarda solo la de EE.UU. (10,50). Si la ficha muestra libros, aclarar que el 10,50 es desde Miami.
- No sabemos cómo se calcula el recargo por peso volumétrico: no publican divisor, umbral, ni si lo pasan al costo. Solo consta que existe y que a un cliente le pegó.
- No hay tarifa publicada de envío al interior por encima de 5 kg, ni sabemos si el USD 7,50 varía según destino o según subcontratista (UES vs De Punta Pro-Cargo). El propio sitio dice 'aproximada'.
- Monto de los 'gastos de manejo y almacenamiento' del paquete que no viaja: se afirman, no se cuantifican en ningún lado.
- Precio actual (2026) del servicio de gestión URSEC/VUCE. El único dato es USD 10 de nov 2021, de un foro.
- Tratamiento del TSPU/URSEC (10%): lo reportamos como 0 porque el cliente NUNCA ve una línea aparte y los montos pagados dan exactos, pero no pudimos confirmar si está absorbido dentro del USD 17,50 o si directamente no se aplica.
- No publican RUT, número de licencia ni razón social. Relevante para saber si son el courier registrado de verdad frente al registro de vendedores que arranca el 2026-10-01.
- El testimonio de 'Nacho, 20/9/2025' que el researcher citó como reseña de Google NO existe en Google: sale del carrusel hardcodeado de su propia web. Descartado como evidencia independiente.

**Fuentes:** [USX Cargo — tarifas y condiciones (sitio oficial)](https://usxcargo.com/) · [USX Cargo — código de su propia calculadora de tarifas](https://usxcargo.com/javascripts.js?10.0) · [Google Maps — ficha USX Cargo (4,7 · 950 reseñas, place_id verificado)](https://www.google.com/maps/place/?q=place_id:ChIJxUrEa-mBn5URcCFZHhtk0vg) · [mtb.uy — "Experiencia con USX Cargo Uruguay" (montos reales pagados, 2020–2021)](https://mtb.uy/temas/experiencia-con-usx-cargo-uruguay.15299/) · [mtb.uy — mismo hilo, página 2 (fee de USD 10 por trámite URSEC/VUCE)](https://mtb.uy/temas/experiencia-con-usx-cargo-uruguay.15299/page-2) · [r/uruguay — paquete retenido dentro de la franquicia nueva (mayo 2026)](https://reddit.com/r/uruguay/comments/1tnct20/primer_paquete_dentro_de_franquicia_nueva_retenido/) · [r/uruguay — comprar en China y usar un courier (julio 2026)](https://reddit.com/r/uruguay/comments/1ulkdbw/te_cuento_como_fue_comprar_en_china_y_usar_una_de/ov7jfqp/) · [URSEC — Resolución 185/016, reclamaciones e indemnizaciones postales](https://www.gub.uy/unidad-reguladora-servicios-comunicaciones/institucional/normativa/resolucion-n-185016-reglamentacion-reclamaciones-indemnizaciones-postales)

---

### Urubox `urubox` — Courier

> Barato y con casilla en España, pero te cobra 95 g que no publica.

Courier uruguayo con casilleros en Miami, Madrid e Inglaterra; dos vuelos semanales desde Miami.

**Tarifa** (verificada 2026-07-12, [fuente](https://backend.uruboxuy.com/rest/Negocio/CalcularPrecio)):

```json
{
 "quoteOnly": false,
 "tiers": [
  {
   "maxKg": 0.104,
   "flat": 10.9,
   "perKg": null
  },
  {
   "maxKg": 0.404,
   "flat": 15.9,
   "perKg": null
  },
  {
   "maxKg": 0.604,
   "flat": 18.9,
   "perKg": null
  },
  {
   "maxKg": 0.904,
   "flat": 20.9,
   "perKg": null
  },
  {
   "maxKg": 0.999,
   "flat": 19.9,
   "perKg": null
  },
  {
   "maxKg": 4.99,
   "flat": null,
   "perKg": 19.9
  },
  {
   "maxKg": 9.99,
   "flat": null,
   "perKg": 17.9
  },
  {
   "maxKg": 19.99,
   "flat": null,
   "perKg": 16.5
  },
  {
   "maxKg": 40,
   "flat": null,
   "perKg": 15.9
  }
 ],
 "minChargeUsd": 10.9,
 "handlingUsd": 5,
 "handlingPlusIva": false,
 "tspuPct": 10,
 "clearanceUsd": null,
 "interiorUsd": 5,
 "booksPerKg": 11.9,
 "insuranceIncluded": false,
 "freeStorageDays": 40,
 "originsPerKg": {
  "us": 19.9,
  "eu": 23.5,
  "cn": null,
  "ar": null
 },
 "transit": "No prometen plazo. Dos vuelos semanales desde Miami; los T&C se desligan expresamente de las demoras. En la vía España/Inglaterra hay reportes de meses."
}
```

**Letra chica:** OJO CON LOS TRAMOS CHICOS: los publicados en tarifas-envios.html NO son los que cobra su propia calculadora. El motor de precios de Urubox le suma 95 g a tu peso antes de elegir el tramo, así que la tabla real es: hasta 104 g u$s 10,90 · 105–404 g u$s 15,90 · 405–604 g u$s 18,90 · 605–904 g u$s 20,90 · desde 905 g te pasa a la tarifa por kilo con mínimo de 1 kg (u$s 19,90). Un paquete de 150 g figura a 10,90 y te lo facturan 15,90: 46% más. Lo mismo pasa en 405–499 g y en 605–699 g. Los tramos de arriba sí los verificamos contra el motor: 4,99 kg → 99,30 y 5 kg → 89,50, o sea peso × tarifa, sin sorpresas. Arriba de 40 kg no hay tarifa: 'Cotizamos carga'. AL FLETE SUMALE SIEMPRE: u$s 5 de handling por paquete (sin IVA, confirmado en el motor) + 10% de TSPU/URSEC sobre el flete. Un 'u$s 19,90 el kilo' en la práctica es ~u$s 21,89 + 5. Entrega en Montevideo u$s 5 + IVA; al interior u$s 5 + IVA pero SOLO HASTA AGENCIA, no a tu puerta. Libros, CDs, vinilos y DVD: u$s 11,90/kg (esto está firme; el rumor de 9,90 no lo pudimos reproducir en ningún lado). ORÍGENES: Miami, Madrid e Inglaterra. No hay casilla en China ni en Argentina. España: 23,50/kg (1–10 kg), 20,90 (10–20), 18,90 (20–40). Inglaterra: 27,90/kg (1–10 kg), 22,90 (10–20), 20,90 (20–40). VOLUMEN: cobran exceso de volumen y ellos mismos se contradicen: los T&C dicen u$s 4 por kg y la página de Inglaterra dice u$s 10 por kg. La página de EE.UU. ni lo menciona. Si traés algo voluminoso y liviano, preguntá antes. DEPÓSITO: 40 días gratis según tarifas-almacenamiento.html, pero las preguntas frecuentes 1 y 8 dicen 25 días. Presupuestá con los 25. Después: u$s 1,00 / 1,80 / 2,50 por kg por día según el tramo. A los 180 días declaran el paquete abandonado y lo destruyen, sin aceptar reclamos. CONSOLIDACIÓN: gratis desde EE.UU.; desde España solo 3 paquetes gratis y u$s 5 por cada uno extra. Además se reservan el derecho de no consolidar y de cobrarte los envíos que resulten. OTRAS TARIFAS: desconsolidar u$s 15 (hasta 6 ítems) o u$s 30 (7–15); verificación u$s 10 / 30 / 3 por ítem; retiro en Miami u$s 10; reenvío en EE.UU. u$s 15 + costo del courier; retorno al vendedor u$s 10 o 15; trámite VUCE (electrónica con bluetooth/wifi) u$s 12. SEGURO: NO viene incluido. Es un producto aparte que tenés que contratar y del que no publican ni precio ni cobertura ni cómo se reclama. Los impuestos (IVA, franquicia de u$s 800 al año, máximo 3 envíos) son del Estado, no de Urubox.

**Google:** `ChIJAVAZPkyAn5URPRTZaF5t08c` — "Urubox" · **4 ★** (576 reseñas) · [ficha](https://www.google.com/maps/place/?q=place_id:ChIJAVAZPkyAn5URPRTZaF5t08c)

**Reddit:** muestra **usable** · neto **+40** sobre 14 opiniones

Urubox aparece como una opción confiable pero sin brillo: varios usuarios dicen "0 drama" o que les funcionó "ok", y lo destacan por no cobrar tarifa de handling (solo el peso), pero nadie lo describe como el mejor servicio. Las quejas son puntuales y viejas (demoras y atención floja en 2020, una caja abierta en 2022 con atribución dudosa), más algún reclamo por costos extra e información tributaria confusa.

> *"Yo uso urubox y capaz hay mejores, pero seguro no te cobra tarifa por usarlo, ni handling, solo el peso de los productos."* — [r/uruguay, 2026-04-03](https://reddit.com/r/uruguay/comments/1sbc3gn/tiendamia_me_esta_cobrando_cualquier_cosa/oe26xwp/) (positivo)

> *"He usado Urubox y en general me ha funcionado ok."* — [r/uruguay, 2026-05-26](https://reddit.com/r/uruguay/comments/1tnbwz3/que_hace_tiendamia/onykjdn/) (positivo)

> *"Siempre usé Urubox pero empezaron a atender mas o menos y demorar las cosas asi que deje de usarlo, y despues mi paso por la pobreza me impidió seguir comprando cosas afuera."* — [r/uruguay, 2020-10-31](https://reddit.com/r/uruguay/comments/jlcp3z/compra_en_usa_couriers/) (negativo)

**Scores propuestos:** cumplimiento **64** · atención **58** · transparencia **38** · cobertura **68**

- *cumplimiento:* Evidencia amplia y contradictoria: 4,0★ sobre 576 reseñas de Google (76% en 4–5★, ~18% en 1–2★) más un sample usable de Reddit (14 opiniones, saldo +40, que sugería 72). Lo bajamos de esa sugerencia porque las quejas graves no son ruido: paquetes escaneados como entregados por USPS que nunca aparecen en el depósito, y una vía España/Europa con pérdidas y meses de espera. Cumple bien en la ruta EE.UU. estándar; cuando algo sale mal, no hay red.
- *atencion:* Hay base para puntuar (576 reseñas + reportes fechados 2020–2026). A favor: el elogio más repetido es que atiende un humano por teléfono y en mostrador, el dueño responde reseñas negativas con fecha, y en 2026 orientaron bien a un usuario sobre el registro en aduana. En contra: cero comunicación proactiva —los usuarios se enteran de los problemas porque llaman ellos—, y en la vía España hay que correrlos atrás. Reddit solo no alcanzaba para puntuar esta dimensión; el peso lo pone Google.
- *transparencia:* Publican todo —tarifario completo, calculadora, hasta las tarifas accesorias— y aun así este es su punto más flojo, porque lo que publican no es lo que cobran. Su propio motor de precios le suma 95 g al peso declarado antes de elegir el tramo: un paquete de 150 g figura a u$s 10,90 y se factura 15,90 (+46%). Tres de los cuatro tramos chicos erran contra el cliente. A eso se suma que se contradicen solos en el exceso de volumen (u$s 4 vs u$s 10 por kg) y en el depósito gratis (40 vs 25 días), y que el 10% de TSPU y los u$s 5 de handling quedan fuera del precio de portada. Reddit sugería 58, pero ese sample no conocía el recargo oculto.
- *cobertura:* De lo mejor en orígenes: EE.UU., España e Inglaterra, y son de los poquísimos con casilla europea real. Suman tarifa promocional de libros (u$s 11,90/kg), 40 días de depósito gratis y consolidación gratis desde EE.UU. Restan: sin seguro incluido, sin casilla en China ni Argentina, sin descuento de IVA, y el interior es solo hasta agencia, no a domicilio.

**Banderas rojas:**

- Su calculadora le suma 95 g a tu peso antes de elegir el tramo, y eso NO está publicado en ningún lado. La tabla de la web dice que hasta 199 g pagás u$s 10,90, pero el motor cobra 10,90 solo hasta 104 g: de 105 g en adelante son 15,90. Un paquete de 150 g sale 46% más caro que lo anunciado. Lo mismo en 405–499 g (15,90 anunciado → 18,90 real) y en 605–699 g (18,90 → 20,90). Verificado punto por punto contra su propio motor de precios.
- El precio de portada no es el precio final: al flete hay que sumarle SIEMPRE u$s 5 de handling por paquete y el 10% de TSPU (URSEC). El 'u$s 19,90 el kilo' termina siendo ~u$s 21,89 + 5.
- Cobran exceso de volumen y se contradicen a sí mismos sobre cuánto: los términos y condiciones dicen u$s 4 por kg y la página de Inglaterra dice u$s 10 por kg. La página de EE.UU. ni lo menciona. Si traés algo voluminoso y liviano, pedí el precio por escrito antes de comprar.
- El seguro NO viene incluido: es un producto aparte que tenés que contratar, y no publican ni el precio, ni el tope de cobertura, ni cómo se reclama.
- Los términos se desligan de las pérdidas, los daños y las demoras —incluso de lo que se pierda dentro de sus propias oficinas y depósitos—. Hay una excepción importante que conviene aprovechar: SÍ se hacen responsables si el paquete llegó por UPS, FedEx o DHL y lo firmó un funcionario de Urubox. El agujero está en los envíos por USPS y Amazon Logistics, que no se firman: varios usuarios reportan paquetes marcados como entregados que nunca aparecieron, sin compensación.
- La vía España/Europa —que es justamente su gran diferencial— concentra las peores quejas: meses de espera, consolidados olvidados, paquetes perdidos entre Madrid y Montevideo, y un depósito madrileño con horarios tan acotados que devuelven encomiendas al remitente.
- Al interior entregan solo HASTA AGENCIA, nunca a tu puerta, por u$s 5 + IVA. Hay al menos un cliente que le pagó la entrega a Urubox y después tuvo que pagar de nuevo en la agencia (DAC) al retirar.
- Reportes independientes y separados en el tiempo (2020 y 2023) de que el peso facturado en Miami viene por encima del real: un ítem de ~150 g facturado como 1 kg. Sus propios términos legitiman parte de esto avisando que la consolidación agrega peso de embalaje que pagás vos. Defensa que funciona: exigí que lo pesen en el mostrador delante tuyo; refacturan al peso menor.
- Consolidar es gratis desde EE.UU., pero desde España solo te dan 3 paquetes gratis y después son u$s 5 por cada paquete extra.
- A los 180 días en depósito declaran el paquete abandonado y lo destruyen, 'no aceptándose reclamos de ningún tipo'.
- Las retenciones de aduana te las devuelven a vos para que las resuelvas solo. Un usuario compró algo no admitido, Urubox se lo despachó igual, quedó retenido y perdió todo sin compensación.
- No prometen ningún plazo de entrega: solo 'dos vuelos semanales desde Miami'. No hay compromiso de servicio que puedas hacerles valer, y los términos se desligan de las demoras.

**A favor:** 
- Tarifa de las más baratas de plaza en la ruta EE.UU., y sin cargo de consolidación desde Miami: en Reddit lo eligen justamente por eso ('no te cobra tarifa por usarlo, ni handling, solo el peso').
- De los poquísimos couriers uruguayos con casilla real en España (Madrid) e Inglaterra: acceso a tiendas europeas que con los demás no tenés.
- 40 días de depósito gratis desde EE.UU., generoso comparado con los pares (aunque su propia web se contradice y dice 25 en las preguntas frecuentes).
- Tarifa promocional para libros, CDs, vinilos y DVD: u$s 11,90/kg, bastante por debajo de su tarifa general.
- Atiende gente de verdad por teléfono y en el mostrador, y el dueño contesta las reseñas negativas de Google con fecha.
- Podés exigir que te repesen el paquete en la balanza del mostrador delante tuyo, y refacturan al peso menor si difiere.
- Publican el tarifario completo, incluidas las tarifas accesorias (desconsolidación, verificación, retiros, reenvíos, retorno), cosa que varios competidores esconden.

**En contra:** 
- Los tramos chicos que publican son falsos: su motor te suma 95 g y te salta de tramo. Entre 105 y 199 g pagás 46% más que lo anunciado.
- Sin seguro incluido y con un deslinde de responsabilidad amplio: si tu paquete se pierde en el camino por USPS o Amazon Logistics, la evidencia dice que no lo pagan.
- La vía España, que es su mejor argumento de venta, es también donde más se pierde y más se demora: hay reportes de meses.
- Cero comunicación proactiva: si hay demora o problema, te enterás porque llamás vos.
- Al interior no llegan a domicilio, solo hasta la agencia, y hay quien terminó pagando dos veces.
- Sin plazo de entrega comprometido: no hay nada que reclamarles si tarda.
- Dejó de ser competitivo en cosas pesadas o voluminosas: un usuario fue cotizado en u$s 250 por una impresora 3D que otro courier le trajo por 70.
- Se contradicen solos en dos números que te tocan el bolsillo (exceso de volumen y días de depósito gratis).

**Para quién:** El que compra en EE.UU. cosas de más de 1 kg, no frágiles ni carísimas, y quiere el flete más barato aceptando que no hay seguro ni plazo. También —y casi sin alternativa— el que necesita traer de España o Inglaterra, siempre que tenga paciencia de sobra. Si tu paquete pesa entre 105 y 199 g, o si lo que traés vale mucho, buscá otro.

**Veredicto:** Urubox es barato y llega, pero te cobra de más en la letra chica y no te cubre si algo sale mal. Ese es el trato, y conviene tomarlo con los ojos abiertos. La ruta EE.UU. funciona: 4,0★ sobre 576 reseñas, y en Reddit la palabra que más se repite es '0 drama'. Nadie lo llama el mejor servicio, pero le funciona a la mayoría, y sin cargo de consolidación es de lo más barato que hay. El problema es que verificamos su propia calculadora y encontramos algo que su tarifario no dice: le suma 95 gramos a tu peso antes de decidir en qué tramo caés. Un paquete de 150 g figura a u$s 10,90 y se factura 15,90. Tres de los cuatro tramos chicos erran contra vos. Sumale el 10% de TSPU y los u$s 5 de handling que no están en el precio de portada, y el 'barato' se achica. La otra pata floja es la responsabilidad: no hay seguro incluido, los términos se desligan de pérdidas y daños —incluso dentro de su propio depósito—, y hay varios casos de paquetes que USPS marcó entregados y nunca aparecieron. Ahí tenés una defensa concreta: si hacés que el vendedor despache por UPS, FedEx o DHL, sus propios términos SÍ los hacen responsables cuando lo firma un funcionario de ellos. Y la casilla de España, que es su diferencial más fuerte, es paradójicamente donde más se pierde y donde se habla de meses de espera. Resumen: para paquetes medianos de EE.UU. que no te duelan si se pierden, está bien y te ahorra plata. Para algo valioso, frágil, apurado o que venga de Europa, estás pagando barato un riesgo que te lo comés vos.

**Gaps (resolver a mano):**

- Tarifa arriba de 40 kg: no existe. Las tres páginas (EE.UU., España, Inglaterra) dicen 'Cotizamos carga'. Hay que pedirla.
- Exceso de volumen: no sabemos cuál de los dos números aplica realmente a un envío desde EE.UU. Los términos dicen u$s 4/kg y la página de Inglaterra dice u$s 10/kg. La página de EE.UU. ni lo menciona.
- Depósito gratis: 40 o 25 días. tarifas-almacenamiento.html dice 40; las preguntas frecuentes 1 y 8 dicen 25. No se puede resolver desde afuera.
- Seguro opcional: no publican precio, ni tope de cobertura, ni procedimiento de reclamo. Los términos solo dicen que hay que contactarlos.
- Despacho de aduana: no publican ninguna tarifa de despacho. No podemos confirmar que no exista en la práctica, solo que no está publicada. Lo único cercano es el trámite VUCE a u$s 12 para electrónica con bluetooth/wifi.
- No verificamos si el recargo oculto de 95 g también se aplica arriba de 1 kg. En los pesos probados (4,99 / 5 / 10 / 20 kg) el cobro es exactamente peso × tarifa, así que ahí no aparece — pero los pesos intermedios (por ejemplo 1,5 kg) no se testearon.
- Tiempo de tránsito real: no hay plazo publicado ni muestra suficiente para dar una mediana honesta. Los reportes van desde 'el primer vuelo' hasta 'meses' en la vía Europa.
- El 'descuento promocional' que aparece en su calculadora: no está documentado en ningún tarifario. No sabemos qué es, quién califica ni si sigue vigente.
- No hay casilla en China ni en Argentina, así que las tarifas cn/ar no son un dato faltante: no aplican.
- El texto completo de las reseñas 1★ más recientes (dic 2025 / mar 2026) quedó truncado por Google; solo tenemos las primeras líneas y las respuestas fechadas del dueño.

**Fuentes:** [Tarifas EE.UU. (tarifario publicado)](https://www.urubox.com.uy/tarifas-envios.html) · [Motor de precios real (endpoint de la calculadora)](https://backend.uruboxuy.com/rest/Negocio/CalcularPrecio) · [Calculadora pública](https://www.urubox.com.uy/calculadora.html) · [Tarifas España](https://www.urubox.com.uy/tarifas-envios-es.html) · [Tarifas Inglaterra](https://www.urubox.com.uy/tarifas-envios-inglaterra.html) · [Tarifas de almacenamiento](https://www.urubox.com.uy/tarifas-almacenamiento.html) · [Términos y condiciones (deslinde y excepción UPS/FedEx/DHL)](https://www.urubox.com.uy/terminos-condiciones.html) · [Preguntas frecuentes](https://www.urubox.com.uy/preguntas-frecuentes.html) · [Cambios 2026 (franquicia e IVA)](https://www.urubox.com.uy/cambios-2026.html) · [Ficha de Google Maps (4,0★ · 576 reseñas)](https://www.google.com/maps/place/?q=place_id:ChIJAVAZPkyAn5URPRTZaF5t08c) · [Hilo de couriers en gameover.uy](https://www.gameover.uy/archive/index.php/t-15640.html) · [Espejo de reseñas (latinoplaces)](https://uy.latinoplaces.com/montevideo/urubox-63521) · [Reddit r/uruguay — opinión 2026](https://reddit.com/r/uruguay/comments/1sbc3gn/tiendamia_me_esta_cobrando_cualquier_cosa/oe26xwp/)

---

### StarBox Uruguay `starbox` — Courier

> Barato y prolijo desde Miami, pero vuela una sola vez por semana.

Casillero propio en Miami (Doral) con oficina en Montevideo; tarifa por peso publicada, un solo vuelo por semana.

**Tarifa** (verificada 2026-07-12, [fuente](https://www.starboxuruguay.com/#tarifas)):

```json
{
 "quoteOnly": false,
 "tiers": [
  {
   "maxKg": 0.5,
   "flat": 17,
   "perKg": null
  },
  {
   "maxKg": 0.999,
   "flat": 21,
   "perKg": null
  },
  {
   "maxKg": 4.99,
   "flat": null,
   "perKg": 21
  },
  {
   "maxKg": 10,
   "flat": null,
   "perKg": 20
  }
 ],
 "minChargeUsd": 17,
 "handlingUsd": 5,
 "handlingPlusIva": true,
 "tspuPct": 10,
 "clearanceUsd": null,
 "interiorUsd": 10,
 "booksPerKg": null,
 "insuranceIncluded": false,
 "freeStorageDays": 180,
 "originsPerKg": {
  "us": 21,
  "eu": null,
  "cn": null,
  "ar": null
 },
 "transit": "Su FAQ dice 1 semana en promedio (entre 3 y 10 días hábiles), pero entregan una sola vez por semana y sus Términos no asumen responsabilidad por atrasos."
}
```

**Letra chica:** CÓMO SE ARMA EL PRECIO (verificado en su tabla y en el código de su propia calculadora): 0 a 500 g = USD 17 FIJO; 501 a 999 g = USD 21 FIJO; 1 a 4,99 kg = USD 21 POR KG; 5 a 10 kg = USD 20 POR KG. El flete se fracciona cada 100 g a partir de 1 kg. Arriba de 10 kg la tabla dice 'Consultar precio' (queda a cotizar), aunque su calculadora igual te cotiza hasta 20 kg a USD 20/kg: la tabla y la calculadora se contradicen.

El 17 NO es lo que pagás. Encima del flete va: manejo USD 5 + IVA (USD 3 + IVA si son libros/CD/DVD/revistas), IVA 22% sobre ese manejo, y la TSPU 10% calculada sobre (flete internacional + manejo). Un paquete chico de 500 g arranca en el orden de los USD 25 puestos acá, no en 17.

LIBROS: el descuento es SOLO en el manejo (USD 3 en vez de USD 5). El flete por kilo es idéntico al de cualquier otro artículo, así que no tienen tarifa de libros propiamente dicha.

DESPACHO: no publican honorario fijo. Sus Términos dicen que arriba de USD 200 te consiguen despachante y te trasladan el costo tal cual, con autorización previa. Es un pass-through, no una tarifa.

SEGURO: NO viene incluido. Sus Términos topean el reembolso por pérdida o daño irreparable en USD 200. Por encima de eso hay que contratarles un seguro aparte y ese precio no lo publican en ningún lado.

OTROS COSTOS: interior del país USD 10; entrega a domicilio en Montevideo 'opcional y sujeta a coordinación', SIN precio publicado; retiro en Miami USD 10; devolución al vendedor con etiqueta prepaga USD 10; consolidación GRATIS; depósito gratis 6 meses en Miami y después USD 5 por paquete por mes.

ORÍGENES: solo Estados Unidos. Publicitan una dirección en Torrejón de Ardoz (Madrid) pero no publican ninguna tarifa para Europa, y su calculadora es explícitamente para compras en EE.UU. No hacen China ni Argentina. El 21 de arriba es la banda de 1 a 4,99 kg: la tarifa de EE.UU. es escalonada, no un número único por kilo.

No publican ninguna regla de peso volumétrico.

**Google:** `ChIJKXyHtUyAn5URVuOJUks7xic` — "Starbox" · **4,6 ★** (149 reseñas) · [ficha](https://www.google.com/maps/place/?q=place_id:ChIJKXyHtUyAn5URVuOJUks7xic)

**Reddit:** muestra **none**

**Scores propuestos:** cumplimiento **72** · atención **70** · transparencia **55** · cobertura **45**

- *cumplimiento:* Base real: 149 opiniones de Google con 4,6 y tres reportes fechados de problemas (2022). A favor: los usuarios repiten que llegó rápido y que les cobraron lo que les habían dicho; las reseñas más recientes (fines de 2025) dicen que cumplieron las fechas. En contra: vuelan una sola vez por semana, así que perder el vuelo te cuesta una semana entera, y sus propios Términos se desligan de los atrasos. No hay ni un solo reporte de paquete perdido, pero tampoco hay ningún reclamo con desenlace documentado, así que no sabemos cómo se comportan cuando algo sale mal de verdad.
- *atencion:* Misma base (149 opiniones, 4,6). Elogian mucho la atención humana por WhatsApp y por mail, y al equipo de Montevideo por nombre a lo largo de años. Le baja el puntaje un cluster 2021–2022: portal de seguimiento roto, información incorrecta y una usuaria que dice que 'se lavaron las manos' y se cambió de courier. Es viejo y puede estar corregido, pero está fechado y es de más de un usuario.
- *transparencia:* Publican tabla completa por peso, manejo, TSPU e incluso dejan la calculadora en código abierto: eso es más de lo que hace la mayoría. Pero descuenta fuerte que la MISMA home diga USD 5 de desconsolidación en un bloque y USD 10 en otro; que la entrega a domicilio en Montevideo, el seguro por encima del tope de USD 200 y el precio arriba de 10 kg no tengan cifra; que la tabla y la calculadora se contradigan entre 10 y 20 kg; y que su página de aduana publique dos datos derechamente vencidos.
- *cobertura:* Determinístico y flojo: un solo origen real (EE.UU.; la dirección de España no tiene tarifa publicada, y no hay China ni Argentina). Sin seguro incluido (tope de USD 200). Sin tarifa de libros por kilo (solo manejo más barato). Sin descuento de IVA. Suma a favor: llegan al interior por USD 10 y dan 6 meses de depósito gratis en Miami, que es bastante más generoso que lo habitual.

**Banderas rojas:**

- SI PIERDEN O ROMPEN TU PAQUETE, TE DEVUELVEN COMO MÁXIMO USD 200. Sus Términos: 'El monto del reembolso no podrá superar la cantidad máxima de la franquicia, es decir los U$S 200'. Por encima de eso hay que contratarles un seguro aparte, y ese precio NO está publicado en ningún lado. Si mandás un notebook de USD 600 y no contrataste seguro, tu techo de recupero son USD 200. (starboxuruguay.com/terminos-del-servicio)
- VUELAN UNA SOLA VEZ POR SEMANA Y SE DESLIGAN DE LOS ATRASOS POR CONTRATO. Términos: 'StarBox hará las entregas de las mercaderías una vez por semana... no asume responsabilidad por eventuales atrasos'. El '1 semana en promedio' que promete la FAQ tiene una falla dura: si se pierde el vuelo semanal, te corrés una semana. Lo confirma un reseñador ('tienen una sola traída a la semana, otros tienen más') y otro al que le movieron la entrega de lunes a jueves avisándole 3 horas después de haberle confirmado que llegaba ese mismo día.
- SE CONTRADICEN SOLOS CON LA DESCONSOLIDACIÓN, EN LA MISMA PÁGINA. El bloque 'Servicios' dice 'u$S 5.00 por paquete nuevo'; el bloque 'Otros costos' de la MISMA home dice 'U$S 10.00 por paquete nuevo'. Es el doble de diferencia en una tarifa que cobran por paquete. No des por buena ninguna de las dos sin preguntarles antes.
- SU PÁGINA DE ADUANA TIENE DOS DATOS VENCIDOS, Y TE PUEDEN SALIR CAROS. En /regulacion-de-aduana dicen que el régimen simplificado del 60% tiene 'un mínimo de U$S 10' (hoy el mínimo es USD 20 por envío) y que las compras hasta USD 800 'quedarán exentas del pago de tributo en aduana' (falso: la franquicia te exime de ARANCELES pero igual pagás IVA, salvo factura de EE.UU. de hasta USD 200). Su FAQ además sigue citando los decretos 356/2014 y 336/2015, ya derogados. El número de USD 800 al año en hasta 3 envíos sí está bien; el resto de su guía aduanera no la uses: andá al régimen vigente (Decreto 50/026).
- EL PORTAL DE SEGUIMIENTO ESTUVO ROTO Y MOSTRABA PESOS MAL — y el peso es la base con la que te facturan el flete. Tres reseñas independientes de 2022: 'una aplicación web para el seguimiento de paquetes que no funciona' y 'el peso y la descripción de los paquetes está totalmente errada... e igualmente brindan información incorrecta'. Para ser justos: son de hace ~4 años y las reseñas nuevas no lo repiten, así que puede estar arreglado.
- PUBLICITAN DIRECCIÓN EN ESPAÑA PERO NO PUBLICAN TARIFA PARA EUROPA. Dan un domicilio en Torrejón de Ardoz (Madrid), pero la tabla y la calculadora son solo para compras en Estados Unidos. Si comprás en Europa vas a un precio a cotizar, sin referencia pública. China y Argentina directamente no hacen.
- EL '17' NO ES EL PRECIO PUESTO EN TU CASA. Arriba del flete se suman manejo USD 5 + IVA, 22% de IVA sobre ese manejo, 10% de TSPU sobre (flete + manejo) y USD 10 si vivís en el interior. La entrega a domicilio en Montevideo no tiene precio publicado y arriba de 10 kg es a cotizar.

**A favor:** 
- Tarifa por peso publicada, clara y de las más baratas del mercado: USD 17 hasta 500 g y USD 21/kg entre 1 y 5 kg. Una reseñadora que los comparó de frente dice 'no es para nada caro comparado con otras empresas (TiendaMia o Gripper)'.
- Te cobran lo que te cotizaron. En 149 reseñas no aparece ni un reclamo por cargo sorpresa; al contrario: 'me llegó todo rapidísimo y me cobraron lo que me habían dicho'.
- 6 meses de depósito gratis en Miami, bastante más de lo que da un courier típico, y la consolidación de paquetes es gratis y funciona ('se pueden consolidar paquetes con previo aviso por mail y funciona perfecto').
- Atención humana y responsiva por WhatsApp y mail; al equipo de Montevideo lo elogian por nombre a lo largo de varios años.
- Cuando el vuelo sale, salen rápido: 'me hicieron el despacho un viernes y llegó el lunes'; otra usuaria recibió 12 paquetes consolidados en una semana y media.
- Publican el código de su propia calculadora, así que se puede auditar cómo arman el precio. Casi nadie hace eso.
- Llegan al interior del país por USD 10.

**En contra:** 
- Un solo vuelo/entrega por semana. Es la debilidad estructural: si tu paquete no engancha la traída semanal, esperás otra semana, y contractualmente no te deben nada por eso.
- La responsabilidad por pérdida o daño está topeada en USD 200, y el seguro para cubrir más no tiene precio publicado.
- Solo Estados Unidos en la práctica. Nada de Europa con tarifa, nada de China, nada de Argentina.
- Sin tarifa de libros por kilo: el descuento de libros es solo en el manejo (USD 3 en vez de USD 5), el flete es el mismo que el de cualquier cosa.
- Su información aduanera está desactualizada en dos puntos concretos, y uno de ellos (el mínimo de USD 10) te puede hacer subestimar lo que vas a pagar.
- Contradicciones sin resolver en su propia web: desconsolidación USD 5 vs USD 10, y la tabla dice 'consultar' arriba de 10 kg mientras la calculadora igual te cotiza hasta 20 kg.
- Historial de portal de seguimiento roto con pesos mal cargados (2022). Viejo, quizá corregido, pero nunca lo desmintieron públicamente.
- Casi no tienen huella fuera de Google: sin Trustpilot, sin hilos de incidentes en foros. Hay poca corroboración independiente, para bien o para mal.

**Para quién:** El que compra en Estados Unidos, no tiene apuro y quiere pagar poco: compras chicas y medianas (hasta ~5 kg), de valor moderado, que podés dejar juntando en Miami sin costo y traer consolidadas. Ideal si podés esperar a la traída semanal. NO es para vos si necesitás algo para una fecha fija, si mandás algo caro que quieras asegurado por encima de USD 200, o si comprás fuera de EE.UU.

**Veredicto:** StarBox es de los couriers más baratos y más honestos con el precio que hay en plaza: la tabla está publicada entera, la calculadora es auditable y en 149 reseñas de Google (4,6) nadie se queja de un cargo sorpresa — el elogio que más se repite es justamente que te cobran lo que te dijeron. El trade-off es concreto y hay que aceptarlo con los ojos abiertos: vuelan UNA vez por semana. Cuando enganchás el vuelo, llega rapidísimo; cuando no, perdés una semana y sus Términos dicen expresamente que no se hacen cargo del atraso. Es un courier para el que compra barato y puede esperar, no para el que tiene una fecha. Los dos puntos que de verdad nos molestan no son el precio sino el riesgo: la responsabilidad por pérdida o daño está topeada en USD 200 y el seguro para cubrir más ni siquiera tiene precio publicado, así que mandar algo caro por acá es asumir el riesgo vos; y su propia página de aduana sigue publicando el mínimo derogado de USD 10 (hoy son USD 20) y te dice que hasta USD 800 no pagás tributo, cuando la franquicia exime aranceles pero no el IVA. Sumale que se contradicen solos entre USD 5 y USD 10 de desconsolidación en la misma página. Nada de eso es una estafa: es una empresa chica, querida por sus clientes, con la web y la letra chica descuidadas. Traé cosas de hasta 5 kg y de valor moderado, aprovechá los 6 meses de depósito gratis, y calculá el costo real vos mismo — no con lo que dice su página de aduana.

**Gaps (resolver a mano):**

- Desconsolidación: la home dice USD 5 en un bloque y USD 10 en otro. Hay que preguntarles cuál es. No publicamos ninguna de las dos.
- Precio de la entrega a domicilio en Montevideo. Solo dicen 'opcional y sujeto a coordinación con el cliente', sin cifra. (Los USD 10 son para el INTERIOR, no para Montevideo.)
- Precio del seguro opcional necesario para cubrir por encima del tope de responsabilidad de USD 200. No está publicado en ningún lado.
- Tarifa para España/Europa. Publicitan dirección en Madrid pero no publican ningún precio; queda como cotización a pedido.
- Precio arriba de 10 kg. La tabla dice 'Consultar precio', pero su calculadora igual cotiza de 10 a 20 kg a USD 20/kg. Se contradicen y no sabemos cuál rige.
- Si facturan por peso real o por peso volumétrico. No publican ninguna regla volumétrica en ninguna página.
- Honorario típico del despachante. Los Términos lo describen como traslado de costo a precio real por encima de USD 200, con autorización previa, pero no dan un monto de referencia.
- El histograma de estrellas (116 de 5★, 20 de 4★) y la afirmación de que 'ninguna de las 149 reseñas reporta un paquete perdido ni un cargo sorpresa' NO se pudieron verificar: Google sirve una vista limitada a la automatización que oculta la lista de reseñas. El 4,6 y las 149 opiniones sí están confirmados; el desglose no.
- Ningún incidente (pérdida, daño, retención en aduana) con desenlace documentado. No sabemos cómo se comportan realmente ante un reclamo: solo sabemos lo que el contrato les permite hacer (topear en USD 200).
- Si es cierto lo que dice su FAQ sobre que libros/CD/DVD no cuentan dentro de los 3 envíos anuales de la franquicia y entran 'de manera ilimitada'. No lo verificamos contra la DNA y no hay que repetirlo como un hecho.
- Si el portal de seguimiento y los pesos mal cargados (reportados en 2022) siguen rotos hoy. Las reseñas nuevas no lo mencionan, pero tampoco hay confirmación de que lo hayan arreglado.

**Fuentes:** [StarBox — Tarifas (tabla oficial, leída 2026-07-12)](https://www.starboxuruguay.com/#tarifas) · [StarBox — código de su calculadora (confirma la forma de los tramos)](https://www.starboxuruguay.com/assets/js/calculadora.js) · [StarBox — Términos del servicio (entrega semanal, tope de USD 200, despachante)](https://www.starboxuruguay.com/terminos-del-servicio) · [StarBox — Preguntas frecuentes (tránsito 3 a 10 días hábiles)](https://www.starboxuruguay.com/preguntas-frecuentes) · [StarBox — Regulación de aduana (página con los datos vencidos)](https://www.starboxuruguay.com/regulacion-de-aduana) · [Google Maps — Starbox (4,6 · 149 opiniones)](https://www.google.com/maps/place/?q=place_id:ChIJKXyHtUyAn5URVuOJUks7xic) · [Decreto 50/026 — régimen de franquicias vigente desde 2026-05-01](https://www.impo.com.uy/bases/decretos-originales/50-2026) · [Aduanas — nuevo régimen de franquicias de envíos postales internacionales](https://www.aduanas.gub.uy/innovaportal/v/28455/1/innova.front/desde-el-1%C2%BA-de-mayo-comienza-a-regir-el-nuevo-regimen-de-franquicias-de-envios-postales-internacionales.html) · [MEF — guía de preguntas frecuentes del nuevo régimen](https://www.gub.uy/ministerio-economia-finanzas/comunicacion/noticias/guia-preguntas-frecuentes-sobre-regimen-envios-postales-franquicias) · [mtb.uy — hilo de couriers (entrada de StarBox VIEJA: dirección y tarifas superadas, no usar)](https://mtb.uy/temas/couriers-para-compras-por-internet-en-estados-unidos.7546/page-3)

---

### BuyBox `buybox` — Courier

> Tarifa completa y libros baratísimos; reclamos solo en el mostrador.

Courier uruguayo con casillero en Miami, Buenos Aires y España, 2 vuelos semanales desde Miami (llegan lunes y viernes). Es el courier que usa Tiendamía.

**Tarifa** (verificada 2026-07-12, [fuente](https://www.buybox.com.uy/tarifas.html)):

```json
{
 "quoteOnly": false,
 "tiers": [
  {
   "maxKg": 0.5,
   "flat": 5.9,
   "perKg": null
  },
  {
   "maxKg": 1,
   "flat": null,
   "perKg": 21
  },
  {
   "maxKg": 3,
   "flat": null,
   "perKg": 18.9
  },
  {
   "maxKg": 5,
   "flat": null,
   "perKg": 16.9
  },
  {
   "maxKg": 10,
   "flat": null,
   "perKg": 15.9
  },
  {
   "maxKg": 20,
   "flat": null,
   "perKg": 13.9
  }
 ],
 "minChargeUsd": null,
 "handlingUsd": 5,
 "handlingPlusIva": false,
 "tspuPct": 10,
 "clearanceUsd": 120,
 "interiorUsd": 6,
 "booksPerKg": 9.99,
 "insuranceIncluded": null,
 "freeStorageDays": 60,
 "originsPerKg": {
  "us": 21,
  "ar": 21,
  "eu": 21,
  "cn": null
 },
 "transit": "2 vuelos semanales desde Miami (llegan lunes y viernes). El paquete tarda 24 horas hábiles en aparecer en tu casillero después de llegar al depósito de Miami. NO publican plazo puerta a puerta y su propio FAQ aclara que \"Buybox no se hace responsable por demoras de aduanas o la aerolínea\". El único dato punta a punta que aparece en reseñas es ~10 días (lane argentino, 2023)."
}
```

**Letra chica:** La tabla escalonada es para EEUU Y ARGENTINA (misma tabla, encabezada "TARIFAS USA y ARGENTINA"). ESPAÑA va aparte: tarifa PLANA de 21 USD/kg a cualquier peso, sin escalonado y sin descuentos. Los 0-500 g son un fijo de USD 5,90; desde 501 g se cobra por kilo y "luego del primer KG, se fracciona cada 100g". LIBROS/VINILOS/CD/DVD: USD 9,99 el kilo desde EEUU y Argentina, USD 13,50 desde España, y explícitamente "sin handling". HANDLING: USD 5 hasta 4 paquetes, después USD 2 por cada paquete adicional. ENCIMA DE LA TARIFA: 10% de tasa postal sobre el flete (sin IVA) + IVA sobre el 3% del flete internacional. INTERIOR: USD 6 + imp.; distribución gratis en Montevideo y retiro sin costo en sus locales (lo dice la home). DESPACHO / IMPORTACIÓN FORMAL (más de 20 kg o más de USD 200): SÍ está publicado en buybox.com.uy/importaciones.html — honorarios de despachante USD 120 + IVA, USD 10 + IVA si BuyBox hace y paga el PARS, y USD 20 + IVA de liberación si el vuelo ya llegó, más el costo del depósito fiscal TCU (no cotizado). OTROS COSTOS: desconsolidación en Miami USD 10 por caja; retiro en el depósito de BuyBox Miami USD 20 por paquete (se paga en Uruguay); reempaque con protección USD 12; reempaque de cristalería USD 5 por artículo; devolución al vendedor USD 15 y SOLO mientras el paquete siga afuera ("si el mismo ya se encuentra en Uruguay no se realizan devoluciones"). DESCUENTOS: los códigos no son acumulables, aplican sobre la tarifa pública de 21 USD y NO valen para compras enviadas desde España ni Argentina. CHINA: tienen sección "Comprá en China" pero NO publican tarifa de origen China — por eso va en null, no en cero. SEGURO: no hay una sola línea de seguro, ni cobertura ni precio, en toda la tarifa.

**Google:** `ChIJjZZGKGaGn5URT-zMCBJuiuE` — "BuyBox" · **3,9 ★** (438 reseñas) · [ficha](https://www.google.com/maps/place/?q=place_id:ChIJjZZGKGaGn5URT-zMCBJuiuE)

**Reddit:** muestra **thin** · neto **+55** sobre 6 opiniones

De las 22 menciones a BuyBox apenas 6 son opiniones reales, y casi todas son favorables: el courier de Tiendamía tiene fama de "cero problemas" y de que los paquetes pasan aduana sin drama, con un caso concreto en que lo llamaron para destrabar una retención por WhatsApp. Es muy poca muestra para un puntaje firme, y hay que decir algo incómodo: buena parte del elogio es porque aduana casi no les revisa los paquetes por volumen, no por calidad de servicio comprobada. Ojo también: no hay casi ninguna queja contra BuyBox en Reddit, algo raro — ausencia de quejas no es prueba de excelencia. Y las quejas por Tiendamía (precios, demoras en contestar) NO son de BuyBox, aunque los hilos los mezclen.

> *"Te recomendaria empezar a usar BUYBOX, es el mejor courier que he usado y es justo el courier que utiliza tienda mia, la única vez que aduana me lo retuvo, me llamaron desde BUYBOX explicando la razon, les pasé por wpp mejor la factura de ese producto y lo liberaron enseguida"* — [r/Burises, 2025-03-14](https://reddit.com/r/Burises/comments/1jbag5n/aduana/mhsyva2/) (positivo)

> *"Buy box, podes traer una ballena franca y cero problema.."* — [r/uruguay, 2025-07-27](https://reddit.com/r/uruguay/comments/1maxz1d/cuales_son_los_mejores_couriers_hoy_para_ustedes/n5i5hms/) (positivo)

**Scores propuestos:** cumplimiento **62** · atención **58** · transparencia **55** · cobertura **72**

- *cumplimiento:* Hay evidencia de sobra: ficha de Google con 438 reseñas (3,9) y varios incidentes fechados y verificados. A favor: en Reddit (muestra fina) no hay una sola queja verificable y varios reportan años de uso sin problemas. En contra: los paquetes perdidos son la queja más repetida y verificada (Reddit 2023-12-19 "me perdieron paquetes que en el tracking decian entregado... si les reclamas NO HACEN NADA"; Google 2023-04-29 "los pierden y se lavan las manos como unos campeones") y en junio de 2026 siguen apareciendo reportes de paquetes varados en Miami y entregas desviadas a DAC a costo del cliente. Sin seguro publicado, un paquete perdido es plata perdida. Ni desastre ni impecable: 62.
- *atencion:* El mostrador y el WhatsApp funcionan cuando el trámite es normal: los elogian por nombre en Google y en Reddit hay un caso concreto (2025-03) en que llamaron ellos para destrabar una retención de aduana. El techo se lo pone su propia política: solo aceptan reclamos en el mostrador y en el momento de recibir el paquete. Cuando algo sale mal, el patrón reportado es "no es problema nuestro" (campera con un tajo, 2018; paquetes perdidos, 2023; junio 2026 "no se hacen cargo de los problemas que esto causa"). Buena atención comercial, floja posventa: 58.
- *transparencia:* Publican más que casi todos: tabla escalonada completa, handling, tasa postal, interior, libros, y hasta el despacho de importación formal (USD 120 + IVA) — el investigador dijo que no lo publicaban y estaba equivocado. Pero se contradicen a sí mismos en su propio sitio (almacenaje: 60 días gratis y después USD 1 por kg POR DÍA en envios.html vs "no tiene costo" en precios.html; VUCE USD 10 vs USD 9), nunca dicen nada del seguro, y la tarifa de portada no es lo que pagás (10% de tasa postal + IVA sobre el 3% del flete + USD 5 de handling). Y hay cargos que aparecen después: IVA cobrado por un error de la web (junio 2026) y el lane argentino donde "puede ser superior al monto calculado al inicio" (2023-03-07). 55.
- *cobertura:* Tres orígenes que efectivamente funcionan (EEUU, Argentina y España; sin tarifa publicada para China), envío al interior aunque pago (USD 6 + imp.), distribución gratis en Montevideo y retiro sin costo en sus locales, 60 días de almacenaje sin cargo (con la contradicción del caso), tarifa de libros/vinilos/CD/DVD a USD 9,99 el kilo sin handling —de lo mejor de la plaza— y despacho formal cotizado. Le resta: nada de seguro, nada de China y ningún descuento de IVA. 72.

**Banderas rojas:**

- RECLAMOS SOLO EN EL MOSTRADOR Y AL MOMENTO DE RECIBIR. Su propia política: "Buybox no se hace responsable por reclamos que no se presenten al momento de recibido el paquete... deberas presentarlo en mostrador". Si abrís la caja en tu casa y falta algo o vino roto, no tenés vía de reclamo. Revisá el paquete ahí mismo, delante de ellos.
- PAQUETE PERDIDO = PLATA PERDIDA. Es la queja más repetida y está verificada: Reddit 2023-12-19 ("me perdieron paquetes que en el tracking decian entregado... te pueden perder paquetes y lo unico que hacen es encogerse de hombros... si les reclamas NO HACEN NADA") y Google 2023-04-29 ("los pierden y se lavan las manos como unos campeones"). Y NO publican seguro: ni cobertura, ni tope, ni precio, en ninguna página.
- LA TARIFA DE PORTADA NO ES LO QUE PAGÁS. Encima del precio por kilo va 10% de tasa postal sobre el flete, más IVA sobre el 3% del flete internacional, más USD 5 de handling (USD 2 por paquete a partir del quinto). Un reseñista eligió a USX Cargo justamente por no tener ni handling ni impuesto postal (2023-07-14: "Buen servicio pero muy muy caro").
- EL ALMACENAJE SE CONTRADICE EN SU PROPIO SITIO Y UNA VERSIÓN ES BRUTAL. envios.html dice 60 días sin costo y después USD 1 por kg POR DÍA (una caja olvidada de 5 kg = USD 5 por día); precios.html dice que el depósito en Miami "no tiene costo", con abandono a los 9 meses. Las dos páginas están vivas hoy. Pedilo por escrito antes de dejar algo en Miami.
- ESPAÑA Y ARGENTINA SON EL LADO CARO. Los descuentos y códigos promocionales "no aplican para compras enviadas desde España y Argentina", y España no tiene escalonado: 21 USD/kg a cualquier peso. Diez kilos desde España son USD 210 de flete contra USD 159 desde EEUU.
- CARGOS QUE APARECEN DESPUÉS, TAMBIÉN EN 2026. Reseñas de Google de junio 2026: a un cliente le cobraron IVA que no correspondía por un error de la página (se dio cuenta semanas después) y a otra clienta le mandaron los paquetes por DAC a su costo tras pedir retiro en sucursal, con un paquete varado en Miami. En el lane argentino, el pago para liberar "puede ser superior al monto calculado al inicio" (2023-03-07).
- EL INTERIOR NO ES GRATIS: USD 6 + imp. Gratis es solo la distribución en Montevideo y el retiro en sus locales.
- EL DEPÓSITO DE MIAMI NO ESTÁ EN ZONA FRANCA: pagás el sales tax de EEUU (~7%) en la compra, según una reseña de 2023-03-03 que lo da como razón para irse a un competidor exonerado. Dato viejo y no re-verificado para 2026, pero nada en el sitio actual dice que estén en zona franca.
- OJO CON LA FICHA EQUIVOCADA DE GOOGLE: existe una segunda ficha también llamada "BuyBox" (Av. Gral. Rivera 4260) con 1,5 estrellas y 13 reseñas. La buena —y la que usamos— es la de Palmar 2529, cuyo teléfono, dirección y web coinciden con los de la empresa.
- EL ELOGIO DE REDDIT VIENE CON LETRA CHICA: buena parte de la fama de "cero problemas" es que, según los propios usuarios, aduana casi no les revisa los paquetes por el volumen que mueven ("podés traer una ballena franca"). Eso es un chiste sobre la Aduana, no una promesa de la empresa, y no hay motivo para asumir que sobreviva al nuevo régimen de importaciones.

**A favor:** 
- Publican TODO el precio, incluso el despacho de importación formal (USD 120 + IVA de honorarios de despachante, en /importaciones.html), algo que la mayoría de los couriers no cotiza. La tabla escalonada de EEUU/Argentina está completa y verificada hoy.
- Libros, vinilos, CD y DVD a USD 9,99 el kilo desde EEUU y Argentina, y explícitamente SIN handling (USD 13,50 desde España). Es de lo mejor de la plaza para esa carga.
- Tres orígenes que funcionan de verdad: EEUU, Argentina (varios en Reddit lo recomiendan puntualmente para traer de Mercado Libre AR, con casos concretos en 2025-2026) y España.
- Distribución gratis en Montevideo y retiro sin costo en sus locales (lo dice la home: "retirar en nuestros locales sin costo").
- Dos vuelos semanales desde Miami, con llegadas los lunes y los viernes.
- En la muestra de Reddit no hay una sola queja verificable: varios lo usan hace años "cero problemas", y hay un caso donde BuyBox llamó al cliente para destrabar una retención de aduana y la resolvió por WhatsApp.

**En contra:** 
- La posventa es su punto débil: reclamos solo en el mostrador y al momento de recibir. Después de eso, no hay vía.
- No hay seguro publicado: ni cobertura, ni tope, ni precio. Y los paquetes perdidos son la queja más repetida.
- Caro una vez que sumás todo: 10% de tasa postal + IVA sobre el 3% del flete + USD 5 de handling arriba del precio por kilo.
- Se contradicen a sí mismos: almacenaje (60 días gratis y después USD 1/kg/día vs "no tiene costo") y VUCE (USD 10 vs USD 9). La tarifa publicada no está mantenida.
- España sin escalonado ni descuentos: 21 USD/kg a cualquier peso.
- Google 3,9 con 438 reseñas: no es un desastre, pero tampoco es un operador impecable, y los reportes de cargos inesperados llegan hasta junio de 2026.
- El depósito de Miami no está en zona franca: pagás sales tax de EEUU en la compra (dato de 2023, no re-verificado).
- Argentina y España no comparten sistema con Uruguay: en el lane argentino "no tienen sistema unificado" y hay que reclamar allá (2023-03-07).

**Para quién:** El que compra en EEUU o Argentina y quiere una tarifa escalonada publicada de punta a punta —incluido el despacho formal si se pasa de 20 kg o USD 200— y sobre todo el que trae libros, vinilos, CD o DVD: USD 9,99 el kilo sin handling es de lo mejor que hay. También sirve como puerta de entrada a Mercado Libre Argentina. NO es para vos si lo que traés es caro o frágil: no hay seguro publicado y los reclamos solo se aceptan en el mostrador, en el momento de recibir.

**Veredicto:** BuyBox es el courier grande y prolijo por delante, y flojo por detrás. Por delante: publica la tarifa completa (escalonada para EEUU y Argentina, plana para España), publica hasta los honorarios de despachante para importación formal —USD 120 + IVA—, tiene dos vuelos semanales desde Miami, distribución gratis en Montevideo y una tarifa de libros/vinilos/CD/DVD a USD 9,99 el kilo sin handling que es difícil de igualar. En Reddit casi no tiene quejas y varios lo usan hace años sin drama (aunque parte de esa fama sea que, según los propios usuarios, aduana casi no les revisa los paquetes por el volumen que mueven: eso no es un servicio que la empresa te venda ni te garantice, y puede no sobrevivir al nuevo régimen). Por detrás: cuando algo sale mal, el patrón que se repite en reseñas fechadas —2018, 2023 y todavía en junio de 2026— es que el problema pasa a ser tuyo. Solo aceptan reclamos en el mostrador y en el momento de recibir el paquete, no publican ni una línea de seguro, y los paquetes perdidos son la queja más citada. Sumale que la tarifa de portada no es lo que pagás (10% de tasa postal + IVA sobre el 3% del flete + USD 5 de handling) y que su propio sitio se contradice sobre el almacenaje: 60 días gratis y después USD 1 por kg POR DÍA en una página, "no tiene costo" en otra. El trade-off es concreto: pagás de más y aceptás que, si el paquete desaparece, no hay red. Traé libros y compras baratas por acá; lo caro y lo frágil, llevalo a alguien que ponga un seguro por escrito.

**Gaps (resolver a mano):**

- SEGURO: no publican si el envío está asegurado, con qué cobertura ni a qué costo. El FAQ de envíos reproduce una lista de exclusiones de una póliza (para mercadería que sale de España), lo que sugiere que existe un seguro de carga por detrás, pero cobertura, tope, franquicia y precio no aparecen en ningún lado. Va en null: NO mostrar "seguro incluido".
- TARIFA DESDE CHINA: tienen sección "Comprá en China" pero no publican ninguna tarifa de origen China, y tampoco dicen si esas compras se rutean por Miami y se cobran con la tabla de EEUU. cn = null (no es cero).
- ALMACENAJE: su propio sitio tiene dos políticas vivas y contradictorias (envios.html: 60 días gratis y después USD 1 por kg POR DÍA; precios.html: el depósito de Miami "no tiene costo", abandono a los 9 meses). Publicamos 60 días como piso conservador; hay que confirmar con la empresa cuál se aplica.
- MÍNIMO DE 1 KG: la frase "Luego del primer KG, se fracciona cada 100g" sugiere que entre 501 g y 1 kg te cobran el kilo entero (~USD 21), pero la página nunca dice "mínimo 1 kg". minChargeUsd queda en null hasta confirmarlo — no meterlo en la calculadora antes de verificarlo.
- PLAZO PUERTA A PUERTA: no lo publican. Solo la cadencia de vuelos (2 semanales, llegadas lunes y viernes) y una cláusula de que no se responsabilizan por demoras de aduana o aerolínea. La promesa de home "en menos de una semana" que citaba el perfil NO existe en la home: descartada.
- CANTIDAD DE PUNTOS DE RETIRO: el FAQ dice "9 pickup centers" pero solo nombra 8, y /locales.html lista una sola dirección uruguaya (Palmar 2529). El "~10 puntos de retiro" del perfil original era inventado: no lo publicamos.
- VUCE/URSEC: USD 10 en la tarifa vs USD 9 en el FAQ de envíos. Plata chica, pero no sabemos cuál cobran.
- DEPÓSITO FISCAL TCU: en importación formal se paga además "el costo del depósito fiscal TCU", que no está cotizado en ninguna parte.
- SALES TAX DE MIAMI (~7%): el dato de que el depósito no está en zona franca sale de una reseña de 2023-03-03 y no pudo re-verificarse para 2026. Nada en el sitio actual reclama estatus de zona franca, pero tampoco lo desmiente.
- DOS RESEÑAS DEL INVESTIGADOR NO SE PUDIERON LOCALIZAR en la URL citada (la de la consolidación que "se lleva más de dos vuelos", 2023-09-11, y la del envío perdido y cobrado igual, 2019-11-27). No se publican como evidencia.

**Fuentes:** [Tarifas BuyBox (tabla verificada 2026-07-12)](https://www.buybox.com.uy/tarifas.html) · [Importación formal: despachante USD 120 + IVA, PARS USD 10 + IVA, liberación USD 20 + IVA](https://www.buybox.com.uy/importaciones.html) · [FAQ Envíos: vuelos, 24 h hábiles, almacenaje 60 días + USD 1/kg/día, VUCE USD 9](https://www.buybox.com.uy/preguntas-frecuentes/envios.html) · [FAQ Precios: almacenaje en Miami "no tiene costo" (contradice envios.html)](https://www.buybox.com.uy/preguntas-frecuentes/precios.html) · [Devoluciones y Reclamos: solo en mostrador, al momento de recibir](https://www.buybox.com.uy/preguntas-frecuentes/devoluciones-y-reclamos.html) · [Locales (una sola sucursal uruguaya listada: Palmar 2529)](https://www.buybox.com.uy/locales.html) · [Ficha correcta de Google Maps (Palmar 2529 · 3,9 · 438 reseñas)](https://www.google.com/maps/place/?q=place_id:ChIJjZZGKGaGn5URT-zMCBJuiuE) · [Reddit 2023-12-19: paquetes perdidos, "si les reclamas NO HACEN NADA"](https://reddit.com/r/uruguay/comments/ud7zw2/es_buybox_confiable/ke3z96b/) · [Reddit 2025-03-14: BuyBox llamó y destrabó una retención de aduana](https://reddit.com/r/Burises/comments/1jbag5n/aduana/mhsyva2/) · [Reddit 2025-07-27: "cuáles son los mejores couriers hoy"](https://reddit.com/r/uruguay/comments/1maxz1d/cuales_son_los_mejores_couriers_hoy_para_ustedes/n5i5hms/) · [Reddit 2026-04-08: lane argentino funcionando (Mercado Libre AR)](https://reddit.com/r/uruguay/comments/1sfc5gz/como_enviar_un_paquete_desde_argentina_y/of0n0g8/) · [Reddit 2025-10-24: libros desde Buenos Aires, "igual de confiable"](https://reddit.com/r/uruguay/comments/1oezbzr/comprar_y_traer_libros_desde_argentina_a_uruguay/nl7mor7/) · [Reseñas (latinoplaces): "muy muy caro", "los pierden y se lavan las manos", lane argentino y sales tax de EEUU](https://uy.latinoplaces.com/montevideo/buybox-448260)

---

### Grinbox `grinbox` — Courier

> Tarifa barata desde Miami, pero no se hace cargo si se pierde.

Casillero propio en Miami con vuelo carguero semanal a Montevideo; opera con licencia postal URSEC OPE151 (Global Box Services SAS).

**Tarifa** (verificada 2026-07-12, [fuente](https://www.grinbox.uy/calculadora)):

```json
{
 "quoteOnly": false,
 "tiers": [
  {
   "maxKg": 0.5,
   "flat": 11,
   "perKg": null
  },
  {
   "maxKg": 10,
   "flat": null,
   "perKg": 22
  },
  {
   "maxKg": 20,
   "flat": null,
   "perKg": 19.8
  },
  {
   "maxKg": null,
   "flat": null,
   "perKg": 17.6
  }
 ],
 "minChargeUsd": 11,
 "handlingUsd": 4,
 "handlingPlusIva": null,
 "tspuPct": 10,
 "clearanceUsd": null,
 "interiorUsd": 10,
 "booksPerKg": 12,
 "insuranceIncluded": false,
 "freeStorageDays": 90,
 "originsPerKg": {
  "us": 22,
  "eu": null,
  "cn": null,
  "ar": null
 },
 "transit": "Vuelo carguero semanal. Lo que pedís antes del viernes 16:00 sale de Miami el domingo y llega a Montevideo esa misma noche (~1 semana puerta a puerta). Ojo: es cifra autodeclarada y su propia FAQ avisa que 'al ser vuelos cargueros, tanto el horario como la fecha de arribo puede modificarse sin previo aviso'. No encontramos ni un solo reporte público fechado que confirme ese plazo."
}
```

**Letra chica:** LA ESCALERA DE PRECIOS NO ESTÁ PUBLICADA. La tarifa que Grinbox publica es un único 'U$S 22 por kilo'. Lo que realmente te cobra su motor de facturación (POST /api/public/calculatePrice, el mismo que usa su calculadora) es: mínimo USD 11 hasta 0,5 kg; USD 22/kg de 0,5 a 10 kg; USD 19,80/kg de 10 a 20 kg (10% off); USD 17,60/kg de 20 kg en adelante (20% off). Verificado: 1 kg = 22 + 4 de manejo = 26; 10 kg = 198 (no 220); 20 kg = 352 (no 440). Los descuentos te favorecen, pero no podés reproducir tu propia factura desde la página de tarifas, y al no estar publicados los pueden sacar cuando quieran.

LIBROS/CD/DVD: la FAQ dice 'U$S 11 por kilo' pero la home dice 'U$S 1,2 cada 100 grs' (=12/kg) y el motor cobra 12/kg. Publicamos 12 porque es lo que te facturan. Mínimo USD 6 hasta 0,5 kg, manejo USD 3 (no 4) y sin descuentos por volumen a ningún peso. La vía de libros no consume la cuota de franquicia.

MANEJO: USD 4 por envío consolidado (USD 3 en libros), no por paquete. Consolidar sirve de verdad: N paquetes pagan un solo manejo y un solo flete.

TSPU 10%: se suma arriba de todo. La calculadora devuelve el importe en 0 y tanto la calculadora como la FAQ aclaran que no está incluido — mientras la home dice 'Sin cargos ocultos' y 'El precio que ves es el precio final'. Las dos cosas no pueden ser ciertas: 5 kg con envío a domicilio en Montevideo cotiza USD 123 y te facturan ~USD 135.

ÚLTIMA MILLA: Pickup Pocitos USD 0, Pickup Carrasco USD 0, domicilio Montevideo USD 9, domicilio Interior USD 10. El interior sale apenas USD 1 más que Montevideo, algo raro de bien en este mercado.

DESPACHO: no hay tasa fija en dólares. En su lugar suman 'costos de medio de pago y despacho: 10% del IVA/tributo, con IVA aparte sobre ese 10%' — es un porcentaje del impuesto, no un fee del courier, por eso el campo va en null. Chequeo: USD 100 de factura bajo franquicia-IVA da 24,68 = 22 + 2,2 + 0,484, igual que su fórmula. Bajo régimen simplificado el motor aplica 61,638%, no el 60% que anuncia la página.

ESCALÓN DE PRECIO (raro pero real): 9,5 kg sale USD 209 y 10 kg sale USD 198; 19,5 kg sale USD 386,10 y 20 kg sale USD 352. Más pesado sale más barato cruzando esos dos límites.

ALMACENAJE: 90 días corridos sin costo. Pasados los 90 días el T&C dice que el paquete 'es declarado en abandono procediéndose al descarte o destrucción del mismo, no aceptándose reclamos de ningún tipo'. No es una multa: te lo tiran.

SEGURO: no hay. El T&C dice textual que 'Grinbox no se responsabiliza por las pérdidas o daños que ocurran al transportar las encomiendas postales' y que si querés, contratás vos un seguro por tu cuenta. También se desligan de los retrasos de las aerolíneas.

TOPES: 20 kg brutos por envío bajo franquicia; cuota de 3 envíos y USD 800 por año.

ORIGEN: solo casillero en Miami (9516 SW 167 AVE, FL 33196). No hay casillero en Europa, China ni Argentina, y la licencia URSEC les cubre el ámbito internacional únicamente en Estados Unidos. Comprás donde quieras, pero tiene que llegar a tu dirección de Miami y el flete se cobra desde Miami igual.

Entidad legal: GLOBAL BOX SERVICES SAS, RUT 219207460012, licencia postal URSEC OPE151.

**Google:** `ChIJ0xMtVYuBn5URWmSCecFpIXM` — "Grinbox" · **4,8 ★** (61 reseñas) · [ficha](https://www.google.com/maps/place/Grinbox/@-34.9150302,-56.1559562,17z/data=!4m6!3m5!1s0x959f818b552d13d3:0x732169c17982645a!8m2!3d-34.9150302!4d-56.1559562!16s%2Fg%2F11tk8_56m4)

**Reddit:** muestra **none**

**Scores propuestos:** cumplimiento **60** · atención **—** · transparencia **42** · cobertura **55**

- *cumplimiento:* Única evidencia: ficha de Google verificada como Grinbox (4.8 sobre 61 opiniones, 55 de cinco estrellas). Alcanza para decir que los envíos rutinarios llegan y la gente queda conforme, pero 61 opiniones es una muestra chica y no existe NI UN reporte público fechado de qué pasa cuando algo se atrasa, se pierde, se rompe o queda trabado en Aduana. Puntaje moderado y deliberadamente lejos del 4,8/5 que sugeriría la estrella: no lo podemos sostener con nada más.
- *atencion:* SIN PUNTAJE. No hay evidencia específica de atención al cliente: no pudimos leer el texto de las reseñas de Google (solo el agregado), no hay muestra de Reddit, no hay Trustpilot ni hilos de foro. Ellos dicen 'sin robots ni respuestas automáticas' pero no hay un solo usuario, a favor ni en contra, que lo confirme. Poner un número acá sería inventarlo.
- *transparencia:* Tienen calculadora pública que desglosa flete / manejo / envío y una API que devuelve lo mismo — poco común acá. Pero: la tarifa publicada (22/kg plano) NO es la que te cobran (hay mínimo de 0,5 kg y descuentos de 10%/20% por volumen que no están publicados en ningún lado); la tarifa de libros se contradice entre su propia FAQ (11/kg) y su home + motor de facturación (12/kg); el 10% de TSPU queda afuera de todo precio mostrado mientras la home dice 'El precio que ves es el precio final'; y bajo régimen simplificado el motor aplica 61,638% donde la página anuncia 60%. Documentación sí, coherencia no.
- *cobertura:* Determinístico: un solo origen de cuatro (Miami/EE.UU.; nada de Europa, China ni Argentina, y la licencia URSEC los habilita solo a EE.UU.) — el mayor recorte. A favor: entrega en el interior por USD 10 (apenas USD 1 más que Montevideo, barato de verdad), dos puntos de retiro gratis, 90 días de depósito sin costo, vía bonificada de libros/CD/DVD a 12/kg que no consume la cuota, y soporte de franquicia con exoneración de IVA. En contra: seguro no incluido y expresamente no ofrecido.

**Banderas rojas:**

- El T&C dice, textual, que 'Grinbox no se responsabiliza por las pérdidas o daños que ocurran al transportar las encomiendas postales' y que si querés seguro lo contratás vos. Y en 'Retrasos' se desligan también de las demoras de las aerolíneas. O sea: si el paquete no llega, el problema es tuyo. No es un vacío de información — está publicado y es lo más adverso posible para el cliente.
- Almacenaje gratis 90 días corridos, y después NO te cobran una multa: te lo tiran. El T&C dice que pasados los 90 días 'el paquete es declarado en abandono procediéndose al descarte o destrucción del mismo, no aceptándose reclamos de ningún tipo'. Si te vas de viaje y se te pasa la fecha, perdiste la mercadería.
- El 10% de TSPU (tasa postal URSEC) se suma arriba de TODO precio que te muestran, incluida la calculadora — mientras la home vende 'Sin cargos ocultos' y 'El precio que ves es el precio final'. Un envío de 5 kg a domicilio en Montevideo cotiza USD 123 y te facturan ~USD 135. Esa frase no es cierta como está escrita.
- La tarifa publicada (22/kg plano) no es la que te cobran. Lo real, sacado de su propio motor de facturación: mínimo USD 11 hasta 0,5 kg, 22/kg hasta 10 kg, 19,80/kg desde 10 kg y 17,60/kg desde 20 kg. Los descuentos te favorecen, pero no están publicados en ningún lado: no podés reproducir tu factura y los pueden sacar sin avisar.
- La tarifa de libros se contradice DENTRO DEL PROPIO SITIO: la FAQ dice 'U$S 11 por kilo' y la home dice 'U$S 1,2 cada 100 grs' (=12/kg), que es lo que efectivamente te cobra el motor. Si presupuestás con la FAQ, te quedás ~9% corto.
- Grinbox le paga comisión en efectivo a influencers POR CADA KILO que envían sus referidos, y su cobertura de prensa sale en la sección de contenido patrocinado de montevideo.com.uy. Los videos de YouTube 'mi experiencia con Grinbox' y esas notas son publicidad, no evidencia. No los leas como opiniones independientes.
- Reputación finita: 61 opiniones en Google (4,8), sin Trustpilot, sin hilos de foro, sin muestra de Reddit y CERO reportes públicos fechados de qué pasa con un paquete atrasado, perdido, roto o frenado en Aduana. La estrella es alta, pero apoyada en muy poco.
- Solo Miami. No hay casillero en Europa, China ni Argentina, y la licencia URSEC les da ámbito internacional únicamente en Estados Unidos. Lo que compres en AliExpress o Shein tiene que pasar igual por tu dirección de Miami y se cobra como flete desde Miami.
- La licencia URSEC les cubre el ámbito local solo en el departamento de Montevideo más el internacional en EE.UU., y sin embargo venden 'Envío Domicilio Interior' a USD 10 (presumiblemente tercerizado). Vale confirmarlo antes de contar con esa cobertura.
- Escalón de precio en su propio motor: 9,5 kg sale USD 209 pero 10 kg sale USD 198, y 19,5 kg sale USD 386,10 pero 20 kg sale USD 352. Cruzar el límite sale más barato que quedarte justo abajo — tenelo en cuenta al consolidar.
- Bajo régimen simplificado el motor de cobro aplica 61,638% de tributo donde la página anuncia 60%.

**A favor:** 
- Operador postal habilitado de verdad: licencia URSEC OPE151 a nombre de GLOBAL BOX SERVICES SAS (RUT 219207460012), Resolución 127/023 del 25/06/2023. Es un registro del Estado, no una promesa de marketing.
- Barato para envíos pesados: los descuentos por volumen que no publican te dejan 19,80/kg desde 10 kg y 17,60/kg desde 20 kg. Un envío de 20 kg sale USD 352 de flete, no los USD 440 que sugiere su propia tarifa.
- El manejo (USD 4) se cobra por envío consolidado, no por paquete: juntás cinco compras y pagás un solo manejo y un solo flete. Consolidar rinde de verdad.
- Interior barato: envío a domicilio en el interior por USD 10, apenas USD 1 más que a domicilio en Montevideo (USD 9), y retiro gratis en Pocitos y Carrasco. La mayoría de los competidores recarga bastante más el interior.
- Vía de libros, CD y DVD a 12/kg con manejo de USD 3 que NO consume tu cuota anual de franquicia (3 envíos / USD 800) y no tiene restricción aduanera.
- Calculadora pública que desglosa flete, manejo y última milla por separado, con una API que devuelve exactamente los mismos números. En este mercado, donde a la mayoría hay que pedirle precio, eso ya es algo.
- 90 días de depósito sin costo, y nada sale hasta que vos lo pidas: no te mandan nada sin tu aprobación.

**En contra:** 
- No hay seguro y el T&C se desliga por escrito de pérdidas, daños y retrasos. Si el paquete no llega, no hay a quién reclamarle.
- A los 90 días te destruyen el paquete y el T&C te bloquea todo reclamo. Es un plazo duro, no una multa que puedas pagar.
- La tarifa publicada no reproduce tu factura: los tramos, el mínimo de 0,5 kg y los descuentos por volumen no están en ningún lado del sitio.
- El 10% de TSPU va aparte de todo precio mostrado, y aun así la home dice 'el precio que ves es el precio final'.
- Su propio sitio se contradice en la tarifa de libros (11 vs 12 por kilo).
- Solo casillero en Miami. Nada de Europa, China ni Argentina.
- Casi no hay evidencia independiente: 61 reseñas de Google y nada más. Cero reportes de qué pasa cuando algo sale mal.
- El corpus de opiniones positivas que sí existe está pago: comisionan influencers por kilo enviado por sus referidos y su prensa es contenido patrocinado.
- En los hilos de Reddit donde alguien preguntó directo por Grinbox, nadie lo defendió: todas las respuestas mandaban a USX, Glic o Puntomio.

**Para quién:** El que compra en tiendas de Estados Unidos, consolida varias compras en un solo envío de 10 kg o más (o trae libros), y puede bancarse la pérdida si el paquete no llega. Ahí es de los más baratos del mercado. Si mandás algo caro, algo irreemplazable, o comprás en Europa, China o Argentina, no es para vos.

**Veredicto:** Grinbox es barato y es legal — dos cosas que no siempre van juntas acá. Está habilitado por URSEC (licencia OPE151), tiene calculadora pública con desglose y, sobre todo, cobra descuentos por volumen que ni siquiera publica: 20 kg de flete salen USD 352 en vez de los USD 440 que sugiere su tarifa. Para consolidar compras pesadas de Estados Unidos, o para traer libros, el precio es de los mejores. El problema es el otro lado del contrato. Sus Términos y Condiciones dicen, con todas las letras, que no se responsabilizan por pérdidas, daños ni retrasos, y que si querés seguro te lo pagás vos; y que a los 90 días el paquete se declara en abandono y se descarta o destruye "no aceptándose reclamos de ningún tipo". Sumale que no hay un solo reporte público fechado de cómo se comportan cuando algo sale mal: las 61 reseñas de Google (4,8) son buenas pero pocas, y buena parte del contenido positivo que vas a encontrar en YouTube o en la prensa está pago por ellos (comisionan influencers por kilo enviado). El trade-off es concreto: pagás menos y te quedás sin red. Está bien para una compra que, si desaparece, te molesta pero no te arruina. Para un celular o algo irreemplazable, elegí un operador que responda. Y presupuestá siempre con el 10% de TSPU arriba: su "precio final" no es final.

**Gaps (resolver a mano):**

- Puntaje de ATENCIÓN: sin evidencia, queda en null. No pudimos leer el texto de las reseñas de Google (solo el agregado 4,8 / 61), no hay muestra de Reddit, no hay Trustpilot ni hilos de foro. Para cerrarlo hay que scrapear los cuerpos de reseña asegurando la identidad de la ficha (ftid 0x959f818b552d13d3) en la MISMA lectura: una corrida previa devolvió por error la ficha de soydelivery (1,7 / 934 opiniones) y casi contamina el registro.
- Tránsito real vs. la semana prometida: cero reportes independientes fechados. El '~1 semana' es autodeclarado y su propia FAQ avisa que las fechas del vuelo carguero pueden cambiar sin previo aviso.
- Qué pasa realmente cuando un paquete se atrasa, se pierde, se rompe o queda frenado en Aduana: no hay ni un solo reporte público, ni bueno ni malo. Sabemos qué dice el contrato (no se responsabilizan), no cómo actúan en la práctica.
- clearanceUsd queda en null a propósito: no cobran una tasa fija de despacho, sino 'costos de medio de pago y despacho' equivalentes al 10% del tributo más IVA sobre ese 10%. No es expresable como un monto fijo en dólares.
- Si los descuentos por volumen (10% desde 10 kg, 20% desde 20 kg) son un compromiso contractual o solo el comportamiento actual de la calculadora. Al no estar publicados, los pueden sacar sin avisar.
- Si el manejo de USD 4 se cobra con IVA aparte: no está aclarado en ningún lado, por eso handlingPlusIva queda en null.
- Si Grinbox está en el registro de vendedores de Aduanas (relevante para el corte del 01/10/2026). Un usuario de Reddit afirmó que 'Grinbox Corp' figura registrada, pero la URL de aduanas.gub.uy que citó no lo respalda (es un índice de recertificaciones OEC que no lo menciona). Sin confirmar.
- Capacidad de respuesta del soporte: dicen 'sin robots ni respuestas automáticas' pero no hay un solo testimonio que lo pruebe ni que lo desmienta.
- Si existen otros cargos al momento de facturar (consolidación, retiro en Tres Cruces, foto de paquetes). El motor solo devuelve flete / manejo / última milla y la foto figura como servicio gratuito, pero no lo pudimos confirmar contra una cuenta real.
- Cobertura real del interior: la licencia URSEC los habilita en el ámbito local solo en Montevideo, pero venden envío a domicilio en el interior por USD 10 (presumiblemente tercerizado). Confirmar antes de publicitarlo.

**Fuentes:** [Grinbox — Preguntas frecuentes (tarifa publicada)](https://www.grinbox.uy/preguntas-frecuentes) · [Grinbox — Calculadora / motor de facturación (tarifa real por tramos)](https://www.grinbox.uy/calculadora) · [Grinbox — Términos y Condiciones (abandono a 90 días, riesgo de pérdida o daño, retrasos)](https://www.grinbox.uy/terminos_y_condiciones.pdf) · [Grinbox — Home (precio de libros, 'el precio que ves es el precio final')](https://www.grinbox.uy/) · [URSEC — Resolución 127/023: licencia postal OPE151 a Global Box Services SAS](https://www.gub.uy/unidad-reguladora-servicios-comunicaciones/institucional/normativa/resolucion-n-127023-otorgar-global-box-services-sas-licencia-postal-numero) · [Grinbox — Programa de influencers (comisión en efectivo por kilo enviado por referidos)](https://www.grinbox.uy/influencers/como-funciona) · [Ficha de Google Maps de Grinbox (4,8 / 61 opiniones)](https://www.google.com/maps/place/Grinbox/@-34.9150302,-56.1559562,17z/data=!4m6!3m5!1s0x959f818b552d13d3:0x732169c17982645a!8m2!3d-34.9150302!4d-56.1559562!16s%2Fg%2F11tk8_56m4) · [r/uruguay — '¿Grinbox o Gripper?': nadie lo defiende, la única respuesta es USX](https://www.reddit.com/r/uruguay/comments/1fu1uhv/cuál_servicio_recomiendan_más_cuál_tiene_mejor/) · [r/Burises — '¿alguien trajo algo por grinbox?': ninguna respuesta lo había usado](https://www.reddit.com/r/Burises/comments/1f4n5i3/alternativa_a_los_rompeculos_de_tiendamia_grinbox/)

---

### Glic `glic` — Courier

> La más barata por kg, pero las reseñas recientes son casi todas 1★

Courier con casillero en Miami y reparto en todo Uruguay; tarifa por kg con descuentos por volumen y 60 días de depósito gratis.

**Tarifa** (verificada 2026-07-12, [fuente](https://glicglobal.com/uy/calculadora.html)):

```json
{
 "quoteOnly": false,
 "tiers": [
  {
   "maxKg": 3,
   "perKg": 21.5,
   "flat": null
  },
  {
   "maxKg": 8,
   "perKg": 15.05,
   "flat": null
  },
  {
   "maxKg": null,
   "perKg": 10.75,
   "flat": null
  }
 ],
 "minChargeUsd": 21.5,
 "handlingUsd": 5.99,
 "handlingPlusIva": true,
 "tspuPct": 10,
 "clearanceUsd": 25,
 "interiorUsd": 4.99,
 "booksPerKg": null,
 "insuranceIncluded": false,
 "freeStorageDays": 60,
 "originsPerKg": {
  "us": 21.5,
  "eu": null,
  "cn": null,
  "ar": null
 },
 "transit": "Standard 5–7 días hábiles; Express 2–5 días hábiles (FAQ Métodos de Envío). Ojo: el propio sitio se contradice — la home y Cómo Funciona dicen \"3 a 10 días hábiles\". El Express no se vende por la calculadora y su recargo no está publicado."
}
```

**Letra chica:** LAS FRANJAS SON MARGINALES, NO SE APLICAN AL TOTAL. La base es 21,50/kg; los kilos dentro de la franja 3–8 pagan 15,05 (30% off) y del 8vo en adelante 10,75 (50% off), cada descuento sólo sobre los kilos de esa franja. Ejemplo verificado, 10 kg: 3×21,50 + 5×15,05 + 2×10,75 = 161,25 de flete (el motor devuelve exactamente 161,25), NO 10×10,75. MÍNIMO 1 KG: cualquier cosa de 0,1 a 1 kg te la cobran 21,50. Las fracciones se prorratean dentro de la franja. ARRIBA DEL FLETE: "Empaque y manejo" USD 5,99 fijo por envío (no escala); "Tasa Postal" (TSPU) = 10% del flete neto, SE SUMA, no viene incluida; "IVA" es una línea aparte de ~5,06% sobre (flete neto + handling) — Glic nunca publica la regla, es una constante ajustada empíricamente. Costo final puerta a puerta en Montevideo: 1 kg = 31,03; 5 kg = 115,14; 10 kg = 191,83; 20 kg = 315,52. INTERIOR: figura un "+4,99" fijo, pero el departamento que elegís NUNCA se envía al servidor (la calculadora lee un elemento #impuestos que no existe en la página), así que no pudimos confirmar qué se factura realmente en el interior. DESPACHO: los USD 25 de "servicio de despacho" son CONDICIONALES — recién aplican cuando quemaste tus 3 franquicias anuales, junto con 60% del valor + USD 30 de terminal de cargas (según FAQ Impuestos). OJO, LAS DOS CIFRAS PUBLICADAS POR GLIC NO COINCIDEN ENTRE SÍ: la FAQ dice 60% + 30 + 25, y la calculadora en cambio suma una línea "Impuestos aduana" de 22% del valor declarado. Ninguna de las dos es confiable como costo real de importación. LA CALCULADORA TIENE UN BUG REAL: si marcás la opción de productos de China, abajo de USD 200 el "Total en dólares" no da la suma de sus propios renglones porque duplica el flete (1 kg / USD 100: los renglones suman 53,03 y el Total muestra 84,06). Arriba de USD 200 la duplicación desaparece. SEGURO: es un extra pago opcional, el precio NO está publicado, y Glic se desliga expresamente si no lo contratás ("En caso de no haber contratado seguro GlicGlobal no se hará responsable"). DEPÓSITO: 60 días gratis, después USD 10 por paquete por mes; a los 6 meses lo descartan y donan. Consolidación gratis. Certificado wifi/bluetooth URSEC/VUCE: USD 0. DEVOLUCIONES: USD 10 (retiro del warehouse) / USD 20 (llevado a un centro de devoluciones). LÍMITES: 20 kg máximo por envío; peso volumétrico arriba de 1x1x1 (el divisor no se publica). ORIGEN: casillero en Miami. No hay tarifa por kg publicada desde Europa, China ni Argentina. Sin tarifa preferencial de libros. Retiro en Miraflores 1472 (Carrasco) y Gral. José Garibaldi 2222 (Cufré).

**Google:** `ChIJkUOFrTCBn5URtLU-g30vl0M` — "Glic" · **3,6 ★** (506 reseñas) · [ficha](https://www.google.com/maps/place/Glic/@-34.8915482,-56.0613646,17z/data=!3m1!4b1!4m6!3m5!1s0x959f8130ad854391:0x43972f7d833eb5b4!8m2!3d-34.8915482!4d-56.0613646!16s%2Fg%2F11fhw87zhq)

**Reddit:** muestra **thin** · neto **+40** sobre 9 opiniones

Glic aparece como uno de los couriers mejor considerados del sample de Reddit: la mayoría de los que lo usaron dicen que les llegó rápido y sin drama, y varios lo eligen por el descuento con Itaú frente a TiendaMía. La contracara es un caso detallado de 2024 en el que se le perdieron paquetes en el depósito de Miami y Glic no se hizo responsable. Muestra chica (9 opiniones reales de 38 menciones) y va en dirección contraria a las reseñas recientes de Google, así que no la usamos para levantar el puntaje.

> *"He traído cosas por glic y cero drama, lo que me di cuenta luego es que Amazon me cobra los impuestos de usa y tienda mía te los incluye en el precio."* — [r/uruguay, 2025-12-27](https://reddit.com/r/uruguay/comments/1px1v37/glic_vs_tienda_mia/) (positivo)

> *"Glic se lava las manos, los paquetes desaparecidos dentro de su predio ellos no se hacen responsables."* — [r/uruguay, 2024-02-11](https://reddit.com/r/uruguay/comments/1aoc873/glic_malas_prácticas_o_falta_de_seguridad/) (negativo)

> *"Mi pareja usa GLIC y esta contenta, aunque en el mismo r/uruguay vi que habían malas experiencias.."* — [r/uruguay, 2024-11-19](https://reddit.com/r/uruguay/comments/1guyf97/que_courier_recomiendan/) (mixto)

**Scores propuestos:** cumplimiento **38** · atención **30** · transparencia **25** · cobertura **55**

- *cumplimiento:* 506 reseñas de Google con un promedio engañoso: 264 de 5★ contra 131 de 1★. El promedio de 3,6 esconde que las 5★ son viejas (1 a 5 años) y que casi todo lo del último año es 1★, con clientes de años diciendo que el servicio se cayó. Los reclamos recientes se repiten y son concretos: faltantes en envíos consolidados (5 cámaras compradas / 2 entregadas; 4 artículos / 3 entregados; un paquete abierto con el producto cambiado por un rollo de papel de pared), cobro de peso que después no se envió, y paquetes marcados como entregados que nunca llegaron. Reddit (muestra fina, 9 opiniones) va para el otro lado y sugería 72, pero son 9 opiniones contra un registro de Google mucho más grande y más reciente: pesamos Google. No es 0 — hay reembolsos documentados y usuarios de años sin un solo problema.
- *atencion:* Es la falla más citada de todas. Las propias etiquetas de Google marcan 'teléfono' en 35 reseñas y 'mail' en 23. El patrón que se repite: no atienden el teléfono, contestan desde una casilla no-reply, semanas de silencio, comentarios restringidos en Instagram y 'el encargado' que nunca está. Reddit rescata que mandan foto del paquete cuando llega a Miami, y hay quien destaca la atención, pero el volumen de quejas por soporte es abrumador.
- *transparencia:* Puntaje bajo y ganado con evidencia de primera mano, no con reseñas. Verificamos sobre el motor de la propia calculadora: (1) el 'Total' se rompe en la rama de productos de China abajo de USD 200 — duplica el flete y no da la suma de sus propios renglones; (2) las dos cifras que Glic publica para el costo post-franquicia (60% + USD 30 + USD 25 en la FAQ vs. 22% del valor en la calculadora) se contradicen entre sí; (3) el div oculto de la página dice '22,99 USD el Kg' mientras el motor cobra 21,50; (4) el IVA es una línea que no responde a ninguna regla publicada. A eso se suman las reseñas de precio cotizado distinto del cobrado, el seguro y el Express sin precio publicado, y la franquicia consumida sin avisar.
- *cobertura:* Determinístico: sirve un solo origen de cuatro (Miami; no hay tarifa publicada desde Europa, China ni Argentina), entrega en el interior por +4,99, NO incluye seguro (es un extra pago sin precio publicado), no tiene tarifa de libros ni descuento de IVA. Lo que lo levanta: 60 días de depósito gratis (de lo mejor del mercado) y consolidación sin costo. Techo de 20 kg por envío.

**Banderas rojas:**

- Si comprás por MercadoLibre o Frávega con Glic como importador, te consumen una de tus 3 franquicias anuales A TU NOMBRE. Varios compradores dicen que nunca se les avisó — incluida una compra que ya habían cancelado y que Glic despachó igual. Un reseñador afirma que en Defensa al Consumidor le dijeron que así, sin ser explícito, no es legal. Es lo más importante que tenés que saber antes de usarlos.
- La calculadora no es confiable. Si marcás la opción de productos de China, abajo de USD 200 el 'Total en dólares' que te muestra NO es la suma de sus propios renglones: duplica el flete (1 kg / USD 100 → los renglones suman 53,03 y el Total dice 84,06). Lo probamos contra su propio motor el 12/07/2026. Arriba de USD 200 el bug desaparece.
- El botón de 'productos de China' SÍ cambia el precio: agrega una línea de 'Impuestos aduana' del 22% del valor declarado a CUALQUIER monto, incluso abajo de USD 200. Si cotizaste sin marcarlo y tu compra es de origen chino, te vas a llevar una sorpresa del 22% del valor de la compra.
- Las dos cifras que Glic publica para lo que pagás una vez quemadas las 3 franquicias se contradicen entre sí: la FAQ dice 60% del valor + USD 30 de terminal + USD 25 de despacho; la calculadora, en cambio, cobra 22% del valor declarado. No confíes en ninguna de las dos como costo real de importación.
- Faltantes en envíos consolidados: es la queja dominante y reciente, no un caso aislado. 5 cámaras compradas y 2 entregadas (más 20 tiradores de cocina que nunca pidió); 4 artículos de Amazon y llegaron 3; un paquete abierto con el producto cambiado por un rollo de papel de pared para mantener el peso. A un cliente le pesaron y cobraron cajas que después no enviaron.
- El precio cotizado no siempre es el que te cobran: 'Cuando fui a pagar el envío me figuraba un precio y después me cobraron mucho más' (reseña de ~ene-2026); otro reseñador dice que el costo final fue 50% más que la calculadora. Las disputas de peso se repiten y en una sucursal reportan que no hay balanza.
- El seguro es un extra pago cuyo precio NO está publicado, y Glic se desliga expresamente de todo si no lo contratás. Un cliente que SÍ aseguró dos notebooks (una llegó destrozada y de la otra Glic dijo que se la robaron) reporta que no le pagaron nada y no le contestaron nunca.
- La tendencia es para abajo y el promedio lo tapa: 264 reseñas de 5★ contra 131 de 1★. Las 5★ son de hace 1 a 5 años; casi todo lo del último año es 1★, y clientes de larga data dicen textual que 'el servicio ha decaído totalmente'. No leas ese 3,6 como 'regular pero estable'.
- La atención al cliente es la falla más citada: teléfono que no atienden (Google la marca en 35 reseñas), mails sin respuesta por semanas (23 reseñas), respuestas desde una casilla no-reply y un encargado que nunca está.
- Incidentes con datos personales: una clienta reporta que Glic le pasó TODOS sus datos personales a otro cliente al explicarle una entrega equivocada. Aparte, en un hilo de GameOver, Glic le pidió por mail a un usuario la contraseña de su cuenta de URSEC, después de haberle creado esa cuenta en VUCE con su cédula sin avisarle.
- Cambiaron la dirección del warehouse de Miami y el punto de retiro en Montevideo sin notificar a los clientes: hubo paquetes despachados a la dirección vieja y gente que viajó a la sucursal equivocada.
- El 'Glic Express' (2 a 5 días hábiles) no se vende por la calculadora y su recargo no está publicado en ningún lado. Reseñadores dicen que el reloj arranca recién con el vuelo y no con el pago, y que hubo demoras del doble de lo prometido, compensadas con un cupón de USD 5.

**A favor:** 
- Es la tarifa por kg más barata que encontramos en este segmento: 21,50/kg de base, y los kilos arriba del 8vo pagan 10,75. Si traés volumen, no hay con qué darle.
- 60 días de depósito gratis (después USD 10 por paquete por mes) y consolidación sin costo. En depósito gratis es de lo mejor del mercado.
- Publica una calculadora con tarifa plana: podés estimar el costo antes de comprar, cosa que los courier de cotización a pedido no te dan (con la salvedad de los bugs que listamos más abajo).
- Las promos con tarjeta Itaú lo abaratan bastante — es la razón que más repiten los que lo eligen, tanto en Google como en Reddit.
- Cuando funciona, funciona bien y rápido: hay clientes de años con decenas de paquetes sin un solo problema, y reportes de entrega en menos de una semana. En Reddit, las opiniones de fines de 2025 siguen siendo positivas.
- Es una empresa real y establecida, miembro de la Cámara Uruguaya de Couriers. No es un intermediario fantasma.
- Cuando reclamaste lo suficiente, a varios les terminaron reembolsando (las 3 cámaras faltantes, un paquete perdido antes de Navidad). No siempre es plata perdida — pero te va a costar semanas de insistir.

**En contra:** 
- Los faltantes en envíos consolidados son el reclamo repetido y reciente, no un accidente: paquetes que llegan incompletos, uno que llegó abierto con el producto reemplazado por un rollo de papel de pared, y cobros por peso que después no se envió.
- La atención al cliente es mala de forma sistemática: teléfono que no atienden, mails que no contestan por semanas, respuestas desde una casilla no-reply.
- Si comprás por MercadoLibre/Frávega con Glic, te queman una franquicia a tu nombre sin avisarte. Podés quedarte sin franquicia justo cuando la necesitás.
- El seguro se paga aparte, no publican el precio, y hay al menos un caso documentado de alguien que lo pagó y no cobró nada.
- Su propia calculadora tiene un bug aritmético en la rama de productos de China abajo de USD 200 (duplica el flete), y sus dos cifras publicadas de costo post-franquicia se contradicen. No podés confiar del todo en lo que te cotiza.
- El servicio se deterioró: las buenas reseñas son viejas y las malas son nuevas. Lo que leés de 2021 no es lo que vas a recibir en 2026.
- El Express no tiene precio publicado y hay reclamos de que no cumple el plazo que promete.
- Sin tarifa de libros, sin seguro incluido, y sin origen publicado fuera de Miami: si comprás en Europa o Asia, esto no te sirve.

**Para quién:** Para el que trae volumen (más de 5 kg) desde Estados Unidos, mira el precio antes que nada, tiene tarjeta Itaú y está dispuesto a bancarse el riesgo: es la tarifa por kg más barata del mercado. Conviene sobre todo para cosas de bajo valor o reemplazables, donde un faltante te arruina el día pero no el mes. NO lo uses para nada caro, frágil o irremplazable (notebooks, cámaras, equipos), ni si necesitás que alguien te atienda el teléfono cuando algo sale mal, ni si comprás por MercadoLibre y querés cuidar tus 3 franquicias anuales.

**Veredicto:** Glic es el caso más incómodo de esta lista: tiene la mejor tarifa y la peor tendencia. Los números son reales y los verificamos contra su propio motor de cotización — 21,50/kg de base, 15,05 entre el 3er y el 8vo kilo, 10,75 de ahí en adelante, con 5,99 de handling, 10% de tasa postal arriba y 60 días de depósito gratis. Traer 10 kg te sale 191,83 puerta a puerta. Nadie más te da eso.

El problema es qué comprás con ese ahorro. Las 506 reseñas de Google no son "3,6, regular": son 264 de cinco estrellas contra 131 de una, y esa división es TEMPORAL. Las buenas son de hace uno a cinco años; casi todo lo del último año es una estrella, y son clientes de años los que escriben que el servicio se derrumbó. Los reclamos recientes no son de humor, son de hechos: cámaras que faltan del consolidado, un paquete abierto con el producto cambiado por un rollo de papel de pared, peso cobrado y no enviado, precio cotizado distinto del cobrado. Y cuando algo sale mal, no hay nadie del otro lado: Google marca "teléfono" en 35 reseñas y "mail" en 23.

Hay dos cosas más que descubrimos nosotros y que no vas a ver en ninguna reseña. Primero, su calculadora está rota: si marcás productos de China, abajo de USD 200 el total que te muestra duplica el flete y no coincide con la suma de sus propios renglones. Segundo, ese mismo botón —que muchos ignoran— te agrega un 22% del valor declarado a cualquier monto. Si cotizaste sin marcarlo, tu presupuesto está mal. Sumale que las dos cifras que Glic publica para el costo una vez agotadas tus franquicias se contradicen entre sí, y que si comprás por MercadoLibre te consumen una franquicia a tu nombre sin decírtelo.

El trade-off es exactamente este: Glic es barato y a veces rapidísimo, pero estás aceptando un riesgo real de faltante y la certeza de que si eso pasa vas a estar solo. Reddit lo trata mejor que Google, pero son nueve opiniones contra quinientas reseñas más recientes, así que no lo usamos para subirle la nota. Traé cosas baratas y reemplazables. Lo caro, mandalo por otro lado.

**Gaps (resolver a mano):**

- Precio del 'Glic Express'. Está anunciado (2 a 5 días hábiles) pero no se vende por la calculadora y el recargo no aparece publicado en ningún lado. Un reseñador menciona 'los 10 usd creo que son por el envío express', pero es de oídas y no lo publicamos como tarifa.
- Precio del seguro. Confirmamos que existe como extra opcional, pero la tarifa (monto fijo o % del valor declarado) sólo se ve dentro de la cuenta logueada. Por eso insuranceIncluded = false y el costo queda en null.
- Tarifa preferencial de libros/CD/DVD. Glic no publica ninguna y no encontramos evidencia de que la ofrezca. Va en null en vez de asumir que no existe.
- Sobre qué se calcula la línea de 'IVA'. Reproduce perfecto como 5,06% de (flete neto + handling), consistente con un IVA de 22% sobre ~23% de la base, pero Glic nunca enuncia la regla: es una constante ajustada empíricamente, no una tasa publicada.
- Si los 21,50/kg son tarifa permanente o promoción. El div oculto de la propia página de la calculadora dice '22,99 USD el Kg' mientras el motor en vivo cobra 21,50. No pudimos determinar cuál está desactualizado.
- Qué se cobra realmente por entrega en el interior. La calculadora muestra un '+4,99' fijo, pero el departamento que elegís nunca se transmite al servidor (el JS lee un elemento #impuestos que no existe en la página, así que el campo viaja vacío). El +4,99 puede ser un texto decorativo y el cargo real aplicarse después. No lo pudimos confirmar.
- Divisor del peso volumétrico. La FAQ dice que aplica arriba de 1x1x1 pero nunca da el divisor (5000, 6000, etc.), así que el costo volumétrico no se puede calcular.
- Tarifa por kg desde China, Europa o Argentina. La calculadora tiene una opción de 'productos de China' que cobra un 22% de impuesto, pero eso es un impuesto sobre el origen de la mercadería, no un casillero en China: no hay tarifa de flete por kg publicada desde ningún origen que no sea Miami. Por eso originsPerKg.cn/.eu/.ar quedan en null.
- Dirección del warehouse de Miami y quién hace el reparto a domicilio en Uruguay. El perfil original afirmaba 'Opa Locka, 3860 NW 125th St' y que el reparto lo terciariza PLAZA CORREO; ninguna de las dos cosas aparece en las páginas de Glic que pudimos leer. Puede que estén detrás del login. No las publicamos.
- Frecuencia de vuelos desde Miami. El sitio sólo muestra un contador en vivo del próximo cierre ('Proximo vuelo a Uruguay cierra en 1 dias 17 horas'). No hay ninguna frecuencia semanal ni días de cierre publicados — el '2 vuelos por semana, martes y viernes' del perfil original no tiene fuente y lo descartamos.
- Si el punto de retiro de Carrasco (Miraflores 1472) sigue operativo. La FAQ lista Carrasco y Garibaldi, pero hay reseñas de gente que llegó a una sucursal listada y estaba cerrada o mudada, y los horarios de Google no coinciden con los del sitio.
- Fechas exactas de las reseñas de Google. Google sólo muestra antigüedad relativa ('hace un mes', 'hace 5 meses'); las fechas que citamos están calculadas desde el 12/07/2026 y tienen un margen de algunas semanas.
- No existe perfil de Trustpilot para Glic Uruguay. Toda la evidencia de reputación se apoya en Google, en el hilo de GameOver y en la muestra fina de Reddit.

**Fuentes:** [Calculadora de Glic (tarifa verificada 12/07/2026)](https://glicglobal.com/uy/calculadora.html) · [Endpoint de cotización de Glic (probado directamente)](https://glicglobal.com/uy/glicglobalgeneral/general/calculate/) · [FAQ Glic — Servicios y precios](https://glicglobal.com/uy/preguntas-frecuentes/servicios-y-precios.html) · [FAQ Glic — Impuestos y trámites (60% + USD 30 + USD 25)](https://glicglobal.com/uy/preguntas-frecuentes/impuestos-y-tramites.html) · [FAQ Glic — Métodos de envío (Standard 5-7 / Express 2-5)](https://glicglobal.com/uy/preguntas-frecuentes/metodos-de-envio.html) · [FAQ Glic — Paquetes (60 días de depósito, límite 20 kg)](https://glicglobal.com/uy/preguntas-frecuentes/paquetes.html) · [FAQ Glic — Devoluciones y reclamos](https://glicglobal.com/uy/preguntas-frecuentes/devoluciones-y-reclamos.html) · [Glic — Cómo funciona (3 a 10 días hábiles)](https://glicglobal.com/uy/como-funciona.html) · [Glic — Contacto (Miraflores 1472, tel. 2602 1174)](https://glicglobal.com/uy/contacto.html) · [Google Maps — Glic (3,6 con 506 reseñas, leído 12/07/2026)](https://www.google.com/maps/place/Glic/@-34.8915482,-56.0613646,17z/data=!3m1!4b1!4m6!3m5!1s0x959f8130ad854391:0x43972f7d833eb5b4!8m2!3d-34.8915482!4d-56.0613646!16s%2Fg%2F11fhw87zhq) · [GameOver Uruguay — hilo sobre Glic (contraseña de URSEC, suba de tarifas)](https://www.gameover.uy/archive/index.php/t-15980.html) · [InfoNegocios — Glic figura entre los miembros de la Cámara Uruguaya de Couriers](https://infonegocios.biz/amp/nota-principal/en-vez-de-facilitar-la-complican-couriers-ven-inviabilidad-en-compras-web-bajo-franquicia) · [Reddit r/uruguay — Glic vs Tienda Mía (dic-2025)](https://reddit.com/r/uruguay/comments/1px1v37/glic_vs_tienda_mia/) · [Reddit r/uruguay — Glic: malas prácticas o falta de seguridad (feb-2024)](https://reddit.com/r/uruguay/comments/1aoc873/glic_malas_prácticas_o_falta_de_seguridad/)

---

### Miami Box `miami-box` — Courier

> Barato y con años en la plaza, pero si algo sale mal no te atienden.

Casillero propio en Miami con local en Montevideo (Solano García 2476), operando desde 2001; solo origen EE.UU.

**Tarifa** (verificada 2026-07-12, [fuente](https://www.miami-box.com/calculadora)):

```json
{
 "quoteOnly": false,
 "tiers": [
  {
   "maxKg": 10,
   "perKg": 25.9,
   "flat": null
  },
  {
   "maxKg": 20,
   "perKg": 23.31,
   "flat": null
  },
  {
   "maxKg": 30,
   "perKg": 20.72,
   "flat": null
  },
  {
   "maxKg": null,
   "perKg": 18.13,
   "flat": null
  }
 ],
 "minChargeUsd": 16.5,
 "handlingUsd": 6,
 "handlingPlusIva": null,
 "tspuPct": 0,
 "clearanceUsd": null,
 "interiorUsd": 5,
 "booksPerKg": 9.9,
 "insuranceIncluded": null,
 "freeStorageDays": null,
 "originsPerKg": {
  "us": 25.9,
  "eu": null,
  "cn": null,
  "ar": null
 },
 "transit": "No prometen plazo en ningún lado de su sitio. La FAQ solo dice que Montevideo se entrega a partir del día hábil siguiente a que la carga sale del aeropuerto. El único número que circula (5 a 8 días) es de un blog de terceros (laondadigital, 2024-10-05), no de ellos."
}
```

**Letra chica:** OJO: Miami Box no publica NINGÚN tarifario. /precios, /tarifas y /servicios son URLs muertas que siguen en el índice de Google y caen en el home. El único precio visible es el de la calculadora, y estos números salen de leer su código (calcularCosto en el bundle main-AP2OQVQQ.js, verificado 2026-07-12; el nombre del archivo cambia en cada deploy).

EL PRECIO ES POR KG, NO POR TRAMO. Paquetes: USD 25,90/kg + USD 6 de manejo. Los 'tramos' de arriba son en realidad DESCUENTOS POR VOLUMEN sobre el flete (10% desde 10 kg, 20% desde 20 kg, 30% desde 30 kg): 23,31 / 20,72 / 18,13 son el precio por kg ya con el descuento aplicado. Peso mínimo facturable 0,4 kg y el peso se redondea PARA ARRIBA al siguiente 0,1 kg. Piso real de un paquete: USD 16,50 (no los USD 10 que anuncian en /sobre-nosotros — esos son solo la línea de flete, sin el manejo).

LIBROS/CD/DVD: USD 9,90/kg + USD 2,50 de manejo, mínimo USD 7, y explícitamente SIN descuento por volumen. Correspondencia: USD 9,90/kg, sin manejo, mínimo USD 4,50. Interior: +USD 5 (también como retiro en sucursal para Paysandú). Más de 30 kg: cotización a pedido.

LA COTIZACIÓN Y LA FACTURA NO DAN LO MISMO. En la calculadora pública el descuento se aplica SOLO al flete; en el checkout logueado se aplica a toda la base (flete + manejo + interior). Un paquete de 12 kg cotiza USD 285,80 y factura USD 285,12. Peor en el borde: la calculadora usa el peso REDONDEADO para los umbrales de 10 y 20 kg y el checkout usa el peso CRUDO — un paquete de 9,95 kg te lo cotizan con 10% de descuento y te lo facturan con 0%.

DESCUENTOS QUE NO PUBLICITAN: el sistema elige el MEJOR de tres y NO son acumulables — tarjeta BBVA (10%, o 15% con la opción BBVA_15), descuento SUITE (un % por usuario) y el descuento por kg (10/20/30%). O sea que un paquete de menos de 10 kg pagado con BBVA igual se lleva 10-15% off.

NO hay cargo de despacho comprobado: en el código hay una constante 'cargosAduana' de USD 3,58, pero no se muestra en la cotización ni se suma al total ni aparece en el circuito real de facturación. No la contamos como un costo. TSPU/URSEC: las palabras no existen ni en el sitio ni en el bundle y la calculadora no suma nada — pusimos 0% pero es NO VERIFICADO, no una exoneración confirmada. Tampoco aclaran si el manejo lleva IVA. Cuenta gratis: no cobran suscripción ni mantenimiento. Hay una 'tarifa de consolidación' mencionada en la FAQ cuyo monto no está publicado en ningún lado (solo dicen que se exonera por 2 vuelos).

**Google:** **SIN FICHA CONFIABLE — pinear a mano antes de publicar cualquier rating.**

**Reddit:** muestra **usable** · neto **-35** sobre 14 opiniones

Fama de barato pero poco confiable. Casi todos los elogios son por precio y son de 2022-2023; las dos opiniones más recientes (jul-2025 y abr-2026) son negativas, independientes entre sí, y las dos hablan de deterioro: un paquete perdido del que nunca se hicieron cargo y un 'hace ya unos años que no funciona bien'. El punto más flojo y más repetido es la atención: no contestan.

> *"Hagas lo que hagas no uses Miami box - a mi me perdieron un paquete entero y nunca se hicieron cargo, los contacte un millón de veces y nada, me ganaron por cansancio, pero se perdieron un cliente regular, y además se ganaron que cada vez que puedo los defenestro."* — [r/uruguay, 2025-07-27](https://reddit.com/r/uruguay/comments/1maxz1d/cuales_son_los_mejores_couriers_hoy_para_ustedes/n5i5f73/) (negativo)

> *"Por otro lado, intenten evitar miami box, hace ya unos años que no funciona bien."* — [r/Burises, 2026-04-03](https://reddit.com/r/Burises/comments/1sbd6wy/tutorial_básico_para_dejar_de_regalar_plata_en/oe33gi2/) (negativo)

> *"Ando mirando para traerme una voron 2.4 R2 de 300mm² pero gripper me pide un huevo, Miami box es de lo más barato que ví, los escucho."* — [r/uruguay, 2022-11-16](https://reddit.com/r/uruguay/comments/ywr02t/que_courrier_cobra_más_barato_para_importar/) (positivo)

**Scores propuestos:** cumplimiento **38** · atención **25** · transparencia **30** · cobertura **35**

- *cumplimiento:* Muestra usable de Reddit (14 opiniones, net -35) + Google 3,9/847. Lo malo es lo NUEVO: pérdida total de un paquete sin hacerse cargo (2025) y 'hace años que no funciona bien' (2026), contra un solo envío exitoso reportado (2023). Reseñas de Google suman paquetes aplastados y CDs rotos. Pesa también que su propia FAQ admite que despachan automáticamente sin tu aprobación pasados 2 vuelos.
- *atencion:* Es su peor dimensión y la más consistente: la única queja que aparece igual en 2019 y en 2025. 'Los contacté un millón de veces y nada, me ganaron por cansancio'. Ninguna opinión de Reddit rescata la atención. Las reseñas de Google separan claro: el mostrador es bueno, el teléfono y el mail no funcionan. Un tercero (laondadigital, 2024) también marca atención lenta vía formulario.
- *transparencia:* Evidencia dura, no opinión: no publican tarifario (las 3 URLs de precios están muertas), la calculadora y el checkout aplican el descuento distinto y no dan el mismo número (12 kg: 285,80 vs 285,12), el mínimo anunciado (USD 10) no es el real (USD 16,50), la FAQ y el pop-up del home se contradicen sobre la franquicia, y la 'tarifa de consolidación' existe pero su monto no está publicado. Reddit suma un antecedente viejo (2018-2020) de datos personales/spam post-escisión con USX, que tomamos como antecedente y no como estado actual.
- *cobertura:* Determinístico: un solo origen (EE.UU./Miami) de cuatro; sin tarifa publicada para Europa, China ni Argentina. Interior sí, pero +USD 5 y contra entrega en 'agencia central' (Punta del Este se retira en su local, no es puerta a puerta). Seguro: no publicado. Días de depósito gratis: no publicados. Suma la tarifa de libros (USD 9,90/kg) y la de correspondencia. No hay descuento de IVA.

**Banderas rojas:**

- No publican tarifario. /precios, /tarifas y /servicios son URLs muertas que siguen en Google y caen en el home. El único precio que podés ver es el que te tira la calculadora: no hay hoja de tarifas contra la cual chequear una factura.
- La cotización y la factura no dan lo mismo. La calculadora aplica el descuento solo al flete; el checkout logueado se lo aplica a toda la base. 12 kg cotiza USD 285,80 y factura USD 285,12. En el borde es peor: un paquete de 9,95 kg se cotiza con 10% de descuento y se factura con 0%, porque la calculadora mira el peso redondeado y el sistema el peso crudo.
- Te pueden despachar el paquete sin tu aprobación. Su propia FAQ: desde que entra el primer paquete 'se exoneran 2 vuelos y viaja automáticamente'; a partir del tercero 'el envío se programa automáticamente para el próximo vuelo'. Una reseña de Google lo confirma del otro lado: 'a veces envían paquetes sin la aprobación del cliente'.
- No publican seguro ni política de reclamos, y hay un caso concreto en Reddit (2025) de paquete perdido entero sin hacerse cargo. Reseñas de Google también reportan cajas aplastadas y CDs rotos, sin compensación mencionada.
- El mínimo que anuncian no es el mínimo real. /sobre-nosotros dice 'costo mínimo de USD 10' para menos de 400 g, pero eso es solo la línea de flete: el piso real de un paquete es USD 16,50 una vez que suman los USD 6 de manejo.
- Su propio sitio se contradice sobre la franquicia: la FAQ todavía describe el régimen viejo (3 × USD 200 / 20 kg) mientras el pop-up del home anuncia el nuevo (USD 800 repartidos en hasta 3 envíos al año, vigente desde el 2026-05-01). Si leés la FAQ te llevás el número equivocado.
- Hay una 'tarifa de consolidación' en la FAQ cuyo monto no está publicado en ningún lado. Solo dicen que se exonera durante los primeros 2 vuelos.
- No comprometen plazo de entrega en ninguna parte de su sitio. El '5 a 8 días' que circula es de un blog de terceros, no de ellos.
- El interior no es puerta a puerta: cuesta +USD 5 y se entrega a una 'agencia central'; Punta del Este se despacha con el interior y hay que retirarlo en su local. Interior y Carrasco además se pagan ANTES de que el paquete viaje.
- Si Aduana te retiene el paquete, quedás solo. Una reseña lo resume: 'Cobrar el flete y darle un papelito al cliente para que se arregle como pueda en aduana no está bueno'.
- El ingreso de paquetes es manual y puede demorar: 'una vez que llegan a nuestra oficina pueden tardar hasta 24 horas en reflejarse en tu cuenta'.

**A favor:** 
- Uno de los precios por kg más bajos de la plaza para origen EE.UU.: USD 25,90/kg, y con descuento por volumen baja a 23,31 (10 kg), 20,72 (20 kg) y 18,13 (30 kg). Es lo único que la gente les reconoce en Reddit: 'Miami box es de lo más barato que ví'.
- Tarifa especial de libros/CD/DVD: USD 9,90/kg + USD 2,50 de manejo (mínimo USD 7). Correspondencia USD 9,90/kg sin manejo (mínimo USD 4,50); varios reportan que documentos y sobres llegan rápido.
- Descuento de 10% pagando con tarjeta BBVA (15% con la opción BBVA_15) que ni siquiera publicitan, y que NO exige volumen: sirve incluso para un paquete chico.
- Cuenta gratis: no cobran suscripción, alta ni mantenimiento.
- Operador viejo y con local físico (desde 2001, Solano García 2476, Montevideo). La atención en el mostrador es lo mejor puntuado: gente amable y dispuesta a ayudarte con el papeleo.

**En contra:** 
- La atención es su punto más flojo y el más repetido: teléfono y mail no contestan. 'Los contacté un millón de veces y nada, me ganaron por cansancio' (Reddit, 2025). El mostrador es bueno; todo lo demás, no.
- Lo negativo es lo reciente. Las dos opiniones más nuevas de Reddit (jul-2025 y abr-2026) son negativas, independientes entre sí, y las dos describen deterioro. No es un rant viejo.
- No publican seguro, ni tope de cobertura, ni proceso de reclamo. Hay un caso documentado de paquete perdido sin ninguna compensación.
- Cero transparencia de precios: no hay tarifario, y el número que te da la calculadora no es el que te factura el sistema.
- Solo tienen tarifa para EE.UU. Para Europa, China o Argentina no publican precio por kg (aunque su aviso aduanero implica que manejan otros orígenes con 22% de IVA).
- No publican días de depósito gratis, así que no sabés cuánto puede quedarse tu paquete en Miami sin costo.
- Reseñas repetidas de paquetes que llegan aplastados o con las cajas rotas.
- Si Aduana te retiene la compra, te cobran el flete igual y te arreglás solo.

**Para quién:** El que compra en EE.UU., prioriza el precio por encima de todo y se banca el riesgo: sobre todo si manda volumen (10 kg o más), si trae libros/CDs/DVDs, o si paga con tarjeta BBVA (10-15% off sin importar el peso). No es para el que necesita seguro, plazo comprometido o que alguien le conteste el teléfono cuando algo sale mal.

**Veredicto:** Miami Box es la opción barata y el trade-off está clarísimo: pagás menos por kg que casi cualquier otro, y a cambio no tenés tarifario, no tenés seguro, no tenés plazo prometido y no tenés a quién llamar. El precio es real (USD 25,90/kg + USD 6 de manejo, bajando a USD 18,13/kg desde los 30 kg, y libros a USD 9,90/kg), pero tuvimos que leerlo del código de su propia calculadora porque no lo publican en ningún lado: las tres URLs de precios que Google todavía indexa están muertas. Peor: ese precio no es el que te van a facturar. La calculadora pública aplica el descuento solo al flete y el checkout logueado se lo aplica a toda la base, así que cotización y factura no dan lo mismo (12 kg: 285,80 contra 285,12), y en el límite de 10 kg te cotizan con descuento y te facturan sin él. Del otro lado, el descuento de tarjeta BBVA (10-15%, sin mínimo de peso) tampoco lo publicitan: es plata que ganás solo si ya lo sabías. La reputación no ayuda: 3,9 en Google sobre 847 reseñas y un saldo claramente negativo en Reddit (net −35 sobre 14 opiniones), donde todos los elogios son de 2022-2023 y son por precio, mientras que las dos opiniones más recientes —2025 y 2026, independientes entre sí— hablan de deterioro, de un paquete perdido del que nunca se hicieron cargo y de años funcionando mal. La atención es lo que más golpean: el mostrador lo elogian, el teléfono y el mail no existen. Y su propia FAQ admite que, pasados dos vuelos, te despachan el paquete solos, sin preguntarte. Traducción: si tu compra sale bien, ahorraste; si sale mal, estás solo. Elegilo con los ojos abiertos y no le mandes nada que no puedas darte el lujo de perder.

**Gaps (resolver a mano):**

- place_id (formato ChIJ...) no se pudo obtener: solo tenemos el feature id de Google 0x959f813949b3f431:0xb287a7aad6f1d6ec y su CID 12864435212799563500. Por eso google.trustworthy queda en false y NO publicamos el bloque de Google hasta fijar el place_id a mano (la identidad del listado sí está confirmada: 'Miami-Box, Solano García 2476, 11300 Montevideo', tel 2716 2222, miami-box.com).
- clearanceUsd = null. El código tiene una constante 'cargosAduana' de USD 3,58, pero el token aparece UNA sola vez en todo el bundle, no se muestra en la cotización, no se suma al total y no existe en el circuito real de facturación. No sabemos si Miami Box cobra algún cargo de despacho: hay que preguntárselo.
- tspuPct = 0 es NO VERIFICADO, no una exoneración confirmada. Las palabras TSPU y URSEC no aparecen ni en el sitio ni en el bundle, y la calculadora no suma ningún recargo. Falta confirmar si está bundleado dentro de los USD 25,90/kg o si simplemente no aplica.
- insuranceIncluded = null: no publican seguro, ni tope, ni proceso de reclamo, en ningún lado.
- freeStorageDays = null: no publican cuántos días de depósito gratis tenés en Miami.
- Monto de la 'tarifa de consolidación'. La FAQ la nombra y dice que se exonera por 2 vuelos, pero nunca dice cuánto cuesta.
- handlingPlusIva = null: no aclaran si los USD 6 de manejo se cobran con IVA o ya lo incluyen.
- Tarifas por kg para Europa, China y Argentina. Solo publican origen EE.UU.; su aviso aduanero menciona paquetes fuera de USA (22% IVA), lo que implica que los manejan, pero no hay precio.
- Plazo de tránsito real. No lo comprometen en ningún lado; el 5-8 días es de un blog de terceros (2024) y no está confirmado por ellos.
- Porcentaje del descuento SUITE: existe en el código como un valor por usuario (DESCUENTO_ACTIVO), pero no está publicado y no sabemos quién califica.
- Tarifa real por encima de 30 kg: la calculadora extrapola 30% de descuento (USD 18,13/kg) pero el sitio dice que arriba de 30 kg hay que pedir cotización. El cuarto tramo puede no ser lo que te cobren.
- El tarifario se leyó del bundle main-AP2OQVQQ.js, cuyo nombre cambia en cada deploy. Hay que re-derivarlo desde /calculadora en el próximo refresh.

**Fuentes:** [Calculadora de costos (única fuente pública de precios)](https://www.miami-box.com/calculadora) · [Código de la calculadora — calcularCosto() y descuentos (bundle, hash cambia en cada deploy)](https://www.miami-box.com/main-AP2OQVQQ.js) · [Sobre nosotros — mínimo 400 g, +USD 5 interior, cuenta gratis, +30 kg a cotizar](https://www.miami-box.com/sobre-nosotros) · [Preguntas frecuentes — consolidación, auto-despacho, ingreso manual 24 h, franquicia (versión vieja)](https://www.miami-box.com/preguntas-frecuentes) · [Home + banner aduanero (nuevo régimen desde 2026-05-01)](https://www.miami-box.com/) · [Ficha de Google Maps (CID 12864435212799563500) — 3,9 ★ / 847 reseñas, leída 2026-07-12](https://www.google.com/maps?cid=12864435212799563500) · [Reddit — 'me perdieron un paquete entero y nunca se hicieron cargo' (2025-07-27)](https://reddit.com/r/uruguay/comments/1maxz1d/cuales_son_los_mejores_couriers_hoy_para_ustedes/n5i5f73/) · [Reddit — 'intenten evitar miami box, hace ya unos años que no funciona bien' (2026-04-03)](https://reddit.com/r/Burises/comments/1sbd6wy/tutorial_básico_para_dejar_de_regalar_plata_en/oe33gi2/) · [Reddit — 'Miami box es de lo más barato que ví' (2022-11-16)](https://reddit.com/r/uruguay/comments/ywr02t/que_courrier_cobra_más_barato_para_importar/) · [Reseñas de Google espejadas (sin fecha) — servicio decaído, paquetes aplastados, atención telefónica](https://yorugupino.com/servicio-de-mensajeria/montevideo/miami-box/) · [La Onda Digital (2024-10-05) — estimación de 5-8 días y atención lenta](https://www.laondadigital.uy/mejores-couriers-en-uruguay-para-comprar-en-china/) · [Régimen simplificado / franquicia — VUCE](https://vuce.gub.uy/pars/)

---

### EXUR Envíos `exur` — Courier

> Barato, rápido y querido — hasta que se pierde un paquete.

Courier uruguayo con casilla propia en Miami (y depósitos en NY/NJ/MA), 2 vuelos semanales, tarifa POR LIBRA vía calculadora web. Solo EE.UU.

**Tarifa** (verificada 2026-07-12, [fuente](https://www.exurenvios.com/Calculadora.aspx)):

```json
{
 "quoteOnly": false,
 "tiers": [
  {
   "maxKg": 0.4536,
   "flat": 18
  },
  {
   "maxKg": 0.9072,
   "flat": 26
  },
  {
   "maxKg": 1.3608,
   "flat": 34
  },
  {
   "maxKg": 1.8144,
   "flat": 42
  },
  {
   "maxKg": 2.268,
   "flat": 50
  },
  {
   "maxKg": 2.7216,
   "flat": 58
  },
  {
   "maxKg": 3.1751,
   "flat": 66
  },
  {
   "maxKg": 3.6287,
   "flat": 74
  },
  {
   "maxKg": 4.0823,
   "flat": 82
  },
  {
   "maxKg": 4.5359,
   "flat": 90
  },
  {
   "maxKg": 4.9895,
   "flat": 98
  },
  {
   "maxKg": 5.4431,
   "flat": 106
  },
  {
   "maxKg": 5.8967,
   "flat": 114
  },
  {
   "maxKg": 6.3503,
   "flat": 122
  },
  {
   "maxKg": 6.8039,
   "flat": 128
  },
  {
   "maxKg": 7.2575,
   "flat": 128
  },
  {
   "maxKg": 7.7111,
   "flat": 136
  },
  {
   "maxKg": 8.1647,
   "flat": 144
  },
  {
   "maxKg": 8.6183,
   "flat": 152
  },
  {
   "maxKg": 9.0718,
   "flat": 160
  },
  {
   "maxKg": 9.5254,
   "flat": 168
  },
  {
   "maxKg": 9.979,
   "flat": 176
  },
  {
   "maxKg": 10.4326,
   "flat": 184
  },
  {
   "maxKg": 10.8862,
   "flat": 192
  },
  {
   "maxKg": 11.3398,
   "flat": 200
  },
  {
   "maxKg": 11.7934,
   "flat": 208
  },
  {
   "maxKg": 12.247,
   "flat": 210
  },
  {
   "maxKg": 12.7006,
   "flat": 210
  },
  {
   "maxKg": 13.1542,
   "flat": 210
  },
  {
   "maxKg": 13.6078,
   "flat": 210
  },
  {
   "maxKg": 14.0614,
   "flat": 217
  },
  {
   "maxKg": 14.515,
   "flat": 224
  },
  {
   "maxKg": 14.9685,
   "flat": 231
  },
  {
   "maxKg": 15.4221,
   "flat": 238
  },
  {
   "maxKg": 15.8757,
   "flat": 245
  },
  {
   "maxKg": 16.3293,
   "flat": 252
  },
  {
   "maxKg": 16.7829,
   "flat": 259
  },
  {
   "maxKg": 17.2365,
   "flat": 266
  },
  {
   "maxKg": 17.6901,
   "flat": 273
  },
  {
   "maxKg": 18.1437,
   "flat": 280
  },
  {
   "maxKg": 18.5973,
   "flat": 287
  },
  {
   "maxKg": 19.0509,
   "flat": 294
  },
  {
   "maxKg": 19.5045,
   "flat": 301
  },
  {
   "maxKg": 19.9581,
   "flat": 308
  }
 ],
 "minChargeUsd": 18,
 "handlingUsd": 0,
 "handlingPlusIva": null,
 "tspuPct": 0,
 "clearanceUsd": null,
 "interiorUsd": null,
 "booksPerKg": 13.23,
 "insuranceIncluded": false,
 "freeStorageDays": null,
 "originsPerKg": {
  "us": null,
  "eu": null,
  "cn": null,
  "ar": null
 },
 "transit": "No publicado. EXUR no compromete ningún plazo en su web. Usuarios y foro reportan 2 vuelos semanales desde Miami y entregas de ~6–8 días cuando todo fluye; en diciembre hay atrasos de hasta 2 semanas por falta de espacio."
}
```

**Letra chica:** EXUR COBRA POR LIBRA, NO POR KILO. Si ponés el peso en kg, la calculadora redondea HACIA ARRIBA a la libra entera siguiente: 0,46 kg ya te cobra 2 libras. Los tramos de arriba son esa lógica exacta (verificada contra ~70 cotizaciones reales de la calculadora, sin un solo desvío). La fórmula real: 1 lb = USD 18 (mínimo); de 2 a 14 lb = USD 10 + 8 por libra; de 15 a 26 lb = USD 8/lb con mínimo de 16 lb (15 y 16 lb salen lo mismo: 128); de 27 a 44 lb = USD 7/lb con mínimo de 30 lb (27, 28, 29 y 30 lb salen todos 210). Arriba de 20 kg salís del Decreto 336/2015: necesitás Despachante y cotización a mano, sin precio publicado.

NO PONEMOS PRECIO POR KG A PROPÓSITO. El 'USD 17,64/kg' que circula es solo la tarifa MARGINAL (USD 8/lb) convertida, no lo que pagás. Usá los tramos.

EL FEE DE AGENCIA NO ES USD 4 FIJO — Y TE LO COBRAN DOS VECES. Retirar en La Isla Mini Market (Maldonado) suma un 'Costo Servicio de Agencia' de USD 4 hasta 10 lb, USD 6 a las 20 lb y USD 8 a las 44 lb (escala con el peso), pero además ya viene metido dentro del 'Costo de Envío', así que el Total a Pagar que te muestra EXUR sube el DOBLE: 5 lb = USD 58 en La Isla contra USD 50 en Río Branco (+8, no +4); 20 lb = 172 vs 160 (+12); 44 lb = 324 vs 308 (+16). Los otros cuatro puntos de retiro (Río Branco, Ejido, Districamp Parque Miramar, Poolvet Tacuarembó) sí son 0.

IMPUESTOS, SEGÚN SU PROPIA CALCULADORA: con franquicia y compra en EE.UU., factura hasta USD 200 → 0. Factura de USD 201 a 800 → te cobra IVA 22% sobre TODA la factura (factura 500 → 110), aunque siga diciendo 'Utilizando Franquicia'. Arriba de USD 800 → fuera del régimen, Despachante. Si elegís 'Pagando 60% del valor factura', el MÍNIMO REAL es USD 20 por envío, no los USD 10 que dice su página de Normativa (esa página está desactualizada y la contradice su propia calculadora: factura de 1, 5, 10, 20 o 33 dólares → siempre 20; el 60% recién manda arriba de ~USD 33).

COMPRAR EN TIENDA FUERA DE EE.UU. TE SALE MÁS CARO: perdés la exoneración y te clavan IVA 22% aunque la factura sea de USD 150, y los T&C te trasladan cargos extra de 'Import Duty / Delivery Collect' que no cuantifican en ningún lado.

LIBROS, CD Y DVD: USD 6 por libra, lineal, sin primera libra recargada y sin mínimo (1 lb = 6, 20 lb = 120) ≈ USD 13,23/kg. Exentos hasta USD 1.000 y NO cuentan contra las 3 franquicias del año. Es de lo más barato de plaza para ese rubro.

NO HAY LÍNEA DE HANDLING NI DE DESPACHO: el fee está embebido en la primera libra (USD 18). Tampoco aparece la tasa TSPU/URSEC del 10% en el desglose (no pudimos confirmar si está embebida o si no la cobran). La línea 'Sobrecargo por Combustible' EXISTE y hoy devuelve 0,00 — es una palanca que pueden prender sin tocar la tarifa.

ALMACENAJE: no publican ni días libres ni tarifa de depósito. Los '365 días' que se repiten por ahí NO son una promesa: son la cláusula de ABANDONO de los T&C (te la quedan ellos al año en Miami y a los 6 MESES en Uruguay, 'como compensación a los gastos de depósito', y encima seguís debiendo el flete). En la práctica hay usuarios con 4 meses guardados sin cargo extra, pero no hay nada escrito.

SOLO EE.UU. No hay servicio desde Europa, China ni Argentina.

**Google:** `ChIJ7Tum6SyAn5UR96ttPgp1nr0` — "Exur Envíos" · **4,4 ★** (1028 reseñas) · [ficha](https://www.google.com/maps/place/?q=place_id:ChIJ7Tum6SyAn5UR96ttPgp1nr0)

**Reddit:** muestra **usable** · neto **+60** sobre 20 opiniones

De los couriers mejor parados en Reddit: la mayoría son usuarios de años que dicen no haber tenido problemas, valoran que saquen fotos de los paquetes y la velocidad. El pero recurrente es el precio (varios avisan que es más caro que el resto, aunque otros lo recomiendan justamente para ahorrar frente a TiendaMia). Ojo con el sesgo: casi todas las menciones aparecen dentro de hilos donde se critica a OTRA empresa, así que el elogio viene medio de rebote — no hay hilos de experiencia propia con EXUR.

> *"Se que usx es bien recomendado, siempre use EXUR sin problemas y bastante rapido"* — [r/uruguay, 2025-07-27](https://reddit.com/r/uruguay/comments/1maxz1d/cuales_son_los_mejores_couriers_hoy_para_ustedes/n5if427/) (positivo)

> *"Solo una vez traje un pedido con exur y si bien el servicio fue excelente, la tarifa esta bastante mas cara."* — [r/uruguay, 2023-11-14](https://reddit.com/r/uruguay/comments/17vd9bq/opiniones_de_couriers/) (mixto)

> *"Exur, pero no te recomiendo porque me lo trajeron a regañadientes, llamá a los courier, hay pila, capaz en otros sean más flexibles.."* — [r/Burises, 2024-03-07](https://reddit.com/r/Burises/comments/1b8t4se/aduana_prohíbe_juguetes_sexuales_desde_fines_de/ktrv4ze/) (negativo)

**Scores propuestos:** cumplimiento **62** · atención **50** · transparencia **33** · cobertura **38**

- *cumplimiento:* Base sólida: 4,4/5 sobre 1.028 reseñas de Google (ficha confirmada como la de esta empresa; el histograma suma exactamente 1.028 y da media 4,40) y muestra usable de Reddit con 20 opiniones reales y net +60, donde usuarios de años reportan envíos rápidos y sin problemas. Pero el perfil es bimodal y el techo lo pone la cola: el reclamo dominante y MÁS RECIENTE (junio, marzo, febrero y enero de 2026) es paquete que USPS/Amazon/eBay marcan como entregado en la casilla de Miami y EXUR dice no haber recibido, sin compensación; más un antecedente de falla masiva (AliExpress, abril–agosto 2022) y reportes fechados de cobro por peso mayor al real (2021, 2024, 2025). Entrega bien la mayoría de las veces; cuando falla, no responde. De ahí 62 y no los 85 que sugería Reddit.
- *atencion:* Evidencia suficiente en ambos lados. A favor: atención presencial y telefónica bien valorada por buena parte de la base (reseñas 5★) y en Reddit lo describen como 'el Courrier que tiene todos los piques' para trámites de aduana. En contra, y es el patrón que pesa: atención hostil CUANDO HAY UN PROBLEMA, reportada de forma consistente de 2017 a 2026 ('te hablan de malos modos', teléfono que no atiende, reclamos ignorados), canal ágil solo por WhatsApp, y casos de retención en aduana donde no ofrecieron ninguna alternativa. Atienden bien mientras no tengas que reclamar.
- *transparencia:* Su punto más flojo, y con evidencia documental dura. No existe NINGUNA tabla de tarifas publicada: el único precio obtenible sale de una calculadora, y sus propios T&C dicen que 'toda información que EXUR publique solo tiene carácter informativo y no vinculante'. La página de Normativa publica un mínimo de USD 10 que su propia calculadora contradice (el real es 20). El fee de agencia de La Isla se cobra dos veces dentro del Total a Pagar que ellos mismos muestran. La cotización a domicilio está ROTA (18 departamentos, cero ciudades en el desplegable; Montevideo ni figura). No publican plazo de tránsito, ni política de almacenaje, ni monto de indemnización. Y hay ≥3 reportes fechados de sobrepeso facturado sin balanza en el mostrador para verificarlo. Suma a favor, y por eso no es menos: la calculadora sí desglosa flete, agencia, combustible e impuestos antes de comprar.
- *cobertura:* Determinístico y corto: un solo origen de cuatro (EE.UU.; nada de Europa, China ni Argentina), SIN seguro ni valor declarado (la palabra 'seguro' no aparece en sus T&C), entrega al interior/domicilio SIN precio publicado y sin forma de cotizarla, sin descuento de IVA, y almacenaje sin política publicada (solo una cláusula de abandono). Lo único que suma de verdad es la tarifa de libros/CD/DVD a USD 6/lb, exenta y sin contar contra las franquicias — de lo mejor del mercado en ese rubro. También suman los 4 puntos de retiro sin cargo (Montevideo x2, Parque Miramar y Tacuarembó).

**Banderas rojas:**

- PÉRDIDA DE PAQUETES SIN COMPENSACIÓN — es el reclamo dominante y sigue vivo en 2026: hay reseñas de junio, marzo, febrero y enero de 2026 de paquetes que USPS/Amazon/eBay marcan como ENTREGADOS en la dirección de Miami de EXUR y que EXUR declara no haber recibido, sin hacerse cargo. Un cliente de 10 años reporta USD 500 perdidos.
- NO OFRECEN SEGURO NI VALOR DECLARADO. La palabra 'seguro' no aparece en ningún lado de sus T&C. La única cláusula de responsabilidad dice que la pérdida o daño 'se rige por los Convenios Internacionales', sin nombrar cuál y sin fijar ningún tope ni monto. Traducido: no sabés cuánto te devuelven, y las reseñas sugieren que poco o nada.
- TRAMPA ESTRUCTURAL DE AGENTE DE CARGA, que EXUR NO te avisa: una vez que Amazon/USPS marca 'entregado' en la casilla de EXUR, el vendedor y el correo dejan de aceptar reclamos. Si EXUR además no registra el paquete, quedás sin recurso ante NADIE. Varios usuarios reportan que Amazon ya reconoce la dirección de EXUR y dejó de reembolsar.
- TE PUEDEN COBRAR POR UN PESO MAYOR AL REAL y no tenés cómo verificarlo: no hay balanza de comprobación en el mostrador. Reportado en 2021, 2024 y 2025, más casos de peso/cargo extra que aparece recién al retirar y no figuraba al cerrar el consolidado.
- EL FEE DE AGENCIA DE LA ISLA MINI MARKET (MALDONADO) TE LO COBRAN DOS VECES: la calculadora lo lista como USD 4, pero ya viene embebido en el 'Costo de Envío', así que el Total a Pagar sube el doble (5 lb: USD 58 contra USD 50 en Río Branco). Y escala con el peso: 4 hasta 10 lb, 6 a las 20 lb, 8 a las 44 lb. Retirá en Río Branco, Ejido, Districamp o Poolvet, que son 0.
- NO HAY TABLA DE TARIFAS PUBLICADA. El único precio obtenible es el que devuelve su calculadora, y sus propios T&C dicen que 'toda información que EXUR publique solo tiene carácter informativo y no vinculante' — o sea, se reservan el derecho de no respetar el precio que te mostraron.
- SU PÁGINA DE NORMATIVA ESTÁ DESACTUALIZADA Y TE SUBESTIMA EL MÍNIMO: dice 'mínimo de 10 dólares por envío' para el régimen del 60%, pero su propia calculadora cobra USD 20 de piso en toda factura por debajo de ~USD 33. El mínimo real es 20.
- LA ENTREGA A DOMICILIO / AL INTERIOR NO TIENE PRECIO Y NO SE PUEDE COTIZAR: la opción 'Enviar a domicilio' de la calculadora está rota — ofrece 18 departamentos y en TODOS el desplegable de ciudad devuelve cero opciones (Montevideo ni siquiera aparece en la lista). El flete al interior se cobra por fuera (reportado como DAC facturado aparte). Presupuestalo como costo desconocido.
- DAÑO CAUSADO POR SU PROPIO REEMPAQUE, negado: a un cliente de ~250 envíos le sacaron las 7 cajas a 15 discos de vinilo, los metieron sueltos en una bolsa y se arruinaron varios; culparon a la aerolínea y le ofrecieron firmar por un monto bastante menor al daño.
- ATENCIÓN HOSTIL CUANDO HAY UN PROBLEMA: reportes consistentes de 2017 a 2026 de malos modos, teléfono que no atiende y reclamos ignorados. El único canal ágil es WhatsApp.
- ANTECEDENTE DE FALLA MASIVA: entre abril y agosto de 2022 perdieron los paquetes de AliExpress de múltiples clientes sin resolución (pérdidas individuales reportadas de USD 360–400).
- COMPRAR EN TIENDA FUERA DE EE.UU. TE HACE PERDER LA EXONERACIÓN: IVA 22% aunque la factura sea de USD 150, más cargos de 'Import Duty / Delivery Collect' que los T&C te trasladan sin cuantificar.
- ARRIBA DE 20 KG O DE USD 800 DE FACTURA NO HAY PRECIO: salís del Decreto 336/2015 y necesitás Despachante de Aduana con cotización a mano. Cotizá ANTES de comprar.
- NO PUBLICAN PLAZO DE TRÁNSITO, así que no hay contra qué medir un atraso ni a qué agarrarse para reclamar.
- La ficha de Google NO está reclamada por la empresa, y existe una segunda ficha (Ejido 1008, 4,5 con 15 reseñas) que no hay que confundir con la principal (Río Branco 1377, 4,4 con 1.028).

**A favor:** 
- Barato en paquetes chicos y medianos: 1ª libra USD 18 y USD 8 por libra adicional, sin fee de handling ni de despacho aparte, y sin tasa TSPU del 10% en el desglose.
- Libros, CD y DVD a USD 6 la libra (≈ USD 13,23/kg), lineales y sin mínimo, exentos de impuesto hasta USD 1.000 y sin gastar ninguna de tus 3 franquicias del año. Para ese rubro es de lo mejor de plaza.
- Rápido cuando todo fluye: 2 vuelos semanales desde Miami y ~6–8 días según usuarios y foro.
- La calculadora es precisa al centavo para retiro en agencia: te muestra flete, fee de agencia, combustible e impuestos antes de que compres (algo que varios competidores no hacen).
- No cobran por consolidar y, en la práctica, tampoco por guardar: hay usuarios con 4 meses de mercadería depositada sin cargo extra.
- Fotografían el paquete al llegar a Miami: te da trazabilidad antes de que vuele.
- Reputación de años en Reddit (net +60 sobre 20 opiniones reales): gente que lo usa hace años sin problemas.
- 4 puntos de retiro sin costo: Río Branco y Ejido en Montevideo, Districamp Parque Miramar y Poolvet Tacuarembó.

**En contra:** 
- Si se pierde tu paquete, te lo comés. Es el reclamo dominante y el más reciente (varios casos en 2026): USPS/Amazon marcan 'entregado' en su casilla de Miami, EXUR dice que no le llegó y no se hace cargo.
- No hay seguro ni valor declarado, y los T&C no fijan ningún tope de indemnización: no sabés cuánto te devolverían.
- Como es agente de carga, cuando Amazon o eBay marca 'entregado' en su dirección, el vendedor y el correo dejan de aceptarte reclamos. Si EXUR tampoco lo registró, no tenés a quién reclamarle. Y no te lo avisan.
- Hay reportes fechados de cobro por peso mayor al real, sin balanza en el mostrador para verificarlo.
- Cuando hay un problema, la atención se pone hostil: malos modos, teléfono que no atiende, reclamos sin respuesta.
- No hay tabla de tarifas publicada, y sus T&C aclaran que lo que publican 'no es vinculante'.
- La entrega a domicilio o al interior no se puede ni cotizar: la calculadora está rota y el flete se cobra por fuera.
- Solo trae de EE.UU. Si comprás en tienda europea o china, perdés la exoneración y te cae IVA 22% más cargos no cuantificados.
- Arriba de 20 kg o de USD 800 de factura no hay precio: necesitás Despachante.
- En diciembre se atrasa: consolidados que no vuelan por falta de espacio y llegan hasta 2 semanas tarde.

**Para quién:** El que trae libros, CD o DVD (USD 6/lb, exentos y sin gastar franquicia: no hay mucho mejor en plaza) y el que trae paquetes chicos o medianos de EE.UU., de bajo valor, que puede retirar en Montevideo y a quien no le arruinaría el mes que el paquete no aparezca. Si lo que traés vale más de lo que estás dispuesto a perder, andá a un courier que ofrezca seguro.

**Veredicto:** EXUR es la definición del courier bimodal, y el 4,4 promedio sobre 1.028 reseñas te esconde el problema. Mientras nada salga mal es de lo mejor de plaza: barato de verdad en paquetes chicos (USD 18 la primera libra, 8 cada adicional, sin handling ni despacho ni tasa del 10% aparte), 2 vuelos por semana, no te cobran por consolidar ni por guardar, te sacan foto del paquete en Miami, y la tarifa de libros/CD/DVD a USD 6 la libra —exenta y sin gastar franquicia— no la iguala casi nadie. Reddit lo respalda: 20 opiniones reales, net +60, gente que lo usa hace años sin dramas. El problema es la cola. El reclamo dominante en Google, y el MÁS RECIENTE (junio, marzo, febrero y enero de 2026), es siempre el mismo: USPS o Amazon marcan el paquete como entregado en la casilla de Miami de EXUR, EXUR dice que nunca lo recibió, y no se hace cargo de nada. No ofrecen seguro —la palabra ni aparece en sus T&C— y la única cláusula de responsabilidad remite a 'los Convenios Internacionales' sin nombrar cuál ni fijar un peso de indemnización. Peor: como operan de agente de carga, una vez que el vendedor ve 'entregado', dejás de tener reclamo contra Amazon, contra eBay y contra el correo también. Quedás sin nadie, y eso no te lo advierten en ningún lado. Sumale que no publican tabla de tarifas (solo una calculadora, y sus T&C dicen que lo que publican no es vinculante), que su página de Normativa anuncia un mínimo de USD 10 que su propia calculadora desmiente cobrándote 20, que el fee de la agencia de Maldonado te lo cobran dos veces dentro del total que ellos mismos te muestran, y que hay reportes fechados de sobrepeso facturado sin balanza para chequearlo. La conclusión honesta: EXUR es barato y rápido, y estadísticamente la mayoría de las veces te va a ir bien. Pero estás autoasegurando el 100% del valor de tu compra. Traé solo lo que puedas perder.

**Gaps (resolver a mano):**

- COSTO DE ENTREGA A DOMICILIO Y AL INTERIOR: sin precio publicado y literalmente imposible de cotizar (la calculadora ofrece 18 departamentos y devuelve cero ciudades en todos; Montevideo ni figura). No hay ni un rango. interiorUsd queda en null: el USD 4 que circula es el fee de la agencia de retiro de Maldonado, NO un cargo de entrega al interior, y encima está mal medido (se cobra doble y escala con el peso).
- DÍAS DE ALMACENAJE LIBRE Y TARIFA DE DEPÓSITO: freeStorageDays queda en null. Los '365 días' que reportaba el perfil eran en realidad la cláusula de ABANDONO de los T&C (te quedás sin la mercadería al año en Miami y a los 6 MESES —180 días— en Uruguay), no una promesa de almacenaje gratis. No publican ni días libres ni fee.
- PLAZO DE TRÁNSITO OFICIAL: EXUR no compromete ningún plazo en su web. Los '2 vuelos semanales' y los '~6–8 días' salen de reseñas y del foro, no de la empresa.
- TSPU / TASA POSTAL 10%: no aparece como línea en el desglose de la calculadora. No se pudo confirmar si está embebida en la tarifa o si directamente no la cobran. tspuPct queda en 0 por lo que muestra el desglose, no por confirmación de la empresa.
- MONTO DE INDEMNIZACIÓN POR PÉRDIDA O DAÑO: los T&C remiten a 'los Convenios Internacionales' sin nombrar ninguno y sin fijar tope. No hay cifra. (El 'Convenio de Montreal' que circula lo invocó un cliente en una reseña, NO EXUR: no lo publicamos como tope.)
- FEE DE DESPACHANTE para envíos de más de 20 kg o facturas de más de USD 800: solo dicen 'consulte su cotización'. Sin número.
- COSTO DE REEMPAQUE: los T&C dicen que tiene costo adicional 'analizado en cada caso de acuerdo con la dificultad y complejidad del pedido'. Sin tarifa.
- CARGOS DE 'Import Duty / Delivery Collect' para compras en tiendas fuera de EE.UU.: los T&C te los trasladan pero no los cuantifican en ningún lado.
- PESO VOLUMÉTRICO: la calculadora tiene campos de largo/alto/ancho y 'Peso volumen' pero están ocultos y no afectaron ninguna cotización. No se pudo determinar si lo aplican en la práctica ni con qué divisor.
- PRECIO POR KG (originsPerKg): dejado en null a propósito para EE.UU. EXUR tarifa POR LIBRA; el 'USD 17,64/kg' es solo la tarifa marginal (USD 8/lb) convertida y NO es un precio all-in real — publicarlo sería repetir el bug de 'precio marginal presentado como tarifa plana'. La verdad está en los tramos. EU/CN/AR en null porque directamente no operan esos orígenes.
- Si la banda de factura USD 201–800 realmente cobra IVA 22% en la práctica (así lo calcula su web, aun rotulándola 'Utilizando Franquicia') o si es un defecto de la calculadora: no se pudo contrastar contra una factura real de cliente.
- TRUSTPILOT: no existe perfil de EXUR. Toda la evidencia de reputación es Google Maps + gameover.uy + Reddit.

**Fuentes:** [EXUR — Calculadora (única fuente de precios; ~70 cotizaciones verificadas 2026-07-12)](https://www.exurenvios.com/Calculadora.aspx) · [EXUR — Términos y condiciones (PDF): responsabilidad, abandono, reempaque, 'no vinculante'](https://www.exurenvios.com/Terminos_y_condiciones.pdf) · [EXUR — Normativa de aduana (publica el mínimo de USD 10, desactualizado)](https://www.exurenvios.com/Normativa-aduana.aspx) · [EXUR — Procedimiento de reclamo (Resolución 185/2016: 30 días para reclamar, hasta 90 corridos para resolver)](https://www.exurenvios.com/Procedimiento-reclamo.aspx) · [Google Maps — Exur Envíos, Río Branco 1377 (4,4 · 1.028 reseñas)](https://www.google.com/maps/place/?q=place_id:ChIJ7Tum6SyAn5UR96ttPgp1nr0) · [Google Maps — Exur Envíos, Ejido 1008 (sucursal, 4,5 · 15 reseñas)](https://www.google.com/maps/place/?q=place_id:ChIJvVNGJgCBn5UR0fHO9GKGfbM) · [gameover.uy — hilo de couriers (consolidación, almacenaje, frecuencias de vuelo)](https://www.gameover.uy/archive/index.php/t-15640.html) · [Reddit r/uruguay — Cuáles son los mejores couriers hoy para ustedes](https://reddit.com/r/uruguay/comments/1maxz1d/cuales_son_los_mejores_couriers_hoy_para_ustedes/) · [Reddit r/uruguay — Opiniones de couriers](https://reddit.com/r/uruguay/comments/17vd9bq/opiniones_de_couriers/)

---

### Logistika.US `logistika` — Courier

> Forwarder de Miami, carísimo y sin cara visible en Uruguay

**Tarifa** (verificada 2026-07-12, [fuente](https://logistika.us/puerta-a-puerta/)):

```json
{
 "quoteOnly": false,
 "tiers": [
  {
   "maxKg": 2.27,
   "flat": 130,
   "perKg": null
  }
 ],
 "minChargeUsd": 130,
 "handlingUsd": 10,
 "handlingPlusIva": null,
 "tspuPct": 0,
 "clearanceUsd": null,
 "interiorUsd": null,
 "booksPerKg": null,
 "insuranceIncluded": false,
 "freeStorageDays": 30,
 "originsPerKg": {
  "us": null,
  "eu": null,
  "cn": null,
  "ar": null
 },
 "transit": "7-10 días hábiles (cifra genérica del aéreo puerta a puerta en /paises/; la fila de Uruguay no publica plazo propio)"
}
```

**Letra chica:** OJO CON EL PRECIO: la tarifa está en LIBRAS, no en kilos, y es ADITIVA. Textual de la fila URUGUAY: 'USD 130.00 mínimo (1-5 lbs.) + $10.00 c/lb. adicional de peso o volumen + 5% seguro sobre valor declarado'. O sea: hasta 5 lb (2,27 kg) pagás USD 130 fijos; de ahí para arriba seguís pagando esos USD 130 IGUAL, más USD 10 por cada libra extra (≈ USD 22 por kilo adicional). NO es 'USD 22/kg todo incluido': 3 kg salen ~USD 150 (no 66) y 10 kg salen ~USD 300 (no 220), o sea ~USD 30/kg efectivos a 10 kg. Por eso en la tabla cargamos solo el tramo de hasta 2,27 kg: el tramo de arriba es marginal-aditivo y no entra en el modelo de tramos sin mentir el precio. Calculalo a mano.

ENCIMA DE ESO: 5% de seguro obligatorio sobre el valor declarado, USD 10 de entrega hasta 22 lb (+USD 0,70 por cada libra por encima de 22 lb) y 'se paga IMPUESTOS del 32% del valor CIF' aparte, aunque la propia página diga que el precio 'incluye ... aduana'. Cobran por peso O VOLUMEN, lo que sea mayor, sin publicar el divisor volumétrico: el precio real puede salir más alto que la cuenta por peso.

ORIGEN: solo Miami (bodega en 1638 NW 108th Ave, Doral FL). No hay Europa, China ni Argentina (Argentina es DESTINO en su tabla, no origen).

LO QUE SÍ PUBLICAN (página /red/): 30 días de almacenaje gratis (90 para socios RED), USD 30 por mes o fracción si te pasás, USD 10 por consolidar varios paquetes en un despacho, y una membresía RED de USD 100 al año que da 20% off del primer invoice, 90 días de almacenaje y consolidación sin cargo.

TSPU/URSEC: queda en 0 porque el campo no admite nulo, pero el valor honesto es NO PUBLICADO. En ninguna página mencionan el 10% postal. No asumas que no te lo cobran.

RÉGIMEN: en ningún lado mencionan la franquicia courier uruguaya (USD 200 exentos, 3 envíos/año, hasta 20 kg). Al declarar '32% del valor CIF', su envío a Uruguay no se lee como franquicia. Para Perú y Costa Rica sí aclaran explícitamente que no se pagan impuestos hasta USD 200; para Uruguay, no.

SEGURO CONTRADICTORIO ENTRE SUS PROPIAS PÁGINAS: /preguntas dice 'seguro básico de $100' y adicional de ~4% sobre el valor declarado; la fila de Uruguay cobra 5%. Además esa línea tarifaria tiene un paréntesis sin cerrar, así que la atribución de los USD 10 / USD 0,70 es ambigua: pedí el precio por escrito antes de mandar nada.

**Google:** **SIN FICHA CONFIABLE — pinear a mano antes de publicar cualquier rating.**

**Reddit:** muestra **none**

**Scores propuestos:** cumplimiento **—** · atención **—** · transparencia **—** · cobertura **20**

- *cumplimiento:* SIN EVIDENCIA. Cero reseñas de Google, cero hilos en Reddit, cero reclamos documentados, cero casos públicos de paquete perdido/demorado/retenido. No puntuamos a ciegas: va null, que no es lo mismo que un aprobado.
- *atencion:* SIN EVIDENCIA. No encontramos ficha de Google Business Profile (buscamos en Montevideo y en su propia dirección de Doral), no hay Trustpilot verificable (403 de Cloudflare), no hay foros ni Reddit. El único canal es un teléfono +1 de Miami y un mail. Nada que puntuar.
- *transparencia:* SIN MUESTRA PUNTUABLE bajo nuestra regla (no hay reseñas ni Reddit que respalden una nota). Que quede claro igual, aunque no puntúe: la fila tarifaria de Uruguay está rota gramaticalmente, el seguro figura al 4% en /preguntas y al 5% en /puerta-a-puerta, dicen que el precio incluye aduana y a la vez cobran 32% CIF aparte, y no publican términos y condiciones, límite de responsabilidad ni política de reclamos. Todo eso está en flags.
- *cobertura:* 20/100. Un solo origen (Miami; no hay EU, China ni Argentina). Seguro NO incluido (5% obligatorio arriba de la tarifa). Sin recargo al interior publicado y sin confirmación de que entreguen fuera de Montevideo ('hasta la mayoría de ciudades uruguayas'). Sin tarifa de libros/CD/DVD. Sin descuento de IVA (no son empresa uruguaya, no facturan acá). Lo único que suma: 30 días de almacenaje gratis en Miami (90 con la membresía RED de USD 100/año) y consolidación a USD 10.

**Banderas rojas:**

- NO es un courier uruguayo. Es una LLC de Florida (LOGISTIKA.US LLC, doc. L18000050531, activa desde 2018) con bodega en Doral, Miami. No tiene oficina, RUT ni teléfono en Uruguay: si el paquete se pierde o queda trancado en Aduana, reclamás a un número de Miami.
- Carísimo y cotizado en libras: USD 130 mínimo por hasta 5 lb (2,27 kg). Y arriba de eso el mínimo NO desaparece: son USD 130 + USD 10 por cada libra adicional. Un paquete de 3 kg ronda los USD 150 y uno de 10 kg los USD 300, antes del seguro y de los impuestos.
- Cobran por peso O VOLUMEN, lo que sea mayor, y no publican el divisor volumétrico: el precio final puede salir bastante más caro que la cuenta por peso real.
- Seguro del 5% sobre el valor declarado, obligatorio y sumado a la tarifa. Y su propio FAQ dice otra cosa: 'seguro básico de $100' y adicional del 4%. Dos números distintos en dos páginas de la misma empresa.
- Dicen que el precio 'incluye ... y aduana' y en la misma línea agregan 'se paga IMPUESTOS del 32% del valor CIF' aparte. El costo final no se puede determinar desde la página.
- En ningún lado mencionan la franquicia courier uruguaya (USD 200 exentos, 3 envíos/año, hasta 20 kg), régimen que SÍ aclaran para Perú y Costa Rica. Quien compre esperando los USD 200 libres puede terminar pagando 32% sobre todo el valor CIF.
- La línea tarifaria de Uruguay está literalmente rota: paréntesis sin cerrar y los cargos de USD 10 / USD 0,70 quedan ambiguos. Ni la empresa tiene claro su precio publicado.
- No publican TSPU/10% postal, ni fee de despacho separado, ni recargo al interior, ni tarifa de libros. Lo dejamos en 0/null porque NO ESTÁ PUBLICADO, no porque no se cobre.
- El sitio no tiene términos y condiciones, ni límite de responsabilidad, ni política de reclamos: no hay contrato público que oponer si algo sale mal.
- Reputación cero verificable: no encontramos ficha de Google Maps (buscamos en Montevideo y en su propia dirección de Doral), ni hilos en foros uruguayos, ni Reddit. No hay evidencia de mal servicio, pero tampoco de buen servicio: es una caja negra.
- Marketing dice '32 años de experiencia manejando carga internacional' (página AmazonBOX) mientras la LLC que factura se registró en 2018. Esa antigüedad no es verificable con la entidad que opera.

**A favor:** 
- Existe de verdad y está al día: LOGISTIKA.US LLC figura ACTIVA en el registro público de Florida (Sunbiz), con el reporte anual presentado el 11/04/2026.
- 30 días de almacenaje gratis en Miami (90 días con la membresía RED de USD 100/año), y USD 30 por mes o fracción si te excedés. Está publicado, no es promesa de WhatsApp.
- Consolidan varias compras en un solo despacho por USD 10 (sin cargo para socios RED) y podés retirar personalmente en la bodega de Doral.
- Publican una tabla de tarifas abierta por país, algo que varios couriers directamente no hacen (aunque la fila de Uruguay esté mal redactada).

**En contra:** 
- El precio es de otro planeta para una compra normal: USD 130 mínimo por menos de 2,3 kg, cuando un courier uruguayo estándar te cobra una fracción de eso.
- Encima de la tarifa: 5% de seguro obligatorio, USD 10 de entrega (hasta 22 lb, +USD 0,70 por libra extra) y 32% del valor CIF en impuestos, declarados aparte.
- Un solo origen: Miami. No hay Europa, ni China, ni Argentina.
- Cero respaldo local: ni oficina, ni RUT, ni teléfono uruguayo, ni términos y condiciones, ni política de reclamos.
- Cero reputación verificable: nadie en Uruguay parece haberlo usado, o al menos nadie lo documentó.
- No aplican (ni mencionan) la franquicia de USD 200: el envío va con 32% del CIF por delante.

**Para quién:** Prácticamente nadie que esté comprando en Amazon para traer a Uruguay. Solo tiene sentido si ya tenés carga esperando en Miami, necesitás consolidarla o guardarla 30-90 días, y vas a mover algo pesado o poco convencional que igual ibas a cotizar aparte. Para una compra online común, cualquier courier uruguayo con casillero en Miami te sale mucho menos y te da alguien a quien reclamarle acá.

**Veredicto:** Logistika.US aparece en las búsquedas uruguayas, pero no es un courier uruguayo: es una LLC de Florida sin oficina, sin RUT y sin teléfono local. Eso ya define el riesgo: si el paquete se pierde, se daña o queda retenido en Aduana, no hay mostrador en Montevideo, hay un +1 (786). La plata tampoco cierra. La fila de Uruguay dice USD 130 mínimo por 1-5 libras (hasta 2,27 kg) y USD 10 por cada libra adicional, y esos USD 130 no desaparecen cuando el paquete pesa más: se suman. Un envío de 3 kg ronda los USD 150 y uno de 10 kg los USD 300 (unos USD 30 por kilo efectivos), antes del 5% de seguro obligatorio, de los USD 10 de entrega y del 32% del valor CIF que ellos mismos dicen que se paga aparte, pese a afirmar en la misma página que el precio 'incluye aduana'. Y nunca mencionan la franquicia courier uruguaya de USD 200 exentos, que sí aclaran para Perú y Costa Rica. Lo poco que juega a favor está en su página /red/: 30 días de almacenaje gratis (90 con la membresía de USD 100 al año) y consolidación a USD 10, servicios de bodega reales y publicados. Pero lo que nos frena de puntuarlos es otra cosa: no encontramos una sola reseña. Ni Google Maps (buscamos en Montevideo y en su propia dirección de Doral), ni foros uruguayos, ni Reddit, ni términos y condiciones. No decimos que sean malos; decimos que no hay forma de saberlo, y que el precio publicado es lo bastante alto y lo bastante confuso (seguro al 4% en una página y al 5% en otra, un paréntesis sin cerrar en la línea de Uruguay) como para que no valga la pena averiguarlo con tu plata.

**Gaps (resolver a mano):**

- Tramo de más de 2,27 kg: el precio es aditivo (USD 130 + USD 10 por libra extra) y no entra en el modelo de tramos sin producir cifras falsas. Cargamos solo el tramo de hasta 2,27 kg; alguien tiene que decidir cómo mostrar el tramo superior (≈ USD 22 por kilo adicional, ≈ USD 30/kg efectivos a 10 kg) y confirmarlo por escrito con la empresa.
- originsPerKg.us queda en null a propósito: no existe un USD/kg all-in real. El USD 22,05/kg del research original ignora el mínimo de USD 130 y subestima el precio ~35% a 10 kg.
- TSPU/URSEC 10%: forzado a 0 porque el esquema no admite null, pero el estado real es NO PUBLICADO. Confirmar con la empresa si lo agregan en destino antes de que alguien lea ese 0 como 'no se cobra'.
- handlingUsd = 10: en realidad es un cargo de ENTREGA hasta 22 lb, con +USD 0,70 por libra por encima de 22 lb sin capturar. La frase original tiene un paréntesis sin cerrar, así que la atribución exacta de los USD 10 / USD 0,70 es ambigua. Confirmar antes de publicarlo como precio cerrado.
- Fee de despacho/clearance separado: no publicado. Cobran 32% del valor CIF como impuesto, pero no se sabe si hay honorarios de despachante aparte.
- Recargo al interior: no publicado. Solo dicen 'hasta la mayoría de ciudades uruguayas'; no sabemos si los USD 10 de entrega cubren solo Montevideo.
- Tarifa de libros/CD/DVD: no publicada.
- Divisor volumétrico para el cobro por 'peso o volumen': no publicado.
- Contradicción del seguro (4% + base USD 100 en /preguntas vs 5% obligatorio en la fila de Uruguay): hay que preguntarles cuál rige.
- Régimen aduanero real en Uruguay: no dicen si operan bajo el régimen courier/franquicia de la DNA, ni quién es el 'corresponsal' que entrega acá (lo nombran en el FAQ pero nunca lo identifican).
- Google Business Profile: dos búsquedas en Maps (Montevideo y Doral) no encontraron ficha, pero no se puede descartar al 100% que exista bajo otro nombre comercial. google.trustworthy = false hasta que un humano lo confirme.
- Trustpilot: https://www.trustpilot.com/review/logistika.us devuelve HTTP 403 (bloqueo de Cloudflare). Eso NO prueba que no exista perfil: queda sin verificar.
- Plazo de tránsito real a Uruguay: los 7-10 días hábiles son la cifra genérica del aéreo puerta a puerta; la fila de Uruguay no publica plazo propio.
- Cómo responden ante paquete perdido, dañado o retenido: no hay un solo caso documentado públicamente.

**Fuentes:** [Logistika.US — tarifas puerta a puerta (fila URUGUAY)](https://logistika.us/puerta-a-puerta/) · [Logistika.US — membresía RED (30/90 días de almacenaje, consolidación USD 10, USD 100/año)](https://logistika.us/red/) · [Logistika.US — preguntas frecuentes (seguro base USD 100 / 4%)](https://logistika.us/preguntas/) · [Logistika.US — países y tiempos de tránsito (7-10 días hábiles, aéreo)](https://logistika.us/paises/) · [Logistika.US — AmazonBOX (claim de '32 años de experiencia')](https://logistika.us/amazonbox/) · [Sunbiz Florida — LOGISTIKA.US LLC, doc. L18000050531, ACTIVE desde 26/02/2018](https://search.sunbiz.org/Inquiry/CorporationSearch/SearchResults?inquiryType=EntityName&searchTerm=LOGISTIKA) · [Google Maps — búsqueda 'Logistika.US' sin ficha (12/07/2026)](https://www.google.com/maps/search/Logistika.US/?hl=en) · [Google Maps — búsqueda en su bodega de Doral, sin ficha (12/07/2026)](https://www.google.com/maps/search/Logistika+1638+NW+108th+Ave+Doral+FL/?hl=en)

---

### Tiendamia `tiendamia` — Marketplace

> Cero trámite y cuotas, pero es la forma más cara de importar.

Marketplace (Xipron Inc., EE.UU.) que te compra en Amazon/eBay y te lo trae con impuestos incluidos: vos no tocás aduana ni casillero.

**Tarifa** (verificada 2026-07-12, [fuente](https://tiendamia.com.uy/checkout/cart/)):

```json
{
 "quoteOnly": false,
 "tiers": [
  {
   "maxKg": null,
   "perKg": 21.99,
   "flat": null
  }
 ],
 "minChargeUsd": null,
 "handlingUsd": 1.99,
 "handlingPlusIva": false,
 "tspuPct": 0,
 "clearanceUsd": 0,
 "interiorUsd": 0,
 "booksPerKg": null,
 "insuranceIncluded": true,
 "freeStorageDays": null,
 "originsPerKg": {
  "us": 21.99,
  "cn": 21.99,
  "eu": null,
  "ar": null
 },
 "transit": "Prometen 5–10 días hábiles (express) / 10–15 (normal). En la práctica se reportan 40 días y hasta \"más de dos meses\"."
}
```

**Letra chica:** OJO: Tiendamia BORRÓ su página de tarifas. https://tiendamia.com.uy/tarifas da 404 (igual que en .com, .com.ar y .com.pe) y el artículo de ayuda con los costos fijos quedó detrás de un login. Los números de acá NO salen de un tarifario publicado: se leyeron del carrito real el 12/07/2026 (producto JBL Vibe Beam, cantidades 1/2/3, los subtotales cierran exactos).

CÓMO SE COBRA DE VERDAD (4 líneas en el carrito):

1) Envío a Uruguay: USD 21.99 por kilo, igual desde EE.UU. que desde China. NO hay escalas por peso.

2) "Tarifa Tiendamia" (ellos le dicen "Tax Interno"): 7% sobre el precio del producto. El tarifario viejo decía 10% y antes 9,5% — el carrito hoy cobra 7,00% clavado (3,85 sobre 54,95; 7,69 sobre 109,90; 11,54 sobre 164,85).

3) Empaque, manejo y seguro: USD 1.99 por producto, tope 3 productos (máximo 5,97). El tarifario archivado decía 3,29 — es plata que ya no cobran.

4) Envío a domicilio (opcional): USD 4.99 en todo el país según el tarifario de oct-2025; hoy no se puede confirmar porque el checkout esconde las opciones de entrega detrás del login. Express a domicilio: 9,99.

EL PESO NO ES EL QUE DECÍS VOS. Sobre el peso declarado le suman ~180 g por ítem. Un JBL de 0,23 kg se facturó como 0,41 kg (9,02 USD de envío) y otro de 0,24 kg como 0,42 kg (9,24). O sea: en paquetes chicos la tarifa efectiva es ~39 USD por kilo declarado, no 21,99. El mínimo de 355 g del T&C NO explica el cobro (facturaron 0,41 kg, más que el mínimo): es el "peso adicional" que el T&C §8 menciona sin cuantificar. Si el peso real no coincide, te piden pagar la diferencia o te cancelan la orden.

EL 7% NO ES LA TASA TSPU/URSEC. Es un fee propio de Tiendamia sobre el valor del producto. El checkout es all-in: no hay línea de URSEC aparte, por eso tspuPct=0. Pero el 7% lo pagás igual.

ADUANA: Tiendamia no hace ningún trámite (T&C §14: lo gestionan couriers/despachantes). No cobran despacho aparte. Con el régimen nuevo (Decreto 50/026): franquicia USD 800/año, máximo 3 envíos, 20 kg por envío, origen EE.UU. exento de IVA. Libros/CD/DVD/vinilos no consumen la franquicia anual, pero NO tienen tarifa de kilo especial: viajan a los mismos 21,99.

NO ES CASILLERO, así que no hay días de depósito gratis. Sí hay una cláusula de abandono a los 90 días (T&C §9): pasado ese plazo autorizás que donen o destruyan la mercadería.

**Google:** `ChIJkc1QhjeBn5UR6GErKGZuDds` — "Tienda Mía Pick Up Center 2" · **1,5 ★** (45 reseñas) · [ficha](https://www.google.com/maps/place/Tienda+M%C3%ADa+Pick+Up+Center+2/data=!4m7!3m6!1s0x959f81378650cd91:0xdb0d6e66282b61e8!8m2!3d-34.9021891!4d-56.1383386!16s%2Fg%2F11nnpsq7yv!19sChIJkc1QhjeBn5UR6GErKGZuDds)

**Reddit:** muestra **usable** · neto **-70** sobre 28 opiniones

Reddit habla mucho de TiendaMia y casi siempre mal: de ~28 opiniones reales, 27 son negativas y apuntan al mismo lugar — costos inflados y tarifas poco claras, demoras largas y reembolsos calculados a dedo. La única opinión positiva de toda la muestra es de 2019. Ojo con dos sesgos: buena parte del enojo de 2026 es político (la idea de que el régimen de USD 800 se hizo "a medida" de TiendaMia, no una queja de servicio), y TiendaMia es de lejos la opción más mencionada del corpus (1160 menciones), así que concentra tanto uso masivo como bronca.

> *"Sinceramente, muchas veces termina saliendo mejor que Tienda Mía, porque ahí te matan bastante con los costos."* — [r/Burises, 2026-04-03](https://reddit.com/r/Burises/comments/1sbd6wy/tutorial_básico_para_dejar_de_regalar_plata_en/) (negativo)

> *"Nos vendieron humo: el "alivio" de los USD 800 es un curro a medida de TiendaMia."* — [r/uruguay, 2026-04-24](https://reddit.com/r/uruguay/comments/1suv300/nos_vendieron_humo_el_alivio_de_los_usd_800_es_un/) (negativo)

> *"Con tiendamía la experiencia ha sido buena, no me interesa si no es lo más barato o rápido.."* — [r/uruguay, 2019-06-07](https://reddit.com/r/uruguay/comments/bxu2rw/comprar_en_internet_de_europa/) (positivo)

**Scores propuestos:** cumplimiento **32** · atención **28** · transparencia **18** · cobertura **60**

- *cumplimiento:* Evidencia de sobra y toda en la misma dirección: Google 1,5★ (45 reseñas), Trustpilot 1,5/5 (52 reseñas en .com.uy, 79% de una estrella; 100 reseñas en el sitio global), y una muestra de Reddit usable con 27 de 28 opiniones negativas. Los incidentes son documentados y repetidos: 40 días de demora contra 10–15 hábiles prometidos, "más de dos meses", producto equivocado enviado (jun-2026), entregas fallidas falsas, órdenes canceladas por falta de stock tras 18 días. Llega, y a veces llega bien — pero el plazo prometido no se cumple de forma sistemática.
- *atencion:* Muro de IA en el soporte ("la IA que tienen quedó pensando y no contestó nada", jun-2026), reembolsos parciales calculados a favor de ellos, plata de vuelta a la tarjeta reportada en 55–57 días, cero respaldo de garantía post-entrega (ni te pasan la factura del retailer). Compensaciones simbólicas: cupón de USD 20 cuando ellos mandaron el producto equivocado. El único punto a favor es histórico (soporte telefónico elogiado en 2024).
- *transparencia:* Lo peor del cuadro y lo verificamos nosotros: borraron el tarifario de todos sus dominios, así que la tarifa solo se ve con el carrito armado. Cuando lo abrimos, dos de los tres fees publicados por última vez estaban mal: cobran 7% y no 10%, 1,99/ítem y no 3,29. Además el envío se calcula sobre un peso inflado (~180 g por ítem) que no está cuantificado en ningún lado, marcan el precio del producto por encima de Amazon, y su propia web todavía muestra el régimen viejo (USD 200 / Decreto 356/014) en las fichas de producto. Lo único honesto: el número del checkout sí es el final.
- *cobertura:* Cubre EE.UU. y China (no Europa ni Argentina), entrega a domicilio en todo el país sin recargo por interior, seguro incluido en el fee de empaque, consolidación gratis y el origen EE.UU. queda exento de IVA con el régimen nuevo. No suma por días de depósito (no es casillero) ni por tarifa especial de libros (no tiene: los libros van a los mismos 21,99, el beneficio es sólo regulatorio).

**Banderas rojas:**

- BORRARON EL TARIFARIO. tiendamia.com.uy/tarifas da 404 hoy (igual en .com, .com.ar y .com.pe) y el artículo de ayuda con los costos fijos quedó detrás de un login. La tarifa sólo se ve una vez que tenés el carrito armado. No hay changelog público de nada.
- LOS FEES QUE PUBLICARON POR ÚLTIMA VEZ ESTÁN MAL. Abrimos el carrito el 12/07/2026: cobran 7% de "Tarifa Tiendamia" (el tarifario archivado decía 10%) y USD 1,99 por ítem de empaque (decía 3,29). Es plata a favor tuyo, pero muestra que los números cambian sin aviso y que no hay fuente oficial que verificar.
- EL ENVÍO SE COBRA SOBRE UN PESO INFLADO. Le suman ~180 g por ítem al peso declarado: un JBL de 0,23 kg se facturó como 0,41 kg. En paquetes chicos la tarifa efectiva es ~39 USD por kilo declarado, no 21,99. El T&C §8 lo tapa con un "en determinados casos, un peso adicional" que no cuantifica, y usuarios reportan que les cobran sobrepeso por cada ítem.
- SI TIENDAMIA TE MANDA EL PRODUCTO EQUIVOCADO, IGUAL PERDÉS UNA FRANQUICIA. Caso de junio 2026: aceptaron la devolución pero el cupo anual (3 envíos / USD 800) no se recupera porque el paquete ya pasó aduana. Compensación ofrecida: un cupón de USD 20. Con el régimen nuevo es la falla más cara del mercado.
- EL PRECIO DEL PRODUCTO TAMBIÉN VIENE MARCADO. Reportan precios base muy por encima de Amazon US y subas justo antes de un evento de descuento. Comparar sólo el USD/kg contra un courier es una comparación tramposa a favor de Tiendamia.
- A 21,99/kg ES CASI EL DOBLE DE UN COURIER COMÚN (usuarios citan Aerobox a 11,99/kg). Dato concreto de mayo 2026: UYU 2.400 de envío por 2,5 kg sobre una compra de UYU 5.000, un +50%.
- LA "GARANTÍA DE ENTREGA" NO SIRVE. Recién podés pedir la devolución total 60 días CORRIDOS DESPUÉS del plazo máximo prometido, y se cae si ya te mandaron un mail avisando de una demora.
- EL CONTRATO ES BAJO LEY DE FLORIDA CON JURISDICCIÓN EXCLUSIVA EN MIAMI-DADE. Tu recurso práctico es Defensa del Consumidor, no el contrato.
- CERO GARANTÍA DESPUÉS DE LA ENTREGA. Si el producto falla no se hacen cargo, y reportan que ni siquiera te dan la factura original del retailer para que reclames vos.
- LA PROPIA WEB SE CONTRADICE SOBRE EL RÉGIMEN. Las fichas de producto todavía muestran el panel viejo de "USD 200 / Decreto 356/014" mientras su página de aduanas dice USD 800 / Decreto 50/026.
- NO TIENEN FICHA OFICIAL DE GOOGLE. Las tres fichas de Montevideo son puntos de retiro sin reclamar y con puntajes muy distintos (1,5★/45, 2,6★/169, 2,7★/17). Su perfil de Trustpilot también está sin reclamar.

**A favor:** 
- El número que ves en el checkout es el que pagás: envío, fees e impuestos uruguayos ya están adentro. Es su ventaja real y los usuarios la confirman.
- No hacés ningún trámite: aduana, VUCE y el permiso de URSEC para equipos con Wi-Fi/Bluetooth los gestionan ellos.
- Comprás en Amazon/eBay sin tarjeta ni casillero en EE.UU. — para mucha gente es la única puerta de entrada.
- Cuotas con tarjeta de crédito (hasta 12). En Reddit es, literal, la única razón que le encuentran para usarlo.
- Consolidación gratis de varios productos en un envío, y el seguro va incluido en el fee de empaque.
- Con el régimen nuevo, lo que viene de EE.UU. queda exento de IVA.

**En contra:** 
- Es la forma más cara de importar: 21,99/kg es casi el doble de un courier común, y encima inflan el peso (~180 g por ítem) y marcan el producto por encima del precio de Amazon.
- En paquetes chicos la tarifa efectiva se va a ~39 USD por kilo declarado.
- Los plazos no se cumplen: prometen 5–15 días hábiles y hay reportes de 40 días y de "más de dos meses".
- La atención es un muro de IA, y los reembolsos van a crédito interno de la tienda; devolver la plata a la tarjeta se reporta en 55–57 días.
- No hay tarifario público. Tenés que armar un carrito para saber cuánto te van a cobrar.
- Reddit es lapidario: 27 de 28 opiniones negativas. Google 1,5★ y Trustpilot 1,5/5.
- Si algo sale mal (producto equivocado, retención en aduana, garantía), el problema es tuyo — y el contrato se litiga en Miami.

**Para quién:** Para quien no tiene casillero ni tarjeta en EE.UU., no quiere tocar un trámite y necesita pagar en cuotas — y acepta que ese confort le cuesta cerca de un 50% más que hacerlo por su cuenta. Sirve para compras chicas, caras y no urgentes (un celular, un auricular). No lo uses si te importa el precio, si el producto pesa, o si lo necesitás para una fecha.

**Veredicto:** Tiendamia hace exactamente lo que promete y te lo cobra carísimo. Lo bueno es real y no es marketing: el precio del checkout es final, no hacés ningún trámite y podés pagar en cuotas. Lo malo también es real y está medido: 21,99 el kilo es casi el doble de un courier, le suman ~180 gramos por ítem al peso (un JBL de 0,23 kg se factura como 0,41 kg, o sea ~39 USD por kilo declarado), y el precio del producto ya viene marcado por encima de Amazon. Sumado: pagás el confort dos o tres veces. Peor todavía es lo que pasó con la transparencia: borraron el tarifario de todos sus dominios, así que para saber cuánto te van a cobrar tenés que armar un carrito — y cuando lo armamos nosotros, dos de los tres fees que habían publicado por última vez estaban mal (cobran 7% y no 10%, 1,99 por ítem y no 3,29). Que la corrección sea a tu favor no cambia el punto: no hay ningún número oficial que puedas verificar antes de comprar. Y la falla más cara del mercado es de ellos: si Tiendamia te manda el producto equivocado, igual perdés una de las tres franquicias del año, y te ofrecen un cupón de USD 20. El veredicto no es que sean una estafa —a la mayoría le llega la cosa, aunque tarde 40 días— sino que es el camino más caro, más lento y más opaco, y sólo tiene sentido si las cuotas o la ausencia de trámite valen para vos más que la plata que te sacan.

**Gaps (resolver a mano):**

- El "Tarifa Tiendamia" de 7% se midió en un solo producto (JBL Vibe Beam, cantidades 1/2/3, 7,00% clavado en las tres). Ellos lo describen como el equivalente al sales tax de EE.UU., así que podría variar por categoría o estado. No hay ningún % publicado que verificar: hay que asumir que puede cambiar.
- El peso adicional de ~180 g por ítem se despejó de dos productos (0,23 kg → 9,02 y 0,24 kg → 9,24). No está publicado en ningún lado y podría no ser constante en paquetes grandes o pesados. Habría que medirlo con un producto de varios kilos.
- El envío a domicilio de USD 4,99 "en todo el país" sale del tarifario archivado de octubre 2025; hoy no se puede confirmar porque el checkout esconde las opciones de entrega detrás del login. Por eso interiorUsd figura en 0 (sin recargo por interior), pero el monto exacto está sin verificar.
- Si todavía existe el retiro gratis en Montevideo: estaba en el tarifario de julio 2025, desapareció en el de octubre 2025 (que introdujo un "envío express a pick up" de USD 4,99). Sin resolver.
- El cargo mínimo en dólares no está publicado. El T&C fija un mínimo de 355 g por producto, pero el carrito facturó 0,41 kg por un producto de 0,23 kg, así que el mínimo NO explica el cobro. minChargeUsd queda en null a propósito.
- Cómo cotizan hoy el origen China con el régimen nuevo: el flete sigue siendo 21,99/kg, pero fuera de EE.UU. ya no hay exención de IVA, así que el costo final cambia mucho. No encontramos ninguna declaración de ellos al respecto.
- No hay evidencia de que envíen desde Europa ni desde Argentina a Uruguay (por eso eu y ar quedan en null, no en cero), pero tampoco encontramos una declaración explícita que lo descarte.
- Días de depósito gratis: no aplica (no es casillero). Tampoco pudimos establecer si los puntos de retiro cobran algo si retirás tarde; lo único documentado es la cláusula de abandono a los 90 días del T&C §9.
- No existe una ficha de Google oficial de la empresa. Pinchamos "Tienda Mía Pick Up Center 2" (1,5★/45) porque la dirección y el teléfono (2908 2289) coinciden con los que Tiendamia publica, pero hay otras dos fichas sin reclamar con puntajes distintos: la vieja de Punta Gorda (2,6★/169) y otra de 2,7★/17. La ficha mide el mostrador de retiro, no todo el servicio — conviene decirlo en la página.
- Ninguna nota de prensa ni resolución de Defensa del Consumidor nombrando a Tiendamia: usuarios dicen escalar ahí, pero no hay caso publicado que citar.

**Fuentes:** [Carrito en vivo (única fuente real de la tarifa hoy)](https://tiendamia.com.uy/checkout/cart/) · [Tarifario oficial (HTTP 404 — la página fue eliminada)](https://tiendamia.com.uy/tarifas) · [Último tarifario archivado (Wayback, 2025-10-18)](https://web.archive.org/web/20251018145107/https://tiendamia.com.uy/tarifas) · [Términos y condiciones (peso mínimo, garantía de entrega, ley de Florida)](https://tiendamia.com.uy/terminos-y-condiciones) · [Información de aduanas (Decreto 50/026, USD 800, 3 envíos)](https://tiendamia.com.uy/informacion-de-aduanas) · [Trustpilot tiendamia.com.uy — 1,5/5 (52 reseñas, perfil sin reclamar)](https://www.trustpilot.com/review/tiendamia.com.uy) · [Trustpilot www.tiendamia.com (Infotin S.A.) — 1,5/5 (100 reseñas)](https://www.trustpilot.com/review/www.tiendamia.com) · [Google — Tienda Mía Pick Up Center 2 (1,5★, 45 reseñas)](https://www.google.com/maps/place/Tienda+M%C3%ADa+Pick+Up+Center+2/data=!4m7!3m6!1s0x959f81378650cd91:0xdb0d6e66282b61e8!8m2!3d-34.9021891!4d-56.1383386!16s%2Fg%2F11nnpsq7yv!19sChIJkc1QhjeBn5UR6GErKGZuDds) · [Reddit — paquete incorrecto: perdés la franquicia igual (2026-06-17)](https://reddit.com/r/uruguay/comments/1u8i89q/paquete_incorrecto_tiendamia/) · [Reddit — UYU 2.400 de envío por 2,5 kg (2026-05-07)](https://reddit.com/r/uruguay/comments/1t6gkg8/hice_una_compra_por_tiendamia_y_resulta_que_al/) · [Reddit — precio base inflado antes del descuento (2026-05-25)](https://reddit.com/r/uruguay/comments/1tnbwz3/que_hace_tiendamia/) · [Reddit — el precio final del checkout sí es el final (2026-05-03)](https://reddit.com/r/uruguay/comments/1t2xyzm/tienda_m%C3%ADa_precio_final_correcto/) · [Reddit — Galaxy S22 excelente, pero 40 días (2026-06-10)](https://reddit.com/r/uruguay/comments/1u294ci/celular_tiendamia/)

---

### Correo Uruguayo (Casilla Mía) `correo` — Postal

> Solo conviene arriba de 5 kg. Abajo es caro y el servicio es malo.

Operador postal público. Su producto de importación es Casilla Mía: casillero en Miami (Doral), sin cuota, con entrega en cualquier sucursal del Correo del interior.

**Tarifa** (verificada 2026-07-12, [fuente](https://www.casillamia.uy/Tarifas)):

```json
{
 "quoteOnly": false,
 "tiers": [
  {
   "maxKg": 0.5,
   "flat": 10,
   "perKg": null
  },
  {
   "maxKg": 5,
   "flat": null,
   "perKg": 20
  },
  {
   "maxKg": 20,
   "flat": null,
   "perKg": 8
  },
  {
   "maxKg": null,
   "flat": null,
   "perKg": 12
  }
 ],
 "minChargeUsd": 10,
 "handlingUsd": null,
 "handlingPlusIva": null,
 "tspuPct": 10,
 "clearanceUsd": 135,
 "interiorUsd": null,
 "booksPerKg": null,
 "insuranceIncluded": null,
 "freeStorageDays": 90,
 "originsPerKg": {
  "us": 20,
  "eu": null,
  "cn": null,
  "ar": null
 },
 "transit": "No prometen plazo. La FAQ dice \"dos vuelos semanales desde Miami\" y la página de cómo funciona dice \"la frecuencia mínima es de un vuelo semanal\": se contradicen. Aclaran que el plazo \"se determina principalmente por el tiempo que tu compra tarde en llegar a nuestra oficina\", o sea que no asumen ningún compromiso de entrega."
}
```

**Letra chica:** OJO CON LOS TRAMOS: el flete es ACUMULATIVO en escalones de 500 g, no una tarifa plana por kilo. Los perKg de arriba son tasas MARGINALES. Multiplicar el kilaje total por el perKg del tramo da un número equivocado arriba de 5 kg. Valores reales sacados de la propia calculadora del Correo (2026-07-12): 0,5 kg = USD 10; 1 kg = 20; 2 kg = 40; 5 kg = 100; 5,5 kg = 104; 10 kg = 140; 15 kg = 180; 20 kg = 220. O sea: USD 20/kg hasta 5 kg (caro), USD 8/kg de 5 a 20 kg (el tramo donde sí conviene). El tramo de más de 20 kg (USD 6 cada 500 g, ≈ USD 12/kg) está publicado pero no lo pudimos validar en la calculadora.

DESPACHO: la página de tarifas promete USD 75 hasta un CIF de USD 800 y USD 135 arriba de eso. En la práctica no es así. La propia calculadora del Correo, con factura de USD 201 y 1 kg, devolvió "Gestiones Aduaneras: 135.0", con la nota al pie "Incluye DUA si tu envío es de valor > USD 200". Abajo de USD 200 corre la franquicia (Decreto 356/2014) y normalmente no pagás despachante; arriba de USD 200 pagás 135. Los USD 75 son el número que casi nunca te van a cobrar: presupuestá 135.

TFSPU (10%): NO está incluida en ningún precio publicado ("Los precios no incluyen la TFSPU") y la calculadora la aplica sobre el flete Y sobre la gestión aduanera (ej.: flete 20 + gestión 135 → TFSPU 15,5). El precio de vidriera siempre está ~10% abajo del real.

OTROS COSTOS: suscripción gratis; USD 2,00 por paquete si consolidás; USD 1,34 de almacenaje si el paquete llega a Miami sin el número de casillero; el reembalaje se cobra aparte y el monto no está publicado. Medidas máximas 36 x 44 x 61 cm, 30 kg.

ORIGEN: solo Miami. No hay casillero europeo, chino ni argentino.

90 días de almacenaje gratis en Miami según la FAQ, pero la página de cómo funciona dice que los paquetes se procesan enseguida y "no serán consolidados": el propio sitio se contradice.

**Google:** **SIN FICHA CONFIABLE — pinear a mano antes de publicar cualquier rating.**

**Reddit:** muestra **usable** · neto **-70** sobre 19 opiniones

Reddit habla del Correo Uruguayo casi solo para quejarse: paquetes demorados o perdidos por meses, "intentos de entrega" que nunca ocurrieron, tracking que no reconoce los códigos y atención al cliente que promete llamar y no llama. La única contra-evidencia del sample es un caso donde todo llegó sin problema, y buena parte de la bronca en realidad se reparte entre el Correo y la Aduana, que el usuario no logra separar.

> *"Esto lo respetan el 99.99% de las veces, pero los hijos de re mil putas del correo uruguayo no, nunca me han llamado y para colmo en el seguimiento del envío ponen "INTENTO DE ENTREGA: CON AVISO AL DESTINATARIO" ¿¿Con aviso??"* — [r/uruguay, 2026-01-16](https://reddit.com/r/uruguay/comments/1qeiqs6/una_mierda_el_correo_uruguayo_lpm/) (negativo)

> *"Usé Correo Uruguayo por muchos años desde tipo los 17ish xq me mandaba paquetes de cumpleaños/navidad con una amiga (cumplimos el mismo día, medio cerca de navidad) y siempre fueron una manga de inútiles [desde perder paquetes por meses a cobrarme cosas que YA ESTABAN PAGAS Y ERAN DE CORREO PRIVADO (DHL)]."* — [r/uruguay, 2026-01-03](https://reddit.com/r/uruguay/comments/1q2lmjy/correo_uruguayo_es_mi_némesis_no_no_es_joda/) (negativo)

> *"Sin embargo, por ejemplo un familiar trajo semillas varias veces por el correo uruguayo sin ningún problema."* — [r/uruguay, 2025-10-22](https://reddit.com/r/uruguay/comments/1od87ux/en_realidad_te_traba_algo_aduana_o_es_todo_mentira/) (positivo)

**Scores propuestos:** cumplimiento **22** · atención **20** · transparencia **18** · cobertura **50**

- *cumplimiento:* Sample de Reddit usable (19 opiniones reales, net −70) con un patrón que se repite de 2018 a 2026: paquetes perdidos o demorados meses, retenciones y avisos de entrega que nunca ocurrieron (el tracking marca "INTENTO DE ENTREGA: CON AVISO AL DESTINATARIO" sin que nadie haya pasado). Hay un solo caso limpio en todo el sample. No baja de 20 porque Reddit tiene sesgo de queja y porque parte de la demora la decide Aduana, no el Correo.
- *atencion:* Reddit: llamadas donde prometen devolver el llamado y no lo devuelven, tickets sin respuesta, información contradictoria. Ningún usuario del sample reporta una atención que le haya resuelto el problema. Sin listado de Google confiable para esta ficha, la nota se apoya solo en el sample de Reddit.
- *transparencia:* Doble golpe. Reddit: tracking que no reconoce los códigos y estados que no reflejan la realidad. Documental: la tarifa publicada dice USD 75 de despacho hasta CIF 800 y su propia calculadora cobra 135 desde CIF ~200; la TFSPU del 10% no está incluida en ningún precio de vidriera; y el sitio se contradice a sí mismo sobre la franquicia (800 vs 200), sobre la consolidación y sobre la frecuencia de vuelos. Es la peor de las tres porque acá no es percepción: está verificado contra sus propias fuentes.
- *cobertura:* Un solo origen (Miami): si comprás fuera de EE.UU., no te sirve. A favor: 90 días de almacenaje gratis en Miami (el mejor del ranking), suscripción gratis y entrega en cualquier sucursal del Correo del interior sin recargo publicado, con la red física más grande del país. No publica seguro, ni tarifa de libros, ni descuento de IVA. Da 50: mitad de tabla por lo ancho de la red local, castigado por el origen único y por lo que no publica.

**Banderas rojas:**

- La tarifa publicada de despacho no es la que cobran: casillamia.uy dice USD 75 hasta un CIF de USD 800, pero su propia calculadora cobró USD 135 con una factura de USD 201 ("Gestiones Aduaneras: 135.0", nota al pie "Incluye DUA si tu envío es de valor > USD 200"). Si presupuestás con la página de tarifas te quedás USD 60 corto.
- La TFSPU del 10% no está incluida en ningún precio publicado ("Los precios no incluyen la TFSPU") y se aplica sobre el flete Y sobre la gestión aduanera. El precio que ves siempre está ~10% abajo del que vas a pagar.
- El flete es caro justo donde compra la mayoría: USD 20/kg hasta 5 kg (2 kg = USD 40; 5 kg = USD 100 de flete, antes de la TFSPU). Recién arriba de 5 kg baja a USD 8/kg.
- Los tramos son tasas MARGINALES acumulativas cada 500 g, no una tarifa plana por kilo: 10 kg cuestan USD 140 de flete, no 10 × 8 = 80. Si comparás mal, la diferencia es de USD 60.
- Miami es el único origen. No hay casillero europeo, chino ni argentino: si comprás fuera de EE.UU., no lo podés usar.
- El propio sitio se contradice en cosas que cuestan plata: la página de tarifas habla de una "franquicia de USD 800" cuando la franquicia real es de USD 200 (Decreto 356/2014); la FAQ vende consolidación y 90 días de almacenaje mientras la página de cómo funciona dice que los paquetes "no serán consolidados"; la FAQ dice dos vuelos semanales y cómo funciona dice mínimo uno.
- Reddit, de 2018 a 2026 y sin quiebre: avisos de entrega que nunca ocurrieron, paquetes perdidos por meses, tracking que no reconoce los códigos y atención que promete llamar y no llama. 18 de las 19 opiniones reales del sample son quejas.
- Caídas crónicas del sitio web, reconocidas por el propio Correo en un comunicado de 2020 y todavía reportadas en 2026 ("hace 2 días que la página web está fuera de servicio... ni sabían").
- No publica nada sobre seguro ni indemnización por pérdida o daño en envíos de Casilla Mía. Si te pierden el paquete, no hay un número escrito del que agarrarse.

**A favor:** 
- Suscripción gratis y dirección en Miami sin cuota mensual.
- 90 días de almacenaje gratis en Miami: podés juntar varias compras y mandarlas juntas.
- Entrega en la sucursal del Correo del interior que elijas, sin recargo publicado: es la red física más grande del país.
- De 5 a 20 kg el flete baja a USD 8/kg y ahí sí es competitivo contra los couriers privados.
- Abajo de la franquicia de USD 200 no pagás despachante.

**En contra:** 
- Servicio malo y documentado: demoras, avisos de entrega falsos y paquetes perdidos, sostenido durante años en Reddit.
- Caro abajo de 5 kg (USD 20/kg), que es el peso de la mayoría de las compras.
- Solo trae de Miami.
- El precio final no es el que publican: sumale 10% de TFSPU y, arriba de USD 200 de factura, USD 135 de despacho (no 75).
- Si Aduana te retiene el paquete lo tenés que ir a buscar en persona al centro de distribución internacional en Montevideo: si vivís en el interior, eso es un viaje y un día de laburo.
- No hay seguro publicado ni compromiso de plazo de entrega.

**Para quién:** El que trae un paquete pesado (más de 5 kg) de Estados Unidos, no tiene apuro y prioriza el precio por encima de todo. Si tu compra pesa menos de 5 kg, si comprás fuera de EE.UU., o si necesitás que llegue para una fecha, elegí otro.

**Veredicto:** Correo Uruguayo compite acá con Casilla Mía, su casillero en Miami, y el trade-off conviene decirlo sin vueltas: es de los más baratos del ranking SOLO arriba de 5 kg (USD 8/kg), y es de los peores servicios del ranking en todo lo demás. Abajo de 5 kg ni siquiera es barato: USD 20/kg de flete, más 10% de TFSPU que no aparece en ningún precio publicado. Y la tarifa de despacho que publican no es la que cobran: la página dice USD 75 hasta CIF 800 y su propia calculadora cobra USD 135 con una factura de USD 201. Eso no es un detalle: son USD 60 sobre un número que la gente usa para decidir. Del lado del servicio, Reddit es demoledor y consistente durante ocho años: avisos de entrega que nunca pasaron, paquetes perdidos por meses, tracking que no sirve y atención que promete devolver el llamado y no lo devuelve. Hay que ser justos en dos cosas: parte de la demora la decide Aduana y el Correo es apenas la ventanilla visible, y a Reddit la gente entra a quejarse, no a felicitar. Pero la evidencia documental (tarifas que se contradicen, franquicia de 800 vs 200, sitio caído) no sale de Reddit: sale de sus propias páginas. Traelo si el paquete pesa, viene de Miami y no te importa esperar. Para cualquier otra cosa, pagá un poco más y andá a otro lado.

**Gaps (resolver a mano):**

- GOOGLE: no tenemos listado confiable para esta ficha. El place_id que traía la investigación (ChIJ98IuaoB_n5URUVfAPbyjMMM, "Casilla", 2,0 con 89 reseñas) es el listado de CASILLA MÍA, que en este ranking es otra entidad; el listado "Correo Uruguayo" (3,8 con 381 reseñas) es la oficina postal, no el servicio de importación. No publicamos ninguno hasta que un humano decida cuál corresponde. trustworthy=false.
- MODELO DE TARIFA: los tiers cargados son tasas MARGINALES sobre una escalera acumulativa de 500 g, no tarifas planas por kilo, y el esquema de tiers no puede expresarlo. Cualquier cálculo automático que haga perKg × kilos totales va a subestimar el flete arriba de 5 kg (10 kg son USD 140, no 80). Hay que implementar el cálculo acumulativo a mano o marcar la ficha como "ver notas".
- DESPACHO: en realidad es una escalera (USD 0 abajo de la franquicia de USD 200 / USD 135 arriba), no un valor único. Cargamos 135 porque es lo que efectivamente se cobra cuando hay despacho; los USD 75 publicados no se pudieron reproducir a ningún valor de factura probado. Falta confirmar si existe algún tramo intermedio.
- Tramo de más de 20 kg (USD 6 cada 500 g, ≈ USD 12/kg): publicado, pero no validado contra la calculadora.
- Seguro / indemnización por pérdida o daño en envíos de Casilla Mía: no hay nada publicado. insuranceIncluded queda en null.
- Entrega al interior: no hay recargo publicado y la FAQ da a entender que la entrega en sucursal está incluida, pero no hay confirmación escrita de que sea gratis. interiorUsd queda en null.
- Tarifa de libros: no existe o no está publicada. booksPerKg queda en null.
- Costo del reembalaje: se cobra "como adicional al costo del flete", pero el monto nunca se publica.
- Peso volumétrico: no publicado. Solo hay medidas máximas (36 x 44 x 61 cm) y peso máximo (30 kg).
- Si el cargo administrativo del Correo por la declaración DNA (USD 1,5 + 5% del impuesto si declarás antes de que llegue; USD 5 + 5% si declarás después) también se aplica a los envíos de Casilla Mía: no aparece como línea en la calculadora.
- AFIRMACIONES DEMOTADAS POR EL FACT-CHECKER, no publicar como hechos: que la calculadora se niega a cotizar arriba de ~USD 500 de factura, y que no devuelve resultado arriba de 20 kg. No se pudieron reproducir; hay que retestearlas.
- Las nueve reseñas de Google de 2021-2023 que la investigación citaba textualmente venían de uy.latinoplaces.com (HTTP 403, y es un espejo, no la fuente). Los temas coinciden con las palabras clave del listado, pero hay que recapturarlas de Google antes de publicar cualquier cita.
- Vigencia de la tarifa: el pie de casillamia.uy dice © 2024 y la página de tarifas no declara fecha de entrada en vigencia. Estaba viva y la calculadora devolvía valores el 2026-07-12.

**Fuentes:** [Tarifas Casilla Mía (flete y gestiones aduaneras)](https://www.casillamia.uy/Tarifas) · [Calculadora oficial del Correo (corrige el despacho: USD 135, no 75)](https://ahiva.correo.com.uy/TransExpressCalculatorWeb) · [Calculadora embebida en el sitio de Casilla Mía](https://www.casillamia.uy/Calculadora.aspx) · [Preguntas frecuentes (90 días de almacenaje, dos vuelos semanales)](https://www.casillamia.uy/preguntas_frecuentes) · [Cómo funciona (franquicia USD 200, un vuelo semanal, "no serán consolidados")](https://www.casillamia.uy/como_funciona) · [URSEC - TFSPU: 10% del precio, excluido el IVA](https://www.gub.uy/unidad-reguladora-servicios-comunicaciones/comunicacion/campanas/tasa-financiamiento-del-servicio-postal-universal) · [Comunicado oficial de Casilla Mía por la caída del sitio (2020)](https://www.correo.com.uy/noticias/-/asset_publisher/x68NfmqmDEKm/content/comunicado-de-casilla-mia) · [Gestiones administrativas para envíos del exterior (Correo)](https://www.correo.com.uy/tarifas/-/asset_publisher/QPpkRS5gHXgr/content/gestiones-administrativas-para-envios-del-exterior) · [Reddit r/uruguay - "Una mierda el correo uruguayo" (2026-01-16)](https://reddit.com/r/uruguay/comments/1qeiqs6/una_mierda_el_correo_uruguayo_lpm/) · [Reddit r/uruguay - "Correo Uruguayo es mi némesis" (2026-01-03)](https://reddit.com/r/uruguay/comments/1q2lmjy/correo_uruguayo_es_mi_némesis_no_no_es_joda/)

---

### DHL Express Uruguay `dhl` — Express

> Rapidísimo y carísimo: para urgencias, no para compras personales.

Courier express puerta a puerta desde 220+ países, con tarifa de lista publicada por peso y zona. No es un casillero: no consolida, no te guarda compras, y el precio es de otro orden de magnitud.

**Tarifa** (verificada 2026-07-12, [fuente](https://mydhl.express.dhl/content/dam/downloads/uy/es/rate-guide/service_and_rate_guide_uy_es_2026.pdf.coredownload.pdf)):

```json
{
 "quoteOnly": false,
 "tiers": [
  {
   "maxKg": 0.5,
   "flat": 163.71
  },
  {
   "maxKg": 1,
   "flat": 175.41
  },
  {
   "maxKg": 1.5,
   "flat": 195.79
  },
  {
   "maxKg": 2,
   "flat": 216.17
  },
  {
   "maxKg": 2.5,
   "flat": 223.99
  },
  {
   "maxKg": 3,
   "flat": 237.87
  },
  {
   "maxKg": 3.5,
   "flat": 251.75
  },
  {
   "maxKg": 4,
   "flat": 265.63
  },
  {
   "maxKg": 4.5,
   "flat": 279.51
  },
  {
   "maxKg": 5,
   "flat": 293.39
  },
  {
   "maxKg": 5.5,
   "flat": 309.08
  },
  {
   "maxKg": 6,
   "flat": 324.77
  },
  {
   "maxKg": 6.5,
   "flat": 340.46
  },
  {
   "maxKg": 7,
   "flat": 356.15
  },
  {
   "maxKg": 7.5,
   "flat": 371.84
  },
  {
   "maxKg": 8,
   "flat": 387.53
  },
  {
   "maxKg": 8.5,
   "flat": 403.22
  },
  {
   "maxKg": 9,
   "flat": 418.91
  },
  {
   "maxKg": 9.5,
   "flat": 434.6
  },
  {
   "maxKg": 10,
   "flat": 450.29
  },
  {
   "maxKg": 11,
   "flat": 478.77
  },
  {
   "maxKg": 12,
   "flat": 507.25
  },
  {
   "maxKg": 13,
   "flat": 535.73
  },
  {
   "maxKg": 14,
   "flat": 564.21
  },
  {
   "maxKg": 15,
   "flat": 592.69
  },
  {
   "maxKg": 16,
   "flat": 621.17
  },
  {
   "maxKg": 17,
   "flat": 649.65
  },
  {
   "maxKg": 18,
   "flat": 678.13
  },
  {
   "maxKg": 19,
   "flat": 706.61
  },
  {
   "maxKg": 20,
   "flat": 735.09
  },
  {
   "maxKg": 21,
   "flat": 767.51
  },
  {
   "maxKg": 22,
   "flat": 799.93
  },
  {
   "maxKg": 23,
   "flat": 832.35
  },
  {
   "maxKg": 24,
   "flat": 864.77
  },
  {
   "maxKg": 25,
   "flat": 897.19
  },
  {
   "maxKg": 26,
   "flat": 929.61
  },
  {
   "maxKg": 27,
   "flat": 962.03
  },
  {
   "maxKg": 28,
   "flat": 994.45
  },
  {
   "maxKg": 29,
   "flat": 1026.87
  },
  {
   "maxKg": 30,
   "flat": 1059.29
  },
  {
   "maxKg": 40,
   "flat": 1341.49
  },
  {
   "maxKg": 50,
   "flat": 1623.69
  },
  {
   "maxKg": 60,
   "flat": 1905.89
  },
  {
   "maxKg": 70,
   "flat": 2188.09
  },
  {
   "maxKg": null,
   "perKg": 32.18
  }
 ],
 "minChargeUsd": 163.71,
 "handlingUsd": 15,
 "handlingPlusIva": null,
 "tspuPct": 0,
 "clearanceUsd": null,
 "interiorUsd": null,
 "booksPerKg": null,
 "insuranceIncluded": false,
 "freeStorageDays": 3,
 "originsPerKg": {
  "us": null,
  "eu": null,
  "cn": null,
  "ar": null
 },
 "transit": "El tramo internacional es al día hábil siguiente y de verdad cumple (hay relatos de Texas a Uruguay en 48 h). El cuello de botella es acá: entre 4 días y una semana o más trabado en aduana, y un caso de 100+ horas para hacer los últimos kilómetros hasta la puerta."
}
```

**Letra chica:** OJO: DHL NO es un courier de casillero y no se puede comparar por USD/kg. Publica una TABLA de tarifa de lista (peso facturable × zona de origen), vigente desde el 1/1/2026. Los escalones de arriba son la columna ZONA 2 = MIAMI del producto DHL EXPRESS WORLDWIDE IMPORT, 'Paquetes desde 0.5 kg' — es el origen comparable contra los casilleros. Cada escalón es el precio TOTAL PLANO del envío cuyo peso facturable cae en ese tramo (DHL redondea al 0,5 kg más cercano hasta 30 kg, y al kg de ahí en adelante). Otras zonas: 1 = Argentina; 3 = resto de EE.UU.; 5 = Europa; 6 = China/Hong Kong — sus columnas están en el PDF y son más caras que Miami. Dejamos originsPerKg en null a propósito: los únicos números por kg que DHL publica (AR 15,24 / Miami 28,22 / resto EE.UU. 32,73 / Europa 42,03 / China 59,07) son el costo MARGINAL de cada kg adicional entre 30,1 y 70 kg, y multiplicarlos por el peso te da un precio falso. A pesos de consumidor manda la base plana: 5 kg desde Miami son USD 293,39, o sea ~USD 59 por kilo, no 28. El precio de tabla NUNCA es el costo final: DHL dice textual que sus tarifas 'excluyen impuestos y aranceles, costo del despacho de aduanas, IVA y cargos adicionales'. Encima va un recargo por combustible variable (un % índice sobre transporte y cargos) que no se puede calcular de antemano, más recargos de temporada alta 'variables según el destino y el peso'. handlingUsd = 15 es el piso del 'Procesamiento de Aranceles e Impuestos' (2% de los impuestos, mínimo USD 15 para clientes sin cuenta, que sos vos); si el pago lo adelanta DHL el mínimo trepa a USD 27,50. Otros cargos publicados: Proceso de liberación USD 16,50, Liberación Formal USD 257, Inspección física USD 20, entrega residencial USD 10,50, áreas remotas USD 0,76/kg con mínimo de USD 41,50. Seguro NO incluido: 'Protección del Valor del Envío' cuesta USD 18 o el 1% del valor, lo que sea MAYOR. Almacenaje: solo 3 días corridos gratis, después USD 15 por envío + USD 0,55 por kg POR DÍA. No existe tarifa preferencial de libros. Y hay algo que la tabla no dice: desde el Decreto 50/026 (vigente 1/5/2026) hay usuarios reportando que DHL cobra USD 40 fijos (uno dice USD 60 en total) para hacerte el trámite PARS/60% que antes hacías gratis vos en VUCE — no está en ninguna tarifa publicada. Por último: esto es precio de LISTA; las cuentas corporativas negocian descuentos grandes, así que una empresa paga bastante menos que esta tabla.

**Google:** `ChIJB7VK5CKGn5URmwQfxY5VmPs` — "DHL Express" · **4,6 ★** (616 reseñas) · [ficha](https://www.google.com/maps/place/?q=place_id:ChIJB7VK5CKGn5URmwQfxY5VmPs)

**Reddit:** muestra **usable** · neto **-20** sobre 11 opiniones

Reddit habla de DHL casi siempre como el courier que te impone el vendedor, no como una opción elegida, y la opinión se parte al medio: cuando el envío viene con impuestos prepagos (Amazon Global Shipping, Starlink, Asos) la experiencia es buena porque DHL se ocupa del papeleo; cuando tenés que despachar vos (compras de China, importaciones PARS) aparecen la burocracia, la tasa de gestión y la nueva tasa fija de USD 40 (+20), y ahí la recomendación de la comunidad es directamente usar un courier de casilla. Nadie defiende a DHL por precio.

> *"No hay que hacer nada, DHL se encarga de todo el papeleo, no hay que pagar nada extra ni consume franquicias."* — [r/uruguay, 2024-05-20](https://reddit.com/r/uruguay/comments/1cwj8es/starlink_en_uruguay_primeros_días_de_uso/) (positivo)

> *"Tabas pidiendo kilombo usar dhl para algo de china, la proxima usa un courier, y ahi la podes pintar mejor, y evitar que la aduana te coja."* — [r/uruguay, 2026-07-02](https://reddit.com/r/uruguay/comments/1ulkdbw/te_cuento_como_fue_comprar_en_china_y_usar_una_de/ov4owms/) (negativo)

> *"Resulta que ahora DHL me dice que con el nuevo [Decreto 50/026](https://www.impo.com.uy/bases/decretos-originales/50-2026), aparte de pagar el 60%, hay que pagarle a DHL (Uruguay) una tasa fija de 40USD (más 20USD).."* — [r/uruguay, 2026-05-27](https://reddit.com/r/uruguay/comments/1tpc98s/importando_con_pars_por_dhl_ahora_hay_que_pagar/) (negativo)

**Scores propuestos:** cumplimiento **62** · atención **58** · transparencia **50** · cobertura **55**

- *cumplimiento:* Base sólida: 616 reseñas de Google (4,6★, 488 de cinco estrellas) más 11 opiniones reales en Reddit y varios incidentes fechados. El tramo aéreo cumple y hasta lo elogian quienes odian el resto. Baja por lo que pasa después de aterrizar: retenciones en aduana de hasta una semana (código rojo, pedido de estados de cuenta y foto de la tarjeta), última milla tercerizada a DAC que degradó un envío puerta a puerta en 'pasá a buscarlo por la sucursal', y fechas de entrega que se corren de lunes a la semana siguiente.
- *atencion:* Evidencia real y contradictoria. A favor: DHL contacta proactivamente para pedirte la cédula y los documentos, y en los flujos Amazon/Starlink el acompañamiento funciona. En contra, y reciente: reseña de fines de junio 2026 con el teléfono atendido pero nadie del otro lado tras 10 llamadas por un caso urgente, y un canal web que es un bot de 5 opciones donde ni podés dejar una consulta. Queda en el medio.
- *transparencia:* Punto raro: en tarifa base DHL es MÁS transparente que casi todos los casilleros — publica la tabla completa peso × zona en PDF, verificable. Pero el precio de tabla nunca es lo que pagás: recargo de combustible variable e incalculable, 2% (mínimo USD 15) sobre los impuestos, seguro aparte, y sobre todo una tasa de USD 40 (+20) por el trámite PARS que cobran desde mayo 2026 y que no figura en ninguna tarifa publicada. Los costos aparecen cuando el paquete ya llegó.
- *cobertura:* Lo mejor y lo peor en la misma fila. Origen: imbatible — 220+ países con tarifa publicada desde Argentina, Miami, resto de EE.UU., Europa y China, mientras los casilleros son casi todos Miami-only. Todo lo demás resta: sin tarifa de interior (solo un recargo por 'áreas remotas' de USD 0,76/kg, mínimo USD 41,50), seguro NO incluido (USD 18 o 1% del valor, el mayor), apenas 3 días corridos de almacenaje gratis, sin tarifa de libros y sin descuento de IVA.

**Banderas rojas:**

- Cobra una tasa que no está en su propia tarifa: usuarios reportan USD 40 fijos (uno dice USD 60 en total) para tramitar la importación PARS/60%, desde que rige el Decreto 50/026 (1/5/2026). La guía de tarifas 2026 es anterior al decreto y no la lista en ningún lado. En el mismo hilo comentan que BuyBox cobra ~USD 4 por el mismo trámite.
- El precio de tabla nunca es lo que pagás. DHL dice textual que sus tarifas 'excluyen impuestos y aranceles, costo del despacho de aduanas, IVA y cargos adicionales', y encima suma un recargo por combustible variable (un % índice) que es imposible calcular de antemano.
- Sobre los impuestos te cobran otro 2%: 'Procesamiento de Aranceles e Impuestos', mínimo USD 15 si no tenés cuenta (o sea, siempre que seas una persona común). Si DHL adelanta el pago, el mínimo sube a USD 27,50.
- Solo 3 días corridos de almacenaje gratis. Después son USD 15 por envío MÁS USD 0,55 por kg, ambos POR DÍA — y como la aduana se traba seguido, eso se acumula rápido.
- El seguro NO viene incluido: USD 18 o el 1% del valor declarado, lo que sea mayor.
- Un orden de magnitud más caro que un casillero para compras personales: 5 kg desde Miami son USD 293,39 de lista y 10 kg USD 450,29, antes de combustible, impuestos e IVA. En Reddit lo describen como que 'cuesta entre 7 y 15 veces más' que una casilla.
- Puerta a puerta no siempre es puerta a puerta: la última milla la subcontratan a DAC. Un comprador que pagó entrega a domicilio no recibió ninguna llamada y le dejaron un papelito para que fuera a buscar el paquete a la sucursal.
- El teléfono es un problema. La reseña negativa más reciente (fines de junio 2026) dice que atienden, se escucha ruido de fondo y nadie contesta, 10 veces seguidas por un caso urgente. La web es un bot de 5 opciones donde ni siquiera podés dejar una consulta.
- El que te frena no es el vuelo, es la aduana: hay reportes de 48 h de tránsito internacional y después 100+ horas trabado adentro del país, y de paquetes en franquicia marcados 'código rojo' y retenidos una semana mientras DHL/Aduana piden estados de cuenta y foto de la tarjeta.
- Trampa DDP: si dejás que Amazon te prepague los impuestos, DHL te dice que ya no podés ampararte en la franquicia porque el envío viajó INCOTERM DDP. Perdés la exoneración que creías tener.
- El mito de que 'DHL hace todo por vos' es falso incluso en el caso bueno: en la compra de una notebook por Amazon el comprador igual tuvo que firmar a mano un documento de Mandato dándole poder a un despachante (que un courier pasó a buscar en original) y abrirse usuario en VUCE por el trámite ante URSEC.

**A favor:** 
- El tramo internacional vuela: entrega prometida al día hábil siguiente y casos reales de Texas a Uruguay en 48 horas. Nadie llega más rápido.
- Publica una tarifa de lista completa y verificable (tabla peso × zona, vigente desde el 1/1/2026). Podés saber el flete base antes de comprar — cosa que muchos casilleros no te dan.
- Cobertura de origen imbatible: 220+ países, con tarifa desde Argentina, Miami, resto de EE.UU., Europa y China. Los casilleros son casi todos solo Miami.
- Cuando el vendedor paga el envío y los impuestos (Amazon Global Shipping, Starlink, Asos), el flujo funciona de punta a punta: DHL te pide los papeles, gestiona el despacho y te lo deja en la puerta. Caso fechado: notebook de Amazon aterrizó el 2/12 y estaba entregada el 6/12.
- Reputación agregada alta y real en Google: 4,6★ sobre 616 reseñas, 91% de 4★ o más, listado verificado por el dueño.
- Seis puntos físicos de atención (Ciudad Vieja, Carrasco/Casa Central, Montevideo Shopping, Tres Cruces, Punta del Este, Ciudad de la Costa).

**En contra:** 
- Carísimo para compras personales. 5 kg desde Miami: USD 293,39 de flete de lista, y todavía te falta el combustible, los impuestos y el IVA. Un casillero te cobra una fracción de eso.
- Cobra USD 40 (+20) por el trámite PARS que no figura en su tarifa publicada, mientras un casillero hace lo equivalente por unos USD 4.
- El precio real es incalculable de antemano: recargo de combustible variable, 2% (mínimo USD 15) sobre los impuestos, seguro aparte.
- Casi nunca lo elegís vos: te lo impone el vendedor. Y si tenés que despachar por tu cuenta, es donde peor funciona.
- La aduana lo come vivo: retenciones de una semana, 'código rojo', pedidos de estados de cuenta y foto de la tarjeta.
- Solo 3 días de almacenaje gratis, seguro no incluido, sin tarifa de libros y sin lista de entrega al interior.
- Atención al cliente degradada: bot de 5 opciones en la web y un teléfono que atiende pero no responde.

**Para quién:** Para el que necesita algo urgente y caro y el flete no le mueve la aguja: un repuesto que frena una fábrica, una muestra, un documento con fecha. También si tu vendedor ya lo impuso y te pagó el envío con impuestos incluidos (Amazon Global Shipping, Starlink) — ahí el flujo funciona y no tenés que hacer casi nada. Si estás comparando cómo traer una compra personal de Miami, esto no es para vos: andá a un casillero.

**Veredicto:** DHL es el mejor courier de esta lista en todo menos en lo único que a vos te importa acá: el precio. El avión llega al otro día, la cobertura es de 220+ países y — sorpresa — publica una tabla de tarifas completa y auditable, cosa que muchos casilleros ni sueñan. Verificamos esa tabla contra el PDF oficial y no encontramos un solo número mal. El problema es que 5 kg desde Miami arrancan en USD 293 de flete, y eso es antes del combustible, del 2% (mínimo USD 15) sobre los impuestos, del seguro que no viene incluido y del IVA. Para una compra personal estás pagando entre 7 y 15 veces lo que te cobra una casilla. Y el precio publicado tampoco te salva: desde mayo de 2026 aparecieron reportes de una tasa de USD 40 (+20) por hacerte el trámite PARS que no está en ninguna tarifa — un casillero cobra unos USD 4 por lo mismo. Sumale que el cuello de botella no es el vuelo sino la aduana uruguaya (una semana de burocracia, código rojo, foto de la tarjeta) y que la última milla se la dan a DAC. Conclusión honesta: DHL es rápido, serio y transparente en el flete base, pero es el camino más caro y con las sorpresas más caras. Sirve para urgencias o cuando el vendedor ya te lo impuso con los impuestos pagos. Para traer tus compras, no.

**Gaps (resolver a mano):**

- TSPU (10%): NO VERIFICADO. Publicamos tspuPct=0 solo porque el modelo exige un número, no porque hayamos confirmado que DHL no lo cobra. La guía de tarifas 2026 no menciona ni una vez TSPU, URSEC ni 'servicio postal universal' (se buscó en el texto completo del PDF). Hay que confirmarlo con DHL o con URSEC antes de que alguien lo lea como 'DHL no cobra TSPU'.
- clearanceUsd = null: el 'Proceso de liberación' de USD 16,50 existe y está publicado, pero la guía nunca dice cuándo se aplica y no se pudo confirmar que se cobre en toda importación. Los cargos que SÍ le pegan seguro a una persona (el piso de USD 15 por procesamiento de impuestos y la tasa PARS reportada) no entran en este campo, así que el costo final modelado subestima a DHL.
- interiorUsd = null: DHL no publica NINGUNA tarifa de entrega al interior del Uruguay. Los USD 41,50 que circulan son el mínimo del recargo por 'Entrega en Áreas Remotas' (USD 0,76/kg), que no es lo mismo. Falta averiguar qué localidades del interior entran en 'área remota'.
- originsPerKg = null a propósito: DHL no cobra por kg sino por tabla peso × zona. Los únicos valores por kg publicados (AR 15,24 / Miami 28,22 / resto EE.UU. 32,73 / Europa 42,03 / China 59,07) son el costo marginal del kg adicional entre 30,1 y 70 kg y NO sirven para cotizar un paquete de consumidor. Si el sitio necesita un USD/kg comparable, hay que derivarlo de los escalones, no de estos números.
- Los escalones publicados son SOLO ZONA 2 (Miami). Europa (zona 5) y China (zona 6) son bastante más caros y sus columnas están en el PDF sin cargar. Falta decidir si mostramos zona por zona.
- Tasa PARS de USD 40 (+20): alcance, permanencia y base legal sin confirmar. La única evidencia es un usuario citando un mail de DHL (mayo 2026); él mismo dice que 'no está claro si ese 20USD es siempre o depende del tiempo de almacenamiento'. Hay que pedírselo a DHL por escrito antes de tratarlo como tarifa.
- Recargo por combustible: es un porcentaje índice variable que se suma a TODOS los envíos y no se puede calcular desde la guía. Cualquier cotizador nuestro va a subestimar el flete de DHL hasta conseguir el índice vigente.
- El 4,6★ de Google puede no medir la experiencia de importación: el listado es la Casa Central (mostrador, Av. de las Américas 7777 Bis, Ciudad de la Costa) y muchas 5★ parecen ser de atención presencial, mientras casi todas las 1★ son de importaciones y soporte. No leer el promedio como puntaje de importador.
- handlingUsd = 15 es el PISO (2% de los impuestos, mínimo USD 15). El costo real sube con el valor de la compra y no está modelado. handlingPlusIva quedó en null: no se pudo confirmar si ese cargo lleva IVA encima.
- Precios de cuenta: la tabla es precio de LISTA. Las cuentas corporativas negocian descuentos grandes y no hay ninguna grilla publicada, así que para una empresa esta tarifa puede estar bastante inflada.
- Sin datos de Trustpilot (403 en todas las consultas) ni hilos de gameover.uy / mtb.uy. No es evidencia de ausencia, es falta de cobertura.

**Fuentes:** [DHL Express Uruguay — Service & Rate Guide 2026 (PDF oficial, vigente 1/1/2026)](https://mydhl.express.dhl/content/dam/downloads/uy/es/rate-guide/service_and_rate_guide_uy_es_2026.pdf.coredownload.pdf) · [DHL Express Uruguay — sitio oficial](https://www.dhl.com/uy-es/home/express.html) · [Google Maps — DHL Express (Casa Central, Ciudad de la Costa): 4,6★ / 616 reseñas](https://www.google.com/maps/place/?q=place_id:ChIJB7VK5CKGn5URmwQfxY5VmPs) · [Reddit r/uruguay — 'Importando con PARS por DHL, ahora hay que pagar 40USD' (27/5/2026)](https://www.reddit.com/r/uruguay/comments/1tpc98s/importando_con_pars_por_dhl_ahora_hay_que_pagar/) · [Reddit r/uruguay — compra en China por DHL, 'código rojo' y tasa de gestión (2/7/2026)](https://www.reddit.com/r/uruguay/comments/1ulkdbw/te_cuento_como_fue_comprar_en_china_y_usar_una_de/) · [Reddit r/uruguay — notebook por Amazon, cronología del despacho con DHL (7/12/2024)](https://www.reddit.com/r/uruguay/comments/1h8j5c6/compra_notebook_por_amazon_aclaro_algunas_dudas/) · [Reddit r/uruguay — paquete retenido en aduana por DHL (Asos, 8/2021)](https://www.reddit.com/r/uruguay/comments/pat7jg/consulta_sobre_aduanas_dhl_y_un_paquete_retenido/) · [IMPO — Decreto 50/026 (el operador postal pasa a ser responsable tributario, vigente 1/5/2026)](https://www.impo.com.uy/bases/decretos-originales/50-2026) · [URSEC — Tasa de Financiamiento del Servicio Postal Universal (TSPU)](https://www.gub.uy/unidad-reguladora-servicios-comunicaciones/comunicacion/campanas/tasa-financiamiento-del-servicio-postal-universal)

---

### FedEx Uruguay `fedex` — Express

> Rápido, global y carísimo: no es un casillero, es un courier express.

Courier express puerta a puerta con despacho de aduana incluido; el vendedor despacha por FedEx, no hay casilla ni consolidación.

**Tarifa** (verificada 2026-07-12, [fuente](https://www.fedex.com/content/dam/fedex/international/rates/fedex-rates-all-es-uy-2026.pdf)):

```json
{
 "quoteOnly": false,
 "tiers": [
  {
   "maxKg": 0.5,
   "flat": 134.3,
   "perKg": null
  },
  {
   "maxKg": 1,
   "flat": 146.7,
   "perKg": null
  },
  {
   "maxKg": 1.5,
   "flat": 159.1,
   "perKg": null
  },
  {
   "maxKg": 2,
   "flat": 171.5,
   "perKg": null
  },
  {
   "maxKg": 2.5,
   "flat": 183.9,
   "perKg": null
  },
  {
   "maxKg": 3,
   "flat": 196,
   "perKg": null
  },
  {
   "maxKg": 3.5,
   "flat": 208.1,
   "perKg": null
  },
  {
   "maxKg": 4,
   "flat": 220.2,
   "perKg": null
  },
  {
   "maxKg": 4.5,
   "flat": 232.3,
   "perKg": null
  },
  {
   "maxKg": 5,
   "flat": 244.4,
   "perKg": null
  },
  {
   "maxKg": 5.5,
   "flat": 255.4,
   "perKg": null
  },
  {
   "maxKg": 6,
   "flat": 266.4,
   "perKg": null
  },
  {
   "maxKg": 6.5,
   "flat": 277.4,
   "perKg": null
  },
  {
   "maxKg": 7,
   "flat": 288.4,
   "perKg": null
  },
  {
   "maxKg": 7.5,
   "flat": 299.4,
   "perKg": null
  },
  {
   "maxKg": 8,
   "flat": 310.4,
   "perKg": null
  },
  {
   "maxKg": 8.5,
   "flat": 321.4,
   "perKg": null
  },
  {
   "maxKg": 9,
   "flat": 332.4,
   "perKg": null
  },
  {
   "maxKg": 9.5,
   "flat": 343.4,
   "perKg": null
  },
  {
   "maxKg": 10,
   "flat": 354.4,
   "perKg": null
  },
  {
   "maxKg": 10.5,
   "flat": 367.1,
   "perKg": null
  },
  {
   "maxKg": 11,
   "flat": 379.8,
   "perKg": null
  },
  {
   "maxKg": 11.5,
   "flat": 392.5,
   "perKg": null
  },
  {
   "maxKg": 12,
   "flat": 405.2,
   "perKg": null
  },
  {
   "maxKg": 12.5,
   "flat": 417.9,
   "perKg": null
  },
  {
   "maxKg": 13,
   "flat": 430.6,
   "perKg": null
  },
  {
   "maxKg": 13.5,
   "flat": 443.3,
   "perKg": null
  },
  {
   "maxKg": 14,
   "flat": 456,
   "perKg": null
  },
  {
   "maxKg": 14.5,
   "flat": 468.7,
   "perKg": null
  },
  {
   "maxKg": 15,
   "flat": 481.4,
   "perKg": null
  },
  {
   "maxKg": 15.5,
   "flat": 494.1,
   "perKg": null
  },
  {
   "maxKg": 16,
   "flat": 506.8,
   "perKg": null
  },
  {
   "maxKg": 16.5,
   "flat": 519.5,
   "perKg": null
  },
  {
   "maxKg": 17,
   "flat": 532.2,
   "perKg": null
  },
  {
   "maxKg": 20.5,
   "flat": 537.6,
   "perKg": null
  }
 ],
 "minChargeUsd": null,
 "handlingUsd": null,
 "handlingPlusIva": null,
 "tspuPct": 0,
 "clearanceUsd": null,
 "interiorUsd": null,
 "booksPerKg": null,
 "insuranceIncluded": true,
 "freeStorageDays": null,
 "originsPerKg": {
  "us": null,
  "eu": null,
  "cn": null,
  "ar": null
 },
 "transit": "International Priority: 1 a 3 días hábiles puerta a puerta con despacho incluido. International Economy: 4 a 6 días hábiles."
}
```

**Letra chica:** TSPU: EL 0% DE ESTA FICHA SIGNIFICA 'NO DECLARADO', NO 'NO SE COBRA'. La tarifa de FedEx no tiene ninguna línea de TSPU ni de URSEC, pero eso no prueba que no se aplique. No lo tomes como que estás exento.

LEÉ ESTO ANTES DE MIRAR LOS PRECIOS. FedEx NO es un casillero. No hay casilla en Miami, no hay consolidación, no hay tarifa por kilo. Es un courier express: el vendedor tiene que despachar por FedEx y FedEx te lo trae puerta a puerta. Compararlo con Aerobox o USX es comparar dos productos distintos.

QUÉ SON LOS PRECIOS DE ARRIBA: FedEx International Priority, IMPORTACIÓN, Zona C (= Estados Unidos), en caja común ("Envíos en otro tipo de embalaje"), según la Guía de Servicios y Tarifas 2026 vigente desde el 5 de enero de 2026. Cada escalón es un precio FIJO por el envío entero a ese peso, no por kilo. Las fracciones de kilo REDONDEAN PARA ARRIBA: 11,2 kg te cobra el escalón de 11,5 kg (USD 392,50).

HAY UNA TARIFA MÁS BARATA QUE CASI NADIE MIRA: las cajas FedEx 10 kg Box y 25 kg Box tienen precio plano de importación (Zona C): USD 288,40 hasta 10 kg y USD 481,40 hasta 25 kg. O sea que 10 kg desde EE.UU. te salen USD 288,40 con la caja de FedEx en lugar de USD 354,40 en caja común: USD 66 menos (19%). Requiere el embalaje propio de FedEx y solo aplica a International Priority.

OTROS ORÍGENES (Priority, importación, caja común). Argentina es Zona A, EE.UU. Zona C, Europa (España, Alemania, Francia, Italia, UK) y China Zona D:

  1 kg — AR 100,80 | US 146,70 | EU/CN 236,90

  5 kg — AR 146,30 | US 244,40 | EU/CN 375,90

  10 kg — AR 190,30 | US 354,40 | EU/CN 539,90

  20 kg — AR 237,30 | US 537,60 | EU/CN 774,90

International Economy (4 a 6 días, más barato) Zona C: 1 kg 136,80 | 5 kg 222,60 | 10 kg 329,60.

Para dimensionar: un courier de casilla cobra ~USD 9-11 el kilo. FedEx está 7 a 15 veces arriba.

ARRIBA DE 20,5 KG el precio no es por kilo desde cero: se toma la base de USD 537,60 (20,5 kg) y se le suma un marginal por kilo adicional — 25,60 (21-44 kg), 23,80 (45-70 kg), 22,80 (71+ kg). Calcular 25 kg × 25,60 está MAL; lo correcto es 537,60 + (4,5 × 25,60). Por eso no cargamos ese tramo como escalón abierto: el modelo lo mostraría como una tarifa por kilo desde cero y sería un error de cientos de dólares.

EL PRECIO DE LISTA NO ES EL PRECIO FINAL. La guía aclara en cada página que las tarifas NO incluyen el recargo por combustible (se revisa SEMANALMENTE y el porcentaje no se publica en el sitio uruguayo), el peso dimensional, los cargos por manejo especial, ni impuestos y aranceles.

SIN cargo fijo de handling: en su lugar hay cargos sueltos — corrección de dirección USD 22 por envío; facturar sin número de cuenta válido USD 22; facturación a terceros 3,5% del total; entrega en sábado USD 62; firma directa/adulto USD 6, indirecta USD 3.

DESPACHO: FedEx dice que el despacho de aduana estándar va incluido, pero también que "puede cobrar una tarifa por despacho de aduana estándar en algunos países" y facturar servicios auxiliares. No hay monto publicado para Uruguay.

INTERIOR: no es un número, son tres. El recargo por fuera de área de entrega tiene Nivel A USD 4 por envío; Nivel B el mayor entre USD 37 o USD 1/kg; Nivel C el mayor entre USD 45 o USD 1/kg. Qué código postal uruguayo cae en qué nivel está en una lista aparte que no verificamos.

SEGURO: el "valor declarado para transporte" es gratis hasta el mayor entre USD 100 o USD 20/kg; por encima cuesta USD 1,20 cada USD 100 declarados. Es responsabilidad del transportista, no un seguro completo.

LIBROS: no existe tarifa preferencial de libros/CD/DVD. Van como carga común.

DESCUENTO REAL PUBLICADO: FedEx Uruguay promociona "Amamos los miércoles — Consigue un 50% de descuento en tus envíos internacionales cada miércoles en los Centros de Envío FedEx". Es para envíos hechos en el mostrador, no para importar, y NO es un descuento por abrir cuenta.

RÉGIMEN DE IMPORTACIÓN (Decreto 50/2026, vigente desde el 1 de mayo de 2026). FedEx opera los dos regímenes, que son EXCLUYENTES. (a) Franquicia: USD 800 acumulados por persona por año calendario, máximo 3 envíos, hasta 20 kg, mayor de 18 con cédula uruguaya y pago con tarjeta emitida en Uruguay a su nombre. Ojo con el IVA: los envíos de origen EE.UU. con factura de hasta USD 200 siguen EXENTOS de IVA (TIFA, Ley 18.761 art. 7 lit. g), y es todo o nada — un dólar por encima y el envío entero paga. (b) Prestación Única: valor declarado hasta USD 800 y hasta 20 kg, 60% del valor de factura reemplazando todo lo demás, con un MÍNIMO de USD 20 por envío pase lo que pase.

**Google:** `ChIJxTS4arB7CpURZg_fU3-mmeg` — "Centro de Envío FedEx" · **4,1 ★** (160 reseñas) · [ficha](https://www.google.com/maps/place/?q=place_id:ChIJxTS4arB7CpURZg_fU3-mmeg)

**Reddit:** muestra **thin** · neto **-30** sobre 7 opiniones

De 40 frases apenas 7 son opiniones reales; el resto son menciones de paso o preguntas. Casi todas apuntan a lo mismo: el precio. Un usuario cotizó el mismo envío en USD 80 por FedEx contra USD 10 por Aerobox. Del otro lado, en todo el corpus no aparece un solo paquete perdido, robado ni demorado, y quien lo defiende lo hace por eso: te gestionan el despacho y te lo dejan en la puerta. Muestra fina y poco independiente: tres de las opiniones salen del mismo hilo y del mismo día.

> *"Yo use la calculadora que tienen en las páginas para saber cuánto me cobrarían por un envío y Fedex te arranca las muelas sin anestesia algo que aerobox te cobra USD 10 Fedex USD 80"* — [r/uruguay, 2022-07-09](https://reddit.com/r/uruguay/comments/vul4ay/malisima_experiencia_con_tiendamia_no_les_compren/ifha0wc/) (negativo)

> *"si no dice eso pero te figura en lista cuando buscaste es porque se vende al exterior, o sea tiendamia te lo trae, pero viene en barco.O sea Amazon NO te lo trae, a uruguay traen por DHL (buenisimos) o Fedex (el peor courier de la historia) ambos por avion )."* — [r/uruguay, 2022-07-09](https://reddit.com/r/uruguay/comments/vul4ay/malisima_experiencia_con_tiendamia_no_les_compren/ifh36rl/) (negativo)

> *"estando acostumbrada a comprar los álbumes musicales que me los trae Fedex y que ellos, DIVINOS COMO SIEMPRE QUE LOS AMO, me gestionan todo precioso."* — [r/uruguay, 2022-11-15](https://reddit.com/r/uruguay/comments/yw18r7/la_aduana_no_sirve_para_nada/iwiyboc/) (positivo)

**Scores propuestos:** cumplimiento **62** · atención **45** · transparencia **70** · cobertura **72**

- *cumplimiento:* Hay evidencia real: 327 reseñas de Google entre los tres locales (4,1/160 en el aeropuerto, 3,5/130 y 3,1/37 en Montevideo; promedio ponderado ~3,75) y más de tres incidentes fechados. A favor: el tránsito más rápido de la lista (1 a 3 días con despacho) y, en 43 menciones de Reddit, ni un solo paquete perdido o robado. En contra: escaneos de entrega fantasma, un envío DDP marcado como entregado sin entregar (~abr 2026), documentación de despacho trabada una semana (~dic 2025), un libro que llegó empapado y roto, y errores de declaración de FedEx facturados al cliente (~may 2026). La muestra de Reddit es fina (7 opiniones), así que el peso lo lleva Google.
- *atencion:* Evidencia suficiente y consistentemente mala del lado importación: los locales físicos no tienen teléfono y todo muere en el call center (reseña de un Local Guide con 116 reseñas, ~ene 2026); mails y llamadas sin respuesta en varias reseñas; a un usuario lo derivaron al 'soporte técnico de correos uruguayos', que no existe, y terminó anunciando denuncia en Defensa al Consumidor (~oct 2025). Sube algo por el mostrador de envíos, donde el trato personal recibe elogios con nombre propio (Marcos, Emiliano, Hernán) y el local del aeropuerto puntúa 4,1.
- *transparencia:* Es el operador que más publica de toda la lista: guía de tarifas 2026 de 32 páginas, descargable, con precios por zona y peso, cargos accesorios y fecha de vigencia; se pudo reconstruir y verificar tabla por tabla. Lo que le impide subir más: el precio publicado nunca es el final — el recargo por combustible se revisa SEMANALMENTE y no se publica en el sitio uruguayo, no hay monto de despacho para Uruguay, no hay días de depósito gratis y el recargo de interior depende de una lista de códigos postales que no está en la guía.
- *cobertura:* Llega a orígenes que ningún casillero cubre (Europa, China, Japón: 220 países y territorios), entrega en el interior aunque con recargo, e incluye responsabilidad por valor declarado hasta el mayor entre USD 100 o USD 20/kg. Pierde puntos justo donde el resto de la lista sí ofrece algo: no hay tarifa de libros, no hay días de almacenamiento gratis publicados, no hay descuento de IVA propio y el recargo de interior no es un número conocido.

**Banderas rojas:**

- No es un casillero. No hay casilla en Miami ni en Europa, no hay consolidación, no existe el 'comprá en Amazon que te lo traemos'. El VENDEDOR tiene que despachar por FedEx. Si venís comparando contra Aerobox, Grinbox o USX, estás comparando dos cosas distintas.
- La diferencia de precio es de otro orden de magnitud: una caja de 5 kg desde EE.UU. sale USD 244,40 por Priority (o USD 222,60 por Economy) contra unos USD 45-55 en un courier de casilla a ~USD 9-11 el kilo.
- El precio publicado NUNCA es el precio final. Cada página de la guía aclara que las tarifas excluyen el recargo por combustible (se revisa SEMANALMENTE y FedEx no publica el porcentaje en el sitio uruguayo), el peso dimensional, los cargos por manejo especial y los impuestos. Y las fracciones de kilo redondean para arriba.
- El TSPU/URSEC figura como 0% en nuestra ficha porque el sistema exige un número: significa NO DECLARADO, no 'no se cobra'. La tarifa de FedEx no menciona el TSPU en ninguna de sus 32 páginas, y eso no es prueba de exención.
- Los errores de papeleo de FedEx te los cobran a vos. Reseña de Google (~may 2026): 'No declararon el paquete a tiempo y, como consecuencia de ese error de ellos, terminé teniendo que pagar recargos que no corresponden.'
- Problemas con los escaneos de entrega: varios reportes de 'pasamos por tu domicilio' sin que haya pasado nadie, y un envío DDP (todo prepago por el remitente) marcado como entregado cuando no lo estaba (~abr 2026). A más de uno lo terminaron mandando a retirar el paquete él mismo.
- El soporte es call center y nada más: los locales no tienen teléfono. 'no tienen teléfono en el local, por lo q nunca podés hablar con una oficina, morís siempre en el call center' (~ene 2026, Local Guide con 116 reseñas). Hay mails y llamadas sin respuesta, y un usuario que anunció denuncia en Defensa al Consumidor.
- El 4,1 de Google es el local menos representativo para vos. Hay tres 'Centro de Envío FedEx': aeropuerto/Canelones 4,1 (160 reseñas), Ciudad Vieja 3,5 (130) y Av. Herrera 3,1 (37). El promedio ponderado real es ~3,75. El 4,1 es el mostrador donde la gente va a MANDAR cosas; las quejas de importación se concentran en los dos locales de Montevideo, que es justo la experiencia que vos vas a tener.
- Cuidado con el flete y el tope de la franquicia. Hay usuarios que quedaron arriba del tope sumando producto + envío de FedEx (2021: USD 95 de producto + USD 137 de flete = USD 232, paquete abandonado; 2023: un servicio de liberación se lo rechazó por eso; jun 2026: retención y multa por no incluir el costo de envío en el formulario). OJO: esos casos son del régimen VIEJO (Decreto 356/014, derogado). Con el Decreto 50/2026 art. 5 el tope se mide sobre el TOTAL DE LA FACTURA (precio + envío que te cobra el vendedor), y el flete que FedEx te factura aparte quedaría afuera — pero eso es una interpretación nuestra, no está confirmado por Aduanas. Si el vendedor te pone el flete de FedEx en la factura, suma. No des por sentada ninguna de las dos cosas: preguntá antes de comprar.
- IVA en franquicia: los envíos de origen EE.UU. con factura de hasta USD 200 siguen EXENTOS de IVA (TIFA, Ley 18.761 art. 7 lit. g). Es todo o nada: un dólar por encima de USD 200 y el envío entero paga IVA. La franquicia además está topeada en 20 kg y exige cédula uruguaya, 18 años y pago con tarjeta emitida en Uruguay a tu nombre — empresas y no residentes quedan afuera.
- El régimen alternativo (Prestación Única, 60% del valor) tiene un MÍNIMO de USD 20 de impuesto por envío, sin importar el valor: una pavada de USD 15 igual te cuesta USD 20 de impuesto.
- No existe tarifa preferencial de libros/CD/DVD, a diferencia de casi todos los couriers locales. Los libros van como carga común (y a un usuario le llegó empapado y roto).
- El recargo por entrega en el interior existe pero no es un número: son tres niveles (USD 4; el mayor entre USD 37 o USD 1/kg; el mayor entre USD 45 o USD 1/kg) y qué código postal cae en cuál está en una lista aparte que no pudimos verificar.

**A favor:** 
- El tránsito más rápido de toda la lista, sin competencia: 1 a 3 días hábiles puerta a puerta con despacho de aduana incluido (Economy, 4 a 6 días).
- Llega desde donde ningún casillero llega: Europa, China, Japón, cualquier país. Varios hilos de r/uruguay terminan en FedEx justamente porque no hay courier con casilla en Francia o en China.
- Publica un tarifario completo, descargable y verificable (guía 2026 de 32 páginas). Es más transparencia de precios de lista que la de casi cualquier courier local, aunque el precio sea alto.
- Hay una tarifa más barata que casi nadie mira: las cajas FedEx 10 kg Box (USD 288,40) y 25 kg Box (USD 481,40) desde EE.UU. Para 10 kg te ahorrás USD 66 contra la caja común.
- Ellos hacen de despachante: te mandan el consentimiento por mail y sacan el paquete de la aduana sin que hagas ningún trámite. Es la razón principal por la que quien lo banca, lo banca.
- En 43 menciones de Reddit no aparece un solo paquete perdido, robado ni demorado — algo llamativo para el estándar del subreddit.
- Cubre responsabilidad por valor declarado sin costo hasta el mayor entre USD 100 o USD 20/kg.

**En contra:** 
- El precio. Es la queja repetida en todos los canales desde 2019 hasta 2026: 7 a 15 veces más caro que un courier de casilla. Un usuario cotizó el mismo envío en USD 80 contra USD 10 de Aerobox.
- El precio de lista no es el precio final: falta el recargo por combustible (semanal, no publicado en el sitio uruguayo), el peso dimensional, los cargos por manejo y los impuestos.
- El servicio de importación puntúa notoriamente peor que el mostrador de envíos: 3,5 y 3,1 en los dos locales de Montevideo contra 4,1 en el del aeropuerto.
- Los locales no tienen teléfono: todo muere en el call center, y hay varias reseñas de mails y llamadas sin respuesta.
- Errores de papeleo de FedEx facturados al cliente, escaneos de entrega falsos y un DDP marcado como entregado sin entregar.
- No hay tarifa de libros, no hay días de depósito gratis publicados y el recargo por interior es una incógnita de tres niveles.
- No sirve para el caso más común: comprar vos en Amazon o eBay y que te lo traigan. Para eso necesitás un casillero, no FedEx.

**Para quién:** El que necesita traer algo desde un origen que ningún casillero cubre (Europa, China, Japón) o que no puede esperar dos semanas, y tiene con qué bancar 7 a 15 veces el precio de un courier de casilla. También sirve cuando el vendedor ya despacha por FedEx y no te da otra opción, o para cosas caras y chicas donde el flete pesa poco contra el valor de la mercadería.

**Veredicto:** FedEx es el único de la lista que no te vende una casilla: te vende velocidad y alcance global, y te los cobra. Es rapidísimo (1 a 3 días hábiles con el despacho hecho por ellos), llega desde cualquier país del mundo y publica el tarifario más completo de toda la comparativa: una guía de 32 páginas que se puede verificar línea por línea. El problema es el número. Una caja de 5 kg desde EE.UU. son USD 244,40 de lista contra unos USD 50 en un courier de casilla, y el precio de lista tampoco es el final, porque falta un recargo por combustible que cambia todas las semanas y que FedEx no publica en el sitio uruguayo. Si igual vas a usarlo, mirá primero las cajas FedEx 10 kg y 25 kg Box: para 10 kg desde EE.UU. son USD 288,40 en lugar de USD 354,40, un 19% menos por el mismo servicio, y casi nadie sabe que existen. En reputación, ojo con el 4,1 de Google: ese es el mostrador del aeropuerto, donde la gente va a MANDAR paquetes. La experiencia que a vos te toca —recibir una importación— vive en los otros dos locales, que puntúan 3,5 y 3,1, con reseñas fechadas de papeleo de aduana mal hecho por ellos y facturado a vos, entregas marcadas como hechas que nunca ocurrieron, y locales sin teléfono donde todo termina en el call center. La contracara honesta: en 43 menciones de Reddit no hay un solo paquete perdido. Resumiendo: FedEx llega, llega rápido y llega entero; llega caro y, si algo sale mal, te vas a pelear con un call center. Elegilo por necesidad —origen exótico, urgencia real, mercadería cara— no por conveniencia.

**Gaps (resolver a mano):**

- TSPU/URSEC: NO DECLARADO. El campo tspuPct quedó en 0 SOLO porque el esquema exige un número y no acepta null; el valor correcto es 'desconocido'. La tarifa de FedEx no tiene ninguna línea de TSPU ni URSEC (cero coincidencias en las 32 páginas), pero eso no prueba que no se aplique. LA PÁGINA NO DEBE RENDERIZAR 'TSPU: no' desde este campo: hay que confirmarlo con URSEC o con FedEx antes de publicar un sí o un no.
- El porcentaje actual del recargo por combustible. Cambia todas las semanas y el sitio uruguayo solo explica el mecanismo y linkea al índice del DOE de EE.UU.: no publica ninguna cifra. Mueve el precio final de forma material y no lo vamos a inventar.
- El monto del despacho de aduana para Uruguay. FedEx dice que el despacho estándar va incluido pero también que 'puede cobrar una tarifa por despacho de aduana estándar en algunos países'. La página de servicios auxiliares es prosa genérica sin tabla de tarifas para Uruguay.
- Días de almacenamiento gratis, tanto en FedEx como en el depósito aduanero (LACC). No están publicados en ningún lado.
- Si FedEx cobra un cargo de adelanto/desembolso por pagarle los tributos a la Aduana por vos. La mayoría de los mercados de FedEx lo cobran; la guía uruguaya no lo lista (cero coincidencias para 'desembolso', 'adelanto', 'advancement' y 'disbursement').
- Qué códigos postales uruguayos caen en Nivel A, B o C del recargo por fuera de área de entrega — o sea, cuánto cuesta realmente entregar en Salto, Rivera o Maldonado. La lista es un documento aparte que no verificamos, por eso interiorUsd es null.
- Los escalones de medio kilo entre 17,5 y 20,5 kg (17,5 / 18,5 / 19,5 / 20,0). FedEx tabula cada 0,5 kg hasta 20,5 kg, pero ni la investigación ni la verificación los enumeraron. Como las fracciones redondean para arriba, un paquete de 17,1 a 20,4 kg puede quedar mal cotizado con nuestra tabla: hay que verificarlo contra el PDF (página impresa 16) antes de publicar.
- El tramo de más de 20,5 kg no está cargado como escalón: el marginal de USD 25,60/kg se SUMA a la base de USD 537,60 y el modelo de escalones lo mostraría como una tarifa por kilo desde cero. Si la página tiene que cotizar por encima de 20,5 kg, necesita lógica de marginal, no un escalón más.
- El precio que la gente realmente paga. Estas son tarifas de LISTA. La afirmación de un 20% de descuento por abrir cuenta resultó FALSA (no existe ni en la guía, ni en rates.html, ni en el home uruguayo). El único descuento publicado es el 50% de los miércoles en los Centros de Envío, que es para MANDAR, no para importar. Las tarifas corporativas negociadas existen pero no son públicas: la brecha entre lista y pagado es desconocida.
- No hay cargo fijo de handling publicado (handlingUsd = null): FedEx cobra recargos sueltos en su lugar. Si existe algún cargo administrativo local no publicado, no lo conocemos.
- El flete de FedEx, ¿cuenta para el tope de la franquicia? Bajo el Decreto 50/2026 art. 5 el tope se mide sobre el total de la factura, y el flete facturado aparte por el courier quedaría afuera — pero es una inferencia sin confirmación de Aduanas. Es la duda con más impacto económico de toda la ficha y hay que confirmarla con Aduanas.
- No encontramos ningún reporte de incidentes fechado y específico de FedEx Uruguay en gameover.uy ni mtb.uy. Trustpilot tiene perfil de FedEx pero es global, no uruguayo, y lo excluimos a propósito para no hacer pasar un puntaje global por evidencia local.
- No se pudieron leer las reseñas del local mejor puntuado (aeropuerto, 4,1/160): la pestaña de reseñas no cargó. Que ese 4,1 refleje el mostrador de envíos y no la experiencia de importación es una inferencia razonable, no un hecho verificado.

**Fuentes:** [FedEx — Guía de Servicios y Tarifas 2026 (PDF, 32 pág., vigente 5-ene-2026)](https://www.fedex.com/content/dam/fedex/international/rates/fedex-rates-all-es-uy-2026.pdf) · [FedEx Uruguay — Tarifas](https://www.fedex.com/es-uy/shipping/rates.html) · [FedEx Uruguay — Recargos (combustible)](https://www.fedex.com/es-uy/shipping/surcharges.html) · [FedEx Uruguay — Comprar del exterior (franquicia y prestación única)](https://www.fedex.com/es-uy/customs-tools/shopping-from-abroad.html) · [FedEx Uruguay — Home (promo 50% los miércoles en Centros de Envío)](https://www.fedex.com/es-uy/home.html) · [FedEx Uruguay — Servicio auxiliar de despacho](https://www.fedex.com/es-uy/ancillary-clearance-service.html) · [Google Maps — Centro de Envío FedEx (aeropuerto/Canelones): 4,1 · 160 reseñas](https://www.google.com/maps/place/?q=place_id:ChIJxTS4arB7CpURZg_fU3-mmeg) · [Google Maps — Centro de Envío FedEx (Ciudad Vieja): 3,5 · 130 reseñas](https://www.google.com/maps/place/?q=place_id:ChIJqeDiDEdMCJURViUIchiUO00) · [Google Maps — Centro de Envío FedEx (Av. Herrera): 3,1 · 37 reseñas](https://www.google.com/maps/place/?q=place_id:ChIJNdJvN8jToZURDiz-bdJvnuw) · [Aduanas — nuevo régimen de franquicias de envíos postales internacionales (Decreto 50/2026)](https://www.aduanas.gub.uy/innovaportal/v/28455/1/innova.front/desde-el-1%C2%BA-de-mayo-comienza-a-regir-el-nuevo-regimen-de-franquicias-de-envios-postales-internacionales.html) · [Ley 18.761 (TIFA) art. 7 lit. g — exención de IVA para origen EE.UU. hasta USD 200](https://www.impo.com.uy/bases/leyes-internacional/18761-2011) · [r/uruguay — Importar como persona usando FedEx (2024-03-14)](https://reddit.com/r/uruguay/comments/1beaxoa/importar_como_persona_usando_fedex/) · [r/uruguay — Me retuvieron un paquete de franquicia (2026-06-11)](https://reddit.com/r/uruguay/comments/1u3encz/me_retuvieron_un_parquete_de_franquicia_porque_no/) · [r/uruguay — Alguien que labure en FedEx o tenga cuenta (2021-01-25)](https://reddit.com/r/uruguay/comments/l4d9ks/alguien_que_labure_en_fedex_o_tenga_cuenta_en/) · [r/uruguay — Courier Europa-Uruguay vs FedEx/DHL](https://reddit.com/r/uruguay/comments/1dpvt63/courier_europauruguay_vs_fedexdhl/) · [r/uruguay — Enviar cosas al exterior (2026-06-19)](https://reddit.com/r/uruguay/comments/1u9nguh/enviar_cosas_al_exterior/) · [URSEC — Tasa de Financiamiento del Servicio Postal Universal](https://www.gub.uy/unidad-reguladora-servicios-comunicaciones/comunicacion/campanas/tasa-financiamiento-del-servicio-postal-universal)

---

### UPS Uruguay (Sibel S.A.) `ups` — Express

> Rápido cruzando el mundo, un desastre cruzando Montevideo.

Courier express puerta a puerta desde 185+ países, operado en Uruguay por el licenciatario Sibel S.A. (Treinta y Tres 1590). No hay casillero ni consolidación.

**Tarifa** (verificada 2026-07-12, [fuente](https://assets.ups.com/adobe/assets/urn:aaid:aem:40a245f1-63eb-4c48-8347-9f8f1b7c0b2d/original/as/rate-service-guide-uy-ar-es.pdf)):

```json
{
 "quoteOnly": false,
 "tiers": [
  {
   "maxKg": 0.5,
   "flat": 116.5
  },
  {
   "maxKg": 1,
   "flat": 126.8
  },
  {
   "maxKg": 1.5,
   "flat": 137.3
  },
  {
   "maxKg": 2,
   "flat": 147.3
  },
  {
   "maxKg": 2.5,
   "flat": 157.4
  },
  {
   "maxKg": 3,
   "flat": 168.1
  },
  {
   "maxKg": 3.5,
   "flat": 178.2
  },
  {
   "maxKg": 4,
   "flat": 188.6
  },
  {
   "maxKg": 4.5,
   "flat": 198.8
  },
  {
   "maxKg": 5,
   "flat": 209.2
  },
  {
   "maxKg": 5.5,
   "flat": 218.8
  },
  {
   "maxKg": 6,
   "flat": 228.5
  },
  {
   "maxKg": 6.5,
   "flat": 238.3
  },
  {
   "maxKg": 7,
   "flat": 247.8
  },
  {
   "maxKg": 7.5,
   "flat": 257.8
  },
  {
   "maxKg": 8,
   "flat": 267.3
  },
  {
   "maxKg": 8.5,
   "flat": 277.2
  },
  {
   "maxKg": 9,
   "flat": 286.9
  },
  {
   "maxKg": 9.5,
   "flat": 296.8
  },
  {
   "maxKg": 10,
   "flat": 306.1
  },
  {
   "maxKg": 10.5,
   "flat": 316.9
  },
  {
   "maxKg": 11,
   "flat": 327.6
  },
  {
   "maxKg": 11.5,
   "flat": 338.1
  },
  {
   "maxKg": 12,
   "flat": 348.9
  },
  {
   "maxKg": 12.5,
   "flat": 359.5
  },
  {
   "maxKg": 13,
   "flat": 370
  },
  {
   "maxKg": 13.5,
   "flat": 381
  },
  {
   "maxKg": 14,
   "flat": 391.5
  },
  {
   "maxKg": 14.5,
   "flat": 401.9
  },
  {
   "maxKg": 15,
   "flat": 412.7
  },
  {
   "maxKg": 15.5,
   "flat": 423.1
  },
  {
   "maxKg": 16,
   "flat": 434.1
  },
  {
   "maxKg": 16.5,
   "flat": 444.6
  },
  {
   "maxKg": 17,
   "flat": 455.3
  },
  {
   "maxKg": 17.5,
   "flat": 465.9
  },
  {
   "maxKg": 18,
   "flat": 476.5
  },
  {
   "maxKg": 18.5,
   "flat": 487
  },
  {
   "maxKg": 19,
   "flat": 498
  },
  {
   "maxKg": 21,
   "flat": 500.9
  },
  {
   "maxKg": 21.5,
   "flat": 513.1
  },
  {
   "maxKg": 22,
   "flat": 524.7
  },
  {
   "maxKg": 22.5,
   "flat": 536.8
  },
  {
   "maxKg": 23,
   "flat": 548.8
  },
  {
   "maxKg": 23.5,
   "flat": 560.7
  },
  {
   "maxKg": 24,
   "flat": 572.4
  },
  {
   "maxKg": 24.5,
   "flat": 584.8
  },
  {
   "maxKg": 25,
   "flat": 596.5
  },
  {
   "maxKg": 25.5,
   "flat": 608.5
  },
  {
   "maxKg": 26,
   "flat": 620.1
  },
  {
   "maxKg": 26.5,
   "flat": 632.2
  },
  {
   "maxKg": 27,
   "flat": 643.9
  },
  {
   "maxKg": 27.5,
   "flat": 656.3
  },
  {
   "maxKg": 28,
   "flat": 668.1
  },
  {
   "maxKg": 28.5,
   "flat": 680.2
  },
  {
   "maxKg": 29,
   "flat": 691.9
  },
  {
   "maxKg": 29.5,
   "flat": 704
  },
  {
   "maxKg": 30,
   "flat": 715.6
  },
  {
   "maxKg": 30.5,
   "flat": 727.9
  },
  {
   "maxKg": 31,
   "flat": 739.7
  },
  {
   "maxKg": 31.5,
   "flat": 751.6
  },
  {
   "maxKg": null,
   "perKg": 23.9
  }
 ],
 "minChargeUsd": null,
 "handlingUsd": null,
 "handlingPlusIva": null,
 "tspuPct": 0,
 "clearanceUsd": null,
 "interiorUsd": null,
 "booksPerKg": null,
 "insuranceIncluded": true,
 "freeStorageDays": null,
 "originsPerKg": {
  "us": null,
  "eu": null,
  "cn": null,
  "ar": null
 },
 "transit": "Worldwide Express Saver (importación): 1 a 3 días hábiles, entrega garantizada antes del fin del día laboral. Worldwide Expedited: 2 a 5 días laborales. En la práctica el vuelo llega rápido y el atraso es local: hay reportes reiterados de 13 días a 3 semanas trabado en el despacho en Uruguay."
}
```

**Letra chica:** LEÉ ESTO ANTES DE USAR LOS NÚMEROS. (1) UPS no es un casillero: no hay caja en Miami, no hay consolidación, no hay tarifa por kilo puerta a puerta como Aerobox o USX. Normalmente no lo elegís vos — te lo asigna el vendedor (Amazon, AliExpress, la marca). (2) Los escalones de arriba son la columna ZONA 4 de la 'Tabla de Tarifas de Importación con Cargo al Consignatario, UPS Worldwide Express Saver, artículos que no son documentos' de la Guía 2026 (vigente 7-jun-2026). Zona 4 = Estados Unidos (Miami Metro y resto del país). Cada valor es un precio FIJO en USD por todo el envío en ese escalón de 0,5 kg — NO es un precio por kilo. 2 kg desde EE.UU. listan USD 147,30 (~USD 74/kg), no 2 × nada. (3) Redondeo: hasta 31,5 kg se redondea al siguiente medio kilo; ARRIBA de 31,5 kg la guía redondea al siguiente KILO COMPLETO antes de multiplicar por el precio por kg. Se factura el mayor entre peso real y peso volumétrico (L×A×H cm / 5.000). (4) Otros orígenes, misma tabla: Zona 1 = Argentina/Brasil/Chile/México → 0,5 kg USD 102,70; >31,5 kg USD 20,75/kg. Zona 3 = China → 0,5 kg USD 170,50; >31,5 kg USD 34,00/kg. Zona 5 = España, Italia, Reino Unido, Portugal, Holanda, Bélgica, Austria, Irlanda, Suecia, Luxemburgo, Grecia, Canarias/Azores/Madeira → 0,5 kg USD 188,70; >31,5 kg USD 34,00/kg. Zona 6 = Alemania, Francia, Suiza, Dinamarca, Noruega, Finlandia, Europa del Este (Polonia, Chequia, Hungría, Rumania, Rusia, Turquía) y gran parte de Asia/África/Oceanía → 0,5 kg USD 213,10; >31,5 kg USD 45,75/kg. OJO: la mayor parte de Europa Occidental es zona 5, no zona 6 — un paquete de 0,5 kg desde Italia o Reino Unido sale USD 188,70, no USD 213,10. (5) originsPerKg queda todo en null a propósito: UPS NO tiene precio por kilo por debajo de 31,5 kg, y poner un USD/kg al lado del de un casillero sería engañarte. (6) Estas tarifas de importación solo se aplican cuando el flete se factura al consignatario uruguayo ('con cargo al consignatario'). Si el vendedor pagó el flete, vos no le pagás transporte a UPS — solo los cargos locales. (7) Hay recargo por combustible arriba de todo y la guía NO lo cuantifica: 'UPS se reserva el derecho de aplicar un cargo por combustible en todos los envíos sin previa notificación'. (8) Recargos publicados en la guía 2026: Entrega Residencial USD 5,52; Manejo Adicional USD 17,62 (paquetes de más de 25 kg, lado más largo >122 cm, segundo lado >76 cm, envases de metal/madera o cilíndricos sin caja); Corrección de Dirección USD 19,86 (máx. USD 138,06); Áreas Extendidas USD 40,81 o USD 0,90/kg, el mayor; Paquete de Mayor Tamaño USD 108,59; Envío Imposible de Entregar +USD 12,18; Reversión de Cargo al Consignatario USD 18,47; Firma Requerida USD 6,33; Falta o Invalidez de Número de Cuenta UPS USD 18,96; Facturación de Derechos de Aduana e Impuestos USD 22,31; Entrega los Sábados USD 21,57. (9) Seguro: cobertura por pérdida o daño automática y gratis hasta USD 100 de valor declarado por envío; arriba de eso, mínimo USD 3,72 y +USD 1,23 por cada USD 100 adicionales sobre USD 300. (10) No existe tarifa de libros/CD/DVD: UPS solo distingue 'documentos' (más barato: 0,5 kg zona 4 = USD 109,40) de 'artículos que no son documentos'. (11) No hay días de depósito gratis: UPS no almacena. El paquete retenido queda en TCU (Terminal de Cargas del Uruguay, viejo aeropuerto de Carrasco), un tercero que cobra su propio almacenaje — la propia TCU estima USD 24 a USD 58 por una estadía de menos de 45 días. (12) El cargo por 'documentación'/despacho del que se quejan casi todas las reseñas (UYU 1.000 a 1.600 según reportes de usuarios) lo cobra el licenciatario local Sibel S.A. y NO está en ninguna tarifa publicada de UPS ni en ninguna página que hayamos podido encontrar. Por eso handlingUsd y clearanceUsd son null, no cero: presupuestalo igual. (13) ATENCIÓN AL tspuPct = 0: la Guía 2026 de UPS no menciona la TSPU/URSEC en ninguna línea y NO pudimos confirmar si se cobra aparte. El campo sale en 0 únicamente porque el esquema exige un número y no acepta 'sin dato'. El 0 significa 'no publicado', NO significa 'confirmado que no se cobra'. Si la TSPU aplica, es un 10% sobre el precio sin IVA del servicio postal (Ley 19.009). No uses este 0 como si fuera un hecho. (14) La guía 2026 se leyó a través de un proxy de extracción de texto porque ups.com y assets.ups.com no cargan desde nuestro entorno (ECONNRESET/timeouts en todos los transportes). Los 61 escalones fueron releídos y confirmados uno a uno contra el PDF por un segundo verificador independiente. Aun así, conviene revalidar la columna zona 4 contra el PDF renderizado antes de tomar una decisión de miles de dólares.

**Google:** `ChIJKQGzmht_n5UR4RY7yqDq__c` — "UPS" · **2,7 ★** (148 reseñas) · [ficha](https://www.google.com/maps/place/?q=place_id:ChIJKQGzmht_n5UR4RY7yqDq__c)

**Reddit:** muestra **none**

**Scores propuestos:** cumplimiento **30** · atención **35** · transparencia **45** · cobertura **60**

- *cumplimiento:* 148 reseñas de Google con 73 de 1★ (49%) y una decena de reportes fechados de fallas concretas: retención sistemática en TCU por falta de aviso, 13 días a 3 semanas trabado en despacho local después de un vuelo de 3 días, escaneos de 'entregado' sin paquete, entrega al vecino equivocado, un sobre de España perdido. La contracara real: el tramo internacional cumple (1–3 días hábiles) y hay 50 reseñas de 5★ de gente a la que le llegó antes de lo prometido. El avión cumple; la operación uruguaya no.
- *atencion:* Evidencia suficiente pero partida al medio. A favor: atienden el teléfono humanos en Montevideo (citado explícitamente como ventaja sobre FedEx, que deriva a un call center extranjero), el propietario responde públicamente las reseñas negativas, y hay rescates fechados por personas con nombre y apellido (Pablo Massia, Gabriel Varela, Catalina). En contra: 8 reseñas mencionan 'telefono' y 6 'comunicarse', con reportes de que te cortan el teléfono si reclamás. Es una moneda al aire según quién atienda.
- *transparencia:* Mitad y mitad, y por eso no baja más ni sube más. Publican una guía de tarifas de 17 páginas, con tabla de zonas, escalones de 0,5 kg y todos los recargos nombrados y valorizados — más que casi cualquier casillero de esta lista. Pero el cargo local más decisivo, el de documentación de Sibel (UYU 1.000–1.600), no está publicado en ningún lado y solo se conoce por reportes de usuarios y por la propia respuesta del propietario admitiéndolo; el recargo por combustible se aplica 'sin previa notificación' y no está cuantificado; y la TSPU no aparece mencionada. Lo que publican es excelente; lo que te va a doler no lo publican.
- *cobertura:* Determinista sobre los hechos: orígenes servidos, imbatible (185+ países — EE.UU., Europa, China y Argentina, todos con tarifa publicada por zona); entrega en todo el país, aunque degradada (hay reportes reiterados de gente del interior obligada a viajar a Carrasco); seguro incluido, sí (pérdida o daño gratis hasta USD 100 de valor declarado, está en la tarifa publicada, no es marketing). En contra: cero días de depósito gratis (UPS no almacena y el paquete queda metrado en TCU desde el día uno), no existe tarifa preferencial de libros/CD/DVD, no hay descuento de IVA, y no hay casillero ni consolidación. Puntaje alto por alcance de orígenes y seguro, castigado por todo lo que un casillero sí te da.

**Banderas rojas:**

- 2,7★ sobre 148 reseñas de Google, con 73 de una estrella (49%). Es la peor puntuada de todo el comparativo. La distribución es bimodal (73 de 1★ contra 50 de 5★), así que el promedio te esconde el tamaño del riesgo.
- Cargo sorpresa y sistemático: el licenciatario local Sibel S.A. te cobra por entregarte la documentación de aduana. Reportado en UYU 1.000 (2019–2020) subiendo a UYU 1.600 (2024–2025). NO está en ninguna tarifa publicada de UPS, pero la propia respuesta del propietario en Google lo confirma: 'Todas las empresas Courier tiene un costo por la entrega de la documentación'. Presupuestalo, porque no lo podés averiguar antes.
- UPS Uruguay NO te pide la documentación de franquicia. Su política, escrita en una respuesta pública del propietario, es que el aviso te toca a vos y antes del arribo: 'quien debe avisar al proveedor de servicio... es el destinatario'. Si no lo hacés, queda retenido en la Terminal de Cargas. Esta sola práctica explica unas 23 de las 148 reseñas.
- El 'puerta a puerta' puede terminar en el aeropuerto: reportes fechados 2024–2025 de gente que pagó entrega a domicilio y terminó retirando en persona en TCU (viejo aeropuerto de Carrasco), que abre solo de lunes a viernes. La gente del interior es la más golpeada; un usuario relató un viaje de ida y vuelta de 500 km.
- El atraso es local, no internacional: reportes de 13 días a 3 semanas trabado en el despacho uruguayo después de un vuelo de 3 días. 'El envío llega de China en 3 días, luego acá para entregar a 10 km de dónde están demoran una semana'.
- La aritmética de la franquicia te juega en contra: caso fechado el 14/10/2024 en el que sumaron los USD 75 de flete al valor de una compra de menos de USD 200, se pasó el umbral, se perdió la franquicia y hubo que pagar despachante más el 60% de impuestos.
- No hay casillero, no hay consolidación y no hay elección: a UPS no lo contratás, te lo asigna Amazon o AliExpress. Sin caja en Miami no podés juntar compras, así que cada paquete paga el precio express completo.
- El precio de lista es de 5 a 10 veces el de un casillero. 2 kg desde EE.UU. facturados al consignatario listan USD 147,30 (guía 2026, zona 4) — antes del recargo por combustible, antes del cargo de documentación de Sibel y antes del almacenaje en TCU.
- El recargo por combustible es abierto y no está publicado en la guía: 'UPS se reserva el derecho de aplicar un cargo por combustible en todos los envíos sin previa notificación'. No pudimos obtener el porcentaje vigente para Uruguay.
- Cero días de depósito gratis: UPS no almacena. El paquete retenido acumula almacenaje en TCU, un tercero, desde el día uno — la propia TCU estima USD 24 a USD 58 por una estadía de menos de 45 días.
- El 0% de TSPU que ves en esta ficha es 'sin dato', no 'no se cobra'. La Guía 2026 de UPS no menciona la TSPU/URSEC en ninguna línea y no pudimos confirmar si se agrega aparte. Si aplica, es un 10% sobre el precio sin IVA (Ley 19.009).
- Manejo flojo de pérdidas y reclamos, según los reseñadores: escaneos de 'entregado' sin paquete ('aparentemente con ellos decir que entregaron el paquete es prueba suficiente'), entrega a un vecino sin preguntarle, y un sobre desde España cuyo tracking decía al mismo tiempo que sería destruido y que sería entregado.
- El riesgo reputacional es ACTUAL, no histórico: hay reseñas de 1★ y 2★ publicadas a días de la captura del 12/07/2026.

**A favor:** 
- Cuando nada sale mal, es genuinamente rápido: Worldwide Express Saver de importación entrega en 1 a 3 días hábiles, y hay reseñas de 5★ de gente que recibió antes de lo prometido.
- Publica una tarifa real y auditable: la Guía 2026 de Tarifas y Servicios Uruguay, 17 páginas, con tabla de zonas, escalones de 0,5 kg y todos los recargos nombrados y valorizados. Muy pocos operadores de esta lista publican tanto.
- Seguro incluido de verdad: cobertura por pérdida o daño automática y gratuita hasta USD 100 de valor declarado por envío, escrita en la tarifa publicada.
- Alcance de orígenes imbatible: 185+ países con precio publicado por zona — EE.UU., Argentina/Brasil/Chile/México, China y toda Europa. Ningún casillero se le acerca.
- Te atiende un humano en Montevideo. Un reseñador lo marca explícitamente como ventaja frente a FedEx: 'ofrecen atención telefónica en la sucursal a diferencia de FedEx por ejemplo donde el número es para comunicarte con un call center de otro país'.
- Si mandás la documentación con tiempo, funciona: 'Si lo envías con tiempo, cero problemas' (5★). El propietario además responde públicamente las reseñas negativas y pide el número de guía para investigar.

**En contra:** 
- Te retienen el paquete por diseño: no te avisan que llega ni que hay que presentar documentación, y la política declarada es que avisar es tu responsabilidad. Ese solo detalle es el origen de la mitad de las reseñas de 1★.
- Después de retenerlo, te cobran por darte los papeles para ir a buscarlo vos mismo: UYU 1.000 a 1.600 según reportes. No figura en ninguna tarifa publicada, así que no lo podés presupuestar mirando una página.
- El precio de lista es express y no se negocia: 2 kg desde EE.UU. son USD 147,30 antes de combustible, documentación y almacenaje. Es 5 a 10 veces lo que te cobraría un casillero por el mismo kilo.
- El 'puerta a puerta' que pagaste puede terminar en el aeropuerto de Carrasco, de lunes a viernes, con vos manejando hasta allá. Si sos del interior, es un viaje.
- El despacho local se come toda la velocidad que ganó el avión: 13 días a 3 semanas trabado es un reporte recurrente, y a más de uno le dijeron que 'era normal'.
- Sin casillero ni consolidación no hay forma de amortizar el costo: cada compra viaja sola y paga el envío completo.
- El recargo por combustible se aplica 'sin previa notificación' y no está cuantificado en ningún lado. No sabés cuál es tu precio final hasta que te lo cobran.
- La atención es una moneda al aire: las mismas personas aparecen nombradas en reseñas de 5★ y en reseñas furiosas de 1★, y hay reportes de que te cortan el teléfono si reclamás.
- Casi nadie lo elige: te lo asigna el vendedor. 'Este courier me fue asignado por AliExpress, no fue una elección mía' (2★, julio 2026).

**Para quién:** La verdad incómoda: a UPS casi nadie lo elige — te lo asigna Amazon, AliExpress o la marca a la que le compraste. Si podés elegir courier, para una compra online común (ropa, electrónica, cosas de menos de 5 kg) NO es este: un casillero te sale 5 a 10 veces menos. Solo tiene sentido si necesitás algo urgente y valioso de un origen que ningún casillero cubre (Europa continental, Asia), donde el seguro automático y el tracking global valen más que el precio, y si podés estar arriba del trámite. Si te tocó UPS sin haberlo pedido: mandá cédula, foto de la tarjeta con solo los últimos 4 dígitos, la factura y el número de guía 1Z a compras@sibel.com.uy AL MENOS 48 HORAS ANTES de que el paquete aterrice en Uruguay. Ese mail es la diferencia entre que te lo traigan a casa y que termines pagando el cargo de documentación, el almacenaje de TCU y un viaje a Carrasco.

**Veredicto:** UPS es la peor puntuada de todo este comparativo: 2,7★ con 148 reseñas y 73 de una sola estrella. Pero seamos precisos con dónde está el problema, porque no está en el avión. El tramo internacional cumple (1 a 3 días hábiles desde EE.UU.) y UPS es de los poquísimos operadores acá que publica una tarifa completa y auditable: 17 páginas, tabla de zonas, escalones de medio kilo, cada recargo con nombre y precio. Verificamos los 61 escalones de la columna zona 4 uno por uno contra el PDF. El problema empieza cuando el paquete toca Uruguay. El licenciatario local, Sibel S.A., no te avisa que tenés que presentar la documentación de franquicia — su política pública, escrita por ellos mismos en una respuesta de Google, es que avisar te toca a vos y antes del arribo. Si no lo hacés, el paquete queda retenido en la Terminal de Cargas de Carrasco; Sibel te cobra entre UYU 1.000 y 1.600 por entregarte los papeles que necesitás para ir a buscarlo vos mismo; TCU te cobra el almacenaje (USD 24 a 58 por menos de 45 días, según la propia TCU); y el 'puerta a puerta' que pagaste termina con vos manejando hasta el aeropuerto un día hábil. Hay reportes de 13 días a 3 semanas trabado en el despacho local después de un vuelo de tres días: el paquete cruzó el mundo más rápido que Montevideo. Y encima, el precio de lista es de express, no de casillero: 2 kg desde EE.UU. facturados al consignatario son USD 147,30 antes del combustible, del cargo de documentación y del depósito. La contracara honesta, que existe: cuando alguien atiende el teléfono, funciona — las 50 reseñas de 5★ nombran personas concretas que destrabaron paquetes, y a diferencia de FedEx te atiende alguien en Montevideo. El tradeoff, entonces, es este: pagás precio de express y velocidad de express en el aire, y comprás una lotería en tierra. Si el vendedor te lo asignó, el único movimiento que te queda es mandar la documentación a compras@sibel.com.uy 48 horas antes de que aterrice. Si podés elegir, elegí otra cosa.

**Gaps (resolver a mano):**

- tspuPct SALE EN 0 PERO ES 'SIN DATO'. La Guía 2026 de UPS no menciona la TSPU/URSEC en ninguna línea y no pudimos confirmar si se cobra aparte. Queda en 0 sólo porque el esquema exige un número y no acepta null. Un humano tiene que resolver esto ANTES de que cualquier calculadora tome ese 0 como 'no se cobra'. Si aplica, es 10% sobre el precio sin IVA (Ley 19.009 / URSEC).
- Monto exacto y actual del cargo de 'documentación'/despacho de Sibel S.A. Es el número local MÁS decisivo de toda la ficha y no está publicado en ninguna parte: sólo hay reportes de usuarios (UYU 1.000 en 2019–2020 → UYU 1.300 → UYU 1.600 en 2024–2025) y la admisión del propietario en Google de que el cargo existe. Por eso handlingUsd y clearanceUsd quedan en null y no en cero: no es que no se cobre, es que no se puede averiguar.
- Porcentaje vigente del recargo por combustible para Uruguay. La guía se reserva el derecho de aplicarlo 'sin previa notificación' pero no lo cuantifica, y ups.com/uy no carga desde nuestro entorno para leer la tabla mensual.
- Si las localidades del interior uruguayo entran en la lista de 'Áreas Extendidas' de UPS (recargo de USD 40,81 o USD 0,90/kg, el mayor). La 'Guía de Áreas Extendidas' vive en ups.com, que no pudimos cargar. Por eso interiorUsd es null y no cero, aunque los reseñadores del interior reportan costo y viaje extra.
- Si UPS o Sibel otorgan algún período de gracia de almacenaje. No hay nada publicado; en los hechos el paquete queda en TCU, un tercero que cobra desde el día uno. freeStorageDays = null.
- Validación humana de la tarifa contra el PDF renderizado: www.ups.com y assets.ups.com no cargan desde nuestro entorno en ningún transporte (ECONNRESET / ERR_HTTP2_PROTOCOL_ERROR / timeouts). La Guía 2026 se leyó dos veces, de forma independiente, vía un proxy de extracción de texto que devolvió el PDF genuino (17 pp, 'Vigente a partir del 7 de junio de 2026'), y los 61 escalones de la zona 4 coinciden exactamente entre ambas lecturas. Aun así, alguien debería revalidar la columna contra el PDF renderizado.
- Si Sibel S.A. tiene un sitio web de cara al cliente: sibel.com.uy resuelve pero devuelve HTTP 403 y www.sibel.com.uy no resuelve. Los únicos contactos que pudimos verificar (compras@sibel.com.uy, 2916 1638, WhatsApp 096 223 619) salen de reportes de usuarios y directorios, no de una página oficial de UPS.
- No hay muestra de Reddit procesable para UPS en el análisis de sentimiento (la entidad no aparece en el archivo), así que reddit.sample = 'none' y no publicamos citas. La lectura reputacional descansa enteramente sobre las 148 reseñas de Google. Los hilos de Reddit citados en 'sources' son evidencia cualitativa usada en el texto, no una muestra medida.

**Fuentes:** [Guía de Tarifas y Servicios UPS Uruguay 2026 (vigente 7-jun-2026) — tabla de importación con cargo al consignatario y tabla de zonas](https://assets.ups.com/adobe/assets/urn:aaid:aem:40a245f1-63eb-4c48-8347-9f8f1b7c0b2d/original/as/rate-service-guide-uy-ar-es.pdf) · [UPS Uruguay — zonas y tarifas](https://www.ups.com/uy/es/shipping/zones-and-rates.page) · [Ficha de Google Maps de UPS Montevideo (Treinta y Tres 1590 — oficina de Sibel S.A.): 2,7★, 148 reseñas, respuestas del propietario](https://www.google.com/maps/place/?q=place_id:ChIJKQGzmht_n5UR4RY7yqDq__c) · [TCU (Terminal de Cargas del Uruguay) — compras por internet: estadía de menos de 45 días estimada entre USD 24 y USD 58](https://www.tcu.com.uy/compras-por-internet/) · [Aduanas — envíos retenidos](https://www.aduanas.gub.uy/innovaportal/v/25050/3/innova.front/envios-retenidos.html) · [Reddit r/uruguay — cómo declarar en aduana un pedido UPS (el mail a compras@sibel.com.uy 48 h antes del arribo)](https://reddit.com/r/uruguay/comments/1etx9ng/declarar_en_aduana_pedido_ups_del_exterior_uruguay/) · [Reddit r/uruguay — recibir compra del exterior enviada por UPS (costo del trámite + viaje a Carrasco desde el interior)](https://reddit.com/r/uruguay/comments/c6ejvy/recibir_compra_del_exterior_que_me_env%C3%ADas_por_ups/) · [Reddit r/Burises — dato de precio real: USD 45 por 1 kg China→Uruguay directo por UPS](https://reddit.com/r/Burises/comments/1onhq9z/cuando_deben_ganar_los_courier/) · [URSEC — Tasa de Financiamiento del Servicio Postal Universal (TSPU): 10% del precio sin IVA del servicio postal](https://www.gub.uy/unidad-reguladora-servicios-comunicaciones/comunicacion/campanas/tasa-financiamiento-del-servicio-postal-universal) · [Ley N° 19.009 (TSPU)](https://www.impo.com.uy/bases/leyes/19009-2012/15) · [EnviaMiCompra — liberación de envíos retenidos en TCU (agenda obligatoria desde el 16/12/2024)](https://ayuda.enviamicompra.com.uy/support/solutions/articles/12000102737-liberaci%C3%B3n-de-env%C3%ADos-retenidos-en-terminal-de-cargas-uruguay-) · [Guía del Mercosur — Sibel S.A. (licenciatario UPS en Uruguay)](http://www.guiadelmercosur.com/uruguay/detalle_1270_sibel-sa-ups.html)

---

## Gaps globales — lo que un humano tiene que resolver antes de publicar

1. **Fichas de Google a pinear a mano** (5): SoyCourier, Casilla Mía, Miami Box, Logistika.US, Correo Uruguayo (Casilla Mía). Sin `place_id` confirmado por nombre no se publica rating: ver el envenenamiento Correo → Casilla Mía arriba.
2. **Sin muestra de Reddit** (6): SoyCourier, UruguayCargo, StarBox Uruguay, Grinbox, Logistika.US, UPS Uruguay (Sibel S.A.). Van con "sin muestra suficiente" en la card, NO con un score bajo.
3. **Dimensiones sin evidencia** (4 entidades): SoyCourier, UruguayCargo, Grinbox, Logistika.US — al menos una de cumplimiento/atención queda ausente y los pesos se re-normalizan.
4. **Ambigüedad de tramos**: varios operadores publican "US$ X por kilo" por bracket sin aclarar si el precio se aplica al peso total o solo al tramo. Leída literal, la escala de Gripper es **no monotónica** (5,0 kg = US$ 109,50 pero 5,1 kg = US$ 84,15). La calculadora tiene que usar la lectura literal *y* avisar de la ambigüedad.
