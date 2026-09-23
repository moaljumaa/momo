"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ChannelIcon, CHANNEL_LABEL, type ChannelKind } from "./ChannelIcon";
import { DeployButton } from "./DeployButton";
import { useSettingsModal } from "@/components/settings-modal-provider";

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

export function ChannelsPanel() {
  const { close } = useSettingsModal();
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
    <>
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-normal">Channels</h2>
        <div className="flex items-center gap-3">
          {saving && <span className="text-xs font-light text-faint">Saving…</span>}
          {!saving && saved && <span className="text-xs font-light text-faint">Saved</span>}
        </div>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-4">
        {CHANNELS.map(({ kind, available }) => (
          <div
            key={kind}
            className="flex flex-col gap-4 rounded-[1.25rem] border border-line bg-well p-5"
          >
            <div className="flex items-center justify-between">
              <ChannelIcon kind={kind} />
              {available && kind === "website-widget" && (
                <Switch
                  checked={settings.widgetEnabled}
                  onCheckedChange={(v) => save({ widgetEnabled: v as boolean })}
                />
              )}
            </div>
            <div>
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
              <div className="mt-auto flex flex-wrap items-center gap-2 pt-2">
                <Button
                  variant="outline"
                  onClick={() => setDomainsOpen(true)}
                  className="rounded-full border-line bg-transparent px-3 text-xs text-ink hover:bg-hover"
                >
                  Domains
                </Button>
                <Button
                  variant="outline"
                  onClick={close}
                  className="rounded-full border-line bg-transparent px-3 text-xs text-ink hover:bg-hover"
                >
                  Configure
                </Button>
                <DeployButton />
              </div>
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
    </>
  );
}
