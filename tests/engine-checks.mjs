import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const context = {
  console,
  structuredClone,
  globalThis: null,
  window: null
};
context.globalThis = context;
context.window = context;

vm.createContext(context);
vm.runInContext(fs.readFileSync(path.join(root, "src", "data.js"), "utf8"), context);
vm.runInContext(fs.readFileSync(path.join(root, "src", "ticker-universe.js"), "utf8"), context);
vm.runInContext(fs.readFileSync(path.join(root, "src", "engine.js"), "utf8"), context);

const data = context.COPILOT_DATA;
const engine = context.COPILOT_ENGINE;

const balanced = engine.createPortfolioModel(data, data.portfolios.balanced);
assert.equal(balanced.holdings.length, 5);
assert.equal(balanced.sourceCoverage, 1);
assert.ok(balanced.totalValue > 0);
assert.ok(balanced.largestDriver.symbol);

const balancedRiskScore = engine.calculateRiskScore(balanced);
assert.equal(balancedRiskScore.maxScore, 100);
assert.equal(balancedRiskScore.factors.length, 5);
assert.ok(balancedRiskScore.score > 0);

const benchmark = engine.buildBenchmarkComparison(data, balanced, "SPY");
assert.equal(benchmark.key, "SPY");
assert.match(benchmark.name, /simulation benchmark/);
assert.equal(typeof benchmark.differencePct, "number");

const duplicateCsv = [
  "Ticker,Quantity,Cost Basis",
  "aapl,1,10",
  "AAPL,2,20",
  "BAD,,50",
  "ZZZZZZZZ,3,"
].join("\n");
const parsed = engine.parsePortfolioCsv(duplicateCsv);
assert.equal(parsed.holdings.length, 2);
assert.equal(parsed.holdings[0].symbol, "AAPL");
assert.equal(parsed.holdings[0].shares, 3);
assert.equal(Math.round(parsed.holdings[0].costBasis * 100) / 100, 16.67);
assert.ok(parsed.issues.length >= 2);

const unknown = engine.createPortfolioModel(data, parsed.holdings);
assert.equal(unknown.sourceCoverage, 0.5);
assert.equal(unknown.unsupportedHoldings[0].symbol, "ZZZZZZZZ");

const beyondMeat = engine.createPortfolioModel(data, [{ symbol: "BYND", shares: 3, costBasis: 7 }]);
assert.equal(beyondMeat.sourceCoverage, 1);
assert.equal(beyondMeat.unsupportedHoldings.length, 0);
assert.equal(beyondMeat.basicListedHoldings[0].symbol, "BYND");
assert.equal(beyondMeat.holdings[0].supportLevel, "basic-listed");
assert.equal(typeof beyondMeat.holdings[0].instrument.estimateType, "string");
assert.equal(beyondMeat.holdings[0].instrument.calibrationSymbol, "SPY");
assert.equal(beyondMeat.holdings[0].instrument.calibrationRealismScore, 92);
assert.equal(beyondMeat.sourceIds.includes("simulation-export"), true);
assert.match(beyondMeat.holdings[0].instrument.risk, /estimate confidence/i);

const websiteDemo = engine.createPortfolioModel(data, [
  { symbol: "SCHW", shares: 18, costBasis: 73 },
  { symbol: "TSLA", shares: 8, costBasis: 245 },
  { symbol: "AAPL", shares: 10, costBasis: 165 },
  { symbol: "BYND", shares: 45, costBasis: 7 },
  { symbol: "BND", shares: 30, costBasis: 72 }
]);
assert.equal(websiteDemo.sourceCoverage, 1);
assert.equal(websiteDemo.basicListedHoldings.some((holding) => holding.symbol === "TSLA"), true);
assert.equal(websiteDemo.basicListedHoldings.some((holding) => holding.symbol === "BYND"), true);
assert.ok(engine.buildRiskReview(websiteDemo).risks.length > 0);

const zeroBasis = engine.createPortfolioModel(data, [{ symbol: "AAPL", shares: 1, costBasis: 0 }]);
assert.equal(zeroBasis.holdings[0].cost, 0);

const manualAdd = engine.upsertHolding([], { symbol: "msft", shares: "2", costBasis: "400" });
assert.equal(manualAdd.issue, "");
assert.equal(manualAdd.holdings[0].symbol, "MSFT");
assert.equal(manualAdd.holdings[0].shares, 2);

const manualMerge = engine.upsertHolding(manualAdd.holdings, { symbol: "MSFT", shares: "2", costBasis: "500" });
assert.equal(manualMerge.holdings.length, 1);
assert.equal(manualMerge.holdings[0].shares, 4);
assert.equal(manualMerge.holdings[0].costBasis, 450);

const badManualAdd = engine.upsertHolding(manualMerge.holdings, { symbol: "AAPL", shares: "0" });
assert.equal(badManualAdd.issue, "Shares must be a positive number.");

const removed = engine.removeHolding(manualMerge.holdings, "MSFT");
assert.equal(removed.length, 0);

const edited = engine.updateHolding(manualMerge.holdings, "MSFT", { shares: "6", costBasis: "425" });
assert.equal(edited.issue, "");
assert.equal(edited.holdings[0].shares, 6);
assert.equal(edited.holdings[0].costBasis, 425);

const badEdit = engine.updateHolding(manualMerge.holdings, "MSFT", { shares: "-1", costBasis: "425" });
assert.equal(badEdit.issue, "Shares must be a positive number.");

const concentratedRisk = engine.buildRiskReview(engine.createPortfolioModel(data, [{ symbol: "NVDA", shares: 10, costBasis: 900 }]));
assert.equal(concentratedRisk.level, "High Review");
assert.equal(concentratedRisk.risks.some((risk) => risk.label === "Single-holding concentration"), true);
assert.equal(concentratedRisk.factors.some((factor) => factor.label === "Single-position size"), true);
assert.ok(concentratedRisk.score < balancedRiskScore.score);

assert.equal(engine.isAdviceRequest("Is NVDA a good investment?"), true);
assert.equal(engine.isAdviceRequest("Why did my portfolio move today?"), false);

const promptPacket = engine.buildPromptPacket(data, balanced, "advisor", "Why did it move?");
assert.equal(promptPacket.policy.block.includes("buy/sell/hold recommendations"), true);
assert.equal(promptPacket.holdings.every((holding) => holding.citations.length > 0), true);

const readiness = engine.evaluateReadiness(beyondMeat, []);
assert.equal(readiness.some((check) => check.label === "Estimate quality" && check.status === "review"), true);
assert.match(readiness.find((check) => check.label === "Estimate quality").detail, /Stock Market Simulation/);

console.log("engine checks passed");
