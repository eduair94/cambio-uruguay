---
version: 1
slug: "app-pages-alquileres-key-vue"
primary_target: "app/pages/alquileres/[key].vue"
related_targets: []
---

# Ficha de alquiler: decisiones de experiencia

## Alcance y modo

Modo Operate. Quien llega ya eligió un aviso en el directorio o en un buscador y decide, casi
siempre desde el celular, si vale la pena contactar. La ficha habla la gramática de los portales
que la persona ya conoce (Mercado Libre, InfoCasas) dentro del sistema visual de Cambio Uruguay:
papel/navy, Open Sans, acciones azules, procedencia visible.

## Primer viewport

1. Kicker con tipo y zona, título del aviso, dirección con ícono y la **tira de datos clave**
   (dormitorios, baños, m², garaje) con íconos, en ese orden.
2. Galería de portada con recorte `cover`, contador «n / total», flechas y tira de miniaturas.
   Una foto vertical se muestra entera sobre fondo oscuro; se decide con la foto cargada.
3. Tarjeta de precio fija a la derecha (estática en móvil, después de la galería): alquiler,
   gastos comunes, total mensual, la acción de contacto, quién publica con sus canales y guardar.
4. En móvil, barra inferior persistente con precio, total y «Ver aviso».

## Orden de lectura

Características (propiedad + condiciones del aviso elegido + comodidades) → Descripción →
Ubicación (mapa que se monta solo al acercarse, servicios cercanos) → Precio en la zona →
Avisos de esta propiedad → Presupuesto → Preguntas para la visita → Origen de los datos →
Propiedades para comparar → Guías. Una fila de chips fija bajo la barra enlaza las secciones.

## Veracidad

- Precio, gastos, total, mascotas, amueblado, garaje y garantías pertenecen a UN aviso, el
  seleccionado; los datos de la propiedad vienen de los portales. Cada bloque lo dice en una
  línea muda, no en un párrafo.
- Un «No informado» se muestra sin peso tipográfico: es ausencia de dato, no un dato.
- Una superficie del detalle sólo se lista cuando difiere de la superficie principal.
- El contacto conserva fuente y fecha también en la tarjeta compacta.
- Última lectura visible en cada aviso; título original, referencia y fecha de publicación
  quedan en un desplegable.

## Anti-objetivos

No inventar datos ni eliminar advertencias: se demotan a notas al pie. No cargar el mapa antes
de que la sección se acerque al viewport. No anillo de selección cuando hay un solo aviso.
