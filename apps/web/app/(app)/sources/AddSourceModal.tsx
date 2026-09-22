"use client";

import { Globe, FileText, CircleHelp, AlignLeft, type LucideIcon } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import type { SourceKind } from "./SourceTypeIcon";

const CARDS: { type: SourceKind; icon: LucideIcon; title: string; description: string }[] = [
  { type: "URL", icon: Globe, title: "Website", description: "Crawl pages from a site" },
  { type: "TEXT", icon: AlignLeft, title: "Text snippet", description: "Paste text directly" },
  { type: "FILE", icon: FileText, title: "File", description: "PDF, Word or text file" },
  { type: "QA", icon: CircleHelp, title: "Q&A", description: "Exact question and answer" },
];

// One entry point for every source kind — replaces the row of separate buttons that used
// to spill inline forms directly onto the page. Picking a card opens that kind's own modal.
export function AddSourceModal({
  open,
  onOpenChange,
  onPick,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPick: (type: SourceKind) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Add a source</DialogTitle>
          <DialogDescription>Pick what you want to teach the bot from.</DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          {CARDS.map(({ type, icon: Icon, title, description }) => (
            <button
              key={type}
              type="button"
              onClick={() => onPick(type)}
              className="flex cursor-pointer flex-col items-start gap-3 rounded-[1rem] border border-line bg-background p-4 text-left transition-colors hover:border-edge hover:bg-hover"
            >
              <span className="flex size-9 items-center justify-center rounded-full border border-line bg-well text-soft">
                <Icon className="size-4" />
              </span>
              <span>
                <span className="block text-sm font-normal">{title}</span>
                <span className="block text-xs font-light text-faint">{description}</span>
              </span>
            </button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
