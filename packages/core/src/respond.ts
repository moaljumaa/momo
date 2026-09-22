import { retrieve } from "./retrieve";
import { draftAnswer, gateAnswer } from "./answer";

export type Respond = {
  content: string;
  // null on handoff — the gate's confidence describes the discarded draft answer,
  // not the fallback message actually shown, so it must not be rendered as if it were.
  confidence: number | null;
  sources: { sourceId: string; snippet: string }[];
  handoff: boolean;
};

// The core loop: retrieve -> draft -> accuracy gate -> confident answer or handoff.
export async function respond(opts: {
  question: string;
  systemPrompt: string;
  threshold: number;
  model?: string;
}): Promise<Respond> {
  const chunks = await retrieve(opts.question);

  if (chunks.length === 0) {
    return {
      content: "I don't know yet — nothing has been taught to me about that. I've passed this to the team.",
      confidence: 0,
      sources: [],
      handoff: true,
    };
  }

  const answer = await draftAnswer({
    question: opts.question,
    systemPrompt: opts.systemPrompt,
    sources: chunks,
    model: opts.model,
  });
  const gate = await gateAnswer({ question: opts.question, answer, sources: chunks, model: opts.model });
  const handoff = gate.confidence < opts.threshold || !gate.supported || !gate.answered;

  return {
    content: handoff ? "I'm not sure about that — I've passed it to the team." : answer,
    confidence: handoff ? null : gate.confidence,
    sources: handoff ? [] : chunks.map((c) => ({ sourceId: c.sourceId, snippet: c.content.slice(0, 160) })),
    handoff,
  };
}
