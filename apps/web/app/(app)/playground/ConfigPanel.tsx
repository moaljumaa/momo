"use client";

import { useEffect, useRef, useState } from "react";
import { InstructionsForm } from "../instructions/InstructionsForm";
import { SourceTypeIcon, SOURCE_LABEL, type SourceKind } from "../sources/SourceTypeIcon";
import { useSettingsModal } from "@/components/settings-modal-provider";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { X, Plus, ChevronDown } from "lucide-react";
import { PLACEHOLDER_MAX } from "./constants";

type Tab = "overview" | "instructions" | "display";

const TABS: { id: Tab; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "instructions", label: "Instructions" },
  { id: "display", label: "Display" },
];

export type DisplaySettings = {
  welcomeMessage: string;
  placeholder: string;
  suggestedQuestions: string[];
  logoUrl: string | null;
  widgetColor: string | null;
  widgetPosition: "center" | "corner";
};

export function ConfigPanel({
  onDisplayChange,
  expanded,
  onExpandedChange,
}: {
  onDisplayChange?: (patch: Partial<DisplaySettings>) => void;
  expanded: boolean;
  onExpandedChange: (expanded: boolean) => void;
}) {
  const [tab, setTab] = useState<Tab>("instructions");

  return (
    <div className="flex h-full flex-col">
      <div className="flex shrink-0 gap-1 border-b border-line px-6 pt-6 pb-4">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`rounded-full px-3 py-1.5 text-sm font-light transition-colors hover:bg-hover ${
              tab === t.id ? "bg-hover font-normal text-ember" : "text-soft"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        {tab === "overview" && <OverviewTab />}
        {tab === "instructions" && <InstructionsForm />}
        {tab === "display" && (
          <DisplayTab onChange={onDisplayChange} expanded={expanded} onExpandedChange={onExpandedChange} />
        )}
      </div>
    </div>
  );
}

function OverviewTab() {
  return (
    <div className="flex flex-col gap-8">
      <ModelPicker />
      <SourcesTab />
    </div>
  );
}

type OpenRouterModel = {
  id: string;
  name: string;
  contextLength: number;
  promptPrice: number;
  completionPrice: number;
};

// Closed: a single trigger showing the currently selected model (or nothing picked yet).
// Click it to open a searchable list; picking a model saves immediately and closes it —
// the full catalog never sits open in the sidebar by default.
function ModelPicker() {
  const [models, setModels] = useState<OpenRouterModel[] | null>(null);
  const [current, setCurrent] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [saving, setSaving] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/openrouter/models")
      .then((r) => r.json())
      .then((d) => setModels(d.models ?? []));
    fetch("/api/settings")
      .then((r) => r.json())
      .then((d) => setCurrent(d.settings.model));
  }, []);

  useEffect(() => {
    function onPointerDown(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, []);

  async function pick(id: string) {
    setCurrent(id);
    setOpen(false);
    setQuery("");
    setSaving(true);
    await fetch("/api/settings", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ model: id }),
    });
    setSaving(false);
  }

  const selected = models?.find((m) => m.id === current);
  const filtered = models?.filter(
    (m) => m.name.toLowerCase().includes(query.toLowerCase()) || m.id.toLowerCase().includes(query.toLowerCase()),
  );

  return (
    <div ref={rootRef} className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <div className="text-sm font-normal">Model</div>
        {saving && <span className="text-xs font-light text-faint">Saving…</span>}
      </div>

      <div className="relative">
        <button
          onClick={() => setOpen((o) => !o)}
          className="flex w-full items-center justify-between gap-2 rounded-full border border-edge bg-well px-4 py-2 text-left text-sm font-light transition-colors hover:bg-hover"
        >
          <span className="truncate">{selected ? selected.name : (current ?? "Select a model…")}</span>
          <ChevronDown className={`size-4 shrink-0 text-faint transition-transform ${open ? "rotate-180" : ""}`} />
        </button>

        {open && (
          <div className="absolute z-20 mt-1 w-full overflow-hidden rounded-[1rem] border border-line bg-sheet shadow-lg">
            <div className="border-b border-line p-2">
              <Input
                autoFocus
                placeholder="Search models…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
            <div className="max-h-64 overflow-y-auto p-1">
              {filtered?.map((m) => (
                <button
                  key={m.id}
                  onClick={() => pick(m.id)}
                  className={`flex w-full flex-col gap-0.5 rounded-[0.65rem] px-3 py-2 text-left transition-colors hover:bg-hover ${
                    m.id === current ? "bg-hover" : ""
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate text-sm font-normal">{m.name}</span>
                    {m.id === current && <span className="size-1.5 shrink-0 rounded-full bg-sky-deep" />}
                  </div>
                  <span className="truncate text-xs font-light text-faint">{m.id}</span>
                </button>
              ))}
              {filtered?.length === 0 && <p className="p-3 text-xs font-light text-faint">No models match “{query}”.</p>}
              {!models && <p className="p-3 text-xs font-light text-faint">Loading models…</p>}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

type FullSettings = DisplaySettings & { faviconUrl: string | null };

function DisplayTab({
  onChange,
  expanded,
  onExpandedChange,
}: {
  onChange?: (patch: Partial<DisplaySettings>) => void;
  expanded: boolean;
  onExpandedChange: (expanded: boolean) => void;
}) {
  const [settings, setSettings] = useState<FullSettings | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [question, setQuestion] = useState("");

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((d) =>
        setSettings({
          welcomeMessage: d.settings.welcomeMessage,
          placeholder: d.settings.placeholder,
          suggestedQuestions: d.settings.suggestedQuestions ?? [],
          logoUrl: d.settings.logoUrl,
          faviconUrl: d.settings.faviconUrl,
          widgetColor: d.settings.widgetColor,
          widgetPosition: d.settings.widgetPosition ?? "center",
        }),
      );
  }, []);

  function update(patch: Partial<FullSettings>) {
    setSettings((s) => (s ? { ...s, ...patch } : s));
    onChange?.(patch);
  }

  async function save() {
    if (!settings) return;
    setSaving(true);
    setSaved(false);
    await fetch("/api/settings", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(settings),
    });
    setSaving(false);
    setSaved(true);
  }

  if (!settings) return null;

  return (
    <div className="flex flex-col gap-8">
      <Field label="Widget position">
        <div className="flex gap-1 rounded-full border border-edge bg-well p-1">
          {(["center", "corner"] as const).map((p) => (
            <button
              key={p}
              onClick={() => update({ widgetPosition: p })}
              className={`flex-1 rounded-full px-3 py-1.5 text-sm font-light capitalize transition-colors ${
                settings.widgetPosition === p ? "bg-hover font-normal text-ember" : "text-soft hover:text-ink"
              }`}
            >
              {p}
            </button>
          ))}
        </div>
        <p className="text-xs font-light text-faint">
          {settings.widgetPosition === "center"
            ? "A quiet bottom pill that expands into a full-screen conversation."
            : "A classic bottom-right chat bubble that opens an anchored panel."}
        </p>

        <div className="mt-1 flex gap-1 rounded-full border border-edge bg-well p-1">
          {(["collapsed", "expanded"] as const).map((s) => (
            <button
              key={s}
              onClick={() => onExpandedChange(s === "expanded")}
              className={`flex-1 rounded-full px-3 py-1.5 text-xs font-light capitalize transition-colors ${
                expanded === (s === "expanded") ? "bg-hover font-normal text-ember" : "text-soft hover:text-ink"
              }`}
            >
              {s} preview
            </button>
          ))}
        </div>
      </Field>

      <Field label="Welcome message">
        <Input value={settings.welcomeMessage} onChange={(e) => update({ welcomeMessage: e.target.value })} />
      </Field>

      <Field label="Input placeholder">
        <Input
          value={settings.placeholder}
          maxLength={PLACEHOLDER_MAX}
          onChange={(e) => update({ placeholder: e.target.value.slice(0, PLACEHOLDER_MAX) })}
        />
        <p className="text-right text-xs font-light text-faint">
          {settings.placeholder.length}/{PLACEHOLDER_MAX}
        </p>
      </Field>

      <Field label="Suggested questions">
        <div className="flex flex-col gap-2">
          {settings.suggestedQuestions.map((q, i) => (
            <div key={i} className="flex items-center gap-2">
              <Input
                value={q}
                onChange={(e) => {
                  const next = [...settings.suggestedQuestions];
                  next[i] = e.target.value;
                  update({ suggestedQuestions: next });
                }}
              />
              <button
                onClick={() => update({ suggestedQuestions: settings.suggestedQuestions.filter((_, j) => j !== i) })}
                className="shrink-0 rounded-full p-1.5 text-faint transition-colors hover:bg-hover hover:text-ink"
              >
                <X className="size-3.5" />
              </button>
            </div>
          ))}
          <div className="flex items-center gap-2">
            <Input
              placeholder="Add a suggested question…"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && question.trim()) {
                  e.preventDefault();
                  update({ suggestedQuestions: [...settings.suggestedQuestions, question.trim()] });
                  setQuestion("");
                }
              }}
            />
            <button
              onClick={() => {
                if (!question.trim()) return;
                update({ suggestedQuestions: [...settings.suggestedQuestions, question.trim()] });
                setQuestion("");
              }}
              className="shrink-0 rounded-full p-1.5 text-faint transition-colors hover:bg-hover hover:text-ink"
            >
              <Plus className="size-3.5" />
            </button>
          </div>
        </div>
      </Field>

      <Field label="Logo URL">
        <Input
          placeholder="https://…"
          value={settings.logoUrl ?? ""}
          onChange={(e) => update({ logoUrl: e.target.value || null })}
        />
      </Field>

      <Field label="Favicon URL">
        <Input
          placeholder="https://…"
          value={settings.faviconUrl ?? ""}
          onChange={(e) => update({ faviconUrl: e.target.value || null })}
        />
      </Field>

      <Field label="Accent color">
        <div className="flex items-center gap-2">
          <input
            type="color"
            value={settings.widgetColor ?? "#3b82f6"}
            onChange={(e) => update({ widgetColor: e.target.value })}
            className="size-9 shrink-0 cursor-pointer rounded-full border border-edge bg-transparent p-0"
          />
          <Input
            placeholder="#3b82f6"
            value={settings.widgetColor ?? ""}
            onChange={(e) => update({ widgetColor: e.target.value || null })}
          />
        </div>
      </Field>

      <div className="flex items-center gap-3">
        <Button onClick={save} disabled={saving} className="rounded-full px-5">
          {saving ? "Saving…" : "Save changes"}
        </Button>
        {saved && <span className="text-xs font-light text-faint">Saved</span>}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <div className="text-sm font-normal">{label}</div>
      {children}
    </div>
  );
}

type Source = {
  id: string;
  type: SourceKind;
  title: string;
  status: "PENDING" | "PROCESSING" | "READY" | "FAILED";
  _count: { chunks: number };
};

const statusDot: Record<Source["status"], string> = {
  PENDING: "bg-faint",
  PROCESSING: "bg-wheat",
  READY: "bg-sky",
  FAILED: "bg-clay",
};

function SourcesTab() {
  const [sources, setSources] = useState<Source[] | null>(null);
  const { open } = useSettingsModal();

  useEffect(() => {
    fetch("/api/sources")
      .then((r) => r.json())
      .then((d) => setSources(d.sources));
  }, []);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div className="text-sm font-normal">Data sources</div>
        <button onClick={() => open("sources")} className="text-xs font-light text-faint underline decoration-dotted">
          Manage
        </button>
      </div>

      {sources?.length === 0 && (
        <p className="text-xs font-light text-faint">
          No sources yet. Add one from{" "}
          <button onClick={() => open("sources")} className="underline decoration-dotted">
            Data sources
          </button>
          .
        </p>
      )}

      <div className="flex flex-col gap-2">
        {sources?.map((s) => (
          <button
            key={s.id}
            onClick={() => open("sources")}
            className="flex items-center gap-3 rounded-[1rem] border border-line px-4 py-3 text-left transition-colors hover:bg-hover"
          >
            <SourceTypeIcon type={s.type} />
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-normal">{s.title}</div>
              <div className="text-xs font-light text-faint">{SOURCE_LABEL[s.type]}</div>
            </div>
            <span className={`size-1.5 shrink-0 rounded-full ${statusDot[s.status]}`} />
          </button>
        ))}
      </div>
    </div>
  );
}
