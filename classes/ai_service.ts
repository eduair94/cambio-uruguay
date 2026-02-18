import dotenv from "dotenv";
import OpenAI from "openai";
import { CambioObj } from "../interfaces/Cambio";
import { redisCache } from "./redis_cache";

dotenv.config();

// Language-specific system prompts
const SYSTEM_PROMPTS: Record<string, string> = {
  es: `Eres un analista financiero experto en el mercado de cambios de Uruguay. 
Proporcionas insights claros, concisos y útiles sobre las cotizaciones de divisas.
Responde siempre en español. Usa formato Markdown para estructurar tu respuesta.
Incluye emojis relevantes para hacer la información más visual.
Sé directo y práctico, enfocándote en información que el usuario pueda usar para tomar decisiones.
No te extiendas demasiado, mantén las respuestas concisas pero informativas.`,

  en: `You are a financial analyst expert in the Uruguayan currency exchange market.
You provide clear, concise, and useful insights about currency exchange rates.
Always respond in English. Use Markdown format to structure your response.
Include relevant emojis to make information more visual.
Be direct and practical, focusing on information users can act on.
Keep responses concise but informative.`,

  pt: `Você é um analista financeiro especialista no mercado de câmbio do Uruguai.
Você fornece insights claros, concisos e úteis sobre as taxas de câmbio de moedas.
Responda sempre em português. Use formato Markdown para estruturar sua resposta.
Inclua emojis relevantes para tornar a informação mais visual.
Seja direto e prático, focando em informações que o usuário possa usar para tomar decisões.
Mantenha as respostas concisas mas informativas.`,
};

interface InsightRequest {
  type: "market_summary" | "currency_analysis" | "best_rates" | "trend_analysis" | "custom";
  language: string;
  currency?: string;
  origin?: string;
  customPrompt?: string;
  exchangeData?: any[];
  evolutionData?: any;
}

interface InsightResponse {
  insight: string;
  type: string;
  timestamp: string;
  language: string;
  cached: boolean;
}

// Cache TTL in seconds for Redis
const AI_CACHE_TTL = 600; // 10 minutes
const AI_CACHE_PREFIX = "ai:";

class AIService {
  private client: OpenAI | null = null;
  private model: string;

  constructor() {
    const baseURL = process.env.AI_BASE_URL;
    const apiKey = process.env.AI_API_KEY;
    this.model = process.env.AI_MODEL || "gpt-4o-mini";

    if (baseURL && apiKey && apiKey !== "your_api_key_here") {
      this.client = new OpenAI({
        baseURL,
        apiKey,
      });
      console.log(`🤖 AI Service initialized with model: ${this.model}`);
    } else {
      console.warn("⚠️ AI Service not configured. Set AI_BASE_URL and AI_API_KEY in .env");
    }
  }

  isConfigured(): boolean {
    return this.client !== null;
  }

  private getCacheKey(request: InsightRequest): string {
    return `${AI_CACHE_PREFIX}${request.type}_${request.language}_${request.currency || "all"}_${request.origin || "all"}`;
  }

  private async getCached(key: string): Promise<InsightResponse | null> {
    const data = await redisCache.get<InsightResponse>(key);
    if (data) {
      return { ...data, cached: true };
    }
    return null;
  }

  private async setCache(key: string, data: InsightResponse): Promise<void> {
    await redisCache.set(key, data, AI_CACHE_TTL);
  }

  private buildPrompt(request: InsightRequest, exchangeData: CambioObj[]): string {
    const { type, currency, origin, customPrompt } = request;

    // Build data summary for context
    let dataSummary = "";
    if (exchangeData && exchangeData.length > 0) {
      // Group by currency
      const byCurrency: Record<string, any[]> = {};
      for (const item of exchangeData) {
        if (!byCurrency[item.code]) byCurrency[item.code] = [];
        byCurrency[item.code].push({
          origin: item.origin,
          buy: item.buy,
          sell: item.sell,
          type: item.type || "",
        });
      }

      dataSummary = "Datos actuales de cotizaciones:\n";
      for (const [code, entries] of Object.entries(byCurrency)) {
        if (currency && code !== currency.toUpperCase()) continue;
        const buyRates = entries.map((e) => e.buy).filter((b) => b > 0);
        const sellRates = entries.map((e) => e.sell).filter((s) => s > 0);
        if (buyRates.length === 0) continue;

        dataSummary += `\n${code}: ${entries.length} casas de cambio\n`;
        dataSummary += `  Compra: min=${Math.min(...buyRates).toFixed(2)}, max=${Math.max(...buyRates).toFixed(2)}, promedio=${(buyRates.reduce((a, b) => a + b, 0) / buyRates.length).toFixed(2)}\n`;
        dataSummary += `  Venta: min=${Math.min(...sellRates).toFixed(2)}, max=${Math.max(...sellRates).toFixed(2)}, promedio=${(sellRates.reduce((a, b) => a + b, 0) / sellRates.length).toFixed(2)}\n`;

        // Top 3 best buy and sell
        const sortedBuy = entries.filter((e) => e.buy > 0).sort((a, b) => b.buy - a.buy);
        const sortedSell = entries.filter((e) => e.sell > 0).sort((a, b) => a.sell - b.sell);
        if (sortedBuy.length > 0) {
          dataSummary += `  Mejores compras: ${sortedBuy
            .slice(0, 3)
            .map((e) => `${e.origin}(${e.buy})`)
            .join(", ")}\n`;
        }
        if (sortedSell.length > 0) {
          dataSummary += `  Mejores ventas: ${sortedSell
            .slice(0, 3)
            .map((e) => `${e.origin}(${e.sell})`)
            .join(", ")}\n`;
        }
      }
    }

    // Add evolution data if present
    let evolutionSummary = "";
    if (request.evolutionData) {
      const evo = request.evolutionData;
      evolutionSummary = `\nDatos de evolución histórica:\n`;
      if (evo.statistics) {
        const stats = evo.statistics;
        if (stats.buy) {
          evolutionSummary += `  Compra - Min: ${stats.buy.min}, Max: ${stats.buy.max}, Promedio: ${stats.buy.avg?.toFixed(2)}, Cambio: ${stats.buy.change?.toFixed(2)}%\n`;
        }
        if (stats.sell) {
          evolutionSummary += `  Venta - Min: ${stats.sell.min}, Max: ${stats.sell.max}, Promedio: ${stats.sell.avg?.toFixed(2)}, Cambio: ${stats.sell.change?.toFixed(2)}%\n`;
        }
        if (stats.dateRange) {
          evolutionSummary += `  Período: ${stats.dateRange.periodMonths} meses (${stats.totalDataPoints} datos)\n`;
        }
      }
    }

    switch (type) {
      case "market_summary":
        return `Analiza el mercado de cambios de Uruguay con los siguientes datos y proporciona un resumen breve del estado actual del mercado. Incluye:
1. Estado general del mercado
2. Mejores oportunidades para comprar/vender
3. Spread promedio del mercado
4. Recomendación general

${dataSummary}`;

      case "currency_analysis":
        return `Analiza en detalle la cotización de ${currency || "USD"} en Uruguay con los siguientes datos. Incluye:
1. Rango actual de precios
2. Dónde conviene comprar y vender
3. Spread entre las casas de cambio
4. Contexto del mercado

${dataSummary}${evolutionSummary}`;

      case "best_rates":
        return `Con los siguientes datos, identifica las mejores oportunidades de cambio. Para cada moneda principal (USD, EUR, ARS, BRL):
1. Mejor lugar para comprar (la casa que más te paga)
2. Mejor lugar para vender (la casa que menos te cobra)
3. Diferencia con el promedio del mercado

Sé conciso y directo.

${dataSummary}`;

      case "trend_analysis":
        return `Analiza las tendencias del ${currency || "USD"} en el mercado uruguayo basándote en estos datos históricos. Incluye:
1. Tendencia actual (alcista/bajista/lateral)
2. Volatilidad reciente
3. Niveles clave de soporte y resistencia
4. Perspectiva a corto plazo

${dataSummary}${evolutionSummary}`;

      case "custom":
        return `${customPrompt || "Proporciona un análisis del mercado de cambios de Uruguay."}\n\nDatos disponibles:\n${dataSummary}${evolutionSummary}`;

      default:
        return `Proporciona insights útiles sobre el mercado de cambios de Uruguay.\n${dataSummary}`;
    }
  }

  async getInsight(request: InsightRequest, exchangeData: CambioObj[]): Promise<InsightResponse> {
    if (!this.client) {
      throw new Error("AI Service is not configured. Set AI_BASE_URL and AI_API_KEY in .env");
    }

    // Check cache (except for custom prompts)
    if (request.type !== "custom") {
      const cacheKey = this.getCacheKey(request);
      const cached = await this.getCached(cacheKey);
      if (cached) return cached;
    }

    const language = request.language || "es";
    const systemPrompt = SYSTEM_PROMPTS[language] || SYSTEM_PROMPTS["es"];
    const userPrompt = this.buildPrompt(request, exchangeData);

    try {
      const completion = await this.client.chat.completions.create({
        model: this.model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        max_tokens: 1000,
        temperature: 0.7,
      });

      const insight = completion.choices?.[0]?.message?.content || "No insight generated";

      const response: InsightResponse = {
        insight,
        type: request.type,
        timestamp: new Date().toISOString(),
        language,
        cached: false,
      };

      // Cache the response (except custom)
      if (request.type !== "custom") {
        this.setCache(this.getCacheKey(request), response);
      }

      return response;
    } catch (error: any) {
      console.error("AI Service error:", error?.message || error);
      throw new Error(`AI analysis failed: ${error?.message || "Unknown error"}`);
    }
  }

  // Cleanup cache
  async clearCache(): Promise<void> {
    await redisCache.delPattern(`${AI_CACHE_PREFIX}*`);
  }
}

// Singleton instance
const aiService = new AIService();
export { aiService, AIService, InsightRequest, InsightResponse };
