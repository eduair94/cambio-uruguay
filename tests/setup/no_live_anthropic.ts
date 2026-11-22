// Every module that reaches Claude does `import "dotenv/config"`, and a developer's root .env points
// at production. Suites mock classes/gemini but not classes/anthropic, so a real key in .env would
// make them spend real credit. dotenv never overwrites a variable that already exists — even an
// empty one — so blanking them here, before any test file imports anything, keeps every suite
// offline. Tests that exercise the client set their own fake keys.
for (const name of ["ANTHROPIC_API_KEYS", "CLAUDE_CREDIT_KEYS", "ANTHROPIC_API_KEY", ...Array.from({ length: 9 }, (_v, i) => `ANTHROPIC_API_KEY_${i + 1}`)]) {
  process.env[name] = "";
}

// The monthly-cap ledger (classes/anthropic.ts) appends to <cwd>/.anthropic-usage by default: in a
// test run that would write inside the checkout. Each test file gets its own temporary directory.
import fs from "fs";
import os from "os";
import path from "path";
process.env.ANTHROPIC_USAGE_DIR = fs.mkdtempSync(path.join(os.tmpdir(), "anthropic-usage-test-"));
