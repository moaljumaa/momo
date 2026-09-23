"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { authClient } from "@/lib/auth-client";
import { Plus } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { UserAvatar } from "@/components/user-avatar";

type Member = { id: string; name: string; email: string; image: string | null; role: "ADMIN" | "HUMAN_AGENT" | "AI_AGENT" };

const ROLE_LABEL: Record<Member["role"], string> = {
  ADMIN: "Admin",
  HUMAN_AGENT: "Agent",
  AI_AGENT: "AI",
};

export function TeamPanel() {
  const session = authClient.useSession();
  const isAdmin = session.data?.user && (session.data.user as { role?: string }).role === "ADMIN";

  const [members, setMembers] = useState<Member[] | null>(null);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function load() {
    fetch("/api/team")
      .then((r) => r.json())
      .then((d) => setMembers(d.users));
  }

  useEffect(load, []);

  async function invite() {
    setSaving(true);
    setError(null);
    const res = await fetch("/api/team", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name, email, password, role: "HUMAN_AGENT" }),
    });
    setSaving(false);
    if (!res.ok) {
      setError((await res.json()).error ?? "Something went wrong");
      return;
    }
    setName("");
    setEmail("");
    setPassword("");
    setOpen(false);
    load();
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-normal">Team</h2>
        {isAdmin && (
          <Button onClick={() => setOpen((o) => !o)} className="gap-1.5 rounded-full px-4">
            <Plus className="size-4" />
            Add teammate
          </Button>
        )}
      </div>

      {open && (
        <div className="flex flex-col gap-3 rounded-[1.25rem] border border-line bg-well p-5">
          <div className="grid grid-cols-2 gap-3">
            <Input placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} />
            <Input placeholder="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <Input
            placeholder="Temporary password (8+ chars)"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <p className="text-xs font-light text-faint">
            Conversations and contacts only — can't see the playground or configuration.
          </p>
          {error && <p className="text-xs font-light text-clay">{error}</p>}
          <Button onClick={invite} disabled={saving} className="self-start rounded-full px-5">
            {saving ? "Adding…" : "Add teammate"}
          </Button>
        </div>
      )}

      <div className="flex flex-col gap-2">
        {members?.map((m) => (
          <div key={m.id} className="flex items-center gap-3 rounded-[1rem] border border-line px-4 py-3">
            <UserAvatar name={m.name} image={m.image} />
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-normal">{m.name}</div>
              <div className="truncate text-xs font-light text-faint">{m.email}</div>
            </div>
            <span className="rounded-full border border-line px-2.5 py-1 text-xs font-light text-soft">
              {ROLE_LABEL[m.role]}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
