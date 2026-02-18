import express from "express";
import { apiReference } from "@scalar/express-api-reference";
import { swaggerSpec } from "./swagger/config";

const app = express();
const port = 3529;

// Basic middleware
app.use(express.json());

// Serve Swagger JSON endpoint
app.get("/api-docs.json", (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(swaggerSpec);
});

// Serve Scalar API Reference
app.use(
  "/api-docs",
  apiReference({
    url: '/api-docs.json',
    theme: 'purple',
    layout: 'modern',
    darkMode: true,
    metaData: {
      title: 'Cambio Uruguay API Documentation',
      description: 'API completa para obtener tipos de cambio y información de casas de cambio en Uruguay',
    },
  })
);

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
