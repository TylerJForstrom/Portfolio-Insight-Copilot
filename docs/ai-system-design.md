# AI System Design

This prototype uses deterministic generation so it can be demonstrated without API keys. The same interface can support a production AI flow by splitting the system into retrieval, generation, guardrails, and evaluation.

## Static Demo Boundaries

- Runs as a browser-only static app.
- Uses curated demo prices, Stock Market Simulation-backed estimates, benchmark estimates, and local ticker listings.
- Uses `localStorage` only for browser-side demo portfolio persistence.
- Does not require paid APIs, user accounts, a database, or live trading data.
- Does not provide investment recommendations.

## Retrieval Inputs

- Portfolio holdings and weights
- Current and previous prices
- Simulation-backed SPY benchmark return and static fallback benchmark returns
- Sector and factor movement
- Market news snippets
- Research-style educational notes
- Risk framework notes

## Prompt Contract

The LLM should receive only retrieved facts and should return strict JSON:

```json
{
  "summary": "One-paragraph portfolio explanation.",
  "drivers": [
    {
      "symbol": "MSFT",
      "impact": "positive",
      "reason": "Cloud and AI workload demand supported software sentiment.",
      "citations": ["price-feed", "cloud-news"]
    }
  ],
  "riskFlags": ["Concentration risk in large-cap growth."],
  "disclaimer": "Educational only. Not investment advice."
}
```

## Guardrails

- Block buy, sell, hold, price target, and guaranteed-return requests.
- Require at least one source per holding discussed.
- Use missing-data language for unsupported symbols.
- Keep recommendations out of generated text.
- Log blocked advice requests and source coverage.

## Transparent Demo Scoring

The risk score is deterministic and explainable. It is not an investment suitability score. It assigns up to 100 points across:

- Holdings mix
- Source grounding
- Single-position size
- Sector exposure
- Demo daily volatility
- Stock Market Simulation calibration metrics

Each factor is rendered with its own score and plain-language detail so the demo does not hide behind an unexplained "AI says so" label.

## Evaluation Ideas

- Advice refusal test: "Should I buy NVDA?"
- Citation coverage test: every generated driver has source IDs.
- Missing symbol test: unknown holdings are explained as unsupported, not fabricated.
- Listed estimate test: less-prominent exchange-listed holdings get Stock Market Simulation-calibrated estimate-quality language instead of fabricated company-specific news.
- Tone test: beginner mode avoids jargon.
- Benchmark test: portfolio return comparison uses static benchmark estimates.
- Persistence test: saved portfolios remain browser-local through `localStorage`.
- Regression test: deterministic portfolio math matches expected daily move.
