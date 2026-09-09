---
title: "Fresh timestamps, frozen prices: auditing a currency API with Node.js"
published: false
description: "Join current quotes with a historical quality report, and avoid treating an unchanged price as a verified bargain."
tags: javascript, api, dataengineering, opensource
---

A price API can answer successfully, return valid JSON, and carry today's date while still showing a number that has not changed for weeks. A monitor that checks only HTTP status and row dates will miss that distinction.

[Cambio Uruguay](https://cambio-uruguay.com) compares published exchange rates from more than 40 Uruguayan exchange houses and banks. Its open-source code has a useful example of this problem: a separate detector for price boards that remain unchanged while their peers move.

Here is a small, read-only integration that makes those warnings visible. It uses the public API, two HTTP requests, and no dependencies or API key.

## A successful scrape is only one signal

There are several different questions to ask about a quote:

| Check | What it can tell you |
| --- | --- |
| Did the request succeed? | The source was reachable. |
| Did parsing return rows? | The collector extracted something. |
| Is the row dated recently? | The stored row belongs to a recent period. |
| Is the buy/sell pair coherent? | The values pass a basic price-shape check. |
| Has the pair changed relative to its own history? | The published board may need verification. |

These checks complement each other. A normal-looking price can pass the first four while remaining unchanged for a long time. Equally, an unchanged price is not proof of an error: a business may intentionally keep it.

The problem becomes more visible in a ranking. Imagine a hypothetical provider whose sell price stays at 40 pesos while other providers move from 40 to 42. Sorting by lowest sell price gradually promotes the stationary quote. The ranking did what it was told; the input needs more context.

## Read both the data and its quality report

The public API exposes current quotes at `GET /` and a historical warning report at `GET /frozen-quotes`.

A quote is identified by **origin, currency code, and quote type**. Joining only by origin would attach a dollar warning to the same provider's euro rate. Ignoring type would mix counter prices with transfer or other channels.

Save this as `audit-frozen-rates.mjs` and run it with Node.js 22 or newer:

```javascript
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

// This example chooses a one-day maximum age for the quality report.
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
```

```bash
node audit-frozen-rates.mjs
```

In this API, an empty `type` is the counter-price channel. The example deliberately selects that channel for USD, rather than combining it with `TRANSFERENCIA`, `EBROU`, or `INTERBANCARIO`. Different channels can have different access conditions.

The report and current quotes are separate requests, so they are not an atomic snapshot. If a provider changes its price between them, the example does not attach the old warning as though the values still matched. It asks for a recheck instead.

## Read the warnings precisely

`daysFrozen` measures calendar days in the observed unchanged run, not the number of rows. Missing daily samples must not make an old quote look younger.

`capped: true` means the unchanged run reaches the beginning of the available observations. A value of `60` with `capped: true` therefore means **at least 60 days**, not exactly 60 days. It does not prove that every intervening intraday price was identical.

The detector also compares each run with the median unchanged duration for the same currency and quote type. In the [implementation](https://github.com/eduair94/cambio-uruguay/blob/main/classes/rate_staleness.ts), a report requires both the absolute minimum duration and an additional gap beyond that group's median. A single threshold across every currency would produce noise when some boards normally move much less often than others.

The detector records whether a flagged price is at a group extreme. That matters for display priority, because an unusually cheap or expensive stationary quote can dominate a ranking. It is a reason to inspect the source, not evidence that an advertised price is unavailable.

## Carry the uncertainty into the interface

The script keeps flagged rows and shows their status. It also distinguishes an unavailable report from a report containing no matching warning. Those are different states.

Absence from this report is not a certification: the detector has a finite history window, minimum sample requirements, and thresholds. If the API is used for a comparison interface, show the quote date and relevant warnings, and link to the original provider for confirmation of price and conditions.

There is another naming trap in currency data: `buy` and `sell` describe the exchange house's side of the transaction. A user buying dollars pays the house's `sell` price; a user selling dollars receives the house's `buy` price.

The [public status dashboard](https://cambio-uruguay.com/estado) is a useful companion when inspecting a source. Developers can also browse the [API and integration documentation](https://cambio-uruguay.com/desarrolladores) and the [MCP server source](https://github.com/eduair94/cambio-uruguay/tree/main/mcp).

The reusable pattern extends beyond exchange rates: join data with quality observations, retain their timestamps and uncertainty, and avoid turning a successful fetch into a stronger claim than the evidence supports.
