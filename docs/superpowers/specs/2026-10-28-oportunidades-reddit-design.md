# Oportunidades en Reddit — diseño (2026-10-28)

## Qué es y por qué

Una página **privada** con los hilos recientes (últimos 30 días) de los subreddits uruguayos donde
una respuesta con un enlace del sitio le sirve de verdad a quien preguntó: alguien que busca
alquiler, un auto usado, un celular, una heladera, quiere saber dónde cambiar dólares, cuánto le
queda de sueldo, cómo funciona la franquicia del courier, etc. Se actualiza sola una vez por día.

Pedido del dueño (28/10/2026): "analizá los subreddits uruguayos y creá una página con posts
recientes (último mes) que sea recomendable responder con algún link de cambio uruguay, ya sea
página para buscar autos, alquileres, etc. Actualizar diariamente. Todos los subreddits uruguayos
(r/uruguay, AskUruguayan, Uruguay nomas, Montevideo…). Lista responsive con cards, paginación,
carga al hacer scroll".

Por qué ahora: el bot de comentarios está muerto (u/SizeSouthern112 y u/Exotic-Mission-7235
suspendidas desde el 7/10). La única vía que queda es que una persona conteste a mano, y para eso
necesita la cola armada: qué hilo, qué página, por qué.

## Metas

- Cola diaria, sin intervención, de hilos ≤30 días con **una** página sugerida por hilo, el motivo
  en una línea y qué aportar al responder.
- Cubrir todos los subs uruguayos activos (medidos, ver abajo).
- Precisión antes que cobertura: una cola llena de basura no se lee.
- Trabajarla cómodo desde el celular: cards, filtros, scroll infinito con paginación, "marcar
  respondido" / "descartar".

## No-metas

- **No publica nada en Reddit.** Ni comentarios, ni posts, ni votos.
- **No redacta respuestas.** Medido el 4/9/2026: 0 de 14 comentarios de una pasada servían tal
  como salían (cifras caídas, hilos ya contestados). La página da el enlace y el ángulo; el texto lo
  escribe la persona.
- No es una página pública ni indexable.
- No reemplaza a `currency-reddit-bot` (sigue inerte) ni al radar de temas.

## Anti-metas (fallaría aunque "ande")

- Que se lea como operación de spam: página pública que lista desconocidos como "objetivos".
- Sugerir enlaces a páginas que no contestan nada (mapa de temas, estadísticas, noticias): misma
  lista que `classes/redditbot/linkable.ts`.
- Mandar a responder hilos sensibles (salud, violencia, juicios propios) o que piden evadir la
  aduana: mismas listas que `classes/redditbot/filter.ts`.
- Mandar a responder un hilo donde ya alguien enlazó el sitio.

## Subreddits (medidos con la API el 2026-10-28, hilos en 30 días)

| sub | hilos 30 d | nota |
|---|---|---|
| r/uruguay | 767 | |
| r/monte_video | ≥1000 | el listado de Reddit corta en 1000 (≈28,6 días); la base acumula día a día |
| r/Uruguay_nomas | 439 | el "Uruguay nomas" del pedido (r/UruguayNomas es privado) |
| r/Burises | 321 | |
| r/CharruaDevs | 177 | |
| r/AskUruguayan | 101 | mucho en inglés |
| r/AutosUy | 81 | |
| r/Uruguay_Mujeres | 75 | |
| r/LegalUruguay | 64 | |
| r/UruguayMarketplace | 22 | compraventa: sólo preguntas, no avisos |
| r/MadeInUruguay | 18 | |

Privados o muertos (no se leen): r/Montevideo y r/UruguayNomas (403 privado), r/UruguayFinanzas
(restringido, 0 hilos), r/UruguayInversiones, r/inversiones_uy, r/UruguayCrypto, r/CryptoUruguay,
r/PiquesUy, r/startupsUruguay (0 hilos en 30 días). Lista en código, con env para cambiarla.

## Cómo se arma (decisiones)

Job de backend nuevo, `currency-reddit-opportunities` (`sync_reddit_opportunities.ts`), cron
diario `21 10 * * *` UTC (07:21 en Uruguay: la cola está fresca a la mañana y no choca con los
otros que usan la API de Reddit en :06/:09/:48). Escribe en la APP DB. Regla del repo: el análisis
se precalcula, el pedido sólo lee.

Por corrida:

1. **Leer** `/new` de cada sub hasta 30 días atrás (≤10 páginas). Un sub que devuelve cero se
   avisa en el log.
2. **Refrescar** votos, comentarios, cerrado y borrado de los hilos que ya están en la base (los
   que no aparecen en el listado se piden por `/api/info`).
3. **Filtro barato** (sin red): fuera NSFW, fijados, cerrados, borrados, autor borrado o
   AutoModerator, flairs de meme/política/noticia, texto corto, sensibles, evasión, ya enlazado en
   el texto. Tiene que tener forma de pedido (pregunta, "busco", "recomiendan", "dónde", etc.).
4. **Candidatas** (sin red, sin embeddings): reglas de intención para los directorios y
   herramientas del sitio (alquileres, venta de viviendas, autos, qué auto comprar, cuánto vale mi
   auto, motos, celulares, sillas, equipar la casa, monopatines/bicis, nafta, ómnibus vs auto,
   dólar/casas de cambio, región, súper, tarjetas, préstamos, tiendas online, aduana/couriers,
   sueldo líquido, IRPF…) **más** las 5 mejores páginas del índice RAG (`ragchunks`) por su brazo
   léxico BM25 (`rankWithVector(q, null)`, cero cupo de embeddings), filtradas por `linkablePage`.
5. **Juez** (Gemini `askJSON`, de a 10 hilos por llamada, sólo hilos nuevos): por hilo decide si
   vale responder con UNA de sus candidatas, cuál, confianza 0–1, motivo (≤160 caracteres) y ángulo
   (≤200). La ruta tiene que ser una de las candidatas o se descarta. Si el juez falla, el hilo no
   se guarda y se reintenta al día siguiente. Lo rechazado se guarda (para no volver a pagarlo) y no
   se muestra.
6. **¿Ya enlazado?** Para los recomendados nuevos (y los que ganaron comentarios), se leen los
   comentarios del hilo y se marca si alguien ya puso `cambio-uruguay.com`. Tope por corrida.
7. **Orden**: `rank = confianza × frescura × visibilidad` (frescura cae con la edad; visibilidad
   sube con los votos y baja un poco con hilos de >80 comentarios donde la respuesta se entierra).
8. **Poda** de lo que pasa de 35 días.
9. Meta de la corrida (por sub: leídos, candidatos, recomendados) y aviso a Telegram con cuántos
   hilos nuevos hay, si hay alguno.

Guardas: si TODOS los subs vuelven vacíos (Reddit caído o sin credenciales) no se poda ni se
pisa la meta y sale con 1. Índice RAG vacío: sigue sólo con reglas de intención y lo dice.

### Datos

APP DB, colección `redditopportunities`, un documento por hilo juzgado (`postId` único): sub,
título, extracto (≤600), permalink, flair, fecha, votos, comentarios, cerrado/borrado, veredicto,
ruta, título de la página, familia, confianza, motivo, ángulo, ya enlazado, rank, fechas del juez y
del chequeo. **Estado de trabajo** (`open` / `answered` / `dismissed`) lo escribe SÓLO el app; el
job nunca lo pisa (`$setOnInsert`). Sin autor: para contestar no hace falta y no se arma perfil de
nadie. Meta en `redditopportunitymetas` (un documento). Espejo de modelos raíz↔app con test de
paridad.

### Página

`/oportunidades-reddit`, privada: `requireAdmin` en el servidor, `middleware: 'auth'`,
`noindex, nofollow`, robots disallow, fuera del sitemap, la navegación y los anuncios (mismas
listas que `/estadisticas-por-pagina`).

- `GET /api/reddit-opportunities?page&limit&sub&family&state&q&sort` → items paginados, total,
  facetas (subs, familias, estados) y meta. `no-store`.
- `POST /api/reddit-opportunities/state` `{ postId, state }`.
- Cards responsive (1 / 2 / 3 columnas): sub y antigüedad, título (enlace a Reddit), extracto,
  votos y comentarios, la página sugerida con su familia, motivo y ángulo, avisos (cerrado, ya
  enlazado). Acciones: abrir en Reddit, copiar enlace sugerido, abrir la página, respondido,
  descartar (con deshacer).
- Filtros: buscar, sub, familia, estado (por defecto pendientes), orden (recomendados, más nuevos,
  más comentados, más votados). Estado en la URL.
- **Scroll infinito** (IntersectionObserver sobre un centinela, 24 por página) **y paginación**
  numerada: el scroll agrega la página siguiente; elegir un número arranca la lista en esa página.
  Botón "Cargar más" de respaldo.

## Lo que queda al constructor

Nombres internos, umbral exacto de confianza para mostrar (≥0,6 de partida), fórmula fina del
rank, texto de los avisos, el diseño visual dentro del sistema de Vuetify del sitio.

## Lo que trajo la revisión del constructor (resuelto como calls míos)

- **Reglas de cada sub** (`classes/redditbot/subrules.ts`): no se saca ningún sub, porque quien
  responde es una persona y no el bot, pero cada card lleva el aviso de su sub: r/LegalUruguay borró
  en silencio un comentario con enlace (20/8/2026); r/AskUruguayan baneó a la cuenta del bot por
  spam (18/8/2026); r/CharruaDevs prohíbe bots por escrito; r/uruguay, regla 2 (lo propio no puede
  ser sólo para traer visitas).
- **¿Se ve la respuesta?** Al marcar "Respondido" se puede pegar el enlace del comentario. El job lo
  relee al día siguiente con el token anónimo (`fetchPublicCommentBodies`, que es lo que ve
  cualquiera) y la card dice "visible" o "no se ve". Así se detecta un filtro del dominio o de un
  sub sin depender de lo que ve el autor.
- **Cerrados, borrados y ya enlazados** se OCULTAN de "pendientes" (se ven con el filtro "todos").
  El chequeo de comentarios tiene un tope de 200 por corrida, que cubre de sobra los recomendados
  nuevos de un día; uno sin chequear se muestra con "comentarios sin revisar".
- **Hilos en inglés** (r/AskUruguayan): se incluyen. El job guarda el idioma (`lang`); si es inglés y
  la página tiene versión en inglés (`isLocalizedRoute`), el enlace a copiar es el `/en/…`.

## Calls hechos sin preguntar (revisables)

- Página privada, no pública (razones arriba).
- r/Uruguay_nomas es el "Uruguay nomas" pedido; r/monte_video reemplaza a r/Montevideo (privado).
- Sin borradores de respuesta generados por IA.
- Juez con Gemini (no con el Claude del 104: comparte cupo con el uso interactivo).
- Sin fila en `docs/seo/experiments.json`: no es un cambio del sitio que mueva tráfico por sí
  mismo; el tráfico que genere llega por referencia de Reddit y se ve en GA4.
