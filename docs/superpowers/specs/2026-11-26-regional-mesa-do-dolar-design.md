# Mesa do Dólar en el tablero regional — diseño corto

**Fecha:** 2026-11-26 · **Tamaño:** cambio chico (una fuente más del catálogo)

## Por qué

Mesa do Dólar (mesadodolar.com.br) nos escribió el 26/11/2026 ofreciendo su API pública (sin clave,
gratis, 60 pedidos por minuto por IP) como fuente del lado brasileño: vieron que
`/llevar-dolares-o-reales-a-brasil` usa la PTAX. El catálogo regional es redundante a propósito
(`classes/regional/catalog.ts`): un mercado con una sola fuente no puede distinguir "se movió" de "se
rompió". Brasil tiene dos fuentes que no se cruzan entre sí (BCB → PTAX, AwesomeAPI → comercial y
turismo), así que **ningún mercado brasileño tiene hoy segunda lectura**.

## Qué aporta

| Endpoint | Fila | Para qué |
|---|---|---|
| `GET /api/v1/ptax` | `BR:ptax:USDBRL` (`official`, compra/venta) | segunda lectura del fixing; el BCB gana el dedupe (banco central > proveedor) y Mesa queda en `corroboratedBy`. Si el BCB se cae, la fila de Mesa lo reemplaza |
| `GET /api/v1/cotacao` | `BR:comercial:USDBRL` (`wholesale`, precio único) | segunda lectura del dólar comercial: el contado de B3 (15 min de atraso; fuera de rueda, el cierre de las 17 h con su hora real). AwesomeAPI gana el dedupe por traer las dos puntas |
| `GET /api/v1/digital` | `BR:cripto:USDBRL` (`financial`, compra/venta) | **mercado nuevo**: USDT/BRL (Binance + Foxbit), que opera 24 h y es el único precio brasileño que se mueve el fin de semana. `financial` no entra a la fila del tablero (que elige `official`/`parallel`/`retail`), así que no cambia brechas ni rutas |

Tres pedidos cada 10 minutos al mismo host, en fila con el espaciado de `net.ts`: lejos del límite.

## Atribución (condición de la API)

"Fuente: Mesa do Dólar" con enlace a mesadodolar.com.br. Sale sola en la tabla de fuentes de
`/cotizaciones-de-la-region` (se arma desde el catálogo), y se agrega a mano en "De dónde salen estos
números" de `/llevar-dolares-o-reales-a-brasil`.

## Enfoques considerados

1. **Fuente nueva del catálogo (elegido).** Una entrada en `LIVE_SOURCES`, un parser puro con
   fixtures reales y nada más: el dedupe, la validación, el ledger de cambios y la historia diaria
   ya existen y la absorben.
2. Usar Mesa sólo como respaldo del BCB dentro de `br_bcb.ts`. Descartado: esconde la segunda lectura
   (no queda en `corroboratedBy`) y no suma el dólar cripto.
3. Integrar su servidor MCP en el nuestro. Descartado: nuestro MCP lee nuestra API; sumarle un
   upstream ajeno mezcla responsabilidades, y la fuente ya llega al MCP por el tablero si hace falta.

## No-objetivos

- No reemplaza al BCB ni a AwesomeAPI (el turismo sigue siendo de AwesomeAPI: Mesa no lo publica).
- No hay backfill: la serie PTAX completa ya sale del SGS del BCB.
- No se contesta el correo desde acá (borrador a pedido).

## Cuentas que cambian

21 → 22 fuentes en vivo (23 → 24 en total) en `docs/api/REGIONAL.md`, `AGENTS.md`, el texto y el
valor por defecto de `/cotizaciones-de-la-region`, y los comentarios que dicen "veintiuna".
