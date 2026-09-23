import { useEffect, useRef, useState } from "preact/hooks";
import { Markdown } from "./markdown";

type Msg = {
  id?: string;
  role: "VISITOR" | "AI" | "AGENT";
  content: string;
  confidence?: number | null;
  sources?: { sourceId: string; snippet: string }[];
  handoff?: boolean;
  agentName?: string;
};

type Config = {
  name: string;
  widgetColor: string | null;
  widgetPosition: "center" | "corner";
  welcomeMessage: string;
  placeholder: string;
  suggestedQuestions: string[];
  logoUrl: string | null;
};

const STORAGE_KEY = "momo_conversation_id";

function band(confidence: number) {
  if (confidence >= 0.85) return { dot: "sky", label: "Confident" };
  if (confidence >= 0.6) return { dot: "wheat", label: "Fairly sure" };
  return { dot: "clay", label: "Not sure" };
}

// Mist dock: closed = a quiet bottom pill (the input bar itself, no separate launcher
// button); focusing or submitting it expands the same element to a full-screen, centered
// 640px conversation. See design/05-mist/widget.html for the reference interaction.
export function App({ apiBase }: { apiBase: string }) {
  const [open, setOpen] = useState(false);
  const [config, setConfig] = useState<Config | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [conversationId, setConversationId] = useState<string | undefined>(
    () => sessionStorage.getItem(STORAGE_KEY) ?? undefined,
  );
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [agentTyping, setAgentTyping] = useState<string | null>(null);
  const logRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const typingTimeoutRef = useRef<number | undefined>(undefined);
  const lastTypingSentRef = useRef(0);
  const conversationIdRef = useRef<string | undefined>(conversationId);
  conversationIdRef.current = conversationId;

  function notifyTyping() {
    if (!conversationIdRef.current) return;
    const now = Date.now();
    if (now - lastTypingSentRef.current < 1200) return;
    lastTypingSentRef.current = now;
    fetch(`${apiBase}/api/widget/typing`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ conversationId: conversationIdRef.current }),
    });
  }

  useEffect(() => {
    fetch(`${apiBase}/api/widget/config`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d) => setConfig(d.config))
      .catch(() => setConfig(null));
  }, [apiBase]);

  // Live channel for an agent's reply/typing status once a conversation exists — lets a
  // human agent reach the visitor from the admin Conversations page without the visitor
  // having to send another message first.
  useEffect(() => {
    if (!conversationId) return;
    const source = new EventSource(`${apiBase}/api/widget/events?conversationId=${conversationId}`);
    source.onmessage = (e) => {
      const event = JSON.parse(e.data);
      if (event.type === "typing") {
        setAgentTyping(event.agentName);
        window.clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = window.setTimeout(() => setAgentTyping(null), 3000);
        return;
      }
      if (event.type === "message" && event.message.role === "AGENT") {
        setAgentTyping(null);
        setOpen(true);
        setMessages((m) =>
          m.some((existing) => existing.id === event.message.id)
            ? m
            : [...m, { id: event.message.id, role: "AGENT", content: event.message.content, agentName: event.message.agent?.name }],
        );
      }
    };
    return () => source.close();
  }, [apiBase, conversationId]);

  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, sending]);

  useEffect(() => {
    function onKeydown(e: KeyboardEvent) {
      if (e.key === "Escape" && open) close();
    }
    document.addEventListener("keydown", onKeydown);
    return () => document.removeEventListener("keydown", onKeydown);
  }, [open]);

  function expand() {
    setOpen(true);
  }

  function close() {
    setOpen(false);
    inputRef.current?.blur();
  }

  function restart() {
    setMessages([]);
    setConversationId(undefined);
    setAgentTyping(null);
    sessionStorage.removeItem(STORAGE_KEY);
    inputRef.current?.focus();
  }

  async function send(text: string) {
    if (!text.trim() || sending || !config) return;
    expand();
    setSending(true);
    setInput("");
    setMessages((m) => [...m, { role: "VISITOR", content: text }]);

    try {
      const res = await fetch(`${apiBase}/api/widget/chat`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          conversationId,
          message: text,
          visitor: {
            language: navigator.language,
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            referrer: document.referrer || null,
            pageUrl: location.href,
          },
        }),
      });
      const data = await res.json();
      if (data.conversationId) {
        setConversationId(data.conversationId);
        sessionStorage.setItem(STORAGE_KEY, data.conversationId);
      }
      // A human owns this conversation now — no AI reply comes back. The agent's response
      // arrives later over the SSE channel (see the effect above).
      if (data.message) {
        setMessages((m) => [
          ...m,
          {
            role: "AI",
            content: data.message.content,
            confidence: data.message.confidence,
            sources: data.message.sources,
            handoff: data.handoff,
          },
        ]);
      }
    } catch {
      setMessages((m) => [...m, { role: "AI", content: "Something went wrong. Please try again." }]);
    } finally {
      setSending(false);
    }
  }

  // Nothing to embed if the channel is disabled or the origin isn't allowlisted.
  if (config === null) return null;

  const corner = config.widgetPosition === "corner";

  if (corner && !open) {
    return (
      <button type="button" class="momo-dock momo-launcher" onClick={expand} aria-label={`Open ${config.name} chat`}>
        {config.logoUrl ? <img src={config.logoUrl} alt="" /> : <span class="momo-launcher-dot" />}
      </button>
    );
  }

  // Ambient "life" glow: a quiet signal that someone (AI or a human agent) is active on
  // the other end, whether or not the panel is open yet.
  const ambient = sending || !!agentTyping;

  return (
    <div
      class={`momo-dock${open ? " momo-open" : ""}${corner ? " momo-corner" : ""}${ambient ? " momo-ambient" : ""}`}
      role="dialog"
      aria-label={config.name}
    >
      <div class="momo-top">
        {config.logoUrl && <img class="momo-logo" src={config.logoUrl} alt="" />}
        <span>{config.name}</span>
        {messages.length > 0 && (
          <button type="button" class="momo-restart" onClick={restart} aria-label="Restart chat">
            Restart
          </button>
        )}
        <button type="button" class="momo-close" onClick={close} aria-label="Close">
          Close
        </button>
      </div>

      <div class="momo-log" ref={logRef}>
        <div class="momo-col">
          {messages.length === 0 && (
            <div class="momo-hello">
              <p>{config.welcomeMessage}</p>
              {config.suggestedQuestions.length > 0 && (
                <div class="momo-sug">
                  {config.suggestedQuestions.map((q) => (
                    <button key={q} type="button" onClick={() => send(q)}>
                      {q}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {messages.map((m, i) =>
            m.role === "VISITOR" ? (
              <p key={i} class="momo-u">
                {m.content}
              </p>
            ) : (
              <div key={i} class="momo-a">
                {m.role === "AGENT" && <p class="momo-meta">{m.agentName ?? "Agent"}</p>}
                <Markdown text={m.content} />
                <div class="momo-meta">
                  {typeof m.confidence === "number" && (
                    <span>
                      <span class={`momo-dot momo-dot-${band(m.confidence).dot}`} />
                      {band(m.confidence).label}, {Math.round(m.confidence * 100)}%
                    </span>
                  )}
                  {m.handoff && <span>Passed to the team</span>}
                  {m.sources?.map((s, j) => (
                    <a key={j} href="#">
                      source {j + 1}
                    </a>
                  ))}
                </div>
              </div>
            ),
          )}

          {sending && (
            <div class="momo-think" aria-label="Thinking">
              <i />
              <i />
              <i />
            </div>
          )}
          {!sending && agentTyping && (
            <div class="momo-think" aria-label={`${agentTyping} is typing`}>
              <i />
              <i />
              <i />
            </div>
          )}
        </div>
      </div>

      <form
        class="momo-bar"
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
      >
        <input
          ref={inputRef}
          value={input}
          onInput={(e) => {
            setInput((e.target as HTMLInputElement).value);
            notifyTyping();
          }}
          onFocus={expand}
          placeholder={config.placeholder}
          aria-label={config.placeholder}
        />
        <button type="submit">Ask</button>
      </form>
    </div>
  );
}
