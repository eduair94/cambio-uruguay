# Monitor de competencia para casas de cambio — diseño

Fecha: 2026-09-29. Subproyecto 2 de 2 de la venta a empresas (el 1 es
`docs/superpowers/specs/2026-09-27-api-empresas-claves-design.md`, desplegado el 27/9).
Pedido del usuario: "implementar infraestructura para venta a empresas" y "Resume". Acceso decidido
por defecto (el usuario no eligió): 14 días de prueba y después sólo con plan Empresa.

## Qué se entiende del pedido

- **Dicho:** el monitor de competencia es lo que se le vende a una casa de cambio: enterarse cuando
  un competidor mueve su pizarra y dónde queda la suya.
- **Medido (27–29/9, medidor de la API):** ya hay clientes haciendo esto a mano — un
  `python-requests` pidió `/intraday` 2.628 veces en dos días y un panel pide la pizarra de una casa
  cada 5 minutos. El dato existe; lo que no existe es el aviso.
- **Supuesto:** el cliente es una casa (elige su casa y sus competidores) o alguien que sólo mira un
  grupo (elige competidores y ninguna casa propia). Una moneda o varias.
- **Éxito:**
  1. Desde `/cuenta?tab=api`, en dos minutos, una cuenta arma su monitor (casa propia,
     competidores, monedas, avisos, canales) y empieza la prueba de 14 días.
  2. Recibe por Telegram (y/o correo) avisos que son verdad: un competidor cambió su pizarra (y el
     cambio sobrevivió a la guarda de plausibilidad), su posición en el grupo cambió, o su pizarra
     está quieta mientras el grupo se mueve. Y un resumen al cierre del día.
  3. A los 14 días recibe un aviso de que terminó la prueba y el monitor se detiene, salvo que la
     cuenta tenga una clave con plan Empresa (lo asigna el dueño desde el panel del subproyecto 1).
  4. El dueño ve en su panel quién tiene monitor, en qué estado (prueba, Empresa, vencido) y cuándo
     se le avisó por última vez.

## Enfoque elegido

**Un job de pm2 del backend evalúa; el app guarda la configuración y la muestra.**

- La evaluación corre cada 5 minutos en `currency-competitor-monitor` (proceso aparte, instancia
  única). Lee el ledger de cambios (`cambio_changes`) y la foto del día **localmente** (base del
  backend), la configuración y los contactos de la base del app por el puente `classes/appdb.ts`,
  y escribe el estado del monitor en la base del app. Envía Telegram con el mismo bot del sitio
  (verificado: mismo token en los dos `.env`) y correo con `nodemailer` y las credenciales SMTP del
  sitio copiadas al `.env` de la raíz.
- El app guarda la configuración (una por cuenta) y la muestra; nunca evalúa ni envía.

Descartados:
- **Tarea de Nitro en el app**: el app es pm2 cluster ×2 y cada tarea corre dos veces; la tarea de
  alertas de cotización existente (`alerts:check`) manda cada alerta duplicada por eso. Se evita el
  problema en vez de copiarlo con un lease.
- **Salida del backend por una cola hacia el app para el correo**: suma una colección y una tarea
  más para no instalar una dependencia que el app ya usa.

## Piezas

### 1. Configuración (base del app, la escribe el app)

Colección `competitormonitors`, un documento por cuenta (`uid` único):
`{ uid, email, ownOrigin: string|null, competitors: string[] (1–12), currencies: ('USD'|'EUR'|'BRL'|'ARS')[] (1–4),
alerts: { moves, position, quiet, daily }: boolean, channels: { telegram: boolean, email: 'none'|'daily'|'all' },
active: boolean, trialStartedAt: Date, createdAt, updatedAt }`.

- `email` sale de la sesión (verificada) al guardar, nunca del cuerpo.
- **No se borra**: "pausar" pone `active: false`. Así borrar y volver a crear no reinicia la prueba
  (`trialStartedAt` se fija una vez).
- `ownOrigin` no puede estar entre los competidores; `bcu` no es una casa y no se acepta.
- `position` y `quiet` exigen `ownOrigin`.

### 2. Estado (base del app, lo escribe sólo el job)

Colección `competitormonitorstates`, un documento por `uid`: cursor del ledger, posición vista y
posición avisada por moneda y lado, día del último aviso de "quieta" por moneda, día del último
resumen, fecha del aviso de fin de prueba, última corrida y último envío. Separada de la
configuración para que el PUT del app y la escritura del job nunca se pisen.

### 3. Evaluación (`classes/monitor/`, pura salvo `run.ts`)

- **Foto del grupo** (`snapshot.ts`): de las filas de hoy, una por casa y moneda — tipo `''` y si no
  `BILLETE`; nunca `bcu`, `INTERBANCARIO`, `PROMED.FONDO`, `CABLE`, `EBROU` ni `TRANSFERENCIA` (no
  son precios de mostrador). Sólo casas del grupo (propia + competidores).
- **Posición** (`ranking.ts`): para la **compra** manda la más alta (le paga más a quien vende
  dólares), para la **venta** la más baja. Empates comparten puesto (1, 2, 2, 4). La posición
  propia sólo existe si la casa propia está en la foto de hoy.
- **Eventos** (`events.ts`):
  - **Movimiento de un competidor**: cambios del ledger posteriores al cursor, del grupo menos la
    casa propia, de las monedas elegidas, tipos `''`/`BILLETE`. Varios cambios de la misma casa y
    moneda en la ventana se colapsan en uno (primer "antes" → último "después"). **Se confirma
    contra la foto**: si el último valor no es el que publica hoy la foto, no se avisa — el ledger
    registra también cambios que la guarda de plausibilidad después rechazó.
  - **Cambio de posición propia**: se avisa cuando la posición nueva se vio en **dos corridas
    seguidas** y es distinta de la última avisada. La foto se arma mientras el sync de 5 minutos
    todavía escribe casas, así que una sola lectura puede ser un estado a medio actualizar.
  - **Pizarra propia quieta**: la casa propia no cambió esa moneda en 3 horas y al menos 2
    competidores sí; sólo de lunes a viernes de 10:00 a 19:00 de Montevideo, sólo si la casa propia
    está en la foto de hoy (si no está, es el scraper, no la casa), y una vez por día por moneda.
  - **Resumen del día**: a partir de las 18:30 de Montevideo, una vez por día: por moneda, la
    posición propia en compra y venta, la mejor compra y la mejor venta del grupo, y cuántas veces
    se movió cada competidor hoy.
- **Acceso** (`access.ts`): `trial` mientras no pasaron 14 días de `trialStartedAt`; `business` si
  la cuenta tiene una clave activa con plan `business` (colección `api_keys` del backend); si no,
  `expired`. Al pasar a `expired` se manda **un** aviso y el monitor deja de evaluarse. Un
  `business` sin prueba vigente sigue funcionando; si pierde el plan, el aviso de fin sale una vez.
- **Mensajes** (`format.ts`): texto plano (sin Markdown: los nombres de casa llevan `_` y el
  Markdown de Telegram falla en silencio). Nombres de casa legibles, cifras con coma decimal, y
  enlace a `/cuenta?tab=api`. Un mensaje por monitor y corrida que junta todos los eventos. El
  correo lleva el mismo texto y un HTML escapado.
- **Envío** (`deliver.ts`): Telegram por la API del bot al `telegramChatId` del usuario (colección
  `users` del app); correo por SMTP. Ninguno tira: devuelven `true/false`. Canal `email: 'daily'`
  recibe sólo el resumen y los avisos de acceso; `'all'` recibe todo.
- **Corrida** (`run.ts`): por cada monitor activo evalúa, envía y guarda el estado. El cursor avanza
  aunque un envío falle (un aviso de hace 20 minutos ya no sirve; el resumen del día lo cubre). Un
  monitor que falla no corta a los demás. El primer cursor es "ahora": nunca se vuelca historia.

### 4. App — ventanilla

- `GET /api/me/monitor`: configuración, estado de acceso (prueba con días restantes, Empresa,
  vencido), último envío, si tiene Telegram vinculado y si el correo está verificado, y la lista de
  casas elegibles (de `/localData` de la API, sin `bcu`).
- `PUT /api/me/monitor`: valida y guarda (exige cuenta con correo verificado, como las claves).
  Primera vez: fija `trialStartedAt`.
- `GET /api/admin/monitors` (`requireAdmin`): todos los monitores con estado de acceso, último envío
  y correo.
- Panel **"Monitor de competencia"** en la pestaña `api` de `/cuenta`, entre las claves y el panel de
  administración: casa propia (opcional), competidores (hasta 12), monedas, avisos, canales, estado de
  la prueba, y el enlace a vincular Telegram si falta (`AccountTelegramLink`, ya existe).
- El panel de administración suma la tabla de monitores.
- `/empresas`: la tarjeta "Monitoreo de competencia" pasa a decir que se prueba 14 días gratis desde
  la cuenta, con el botón.

## Errores y bordes

- Antes del primer sync del día la foto está vacía: no hay posición ni "quieta"; los movimientos se
  confirman igual contra la foto, así que tampoco hay movimientos. Correcto: no hay mercado todavía.
- Una casa del grupo que desaparece de las casas activas: se ignora sin romper el monitor.
- Telegram no vinculado y correo `'daily'`: el panel avisa que los avisos al momento no le llegan.
- Correo sin configurar en el backend: se registra y se sigue con Telegram.
- La base del app caída: el job sale con código 1 sin escribir nada; la próxima corrida retoma desde
  el cursor guardado.
- Privacidad: se guarda el correo verificado y la configuración; nada más del usuario.

## Pruebas

- Raíz (vitest): foto (tipos y exclusiones), posición (empates, compra/venta), eventos (colapso,
  confirmación contra la foto, dos corridas para posición, ventana y horario de "quieta", resumen una
  vez), acceso (prueba, Empresa, vencido, aviso único), mensajes (texto plano, sin `_` crudos
  rompiendo nada, coma decimal), envío (fetch falso), corrida con dobles (cursor, falla aislada,
  canal diario), paridad de esquema app↔backend de las dos colecciones, registro de pm2.
- App (vitest): validación compartida, rutas `me/monitor` y `admin/monitors` (dueño de la sesión,
  correo verificado, admin), panel (fuente), `/empresas`.
- Producción: un monitor real en la cuenta del dueño con un grupo chico, forzar una corrida y
  verificar el Telegram; verificar el panel y que el job quede registrado en pm2.

## Configuración en el VPS

- `.env` de la raíz: copiar `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`,
  `SMTP_FROM` desde `app/.env`. `TELEGRAM_BOT_TOKEN` y `APP_MONGO_URI` ya están.

## Fuera de alcance

Precios y cobro; avisos por umbral de precio (ya existen las alertas de cotización); monitores
múltiples por cuenta; push; arreglar la tarea `alerts:check` que manda doble (se reporta aparte).
