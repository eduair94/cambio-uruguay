# Bot de Reddit — puesta en marcha

Cuatro procesos pm2 nuevos. Los cuatro se despliegan solos al pushear a `main`
(el path-filter del backend los agarra), y los cuatro **no hacen nada** hasta que
alguien cargue variables en el `.env` del servidor. Este documento es el orden en
que hay que cargarlas.

| proceso | qué hace | qué necesita |
|---|---|---|
| `currency-rag-index` | arma el índice del sitio | `APP_MONGO_URI`, `GEMINI_API_KEY` |
| `currency-reddit-bot` | responde en Reddit | lo anterior + credenciales del bot + dos flags |
| `currency-reddit-bot-watch` | lee cómo cayeron las respuestas | credenciales del bot |
| `currency-content-gaps` | borradores de lo que falta | `APP_MONGO_URI`, `GEMINI_API_KEY` |

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
  para comentar. Si la cuenta es nueva, esperá a que participe un poco como
  persona antes de prender esto.

## 2. Variables en el `.env` del VPS

Copiar el bloque `--- RAG del sitio + bot de Reddit ---` de `.env.sample` y
completar. **Dejar `REDDIT_BOT_ENABLED=0` y `REDDIT_BOT_DRY_RUN=1` por ahora.**

Son dos puertas separadas a propósito, igual que `CONTENT_PROMO_ENABLED`: las
credenciales van a estar en la máquina antes de que los umbrales estén calibrados,
y desplegar el archivo no puede ser lo que empieza a hablarle a desconocidos.

## 3. Primer índice

```bash
pm2 start ecosystem.config.js --only currency-rag-index
pm2 logs currency-rag-index
```

La primera corrida crawlea ~2.400 páginas. Las siguientes son casi gratis, porque
sólo se re-embebe el chunk cuyo `contentHash` cambió.

### El índice tarda unos días en completarse, y está bien

Los embeddings de Gemini se miden **por día**, y este proyecto está en free tier
para ese endpoint. Verificado contra la API real:

```
quotaId:    EmbedContentRequestsPerDayPerUserPerProjectPerModel-FreeTier
quotaValue: 1000
```

Cada ítem de un batch cuenta como un request. Que `generateContent` se comporte
como pago no implica que los embeddings lo sean — son cupos distintos.

El corpus tiene ~3.400 chunks embebibles, así que **el primer índice no entra en un
día**. El diseño lo asume en tres lugares:

- las páginas programáticas (`/sucursal/*`, `/casa/*`, `/comparativas/*`… ~40% del
  corpus) **no se embeben nunca**: son un título de plantilla, que es justo el caso
  donde el brazo léxico gana y el denso no aporta
- el indexador gasta `RAG_EMBED_DAILY_BUDGET` (700) y para; lo que no alcanzó
  queda para mañana y se toma sin repetir nada
- el bot tiene su propio tope por corrida (`REDDIT_BOT_MAX_CANDIDATES`), así que no
  puede comerse la parte del indexador

Resultado: el índice converge en unos cinco días y después cuesta casi nada. En los
logs vas a ver `N chunks quedaron sin embeber` — es el estado normal esos días, no
un error.

**Si habilitás facturación para embeddings**, subí `RAG_EMBED_DAILY_BUDGET` a 5000
y el índice se arma en una sola pasada. El corpus entero son ~1,5 M de tokens una
única vez, o sea centavos.

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

Desde ahí: como mucho **una respuesta por corrida**, 6 por día, 2 por subreddit,
25 minutos entre una y otra, una sola vez por hilo, la misma persona no antes de 7
días y la misma página no antes de 3.

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

## 8. Los huecos de contenido

`currency-content-gaps` corre a las 05:35 UTC, agrupa las preguntas que quedaron
sin respuesta y, cuando cuatro o más piden lo mismo, escribe un borrador
investigado en `docs/reddit-gaps/` y avisa por Telegram.

Un borrador **no es una página** y no se publica solo. Por qué, y qué hay que
verificar antes de convertirlo, está en `docs/reddit-gaps/README.md`.

## Cuando algo no anda

| síntoma | causa casi siempre |
|---|---|
| el bot loguea "el índice RAG está vacío" | `currency-rag-index` nunca corrió, o `APP_MONGO_URI` apunta a otra base |
| "run bloqueado: disabled" | falta `REDDIT_BOT_ENABLED=1` |
| "run bloqueado: paused" | saltó el breaker; mirá el Telegram de esa noche |
| todo termina en `filter:off_topic` | los subs están tranquilos; comparalo con `--reddit <sub>` |
| 401 al pedir el token | la app de Reddit no es de tipo `script` |
| errores de Reddit `RATELIMIT` | la cuenta es demasiado nueva; bajá `MAX_PER_DAY` y esperá |
| 429 de embeddings todo el tiempo | se agotó el cupo diario de 1.000 (ver arriba). No es transitorio: se repone al día siguiente |
| el índice no crece hace días | mirá `deferred` en los logs; si es 0 y sigue chico, es que el crawl está fallando, no la cuota |
