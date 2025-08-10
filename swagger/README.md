# 📚 Cambio Uruguay API Documentation

## 🎯 Overview

This project now includes comprehensive **Swagger/OpenAPI 3.0** documentation for all API endpoints. The integration provides an interactive interface where developers can explore, test, and understand how to use the Cambio Uruguay API.

## 🚀 Access the Documentation

### Production API Documentation
- **Live Documentation**: [https://api.cambio-uruguay.com/api-docs](https://api.cambio-uruguay.com/api-docs)
- **JSON Spec**: [https://api.cambio-uruguay.com/api-docs.json](https://api.cambio-uruguay.com/api-docs.json)

### Local Development
If running locally on port 3528:
- **Documentation**: [http://localhost:3528/api-docs](http://localhost:3528/api-docs)
- **JSON Spec**: [http://localhost:3528/api-docs.json](http://localhost:3528/api-docs.json)

## 📋 Available Endpoints

### 🏥 Health & Status
- `GET /health` - API health check with database connectivity status
- `GET /status` - Simple API status check

### 💱 Exchange Rates
- `GET /exchanges/{date}` - Get all exchange rates for a specific date
- `GET /exchanges/processed/{date}` - Get processed exchange data with additional metadata

### 🏛️ Central Bank (BCU)
- `GET /bcu/details` - Get detailed BCU exchange rates

### 🌍 Locations & Geography
- `GET /locations` - Get all exchange house locations
- `GET /locations/geocode` - Convert address to coordinates (with caching)

### 📈 Evolution & History
- `GET /evolution/{origin}` - Get historical data for a specific exchange house
- `GET /evolution/{origin}/{currency}` - Get currency-specific evolution data

## 🛠️ Technical Implementation

### Dependencies Added
```json
{
  "swagger-jsdoc": "^6.2.8",
  "swagger-ui-express": "^5.0.1",
  "@types/swagger-jsdoc": "^6.0.4",
  "@types/swagger-ui-express": "^4.1.6"
}
```

### Key Files
- `swagger/config.ts` - Main Swagger configuration with OpenAPI specification
- `classes/Express/Express.ts` - Express class with Swagger UI integration
- `index.ts` - All endpoints documented with JSDoc annotations

### Features
- ✅ **Interactive Documentation** - Try out endpoints directly in the browser
- ✅ **Comprehensive Schemas** - Detailed request/response models
- ✅ **Example Data** - Real examples for all endpoints
- ✅ **Error Handling** - Documented error responses
- ✅ **Custom Styling** - Branded UI matching the site theme
- ✅ **Multi-language Support** - Documentation available in multiple languages

## 🎨 UI Customization

The Swagger UI includes:
- Custom CSS with Cambio Uruguay branding
- Hidden download URL wrapper for cleaner interface
- Enhanced color scheme matching the main website
- Collapsible sections for better navigation
- Try-it-out functionality enabled

## 📱 Frontend Integration

The API documentation is integrated into the main website:

### Footer Integration
- API documentation icon in the footer with tooltip
- Direct link to production API docs

### Home Page Feature
- Fifth feature card highlighting API availability
- Clickable card that opens documentation in new tab
- Multilingual support (Spanish, English, Portuguese)

### Translation Keys Added
```json
{
  "feature5Title": "API available",
  "feature5Description": "Access our data through our REST API",
  "apiDocumentation": "API Documentation"
}
```

## 🚀 Usage Examples

### JavaScript/Node.js
```javascript
// Get current exchange rates
const response = await fetch('https://api.cambio-uruguay.com/exchanges/2024-01-15');
const data = await response.json();
console.log(data.exchangeData);
```

### Python
```python
import requests

# Get BCU details
response = requests.get('https://api.cambio-uruguay.com/bcu/details')
data = response.json()
print(data)
```

### cURL
```bash
# Check API health
curl -X GET "https://api.cambio-uruguay.com/health" \
  -H "accept: application/json"
```

## 🔧 Development

### Running Locally
1. Install dependencies: `npm install`
2. Start the server: `npm start` or `npx ts-node index.ts`
3. Access documentation at: `http://localhost:3528/api-docs`

### Testing Swagger Configuration
```bash
# Test configuration loading
npx ts-node -e "
const { swaggerSpec } = require('./swagger/config');
console.log('API Documentation ready!');
console.log('Endpoints:', Object.keys(swaggerSpec.paths).length);
"
```

## 📖 Documentation Standards

All endpoints follow OpenAPI 3.0 specifications with:
- Detailed parameter descriptions
- Response schema definitions
- Example requests and responses
- Error code documentation
- Security considerations

## 🔗 Links

- **Main Website**: [https://cambio-uruguay.com](https://cambio-uruguay.com)
- **API Documentation**: [https://api.cambio-uruguay.com/api-docs](https://api.cambio-uruguay.com/api-docs)
- **GitHub Repository**: [https://github.com/your-repo/cambio-uruguay](https://github.com/your-repo/cambio-uruguay)

---

*Built with ❤️ by the Cambio Uruguay team*
