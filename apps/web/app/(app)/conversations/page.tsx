"use client";

import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ConversationSidebar, type ConversationDetail } from "./ConversationSidebar";
import type { ConversationEvent } from "@/lib/conversation-events";
import { authClient } from "@/lib/auth-client";

type Msg = {
  id: string;
  role: "VISITOR" | "AI" | "AGENT";
  content: string;
  confidence: number | null;
  agent: { id: string; name: string } | null;
  createdAt: string;
};

type ListItem = {
  id: string;
  status: ConversationDetail["status"];
  priority: "LOW" | "NORMAL" | "HIGH" | null;
  createdAt: string;
  updatedAt: string;
  contact: { name: string | null; email: string | null } | null;
  visitorCountry: string | null;
  assignee: { id: string; name: string; image: string | null } | null;
  labels: { id: string; name: string; color: string }[];
  messages: { content: string; role: string }[];
};

const STATUS_FILTERS = [
  { id: "all", label: "All conversations" },
  { id: "PENDING_HANDOFF", label: "Collecting info" },
  { id: "NEEDS_HUMAN", label: "Needs human" },
  { id: "HUMAN", label: "Human" },
  { id: "RESOLVED", label: "Resolved" },
] as const;

const STATUS_DOT: Record<ConversationDetail["status"], string> = {
  AI: "bg-faint",
  PENDING_HANDOFF: "bg-wheat",
  NEEDS_HUMAN: "bg-clay",
  HUMAN: "bg-sky",
  RESOLVED: "bg-edge",
};

const PRIORITY_RANK: Record<"LOW" | "NORMAL" | "HIGH", number> = { HIGH: 0, NORMAL: 1, LOW: 2 };

const SORTS = [
  { id: "recent", label: "Recent activity" },
  { id: "priority", label: "Priority" },
  { id: "created_desc", label: "Newest first" },
  { id: "created_asc", label: "Oldest first" },
] as const;

const DATE_RANGES = [
  { id: "all", label: "Any time" },
  { id: "today", label: "Today" },
  { id: "week", label: "This week" },
  { id: "month", label: "This month" },
] as const;

function withinRange(iso: string, range: (typeof DATE_RANGES)[number]["id"]) {
  if (range === "all") return true;
  const days = range === "today" ? 1 : range === "week" ? 7 : 30;
  return Date.now() - new Date(iso).getTime() <= days * 86400000;
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.round(diff / 60000);
  if (min < 1) return "now";
  if (min < 60) return `${min}m`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `${hr}h`;
  return `${Math.round(hr / 24)}d`;
}

export default function ConversationsPage() {
  const searchParams = useSearchParams();
  const [filter, setFilter] = useState<(typeof STATUS_FILTERS)[number]["id"]>("all");
  const [sort, setSort] = useState<(typeof SORTS)[number]["id"]>("recent");
  const [priorityFilter, setPriorityFilter] = useState<"all" | "LOW" | "NORMAL" | "HIGH">("all");
  const [assigneeFilter, setAssigneeFilter] = useState<"all" | "ai" | string>("all");
  const [dateRange, setDateRange] = useState<(typeof DATE_RANGES)[number]["id"]>("all");
  const [dateField, setDateField] = useState<"updatedAt" | "createdAt">("updatedAt");
  const [labelFilter, setLabelFilter] = useState<string[]>([]);
  const [labelFilterOpen, setLabelFilterOpen] = useState(false);
  const [allLabels, setAllLabels] = useState<{ id: string; name: string; color: string }[]>([]);
  const [list, setList] = useState<ListItem[] | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<{
    conversation: ConversationDetail;
    messages: Msg[];
    previous: { id: string; createdAt: string; status: string }[];
  } | null>(null);
  const [agents, setAgents] = useState<{ id: string; name: string; image: string | null }[]>([]);
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);
  const [typingAgent, setTypingAgent] = useState<string | null>(null);
  const [presence, setPresence] = useState<{ online: boolean; lastSeenAt: string | null } | null>(null);

  const session = authClient.useSession();
  const myUserId = session.data?.user?.id;

  const selectedIdRef = useRef<string | null>(null);
  const lastTypingSentRef = useRef(0);
  const myUserIdRef = useRef<string | undefined>(myUserId);
  useEffect(() => {
    selectedIdRef.current = selectedId;
  }, [selectedId]);
  useEffect(() => {
    myUserIdRef.current = myUserId;
  }, [myUserId]);

  function loadList() {
    const qs = filter === "all" ? "" : `?status=${filter}`;
    fetch(`/api/conversations${qs}`)
      .then((r) => r.json())
      .then((d) => setList(d.conversations));
  }

  useEffect(loadList, [filter]);

  useEffect(() => {
    fetch("/api/team")
      .then((r) => r.json())
      .then((d) => setAgents(d.users.filter((u: { role: string }) => u.role !== "AI_AGENT")));
    fetch("/api/labels")
      .then((r) => r.json())
      .then((d) => setAllLabels(d.labels));
  }, []);

  const visibleList = (list ?? [])
    .filter((c) => priorityFilter === "all" || c.priority === priorityFilter)
    .filter((c) => {
      if (assigneeFilter === "all") return true;
      if (assigneeFilter === "ai") return !c.assignee;
      return c.assignee?.id === assigneeFilter;
    })
    .filter((c) => labelFilter.length === 0 || labelFilter.every((id) => c.labels.some((l) => l.id === id)))
    .filter((c) => withinRange(c[dateField], dateRange))
    .sort((a, b) => {
      if (sort === "priority") return PRIORITY_RANK[a.priority ?? "LOW"] - PRIORITY_RANK[b.priority ?? "LOW"];
      if (sort === "created_asc") return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      if (sort === "created_desc") return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });

  function loadDetail(id: string) {
    setSelectedId(id);
    setTypingAgent(null);
    setPresence(null);
    fetch(`/api/conversations/${id}`)
      .then((r) => r.json())
      .then((d) => {
        setDetail({ conversation: d.conversation, messages: d.conversation.messages, previous: d.previous });
        setPresence(d.presence);
      });
  }

  // Deep link from the notification toast: /conversations?open=<id>
  useEffect(() => {
    const open = searchParams.get("open");
    if (open) loadDetail(open);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  // Live updates: refresh the list preview in place, append to the open thread, and
  // surface typing indicators — no polling, no manual reload.
  useEffect(() => {
    const source = new EventSource("/api/conversations/events");
    source.onmessage = (e) => {
      const event = JSON.parse(e.data) as ConversationEvent;

      if (event.type === "typing") {
        if (event.conversationId !== selectedIdRef.current) return;
        // Never show an agent their own typing indicator echoed back to themselves.
        if (event.source === "agent" && event.agentId === myUserIdRef.current) return;
        const label = event.source === "agent" ? event.agentName : "Visitor";
        setTypingAgent(label);
        setTimeout(() => setTypingAgent((a) => (a === label ? null : a)), 3000);
        return;
      }

      if (event.type === "presence") {
        if (event.conversationId === selectedIdRef.current) setPresence({ online: event.online, lastSeenAt: event.lastSeenAt });
        return;
      }

      if (event.conversationId === selectedIdRef.current) {
        setTypingAgent(null);
        setDetail((d) =>
          d && !d.messages.some((m) => m.id === event.message.id)
            ? { ...d, messages: [...d.messages, event.message] }
            : d,
        );
      }

      setList((current) => {
        if (!current) return current;
        const idx = current.findIndex((c) => c.id === event.conversationId);
        if (idx === -1) {
          loadList(); // a brand-new conversation isn't in the list yet — just refetch it
          return current;
        }
        const next = [...current];
        const [item] = next.splice(idx, 1);
        next.unshift({
          ...item,
          updatedAt: event.message.createdAt,
          messages: [{ content: event.message.content, role: event.message.role }],
        });
        return next;
      });
    };
    return () => source.close();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function notifyTyping() {
    if (!selectedId) return;
    const now = Date.now();
    if (now - lastTypingSentRef.current < 1200) return;
    lastTypingSentRef.current = now;
    fetch(`/api/conversations/${selectedId}/typing`, { method: "POST" });
  }

  async function send() {
    if (!reply.trim() || !selectedId || sending) return;
    setSending(true);
    const text = reply;
    setReply("");
    const res = await fetch(`/api/conversations/${selectedId}/reply`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ content: text }),
    });
    const { message } = await res.json();
    setDetail((d) => (d ? { ...d, messages: [...d.messages, message] } : d));
    setSending(false);
    loadList();
  }

  async function updateConversation(patch: {
    status?: "AI" | "PENDING_HANDOFF" | "NEEDS_HUMAN" | "HUMAN" | "RESOLVED";
    assigneeId?: string | null;
    priority?: "LOW" | "NORMAL" | "HIGH" | null;
    labelIds?: string[];
  }) {
    if (!selectedId) return;
    const res = await fetch(`/api/conversations/${selectedId}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(patch),
    });
    const { conversation } = await res.json();
    setDetail((d) => (d ? { ...d, conversation: { ...d.conversation, ...conversation } } : d));
    loadList();
  }

  function resolveConversation() {
    updateConversation({ status: "RESOLVED" });
  }

  async function deleteConversation() {
    if (!selectedId) return;
    if (!confirm("Delete this conversation permanently? This can't be undone.")) return;
    await fetch(`/api/conversations/${selectedId}`, { method: "DELETE" });
    setDetail(null);
    setSelectedId(null);
    loadList();
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <div className="flex w-80 shrink-0 flex-col border-r border-line">
        <div className="flex flex-col gap-2 border-b border-line p-4">
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value as typeof filter)}
            className="h-8 w-full rounded-full border border-edge bg-well px-3 text-xs font-light text-ink outline-none"
          >
            {STATUS_FILTERS.map((f) => (
              <option key={f.id} value={f.id}>
                {f.label}
              </option>
            ))}
          </select>

          <div className="flex flex-wrap gap-1.5">
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as typeof sort)}
              className="h-7 rounded-full border border-line bg-transparent px-2.5 text-[11px] font-light text-soft outline-none"
            >
              {SORTS.map((s) => (
                <option key={s.id} value={s.id}>
                  Sort: {s.label}
                </option>
              ))}
            </select>

            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value as typeof priorityFilter)}
              className="h-7 rounded-full border border-line bg-transparent px-2.5 text-[11px] font-light text-soft outline-none"
            >
              <option value="all">Any priority</option>
              <option value="HIGH">High</option>
              <option value="NORMAL">Normal</option>
              <option value="LOW">Low</option>
            </select>

            <select
              value={assigneeFilter}
              onChange={(e) => setAssigneeFilter(e.target.value)}
              className="h-7 rounded-full border border-line bg-transparent px-2.5 text-[11px] font-light text-soft outline-none"
            >
              <option value="all">Anyone assigned</option>
              <option value="ai">AI Agent</option>
              {agents.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>

            <div className="flex items-center gap-1">
              <select
                value={dateField}
                onChange={(e) => setDateField(e.target.value as typeof dateField)}
                className="h-7 rounded-full border border-line bg-transparent px-2 text-[11px] font-light text-soft outline-none"
              >
                <option value="updatedAt">Modified</option>
                <option value="createdAt">Created</option>
              </select>
              <select
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value as typeof dateRange)}
                className="h-7 rounded-full border border-line bg-transparent px-2.5 text-[11px] font-light text-soft outline-none"
              >
                {DATE_RANGES.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="relative">
              <button
                onClick={() => setLabelFilterOpen((o) => !o)}
                className={`h-7 rounded-full border px-2.5 text-[11px] font-light transition-colors ${
                  labelFilter.length > 0 ? "border-accent-orange-line bg-accent-orange text-ink" : "border-line text-soft hover:bg-hover"
                }`}
              >
                Labels{labelFilter.length > 0 ? ` (${labelFilter.length})` : ""}
              </button>
              {labelFilterOpen && (
                <div className="absolute top-8 left-0 z-10 flex w-44 flex-col gap-1 rounded-[0.75rem] border border-line bg-sheet p-2 shadow-lg">
                  {allLabels.length === 0 && <p className="px-2 py-1 text-xs font-light text-faint">No labels yet.</p>}
                  {allLabels.map((l) => (
                    <button
                      key={l.id}
                      onClick={() =>
                        setLabelFilter((cur) => (cur.includes(l.id) ? cur.filter((id) => id !== l.id) : [...cur, l.id]))
                      }
                      className={`flex items-center gap-2 rounded-full px-2.5 py-1.5 text-left text-xs font-light transition-colors hover:bg-hover ${
                        labelFilter.includes(l.id) ? "bg-hover" : ""
                      }`}
                    >
                      <span className="size-1.5 shrink-0 rounded-full" style={{ background: l.color }} />
                      {l.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {visibleList.length === 0 && <p className="p-6 text-xs font-light text-faint">No conversations match these filters.</p>}
          {visibleList.map((c) => {
            const last = c.messages[0];
            const name = c.contact?.name || c.contact?.email || "Anonymous visitor";
            return (
              <button
                key={c.id}
                onClick={() => loadDetail(c.id)}
                className={`flex w-full flex-col gap-1 border-b border-line px-4 py-3 text-left transition-colors hover:bg-hover ${
                  selectedId === c.id ? "bg-hover" : ""
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className={`size-1.5 shrink-0 rounded-full ${STATUS_DOT[c.status]}`} />
                  <span className="min-w-0 flex-1 truncate text-sm font-normal">{name}</span>
                  <span className="shrink-0 text-xs font-light text-faint">{timeAgo(c.updatedAt)}</span>
                </div>
                {last && <p className="truncate text-xs font-light text-faint">{last.content}</p>}
                {c.labels.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {c.labels.map((l) => (
                      <span
                        key={l.id}
                        className="rounded-full px-1.5 py-0.5 text-[10px] font-light"
                        style={{ background: `${l.color}26`, color: l.color }}
                      >
                        {l.name}
                      </span>
                    ))}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex min-w-0 flex-1 flex-col">
        {!detail ? (
          <div className="flex flex-1 items-center justify-center text-sm font-light text-faint">
            Select a conversation
          </div>
        ) : (
          <>
            <div className="flex min-h-0 flex-1 flex-col-reverse overflow-y-auto px-8 py-6">
              <div className="flex flex-col gap-5">
                {detail.messages.map((m) => {
                  const visitorName = detail.conversation.contact?.name || detail.conversation.contact?.email || "Visitor";
                  const owner = m.role === "VISITOR" ? visitorName : m.role === "AGENT" ? m.agent?.name ?? "Agent" : "AI Agent";
                  return (
                    <div key={m.id} className={m.role === "VISITOR" ? "self-end text-right" : ""}>
                      <div className="mb-1 text-xs font-light text-faint">{owner}</div>
                      <p className={`inline-block max-w-lg text-sm font-light ${m.role === "VISITOR" ? "" : "text-left"}`}>
                        {m.content}
                      </p>
                    </div>
                  );
                })}
                {typingAgent && (
                  <p className="flex items-center gap-2 text-xs font-light text-faint">
                    <span className="size-1.5 animate-pulse rounded-full bg-ember" />
                    {typingAgent} is typing…
                  </p>
                )}
              </div>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                send();
              }}
              className="mx-8 mb-6 flex shrink-0 items-center rounded-full border border-edge bg-well px-5 py-3 focus-within:border-sky-deep"
            >
              <input
                value={reply}
                onChange={(e) => {
                  setReply(e.target.value);
                  notifyTyping();
                }}
                placeholder="Reply as an agent…"
                className="flex-1 bg-transparent text-sm font-light outline-none placeholder:text-faint"
              />
            </form>
          </>
        )}
      </div>

      {detail && (
        <div className="w-80 shrink-0 border-l border-line">
          <ConversationSidebar
            conversation={detail.conversation}
            previous={detail.previous}
            agents={agents}
            presence={presence ?? undefined}
            onUpdate={updateConversation}
            onOpenPrevious={loadDetail}
            onResolve={resolveConversation}
            onDelete={deleteConversation}
          />
        </div>
      )}
    </div>
  );
}
