"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { AlignLeft, X } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MarkdownField } from "./MarkdownField";

const EMPTY = { title: "", content: "" };

export function TextSourceModal({
  open,
  onOpenChange,
  onDone,
  editing,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDone: () => void;
  // Present when reopening a saved text source to edit, instead of creating a new one.
  editing?: { id: string; title: string; content: string } | null;
}) {
  const [draft, setDraft] = useState(EMPTY);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) setDraft(editing ? { title: editing.title, content: editing.content } : EMPTY);
    // `editing` is a new object literal on every parent render (page.tsx recreates it from
    // the polled source list), so depending on it directly would reset the draft — wiping
    // whatever the user just typed — every time that background poll ticks. Depend on the
    // id instead, which only actually changes when a different source is opened.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, editing?.id]);

  async function submit() {
    if (!draft.title.trim() || !draft.content.trim()) return;
    setSaving(true);
    const res = await fetch(editing ? `/api/sources/${editing.id}` : "/api/sources", {
      method: editing ? "PATCH" : "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(
        editing ? { title: draft.title, content: draft.content } : { type: "TEXT", title: draft.title, content: draft.content },
      ),
    });
    setSaving(false);
    if (!res.ok) {
      toast.error((await res.json()).error ?? "Something went wrong");
      return;
    }
    toast.success(editing ? "Text snippet saved" : "Text snippet added");
    onDone();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader className="flex-row items-center gap-3 space-y-0">
          <span className="flex size-9 items-center justify-center rounded-full border border-line bg-well text-soft">
            <AlignLeft className="size-4" />
          </span>
          <DialogTitle>{editing ? "Edit text" : "Add text"}</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <Input
            placeholder="Title"
            value={draft.title}
            onChange={(e) => setDraft({ ...draft, title: e.target.value })}
          />
          <MarkdownField
            value={draft.content}
            onChange={(v) => setDraft({ ...draft, content: v })}
            placeholder="Write or paste what the bot should know…"
            rows={11}
          />
        </div>

        <div className="flex justify-between pt-1">
          <Button
            type="button"
            variant="ghost"
            onClick={() => setDraft(editing ? { title: editing.title, content: editing.content } : EMPTY)}
            className="text-soft"
          >
            <X className="size-4" /> Reset
          </Button>
          <Button
            type="button"
            onClick={submit}
            disabled={saving || !draft.title.trim() || !draft.content.trim()}
            className="rounded-full px-5"
          >
            {saving ? "Saving…" : editing ? "Save changes" : "Add text source"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
