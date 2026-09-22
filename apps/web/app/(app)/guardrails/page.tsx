"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Settings = {
  rateLimitCount: number;
  rateLimitWindowSec: number;
  rateLimitMessage: string;
};

export default function Guardrails() {
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
    <div className="mx-auto max-w-2xl p-8">
      <h1 className="mb-6 text-2xl font-light">Guardrails</h1>

      <div className="flex flex-col gap-6 rounded-[1.25rem] border border-line bg-sheet p-6">
        <div>
          <div className="mb-1 text-sm font-normal">Rate limit</div>
          <p className="mb-4 text-xs font-light text-faint">
            Limit how many messages a visitor can send before the bot goes quiet for the rest of the window.
          </p>
          <div className="flex items-center gap-2 text-sm font-light">
            Limit to
            <Input
              type="number"
              min={1}
              className="w-24 text-center"
              value={settings.rateLimitCount}
              onChange={(e) => setSettings({ ...settings, rateLimitCount: Number(e.target.value) })}
            />
            messages every
            <Input
              type="number"
              min={1}
              className="w-24 text-center"
              value={settings.rateLimitWindowSec}
              onChange={(e) => setSettings({ ...settings, rateLimitWindowSec: Number(e.target.value) })}
            />
            seconds.
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <div className="text-xs font-normal text-soft">Message to show when the limit is hit</div>
          <Input
            value={settings.rateLimitMessage}
            onChange={(e) => setSettings({ ...settings, rateLimitMessage: e.target.value })}
          />
        </div>
      </div>

      <div className="mt-6 flex items-center gap-3">
        <Button onClick={save} disabled={saving} className="rounded-full px-5">
          {saving ? "Saving…" : "Save"}
        </Button>
        {saved && <span className="text-xs font-light text-faint">Saved</span>}
      </div>
    </div>
  );
}
