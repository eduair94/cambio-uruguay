# Ranking de autores de r/CharruaDevs — `/ranking-usuarios-charruadevs`

**Pedido (2026-09-16):** "Quiero el ranking en la web, en una página vinculada a las analíticas, con
links a los usuarios de reddit respectivos y https://ghostddit.aeddit.com/user/(usuario)".

El análisis por autor ya existía fuera de la app (corpus local). Esto lo mete adentro del job diario
y lo publica.

## Decisiones

- **Los autores se guardan.** Hasta ahora `charruadevstexts` no tenía autor a propósito. Publicar el
  ranking obliga a guardarlo: sin autor no hay ranking que se actualice solo. El **buscador sigue sin
  devolverlo** (proyección explícita en `search.get.ts`); el autor sale únicamente agregado, en el
  bloque `authors` del snapshot.
- **`noindex` + fuera del sitemap + fuera de la navegación.** Es una lista de personas con nombre.
  Que exista en el sitio no obliga a que Google la muestre cuando alguien busca ese nombre. Se llega
  desde `/mercado-it-uruguay`, que es donde tiene sentido.
- **Media encogida, no media cruda.** `score = (mean·n + prior·K) / (n + K)` con `prior` = media del
  sub y `K = 30`. Sin esto el ranking lo gana una cuenta con 4 opiniones. El umbral de las tablas
  (`MIN_OPS = 25`) es aparte del encogimiento: uno ordena, el otro decide quién entra.
- **Karma propio, no karma total.** Las tablas de "pesimismo más votado" suman el score de las
  opiniones NEGATIVAS del autor (`negK`), no todo su karma.
- **Se publica el contexto que desarma la lectura fácil.** Concentración (cuántos sostienen el
  pesimismo), mezcla de orientaciones, y el karma por orientación — que dice que el sub NO premia al
  pesimista (3,47 / 3,65 / 3,56). Un ranking sin eso invita a leer "los amargados arruinan el sub",
  que es justo lo que los datos no dicen: los 10 más negativos son el 3 % de las opiniones negativas.

## Alcance

1. `author` en el documento, en los dos espejos del esquema, y al escribir (`refresh.ts`).
2. `classes/charruadevs/authors.ts`: `buildAuthorRanking` puro. Excluye `AutoModerator`, `[deleted]`
   y vacío. Una "opinión" es un texto con `rel` y `stance != null`.
3. Bloque `authors` del snapshot: `concentration`, `mix`, `karmaByOrientation`, `shift`, y las tablas
   `negative`, `positive`, `doomers`, `loudest`, `mostUpvotedNeg`, `mostUpvotedPos`, `swings`.
4. `--authors <archivo.jsonl>`: backfill de una vez de los 154k textos ya sembrados (`{rid, author}`).
5. Página `/ranking-usuarios-charruadevs` con links a `reddit.com/user/<u>` y
   `ghostddit.aeddit.com/user/<u>`, y tarjeta de entrada en `/mercado-it-uruguay`.

## Qué NO se hace

- No se muestra el autor de cada texto en el buscador ni en las citas.
- No se rankea nada con menos de 25 opiniones.
- No se publica el corpus por autor: sólo los agregados y las tablas.
