// Read-only example for Node.js 22+. No packages, key, or account required.
const base = 'https://api.cambio-uruguay.com';

async function get(path) {
  const response = await fetch(`${base}${path}`, {
    headers: { accept: 'application/json' },
    signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok) throw new Error(`${path}: HTTP ${response.status}`);
  return response.json();
}

const [rates, report] = await Promise.all([get('/'), get('/frozen-quotes')]);
if (!Array.isArray(rates) || !Array.isArray(report?.quotes)) {
  throw new Error('Unexpected API response shape');
}

// This is the example's monitoring policy, not an API freshness guarantee.
const reportAge = Date.now() - Date.parse(report.generatedAt);
if (!Number.isFinite(reportAge) || reportAge < -300_000 || reportAge > 86_400_000) {
  throw new Error('The quality report is missing, future-dated, or over a day old');
}

const key = (row) => JSON.stringify([row.origin, row.code, row.type || '']);
const warnings = new Map(report.quotes.map((row) => [key(row), row]));

const table = rates
  .filter((row) => row.code === 'USD' && row.origin !== 'bcu' && !row.type)
  .map((row) => {
    const warning = warnings.get(key(row));
    const samePrice = warning && warning.buy === row.buy && warning.sell === row.sell;
    const validPair = Number.isFinite(row.buy) && Number.isFinite(row.sell)
      && row.buy > 0 && row.sell > 0 && row.buy <= row.sell;
    return {
      origin: row.origin,
      buy: row.buy,
      sell: row.sell,
      rowDate: row.date,
      quality: !validPair ? 'invalid price pair'
        : samePrice ? `unchanged ${warning.daysFrozen}${warning.capped ? '+' : ''} days`
          : warning ? 'price differs from report; recheck'
            : 'no frozen-price flag; not a verification',
    };
  })
  .sort((a, b) => a.origin.localeCompare(b.origin));

console.log(`Quality report: ${report.generatedAt}; USD counter quotes: ${table.length}`);
console.table(table);
