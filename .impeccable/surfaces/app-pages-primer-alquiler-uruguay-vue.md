---
version: 1
slug: "app-pages-primer-alquiler-uruguay-vue"
primary_target: "app/pages/primer-alquiler-uruguay.vue"
related_targets: ["app/utils/firstRental.ts","app/utils/firstRentalEs.ts"]
---

# Primer alquiler: gastos y trámites

Página: `/primer-alquiler-uruguay`. Modo: lectura con lista de entrega y presupuesto opcional.

Responde a la duda de quien ya encontró una casa, está por firmar con CGN, no tiene gastos
comunes y tiene luz/agua independientes. El hilo que motivó el trabajo no identifica departamento:
https://www.reddit.com/r/uruguay/comments/1w8kk2j/primer_alquiler/

La respuesta inicial enumera cuentas; después vienen documentos/lecturas/inventario al recibir
llaves, gastos recurrentes, alcance territorial, UTE/OSE, responsabilidades y dinero de entrada.
Hereda la identidad de Cambio Uruguay. La lista de entrega es la interacción principal;
los datos duran sólo mientras la página está montada, sin persistencia ni envío.

Fuentes primarias revisadas el 2026-09-06, enlazadas por bloque en `firstRental.ts`. No se fijan
tarifas de servicios: la ficha de saneamiento de IM muestra valores viejos bajo una fecha de
actualización reciente. Tampoco se publica un plazo numérico para corregir inventario: dos
fichas de CGN difieren en cómo lo describen. Se indica tramitar diferencias enseguida.

Presupuesto en UYU: alquiler + 3% del inquilino si selecciona CGN + gastos mensuales +
facturas bimestrales / 2. Otra garantía requiere ingresar su costo equivalente. Los vacíos
son desconocidos; cero significa que no aplica. La reserva de entrada suma un mes promedio
y extras únicos: no se presenta como liquidación de la firma ni como factura del primer mes.
Se explicita no duplicar saneamiento cuando está incluido en OSE o gastos comunes.

Contenido completo en español, inglés y portugués. Navegación/sitemap/buscador derivan de
`siteNav.ts`; enlaces entrantes desde la guía de alquiler y el hub de vivienda. JSON-LD de
Article/FAQ/Breadcrumb y OG mediante el componente compartido Cambio.
