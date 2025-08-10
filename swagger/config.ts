import swaggerJsdoc, { SwaggerDefinition } from 'swagger-jsdoc';

const swaggerDefinition: SwaggerDefinition = {
  openapi: '3.0.0',
  info: {
    title: 'Cambio Uruguay API',
    version: '1.0.0',
    description: `
# Cambio Uruguay API

API completa para obtener tipos de cambio y información de casas de cambio en Uruguay.

Esta API proporciona:
- Tipos de cambio actualizados en tiempo real
- Información de ubicaciones de casas de cambio
- Datos históricos de evolución de monedas
- Búsqueda por geolocalización
- Información del Banco Central del Uruguay (BCU)

## Base URL

**Producción:** \`https://api.cambio-uruguay.com\`

## Formatos de respuesta

Todas las respuestas de la API están en formato JSON.

## Zona horaria

Todos los timestamps y fechas están en la zona horaria de Uruguay (America/Montevideo).
    `,
    contact: {
      name: 'Cambio Uruguay',
      url: 'https://cambio-uruguay.com',
      email: 'info@cambio-uruguay.com'
    },
    license: {
      name: 'MIT',
      url: 'https://opensource.org/licenses/MIT'
    },
    termsOfService: 'https://cambio-uruguay.com/terminos'
  },
  servers: [
    {
      url: 'https://api.cambio-uruguay.com',
      description: 'Servidor de Producción'
    },
    {
      url: 'http://localhost:3528',
      description: 'Servidor de Desarrollo'
    }
  ],
  tags: [
    {
      name: 'Exchange Data',
      description: 'Endpoints para obtener datos de tipos de cambio'
    },
    {
      name: 'Locations',
      description: 'Endpoints para obtener información de ubicaciones'
    },
    {
      name: 'Health',
      description: 'Endpoints para verificar el estado del servicio'
    },
    {
      name: 'BCU',
      description: 'Endpoints para datos del Banco Central del Uruguay'
    },
    {
      name: 'Evolution',
      description: 'Endpoints para datos históricos y evolución de monedas'
    },
    {
      name: 'Geocoding',
      description: 'Endpoints para servicios de geocodificación'
    },
    {
      name: 'Parameters',
      description: 'Endpoints para obtener parámetros válidos del sistema'
    }
  ],
  components: {
    schemas: {
      ExchangeData: {
        type: 'object',
        properties: {
          origin: {
            type: 'string',
            description: 'Nombre de la casa de cambio',
            example: 'la_favorita'
          },
          code: {
            type: 'string',
            description: 'Código de la moneda (ISO 4217)',
            example: 'USD'
          },
          type: {
            type: 'string',
            description: 'Tipo de cambio (BILLETE, CABLE, etc.)',
            example: ''
          },
          buy: {
            type: 'number',
            format: 'float',
            description: 'Precio de compra',
            example: 38.75
          },
          sell: {
            type: 'number',
            format: 'float',
            description: 'Precio de venta',
            example: 41.15
          },
          date: {
            type: 'string',
            format: 'date-time',
            description: 'Fecha y hora de la cotización',
            example: '2025-08-09T03:00:00.000Z'
          },
          name: {
            type: 'string',
            description: 'Nombre descriptivo de la moneda',
            example: 'Dólar Estadounidense'
          }
        },
        required: ['origin', 'code', 'buy', 'sell', 'date']
      },
      Location: {
        type: 'object',
        properties: {
          name: {
            type: 'string',
            description: 'Nombre de la sucursal',
            example: 'Cambio Maiorano Centro'
          },
          address: {
            type: 'string',
            description: 'Dirección de la sucursal',
            example: 'Av. 18 de Julio 1234'
          },
          latitude: {
            type: 'number',
            format: 'float',
            description: 'Latitud geográfica',
            example: -34.9173
          },
          longitude: {
            type: 'number',
            format: 'float',
            description: 'Longitud geográfica',
            example: -56.1501
          },
          department: {
            type: 'string',
            description: 'Departamento de Uruguay',
            example: 'Montevideo'
          },
          city: {
            type: 'string',
            description: 'Ciudad',
            example: 'Montevideo'
          },
          distance: {
            type: 'number',
            format: 'float',
            description: 'Distancia en metros (solo si se proporciona ubicación)',
            example: 1250.5
          }
        },
        required: ['name', 'address', 'latitude', 'longitude']
      },
      HealthResponse: {
        type: 'object',
        properties: {
          status: {
            type: 'string',
            enum: ['ok', 'error'],
            description: 'Estado del servicio',
            example: 'ok'
          },
          message: {
            type: 'string',
            description: 'Mensaje descriptivo del estado',
            example: 'Sync is recent'
          },
          lastSync: {
            type: 'string',
            format: 'date-time',
            description: 'Última sincronización exitosa',
            example: '2024-08-09T12:00:00.000Z'
          },
          minutesAgo: {
            type: 'number',
            description: 'Minutos desde la última sincronización',
            example: 5
          }
        },
        required: ['status', 'message']
      },
      PingResponse: {
        type: 'object',
        properties: {
          expected: {
            type: 'boolean',
            description: 'Si la respuesta es la esperada (>= 100 registros)',
            example: true
          },
          total: {
            type: 'number',
            description: 'Cantidad total de registros devueltos',
            example: 150
          }
        },
        required: ['expected', 'total']
      },
      ErrorResponse: {
        type: 'object',
        properties: {
          error: {
            type: 'string',
            description: 'Mensaje de error',
            example: 'No results found'
          }
        },
        required: ['error']
      },
      GeocodeResponse: {
        type: 'object',
        properties: {
          display_name: {
            type: 'string',
            description: 'Nombre completo del lugar',
            example: 'Montevideo, Uruguay'
          },
          lat: {
            type: 'string',
            description: 'Latitud',
            example: '-34.9011127'
          },
          lon: {
            type: 'string',
            description: 'Longitud',
            example: '-56.1645314'
          },
          boundingbox: {
            type: 'array',
            items: {
              type: 'string'
            },
            description: 'Límites geográficos',
            example: ['-34.9411127', '-34.8611127', '-56.2045314', '-56.1245314']
          }
        },
        required: ['display_name', 'lat', 'lon']
      },
      CurrencyEvolution: {
        type: 'object',
        properties: {
          date: {
            type: 'string',
            format: 'date',
            description: 'Fecha de la cotización',
            example: '2025-08-09'
          },
          buy: {
            type: 'number',
            format: 'float',
            description: 'Precio de compra',
            example: 38.75
          },
          sell: {
            type: 'number',
            format: 'float',
            description: 'Precio de venta',
            example: 41.15
          },
          avg: {
            type: 'number',
            format: 'float',
            description: 'Precio promedio',
            example: 39.95
          }
        },
        required: ['date', 'buy', 'sell']
      },
      ParametersResponse: {
        type: 'object',
        properties: {
          origins: {
            type: 'array',
            items: {
              type: 'string'
            },
            description: 'Lista de casas de cambio disponibles'
          },
          currencies: {
            type: 'array',
            items: {
              type: 'string'
            },
            description: 'Lista de códigos de moneda disponibles'
          },
          types: {
            type: 'array',
            items: {
              type: 'string'
            },
            description: 'Lista de tipos de cambio disponibles'
          },
          locations: {
            type: 'array',
            items: {
              type: 'string'
            },
            description: 'Lista de ubicaciones disponibles'
          },
          counts: {
            type: 'object',
            properties: {
              origins: {
                type: 'integer',
                description: 'Número total de casas de cambio'
              },
              currencies: {
                type: 'integer',
                description: 'Número total de monedas'
              },
              types: {
                type: 'integer',
                description: 'Número total de tipos'
              },
              locations: {
                type: 'integer',
                description: 'Número total de ubicaciones'
              }
            }
          }
        }
      },
      ValidationError: {
        type: 'object',
        properties: {
          error: {
            type: 'string',
            description: 'Mensaje de error de validación'
          },
          parameter: {
            type: 'string',
            description: 'Nombre del parámetro inválido'
          },
          value: {
            type: 'string',
            description: 'Valor proporcionado que es inválido'
          },
          validValues: {
            type: 'array',
            items: {
              type: 'string'
            },
            description: 'Lista de valores válidos para este parámetro'
          },
          suggestion: {
            type: 'string',
            description: 'Sugerencia para corregir el error'
          }
        },
        required: ['error', 'parameter', 'validValues']
      }
    },
    parameters: {
      DateParam: {
        name: 'date',
        in: 'query',
        description: 'Fecha en formato YYYY-MM-DD (zona horaria de Uruguay)',
        required: false,
        schema: {
          type: 'string',
          format: 'date',
          example: '2025-08-09'
        }
      },
      LatitudeParam: {
        name: 'latitude',
        in: 'query',
        description: 'Latitud geográfica para calcular distancias',
        required: false,
        schema: {
          type: 'number',
          format: 'float',
          minimum: -90,
          maximum: 90,
          example: -34.9173
        }
      },
      LongitudeParam: {
        name: 'longitude',
        in: 'query',
        description: 'Longitud geográfica para calcular distancias',
        required: false,
        schema: {
          type: 'number',
          format: 'float',
          minimum: -180,
          maximum: 180,
          example: -56.1501
        }
      },
      PeriodParam: {
        name: 'period',
        in: 'query',
        description: 'Período en meses para datos históricos (1-60)',
        required: false,
        schema: {
          type: 'integer',
          minimum: 1,
          maximum: 60,
          default: 6,
          example: 12
        }
      },
      OriginParam: {
        name: 'origin',
        in: 'path',
        description: 'Casa de cambio. Para obtener valores válidos, consulte /parameters/origins',
        required: true,
        schema: {
          type: 'string',
          example: 'la_favorita'
        },
        'x-parameter-type': 'origin'
      },
      CurrencyCodeParam: {
        name: 'code',
        in: 'path',
        description: 'Código de moneda (ISO 4217). Para obtener valores válidos, consulte /parameters/currencies',
        required: true,
        schema: {
          type: 'string',
          pattern: '^[A-Z]{3}$',
          example: 'USD'
        },
        'x-parameter-type': 'currency'
      },
      ExchangeTypeParam: {
        name: 'type',
        in: 'path',
        description: 'Tipo de cambio. Para obtener valores válidos, consulte /parameters/types',
        required: true,
        schema: {
          type: 'string',
          example: ''
        },
        'x-parameter-type': 'type'
      },
      LocationParam: {
        name: 'location',
        in: 'path',
        description: 'Ubicación o departamento. Para obtener valores válidos, consulte /parameters/locations',
        required: true,
        schema: {
          type: 'string',
          example: 'Montevideo'
        },
        'x-parameter-type': 'location'
      }
    },
    responses: {
      BadRequest: {
        description: 'Solicitud incorrecta',
        content: {
          'application/json': {
            schema: {
              $ref: '#/components/schemas/ErrorResponse'
            }
          }
        }
      },
      NotFound: {
        description: 'Recurso no encontrado',
        content: {
          'application/json': {
            schema: {
              $ref: '#/components/schemas/ErrorResponse'
            }
          }
        }
      },
      InternalError: {
        description: 'Error interno del servidor',
        content: {
          'application/json': {
            schema: {
              $ref: '#/components/schemas/ErrorResponse'
            }
          }
        }
      },
      ValidationError: {
        description: 'Error de validación de parámetros',
        content: {
          'application/json': {
            schema: {
              $ref: '#/components/schemas/ValidationError'
            },
            examples: {
              invalid_origin: {
                summary: 'Casa de cambio inválida',
                value: {
                  error: 'Invalid origin parameter',
                  parameter: 'origin',
                  value: 'invalid_exchange',
                  validValues: ['la_favorita', 'cambio_minas', 'brou', 'cambio_regul', 'itau', 'prex', 'bcu', 'cambilex'],
                  suggestion: 'Use /parameters/origins to get all valid origins'
                }
              },
              invalid_currency: {
                summary: 'Moneda inválida',
                value: {
                  error: 'Invalid currency code',
                  parameter: 'code',
                  value: 'INVALID',
                  validValues: ['USD', 'EUR', 'ARS', 'BRL', 'XAU', 'UR', 'UP', 'UI', 'PYG', 'PEN', 'MXN', 'JPY', 'GBP', 'COP', 'CLP', 'CHF', 'CAD', 'AUD'],
                  suggestion: 'Use /parameters/currencies to get all valid currency codes'
                }
              }
            }
          }
        }
      }
    }
  }
};

const options = {
  definition: swaggerDefinition,
  apis: [
    './index.ts', // Archivo principal con las rutas
    './swagger/schemas/*.ts' // Esquemas adicionales si los hay
  ]
};

export const swaggerSpec = swaggerJsdoc(options);
export default swaggerSpec;
