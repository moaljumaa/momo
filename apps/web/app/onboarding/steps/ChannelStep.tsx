"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";

export function ChannelStep({ onNext }: { onNext: () => void }) {
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [domainsText, setDomainsText] = useState("");

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((d) => {
        setEnabled(d.settings.widgetEnabled);
        setDomainsText((d.settings.widgetAllowedDomains ?? []).join("\n"));
      });
  }, []);

  async function toggle(v: boolean) {
    setEnabled(v);
    await fetch("/api/settings", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ widgetEnabled: v }),
    });
  }

  async function saveDomains() {
    const domains = domainsText.split("\n").map((d) => d.trim()).filter(Boolean);
    await fetch("/api/settings", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ widgetAllowedDomains: domains }),
    });
  }

  if (enabled === null) return null;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between rounded-[1.25rem] border border-line bg-well px-5 py-4">
        <div>
          <div className="text-sm font-normal">Website widget</div>
          <div className="text-xs font-light text-faint">{enabled ? "Enabled" : "Disabled"}</div>
        </div>
        <Switch checked={enabled} onCheckedChange={(v) => toggle(v as boolean)} />
      </div>

      <div>
        <label className="mb-1 block text-sm font-normal">Allowed domains</label>
        <p className="mb-2 text-xs font-light text-faint">
          Only pages on these domains can load and use the widget — anyone copying your snippet onto another site
          gets nothing, so nobody else can spend your API credits. One per line, e.g. https://example.com or
          https://*.example.com. Leave empty to allow any site (fine while testing).
        </p>
        <Textarea
          className="min-h-24 resize-none rounded-[1rem] font-mono text-xs"
          placeholder={"https://example.com"}
          value={domainsText}
          onChange={(e) => setDomainsText(e.target.value)}
          onBlur={saveDomains}
        />
      </div>

      <Button onClick={onNext} disabled={!enabled} className="h-11 self-start rounded-full px-6">
        Continue
      </Button>
      {!enabled && <p className="text-xs font-light text-faint">Turn the widget on to continue — that's the point of this setup.</p>}
    </div>
  );
}
