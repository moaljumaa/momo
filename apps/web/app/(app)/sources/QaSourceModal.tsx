"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { CircleHelp, Plus, X } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MarkdownField } from "./MarkdownField";
import { formatQa, parseQa } from "./qaFormat";

const EMPTY = { title: "", questions: [""], answer: "" };

export function QaSourceModal({
  open,
  onOpenChange,
  onDone,
  editing,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDone: () => void;
  // Present when reopening a saved Q&A source to edit, instead of creating a new one.
  editing?: { id: string; title: string; content: string } | null;
}) {
  const initial = () => (editing ? { title: editing.title, ...parseQa(editing.content) } : EMPTY);
  const [draft, setDraft] = useState(EMPTY);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) setDraft(initial());
    // `editing` is a new object literal on every parent render (page.tsx recreates it from
    // the polled source list), so depending on it directly would reset the draft — wiping
    // whatever the user just typed — every time that background poll ticks. Depend on the
    // id instead, which only actually changes when a different source is opened.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, editing?.id]);

  const questions = draft.questions.filter((q) => q.trim());
  const valid = draft.title.trim() && questions.length > 0 && draft.answer.trim();

  async function submit() {
    if (!valid) return;
    setSaving(true);
    const content = formatQa(questions, draft.answer);
    const res = await fetch(editing ? `/api/sources/${editing.id}` : "/api/sources", {
      method: editing ? "PATCH" : "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(editing ? { title: draft.title, content } : { type: "QA", title: draft.title, content }),
    });
    setSaving(false);
    if (!res.ok) {
      toast.error((await res.json()).error ?? "Something went wrong");
      return;
    }
    toast.success(editing ? "Q&A saved" : "Q&A added");
    onDone();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader className="flex-row items-center gap-3 space-y-0">
          <span className="flex size-9 items-center justify-center rounded-full border border-line bg-well text-soft">
            <CircleHelp className="size-4" />
          </span>
          <DialogTitle>{editing ? "Edit Q&A" : "Add Q&A"}</DialogTitle>
        </DialogHeader>
        <DialogDescription>Q&amp;As are used for exact answers. Instructions can&apos;t be given here.</DialogDescription>

        <div className="flex flex-col gap-4">
          <Field label="Title">
            <Input
              placeholder="Ex: Refund requests"
              value={draft.title}
              onChange={(e) => setDraft({ ...draft, title: e.target.value })}
            />
          </Field>

          <Field label="Questions">
            <div className="flex flex-col gap-2">
              {draft.questions.map((q, i) => (
                <div key={i} className="flex items-center gap-2">
                  <Input
                    placeholder="Ex: How do I request a refund?"
                    value={q}
                    onChange={(e) => {
                      const next = [...draft.questions];
                      next[i] = e.target.value;
                      setDraft({ ...draft, questions: next });
                    }}
                  />
                  {draft.questions.length > 1 && (
                    <button
                      type="button"
                      onClick={() => setDraft({ ...draft, questions: draft.questions.filter((_, j) => j !== i) })}
                      className="flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-full text-faint transition-colors hover:bg-well hover:text-ink"
                    >
                      <X className="size-3.5" />
                    </button>
                  )}
                </div>
              ))}
              <button
                type="button"
                onClick={() => setDraft({ ...draft, questions: [...draft.questions, ""] })}
                className="flex items-center justify-center gap-1.5 rounded-[0.85rem] border border-dashed border-line py-2 text-xs font-light text-soft transition-colors hover:border-edge hover:text-ink"
              >
                <Plus className="size-3.5" /> Add question
              </button>
            </div>
          </Field>

          <Field label="Answer">
            <MarkdownField
              value={draft.answer}
              onChange={(v) => setDraft({ ...draft, answer: v })}
              placeholder="Enter your answer…"
              rows={7}
            />
          </Field>
        </div>

        <div className="flex justify-between pt-1">
          <Button type="button" variant="ghost" onClick={() => setDraft(initial())} className="text-soft">
            Reset
          </Button>
          <Button type="button" onClick={submit} disabled={saving || !valid} className="rounded-full px-5">
            {saving ? "Saving…" : editing ? "Save changes" : "Add Q&A source"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <p className="text-xs font-normal text-soft">{label}</p>
      {children}
    </div>
  );
}
