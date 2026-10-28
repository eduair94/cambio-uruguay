# Oportunidades en Reddit (`/oportunidades-reddit`)

Página **privada** con los hilos de los últimos 30 días de los subreddits uruguayos donde una
respuesta con un enlace del sitio le sirve a quien preguntó. La arma una vez por día el job
`currency-reddit-opportunities` (`sync_reddit_opportunities.ts`, 10:21 UTC). Spec:
`docs/superpowers/specs/2026-10-28-oportunidades-reddit-design.md`.

## Por qué

Desde el 7/10/2026 las cuentas del sitio en Reddit están suspendidas y el bot de comentarios no
llega a nadie. La única vía es una persona contestando a mano, y eso rinde si alguien ya buscó: qué
hilo, qué página, por qué.

## Qué NO hace

- No publica nada en Reddit (ni comentarios, ni posts, ni votos).
- No redacta respuestas: el 4/9/2026, 0 de 14 borradores de una pasada servían como salían.
- No es pública: lista desconocidos como "hilos para contestar", y eso publicado se lee como
  operación de spam.

## La corrida

1. `/new` de cada sub hasta 30 días (≤10 páginas; r/monte_video pasa los 1000 hilos del tope de
   Reddit en ≈28 días, y la base los acumula día a día).
2. Refresca votos, comentarios, cerrado y borrado de lo conocido; pregunta por `/api/info` por los
   recomendados que el listado no trajo (si no vuelven, borrados; si `/api/info` no contesta, nada).
3. Filtro sin red (`screen.ts`): NSFW, fijados, cerrados, borrados, autor borrado, flairs de
   meme/política/noticia, sensibles, evasión, ya enlazado en el texto, avisos de venta que no
   preguntan nada, y lo que no tiene forma de pedido.
4. Candidatas (`candidates.ts`): reglas de intención (`destinations.ts`, una por directorio o
   herramienta) y el brazo léxico del índice RAG (`ragchunks`), sin páginas que no contestan
   (`redditbot/linkable.ts`). Un hilo sin intención y sin tema de plata no se juzga.
5. Juez (`judge.ts`, Gemini, lotes de 10, `REDDIT_OPPS_MODEL` o `GEMINI_MODEL`): una ruta de las
   candidatas o ninguna, confianza, motivo y ángulo. Se muestra con confianza ≥ 0,6.
6. Comentarios de los recomendados: si alguien ya enlazó el sitio, "ya enlazado" (se oculta).
7. Respuestas marcadas: el enlace que pegó la persona se relee con el token anónimo cada 3 días.
8. Orden (`rank.ts`), crossposts agrupados (`dupes.ts`), poda a 35 días, meta.

Crossposts: la clave es título + comienzo del texto (dos personas con el mismo título no son el
mismo hilo), y manda la copia que una persona ya contestó o descartó; si no, la más vieja. Elegir
por votos hacía que la copia contestada ayer pasara a duplicado hoy y la otra volviera a pendientes.

Si todos los lotes del juez fallan (clave, cuota, modelo), la corrida guarda la meta con la nota,
avisa por Telegram y sale con 1; la página muestra el aviso.

Calibración (corpus del 28/10/2026, 3.064 hilos): 1.246 pasan el filtro; 138 tienen una regla de
intención de directorio. El resto de los que pasan sólo llega al juez si es de plata.

## Datos

- `redditopportunities` (APP DB): un documento por hilo juzgado, recomendados y rechazados (los
  rechazados no se muestran, pero evitan volver a pagar el juez). Sin autor. El job escribe todo
  salvo `state`, `stateAt` y `answerUrl`, que escribe el app.
- `redditopportunitymetas`: la última corrida, por sub.

## Reglas de cada sub (avisos en la card)

- r/LegalUruguay borró en silencio un comentario con enlace (20/8/2026, token anónimo).
- r/AskUruguayan baneó a la cuenta del bot por spam (18/8/2026).
- r/CharruaDevs prohíbe bots por escrito.
- r/uruguay, regla 2: lo propio no puede ser sólo para atraer visitas.

## Correr a mano

```bash
node dist/sync_reddit_opportunities.js --dry-run       # lee y juzga, no escribe
node dist/sync_reddit_opportunities.js --judge-max=50  # corrida real con tope del juez
```

Un `--dry-run` local sin `APP_MONGO_URI` corre sin índice RAG (sólo reglas) y cree que todo es
nuevo: sirve para ver el filtro y el juez, no para medir la cola.
