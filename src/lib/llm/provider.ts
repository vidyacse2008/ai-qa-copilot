import type { LLMProvider } from "./types";
import { AnthropicProvider } from "./providers/anthropic";

export function getProvider(): LLMProvider {
  const providerName = process.env.LLM_PROVIDER ?? "anthropic";

  switch (providerName) {
    case "anthropic":
      return new AnthropicProvider();
    default:
      throw new Error(`Unknown LLM_PROVIDER: "${providerName}"`);
  }
}
