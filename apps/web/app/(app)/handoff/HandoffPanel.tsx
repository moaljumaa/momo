"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, X } from "lucide-react";

type HandoffField = { id: string; key: string; label: string; required: boolean; order: number };

export function HandoffPanel() {
  const [fields, setFields] = useState<HandoffField[] | null>(null);
  const [label, setLabel] = useState("");
  const [saving, setSaving] = useState(false);

  function load() {
    fetch("/api/handoff-fields")
      .then((r) => r.json())
      .then((d) => setFields(d.fields));
  }

  useEffect(load, []);

  async function add() {
    if (!label.trim()) return;
    setSaving(true);
    await fetch("/api/handoff-fields", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ key: label.trim(), label: label.trim() }),
    });
    setSaving(false);
    setLabel("");
    load();
  }

  async function toggleRequired(field: HandoffField) {
    setFields((fs) => fs?.map((f) => (f.id === field.id ? { ...f, required: !f.required } : f)) ?? null);
    await fetch(`/api/handoff-fields/${field.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ required: !field.required }),
    });
  }

  async function remove(id: string) {
    setFields((fs) => fs?.filter((f) => f.id !== id) ?? null);
    await fetch(`/api/handoff-fields/${id}`, { method: "DELETE" });
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-lg font-normal">Handoff</h2>
        <p className="mt-1 text-xs font-light text-faint">
          When the AI can&apos;t answer, it asks for these fields — one at a time — before handing the
          conversation to a human agent.
        </p>
      </div>

      <div className="flex flex-col gap-2">
        {fields?.length === 0 && (
          <p className="text-xs font-light text-faint">
            No fields configured — the AI will hand off immediately with no questions asked.
          </p>
        )}
        {fields?.map((f) => (
          <div key={f.id} className="flex items-center gap-3 rounded-[1rem] border border-line px-4 py-3">
            <div className="min-w-0 flex-1 truncate text-sm font-normal">{f.label}</div>
            <button
              onClick={() => toggleRequired(f)}
              className={`rounded-full border px-2.5 py-1 text-xs font-light transition-colors ${
                f.required ? "border-accent-orange-line bg-accent-orange text-ink" : "border-line text-faint hover:bg-hover"
              }`}
            >
              {f.required ? "Required" : "Optional"}
            </button>
            <button onClick={() => remove(f.id)} className="text-faint hover:text-ink">
              <X className="size-4" />
            </button>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-2">
        <Input
          placeholder="Field name, e.g. Email address"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && add()}
        />
        <Button onClick={add} disabled={saving} className="shrink-0 gap-1.5 rounded-full px-4">
          <Plus className="size-4" />
          Add
        </Button>
      </div>
    </div>
  );
}
