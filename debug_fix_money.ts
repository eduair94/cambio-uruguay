import CambioAguerrebere from "./classes/cambios/cambio_aguerrebere";

async function debugFixMoney() {
  console.log("Testing fix_money function...");

  const scraper = new CambioAguerrebere();

  const testValues = ["$39.75", "$0.021", "$6.70", "$44.92"];

  testValues.forEach((value) => {
    const fixed = scraper.fix_money(value);
    console.log(`fix_money("${value}") = ${fixed} (type: ${typeof fixed})`);
  });

  console.log("\n=== Testing full scraper workflow ===");
  try {
    const data = await scraper.get_data();
    console.log("Data returned:", data);
  } catch (error) {
    console.error("Error in scraper:", error.message);
  }
}

debugFixMoney();
