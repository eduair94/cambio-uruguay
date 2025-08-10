import bodyParser from "body-parser";
import cors from "cors";
import express, { Request, Response } from "express";
import { RecaptchaV2 } from "express-recaptcha";
import { ValidationChain, validationResult } from "express-validator";
import swaggerUi from "swagger-ui-express";
import * as http from "http";
import { bError } from "../utils";
import { FunctionExpress } from "./Express.interface";
import { swaggerSpec } from "../../swagger/config";

class Express {
  private port: number;
  private app: express.Application = express();
  private baseUrl: string;
  private recaptcha: RecaptchaV2;

  constructor(
    port: number,
    baseUrl: string,
    recaptchaKey: { siteKey: string; secretKey: string } = {
      siteKey: "",
      secretKey: "",
    }
  ) {
    this.baseUrl = baseUrl;
    this.port = port;
    if (recaptchaKey.siteKey) {
      this.recaptcha = new RecaptchaV2(recaptchaKey.siteKey, recaptchaKey.secretKey);
    }
    const origin = process.env.origin;
    console.log("ORIGIN", origin);

    // Configure CORS to avoid Vary: * headers
    this.app.use(
      cors({
        origin: origin || "*",
        credentials: false,
        optionsSuccessStatus: 200, // Some legacy browsers choke on 204
      })
    );

    // Add middleware to ensure cache-friendly headers
    this.app.use((req, res, next) => {
      // Remove problematic Vary headers that could include *
      res.removeHeader("Vary"); // Set cache-friendly headers for API responses
      res.set({
        "Cache-Control": "public, max-age=5, s-maxage=5", // 5 seconds
        Vary: "Accept-Encoding", // Only vary on encoding, not on everything
      });
      next();
    });

    this.app.use(bodyParser.json({ limit: "50mb" }));
    this.app.set("trust proxy", true);
    this.app.use(bodyParser.urlencoded({ extended: false }));
    this.setupSwagger();
    this.start();
  }

  public getApp(): express.Application {
    return this.app;
  }

  public getRecaptchaMiddleWare() {
    return this.recaptcha.middleware.verify;
  }

  private setupSwagger(): void {
    // Swagger UI options for better customization
    const swaggerOptions = {
      explorer: true,
      customCss: `
        .swagger-ui .topbar { 
          background-color: #2c3e50; 
        }
        .swagger-ui .topbar .download-url-wrapper { 
          display: none; 
        }
        .swagger-ui .info .title {
          color: #2c3e50;
        }
        .swagger-ui .scheme-container {
          background: #f8f9fa;
          border: 1px solid #dee2e6;
          border-radius: 5px;
          padding: 10px;
          margin: 10px 0;
        }
      `,
      customSiteTitle: "Cambio Uruguay API Documentation",
      swaggerOptions: {
        docExpansion: 'list',
        filter: true,
        showRequestHeaders: true,
        tryItOutEnabled: true,
        validatorUrl: null
      }
    };

    // Serve Swagger JSON endpoint
    this.app.get(`${this.baseUrl}api-docs.json`, (req: Request, res: Response) => {
      res.setHeader('Content-Type', 'application/json');
      res.send(swaggerSpec);
    });

    // Serve Swagger UI
    this.app.use(
      `${this.baseUrl}api-docs`, 
      swaggerUi.serve, 
      swaggerUi.setup(swaggerSpec, swaggerOptions)
    );

    console.log(`📚 Swagger documentation available at: http://localhost:${this.port}${this.baseUrl}api-docs`);
  }
  public getJson(requestUrl: string, f: FunctionExpress): void {
    this.app.get(`${this.baseUrl}${requestUrl}`, async (req: Request, res: Response) => {
      // Ensure cache-friendly headers for API responses
      res.removeHeader("Vary");
      res.set({
        "Cache-Control": "public, max-age=5, s-maxage=5",
        Vary: "Accept-Encoding",
        "Content-Type": "application/json",
      });

      const result: any = await f(req, res).catch((e) => {
        return bError(e.message);
      });
      if (result?.error) {
        return res.status(500).json(result);
      }
      res.json(result);
    });
  }

  public get(requestUrl: string, f: any): void {
    this.app.get(`${this.baseUrl}${requestUrl}`, async (req: Request, res: Response) => {
      f(req, res).catch((e) => {
        res.status(404);
        res.end();
      });
    });
  }

  public confirmPull(requestUrl: string, f: FunctionExpress): void {
    this.app.post(`${this.baseUrl}${requestUrl}`, async (req: Request, res: Response) => {
      res.json({ received: true });
      const result: any = await f(req);
    });
  }
  public postJson(requestUrl: string, f: FunctionExpress, validation: ValidationChain[] = []): void {
    this.app.post(`${this.baseUrl}${requestUrl}`, validation, async (req: Request, res: Response) => {
      // Ensure cache-friendly headers
      res.removeHeader("Vary");
      res.set({
        "Content-Type": "application/json",
        Vary: "Accept-Encoding",
      });

      const errors = validationResult(req);
      if (!errors.isEmpty()) return res.json({ error: errors.array() });
      const result: any = await f(req).catch((e) => {
        console.error(e);
        return bError(e.message);
      });
      res.json(result);
    });
  }
  public postJsonRecaptcha(requestUrl: string, f: FunctionExpress, validation: ValidationChain[] = []): void {
    this.app.post(`${this.baseUrl}${requestUrl}`, this.recaptcha.middleware.verify, async (req: Request, res: Response) => {
      // Ensure cache-friendly headers
      res.removeHeader("Vary");
      res.set({
        "Content-Type": "application/json",
        Vary: "Accept-Encoding",
      });

      if (!req["recaptcha"]["error"]) {
        const errors = validationResult(req);
        if (!errors.isEmpty()) return res.json({ error: errors.array() });
        const result: any = await f(req).catch((e) => {
          return bError(e.message);
        });
        res.json(result);
      } else {
        res.json({ error: "Bad recaptcha" });
      }
    });
  }

  async start() {
    const server = http.createServer(this.app);
    server.listen(this.port, () => {
      console.log("Express server listening on port " + this.port);
    });
    server.on("error", function (e) {
      console.log(`Not connected to express ${e.message}`);
    });
  }
}

export default Express;
