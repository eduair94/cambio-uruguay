# Equipar: ficha técnica, filtros y asesor de tamaño para heladeras, lavarropas, televisores y aires

Fecha: 2026-11-04. Pedido del dueño: "Aplicar a los otros tipos de artículo lo que quedó pendiente"
(después de monopatines y bicicletas). Spec y plan auto-aprobados (orden permanente).

## Por qué estas cuatro

Son las compras más caras de `/equipar-casa-uruguay` y las que se eligen por especificación, no por
foto: litros, kilos, pulgadas, frigorías. Hoy el directorio filtra por precio, marca, vendedor y una
variante leída del título.

## Lo medido (4/11/2026)

- Avisos frescos: heladera 379 ML + 202 tiendas + 242 FB; lavarropas 372 + 117 + 150; tv 573 + 127 +
  147; aire 373 + 67 + 93. **Todos los de ML tienen id de producto** que el puente lee.
- La ficha de ML (puente `/product/<id>`) es muy completa y regular: heladera "Capacidad total",
  "Tipo de deshielo = No frost", "Con tecnología inverter", "Eficiencia energética Uruguay = A",
  "Ancho x Profundidad x Altura = 54.5 cm x 56 cm x 1.67 m", "Con dispensador de agua"; lavarropas
  "Capacidad del lavarropas = 12 kg", "Tipo de carga = Frontal", "Es lavasecarropas", "Capacidad de
  secado", "Velocidad de centrifugado = 1.400 rpm"; tv "Tamaño de la pantalla = 50 \"", "Tipo de
  resolución = 4K", "Tipo de pantalla = LED", "Es smart", "Sistema operativo = Google TV", "Con HDR";
  aire "Capacidad de refrigeración = 12.000 BTU", "Tipo de climatización = Frío/Calor", "Tipo de aire
  acondicionado = Inverter | On/Off | Portátil", "Lugares de colocación".
- Datos sucios reales: un portátil titulado "12000 Btu" cuya ficha dice 4.095 BTU; una tele "Full HD"
  con "Resolución máxima 3840 x 2160". La ficha manda sobre el título; un campo fuera de banda queda
  vacío.

## Qué se construye

1. `classes/equipar/specs/` — campos por categoría (`fields.ts`), parser puro de filas de ML y del
   título (`parse.ts`), enriquecimiento (`enrich.ts`, campo `ficha` de `equiparlistings`) y snapshot
   del asesor (`snapshot.ts`). Las filas crudas se guardan en `equiparspecs`: un parser mejor se
   aplica sin volver a leer.
2. Job `currency-equipar-specs` (`sync_equipar_specs.ts`, `41 * * * *`): 40 fichas de ML por corrida
   por el puente, a 3 s, misma cola con espera que monopatines (toda lectura se guarda). ~1.700 fichas:
   ~2 días de lectura inicial. Tiendas y Facebook: sólo el título (v1).
3. `sync_equipar.ts` aplica la misma función de enriquecimiento al reescribir cada hora.
4. App: franja de ficha en la tarjeta; filtros por ficha en `/equipar-casa-uruguay/productos/<cat>`
   (capacidad, carga, pulgadas, resolución, tipo y rasgos, cada opción contada); asesor "¿Qué tamaño
   necesitás?" en `/equipar-casa-uruguay/<cat>`: personas → litros y kilos, distancia → pulgadas,
   metros cuadrados → frigorías, con las reglas escritas y las tres opciones más baratas que cumplen.

## Reglas del asesor (supuestos del sitio, publicados en la página)

- Heladera: 130 L + 65 L por persona; ancho disponible opcional.
- Lavarropas: 5 kg + 1 kg por persona (tope 12 sin lavasecarropas).
- Televisor 4K: entre la distancia/5,5 y la distancia/4 en pulgadas (SMPTE, 30° de campo visual).
- Aire: 115 frigorías por m², +15 % con sol fuerte, +10 % en último piso; 1 frigoría = 3,968 BTU; se
  sugiere el tamaño comercial siguiente (9.000, 12.000, 18.000, 24.000 BTU).

## No objetivos

- Páginas por modelo de electrodoméstico (v2: el código de modelo de la ficha lo hace posible).
- Fichas de tienda y de Facebook.
- Otras categorías de equipar.
