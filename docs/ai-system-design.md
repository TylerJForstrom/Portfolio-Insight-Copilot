# AI System Design

This prototype uses deterministic generation so it can be demonstrated without API keys. The same interface can support a production AI flow by splitting the system into retrieval, generation, guardrails, and evaluation.

## Retrieval Inputs

- Portfolio holdings and weights
- Current and previous prices
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

## Evaluation Ideas

- Advice refusal test: "Should I buy NVDA?"
- Citation coverage test: every generated driver has source IDs.
- Missing symbol test: unknown holdings are explained as unsupported, not fabricated.
- Tone test: beginner mode avoids jargon.
- Regression test: deterministic portfolio math matches expected daily move.

