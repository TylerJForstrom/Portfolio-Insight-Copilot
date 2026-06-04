# Portfolio Insight Copilot

A practical AI-focused portfolio explanation prototype tailored for a Charles Schwab technology or data internship portfolio.

The app helps a retail investor understand what changed in a mock portfolio by combining:

- Portfolio movement calculations
- Holding-level and sector-level context
- Citation-backed source snippets
- Non-advisory guardrails
- Explanation depth controls
- A simple CSV upload path for custom mock portfolios
- Manual ticker search and add flow for users who do not want to upload CSV files
- A dedicated Build Portfolio tab for add, edit, delete, and risk review workflows
- A Demo Guide tab with a one-click scenario, guardrail example, and copyable report
- Attribution bars and AI readiness checks
- A visible prompt packet showing how retrieved facts would be sent to an LLM

This first version is dependency-free and runs as a static web app.

## Run It

Open this file in a browser:

```text
C:\Users\tforstrom\Desktop\Portfolio Insight Copilot\index.html
```

No install step is required.

## Project Structure

```text
Portfolio Insight Copilot
+-- index.html
+-- src
|   +-- app.js
|   +-- data.js
|   +-- engine.js
|   +-- styles.css
|   +-- ticker-universe.js
+-- docs
|   +-- ai-system-design.md
|   +-- interview-pitch.md
+-- examples
|   +-- sample-portfolio.csv
+-- tests
    +-- engine-checks.mjs
    +-- ticker-universe-checks.mjs
    +-- ui-demo-checks.mjs
    +-- validation-checklist.md
```

## Validation

If Node is available from the project folder:

```bash
node tests/engine-checks.mjs
node tests/ticker-universe-checks.mjs
node tests/ui-demo-checks.mjs
```

The test file checks CSV parsing, duplicate holding aggregation, unsupported-symbol handling, advice-request detection, zero cost basis handling, and prompt-packet citation coverage.
It also validates manual add, duplicate merge, invalid-share rejection, and remove-holding behavior.
Builder-specific checks cover exact holding edits and AI-style risk review flags.
The UI demo smoke test checks that the Demo Guide tab, one-click scenario, guardrail example, and report preview are present.

## Demo CSV Format

Use the included sample at:

```text
C:\Users\tforstrom\Desktop\Portfolio Insight Copilot\examples\sample-portfolio.csv
```

Or upload a CSV with these headers:

```csv
symbol,shares,costBasis
AAPL,12,165
MSFT,8,388
SCHW,25,73
NVDA,5,875
JPM,10,198
```

Unknown symbols are accepted, but the app will only have rich market context for the included mock symbols.

## Why This Fits Schwab

Schwab has publicly emphasized AI-powered portfolio insights that combine portfolio performance, market news, expert commentary, and human-centered guardrails. This project demonstrates those same product instincts in a compact, interview-friendly implementation.

The project is designed to show:

- Product thinking for retail investors
- Responsible AI behavior in financial services
- Data engineering basics through structured market and portfolio records
- Retrieval-style source grounding and citation UX
- Clear separation between educational explanation and investment advice
- Testable business logic separated from UI rendering

## AI Extension Path

The local insight engine is deterministic so the demo works without API keys. The `src/engine.js` layer creates a prompt packet with holdings, drivers, citations, and policy boundaries. A production-grade version would replace the final narrative assembly step with an LLM call while keeping the same safety envelope:

1. Retrieve relevant holding, sector, and news records.
2. Build a structured prompt with only retrieved facts.
3. Require JSON output with `summary`, `drivers`, `risks`, and `citations`.
4. Reject or rewrite responses that include buy/sell/hold recommendations.
5. Log source coverage, blocked advice requests, and missing-data cases.

## Manual Portfolio Builder

Users can build a custom portfolio without CSV upload by opening the `Build Portfolio` tab, searching ticker symbols or company names, entering shares, and adding the holding. The local search universe is generated from NASDAQ Trader symbol directory files for U.S.-listed securities, so names like Beyond Meat (`BYND`) and Tesla (`TSLA`) are searchable. Exchange-listed symbols without detailed mock news use `Basic listed data` instead of `Needs retrieval`. Duplicate manual entries are merged using weighted average cost basis. Users can also edit shares and cost basis directly in the builder table, delete individual holdings, or clear the whole portfolio. Unknown valid-looking symbols can still be entered through the custom ticker fallback, but they are flagged in AI readiness because the mock app has no exchange listing or detailed context for them.

## AI Risk Review

The `Build Portfolio` tab includes a deterministic AI-style risk review. It flags possible issues such as:

- Single-holding concentration
- Sector concentration
- Limited diversification
- Missing source context
- Basic listed-data coverage for exchange-listed symbols without detailed mock news
- Higher mock-session volatility

The review is educational only and avoids investment recommendations.

## Website Demo Flow

Open the `Demo Guide` tab first when presenting the project from your portfolio website. Click `Load Demo Portfolio` to move into the builder with a mixed portfolio that includes Schwab, Apple, Tesla, Beyond Meat, and a bond ETF. Then open `Insights` to show cited explanations, source coverage, attribution, the prompt packet, and the advice guardrail. Use `Copy Demo Report` when you want a quick written summary for an interviewer or project page.

See [docs/ai-system-design.md](docs/ai-system-design.md) for the suggested architecture and [docs/interview-pitch.md](docs/interview-pitch.md) for a quick interview demo script.
