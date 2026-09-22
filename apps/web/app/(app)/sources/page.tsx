"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Plus, RefreshCw, Trash2 } from "lucide-react";
import { AddWebsiteFlow } from "./AddWebsiteFlow";
import { AddSourceModal } from "./AddSourceModal";
import { TextSourceModal } from "./TextSourceModal";
import { QaSourceModal } from "./QaSourceModal";
import { FileSourceModal } from "./FileSourceModal";
import { ConfirmDialog } from "./ConfirmDialog";
import { SourceSheet } from "./SourceSheet";
import { SourceTypeIcon, type SourceKind } from "./SourceTypeIcon";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "@/components/ui/tooltip";

type Source = {
  id: string;
  type: SourceKind;
  title: string;
  url: string | null;
  content: string | null;
  selectedUrls: string[] | null;
  status: "PENDING" | "PROCESSING" | "READY" | "FAILED";
  error: string | null;
  createdAt: string;
  _count: { chunks: number };
};

const statusDot: Record<Source["status"], string> = {
  PENDING: "bg-faint",
  PROCESSING: "bg-wheat",
  READY: "bg-sky",
  FAILED: "bg-clay",
};

const statusLabel: Record<Source["status"], string> = {
  PENDING: "Queued",
  PROCESSING: "Syncing",
  READY: "Synced",
  FAILED: "Failed",
};

export default function Sources() {
  const [sources, setSources] = useState<Source[]>([]);
  const [picking, setPicking] = useState(false);
  const [addingWebsite, setAddingWebsite] = useState(false);
  // "new" = the Add-source picker opened this in create mode; a Source = reopened from
  // the list to edit that existing text/Q&A source.
  const [textModal, setTextModal] = useState<Source | "new" | null>(null);
  const [qaModal, setQaModal] = useState<Source | "new" | null>(null);
  const [addingFile, setAddingFile] = useState(false);
  const [resyncing, setResyncing] = useState<Source | null>(null);
  const [viewing, setViewing] = useState<string | null>(null);
  const [confirmRemove, setConfirmRemove] = useState<Source | null>(null);
  const [confirmResync, setConfirmResync] = useState<Source | null>(null);
  const [removing, setRemoving] = useState(false);

  async function load() {
    const res = await fetch("/api/sources");
    const { sources } = await res.json();
    setSources(sources);
  }

  useEffect(() => {
    load();
    const busy = sources.some((s) => s.status === "PENDING" || s.status === "PROCESSING");
    const interval = setInterval(load, busy ? 2000 : 8000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sources.length, sources.map((s) => s.status).join(",")]);

  async function confirmRemoveNow() {
    if (!confirmRemove) return;
    setRemoving(true);
    const res = await fetch(`/api/sources/${confirmRemove.id}`, { method: "DELETE" });
    setRemoving(false);
    setConfirmRemove(null);
    if (!res.ok) toast.error("Couldn't remove that source");
    else toast.success(`Removed "${confirmRemove.title}"`);
    load();
  }

  function pick(type: SourceKind) {
    setPicking(false);
    if (type === "URL") setAddingWebsite(true);
    else if (type === "TEXT") setTextModal("new");
    else if (type === "QA") setQaModal("new");
    else setAddingFile(true);
  }

  function open(s: Source) {
    if (s.type === "TEXT") setTextModal(s);
    else if (s.type === "QA") setQaModal(s);
    else setViewing(s.id);
  }

  return (
    <TooltipProvider>
      <div className="mx-auto max-w-3xl p-8">
        <h1 className="mb-6 text-2xl font-light">Data sources</h1>

        <Button onClick={() => setPicking(true)} className="mb-8 rounded-full px-4">
          <Plus className="size-4" /> Add source
        </Button>

        <AddSourceModal open={picking} onOpenChange={setPicking} onPick={pick} />
        <TextSourceModal
          open={!!textModal}
          onOpenChange={(open) => !open && setTextModal(null)}
          editing={textModal && textModal !== "new" ? { id: textModal.id, title: textModal.title, content: textModal.content ?? "" } : null}
          onDone={() => {
            setTextModal(null);
            load();
          }}
        />
        <QaSourceModal
          open={!!qaModal}
          onOpenChange={(open) => !open && setQaModal(null)}
          editing={qaModal && qaModal !== "new" ? { id: qaModal.id, title: qaModal.title, content: qaModal.content ?? "" } : null}
          onDone={() => {
            setQaModal(null);
            load();
          }}
        />
        <FileSourceModal
          open={addingFile}
          onOpenChange={setAddingFile}
          onDone={() => {
            setAddingFile(false);
            load();
          }}
        />
        {addingWebsite && (
          <AddWebsiteFlow
            onDone={() => {
              setAddingWebsite(false);
              load();
            }}
            onCancel={() => setAddingWebsite(false)}
          />
        )}
        {resyncing && (
          <AddWebsiteFlow
            resyncSource={{
              id: resyncing.id,
              url: resyncing.url ?? "",
              selectedUrls: resyncing.selectedUrls ?? [],
            }}
            onDone={() => {
              setResyncing(null);
              load();
            }}
            onCancel={() => setResyncing(null)}
          />
        )}

        <div className="flex flex-col">
          {sources.length === 0 && (
            <p className="py-8 text-sm font-light text-faint">No sources yet.</p>
          )}
          {sources.map((s) => (
            <div
              key={s.id}
              role="button"
              tabIndex={0}
              onClick={() => open(s)}
              onKeyDown={(e) => e.key === "Enter" && open(s)}
              className="flex cursor-pointer items-center gap-3 border-b border-line py-4 hover:bg-hover"
            >
              <SourceTypeIcon type={s.type} />
              <span className={`size-1.5 shrink-0 rounded-full ${statusDot[s.status]}`} />
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-light">{s.title}</div>
                <div className="truncate text-xs font-light text-faint">
                  {statusLabel[s.status]}
                  {s.status === "READY" && ` · ${s._count.chunks} chunks`}
                  {s.status === "FAILED" && s.error ? ` · ${s.error}` : ""}
                </div>
              </div>
              {s.type === "URL" && (
                <Tooltip>
                  <TooltipTrigger
                    onClick={(e: React.MouseEvent) => {
                      e.stopPropagation();
                      setConfirmResync(s);
                    }}
                    className="flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-full text-soft transition-colors hover:bg-well hover:text-ink"
                  >
                    <RefreshCw className="size-4" />
                  </TooltipTrigger>
                  <TooltipContent>Re-sync</TooltipContent>
                </Tooltip>
              )}
              <Tooltip>
                <TooltipTrigger
                  onClick={(e: React.MouseEvent) => {
                    e.stopPropagation();
                    setConfirmRemove(s);
                  }}
                  className="flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-full text-soft transition-colors hover:bg-clay/10 hover:text-clay"
                >
                  <Trash2 className="size-4" />
                </TooltipTrigger>
                <TooltipContent>Remove</TooltipContent>
              </Tooltip>
            </div>
          ))}
        </div>

        {viewing && <SourceSheet sourceId={viewing} onClose={() => setViewing(null)} />}

        <ConfirmDialog
          open={!!confirmRemove}
          onOpenChange={(open) => !open && setConfirmRemove(null)}
          title="Remove this source?"
          description={`"${confirmRemove?.title}" will stop being used to answer questions. This can't be undone.`}
          confirmLabel="Remove"
          destructive
          busy={removing}
          onConfirm={confirmRemoveNow}
        />

        <ConfirmDialog
          open={!!confirmResync}
          onOpenChange={(open) => !open && setConfirmResync(null)}
          title="Re-sync this website?"
          description={`We'll re-crawl the ${confirmResync?.selectedUrls?.length ?? 0} page${confirmResync?.selectedUrls?.length === 1 ? "" : "s"} picked for "${confirmResync?.title}" and let you review the generated instructions again before saving.`}
          confirmLabel="Re-sync"
          onConfirm={() => {
            if (confirmResync) setResyncing(confirmResync);
            setConfirmResync(null);
          }}
        />
      </div>
    </TooltipProvider>
  );
}
