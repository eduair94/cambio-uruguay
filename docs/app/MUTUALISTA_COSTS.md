# Tarifarios de mutualistas

`app/utils/mutualistaCosts.ts` contiene cinco conceptos del archivo oficial del MSP,
con las 34 instituciones y todas sus columnas de afiliación. Conserva importes sin
IVA ni timbres, ceros, datos ausentes y referencias de celda. El máximo autorizado
es la columna F de la fuente; no se calcula a partir de los precios.

La edición vigente desde julio de 2026 fue publicada el 3 de septiembre de 2026:
[página oficial](https://www.gub.uy/ministerio-salud-publica/datos-y-estadisticas/datos/precios-tickets-ordenes-instituciones-asistencia-medica-colectiva-iamc-julio-2026)
y [archivo XLSX original](https://www.gub.uy/ministerio-salud-publica/sites/ministerio-salud-publica/files/2026-09/Precios%20Tasas%20Moderadoras%20-%20Julio%202026.xlsx).

## Reproducir

Requiere Python 3.10 o posterior y `openpyxl` (`python -m pip install openpyxl`).
Descargá el XLSX y elegí una ruta local para conservarlo. Desde la raíz del repo:

```powershell
python app/scripts/extract-mutualista-costs.py --source "C:/ruta/elegida/tasas-julio-2026.xlsx"
```

`--source` es obligatorio. Podés agregar `--report "C:/ruta/elegida/reporte.json"`
para guardar el informe de extracción; su directorio debe existir. El extractor
no usa red, no modifica el XLSX y resuelve el módulo de destino desde su propia
ubicación, independientemente del directorio de ejecución. Sólo reemplaza el
bloque generado. Después, desde `app/`:

```powershell
npx eslint utils/mutualistaCosts.ts --fix
npx vitest run tests/unit/mutualistaCosts.test.ts
```

El SHA-256 permitido del XLSX es
`1c189260422ff5a131bbb2e87d862b1c0226974378d2d402eea5337a868df821`.
Un archivo distinto falla antes de modificar el módulo. Las verificaciones de
fecha, etiquetas, grupos y cobertura siguen activas aunque coincida ese hash.

## Actualizar una edición

La actualización requiere revisar la nueva publicación y sus reglas antes de
cambiar el SHA permitido, las fechas, los encabezados, la cobertura y cualquier
otra guarda afectada del extractor. No basta con reemplazar el hash. Verificá
impuestos y timbres en la página oficial y actualizá también la metadata, las
pruebas y las referencias de esta documentación. No hay cron de importación.

Revisá los datos ausentes, las condiciones de cada columna y las contradicciones
del informe. En julio de 2026, `CAMEDUR!N25` publica $160 y `F25` un máximo de
$150,77739354179056. Ambas cifras se conservan y la página señala la diferencia.
Los números auxiliares de porcentaje no identifican un convenio, y los precios
cero no permiten inferir una exoneración total para una persona.
