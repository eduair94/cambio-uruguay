# Informes de prensa con datos propios (F5.1 del plan de tráfico del 22/9/2026)

Un informe por mes, hecho con los datos que **sólo este sitio tiene**, ofrecido a periodistas
uruguayos para que lo citen con enlace. El objetivo es que medios con autoridad enlacen a la
página que publica el dato (no a la portada), y que el nombre del sitio aparezca al lado de una
cifra concreta. Todo lo que hay acá es público y versionado: **cero cifras de tráfico o de
ingresos del sitio, cero datos personales de periodistas**. La lista de contactos, los borradores
con cifras y el seguimiento viven en `docs/seo/data/press-YYYY-MM/` (gitignored).

## Qué se publica: los datasets que nadie más tiene

| Dataset | Página que lo publica | API pública | Qué puede afirmar | Qué NO puede afirmar | Cadencia |
|---|---|---|---|---|---|
| **Cortes de luz por barrio** (`currency-power-outages`) | `/barrios-alquileres-uruguay` (capa "Cortes de luz"), filtro «Datos del barrio» de `/alquileres-uruguay`, panel de cada ficha | `GET /api/rentals/zone-scores` (`luz`, `periods.power`), `GET /api/rentals/zone-profile?zone=<id>&department=<dep>`, `GET /api/rentals/service-filters` | Minutos sin luz **imprevistos** por cliente cada 30 días y cortes nuevos por mes cada 1.000 clientes, por barrio INE de Montevideo (62) y por localidad del interior (81), con fecha, días medidos y cobertura | Que UTE "incumple": la meta de URSEA (Tca) cuenta otra cosa. Que un barrio "es el peor del año": la serie arrancó el 19/9/2026 y hasta los 14 días la capa es **provisoria**, etiquetada `provisorio · N días medidos` | Cada 10 min; el informe cierra con el mes |
| **Alquiler por m² y servicios por barrio** (`currency-property-zones`) | `/analisis-alquileres-uruguay`, `/barrios-alquileres-uruguay` | `GET /api/rentals/analysis?department=<dep>`, `GET /api/rentals/zone-impact`, `GET /api/rentals/zones` | Mediana de alquiler y de $/m² por barrio con n ≥ 15 avisos; asociación (ρ de Spearman con IC) entre servicios del barrio y alquiler por m² | Causalidad ("los reclamos bajan el alquiler"); "precio de mercado" (son precios **pedidos** en avisos, no contratos) | Diario |
| **Informe del mercado de autos usados** (`currency-autos`) | `/mercado-de-autos-usados-uruguay` | `GET /api/car-report` | Composición de la **oferta** (avisos), mediana por modelo y año, depreciación por modelo, margen de negociación observado, automotora vs particular, riesgo declarado por el vendedor | Ventas (en Uruguay las transferencias no se publican por modelo); rotación hasta tener 14 días de serie y 150 retirados; nada por vendedor | Diario |
| **Precios de supermercado** (`currency-precios`) | `/precios-de-supermercado-uruguay` | `GET https://api.cambio-uruguay.com/precios/articles` y `/precios/basket` | Canasta fija propia (33 artículos) comparada por **canasta emparejada**; locales calificados (≥ 70 % de cobertura) y departamentos con ≥ 5 locales | Ranking por total (baja por faltarle artículos); "el más barato del país" sin decir "sobre los artículos que declara"; nada con `(*)` imputado del SIPC | Diario |
| **Evolución de precios** (`currency-market-series`) | `/evolucion-precio-alquileres-uruguay`, `/evolucion-precio-viviendas-uruguay`, `/evolucion-precio-autos-usados-uruguay` | `GET /api/market-series?v=alquiler|venta|autos` | Nivel (p25/mediana/p75 de lo pedido) y **misma oferta** (cada aviso contra su propio precio de hace 7/30/90 días), por cohorte con n ≥ 8 y pares ≥ 8 | Variación mensual hasta que la serie tenga 30 días (arrancó el 18/9/2026); cualquier conversión de moneda | Diario |

Regla de oro al elegir el dato del mes: **un titular = una cifra + una fecha + un enlace a la
página que la publica**. Si la página lleva etiqueta (`provisorio`, `parcial`, `sin datos`), la
etiqueta va en el informe con las mismas palabras.

## Calendario mensual

| Día del mes | Qué |
|---|---|
| 1–2 | Cerrar el mes anterior: bajar las APIs de arriba con `curl` (UA de navegador), guardar los JSON en `docs/seo/data/press-YYYY-MM/` con la fecha en el nombre. Elegir **un** dataset protagonista y dos de apoyo |
| 3 | Escribir el borrador con `informe-template.md` (400–600 palabras, cinco cifras citables, dos gráficos, «Cómo se midió», límites). Releer la lista de "qué nunca se afirma" |
| 4 | Publicar el informe como página del sitio (o como sección fechada de la página que ya publica el dato) y **declararlo en `docs/seo/experiments.json` en el mismo commit** con la ruta que recibiría el clic; un envío sin página nueva no se declara (no hay ruta que medir) |
| 4–5 | Enviar los pitches, uno por medio, en la mañana (08:30–10:30). Registrar cada envío en `docs/seo/data/press-YYYY-MM/tracker.csv` (`medio, sección, canal, fecha, dataset, respuesta, publicó, url, enlazó`) |
| 11–12 | Un solo seguimiento a quien no contestó. Sin insistir después |
| 25–28 | Anotar qué publicó quién y si enlazó; decidir el dataset del mes siguiente en función de lo que pidieron |

La primera edición (setiembre de 2026) sale con la capa de luz **provisoria**: se dice en el
título y en cada cifra, y se ofrece la actualización a los 14 días como segunda nota.

## Cómo se pitchea

- Un medio por correo, sin copia oculta ni envío masivo. Al canal **genérico** de la redacción
  (formulario o casilla institucional); nunca a una casilla personal que no nos dieron.
- La cifra va en el asunto. El cuerpo cabe en una pantalla de teléfono: seis líneas.
- Se ofrece lo que un periodista necesita para no depender de nosotros: el CSV completo, el
  gráfico de la página, y quién contesta preguntas de método el mismo día.
- No se pide "nota"; se ofrece dato. Si lo usan sin enlazar, se agradece igual y se pide el
  enlace en un segundo correo, una sola vez.
- Ninguna exclusiva: el mismo informe va a todos el mismo día. Si un medio pide tiempo para
  trabajarlo, se le da el dato crudo, no la primicia.

### Plantilla (español)

**Asunto:** `Datos: [cifra] [qué] en [dónde], [mes] — medición propia por barrio`

Ejemplo: `Datos: 6 horas por mes sin luz en Paso de la Arena, setiembre — primera medición por barrio`

**Cuerpo (seis líneas):**

```
Hola, soy [nombre] de cambio-uruguay.com. Medimos [qué] desde [fecha] con [fuente pública], cada [frecuencia], y publicamos por [barrio/localidad/modelo].
Cifra del mes: [cifra 1, con fecha]. También: [cifra 2] y [cifra 3].
Es [provisorio/definitivo]: [una línea con el límite principal, en las palabras de la página].
Todo está público, con método y fechas, en [URL de la página]. Puedo mandar el CSV completo y el gráfico hoy mismo.
Lo que NO dice el dato: [una línea: no es causalidad / no es ventas / no es seguridad].
Si sirve, contesto preguntas de método por acá o por [canal]. Gracias, [nombre].
```

## Reglas de embed y de cita

- Cualquier cifra o gráfico se puede reproducir citando **"Fuente: cambio-uruguay.com"** con
  enlace a la **página que publica el dato** (no a la portada) y la **fecha** de la medición.
- Si la página lleva etiqueta (`provisorio · N días medidos`, `parcial`, `≈`), la etiqueta viaja
  con la cifra. Quitarla es publicar otra cosa.
- Los gráficos del sitio son HTML (no imágenes): se embeben con una captura y el enlace, o el
  medio rehace el gráfico desde el CSV. En ambos casos, la nota de método de la página va al pie.
- Licencia de datos y gráficos propios: **decisión pendiente del mantenedor** (propuesta: CC BY
  4.0, que es lo que la regla de arriba ya exige en la práctica). Hasta que se fije, "citar con
  enlace" es la condición y se dice así en el pie del informe.
- Nunca se reparte un dato que la página no publica (contactos, direcciones exactas, vendedores,
  ingresos del sitio).

## Regla de independencia

- El sitio no recibe dinero ni favores de UTE, OSE, la Intendencia, inmobiliarias, portales,
  automotoras, cadenas de supermercados ni de ningún medio por estos informes. Si eso cambia, se
  dice en el informe.
- Ninguna cifra se ajusta a pedido de una parte. Un pedido de corrección se atiende igual que un
  error propio: se verifica contra la fuente, se corrige en la página con **fe de erratas fechada**
  y se avisa a quien ya publicó.
- El informe no se adelanta a ninguna de las partes medidas ni a ningún medio.
- El dato crudo que se le da a un periodista es el mismo que se le da a cualquiera que lo pida.
- El método está publicado antes que la cifra: si no cabe en la página, no se publica la cifra.

## Qué nunca se afirma

- **Causalidad.** "Los barrios con más reclamos tienen alquileres más bajos" es una asociación
  (ρ de Spearman con intervalo); "los reclamos bajan el alquiler" no lo es.
- **Puntajes de seguridad.** No hay "barrio seguro" ni "peligroso": las denuncias son hechos
  registrados por el Ministerio del Interior cada 1.000 clientes de UTE, un denominador de
  suministros, no de habitantes. No mide riesgo personal.
- **Datos por persona.** Ni vendedores, ni inmobiliarias nombradas en el informe, ni contactos,
  ni direcciones exactas de viviendas, ni cuentas de Mercado Libre o Facebook.
- **Ventas.** Los autos son oferta (avisos); los alquileres y ventas de vivienda son precios
  pedidos. "Se vende a" no existe en ningún dataset.
- **"El más barato" a secas.** En supermercados es "sobre los artículos que ese local declara",
  con canasta emparejada; en autos, dentro de su cohorte (modelo + año + versión + motor + caja).
- **Extrapolar una capa provisoria.** Tres días medidos dan un ritmo mensual, no un mes: se dice
  "a este ritmo" y se publica también lo efectivamente observado.
- **Incumplimiento regulatorio.** La meta de URSEA (Tca, 3,6 h por semestre en urbano denso)
  cuenta todas las interrupciones ≥ 3 min salvo fuerza mayor en 42 agrupamientos; nuestra cifra
  es sólo imprevistos por barrio. Se puede poner al lado como referencia; no como veredicto.
- **Cifras del sitio.** Ni visitas, ni ingresos, ni "cuánta gente lo usa". Ni en el informe, ni en
  el pitch, ni en este repositorio.
- **"El X % de los alquileres"** cuando es "el X % de los avisos".

## Checklist antes de enviar

- [ ] Las cifras salen de los JSON guardados en `docs/seo/data/press-YYYY-MM/` con fecha en el nombre, no de memoria.
- [ ] Cada cifra lleva fecha, unidad, n (o días medidos y cobertura) y la etiqueta de la página si la hay.
- [ ] El título dice el mes (setiembre, nunca septiembre) y `provisorio` si aplica.
- [ ] Hay una sección «Cómo se midió» y una de límites, con las mismas palabras que la página.
- [ ] Ningún dato personal, ningún vendedor, ninguna dirección exacta, ninguna cifra del sitio.
- [ ] La lista de "qué nunca se afirma" se releyó contra el texto final.
- [ ] Enlace a la página que publica el dato (no a la portada) y a `/contacto`.
- [ ] Canal de cada medio verificado ese mes (formulario responde 200 o casilla institucional).
- [ ] Fila en `docs/seo/experiments.json` si hay página nueva, en el mismo commit.
- [ ] `tracker.csv` actualizado al enviar.

Archivos: `informe-template.md` (esqueleto del informe). Privado, por edición:
`docs/seo/data/press-YYYY-MM/` con `informe-*.md`, `periodistas.md`, `tracker.csv` y los JSON
bajados.
