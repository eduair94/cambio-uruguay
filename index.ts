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
   *                   - origin: "abitab"
   *                     code: "USD"
   *                     type: "BILLETE"
   *                     buy: 39.50
   *                     sell: 42.30
   *                     date: "2024-08-09T12:00:00.000Z"
   *                     isInterBank: false
   *                   - origin: "redpagos"
   *                     code: "EUR"
   *                     type: "BILLETE"
   *                     buy: 42.80
   *                     sell: 46.20
   *                     date: "2024-08-09T12:00:00.000Z"
   *                     isInterBank: false
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
   *     parameters:
   *       - name: type
   *         in: path
   *         required: true
   *         description: Nombre de la casa de cambio
   *         schema:
   *           type: string
   *           enum: [abitab, redpagos, cambilex, brou, bbva, santander, itau, scotiabank, prex]
   *         example: abitab
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
   *         $ref: '#/components/responses/BadRequest'
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
   *     parameters:
   *       - name: type
   *         in: path
   *         required: true
   *         description: Nombre de la casa de cambio
   *         schema:
   *           type: string
   *           enum: [abitab, redpagos, cambilex, brou, bbva, santander, itau, scotiabank, prex]
   *         example: abitab
   *       - name: code
   *         in: path
   *         required: true
   *         description: Código de la moneda (ISO 4217)
   *         schema:
   *           type: string
   *           enum: [USD, EUR, ARS, BRL, CLP]
   *         example: USD
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
   *                   origin: "abitab"
   *                   code: "USD"
   *                   type: "BILLETE"
   *                   buy: 39.50
   *                   sell: 42.30
   *                   date: "2024-08-09T12:00:00.000Z"
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
   *               origin: "abitab"
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
   *                   - name: "Abitab Pocitos"
   *                     address: "Av. Brasil 2536"
   *                     latitude: -34.9173
   *                     longitude: -56.1501
   *                     department: "Montevideo"
   *                     distance: 1250.5
   *                   - name: "RedPagos Centro"
   *                     address: "18 de Julio 1234"
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
   *                   abitab:
   *                     name: "Abitab"
   *                     website: "https://www.abitab.com.uy"
   *                     departments: ["Montevideo", "Canelones", "Maldonado"]
   *                   redpagos:
   *                     name: "RedPagos"
   *                     website: "https://www.redpagos.com.uy"
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
   *     parameters:
   *       - name: origin
   *         in: path
   *         required: true
   *         description: Nombre de la casa de cambio
   *         schema:
   *           type: string
   *           enum: [abitab, redpagos, cambilex, brou, bbva, santander, itau, scotiabank]
   *         example: abitab
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
   *         description: Casa de cambio no válida
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/ErrorResponse'
   * 
   * /exchanges/{origin}/{location}:
   *   get:
   *     tags:
   *       - Locations
   *     summary: Obtener sucursales por casa de cambio y ubicación
   *     description: |
   *       Retorna las sucursales de una casa de cambio en una ubicación específica.
   *     parameters:
   *       - name: origin
   *         in: path
   *         required: true
   *         description: Nombre de la casa de cambio
   *         schema:
   *           type: string
   *         example: abitab
   *       - name: location
   *         in: path
   *         required: true
   *         description: Nombre de la ubicación o departamento
   *         schema:
   *           type: string
   *         example: Montevideo
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
   */
  server.getJson("exchanges/:origin/:location?", async (req: Request): Promise<any> => {
    const validOrigin = Object.keys(origins).includes(req.params.origin);
    if (!validOrigin) {
      throw new Error("Invalid origin");
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
   *     parameters:
   *       - name: origin
   *         in: path
   *         required: true
   *         description: Nombre de la casa de cambio
   *         schema:
   *           type: string
   *         example: abitab
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
   *         description: Casa de cambio no válida
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/ErrorResponse'
   */
  server.getJson("bcu/:origin", async (req: Request): Promise<any> => {
    const validOrigin = Object.keys(origins).includes(req.params.origin);
    if (!validOrigin) {
      throw new Error("Invalid origin");
    }
    const x = new BCU_Details();
    const origin = req.params.origin;
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
   *     parameters:
   *       - name: origin
   *         in: path
   *         required: true
   *         description: Nombre de la casa de cambio
   *         schema:
   *           type: string
   *         example: abitab
   *       - name: code
   *         in: path
   *         required: true
   *         description: Código de la moneda (ISO 4217)
   *         schema:
   *           type: string
   *           enum: [USD, EUR, ARS, BRL, CLP]
   *         example: USD
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
   *                 summary: Evolución del USD en Abitab
   *                 value:
   *                   - date: "2024-08-01"
   *                     buy: 39.20
   *                     sell: 42.10
   *                     avg: 40.65
   *                   - date: "2024-08-02"
   *                     buy: 39.30
   *                     sell: 42.20
   *                     avg: 40.75
   *       400:
   *         description: Parámetros inválidos
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/ErrorResponse'
   * 
   * /evolution/{origin}/{code}/{type}:
   *   get:
   *     tags:
   *       - Evolution
   *     summary: Obtener evolución histórica por tipo de cambio
   *     description: |
   *       Retorna datos históricos de evolución de precios para un tipo específico
   *       de cambio (BILLETE, CABLE, etc.) de una moneda en una casa de cambio.
   *     parameters:
   *       - name: origin
   *         in: path
   *         required: true
   *         description: Nombre de la casa de cambio
   *         schema:
   *           type: string
   *         example: abitab
   *       - name: code
   *         in: path
   *         required: true
   *         description: Código de la moneda (ISO 4217)
   *         schema:
   *           type: string
   *         example: USD
   *       - name: type
   *         in: path
   *         required: true
   *         description: Tipo de cambio
   *         schema:
   *           type: string
   *           enum: [BILLETE, CABLE, TRANSFERENCIA]
   *         example: BILLETE
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
   *         description: Parámetros inválidos
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/ErrorResponse'
   */
  server.getJson("evolution/:origin/:code/:type?", async (req: Request): Promise<any> => {
    const origin = req.params.origin;
    const code = req.params.code;
    const type = req.params.type;

    // Validate origin parameter
    const validOrigin = Object.keys(origins).includes(origin);
    if (!validOrigin) {
      throw new Error(`Invalid origin: ${origin}. Valid origins are: ${Object.keys(origins).join(", ")}`);
    }

    // Validate currency code parameter (basic validation)
    if (!code) {
      throw new Error(`Invalid currency code: ${code}. Currency code should be 2-4 characters (e.g., USD, ARS, BRL, EUR)`);
    } // Validate type parameter if provided (currency subtype like BILLETE, CABLE, etc.)

    // Parse period parameter (default to 6 months)
    let periodMonths = 6;
    if (req.query.period) {
      const period = parseInt(req.query.period as string);
      if (isNaN(period) || period <= 0 || period > 60) {
        throw new Error("Period must be a number between 1 and 60 months");
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
};

main();
