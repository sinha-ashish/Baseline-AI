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

/** Just the two per-MTok rates — what the estimator math actually needs. */
export type PriceRates = Pick<ModelPrice, "inputPerMTok" | "outputPerMTok">;

/**
 * The "let the gateway decide" blend: a routing layer that sends most
 * requests to a cheaper model and escalates the rest. This is an assumption
 * about architecture, not something the tool does — the UI labels it as such
 * and shows the split.
 */
export const DEFAULT_PREMIUM_SHARE = 0.2;
export const DEFAULT_CHEAP_MODEL_ID = "claude-haiku-4-5";
export const DEFAULT_PREMIUM_MODEL_ID = "claude-sonnet-4-5";

export function blendPrices(
  cheap: PriceRates,
  premium: PriceRates,
  premiumShare: number
): PriceRates {
  const p = Math.min(1, Math.max(0, premiumShare));
  return {
    inputPerMTok: cheap.inputPerMTok * (1 - p) + premium.inputPerMTok * p,
    outputPerMTok: cheap.outputPerMTok * (1 - p) + premium.outputPerMTok * p,
  };
}
