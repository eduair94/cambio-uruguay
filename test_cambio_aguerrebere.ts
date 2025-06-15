import CambioAguerrebere from "./classes/cambios/cambio_aguerrebere";

async function testCambioAguerrebere() {
  console.log("Testing Cambio Aguerrebere scraper...");

  try {
    const scraper = new CambioAguerrebere();
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

    console.log("\n=== Test Summary ===");
    if (data.length === 4 && invalidRates.length === 0 && invalidSpread.length === 0) {
      console.log("✅ All tests passed! Scraper is working correctly.");
    } else {
      console.log("❌ Some tests failed. Please check the implementation.");
    }
  } catch (error) {
    console.error("Error testing Cambio Aguerrebere scraper:");
    console.error(error);
    process.exit(1);
  }
}

// Run the test
testCambioAguerrebere();
