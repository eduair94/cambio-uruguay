# ¿Dónde vivir? — el asesor para alquilar o comprar por barrio

`/donde-vivir-uruguay` (2026-09-25). La persona contesta qué quiere hacer (alquilar, comprar o
comparar), departamento, tipo, dormitorios, ingreso nominal del hogar, su tope de alquiler, su ahorro,
cómo compraría y hasta tres prioridades; recibe hasta 8 **barrios** donde lo que necesita entra en su
plata, con alquiler, venta, entrada, cuota, "¿alquilar o comprar acá?" y cómo es el barrio. Las
respuestas viven en la URL; cada combinación es `noindex, follow`.

No reemplaza a `/alquiler-ideal-uruguay` (ordena AVISOS de alquiler por presupuesto y trayectos) ni a
`/comprar-o-alquilar-uruguay` (calculadora con números del lector): recomienda barrios con datos del
mercado y manda a esas dos.

## Sin job nuevo

`GET /api/housing/advisor` (`app/server/utils/housingAdvisor.ts`) junta tres agregados que ya se
calculan a diario, con caché de 10 minutos por departamento × tipo × dormitorios (y lo último bueno
si la base falla):

| dato | de dónde | job |
|---|---|---|
| alquiler, gastos comunes, $/m² por barrio | `loadRentalZones` (`propertyzonesnapshots`, últimos 10 días, n ≥ 8) | `currency-property-zones` |
| venta por barrio (p25/mediana/p75, US$/m²) | `marketseries` `venta\|USD\|<tipo>\|<dorm>\|b:<depto>:<barrio>`, claves del índice `index:venta` | `currency-market-series` |
| denuncias, luz, agua, reclamos, servicios | `loadRentalZoneScores` (`betterThan` de cada zona oficial) | `currency-property-zones` |
| dólar | `propertysalecatalogmetas` `uy-sales` | `currency-property-opportunities` |

La unión es por nombre de barrio plegado (sin tildes ni mayúsculas) dentro del departamento; el
contexto se busca por la zona oficial que ya trae la zona de alquiler o, si no, con
`rentalZoneScoreId`, el mismo resolvedor del directorio: los 62 barrios INE valen **sólo en
Montevideo** y afuera se busca la localidad o el alias de ESE departamento. La primera versión
probaba el nombre pelado contra el mapa INE y un "Centro" de Maldonado heredaba las denuncias del
Centro de Montevideo.

Las series de venta se leen sólo si su último punto es del día del índice (`currentSaleCohorts`):
una cohorte que bajó de 8 avisos no se borra, queda con su último punto, y sin la guarda se
publicaba como precio de hoy.

## Las cifras (`app/utils/housingAdvisorFigures.ts`)

- **Alquiler que alcanza**: el de la garantía, 40 % del ingreso nominal (Contaduría y ANDA); Mapfre
  30 %. Si la persona pone su tope, manda el suyo y se compara contra alquiler + gastos comunes.
- **Comprar**: el menor de dos techos, lo que cubre el ahorro (parte no financiada + gastos de compra)
  y lo que permite la cuota tope sobre el **líquido**, no el nominal: el BHU dice "ingreso
  disponible". El líquido sale de `computePayroll` (`utils/payroll.ts`) como si el ingreso del hogar
  fuera un solo sueldo sin hijos a cargo; con dos sueldos el real es algo mayor, así que el error
  queda del lado de pedir menos. Con $ 120.000 nominales la diferencia era de un cuarto del techo.
  Dos perfiles reales, no un promedio: BHU (UI, 4,50 %, 25 años,
  90 %, cuota 25 %) y Santander público general (UI, 4,75 %, 20 años, 80 %, cuota 35 %), publicados
  al 16/9/2026. La cuota usa la TEA pasada a mensual `(1+TEA)^(1/12) − 1` (la calculadora de comprar
  o alquilar la divide por 12, que sobrestima la cuota).
- **Gastos de compra**: ITP 2 % (sobre el valor de Catastro; acá sobre el precio), escrituración 3 %
  a 5 % (referencia de mercado), comisión 3,66 %. El techo usa el extremo alto (10,66 %).
- **No se incluye y se dice**: contribución inmobiliaria, Primaria, seguros del crédito, mantenimiento
  y el precio de los seguros de alquiler.

## El orden (`app/utils/housingAdvisor.ts`)

Precio y metros del modo elegido, denuncias, servicios, luz y agua, reclamos y (si compra)
rentabilidad bruta; las prioridades pesan 3, lo demás 1, lo que falta 0,5. El contexto es el
percentil del barrio entre TODOS los medidos, no entre los candidatos. Un barrio que entra sólo por
su cuarto más barato va después de los que entran por la mediana. En "comparar" un barrio entra si
UNO de los dos modos entra: el que no alcanza va a "Lo que resignás" y la caja de alquilar contra
comprar sólo aparece donde los dos están a tiro. Los cortes de luz llevan "provisorio · N días
medidos" mientras la capa lo sea. Sin resultados, la página distingue "no hay 8 avisos" de "no
entra en tu plata". Los montos con centésimos del recibo ("85.432,18") se leen sin los centésimos.

**Lo que salió de leer los perfiles reales** (con los tests en verde): "$ 24.500, con gastos comunes
$ 25.000" hacía pensar que los gastos eran $ 500 — el total mediano sale sólo de los avisos que
declaran gastos, otro subconjunto — así que se suman y se dicen las dos medianas; "$ 0 de gastos
comunes" es "la mitad de los avisos viene sin gastos comunes"; a quien alquila no se le muestra la
cuota; y el caso de ejemplo "comprar para alquilar con US$ 60.000 al contado" dejaba un solo barrio.

## Medido el 2026-09-25

Montevideo, apartamento de 2 dormitorios: 48 barrios con alquiler (n ≥ 8), 29 con venta. Con
$ 120.000 de ingreso y US$ 30.000 de ahorro con el BHU: alquiler hasta $ 48.000, compra hasta
US$ 106.086 — manda la cuota: 25 % de un líquido estimado de $ 87.065; sobre el nominal daba
US$ 145.208 —, 47 barrios en rango. Fuera de Montevideo sólo hay
precios: el contexto por barrio existe para los 62 barrios INE y las localidades UTE.
