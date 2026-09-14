# Fletes y servicios de mudanza

Directorio editorial en `/fletes-mudanzas-uruguay`, complementario al hub de alquileres. Investigación
de fuentes públicas del **14 de septiembre de 2026**. La primera versión consolidada contiene
**80 proveedores o servicios**, **381 tarifas**, **19 fichas con precios** y **94 URLs de fuentes**.
Las tarifas son variantes de trabajo: 132 son rutas de Transportes Sánchez y 128 son artículos de
DePunta. No son 381 empresas ni 381 cotizaciones de mudanzas completas.

## Superficies

- `app/utils/movingServicesData.json`: snapshot público autosuficiente, incluido sólo en la ruta.
- `app/utils/movingServices.ts`: contrato, filtros puros, pertenencia territorial, selección de
  tarifas por servicio y validación del formato de contactos.
- `app/utils/movingServicesCopy.ts`: interfaz y guía en español, inglés y portugués. Los datos
  comerciales se conservan en español y las fichas llevan `lang="es"`.
- `app/components/moving/ProviderRow.vue`: servicios, precios, condiciones, vehículos, contactos
  etiquetados por sucursal/canal y fuentes de cada dato.
- `app/pages/fletes-mudanzas-uruguay.vue`: búsqueda, filtros, fuentes, metodología y guía para pedir
  presupuestos comparables. OG y CollectionPage; no inventa Offer de un comercio del que no somos dueños.
- `docs/research/moving/README.md`: informe y directorio legible; archivos regionales conservan la
  investigación y sus límites. `*-discovery.json` son pistas de marketplaces, no tarifas publicables.

La ruta está registrada en `siteNav.ts` (menús, buscador y sitemaps), enlazada desde el buscador de
alquileres, la etapa «Mudarte y equipar» de `rentalJourney.ts` y recomendaciones explícitas de
`relatedPages.ts`. Se conserva el destino principal del catálogo de equipamiento en esa etapa.

## Reglas editoriales

1. Cada tarifa, vehículo y contacto tiene `sourceUrl` presente en `sources`. Cada fuente conserva
   fecha de consulta; `publishedAt` sólo se usa si la fuente fecha el precio. No renovar vigencia
   por volver a importar un archivo.
2. Cada precio lleva `category`: al filtrar armado se muestran importes de armado. Dante puede
   prestar armado pero su precio de guardamuebles no lo convierte en un armador con tarifa pública.
   `additional` identifica recargos: no encabezan el precio de un servicio base.
3. `amount` conserva moneda y unidad originales. Bloques de 30 minutos, paquetes de dos horas y
   tarifas por artículo no se transforman en precios horarios. El m² por mes se conserva en la
   etiqueta y las condiciones. No hay promedio ni ranking global por importe.
4. `prices: []` es presupuesto desconocido. Cero sólo está probado para los servicios municipales
   gratuitos. No usar importes simbólicos de tarjetas de Mercado Libre/Marketplace como tarifas.
5. Dimensiones, volumen y carga se almacenan por separado. «Camión grande» sin números no pasa el
   filtro de medidas/capacidad. No calcular volumen útil desde toneladas, fotos o modelo del camión.
6. `nationwide` significa anuncio explícito de cobertura nacional, no bases locales ni disponibilidad
   en todos los trayectos. La correspondencia localidad/departamento permite encontrar Costa de Oro
   bajo Canelones sin afirmar que el prestador atiende todo el departamento. Topónimos ambiguos no
   se resuelven automáticamente. `localOnly` exige base identificada.
7. Contactos: sólo publicaciones comerciales visibles o referencias públicas de tiendas, con URL.
   No mensajes, reservas, login, datos ocultos, reseñas personales ni extracción de contactos de
   avisos inmobiliarios. `contact.label` preserva sucursales y contradicciones del origen.
8. Deduplicar identidad y teléfonos normalizados. SOSE/Fletes Montevideo comparten ficha. El
   Sánchez del directorio de Colonia usa el mismo celular de Sánchez Montevideo: una sola ficha,
   sin presumir una segunda sede. Nombres parecidos solos no prueban identidad.
9. Armado de tienda, combos dentro de una mudanza y recambio de artefactos en un domicilio conservan
   su condición. No atribuir tarifas del comercio a sus armadores externos ni vender un recambio
   como traslado e instalación entre dos viviendas. El plan mensual de CleanFach se excluyó de
   tarifas por no representar limpieza de mudanza.
10. Directorios secundarios e información histórica se identifican en las fichas. Estar listado no
    acredita calidad, habilitación, póliza, disponibilidad ni que el servicio haya sido contratado.

## Actualizar

Es un relevamiento manual fechado, sin cron ni scraping en las peticiones del usuario. No necesita
MongoDB, credenciales, nuevo job backend ni un puente al DB de alquileres. El navegador filtra el
snapshot local y sólo sale al proveedor cuando la persona abre su enlace.

1. Abrir las fuentes, contrastar cambios y corregir la evidencia en `docs/research/moving/*.json`.
2. Completar la categoría de cada tarifa y revisar unidades, límites, impuestos, contactos y
   duplicados. Un recargo nuevo nunca debe convertirse en precio base.
3. Ejecutar `node app/scripts/build-moving-directory.mjs` desde la raíz. Sólo esta importación
   editorial lee `docs/`; el build de Nuxt sigue siendo autosuficiente dentro de `app/`.
4. Revisar el diff del snapshot y ejecutar las pruebas indicadas abajo. Si se revisa todo el
   directorio, actualizar de forma consciente `MOVING_REVIEWED` y las fechas de fuentes. Una
   consulta parcial requiere conservar la antigüedad individual del resto; no desplazar todas las
   fechas con una sustitución masiva.

El aviso de antigüedad se activa a los 90 días del relevamiento. No confirma vigencia de precios
antes de ese plazo ni elimina el recordatorio de confirmar la cotización. La fecha se comparte entre
SSR e hidratación para evitar diferencias al cambiar el día.

## Verificación

Desde `app/`:

```sh
npx vitest run tests/unit/movingServices.test.ts tests/unit/siteNav-coverage.test.ts tests/unit/pageContainer.test.ts tests/unit/rentalJourney.test.ts tests/unit/relatedPages.test.ts
npx playwright test tests/e2e/moving-directory.spec.ts
npx eslint utils/movingServices.ts utils/movingServicesCopy.ts components/moving/ProviderRow.vue pages/fletes-mudanzas-uruguay.vue tests/unit/movingServices.test.ts tests/e2e/moving-directory.spec.ts scripts/build-moving-directory.mjs
```

Desde raíz: `node app/scripts/build-moving-directory.mjs --check` comprueba que la proyección
publicable coincide con la evidencia editorial. Los E2E cubren búsqueda por artículo, tarifas del
servicio elegido, condiciones visibles, filtros reversibles, localidades, contactos por sucursal,
idiomas y teléfono en ambos temas con consentimiento de primera visita sin predismiss.

Validación del 2026-09-14: 288 pruebas unitarias y cinco casos E2E aprobados, además de ESLint,
comprobación del snapshot y `git diff --check`. El caso de departamento se repitió individualmente
tras corregir su selector para operar el `VSelect` con teclado. Se revisaron capturas de escritorio,
móvil y tablas de tarifas en claro y oscuro. No se ejecutó un build ni se desplegó esta entrega.
