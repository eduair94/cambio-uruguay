import CambioMaiorano from "./classes/cambios/cambio_maiorano";

async function testCambioMaiorano() {
  console.log("Testing Cambio Maiorano scraper...");

  try {
    const scraper = new CambioMaiorano();
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
      console.log(`Invalid spread found: ${invalidSpread.length} ✗`);
      invalidSpread.forEach((rate) => {
        console.log(`  - ${rate.code}: buy=${rate.buy}, sell=${rate.sell}`);
      });
    }

    // Display summary
    console.log("\n=== Summary ===");
    if (data.length === expectedCurrencies.length && invalidRates.length === 0 && invalidSpread.length === 0) {
      console.log("✅ All tests passed! Cambio Maiorano scraper is working correctly.");
    } else {
      console.log("❌ Some issues found. Please review the output above.");
    }

  } catch (error) {
    console.error("❌ Error testing Cambio Maiorano scraper:");
    console.error(error);
    process.exit(1);
  }
}

// Run the test
testCambioMaiorano().then(() => {
  console.log("\nTest completed.");
}).catch((error) => {
  console.error("Test failed:", error);
  process.exit(1);
});
