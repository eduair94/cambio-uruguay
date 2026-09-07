# Anunciantes y contactos comerciales de viviendas

Implementado el 2026-09-07. El usuario autorizó expresamente facilitar los contactos públicos de
los avisos y las inmobiliarias. Esta política sustituye **sólo para los campos explícitos siguientes**
la exclusión general previa de contactos; las descripciones siguen depuradas y las identidades
físicas, metadatos de sesión y objetos originales de los portales siguen siendo privados.

## Identidad y publicación

Cada oferta de alquiler y cada aviso de venta puede llevar:

- `agency`: versión 1, `key` compuesta por fuente y **ID nativo de la agencia**, nombre, perfil
  publicado por esa fuente, enlace a sus avisos si consta y `observedAt` propio.
- `publicContact`: versión 1, nombre comercial y canales explícitos `phone`, `whatsapp`, `email`,
  `website` o `profile`. Cada canal lleva su procedencia `sourceUrl` y fecha `observedAt`.
- `ownerDirect`: declaración expresa del anuncio o campo propio de la fuente, con procedencia y
  fecha. No equivale a verificar la titularidad registral.

No se crean agencias por similitud de nombre, teléfono o dominio. No se transfieren contactos
entre avisos agrupados. `particular` y «dueño directo declarado» son conceptos distintos: un
particular puede representar a otra persona. Una contradicción entre agencia, particular o
comisión impide marcar dueño directo. Una búsqueda de «busco dueño directo» tampoco es oferta.

`undefined` significa que ese campo no fue inspeccionado; `null`, que la inspección no lo sustenta
o lo retiró. La persistencia sólo conserva campos no inspeccionados del mismo aviso de la misma
fuente y con evidencia física compatible. Cambios explícitos de unidad, piso, dirección, zona,
tipo o especificaciones impiden heredar el contacto. El cambio de precio no prueba cambio de
vivienda. Un cambio de ID de agencia invalida su contacto anterior. La fecha original no se renueva
porque el inmueble se haya vuelto a leer o reagrupar.

Los límites públicos descartan URLs ejecutables, credenciales, destinos locales y parámetros de
sesión. Teléfonos uruguayos se normalizan a `+598…`; máscaras o números inválidos no se publican.
La proyección de ventas vuelve a aplicar la lista explícita de campos. Los contactos y declaraciones
expiran a los 21 días de su **propia** lectura en el backend; una descripción no recupera contactos
eliminados por el depurador.

## Fuentes comprobadas

### InfoCasas

La búsqueda pública ya publica `owner.id`, `owner.type`, `owner.particular`, `inmoLink` e
`inmoPropsLink`. Se exige tipo de agencia positivo, ID nativo y ruta cuyo ID coincida. Si la fuente
ofrece sólo su página de avisos se conserva ese enlace explícito; no se inventa un perfil.

La lectura del [perfil comercial de CASAGRANDE](https://www.infocasas.com.uy/inmobiliarias/perfil/268884-casagrande)
confirmó email impreso en `.subsidiary .info-inmob .emails span`. El lector comprueba el canonical
y `RealEstateAgent:<id>` para identidad y toma los canales únicamente del HTML comercial visible.
No toma contactos del JSON, de descripciones, formularios o pie de página.

El gesto público **Ver teléfono abre login**: se comprobó sin iniciar sesión, llamar ni enviar un
mensaje. `masked_phone`, `whatsapp_phone` y teléfonos/correos de objetos `subsidiaries` no son fuentes
de contacto permitido. Un teléfono puede existir en el dato interno y seguir estando excluido.

El lector comprueba `robots.txt` antes de consultar perfiles con `CambioUruguayBot`; la política
del 2026-09-07 permite esas rutas y excluye los filtros combinados `*-y-*` del buscador. Una nueva
prohibición impide esa lectura. Una respuesta fallida no afirma retirada ni renueva fechas.

### Casasweb

La ficha pública propia presenta el nombre del anunciante en `h2#nombreInmo` y un enlace WhatsApp
visible en su bloque inmediato. Se verificó en CW229366 sin cuenta ni gesto de contacto. La URL
de WhatsApp se convierte en un número; su mensaje prellenado no se copia ni se envía.

El lector exige el ID en el título de página, una única referencia `Ref: CW<ID>`, el título del
inmueble y el bloque comercial exacto. No lee contactos de las tarjetas recomendadas ni del pie
de página. Ese bloque da evidencia de inmobiliaria, pero no un ID nativo corroborado: se publica
el contacto **por aviso**, sin fabricar `agency.key`. Una tarjeta que sólo tiene un nombre conserva
tipo desconocido hasta contar con evidencia positiva. Ventas aprovecha sus fichas completas ya
leídas; alquileres consulta una pequeña muestra rotativa de fichas vigentes.

### Mercado Libre, El País y Facebook

Mercado Libre puede aportar declaración directa en el título propio; su filtro de vendedor
particular por sí solo no demuestra propiedad. El País conserva la declaración estructurada
`ownerDirect` y la contrasta con el texto propio; el nombre de empresa por sí solo ya no convierte
un anunciante desconocido en inmobiliaria. Sus contactos del JSON siguen excluidos. La ficha pública fue corroborada el 2026-09-07:
`a[data-funnel=contact-phone][data-listing-id]` publica el teléfono y el nombre comercial tiene
el mismo ID; se exige además canonical propio. Se copian únicamente esos controles visibles,
sin contactos de recomendaciones, formularios o JSON. Una muestra rotativa lee hasta cinco
fichas en modo rápido y veinte en completo, con un minuto y tres fallos como límites. No se amplía el permiso de El País de alquileres
a ventas. No se adquieren nuevos datos de perfiles/contactos de Facebook mediante sesión.

## Actualización y límites

La adquisición se ejecuta en los jobs existentes, después de leer los anuncios:

```sh
# Novedades de alquiler: hasta 12 perfiles únicos, 8 fichas Casasweb y 5 de El País (además de los portales habituales).
RENTALS_CONTACTS_ENABLED=1 bash scripts/run-rentals.sh --fast

# Lectura completa: hasta 80 perfiles únicos / 3 minutos , 30 fichas Casasweb / 1 minuto y 20 de El País / 1 minuto.
RENTALS_CONTACTS_ENABLED=1 bash scripts/run-rentals.sh

# Ventas: perfiles compartidos con alquileres y contactos dentro de las fichas CW ya leídas.
RENTALS_CONTACTS_ENABLED=1 bash scripts/run-property-opportunities.sh
```

No ejecutar esas escrituras contra producción sin completar la revisión y el despliegue del
candidato. `--analyze-only` recalcula oportunidades; no recaptura identidades/contactos ausentes
de las lecturas históricas. No se puede rellenar el ID de agencia de un legacy buscando su nombre.

La caché `propertyagencycontactreads` vive en APP DB mediante `classes/appdb.ts`. Su `_id` es la
identidad nativa: se comparte entre alquiler y venta. Prioriza perfiles sin leer y los más antiguos,
refresca cada siete días, no reintenta un fallo antes de seis horas y conserva retirada explícita
sin que una respuesta anterior concurrente la sobrescriba. `--dry-run` no escribe esta caché.
`RENTALS_CONTACTS_ENABLED=0` apaga nuevas lecturas. `RENTALS_CONTACTS_MAX_PROFILES` limita las
lecturas de ventas; el máximo absoluto es 120. No hay crawling de webs externas, navegador
automatizado nuevo, envío de consultas, llamadas ni mensajes.

La cobertura de contacto es parcial por diseño y no una promesa de disponibilidad del inmueble.
Las pruebas ejercitan fuentes sintéticas, normalización, límites públicos, misma identidad,
retirada/expiración, caché y equivalencia de contratos app/backend. El diagnóstico con páginas
reales guardado en `.sdd-public-advertiser-real-probe.json` registra sólo tipos y conteos, sin
contactos ni datos de acceso.
