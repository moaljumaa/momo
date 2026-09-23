"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

// "-latest" aliases (the "~" prefix) always resolve to that provider's current small model,
// so these stay accurate without us re-pinning slugs after every release. Gemini has no
// flash-lite "-latest" alias on OpenRouter yet, so that one is a concrete pinned slug.
const RECOMMENDED = [
  { id: "openai/gpt-6-luna", name: "GPT-6 Luna", vendor: "OpenAI" },
  { id: "~anthropic/claude-haiku-latest", name: "Claude Haiku", vendor: "Anthropic · latest" },
  { id: "google/gemini-3.5-flash-lite", name: "Gemini Flash Lite", vendor: "Google" },
];

type OpenRouterModel = { id: string; name: string };

export function ApiKeyStep({ onNext }: { onNext: () => void }) {
  const [apiKey, setApiKey] = useState("");
  const [model, setModel] = useState(RECOMMENDED[0].id);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState("");
  const [browsing, setBrowsing] = useState(false);
  const [models, setModels] = useState<OpenRouterModel[] | null>(null);
  const [query, setQuery] = useState("");

  async function loadModels() {
    setBrowsing((b) => !b);
    if (models) return;
    const res = await fetch("/api/openrouter/models");
    const data = await res.json();
    setModels(data.models ?? []);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setVerifying(true);
    setError("");
    try {
      const res = await fetch("/api/onboarding/verify-key", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ apiKey }),
      });
      const data = await res.json();
      if (!data.ok) {
        setError(data.error ?? "Couldn't verify that key");
        return;
      }
      await fetch("/api/settings", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ openrouterApiKey: apiKey.trim(), model }),
      });
      onNext();
    } finally {
      setVerifying(false);
    }
  }

  const filtered = models?.filter(
    (m) => m.name.toLowerCase().includes(query.toLowerCase()) || m.id.toLowerCase().includes(query.toLowerCase()),
  );

  return (
    <form onSubmit={submit} className="flex flex-col gap-6">
      <div>
        <label className="mb-2 block text-sm font-normal">OpenRouter API key</label>
        <Input
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          type="password"
          placeholder="sk-or-v1-…"
          required
          autoFocus
          className="h-12 rounded-[1rem] px-4"
        />
        <p className="mt-2 text-xs font-light text-faint">
          Get a key at{" "}
          <a href="https://openrouter.ai/keys" target="_blank" rel="noreferrer" className="underline decoration-dotted">
            openrouter.ai/keys
          </a>
          . Stored on your own instance — never sent anywhere but OpenRouter.
        </p>
      </div>

      <div>
        <label className="mb-2 block text-sm font-normal">Model</label>
        <div className="grid grid-cols-3 gap-2">
          {RECOMMENDED.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => setModel(m.id)}
              className={`flex flex-col gap-1 rounded-[1rem] border px-3 py-3 text-left transition-colors ${
                model === m.id ? "border-ember bg-hover" : "border-line hover:bg-hover"
              }`}
            >
              <span className="text-sm font-normal">{m.name}</span>
              <span className="text-xs font-light text-faint">{m.vendor}</span>
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={loadModels}
          className="mt-2 flex items-center gap-1 text-xs font-light text-faint hover:text-ink"
        >
          Browse all models
          <ChevronDown className={`size-3 transition-transform ${browsing ? "rotate-180" : ""}`} />
        </button>

        {browsing && (
          <div className="mt-2 overflow-hidden rounded-[1rem] border border-line bg-sheet">
            <div className="border-b border-line p-2">
              <Input autoFocus placeholder="Search models…" value={query} onChange={(e) => setQuery(e.target.value)} />
            </div>
            <div className="max-h-48 overflow-y-auto p-1">
              {filtered?.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => {
                    setModel(m.id);
                    setBrowsing(false);
                    setQuery("");
                  }}
                  className={`flex w-full flex-col gap-0.5 rounded-[0.65rem] px-3 py-2 text-left transition-colors hover:bg-hover ${
                    m.id === model ? "bg-hover" : ""
                  }`}
                >
                  <span className="truncate text-sm font-normal">{m.name}</span>
                  <span className="truncate text-xs font-light text-faint">{m.id}</span>
                </button>
              ))}
              {!models && <p className="p-3 text-xs font-light text-faint">Loading…</p>}
              {filtered?.length === 0 && <p className="p-3 text-xs font-light text-faint">No models match “{query}”.</p>}
            </div>
          </div>
        )}
      </div>

      {error && <p className="text-sm text-clay">{error}</p>}

      <Button type="submit" disabled={verifying || !apiKey.trim()} className="h-11 self-start rounded-full px-6">
        {verifying ? "Verifying…" : "Continue"}
      </Button>
    </form>
  );
}
