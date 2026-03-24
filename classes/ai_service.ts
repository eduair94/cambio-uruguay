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
No te extiendas demasiado, mantén las respuestas concisas pero informativas.
IMPORTANTE: SIEMPRE completa todas las tablas, listas y secciones que inicies. Nunca dejes una tabla o sección a medias. Si el contenido es largo, prioriza completar las secciones más importantes en lugar de dejar contenido incompleto. Prefiere respuestas más cortas y completas a respuestas largas e incompletas.`,

  en: `You are a financial analyst expert in the Uruguayan currency exchange market.
You provide clear, concise, and useful insights about currency exchange rates.
Always respond in English. Use Markdown format to structure your response.
Include relevant emojis to make information more visual.
Be direct and practical, focusing on information users can act on.
Keep responses concise but informative.
IMPORTANT: ALWAYS complete all tables, lists, and sections you start. Never leave a table or section unfinished. If the content is lengthy, prioritize completing the most important sections rather than leaving content incomplete. Prefer shorter complete responses over longer incomplete ones.`,

  pt: `Você é um analista financeiro especialista no mercado de câmbio do Uruguai.
Você fornece insights claros, concisos e úteis sobre as taxas de câmbio de moedas.
Responda sempre em português. Use formato Markdown para estruturar sua resposta.
Inclua emojis relevantes para tornar a informação mais visual.
Seja direto e prático, focando em informações que o usuário possa usar para tomar decisões.
Mantenha as respostas concisas mas informativas.
IMPORTANTE: SEMPRE complete todas as tabelas, listas e seções que iniciar. Nunca deixe uma tabela ou seção incompleta. Se o conteúdo for longo, priorize completar as seções mais importantes em vez de deixar conteúdo incompleto. Prefira respostas mais curtas e completas a respostas longas e incompletas.`,
};

interface InsightRequest {
  type: "market_summary" | "currency_analysis" | "best_rates" | "trend_analysis" | "custom";
  language: string;
  currency?: string;
  origin?: string;
  customPrompt?: string;
  exchangeData?: any[];
  evolutionData?: any;
  localData?: Record<string, { name: string; website: string; maps: string; bcu: string; departments: string[] }>;
  date?: string;
}

interface InsightResponse {
  insight: string;
  type: string;
  timestamp: string;
  language: string;
  cached: boolean;
  truncated?: boolean;
  finishReason?: string;
}

// Language-specific labels for building prompts in the correct language
const PROMPT_LABELS: Record<string, Record<string, string>> = {
  es: {
    dataDate: "Fecha de los datos",
    marketOverview: "Resumen del mercado",
    exchangeHouses: "casas de cambio",
    currencies: "monedas",
    operationTypes: "tipos de operación",
    typeReference: "Referencia de tipos: BILLETE = efectivo, CABLE = transferencia bancaria internacional, TRANSFERENCIA = transferencia bancaria local",
    currentRates: "Datos actuales de cotizaciones",
    quotes: "cotizaciones de",
    buy: "Compra",
    sell: "Venta",
    avgSpread: "Spread promedio",
    bestBuy: "Mejores compras (te pagan más)",
    bestSell: "Mejores ventas (te cobran menos)",
    lowestSpread: "Menor spread",
    historicalEvolution: "Datos de evolución histórica",
    exchangeHouse: "Casa de cambio",
    current: "Actual",
    change: "Cambio",
    average: "Promedio",
    period: "Período",
    months: "meses",
    dataPoints: "datos",
    lastNData: "Últimos {n} datos",
    geographicPresence: "Presencia geográfica de las principales casas de cambio (departamentos)",
    marketSummaryPrompt: `Analiza el mercado de cambios de Uruguay con los siguientes datos y proporciona un resumen breve del estado actual del mercado. Incluye:
1. Estado general del mercado (fecha: {date})
2. Mejores oportunidades para comprar/vender divisas principales
3. Spread promedio del mercado y qué casas de cambio ofrecen mejor spread
4. Comparación entre diferentes tipos de operación (BILLETE vs CABLE)
5. Recomendación general para el usuario`,
    currencyAnalysisPrompt: `Analiza en detalle la cotización de {currency} en Uruguay con los siguientes datos (fecha: {date}). Incluye:
1. Rango actual de precios de compra y venta
2. Dónde conviene comprar y dónde conviene vender (con nombres de casas de cambio)
3. Spread entre las casas de cambio y quién ofrece mejor spread
4. Diferencias entre tipos de operación (BILLETE, CABLE, etc.) si hay datos
5. Contexto del mercado{trendSuffix}`,
    currencyAnalysisTrendSuffix: " y tendencia reciente",
    bestRatesPrompt: `Con los siguientes datos (fecha: {date}), identifica las mejores oportunidades de cambio. Para cada moneda principal (USD, EUR, ARS, BRL):
1. Mejor lugar para comprar (la casa que más te paga) - indica nombre y cotización
2. Mejor lugar para vender (la casa que menos te cobra) - indica nombre y cotización
3. Diferencia con el promedio del mercado
4. Spread más bajo disponible y en qué casa de cambio

Sé conciso y directo. Usa los nombres reales de las casas de cambio.`,
    trendAnalysisPrompt: `Analiza las tendencias del {currency} en el mercado uruguayo basándote en estos datos históricos (fecha actual: {date}). Incluye:
1. Tendencia actual (alcista/bajista/lateral) basada en los datos recientes
2. Volatilidad reciente (variación porcentual)
3. Niveles clave de soporte y resistencia
4. Comparación del precio actual vs promedio histórico
5. Perspectiva a corto plazo`,
    customFallback: "Proporciona un análisis del mercado de cambios de Uruguay.",
    customDataAvailable: "Datos disponibles",
    defaultPrompt: "Proporciona insights útiles sobre el mercado de cambios de Uruguay.",
  },
  en: {
    dataDate: "Data date",
    marketOverview: "Market overview",
    exchangeHouses: "exchange houses",
    currencies: "currencies",
    operationTypes: "operation types",
    typeReference: "Type reference: BILLETE = cash, CABLE = international wire transfer, TRANSFERENCIA = local bank transfer",
    currentRates: "Current exchange rates",
    quotes: "quotes from",
    buy: "Buy",
    sell: "Sell",
    avgSpread: "Average spread",
    bestBuy: "Best buy rates (they pay you the most)",
    bestSell: "Best sell rates (they charge you the least)",
    lowestSpread: "Lowest spread",
    historicalEvolution: "Historical evolution data",
    exchangeHouse: "Exchange house",
    current: "Current",
    change: "Change",
    average: "Average",
    period: "Period",
    months: "months",
    dataPoints: "data points",
    lastNData: "Last {n} data points",
    geographicPresence: "Geographic presence of main exchange houses (departments)",
    marketSummaryPrompt: `Analyze the Uruguayan currency exchange market with the following data and provide a brief summary of the current market state. Include:
1. General market state (date: {date})
2. Best opportunities to buy/sell major currencies
3. Average market spread and which exchange houses offer the best spread
4. Comparison between different operation types (BILLETE vs CABLE)
5. General recommendation for the user`,
    currencyAnalysisPrompt: `Analyze in detail the {currency} exchange rate in Uruguay with the following data (date: {date}). Include:
1. Current buy and sell price range
2. Where to buy and where to sell (with exchange house names)
3. Spread between exchange houses and who offers the best spread
4. Differences between operation types (BILLETE, CABLE, etc.) if available
5. Market context{trendSuffix}`,
    currencyAnalysisTrendSuffix: " and recent trend",
    bestRatesPrompt: `With the following data (date: {date}), identify the best exchange opportunities. For each major currency (USD, EUR, ARS, BRL):
1. Best place to buy (the house that pays you the most) - include name and rate
2. Best place to sell (the house that charges you the least) - include name and rate
3. Difference from the market average
4. Lowest spread available and at which exchange house

Be concise and direct. Use the real names of the exchange houses.`,
    trendAnalysisPrompt: `Analyze the trends of {currency} in the Uruguayan market based on this historical data (current date: {date}). Include:
1. Current trend (bullish/bearish/sideways) based on recent data
2. Recent volatility (percentage change)
3. Key support and resistance levels
4. Comparison of current price vs historical average
5. Short-term outlook`,
    customFallback: "Provide an analysis of the Uruguayan currency exchange market.",
    customDataAvailable: "Available data",
    defaultPrompt: "Provide useful insights about the Uruguayan currency exchange market.",
  },
  pt: {
    dataDate: "Data dos dados",
    marketOverview: "Resumo do mercado",
    exchangeHouses: "casas de câmbio",
    currencies: "moedas",
    operationTypes: "tipos de operação",
    typeReference: "Referência de tipos: BILLETE = dinheiro/espécie, CABLE = transferência bancária internacional, TRANSFERENCIA = transferência bancária local",
    currentRates: "Dados atuais de cotações",
    quotes: "cotações de",
    buy: "Compra",
    sell: "Venda",
    avgSpread: "Spread médio",
    bestBuy: "Melhores compras (te pagam mais)",
    bestSell: "Melhores vendas (te cobram menos)",
    lowestSpread: "Menor spread",
    historicalEvolution: "Dados de evolução histórica",
    exchangeHouse: "Casa de câmbio",
    current: "Atual",
    change: "Variação",
    average: "Média",
    period: "Período",
    months: "meses",
    dataPoints: "dados",
    lastNData: "Últimos {n} dados",
    geographicPresence: "Presença geográfica das principais casas de câmbio (departamentos)",
    marketSummaryPrompt: `Analise o mercado de câmbio do Uruguai com os seguintes dados e forneça um breve resumo do estado atual do mercado. Inclua:
1. Estado geral do mercado (data: {date})
2. Melhores oportunidades para comprar/vender moedas principais
3. Spread médio do mercado e quais casas de câmbio oferecem melhor spread
4. Comparação entre diferentes tipos de operação (BILLETE vs CABLE)
5. Recomendação geral para o usuário`,
    currencyAnalysisPrompt: `Analise em detalhe a cotação de {currency} no Uruguai com os seguintes dados (data: {date}). Inclua:
1. Faixa atual de preços de compra e venda
2. Onde convém comprar e onde convém vender (com nomes das casas de câmbio)
3. Spread entre as casas de câmbio e quem oferece melhor spread
4. Diferenças entre tipos de operação (BILLETE, CABLE, etc.) se houver dados
5. Contexto do mercado{trendSuffix}`,
    currencyAnalysisTrendSuffix: " e tendência recente",
    bestRatesPrompt: `Com os seguintes dados (data: {date}), identifique as melhores oportunidades de câmbio. Para cada moeda principal (USD, EUR, ARS, BRL):
1. Melhor lugar para comprar (a casa que mais te paga) - indique nome e cotação
2. Melhor lugar para vender (a casa que menos te cobra) - indique nome e cotação
3. Diferença em relação à média do mercado
4. Menor spread disponível e em qual casa de câmbio

Seja conciso e direto. Use os nomes reais das casas de câmbio.`,
    trendAnalysisPrompt: `Analise as tendências do {currency} no mercado uruguaio com base nestes dados históricos (data atual: {date}). Inclua:
1. Tendência atual (alta/baixa/lateral) baseada nos dados recentes
2. Volatilidade recente (variação percentual)
3. Níveis-chave de suporte e resistência
4. Comparação do preço atual vs média histórica
5. Perspectiva de curto prazo`,
    customFallback: "Forneça uma análise do mercado de câmbio do Uruguai.",
    customDataAvailable: "Dados disponíveis",
    defaultPrompt: "Forneça insights úteis sobre o mercado de câmbio do Uruguai.",
  },
};

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
    if (data && data.insight !== "No insight generated") {
      return { ...data, cached: true };
    }
    return null;
  }

  private async setCache(key: string, data: InsightResponse): Promise<void> {
    await redisCache.set(key, data, AI_CACHE_TTL);
  }

  private getExchangeName(origin: string, localData?: InsightRequest["localData"]): string {
    if (localData && localData[origin]) {
      return localData[origin].name;
    }
    // Fallback: convert slug to readable name
    return origin
      .split("_")
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ");
  }

  private buildPrompt(request: InsightRequest, exchangeData: CambioObj[]): string {
    const { type, currency, origin, customPrompt, localData, date } = request;
    const lang = request.language || "es";
    const L = PROMPT_LABELS[lang] || PROMPT_LABELS["es"];

    // Date context
    const dateStr = date || new Date().toISOString().split("T")[0];

    // Build data summary for context
    let dataSummary = "";
    if (exchangeData && exchangeData.length > 0) {
      // Collect unique currencies, origins, and types
      const allCurrencies = [...new Set(exchangeData.map((e) => e.code))].sort();
      const allOrigins = [...new Set(exchangeData.map((e) => e.origin))].sort();
      const allTypes = [...new Set(exchangeData.map((e) => e.type).filter(Boolean))].sort();

      dataSummary = `${L.dataDate}: ${dateStr}\n`;
      dataSummary += `${L.marketOverview}: ${allOrigins.length} ${L.exchangeHouses}, ${allCurrencies.length} ${L.currencies} (${allCurrencies.join(", ")}), ${L.operationTypes}: ${allTypes.join(", ")}\n`;
      dataSummary += `${L.typeReference}\n\n`;

      // Group by currency
      const byCurrency: Record<string, any[]> = {};
      for (const item of exchangeData) {
        if (!byCurrency[item.code]) byCurrency[item.code] = [];
        byCurrency[item.code].push({
          origin: item.origin,
          originName: this.getExchangeName(item.origin || item.code, localData),
          buy: item.buy,
          sell: item.sell,
          type: item.type || "",
          name: item.name || "",
        });
      }

      dataSummary += `${L.currentRates}:\n`;
      for (const [code, entries] of Object.entries(byCurrency)) {
        if (currency && code !== currency.toUpperCase()) continue;
        const buyRates = entries.map((e) => e.buy).filter((b) => b > 0);
        const sellRates = entries.map((e) => e.sell).filter((s) => s > 0);
        if (buyRates.length === 0) continue;

        // Currency name from data
        const currencyName = entries[0]?.name || code;
        dataSummary += `\n${code} (${currencyName}): ${entries.length} ${L.quotes} ${new Set(entries.map((e) => e.origin)).size} ${L.exchangeHouses}\n`;
        
        const avgBuy = buyRates.reduce((a, b) => a + b, 0) / buyRates.length;
        const avgSell = sellRates.reduce((a, b) => a + b, 0) / sellRates.length;
        const avgSpread = avgSell - avgBuy;
        const spreadPercent = avgBuy > 0 ? ((avgSpread / avgBuy) * 100).toFixed(2) : "N/A";
        
        dataSummary += `  ${L.buy}: min=${Math.min(...buyRates).toFixed(2)}, max=${Math.max(...buyRates).toFixed(2)}, ${L.average.toLowerCase()}=${avgBuy.toFixed(2)}\n`;
        dataSummary += `  ${L.sell}: min=${Math.min(...sellRates).toFixed(2)}, max=${Math.max(...sellRates).toFixed(2)}, ${L.average.toLowerCase()}=${avgSell.toFixed(2)}\n`;
        dataSummary += `  ${L.avgSpread}: ${avgSpread.toFixed(2)} (${spreadPercent}%)\n`;

        // Group by type if there are multiple types
        const byType: Record<string, any[]> = {};
        for (const e of entries) {
          const t = e.type || "N/A";
          if (!byType[t]) byType[t] = [];
          byType[t].push(e);
        }
        if (Object.keys(byType).length > 1) {
          for (const [t, typeEntries] of Object.entries(byType)) {
            const tBuy = typeEntries.map((e) => e.buy).filter((b) => b > 0);
            const tSell = typeEntries.map((e) => e.sell).filter((s) => s > 0);
            if (tBuy.length > 0) {
              dataSummary += `  [${t}] ${L.buy}: ${Math.min(...tBuy).toFixed(2)}-${Math.max(...tBuy).toFixed(2)}, ${L.sell}: ${Math.min(...tSell).toFixed(2)}-${Math.max(...tSell).toFixed(2)}\n`;
            }
          }
        }

        // Top 5 best buy (highest = best for seller) and sell (lowest = best for buyer)
        const sortedBuy = entries.filter((e) => e.buy > 0).sort((a, b) => b.buy - a.buy);
        const sortedSell = entries.filter((e) => e.sell > 0).sort((a, b) => a.sell - b.sell);
        if (sortedBuy.length > 0) {
          dataSummary += `  ${L.bestBuy}: ${sortedBuy
            .slice(0, 5)
            .map((e) => `${e.originName}(${e.buy}${e.type ? ` ${e.type}` : ""})`)
            .join(", ")}\n`;
        }
        if (sortedSell.length > 0) {
          dataSummary += `  ${L.bestSell}: ${sortedSell
            .slice(0, 5)
            .map((e) => `${e.originName}(${e.sell}${e.type ? ` ${e.type}` : ""})`)
            .join(", ")}\n`;
        }

        // Best spread (lowest sell - highest buy from same origin+type)
        const originTypePairs: Record<string, { buy: number; sell: number; originName: string; type: string }> = {};
        for (const e of entries) {
          const key = `${e.origin}_${e.type}`;
          if (!originTypePairs[key]) originTypePairs[key] = { buy: e.buy, sell: e.sell, originName: e.originName, type: e.type };
        }
        const spreads = Object.values(originTypePairs)
          .filter((p) => p.buy > 0 && p.sell > 0)
          .map((p) => ({ ...p, spread: p.sell - p.buy }))
          .sort((a, b) => a.spread - b.spread);
        if (spreads.length > 0) {
          dataSummary += `  ${L.lowestSpread}: ${spreads
            .slice(0, 3)
            .map((s) => `${s.originName}(${s.spread.toFixed(2)}${s.type ? ` ${s.type}` : ""})`)
            .join(", ")}\n`;
        }
      }
    }

    // Add evolution data if present
    let evolutionSummary = "";
    if (request.evolutionData) {
      const evo = request.evolutionData;
      evolutionSummary = `\n${L.historicalEvolution}:\n`;
      if (evo.localData) {
        evolutionSummary += `  ${L.exchangeHouse}: ${evo.localData.name}\n`;
      }
      if (evo.statistics) {
        const stats = evo.statistics;
        if (stats.buy) {
          evolutionSummary += `  ${L.buy} - Min: ${stats.buy.min}, Max: ${stats.buy.max}, ${L.average}: ${stats.buy.avg?.toFixed(2)}, ${L.current}: ${stats.buy.current ?? "N/A"}, ${L.change}: ${stats.buy.change?.toFixed(2)}%\n`;
        }
        if (stats.sell) {
          evolutionSummary += `  ${L.sell} - Min: ${stats.sell.min}, Max: ${stats.sell.max}, ${L.average}: ${stats.sell.avg?.toFixed(2)}, ${L.current}: ${stats.sell.current ?? "N/A"}, ${L.change}: ${stats.sell.change?.toFixed(2)}%\n`;
        }
        if (stats.dateRange) {
          evolutionSummary += `  ${L.period}: ${stats.dateRange.periodMonths} ${L.months} (${stats.totalDataPoints} ${L.dataPoints})\n`;
        }
      }
      // Include recent data points for trend detection (last 10)
      if (evo.evolution && evo.evolution.length > 0) {
        const recent = evo.evolution.slice(-10);
        evolutionSummary += `  ${L.lastNData.replace("{n}", String(recent.length))}:\n`;
        for (const point of recent) {
          const d = typeof point.date === "string" ? point.date.split("T")[0] : new Date(point.date).toISOString().split("T")[0];
          evolutionSummary += `    ${d}: ${L.buy.toLowerCase()}=${point.buy}, ${L.sell.toLowerCase()}=${point.sell}\n`;
        }
      }
    }

    // Exchange info context
    let exchangeInfoSummary = "";
    if (localData && Object.keys(localData).length > 0) {
      const originsWithDepts = Object.entries(localData)
        .filter(([, v]) => v.departments && v.departments.length > 0)
        .map(([k, v]) => `${v.name}: ${v.departments.join(", ")}`)
        .slice(0, 15); // Limit to keep prompt manageable
      if (originsWithDepts.length > 0) {
        exchangeInfoSummary = `\n${L.geographicPresence}:\n${originsWithDepts.join("\n")}\n`;
      }
    }

    switch (type) {
      case "market_summary":
        return `${L.marketSummaryPrompt.replace("{date}", dateStr)}\n\n${dataSummary}${exchangeInfoSummary}`;

      case "currency_analysis": {
        const trendSuffix = request.evolutionData ? L.currencyAnalysisTrendSuffix : "";
        return `${L.currencyAnalysisPrompt.replace("{currency}", currency || "USD").replace("{date}", dateStr).replace("{trendSuffix}", trendSuffix)}\n\n${dataSummary}${evolutionSummary}${exchangeInfoSummary}`;
      }

      case "best_rates":
        return `${L.bestRatesPrompt.replace("{date}", dateStr)}\n\n${dataSummary}`;

      case "trend_analysis":
        return `${L.trendAnalysisPrompt.replace("{currency}", currency || "USD").replace("{date}", dateStr)}\n\n${dataSummary}${evolutionSummary}`;

      case "custom":
        return `${customPrompt || L.customFallback}\n\n${L.dataDate}: ${dateStr}\n${L.customDataAvailable}:\n${dataSummary}${evolutionSummary}${exchangeInfoSummary}`;

      default:
        return `${L.defaultPrompt}\n${dataSummary}`;
    }
  }

  /**
   * Detect if markdown content appears structurally incomplete.
   * Catches cases where the model returns finish_reason="stop" but content is cut off.
   */
  private detectIncompleteContent(content: string): { incomplete: boolean; reason: string } {
    if (!content || content.length < 20) {
      return { incomplete: true, reason: "content_too_short" };
    }

    const lines = content.split("\n");
    const lastLines = lines.slice(-5).join("\n").trim();

    // Check for incomplete markdown tables:
    // A table separator row like |--- or |:--- without a following data row
    const tableHeaderPattern = /\|[-:\s]+\|?\s*$/;
    if (tableHeaderPattern.test(lastLines)) {
      return { incomplete: true, reason: "incomplete_table_header" };
    }

    // Check if last line is a table row that doesn't end with |
    const lastNonEmptyLine = lines.filter((l) => l.trim().length > 0).pop() || "";
    if (lastNonEmptyLine.trim().startsWith("|") && !lastNonEmptyLine.trim().endsWith("|")) {
      return { incomplete: true, reason: "incomplete_table_row" };
    }

    // Check for unclosed markdown structures
    // Unclosed code block (odd number of ``` markers)
    const codeBlockCount = (content.match(/```/g) || []).length;
    if (codeBlockCount % 2 !== 0) {
      return { incomplete: true, reason: "unclosed_code_block" };
    }

    // Content ends mid-sentence (ends with common incomplete patterns)
    const trimmed = content.trim();
    
    // Table-ending with pipe is almost always incomplete (a complete response rarely ends with |)
    if (/\|\s*$/.test(trimmed) && trimmed.length > 50) {
      return { incomplete: true, reason: "content_ends_with_pipe" };
    }
    
    const endsIncomplete = /[,:\-–—]\s*$/.test(trimmed) || 
                           /\*\*[^*]+$/.test(lastNonEmptyLine); // unclosed bold
    if (endsIncomplete && trimmed.length > 50) {
      return { incomplete: true, reason: "content_ends_abruptly" };
    }

    // Check for numbered list that seems to stop abruptly
    // (e.g., prompt asks for 5 items but only 2 are present)
    const numberedItems = content.match(/^\d+[.)]\s/gm);
    if (numberedItems && numberedItems.length > 0) {
      const lastNumber = parseInt(numberedItems[numberedItems.length - 1]);
      // If the last content in the response is a numbered item header with no content after it
      const lastLineIdx = lines.length - 1;
      const lastContentLine = lines.findIndex((l, i) => i === lastLineIdx && /^\d+[.)]\s/.test(l.trim()));
      if (lastContentLine === lastLineIdx) {
        return { incomplete: true, reason: "incomplete_numbered_list" };
      }
    }

    return { incomplete: false, reason: "" };
  }

  async getInsight(request: InsightRequest, exchangeData: CambioObj[]): Promise<InsightResponse> {
    if (!this.client) {
      throw new Error("AI Service is not configured. Set AI_BASE_URL and AI_API_KEY in .env");
    }

    // Normalize language before cache key computation to prevent cross-language cache hits
    const language = (request.language && SYSTEM_PROMPTS[request.language]) ? request.language : "es";
    request = { ...request, language };

    // Check cache (except for custom prompts)
    if (request.type !== "custom") {
      const cacheKey = this.getCacheKey(request);
      const cached = await this.getCached(cacheKey);
      if (cached) return cached;
    }

    const systemPrompt = SYSTEM_PROMPTS[language];
    const userPrompt = this.buildPrompt(request, exchangeData);

    // Retry loop: if the model produces incomplete content, retry once with a shorter prompt
    const MAX_ATTEMPTS = 2;
    let lastError: any = null;

    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      try {
        // Add timeout to prevent hanging requests (60 seconds)
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 60000);

        let completion;
        try {
          completion = await this.client.chat.completions.create({
            model: this.model,
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: attempt === 1 ? userPrompt : userPrompt + "\n\nIMPORTANTE: Genera una respuesta COMPLETA y más concisa. No dejes tablas ni secciones incompletas." },
            ],
            max_tokens: 4096,
            temperature: 0.7,
            stream: false,
          }, { signal: controller.signal });
        } finally {
          clearTimeout(timeout);
        }

        const choice = completion.choices?.[0];
        const finishReason = choice?.finish_reason || "unknown";
        const rawContent = choice?.message?.content;
        const usage = completion.usage;

        // Log token usage for debugging
        if (usage) {
          console.log(`AI tokens used (attempt ${attempt}): prompt=${usage.prompt_tokens}, completion=${usage.completion_tokens}, total=${usage.total_tokens}`);
        }

        // Detect broken/empty responses
        const insight = rawContent?.trim() || "";
        const isTruncatedByFinishReason = finishReason === "length";
        const isEmpty = !insight || insight.length < 20;
        const isRefusal = finishReason === "content_filter";

        if (isEmpty && !isTruncatedByFinishReason) {
          console.warn(`AI returned empty/short response. finish_reason=${finishReason}, content length=${insight.length}`);
          throw new Error("AI returned an empty or invalid response. Please try again.");
        }

        if (isRefusal) {
          console.warn(`AI content was filtered. finish_reason=${finishReason}`);
          throw new Error("The AI response was blocked by content filters. Please try a different query.");
        }

        // Content-level completeness detection (catches cases where finish_reason="stop" but content is cut off)
        const completenessCheck = this.detectIncompleteContent(insight);
        const isTruncated = isTruncatedByFinishReason || completenessCheck.incomplete;

        if (completenessCheck.incomplete && !isTruncatedByFinishReason) {
          console.warn(`AI response appears incomplete (content-level detection). reason=${completenessCheck.reason}, finish_reason=${finishReason}, content length=${insight.length}, attempt=${attempt}`);
          // On first attempt with incomplete content, retry
          if (attempt < MAX_ATTEMPTS) {
            console.log("Retrying with instruction to complete response...");
            continue;
          }
        }

        // If truncated, append a note so the user knows
        let finalInsight = insight || "No insight generated";
        if (isTruncated) {
          console.warn(`AI response was truncated (finish_reason=${finishReason}, contentCheck=${completenessCheck.reason || "none"}). Content length: ${insight.length}`);
          const truncationNote: Record<string, string> = {
            es: "\n\n---\n⚠️ *Esta respuesta fue truncada por límites del modelo. Los datos principales están arriba.*",
            en: "\n\n---\n⚠️ *This response was truncated due to model limits. The main data is above.*",
            pt: "\n\n---\n⚠️ *Esta resposta foi truncada por limites do modelo. Os dados principais estão acima.*",
          };
          finalInsight += truncationNote[language] || truncationNote["es"];
        }

        const response: InsightResponse = {
          insight: finalInsight,
          type: request.type,
          timestamp: new Date().toISOString(),
          language,
          cached: false,
          truncated: isTruncated,
          finishReason,
        };

        // Cache the response only if it's complete and valid (not truncated, not empty, not custom)
        if (request.type !== "custom" && !isTruncated && finalInsight !== "No insight generated" && finalInsight.length >= 20) {
          this.setCache(this.getCacheKey(request), response);
        }

        return response;
      } catch (error: any) {
        lastError = error;
        if (error?.name === "AbortError") {
          console.error("AI Service timeout: request took longer than 60s");
          throw new Error("AI analysis timed out. The service is taking too long to respond. Please try again.");
        }
        // Don't retry on non-recoverable errors
        if (attempt >= MAX_ATTEMPTS || error?.message?.includes("content filters") || error?.message?.includes("not configured")) {
          throw error;
        }
        console.warn(`AI Service error on attempt ${attempt}, retrying:`, error?.message || error);
      }
    }

    console.error("AI Service error after all attempts:", lastError?.message || lastError);
    throw new Error(`AI analysis failed: ${lastError?.message || "Unknown error"}`);
  }

  // Cleanup cache
  async clearCache(): Promise<void> {
    await redisCache.delPattern(`${AI_CACHE_PREFIX}*`);
  }
}

// Singleton instance
const aiService = new AIService();
export { aiService, AIService, InsightRequest, InsightResponse };
