// One continuous progress rail for the whole add-website journey (discovery through
// approve), so the user always sees where they are and what's left — not four
// unrelated screens that each reset their own tiny step label.
export function Stepper({ steps, current }: { steps: string[]; current: number }) {
  return (
    <ol className="mb-10 flex items-start">
      {steps.map((s, i) => {
        const done = i < current;
        const active = i === current;
        return (
          <li key={s} className="flex flex-1 items-center last:flex-none">
            <div className="flex flex-col items-center gap-2">
              <div
                className={`flex size-8 items-center justify-center rounded-full border text-xs font-normal transition-colors ${
                  active
                    ? "border-ember bg-ember text-sheet"
                    : done
                      ? "border-ember/40 bg-transparent text-ember"
                      : "border-line bg-well text-faint"
                }`}
              >
                {done ? <CheckIcon /> : i + 1}
              </div>
              <span
                className={`text-xs font-light whitespace-nowrap ${active ? "text-ink font-normal" : done ? "text-soft" : "text-faint"}`}
              >
                {s}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div className={`mx-3 h-px flex-1 ${done ? "bg-ember/40" : "bg-line"}`} style={{ marginTop: -20 }} />
            )}
          </li>
        );
      })}
    </ol>
  );
}

function CheckIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}
