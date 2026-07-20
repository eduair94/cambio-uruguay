import dotenv from "dotenv";
import OpenAI from "openai";

dotenv.config();

/**
 * Test script for AI Service
 * Tests environment configuration, OpenAI client initialization,
 * and makes a real API call to verify connectivity.
 *
 * Usage: npx ts-node test_ai_service.ts
 */

const DIVIDER = "─".repeat(60);

async function testEnvVariables(): Promise<boolean> {
  console.log("\n" + DIVIDER);
  console.log("🔍 Step 1: Checking environment variables");
  console.log(DIVIDER);

  const baseURL = process.env.AI_BASE_URL;
  const apiKey = process.env.AI_API_KEY;
  const model = process.env.AI_MODEL || "gpt-4o-mini";

  let allGood = true;

  // Check AI_BASE_URL
  if (!baseURL) {
    console.error("❌ AI_BASE_URL is NOT set in .env");
    allGood = false;
  } else {
    console.log(`✅ AI_BASE_URL = ${baseURL}`);
    // Validate URL format
    try {
      new URL(baseURL);
      console.log("   ✅ URL format is valid");
    } catch {
      console.error("   ❌ URL format is INVALID");
      allGood = false;
    }
  }

  // Check AI_API_KEY
  if (!apiKey) {
    console.error("❌ AI_API_KEY is NOT set in .env");
    allGood = false;
  } else if (apiKey === "your_api_key_here") {
    console.error("❌ AI_API_KEY is still set to the placeholder value 'your_api_key_here'");
    allGood = false;
  } else {
    const masked = apiKey.substring(0, 6) + "..." + apiKey.substring(apiKey.length - 4);
    console.log(`✅ AI_API_KEY = ${masked} (masked)`);
  }

  // Check AI_MODEL
  console.log(`✅ AI_MODEL = ${model}`);

  return allGood;
}

async function testClientInitialization(): Promise<OpenAI | null> {
  console.log("\n" + DIVIDER);
  console.log("🔧 Step 2: Initializing OpenAI client");
  console.log(DIVIDER);

  const baseURL = process.env.AI_BASE_URL;
  const apiKey = process.env.AI_API_KEY;

  if (!baseURL || !apiKey || apiKey === "your_api_key_here") {
    console.error("❌ Cannot initialize client — missing or invalid env vars (see Step 1)");
    return null;
  }

  try {
    const client = new OpenAI({ baseURL, apiKey });
    console.log("✅ OpenAI client created successfully");
    return client;
  } catch (error: any) {
    console.error("❌ Failed to create OpenAI client:", error?.message || error);
    return null;
  }
}

async function testListModels(client: OpenAI): Promise<boolean> {
  console.log("\n" + DIVIDER);
  console.log("📋 Step 3: Listing available models (optional endpoint)");
  console.log(DIVIDER);

  try {
    const models = await client.models.list();
    const modelList: string[] = [];
    for await (const m of models) {
      modelList.push(m.id);
    }
    if (modelList.length > 0) {
      console.log(`✅ Found ${modelList.length} model(s): ${modelList.slice(0, 10).join(", ")}${modelList.length > 10 ? "..." : ""}`);
    } else {
      console.log("⚠️ Models endpoint returned 0 models (endpoint may not support listing)");
    }
    return true;
  } catch (error: any) {
    console.warn("⚠️ Could not list models (some providers don't support this):", error?.message || error);
    return false;
  }
}

async function testChatCompletion(client: OpenAI): Promise<boolean> {
  console.log("\n" + DIVIDER);
  console.log("💬 Step 4: Testing chat completion (simple request)");
  console.log(DIVIDER);

  const model = process.env.AI_MODEL || "gpt-4o-mini";

  try {
    console.log(`   Using model: ${model}`);
    console.log("   Sending test message: 'Respond with exactly: OK'");

    const startTime = Date.now();
    const completion = await client.chat.completions.create({
      model,
      messages: [
        { role: "system", content: "You are a helpful assistant. Keep your response to a single word." },
        { role: "user", content: "Respond with exactly: OK" },
      ],
      max_tokens: 10,
      temperature: 0,
      stream: false,
    });
    const elapsed = Date.now() - startTime;

    const content = completion.choices?.[0]?.message?.content;
    const finishReason = completion.choices?.[0]?.finish_reason;
    const usage = completion.usage;

    console.log(`✅ Chat completion successful (${elapsed}ms)`);
    console.log(`   Response: "${content}"`);
    console.log(`   Finish reason: ${finishReason}`);
    if (usage) {
      console.log(`   Tokens used — prompt: ${usage.prompt_tokens}, completion: ${usage.completion_tokens}, total: ${usage.total_tokens}`);
    }

    // Debug: inspect raw response structure if content is empty/undefined
    if (!content || content === "undefined") {
      console.warn("\n   ⚠️ Response content is empty/undefined. Inspecting raw response structure...");
      console.log("   Raw completion keys:", Object.keys(completion));
      console.log("   Raw completion:", JSON.stringify(completion, null, 2).substring(0, 1000));
      if (completion.choices?.[0]) {
        console.log("   choices[0] keys:", Object.keys(completion.choices[0]));
        console.log("   choices[0].message:", JSON.stringify(completion.choices[0].message, null, 2));
      }
      console.warn("   💡 The API returns data in a non-standard format. The AIService may need to adapt its response parsing.");
      return false;
    }
    return true;
  } catch (error: any) {
    console.error("❌ Chat completion FAILED");
    console.error(`   Error: ${error?.message || error}`);
    if (error?.status) {
      console.error(`   HTTP Status: ${error.status}`);
    }
    if (error?.code) {
      console.error(`   Error Code: ${error.code}`);
    }
    if (error?.status === 401 || error?.code === "invalid_api_key") {
      console.error("   💡 Hint: Your API key appears to be invalid or expired. Check AI_API_KEY in .env");
    } else if (error?.status === 404) {
      console.error(`   💡 Hint: Model '${model}' may not exist. Try changing AI_MODEL in .env`);
    } else if (error?.status === 429) {
      console.error("   💡 Hint: Rate limited. You may have exceeded your quota.");
    } else if (error?.code === "ECONNREFUSED" || error?.code === "ENOTFOUND") {
      console.error("   💡 Hint: Cannot connect to the API. Check AI_BASE_URL in .env");
    }
    return false;
  }
}

async function testExchangeDataPrompt(client: OpenAI): Promise<boolean> {
  console.log("\n" + DIVIDER);
  console.log("📊 Step 5: Testing with sample exchange data (like AIService.getInsight)");
  console.log(DIVIDER);

  const model = process.env.AI_MODEL || "gpt-4o-mini";

  const sampleData = `Datos actuales de cotizaciones:

USD: 3 casas de cambio
  Compra: min=40.50, max=41.20, promedio=40.85
  Venta: min=42.00, max=42.80, promedio=42.40
  Mejores compras: Cambio A(41.20), Cambio B(40.85), Cambio C(40.50)
  Mejores ventas: Cambio C(42.00), Cambio B(42.40), Cambio A(42.80)`;

  try {
    console.log("   Sending market summary request with sample exchange data...");

    const startTime = Date.now();
    const completion = await client.chat.completions.create({
      model,
      messages: [
        {
          role: "system",
          content: `Eres un analista financiero experto en el mercado de cambios de Uruguay. 
Proporcionas insights claros, concisos y útiles sobre las cotizaciones de divisas.
Responde siempre en español. Usa formato Markdown para estructurar tu respuesta.
Sé directo y práctico. No te extiendas demasiado.`,
        },
        {
          role: "user",
          content: `Analiza el mercado de cambios de Uruguay con los siguientes datos y proporciona un resumen breve del estado actual del mercado.\n\n${sampleData}`,
        },
      ],
      max_tokens: 500,
      temperature: 0.7,
      stream: false,
    });
    const elapsed = Date.now() - startTime;

    const content = completion.choices?.[0]?.message?.content;
    const usage = completion.usage;

    console.log(`✅ Exchange data analysis successful (${elapsed}ms)`);
    console.log(`   Tokens used — prompt: ${usage?.prompt_tokens}, completion: ${usage?.completion_tokens}, total: ${usage?.total_tokens}`);
    console.log("\n   --- AI Response (preview) ---");
    const preview = content ? content.substring(0, 300) : "(empty)";
    console.log(`   ${preview}${content && content.length > 300 ? "\n   ... (truncated)" : ""}`);

    // Debug: inspect raw response if content is empty
    if (!content || content === "undefined") {
      console.warn("\n   ⚠️ Exchange analysis content is empty. Raw response:");
      console.log("   ", JSON.stringify(completion, null, 2).substring(0, 1000));
      return false;
    }
    return true;
  } catch (error: any) {
    console.error("❌ Exchange data analysis FAILED:", error?.message || error);
    return false;
  }
}

async function main() {
  console.log("🤖 AI Service Test Script");
  console.log("=".repeat(60));
  console.log(`   Date: ${new Date().toISOString()}`);
  console.log(`   Node: ${process.version}`);

  const results: Record<string, boolean> = {};

  // Step 1: Check env vars
  results["Environment Variables"] = await testEnvVariables();
  if (!results["Environment Variables"]) {
    printSummary(results);
    process.exit(1);
  }

  // Step 2: Initialize client
  const client = await testClientInitialization();
  results["Client Initialization"] = client !== null;
  if (!client) {
    printSummary(results);
    process.exit(1);
  }

  // Step 3: List models (non-blocking)
  results["List Models"] = await testListModels(client);

  // Step 4: Simple chat completion
  results["Chat Completion"] = await testChatCompletion(client);

  // Step 5: Exchange data prompt (only if step 4 passed)
  if (results["Chat Completion"]) {
    results["Exchange Data Prompt"] = await testExchangeDataPrompt(client);
  } else {
    results["Exchange Data Prompt"] = false;
    console.log("\n⏭️ Skipping Step 5 (Step 4 failed)");
  }

  printSummary(results);
  process.exit(Object.values(results).every(Boolean) ? 0 : 1);
}

function printSummary(results: Record<string, boolean>) {
  console.log("\n" + "=".repeat(60));
  console.log("📝 Test Summary");
  console.log("=".repeat(60));

  for (const [name, passed] of Object.entries(results)) {
    console.log(`   ${passed ? "✅" : "❌"} ${name}`);
  }

  const allPassed = Object.values(results).every(Boolean);
  const critical = results["Chat Completion"];

  console.log(DIVIDER);
  if (allPassed) {
    console.log("🎉 All tests passed! AI Service is working correctly.");
  } else if (critical) {
    console.log("⚠️ Some non-critical tests failed, but core AI functionality works.");
  } else {
    console.log("❌ AI Service is NOT working. Review the errors above.");
    console.log("\n💡 Quick checklist:");
    console.log("   1. Ensure .env file exists in the project root");
    console.log("   2. Set AI_BASE_URL to a valid OpenAI-compatible API endpoint");
    console.log("   3. Set AI_API_KEY to a valid API key (not 'your_api_key_here')");
    console.log("   4. Set AI_MODEL to a model supported by your provider");
  }
  console.log();
}

main().catch((error) => {
  console.error("\n💥 Unexpected error:", error);
  process.exit(1);
});
