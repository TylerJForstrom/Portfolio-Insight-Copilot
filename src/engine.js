(function attachEngine(global) {
  function clonePortfolio(value) {
    if (typeof global.structuredClone === "function") {
      return global.structuredClone(value);
    }
    return JSON.parse(JSON.stringify(value));
  }

  function normalizeSymbol(symbol) {
    return String(symbol || "").trim().toUpperCase();
  }

  function normalizeHeader(header) {
    return String(header || "").trim().toLowerCase().replace(/[^a-z0-9]/g, "");
  }

  function parseCsvLine(line) {
    const cells = [];
    let current = "";
    let inQuotes = false;

    for (let index = 0; index < line.length; index += 1) {
      const char = line[index];
      const next = line[index + 1];

      if (char === "\"" && inQuotes && next === "\"") {
        current += "\"";
        index += 1;
      } else if (char === "\"") {
        inQuotes = !inQuotes;
      } else if (char === "," && !inQuotes) {
        cells.push(current.trim());
        current = "";
      } else {
        current += char;
      }
    }

    cells.push(current.trim());
    return cells;
  }

  function findColumn(headers, aliases) {
    return headers.findIndex((header) => aliases.includes(header));
  }

  function parseNumber(value) {
    const cleaned = String(value ?? "").replace(/[$,%\s]/g, "").replace(/,/g, "");
    if (!cleaned) return undefined;
    const number = Number(cleaned);
    return Number.isFinite(number) ? number : undefined;
  }

  function symbolSeed(symbol) {
    return String(symbol || "").split("").reduce((sum, char, index) => {
      return sum + (char.charCodeAt(0) * (index + 17));
    }, 0);
  }

  function securityProfile(listing) {
    const name = String(listing?.name || "").toLowerCase();
    const sector = String(listing?.sector || "").toLowerCase();

    if (name.includes("warrant") || /\.w$/i.test(listing?.symbol || "")) {
      return { label: "Warrant", base: 2, range: 18, beta: 2.1, confidence: "Lower estimate confidence" };
    }

    if (name.includes("preferred") || name.includes("depositary shares")) {
      return { label: "Preferred or depositary share", base: 18, range: 42, beta: 0.35, confidence: "Medium estimate confidence" };
    }

    if (name.includes("note") || name.includes("bond")) {
      return { label: "Income security", base: 20, range: 85, beta: 0.25, confidence: "Medium estimate confidence" };
    }

    if (sector.includes("etf") || name.includes(" etf") || name.includes(" fund")) {
      return { label: "ETF or fund", base: 25, range: 180, beta: 0.85, confidence: "Medium estimate confidence" };
    }

    if (name.includes("american depositary") || name.includes("ads")) {
      return { label: "ADR", base: 8, range: 110, beta: 1.15, confidence: "Medium estimate confidence" };
    }

    return { label: "Common stock", base: 12, range: 260, beta: 1.05, confidence: "Medium estimate confidence" };
  }

  function simulationBackedEstimate(data, symbol, listing) {
    const seed = symbolSeed(symbol);
    const profile = securityProfile(listing);
    const reference = data.simulationReference || {};
    const dailyVolPct = Number(reference.annualizedVolatilityPct || 24) / Math.sqrt(252);
    const marketDailyPct = Number.isFinite(Number(reference.latestDailyMovePct))
      ? Number(reference.latestDailyMovePct)
      : 0;
    const price = profile.base + (seed % profile.range) + ((seed % 97) / 100);
    const idiosyncratic = (((seed % 101) - 50) / 50) * dailyVolPct * 0.65;
    const rawChangePct = (marketDailyPct * profile.beta) + idiosyncratic;
    const maxMove = Math.max(1.5, dailyVolPct * profile.beta * 2.5);
    const dayChangePct = Math.max(Math.min(rawChangePct, maxMove), -maxMove);
    const previousClose = price / (1 + (dayChangePct / 100));
    return {
      price: Number(price.toFixed(2)),
      previousClose: Number(previousClose.toFixed(2)),
      dayChangePct: Number(dayChangePct.toFixed(2)),
      estimateType: profile.label,
      estimateConfidence: profile.confidence,
      calibrationSymbol: reference.symbol || "SPY",
      calibrationVolatilityPct: Number((reference.annualizedVolatilityPct || 0).toFixed?.(2) || reference.annualizedVolatilityPct || 0),
      calibrationRealismScore: reference.realismScore
    };
  }

  function listedSecurityFor(symbol) {
    const normalized = normalizeSymbol(symbol);
    return (global.COPILOT_TICKERS || []).find((ticker) => normalizeSymbol(ticker.symbol) === normalized);
  }

  function mergeHolding(existing, incoming) {
    if (!existing) return incoming;

    const shares = existing.shares + incoming.shares;
    let costBasis;
    if (Number.isFinite(existing.costBasis) && Number.isFinite(incoming.costBasis)) {
      costBasis = ((existing.costBasis * existing.shares) + (incoming.costBasis * incoming.shares)) / shares;
    } else {
      costBasis = Number.isFinite(existing.costBasis) ? existing.costBasis : incoming.costBasis;
    }

    return { symbol: existing.symbol, shares, costBasis };
  }

  function parsePortfolioCsv(text) {
    const lines = String(text || "").split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
    const issues = [];
    if (lines.length < 2) {
      return { holdings: [], issues: ["CSV must include a header row and at least one holding row."] };
    }

    const headers = parseCsvLine(lines[0]).map(normalizeHeader);
    const symbolIndex = findColumn(headers, ["symbol", "ticker"]);
    const sharesIndex = findColumn(headers, ["shares", "quantity", "qty", "units"]);
    const costIndex = findColumn(headers, ["costbasis", "avgcost", "averagecost", "basis", "cost"]);

    if (symbolIndex === -1 || sharesIndex === -1) {
      return { holdings: [], issues: ["CSV must include symbol/ticker and shares/quantity columns."] };
    }

    const bySymbol = new Map();
    lines.slice(1).forEach((line, rowIndex) => {
      const cells = parseCsvLine(line);
      const symbol = normalizeSymbol(cells[symbolIndex]);
      const shares = parseNumber(cells[sharesIndex]);
      const costBasis = costIndex === -1 ? undefined : parseNumber(cells[costIndex]);
      const displayRow = rowIndex + 2;

      if (!symbol) {
        issues.push(`Row ${displayRow} skipped: missing symbol.`);
        return;
      }

      if (!Number.isFinite(shares) || shares <= 0) {
        issues.push(`Row ${displayRow} skipped: shares must be a positive number.`);
        return;
      }

      if (costIndex !== -1 && !Number.isFinite(costBasis)) {
        issues.push(`Row ${displayRow}: cost basis was blank or invalid, so previous close will be used.`);
      }

      const incoming = { symbol, shares, costBasis };
      bySymbol.set(symbol, mergeHolding(bySymbol.get(symbol), incoming));
    });

    return { holdings: Array.from(bySymbol.values()), issues };
  }

  function instrumentFor(data, symbol) {
    const normalized = normalizeSymbol(symbol);
    if (data.instruments[normalized]) {
      return {
        ...data.instruments[normalized],
        supportLevel: "detailed"
      };
    }

    const listing = listedSecurityFor(normalized);
    if (listing) {
      const priceModel = simulationBackedEstimate(data, normalized, listing);
      return {
        name: listing.name,
        sector: listing.sector || "Listed security",
        price: priceModel.price,
        previousClose: priceModel.previousClose,
        dayChangePct: priceModel.dayChangePct,
        sectorMovePct: 0,
        driver: `${listing.name} is covered by the local exchange-listed ticker directory. The app uses a ${priceModel.estimateType.toLowerCase()} estimate calibrated from the Stock Market Simulation ${priceModel.calibrationSymbol} sample run and avoids inventing company-specific news.`,
        risk: `${priceModel.estimateConfidence}: simulation-backed estimate only; review real quotes, filings, liquidity, company news, and volatility before making any investment decision.`,
        sourceIds: ["simulation-estimate-model", "simulation-export", "symbol-directory", "generic-listed-context"],
        supportLevel: "basic-listed",
        estimateType: priceModel.estimateType,
        estimateConfidence: priceModel.estimateConfidence,
        calibrationSymbol: priceModel.calibrationSymbol,
        calibrationVolatilityPct: priceModel.calibrationVolatilityPct,
        calibrationRealismScore: priceModel.calibrationRealismScore
      };
    }

    return {
      name: `${normalized || "Unknown"} holding`,
      sector: "Unmapped",
      price: 100,
      previousClose: 100,
      dayChangePct: 0,
      sectorMovePct: 0,
      driver: "No retrieved market context is available for this uploaded symbol.",
      risk: "Missing market context should be flagged before generating investor-facing explanations.",
      sourceIds: ["price-feed"],
      supportLevel: "custom",
      unsupported: true
    };
  }

  function enrichHolding(data, holding) {
    const symbol = normalizeSymbol(holding.symbol);
    const instrument = instrumentFor(data, symbol);
    const shares = Number(holding.shares);
    const rawCostBasis = Number(holding.costBasis);
    const costBasis = Number.isFinite(rawCostBasis) ? rawCostBasis : instrument.previousClose;
    const value = shares * instrument.price;
    const previousValue = shares * instrument.previousClose;
    const cost = shares * costBasis;
    const dailyMove = value - previousValue;

    return {
      ...holding,
      symbol,
      shares,
      costBasis,
      instrument,
      value,
      previousValue,
      cost,
      dailyMove,
      unrealized: value - cost,
      dailyMovePct: previousValue ? dailyMove / previousValue : 0,
      weight: 0,
      isSupported: !instrument.unsupported,
      supportLevel: instrument.supportLevel || "detailed"
    };
  }

  function createPortfolioModel(data, holdingsInput) {
    const holdings = (holdingsInput || []).map((holding) => enrichHolding(data, holding));
    const totalValue = holdings.reduce((sum, holding) => sum + holding.value, 0);
    const previousValue = holdings.reduce((sum, holding) => sum + holding.previousValue, 0);
    const totalCost = holdings.reduce((sum, holding) => sum + holding.cost, 0);

    holdings.forEach((holding) => {
      holding.weight = totalValue ? holding.value / totalValue : 0;
    });

    const topDrivers = [...holdings].sort((a, b) => Math.abs(b.dailyMove) - Math.abs(a.dailyMove));
    const sourceIds = [...new Set(holdings.flatMap((holding) => holding.instrument.sourceIds || []))];
    const unsupportedHoldings = holdings.filter((holding) => !holding.isSupported);
    const basicListedHoldings = holdings.filter((holding) => holding.supportLevel === "basic-listed");
    const mappedCount = holdings.length - unsupportedHoldings.length;
    const concentration = holdings.reduce((max, holding) => Math.max(max, holding.weight), 0);
    const sectorAllocation = Array.from(holdings.reduce((map, holding) => {
      const sector = holding.instrument.sector;
      map.set(sector, (map.get(sector) || 0) + holding.value);
      return map;
    }, new Map()).entries())
      .map(([sector, value]) => ({ sector, value, weight: totalValue ? value / totalValue : 0 }))
      .sort((a, b) => b.value - a.value);

    return {
      holdings,
      totalValue,
      previousValue,
      totalCost,
      dailyMove: totalValue - previousValue,
      dailyMovePct: previousValue ? (totalValue - previousValue) / previousValue : 0,
      largestDriver: topDrivers[0],
      topDrivers,
      sourceIds,
      sourceCoverage: holdings.length ? mappedCount / holdings.length : 0,
      unsupportedHoldings,
      basicListedHoldings,
      concentration,
      sectorAllocation
    };
  }

  function upsertHolding(holdingsInput, incomingHolding) {
    const symbol = normalizeSymbol(incomingHolding.symbol);
    const shares = parseNumber(incomingHolding.shares);
    const costBasis = parseNumber(incomingHolding.costBasis);

    if (!symbol) {
      return { holdings: clonePortfolio(holdingsInput || []), issue: "Enter a ticker symbol." };
    }

    if (!Number.isFinite(shares) || shares <= 0) {
      return { holdings: clonePortfolio(holdingsInput || []), issue: "Shares must be a positive number." };
    }

    const holdings = clonePortfolio(holdingsInput || []);
    const index = holdings.findIndex((holding) => normalizeSymbol(holding.symbol) === symbol);
    const incoming = { symbol, shares, costBasis };

    if (index === -1) {
      return { holdings: [...holdings, incoming], issue: "" };
    }

    holdings[index] = mergeHolding(
      {
        symbol: normalizeSymbol(holdings[index].symbol),
        shares: Number(holdings[index].shares),
        costBasis: Number.isFinite(Number(holdings[index].costBasis)) ? Number(holdings[index].costBasis) : undefined
      },
      incoming
    );

    return { holdings, issue: "" };
  }

  function removeHolding(holdingsInput, symbol) {
    const normalized = normalizeSymbol(symbol);
    return clonePortfolio(holdingsInput || []).filter((holding) => normalizeSymbol(holding.symbol) !== normalized);
  }

  function updateHolding(holdingsInput, symbol, patch) {
    const normalized = normalizeSymbol(symbol);
    const shares = parseNumber(patch.shares);
    const costBasis = parseNumber(patch.costBasis);

    if (!Number.isFinite(shares) || shares <= 0) {
      return { holdings: clonePortfolio(holdingsInput || []), issue: "Shares must be a positive number." };
    }

    const holdings = clonePortfolio(holdingsInput || []);
    const index = holdings.findIndex((holding) => normalizeSymbol(holding.symbol) === normalized);
    if (index === -1) {
      return { holdings, issue: `${normalized} is not in the current portfolio.` };
    }

    holdings[index] = {
      ...holdings[index],
      symbol: normalized,
      shares,
      costBasis
    };

    return { holdings, issue: "" };
  }

  function isAdviceRequest(question) {
    return /\b(should\s+i|should\s+we|can\s+i|get\s+rich|buy|sell|hold|recommend|recommendation|price\s*target|guaranteed|best\s+stock|will\s+\w+\s+go\s+up|good\s+investment|outperform|beat\s+the\s+market|what\s+should\s+i\s+invest|undervalued|overvalued)\b/i.test(question);
  }

  function evaluateReadiness(model, guardrailEvents) {
    return [
      {
        label: "Source grounding",
        status: model.sourceCoverage === 1 ? "pass" : "review",
        detail: model.sourceCoverage === 1
          ? model.basicListedHoldings.length
            ? `${model.basicListedHoldings.length} holding(s) use simulation-backed listed-symbol estimates; detailed symbols use curated demo context.`
            : "Every holding has mapped context."
          : `${model.unsupportedHoldings.length} holding(s) need external retrieval before investor-facing use.`
      },
      {
        label: "Advice boundary",
        status: "pass",
        detail: `${guardrailEvents.length} advice request(s) blocked this session.`
      },
      {
        label: "Concentration review",
        status: model.concentration > 0.35 ? "review" : "pass",
        detail: model.concentration > 0.35
          ? "One position is above the 35% review threshold."
          : "No position is above the 35% review threshold."
      },
      {
        label: "Citation coverage",
        status: model.sourceIds.length > 0 ? "pass" : "review",
        detail: `${model.sourceIds.length} retrieved source record(s) attached.`
      },
      {
        label: "Estimate quality",
        status: model.basicListedHoldings.length ? "review" : "pass",
        detail: model.basicListedHoldings.length
          ? `${model.basicListedHoldings.map((holding) => holding.symbol).join(", ")} use Stock Market Simulation-calibrated estimates instead of curated quote records.`
          : "All current holdings use curated static quote records."
      }
    ];
  }

  function scoreStatus(score, maxScore) {
    const ratio = maxScore ? score / maxScore : 0;
    if (ratio >= 0.75) return "pass";
    if (ratio >= 0.4) return "review";
    return "high";
  }

  function scoreFactor(label, score, maxScore, detail) {
    return {
      label,
      score,
      maxScore,
      status: scoreStatus(score, maxScore),
      detail
    };
  }

  function calculateRiskScore(model) {
    if (!model.holdings.length) {
      const factors = [
        scoreFactor("Holdings present", 0, 20, "Add holdings before the demo can evaluate portfolio shape."),
        scoreFactor("Source grounding", 0, 20, "No holdings are available for source matching."),
        scoreFactor("Concentration", 0, 25, "No position weights are available yet."),
        scoreFactor("Sector exposure", 0, 20, "No sector weights are available yet."),
        scoreFactor("Daily volatility", 0, 15, "No daily movement is available yet.")
      ];
      return { score: 0, maxScore: 100, label: "Start", factors };
    }

    const topHolding = [...model.holdings].sort((a, b) => b.weight - a.weight)[0];
    const topSector = model.sectorAllocation[0];
    const maxDailyMove = model.holdings.reduce((max, holding) => Math.max(max, Math.abs(holding.dailyMovePct)), 0);

    const holdingsScore = model.holdings.length >= 6 ? 20 : model.holdings.length >= 4 ? 16 : model.holdings.length >= 2 ? 8 : 3;
    const sourceScore = Math.round(model.sourceCoverage * 20);
    const concentrationScore = topHolding.weight <= 0.25 ? 25 : topHolding.weight <= 0.35 ? 18 : topHolding.weight <= 0.5 ? 9 : 2;
    const sectorScore = !topSector || topSector.weight <= 0.4 ? 20 : topSector.weight <= 0.5 ? 14 : topSector.weight <= 0.65 ? 7 : 2;
    const volatilityScore = maxDailyMove <= 0.015 ? 15 : maxDailyMove <= 0.025 ? 11 : maxDailyMove <= 0.05 ? 6 : 2;

    const factors = [
      scoreFactor("Holdings mix", holdingsScore, 20, `${model.holdings.length} holding(s) are included in the current demo portfolio.`),
      scoreFactor("Source grounding", sourceScore, 20, `${Math.round(model.sourceCoverage * 100)}% of holdings have listed or detailed source context.`),
      scoreFactor("Single-position size", concentrationScore, 25, `${topHolding.symbol} is the largest position at ${Math.round(topHolding.weight * 100)}% of value.`),
      scoreFactor("Sector exposure", sectorScore, 20, `${topSector?.sector || "No sector"} is the largest sector at ${Math.round((topSector?.weight || 0) * 100)}%.`),
      scoreFactor("Daily volatility", volatilityScore, 15, `Largest absolute demo daily move is ${(maxDailyMove * 100).toFixed(2)}%.`)
    ];
    const score = factors.reduce((sum, factor) => sum + factor.score, 0);
    const label = score >= 80 ? "Strong" : score >= 65 ? "Watch" : "Needs Review";

    return { score, maxScore: 100, label, factors };
  }

  function buildBenchmarkComparison(data, model, benchmarkKey) {
    const benchmarks = data.benchmarks || {};
    const fallbackKey = benchmarks[benchmarkKey] ? benchmarkKey : Object.keys(benchmarks)[0];
    const benchmark = benchmarks[fallbackKey];

    if (!benchmark) {
      return {
        key: "",
        name: "No benchmark",
        portfolioReturnPct: model.dailyMovePct,
        benchmarkReturnPct: 0,
        differencePct: model.dailyMovePct,
        resultLabel: "Benchmark data unavailable",
        sourceIds: []
      };
    }

    const benchmarkReturnPct = benchmark.previousClose
      ? (benchmark.price - benchmark.previousClose) / benchmark.previousClose
      : 0;
    const differencePct = model.dailyMovePct - benchmarkReturnPct;
    const resultLabel = differencePct >= 0
      ? `Ahead by ${(differencePct * 100).toFixed(2)} percentage points`
      : `Behind by ${Math.abs(differencePct * 100).toFixed(2)} percentage points`;

    return {
      key: fallbackKey,
      name: benchmark.name,
      portfolioReturnPct: model.dailyMovePct,
      benchmarkReturnPct,
      differencePct,
      resultLabel,
      sourceIds: benchmark.sourceIds || []
    };
  }

  function buildRiskReview(model) {
    const risks = [];
    const nextSteps = [];
    const topHolding = [...model.holdings].sort((a, b) => b.weight - a.weight)[0];
    const topSector = model.sectorAllocation[0];
    const riskScore = calculateRiskScore(model);

    if (!model.holdings.length) {
      return {
        level: "Start",
        score: riskScore.score,
        scoreLabel: riskScore.label,
        factors: riskScore.factors,
        summary: "Add at least one holding to generate a portfolio risk review.",
        risks: [
          {
            label: "No holdings yet",
            severity: "review",
            detail: "The copilot needs holdings before it can estimate concentration, sector, source, or movement risks."
          }
        ],
        nextSteps: ["Add a ticker and share count to begin."]
      };
    }

    if (model.holdings.length < 4) {
      risks.push({
        label: "Limited diversification",
        severity: "review",
        detail: "The portfolio has fewer than four holdings, so a single company or fund can drive a large part of returns."
      });
      nextSteps.push("Consider whether the portfolio has enough holdings for your intended level of diversification.");
    }

    if (topHolding && topHolding.weight > 0.35) {
      risks.push({
        label: "Single-holding concentration",
        severity: "high",
        detail: `${topHolding.symbol} is ${Math.round(topHolding.weight * 100)}% of the portfolio, above the 35% review threshold.`
      });
      nextSteps.push(`Review whether ${topHolding.symbol} is intentionally this large relative to the rest of the portfolio.`);
    }

    if (topSector && topSector.weight > 0.5) {
      risks.push({
        label: "Sector concentration",
        severity: topSector.weight > 0.65 ? "high" : "review",
        detail: `${topSector.sector} is ${Math.round(topSector.weight * 100)}% of current value. Similar holdings can move together.`
      });
      nextSteps.push("Compare sector exposure against your target allocation.");
    }

    if (model.unsupportedHoldings.length) {
      risks.push({
        label: "Missing source context",
        severity: "review",
        detail: `${model.unsupportedHoldings.map((holding) => holding.symbol).join(", ")} has no mapped market context, so the app avoids inventing a risk explanation.`
      });
      nextSteps.push("Add retrieval coverage before relying on generated explanations for unsupported symbols.");
    }

    if (model.basicListedHoldings.length) {
      risks.push({
        label: "Basic listed-data coverage",
        severity: "review",
        detail: `${model.basicListedHoldings.map((holding) => holding.symbol).join(", ")} uses exchange listing metadata plus generic risk context instead of company-specific news.`
      });
      nextSteps.push("For a production app, enrich basic listed holdings with live quotes, filings, and news retrieval.");
    }

    const volatileHoldings = model.holdings.filter((holding) => Math.abs(holding.dailyMovePct) > 0.025);
    if (volatileHoldings.length) {
      risks.push({
        label: "Higher daily volatility",
        severity: "review",
        detail: `${volatileHoldings.map((holding) => holding.symbol).join(", ")} moved more than 2.5% in the simulation-backed demo session.`
      });
      nextSteps.push("Check whether larger daily swings match the investor's risk tolerance.");
    }

    if (model.sourceCoverage < 1) {
      risks.push({
        label: "Incomplete grounding",
        severity: "review",
        detail: `Source coverage is ${Math.round(model.sourceCoverage * 100)}%, so some holdings lack retrieved context.`
      });
    }

    if (!risks.length) {
      risks.push({
        label: "No major static-data risk flags",
        severity: "pass",
        detail: "No single holding or sector exceeded the review thresholds in this demo dataset."
      });
      nextSteps.push("Review goals, time horizon, liquidity needs, and real market data before making any investment decisions.");
    }

    const hasHigh = risks.some((risk) => risk.severity === "high");
    const hasReview = risks.some((risk) => risk.severity === "review");

    return {
      level: hasHigh ? "High Review" : hasReview ? "Review" : "Balanced",
      score: riskScore.score,
      scoreLabel: riskScore.label,
      factors: riskScore.factors,
      summary: hasHigh
        ? "The demo AI review found concentration or grounding issues that deserve attention before treating the portfolio as balanced."
        : hasReview
          ? "The demo AI review found items to review, but no single issue automatically means the portfolio is unsuitable."
          : "The demo AI review did not find major concentration flags in the current data.",
      risks,
      nextSteps
    };
  }

  function buildPromptPacket(data, model, depth, question) {
    return {
      task: "Explain portfolio movement using only retrieved facts.",
      marketDate: data.marketDate,
      explanationDepth: depth,
      userQuestion: question,
      policy: {
        allow: ["education", "portfolio attribution", "risk explanation", "source-grounded summaries"],
        block: ["buy/sell/hold recommendations", "price targets", "guaranteed return claims"]
      },
      portfolio: {
        totalValue: Number(model.totalValue.toFixed(2)),
        dailyMove: Number(model.dailyMove.toFixed(2)),
        dailyMovePct: Number((model.dailyMovePct * 100).toFixed(2)),
        sourceCoveragePct: Number((model.sourceCoverage * 100).toFixed(0))
      },
      holdings: model.holdings.map((holding) => ({
        symbol: holding.symbol,
        weightPct: Number((holding.weight * 100).toFixed(2)),
        dailyMove: Number(holding.dailyMove.toFixed(2)),
        driver: holding.instrument.driver,
        risk: holding.instrument.risk,
        citations: holding.instrument.sourceIds
      }))
    };
  }

  function buildBriefing(model, insight, readinessChecks) {
    return [
      "Portfolio Insight Copilot Briefing",
      "===================================",
      "",
      `Total value: ${model.totalValue.toFixed(2)}`,
      `Daily move: ${model.dailyMove.toFixed(2)} (${(model.dailyMovePct * 100).toFixed(2)}%)`,
      `Source coverage: ${(model.sourceCoverage * 100).toFixed(0)}%`,
      "",
      "Explanation:",
      ...insight.map((line) => `- ${line}`),
      "",
      "AI readiness checks:",
      ...readinessChecks.map((check) => `- ${check.label}: ${check.status.toUpperCase()} - ${check.detail}`)
    ].join("\n");
  }

  global.COPILOT_ENGINE = {
    clonePortfolio,
    createPortfolioModel,
    parsePortfolioCsv,
    upsertHolding,
    removeHolding,
    updateHolding,
    buildRiskReview,
    calculateRiskScore,
    buildBenchmarkComparison,
    isAdviceRequest,
    evaluateReadiness,
    buildPromptPacket,
    buildBriefing
  };
})(typeof window !== "undefined" ? window : globalThis);
