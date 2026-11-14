# Contactos comerciales

Panel privado `/contactos-comerciales`, implementado el 2026-09-21. Selección inicial manual
de cinco empresas uruguayas (dos automotoras, tres inmobiliarias), con líneas generales de
recepción o sucursal publicadas en sus webs. No incluye vendedores particulares, teléfonos
personales de empleados, datos de sesión, ni canales obtenidos detrás de un login. No envía mensajes.

`app/server/data/commercialContacts.ts` conserva nombre comercial, rubro, teléfono, URL de
procedencia y fecha de consulta. La revisión manual debe establecer que es una línea comercial:
`phoneScope: 'business'` registra esa revisión; validar el formato de un teléfono no prueba identidad.
No se importan estos datos en páginas ni componentes. `GET /api/commercial-contacts` exige
`requireAdmin` antes de cargar el catálogo y responde `private, no-store`, incluso si falla el acceso.
La página consulta desde el navegador, elimina los datos al cambiar de sesión y queda fuera de
navegación/sitemap con noindex. Reutiliza `NUXT_ADMIN_EMAILS` y Firebase del panel privado existente.

La presencia en Mercado Libre lleva evidencia separada. RP Motors enlaza su catálogo desde su
propia web (`official_link`). Para las otras cuatro empresas se consultaron avisos indexados del
portal (`indexed_listing`); no se certificó su disponibilidad actual y algunos devuelven 403 al
abrirlos directamente. No se asigna Facebook Marketplace a una empresa por tener página de Facebook.
No hay entradas de Marketplace corroboradas en esta selección inicial.

Fuentes de los teléfonos consultadas el 2026-09-21:

- [RP Motors](https://www.rpautomoviles.com/), bloque Contacto y enlace propio a Mercado Libre.
- [Amaya Motors](https://amaya.com.uy/), sucursal Pocitos, Bartolito Mitre 2782.
- [ACSA](https://acsa.com.uy/contacto), Casa Central / Recepción.
- [Yovanina](https://www.inmobiliariayovanina.com/contacto/), Teléfonos de información; se excluyó el contacto personal de la directora.
- [Kosak](https://www.kosak.com.uy/contacto), sucursal Bvar. España 2989.

Se descartó MasAutos de esta primera selección porque su web no estuvo disponible y la apertura
directa del aviso que contenía el teléfono devolvió 403. No se sustituyó esa comprobación por
una fecha nueva sobre el mismo resultado antiguo.

`safeCommercialContacts` aplica HTTPS seguro, teléfono uruguayo y evidencia fechada no futura.
Los teléfonos se retiran después de 30 días sin revisión; la evidencia de plataforma caduca de
forma independiente. No hay renovación automática: revisar la fuente antes de cambiar una fecha.
Los filtros actúan sobre la selección, nunca afirman cobertura exhaustiva de vendedores.

Validación local: pruebas de normalización/caducidad/procedencia y de acceso a la API, cobertura
de navegación y contenedor de página. El componente también se probó en una vista previa aislada:
búsqueda, rubro, plataforma sin resultados, limpieza, portapapeles, móvil, tema oscuro, salida de
sesión, acceso denegado e inglés. El servidor Nuxt local no respondió; esa vista previa no sustituye
una comprobación integral con Firebase y el layout completo. No se desplegó este cambio.
Las 32 pruebas nuevas y el lint dirigido de todos los archivos nuevos de código y pruebas pasaron,
al igual que las comprobaciones de navegación y contenedor. Falta el build integral de Nuxt.
