import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const context = {
  window: null,
  globalThis: null
};
context.window = context;
context.globalThis = context;

vm.createContext(context);
vm.runInContext(fs.readFileSync(path.join(root, "src", "ticker-universe.js"), "utf8"), context);

const tickers = context.COPILOT_TICKERS;
assert.ok(Array.isArray(tickers), "ticker universe should be an array");
assert.ok(tickers.length > 10000, "ticker universe should use exchange listings, not a curated shortlist");

const bySymbol = new Map(tickers.map((ticker) => [ticker.symbol, ticker]));
assert.equal(bySymbol.has("BYND"), true, "Beyond Meat should be searchable by BYND");
assert.match(bySymbol.get("BYND").name, /Beyond Meat/i);
assert.equal(bySymbol.has("TSLA"), true, "Tesla should be searchable by TSLA");
assert.equal(bySymbol.has("AAPL"), true, "Apple should be searchable by AAPL");
assert.equal(bySymbol.has("SPY"), true, "SPY ETF should be searchable");

console.log(`ticker universe checks passed (${tickers.length} symbols)`);

