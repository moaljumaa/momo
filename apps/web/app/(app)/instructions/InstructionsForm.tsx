"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";

type Settings = {
  name: string;
  systemPrompt: string;
  tone: string;
  threshold: number;
};

// Shared between the standalone /instructions page and the Playground's Instructions tab —
// same fields, same save behavior, so editing in either place stays in sync.
export function InstructionsForm() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((d) => setSettings(d.settings));
  }, []);

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
      <Field label="Business name">
        <Input value={settings.name} onChange={(e) => setSettings({ ...settings, name: e.target.value })} />
      </Field>

      <Field label="System prompt">
        <Textarea
          className="min-h-72 resize-none"
          placeholder="Business context, role, language, formatting, guardrails…"
          value={settings.systemPrompt}
          onChange={(e) => setSettings({ ...settings, systemPrompt: e.target.value })}
        />
      </Field>

      <Field label="Tone">
        <Select value={settings.tone} onValueChange={(v) => setSettings({ ...settings, tone: v as string })}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="friendly">Friendly</SelectItem>
            <SelectItem value="formal">Formal</SelectItem>
            <SelectItem value="concise">Concise</SelectItem>
          </SelectContent>
        </Select>
      </Field>

      <Field label={`Confidence threshold — answers below ${Math.round(settings.threshold * 100)}% are passed to the team`}>
        <Slider
          min={0}
          max={1}
          step={0.05}
          value={[settings.threshold]}
          onValueChange={(v) => setSettings({ ...settings, threshold: (v as number[])[0] })}
          className="py-2"
        />
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
