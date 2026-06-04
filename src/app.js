const data = window.COPILOT_DATA;
const engine = window.COPILOT_ENGINE;
const STORAGE_KEY = "portfolio-insight-copilot-demo-save";

function readSavedPortfolio() {
  try {
    const raw = window.localStorage?.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed.holdings)) return null;
    return {
      ...parsed,
      holdings: parsed.holdings.filter((holding) => holding && holding.symbol && Number(holding.shares) > 0)
    };
  } catch (error) {
    return null;
  }
}

function writeSavedPortfolio(payload) {
  try {
    window.localStorage?.setItem(STORAGE_KEY, JSON.stringify(payload));
    return true;
  } catch (error) {
    return false;
  }
}

function removeSavedPortfolio() {
  try {
    window.localStorage?.removeItem(STORAGE_KEY);
    return true;
  } catch (error) {
    return false;
  }
}

function formatSavedAt(value) {
  if (!value) return "saved locally";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "saved locally";
  return `saved ${date.toLocaleDateString("en-US", { month: "short", day: "numeric" })} at ${date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}`;
}

const initialSavedPortfolio = readSavedPortfolio();

const state = {
  portfolioKey: initialSavedPortfolio?.holdings.length ? "saved" : "balanced",
  holdings: engine.clonePortfolio(initialSavedPortfolio?.holdings.length ? initialSavedPortfolio.holdings : data.portfolios.balanced),
  depth: initialSavedPortfolio?.depth || "beginner",
  benchmarkKey: initialSavedPortfolio?.benchmarkKey && data.benchmarks[initialSavedPortfolio.benchmarkKey]
    ? initialSavedPortfolio.benchmarkKey
    : "SPY",
  lastQuestion: "Why did my portfolio move today?",
  lastInsight: [],
  guardrailEvents: [],
  uploadIssues: [],
  builderMessage: "",
  saveMessage: initialSavedPortfolio?.holdings.length ? `Browser demo portfolio loaded (${formatSavedAt(initialSavedPortfolio.savedAt)}).` : "",
  activeView: "insights",
  showPromptPacket: false
};

const money = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0
});

const moneyPrecise = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 2
});

const percent = new Intl.NumberFormat("en-US", {
  style: "percent",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2
});

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => Array.from(document.querySelectorAll(selector));
const depthDetails = {
  beginner: {
    label: "Beginner mode",
    detail: "Plain-language explanation with the main driver, simple risk wording, and a short disclaimer."
  },
  investor: {
    label: "Investor mode",
    detail: "Adds weights, dollar impact, and retrieved driver detail for a more analytical portfolio view."
  },
  advisor: {
    label: "Advisor mode",
    detail: "Frames the explanation as attribution, source grounding, and risk-review language."
  }
};
const tickerUniverse = Array.from(new Map([
  ...Object.entries(data.instruments).map(([symbol, instrument]) => [symbol, {
    symbol,
    name: instrument.name,
    sector: instrument.sector,
    hasContext: true
  }]),
  ...(window.COPILOT_TICKERS || []).map((ticker) => [ticker.symbol, {
    ...ticker,
    hasContext: Boolean(data.instruments[ticker.symbol])
  }])
]).values()).sort((a, b) => a.symbol.localeCompare(b.symbol));

const demoPortfolio = [
  { symbol: "SCHW", shares: 18, costBasis: 73 },
  { symbol: "TSLA", shares: 8, costBasis: 245 },
  { symbol: "AAPL", shares: 10, costBasis: 165 },
  { symbol: "BYND", shares: 45, costBasis: 7 },
  { symbol: "BND", shares: 30, costBasis: 72 }
];

function getPortfolioModel() {
  return engine.createPortfolioModel(data, state.holdings);
}

function sourceFor(id) {
  return data.sources[id] ?? {
    title: id,
    type: "Missing source metadata",
    detail: "This citation ID was attached to a holding but no source record exists.",
    reliability: "Review required"
  };
}

function signedMoney(value) {
  return `${value >= 0 ? "+" : ""}${moneyPrecise.format(value)}`;
}

function signedPercent(value) {
  return `${value >= 0 ? "+" : ""}${percent.format(value)}`;
}

function depthIntro(model) {
  if (!model.largestDriver) {
    return "No valid holdings are available yet, so the copilot cannot explain portfolio movement.";
  }

  const direction = model.dailyMove >= 0 ? "rose" : "fell";
  const move = `${moneyPrecise.format(Math.abs(model.dailyMove))} (${percent.format(Math.abs(model.dailyMovePct))})`;
  const driver = model.largestDriver;

  const intros = {
    beginner: `Your portfolio ${direction} by ${move} today. The largest contributor was ${driver.symbol}, mainly because ${driver.instrument.driver.toLowerCase()}`,
    investor: `The portfolio ${direction} by ${move}, with ${driver.symbol} contributing ${signedMoney(driver.dailyMove)} at a ${percent.format(driver.weight)} portfolio weight. The key retrieved driver was: ${driver.instrument.driver}`,
    advisor: `Portfolio return attribution shows a ${direction === "rose" ? "positive" : "negative"} ${percent.format(Math.abs(model.dailyMovePct))} session. ${driver.symbol} was the top absolute contributor, combining a ${signedPercent(driver.dailyMovePct)} holding move with a ${percent.format(driver.weight)} portfolio weight. Retrieved context: ${driver.instrument.driver}`
  };

  return intros[state.depth];
}

function buildInsight(model) {
  if (!model.holdings.length) {
    return ["Upload or select a portfolio with at least one valid holding to generate an explanation."];
  }

  const topDrivers = model.topDrivers.slice(0, 3);
  const positiveDrivers = topDrivers.filter((holding) => holding.dailyMove >= 0);
  const negativeDrivers = topDrivers.filter((holding) => holding.dailyMove < 0);
  const topSector = model.sectorAllocation[0];

  const bullets = [depthIntro(model)];

  if (positiveDrivers.length) {
    const names = positiveDrivers.map((holding) => `${holding.symbol} ${signedMoney(holding.dailyMove)}`).join(", ");
    bullets.push(`Positive contributors: ${names}.`);
  }

  if (negativeDrivers.length) {
    const names = negativeDrivers.map((holding) => `${holding.symbol} ${signedMoney(holding.dailyMove)}`).join(", ");
    bullets.push(`Offsets: ${names}.`);
  }

  if (topSector) {
    bullets.push(`Largest exposure: ${topSector.sector} represents ${percent.format(topSector.weight)} of the current portfolio value.`);
  }

  if (model.concentration > 0.35) {
    bullets.push("Concentration check: one holding is above 35% of the portfolio, so a single security can dominate daily movement.");
  } else {
    bullets.push("Diversification check: no single holding is above 35%, so the movement came from several positions rather than one oversized exposure.");
  }

  if (model.unsupportedHoldings.length) {
    const symbols = model.unsupportedHoldings.map((holding) => holding.symbol).join(", ");
    bullets.push(`Data quality check: ${symbols} has no retrieved company or market context, so the system uses a neutral placeholder instead of inventing a reason.`);
  }

  bullets.push("This is an educational explanation based on curated demo records, simulation-backed estimates, and retrieved context. It does not recommend buying, selling, or holding any security.");

  return bullets;
}

function renderSummary(model) {
  $("#portfolioCount").textContent = `${model.holdings.length} holding${model.holdings.length === 1 ? "" : "s"}`;
  $("#totalValue").textContent = money.format(model.totalValue);
  $("#totalCost").textContent = `Cost basis ${money.format(model.totalCost)}`;
  $("#dailyMove").textContent = signedMoney(model.dailyMove);
  $("#dailyMove").className = model.dailyMove >= 0 ? "positive" : "negative";
  $("#dailyMovePct").textContent = signedPercent(model.dailyMovePct);
  $("#largestDriver").textContent = model.largestDriver?.symbol ?? "--";
  $("#largestDriverDetail").textContent = model.largestDriver
    ? `${model.largestDriver.instrument.sector}, ${signedMoney(model.largestDriver.dailyMove)}`
    : "Awaiting data";
  $("#sourceCoverage").textContent = percent.format(model.sourceCoverage);
  $("#sourceCoverage").className = model.sourceCoverage === 1 ? "positive" : "negative";
}

function renderBenchmark(model) {
  const comparison = engine.buildBenchmarkComparison(data, model, state.benchmarkKey);
  const diffText = `${comparison.differencePct >= 0 ? "+" : ""}${(comparison.differencePct * 100).toFixed(2)} pp`;
  const diffClass = comparison.differencePct >= 0 ? "positive" : "negative";
  $("#benchmarkDiff").textContent = diffText;
  $("#benchmarkDiff").className = diffClass;
  $("#benchmarkName").textContent = `${comparison.key}: ${comparison.name}`;
  $("#benchmarkSummary").innerHTML = `
    <p><strong>${escapeHtml(comparison.resultLabel)}.</strong> Portfolio return was ${signedPercent(comparison.portfolioReturnPct)} versus ${signedPercent(comparison.benchmarkReturnPct)} for ${escapeHtml(comparison.key)}.</p>
    <small>SPY uses a Stock Market Simulation sample export; other benchmarks use static estimates so the website demo stays free.</small>
  `;

  const maxReturn = Math.max(Math.abs(comparison.portfolioReturnPct), Math.abs(comparison.benchmarkReturnPct), 0.001);
  const portfolioWidth = Math.max((Math.abs(comparison.portfolioReturnPct) / maxReturn) * 100, 4);
  const benchmarkWidth = Math.max((Math.abs(comparison.benchmarkReturnPct) / maxReturn) * 100, 4);
  $("#benchmarkBars").innerHTML = [
    { label: "Portfolio", value: comparison.portfolioReturnPct, width: portfolioWidth },
    { label: comparison.key || "Benchmark", value: comparison.benchmarkReturnPct, width: benchmarkWidth }
  ].map((row) => `
    <div class="benchmark-row">
      <div class="benchmark-label">
        <strong>${escapeHtml(row.label)}</strong>
        <span>${signedPercent(row.value)}</span>
      </div>
      <div class="bar-track" aria-label="${escapeHtml(row.label)} return">
        <div class="bar-fill ${row.value >= 0 ? "positive-bar" : "negative-bar"}" style="width: ${row.width}%"></div>
      </div>
    </div>
  `).join("");
}

function renderInsight(model) {
  const insight = buildInsight(model);
  state.lastInsight = insight;
  $("#insightBody").innerHTML = insight.map((line) => `<p>${escapeHtml(line)}</p>`).join("");
  $("#citationChips").innerHTML = model.sourceIds
    .slice(0, 8)
    .map((id) => `<button class="citation-chip" data-source="${escapeHtml(id)}">${escapeHtml(sourceFor(id).title)}</button>`)
    .join("");
}

function renderHoldings(model) {
  $("#holdingsTable").innerHTML = model.topDrivers
    .map((holding) => {
      const moveClass = holding.dailyMove >= 0 ? "positive" : "negative";
      const supportLabel = holding.supportLevel === "basic-listed"
        ? `<span class="basic-note">Simulation estimate - ${escapeHtml(holding.instrument.estimateConfidence || "Medium estimate confidence")}</span>`
        : holding.isSupported ? "" : "<span class=\"review-note\">Needs retrieval</span>";
      return `
        <tr>
          <td>
            <strong>${escapeHtml(holding.symbol)}</strong>
            <span>${escapeHtml(holding.instrument.name)}</span>
            ${supportLabel}
          </td>
          <td>
            ${moneyPrecise.format(holding.value)}
            <span>${percent.format(holding.weight)} weight</span>
          </td>
          <td class="${moveClass}">
            ${signedMoney(holding.dailyMove)}
            <span>${signedPercent(holding.dailyMovePct)}</span>
          </td>
          <td>${escapeHtml(holding.instrument.driver)}</td>
          <td>${escapeHtml(holding.instrument.risk)}</td>
        </tr>
      `;
    })
    .join("");
}

function renderControls() {
  $$("[data-portfolio]").forEach((button) => {
    button.classList.toggle("active", button.dataset.portfolio === state.portfolioKey);
  });
  $$("[data-depth]").forEach((button) => {
    button.classList.toggle("active", button.dataset.depth === state.depth);
  });
  $$("[data-benchmark]").forEach((button) => {
    button.classList.toggle("active", button.dataset.benchmark === state.benchmarkKey);
  });
}

function renderDepthExplainer() {
  const detail = depthDetails[state.depth] || depthDetails.beginner;
  $("#depthExplainer").innerHTML = `<strong>${escapeHtml(detail.label)}</strong><span>${escapeHtml(detail.detail)}</span>`;
  $("#modeSummary").innerHTML = `
    <strong>${escapeHtml(detail.label)}</strong>
    <span>${escapeHtml(detail.detail)}</span>
  `;
}

function renderWorkspaceTabs() {
  $$("[data-view]").forEach((button) => {
    button.classList.toggle("active", button.dataset.view === state.activeView);
  });
  $$("[data-view-panel]").forEach((panel) => {
    panel.classList.toggle("active", panel.dataset.viewPanel === state.activeView);
  });
}

function renderTickerOptions() {
  $("#tickerOptions").innerHTML = tickerUniverse.map((ticker) => {
    return `<option value="${escapeHtml(ticker.symbol)}">${escapeHtml(ticker.name)}</option>`;
  }).join("");
}

function normalizeTickerInput(value) {
  const cleaned = String(value || "").trim();
  const upper = cleaned.toUpperCase();
  const exactSymbol = tickerUniverse.find((ticker) => ticker.symbol === upper);
  if (exactSymbol) return exactSymbol.symbol;

  const exactName = tickerUniverse.find((ticker) => ticker.name.toUpperCase() === upper);
  if (exactName) return exactName.symbol;

  const closeName = tickerUniverse.find((ticker) => ticker.name.toUpperCase().includes(upper));
  if (closeName && upper.length >= 4) return closeName.symbol;

  return upper.replace(/[^A-Z0-9.-]/g, "");
}

function isValidTickerSymbol(symbol) {
  return /^[A-Z][A-Z0-9.-]{0,7}$/.test(symbol);
}

function getTickerMatches(query) {
  const cleaned = query.trim().toUpperCase();
  const matches = cleaned
    ? tickerUniverse.filter((ticker) => {
        return ticker.symbol.includes(cleaned) || ticker.name.toUpperCase().includes(cleaned);
      })
    : ["AAPL", "MSFT", "SCHW", "TSLA", "NVDA", "JPM"].map((symbol) => tickerUniverse.find((ticker) => ticker.symbol === symbol)).filter(Boolean);
  const limited = matches.slice(0, 8);
  const normalized = normalizeTickerInput(query);
  const hasExact = limited.some((ticker) => ticker.symbol === normalized);
  if (cleaned && normalized && isValidTickerSymbol(normalized) && !hasExact) {
    limited.unshift({
      symbol: normalized,
      name: `Use custom ticker ${normalized}`,
      sector: "Needs market context",
      hasContext: false,
      isCustom: true
    });
  }
  return limited;
}

function renderTickerSuggestions() {
  const query = $("#tickerSearch").value;
  const matches = getTickerMatches(query);
  $("#tickerSuggestions").innerHTML = matches.map((ticker) => {
    const contextLabel = ticker.hasContext
      ? ticker.sector
      : ticker.isCustom
        ? `${ticker.sector} - retrieval needed`
        : "Exchange listed - basic risk context";
    return `
      <button class="ticker-chip ${ticker.hasContext ? "" : "custom-ticker"}" type="button" data-pick-symbol="${escapeHtml(ticker.symbol)}">
        <strong>${escapeHtml(ticker.symbol)}</strong>
        <span>${escapeHtml(contextLabel)}</span>
      </button>
    `;
  }).join("");
}

function renderSources(model) {
  $("#sourceList").innerHTML = model.sourceIds
    .map((id) => {
      const source = sourceFor(id);
      return `
        <article class="source-card" id="source-${escapeHtml(id)}">
          <div>
            <strong>${escapeHtml(source.title)}</strong>
            <span>${escapeHtml(source.type)}</span>
          </div>
          <p>${escapeHtml(source.detail)}</p>
          <small>${escapeHtml(source.reliability)}</small>
        </article>
      `;
    })
    .join("");
}

function renderAttribution(model) {
  const topDrivers = model.topDrivers.slice(0, 6);
  const maxMove = Math.max(...topDrivers.map((holding) => Math.abs(holding.dailyMove)), 1);

  $("#attributionBars").innerHTML = topDrivers.map((holding) => {
    const moveClass = holding.dailyMove >= 0 ? "positive-bar" : "negative-bar";
    const width = Math.max((Math.abs(holding.dailyMove) / maxMove) * 100, 3);
    return `
      <div class="attribution-row">
        <div class="attribution-label">
          <strong>${escapeHtml(holding.symbol)}</strong>
          <span>${signedMoney(holding.dailyMove)}</span>
        </div>
        <div class="bar-track" aria-label="${escapeHtml(holding.symbol)} impact">
          <div class="bar-fill ${moveClass}" style="width: ${width}%"></div>
        </div>
      </div>
    `;
  }).join("");
}

function renderBuilderHoldings(model) {
  $("#builderHoldingCount").textContent = String(model.holdings.length);

  if (!model.holdings.length) {
    $("#builderHoldingsTable").innerHTML = `
      <tr>
        <td colspan="7">
          <div class="empty-builder">
            <strong>No holdings yet</strong>
            <span>Search for a ticker above, enter shares, and add it to start building.</span>
          </div>
        </td>
      </tr>
    `;
    return;
  }

  $("#builderHoldingsTable").innerHTML = model.holdings
    .sort((a, b) => b.value - a.value)
    .map((holding) => `
      <tr>
        <td>
          <strong>${escapeHtml(holding.symbol)}</strong>
          <span>${escapeHtml(holding.instrument.name)}</span>
          ${holding.supportLevel === "basic-listed" ? `<span class="basic-note">Simulation estimate - ${escapeHtml(holding.instrument.estimateType || "Listed security")}</span>` : holding.isSupported ? "" : "<span class=\"review-note\">Needs retrieval</span>"}
        </td>
        <td>
          <input class="table-input" type="number" min="0" step="0.01" value="${escapeHtml(holding.shares)}" data-edit-symbol="${escapeHtml(holding.symbol)}" data-edit-field="shares" aria-label="${escapeHtml(holding.symbol)} shares" />
        </td>
        <td>
          <input class="table-input" type="number" min="0" step="0.01" value="${escapeHtml(holding.costBasis)}" data-edit-symbol="${escapeHtml(holding.symbol)}" data-edit-field="costBasis" aria-label="${escapeHtml(holding.symbol)} cost basis" />
        </td>
        <td>
          ${moneyPrecise.format(holding.value)}
          <span>${signedMoney(holding.unrealized)} unrealized</span>
        </td>
        <td>${percent.format(holding.weight)}</td>
        <td>${escapeHtml(holding.instrument.risk)}</td>
        <td>
          <button class="mini-button" type="button" data-remove-symbol="${escapeHtml(holding.symbol)}">Delete</button>
        </td>
      </tr>
    `)
    .join("");
}

function renderRiskReview(model) {
  const review = engine.buildRiskReview(model);
  const badge = $("#riskLevelBadge");
  badge.textContent = review.level;
  badge.className = `badge risk-${review.level.toLowerCase().replace(/\s+/g, "-")}`;
  $("#riskSummary").innerHTML = `<p>${escapeHtml(review.summary)}</p>`;
  $("#riskScore").textContent = `${review.score}/100`;
  $("#riskScoreDetail").textContent = `${review.scoreLabel} demo score based on transparent curated and simulation-backed checks.`;
  $("#riskFactors").innerHTML = review.factors.map((factor) => {
    const width = factor.maxScore ? Math.max((factor.score / factor.maxScore) * 100, 4) : 4;
    return `
      <article class="risk-factor ${escapeHtml(factor.status)}">
        <div class="risk-factor-heading">
          <strong>${escapeHtml(factor.label)}</strong>
          <span>${factor.score}/${factor.maxScore}</span>
        </div>
        <div class="factor-track" aria-label="${escapeHtml(factor.label)} score">
          <div class="factor-fill" style="width: ${width}%"></div>
        </div>
        <p>${escapeHtml(factor.detail)}</p>
      </article>
    `;
  }).join("");
  $("#riskList").innerHTML = review.risks.map((risk) => `
    <article class="risk-item ${escapeHtml(risk.severity)}">
      <span>${escapeHtml(risk.severity.toUpperCase())}</span>
      <div>
        <strong>${escapeHtml(risk.label)}</strong>
        <p>${escapeHtml(risk.detail)}</p>
      </div>
    </article>
  `).join("");
  $("#riskNextSteps").innerHTML = `
    <strong>Next steps to consider</strong>
    ${review.nextSteps.map((step) => `<span>${escapeHtml(step)}</span>`).join("")}
    <small>Educational risk review only. This is not investment advice.</small>
  `;
}

function buildDemoReportText(model) {
  const insight = state.lastInsight.length ? state.lastInsight : buildInsight(model);
  const checks = engine.evaluateReadiness(model, state.guardrailEvents);
  const review = engine.buildRiskReview(model);
  const comparison = engine.buildBenchmarkComparison(data, model, state.benchmarkKey);
  const topDriver = model.largestDriver
    ? `${model.largestDriver.symbol} (${signedMoney(model.largestDriver.dailyMove)})`
    : "No driver yet";
  const sourceTitles = model.sourceIds.slice(0, 5).map((id) => sourceFor(id).title);

  return [
    "Portfolio Insight Copilot Demo Report",
    "======================================",
    "",
    `Holdings: ${model.holdings.length}`,
    `Total value: ${moneyPrecise.format(model.totalValue)}`,
    `Daily move: ${signedMoney(model.dailyMove)} (${signedPercent(model.dailyMovePct)})`,
    `Top driver: ${topDriver}`,
    `Source coverage: ${percent.format(model.sourceCoverage)}`,
    `Benchmark: ${comparison.key} - portfolio ${signedPercent(comparison.portfolioReturnPct)} versus benchmark ${signedPercent(comparison.benchmarkReturnPct)} (${comparison.resultLabel})`,
    `Demo risk score: ${review.score}/100 (${review.scoreLabel})`,
    `Risk review: ${review.level} - ${review.summary}`,
    `Explanation mode: ${depthDetails[state.depth]?.label || state.depth}`,
    "",
    "No-cost demo scope:",
    "- Static frontend only; no backend, accounts, or paid APIs.",
    "- Browser saves use localStorage on the viewer's device.",
    "- Broad ticker estimates are calibrated from your Stock Market Simulation sample run.",
    "",
    "AI workflow:",
    "- Normalize holdings from presets, CSV, or manual ticker search.",
    "- Retrieve curated company context or simulation-backed listed-symbol estimates.",
    "- Calculate attribution, concentration, source coverage, and risk flags.",
    "- Generate an educational explanation with citations.",
    "- Block buy/sell/hold advice and log the guardrail event.",
    "",
    "Current explanation:",
    ...insight.slice(0, 4).map((line) => `- ${line}`),
    "",
    "Readiness checks:",
    ...checks.map((check) => `- ${check.label}: ${check.status.toUpperCase()} - ${check.detail}`),
    "",
    "Risk score factors:",
    ...review.factors.map((factor) => `- ${factor.label}: ${factor.score}/${factor.maxScore} - ${factor.detail}`),
    "",
    "Evidence used:",
    ...(sourceTitles.length ? sourceTitles.map((title) => `- ${title}`) : ["- No source cards available yet."])
  ].join("\n");
}

function renderDemoReport(model) {
  const riskReview = engine.buildRiskReview(model);
  $("#demoTopDriver").textContent = model.largestDriver?.symbol ?? "--";
  $("#demoCoverage").textContent = percent.format(model.sourceCoverage);
  $("#demoRiskBadge").textContent = riskReview.level;
  $("#demoReportPreview").textContent = buildDemoReportText(model);
}

function renderAudit(model) {
  const checks = engine.evaluateReadiness(model, state.guardrailEvents);
  $("#auditList").innerHTML = checks.map((check) => `
    <div class="audit-item ${check.status}">
      <span>${escapeHtml(check.status.toUpperCase())}</span>
      <div>
        <strong>${escapeHtml(check.label)}</strong>
        <p>${escapeHtml(check.detail)}</p>
      </div>
    </div>
  `).join("");
  $("#promptPacket").textContent = JSON.stringify(
    engine.buildPromptPacket(data, model, state.depth, state.lastQuestion),
    null,
    2
  );
  $("#promptPacket").hidden = !state.showPromptPacket;
  $("#togglePromptPacket").setAttribute("aria-expanded", String(state.showPromptPacket));
  $("#togglePromptPacket").textContent = state.showPromptPacket ? "Hide Prompt Packet" : "Show Prompt Packet";
}

function renderUploadStatus() {
  const status = $("#uploadStatus");
  if (!status) return;

  if (!state.uploadIssues.length) {
    status.innerHTML = "<span>Current data passed CSV validation.</span>";
    return;
  }

  status.innerHTML = `
    <strong>CSV review</strong>
    ${state.uploadIssues.slice(0, 3).map((issue) => `<span>${escapeHtml(issue)}</span>`).join("")}
  `;
}

function renderBuilderStatus() {
  const status = $("#builderStatus");
  if (!status) return;

  if (!state.builderMessage) {
    status.innerHTML = "<span>Ready for ticker entry.</span>";
    return;
  }

  status.innerHTML = `<span>${escapeHtml(state.builderMessage)}</span>`;
}

function renderSaveStatus() {
  const status = $("#saveStatus");
  if (!status) return;

  if (state.saveMessage) {
    status.innerHTML = `<span>${escapeHtml(state.saveMessage)}</span>`;
    return;
  }

  const saved = readSavedPortfolio();
  status.innerHTML = saved?.holdings.length
    ? `<span>Browser save available (${formatSavedAt(saved.savedAt)}).</span>`
    : "<span>No browser save yet.</span>";
}

function renderAnswer(model, question, options = {}) {
  const cleaned = question.trim();
  if (!cleaned) {
    $("#answerBox").innerHTML = "<p>Ask about movement, drivers, risk flags, concentration, or source coverage.</p>";
    return;
  }

  if (engine.isAdviceRequest(cleaned)) {
    if (options.recordGuardrail !== false) {
      const lastEvent = state.guardrailEvents[state.guardrailEvents.length - 1];
      if (!lastEvent || lastEvent.question !== cleaned) {
        state.guardrailEvents.push({ type: "blocked-advice", question: cleaned, at: new Date().toISOString() });
      }
    }
    $("#answerBox").innerHTML = `
      <p><strong>Guardrail triggered:</strong> I can explain portfolio movement and risk factors, but I cannot tell you whether to buy, sell, or hold a security.</p>
      <p>Try asking: "What drove today's move?" or "Which holdings added the most risk today?"</p>
    `;
    return;
  }

  if (!model.largestDriver) {
    $("#answerBox").innerHTML = "<p>No valid holdings are available for analysis yet.</p>";
    return;
  }

  const top = model.largestDriver;
  const lower = cleaned.toLowerCase();
  let answer;

  if (lower.includes("risk") || lower.includes("concentration")) {
    const concentrated = [...model.holdings].sort((a, b) => b.weight - a.weight)[0];
    answer = `${concentrated.symbol} is the largest position at ${percent.format(concentrated.weight)} of the portfolio. Its main risk flag is: ${concentrated.instrument.risk}`;
  } else if (lower.includes("benchmark")) {
    const comparison = engine.buildBenchmarkComparison(data, model, state.benchmarkKey);
    answer = `The portfolio returned ${signedPercent(comparison.portfolioReturnPct)} versus ${signedPercent(comparison.benchmarkReturnPct)} for ${comparison.key}. The difference is ${comparison.differencePct >= 0 ? "+" : ""}${(comparison.differencePct * 100).toFixed(2)} percentage points in this simulation-backed demo session.`;
  } else if (lower.includes("source") || lower.includes("citation")) {
    answer = `This explanation used ${model.sourceIds.length} retrieved source records across market data, news context, and risk notes. Source coverage is ${percent.format(model.sourceCoverage)} for the current holdings.`;
  } else if (lower.includes("unsupported") || lower.includes("missing")) {
    answer = model.unsupportedHoldings.length
      ? `${model.unsupportedHoldings.map((holding) => holding.symbol).join(", ")} need external retrieval before the explanation should be treated as investor-facing.`
      : "All current holdings have mapped context records.";
  } else if (lower.includes("why") || lower.includes("move") || lower.includes("today")) {
    answer = `${top.symbol} was the largest absolute driver today, contributing ${signedMoney(top.dailyMove)}. Retrieved context says: ${top.instrument.driver}`;
  } else {
    answer = `The clearest portfolio story today is that ${top.symbol} drove the largest share of movement, while the overall portfolio changed by ${signedPercent(model.dailyMovePct)}. The system can explain movement, source coverage, concentration, and risk flags.`;
  }

  $("#answerBox").innerHTML = `
    <p>${escapeHtml(answer)}</p>
    <p class="answer-disclaimer">Educational explanation only. No investment recommendation is being made.</p>
  `;
}

function setActiveButton(selector, activeButton, dataKey) {
  $$(selector).forEach((button) => {
    button.classList.toggle("active", button.dataset[dataKey] === activeButton.dataset[dataKey]);
  });
}

function rerender() {
  const model = getPortfolioModel();
  renderControls();
  renderWorkspaceTabs();
  renderTickerOptions();
  renderTickerSuggestions();
  renderSummary(model);
  renderBenchmark(model);
  renderDepthExplainer();
  renderInsight(model);
  renderHoldings(model);
  renderBuilderHoldings(model);
  renderRiskReview(model);
  renderSources(model);
  renderAttribution(model);
  renderAnswer(model, state.lastQuestion, { recordGuardrail: false });
  renderAudit(model);
  renderDemoReport(model);
  renderUploadStatus();
  renderBuilderStatus();
  renderSaveStatus();
}

function switchView(view) {
  state.activeView = view;
  rerender();
}

function markAsCustomPortfolio() {
  state.portfolioKey = "custom";
  $("[data-portfolio].active")?.classList.remove("active");
}

function resetManualInputs({ keepTicker = false } = {}) {
  if (!keepTicker) $("#tickerSearch").value = "";
  $("#sharesInput").value = "";
  $("#costBasisInput").value = "";
}

function addManualHolding() {
  const symbol = normalizeTickerInput($("#tickerSearch").value);
  const shares = $("#sharesInput").value;
  const costBasis = $("#costBasisInput").value;
  const beforeCount = state.holdings.length;
  const result = engine.upsertHolding(state.holdings, { symbol, shares, costBasis });

  if (result.issue) {
    state.builderMessage = result.issue;
    renderBuilderStatus();
    return;
  }

  const normalizedSymbol = symbol.trim().toUpperCase();
  const wasMerge = state.holdings.some((holding) => String(holding.symbol).trim().toUpperCase() === normalizedSymbol);
  state.holdings = result.holdings;
  state.uploadIssues = [];
  state.saveMessage = "Unsaved demo changes. Use Save Current to keep them in this browser.";
  state.builderMessage = wasMerge
    ? `${normalizedSymbol} updated in your portfolio.`
    : `${normalizedSymbol} added. You now have ${beforeCount + 1} holdings.`;
  state.lastQuestion = "Why did my custom portfolio move today?";
  $("#questionInput").value = state.lastQuestion;
  markAsCustomPortfolio();
  state.activeView = "builder";
  resetManualInputs();
  rerender();
}

function removeManualHolding(symbol) {
  state.holdings = engine.removeHolding(state.holdings, symbol);
  state.saveMessage = "Unsaved demo changes. Use Save Current to keep them in this browser.";
  state.builderMessage = `${symbol} removed.`;
  state.lastQuestion = state.holdings.length
    ? "Why did my custom portfolio move today?"
    : "Why did my portfolio move today?";
  $("#questionInput").value = state.lastQuestion;
  markAsCustomPortfolio();
  state.activeView = "builder";
  rerender();
}

function clearHoldings() {
  state.holdings = [];
  state.uploadIssues = [];
  state.saveMessage = "Unsaved demo changes. Use Save Current to keep the empty portfolio in this browser.";
  state.builderMessage = "Portfolio cleared. Add a ticker to start fresh.";
  state.lastQuestion = "Why did my portfolio move today?";
  $("#questionInput").value = state.lastQuestion;
  markAsCustomPortfolio();
  state.activeView = "builder";
  rerender();
}

function updateBuilderHolding(symbol) {
  const editInputs = $$("[data-edit-symbol]");
  const sharesInput = editInputs.find((input) => input.dataset.editSymbol === symbol && input.dataset.editField === "shares");
  const costInput = editInputs.find((input) => input.dataset.editSymbol === symbol && input.dataset.editField === "costBasis");
  const result = engine.updateHolding(state.holdings, symbol, {
    shares: sharesInput?.value,
    costBasis: costInput?.value
  });

  if (result.issue) {
    state.builderMessage = result.issue;
    renderBuilderStatus();
    return;
  }

  state.holdings = result.holdings;
  state.saveMessage = "Unsaved demo changes. Use Save Current to keep them in this browser.";
  state.builderMessage = `${symbol} updated.`;
  state.lastQuestion = "Why did my custom portfolio move today?";
  $("#questionInput").value = state.lastQuestion;
  markAsCustomPortfolio();
  state.activeView = "builder";
  rerender();
}

function loadDemoPortfolio() {
  state.holdings = engine.clonePortfolio(demoPortfolio);
  state.uploadIssues = [];
  state.saveMessage = "Demo scenario loaded. Use Save Current to keep it in this browser.";
  state.builderMessage = "Demo portfolio loaded. Review the holdings table, risk notes, and basic listed-data labels.";
  state.lastQuestion = "What risks should I review in this demo portfolio?";
  $("#questionInput").value = state.lastQuestion;
  markAsCustomPortfolio();
  state.activeView = "builder";
  rerender();
}

function saveCurrentPortfolio() {
  const savedAt = new Date().toISOString();
  const saved = writeSavedPortfolio({
    version: 1,
    savedAt,
    holdings: engine.clonePortfolio(state.holdings),
    depth: state.depth,
    benchmarkKey: state.benchmarkKey,
    lastQuestion: state.lastQuestion
  });

  state.saveMessage = saved
    ? `Saved current demo portfolio in this browser (${formatSavedAt(savedAt)}).`
    : "Browser save failed. This browser may be blocking local storage.";
  renderSaveStatus();
}

function loadSavedPortfolio() {
  const saved = readSavedPortfolio();
  if (!saved?.holdings.length) {
    state.saveMessage = "No saved demo portfolio found in this browser.";
    renderSaveStatus();
    return;
  }

  state.holdings = engine.clonePortfolio(saved.holdings);
  state.depth = saved.depth && depthDetails[saved.depth] ? saved.depth : state.depth;
  state.benchmarkKey = saved.benchmarkKey && data.benchmarks[saved.benchmarkKey] ? saved.benchmarkKey : state.benchmarkKey;
  state.lastQuestion = saved.lastQuestion || "Why did my saved portfolio move today?";
  state.uploadIssues = [];
  state.builderMessage = "Saved browser portfolio loaded.";
  state.saveMessage = `Loaded browser demo portfolio (${formatSavedAt(saved.savedAt)}).`;
  $("#questionInput").value = state.lastQuestion;
  state.portfolioKey = "saved";
  state.activeView = "builder";
  rerender();
}

function clearSavedPortfolio() {
  const removed = removeSavedPortfolio();
  state.saveMessage = removed
    ? "Browser save cleared. The current on-screen portfolio is unchanged."
    : "Could not clear the browser save.";
  renderSaveStatus();
}

function runGuardrailDemo() {
  state.lastQuestion = "Should I buy NVDA right now?";
  $("#questionInput").value = state.lastQuestion;
  state.activeView = "insights";
  rerender();
  const model = getPortfolioModel();
  renderAnswer(model, state.lastQuestion, { recordGuardrail: true });
  renderAudit(model);
  renderDemoReport(model);
}

async function copyTextToClipboard(text) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }

  const textarea = document.createElement("textarea");
  textarea.value = text;
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand("copy");
  textarea.remove();
}

async function copyBriefing() {
  const model = getPortfolioModel();
  const checks = engine.evaluateReadiness(model, state.guardrailEvents);
  const briefing = engine.buildBriefing(model, state.lastInsight.length ? state.lastInsight : buildInsight(model), checks);
  const button = $("#copyBriefing");

  try {
    await copyTextToClipboard(briefing);
    button.textContent = "Copied";
  } catch (error) {
    button.textContent = "Copy Failed";
  }

  window.setTimeout(() => {
    button.textContent = "Copy Briefing";
  }, 1800);
}

async function copyDemoReport() {
  const model = getPortfolioModel();
  const button = $("#copyDemoReport");

  try {
    await copyTextToClipboard(buildDemoReportText(model));
    button.textContent = "Copied";
  } catch (error) {
    button.textContent = "Copy Failed";
  }

  window.setTimeout(() => {
    button.textContent = "Copy Demo Report";
  }, 1800);
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

$$("[data-portfolio]").forEach((button) => {
  button.addEventListener("click", () => {
    state.portfolioKey = button.dataset.portfolio;
    state.holdings = engine.clonePortfolio(data.portfolios[state.portfolioKey]);
    state.uploadIssues = [];
    state.builderMessage = "";
    state.saveMessage = "Preset loaded. Use Save Current if you want this browser to remember it.";
    state.lastQuestion = "Why did my portfolio move today?";
    $("#questionInput").value = state.lastQuestion;
    setActiveButton("[data-portfolio]", button, "portfolio");
    state.activeView = "insights";
    rerender();
  });
});

$$("[data-view]").forEach((button) => {
  button.addEventListener("click", () => {
    switchView(button.dataset.view);
  });
});

$$("[data-depth]").forEach((button) => {
  button.addEventListener("click", () => {
    state.depth = button.dataset.depth;
    setActiveButton("[data-depth]", button, "depth");
    rerender();
  });
});

$$("[data-benchmark]").forEach((button) => {
  button.addEventListener("click", () => {
    state.benchmarkKey = button.dataset.benchmark;
    rerender();
  });
});

$("#askButton").addEventListener("click", () => {
  state.lastQuestion = $("#questionInput").value;
  const model = getPortfolioModel();
  renderAnswer(model, state.lastQuestion, { recordGuardrail: true });
  renderAudit(model);
});

$("#questionInput").addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    state.lastQuestion = $("#questionInput").value;
    const model = getPortfolioModel();
    renderAnswer(model, state.lastQuestion, { recordGuardrail: true });
    renderAudit(model);
  }
});

$("#refreshInsight").addEventListener("click", rerender);
$("#copyBriefing").addEventListener("click", copyBriefing);
$("#togglePromptPacket").addEventListener("click", () => {
  state.showPromptPacket = !state.showPromptPacket;
  const model = getPortfolioModel();
  renderAudit(model);
});
$("#savePortfolio").addEventListener("click", saveCurrentPortfolio);
$("#loadSavedPortfolio").addEventListener("click", loadSavedPortfolio);
$("#clearSavedPortfolio").addEventListener("click", clearSavedPortfolio);
$("#loadDemoPortfolio").addEventListener("click", loadDemoPortfolio);
$("#runGuardrailDemo").addEventListener("click", runGuardrailDemo);
$("#copyDemoReport").addEventListener("click", copyDemoReport);
$("#addHolding").addEventListener("click", addManualHolding);
$("#clearHoldings").addEventListener("click", clearHoldings);
$("#tickerSearch").addEventListener("input", renderTickerSuggestions);
$("#tickerSearch").addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    event.preventDefault();
    $("#sharesInput").focus();
  }
});
$("#sharesInput").addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    event.preventDefault();
    addManualHolding();
  }
});
$("#costBasisInput").addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    event.preventDefault();
    addManualHolding();
  }
});

$("#csvInput").addEventListener("change", async (event) => {
  const file = event.target.files[0];
  if (!file) return;

  try {
    const result = engine.parsePortfolioCsv(await file.text());
    if (!result.holdings.length) {
      throw new Error(result.issues[0] || "No valid holdings found.");
    }
    state.holdings = result.holdings;
    state.uploadIssues = result.issues;
    state.saveMessage = "CSV imported. Use Save Current to keep this portfolio in this browser.";
    state.builderMessage = "CSV imported. You can still add or remove holdings manually.";
    state.lastQuestion = "Why did my uploaded portfolio move today?";
    $("#questionInput").value = state.lastQuestion;
    $("[data-portfolio].active")?.classList.remove("active");
    state.activeView = "builder";
    rerender();
  } catch (error) {
    state.uploadIssues = [error.message];
    renderUploadStatus();
    $("#answerBox").innerHTML = `<p><strong>CSV upload issue:</strong> ${escapeHtml(error.message)}</p>`;
  }
});

document.addEventListener("click", (event) => {
  const removeButton = event.target.closest("[data-remove-symbol]");
  if (removeButton) {
    removeManualHolding(removeButton.dataset.removeSymbol);
    return;
  }

  const pickButton = event.target.closest("[data-pick-symbol]");
  if (pickButton) {
    $("#tickerSearch").value = pickButton.dataset.pickSymbol;
    $("#sharesInput").focus();
    renderTickerSuggestions();
    return;
  }

  const chip = event.target.closest("[data-source]");
  if (!chip) return;
  const target = $(`#source-${chip.dataset.source}`);
  target?.scrollIntoView({ behavior: "smooth", block: "center" });
  target?.classList.add("pulse");
  window.setTimeout(() => target?.classList.remove("pulse"), 900);
});

document.addEventListener("change", (event) => {
  const input = event.target.closest("[data-edit-symbol]");
  if (!input) return;
  updateBuilderHolding(input.dataset.editSymbol);
});

rerender();
