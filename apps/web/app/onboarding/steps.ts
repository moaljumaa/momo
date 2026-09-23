export type StepKey = "key" | "website" | "more" | "channel" | "handoff" | "done";

export const STEPS: { key: StepKey; label: string; eyebrow: string; title: string; body: string }[] = [
  {
    key: "key",
    label: "Connect a model",
    eyebrow: "Step 1 of 6",
    title: "Bring your own AI",
    body: "momo answers through an OpenRouter key you provide — your usage, your cost, no markup. Small models answer support questions well for a fraction of a large model's price, so that's what we recommend to start.",
  },
  {
    key: "website",
    label: "Add your website",
    eyebrow: "Step 2 of 6",
    title: "Teach it your product",
    body: "Point it at your site and we'll crawl the pages you pick, then draft the bot's instructions, tone and starter questions straight from your own content — review and tweak anything before it's saved.",
  },
  {
    key: "more",
    label: "More context",
    eyebrow: "Step 3 of 6",
    title: "Anything else it should know?",
    body: "Add a PDF, paste a block of text, or write exact question-and-answer pairs for things your site doesn't say outright — refund policy, pricing exceptions, internal terms. Optional — skip if your website already covers it.",
  },
  {
    key: "channel",
    label: "Turn on the widget",
    eyebrow: "Step 4 of 6",
    title: "Put it on your site",
    body: "The website widget is a quiet chat pill you embed with one script tag. Turn it on now — you'll get the embed snippet at the end of this wizard.",
  },
  {
    key: "handoff",
    label: "Handoff",
    eyebrow: "Step 5 of 6",
    title: "When the AI should ask for a human",
    body: "When momo can't answer confidently, it hands off to your team instead of guessing. Handoff fields are the short questions it asks first — like an email — so whoever picks up the conversation has what they need.",
  },
  {
    key: "done",
    label: "Done",
    eyebrow: "Step 6 of 6",
    title: "You're live",
    body: "Paste the snippet below into your site and momo starts answering from what it just learned.",
  },
];
