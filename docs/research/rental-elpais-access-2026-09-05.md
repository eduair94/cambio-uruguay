# Inmuebles El País: acceso e integración, 5 de septiembre de 2026

El País queda como **consulta externa**. La actualización automática está deshabilitada por
las condiciones publicadas por el portal; no se representa como una caída temporal ni como
un catálogo de cero propiedades. No se importó ninguna de las muestras de esta investigación.

## Vía oficial y condiciones

- Los [términos](https://inmuebles.elpais.com.uy/terms), actualizados el 17 de julio de 2026,
  prohíben la extracción automatizada en el apartado 3. El apartado 5 limita la licencia del
  servicio a uso personal y no comercial, y conserva los derechos del publicador original
  sobre los datos de terceros. Se detuvo la investigación de listados al encontrar esta
  restricción; no se inició el barrido amplio ni se generó un snapshot para publicar.
- El [robots.txt](https://inmuebles.elpais.com.uy/robots.txt) permite rutas públicas y excluye
  `/api/`, cuentas y administración. Eso no concede una licencia de reutilización. No se
  consultaron endpoints de `/api/` ni se sortearon desafíos de acceso.
- La [política de privacidad](https://inmuebles.elpais.com.uy/privacy), actualizada el 19 de
  agosto de 2026, documenta integraciones de las agencias con sus propios canales de Meta y
  WhatsApp. No documenta una API de catálogo o un feed de sindicación para terceros.
- Se revisaron también la [portada del portal](https://inmuebles.elpais.com.uy/),
  [InfoRealEstate.ai](https://www.inforealestate.ai/) y [AppsUY](https://appsuy.com/), además
  de búsquedas restringidas a esos dominios. No se encontró documentación pública de un
  canal habilitado para importar su catálogo. Esto no prueba que no exista una integración
  comercial privada.
- El contacto oficial publicado es **hello@appsuy.com**, en el apartado 11 de los
  [términos](https://inmuebles.elpais.com.uy/terms). No se contactó a nadie. Cualquier futura
  integración requiere un canal y condiciones que permitan ese uso; no hay un ajuste
  ambiental para reactivar el scraper actual.

## Evidencia de acceso y muestras previas a la restricción

Comprobaciones acotadas realizadas aproximadamente a las 06:30–06:32 UTC, con la misma
identidad propia `CambioUruguayBot/1.0` local y en el VPS:

| Recurso público | Local | VPS |
| --- | --- | --- |
| `robots.txt` | 200 | 200 |
| `sitemap.xml` y `sitemaps/categories.xml` | 200 | 403, desafío de Cloudflare |
| Alquiler de apartamentos en Montevideo | 200 | 403, desafío de Cloudflare |

Antes de leer la prohibición se habían guardado tres páginas locales para diagnóstico.
Los archivos completos permanecen ignorados; no son un feed ni datos publicados por la app.
La auditoría posterior se realizó exclusivamente sobre esos archivos, sin más consultas.

| Categoría | Filas de la muestra | Aceptadas antes | Aceptadas por el parser corregido |
| --- | ---: | ---: | ---: |
| [Apartamentos en Montevideo](https://inmuebles.elpais.com.uy/alquiler/apartamentos/montevideo) | 24 | 23 | 23 |
| [Casas en Canelones](https://inmuebles.elpais.com.uy/alquiler/casas/canelones) | 24 | 24 | 24 |
| [Apartamentos en Maldonado](https://inmuebles.elpais.com.uy/alquiler/apartamentos/maldonado) | 24 | 11 | 8 |
| Total offline | 72 | 58 | 55 |

Son 72 identificadores distintos, todos clasificados por el portal como alquiler y todos
con `snapshotDate: 2026-08-31`. Esta fecha de importación no demuestra publicación original
ni disponibilidad actual; `publishedAt` sigue siendo desconocido. Los 55 aceptados son el
resultado de una prueba offline, **no cobertura incorporada al índice**.

## Correcciones verificadas

- El parser descarta tres falsos alquileres mensuales: una segunda quincena de enero
  (`6a41db4c3b79e8db94dc3ac7`), un mes turístico fechado en febrero de 2023
  (`6a41f4373b79e8db94dcb41d`) y un contrato invernal
  (`6a42b0f33b79e8db94e28523`). Las pruebas usan sólo las frases mínimas relevantes.
- Las pruebas conservan opciones anuales, una fecha de inicio desde febrero y menciones
  de comedor diario o jardín de invierno. Una clasificación `rental` no basta para
  identificar un contrato mensual permanente.
- Una fila retirada o pausada no se acepta aunque siga diciendo `active`. No se usan
  fechas de importación como fecha de publicación, ni amenities inferidas por IA como
  características confirmadas. Los datos ausentes permanecen desconocidos.
- Se toleran imágenes mal formadas y se extrae el nombre público de la agencia cuando
  `sourceAgency` es un objeto, sin convertirlo en el texto `[object Object]`.
- `harvestElpais` devuelve `access: external_only`, `ok: false`, `complete: false` y ninguna
  fila en ambos modos. Las pruebas demuestran cero llamadas de red y que esta respuesta
  no autoriza caducar avisos ausentes.
- La página muestra «Consulta externa», conserva el enlace al portal y excluye este
  estado de las alertas de fallos transitorios y del encabezado de fuentes activas. La
  regresión de cobertura comprueba ese estado junto con un fallo temporal de otra fuente.

Validación local: 23 pruebas de parser/fuentes y 12 del contrato de consultas de la app
aprobadas; lint dirigido sin errores. La regresión de navegador queda preparada para
verificar el nuevo frontend tras su despliegue. No se ejecutó una sincronización ni una
escritura de base de datos durante esta investigación.
