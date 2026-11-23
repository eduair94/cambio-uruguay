# Emprendimientos de Instagram — `/emprendimientos-de-instagram-uruguay`

Directorio de emprendimientos uruguayos que venden por Instagram, por rubro y por departamento,
con «uno al azar», «Cosas que no sabías que existían» (lo poco común, como las tarjetas pop-up de
Mondo Pop-up) y «Joyitas» (cuentas de menos de 3.000 seguidores que publicaron en el último mes).
Diseño: `docs/superpowers/specs/2026-11-23-emprendimientos-instagram-design.md`.

## Piezas

| dónde | qué |
|---|---|
| `sync_emprendimientos.ts` → pm2 `currency-emprendimientos` | `28 0,2,4,10,12,14,16,18,20,22 * * *` (10 corridas; sin 06 ni 08 UTC, cuando la corrida completa de alquileres lee Instagram desde la misma IP) |
| `classes/emprendimientos/run.ts` | una corrida: descubrir → leer → clasificar → decidir → bola de nieve → fichas → meta |
| `classes/emprendimientos/instagram.ts` | el perfil público sin sesión, en un Chrome (`classes/rentals/sources/social/chrome.ts`) |
| `classes/emprendimientos/uruguay.ts` | evidencia de Uruguay escrita (marcas uruguayas y extranjeras) |
| `classes/emprendimientos/classify.ts` | la IA (`classes/llm.ts`: créditos de Claude, Gemini de respaldo), de a 8 cuentas |
| `classes/emprendimientos/decide.ts` | qué se publica y cuándo se relee cada cuenta |
| `classes/emprendimientos/listing.ts` | la ficha pública, campo por campo |
| `classes/emprendimientos/sources/` | Uruguay Emprendedor (con el intermedio TLS embebido), Reddit |
| APP DB | `emprendimientocandidates` (privada), `emprendimientolistings` (pública), `emprendimientometas`, `emprendimientosuggestions`, `emprendimientooptouts` |
| `app/server/api/emprendimientos/` | `index` (listado + facetas + destacados), `cuenta/<handle>`, `azar`, `sugerir`, `baja` |
| `app/pages/emprendimientos-de-instagram-uruguay/` | portada, `<rubro>` (indexable con 5 cuentas o más), `cuenta/<handle>` (`noindex, follow`) |

## Lo que se midió antes de construir (23/11/2026)

- **Instagram sin sesión desde el VPS**: 13 de 14 perfiles en 2–3 s cada uno, con 4 s de pausa. El
  JSON embebido trae el nodo del usuario (`biography`, `bio_links`, `follower_count`, `is_private`,
  `profile_pic_url`) y el HTML dibujado la grilla de 12 posts con dueño, foto y el `alt`
  «Photo by X on November 21, 2026. Puede ser una imagen de…», o sea la fecha. Una lectura alcanza.
  Un `GET` HTTP común no trae nada: la página se dibuja con JavaScript.
- **Las fotos vencen a los ~4 días** (`oe=` hexadecimal en la URL). El CDN responde
  `cross-origin-resource-policy: cross-origin` y acepta un `Referer` ajeno, así que se enlazan.
  Por eso una cuenta publicada se relee cada 3 días o 36 h antes de que venza su primera foto, lo
  que llegue antes (`schedule`), y la API no sirve una foto vencida (`photoUrlExpired`). Una ficha
  sin lectura buena en 14 días se retira (`LISTING_MAX_AGE_DAYS`).
- **Descubrimiento**: hashtags y búsqueda de Instagram redirigen a login. Las fuentes son:
  - **Uruguay Emprendedor**: ~500 fichas, 56 páginas; se recorre por departamento para heredar el
    departamento. Su servidor dice UTF-8 y manda Latin-1, y no manda el intermedio TLS: Node da
    `UNABLE_TO_VERIFY_LEAF_SIGNATURE`. Va embebido en `sources/certs.ts`, junto al de Certum que
    ya estaba para el BCU, y vence el 2/5/2027 (`tests/emprendimientos/certs.test.ts` avisa).
  - **Reddit**: la API oficial, porque la búsqueda por texto de Arctic Shift daba «Timeout» en
    ventanas anchas. La primera prueba leyó 984 hilos y encontró 140 cuentas.
  - **La bola de nieve**: los dueños de las colaboraciones de la grilla y las `@menciones` de la
    bio de las cuentas publicadas y de las curadoras.
  - **Las sugerencias**: lo que la gente escribe en «Sumá un emprendimiento».
  - **Las semillas** de `seeds.ts`.
- El SERP interno (`:5112`) devolvió 503 en todas las pruebas: no se usa.

## Reglas

- **Uruguay, precisión sobre recall**: entra con una marca uruguaya escrita (🇺🇾, departamento,
  ciudad, barrio, `+598`/`09x xxx xxx`, `.uy`, handle `.uy`/`_uy`) o con una fuente uruguaya fuerte
  (Uruguay Emprendedor, semilla). Con una fuente de contexto (Reddit, colaboración, mención,
  sugerencia) hace falta además que la IA diga «sí» y que no haya marcas extranjeras.
- **Nunca un veredicto de confianza**. Se rechaza por lo que la cuenta ES:
  - personal, influencer o medio;
  - marca grande (más de 150.000 seguidores o lo dice la IA);
  - extranjera;
  - sin publicar hace más de 2 años (Mondo Pop-up no publica desde enero de 2025 y sigue vendiendo);
  - rubro excluido: préstamos, inversiones, cripto, apuestas, réplicas, seguidores, medicamentos,
    armas, contenido adulto, tabaco, vapeadores, cannabis/growshop y multinivel. Los de tabaco y
    cannabis quedan afuera por política de AdSense: en la primera prueba salieron `@bombshop.uy`
    (encendedores) y `@area16grow`.
- **La ausencia nunca es un veredicto**: si las 5 primeras lecturas de una corrida no traen ningún
  perfil, Instagram está cerrado. La corrida no cambia ningún estado y sale con 1, y Sentry abre el
  issue. «No existe» o «privada» tienen que repetirse dos veces. Una racha de lecturas sin perfil
  sólo cuenta en corridas donde Instagram contestó a la mayoría.
- **Redes y tiendas colectivas** uruguayas (`@red_de_emprendedores.uy`, `@lacomarca.uy`) quedan
  como `curadora`: no van a la grilla, se releen cada semana y alimentan la bola de nieve.
- **La IA describe, no decide**. Lo que contesta se valida contra listas cerradas; un rubro fuera
  de la taxonomía se descarta y la cuenta espera otra corrida. Una cuenta se reclasifica sólo si
  cambió su nombre o su bio, o a los 60 días.
- **Privacidad**: la ficha pública se arma campo por campo (`listing.ts`). No sale el texto de las
  fuentes, que puede ser un comentario de Reddit o una ficha con teléfono y correo, ni los enlaces
  de la bio: un `wa.me` lleva el teléfono, y de ahí sólo sale `whatsapp: true`. Una baja
  (`POST /api/emprendimientos/baja`) borra la ficha en el momento, la API la filtra y el job no
  vuelve a sumar esa cuenta por ninguna fuente. No se puede verificar que quien la pide sea el
  dueño: se prefiere sacar de más, y cada baja avisa por Telegram al chat de administración.

## Operación

- `node dist/sync_emprendimientos.js --dry-run [--handles=a,b] [--no-discovery] [--max-reads=N] [--json=archivo]`:
  arranca de las semillas en memoria, no toca ninguna base e imprime cada decisión.
- `EMPRENDIMIENTOS_ENABLED=0` apaga el job sin desplegar. Otras variables:
  - `EMPRENDIMIENTOS_MAX_READS` (100);
  - `EMPRENDIMIENTOS_GAP_MS` (4000);
  - `EMPRENDIMIENTOS_READ_MINUTES` (16);
  - `EMPRENDIMIENTOS_UE_DETAILS` (80);
  - `EMPRENDIMIENTOS_WEB_QUERIES` (12; `0` apaga la búsqueda web);
  - `EMPRENDIMIENTOS_POST_READS` (10; `0` apaga la lectura de posts de curadoras);
  - `EMPRENDIMIENTOS_PROXY`.
- `robots.txt` de instagram.com dice `Disallow: /`. Se leen páginas públicas porque lo pidió el
  dueño del sitio, igual que la fuente de Instagram de alquileres.

## Búsqueda más profunda (23/11/2026, segunda tanda)

La primera corrida de producción dejó 180 candidatas y 13 publicadas: el límite era el
descubrimiento, no los filtros (de 31 perfiles leídos, 13 entraron). Lo que se agregó:

- **Búsqueda web con Gemini** (`sources/web.ts`): 72 productos × 30 lugares más 180 búsquedas de
  curadoras (ferias, mercados, tiendas colectivas, redes), unas 2.300 consultas que se recorren 12
  por corrida (~20 días por vuelta). Una consulta medida devuelve de 2 a 9 cuentas en el texto;
  las fuentes citadas casi nunca son perfiles de Instagram, así que las cuentas se toman del texto.
  Gemini y no Claude: con `ANTHROPIC_GROUNDED=1` (el VPS desde el 22/11) `classes/llm.ts` mandaría
  la búsqueda a Claude, que cobra por búsqueda. Una cuenta inventada contesta «no existe» al leerla
  y nunca se publica. Es fuente «media»: hace falta el «sí» de la IA y ninguna marca extranjera.
- **Texto de posts de curadoras**: después de los perfiles, en el mismo Chrome, 10 posts por
  corrida repartidos entre curadoras (`postsToMine`). Se toman las @menciones del texto, las
  cuentas etiquetadas en la foto y los coautores. Rinde poco con las tiendas colectivas (medido:
  0,3 cuentas por post en @lacomarca.uy y @red_de_emprendedores.uy, que no etiquetan a sus marcas);
  está para las ferias que publican a sus expositores. `minedCodes` evita releer un post.
- **Más lecturas**: 100 perfiles por corrida. Una prueba desde el VPS leyó 119 seguidos (96 con
  perfil, 23 que no existían) sin un muro de login. Uruguay Emprendedor pasa a 80 fichas por
  corrida, con 1,5 s entre una y otra.
- **Dos defectos de la primera tanda**:
  - `mentionsIn` descartaba toda @mención terminada en `.uy`, tomándola por un dominio. La bola de
    nieve perdía justo a las cuentas uruguayas.
  - Un perfil con su nodo pero sin la grilla dibujada se rechazaba por «0 publicaciones»: le pasó a
    `@red_de_emprendedores.uy`, que tiene 316. Ahora es «no se pudo leer» y se reintenta.
