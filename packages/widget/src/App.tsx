import { useEffect, useRef, useState } from "preact/hooks";

type Msg = {
  role: "VISITOR" | "AI";
  content: string;
  confidence?: number | null;
  sources?: { sourceId: string; snippet: string }[];
  handoff?: boolean;
};

type Config = {
  name: string;
  widgetColor: string | null;
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
  const logRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch(`${apiBase}/api/widget/config`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d) => setConfig(d.config))
      .catch(() => setConfig(null));
  }, [apiBase]);

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
        body: JSON.stringify({ conversationId, message: text }),
      });
      const data = await res.json();
      if (data.conversationId) {
        setConversationId(data.conversationId);
        sessionStorage.setItem(STORAGE_KEY, data.conversationId);
      }
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
    } catch {
      setMessages((m) => [...m, { role: "AI", content: "Something went wrong. Please try again." }]);
    } finally {
      setSending(false);
    }
  }

  // Nothing to embed if the channel is disabled or the origin isn't allowlisted.
  if (config === null) return null;

  return (
    <div class={`momo-dock${open ? " momo-open" : ""}`} role="dialog" aria-label={config.name}>
      <div class="momo-top">
        {config.logoUrl && <img class="momo-logo" src={config.logoUrl} alt="" />}
        <span>{config.name}</span>
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
                <p>{m.content}</p>
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
          onInput={(e) => setInput((e.target as HTMLInputElement).value)}
          onFocus={expand}
          placeholder={config.placeholder}
          aria-label={config.placeholder}
        />
        <button type="submit">Ask</button>
      </form>
    </div>
  );
}
