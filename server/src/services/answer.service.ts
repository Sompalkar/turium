import Anthropic from "@anthropic-ai/sdk";
import { config } from "../config.js";
import type { RetrievedChunk } from "../domain/retrieval.js";
import { AppError, badGateway } from "../lib/errors.js";
import { ANSWER_SYSTEM_PROMPT, buildAnswerPrompt } from "../lib/prompt.js";
import type { Logger } from "../lib/logger.js";

export interface Answer {
  text: string;
  model: string;
  usage: { inputTokens: number; outputTokens: number };
}

const NOTHING_FOUND = "Nothing in your saved items covers that. Try saving something on the topic first.";

let client: Anthropic | null = null;

function getClient(): Anthropic {
  if (!config.anthropic.apiKey) {
    throw new AppError(500, "missing_api_key", "ANTHROPIC_API_KEY is not set, so answers cannot be generated");
  }
  client ??= new Anthropic({ apiKey: config.anthropic.apiKey });
  return client;
}

export async function generateAnswer(question: string, chunks: RetrievedChunk[], log: Logger): Promise<Answer> {
  // Nothing retrieved means nothing to ground an answer in, so do not pay for a call.
  if (chunks.length === 0) {
    return { text: NOTHING_FOUND, model: "none", usage: { inputTokens: 0, outputTokens: 0 } };
  }

  const startedAt = Date.now();

  try {
    const response = await getClient().messages.create({
      model: config.anthropic.model,
      max_tokens: config.anthropic.maxTokens,
      output_config: { effort: "medium" },
      system: ANSWER_SYSTEM_PROMPT,
      messages: [{ role: "user", content: buildAnswerPrompt(question, chunks) }],
    });

    const text = response.content
      .filter((block) => block.type === "text")
      .map((block) => block.text)
      .join("\n")
      .trim();

    log.info("answer generated", {
      model: response.model,
      inputTokens: response.usage.input_tokens,
      outputTokens: response.usage.output_tokens,
      stopReason: response.stop_reason,
      tookMs: Date.now() - startedAt,
    });

    if (text.length === 0) {
      throw badGateway("empty_answer", "The model returned no answer text");
    }

    return {
      text,
      model: response.model,
      usage: { inputTokens: response.usage.input_tokens, outputTokens: response.usage.output_tokens },
    };
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw toAppError(error);
  }
}

function toAppError(error: unknown): AppError {
  if (error instanceof Anthropic.AuthenticationError) {
    return new AppError(500, "invalid_api_key", "The Anthropic API key was rejected");
  }
  if (error instanceof Anthropic.RateLimitError) {
    return new AppError(429, "rate_limited", "The Anthropic API is rate limiting us, try again shortly");
  }
  if (error instanceof Anthropic.APIError) {
    return badGateway("model_call_failed", `The Anthropic API returned ${error.status}`, { message: error.message });
  }
  return badGateway("model_call_failed", "Could not reach the Anthropic API", {
    message: error instanceof Error ? error.message : String(error),
  });
}
