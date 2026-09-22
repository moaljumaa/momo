"use client";

import { useRef, useState } from "react";
import { toast } from "sonner";
import { FileText, Upload, X } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

const ACCEPTED = [".pdf", ".doc", ".docx", ".txt"];
const MAX_BYTES = 20 * 1024 * 1024;

export function FileSourceModal({
  open,
  onOpenChange,
  onDone,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDone: () => void;
}) {
  const [files, setFiles] = useState<File[]>([]);
  const [dragging, setDragging] = useState(false);
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  function addFiles(list: FileList | null) {
    if (!list) return;
    const next: File[] = [];
    for (const f of Array.from(list)) {
      const ext = "." + f.name.split(".").pop()?.toLowerCase();
      if (!ACCEPTED.includes(ext)) {
        toast.error(`${f.name}: unsupported file type`);
        continue;
      }
      if (f.size > MAX_BYTES) {
        toast.error(`${f.name}: over 20 MB`);
        continue;
      }
      next.push(f);
    }
    setFiles((prev) => [...prev, ...next]);
  }

  function reset() {
    setFiles([]);
  }

  async function submit() {
    if (files.length === 0) return;
    setSaving(true);
    let ok = 0;
    for (const file of files) {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/sources/upload", { method: "POST", body: form });
      if (res.ok) ok++;
      else toast.error(`${file.name}: ${(await res.json().catch(() => ({}))).error ?? "upload failed"}`);
    }
    setSaving(false);
    if (ok > 0) {
      toast.success(`${ok} file${ok === 1 ? "" : "s"} added`);
      setFiles([]);
      onDone();
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader className="flex-row items-center gap-3 space-y-0">
          <span className="flex size-9 items-center justify-center rounded-full border border-line bg-well text-soft">
            <FileText className="size-4" />
          </span>
          <DialogTitle>Add file</DialogTitle>
        </DialogHeader>

        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            addFiles(e.dataTransfer.files);
          }}
          onClick={() => inputRef.current?.click()}
          className={`flex cursor-pointer flex-col items-center gap-3 rounded-[1rem] border border-dashed p-8 text-center transition-colors ${
            dragging ? "border-ember bg-hover" : "border-line hover:border-edge"
          }`}
        >
          <input
            ref={inputRef}
            type="file"
            multiple
            accept={ACCEPTED.join(",")}
            className="hidden"
            onChange={(e) => addFiles(e.target.files)}
          />
          <span className="flex size-10 items-center justify-center rounded-lg bg-ink text-sheet">
            <Upload className="size-4" />
          </span>
          <p className="text-sm font-normal">Click here or drag files to upload</p>
          <p className="text-xs font-light text-faint">Up to 20 MB supported</p>
          <div className="flex gap-1.5">
            {ACCEPTED.map((ext) => (
              <span key={ext} className="rounded-full border border-line px-2.5 py-0.5 text-[11px] font-light text-faint">
                {ext}
              </span>
            ))}
          </div>
        </div>

        <p className="rounded-[0.85rem] bg-well px-3.5 py-2.5 text-xs font-light text-soft">
          Ensure PDF text is selectable when uploading.
        </p>

        {files.length > 0 && (
          <div className="flex flex-col gap-1.5">
            {files.map((f, i) => (
              <div key={i} className="flex items-center gap-2.5 rounded-[0.75rem] border border-line px-3 py-2">
                <FileText className="size-3.5 shrink-0 text-faint" />
                <span className="min-w-0 flex-1 truncate text-sm font-light">{f.name}</span>
                <span className="shrink-0 text-xs font-light text-faint">{(f.size / 1024 / 1024).toFixed(1)} MB</span>
                <button
                  type="button"
                  onClick={() => setFiles((prev) => prev.filter((_, j) => j !== i))}
                  className="shrink-0 text-faint transition-colors hover:text-ink"
                >
                  <X className="size-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="flex justify-between pt-1">
          <Button type="button" variant="ghost" onClick={reset} className="text-soft">
            Reset
          </Button>
          <Button type="button" onClick={submit} disabled={saving || files.length === 0} className="rounded-full px-5">
            {saving ? "Uploading…" : "Add file source"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
