"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { ConfigPanel } from "./ConfigPanel";
import type { DisplaySettings } from "./ConfigPanel";
import { PLACEHOLDER_MAX } from "./constants";
import { CHANNEL_LABEL, type ChannelKind } from "../channels/ChannelIcon";
import { DeployButton } from "../channels/DeployButton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RotateCcw, ArrowUp, Globe } from "lucide-react";

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

type Settings = DisplaySettings & { name: string };

const CHANNELS: { kind: ChannelKind; available: boolean }[] = [
  { kind: "website-widget", available: true },
  { kind: "help-page", available: false },
];

export default function Playground() {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [conversationId, setConversationId] = useState<string | undefined>();
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [expanded, setExpanded] = useState(true);
  const [channel, setChannel] = useState<ChannelKind>("website-widget");

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((d) =>
        setSettings({
          name: d.settings.name,
          welcomeMessage: d.settings.welcomeMessage,
          placeholder: d.settings.placeholder,
          suggestedQuestions: d.settings.suggestedQuestions ?? [],
          logoUrl: d.settings.logoUrl,
          widgetColor: d.settings.widgetColor,
          widgetPosition: d.settings.widgetPosition ?? "center",
        }),
      );
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

  function restart() {
    setMessages([]);
    setConversationId(undefined);
    setInput("");
  }

  function onDisplayChange(patch: Partial<DisplaySettings>) {
    setSettings((s) => (s ? { ...s, ...patch } : s));
  }

  const accent = settings?.widgetColor || undefined;
  const corner = settings?.widgetPosition === "corner";

  return (
    <div className="flex h-screen overflow-hidden">
      <div className="flex min-w-0 flex-1 flex-col gap-4 overflow-hidden p-8">
        <div className="flex shrink-0 items-center justify-between gap-3">
          <Select value={channel} onValueChange={(v) => setChannel(v as ChannelKind)}>
            <SelectTrigger className="h-9 w-48 gap-2">
              <SelectValue>
                {(value: ChannelKind) => (
                  <span className="flex items-center gap-2 text-faint">
                    <Globe className="size-4" />
                    <span className="text-ink">{CHANNEL_LABEL[value]}</span>
                  </span>
                )}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {CHANNELS.map(({ kind, available }) => (
                <SelectItem key={kind} value={kind} disabled={!available}>
                  {CHANNEL_LABEL[kind]}
                  {!available && <span className="ml-1 text-xs font-light text-faint">Soon</span>}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <DeployButton />
        </div>

        {/* Shows the widget exactly as it will sit on the customer's site. */}
        <div className="relative min-h-0 flex-1 overflow-hidden rounded-[1.25rem] bg-bg">
            {/* faint fake page content behind the widget */}
            <div className="flex flex-col gap-3 p-8 opacity-30">
              <div className="h-3 w-1/3 rounded bg-ink" />
              <div className="h-2 w-2/3 rounded bg-ink/60" />
              <div className="h-2 w-1/2 rounded bg-ink/60" />
              <div className="mt-4 h-2 w-3/4 rounded bg-ink/60" />
              <div className="h-2 w-1/3 rounded bg-ink/60" />
            </div>

            {!expanded ? (
              corner ? (
                <button
                  onClick={() => setExpanded(true)}
                  className="absolute right-5 bottom-5 flex size-14 items-center justify-center rounded-full shadow-lg transition-transform hover:scale-105"
                  style={{ background: accent || "var(--ember)" }}
                >
                  {settings?.logoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={settings.logoUrl} alt="" className="size-7 rounded-full object-cover" />
                  ) : (
                    <span className="size-3.5 rounded-full bg-sheet" />
                  )}
                </button>
              ) : (
                <button
                  onClick={() => setExpanded(true)}
                  className="absolute bottom-5 left-1/2 flex h-14 w-full max-w-md -translate-x-1/2 items-center gap-3 rounded-full border border-edge bg-sheet py-1.5 pr-1.5 pl-5 shadow-lg transition-transform hover:scale-[1.01]"
                >
                  <span className="flex-1 truncate text-left text-sm font-light text-faint">
                    {(settings?.placeholder ?? "Ask me anything").slice(0, PLACEHOLDER_MAX)}
                  </span>
                  <span
                    className="flex size-11 shrink-0 items-center justify-center rounded-full"
                    style={{ background: accent || "var(--ember)" }}
                  >
                    <ArrowUp className="size-4 text-sheet" />
                  </span>
                </button>
              )
            ) : (
              <div
                className={`absolute flex flex-col overflow-hidden rounded-[1.25rem] border border-line bg-sheet shadow-xl ${
                  corner ? "right-5 bottom-5 top-5 w-96" : "inset-5"
                }`}
              >
                <div className="flex shrink-0 items-center gap-2 border-b border-line px-6 py-4">
                  {settings?.logoUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={settings.logoUrl} alt="" className="size-6 rounded-full object-cover" />
                  )}
                  <span className="flex-1 text-sm font-normal text-soft">{settings?.name ?? "Assistant"}</span>
                  {messages.length > 0 && (
                    <button
                      onClick={restart}
                      className="flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-light text-faint transition-colors hover:bg-hover hover:text-ink"
                    >
                      <RotateCcw className="size-3.5" />
                      Restart
                    </button>
                  )}
                </div>

                <div className="flex min-h-0 flex-1 flex-col-reverse overflow-x-hidden overflow-y-auto px-6 py-6">
                  <div className="flex flex-col gap-6">
                    {messages.length === 0 && (
                      <div className="flex flex-col gap-4">
                        <p className="text-xl font-light leading-snug">{settings?.welcomeMessage}</p>
                        <div className="flex flex-wrap gap-2">
                          {(settings?.suggestedQuestions ?? []).map((s) => (
                            <Button
                              key={s}
                              variant="outline"
                              onClick={() => send(s)}
                              className="h-auto shrink rounded-full px-4 py-1.5 text-left whitespace-normal text-soft"
                              style={accent ? { borderColor: accent, color: accent } : undefined}
                            >
                              {s}
                            </Button>
                          ))}
                        </div>
                      </div>
                    )}

                    {messages.map((m, i) =>
                      m.role === "VISITOR" ? (
                        <p key={i} className="self-end text-right text-base font-light">
                          {m.content}
                        </p>
                      ) : (
                        <div key={i} className="flex flex-col gap-2">
                          <p className="text-xl font-light leading-snug">{m.content}</p>
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
                </div>

                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    send(input);
                  }}
                  className="mx-6 mb-6 flex shrink-0 items-center rounded-full border border-edge bg-well px-5 py-3 transition-colors focus-within:border-sky-deep"
                >
                  <input
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder={settings?.placeholder ?? "Ask me anything"}
                    className="flex-1 bg-transparent text-sm font-light outline-none placeholder:text-faint"
                  />
                </form>
              </div>
            )}
        </div>
      </div>

      <div className="w-96 shrink-0 border-l border-line">
        <ConfigPanel onDisplayChange={onDisplayChange} expanded={expanded} onExpandedChange={setExpanded} />
      </div>
    </div>
  );
}
