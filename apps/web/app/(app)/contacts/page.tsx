"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";

type ListContact = {
  id: string;
  name: string | null;
  email: string | null;
  createdAt: string;
  _count: { conversations: number };
  conversations: { updatedAt: string; status: string }[];
};

type ConversationRow = {
  id: string;
  status: "AI" | "PENDING_HANDOFF" | "NEEDS_HUMAN" | "HUMAN" | "RESOLVED";
  priority: "LOW" | "NORMAL" | "HIGH" | null;
  createdAt: string;
  updatedAt: string;
  assignee: { id: string; name: string; image: string | null } | null;
  labels: { id: string; name: string; color: string }[];
  messages: { content: string; role: string }[];
};

type Detail = { contact: ListContact; conversations: ConversationRow[] };

const STATUS_DOT: Record<ConversationRow["status"], string> = {
  AI: "bg-faint",
  PENDING_HANDOFF: "bg-wheat",
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

export default function ContactsPage() {
  const [contacts, setContacts] = useState<ListContact[] | null>(null);
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<Detail | null>(null);

  function loadList(q: string) {
    const qs = q ? `?q=${encodeURIComponent(q)}` : "";
    fetch(`/api/contacts${qs}`)
      .then((r) => r.json())
      .then((d) => setContacts(d.contacts));
  }

  useEffect(() => {
    const t = setTimeout(() => loadList(query), 200);
    return () => clearTimeout(t);
  }, [query]);

  function loadDetail(id: string) {
    setSelectedId(id);
    fetch(`/api/contacts/${id}`)
      .then((r) => r.json())
      .then((d) => setDetail({ contact: d.contact, conversations: d.conversations }));
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <div className="flex w-80 shrink-0 flex-col border-r border-line">
        <div className="flex items-center gap-2 border-b border-line p-4">
          <div className="flex h-8 flex-1 items-center gap-2 rounded-full border border-edge bg-well px-3">
            <Search className="size-3.5 shrink-0 text-faint" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search contacts…"
              className="h-full flex-1 border-0 bg-transparent p-0 text-xs shadow-none focus-visible:ring-0"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {contacts?.length === 0 && <p className="p-6 text-xs font-light text-faint">No contacts yet.</p>}
          {contacts === null && <p className="p-6 text-xs font-light text-faint">Loading…</p>}
          {contacts?.map((c) => {
            const name = c.name || c.email || "Unnamed contact";
            const last = c.conversations[0];
            return (
              <button
                key={c.id}
                onClick={() => loadDetail(c.id)}
                className={`flex w-full items-center gap-3 border-b border-line px-4 py-3 text-left transition-colors hover:bg-hover ${
                  selectedId === c.id ? "bg-hover" : ""
                }`}
              >
                <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-hover text-sm font-normal">
                  {name.slice(0, 1).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-normal">{name}</div>
                  {c.email && c.name && <div className="truncate text-xs font-light text-faint">{c.email}</div>}
                </div>
                <div className="shrink-0 text-right text-xs font-light text-faint">
                  <div>{c._count.conversations} chat{c._count.conversations === 1 ? "" : "s"}</div>
                  {last && <div>{timeAgo(last.updatedAt)}</div>}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <div className="min-w-0 flex-1 overflow-y-auto">
        {!detail ? (
          <div className="flex h-full items-center justify-center text-sm font-light text-faint">
            Select a contact
          </div>
        ) : (
          <div className="mx-auto flex max-w-2xl flex-col gap-6 p-8">
            <div className="flex items-center gap-4">
              <div className="flex size-14 shrink-0 items-center justify-center rounded-full bg-hover text-lg font-normal">
                {(detail.contact.name || detail.contact.email || "?").slice(0, 1).toUpperCase()}
              </div>
              <div className="min-w-0">
                <div className="text-lg font-normal">{detail.contact.name || "Unnamed contact"}</div>
                {detail.contact.email && <div className="text-sm font-light text-faint">{detail.contact.email}</div>}
              </div>
            </div>

            <div className="text-xs font-light text-faint">
              Contact since {new Date(detail.contact.createdAt).toLocaleDateString()}
            </div>

            <div className="flex flex-col gap-3 border-t border-line pt-6">
              <div className="text-xs font-normal text-faint uppercase tracking-wide">
                Conversations ({detail.conversations.length})
              </div>
              {detail.conversations.length === 0 ? (
                <p className="text-xs font-light text-faint">No conversations yet.</p>
              ) : (
                <div className="flex flex-col gap-0.5">
                  {detail.conversations.map((c) => {
                    const last = c.messages[0];
                    return (
                      <Link
                        key={c.id}
                        href={`/conversations?open=${c.id}`}
                        className="flex flex-col gap-1 rounded-[1rem] border border-line px-4 py-3 transition-colors hover:bg-hover"
                      >
                        <div className="flex items-center gap-2">
                          <span className={`size-1.5 shrink-0 rounded-full ${STATUS_DOT[c.status]}`} />
                          <span className="min-w-0 flex-1 truncate text-sm font-normal">
                            {new Date(c.createdAt).toLocaleDateString()}
                          </span>
                          {c.assignee && <span className="shrink-0 text-xs font-light text-faint">{c.assignee.name}</span>}
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
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
