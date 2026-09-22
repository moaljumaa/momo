"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ChannelIcon, CHANNEL_LABEL, type ChannelKind } from "./ChannelIcon";
import { DeployButton } from "./DeployButton";

type Settings = {
  name: string;
  welcomeMessage: string;
  placeholder: string;
  suggestedQuestions: string[];
  widgetEnabled: boolean;
  widgetAllowedDomains: string[];
};

const CHANNELS: { kind: ChannelKind; available: boolean }[] = [
  { kind: "website-widget", available: true },
  { kind: "help-page", available: false },
];

export default function ChannelsPage() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [domainsOpen, setDomainsOpen] = useState(false);
  const [domainsText, setDomainsText] = useState("");

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((d: { settings: Settings }) => {
        setSettings(d.settings);
        setDomainsText((d.settings.widgetAllowedDomains ?? []).join("\n"));
      });
  }, []);

  async function save(next: Partial<Settings>) {
    if (!settings) return;
    const merged = { ...settings, ...next };
    setSettings(merged);
    setSaving(true);
    setSaved(false);
    await fetch("/api/settings", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(next),
    });
    setSaving(false);
    setSaved(true);
  }

  function saveDomains() {
    const domains = domainsText
      .split("\n")
      .map((d) => d.trim())
      .filter(Boolean);
    save({ widgetAllowedDomains: domains });
  }

  if (!settings) return null;

  return (
    <div className="flex h-screen flex-col overflow-hidden p-8">
      <div className="mx-auto flex w-full max-w-3xl shrink-0 items-center justify-between">
        <h1 className="text-2xl font-light">Channels</h1>
        <div className="flex items-center gap-3">
          {saving && <span className="text-xs font-light text-faint">Saving…</span>}
          {!saving && saved && <span className="text-xs font-light text-faint">Saved</span>}
        </div>
      </div>

      <div className="mx-auto mt-8 flex w-full max-w-3xl flex-col gap-3 overflow-y-auto">
        {CHANNELS.map(({ kind, available }) => (
          <div
            key={kind}
            className="flex items-center gap-4 rounded-[1.25rem] border border-line px-5 py-4"
          >
            <ChannelIcon kind={kind} />
            <div className="flex-1">
              <div className="text-sm font-normal">{CHANNEL_LABEL[kind]}</div>
              <div className="text-xs font-light text-faint">
                {!available
                  ? "Coming soon"
                  : settings.widgetEnabled
                    ? "Enabled"
                    : "Disabled"}
              </div>
            </div>

            {available && kind === "website-widget" && (
              <>
                <Switch
                  checked={settings.widgetEnabled}
                  onCheckedChange={(v) => save({ widgetEnabled: v as boolean })}
                />
                <Button variant="outline" onClick={() => setDomainsOpen(true)} className="rounded-full px-4">
                  Domains
                </Button>
                <Button variant="outline" className="rounded-full px-4" render={<Link href="/playground" />}>
                  Configure
                </Button>
                <DeployButton />
              </>
            )}
          </div>
        ))}
      </div>

      <Dialog open={domainsOpen} onOpenChange={setDomainsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Allowed domains</DialogTitle>
            <DialogDescription>
              One per line. Use *.example.com for subdomains. Leave empty to allow any site.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            className="min-h-28 resize-none font-mono text-xs"
            placeholder={"https://example.com\nhttps://*.example.com"}
            value={domainsText}
            onChange={(e) => setDomainsText(e.target.value)}
            onBlur={saveDomains}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
