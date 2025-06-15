import CambioLaFavorita from "./classes/cambios/lafavorita";

async function testCambioLaFavorita() {
  console.log("Testing Cambio La Favorita scraper...");

  try {
    const scraper = new CambioLaFavorita();
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

    const expectedCurrencies = ["USD", "EUR", "ARS", "BRL", "CHF", "GBP"];
    const foundCurrencies = data.map((d) => d.code);

    expectedCurrencies.forEach((currency) => {
      const found = foundCurrencies.includes(currency);
      console.log(`${currency}: ${found ? "✓" : "✗"}`);
    });

    // Check for optional currencies
    const optionalCurrencies = ["XAU", "CAD", "AUD", "JPY"];
    console.log("\nOptional currencies:");
    optionalCurrencies.forEach((currency) => {
      const found = foundCurrencies.includes(currency);
      console.log(`${currency}: ${found ? "✓" : "-"}`);
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

    // Check if buy < sell (typical for exchange houses, except for reference rates)
    const invalidSpread = data.filter((d) => d.buy >= d.sell && d.type !== "INTERBANCARIO");
    if (invalidSpread.length === 0) {
      console.log("All buy rates < sell rates (except reference rates) ✓");
    } else {
      console.log(`Invalid spreads found: ${invalidSpread.length} ✗`);
      invalidSpread.forEach((rate) => {
        console.log(`  - ${rate.code}: buy=${rate.buy}, sell=${rate.sell}`);
      });
    }

    // Check for USD rate specifically (should be around 39.85 as mentioned)
    const usdRate = data.find((d) => d.code === "USD");
    if (usdRate) {
      console.log(`\nUSD Rate Check:`);
      console.log(`  Buy: ${usdRate.buy} (should be around 39.85)`);
      console.log(`  Sell: ${usdRate.sell} (should be around 42.25)`);

      if (usdRate.buy > 35 && usdRate.buy < 45 && usdRate.sell > 40 && usdRate.sell < 50) {
        console.log("  USD rates look reasonable ✓");
      } else {
        console.log("  USD rates seem unusual ✗");
      }
    }

    console.log("\n=== Test Summary ===");
    const minExpectedRates = 5; // La Favorita should have at least 5 currencies
    if (data.length >= minExpectedRates && invalidRates.length === 0 && invalidSpread.length === 0) {
      console.log("✅ All tests passed! Scraper is working correctly.");
    } else {
      console.log("❌ Some tests failed. Please check the implementation.");
      console.log(`   - Found ${data.length} rates (expected at least ${minExpectedRates})`);
      console.log(`   - Invalid rates: ${invalidRates.length}`);
      console.log(`   - Invalid spreads: ${invalidSpread.length}`);
    }
  } catch (error) {
    console.error("Error testing Cambio La Favorita scraper:");
    console.error(error);
    process.exit(1);
  }
}

// Run the test
testCambioLaFavorita();
