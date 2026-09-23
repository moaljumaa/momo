"use client";

import { useEffect, useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Plus, X } from "lucide-react";

type User = { id: string; name: string; image: string | null };
type Label = { id: string; name: string; color: string };
type Contact = { id: string; name: string | null; email: string | null } | null;

export type ConversationDetail = {
  id: string;
  status: "AI" | "NEEDS_HUMAN" | "HUMAN" | "RESOLVED";
  priority: "LOW" | "NORMAL" | "HIGH" | null;
  assignee: User | null;
  participants: User[];
  labels: Label[];
  contact: Contact;
  visitorCountry: string | null;
  visitorCity: string | null;
  visitorIp: string | null;
  visitorUserAgent: string | null;
  visitorLanguage: string | null;
  visitorTimezone: string | null;
  visitorReferrer: string | null;
  visitorPageUrl: string | null;
};

function parseUserAgent(ua: string | null) {
  if (!ua) return null;
  const browser = /Edg\//.test(ua)
    ? "Edge"
    : /Chrome\//.test(ua)
      ? "Chrome"
      : /Firefox\//.test(ua)
        ? "Firefox"
        : /Safari\//.test(ua) && !/Chrome/.test(ua)
          ? "Safari"
          : "Browser";
  const os = /Windows/.test(ua)
    ? "Windows"
    : /Mac OS X/.test(ua)
      ? "macOS"
      : /Android/.test(ua)
        ? "Android"
        : /iPhone|iPad/.test(ua)
          ? "iOS"
          : /Linux/.test(ua)
            ? "Linux"
            : "Unknown OS";
  return `${browser} on ${os}`;
}

export function ConversationSidebar({
  conversation,
  previous,
  agents,
  onUpdate,
  onOpenPrevious,
}: {
  conversation: ConversationDetail;
  previous: { id: string; createdAt: string; status: string }[];
  agents: User[];
  onUpdate: (patch: {
    assigneeId?: string | null;
    priority?: "LOW" | "NORMAL" | "HIGH" | null;
    labelIds?: string[];
  }) => void;
  onOpenPrevious: (id: string) => void;
}) {
  const [labels, setLabels] = useState<Label[]>([]);
  const [labelPicker, setLabelPicker] = useState(false);
  const [newLabel, setNewLabel] = useState("");

  useEffect(() => {
    fetch("/api/labels")
      .then((r) => r.json())
      .then((d) => setLabels(d.labels));
  }, []);

  function toggleLabel(labelId: string) {
    const current = conversation.labels.map((l) => l.id);
    const next = current.includes(labelId) ? current.filter((id) => id !== labelId) : [...current, labelId];
    onUpdate({ labelIds: next });
  }

  async function createLabel() {
    if (!newLabel.trim()) return;
    const res = await fetch("/api/labels", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: newLabel.trim() }),
    });
    const { label } = await res.json();
    setLabels((ls) => (ls.some((l) => l.id === label.id) ? ls : [...ls, label]));
    onUpdate({ labelIds: [...conversation.labels.map((l) => l.id), label.id] });
    setNewLabel("");
  }

  const visitorName = conversation.contact?.name || conversation.contact?.email || "Anonymous visitor";
  const location = [conversation.visitorCity, conversation.visitorCountry].filter(Boolean).join(", ");
  const browserLine = parseUserAgent(conversation.visitorUserAgent);

  return (
    <div className="flex h-full flex-col gap-6 overflow-y-auto p-6">
      <Section title="Contact">
        <div className="flex items-center gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-hover text-sm font-normal">
            {visitorName.slice(0, 1).toUpperCase()}
          </div>
          <div className="min-w-0">
            <div className="truncate text-sm font-normal">{visitorName}</div>
            {conversation.contact?.email && (
              <div className="truncate text-xs font-light text-faint">{conversation.contact.email}</div>
            )}
          </div>
        </div>
      </Section>

      <Section title="Conversation actions">
        <Field label="Assigned agent">
          <Select
            value={conversation.assignee?.id ?? "ai"}
            onValueChange={(v) => onUpdate({ assigneeId: v === "ai" ? null : v })}
          >
            <SelectTrigger className="h-9 w-full">
              <SelectValue>{(v: string) => (v === "ai" ? "AI Agent" : agents.find((a) => a.id === v)?.name)}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ai">AI Agent</SelectItem>
              {agents.map((a) => (
                <SelectItem key={a.id} value={a.id}>
                  {a.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>

        <Field label="Priority">
          <Select
            value={conversation.priority ?? "none"}
            onValueChange={(v) => onUpdate({ priority: v === "none" ? null : (v as "LOW" | "NORMAL" | "HIGH") })}
          >
            <SelectTrigger className="h-9 w-full">
              <SelectValue>{(v: string) => (v === "none" ? "None" : v.charAt(0) + v.slice(1).toLowerCase())}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">None</SelectItem>
              <SelectItem value="LOW">Low</SelectItem>
              <SelectItem value="NORMAL">Normal</SelectItem>
              <SelectItem value="HIGH">High</SelectItem>
            </SelectContent>
          </Select>
        </Field>

        <Field label="Labels">
          <div className="flex flex-wrap items-center gap-1.5">
            {conversation.labels.map((l) => (
              <span
                key={l.id}
                className="flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-light"
                style={{ background: `${l.color}26`, color: l.color }}
              >
                {l.name}
                <button onClick={() => toggleLabel(l.id)} className="opacity-70 hover:opacity-100">
                  <X className="size-3" />
                </button>
              </span>
            ))}
            <button
              onClick={() => setLabelPicker((o) => !o)}
              className="flex items-center gap-1 rounded-full border border-dashed border-edge px-2.5 py-1 text-xs font-light text-faint hover:bg-hover"
            >
              <Plus className="size-3" />
              Add
            </button>
          </div>
          {labelPicker && (
            <div className="mt-2 flex flex-col gap-2 rounded-[0.75rem] border border-line bg-well p-3">
              <div className="flex flex-col gap-1">
                {labels.map((l) => (
                  <button
                    key={l.id}
                    onClick={() => toggleLabel(l.id)}
                    className={`flex items-center gap-2 rounded-full px-2.5 py-1.5 text-left text-xs font-light transition-colors hover:bg-hover ${
                      conversation.labels.some((cl) => cl.id === l.id) ? "bg-hover" : ""
                    }`}
                  >
                    <span className="size-1.5 shrink-0 rounded-full" style={{ background: l.color }} />
                    {l.name}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-1.5">
                <Input
                  value={newLabel}
                  onChange={(e) => setNewLabel(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && createLabel()}
                  placeholder="New label…"
                  className="h-8 text-xs"
                />
                <button onClick={createLabel} className="shrink-0 rounded-full p-1.5 hover:bg-hover">
                  <Plus className="size-3.5" />
                </button>
              </div>
            </div>
          )}
        </Field>
      </Section>

      <Section title="Visitor info">
        <dl className="flex flex-col gap-2 text-xs font-light">
          {location && <Row label="Location" value={location} />}
          {conversation.visitorIp && <Row label="IP" value={conversation.visitorIp} />}
          {browserLine && <Row label="Browser" value={browserLine} />}
          {conversation.visitorLanguage && <Row label="Language" value={conversation.visitorLanguage} />}
          {conversation.visitorTimezone && <Row label="Timezone" value={conversation.visitorTimezone} />}
          {conversation.visitorPageUrl && <Row label="Page" value={conversation.visitorPageUrl} truncate />}
          {conversation.visitorReferrer && <Row label="Referrer" value={conversation.visitorReferrer} truncate />}
          {!location &&
            !conversation.visitorIp &&
            !browserLine &&
            !conversation.visitorLanguage && <p className="text-faint">No visitor data captured yet.</p>}
        </dl>
      </Section>

      <Section title="Previous conversations">
        {previous.length === 0 ? (
          <p className="text-xs font-light text-faint">No previous conversations from this visitor.</p>
        ) : (
          <div className="flex flex-col gap-1">
            {previous.map((p) => (
              <button
                key={p.id}
                onClick={() => onOpenPrevious(p.id)}
                className="flex items-center justify-between rounded-full px-2.5 py-1.5 text-left text-xs font-light transition-colors hover:bg-hover"
              >
                <span>{new Date(p.createdAt).toLocaleDateString()}</span>
                <span className="text-faint">{p.status}</span>
              </button>
            ))}
          </div>
        )}
      </Section>

      <Section title="Participants">
        <div className="flex flex-col gap-1.5">
          {conversation.participants.length === 0 && (
            <p className="text-xs font-light text-faint">No agents participating yet.</p>
          )}
          {conversation.participants.map((p) => (
            <div key={p.id} className="flex items-center gap-2 text-xs font-light">
              <div className="flex size-6 shrink-0 items-center justify-center rounded-full bg-hover text-[10px] font-normal">
                {p.name.slice(0, 1).toUpperCase()}
              </div>
              {p.name}
            </div>
          ))}
        </div>
      </Section>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-3 border-b border-line pb-6 last:border-0 last:pb-0">
      <div className="text-xs font-normal text-faint uppercase tracking-wide">{title}</div>
      {children}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="text-xs font-light text-soft">{label}</div>
      {children}
    </div>
  );
}

function Row({ label, value, truncate }: { label: string; value: string; truncate?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <dt className="shrink-0 text-faint">{label}</dt>
      <dd className={`text-right text-ink ${truncate ? "max-w-[65%] truncate" : ""}`}>{value}</dd>
    </div>
  );
}
