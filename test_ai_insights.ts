import dotenv from "dotenv";
import OpenAI from "openai";

dotenv.config();

/**
 * Comprehensive AI Insights Test Script
 *
 * Tests the full AI insight pipeline including:
 * 1. Environment configuration
 * 2. OpenAI client connectivity
 * 3. Token output & finish_reason verification
 * 4. Content completeness detection (truncation detection)
 * 5. Full market_summary generation with real-like data
 * 6. API endpoint test (if server is running)
 *
 * Usage: npx ts-node test_ai_insights.ts
 *        npx ts-node test_ai_insights.ts --api-url http://localhost:3528
 */

const DIVIDER = "─".repeat(70);
const API_BASE_URL = process.argv.find((a) => a.startsWith("--api-url="))?.split("=")[1] || "http://104.234.204.107:3528";

// ─── Content Completeness Detection (mirrors ai_service.ts logic) ───

function detectIncompleteContent(content: string): { incomplete: boolean; reason: string } {
  if (!content || content.length < 20) {
    return { incomplete: true, reason: "content_too_short" };
  }

  const lines = content.split("\n");
  const lastLines = lines.slice(-5).join("\n").trim();

  // Check for incomplete markdown tables
  const tableHeaderPattern = /\|[-:\s]+\|?\s*$/;
  if (tableHeaderPattern.test(lastLines)) {
    return { incomplete: true, reason: "incomplete_table_header" };
  }

  // Check if last line is a table row that doesn't end with |
  const lastNonEmptyLine = lines.filter((l) => l.trim().length > 0).pop() || "";
  if (lastNonEmptyLine.trim().startsWith("|") && !lastNonEmptyLine.trim().endsWith("|")) {
    return { incomplete: true, reason: "incomplete_table_row" };
  }

  // Check for unclosed code blocks
  const codeBlockCount = (content.match(/```/g) || []).length;
  if (codeBlockCount % 2 !== 0) {
    return { incomplete: true, reason: "unclosed_code_block" };
  }

  // Content ends mid-sentence
  const trimmed = content.trim();
  
  // Table-ending with pipe is almost always incomplete
  if (/\|\s*$/.test(trimmed) && trimmed.length > 50) {
    return { incomplete: true, reason: "content_ends_with_pipe" };
  }
  
  const endsIncomplete = /[,:\-–—]\s*$/.test(trimmed);
  if (endsIncomplete && trimmed.length > 50) {
    return { incomplete: true, reason: "content_ends_abruptly" };
  }

  return { incomplete: false, reason: "" };
}

// ─── Test: Content Completeness Detection Unit Tests ───

function testCompletenessDetection(): boolean {
  console.log("\n" + DIVIDER);
  console.log("🧪 Test 1: Content Completeness Detection (unit tests)");
  console.log(DIVIDER);

  const testCases: { name: string; content: string; expectIncomplete: boolean }[] = [
    {
      name: "Complete response",
      content: "## Market Summary\n\nThe USD is stable at 41.55.\n\n**Recommendation**: Hold your position.",
      expectIncomplete: false,
    },
    {
      name: "Truncated table header (the actual bug)",
      content:
        "### Mejores oportunidades\n| Divisa | Acción | Casa | Precio |\n|---",
      expectIncomplete: true,
    },
    {
      name: "Incomplete table row (no closing pipe)",
      content:
        "| USD | Comprar | BROU | 41.55 |\n| EUR | Vender | Cambio 18",
      expectIncomplete: true,
    },
    {
      name: "Complete table",
      content:
        "| Divisa | Precio |\n|--------|--------|\n| USD | 41.55 |\n| EUR | 44.82 |\n\nEnd of analysis.",
      expectIncomplete: false,
    },
    {
      name: "Unclosed code block",
      content: "Here is an example:\n```json\n{\"usd\": 41.55\n",
      expectIncomplete: true,
    },
    {
      name: "Content ends with colon",
      content:
        "## Analysis\n\nThe best exchange houses are:\n\n1. BROU with excellent spread\n2. The following currencies show interesting patterns:",
      expectIncomplete: true,
    },
    {
      name: "Content ends with dash",
      content:
        "## Analysis\n\nThe USD market shows stability. Key points:\n- Low volatility\n- Spread is narrowing -",
      expectIncomplete: true,
    },
    {
      name: "Short but complete",
      content: "El mercado está estable hoy.",
      expectIncomplete: false,
    },
    {
      name: "Too short content",
      content: "Error",
      expectIncomplete: true,
    },
    {
      name: "Ends with pipe character",
      content:
        "## Rates\n\n| Divisa | Compra | Venta |\n|--------|--------|-------|\n| USD | 39.35 |",
      expectIncomplete: true,
    },
  ];

  let passed = 0;
  let failed = 0;

  for (const tc of testCases) {
    const result = detectIncompleteContent(tc.content);
    const ok = result.incomplete === tc.expectIncomplete;
    if (ok) {
      passed++;
      console.log(`   ✅ "${tc.name}" → ${result.incomplete ? `incomplete (${result.reason})` : "complete"}`);
    } else {
      failed++;
      console.error(
        `   ❌ "${tc.name}" → expected ${tc.expectIncomplete ? "incomplete" : "complete"}, got ${result.incomplete ? `incomplete (${result.reason})` : "complete"}`
      );
    }
  }

  console.log(`\n   Results: ${passed} passed, ${failed} failed out of ${testCases.length}`);
  return failed === 0;
}

// ─── Test: Environment Variables ───

function testEnvVariables(): boolean {
  console.log("\n" + DIVIDER);
  console.log("🔍 Test 2: Environment Variables");
  console.log(DIVIDER);

  const baseURL = process.env.AI_BASE_URL;
  const apiKey = process.env.AI_API_KEY;
  const model = process.env.AI_MODEL || "gpt-4o-mini";
  let ok = true;

  if (!baseURL) {
    console.error("   ❌ AI_BASE_URL is NOT set");
    ok = false;
  } else {
    console.log(`   ✅ AI_BASE_URL = ${baseURL}`);
  }

  if (!apiKey || apiKey === "your_api_key_here") {
    console.error("   ❌ AI_API_KEY is NOT set or is placeholder");
    ok = false;
  } else {
    const masked = apiKey.substring(0, 6) + "..." + apiKey.substring(apiKey.length - 4);
    console.log(`   ✅ AI_API_KEY = ${masked}`);
  }

  console.log(`   ✅ AI_MODEL = ${model}`);
  return ok;
}

// ─── Test: Chat Completion with Token Tracking ───

async function testChatCompletionTokens(client: OpenAI): Promise<boolean> {
  console.log("\n" + DIVIDER);
  console.log("💬 Test 3: Chat Completion + Token Usage + finish_reason");
  console.log(DIVIDER);

  const model = process.env.AI_MODEL || "gpt-4o-mini";

  try {
    const startTime = Date.now();
    const completion = await client.chat.completions.create({
      model,
      messages: [
        { role: "system", content: "You are a helpful assistant. Keep response brief." },
        { role: "user", content: "Say 'Hello World' and nothing else." },
      ],
      max_tokens: 50,
      temperature: 0,
      stream: false,
    });
    const elapsed = Date.now() - startTime;

    const choice = completion.choices?.[0];
    const content = choice?.message?.content;
    const finishReason = choice?.finish_reason;
    const usage = completion.usage;

    console.log(`   ✅ Response received (${elapsed}ms)`);
    console.log(`   Content: "${content}"`);
    console.log(`   finish_reason: ${finishReason}`);

    if (usage) {
      console.log(`   Tokens → prompt: ${usage.prompt_tokens}, completion: ${usage.completion_tokens}, total: ${usage.total_tokens}`);
    } else {
      console.warn("   ⚠️ No usage data returned (some providers omit this)");
    }

    // Verify finish_reason
    if (finishReason === "stop") {
      console.log("   ✅ finish_reason is 'stop' (normal completion)");
    } else if (finishReason === "length") {
      console.warn("   ⚠️ finish_reason is 'length' — response was truncated by token limit");
    } else {
      console.warn(`   ⚠️ Unexpected finish_reason: '${finishReason}'`);
    }

    if (!content) {
      console.error("   ❌ Response content is empty/undefined!");
      return false;
    }

    return true;
  } catch (error: any) {
    console.error(`   ❌ Chat completion FAILED: ${error?.message || error}`);
    return false;
  }
}

// ─── Test: Forced Truncation (max_tokens=20) ───

async function testForcedTruncation(client: OpenAI): Promise<boolean> {
  console.log("\n" + DIVIDER);
  console.log("✂️  Test 4: Forced Truncation (max_tokens=20)");
  console.log(DIVIDER);

  const model = process.env.AI_MODEL || "gpt-4o-mini";

  try {
    const completion = await client.chat.completions.create({
      model,
      messages: [
        { role: "system", content: "You are a financial analyst." },
        {
          role: "user",
          content:
            "Write a detailed 500-word analysis of the USD/UYU exchange rate including a markdown table with at least 10 rows.",
        },
      ],
      max_tokens: 20, // Force truncation
      temperature: 0.7,
      stream: false,
    });

    const choice = completion.choices?.[0];
    const content = choice?.message?.content || "";
    const finishReason = choice?.finish_reason;
    const usage = completion.usage;

    console.log(`   Content (truncated): "${content.substring(0, 100)}..."`);
    console.log(`   Content length: ${content.length} chars`);
    console.log(`   finish_reason: ${finishReason}`);
    if (usage) {
      console.log(`   Tokens → prompt: ${usage.prompt_tokens}, completion: ${usage.completion_tokens}, total: ${usage.total_tokens}`);
    }

    // Check if the provider correctly reports truncation
    if (finishReason === "length") {
      console.log("   ✅ Provider correctly reports finish_reason='length' for truncated responses");
    } else {
      console.warn(`   ⚠️ Provider returned finish_reason='${finishReason}' despite max_tokens=20`);
      console.warn("   ⚠️ This means the provider does NOT reliably report truncation via finish_reason!");
      console.warn("   ⚠️ Content-level detection is ESSENTIAL for this provider.");
    }

    // Also test our content-level detection
    const completeness = detectIncompleteContent(content);
    if (completeness.incomplete) {
      console.log(`   ✅ Content-level detection correctly caught incomplete content: ${completeness.reason}`);
    } else {
      console.warn("   ⚠️ Content-level detection did NOT flag this as incomplete (may be a short but syntactically valid response)");
    }

    return true; // This test is informational, always passes
  } catch (error: any) {
    console.error(`   ❌ Forced truncation test FAILED: ${error?.message || error}`);
    return false;
  }
}

// ─── Test: Full Market Summary (real-like prompt) ───

async function testFullMarketSummary(client: OpenAI): Promise<boolean> {
  console.log("\n" + DIVIDER);
  console.log("📊 Test 5: Full Market Summary (real-like prompt, max_tokens=4096)");
  console.log(DIVIDER);

  const model = process.env.AI_MODEL || "gpt-4o-mini";

  const systemPrompt = `Eres un analista financiero experto en el mercado de cambios de Uruguay. 
Proporcionas insights claros, concisos y útiles sobre las cotizaciones de divisas.
Responde siempre en español. Usa formato Markdown para estructurar tu respuesta.
Incluye emojis relevantes para hacer la información más visual.
Sé directo y práctico, enfocándote en información que el usuario pueda usar para tomar decisiones.
No te extiendas demasiado, mantén las respuestas concisas pero informativas.
IMPORTANTE: SIEMPRE completa todas las tablas, listas y secciones que inicies. Nunca dejes una tabla o sección a medias. Si el contenido es largo, prioriza completar las secciones más importantes en lugar de dejar contenido incompleto. Prefiere respuestas más cortas y completas a respuestas largas e incompletas.`;

  const userPrompt = `Analiza el mercado de cambios de Uruguay con los siguientes datos y proporciona un resumen breve del estado actual del mercado. Incluye:
1. Estado general del mercado (fecha: 2026-03-23)
2. Mejores oportunidades para comprar/vender divisas principales
3. Spread promedio del mercado y qué casas de cambio ofrecen mejor spread
4. Comparación entre diferentes tipos de operación (BILLETE vs CABLE)
5. Recomendación general para el usuario

Fecha de los datos: 2026-03-23
Resumen del mercado: 34 casas de cambio, 16 monedas (ARS, AUD, BRL, CAD, CHF, CLP, CNY, COP, DKK, EUR, GBP, JPY, MXN, PYG, USD, XAU), tipos de operación: BILLETE, CABLE, INTERBANCARIO
Referencia de tipos: BILLETE = efectivo, CABLE = transferencia bancaria internacional, TRANSFERENCIA = transferencia bancaria local

Datos actuales de cotizaciones:

USD (DOLAR USA): 120 cotizaciones de 34 casas de cambio
  Compra: min=38.50, max=40.75, promedio=39.35
  Venta: min=41.00, max=42.50, promedio=41.55
  Spread promedio: 2.20 (5.59%)
  Mejores compras: Prex(40.75 BILLETE), Cambio Maiorano(40.50 BILLETE), Gales(40.25 BILLETE)
  Mejores ventas: IndependencIa(41.00 BILLETE), Cambio Federal(41.05 BILLETE), Brou(41.10 BILLETE)
  Menor spread: IndependencIa(0.50 BILLETE), Prex(0.75 BILLETE)

EUR (EURO): 85 cotizaciones de 28 casas de cambio
  Compra: min=42.00, max=46.50, promedio=44.82
  Venta: min=48.00, max=52.00, promedio=49.91
  Spread promedio: 5.09 (11.36%)
  Mejores compras: Prex(46.50 BILLETE), Cambio Maiorano(45.80 BILLETE)
  Mejores ventas: IndependencIa(48.00 BILLETE), Brou(48.50 BILLETE)
  Menor spread: IndependencIa(2.00 BILLETE), Prex(2.50 BILLETE)

BRL (REAL): 60 cotizaciones de 20 casas de cambio
  Compra: min=5.50, max=7.20, promedio=6.42
  Venta: min=7.00, max=8.50, promedio=7.58
  Spread promedio: 1.16 (18.07%)

ARS (PESO ARG): 45 cotizaciones de 15 casas de cambio
  Compra: min=0.008, max=0.030, promedio=0.024
  Venta: min=0.080, max=0.135, promedio=0.126
  Spread promedio: 0.102 (425.00%)`;

  try {
    const startTime = Date.now();
    const completion = await client.chat.completions.create({
      model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      max_tokens: 4096,
      temperature: 0.7,
      stream: false,
    });
    const elapsed = Date.now() - startTime;

    const choice = completion.choices?.[0];
    const content = choice?.message?.content || "";
    const finishReason = choice?.finish_reason;
    const usage = completion.usage;

    console.log(`   ⏱  Response time: ${elapsed}ms`);
    console.log(`   Content length: ${content.length} chars`);
    console.log(`   finish_reason: ${finishReason}`);
    if (usage) {
      console.log(`   Tokens → prompt: ${usage.prompt_tokens}, completion: ${usage.completion_tokens}, total: ${usage.total_tokens}`);
      if (usage.completion_tokens >= 4096) {
        console.warn("   ⚠️ Completion hit the max_tokens limit!");
      }
    }

    // Content completeness check
    const completeness = detectIncompleteContent(content);
    if (completeness.incomplete) {
      console.warn(`   ⚠️ Content-level detection: INCOMPLETE (reason: ${completeness.reason})`);
      console.warn("   This is the exact issue reported! The model stopped mid-content.");
    } else {
      console.log("   ✅ Content-level detection: COMPLETE");
    }

    // Check finish_reason consistency
    if (finishReason === "length" && !completeness.incomplete) {
      console.warn("   ⚠️ finish_reason='length' but content appears complete");
    } else if (finishReason === "stop" && completeness.incomplete) {
      console.warn("   ⚠️ finish_reason='stop' BUT content is INCOMPLETE!");
      console.warn("   This confirms the provider does not reliably set finish_reason='length'.");
      console.warn("   The content-level detection fix is necessary.");
    }

    // Show response preview
    console.log("\n   --- Response Preview (first 500 chars) ---");
    console.log(`   ${content.substring(0, 500).split("\n").join("\n   ")}`);
    if (content.length > 500) {
      console.log("\n   --- Response End (last 200 chars) ---");
      console.log(`   ${content.substring(content.length - 200).split("\n").join("\n   ")}`);
    }

    // Validate response structure
    let structureOk = true;
    if (!content.includes("#")) {
      console.warn("   ⚠️ Response has no markdown headers");
      structureOk = false;
    }
    if (!content.includes("USD") && !content.includes("dólar")) {
      console.warn("   ⚠️ Response doesn't mention USD");
      structureOk = false;
    }
    if (structureOk) {
      console.log("   ✅ Response structure looks good");
    }

    return !completeness.incomplete;
  } catch (error: any) {
    console.error(`   ❌ Market summary test FAILED: ${error?.message || error}`);
    return false;
  }
}

// ─── Test: API Endpoint (optional, requires running server) ───

async function testAPIEndpoint(): Promise<boolean> {
  console.log("\n" + DIVIDER);
  console.log(`🌐 Test 6: API Endpoint (${API_BASE_URL})`);
  console.log(DIVIDER);

  // First check /ai/status
  try {
    console.log("   Checking /ai/status...");
    const statusRes = await fetch(`${API_BASE_URL}/ai/status`);
    if (!statusRes.ok) {
      console.warn(`   ⚠️ /ai/status returned ${statusRes.status}`);
      console.warn("   Is the server running? Start with: npm run dev");
      return false;
    }
    const status = await statusRes.json() as any;
    console.log(`   ✅ AI Service configured: ${status.configured}`);
    console.log(`   Model: ${status.model}`);
    console.log(`   Cache enabled: ${status.cacheEnabled}`);

    if (!status.configured) {
      console.warn("   ⚠️ AI service is not configured on the server. Skipping insight test.");
      return false;
    }
  } catch (e: any) {
    if (e?.cause?.code === "ECONNREFUSED" || e?.message?.includes("ECONNREFUSED") || e?.message?.includes("fetch failed")) {
      console.warn(`   ⚠️ Could not connect to ${API_BASE_URL}. Server may not be running.`);
      console.warn("   Start with: npm run dev");
      return false;
    }
    console.error(`   ❌ Status check failed: ${e?.message || e}`);
    return false;
  }

  // Test POST /ai/insights
  try {
    console.log("\n   Testing POST /ai/insights (market_summary, es)...");
    const startTime = Date.now();
    const insightRes = await fetch(`${API_BASE_URL}/ai/insights`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "market_summary",
        language: "es",
      }),
    });
    const elapsed = Date.now() - startTime;

    if (!insightRes.ok) {
      const errorBody = await insightRes.text();
      console.error(`   ❌ /ai/insights returned ${insightRes.status}: ${errorBody.substring(0, 300)}`);
      return false;
    }

    const data = await insightRes.json() as any;
    console.log(`   ⏱  Response time: ${elapsed}ms`);
    console.log(`   Insight length: ${data.insight?.length || 0} chars`);
    console.log(`   Type: ${data.type}`);
    console.log(`   Language: ${data.language}`);
    console.log(`   Cached: ${data.cached}`);
    console.log(`   Truncated: ${data.truncated}`);
    console.log(`   Finish Reason: ${data.finishReason}`);

    // Check required fields
    const requiredFields = ["insight", "type", "timestamp", "language", "cached", "truncated", "finishReason"];
    const missingFields = requiredFields.filter((f) => !(f in data));
    if (missingFields.length > 0) {
      console.error(`   ❌ MISSING FIELDS in response: ${missingFields.join(", ")}`);
      console.error("   This was the original issue! The response should always include truncated and finishReason.");
      return false;
    } else {
      console.log(`   ✅ All required fields present: ${requiredFields.join(", ")}`);
    }

    // Content completeness
    const completeness = detectIncompleteContent(data.insight);
    if (completeness.incomplete) {
      console.warn(`   ⚠️ API response content is INCOMPLETE: ${completeness.reason}`);
      if (data.truncated) {
        console.log("   ✅ But truncated=true was correctly set");
      } else {
        console.error("   ❌ truncated is FALSE but content is incomplete! Bug persists.");
        return false;
      }
    } else {
      console.log("   ✅ API response content is COMPLETE");
    }

    // Show preview
    console.log("\n   --- API Response Preview (first 400 chars) ---");
    console.log(`   ${(data.insight || "").substring(0, 400).split("\n").join("\n   ")}`);

    return true;
  } catch (e: any) {
    console.error(`   ❌ Insight API test failed: ${e?.message || e}`);
    return false;
  }
}

// ─── Test: Validate Parameter Handling ───

async function testParameterValidation(): Promise<boolean> {
  console.log("\n" + DIVIDER);
  console.log("🔒 Test 7: API Parameter Validation");
  console.log(DIVIDER);

  try {
    // Test invalid type
    console.log("   Testing invalid type...");
    const res1 = await fetch(`${API_BASE_URL}/ai/insights`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "invalid_type", language: "es" }),
    });
    if (res1.status === 400) {
      console.log("   ✅ Invalid type correctly rejected with 400");
    } else {
      console.warn(`   ⚠️ Invalid type returned status ${res1.status} (expected 400)`);
    }

    // Test missing type
    console.log("   Testing missing type...");
    const res2 = await fetch(`${API_BASE_URL}/ai/insights`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ language: "es" }),
    });
    if (res2.status === 400) {
      console.log("   ✅ Missing type correctly rejected with 400");
    } else {
      console.warn(`   ⚠️ Missing type returned status ${res2.status} (expected 400)`);
    }

    // Test invalid language fallback
    console.log("   Testing invalid language (should fallback to 'es')...");
    const res3 = await fetch(`${API_BASE_URL}/ai/insights`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "market_summary", language: "xx" }),
    });
    if (res3.ok) {
      const data = await res3.json() as any;
      if (data.language === "es") {
        console.log("   ✅ Invalid language correctly fell back to 'es'");
      } else {
        console.warn(`   ⚠️ Language fallback: expected 'es', got '${data.language}'`);
      }
    } else {
      console.warn(`   ⚠️ Language fallback test returned ${res3.status}`);
    }

    return true;
  } catch (e: any) {
    if (e?.cause?.code === "ECONNREFUSED" || e?.message?.includes("fetch failed")) {
      console.warn("   ⚠️ Server not running, skipping parameter validation tests");
      return true; // Don't fail overall if server isn't running
    }
    console.error(`   ❌ Parameter validation test failed: ${e?.message || e}`);
    return false;
  }
}

// ─── Main ───

async function main() {
  console.log("🤖 AI Insights Comprehensive Test Script");
  console.log("=".repeat(70));
  console.log(`   Date: ${new Date().toISOString()}`);
  console.log(`   Node: ${process.version}`);
  console.log(`   API URL: ${API_BASE_URL}`);

  const results: Record<string, { passed: boolean; critical: boolean }> = {};

  // Test 1: Content completeness unit tests (no API needed)
  results["Content Completeness Detection"] = {
    passed: testCompletenessDetection(),
    critical: true,
  };

  // Test 2: Environment variables
  const envOk = testEnvVariables();
  results["Environment Variables"] = { passed: envOk, critical: true };

  if (!envOk) {
    console.warn("\n⚠️ Cannot proceed with API tests — environment not configured.");
    printSummary(results);
    process.exit(1);
  }

  // Initialize OpenAI client
  const client = new OpenAI({
    baseURL: process.env.AI_BASE_URL!,
    apiKey: process.env.AI_API_KEY!,
  });

  // Test 3: Chat completion + token tracking
  results["Chat Completion + Tokens"] = {
    passed: await testChatCompletionTokens(client),
    critical: true,
  };

  if (!results["Chat Completion + Tokens"].passed) {
    console.warn("\n⚠️ Basic chat completion failed. Skipping advanced tests.");
    printSummary(results);
    process.exit(1);
  }

  // Test 4: Forced truncation behavior
  results["Forced Truncation Detection"] = {
    passed: await testForcedTruncation(client),
    critical: false,
  };

  // Test 5: Full market summary
  results["Full Market Summary"] = {
    passed: await testFullMarketSummary(client),
    critical: true,
  };

  // Test 6: API endpoint (if server running)
  results["API Endpoint /ai/insights"] = {
    passed: await testAPIEndpoint(),
    critical: false,
  };

  // Test 7: Parameter validation
  results["API Parameter Validation"] = {
    passed: await testParameterValidation(),
    critical: false,
  };

  printSummary(results);

  const criticalFailed = Object.entries(results).some(([, v]) => v.critical && !v.passed);
  process.exit(criticalFailed ? 1 : 0);
}

function printSummary(results: Record<string, { passed: boolean; critical: boolean }>) {
  console.log("\n" + "=".repeat(70));
  console.log("📝 Test Summary");
  console.log("=".repeat(70));

  for (const [name, { passed, critical }] of Object.entries(results)) {
    const icon = passed ? "✅" : "❌";
    const tag = critical ? " [CRITICAL]" : "";
    console.log(`   ${icon} ${name}${tag}`);
  }

  const allPassed = Object.values(results).every((v) => v.passed);
  const criticalPassed = Object.entries(results)
    .filter(([, v]) => v.critical)
    .every(([, v]) => v.passed);

  console.log(DIVIDER);
  if (allPassed) {
    console.log("🎉 All tests passed! AI insights pipeline is working correctly.");
  } else if (criticalPassed) {
    console.log("⚠️ Some non-critical tests failed, but core AI functionality works.");
    console.log("   Non-critical failures may be due to the server not running (start with: npm run dev)");
  } else {
    console.log("❌ Critical tests FAILED. Review the output above.");
    console.log("\n💡 Key things to check:");
    console.log("   1. .env has valid AI_BASE_URL, AI_API_KEY, AI_MODEL");
    console.log("   2. The AI provider supports max_tokens=4096");
    console.log("   3. The model doesn't silently truncate without setting finish_reason='length'");
    console.log("   4. The content-level completeness detection catches truncated responses");
  }
  console.log();
}

main().catch((error) => {
  console.error("\n💥 Unexpected error:", error);
  process.exit(1);
});
