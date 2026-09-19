# Precios de supermercado: filtros, orden y "cerca de mí"

Fecha: 2026-09-19. Páginas: `/precios-de-supermercado-uruguay` (hub) y
`/precio/<slug>` (ficha). Pedido: "agregar filtros, sort avanzado a las tablas y
lo que mejora la experiencia y valor".

## Problema

- El hub muestra 213 artículos en orden alfabético con un buscador que no
  encuentra "azucar" (sin tilde) y ninguna forma de ordenar ni de acotar por
  rubro. No se puede responder "¿qué marca de aceite sale menos por litro?" ni
  "¿en qué productos vale la pena buscar precio?".
- "Dónde la canasta sale más barata" son los 25 locales más baratos del país: en
  Maldonado o Salto la lista casi nunca tiene nada. El backend sólo guarda esos 25.
- La ficha lista 300+ locales ordenados por precio sin poder acotar por
  departamento, esconder datos viejos, ver sólo ofertas ni ordenar por cercanía,
  aunque cada fila trae coordenadas.

## Diseño

### Lógica pura (`app/utils/preciosTable.ts`, prefijo `precios` por el namespace plano)

- `preciosNormalize`: sin tildes, minúsculas. Búsqueda por palabras: todas tienen
  que aparecer en el nombre.
- `preciosCategory`: siete rubros por reglas ordenadas sobre el grupo del SIPC
  (almacén, bebidas, lácteos y huevos, carnes y fiambres, frutas y verduras,
  limpieza, higiene y cuidado personal). Test contra el fixture: ningún artículo
  cae en "otros".
- Métricas: precio por litro/kilo/unidad a mediana (`preciosPerUnit`) y **ahorro
  buscando** = (mediana − p10) / mediana. Se usa p10 y no el mínimo: el mínimo
  crudo puede ser la góndola congelada o sospechosa que la guarda no deja
  encabezar; p10 es "lo que paga el 10 % de locales más baratos".
- **Mejor precio por unidad del grupo**: entre variantes del mismo grupo (clave
  normalizada: "Arroz Blanco" = "Arroz blanco") con 30+ locales y la misma unidad
  de referencia, la de menor precio por unidad lleva un chip. Sólo si hay 2+.
- Orden: clave + dirección, nulos siempre al final en las dos direcciones,
  desempate por nombre. Estado de la tabla ↔ query string (`q`, `rubro`, `orden`,
  `dir`, `muestra`) con lista blanca: un valor inválido vuelve al default.
- Ficha: filtros de filas (departamento, texto de local/dirección, ocultar
  `stale`, sólo ofertas, radio en km) y orden (precio, fecha del dato, local,
  distancia). El resumen "más barato con estos filtros" usa sólo filas que pueden
  encabezar (`verdict === 'ok'` y no `stale`), la misma regla del backend.

### Backend

`refresh.ts` agrega `rankedStores` al documento diario de la canasta: todos los
locales calificados ordenados por ratio (id, nombre, departamento, cadena,
dirección, ratio, cobertura). `cheapestStores` (25) queda igual por compatibilidad.
El schema es `Mixed`, no hay migración. Hasta la próxima corrida (03:12 UTC) el
documento no lo trae y la página cae a `cheapestStores`.

### Ruta del app

`/api/precios` deja de reenviar la canasta entera: la proyecta con una función
pura (`server/utils/preciosHubProjection.ts`, con test) que recorta
`rankedStores` a los 15 más baratos de cada departamento y redondea ratios. Mantiene
el payload acotado (la lista completa son 356 filas).

### UI

- Hub / artículos: buscador, chips de rubro con conteo, interruptor "sólo 30+
  locales", selector "Ordenar por" + botón de dirección (en móvil el `thead` se
  oculta), encabezados clicables con `aria-sort`, columnas $/unidad y ahorro,
  contador "N de M" y "Limpiar filtros".
- Hub / locales: selector de departamento, orden por nivel/cobertura/local, 12
  filas + "ver más". Departamentos y cadenas: encabezados ordenables; cada
  departamento ofrece "ver locales", que filtra la tabla de locales.
- Ficha: barra de filtros, "Cerca de mí" (geolocalización del navegador, sólo en
  cliente, nunca se envía a ningún servidor) con chips de radio 2/5/10/25 km y
  columna de distancia; "otras marcas" muestra y ordena por precio por unidad.

## Fuera de alcance

Lista de compras con total (sumar mínimos de locales distintos no es un precio que
alguien pague), páginas por local, histórico por local.

## Verificación

Tests unitarios de la lógica pura y de la proyección (app), test del backend para
`rankedStores`, `npm run lint`, suite del app, y la página en un dev server propio
contra la API de producción.
