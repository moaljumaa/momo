"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { InstructionsForm } from "../instructions/InstructionsForm";
import { SourceTypeIcon, SOURCE_LABEL, type SourceKind } from "../sources/SourceTypeIcon";

type Tab = "model" | "sources" | "instructions" | "display";

const TABS: { id: Tab; label: string }[] = [
  { id: "model", label: "Model" },
  { id: "sources", label: "Data sources" },
  { id: "instructions", label: "Instructions" },
  { id: "display", label: "Display" },
];

export function ConfigPanel() {
  const [tab, setTab] = useState<Tab>("instructions");

  return (
    <div className="flex h-full flex-col">
      <div className="flex shrink-0 gap-1 border-b border-line px-6 pt-6 pb-4">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`rounded-full px-3 py-1.5 text-sm font-light transition-colors hover:bg-hover ${
              tab === t.id ? "bg-hover font-normal text-ember" : "text-soft"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        {tab === "model" && <ModelTab />}
        {tab === "sources" && <SourcesTab />}
        {tab === "instructions" && <InstructionsForm />}
        {tab === "display" && <DisplayTab />}
      </div>
    </div>
  );
}

function ModelTab() {
  return (
    <div className="flex flex-col gap-2">
      <div className="text-sm font-normal">Model</div>
      <p className="text-xs font-light text-faint">
        Model selection (OpenRouter) is being wired up — coming shortly.
      </p>
    </div>
  );
}

function DisplayTab() {
  return (
    <div className="flex flex-col gap-2">
      <div className="text-sm font-normal">Display</div>
      <p className="text-xs font-light text-faint">Branding and widget appearance — coming next.</p>
    </div>
  );
}

type Source = {
  id: string;
  type: SourceKind;
  title: string;
  status: "PENDING" | "PROCESSING" | "READY" | "FAILED";
  _count: { chunks: number };
};

const statusDot: Record<Source["status"], string> = {
  PENDING: "bg-faint",
  PROCESSING: "bg-wheat",
  READY: "bg-sky",
  FAILED: "bg-clay",
};

function SourcesTab() {
  const [sources, setSources] = useState<Source[] | null>(null);

  useEffect(() => {
    fetch("/api/sources")
      .then((r) => r.json())
      .then((d) => setSources(d.sources));
  }, []);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div className="text-sm font-normal">Data sources</div>
        <Link href="/sources" className="text-xs font-light text-faint underline decoration-dotted">
          Manage
        </Link>
      </div>

      {sources?.length === 0 && (
        <p className="text-xs font-light text-faint">
          No sources yet. Add one from the{" "}
          <Link href="/sources" className="underline decoration-dotted">
            Data sources
          </Link>{" "}
          page.
        </p>
      )}

      <div className="flex flex-col gap-2">
        {sources?.map((s) => (
          <Link
            key={s.id}
            href="/sources"
            className="flex items-center gap-3 rounded-[1rem] border border-line px-4 py-3 transition-colors hover:bg-hover"
          >
            <SourceTypeIcon type={s.type} />
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-normal">{s.title}</div>
              <div className="text-xs font-light text-faint">{SOURCE_LABEL[s.type]}</div>
            </div>
            <span className={`size-1.5 shrink-0 rounded-full ${statusDot[s.status]}`} />
          </Link>
        ))}
      </div>
    </div>
  );
}
