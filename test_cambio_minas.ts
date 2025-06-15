import CambioMinas from "./classes/cambios/cambio_minas";

async function testCambioMinas() {
  console.log("Testing Cambio Minas scraper...");

  try {
    const scraper = new CambioMinas();
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

    // Check for USD rate specifically
    const usdRate = data.find((d) => d.code === "USD");
    if (usdRate) {
      console.log(`\nUSD Rate Check:`);
      console.log(`  Buy: ${usdRate.buy}`);
      console.log(`  Sell: ${usdRate.sell}`);

      if (usdRate.buy > 35 && usdRate.buy < 45 && usdRate.sell > 40 && usdRate.sell < 50) {
        console.log("  USD rates look reasonable ✓");
      } else {
        console.log("  USD rates seem unusual ✗");
      }
    } else {
      console.log("\nUSD Rate Check: USD not found ✗");
    }

    // Check for different USD types (regular and EBROU)
    const usdTypes = data.filter((d) => d.code === "USD");
    console.log(`\nUSD Types found: ${usdTypes.length}`);
    usdTypes.forEach((rate, index) => {
      console.log(`  ${index + 1}. Type: "${rate.type}" - Buy: ${rate.buy}, Sell: ${rate.sell}`);
    });

    console.log("\n=== Test Summary ===");
    const minExpectedRates = 4; // Cambio Minas should have at least 4 currencies
    if (data.length >= minExpectedRates && invalidRates.length === 0 && invalidSpread.length === 0) {
      console.log("✅ All tests passed! Scraper is working correctly.");
    } else {
      console.log("❌ Some tests failed. Please check the implementation.");
      console.log(`   - Found ${data.length} rates (expected at least ${minExpectedRates})`);
      console.log(`   - Invalid rates: ${invalidRates.length}`);
      console.log(`   - Invalid spreads: ${invalidSpread.length}`);
    }
  } catch (error) {
    console.error("Error testing Cambio Minas scraper:");
    console.error(error);
    console.error("\nStack trace:");
    console.error(error.stack);
    process.exit(1);
  }
}

// Run the test
testCambioMinas();
