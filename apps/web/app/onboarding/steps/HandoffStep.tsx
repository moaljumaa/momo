"use client";

import { HandoffPanel } from "@/app/(app)/handoff/HandoffPanel";
import { Button } from "@/components/ui/button";

export function HandoffStep({ onNext }: { onNext: () => void }) {
  return (
    <div className="flex flex-col gap-8">
      <HandoffPanel />
      <Button onClick={onNext} className="h-11 self-start rounded-full px-6">
        Finish setup
      </Button>
    </div>
  );
}
