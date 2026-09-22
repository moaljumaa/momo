"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Wizard } from "./Wizard";
import { Stepper } from "./Stepper";
import { ALL_STEPS } from "./steps";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Step = "url" | "picking" | "crawling" | "wizard";
type CrawlProgress = { url: string; status: "pending" | "done" | "failed" };
type ApiSource = { id: string; status: string; error: string | null; crawlProgress: CrawlProgress[] | null };

// Groups a flat list of same-origin URLs by their first path segment, so 200 discovered
// pages read as "blog (34) · docs (12) · pricing" instead of one long flat list.
function groupByPath(urls: string[], origin: string) {
  const groups = new Map<string, string[]>();
  for (const u of urls) {
    let path = "/";
    try {
      path = new URL(u).pathname || "/";
    } catch {
      // custom entries are already resolved absolute URLs
    }
    const seg = path.split("/").filter(Boolean)[0] ?? "";
    const key = seg || "Home";
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(u);
  }
  return [...groups.entries()].sort((a, b) => {
    if (a[0] === "Home") return -1;
    if (b[0] === "Home") return 1;
    return a[0].localeCompare(b[0]);
  });
}

type ResyncSource = { id: string; url: string; selectedUrls: string[] };

// Add-website flow: discover candidate pages -> user picks up to 10, grouped by
// section -> crawl with live per-page progress -> AI drafts widget content for review.
// Also doubles as the re-sync flow: given `resyncSource`, it skips straight to re-crawling
// that source's already-picked pages, then reopens the same wizard so the user can review
// and resubmit the (possibly changed) instructions instead of a silent background re-sync.
export function AddWebsiteFlow({
  onDone,
  onCancel,
  resyncSource,
}: {
  onDone: () => void;
  onCancel: () => void;
  resyncSource?: ResyncSource;
}) {
  const [step, setStep] = useState<Step>(resyncSource ? "crawling" : "url");
  const [wizardStep, setWizardStep] = useState(0);
  const [siteUrl, setSiteUrl] = useState(resyncSource?.url ?? "");
  const [candidates, setCandidates] = useState<string[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set(resyncSource?.selectedUrls ?? []));
  const [search, setSearch] = useState("");
  const [openGroups, setOpenGroups] = useState<Set<string>>(new Set());
  const [customUrl, setCustomUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [sourceId, setSourceId] = useState<string | null>(resyncSource?.id ?? null);
  const [progress, setProgress] = useState<CrawlProgress[]>(
    resyncSource?.selectedUrls.map((url) => ({ url, status: "pending" as const })) ?? [],
  );

  useEffect(() => {
    if (!resyncSource) return;
    fetch(`/api/sources/${resyncSource.id}/resync`, { method: "POST" })
      .then((r) => {
        if (!r.ok) throw new Error();
        poll(resyncSource.id);
      })
      .catch(() => {
        toast.error("Couldn't start re-sync");
        setError("Couldn't start re-sync");
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const origin = useMemo(() => {
    try {
      return new URL(siteUrl).origin;
    } catch {
      return "";
    }
  }, [siteUrl]);

  async function findPages(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/sources/discover", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ url: siteUrl }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Couldn't reach that site");
      if (data.urls.length === 0) throw new Error("No pages found on that site — try the homepage URL directly");
      setCandidates(data.urls);
      setSelected(new Set(data.urls.slice(0, 1)));
      setOpenGroups(new Set(groupByPath(data.urls, new URL(siteUrl).origin).slice(0, 1).map(([g]) => g)));
      setStep("picking");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  function toggle(url: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(url)) next.delete(url);
      else if (next.size < 10) next.add(url);
      return next;
    });
  }

  function toggleGroup(key: string) {
    setOpenGroups((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function addCustom() {
    if (!customUrl.trim()) return;
    try {
      const u = new URL(customUrl, origin).toString();
      if (!u.startsWith(origin)) throw new Error("off-site");
      setCandidates((prev) => (prev.includes(u) ? prev : [u, ...prev]));
      setSelected((prev) => (prev.size >= 10 ? prev : new Set(prev).add(u)));
      setCustomUrl("");
      setError("");
    } catch {
      setError("That URL isn't on this site");
    }
  }

  async function startCrawl() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/sources", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          type: "URL",
          title: new URL(siteUrl).hostname,
          url: siteUrl,
          selectedUrls: [...selected],
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Something went wrong");
      setSourceId(data.source.id);
      setProgress([...selected].map((url) => ({ url, status: "pending" })));
      setStep("crawling");
      poll(data.source.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  async function poll(id: string) {
    const res = await fetch("/api/sources");
    const { sources } = (await res.json()) as { sources: ApiSource[] };
    const s = sources.find((x) => x.id === id);
    if (!s) return;
    if (s.crawlProgress) setProgress(s.crawlProgress);
    if (s.status === "READY") setStep("wizard");
    else if (s.status === "FAILED") setError(s.error ?? "Crawl failed");
    else setTimeout(() => poll(id), 1500);
  }

  const query = search.trim().toLowerCase();
  const matches = (u: string) => {
    if (!query) return true;
    let path = u;
    try {
      path = new URL(u).pathname;
    } catch {
      // keep raw
    }
    return path.toLowerCase().includes(query) || u.toLowerCase().includes(query);
  };
  const filteredCandidates = candidates.filter(matches);
  const groups = groupByPath(filteredCandidates, origin);
  const effectiveOpenGroups = query ? new Set(groups.map(([g]) => g)) : openGroups;

  const phaseIndex = step === "url" ? 0 : step === "picking" ? 1 : step === "crawling" ? 2 : 3 + wizardStep;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background">
      <div
        className={`mx-auto flex w-full max-w-4xl flex-1 flex-col px-8 py-10 ${
          step === "wizard" ? "overflow-hidden" : "overflow-y-auto"
        }`}
      >
        <Stepper steps={ALL_STEPS} current={phaseIndex} />

        {step === "url" && (
          <form onSubmit={findPages} className="flex flex-1 flex-col justify-center gap-5">
            <div>
              <h1 className="mb-2 text-2xl font-light">What&apos;s the site?</h1>
              <p className="text-sm font-light text-faint">
                We&apos;ll read it and find the pages worth teaching the bot.
              </p>
            </div>
            <Input
              value={siteUrl}
              onChange={(e) => setSiteUrl(e.target.value)}
              type="url"
              placeholder="https://example.com"
              required
              className="h-14 rounded-[1rem] px-5 text-base"
            />
            {error && <p className="text-sm text-clay">{error}</p>}
            <div className="flex gap-3">
              <Button type="submit" disabled={loading} className="h-11 rounded-full px-6">
                {loading ? "Finding pages…" : "Find pages"}
              </Button>
              <Button type="button" variant="ghost" onClick={onCancel} className="h-11 text-soft">
                Cancel
              </Button>
            </div>
          </form>
        )}

        {step === "picking" && (
          <div className="flex flex-1 flex-col gap-4">
            <div className="flex items-center justify-between">
              <h1 className="text-2xl font-light">Pick up to 10 pages</h1>
              <p className="text-sm font-light text-faint">{selected.size}/10 selected</p>
            </div>
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by page path — e.g. pricing, blog, /docs/api"
              className="h-12 rounded-[1rem]"
            />
            <div className="max-h-[28rem] flex-1 overflow-y-auto rounded-[1.25rem] border border-line bg-sheet">
              {groups.map(([group, urls]) => {
                const isOpen = effectiveOpenGroups.has(group);
                const selectedInGroup = urls.filter((u) => selected.has(u)).length;
                return (
                  <div key={group} className="border-b border-line last:border-b-0">
                    <button
                      type="button"
                      onClick={() => toggleGroup(group)}
                      className="flex w-full items-center justify-between px-5 py-3 text-left hover:bg-hover"
                    >
                      <span className="flex items-center gap-2 text-sm font-normal">
                        <ChevronIcon open={isOpen} />
                        {group}
                        <span className="text-xs font-light text-faint">
                          {urls.length} page{urls.length === 1 ? "" : "s"}
                        </span>
                      </span>
                      {selectedInGroup > 0 && (
                        <span className="text-xs font-light text-ember">{selectedInGroup} selected</span>
                      )}
                    </button>
                    {isOpen && (
                      <div className="pb-1">
                        {urls.map((u) => {
                          let path = "/";
                          try {
                            path = new URL(u).pathname || "/";
                          } catch {
                            // custom entries already resolved
                          }
                          return (
                            <label
                              key={u}
                              className="flex items-center gap-3 py-2 pr-5 pl-12 hover:bg-hover"
                            >
                              <input
                                type="checkbox"
                                checked={selected.has(u)}
                                disabled={!selected.has(u) && selected.size >= 10}
                                onChange={() => toggle(u)}
                                className="size-3.5 accent-ember"
                              />
                              <span className="truncate text-sm font-light text-soft">{path}</span>
                            </label>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
              {groups.length === 0 && <p className="p-6 text-sm font-light text-faint">No pages match.</p>}
            </div>
            <div className="flex gap-2">
              <Input
                value={customUrl}
                onChange={(e) => setCustomUrl(e.target.value)}
                placeholder="Add a specific URL from this site"
                className="h-11 rounded-[1rem]"
              />
              <Button type="button" variant="outline" onClick={addCustom} className="h-11 shrink-0 rounded-full px-5 text-soft">
                Add
              </Button>
            </div>
            {error && <p className="text-sm text-clay">{error}</p>}
            <div className="flex gap-3">
              <Button onClick={startCrawl} disabled={loading || selected.size === 0} className="h-11 rounded-full px-6">
                {loading ? "Starting…" : `Crawl ${selected.size} page${selected.size === 1 ? "" : "s"}`}
              </Button>
              <Button type="button" variant="ghost" onClick={() => setStep("url")} className="h-11 text-soft">
                Back
              </Button>
              <Button type="button" variant="ghost" onClick={onCancel} className="h-11 text-soft">
                Cancel
              </Button>
            </div>
          </div>
        )}

        {step === "crawling" && (
          <div className="flex flex-1 flex-col justify-center gap-4">
            <h1 className="text-2xl font-light">
              Crawling {selected.size} page{selected.size === 1 ? "" : "s"}…
            </h1>
            <div className="flex flex-col rounded-[1.25rem] border border-line bg-sheet">
              {progress.map((p) => {
                let path = p.url;
                try {
                  path = new URL(p.url).pathname || "/";
                } catch {
                  // keep raw
                }
                return (
                  <div key={p.url} className="flex items-center gap-3 border-b border-line px-5 py-3 last:border-b-0">
                    <StatusDot status={p.status} />
                    <span className="flex-1 truncate text-sm font-light">{path}</span>
                    <span className="text-xs font-light text-faint">
                      {p.status === "pending" ? "Waiting…" : p.status === "done" ? "Crawled" : "Failed"}
                    </span>
                  </div>
                );
              })}
            </div>
            {error && <p className="text-sm text-clay">{error}</p>}
          </div>
        )}

        {step === "wizard" && sourceId && (
          <Wizard
            sourceId={sourceId}
            siteUrl={siteUrl}
            step={wizardStep}
            onStepChange={setWizardStep}
            onDone={onDone}
            onSkip={onDone}
            onCancel={resyncSource ? onCancel : undefined}
          />
        )}
      </div>
    </div>
  );
}

function StatusDot({ status }: { status: CrawlProgress["status"] }) {
  if (status === "done") return <span className="size-1.5 shrink-0 rounded-full bg-sky" />;
  if (status === "failed") return <span className="size-1.5 shrink-0 rounded-full bg-clay" />;
  return <span className="size-1.5 shrink-0 animate-pulse rounded-full bg-faint" />;
}

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      className={`shrink-0 text-faint transition-transform ${open ? "rotate-90" : ""}`}
    >
      <path d="m9 6 6 6-6 6" />
    </svg>
  );
}
