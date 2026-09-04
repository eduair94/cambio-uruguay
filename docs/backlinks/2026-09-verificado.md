# Pack de outreach verificado — 2026-09-04

Todo lo de acá se midió contra la web en vivo el 2026-09-04. Lo que no se pudo verificar está
marcado como tal y **no se manda**. Este archivo reemplaza en autoridad a los `tier*.md`, que son
de julio y tienen premisas caídas (ver §6).

Estado por canal: [`tracker.csv`](./tracker.csv). Acá va lo que el tracker no puede guardar: los
textos, el calendario y los motivos.

---

## 1. BLOQUEANTE — leer antes de mandar nada

**17 de las 43 pizarras de mostrador del USD llevan ≥7 días sin moverse. 7 llevan ≥30.**

Medido con `GET /analytics/rates?code=USD&origins=<x>&interval=day` sobre 200 días:

| origen | venta | días quieto |
|---|---|---|
| `bbva` (TRANSFERENCIA) | 42,00 | ≥128 |
| `cambio_3` | 41,50 | 75 |
| `cambio_rynder` | 41,40 | 59 |
| **`baluma_cambio`** | **39,55** | **≥57** |
| `nonica` | 41,30 | ≥57 |
| `cambio_regul` | 41,50 | 55 |
| `cambio_obelisco` | 41,40 | 50 |

**El scraper no está roto: el que se congeló es el origen.** `balumacambio.enjoypuntadeleste.com.uy/cotizacion.php`
devuelve HTTP 200, 8.449 bytes, y bajo el título "Cotizaciones del día" dice `Dólar USA 37.15 / 39.55`
desde el 2026-07-09. En `classes/origins.ts:86` hay un `// 2026-07: re-verified live, rate table
working again` puesto justo cuando empezó a congelarse.

**Por qué ninguna guarda lo agarra:** `rate_plausibility` mira compra < venta (37,15 < 39,55 pasa);
`rate_audit` mira la banda por percentiles (39,55 contra mediana 41,45 son ~4,6 %, holgado dentro de
p10/3); `/health` mira la antigüedad de `last_sync.txt`, no si el número cambió.

**Y no es un defecto pasivo: una pizarra congelada escala el ranking.** El mercado se mueve y ella no,
así que deriva al extremo de la distribución — y como el sitio ordena por "más barato", la sube al
titular. Hoy la home publica `Baluma Cambio 39,55` como mejor precio del dólar, y la FAQ generada dice
"Baluma Cambio, que lo vende a $48.75" para el euro. Cuanto más vieja la pizarra, más destacada.

Es un modo de falla distinto de los dos ya documentados (`scraper-mudo-vs-scraper-roto` devuelve `[]`;
`cifra-vieja-pasa-la-banda-de-plausibilidad` es una cifra editorial vieja): acá el scraper anda, el dato
es plausible, y el defecto está río arriba.

**Impacto sobre este pack:** cuatro de los diez correos venden "actualizado cada ~10 minutos" y el pitch
a Debate ofrece "ampliar la muestra a 45 emisores". Mandar eso hoy es mandar algo falso. **Los correos
esperan a que esto se resuelva o se acote en el copy.**

Arreglo pendiente (no hecho, es feature): días-desde-el-último-cambio por origen, y degradar o marcar
en el ranking lo que no se mueve.

---

## 2. Comentarios de Reddit — 4 sobrevivientes de 14

Cada uno pasó por tres escépticos independientes (normas contra IMPO/aduanas/DGI, cifras contra INE y
tarifarios, enlace y tono) más un chequeo previo de que el hilo siga abierto y no esté ya contestado.
**Ninguno sobrevivió intacto**: a los cuatro la corrección les borró frases. Se borran, no se suavizan.

Cuenta: `u/SizeSouthern112`. Shadowban del 2026-08-20 **levantado** — verificado con token app-only:
`GET /user/SizeSouthern112/about` → 200, karma 1164, `is_suspended` sin setear, con `u/spez` como
control positivo.

### 2.1 · r/uruguay · "Mi experiencia invirtiendo en la bolsa de valores desde Uruguay"
https://www.reddit.com/r/uruguay/comments/1w660jz/mi_experiencia_invirtiendo_en_la_bolsa_de_valores/

> Muy bueno el post. Sobre el IRPF, que es lo que se está discutiendo más abajo, hay un detalle que no vi mencionado, y que solo aparece si liquidás por el método real: para activos financieros que cotizan en bolsas de reconocido prestigio y adquiridos con anterioridad al 1/1/2026 —o sea, incluida una compra hecha el mismo 31/12/2025— el costo fiscal no es lo que pagaste, es el valor de cotización al 31/12/2025. Toda la valorización anterior a 2026 queda fuera de la base gravada. Está en el Título 7 artículo 32, y el Decreto 95/026 artículo 18 lo reglamenta.
>
> Va la aclaración para que no confunda a nadie: esto solo juega en el método real. Si liquidás por el ficto, que es 12% sobre el 20% del precio de venta, el costo fiscal no entra en la cuenta y el step-up no te cambia nada. O sea que sirve para decidir entre real y ficto, no para bajar el ficto.
>
> El otro que se pasa por alto: si pagaste impuesto en el exterior por esa misma renta, lo podés acreditar contra el 12%. El tope está escrito, Título 7 artículo 25: el crédito no puede superar la parte del impuesto calculada antes de esa deducción. Qué pasa con el sobrante si te sobra crédito no lo encontré escrito en ninguna parte, así que no te lo afirmo.
>
> Tengo esto ordenado con las normas en cambio-uruguay.com/impuestos-inversiones-uruguay; el sitio es mío, lo aclaro.

Se borró: "sin poder arrastrar el sobrante a otro año" (un escéptico la refutó con los arts. 44-sexies
y 44-octies del Dec. 148/007, otro la marcó imprecisa) y "con dos años de posición arrastrada"
(experiencia personal inventada, y choca con la bio de la cuenta). Se corrigió la fecha: la norma dice
"adquiridos con anterioridad al 1/1/2026", no "antes del 31/12/2025".

### 2.2 · r/uruguay · "Compre un producto por mercado libre y me llego uno mas caro"
https://www.reddit.com/r/uruguay/comments/1w4tt30/compre_un_producto_por_mercado_libre_y_me_llego/

> Más allá del chiste del camarón, la parte legal está escrita y te conviene tenerla a mano. La Ley 17.250, artículo 33, dice que ante el incumplimiento del proveedor el consumidor puede, textual, "a su libre elección": A) exigir el cumplimiento forzado, B) aceptar otro producto o servicio, o C) resolver el contrato con derecho a la restitución de lo pagado, monetariamente actualizado. La elección es tuya por texto expreso del artículo, no la elige el vendedor. Quedarte con la que llegó entra en el literal B.
>
> Ahora, dos cosas que la ley NO resuelve, y no te las voy a vender como si las resolviera. Una: si te reclaman el cambio, quién carga con el flete de ida y vuelta no está en ningún artículo. La única regla expresa de costos de restitución que tiene la 17.250 está en el artículo 16 y es para el arrepentimiento de cinco días hábiles, que es otro supuesto: ahí dice que cada parte se hace cargo de los suyos. Dos: el artículo 33 regula tus remedios como consumidor, no las acciones civiles del vendedor. "Me la quedo y no debo nada" es la lectura razonable, pero no está escrito en ninguna parte y por las dudas no te lo afirmo.
>
> Si querés el texto de la ley ordenado por caso, lo tengo en cambio-uruguay.com/derechos-consumidor-compras-online. Aclaro que el sitio es mío.

Se borraron las dos frases que eran el gancho ("no te obliga a pagar ninguna diferencia" y "el vendedor
se hace cargo del retiro y el reenvío"): ninguna está en la norma, y la única regla expresa de costos
—art. 16— dice lo contrario. Lo que queda es una explicación honesta de lo que la ley *no* resuelve.

### 2.3 · r/expats · "Single in my 50's and starting over abroad"
https://www.reddit.com/r/expats/comments/1w3nj4k/single_in_my_50s_and_starting_over_abroad_which/

> I live in Montevideo, so I can only speak to that one on your list, and only on the numbers — I can't tell you what starting over at 50 feels like here.
>
> Rent: typical asking price in Montevideo right now is around 28,000 pesos a month, roughly US$675, and that's before gastos comunes (building fees, charged separately, and not trivial). Those are asking prices in listings, not what sitting tenants pay. Pocitos and Punta Carretas ask more than that, but nothing near your ceiling. On 3 to 4k you'd live well. Housing isn't the expensive part here — groceries and anything imported are.
>
> The tax side matters more for you than the rent, and it changed this year, so anything written before 2026 is out of date. The old "7% for life" option (art. 24) closed on 31 December 2025. What replaced it is art. 24-Bis of Title 7, added by Ley 20.446 art. 648 and in force since 1 January 2026: someone who becomes a tax resident from that date can opt, once, to be taxed under the non-resident regime on foreign capital income for the year of the move plus the ten following — eleven in total.
>
> It is not automatic, and this is the part that gets left out of most write-ups. You must not have been a tax resident in the two previous years, and you must meet one of three conditions: real estate over UI 12,500,000, investment funds of at least UI 625,000 a year, or more than 183 days in the country in each fiscal year. The first two are millions of dollars, so for most people it comes down to the days condition — every year, not just the year you move.
>
> After those eleven years the plain rate on foreign capital income is 12%, though the same article then lets you opt for IRPF at half that rate for five more years, or for a fixed annual amount in indexed units, each with its own conditions.
>
> Residency itself triggers with more than 183 days in the calendar year, or with your main centre of economic or vital interests here. Either one is enough on its own; you don't need both.
>
> One warning I'd give about my own write-up as much as anyone else's: I last verified that section in July, and there's a competitiveness bill floating around that could touch the impatriate regime again. Confirm it's still in force before you decide anything on it.
>
> fwiw the numbers and the article references above come from my own site, cambio-uruguay.com/impuestos-inversiones-uruguay — it's in Spanish only.

Corrección de fondo: el borrador vendía **29.000 como mediana de Montevideo** y es la mediana
**nacional** del directorio propio (14.612 propiedades). La de Montevideo es 28.000 sobre 11.406, medida
contra la API del propio sitio. Este comentario cita la Ley 20.446 en el cuerpo **porque la página no la
enlaza**: si alguien pide "source?", el sitio no la puede mostrar. Ver §5.

### 2.4 · r/ExpatFIRE · "Considering a move to Uruguay"
https://reddit.com/r/ExpatFIRE/comments/1upd4hv/considering_a_move_to_uruguay/

**Dos condiciones, no opcionales:** revalidar la página de DGI el mismo día de publicación, y **no
publicar después del 30/09/2026** — ahí vence la prórroga y el texto queda falso. El hilo tiene 60 días,
casi 9× la ventana de 168 h del bot, así que va como comentario manual y único.

> On hidden costs, one that's timing-sensitive if part of your scouting trip lands in September.
>
> Hotels are the big one and it rarely comes up: lodging for non-residents is zero VAT all year, not 22%. It isn't automatic. You have to prove you're a non-resident with an identity document issued abroad (a passport does the job), the place has to be a registered establishment, and they keep a copy of the document filed with the invoice. Ask at check-in and check that it's on the invoice rather than assuming.
>
> Second, restaurants, catering, event services, car rental without a driver and brokerage on tourist rentals currently take nine percentage points off the VAT rate when you pay with a card, credit or debit, held by an individual and not a company. That works out to 7.38% off the total bill, not 9%, because the points come off the rate and not off the price you see. From 1 October 2026 the reduction is set to drop to five points, or 4.1%, unless it gets extended again — it has been renewed by decree over and over, and the current extension only runs to 30 September.
>
> How it actually reaches you, because this is where people expect the wrong thing: the restaurant bills you the full amount with no discount showing, and that is correct, there is nothing to dispute at the table. The reduction is credited by your card issuer in its settlement, so it turns up on the card voucher and on your statement, not on the restaurant's receipt.
>
> One thing not to budget for: there was a separate benefit taking VAT to zero for non-residents paying with a card issued abroad, but the last window I can verify ran to 30 April 2026 and I have not found a published decree extending it, so ask DGI instead of counting on it. And the general two-point card reduction people mention is debit and electronic money only, so a foreign credit card never gets that one.
>
> Disclosure: I wrote this up with the decree numbers here, Spanish only: https://cambio-uruguay.com/descuento-de-iva-con-tarjeta-uruguay — it's my site.

Se borró el párrafo del ticket: estaba refutado por la propia norma (Ley 17.934 arts. 2 y 3 + DGI — el
consumidor recibe el comprobante sin descuento y la rebaja la acredita la emisora), o sea que mandaba
turistas a discutir con el mozo por una cuenta correcta. También se sacó "Uruguayan here", que choca con
la bio de la cuenta.

### Calendario

Un comentario con enlace **por sub y por día**, y uno solo por día aunque la regla permitiría dos subs
distintos: con cuatro comentarios en juego, gastar margen sobre una cuenta que ya se comió un shadowban
no compra nada.

| Día | Hora (UTC-3) | sub | Por qué ahí |
|---|---|---|---|
| jue 04/09 | 17:00 | r/uruguay (§2.1) | el hilo tiene 17 h y la discusión de IRPF está viva ahora; mañana está enterrado |
| vie 05/09 | 12:30 | r/uruguay (§2.2) | obligado a otro día por la regla |
| sáb 06/09 | 13:00 | r/expats (§2.3) | primer enlace en r/expats; fin de semana = menos ojos sobre un dominio repetido |
| lun 08/09 | 12:00 | r/ExpatFIRE (§2.4) | revalidar DGI ese mismo día; después del 30/09 se tira |

**Colisión que nadie decidió y hay que resolver:** `currency-reddit-bot` corre cada hora **en esta misma
cuenta y enlaza este mismo dominio**. Un comentario manual a las 17:00 más uno automático a las 17:00
rompe la regla de "no dos enlaces al mismo dominio en la misma hora" sin que nadie lo haya elegido.
O se pone el bot en dry-run la hora anterior y la posterior, o las cuatro publicaciones manuales van en
la ventana 03–10 UTC en la que el bot calla.

---

## 3. Correos — 4 para mandar, 5 a corregir, 1 muerto

| # | Destinatario | Canal | Veredicto |
|---|---|---|---|
| a4 | **AGESIC / Catálogo de Datos Abiertos** | `catalogodatos@agesic.gub.uy` | **MANDAR** con `[DOCUMENTO]` completado |
| a5 | **la diaria** | `ayuda.ladiaria.com.uy/contacto/`, tipo "Otra consulta" | **MANDAR** — el más limpio del lote |
| a10 | **AmCham Uruguay** | `ccuruguayusa.com/contactenos/` | **MANDAR** con un retoque |
| a18 | **todo.com.uy** | `todo.com.uy/contacto.php` | **MANDAR** hoy |
| a1 | AEU | `comunicaciones@` + `cid@aeu.org.uy` | CORREGIR |
| a2 | Montevideo Portal | form. Prensa id 80 | CORREGIR |
| a8 | Guru'Guay | `guruguay.com/es/contacto/` | CORREGIR |
| a15 | Debate Uruguay | form. + `redaccion@debate.com.uy` | CORREGIR (una palabra) |
| a3 | Neurona Financiera | `hola@neuronafinanciera.com` | **NO MANDAR** |
| a12 | Facultad de Medicina UdelaR | `internacional@fmed.edu.uy` | **NO MANDAR** |

**a3 — el que hay que recordar.** El pitch abría con *"Te escribo por el episodio de dónde conviene
guardar los dólares"*. **Ese episodio no existe**: se barrió el sitio por `dolares`, `dolar`, `dólares`,
`guardar dolares`, `donde guardar`. Era la única frase que le daba razón de ser al mensaje y la única
que nadie chequeó — y el borrador se autodeclaraba `send_confidence: "mandar"`, `blocked_on: "nada"`.
Inventarle un episodio a alguien con 220.000 suscriptores, firmando con el sitio, es el fallo exacto que
el encargo prohibía.

**Hallazgo transversal (4 correos):** varios usaban lenguaje de extremo sobre una cifra recortada —
"la venta va de 40,65 a 42,05". El rango real es **39,55 a 42,05 = 2,50**, no 1,40, porque excluían a
Baluma sin decirlo. Hay un motivo legítimo para excluirla (§1: pizarra congelada hace 57 días) y se
resuelve en una línea, pero tiene que estar escrita.

**Sin verificar, y por eso fuera del cuerpo de los mensajes:** que las 538 sucursales tengan geocoding
usable; a dónde cae realmente la casilla de Prensa de Montevideo Portal; si alguien mantiene
editorialmente las listas de enlaces de AEU y AmCham; los límites de tasa de la API.

**Contradicción de copy que conviene unificar antes de escribirle a gente que verifica por oficio**
(AEU, la diaria, Montevideo Portal y Debate lo hacen): el sitio publica "más de 40" en `/acerca` y
`llms.txt`, "45 casas" en `/casas-de-cambio`, y dice "aproximadamente cada 10 minutos" donde el cron
corre cada 5.

---

## 4. Lo que se descartó, y vale tanto como lo que se manda

De los 14 comentarios, **10 se tiraron**: 8 porque **el hilo ya estaba contestado** —varios por
comentarios con más karma que el que íbamos a dejar, y uno abría con "nobody has brought it up" a un
scroll de distancia de alguien que lo había traído—, 1 por cifras sin fuente publicada, 1 por ser casi
duplicado de otro en el mismo sub a las mismas horas, que es la conducta documentada como causa del
shadowban del 2026-08-20.

**De esos 10, ocho llevaban además una cifra o una norma caída.** "Ya contestado" fue la primera puerta,
no la única. Y los datos falsos contradecían la propia base del proyecto: el signo del tipo de cambio
invertido contra la serie del BCU que el sitio publica; un rango de bancos que dejaba al BROU afuera de
su propio precio del día; la mediana nacional de alquileres vendida como la de Montevideo cuando
`/api/rentals` devuelve las dos por separado; el `sell` argentino citado mientras la página enlazada
publica el `avg`, o sea que quien hiciera clic para verificar iba a encontrar otro número.

Canales descartados con su motivo medido: ver las filas `tier 0` de [`tracker.csv`](./tracker.csv).

---

## 5. La lección, sin maquillar

**Tasa de "sirve tal como salió": 0 de 14.** Los cuatro que sobrevivieron se publican reescritos, y a
tres la corrección les borró justamente el párrafo que era el gancho.

Un modelo escribiendo de una pasada **inventó números que estaban a una consulta de distancia**, y los
firmó con el nombre de un sitio cuyo único activo es que sus números son correctos.

`classes/redditbot` existe porque cada uno de estos fallos ya había ocurrido antes y costó algo. El RAG
habría matado los cinco errores de cifra (obliga a que la afirmación salga de un chunk indexado). La
ventana de 168 h habría descartado los dos hilos viejos. El ledger habría matado el par duplicado. La
puerta de sustancia habría matado el que no se sostiene sin el enlace.

**Este carril rinde poco y rinde caro.** Producir 14 borradores y tres rondas de escépticos para quedarse
con 4 comentarios corregidos a mano, sobre una cuenta que ya arrastra un shadowban, es peor negocio que
dejar correr el bot, que hace lo mismo con guardarraíles automáticos y un ledger que se acuerda de ayer.

Donde la pasada manual **sí** ganó fue en los tres hilos donde el aporte requería leer una norma que el
sitio cita pero no enlaza (la Ley 20.446, el art. 16 de la 17.250) — o sea, justo donde el RAG no llega
porque esa fuente no está indexada. **Ahí está el trabajo que rinde: indexar las normas que faltan y
dejar que el pipeline las use.** No repetir este lote.

---

## 6. Premisas de julio que se cayeron

Los `tier*.md` son del 2026-07-06 y arrastran esto:

- **"Glama auto-indexa por topic `mcp`"** — falso, verificado con 404 en dos URLs directas y por
  buscador. Nunca se envió, y es el nudo: `punkpeye` pidió por escrito el badge de Glama para mergear
  el PR #9525, que además ya está `CONFLICTING`.
- **dev.to "no-then-yes" por reputación** — el motivo real es otro: el `rel` sale `noopener me ugc`
  salvo para el rol `trusted`, que otorga un admin a mano.
- **El tracker daba `public-apis/public-apis` #6498 como "todo"** cuando el PR llevaba dos meses abierto,
  y **no registraba** los dos que ya estaban mergeados (`marcelscruz/public-apis` #990, 9.418 ⭐, y
  `public-api-lists` #549).

---

## 7. Trampa de IMPO — medida, no resuelta

Siete normas se citan en el sitio con `/bases/*-originales/`. Las siete tienen variante vigente **y
distinta**. Pero no es un `sed`:

- `decretos/95-2026`: la vigente son 6.054 ch rotulados "Documento Actualizado" — texto consolidado, es
  la correcta. La `-originales` trae 50.926 ch (original + anexos). **Acá el sitio apunta mal.**
- `leyes/20345-2024`: la vigente son **635 ch de puras notas**, porque es una ley *modificativa* cuyo
  texto vive en las leyes que reformó (16.696 arts. 37 y 38, 18.627 art. 14). Acá la elección no es
  obvia.

El patrón ya está vigilado por tests en `afapRevocation`, `horasExtras`, `leyUsura`, `licenciasEspeciales`
e `impuestosMitos`, pero **no repo-wide**, y quedan ~10 URLs vivas en páginas de producción. Cada una
necesita su propio criterio.
