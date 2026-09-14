---
version: 1
slug: "app-pages-fletes-mudanzas-uruguay-vue"
primary_target: "app/pages/fletes-mudanzas-uruguay.vue"
related_targets: ["app/components/moving/ProviderRow.vue", "app/components/moving/ProviderReviews.vue", "app/utils/movingServices.ts", "app/utils/movingServicesCopy.ts", "app/utils/movingServicesData.json"]
---

# Servicios de mudanza

Modo Operate, con guía de lectura: quien ya encontró vivienda busca quién transporte muebles y
ayude a instalarse. Extensión del recorrido de alquileres en el sistema visual existente. Hereda
tipografía, temas y controles Vuetify; no redefine la marca.

Filtros por servicio, departamento, base local, tarifa publicada, medidas de vehículo y búsqueda
libre. Filas de proveedor con evidencia desplegable; búsqueda interna para tarifas extensas. La
tarifa destacada responde al servicio y artículo buscados, con unidad, mínimos, impuestos, fecha y
fuente visibles. Los filtros y el orden viven en la URL, con historial y botón para copiar la
búsqueda. El orden por importe mantiene grupos de servicio, moneda y unidad; destaca la misma
tarifa que decide la posición, sin presentar el resultado como costo total de una mudanza.

Fuentes revisadas 2026-09-14. Tarifas de camión, peones, paquetes, artículos, armado, depósito e
instalaciones conservan sus unidades; no se suman ni se promedian. Marcas duplicadas por contacto
se consolidan. Un listado comercial secundario conserva su advertencia. Desconocido no es cero.

Primera visita clara, ambos temas y 390px: encabezado breve, controles con selección completa,
precios que pasan a filas legibles en móvil. Datos comerciales en español; interfaz en tres idiomas.
Las tarifas salen del relevamiento local. El panel de reseñas consulta Google sólo al abrirse,
con puntuación, cantidad de opiniones, sucursal, hora y atribución; descarta los datos al cerrarse.
Facebook, 1122 y HomeSolution conservan enlaces a perfiles cuya identidad se revisó. Las reseñas no
certifican calidad ni se agregan entre sucursales. No se envía un presupuesto automáticamente.
