"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Rocket } from "lucide-react";

// Shared between the Channels page and the Playground — same embed snippet, same
// enable-if-needed flow, so it stays in sync no matter where the user grabs the code from.
export function DeployButton() {
  const [widgetEnabled, setWidgetEnabled] = useState<boolean | null>(null);
  const [open, setOpen] = useState(false);
  const [origin, setOrigin] = useState("");

  useEffect(() => {
    setOrigin(window.location.origin);
    fetch("/api/settings")
      .then((r) => r.json())
      .then((d) => setWidgetEnabled(d.settings.widgetEnabled));
  }, []);

  async function enableWidget() {
    await fetch("/api/settings", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ widgetEnabled: true }),
    });
    setWidgetEnabled(true);
  }

  const embedSnippet = `<script src="${origin}/widget.js" data-api-base="${origin}"></script>`;

  return (
    <>
      <Button onClick={() => setOpen(true)} className="gap-1.5 rounded-full px-4">
        <Rocket className="size-4" />
        Deploy
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Deploy website widget</DialogTitle>
            <DialogDescription>Embed a floating chat widget on any website.</DialogDescription>
          </DialogHeader>

          {!widgetEnabled ? (
            <div className="flex flex-col items-center gap-4 py-10 text-center">
              <p className="text-sm font-light text-soft">
                The widget is turned off. Enable it to get your embed code.
              </p>
              <Button onClick={enableWidget} className="rounded-full px-5">
                Enable website widget
              </Button>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              <div className="text-xs font-normal text-soft">
                Paste this code before the closing <code>&lt;/body&gt;</code> tag on your site.
              </div>
              <pre className="overflow-x-auto rounded-[1rem] border border-edge bg-well p-4 text-xs font-light">
                <code>{embedSnippet}</code>
              </pre>
              <Button
                variant="outline"
                onClick={() => navigator.clipboard.writeText(embedSnippet)}
                className="self-start rounded-full px-4"
              >
                Copy
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
