# 🔧 Validación de Parámetros - Cambio Uruguay API

## 📋 Resumen

Se ha implementado un sistema completo de validación de parámetros y documentación mejorada para la API de Cambio Uruguay. Este sistema incluye:

- **Endpoints para obtener parámetros válidos**
- **Validación automática con mensajes de error detallados** 
- **Documentación de Swagger mejorada con referencias dinámicas**
- **Autocompletado y selects en la interfaz de Swagger**

## 🆕 Nuevos Endpoints de Parámetros

### 📍 `/parameters/origins`
**GET** - Obtiene todas las casas de cambio disponibles
```json
{
  "origins": ["abitab", "redpagos", "cambio_maiorano", "brou", ...],
  "count": 42
}
```

### 💰 `/parameters/currencies`
**GET** - Obtiene todas las monedas disponibles
- Parámetros opcionales: `date`
```json
{
  "currencies": ["USD", "EUR", "ARS", "BRL", ...],
  "count": 5
}
```

### 📊 `/parameters/types`
**GET** - Obtiene todos los tipos de cambio disponibles
- Parámetros opcionales: `date`, `origin`, `code`
```json
{
  "types": ["BILLETE", "CABLE", "TRANSFERENCIA", ...],
  "count": 4
}
```

### 📍 `/parameters/locations`
**GET** - Obtiene todas las ubicaciones/departamentos disponibles
- Parámetros opcionales: `origin`
```json
{
  "locations": ["Montevideo", "Canelones", "Maldonado", ...],
  "count": 19
}
```

### 🔄 `/parameters/all`
**GET** - Obtiene todos los parámetros en una sola consulta
- Parámetros opcionales: `date`
```json
{
  "origins": ["abitab", "redpagos", ...],
  "currencies": ["USD", "EUR", ...],
  "types": ["BILLETE", "CABLE", ...],
  "locations": ["Montevideo", "Canelones", ...],
  "counts": {
    "origins": 42,
    "currencies": 5,
    "types": 4,
    "locations": 19
  }
}
```

## ⚠️ Validación de Errores Mejorada

Cuando se proporciona un parámetro inválido, la API ahora retorna errores estructurados con información útil:

### Ejemplo de Error por Casa de Cambio Inválida
```json
{
  "error": "Invalid origin parameter",
  "parameter": "origin",
  "value": "casa_inexistente",
  "validValues": ["abitab", "redpagos", "cambio_maiorano", "brou"],
  "suggestion": "Use /parameters/origins to get all valid origins"
}
```

### Ejemplo de Error por Moneda Inválida
```json
{
  "error": "Invalid currency code",
  "parameter": "code", 
  "value": "INVALID",
  "validValues": ["USD", "EUR", "ARS", "BRL"],
  "suggestion": "Use /parameters/currencies to get all valid currency codes"
}
```

## 📚 Endpoints Actualizados con Validación

Los siguientes endpoints han sido mejorados con validación automática:

### 💱 Exchange Data
- `GET /exchange/{origin}` - Validación de origin
- `GET /exchange/{origin}/{code}` - Validación de origin y code

### 📍 Locations
- `GET /exchanges/{origin}` - Validación de origin
- `GET /exchanges/{origin}/{location}` - Validación de origin y location
- `GET /bcu/{origin}` - Validación de origin

### 📈 Evolution
- `GET /evolution/{origin}/{code}` - Validación de origin y code
- `GET /evolution/{origin}/{code}/{type}` - Validación de origin, code y type

## 🎯 Documentación de Swagger Mejorada

### Nuevos Parámetros Reutilizables
- `OriginParam` - Para casa de cambio con referencia a `/parameters/origins`
- `CurrencyCodeParam` - Para código de moneda con referencia a `/parameters/currencies`
- `ExchangeTypeParam` - Para tipo de cambio con referencia a `/parameters/types`
- `LocationParam` - Para ubicación con referencia a `/parameters/locations`

### Nuevos Esquemas
- `ParametersResponse` - Respuesta para endpoints de parámetros
- `ValidationError` - Esquema para errores de validación detallados

### Nuevas Respuestas
- `ValidationError` - Respuesta estándar para errores de validación con ejemplos

## 🔧 Funciones de Validación

### `createValidationError(parameter, value, validValues, suggestion?)`
Crea mensajes de error estructurados con:
- Nombre del parámetro inválido
- Valor proporcionado
- Lista de valores válidos 
- Sugerencia para corregir el error

### `validateOrigin(origin)`
Valida que la casa de cambio existe en el sistema:
- Retorna `{isValid: true}` si es válido
- Retorna `{isValid: false, error: ValidationError}` si no es válido

## 💡 Beneficios de la Implementación

### Para Desarrolladores
- **Errores más informativos** con valores válidos incluidos
- **Autocompletado** en la interfaz de Swagger UI
- **Documentación dinámica** que se actualiza automáticamente
- **Validación consistente** en todos los endpoints

### Para la Interfaz de Usuario
- **Selects automáticos** con valores válidos en Swagger UI
- **Filtrado en tiempo real** de opciones disponibles
- **Mensajes de error útiles** que guían hacia la solución
- **Menos llamadas fallidas** por parámetros incorrectos

## 🚀 Uso Recomendado

### 1. Obtener Parámetros Válidos
```bash
# Obtener todas las casas de cambio
curl https://api.cambio-uruguay.com/parameters/origins

# Obtener todas las monedas para hoy
curl https://api.cambio-uruguay.com/parameters/currencies

# Obtener todos los parámetros
curl https://api.cambio-uruguay.com/parameters/all
```

### 2. Implementar en Frontend
```javascript
// Obtener casas de cambio para un dropdown
const getOrigins = async () => {
  const response = await fetch('/parameters/origins');
  const data = await response.json();
  return data.origins; // ["abitab", "redpagos", ...]
};

// Validar parámetro antes de hacer la consulta principal
const validateAndFetch = async (origin, code) => {
  const params = await fetch('/parameters/all').then(r => r.json());
  
  if (!params.origins.includes(origin)) {
    throw new Error(`Invalid origin: ${origin}. Valid: ${params.origins.join(', ')}`);
  }
  
  if (!params.currencies.includes(code)) {
    throw new Error(`Invalid currency: ${code}. Valid: ${params.currencies.join(', ')}`);
  }
  
  // Ahora hacer la consulta principal
  return fetch(`/exchange/${origin}/${code}`);
};
```

### 3. Manejar Errores de Validación
```javascript
try {
  const response = await fetch('/exchange/invalid_origin/USD');
  if (!response.ok) {
    const error = await response.json();
    if (error.parameter && error.validValues) {
      console.log(`Error en ${error.parameter}: ${error.value}`);
      console.log(`Valores válidos: ${error.validValues.join(', ')}`);
      console.log(`Sugerencia: ${error.suggestion}`);
    }
  }
} catch (error) {
  console.error('Error de validación:', error);
}
```

## 📊 Estadísticas del Sistema

- **Total de casas de cambio**: 42+
- **Monedas soportadas**: USD, EUR, ARS, BRL, CLP y más
- **Tipos de cambio**: BILLETE, CABLE, TRANSFERENCIA, INTERBANCARIO
- **Departamentos cubiertos**: 19 departamentos de Uruguay
- **Endpoints documentados**: 15+ endpoints principales + 5 endpoints de parámetros

---

*Esta documentación se mantiene actualizada automáticamente con los datos del sistema.*
