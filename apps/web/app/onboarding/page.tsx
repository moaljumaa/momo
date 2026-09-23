"use client";

import { useState } from "react";
import { AddWebsiteFlow } from "@/app/(app)/sources/AddWebsiteFlow";
import { ConfirmDialog } from "@/app/(app)/sources/ConfirmDialog";
import { OnboardingShell } from "./OnboardingShell";
import { STEPS, type StepKey } from "./steps";
import { ApiKeyStep } from "./steps/ApiKeyStep";
import { MoreSourcesStep } from "./steps/MoreSourcesStep";
import { ChannelStep } from "./steps/ChannelStep";
import { HandoffStep } from "./steps/HandoffStep";
import { DoneStep } from "./steps/DoneStep";

export default function OnboardingPage() {
  const [step, setStep] = useState<StepKey>("key");
  const [confirmSkip, setConfirmSkip] = useState(false);

  const [reached, setReached] = useState(0);

  function goTo(key: StepKey) {
    setStep(key);
    setReached((r) => Math.max(r, STEPS.findIndex((s) => s.key === key)));
  }

  function go(offset: number) {
    const i = STEPS.findIndex((s) => s.key === step);
    goTo(STEPS[i + offset].key);
  }

  // AddWebsiteFlow renders its own full-screen overlay (with its own progress rail), so it
  // mounts outside the two-column shell rather than inside its right-hand content slot.
  if (step === "website") {
    return (
      <>
        <AddWebsiteFlow onDone={() => go(1)} onCancel={() => setConfirmSkip(true)} />
        <ConfirmDialog
          open={confirmSkip}
          onOpenChange={setConfirmSkip}
          title="Skip adding your website?"
          description="Your bot won't know anything about your product, so it can't answer questions until you add some context — a website, files, text or Q&A. You can still add it in the next step."
          confirmLabel="Skip for now"
          destructive
          onConfirm={() => {
            setConfirmSkip(false);
            go(1);
          }}
        />
      </>
    );
  }

  return (
    <OnboardingShell current={step} reached={reached} onSelect={goTo}>
      {step === "key" && <ApiKeyStep onNext={() => go(1)} />}
      {step === "more" && <MoreSourcesStep onNext={() => go(1)} onBack={() => go(-1)} />}
      {step === "channel" && <ChannelStep onNext={() => go(1)} />}
      {step === "handoff" && <HandoffStep onNext={() => go(1)} />}
      {step === "done" && <DoneStep />}
    </OnboardingShell>
  );
}
