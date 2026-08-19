# Bot de Reddit — puesta en marcha

Cuatro procesos pm2 nuevos. Los cuatro se despliegan solos al pushear a `main`
(el path-filter del backend los agarra), y los cuatro **no hacen nada** hasta que
alguien cargue variables en el `.env` del servidor. Este documento es el orden en
que hay que cargarlas.

| proceso | qué hace | qué necesita |
|---|---|---|
| `currency-rag-index` | arma el índice del sitio | `APP_MONGO_URI`, `GEMINI_API_KEY` |
| `currency-reddit-bot` | **comenta** en Reddit, cada hora | lo anterior + `CLAUDE_AGENT_API_KEY` + credenciales del bot + dos flags |
| `currency-reddit-bot-watch` | lee cómo cayeron las respuestas | credenciales del bot |
| `currency-content-gaps` | borradores de lo que falta | `APP_MONGO_URI` + Claude o Gemini |
| `currency-reddit-stats` | la foto pública de /estadisticas-reddit | `APP_MONGO_URI` |

## Lo que el bot hace es público

`/estadisticas-reddit` publica el registro entero: cuántas dudas contestó, en qué subs, qué páginas
enlazó, el texto completo de cada comentario, cuántos terminaron borrados, **y cuántos hilos
descartó y por qué**. Publicar los descartes no es autoflagelación: sin ellos el número "contestó N
preguntas" invita a la lectura contraria —que la cuenta comenta en todo lo que se mueve— que es
justo la que haría un moderador.

Lo que NO se publica es el autor de ningún hilo. Reddit ya lo publica; republicarlo agrupado y
buscable es otra cosa.

El job corre cada tres horas y **mezcla** los días con lo ya guardado en vez de recalcularlos: el
ledger es memoria operativa y el día que alguien borre las filas rechazadas viejas, el histórico
tiene que seguir estando.

## La cuenta SOLO COMENTA

No abre hilos. No es una convención ni un cron apagado: `classes/redditbot/post.ts`
se niega a llamar a `/api/submit` salvo que exista `REDDIT_BOT_ALLOW_POSTS=1`, y el
test `tests/redditbot/solo_comenta.test.ts` verifica que la negativa siga estando
ahí y no en el trabajo que la llama.

La razón es cara y ya se pagó: la cuenta anterior abría una pregunta por día en
r/AskUruguayan y terminó **baneada permanentemente**, con el moderador nombrando el
nombre de la cuenta antes que el contenido. Un hilo es la cara de la cuenta en el
sub; lo ve muchísima más gente que un comentario y es lo que hace que alguien abra
el historial. Las dos apps que abrían hilos —`currency-reddit-social` y
`currency-reddit-ask`— ya no están en `ecosystem.config.js`. Su código sigue en
`classes/redditbot/{ask,social}/`.

En una caja donde ya corrieron, hay que sacarlas una vez a mano:

```bash
pm2 delete currency-reddit-social currency-reddit-ask
pm2 save
```

Y **r/AskUruguayan sigue cerrado aunque la cuenta haya cambiado**. Volver con otra
cuenta a un sub que te echó es evasión de ban, que Reddit sanciona a nivel de cuenta
y de dominio — o sea arriesgando el dominio del sitio, no sólo la cuenta.

## Quién escribe qué

**Claude** (el endpoint privado del 104) redacta los comentarios, hace de juez de
relevancia y investiga los huecos de contenido. **Gemini** queda de respaldo
automático para todo eso — y es el único que hace **embeddings**, porque Anthropic
no publica endpoint de embeddings: el índice del sitio se queda en Gemini para
siempre. No es una opción de configuración, es una capacidad que no existe.

Tres cosas del endpoint de Claude que condicionan el uso, todas en
`/root/claude-agent-api/INTEGRACION.md`:

- **La cuota es tuya.** 200 llamadas por día, las mismas que gasta tu Claude Code
  interactivo. Los jobs se abstienen cuando quedan menos de
  `CLAUDE_AGENT_MIN_REMAINING` (60): el final del día es para vos.
- **429/503/504 no se reintentan.** El proceso los toma como "pará" y no vuelve a
  llamar en esa corrida.
- **Las respuestas vuelven en modo caveman** por el plugin instalado en la caja.
  El cliente lo neutraliza con `appendSystemPrompt` (verificado que le gana al
  hook), así que **no hace falta tocar nada en el servidor**.

Para fijar un proveedor y reproducir una respuesta rara: `AI_TEXT_PROVIDER=claude`
o `=gemini`.

---

## 1. La cuenta de Reddit

La app de Reddit tiene que ser de **tipo `script`**, y la cuenta del bot tiene que
figurar como developer de esa app. Un "web app" o un "installed app" no puede usar
el grant `password` y devuelve 401 con un mensaje que parece de contraseña
equivocada.

1. Entrar a https://www.reddit.com/prefs/apps **con la cuenta del bot**
2. *create another app…* → tipo **script** → redirect uri `http://localhost:8080`
3. Anotar el id (debajo del nombre) y el secret

Dos cosas que ahorran un día de depuración:

- **Si la cuenta tiene 2FA, el grant `password` no sirve** (habría que pegarle el
  OTP a la contraseña, cosa imposible desde un cron). En ese caso usá
  `REDDIT_BOT_REFRESH_TOKEN`, que el código prefiere cuando está presente.
- Reddit trata a las cuentas nuevas y sin karma con mucha menos paciencia:
  rate-limit agresivo, y varios subs tienen un mínimo de karma o de antigüedad
  para comentar. **Medido acá**: r/uruguay y r/Burises borran por AutoModerator lo
  que escribe una cuenta sin karma, y el autor ve sus propios comentarios borrados
  como si estuvieran perfectos, para siempre. Si la cuenta es nueva, no hay
  calibración que lo arregle.

### La bio tiene que decir que es un bot

La aclaración **no** va al pie de cada comentario. Se probó y se sacó: repetida
sesenta veces es la huella que hace que un moderador encuentre los sesenta
comentarios de una y los borre juntos, y un comentario borrado no informó a nadie.
Va en la descripción del perfil, que es donde la encuentra quien la busca.

Para que eso no se convierta en "no está en ningún lado" el día que alguien edita
el perfil, es una puerta: antes de publicar, el bot lee la descripción pública de la
cuenta y **si no dice que es automatizada y de qué sitio, no publica** y manda un
Telegram. Se edita en <https://www.reddit.com/settings/profile>, campo *About*. El
texto sugerido está en `classes/redditbot/identity.ts`.

### Chequear la cuenta antes de pelearse con el código

```bash
npm run reddit_account
```

Contesta de una las cinco causas de "el bot no publica" que no son del código:
credenciales que no autentican, karma insuficiente, interruptores, bio sin
declaración, y subs donde no se puede escribir.

## 2. Variables en el `.env` del VPS

Copiar los bloques `--- Claude ---` y `--- RAG del sitio + bot de Reddit ---` de
`.env.sample` y completar. **Dejar `REDDIT_BOT_ENABLED=0` y
`REDDIT_BOT_DRY_RUN=1` por ahora.**

Son dos puertas separadas a propósito, igual que `CONTENT_PROMO_ENABLED`: las
credenciales van a estar en la máquina antes de que los umbrales estén calibrados,
y desplegar el archivo no puede ser lo que empieza a hablarle a desconocidos.

Qué significa cada una, porque no es obvio:

| | `ENABLED=0` | `ENABLED=1`, `DRY_RUN=1` | `ENABLED=1`, `DRY_RUN=0` |
|---|---|---|---|
| el job | sale enseguida, no hace nada | corre el pipeline entero | corre y publica |
| gasta cuota | no | sí (embeddings + Claude) | sí |

O sea: **el ensayo del paso 5 necesita `ENABLED=1`.** `ENABLED=0` no es "ensayar sin
publicar", es "no hacer nada".

### El env que falta y no se nota

`classes/reddit.ts` lee `REDDIT_CLIENT_ID` / `REDDIT_CLIENT_SECRET` del `.env`
**raíz**, y hoy en el 104 esas variables sólo están en `app/.env`. Sin ellas el
cliente de Reddit es un no-op silencioso: el bot corre, no lee ningún hilo y sale
diciendo "ningún post nuevo", que se parece demasiado a un sábado tranquilo.
Copialas al `.env` raíz.

(Lo mismo vale para los otros pipelines del backend que leen Reddit —aduana,
sillas—: si nunca cosecharon nada en esta máquina, es por esto.)

## 3. Primer índice

```bash
pm2 start ecosystem.config.js --only currency-rag-index
pm2 logs currency-rag-index
```

La primera corrida crawlea ~2.400 páginas. Las siguientes son casi gratis, porque
sólo se re-embebe el chunk cuyo `contentHash` cambió.

### Cuánto tarda el índice en completarse

Los embeddings de Gemini se miden **por día y por proyecto**, y este proyecto está
en free tier para ese endpoint. Verificado contra la API real:

```
quotaId:    EmbedContentRequestsPerDayPerUserPerProjectPerModel-FreeTier
quotaValue: 1000
```

Cada ítem de un batch cuenta como un request. Que `generateContent` se comporte
como pago no implica que los embeddings lo sean — son cupos distintos, y los 429
**no son transitorios**: se reponen a las 00:00 UTC.

El corpus medido son **2.309 chunks embebibles** (366 páginas de texto completo),
más 1.966 páginas programáticas que no se embeben nunca. Cuatro cosas hacen que
eso entre:

- las familias programáticas (`/sucursal/*`, `/casa/*`, `/comparativas/*`…) van
  **sólo por el brazo léxico**: son un título de plantilla, justo donde el denso no
  aporta y BM25 gana
- el chunker **empaqueta secciones hermanas**, lo que bajó el corpus de 3.514 a
  2.309 sin perder contenido
- **`GEMINI_EMBED_KEYS` acepta varias claves** y el indexador rota cuando una se
  queda sin cupo. La cuota es por proyecto, así que dos claves son 2.000/día. En
  esta caja había dos claves distintas y se usaba una sola
- el presupuesto se multiplica solo por la cantidad de claves (800 de cada 1.000;
  el resto son las consultas del bot)

Con dos claves el índice se completa en **dos corridas**. En los logs vas a ver
`N chunks quedaron sin embeber` mientras tanto: es el estado normal, no un error.

**Con facturación habilitada** poné `RAG_EMBED_DAILY_BUDGET` alto y se arma de una:
el corpus entero son ~2 M de caracteres, o sea centavos.

Verificar:

```bash
npm run rag_probe -- --stats
npm run rag_probe -- "me trabaron un paquete en el correo, que hago"
```

## 4. Calibrar los umbrales — el paso que no conviene saltear

`REDDIT_BOT_MIN_COSINE` (0,62) y `REDDIT_BOT_MIN_MARGIN` (1,12) son un punto de
partida razonable, **no valores medidos**. Y no se pueden medir en otro lado que
no sea acá: la distribución de cosenos depende del índice completo, así que un
número sacado contra un índice de prueba de doce páginas no dice nada sobre este.

```bash
npm run rag_probe -- --reddit uruguay
npm run rag_probe -- --reddit UruguayFinanzas
```

Eso puntúa lo que esos subs están preguntando ahora mismo y marca con ✅ lo que
pasaría la puerta. Lo que hay que mirar:

- ¿Algún ✅ que, leyendo el hilo, no debería estar? → subir `MIN_COSINE`
- ¿Hilos claramente contestables que no dan ✅? → bajarlo, de a 0,02
- ¿Muchos casos donde la página ganadora es una de tres casi empatadas? → subir
  `MIN_MARGIN`; ese empate es la firma de un tema que cubrimos sin contestar

## 5. Ensayo general

```bash
pm2 start ecosystem.config.js --only currency-reddit-bot
pm2 logs currency-reddit-bot
```

Con `REDDIT_BOT_DRY_RUN=1` el bot corre el pipeline entero — filtro, recuperación,
juez, redacción, validación — y en vez de publicar imprime el comentario que
habría posteado. Dejalo así **unos días**, y leé los comentarios como si los
hubieras escrito vos: ¿contestan la pregunta antes de linkear? ¿el enlace es el
correcto? ¿suenan a persona?

Las decisiones quedan todas en Mongo, con el motivo:

```js
db.redditbotreplies.find({ status: "dry_run" }).sort({ createdAt: -1 }).limit(10)
db.redditbotreplies.aggregate([{ $group: { _id: "$rejectReason", n: { $sum: 1 } } }])
```

### Qué mirar para que no suene a bot

El validador ya rechaza lo mecánico: tuteo (en Uruguay se vosea), viñetas, emojis,
encabezados, y las muletillas de manual ("es importante destacar", "cabe
mencionar", "en resumen", elogiar la pregunta, desear suerte). Lo que **no** puede
verificar una regex es si el comentario enganchó con el caso de la persona, y eso
es lo que hay que leer en el dry-run: ¿retoma el monto, el país, el banco o el
plazo que dio? ¿le corrige el supuesto equivocado? Si contesta bien pero en
abstracto, sirve menos que no contestar.

Los números de la persona **sí** se pueden citar: si preguntó por una compra de
US$ 19,15 que le cobran 26, la respuesta puede usar esos dos. Lo que no puede es
inventar cifras que no estén ni en las páginas recuperadas ni en el hilo.

### Las imágenes

Buena parte de estos hilos **son** la captura: la foto de lo que cobró el courier,
el aviso de Aduanas, la app del banco. Con `REDDIT_BOT_READ_IMAGES=1` (default) el
bot baja la imagen del post y se la muestra al redactor — con Claude escribiéndola
en `CLAUDE_AGENT_WORKSPACES` para que la abra con `Read`, con Gemini mandándola
inline.

Alcance real, sin exagerarlo: la imagen **enriquece** la respuesta de un hilo que
el texto ya identificó como relevante. No convierte al bot en clasificador de
fotos: si el título no tiene tema de plata ni forma de pregunta, el hilo se
descarta antes de bajar nada. Lo que sí cambia es el piso de largo — "¿me llegó
esto de DHL, es normal?" pasa el filtro cuando trae foto y no pasaría sin ella.

Los motivos que más importan en ese conteo:

- `gap:weak_match` / `gap:no_clear_winner` — no había página. Sanos y esperables.
- `invalid_invented_number` — el redactor puso una cifra que no estaba en el
  contexto y el validador lo frenó. Que aparezca es el sistema funcionando; que
  aparezca *siempre* significa que las páginas recuperadas no tienen los datos.
- `judge` — el retriever y el juez discreparon. Muchos de estos con `MIN_COSINE`
  alto sugieren que el juez está siendo el freno útil.

## 6. Prender

```ini
REDDIT_BOT_ENABLED=1
REDDIT_BOT_DRY_RUN=0
```

```bash
pm2 restart currency-reddit-bot
pm2 start ecosystem.config.js --only currency-reddit-bot-watch
```

Desde ahí: como mucho **5 respuestas por corrida** y 25 por día, 8 por subreddit,
8 minutos con jitter entre una y otra, una sola vez por hilo y la misma persona no
antes de 7 días.

El **enfriamiento por página está en cero**, o sea apagado, y es una decisión
consciente: con una ventana semanal era el freno que más rechazaba, porque los hilos
que el sitio contesta se agrupan por tema y ocho preguntas de aduana en la semana son
ocho candidatas a la misma página. Lo que lo reemplaza es más chico y más preciso:
**no se repite una página dentro de una misma corrida**. El patrón que un moderador
reconoce no es "el mismo enlace ocho veces en la semana", es "el mismo enlace cinco
veces en una hora, en subs distintos". Si alguna vez alguien comenta que ve el mismo
enlace repetido, `REDDIT_BOT_PAGE_COOLDOWN_DAYS=1` es la primera perilla.

El cron es **por hora** (minuto 6) y la ventana es de **una semana**: el bot ve todo
lo que se preguntó en los últimos 7 días y no sólo lo de esta mañana. Entre las
03:00 y las 10:59 UTC no publica aunque el cron dispare — es medianoche a 8 AM en
Montevideo, y el horario de publicación es de las señales más baratas de leer en el
historial de una cuenta.

El límite de 3 por corrida es de **ráfaga**, no de volumen: entre un comentario y el
siguiente la corrida duerme y vuelve a leer el ledger, así que los cupos diario y por
sub se evalúan contra lo que ella misma acaba de hacer. Por eso una corrida puede
durar media hora, y por eso el cron pasó de cada doce minutos a cada una.

### Ponerse al día con el atraso

El primer día en que la ventana pasó a ser semanal hay decenas de hilos sin
contestar, y a 5 por hora eso sigue siendo un día largo. Para eso:

```bash
npm run reddit_sweep                          # ensayo
REDDIT_BOT_DRY_RUN=0 npm run reddit_sweep     # de verdad
```

Es la misma corrida repetida hasta que no queda nada o hasta que un tope corta. **No
relaja ningún límite**: si querés más volumen, la perilla es `REDDIT_BOT_MAX_PER_DAY`
y subirla es una decisión aparte de correr esto.

## 7. Vigilancia y freno

`currency-reddit-bot-watch` relee cada hora el score de lo posteado en las últimas
72 h. Manda un Telegram por cada comentario borrado o con score ≤ −2, y si junta
**3 negativos en 24 h pausa el bot 48 h solo**.

Esa pausa es una fila en Mongo, no una variable de entorno:

```js
// ver
db.redditbotreplies.findOne({ postId: "__paused__" })
// levantar a mano (sólo después de haber cambiado algo)
db.redditbotreplies.deleteOne({ postId: "__paused__" })
```

Si el breaker saltó, el arreglo no es levantar la pausa: es subir `MIN_COSINE` o
`MIN_JUDGE` y volver a dry-run unos días.

**Freno de mano**, en cualquier momento:

```bash
pm2 stop currency-reddit-bot
```

o `REDDIT_BOT_ENABLED=0` en el `.env`, que además deja constancia de por qué.

## 8. Los huecos de contenido se convierten en páginas solos

`currency-content-gaps` corre a las 05:35 UTC. Agrupa las preguntas que quedaron
sin respuesta y, cuando cuatro o más piden lo mismo, **investiga, escribe la
página y la publica**: push a `main`, que dispara el deploy. Después el bot vuelve
a esos hilos —que quedaron aparcados como `waiting_page`, no descartados— y los
contesta con la página que existe porque ellos preguntaron.

Una página por corrida. No es un límite de volumen sino de radio de daño: si algo
del generador está mal, la evidencia es una página y un revert.

### Lo que reemplaza a la revisión humana

No hay una persona entre esto y el sitio público. La revisión que haría esa
persona está automatizada, y **cualquiera de estos pasos en rojo publica NADA**:

1. **Alcance** — la pregunta cae en una temática del sitio
   (`classes/gaps/topics.ts`). Un cluster fuera de alcance se marca y no se
   reintenta nunca más.
2. **Investigación** — búsqueda web real, y después la página se escribe con el
   **texto descargado de las fuentes delante**, no con la memoria del modelo.
3. **Fuentes** — cada URL citada se descarga y tiene que devolver 200. Si hay más
   citas rotas que buenas, se aborta: eso es evidencia de que inventó citas.
4. **Cifras** — **cada número de la página tiene que aparecer literal en el texto
   descargado**. Es la misma regla que ya frena los comentarios.
5. **Forma** — largo, secciones con sustancia, slug libre, sin muletillas.
6. **Lint y tests de la app**, corridos en un clon aparte **antes** del push.

El paso 6 es el que ocupa el lugar del merge: pushear a `main` *es* desplegar, así
que la pregunta "¿esto es seguro?" hay que contestarla antes, no en CI después.

Lo que la investigación no pudo confirmar se publica como tal, en su propia
sección. No se redondea a una afirmación.

Si algo falla, queda el borrador investigado en `docs/reddit-gaps/` y te llega un
Telegram con el motivo.

### El clon de verificación

Se prepara **una sola vez**, y nunca es el checkout de deploy (los scripts de
deploy hacen `git pull` ahí; un archivo generado suelto convierte el próximo
deploy en un conflicto):

```bash
git clone https://github.com/eduair94/cambio-uruguay.git /root/cambio-uruguay-genpage
cd /root/cambio-uruguay-genpage/app && npm install --force
```

Y en el `.env` raíz: `GENPAGE_WORKSPACE=/root/cambio-uruguay-genpage`.

### Ensayar sin publicar

`GENPAGE_DRY_RUN=1` corre todo —alcance, investigación, fuentes, cifras, lint,
tests— y frena justo antes del push. Sirve para ver qué escribiría contra una
pregunta real.

### Dónde queda lo generado

- `app/utils/generated/<slug>.ts` — el contenido, como datos
- `app/pages/<slug>.vue` — 15 líneas que envuelven `components/AutoGuide.vue`
- `app/utils/generatedPages.ts` — la entrada de nav

**El bot nunca toca `siteNav.ts`.** Son 2.200 líneas que mantienen personas y que
leen todas las proyecciones del sitio; las entradas generadas viven en su propio
archivo, que `siteNav.ts` spreadea con una línea.

Para retirar una página: borrá su entrada en `generatedPages.ts` y sus dos
archivos. Nada más la referencia. A partir de que la editás a mano, es una página
como cualquier otra.

## Cuando algo no anda

| síntoma | causa casi siempre |
|---|---|
| el bot loguea "el índice RAG está vacío" | `currency-rag-index` nunca corrió, o `APP_MONGO_URI` apunta a otra base |
| "run bloqueado: disabled" | falta `REDDIT_BOT_ENABLED=1` |
| "run bloqueado: paused" | saltó el breaker; mirá el Telegram de esa noche |
| todo termina en `filter:off_topic` | los subs están tranquilos; comparalo con `--reddit <sub>` |
| 401 al pedir el token | la app de Reddit no es de tipo `script` |
| errores de Reddit `RATELIMIT` | la cuenta es demasiado nueva; bajá `MAX_PER_DAY` y esperá |
| "la bio de la cuenta no declara el bot" | la descripción del perfil está vacía o no nombra el sitio. `npm run reddit_account` dice qué falta |
| "run bloqueado: quiet_hours" | son entre las 03 y las 10 UTC. Es lo esperado, no un error |
| "sub_no_escribible" en los descartes | r/AskUruguayan (ban) y r/CharruaDevs (sus reglas prohíben bots). También esperado |
| el bot contesta hilos de hace días | es a propósito: la ventana es de 168 h. `REDDIT_BOT_MAX_AGE_HOURS` la achica |
| 429 de embeddings todo el tiempo | se agotó el cupo diario de 1.000 (ver arriba). No es transitorio: se repone al día siguiente |
| los comentarios salen telegráficos | el hook de caveman le ganó al `appendSystemPrompt`; `claude plugin disable caveman@caveman` en la caja |
| "Claude sin cupo o inalcanzable" | gastaste las 200 del día, o quedan menos que `CLAUDE_AGENT_MIN_REMAINING`. El bot sigue con Gemini |
| las respuestas ignoran la foto | mirá que exista `CLAUDE_AGENT_WORKSPACES` y sea escribible; si no, degrada a Gemini inline y después a texto solo |
| el índice no crece hace días | mirá `deferred` en los logs; si es 0 y sigue chico, es que el crawl está fallando, no la cuota |
