window.COPILOT_DATA = {
  marketDate: "2026-06-04",
  portfolios: {
    balanced: [
      { symbol: "AAPL", shares: 12, costBasis: 165 },
      { symbol: "MSFT", shares: 8, costBasis: 388 },
      { symbol: "SCHW", shares: 25, costBasis: 73 },
      { symbol: "JPM", shares: 10, costBasis: 198 },
      { symbol: "VXUS", shares: 18, costBasis: 60 }
    ],
    growth: [
      { symbol: "NVDA", shares: 5, costBasis: 875 },
      { symbol: "MSFT", shares: 10, costBasis: 388 },
      { symbol: "AAPL", shares: 14, costBasis: 165 },
      { symbol: "SCHW", shares: 16, costBasis: 73 },
      { symbol: "QQQM", shares: 18, costBasis: 186 }
    ],
    income: [
      { symbol: "SCHD", shares: 38, costBasis: 78 },
      { symbol: "JPM", shares: 12, costBasis: 198 },
      { symbol: "SCHW", shares: 22, costBasis: 73 },
      { symbol: "VXUS", shares: 28, costBasis: 60 },
      { symbol: "BND", shares: 45, costBasis: 72 }
    ]
  },
  benchmarks: {
    SPY: {
      name: "S&P 500 ETF simulation benchmark",
      price: 508.36,
      previousClose: 511.09,
      sourceIds: ["simulation-export", "benchmark-context"]
    },
    QQQ: {
      name: "Nasdaq-100 ETF benchmark",
      price: 489.18,
      previousClose: 480.27,
      sourceIds: ["benchmark-context", "tech-news"]
    },
    SCHD: {
      name: "Dividend equity ETF benchmark",
      price: 82.41,
      previousClose: 82.14,
      sourceIds: ["benchmark-context", "income-news"]
    }
  },
  simulationReference: {
    sourceProject: "Stock Market Simulation",
    exportPath: "frontend/data/sample-run.js",
    symbol: "SPY",
    bars: 90,
    seed: 42,
    firstSimClose: 449.3,
    previousSimClose: 511.09,
    latestSimClose: 508.36,
    latestVolume: 2984998,
    simReturnPct: 13.1443,
    inputReturnPct: 12.7877,
    latestDailyMovePct: -0.5342,
    annualizedVolatilityPct: 29.2819,
    sharpeRatio: 1.34,
    marketMaxDrawdownPct: 9.4365,
    realismScore: 92,
    adjustedRealismScore: 0.2,
    leakageClass: "same_path",
    predictiveness: 0.9981
  },
  instruments: {
    AAPL: {
      name: "Apple Inc.",
      sector: "Technology Hardware",
      price: 203.84,
      previousClose: 198.95,
      dayChangePct: 2.46,
      sectorMovePct: 1.18,
      driver: "Consumer technology shares strengthened after better-than-expected services revenue commentary.",
      risk: "Single-company earnings expectations can quickly change sentiment.",
      sourceIds: ["price-feed", "tech-news", "quality-context"]
    },
    MSFT: {
      name: "Microsoft Corp.",
      sector: "Software and Cloud",
      price: 451.22,
      previousClose: 443.68,
      dayChangePct: 1.70,
      sectorMovePct: 1.18,
      driver: "Cloud infrastructure demand and AI workload spending supported large-cap software sentiment.",
      risk: "Valuation sensitivity remains high when rates or growth assumptions change.",
      sourceIds: ["price-feed", "cloud-news", "quality-context"]
    },
    NVDA: {
      name: "NVIDIA Corp.",
      sector: "Semiconductors",
      price: 1142.31,
      previousClose: 1104.64,
      dayChangePct: 3.41,
      sectorMovePct: 2.04,
      driver: "Semiconductor momentum improved as investors focused on data-center demand and AI accelerator backlogs.",
      risk: "High expectations can amplify downside if guidance disappoints.",
      sourceIds: ["price-feed", "semi-news", "concentration-context"]
    },
    SCHW: {
      name: "Charles Schwab Corp.",
      sector: "Financial Services",
      price: 78.42,
      previousClose: 79.36,
      dayChangePct: -1.18,
      sectorMovePct: -0.42,
      driver: "Brokerage and wealth shares lagged as rate expectations pressured net-interest-income assumptions.",
      risk: "Financial firms can be sensitive to deposit trends and interest-rate expectations.",
      sourceIds: ["price-feed", "financials-news", "rate-context"]
    },
    JPM: {
      name: "JPMorgan Chase & Co.",
      sector: "Banks",
      price: 214.66,
      previousClose: 212.81,
      dayChangePct: 0.87,
      sectorMovePct: -0.42,
      driver: "Large banks were mixed, but diversified revenue expectations helped offset rate pressure.",
      risk: "Credit quality and yield-curve changes can affect bank performance.",
      sourceIds: ["price-feed", "financials-news", "rate-context"]
    },
    VXUS: {
      name: "Vanguard Total International Stock ETF",
      sector: "International Equity",
      price: 64.18,
      previousClose: 63.94,
      dayChangePct: 0.38,
      sectorMovePct: 0.31,
      driver: "International equities rose modestly as currency effects and global risk appetite were supportive.",
      risk: "Currency moves can add volatility for U.S. investors.",
      sourceIds: ["price-feed", "global-news", "diversification-context"]
    },
    QQQM: {
      name: "Invesco NASDAQ 100 ETF",
      sector: "Large-Cap Growth",
      price: 197.34,
      previousClose: 193.88,
      dayChangePct: 1.78,
      sectorMovePct: 1.42,
      driver: "Mega-cap growth exposure benefited from stronger technology-sector breadth.",
      risk: "The fund is concentrated in large growth companies.",
      sourceIds: ["price-feed", "tech-news", "concentration-context"]
    },
    SCHD: {
      name: "Schwab U.S. Dividend Equity ETF",
      sector: "Dividend Equity",
      price: 82.41,
      previousClose: 82.14,
      dayChangePct: 0.33,
      sectorMovePct: 0.18,
      driver: "Dividend equities were stable as defensive sectors offset weaker rate-sensitive groups.",
      risk: "Dividend strategies may lag during strong growth-led rallies.",
      sourceIds: ["price-feed", "income-news", "diversification-context"]
    },
    BND: {
      name: "Vanguard Total Bond Market ETF",
      sector: "Core Bonds",
      price: 71.56,
      previousClose: 71.91,
      dayChangePct: -0.49,
      sectorMovePct: -0.52,
      driver: "Core bonds slipped as Treasury yields moved higher during the session.",
      risk: "Bond prices usually fall when yields rise.",
      sourceIds: ["price-feed", "rate-context", "income-news"]
    }
  },
  sources: {
    "price-feed": {
      title: "Static demo price feed",
      type: "Curated demo data",
      detail: "Contains hand-curated current price, previous close, and calculated daily percentage move for the primary demo symbols.",
      reliability: "High confidence within demo scope"
    },
    "simulation-export": {
      title: "Stock Market Simulation export",
      type: "Simulation data",
      detail: "Compact summary from frontend/data/sample-run.js: 90-bar SPY simulation with close series, volume, volatility, Sharpe, drawdown, and realism diagnostics.",
      reliability: "Simulation-backed demo input"
    },
    "simulation-estimate-model": {
      title: "Simulation-backed listed-symbol estimate model",
      type: "Simulation-calibrated estimate",
      detail: "Creates repeatable price and daily movement estimates for exchange-listed symbols using listing type plus volatility and daily-move calibration from the Stock Market Simulation sample run.",
      reliability: "Estimated demo input, not a live quote"
    },
    "symbol-directory": {
      title: "Exchange-listed ticker directory",
      type: "Listing metadata",
      detail: "Contains ticker symbols, names, ETF flags, and listing venues from NASDAQ Trader symbol directory files.",
      reliability: "Structured listing input"
    },
    "generic-listed-context": {
      title: "Generic listed-security risk note",
      type: "Risk context",
      detail: "Listed securities can still carry company, liquidity, sector, valuation, and volatility risk even when company-specific news is unavailable.",
      reliability: "Educational context"
    },
    "tech-news": {
      title: "Technology sector market brief",
      type: "News summary",
      detail: "Large-cap technology shares outperformed broader indexes as investors responded to stronger software and device demand signals.",
      reliability: "Retrieved narrative context"
    },
    "cloud-news": {
      title: "Cloud and enterprise software brief",
      type: "News summary",
      detail: "Cloud providers showed relative strength as market commentary highlighted AI workload demand and resilient enterprise spending.",
      reliability: "Retrieved narrative context"
    },
    "semi-news": {
      title: "Semiconductor industry brief",
      type: "News summary",
      detail: "Chipmakers gained as data-center demand and AI accelerator supply constraints remained central market themes.",
      reliability: "Retrieved narrative context"
    },
    "financials-news": {
      title: "Financial services market brief",
      type: "News summary",
      detail: "Financial stocks were mixed as investors weighed rate expectations, deposit costs, and capital-market activity.",
      reliability: "Retrieved narrative context"
    },
    "global-news": {
      title: "Global equity market brief",
      type: "News summary",
      detail: "International equities edged higher with support from improving risk appetite and modest currency tailwinds.",
      reliability: "Retrieved narrative context"
    },
    "income-news": {
      title: "Income strategy brief",
      type: "News summary",
      detail: "Dividend and bond allocations were steady to slightly lower as investors balanced income demand against rate volatility.",
      reliability: "Retrieved narrative context"
    },
    "quality-context": {
      title: "Quality-growth context note",
      type: "Research-style context",
      detail: "Companies with durable earnings and strong balance sheets can still move sharply when valuation expectations change.",
      reliability: "Educational context"
    },
    "concentration-context": {
      title: "Concentration risk note",
      type: "Risk context",
      detail: "A small number of high-growth holdings can explain a large share of portfolio movement on volatile days.",
      reliability: "Risk framework"
    },
    "rate-context": {
      title: "Interest-rate sensitivity note",
      type: "Risk context",
      detail: "Changes in expected interest rates can affect financial firms, bond funds, and highly valued growth companies in different ways.",
      reliability: "Risk framework"
    },
    "diversification-context": {
      title: "Diversification context note",
      type: "Portfolio construction",
      detail: "Diversified funds can reduce single-company risk, but they still reflect region, sector, currency, and rate exposures.",
      reliability: "Educational context"
    },
    "benchmark-context": {
      title: "Static benchmark comparison note",
      type: "Benchmark context",
      detail: "Benchmark returns are included so the demo can compare portfolio movement without live market-data APIs. SPY uses the Stock Market Simulation sample export.",
      reliability: "Estimated demo comparison input"
    }
  }
};
