"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

// Full crawled-page text is often long — a 400px sidebar row was too cramped to read it in,
// so viewing a page's content opens this larger, dedicated modal instead of expanding inline.
export function PageContentModal({
  open,
  onOpenChange,
  url,
  content,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  url: string;
  content: string;
}) {
  let path = url;
  try {
    path = new URL(url).pathname || "/";
  } catch {
    // keep raw
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[80vh] max-w-2xl">
        <DialogHeader>
          <DialogTitle>{path}</DialogTitle>
          <DialogDescription>What the crawler extracted and passed to the bot from this page.</DialogDescription>
        </DialogHeader>
        <div className="max-h-[55vh] overflow-y-auto rounded-[1rem] border border-line bg-well p-4">
          <p className="whitespace-pre-wrap text-sm font-light leading-relaxed text-soft">{content}</p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
