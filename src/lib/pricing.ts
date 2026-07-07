/**
 * Static published list prices, USD per million tokens, standard tier.
 * This is a snapshot, not a live feed — the UI must render `pricesAsOf`
 * wherever these numbers appear.
 */
export const pricesAsOf = "January 2026";

/** Fixed reference rate used to express USD list prices in EUR. Disclosed in the UI. */
export const usdToEur = 0.92;

export interface ModelPrice {
  id: string;
  label: string;
  provider: "Anthropic" | "OpenAI" | "Google";
  inputPerMTok: number; // USD per 1M input tokens
  outputPerMTok: number; // USD per 1M output tokens
}

export const MODEL_PRICES: ModelPrice[] = [
  { id: "claude-opus-4-5", label: "Claude Opus 4.5", provider: "Anthropic", inputPerMTok: 5, outputPerMTok: 25 },
  { id: "claude-sonnet-4-5", label: "Claude Sonnet 4.5", provider: "Anthropic", inputPerMTok: 3, outputPerMTok: 15 },
  { id: "claude-haiku-4-5", label: "Claude Haiku 4.5", provider: "Anthropic", inputPerMTok: 1, outputPerMTok: 5 },
  { id: "gpt-5-1", label: "GPT-5.1", provider: "OpenAI", inputPerMTok: 1.25, outputPerMTok: 10 },
  { id: "gpt-5-mini", label: "GPT-5 mini", provider: "OpenAI", inputPerMTok: 0.25, outputPerMTok: 2 },
  { id: "gemini-2-5-pro", label: "Gemini 2.5 Pro", provider: "Google", inputPerMTok: 1.25, outputPerMTok: 10 },
  { id: "gemini-2-5-flash", label: "Gemini 2.5 Flash", provider: "Google", inputPerMTok: 0.3, outputPerMTok: 2.5 },
];

export function getModelPrice(id: string): ModelPrice | undefined {
  return MODEL_PRICES.find((m) => m.id === id);
}
