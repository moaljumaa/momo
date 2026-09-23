"use client";

import { useEffect, useState } from "react";
import { SourcesPanel } from "@/app/(app)/sources/SourcesPanel";
import { Button } from "@/components/ui/button";

// Reuses the same panel as Settings → Data sources as-is. This step only adds the guard:
// without at least one source the bot has nothing to answer from, so Continue stays locked
// and the user can step back to the website flow (which remounts fresh, no shared state).
export function MoreSourcesStep({ onNext, onBack }: { onNext: () => void; onBack: () => void }) {
  const [count, setCount] = useState<number | null>(null);

  useEffect(() => {
    const load = () =>
      fetch("/api/sources")
        .then((r) => r.json())
        .then((d) => setCount(d.sources.length));
    load();
    const interval = setInterval(load, 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex flex-col gap-8">
      {count === 0 && (
        <div className="rounded-[1.25rem] border border-clay/40 bg-clay/10 px-5 py-4">
          <p className="text-sm font-normal text-clay">Your bot has no context yet</p>
          <p className="mt-1 text-xs font-light text-soft">
            Without at least one source it knows nothing about your product and can&apos;t answer anyone. Go back to
            add your website, or add a file, text or Q&amp;A below.
          </p>
        </div>
      )}

      <SourcesPanel />

      <div className="flex gap-3">
        <Button onClick={onNext} disabled={!count} className="h-11 rounded-full px-6">
          Continue
        </Button>
        <Button variant="ghost" onClick={onBack} className="h-11 text-soft">
          Back
        </Button>
      </div>
    </div>
  );
}
