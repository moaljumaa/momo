"use client";

import { useEffect, useState } from "react";
import { X, ChevronRight } from "lucide-react";
import { SourceTypeIcon } from "./SourceTypeIcon";
import { PageContentModal } from "./PageContentModal";
import { Markdown } from "@/components/Markdown";

type SourceDetail = {
  id: string;
  type: "URL" | "FILE" | "QA" | "TEXT";
  title: string;
  url: string | null;
  content: string | null;
  selectedUrls: string[] | null;
  crawlProgress: { url: string; status: "pending" | "done" | "failed" }[] | null;
  status: "PENDING" | "PROCESSING" | "READY" | "FAILED";
  error: string | null;
  createdAt: string;
};

type Page = { label: string; content: string };

// Side panel opened by clicking a website source row: a brief per-page breakdown of what
// got crawled, so a user whose bot "doesn't know anything" can see whether the crawler
// ever got real content, without leaving the list. A page's full text opens in its own
// modal (PageContentModal) rather than expanding inline — that content can be long.
export function SourceSheet({ sourceId, onClose }: { sourceId: string; onClose: () => void }) {
  const [source, setSource] = useState<SourceDetail | null>(null);
  const [pages, setPages] = useState<Page[]>([]);
  const [hasLabels, setHasLabels] = useState(true);
  const [viewingUrl, setViewingUrl] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/sources/${sourceId}`)
      .then((r) => r.json())
      .then((d) => {
        setSource(d.source);
        setPages(d.pages ?? []);
        setHasLabels(d.hasLabels ?? true);
      });
  }, [sourceId]);

  const pageStatus = new Map(
    (source?.crawlProgress ?? []).map((p) => [p.url, p.status] as const),
  );
  const contentByLabel = new Map(pages.map((p) => [p.label, p.content]));
  const legacyContent = pages.find((p) => p.label === "__legacy__")?.content;
  const crawledUrls = source?.selectedUrls ?? [];
  const viewingContent = viewingUrl ? contentByLabel.get(viewingUrl) : undefined;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <button aria-label="Close" onClick={onClose} className="absolute inset-0 bg-ink/30" />
      <div className="relative flex h-full w-full max-w-md flex-col overflow-hidden border-l border-line bg-sheet">
        <div className="flex items-start justify-between gap-3 border-b border-line px-6 py-5">
          <div className="flex min-w-0 items-center gap-3">
            {source && <SourceTypeIcon type={source.type} className="mt-0.5 shrink-0" />}
            <div className="min-w-0">
              <p className="truncate text-base font-normal">{source?.title ?? "…"}</p>
              {source?.url && <p className="truncate text-xs font-light text-faint">{source.url}</p>}
            </div>
          </div>
          <button onClick={onClose} className="shrink-0 text-faint transition-colors hover:text-ink">
            <X className="size-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5">
          {!source && <p className="text-sm font-light text-faint">Loading…</p>}

          {source?.status === "FAILED" && (
            <p className="mb-4 text-sm font-light text-clay">{source.error ?? "This source failed to sync."}</p>
          )}

          {source?.type === "URL" && !hasLabels && legacyContent && (
            <>
              <p className="mb-3 rounded-[0.85rem] bg-well px-3.5 py-2.5 text-xs font-light text-soft">
                This was crawled before we tracked content per page — re-sync to see a page-by-page breakdown.
              </p>
              <p className="mb-3 text-xs font-normal text-soft">Content passed to the bot</p>
              <div className="rounded-[1rem] border border-line bg-well p-4">
                <Markdown>{legacyContent}</Markdown>
              </div>
            </>
          )}

          {source?.type === "URL" && (hasLabels || !legacyContent) && (
            <>
              <p className="mb-3 text-xs font-normal text-soft">
                {crawledUrls.length} page{crawledUrls.length === 1 ? "" : "s"} crawled
              </p>
              <div className="flex flex-col rounded-[1rem] border border-line">
                {crawledUrls.map((u) => {
                  const status = pageStatus.get(u) ?? (source.status === "READY" ? "done" : "pending");
                  const hasContent = !!contentByLabel.get(u);
                  let path = u;
                  try {
                    path = new URL(u).pathname || "/";
                  } catch {
                    // keep raw
                  }
                  return (
                    <button
                      key={u}
                      type="button"
                      disabled={!hasContent}
                      onClick={() => setViewingUrl(u)}
                      className="flex w-full items-center gap-3 border-b border-line px-4 py-3 text-left last:border-b-0 hover:bg-hover disabled:cursor-default disabled:hover:bg-transparent"
                    >
                      <StatusDot status={status} />
                      <span className="min-w-0 flex-1 truncate text-sm font-light">{path}</span>
                      {hasContent ? (
                        <ChevronRight className="size-3.5 shrink-0 text-faint" />
                      ) : (
                        <span className="shrink-0 text-xs font-light text-faint">
                          {status === "failed" ? "Failed" : status === "pending" ? "Waiting…" : "Empty"}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </>
          )}

          {source && source.type !== "URL" && (
            <>
              <p className="mb-3 text-xs font-normal text-soft">Content passed to the bot</p>
              {source.content ? (
                <div className="rounded-[1rem] border border-line bg-well p-4">
                  <Markdown>{source.content}</Markdown>
                </div>
              ) : (
                <p className="text-sm font-light text-faint">No content stored for this source.</p>
              )}
            </>
          )}
        </div>
      </div>

      {viewingUrl && viewingContent && (
        <PageContentModal
          open={!!viewingUrl}
          onOpenChange={(open) => !open && setViewingUrl(null)}
          url={viewingUrl}
          content={viewingContent}
        />
      )}
    </div>
  );
}

function StatusDot({ status }: { status: "pending" | "done" | "failed" }) {
  if (status === "done") return <span className="size-1.5 shrink-0 rounded-full bg-sky" />;
  if (status === "failed") return <span className="size-1.5 shrink-0 rounded-full bg-clay" />;
  return <span className="size-1.5 shrink-0 rounded-full bg-faint" />;
}
