# Experimentos A/B del sitio

Desde el 2026-11-28. Nacieron de la revisión de Clarity + GA4 de ese día: el rebote no era el
problema (32 % en Uruguay), lo era la recirculación (1,58 páginas por sesión; las páginas de respuesta
dan 1,25–1,35). Diseño: `docs/superpowers/specs/2026-11-28-engagement-ab-design.md`.

## Cómo se reparte

- **Registro:** `app/utils/abTests.ts` (`AB_TESTS`: id, propiedad de GA4, ventana, qué se compara).
- **Antes de pintar:** `PREPAINT_AB_SCRIPT` en `app/nuxt.config.ts` lee o crea un id aleatorio del
  navegador (`localStorage` `cu_ab`) y marca `<html data-ab-<id>="a|b">` para cada experimento dentro
  de su ventana (UTC). El brazo es FNV-1a de `<id>:<experimento>` con la mezcla final de Murmur3:
  independiente entre experimentos (sin la mezcla, el bit bajo de FNV es la paridad de los
  caracteres y los brazos de dos experimentos salían idénticos; el test lo atrapa).
- **Sin marca = control:** el servidor, los navegadores controlados por un programa
  (`navigator.webdriver`: los e2e y los bots que lo declaran), el almacenamiento bloqueado y los días
  fuera de la ventana.
- **El HTML del servidor es igual para todos** (el borde guarda una copia por URL). Lo que va en la
  primera pantalla se muestra u oculta por CSS con el atributo; lo que es sólo del navegador
  (`ClientOnly`) lee el brazo al montar (`useAbVariant`, o `abAssignments()` directo).
- **Medición:** `app/plugins/ab-tests.client.ts` manda `gtag('set', 'user_properties', …)` antes del
  `config` de GA4, así el primer `page_view` ya lleva el brazo; `services/clarityRuntime.ts` pone la
  misma etiqueta en Clarity (`ab_jubilaciones`, …) para filtrar grabaciones por brazo.
- **Lectura:** `npm run ab_report` (raíz, en el VPS: usa la cuenta de servicio de GA4). Por brazo:
  sesiones, % con interacción (con intervalo de 95 % de la diferencia), segundos y páginas por sesión
  y los eventos propios del experimento.

## Los experimentos

| id | GA4 | ventana | b (tratamiento) | se lee sobre | éxito |
|---|---|---|---|---|---|
| `jubilaciones` | `ab_jubilaciones` | 2026-11-28 → 2027-02-15 | calculadora «¿Cuánto vas a cobrar en 2027?» + «Avisame cuando salga la cifra» arriba de `/guias/aumento-de-jubilaciones-uruguay` | sesiones que entran por esa guía | más % con interacción y páginas por sesión sin perder lectura; `estimator_use`, `topic_subscribe` |
| `seguimiento` | `ab_seguimiento` | 2026-11-28 → 2027-01-31 | la invitación del final según el tema: alerta de avisos nuevos (directorios de alquileres y autos, ficha de alquiler) o el aviso del aumento de jubilaciones, en vez de «¿Seguís el dólar?» | todas las sesiones | más altas por sesión: `topic_subscribe` + alertas creadas (`cta_click` `*-alert-open`) contra `newsletter_signup` |
| `alquiler-tarjeta` | `ab_alquiler_tarjeta` | 2026-11-28 → 2027-01-15 | tarjeta del directorio de alquileres en el celular sin «Frente a los demás barrios» ni el pie (anunciante, «¿ya no está?», última lectura), portales de a dos | sesiones de celular que entran por `/alquileres-uruguay` | más % con interacción y páginas por sesión |

En la guía de jubilaciones, quien está en `b` de `jubilaciones` no recibe además el aviso abajo
(`seguimiento`): sería el mismo formulario dos veces.

**Cerrar un experimento:** cuando llega su `endsOn` el script deja de marcar y todo vuelve al control.
Si ganó `b`, se publica `b` para todos (se borra el CSS del brazo y la entrada del registro) en el
mismo commit; si no, se borra el código de `b`. Nunca se deja un experimento vencido en el registro.

## Pasos de consola (los hace el dueño)

### GA4: registrar las dimensiones (sin esto `ab_report` contesta error)

La cuenta de servicio del sitio es **Lectora** en la propiedad: la API de administración contestó 403
el 2026-11-28. Dos caminos:

- **A mano** (2 minutos): analytics.google.com → Administrar → Definiciones personalizadas → Crear
  dimensión personalizada, cuatro veces:
  - `Search query`, alcance **Evento**, parámetro `q` (el término del buscador; `USAGE_INSIGHTS.md` 5.6)
  - `AB jubilaciones`, alcance **Usuario**, propiedad `ab_jubilaciones`
  - `AB seguimiento`, alcance **Usuario**, propiedad `ab_seguimiento`
  - `AB alquiler tarjeta`, alcance **Usuario**, propiedad `ab_alquiler_tarjeta`
- **O** darle a la cuenta de servicio el rol **Editor** en la propiedad y correr el registro por la
  API de administración (`analyticsadmin.googleapis.com/v1beta/properties/<id>/customDimensions`).

GA4 junta cada dimensión desde el día en que se registra: no es retroactivo.

### AdSense: el anuncio automático arriba del título (experimento nativo)

La unidad *in-page* de Auto Ads que entra arriba del H1 en el celular mueve la página (CLS 0,17–0,29
en casi todas las sesiones de Clarity de la guía de jubilaciones, la 1.ª página de entrada) y se
controla sólo desde la consola. AdSense tiene experimentos nativos de Auto Ads (50 % del tráfico,
hasta 90 días): <https://support.google.com/adsense/answer/9726342>.

**No antes del 2026-12-03:** el bucle de AdSense (Codex) tiene una lectura fijada para el 2/12
(`nextReadNotBefore 2026-12-02`) y un experimento de Auto Ads le cambiaría la carga de anuncios a la
mitad del tráfico en el medio de su ventana.

1. AdSense → Optimización → Experimentos → tarjeta «Anuncios automáticos» → Crear experimento →
   cambio-uruguay.com.
2. En la vista previa de la variación: Áreas excluidas → excluir la franja entre las migas/el
   encabezado y el H1 (en el celular), «en páginas similares». Las áreas excluidas usan selectores
   CSS: elegirlas sobre una guía (`/guias/aumento-de-jubilaciones-uruguay`) y sobre una página suelta
   (`/denunciar-ruidos-molestos-uruguay`).
3. Iniciar. Anotarlo en el registro del bucle (`docs/seo/adsense-growth-loop.md`) con la fecha.
4. Leer en el mismo panel de Experimentos (ingreso, RPM, impresiones por vista) y, para la
   experiencia, el CLS por página de `/estadisticas-de-uso` o de Clarity.

Si la variación no pierde ingreso, aplicarla al sitio. Si pierde, el arreglo de CLS sin perder la
unidad es reservarle el alto arriba del H1 en el diseño (ya no sería una inserción sorpresa).
