import express from "express";
import swaggerUi from "swagger-ui-express";
import { swaggerSpec } from "./swagger/config";

const app = express();
const port = 3529;

// Basic middleware
app.use(express.json());

// Swagger setup
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
app.get("/api-docs.json", (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(swaggerSpec);
});

// Serve Swagger UI
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec, swaggerOptions));

// Test endpoint
app.get("/test", (req, res) => {
  res.json({ message: "Swagger test server is working!", timestamp: new Date().toISOString() });
});

// Root endpoint
app.get("/", (req, res) => {
  res.json({ 
    message: "Cambio Uruguay API", 
    documentation: `http://localhost:${port}/api-docs`,
    test: `http://localhost:${port}/test`
  });
});

app.listen(port, () => {
  console.log(`🚀 Test server running at: http://localhost:${port}`);
  console.log(`📚 Swagger documentation available at: http://localhost:${port}/api-docs`);
  console.log(`🧪 Test endpoint available at: http://localhost:${port}/test`);
}).on('error', (err: any) => {
  console.error('❌ Server error:', err);
  if (err.code === 'EADDRINUSE') {
    console.error(`❌ Port ${port} is already in use. Please kill the existing process or use a different port.`);
  }
});

// Keep the process alive
process.on('SIGINT', () => {
  console.log('\n👋 Gracefully shutting down...');
  process.exit(0);
});

console.log('⏳ Starting Swagger test server...');
