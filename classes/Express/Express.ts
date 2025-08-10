import bodyParser from "body-parser";
import cors from "cors";
import express, { Request, Response } from "express";
import { RecaptchaV2 } from "express-recaptcha";
import { ValidationChain, validationResult } from "express-validator";
import * as http from "http";
import swaggerUi from "swagger-ui-express";
import { swaggerSpec } from "../../swagger/config";
import { bError } from "../utils";
import { FunctionExpress } from "./Express.interface";

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
          padding: 10px 0;
        }
        /* Custom styles for datalist inputs */
        .parameter-input-wrapper {
          position: relative;
        }
        .parameter-suggestions {
          position: absolute;
          top: 100%;
          left: 0;
          right: 0;
          background: white;
          border: 1px solid #ccc;
          border-top: none;
          max-height: 200px;
          overflow-y: auto;
          z-index: 1000;
          display: none;
        }
        .parameter-suggestion-item {
          padding: 8px 12px;
          cursor: pointer;
          border-bottom: 1px solid #eee;
        }
        .parameter-suggestion-item:hover {
          background-color: #f5f5f5;
        }
        .parameter-suggestion-item:last-child {
          border-bottom: none;
        }
      `,
      customSiteTitle: "Cambio Uruguay API Documentation",
      customJs: `
        // Enhanced parameter inputs with dynamic datalists
        (function() {
          let apiCache = {};
          const API_BASE = window.location.origin;
          
          // Fetch API parameters with caching
          async function fetchApiParameters(endpoint) {
            if (apiCache[endpoint]) {
              return apiCache[endpoint];
            }
            
            try {
              const response = await fetch(\`\${API_BASE}/parameters/\${endpoint}\`);
              const data = await response.json();
              apiCache[endpoint] = data;
              return data;
            } catch (error) {
              console.warn(\`Failed to fetch \${endpoint} parameters:\`, error);
              return null;
            }
          }
          
          // Create enhanced input with suggestions
          function createEnhancedInput(input, suggestions, paramType) {
            const wrapper = document.createElement('div');
            wrapper.className = 'parameter-input-wrapper';
            
            // Replace input with wrapper
            input.parentNode.insertBefore(wrapper, input);
            wrapper.appendChild(input);
            
            // Create suggestions container
            const suggestionsContainer = document.createElement('div');
            suggestionsContainer.className = 'parameter-suggestions';
            wrapper.appendChild(suggestionsContainer);
            
            // Add placeholder text based on parameter type
            const placeholders = {
              'origins': 'Ej: la_favorita, brou, cambio_minas...',
              'currencies': 'Ej: USD, EUR, ARS, BRL...',
              'types': 'Ej: BILLETE, CABLE, INTERBANCARIO...',
              'locations': 'Ej: Montevideo, Canelones, Maldonado...'
            };
            
            if (placeholders[paramType]) {
              input.placeholder = placeholders[paramType];
            }
            
            // Show suggestions on focus/input
            function showSuggestions() {
              const value = input.value.toLowerCase();
              const filtered = suggestions.filter(item => 
                item.toLowerCase().includes(value)
              ).slice(0, 10); // Limit to 10 suggestions
              
              suggestionsContainer.innerHTML = '';
              
              if (filtered.length > 0 && value !== '') {
                filtered.forEach(suggestion => {
                  const item = document.createElement('div');
                  item.className = 'parameter-suggestion-item';
                  item.textContent = suggestion;
                  item.onclick = () => {
                    input.value = suggestion;
                    hideSuggestions();
                    input.dispatchEvent(new Event('input', { bubbles: true }));
                  };
                  suggestionsContainer.appendChild(item);
                });
                suggestionsContainer.style.display = 'block';
              } else {
                hideSuggestions();
              }
            }
            
            function hideSuggestions() {
              suggestionsContainer.style.display = 'none';
            }
            
            // Event listeners
            input.addEventListener('input', showSuggestions);
            input.addEventListener('focus', showSuggestions);
            input.addEventListener('blur', () => {
              // Delay hiding to allow clicking on suggestions
              setTimeout(hideSuggestions, 200);
            });
            
            // Keyboard navigation
            input.addEventListener('keydown', (e) => {
              const items = suggestionsContainer.querySelectorAll('.parameter-suggestion-item');
              let currentIndex = -1;
              
              // Find currently highlighted item
              items.forEach((item, index) => {
                if (item.classList.contains('highlighted')) {
                  currentIndex = index;
                }
              });
              
              if (e.key === 'ArrowDown') {
                e.preventDefault();
                const nextIndex = currentIndex < items.length - 1 ? currentIndex + 1 : 0;
                highlightItem(items, nextIndex);
              } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                const prevIndex = currentIndex > 0 ? currentIndex - 1 : items.length - 1;
                highlightItem(items, prevIndex);
              } else if (e.key === 'Enter' && currentIndex >= 0) {
                e.preventDefault();
                items[currentIndex].click();
              } else if (e.key === 'Escape') {
                hideSuggestions();
              }
            });
            
            function highlightItem(items, index) {
              items.forEach(item => item.classList.remove('highlighted'));
              if (items[index]) {
                items[index].classList.add('highlighted');
                items[index].style.backgroundColor = '#e3f2fd';
              }
            }
          }
          
          // Process parameter inputs
          async function enhanceParameterInputs() {
            const parameterMappings = [
              { 
                selector: 'input[placeholder*="origin"], input[data-param*="origin"]',
                endpoint: 'origins',
                arrayKey: 'origins'
              },
              { 
                selector: 'input[placeholder*="code"], input[data-param*="currency"]',
                endpoint: 'currencies', 
                arrayKey: 'currencies'
              },
              { 
                selector: 'input[placeholder*="type"], input[data-param*="type"]',
                endpoint: 'types',
                arrayKey: 'types'
              },
              { 
                selector: 'input[placeholder*="location"], input[data-param*="location"]',
                endpoint: 'locations',
                arrayKey: 'locations'
              }
            ];
            
            for (const mapping of parameterMappings) {
              const data = await fetchApiParameters(mapping.endpoint);
              if (data && data[mapping.arrayKey]) {
                const inputs = document.querySelectorAll(mapping.selector);
                inputs.forEach(input => {
                  if (!input.hasAttribute('data-enhanced')) {
                    createEnhancedInput(input, data[mapping.arrayKey], mapping.endpoint);
                    input.setAttribute('data-enhanced', 'true');
                  }
                });
              }
            }
          }
          
          // Enhanced parameter detection based on OpenAPI spec
          function enhanceParameterInputsAdvanced() {
            // Look for parameter inputs in Swagger UI
            const observer = new MutationObserver((mutations) => {
              mutations.forEach((mutation) => {
                mutation.addedNodes.forEach((node) => {
                  if (node.nodeType === 1) { // Element node
                    // Check for parameter inputs
                    const paramInputs = node.querySelectorAll ? 
                      node.querySelectorAll('input[placeholder], input[name]') : [];
                    
                    paramInputs.forEach(async (input) => {
                      if (input.hasAttribute('data-enhanced')) return;
                      
                      const placeholder = input.placeholder?.toLowerCase() || '';
                      const name = input.name?.toLowerCase() || '';
                      const label = input.closest('.parameter__name')?.textContent?.toLowerCase() || '';
                      
                      let paramType = null;
                      let endpoint = null;
                      let arrayKey = null;
                      
                      if (placeholder.includes('origin') || name.includes('origin') || label.includes('origin')) {
                        paramType = 'origins';
                        endpoint = 'origins';
                        arrayKey = 'origins';
                      } else if (placeholder.includes('code') || name.includes('code') || label.includes('currency')) {
                        paramType = 'currencies';
                        endpoint = 'currencies';
                        arrayKey = 'currencies';
                      } else if (placeholder.includes('type') || name.includes('type')) {
                        paramType = 'types';
                        endpoint = 'types';
                        arrayKey = 'types';
                      } else if (placeholder.includes('location') || name.includes('location')) {
                        paramType = 'locations';
                        endpoint = 'locations';
                        arrayKey = 'locations';
                      }
                      
                      if (paramType) {
                        const data = await fetchApiParameters(endpoint);
                        if (data && data[arrayKey]) {
                          createEnhancedInput(input, data[arrayKey], paramType);
                          input.setAttribute('data-enhanced', 'true');
                        }
                      }
                    });
                  }
                });
              });
            });
            
            observer.observe(document.body, {
              childList: true,
              subtree: true
            });
          }
          
          // Initialize when DOM is ready
          if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
              setTimeout(enhanceParameterInputsAdvanced, 1000);
            });
          } else {
            setTimeout(enhanceParameterInputsAdvanced, 1000);
          }
          
          // Also try to enhance existing inputs periodically
          setInterval(() => {
            enhanceParameterInputs();
          }, 3000);
          
        })();
      `,
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
