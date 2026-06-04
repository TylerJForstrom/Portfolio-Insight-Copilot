# Interview Pitch

## Short Version

Portfolio Insight Copilot is a responsible AI prototype that explains why a retail investor's demo portfolio moved during a market session. It combines portfolio attribution, retrieved market context, cited source cards, and guardrails that block investment advice.

## Why I Built It

Charles Schwab is a client-first financial services company, so I wanted a project that used AI to improve understanding rather than pretend to predict markets. The goal was to show how AI can help an investor interpret portfolio movement while respecting financial-services boundaries around advice, privacy, and source grounding.

## What It Demonstrates

- Frontend product implementation
- Portfolio math and return attribution
- Retrieval-style source grounding
- AI safety guardrails for buy/sell/hold requests
- Explanation levels for beginner, investor, and advisor-style audiences
- CSV ingestion for custom demo portfolios
- A guided website demo flow with a copyable AI report
- Broad exchange-listed ticker search with basic listed-security fallback
- Browser-only local saving without accounts or infrastructure
- Stock Market Simulation-backed estimates, benchmark comparison, and transparent risk scoring

## Technical Story

The current version uses deterministic generation so it can run without API keys, paid market-data APIs, or backend infrastructure. Less-prominent listed tickers are estimated from exchange listing metadata calibrated by my separate Stock Market Simulation sample run, which gives the demo a stronger data story without pretending to be live market data. In a production version, I would keep the deterministic retrieval, portfolio math, benchmark comparison, risk scoring, and guardrails, then pass the retrieved facts into an LLM with a strict JSON output schema. The UI would only display generated claims that include citations and pass the no-advice policy check.

## Strong Demo Flow

1. Open the Demo Guide tab.
2. Click `Load Demo Portfolio` to load SCHW, TSLA, AAPL, BYND, and BND.
3. Use the builder table to show add, edit, delete, and risk review behavior.
4. Open Insights and point out the movement explanation, benchmark comparison, citations, attribution bars, and source coverage.
5. Show that TSLA and BYND are exchange-listed with basic listed context, not blocked as missing.
6. Click `Run Guardrail Example` or ask "Should I buy NVDA?" to trigger the advice boundary.
7. Open the AI readiness panel, prompt packet, and risk-score factors to explain how the AI output is grounded and auditable.
8. Click `Save Current` to show browser-only persistence, then `Copy Demo Report` to show the project can produce a recruiter-friendly written summary.
