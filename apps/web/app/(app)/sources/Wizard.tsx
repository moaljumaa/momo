"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { WIZARD_STEP_LABELS } from "./steps";

type Draft = {
  systemPrompt: string;
  tone: "friendly" | "formal" | "concise";
  welcomeMessage: string;
  placeholder: string;
  suggestedQuestions: string[];
  rateLimitMessage: string;
  logoUrl: string | null;
  faviconUrl: string | null;
  logoCandidates: string[];
};

const STEP_COUNT = WIZARD_STEP_LABELS.length; // Instructions, Logo, Widget, Guardrails, Review

// Shown once a Source reaches READY. Generates AI-drafted Instructions/Guardrails/widget
// content from what was just crawled, lets the user edit it — with a live preview of how
// it'll actually render in the widget — then saves on approve.
export function Wizard({
  sourceId,
  siteUrl,
  step,
  onStepChange,
  onDone,
  onSkip,
  onCancel,
}: {
  sourceId: string;
  siteUrl: string;
  step: number;
  onStepChange: (step: number) => void;
  onDone: () => void;
  onSkip: () => void;
  // Only passed when this wizard was opened to review a re-sync, not first-time onboarding
  // — lets the user back out of just the review without it reading like "skip setup".
  onCancel?: () => void;
}) {
  const [draft, setDraft] = useState<Draft | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    // AbortController so React Strict Mode's dev-only double-invoke (mount -> cleanup ->
    // mount) doesn't fire two concurrent generations and race on which one lands.
    const controller = new AbortController();
    setError("");
    fetch("/api/onboarding/generate", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ sourceId }),
      signal: controller.signal,
    })
      .then(async (r) => {
        const d = await r.json().catch(() => null);
        if (d?.draft) setDraft(d.draft);
        else setError(d?.error ?? `Generation failed (${r.status}) — try again`);
      })
      .catch((err) => {
        if (err?.name === "AbortError") return;
        setError("Couldn't reach the server — check your connection and try again");
      });
    return () => controller.abort();
  }, [sourceId, attempt]);

  async function approve() {
    if (!draft) return;
    setSaving(true);
    await fetch("/api/settings", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        systemPrompt: draft.systemPrompt,
        tone: draft.tone,
        welcomeMessage: draft.welcomeMessage,
        placeholder: draft.placeholder,
        suggestedQuestions: draft.suggestedQuestions,
        rateLimitMessage: draft.rateLimitMessage,
        logoUrl: draft.logoUrl,
        faviconUrl: draft.faviconUrl,
      }),
    });
    setSaving(false);
    onDone();
  }

  if (error) {
    return (
      <div className="flex flex-1 flex-col justify-center gap-3">
        <p className="text-sm text-clay">{error}</p>
        <div className="flex gap-2">
          <Button onClick={() => setAttempt((a) => a + 1)} className="rounded-full px-4">
            Try again
          </Button>
          <Button variant="ghost" onClick={onSkip} className="text-soft">
            Skip
          </Button>
        </div>
      </div>
    );
  }

  if (!draft) {
    return <DraftingLoader siteUrl={siteUrl} />;
  }

  return (
    <div className="grid min-h-0 flex-1 grid-cols-1 gap-10 lg:grid-cols-[1fr_380px]">
      <div className="flex min-h-0 flex-col gap-4">
        <h1 className="shrink-0 text-2xl font-light">{WIZARD_STEP_LABELS[step]}</h1>

        <div className="min-h-0 flex-1 overflow-y-auto pr-1">
          {step === 0 && <InstructionsStep draft={draft} setDraft={setDraft} />}
          {step === 1 && <LogoStep draft={draft} setDraft={setDraft} siteUrl={siteUrl} />}
          {step === 2 && <WidgetStep draft={draft} setDraft={setDraft} />}
          {step === 3 && <GuardrailsStep draft={draft} setDraft={setDraft} />}
          {step === 4 && <ReviewStep draft={draft} onEdit={onStepChange} />}
        </div>

        <div className="flex shrink-0 justify-between pt-4">
          <div className="flex gap-2">
            {step > 0 && (
              <Button variant="ghost" onClick={() => onStepChange(step - 1)} className="text-soft">
                Back
              </Button>
            )}
            <Button variant="ghost" onClick={onSkip} className="text-soft">
              Skip
            </Button>
            {onCancel && (
              <Button variant="ghost" onClick={onCancel} className="text-clay">
                Cancel re-sync
              </Button>
            )}
          </div>
          {step < STEP_COUNT - 1 ? (
            <Button onClick={() => onStepChange(step + 1)} className="h-11 rounded-full px-6">
              Next
            </Button>
          ) : (
            <Button onClick={approve} disabled={saving} className="h-11 rounded-full px-6">
              {saving ? "Saving…" : "Approve & save"}
            </Button>
          )}
        </div>
      </div>

      <div className="hidden min-h-0 flex-col lg:flex">
        <p className="mb-3 shrink-0 text-xs font-normal text-soft">Live preview</p>
        <WidgetPreview draft={draft} />
      </div>
    </div>
  );
}

const DRAFTING_MESSAGES = [
  "Reading your pages",
  "Working out what your business does",
  "Writing the bot's instructions",
  "Drafting a welcome message and suggested questions",
  "Picking the right tone",
];

// Generation takes 10–30s, so the loader cycles through what's actually happening instead of
// sitting on one static line — a pulsing orb plus a rotating status keeps it clearly alive.
function DraftingLoader({ siteUrl }: { siteUrl: string }) {
  const [i, setI] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setI((n) => (n + 1) % DRAFTING_MESSAGES.length), 2600);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-8 text-center">
      <div className="relative flex size-16 items-center justify-center">
        <span className="absolute inline-flex size-full animate-ping rounded-full bg-ember/30" />
        <span className="absolute inline-flex size-10 animate-pulse rounded-full bg-ember/40" />
        <span className="relative size-4 rounded-full bg-ember" />
      </div>
      <div className="flex flex-col gap-2">
        <p key={i} className="animate-pulse text-base font-light text-ink">
          {DRAFTING_MESSAGES[i]}…
        </p>
        <p className="max-w-sm truncate text-xs font-light text-faint">{siteUrl}</p>
      </div>
      <div className="flex gap-1.5">
        {[0, 1, 2].map((d) => (
          <span
            key={d}
            className="size-1.5 animate-bounce rounded-full bg-faint"
            style={{ animationDelay: `${d * 150}ms` }}
          />
        ))}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <p className="text-xs font-normal text-soft">{label}</p>
      {children}
    </div>
  );
}

function InstructionsStep({ draft, setDraft }: { draft: Draft; setDraft: (d: Draft) => void }) {
  return (
    <div className="flex flex-col gap-5">
      <Field label="System prompt">
        <Textarea
          className="min-h-48 resize-none text-[15px] leading-relaxed"
          value={draft.systemPrompt}
          onChange={(e) => setDraft({ ...draft, systemPrompt: e.target.value })}
        />
      </Field>
      <Field label="Tone">
        <Select value={draft.tone} onValueChange={(v) => setDraft({ ...draft, tone: v as Draft["tone"] })}>
          <SelectTrigger className="h-11">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="friendly">Friendly</SelectItem>
            <SelectItem value="formal">Formal</SelectItem>
            <SelectItem value="concise">Concise</SelectItem>
          </SelectContent>
        </Select>
      </Field>
    </div>
  );
}

function LogoStep({
  draft,
  setDraft,
  siteUrl,
}: {
  draft: Draft;
  setDraft: (d: Draft) => void;
  siteUrl: string;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  async function upload(file: File) {
    setUploading(true);
    const form = new FormData();
    form.append("file", file);
    const res = await fetch("/api/settings/logo", { method: "POST", body: form });
    setUploading(false);
    if (!res.ok) {
      toast.error((await res.json().catch(() => ({}))).error ?? "Couldn't upload that image");
      return;
    }
    const { url } = await res.json();
    setDraft({ ...draft, logoUrl: url });
    toast.success("Logo uploaded");
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-4">
        <div className="flex size-16 shrink-0 items-center justify-center rounded-full border border-line bg-well">
          {draft.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={draft.logoUrl} alt="" className="h-9 w-9 object-contain" />
          ) : (
            <span className="text-[10px] font-light text-faint">none</span>
          )}
        </div>
        <div className="flex flex-1 items-center justify-between gap-4">
          <p className="text-sm font-light text-faint">
            Found on {siteUrl} — this is what shows next to the widget&apos;s name. Pick another mark below, paste a
            URL, or upload your own.
          </p>
          <input
            ref={fileRef}
            type="file"
            accept="image/png,image/jpeg,image/webp,image/svg+xml"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])}
          />
          <Button
            type="button"
            variant="outline"
            disabled={uploading}
            onClick={() => fileRef.current?.click()}
            className="h-9 shrink-0 rounded-full px-4 text-xs text-soft"
          >
            <Upload className="size-3.5" /> {uploading ? "Uploading…" : "Upload"}
          </Button>
        </div>
      </div>

      {draft.logoCandidates.length > 1 && (
        <Field label="Other marks found on the page">
          <div className="flex flex-wrap gap-2">
            {draft.logoCandidates.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setDraft({ ...draft, logoUrl: c })}
                className={`flex size-12 items-center justify-center rounded-full border bg-well ${
                  draft.logoUrl === c ? "border-ember" : "border-line"
                }`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={c} alt="" className="h-7 w-7 object-contain" />
              </button>
            ))}
          </div>
        </Field>
      )}

      <Field label="Logo URL">
        <Input
          className="h-11"
          value={draft.logoUrl ?? ""}
          onChange={(e) => setDraft({ ...draft, logoUrl: e.target.value || null })}
          placeholder="https://example.com/logo.png"
        />
      </Field>
    </div>
  );
}

function WidgetStep({ draft, setDraft }: { draft: Draft; setDraft: (d: Draft) => void }) {
  return (
    <div className="flex flex-col gap-5">
      <Field label="Welcome message">
        <Input
          className="h-11"
          value={draft.welcomeMessage}
          onChange={(e) => setDraft({ ...draft, welcomeMessage: e.target.value })}
        />
      </Field>
      <Field label="Input placeholder">
        <Input
          className="h-11"
          value={draft.placeholder}
          onChange={(e) => setDraft({ ...draft, placeholder: e.target.value })}
        />
      </Field>
      <Field label="Suggested questions">
        <div className="flex flex-col gap-2">
          {draft.suggestedQuestions.map((q, i) => (
            <Input
              key={i}
              className="h-11"
              value={q}
              onChange={(e) => {
                const next = [...draft.suggestedQuestions];
                next[i] = e.target.value;
                setDraft({ ...draft, suggestedQuestions: next });
              }}
            />
          ))}
        </div>
      </Field>
    </div>
  );
}

function GuardrailsStep({ draft, setDraft }: { draft: Draft; setDraft: (d: Draft) => void }) {
  return (
    <div className="flex flex-col gap-5">
      <Field label="Message shown when a visitor hits the rate limit">
        <Input
          className="h-11"
          value={draft.rateLimitMessage}
          onChange={(e) => setDraft({ ...draft, rateLimitMessage: e.target.value })}
        />
      </Field>
    </div>
  );
}

function ReviewStep({ draft, onEdit }: { draft: Draft; onEdit: (step: number) => void }) {
  return (
    <div className="flex flex-col gap-3">
      <ReviewCard title="Instructions" onEdit={() => onEdit(0)}>
        <p className="text-sm font-light text-soft">{draft.tone} tone</p>
        <p className="line-clamp-3 text-sm font-light text-faint">{draft.systemPrompt}</p>
      </ReviewCard>

      <ReviewCard title="Logo" onEdit={() => onEdit(1)}>
        <div className="flex items-center gap-3">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-full border border-line bg-well">
            {draft.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={draft.logoUrl} alt="" className="h-5 w-5 object-contain" />
            ) : (
              <span className="text-[8px] text-faint">none</span>
            )}
          </div>
          <p className="truncate text-sm font-light text-faint">{draft.logoUrl ?? "No logo set"}</p>
        </div>
      </ReviewCard>

      <ReviewCard title="Widget" onEdit={() => onEdit(2)}>
        <p className="text-sm font-light text-soft">{draft.welcomeMessage}</p>
        {draft.suggestedQuestions.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {draft.suggestedQuestions.map((q, i) => (
              <span key={i} className="rounded-full border border-line px-3 py-1 text-xs font-light text-faint">
                {q}
              </span>
            ))}
          </div>
        )}
      </ReviewCard>

      <ReviewCard title="Guardrails" onEdit={() => onEdit(3)}>
        <p className="text-sm font-light text-faint">{draft.rateLimitMessage}</p>
      </ReviewCard>
    </div>
  );
}

function ReviewCard({
  title,
  onEdit,
  children,
}: {
  title: string;
  onEdit: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2 rounded-[1rem] border border-line bg-sheet p-5">
      <div className="flex items-center justify-between">
        <p className="text-xs font-normal text-soft">{title}</p>
        <button type="button" onClick={onEdit} className="text-xs font-light text-soft underline decoration-dotted">
          Edit
        </button>
      </div>
      {children}
    </div>
  );
}

// Mirrors packages/widget/src/App.tsx's open panel markup so the wizard shows exactly
// what a visitor will see — not an approximation.
function WidgetPreview({ draft }: { draft: Draft }) {
  const listRef = useRef<HTMLDivElement>(null);
  return (
    <div className="flex min-h-0 max-h-[560px] flex-1 flex-col overflow-hidden rounded-[1.5rem] border border-line bg-sheet shadow-sm">
      <div className="flex items-center gap-2 border-b border-line px-5 py-4 text-sm font-normal">
        {draft.logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={draft.logoUrl} alt="" className="size-5 rounded-full object-contain" />
        ) : (
          <span className="size-5 rounded-full bg-well" />
        )}
        Support
      </div>

      <div ref={listRef} className="flex flex-1 flex-col gap-3.5 overflow-y-auto px-5 py-4">
        <p className="text-sm font-light text-faint">{draft.welcomeMessage || "Ask me anything."}</p>
        {draft.suggestedQuestions.filter(Boolean).length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {draft.suggestedQuestions.filter(Boolean).map((q, i) => (
              <span
                key={i}
                className="rounded-full border border-line px-3 py-1.5 text-xs font-light text-soft"
              >
                {q}
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="border-t border-line p-2.5">
        <div className="rounded-full border border-edge bg-well px-4 py-2.5 text-sm font-light text-faint">
          {draft.placeholder || "Ask me anything"}
        </div>
      </div>
      <p className="pb-2.5 text-center text-[10px] font-light text-faint">Powered by momo</p>
    </div>
  );
}
