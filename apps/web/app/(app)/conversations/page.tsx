"use client";

import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ConversationSidebar, type ConversationDetail } from "./ConversationSidebar";
import type { ConversationEvent } from "@/lib/conversation-events";

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
  updatedAt: string;
  contact: { name: string | null; email: string | null } | null;
  visitorCountry: string | null;
  assignee: { id: string; name: string; image: string | null } | null;
  labels: { id: string; name: string; color: string }[];
  messages: { content: string; role: string }[];
};

const FILTERS = [
  { id: "all", label: "All" },
  { id: "NEEDS_HUMAN", label: "Needs human" },
  { id: "HUMAN", label: "Human" },
  { id: "RESOLVED", label: "Resolved" },
] as const;

const STATUS_DOT: Record<ConversationDetail["status"], string> = {
  AI: "bg-faint",
  NEEDS_HUMAN: "bg-clay",
  HUMAN: "bg-sky",
  RESOLVED: "bg-edge",
};

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
  const [filter, setFilter] = useState<(typeof FILTERS)[number]["id"]>("all");
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

  const selectedIdRef = useRef<string | null>(null);
  const lastTypingSentRef = useRef(0);
  useEffect(() => {
    selectedIdRef.current = selectedId;
  }, [selectedId]);

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
  }, []);

  function loadDetail(id: string) {
    setSelectedId(id);
    setTypingAgent(null);
    fetch(`/api/conversations/${id}`)
      .then((r) => r.json())
      .then((d) => setDetail({ conversation: d.conversation, messages: d.conversation.messages, previous: d.previous }));
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
        setTypingAgent(event.agentName);
        setTimeout(() => setTypingAgent((a) => (a === event.agentName ? null : a)), 3000);
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

  return (
    <div className="flex h-screen overflow-hidden">
      <div className="flex w-80 shrink-0 flex-col border-r border-line">
        <div className="flex shrink-0 gap-1 p-4">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className={`rounded-full px-3 py-1.5 text-xs font-light transition-colors hover:bg-hover ${
                filter === f.id ? "bg-hover font-normal text-ember" : "text-soft"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto">
          {list?.length === 0 && <p className="p-6 text-xs font-light text-faint">No conversations yet.</p>}
          {list?.map((c) => {
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
                {detail.messages.map((m) => (
                  <div key={m.id} className={m.role === "VISITOR" ? "self-end text-right" : ""}>
                    {m.role === "AGENT" && (
                      <div className="mb-1 text-xs font-light text-faint">{m.agent?.name ?? "Agent"}</div>
                    )}
                    <p className={`inline-block max-w-lg text-sm font-light ${m.role === "VISITOR" ? "" : "text-left"}`}>
                      {m.content}
                    </p>
                  </div>
                ))}
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
            onUpdate={updateConversation}
            onOpenPrevious={loadDetail}
          />
        </div>
      )}
    </div>
  );
}
