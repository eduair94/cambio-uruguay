# Apps útiles en Uruguay (`/apps-utiles-uruguay`) — diseño

Fecha: 2026-09-29. Pedido: "Hacer directorio de apps del estado uruguayo útiles que todos deberían
tener, así como apps útiles para uruguayos (ómnibus, tarjetas, etc). Hazlo lo más user friendly
posible, con filtros y tabs de navegación entre categorías / tipos de apps. Siguiendo los mejores
criterios."

## Lo que entendí

- **Dicho:** un directorio de apps con dos partes — las del Estado que todo el mundo debería tener, y
  las apps útiles del día a día (ómnibus, tarjetas…) — navegable por pestañas de categoría y de tipo,
  con filtros, lo más fácil de usar posible y con criterios de selección serios.
- **Supuesto (decidido acá, standing order de auto-aprobación):**
  - Una sola página pública nueva, cuerpo en español como el resto de las páginas de contenido.
  - "Mejores criterios" = (1) sólo apps que existen y están en la tienda de Uruguay, (2) siempre el
    enlace a la ficha OFICIAL con el desarrollador tal como figura en cada tienda, (3) lo no oficial
    se dice, (4) frescura visible (última actualización), (5) sin afiliados ni lugares pagos, (6) el
    criterio publicado en la página y la fecha de revisión al lado.
  - Público: cualquier persona que vive en Uruguay, incluidas personas mayores y poco técnicas, casi
    siempre desde el celular.
- **Éxito:** en menos de medio minuto alguien encuentra la app que necesita para una tarea ("el
  ómnibus", "la factura de la luz", "mi historia laboral"), sabe si es la oficial y la instala desde
  el enlace correcto; el kit de imprescindibles se entiende de un vistazo; todo dato es verificable y
  fechado; la página pasa todos los contratos del repo y queda desplegada.

## Lo que ya existe y por qué no alcanza

- `/apps-economia-uruguay` (`utils/moneyApps.ts`, 69 apps): sólo plata (bancos, billeteras,
  inversión, cripto), buscador + chips de plataforma, sin pestañas, sin fechas. Tiene 5 apps del
  Estado (gub.uy, DGI, 3 del BPS) metidas en "Gobierno y trámites" y UTE/Antel/Cómo ir en "Servicios
  útiles". Su snippet está bajo experimento hasta ~22/10 (`descripciones-que-empiezan-por-la-respuesta`):
  no se toca su título ni su descripción.
- `/apps-de-beneficios-uruguay`: clubes de puntos y beneficios. Otra intención.
- Nadie responde "¿qué apps del Estado tengo que tener?" ni cubre salud, emergencias, transporte,
  intendencias, servicios del hogar. Faltan en todo el sitio: ASSE, prestadores de salud, 9-1-1,
  INUMET, SUCIVE, Telepeaje, identidad digital (Abitab, TuID), intendencias fuera de Montevideo,
  Uber/Cabify/taxis, pasajes interdepartamentales.

## Lo que mostró la investigación (29/9/2026)

Nueve investigadores en paralelo (ocho áreas + un barrido por organismo publicador) y después una
verificación determinística contra la ficha de cada tienda (Play `gl=UY`, App Store `uy`):

1. **La app de ómnibus más usada de Montevideo no es oficial.** "STM Montevideo" es de un desarrollador
   independiente (Matungos en Android, Gabriel Yordi en iPhone); la oficial de la Intendencia es
   **Cómo ir** (500 k+ descargas, 2,8 ★, última versión marzo 2025). El directorio tiene que decir las
   dos cosas: cuál es la oficial y que la otra es útil pero no es de la IM.
2. **OSE no tiene app.** Las que se llaman "OSE" en las tiendas no son de OSE (una app de descuentos,
   un juego). El Correo Uruguayo tampoco tiene app propia (hay una de un tercero sin respaldo). Se
   dice en la página, porque es justo lo que alguien va a buscar.
3. **Apps que ya no existen o no operan:** Coronavirus UY (discontinuada 2023), la app de Cutcsa
   (retirada de Google Play), DiDi e inDrive (no operan en Uruguay), UyMap de Presidencia (retirada).
4. **Nombres que cambiaron:** Mi Movistar → Mi Tigo Uruguay (misma ficha), VERA+ → Antel TV.
5. **Notas bajas en apps oficiales imprescindibles** (DGI 2,5 ★ en Android, TuID 2,7 ★): la nota de la
   tienda mide la experiencia, no si la app sirve; se muestra igual, con su cantidad de opiniones.
6. **robots.txt:** `play.google.com/store/apps/details` y `apps.apple.com/<país>/app/...` están
   permitidos; `itunes.apple.com` tiene en Disallow `/lookup` y `/search`. El job semanal usa sólo las
   dos fichas públicas (misma regla que `mercadopago/`: no se hace cron contra un Disallow). La
   investigación de una vez usó el buscador de Apple a mano, como una persona.
7. Las dos fichas traen JSON-LD `SoftwareApplication` (nombre, desarrollador, nota, cantidad de
   opiniones, ícono). La fecha de la última versión está en el HTML: Play la rotula "Actualización"
   (`17 sept 2026`); App Store la trae en el bloque `versionHistory` (`secondarySubtitle`). Los íconos
   se sirven en 128 px (`=s128` en Play, `/128x128bb.png` en Apple), con `Access-Control-Allow-Origin: *`
   y sin exigir Referer. No hay CSP de imágenes en el sitio.

## Decisiones

- **Una página, `/apps-utiles-uruguay`, con pestañas por categoría** que son enlaces
  `?categoria=<id>` renderizados en el servidor: funcionan antes de hidratar (este sitio pierde los
  toques previos a la hidratación) y un enlace compartido llega filtrado. Después de hidratar se
  cambia de pestaña en el cliente y la URL se reescribe con `usePreciosQuerySync`
  (`history.replaceState`, sin el salto de scroll de `router.replace`). Canonical fija a la URL base;
  no hace falta `noindex` (la palabra no puede aparecer en el archivo: `seoContract`).
  - No son rutas por categoría: los hubs por término cabeza no rankean en este sitio (memoria
    "la ficha rankea, el hub no") y serían copias finas.
- **El "tipo" es un filtro al lado de las pestañas**: Todas · Públicas (Estado, intendencias,
  empresas públicas, organismos públicos) · Privadas · No oficiales. La insignia de cada tarjeta dice
  el tipo exacto (Estado / Intendencia / Empresa pública / Organismo público / Empresa / No oficial).
- **Kit "Las del Estado que conviene tener"** arriba de todo: necesidades, no apps sueltas. Dos
  grupos honestos — *Para todos* y *Según tu caso* ("si tenés auto", "si vivís en Montevideo"…) —,
  cada ítem con el porqué, el botón de la tienda correcta y una casilla "Ya la tengo" que se guarda
  en el navegador (`localStorage`, nunca se escribe antes de leer: trampa de mount-emit). Progreso
  "Tenés 4 de 7".
- **Registro curado en `app/utils`** (fuente de verdad del contenido) + **job semanal opcional** que
  trae de las tiendas ícono, nota, opiniones, última actualización y disponibilidad. La página se ve
  entera sin el job (sin íconos: monograma con el color de la marca, patrón `brandColors`).
- **Entra al hub `/directorios-uruguay`** como directorio curado (`fuente: 'curado'`, cifra = cantidad
  de apps, fecha = última revisión), familia `dinero` ("Dinero y servicios"), con migas por el hub.
- **Tema:** `tramites-y-documentos-uruguay` (el tema natural de las apps del Estado).
- **Cruces:** a `/apps-economia-uruguay` desde la categoría de plata ("las 69 apps de plata") y a
  `/apps-de-beneficios-uruguay` desde compras; a `/clonacion-de-tarjetas-uruguay` desde la sección
  de apps falsas. No se edita el snippet de `/apps-economia-uruguay`.
- **Nada de afiliados**: enlaces `rel="noopener noreferrer nofollow"`, como las otras dos páginas.

## Qué entra

Criterio publicado en la página (sección "Cómo elegimos"):

1. Está hoy en Google Play de Uruguay o en el App Store de Uruguay (fichas abiertas el 29–30/9/2026).
2. La publica la organización que la presta, o se marca "No oficial" con el enlace a la oficial
   (una sola: STM Montevideo, porque es la más usada y hace algo que la oficial no hace igual).
3. Le sirve a mucha gente en Uruguay: fuera las apps internas de funcionarios, los pilotos de 120
   familias, las de un solo museo, las de socios de un club, las globales sin nada uruguayo.
4. Mantenida: sin actualizaciones en más de 24 meses queda fuera, salvo que sea la única oficial de
   su servicio (INUMET, la app de la IM, Consulta de Expedientes), y entonces se avisa en la tarjeta.
5. Ninguna paga por estar ni lleva enlace de afiliado.

Resultado: **118 apps** en 10 categorías (conteo del 30/9/2026; el copy final y la verificación
fuente por fuente pueden sacar alguna):

| id | Pestaña | Apps | Qué hay |
|---|---|---|---|
| `tramites` | Trámites e identidad | 9 | gub.uy, TuID (Antel), Identidad Digital Abitab, DGI, 3 del BPS, Poder Judicial, Caja de Profesionales |
| `salud` | Salud | 26 | ASSE, Sanidad Militar, 17 mutualistas de Montevideo y del interior, emergencias móviles, 2 farmacias |
| `transporte` | Transporte y auto | 18 | Cómo ir, STM Montevideo (no oficial), recarga STM, pasajes, Telepeaje, SUCIVE, estacionamiento, Uber/Cabify/taxis, UTE Mueve, ANCAP |
| `dinero` | Bancos, tarjetas y pagos | 20 | 7 bancos, emisores de tarjetas, billeteras, redes de cobranza, Bankos (+ enlace a las 69 de `/apps-economia-uruguay`) |
| `hogar` | Luz, teléfono y servicios | 9 | UTE, Mi Antel, Tigo, Claro, cable, DIRECTV, Riogas |
| `emergencias` | Emergencias y clima | 4 | 9-1-1, INUMET, Cerca (desfibriladores), SIREC Canelones |
| `ciudad` | Tu intendencia | 6 | IM, Canelones (3), Maldonado, Salto |
| `educacion` | Educación y trabajo | 8 | GURÍ Familia, ANEP Estudiantes, Biblioteca País, CREA (Schoology), MiUdelar, Ibirapitá, Buscojobs, Computrabajo |
| `compras` | Compras y delivery | 13 | PedidosYa, Rappi, Mercado Libre, casilleros, 7 supermercados, Buen Provecho, preciosgub |
| `ocio` | Cultura y entretenimiento | 5 | Antel TV, Tickantel, RedTickets, AUF TV, +Cinemateca |

### Kit "Las apps del Estado que todos deberían tener"

- **Para todos** (con casilla y progreso): gub.uy · BPS Personas · identidad digital (TuID de Antel
  *o* Identidad Digital Abitab: con una alcanza) · Emergencia 9-1-1 · UTE Clientes · ASSE (o la app
  de tu mutualista, que lleva a la pestaña Salud).
- **Según tu caso** (sin casilla, con la condición escrita): DGI (si declarás IRPF o esperás
  devolución) · SUCIVE (si tenés auto o moto) · Telepeaje (si pasás peajes con TAG) · Cómo ir (si
  usás el ómnibus en Montevideo) · GURÍ Familia (si tenés hijos en escuela pública) · Mi Antel (si
  tenés servicios de Antel) · App eBROU (si tenés cuenta en el BROU).
- INUMET no entra al kit aunque sea la oficial: en iPhone no se actualiza desde 2019.

## Datos

### Registro (`app/utils/usefulApps.ts` + `app/utils/usefulAppsCatalog.ts`)

Todo exportado con prefijo `usefulApp`/`USEFUL_APP` (utils es un espacio de nombres plano;
`moneyApps.ts` ya usa `APP_CATEGORIES`, `PLATFORM_META`, `appHaystack`…). Sin `key` como nombre de
campo (gitleaks `generic-api-key` con valores que llevan dígitos).

```ts
type UsefulAppCategoryId = 'tramites' | 'salud' | 'transporte' | 'dinero' | 'hogar'
  | 'emergencias' | 'ciudad' | 'educacion' | 'compras' | 'ocio'
type UsefulAppKind = 'estado' | 'intendencia' | 'empresa-publica' | 'organismo-publico'
  | 'privada' | 'comunidad'
interface UsefulApp {
  id: string                    // kebab-case, único; también es el ancla #id
  name: string                  // como figura en la tienda
  organization: string          // quién está detrás, para humanos
  kind: UsefulAppKind
  category: UsefulAppCategoryId
  also?: UsefulAppCategoryId[]  // aparece también en otra pestaña
  summary: string               // para qué sirve, ≤ 120 caracteres, con "vos"
  uses: readonly string[]       // 2–4 cosas concretas, verificadas en fuente
  needs?: readonly string[]     // requisitos ("Usuario gub.uy", "Ser cliente")
  scope: 'nacional' | readonly UyDepartment[]
  android?: { id: string; developer: string }   // paquete + desarrollador tal cual en Play
  ios?: { id: string; developer: string }       // id numérico + desarrollador tal cual en App Store
  web?: string                  // versión web oficial, si existe
  source: string                // página del organismo (o prensa seria) que la respalda
  note?: string                 // advertencia: no oficial, reemplazada, sólo Android…
  officialAlternative?: string  // id de la oficial, para las no oficiales
  keywords?: readonly string[]  // sinónimos del buscador ("ómnibus", "luz", "jubilación")
  guides?: readonly string[]    // 0–2 rutas propias que ayudan a usarla (/factura-de-ute-uruguay…)
}
```

Más: `USEFUL_APP_CATEGORIES` (id, etiqueta, ícono mdi, descripción corta), `USEFUL_APPS_KIT`
(ítems del kit: id, título, porqué, `appIds`, `when?`), `USEFUL_APPS_VERIFIED_AT`
(`'YYYY-MM-DD'`), `USEFUL_APPS_NOT_APPS` (lo que la gente busca y no es app: OSE, Correo — con su
canal real), `USEFUL_APPS_FAQ`, y funciones puras: normalizar/buscar (multi-palabra, sin tildes),
filtrar, ordenar, estado ↔ URL (lista blanca, sólo lo que difiere del default).

### Identidades de tienda en la raíz (`classes/usefulapps/catalog.ts`)

El job no puede importar `app/` y el build del app no puede leer fuera de `app/`. Patrón del repo
(`equiparMirrorParity`, `storeConstantsParity`): la raíz tiene `{ id, android?, ios? }` y un test
del app importa ese archivo y exige que coincida con el registro (mismos ids, mismos paquetes y ids
de App Store). `deploy.yml` agrega el archivo a `appContracts`.

### Snapshot de tiendas (APP DB `usefulappssnapshots`, un documento `{ key: 'uy' }`)

Por app y por tienda: `ok` (en la tienda de Uruguay) o `missing` (404 explícito), `developer`,
`rating`, `ratingCount`, `updated` (YYYY-MM-DD), `icon` (sólo hosts `play-lh.googleusercontent.com`
y `*.mzstatic.com`, en 128 px), `installs` (Play), `checkedAt`. Semántica `mergeSignal` de
`classes/stores/profile.ts`: error de red = se conserva lo anterior con su fecha vieja; 404 = ausencia
explícita. `developerChanged` marca cuando el desarrollador de la tienda ya no es el registrado
(señal de revisión humana, la página no lo muestra).

## Página

Orden de lectura (el mismo en celular, recompuesto, no achicado):

1. **Migas** Inicio › Directorios › Apps útiles (visibles + JSON-LD con `directoriosHubListItem(2)`).
2. **Encabezado:** eyebrow "Directorio", H1 "Apps útiles en Uruguay: las del Estado y las del día a
   día", lead que contesta con el dato (cuántas, cuántas públicas, la fecha), tres `StatTile`.
3. **Kit** "Las apps del Estado que conviene tener" (Para todos / Según tu caso), casillas y progreso.
4. **Explorador:**
   - Pestañas de categoría: en ≥ 960 px una fila de pastillas que envuelve (44 px, ícono, cantidad,
     `aria-current`); debajo de 960 px un `<details>` nativo con la categoría actual y la lista
     vertical de filas de 48 px (patrón `FamiliaNav`, cambiado por CSS, sin `useDisplay`).
     Primera pestaña "Todas", segunda "Imprescindibles" (las tarjetas completas de las apps del
     kit, los dos grupos, en el orden del kit).
   - Barra: buscador (placeholder con ejemplos: "ómnibus, luz, BPS, cédula…"), Tipo (VBtnToggle
     `mandatory` con "Todas"), Plataforma (Android / iPhone), Departamento ("Todo el país" +
     departamentos que aparecen en el registro), Orden (Más útiles primero / A–Z / Actualizadas hace
     poco). En celular, Tipo/Plataforma/Departamento/Orden van en un `<details>` "Más filtros (n)".
   - Línea de resultado con `aria-live`: "32 apps" + "Limpiar filtros". Estado vacío con acción.
   - En "Todas", resultados agrupados por categoría (h2 con ícono y cantidad); en una categoría, la
     lista sola con la descripción de la categoría. Grilla CSS (1 columna en celular, `minmax(300px,
     1fr)` en escritorio) con `:deep(.google-auto-placed) { grid-column: 1 / -1 }`.
   - Botón flotante "↑ Categorías" (sólo cliente, aparece al pasar la barra).
5. **Tarjeta:** ícono 48 px (o monograma), nombre, organización + insignia de tipo, resumen, 2–4
   usos, chips de metadatos (alcance, requisitos), línea de la tienda ("Actualizada: 17 set 2026 ·
   4,4 ★ en Google Play (1.434)"), "En la tienda figura como «Banco de Previsión Social»", botones
   Google Play / App Store / Web de 44 px. Después de montar, el botón de la tienda del propio
   celular pasa a relleno (UA sólo en cliente: el HTML es el mismo para todos, caché de borde).
   Aviso si es no oficial (con enlace a la oficial), si hace más de 2 años que no se actualiza, o si
   la ficha ya no está en la tienda de Uruguay (se oculta ese botón).
6. **"Lo que la gente busca y no es una app":** OSE, Correo Uruguayo (canal real de cada uno).
7. **"Cómo reconocer la app oficial"** (apps falsas: desarrollador, enlace, nada de APK sueltos, SMS).
8. **"Cómo elegimos"**: criterios publicados, fecha de revisión, fecha del último relevamiento de las
   tiendas, sin afiliados.
9. **FAQ** con `FaqSection` expandida (emite el FAQPage; la página no lo repite).
10. `ShareButtons` al cierre.

SEO: `const title = 'Apps del Estado y apps útiles en Uruguay'` (40 + marca = 57); descripción
literal ≤ 155 que abre con el dato (no "Directorio de…", `seoDescriptionBudget`); canonical literal;
`defineOgImageComponent('Cambio', …)`; JSON-LD `BreadcrumbList` + `ItemList` (url = canonical#id).

## Job semanal `currency-useful-apps`

`sync_useful_apps.ts` → `dist/sync_useful_apps.js`, cron `34 1 * * 4` (jueves 01:34 UTC, minuto
libre). `classes/usefulapps/{catalog,stores,refresh,store,types}.ts` + modelo
`classes/models/UsefulAppsSnapshot.ts`; espejo `app/server/models/UsefulAppsSnapshot.ts`; ruta
`app/server/api/useful-apps/stores.get.ts` (compacta por app, `cache-control` público 30 min / 1 h,
`null` si no hay documento). UA honesta, `AbortSignal.timeout`, 1,5 s entre pedidos, reintentos
acotados. Guardas: sin `APP_MONGO_URI` sale en 1; si las primeras 10 apps no obtienen respuesta, las
tiendas están caídas y no escribe; si más de la mitad de los pedidos falla o las filas frescas caen
debajo de la mitad de las anteriores, no pisa. Primera corrida siempre escribe. Registro en
`ecosystem.config.js`, `OTHER_APPS` de `deploy-backend.sh`, AGENTS.md (tabla + lista de
entrypoints), `classes/AGENTS.md`, `docs/app/APPS_UTILES.md`.

## Pruebas

- App: registro (ids, categorías, hosts de tienda, https sin parámetros de seguimiento, formato de
  paquete y de id de App Store, fuente oficial, kit apunta a ids existentes y del Estado, fecha ISO,
  FAQ), búsqueda y filtros, estado ↔ URL, paridad con la raíz, y todos los contratos globales
  (siteNav, seoContract, títulos, descripciones, contenedor, temas, enlaces internos, chips en `<p>`,
  fechas es-UY + zona horaria, i18n).
- Raíz: parsers con recortes reales de las dos fichas (fixtures chicos), fusión y guardas del
  snapshot, registro pm2 (tripwire existente), `experiments.json`.
- Medición en el navegador: 390 px y 1280 px, claro y oscuro, antes y después de hidratar, pestañas
  por enlace y por clic, kit persistente al recargar.

## Fuera de alcance

Fichas por app (una URL por app), cuerpo en inglés/portugués, reseñas o puntajes propios, apps de
pago, descubrimiento automático de apps nuevas de organismos (queda como idea para el job).
