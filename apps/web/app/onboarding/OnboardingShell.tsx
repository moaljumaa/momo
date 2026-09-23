"use client";

import { STEPS, type StepKey } from "./steps";

// Two-column pairing (well = darker/recessed, sheet-toned main = lighter), the same pattern
// docs/design.md calls out for the settings modal's nav-vs-content split — left column
// educates, right column is the actual step. Not used for the "website" step, which mounts
// AddWebsiteFlow's own full-screen overlay directly.
export function OnboardingShell({
  current,
  reached,
  onSelect,
  children,
}: {
  current: StepKey;
  reached: number;
  onSelect: (key: StepKey) => void;
  children: React.ReactNode;
}) {
  const meta = STEPS.find((s) => s.key === current)!;
  const index = STEPS.findIndex((s) => s.key === current);

  return (
    <div className="flex min-h-screen">
      <aside className="flex w-[360px] shrink-0 flex-col bg-well px-10 py-10">
        <div>
          <div className="text-sm font-normal text-ink">momo</div>
          <ol className="mt-6 flex flex-col">
            {STEPS.map((s, i) => {
              const done = i < index;
              const active = i === index;
              const clickable = !active && i <= reached;
              return (
                <li key={s.key}>
                  <button
                    type="button"
                    disabled={!clickable}
                    onClick={() => onSelect(s.key)}
                    className={`flex w-full items-center gap-3 py-1 text-left ${clickable ? "cursor-pointer hover:opacity-80" : "cursor-default"}`}
                  >
                  <span
                    className={`flex size-5 shrink-0 items-center justify-center rounded-full border text-[10px] font-normal transition-colors ${
                      active
                        ? "border-ember bg-ember text-sheet"
                        : done
                          ? "border-ember/40 bg-transparent text-ember"
                          : "border-line bg-transparent text-faint"
                    }`}
                  >
                    {done ? "✓" : i + 1}
                  </span>
                  <span className={`text-sm font-light ${active ? "text-ink font-normal" : done ? "text-soft" : "text-faint"}`}>
                    {s.label}
                  </span>
                  </button>
                </li>
              );
            })}
          </ol>
        </div>

        <div className="mt-8 border-t border-line pt-8">
          <p className="text-xs font-light text-faint">{meta.eyebrow}</p>
          <h1 className="mt-2 text-xl font-light text-ink">{meta.title}</h1>
          <p className="mt-3 text-sm font-light text-soft">{meta.body}</p>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto bg-background">
        <div className="mx-auto flex min-h-screen w-full max-w-xl flex-col justify-center px-8 py-16">{children}</div>
      </main>
    </div>
  );
}
