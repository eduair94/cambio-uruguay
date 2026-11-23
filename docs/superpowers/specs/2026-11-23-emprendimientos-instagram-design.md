# Emprendimientos de Instagram — diseño (2026-11-23)

## Por qué

Pedido del dueño: «hay muchos negocios en Uruguay que pasan desapercibidos porque sólo funcionan a
través de Instagram… descubrir nuevos negocios o poder navegar a través de ellos. Hay cosas geniales
como las cartas 3D que nadie sabría que existen». El hilo de r/uruguay «Nos compartimos
emprendimientos interesantes?» (21/5/2026) lo dice con las mismas palabras: «hay una cantidad de
gente en la vuelta (ig) ofreciendo cosas copadas y probablemente de unas cuantas ni me entere porque
el algoritmo no me ve como parte del nicho».

Instagram no tiene un buscador por rubro y ciudad para un visitante sin sesión, y su algoritmo
muestra lo que ya seguís. El directorio es lo contrario: rubro, departamento, «uno al azar», lo
recién llegado y lo chico.

## Objetivos

- Una página navegable (`/emprendimientos-de-instagram-uruguay`) con los emprendimientos uruguayos
  que venden por Instagram: por rubro, por departamento, con búsqueda de texto, «uno al azar»,
  «Cosas que no sabías que existían» (lo raro, como las tarjetas pop-up) y «Joyitas» (cuentas
  chicas y activas).
- Una página por rubro (`/emprendimientos-de-instagram-uruguay/<rubro>`), indexable con muestra.
- Una ficha por cuenta (`/emprendimientos-de-instagram-uruguay/cuenta/<handle>`): las 12 fotos
  más recientes, señales fechadas, de dónde la conocimos y parecidos. `noindex, follow`: la ficha
  del propio Instagram siempre gana la búsqueda por nombre, y 9.647 fichas de alquiler con ~40
  impresiones ya enseñaron lo que pasa con miles de páginas finas.
- Que el directorio crezca solo (descubrimiento) y que cualquiera pueda sumar una cuenta.

## No objetivos / anti-objetivos

- **Nunca un veredicto de confianza** («confiable», «estafa»): las mismas reglas que
  `/tiendas-online-uruguay`. Señales con su fecha y un consejo general antes de pagar.
- No es un directorio de marcas grandes ni de cadenas (no necesitan que las descubran), ni de
  cuentas personales, influencers, medios o memes.
- No sale ningún dato que la cuenta no publique en su perfil público. No se guardan teléfonos ni
  correos: la ficha manda a Instagram.
- No entran rubros de riesgo: préstamos, inversiones/cripto/trading, apuestas, réplicas, venta de
  seguidores, medicamentos, armas, contenido adulto, «oportunidad de negocio» (multinivel).
- Fallar sería: un directorio lleno de cuentas argentinas, personales o muertas; o fotos rotas.

## Restricciones medidas (23/11/2026)

- **Instagram sin sesión**: el perfil (`/<handle>/`) en un Chrome headless trae, en el JSON
  embebido, el nodo del usuario (`username`, `full_name`, `biography`, `bio_links`,
  `follower_count`, `following_count`, `is_private`, `profile_pic_url`) y la grilla con los 12
  posts más recientes: código, dueño (`/<dueño>/p/<código>/` — las colaboraciones traen OTRO
  dueño), foto 640 px y el `alt` («Photo by X on November 21, 2026. Puede ser una imagen de…»),
  o sea la fecha de cada post. Una sola lectura alcanza. Desde el VPS: 13 de 14 cuentas en 2–3 s
  cada una con 4 s entre una y otra; una inexistente da `<title>Instagram</title>` sin nodo. Un
  `GET` HTTP común no trae nada (se dibuja con JS). Hashtags y búsqueda redirigen a login: no hay
  descubrimiento desde Instagram, salvo la grilla.
- **Las fotos vienen firmadas y vencen en ~4 días** (`oe=` hexadecimal). El CDN contesta con
  `cross-origin-resource-policy: cross-origin` y acepta un `Referer` ajeno: se enlazan tal cual,
  como las portadas de Instagram de alquileres, y el job relee cada cuenta antes de que venzan. Una
  foto vencida no se sirve (`photoUrlExpired`).
- `robots.txt` de instagram.com dice `Disallow: /`. Se leen páginas públicas porque lo pidió el
  dueño del sitio, igual que la fuente de Instagram de alquileres, con interruptor
  (`EMPRENDIMIENTOS_ENABLED=0`).
- uruguayemprendedor.uy no manda el intermedio TLS (Node: `UNABLE_TO_VERIFY_LEAF_SIGNATURE`): va
  embebido, como el de bcu.gub.uy.
- El SERP interno (`:5112`) devolvió 503 en todas las pruebas de hoy: no se usa.

## Fuentes de cuentas (descubrimiento)

1. **Uruguay Emprendedor** (`uruguayemprendedor.uy/emprendimientos/?pag=N`, 56 páginas de 9, ~500
   fichas con rubro, departamento y enlaces a Instagram). Sin `robots.txt` (404). El listado se
   recorre una vez por semana y se leen 25 fichas por corrida. Es evidencia de Uruguay por sí misma.
2. **Reddit** por la API oficial (r/uruguay, r/montevideo, r/Uruguay_nomas, r/UruguayMarketplace y
   r/MadeInUruguay): la búsqueda por texto de Arctic Shift dio «Timeout» en toda ventana ancha.
   Enlaces `instagram.com/<handle>` y `@handle` en hilos de emprendimientos; diario.
3. **Bola de nieve**: los dueños de las colaboraciones de la grilla y las `@menciones` de la bio de
   cada cuenta aceptada o de las semillas curadoras (`@red_de_emprendedores.uy`, `@lacomarca.uy`,
   `@clubemprendedoresuy`…). Gratis: sale de lecturas que ya se hacen.
4. **«Sumá un emprendimiento»**: el formulario de la página escribe la sugerencia; el job la lee
   primero en la corrida siguiente.
5. **Semillas curadas** (`classes/emprendimientos/seeds.ts`): las del hilo de Reddit y las que
   encontró la investigación, cada una con su fuente.

Ninguna fuente publica por sí misma: todo candidato se lee en Instagram y se clasifica.

## Verificación y clasificación

Por cuenta leída:

- **Reglas** (sin IA): existe, no es privada, tiene ≥ 3 posts en la grilla, el último post tiene
  ≤ 730 días (si no, `inactiva`; dos años y no uno porque Mondo Pop-up, el ejemplo del pedido, no
  publica desde enero de 2025 y sigue vendiendo), < 150.000 seguidores (si no, `marca-grande`).
- **Evidencia de Uruguay** (`uruguay.ts`): marcas en nombre, bio, handle o enlaces —«Uruguay»,
  🇺🇾, departamentos, ciudades, barrios de Montevideo, `+598` / `09x xxx xxx`, `.com.uy`, handle que
  termina en `.uy`/`_uy`— o una fuente uruguaya fuerte (Uruguay Emprendedor). Marcas argentinas
  (CABA, «Buenos Aires», `+54`, 🇦🇷) sin ninguna uruguaya rechazan.
- **IA** (`classes/llm.ts`: créditos de Claude primero, Gemini de respaldo), de a 8 cuentas por
  llamada, con esquema JSON: `tipo` (emprendimiento / marca-grande / personal / medio-o-comunidad /
  tienda-colectiva / otro), `uruguaya` (sí / no / dudoso), `rubro` (taxonomía fija), `etiquetas`
  (≤ 6), `resumen` (una oración, sólo con lo que dice el perfil), `ofrece` (productos / servicios /
  ambos), `envios` (todo-el-pais / local / no-dice), `departamento`, `barrio`, `raro` (¿un producto
  poco común?), `riesgo` (rubro excluido). Lo que no valida contra la taxonomía se descarta.
- **Entra** si: reglas OK, tipo `emprendimiento`, sin riesgo, y Uruguay por regla O (IA «sí» y la
  fuente es uruguaya). Un `medio-o-comunidad` o `tienda-colectiva` uruguayo no entra a la grilla:
  queda como semilla para la bola de nieve.
- Una cuenta se reclasifica sólo si cambió su bio o su nombre, o a los 60 días.

## Estado y frecuencia

- `currency-emprendimientos` (`sync_emprendimientos.ts`), `28 0,2,4,10,12,14,16,18,20,22 * * *`:
  10 corridas por día, sin las 06 y 08 UTC, cuando la corrida completa de alquileres lee
  Instagram desde la misma IP. Cada corrida: descubrimiento si toca, después hasta 45 lecturas de
  perfil (≈ 6 min) priorizadas — sugerencias, después cuentas publicadas cuyas fotos vencen en menos
  de 36 h, después candidatas nuevas por fuerza de la fuente — y la clasificación de lo nuevo.
- Si las 5 primeras lecturas no traen ningún perfil, Instagram está cerrado: la corrida corta sin
  cambiar ningún estado (la ausencia nunca es un veredicto) y sale con 1.
- Una cuenta publicada que no se lee no se despublica: su foto vence y la tarjeta muestra las
  iniciales. Se despublica por una lectura que diga «no existe» o «privada» (dos seguidas), por
  inactividad, o por una baja.

## Base del app (APP_MONGO_URI)

- `emprendimientocandidates` (privada): un documento por handle — estado, motivo, fuentes, lecturas,
  último perfil leído, clasificación, intentos.
- `emprendimientolistings` (pública): sólo las publicadas, **armadas campo por campo**
  (`publicListing()`), con su fecha de lectura. Es lo que lee la API.
- `emprendimientometas`: un documento (conteos por rubro y departamento, fuentes, última corrida).
- `emprendimientosuggestions` y `emprendimientooptouts`: las escribe el app. Una baja se respeta en
  la API al instante y el job borra la ficha en la corrida siguiente.

## App

- `GET /api/emprendimientos` (filtros `rubro`, `depto`, `q`, `orden`, `solo-instagram`, `pagina`):
  página de 24 tarjetas + facetas. `GET /api/emprendimientos/cuenta/<handle>`.
  `GET /api/emprendimientos/destacados`: «al azar», «raros», «joyitas», «recién llegados».
  `POST /api/emprendimientos/sugerir` y `POST /api/emprendimientos/baja`, con límite por IP.
- El orden por defecto es «descubrir»: un barajado con semilla del día (el mismo para todos ese día:
  la caché de borde y el SSR coinciden), con las cuentas activas primero. También «más nuevos en el
  directorio», «publicaron hace poco» y «más chicos primero».
- Fotos de Instagram: enlazadas, filtradas por vencimiento al servir, nunca como `og:image`.

## Enfoques considerados

1. **Directorio vivo con descubrimiento + clasificación por IA** (elegido). Escala solo y mide lo
   que publica; el costo es un job con Chrome y la cola de lecturas.
2. **Lista curada a mano** (como el registro de `/tiendas-online-uruguay`): precisa, pero no
   descubre nada nuevo, que es justo el pedido.
3. **Sólo sugerencias de visitantes**: arranca vacío, y un directorio vacío no recibe sugerencias.

## Lo que queda para quien construye

Textos de la página, diseño de las tarjetas, umbrales finos (los de arriba son el punto de
partida), y la fila del libro de cambios.
