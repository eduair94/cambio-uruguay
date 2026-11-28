# Engagement: tres experimentos A/B, el siguiente paso en las páginas sueltas y lo que queda en consolas

Fecha: 2026-11-28. Pedido del dueño: implementar las cinco mejoras de la revisión de Clarity + GA4 del
mismo día ("en caso de duda, como test azul/verde"). Datos y análisis: `docs/seo/data/analisis-2026-11-28/`
(privado). Orden permanente: spec y plan auto-aprobados.

## Por qué

El rebote no es el problema (32 % en Uruguay, bajando). La gente encuentra la respuesta y se va: 1,58
páginas por sesión (1,72 el mes anterior). Las páginas de respuesta (guías y páginas sueltas, ≈33 % de
las sesiones) dan 1,25–1,35 páginas por sesión y 0–6 % de clics internos por vista, contra 12–26 % de
los directorios. En el celular el primer enlace a otra página de una página suelta cae en la pantalla
12–27; el lector baja 2–7.

## Alcance

| # | Cambio | Forma | Por qué así |
|---|---|---|---|
| 1 | Calculadora "tu jubilación hoy → 2027" + aviso por correo cuando salga la cifra, en `/guias/aumento-de-jubilaciones-uruguay` | **A/B `jub`** | Es la 1.ª página de entrada y cambia su primera pantalla; no sabemos si empuja la respuesta o el anuncio hacia abajo más de lo que suma |
| 2 | Invitación del final según el tema (alerta de alquileres/autos, aviso de jubilaciones) en vez de "¿Seguís el dólar?" | **A/B `seg`** | La alerta pide cuenta (más fricción) y el newsletter pide sólo correo: no es obvio cuál convierte más |
| 3 | El bloque "Seguí leyendo" de arriba (`RelatedInline`) después de la primera respuesta en las páginas sueltas más visitadas | **A todos** | Ya corre en 19 herramientas e indicadores (5 % de clic cuando se ve). Un control perdería esos enlaces, porque el pie excluye los de arriba |
| 4 | Tarjeta compacta de alquileres en el celular (sin "Frente a los demás barrios" ni el pie de anunciante/fecha) | **A/B `alq`** | La brecha celular/escritorio está confundida con tráfico directo; la comparación de barrios es una función deliberada |
| 5a | Auto Ads arriba del H1 | **Experimento nativo de AdSense**, después del 2/12 | Sólo se controla en la consola; antes del 2/12 ensucia la lectura del bucle de AdSense (Codex, `nextReadNotBefore 2026-12-02`) |
| 5b | Dimensión `q` del buscador en GA4 | Consola (dueño) | La cuenta de servicio es Lectora: la API devolvió 403 |

**No-objetivos:** no tocar unidades de anuncio ni el loader; no cambiar el newsletter; no agregar un
proveedor de experimentos; nada de cifras de ingreso en el repo.

**Anti-objetivos:** CLS por la variante (cambiar la página después de pintar); HTML distinto por
visitante (el borde guarda una copia por URL); experimentos que se pisen (mismo visitante siempre en el
mismo brazo sin correlación entre experimentos); e2e o bots asignados al azar.

## Diseño

### Asignación (una sola para los tres)

- `utils/abTests.ts` (puro): registro `{ id, param, startsOn, endsOn }`, hash FNV-1a de
  `<idVisitante>:<idExperimento>` → brazo `a` (control) o `b` (tratamiento). Sal propia por experimento
  → brazos independientes entre experimentos.
- `PREPAINT_AB_SCRIPT` en `nuxt.config.ts` (literal, como `PREPAINT_CONSENT_SCRIPT`): antes de pintar lee
  o crea `cu_ab` en `localStorage` (id aleatorio) y marca `<html data-ab-<id>="a|b">` para cada
  experimento vigente. Con `navigator.webdriver` (e2e, bots que lo declaran) no marca nada = control.
  Un test corre ese string y exige la misma asignación que `utils/abTests.ts`.
- El HTML del servidor es igual para todos. Las variantes se muestran u ocultan por CSS con el atributo
  (`critical.css` / CSS del componente), así no hay salto ni desajuste de hidratación. Lo que es sólo
  del navegador (la invitación del final, que ya es `ClientOnly`) lee el brazo con `useAbVariant(id)`.
- Medición: un plugin de cliente manda `gtag('set','user_properties',{ ab_<param>: brazo })` y
  `clarity('set', 'ab_<param>', brazo)` al arrancar. Dimensiones de usuario en GA4 (las registra el
  dueño): `ab_jubilaciones`, `ab_seguimiento`, `ab_alquiler_tarjeta`. Lectura:
  `npm run ab_report` (raíz, GA4 Data API): por brazo, sesiones, % con interacción, segundos por
  sesión, páginas por sesión y los eventos propios, con intervalo de confianza de la proporción.
- Vigencia: `startsOn` = día del deploy; `endsOn` jub 2027-02-15 (cubre el pico de enero), seg
  2027-01-31, alq 2027-01-15. Fuera de la ventana el script no marca y todo vuelve al control.

### 1 · Jubilaciones (`jub`)

Componente `GuideJubilacionesEstimator` después del encabezado de la guía (antes de la primera
sección), oculto por CSS si `data-ab-jubilaciones` no es `b`. Se cuelga de la guía con un campo nuevo
opcional del catálogo (`widget: 'aumento-jubilaciones'`), import estático. Entrada: la pasividad
nominal de diciembre. Salida según `aumJubEstado()`: pendiente → dos escenarios rotulados "estimación"
(IMSN acumulado a la fecha de `AUMJUB_IMSN_REFERENCIA` y el aumento de 2026), provisorio/definitivo →
la cifra oficial. Advertencia fija: la mínima se ajusta aparte (enlace a su sección). Evento
`estimator_use` (una vez por vista). Debajo, el formulario "Avisame cuando salga la cifra".

**Aviso por tema** (nuevo, separado del newsletter: quien pide esto no pidió el dólar diario):
modelo `TopicSubscription { email, topic, language, status, confirmToken, unsubToken, notified[] }`,
índice único `(email, topic)`. `POST /api/topics/subscribe` (doble confirmación, honeypot, límite por
IP, temas en lista blanca), `GET /api/topics/confirm`, `GET /api/topics/unsubscribe`. Tarea Nitro
`topics:notify` cada hora: por tema, el estado actual (`aumJubEstado`) frente a los ya avisados; reclama
`topic:<tema>:<estado>` con una clave única (el cluster ×2 corre la tarea dos veces) y manda el correo a
los confirmados. Eventos `topic_subscribe_submit` / `topic_subscribe`. Política de privacidad: una
línea sobre este aviso.

### 2 · Invitación por tema (`seg`)

`ReaderFollowUp` (layout, `ClientOnly`): en el brazo `b`, si la página declaró un contexto de alerta
(`useFollowUpAlert()`: el directorio de alquileres y el de autos con sus filtros, la ficha de alquiler con
departamento y barrio) pinta "Te avisamos de avisos nuevos como estos" con `RentalAlertButton` +
`RentalAlertDialogHost`; si la ruta es de jubilaciones/BPS, el formulario de aviso; si no, lo de hoy. El
brazo `a` es exactamente lo de hoy. Métrica: altas (newsletter, alerta creada, aviso confirmado) por
sesión expuesta.

### 3 · Siguiente paso en páginas sueltas (a todos)

`<RelatedInline />` después de la primera respuesta en las páginas sueltas con más entradas (las ~20 de
la tabla del análisis), y sus rutas en `RELATED_INLINE_ROUTES` (el test de paridad lo exige). Sin
experimento: se mide con `recommendation_view`/`internal_navigation` `link_area=related_inline` por
página, que ya existen.

### 4 · Tarjeta compacta de alquileres (`alq`)

Sólo CSS en `pages/alquileres-uruguay.vue`, bajo 600 px y con `data-ab-alquiler-tarjeta="b"`: sin
`RentalsZoneBars` ni el pie (`rental-card__footnote`), y las ofertas en una fila que se desplaza. Todo
eso sigue en la ficha. Métrica: % de sesiones con interacción y páginas por sesión en el celular entre
las que entran al directorio.

### 5 · Consolas

- 5a: pasos exactos del experimento de Auto Ads (AdSense → Optimización → Experimentos → Auto ads →
  variación con el área superior excluida) en `docs/analytics/AB_TESTS.md`, para crear el 3/12 o
  después, y avisado en el registro del bucle de AdSense.
- 5b: registrar `q` (evento) y las tres dimensiones de usuario; o darle a la cuenta de servicio rol de
  Editor para que lo haga la API.

## Lo que queda al implementador

Copy final, estilos, el umbral exacto de "página suelta" (las de la tabla), qué página de alquileres
cuenta como "de jubilaciones/BPS" para `seg`.
