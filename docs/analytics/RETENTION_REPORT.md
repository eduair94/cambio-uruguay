# Informe privado de retención

`npm run retention_report` lee GA4 y exporta un JSON privado en `docs/seo/data/` (gitignored).
Usa las mismas credenciales que `ga4_probe`: `GA4_PROPERTY_ID` y la cuenta de servicio del
backend. No consulta Mongo, no ejecuta jobs ni cambia la configuración de Analytics.

```sh
npm run retention_report
npm run retention_report -- --end-date=2026-10-21 --min-sessions=30
```

Compara dos ventanas consecutivas de 28 días. Primero lee la zona horaria de la propiedad;
por defecto cierra anteayer en esa zona para dejar un día adicional de procesamiento. Una
fecha explícita debe existir y ser anterior a hoy en esa misma zona. GA4 puede revisar días
ya cerrados: esto no es una afirmación de datos finales como en Search Console.

Cada ventana contiene totales y dispositivos globales, totales y dispositivos de Uruguay,
entradas uruguayas por página y dispositivo, canales uruguayos por dispositivo y eventos
uruguayos. Los totales se consultan por separado: sumar sesiones o usuarios de páginas no
reproduce los totales del sitio. Las tasas se calculan desde los conteos de cada fila, nunca
como promedio de porcentajes. El tiempo es interacción con la página activa, no duración
total de una visita.

Se pagina hasta `rowCount` con orden estable, conservando toda la cola y la metadata de GA4.
Si falta una página, se repite una fila, cambia la metadata o se supera el presupuesto de
100.000 filas por tabla, el comando falla sin publicar un informe parcial. El JSON conserva
las señales de calidad que GA4 incluya en metadata, como umbrales o pérdida por cardinalidad.
No pide ingresos ni imprime consultas, rutas de visitantes o credenciales en la consola.

Para decidir qué mejorar:

1. Comparar Uruguay con Uruguay y móvil con móvil. Un cambio de países o dispositivos puede
   mover el rebote global sin que empeore la experiencia de los lectores.
2. Revisar entradas con muestra suficiente, rebote y tiempo juntos. Una respuesta breve
   correcta puede acabar la sesión; una guía leída durante minutos con pocas páginas por
   sesión puede necesitar un próximo paso útil, no más texto.
3. Mantener visibles las filas pequeñas y `(not set)`, sin tratarlas como prueba de que una
   página falla. El umbral de 30 sesiones es un filtro de revisión, no significación estadística.
4. Comparar eventos de exposición y clic con el mismo alcance. `related_click` por sí solo
   no mide CTR: falta saber cuántas personas llegaron a ver las recomendaciones.
5. Volver a ejecutar con las mismas fechas para contrastar y conservar el JSON de cada lectura.
   Las ventanas de antes/después describen correlación; no atribuyen causalidad a un deploy.

Referencias oficiales: [dimensiones y métricas](https://developers.google.com/analytics/devguides/reporting/data/v1/api-schema)
y [paginación de reportes](https://developers.google.com/analytics/devguides/reporting/data/v1/basics).
