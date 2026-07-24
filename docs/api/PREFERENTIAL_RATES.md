# Cotizaciones preferenciales por monto

Cambio Uruguay expone las cotizaciones que algunos bancos o plataformas reservan para clientes autenticados y que cambian según el monto de la operación.

## Endpoint común

```http
GET /preferential-rates
```

Parámetros opcionales:

- `provider`: identificador del proveedor, por ejemplo `santander`.
- `currency`: código ISO 4217 de tres letras, por ejemplo `USD`.
- `amount`: monto expresado en la moneda consultada. Requiere `currency`.

Ejemplo:

```bash
curl "https://api.cambio-uruguay.com/preferential-rates?provider=santander&currency=USD&amount=5000"
```

La respuesta contiene una lista `providers`. Cada proveedor informa sus monedas, la captura vigente, un histórico con una entrada por día y, cuando se envían `currency` y `amount`, la franja aplicable en `selectedRate`.

```json
{
  "currency": "USD",
  "amount": 5000,
  "providers": [
    {
      "provider": "santander",
      "displayName": "Santander",
      "requiresAuthentication": true,
      "current": {
        "date": "2026-07-23",
        "scrapedAt": "2026-07-23T20:00:00.000Z",
        "rates": [
          {
            "currency": "USD",
            "buy": 39.4,
            "sell": 40.95,
            "minAmount": 1001,
            "maxAmount": 10000
          }
        ],
        "selectedRate": {
          "currency": "USD",
          "buy": 39.4,
          "sell": 40.95,
          "minAmount": 1001,
          "maxAmount": 10000
        }
      },
      "history": []
    }
  ]
}
```

`minAmount` es inclusivo. `maxAmount` es exclusivo y `null` indica que la franja no tiene límite superior.

## Santander

Santander es el primer proveedor integrado. Las franjas se obtienen de Supernet con una sesión autenticada y se guardan durante la sincronización normal de cotizaciones. La API nunca expone credenciales, cookies, tokens ni el contenido de la sesión.

Se mantiene el alias:

```http
GET /santander/preferential-rates
```

Este alias devuelve el formato específico de Santander. Las integraciones nuevas deberían consumir `/preferential-rates`.

## Histórico y tolerancia a fallos

- Se conserva una captura por día calendario de Uruguay.
- Una nueva sincronización en el mismo día reemplaza la captura de ese día.
- Si el proveedor falla o cambia su login, se conserva la última captura válida.
- `scrapedAt` y `updatedAt` permiten evaluar la antigüedad de los datos.
- La cotización debe verificarse con el proveedor antes de operar.

## Agregar otro proveedor

Las fuentes se conectan mediante adaptadores registrados en `classes/preferential-rates/catalog.ts`. Un adaptador nuevo debe:

1. autenticar y obtener los datos sin exponer secretos;
2. normalizar cada franja a `currency`, `buy`, `sell`, `minAmount` y `maxAmount`;
3. guardar una captura diaria y conservar el último dato válido ante fallos;
4. registrarse con un `provider` estable que coincida con el `origin` de su cotización pública.

El sitio aplica el contrato común al monto ingresado. Por eso un proveedor nuevo puede participar de la tabla y del ranking sin agregar condiciones específicas a la interfaz.
