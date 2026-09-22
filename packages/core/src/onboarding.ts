import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { generateObject } from "ai";
import { z } from "zod";

const openrouter = createOpenRouter({ apiKey: process.env.OPENROUTER_API_KEY });
const chatModel = () => openrouter.chat(process.env.CHAT_MODEL || "openai/gpt-4o-mini");

const draftSchema = z.object({
  systemPrompt: z.string().describe("2-4 sentences: who the business is, what the bot should help with, any tone/scope notes"),
  tone: z.enum(["friendly", "formal", "concise"]),
  welcomeMessage: z.string().describe("short greeting shown when the widget opens, e.g. 'Hi! How can I help?'"),
  placeholder: z.string().describe("short input placeholder, e.g. 'Ask about pricing, shipping...'"),
  suggestedQuestions: z.array(z.string()).min(3).max(4).describe("realistic questions a visitor to this site would ask"),
  rateLimitMessage: z.string().describe("short, on-brand message shown when a visitor hits the rate limit"),
});

export type OnboardingDraft = z.infer<typeof draftSchema>;

// Drafts Instructions + Guardrails copy + widget content from a sample of the site's
// own crawled text. The caller shows this to the user to edit/approve — nothing here
// is saved directly.
export async function draftOnboarding(opts: { siteUrl: string; sampleText: string }): Promise<OnboardingDraft> {
  const { object } = await generateObject({
    model: chatModel(),
    schema: draftSchema,
    prompt: [
      `You are setting up an AI support bot for ${opts.siteUrl} based on content crawled from its site.`,
      "Write copy that sounds like it belongs to this specific business, not generic boilerplate.",
      "Content sample:",
      opts.sampleText.slice(0, 6000),
    ].join("\n\n"),
  });
  return object;
}
