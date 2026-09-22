"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { ConfigPanel } from "./ConfigPanel";

type Msg = {
  role: "VISITOR" | "AI";
  content: string;
  confidence?: number | null;
  sources?: { sourceId: string; snippet: string }[];
};

function band(confidence: number) {
  if (confidence >= 0.85) return { dot: "bg-sky", label: "Confident" };
  if (confidence >= 0.6) return { dot: "bg-wheat", label: "Fairly sure" };
  return { dot: "bg-clay", label: "Not sure" };
}

type Settings = { welcomeMessage: string; placeholder: string; suggestedQuestions: string[] };

export default function Playground() {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [conversationId, setConversationId] = useState<string | undefined>();
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [settings, setSettings] = useState<Settings | null>(null);

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((d) => setSettings(d.settings));
  }, []);

  async function send(text: string) {
    if (!text.trim() || sending) return;
    setSending(true);
    setInput("");
    setMessages((m) => [...m, { role: "VISITOR", content: text }]);

    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ conversationId, message: text }),
    });
    const data = await res.json();
    setConversationId(data.conversationId);
    setMessages((m) => [
      ...m,
      { role: "AI", content: data.message.content, confidence: data.message.confidence, sources: data.message.sources },
    ]);
    setSending(false);
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden p-8">
        <div className="mx-auto flex w-full max-w-160 flex-1 flex-col justify-end overflow-hidden">
          <div className="flex flex-1 flex-col justify-end gap-6 overflow-y-auto pb-8">
            {messages.length === 0 && (
              <div className="flex flex-1 flex-col justify-center gap-6">
                <p className="text-2xl font-light leading-snug">
                  {settings?.welcomeMessage ?? "Ask me anything about this business."}
                </p>
                <div className="flex flex-wrap gap-2">
                  {(settings?.suggestedQuestions ?? []).map((s) => (
                    <Button key={s} variant="outline" onClick={() => send(s)} className="rounded-full px-4 text-soft">
                      {s}
                    </Button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((m, i) =>
              m.role === "VISITOR" ? (
                <p key={i} className="self-end text-right text-lg font-light">
                  {m.content}
                </p>
              ) : (
                <div key={i} className="flex flex-col gap-2">
                  <p className="text-2xl font-light leading-snug">{m.content}</p>
                  <div className="flex items-center gap-3 text-xs font-light text-faint">
                    {typeof m.confidence === "number" && (
                      <span className="inline-flex items-center gap-1.5">
                        <span className={`size-1.5 rounded-full ${band(m.confidence).dot}`} />
                        {band(m.confidence).label} · {Math.round(m.confidence * 100)}%
                      </span>
                    )}
                    {m.sources?.map((s, j) => (
                      <span key={j} className="underline decoration-dotted">
                        source {j + 1}
                      </span>
                    ))}
                  </div>
                </div>
              ),
            )}
            {sending && (
              <p className="flex items-center gap-2 text-sm font-light text-faint">
                <span className="size-1.5 animate-pulse rounded-full bg-ember" />
                Thinking…
              </p>
            )}
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              send(input);
            }}
            className="flex shrink-0 items-center rounded-full border border-edge bg-well px-6 py-4 transition-colors focus-within:border-sky-deep"
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={settings?.placeholder ?? "Ask me anything"}
              className="flex-1 bg-transparent text-sm font-light outline-none placeholder:text-faint"
            />
          </form>
        </div>
      </div>

      <div className="w-96 shrink-0 border-l border-line">
        <ConfigPanel />
      </div>
    </div>
  );
}
