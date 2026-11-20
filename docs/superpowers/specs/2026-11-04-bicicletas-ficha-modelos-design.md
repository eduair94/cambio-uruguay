# /bicicletas-electricas-uruguay: lo mismo que ya tiene monopatines

Fecha: 2026-11-04. Pedido del dueño: "Aplica mejoras análogas de la página de monopatines para bicis
eléctricas y otros tipos de artículos". Spec y plan auto-aprobados (orden permanente).

Sigue a `2026-11-03-monopatines-ficha-tecnica-design.md` (PR #232/#233) y
`2026-11-04-monopatines-modelos-design.md` (rama `feat/monopatines-modelos`). Las dos dejaron dicho
"Bicicletas: mismo código, no activado". Esto lo activa, y en el camino deja la maquinaria armada por
**perfil de categoría**, que es lo que necesita cualquier tipo de artículo que venga después.

## Lo medido (4/11/2026, producción)

- 478 avisos frescos de bicicleta eléctrica: 330 de Mercado Libre (308 con id de producto que el
  puente lee), 30 de tiendas, 118 de Facebook. **17 con marca.** Cero fichas leídas, cero modelos.
- La ficha de ML por el puente (`/product/<id>`) trae para bicis: Marca, Modelo, **Rodado** ("20x4.0",
  "27,5"), Potencia, Velocidad máxima, Voltaje y Capacidad de la batería, Peso, Peso máximo soportado,
  Es plegable, **Con batería removible**, **Con acelerador independiente**, Tamaño del cuadro, Altura
  mínima/máxima recomendada. La descripción agrega "Shimano 7 velocidades", "5 niveles de asistencia",
  "Autonomía: 35-70 km".
- **El directorio de bicis tiene accesorios**: 30 de 478 avisos son luces, portabicicletas, cadenas,
  frenos, pantallas, empuñaduras, mochilas y camisetas que pasan `include` porque el título nombra la
  bici a la que van ("Luz Trasera … Para Bicicleta", "Portabicicletas Para Ebike", "Cadena Kmc … Ebike").
  Ordenado por precio, encabezan. Es la misma trampa que tuvo monopatines el 22/9, con otra forma: en
  bicis el accesorio casi nunca ABRE el título con una pieza de la lista de autos; dice "para
  bicicleta", "compatible con" o es un sustantivo inglés de importación.
- Además 4 publicaciones de Facebook son OTRA cosa para cambiar por una bici ("cambio por bici
  eléctrica", "permuto por bici electrica").

## Qué se construye

### A. Directorio limpio (registry)
- `BICICLETA_EXCLUDE` suma tres reglas medidas sobre los 478: (1) "para / compatible con / apto para"
  seguido de la palabra bici (o "cadena"); (2) un accesorio que abre el título (luz, cadena, cesto,
  portabicicletas, camiseta, remolque, medidor, indicador, conmutador, set, "1 par", marca + pieza); (3)
  sustantivos de accesorio que nunca describen una bici (headlight, holder, bracket, hitch, apparel,
  camiseta, portabicicletas, empuñadura, chip/deslimitador). Más (4) "cambio/permuto por bici". Medido:
  33 accesorios fuera, **cero bicis reales**.
- Variante nueva `infantil` (primera, por palabra: infantil, para niños, de equilibrio/balanceo): una
  bici de equilibrio de $ 15.000 no describe el precio de una urbana.

### B. Ficha técnica por perfil (backend)
- `classes/movilidad/specs/profiles.ts`: el perfil de cada categoría — bandas de cordura (rodado
  12–29″ en bici, 5–14″ en monopatín; peso 8–60 kg; autonomía hasta 200 km), qué reglas extra lee.
- Campos nuevos (sólo bici): `gears` (cambios), `removableBattery`, `throttle` (acelerador),
  `centralMotor`. Rodado desde "R20", "Rod. 28", "26x1.95", "27,5″". Monopatín: salida idéntica.
- `brands.ts` por categoría: marcas de bici del mercado (S-Pro, Gyroor, Loop, Wheele, Trinx, Swft,
  Snake, Eleglide, Hiper Engine, Ado, Tern, Amalfyt, Nexus, …) y genéricos propios.
- `currency-movilidad-specs` lee las dos categorías con el mismo presupuesto (nunca leídos primero),
  re-enriquece las dos, y escribe un snapshot por categoría (`bicicleta-electrica`).

### C. Modelos por perfil
- `identify.ts` con perfil: en bici el rodado que precede al modelo no es el modelo ("Gyroor 20 Eb025"
  → EB025), "Eb-041" y "EB041" son el mismo código, y las palabras genéricas de bici no nombran nada.
- `movilidadmodels` suma `category`. Un slug ya usado por la otra categoría no se pisa. Las APIs, el
  sitemap y el hub de monopatines filtran por categoría (un documento sin `category` es monopatín).

### D. Página
- El hub pasa a `pages/bicicletas-electricas-uruguay/index.vue` (misma URL) y suma, como monopatines:
  asesor "¿Cuál te conviene?", tabla de modelos con comparar y bandeja, "Qué esperar de cada tipo",
  ficha en la tarjeta del directorio, filtros y órdenes por ficha.
- `/bicicletas-electricas-uruguay/<modelo>` (indexable con 2 vendedores y 3 datos de ficha) y
  `/bicicletas-electricas-uruguay/comparar` (noindex, fuera del sitemap).
- Asesor de bici: trayecto, peso, presupuesto, subidas, dónde la guarda (plegable o liviana), si quiere
  acelerador. Reglas escritas: autonomía real = 60 % de la declarada (50 % sobre 90 kg) — los
  fabricantes la miden con la asistencia más baja —; soportar el peso + 10 kg; subidas: 350 W o motor
  central con algunas, 500 W con muchas; "liviana" = 22 kg o menos; tope de 25 km/h del decreto.

## No objetivos
- Facebook sigue sin ficha y sin modelo.
- Equipar (heladeras, lavarropas, televisores…): queda listo el perfil, no se activa. Tiene 25.000
  avisos frescos (12.000 en categorías de modelo); a 60 fichas por hora del puente son semanas, y el
  puente lo comparten diez jobs. Es otra decisión de presupuesto, no de código.
- No se tocan las páginas de monopatín que otra sesión está terminando.

## Anti-objetivos
- Unir dos bicis distintas (EB021 con EB025, Slim con X350).
- Publicar un rodado leído de un "20 km" o una cadena "8s" como cambios.
- Borrar una bici real con la regla de accesorios.
