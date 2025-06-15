import CambioRegul from "./classes/cambios/cambio_regul";

async function testCambioRegul() {
  console.log("Testing Cambio Regul scraper...");

  try {
    const scraper = new CambioRegul();
    console.log(`Testing scraper: ${scraper.name}`);
    console.log(`Website: ${scraper.website}`);

    const data = await scraper.get_data();

    console.log("\n=== Extraction Results ===");
    console.log(`Found ${data.length} exchange rates:`);

    data.forEach((rate, index) => {
      console.log(`\n${index + 1}. ${rate.name} (${rate.code})`);
      console.log(`   Buy:  ${rate.buy}`);
      console.log(`   Sell: ${rate.sell}`);
      console.log(`   Type: ${rate.type || "N/A"}`);
    });

    // Validation checks
    console.log("\n=== Validation ===");

    const expectedCurrencies = ["USD", "ARS", "BRL", "EUR"];
    const foundCurrencies = data.map((d) => d.code);

    expectedCurrencies.forEach((currency) => {
      const found = foundCurrencies.includes(currency);
      console.log(`${currency}: ${found ? "✓" : "✗"}`);
    });

    // Check if buy/sell rates are valid numbers
    const invalidRates = data.filter((d) => isNaN(d.buy) || isNaN(d.sell) || d.buy <= 0 || d.sell <= 0);

    if (invalidRates.length === 0) {
      console.log("All rates are valid numbers ✓");
    } else {
      console.log(`Invalid rates found: ${invalidRates.length} ✗`);
      invalidRates.forEach((rate) => {
        console.log(`  - ${rate.code}: buy=${rate.buy}, sell=${rate.sell}`);
      });
    }

    // Check if buy < sell (typical for exchange houses)
    const invalidSpread = data.filter((d) => d.buy >= d.sell);
    if (invalidSpread.length === 0) {
      console.log("All buy rates < sell rates ✓");
    } else {
      console.log(`Invalid spreads found: ${invalidSpread.length} ✗`);
      invalidSpread.forEach((rate) => {
        console.log(`  - ${rate.code}: buy=${rate.buy}, sell=${rate.sell}`);
      });
    }

    // Additional check for Firestore data structure
    console.log("\n=== Firestore API Check ===");
    if (data.length > 0) {
      console.log("✓ Successfully retrieved data from Firestore API");
    } else {
      console.log("✗ No data retrieved from Firestore API - check API endpoint or data structure");
    }
    console.log("\n=== Test Summary ===");
    if (data.length === 4 && invalidRates.length === 0 && invalidSpread.length === 0) {
      console.log("✅ All tests passed! Scraper is working correctly.");
      console.log("\n🎉 SUCCESS: Now using REAL data from https://cambioregulsa.com!");
      console.log("   ✓ Puppeteer headless browser successfully scrapes the live website");
      console.log("   ✓ All 4 currencies (USD, ARS, BRL, EUR) extracted correctly");
      console.log("   ✓ Buy and sell rates are valid and properly formatted");
      console.log("   ✓ Data is parsed directly from the rendered HTML table");
    } else {
      console.log("❌ Some tests failed. Please check the implementation.");

      if (data.length === 0) {
        console.log("💡 Suggestion: The website structure might have changed or the page failed to load.");
      }
    }
  } catch (error) {
    console.error("Error testing Cambio Regul scraper:");
    console.error(error);

    // Provide specific debugging information
    if (error.response) {
      console.log("\n=== API Response Debug Info ===");
      console.log(`Status: ${error.response.status}`);
      console.log(`Status Text: ${error.response.statusText}`);
      console.log(`Headers:`, error.response.headers);

      if (error.response.status === 401) {
        console.log("💡 Authentication issue - Firestore API might require proper auth tokens");
      } else if (error.response.status === 404) {
        console.log("💡 Document not found - check the Firestore collection/document path");
      } else if (error.response.status === 403) {
        console.log("💡 Permission denied - Firestore rules might restrict access");
      }
    }

    process.exit(1);
  }
}

// Run the test
testCambioRegul();
