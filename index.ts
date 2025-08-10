import axios from "axios";
import { Request, Response } from "express";
import fs from "fs";
import moment from "moment-timezone";
import BCU_Details from "./classes/bcu_details";
import { cambio_info } from "./classes/cambioInfo";
import CambioFortex from "./classes/cambios/fortex";
import { MongooseServer } from "./classes/database";
import server from "./classes/Express/ExpressSetup";
import { origins } from "./classes/origins";
import sentryInit from "./sentry";

moment.tz.setDefault("America/Montevideo");
sentryInit();

// Helper function to create validation errors with available values
const createValidationError = (parameter: string, value: string, validValues: string[], suggestion?: string) => {
  return {
    error: `Invalid ${parameter} parameter`,
    parameter,
    value,
    validValues,
    suggestion: suggestion || `Use /parameters/${parameter === 'origin' ? 'origins' : parameter === 'code' ? 'currencies' : parameter === 'type' ? 'types' : 'locations'} to get all valid values`
  };
};

// Helper function to validate origin parameter
const validateOrigin = (origin: string): { isValid: boolean; error?: any } => {
  const validOrigins = Object.keys(origins);
  if (!validOrigins.includes(origin)) {
    return {
      isValid: false,
      error: createValidationError('origin', origin, validOrigins)
    };
  }
  return { isValid: true };
};

const main = async () => {
  console.log("Start connection");
  await MongooseServer.startConnectionPromise();
  console.log("Start express");
  
  /**
   * @openapi
   * /:
   *   get:
   *     tags:
   *       - Exchange Data
   *     summary: Obtener todos los tipos de cambio
   *     description: |
   *       Retorna todos los tipos de cambio disponibles para la fecha especificada.
   *       Si no se especifica fecha, retorna los tipos de cambio más recientes.
   *       
   *       Los datos incluyen información de múltiples casas de cambio en Uruguay,
   *       con precios de compra y venta para diferentes monedas.
   *     parameters:
   *       - $ref: '#/components/parameters/DateParam'
   *     responses:
   *       200:
   *         description: Lista de tipos de cambio exitosa
   *         content:
   *           application/json:
   *             schema:
   *               type: array
   *               items:
   *                 $ref: '#/components/schemas/ExchangeData'
   *             examples:
   *               success:
   *                 summary: Respuesta exitosa
   *                 value:
   *                   - origin: "la_favorita"
   *                     code: "USD"
   *                     type: ""
   *                     buy: 38.75
   *                     sell: 41.15
   *                     date: "2025-08-09T03:00:00.000Z"
   *                     name: "Dólar Estadounidense"
   *                   - origin: "brou"
   *                     code: "EUR"
   *                     type: ""
   *                     buy: 44.07
   *                     sell: 49.45
   *                     date: "2025-08-09T03:00:00.000Z"
   *                     name: "Euro"
   *       500:
   *         $ref: '#/components/responses/InternalError'
   */
  server.getJson("/", async (req: Request): Promise<any> => {
    let date = req.query.date as string;
    let dateM = null;
    if (date) {
      // Parse date explicitly in Uruguay timezone to ensure consistency
      dateM = moment.tz(date, "YYYY-MM-DD", "America/Montevideo").toDate();
    }
    console.log("Date", dateM);
    const res = await cambio_info.get_data(dateM, req.query);
    if (!res?.length) throw new Error("No results found");
    return res;
  });

  /**
   * @openapi
   * /ping:
   *   get:
   *     tags:
   *       - Health
   *     summary: Verificar disponibilidad de datos
   *     description: |
   *       Endpoint para verificar que la API tiene datos suficientes disponibles.
   *       Retorna información sobre la cantidad de registros disponibles y
   *       si cumple con el umbral mínimo esperado (≥100 registros).
   *     parameters:
   *       - $ref: '#/components/parameters/DateParam'
   *     responses:
   *       200:
   *         description: Verificación exitosa con datos suficientes
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/PingResponse'
   *             examples:
   *               sufficient_data:
   *                 summary: Datos suficientes disponibles
   *                 value:
   *                   expected: true
   *                   total: 150
   *       500:
   *         description: Datos insuficientes o error del servidor
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/PingResponse'
   *             examples:
   *               insufficient_data:
   *                 summary: Datos insuficientes
   *                 value:
   *                   expected: false
   *                   total: 50
   */
  server.get("ping", async (req: Request, res: Response): Promise<any> => {
    let date = req.query.date as string;
    let dateM = null;
    if (date) {
      // Parse date explicitly in Uruguay timezone to ensure consistency
      dateM = moment.tz(date, "YYYY-MM-DD", "America/Montevideo").toDate();
    }
    console.log("Date", dateM);
    const result = await cambio_info.get_data(dateM, req.query);
    const expected = result.length > 0 && result.length >= 100;
    const fResponse = { expected: expected, total: result.length };
    if (expected) return res.json(fResponse);
    return res.json(fResponse).status(500);
  });

  /**
   * @openapi
   * /health:
   *   get:
   *     tags:
   *       - Health
   *     summary: Verificar estado del servicio
   *     description: |
   *       Endpoint de health check que verifica el estado del servicio
   *       basándose en la última sincronización de datos.
   *       
   *       - **ok**: Sincronización reciente (≤10 minutos)
   *       - **error**: Sincronización antigua (>10 minutos) o error
   *     responses:
   *       200:
   *         description: Servicio saludable
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/HealthResponse'
   *             examples:
   *               healthy:
   *                 summary: Servicio funcionando correctamente
   *                 value:
   *                   status: "ok"
   *                   message: "Sync is recent"
   *                   lastSync: "2024-08-09T12:00:00.000Z"
   *                   minutesAgo: 5
   *               no_sync_file:
   *                 summary: Sin archivo de sincronización
   *                 value:
   *                   status: "ok"
   *                   message: "No sync file found - assuming healthy"
   *       500:
   *         description: Servicio con problemas
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/HealthResponse'
   *             examples:
   *               unhealthy:
   *                 summary: Sincronización antigua
   *                 value:
   *                   status: "error"
   *                   message: "Sync is too old"
   *                   lastSync: "2024-08-09T10:00:00.000Z"
   *                   minutesAgo: 120
   *               error:
   *                 summary: Error al verificar estado
   *                 value:
   *                   status: "error"
   *                   message: "Error checking sync status"
   *                   error: "File read error"
   */
  server.get("health", async (req: Request, res: Response): Promise<any> => {
    try {
      const syncFilePath = "last_sync.txt";

      // Check if file exists and is not empty
      if (!fs.existsSync(syncFilePath)) {
        return res.status(200).json({ status: "ok", message: "No sync file found - assuming healthy" });
      }

      const syncData = fs.readFileSync(syncFilePath, "utf8").trim();
      if (!syncData) {
        return res.status(200).json({ status: "ok", message: "Sync file is empty - assuming healthy" });
      }

      // Parse the last sync time
      const lastSyncTime = new Date(syncData);
      const now = new Date();
      const diffMinutes = (now.getTime() - lastSyncTime.getTime()) / (1000 * 60);

      if (diffMinutes <= 10) {
        return res.status(200).json({
          status: "ok",
          message: "Sync is recent",
          lastSync: lastSyncTime.toISOString(),
          minutesAgo: Math.round(diffMinutes),
        });
      } else {
        return res.status(500).json({
          status: "error",
          message: "Sync is too old",
          lastSync: lastSyncTime.toISOString(),
          minutesAgo: Math.round(diffMinutes),
        });
      }
    } catch (error) {
      return res.status(500).json({
        status: "error",
        message: "Error checking sync status",
        error: error.message,
      });
    }
  });

  /**
   * @openapi
   * /exchange/{type}:
   *   get:
   *     tags:
   *       - Exchange Data
   *     summary: Obtener tipo de cambio específico por casa de cambio
   *     description: |
   *       Retorna los tipos de cambio de una casa de cambio específica.
   *       Opcionalmente se puede filtrar por código de moneda.
   *       
   *       Para obtener la lista de casas de cambio válidas, use `/parameters/origins`.
   *     parameters:
   *       - $ref: '#/components/parameters/OriginParam'
   *       - $ref: '#/components/parameters/DateParam'
   *     responses:
   *       200:
   *         description: Tipos de cambio de la casa especificada
   *         content:
   *           application/json:
   *             schema:
   *               type: array
   *               items:
   *                 $ref: '#/components/schemas/ExchangeData'
   *       400:
   *         $ref: '#/components/responses/ValidationError'
   *       404:
   *         $ref: '#/components/responses/NotFound'
   * 
   * /exchange/{type}/{code}:
   *   get:
   *     tags:
   *       - Exchange Data
   *     summary: Obtener tipo de cambio específico por casa y moneda
   *     description: |
   *       Retorna el tipo de cambio de una moneda específica en una casa de cambio.
   *       
   *       Para obtener la lista de casas de cambio válidas, use `/parameters/origins`.
   *       Para obtener la lista de monedas válidas, use `/parameters/currencies`.
   *     parameters:
   *       - $ref: '#/components/parameters/OriginParam'
   *       - $ref: '#/components/parameters/CurrencyCodeParam'
   *       - $ref: '#/components/parameters/DateParam'
   *     responses:
   *       200:
   *         description: Tipo de cambio específico encontrado
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/ExchangeData'
   *             examples:
   *               found:
   *                 summary: Tipo de cambio encontrado
   *                 value:
   *                   origin: "la_favorita"
   *                   code: "USD"
   *                   type: ""
   *                   buy: 38.75
   *                   sell: 41.15
   *                   date: "2025-08-09T03:00:00.000Z"
   *                   name: "Dólar Estadounidense"
   *       400:
   *         $ref: '#/components/responses/ValidationError'
   *       404:
   *         description: Tipo de cambio no encontrado
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 origin:
   *                   type: string
   *                 code:
   *                   type: string
   *                 error:
   *                   type: string
   *             example:
   *               origin: "la_favorita"
   *               code: "USD"
   *               error: "not found"
   */
  server.getJson("exchange/:type/:code?", async (req: Request): Promise<any> => {
    let date = req.query.date as string;
    let dateM = null;
    if (date) {
      // Parse date explicitly in Uruguay timezone to ensure consistency
      dateM = moment.tz(date, "YYYY-MM-DD", "America/Montevideo").toDate();
    }
    const origin = (req.params.type as string).toLowerCase();
    
    // Validate origin parameter
    const originValidation = validateOrigin(origin);
    if (!originValidation.isValid) {
      throw new Error(JSON.stringify(originValidation.error));
    }
    
    console.log("Date", dateM);
    const res = await cambio_info.get_entry(dateM, origin, req.params.code).catch((e) => {
      console.error(e);
      return {
        origin,
        code: req.params.code,
        error: "not found",
      };
    });
    return res;
  });

  /**
   * @openapi
   * /distances:
   *   get:
   *     tags:
   *       - Locations
   *     summary: Calcular distancias a casas de cambio
   *     description: |
   *       Calcula las distancias desde una ubicación específica a todas las casas
   *       de cambio disponibles. Útil para encontrar las sucursales más cercanas.
   *     parameters:
   *       - $ref: '#/components/parameters/LatitudeParam'
   *       - $ref: '#/components/parameters/LongitudeParam'
   *     responses:
   *       200:
   *         description: Lista de casas de cambio con distancias calculadas
   *         content:
   *           application/json:
   *             schema:
   *               type: array
   *               items:
   *                 allOf:
   *                   - $ref: '#/components/schemas/Location'
   *                   - type: object
   *                     properties:
   *                       distance:
   *                         type: number
   *                         description: Distancia en metros
   *             examples:
   *               nearby_locations:
   *                 summary: Ubicaciones cercanas
   *                 value:
   *                   - name: "La Favorita Centro"
   *                     address: "Av. 18 de Julio 1234"
   *                     latitude: -34.9173
   *                     longitude: -56.1501
   *                     department: "Montevideo"
   *                     distance: 1250.5
   *                   - name: "Banco República Centro"
   *                     address: "18 de Julio 1567"
   *                     latitude: -34.9058
   *                     longitude: -56.1909
   *                     department: "Montevideo"
   *                     distance: 2100.8
   *       400:
   *         description: Parámetros de ubicación faltantes o inválidos
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/ErrorResponse'
   */
  server.getJson("distances", async (req: Request): Promise<any> => {
    const latitude = parseFloat(req.query.latitude as string);
    const longitude = parseFloat(req.query.longitude as string);
    const res = await cambio_info.get_distances(latitude, longitude);
    return res;
  });

  /**
   * @openapi
   * /geocoding:
   *   post:
   *     tags:
   *       - Geocoding
   *     summary: Geocodificar una dirección
   *     description: |
   *       Convierte una dirección de texto en coordenadas geográficas.
   *       Utiliza el servicio OpenStreetMap Nominatim para la geocodificación.
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               address:
   *                 type: string
   *                 description: Dirección a geocodificar
   *                 example: "18 de Julio 1234, Montevideo, Uruguay"
   *             required:
   *               - address
   *     responses:
   *       200:
   *         description: Resultados de geocodificación
   *         content:
   *           application/json:
   *             schema:
   *               type: array
   *               items:
   *                 $ref: '#/components/schemas/GeocodeResponse'
   *             examples:
   *               found:
   *                 summary: Dirección encontrada
   *                 value:
   *                   - display_name: "18 de Julio 1234, Montevideo, Uruguay"
   *                     lat: "-34.9058"
   *                     lon: "-56.1909"
   *                     boundingbox: ["-34.9158", "-34.8958", "-56.2009", "-56.1809"]
   *       400:
   *         $ref: '#/components/responses/BadRequest'
   */
  server.postJson("geocoding", async (req: Request): Promise<any> => {
    const address = req.body.address as string;
    const url = `https://nominatim.openstreetmap.org/search.php?q=${encodeURIComponent(address)}&polygon_geojson=1&format=jsonv2`;
    return axios
      .get(url)
      .then((res) => res.data.filter((el: any) => el.display_name.includes("Uruguay")))
      .catch((e) => {
        console.log(e);
        return [];
      });
  });

  /**
   * @openapi
   * /bcu:
   *   get:
   *     tags:
   *       - BCU
   *     summary: Obtener datos del Banco Central del Uruguay
   *     description: |
   *       Retorna los tipos de cambio oficiales del Banco Central del Uruguay (BCU).
   *       Incluye cotizaciones oficiales para diferentes monedas.
   *     responses:
   *       200:
   *         description: Datos del BCU obtenidos exitosamente
   *         content:
   *           application/json:
   *             schema:
   *               type: array
   *               items:
   *                 $ref: '#/components/schemas/ExchangeData'
   *             examples:
   *               bcu_data:
   *                 summary: Datos oficiales del BCU
   *                 value:
   *                   - origin: "bcu"
   *                     code: "USD"
   *                     type: "INTERBANCARIO"
   *                     buy: 40.25
   *                     sell: 40.75
   *                     date: "2024-08-09T12:00:00.000Z"
   *                     isInterBank: true
   */
  server.getJson("bcu", async (req: Request): Promise<any> => {
    const res = cambio_info.get_bcu();
    return res;
  });

  /**
   * @openapi
   * /localData:
   *   get:
   *     tags:
   *       - Locations
   *     summary: Obtener datos locales de casas de cambio
   *     description: |
   *       Retorna información detallada sobre las casas de cambio,
   *       incluyendo ubicaciones, departamentos y datos de contacto.
   *     responses:
   *       200:
   *         description: Datos locales obtenidos exitosamente
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               additionalProperties:
   *                 type: object
   *                 properties:
   *                   name:
   *                     type: string
   *                     description: Nombre de la casa de cambio
   *                   website:
   *                     type: string
   *                     description: Sitio web oficial
   *                   departments:
   *                     type: array
   *                     items:
   *                       type: string
   *                     description: Departamentos donde opera
   *             examples:
   *               local_data:
   *                 summary: Información de casas de cambio
   *                 value:
   *                   la_favorita:
   *                     name: "La Favorita"
   *                     website: "https://www.lafavorita.com.uy"
   *                     departments: ["Montevideo", "Canelones", "Maldonado"]
   *                   brou:
   *                     name: "Banco República"
   *                     website: "https://www.brou.com.uy"
   *                     departments: ["Montevideo", "Canelones", "San José"]
   */
  server.getJson("localData", async (req: Request): Promise<any> => {
    const res = cambio_info.get_local_data();
    return res;
  });

  /**
   * @openapi
   * /fortex:
   *   get:
   *     tags:
   *       - Exchange Data
   *     summary: Obtener datos de Fortex
   *     description: |
   *       Retorna los tipos de cambio de Fortex para el día actual.
   *       Fortex es una plataforma de intercambio de divisas.
   *     responses:
   *       200:
   *         description: Datos de Fortex obtenidos exitosamente
   *         content:
   *           application/json:
   *             schema:
   *               type: array
   *               items:
   *                 $ref: '#/components/schemas/ExchangeData'
   */
  server.getJson("fortex", async (req: Request): Promise<any> => {
    // Ensure date is in Uruguay timezone for consistency
    const date = moment.tz("America/Montevideo").startOf("day").toDate();
    const fortex = new CambioFortex();
    const res = await fortex.get_conversions(date);
    return res;
  });

  /**
   * @openapi
   * /position_stack:
   *   get:
   *     tags:
   *       - Geocoding
   *     summary: Geocodificación inversa con PositionStack
   *     description: |
   *       Convierte coordenadas geográficas en información de ubicación
   *       utilizando el servicio PositionStack.
   *     parameters:
   *       - name: query
   *         in: query
   *         required: true
   *         description: Coordenadas en formato "latitud,longitud"
   *         schema:
   *           type: string
   *           pattern: '^-?\d+\.?\d*,-?\d+\.?\d*$'
   *         example: "-34.9173,-56.1501"
   *       - name: limit
   *         in: query
   *         required: false
   *         description: Número máximo de resultados
   *         schema:
   *           type: integer
   *           minimum: 1
   *           maximum: 100
   *           default: 1
   *     responses:
   *       200:
   *         description: Información de ubicación obtenida
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 data:
   *                   type: array
   *                   items:
   *                     type: object
   *                     properties:
   *                       latitude:
   *                         type: number
   *                       longitude:
   *                         type: number
   *                       label:
   *                         type: string
   *                       name:
   *                         type: string
   *                       country:
   *                         type: string
   *                       region:
   *                         type: string
   */
  server.getJson("position_stack", async (req: Request): Promise<any> => {
    const api = "f2b2a4c548e317a2ed6b4a570fd42241";
    const query = req.query.query as string;
    const limit = req.query.limit as string;
    const [latitude, longitude] = query.split(",").map((x) => parseFloat(x));
    const url = `http://api.positionstack.com/v1/reverse?access_key=${api}&query=${latitude},${longitude}&limit=${limit}`;
    const res = await axios
      .get(url)
      .then((res) => res.data)
      .catch(() => null);
    console.log("Response", res);
    return res;
  });

  /**
   * @openapi
   * /exchanges/{origin}:
   *   get:
   *     tags:
   *       - Locations
   *     summary: Obtener sucursales de una casa de cambio
   *     description: |
   *       Retorna las sucursales de una casa de cambio específica.
   *       Opcionalmente filtrado por ubicación.
   *       
   *       Para obtener la lista de casas de cambio válidas, use `/parameters/origins`.
   *     parameters:
   *       - $ref: '#/components/parameters/OriginParam'
   *       - $ref: '#/components/parameters/LatitudeParam'
   *       - $ref: '#/components/parameters/LongitudeParam'
   *     responses:
   *       200:
   *         description: Lista de sucursales
   *         content:
   *           application/json:
   *             schema:
   *               type: array
   *               items:
   *                 $ref: '#/components/schemas/Location'
   *       400:
   *         $ref: '#/components/responses/ValidationError'
   * 
   * /exchanges/{origin}/{location}:
   *   get:
   *     tags:
   *       - Locations
   *     summary: Obtener sucursales por casa de cambio y ubicación
   *     description: |
   *       Retorna las sucursales de una casa de cambio en una ubicación específica.
   *       
   *       Para obtener la lista de casas de cambio válidas, use `/parameters/origins`.
   *       Para obtener la lista de ubicaciones válidas, use `/parameters/locations`.
   *     parameters:
   *       - $ref: '#/components/parameters/OriginParam'
   *       - $ref: '#/components/parameters/LocationParam'
   *       - $ref: '#/components/parameters/LatitudeParam'
   *       - $ref: '#/components/parameters/LongitudeParam'
   *     responses:
   *       200:
   *         description: Lista de sucursales filtrada por ubicación
   *         content:
   *           application/json:
   *             schema:
   *               type: array
   *               items:
   *                 $ref: '#/components/schemas/Location'
   *       400:
   *         $ref: '#/components/responses/ValidationError'
   */
  server.getJson("exchanges/:origin/:location?", async (req: Request): Promise<any> => {
    const origin = req.params.origin;
    
    // Validate origin parameter
    const originValidation = validateOrigin(origin);
    if (!originValidation.isValid) {
      throw new Error(JSON.stringify(originValidation.error));
    }
    
    const latitude = parseFloat(req.query.latitude as string);
    const longitude = parseFloat(req.query.longitude as string);
    let res = await cambio_info.getExchanges(req.params.origin, req.params.location);
    if (latitude && longitude) {
      res = JSON.parse(JSON.stringify(res));
      // Add distance to entries if latitude and longitude are passed.
      console.log("Coords", latitude, longitude);
      for (let index = 0; index < res.length; index++) {
        const entry = res[index];
        console.log("Entry", entry.latitude, entry.longitude);
        if (entry.latitude && entry.longitude) {
          res[index].distance = cambio_info.getDistance({ latitude, longitude }, { latitude: entry.latitude, longitude: entry.longitude });
        } else {
          res[index].distance = 9999999;
        }
      }
    }
    return res;
  });

  /**
   * @openapi
   * /bcu/{origin}:
   *   get:
   *     tags:
   *       - BCU
   *     summary: Obtener detalles BCU por casa de cambio
   *     description: |
   *       Retorna información detallada del BCU para una casa de cambio específica.
   *       
   *       Para obtener la lista de casas de cambio válidas, use `/parameters/origins`.
   *     parameters:
   *       - $ref: '#/components/parameters/OriginParam'
   *     responses:
   *       200:
   *         description: Detalles BCU obtenidos exitosamente
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 origin:
   *                   type: string
   *                 data:
   *                   type: array
   *                   items:
   *                     $ref: '#/components/schemas/ExchangeData'
   *       400:
   *         $ref: '#/components/responses/ValidationError'
   */
  server.getJson("bcu/:origin", async (req: Request): Promise<any> => {
    const origin = req.params.origin;
    
    // Validate origin parameter
    const originValidation = validateOrigin(origin);
    if (!originValidation.isValid) {
      throw new Error(JSON.stringify(originValidation.error));
    }
    
    const x = new BCU_Details();
    const reply = await x.get_by_origin(origin);
    return reply;
  });

  /**
   * @openapi
   * /evolution/{origin}/{code}:
   *   get:
   *     tags:
   *       - Evolution
   *     summary: Obtener evolución histórica de una moneda
   *     description: |
   *       Retorna datos históricos de evolución de precios para una moneda específica
   *       en una casa de cambio durante un período determinado.
   *       
   *       Para obtener la lista de casas de cambio válidas, use `/parameters/origins`.
   *       Para obtener la lista de monedas válidas, use `/parameters/currencies`.
   *     parameters:
   *       - $ref: '#/components/parameters/OriginParam'
   *       - $ref: '#/components/parameters/CurrencyCodeParam'
   *       - $ref: '#/components/parameters/PeriodParam'
   *     responses:
   *       200:
   *         description: Datos de evolución histórica
   *         content:
   *           application/json:
   *             schema:
   *               type: array
   *               items:
   *                 $ref: '#/components/schemas/CurrencyEvolution'
   *             examples:
   *               evolution_data:
   *                 summary: Evolución del USD en La Favorita
   *                 value:
   *                   - date: "2025-08-01"
   *                     buy: 38.75
   *                     sell: 41.15
   *                     avg: 39.95
   *                   - date: "2025-08-02"
   *                     buy: 38.80
   *                     sell: 41.20
   *                     avg: 40.00
   *       400:
   *         $ref: '#/components/responses/ValidationError'
   * 
   * /evolution/{origin}/{code}/{type}:
   *   get:
   *     tags:
   *       - Evolution
   *     summary: Obtener evolución histórica por tipo de cambio
   *     description: |
   *       Retorna datos históricos de evolución de precios para un tipo específico
   *       de cambio (BILLETE, CABLE, etc.) de una moneda en una casa de cambio.
   *       
   *       Para obtener la lista de casas de cambio válidas, use `/parameters/origins`.
   *       Para obtener la lista de monedas válidas, use `/parameters/currencies`.
   *       Para obtener la lista de tipos válidos, use `/parameters/types`.
   *     parameters:
   *       - $ref: '#/components/parameters/OriginParam'
   *       - $ref: '#/components/parameters/CurrencyCodeParam'
   *       - $ref: '#/components/parameters/ExchangeTypeParam'
   *       - $ref: '#/components/parameters/PeriodParam'
   *     responses:
   *       200:
   *         description: Datos de evolución histórica por tipo
   *         content:
   *           application/json:
   *             schema:
   *               type: array
   *               items:
   *                 $ref: '#/components/schemas/CurrencyEvolution'
   *       400:
   *         $ref: '#/components/responses/ValidationError'
   */
  server.getJson("evolution/:origin/:code/:type?", async (req: Request): Promise<any> => {
    const origin = req.params.origin;
    const code = req.params.code;
    const type = req.params.type;

    // Validate origin parameter
    const originValidation = validateOrigin(origin);
    if (!originValidation.isValid) {
      throw new Error(JSON.stringify(originValidation.error));
    }

    // Validate currency code parameter (basic validation)
    if (!code || !/^[A-Z]{2,4}$/.test(code)) {
      // Get available currencies for better error message
      let availableCurrencies = [];
      try {
        const data = await cambio_info.get_data(null, {});
        availableCurrencies = [...new Set(data.map(item => item.code))].sort();
      } catch (e) {
        availableCurrencies = ['USD', 'EUR', 'ARS', 'BRL']; // fallback
      }
      
      const error = createValidationError('code', code, availableCurrencies, 'Use /parameters/currencies to get all valid currency codes');
      throw new Error(JSON.stringify(error));
    }

    // Parse period parameter (default to 6 months)
    let periodMonths = 6;
    if (req.query.period) {
      const period = parseInt(req.query.period as string);
      if (isNaN(period) || period <= 0 || period > 60) {
        const error = createValidationError('period', req.query.period as string, ['1', '2', '3', '6', '12', '24', '36', '48', '60'], 'Period must be a number between 1 and 60 months');
        throw new Error(JSON.stringify(error));
      }
      periodMonths = period;
    }

    console.log(`Evolution request: ${origin}/${code}${type ? `/${type}` : ""} for ${periodMonths} months`);

    try {
      const evolutionData = await cambio_info.get_currency_evolution(origin, code, periodMonths, type?.toLowerCase());
      return evolutionData;
    } catch (error) {
      console.error("Evolution endpoint error:", error);
      throw error;
    }
  });

  /**
   * @openapi
   * /parameters/origins:
   *   get:
   *     tags:
   *       - Parameters
   *     summary: Obtener todas las casas de cambio disponibles
   *     description: |
   *       Retorna la lista completa de todas las casas de cambio (origins) disponibles
   *       en el sistema. Útil para validar parámetros y construir interfaces de usuario.
   *     responses:
   *       200:
   *         description: Lista de casas de cambio disponibles
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 origins:
   *                   type: array
   *                   items:
   *                     type: string
   *                   description: Lista de nombres de casas de cambio
   *                 count:
   *                   type: integer
   *                   description: Número total de casas de cambio
   *             examples:
   *               success:
   *                 summary: Casas de cambio disponibles
   *                 value:
   *                   origins: ["la_favorita", "cambio_minas", "brou", "cambio_regul", "itau", "prex", "bcu", "cambilex"]
   *                   count: 42
   */
  server.getJson("parameters/origins", async (req: Request): Promise<any> => {
    const availableOrigins = Object.keys(origins).sort();
    return {
      origins: availableOrigins,
      count: availableOrigins.length
    };
  });

  /**
   * @openapi
   * /parameters/currencies:
   *   get:
   *     tags:
   *       - Parameters
   *     summary: Obtener todas las monedas disponibles
   *     description: |
   *       Retorna la lista de todas las monedas (currency codes) disponibles
   *       en el sistema, obtenidas de los datos actuales.
   *     parameters:
   *       - $ref: '#/components/parameters/DateParam'
   *     responses:
   *       200:
   *         description: Lista de monedas disponibles
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 currencies:
   *                   type: array
   *                   items:
   *                     type: string
   *                   description: Lista de códigos de moneda (ISO 4217)
   *                 count:
   *                   type: integer
   *                   description: Número total de monedas
   *             examples:
   *               success:
   *                 summary: Monedas disponibles
   *                 value:
   *                   currencies: ["USD", "EUR", "ARS", "BRL"]
   *                   count: 4
   */
  server.getJson("parameters/currencies", async (req: Request): Promise<any> => {
    let date = req.query.date as string;
    let dateM = null;
    if (date) {
      dateM = moment.tz(date, "YYYY-MM-DD", "America/Montevideo").toDate();
    }
    
    const data = await cambio_info.get_data(dateM, req.query);
    const currencies = [...new Set(data.map(item => item.code))].sort();
    
    return {
      currencies: currencies,
      count: currencies.length
    };
  });

  /**
   * @openapi
   * /parameters/types:
   *   get:
   *     tags:
   *       - Parameters
   *     summary: Obtener todos los tipos de cambio disponibles
   *     description: |
   *       Retorna la lista de todos los tipos de cambio disponibles
   *       (BILLETE, CABLE, TRANSFERENCIA, etc.) en el sistema.
   *     parameters:
   *       - $ref: '#/components/parameters/DateParam'
   *       - name: origin
   *         in: query
   *         description: Filtrar por casa de cambio específica
   *         required: false
   *         schema:
   *           type: string
   *       - name: code
   *         in: query
   *         description: Filtrar por moneda específica
   *         required: false
   *         schema:
   *           type: string
   *     responses:
   *       200:
   *         description: Lista de tipos de cambio disponibles
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 types:
   *                   type: array
   *                   items:
   *                     type: string
   *                   description: Lista de tipos de cambio
   *                 count:
   *                   type: integer
   *                   description: Número total de tipos
   *             examples:
   *               success:
   *                 summary: Tipos disponibles
   *                 value:
   *                   types: ["BILLETE", "CABLE", "TRANSFERENCIA"]
   *                   count: 3
   */
  server.getJson("parameters/types", async (req: Request): Promise<any> => {
    let date = req.query.date as string;
    let dateM = null;
    if (date) {
      dateM = moment.tz(date, "YYYY-MM-DD", "America/Montevideo").toDate();
    }
    
    const origin = req.query.origin as string;
    const code = req.query.code as string;
    
    let data = await cambio_info.get_data(dateM, req.query);
    
    // Apply filters if provided
    if (origin) {
      data = data.filter(item => item.origin === origin);
    }
    if (code) {
      data = data.filter(item => item.code === code);
    }
    
    const types = [...new Set(data.map(item => item.type).filter(Boolean))].sort();
    
    return {
      types: types,
      count: types.length
    };
  });

  /**
   * @openapi
   * /parameters/locations:
   *   get:
   *     tags:
   *       - Parameters
   *     summary: Obtener todas las ubicaciones disponibles
   *     description: |
   *       Retorna la lista de todas las ubicaciones/departamentos disponibles
   *       para buscar sucursales de casas de cambio.
   *     parameters:
   *       - name: origin
   *         in: query
   *         description: Filtrar por casa de cambio específica
   *         required: false
   *         schema:
   *           type: string
   *     responses:
   *       200:
   *         description: Lista de ubicaciones disponibles
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 locations:
   *                   type: array
   *                   items:
   *                     type: string
   *                   description: Lista de departamentos/ubicaciones
   *                 count:
   *                   type: integer
   *                   description: Número total de ubicaciones
   *             examples:
   *               success:
   *                 summary: Ubicaciones disponibles
   *                 value:
   *                   locations: ["Montevideo", "Canelones", "Maldonado"]
   *                   count: 3
   */
  server.getJson("parameters/locations", async (req: Request): Promise<any> => {
    const origin = req.query.origin as string;
    const localData = await cambio_info.get_local_data();
    
    let locations = new Set<string>();
    
    if (origin && localData[origin]) {
      // Get locations for specific origin
      if (localData[origin].departments && Array.isArray(localData[origin].departments)) {
        localData[origin].departments.forEach((dept: string) => locations.add(dept));
      }
    } else {
      // Get all locations from all origins
      Object.values(localData).forEach((data: any) => {
        if (data.departments && Array.isArray(data.departments)) {
          data.departments.forEach((dept: string) => locations.add(dept));
        }
      });
    }
    
    const sortedLocations = Array.from(locations).sort();
    
    return {
      locations: sortedLocations,
      count: sortedLocations.length
    };
  });

  /**
   * @openapi
   * /parameters/all:
   *   get:
   *     tags:
   *       - Parameters
   *     summary: Obtener todos los parámetros disponibles
   *     description: |
   *       Retorna un objeto consolidado con todos los parámetros válidos
   *       del sistema: origins, currencies, types y locations.
   *     parameters:
   *       - $ref: '#/components/parameters/DateParam'
   *     responses:
   *       200:
   *         description: Todos los parámetros disponibles
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 origins:
   *                   type: array
   *                   items:
   *                     type: string
   *                 currencies:
   *                   type: array
   *                   items:
   *                     type: string
   *                 types:
   *                   type: array
   *                   items:
   *                     type: string
   *                 locations:
   *                   type: array
   *                   items:
   *                     type: string
   *                 counts:
   *                   type: object
   *                   properties:
   *                     origins:
   *                       type: integer
   *                     currencies:
   *                       type: integer
   *                     types:
   *                       type: integer
   *                     locations:
   *                       type: integer
   *             examples:
   *               success:
   *                 summary: Todos los parámetros
   *                 value:
   *                   origins: ["la_favorita", "brou", "cambio_minas", "itau", "prex"]
   *                   currencies: ["USD", "EUR", "ARS", "BRL", "XAU", "UI"]
   *                   types: ["", "BILLETE", "CABLE", "INTERBANCARIO"]
   *                   locations: ["Montevideo", "Canelones", "Maldonado"]
   *                   counts:
   *                     origins: 42
   *                     currencies: 18
   *                     types: 8
   *                     locations: 19
   */
  server.getJson("parameters/all", async (req: Request): Promise<any> => {
    let date = req.query.date as string;
    let dateM = null;
    if (date) {
      dateM = moment.tz(date, "YYYY-MM-DD", "America/Montevideo").toDate();
    }
    
    // Get origins
    const availableOrigins = Object.keys(origins).sort();
    
    // Get currencies and types from data
    const data = await cambio_info.get_data(dateM, req.query);
    const currencies = [...new Set(data.map(item => item.code))].sort();
    const types = [...new Set(data.map(item => item.type).filter(Boolean))].sort();
    
    // Get locations
    const localData = await cambio_info.get_local_data();
    const locationsSet = new Set<string>();
    Object.values(localData).forEach((data: any) => {
      if (data.departments && Array.isArray(data.departments)) {
        data.departments.forEach((dept: string) => locationsSet.add(dept));
      }
    });
    const locations = Array.from(locationsSet).sort();
    
    return {
      origins: availableOrigins,
      currencies: currencies,
      types: types,
      locations: locations,
      counts: {
        origins: availableOrigins.length,
        currencies: currencies.length,
        types: types.length,
        locations: locations.length
      }
    };
  });
};

main();
