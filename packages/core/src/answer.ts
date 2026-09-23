import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { generateText, generateObject } from "ai";
import { z } from "zod";
import type { RetrievedChunk } from "./retrieve";
import { getOpenRouterApiKey } from "./settings";

// Chat model: per-bot choice from Settings.model (the instructions page's model selector),
// falling back to the CHAT_MODEL env var, then a hardcoded default. Any OpenRouter model id.
const chatModel = async (model?: string) => {
  const openrouter = createOpenRouter({ apiKey: await getOpenRouterApiKey() });
  return openrouter.chat(model || process.env.CHAT_MODEL || "openai/gpt-4o-mini");
};

function sourceBlock(sources: RetrievedChunk[]) {
  return sources.map((s, i) => `[${i + 1}] ${s.content}`).join("\n\n");
}

export async function draftAnswer(opts: {
  question: string;
  systemPrompt: string;
  sources: RetrievedChunk[];
  model?: string;
}) {
  const { text } = await generateText({
    model: await chatModel(opts.model),
    system: [
      opts.systemPrompt || "You are a helpful support agent. Be concise and plain.",
      "Answer only using the sources below. Never invent facts, links or policies not present in them.",
      "If the sources don't answer the question, say so plainly instead of guessing.",
      "",
      sourceBlock(opts.sources),
    ].join("\n"),
    prompt: opts.question,
  });
  return text;
}

const gateSchema = z.object({
  confidence: z.number().min(0).max(1).describe("0 = unsupported guess, 1 = fully supported by the sources"),
  supported: z.boolean().describe("true only if every claim in the answer traces to the sources"),
  answered: z
    .boolean()
    .describe("true only if the answer actually resolves the question — false if it declines, hedges, or says the sources don't cover it"),
});

export async function gateAnswer(opts: { question: string; answer: string; sources: RetrievedChunk[]; model?: string }) {
  const { object } = await generateObject({
    model: await chatModel(opts.model),
    schema: gateSchema,
    prompt: [
      "You are an accuracy judge for a support bot. Judge two separate things:",
      "1. supported: is every claim in the answer directly traceable to the sources, with nothing invented?",
      "2. answered: does the answer actually resolve the visitor's question? A decline, hedge, or 'the sources don't mention that' is NOT answered, even if it's honest.",
      `Question: ${opts.question}`,
      `Answer: ${opts.answer}`,
      "Sources:",
      sourceBlock(opts.sources),
    ].join("\n\n"),
  });
  return object;
}
