"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { authClient } from "@/lib/auth-client";
import { UserAvatar } from "@/components/user-avatar";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-4 border-b border-line pb-8 last:border-b-0">
      <h3 className="text-sm font-normal">{title}</h3>
      {children}
    </section>
  );
}

export function AccountPanel() {
  const router = useRouter();
  const { data } = authClient.useSession();
  const user = data?.user;

  if (!user) return null;
  return (
    <div className="flex flex-col gap-8">
      <h2 className="text-lg font-normal">Account</h2>
      <ProfileSection key={user.id} name={user.name} email={user.email} image={user.image ?? null} />
      <PasswordSection />
      <Section title="Session">
        <Button
          variant="outline"
          className="self-start rounded-full px-5 text-soft"
          onClick={async () => {
            await authClient.signOut();
            router.push("/login");
          }}
        >
          Log out
        </Button>
      </Section>
    </div>
  );
}

function ProfileSection({ name: initialName, email: initialEmail, image }: { name: string; email: string; image: string | null }) {
  const [name, setName] = useState(initialName);
  const [email, setEmail] = useState(initialEmail);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  async function uploadAvatar(file: File) {
    setUploading(true);
    const form = new FormData();
    form.append("file", file);
    const res = await fetch("/api/account/avatar", { method: "POST", body: form });
    if (!res.ok) {
      setUploading(false);
      toast.error((await res.json().catch(() => ({}))).error ?? "Couldn't upload that image");
      return;
    }
    const { url } = await res.json();
    const { error } = await authClient.updateUser({ image: url });
    setUploading(false);
    if (error) toast.error(error.message ?? "Couldn't update your picture");
    else toast.success("Picture updated");
  }

  async function save() {
    setSaving(true);
    let failed = false;
    if (name.trim() !== initialName) {
      const { error } = await authClient.updateUser({ name: name.trim() });
      if (error) {
        failed = true;
        toast.error(error.message ?? "Couldn't update your name");
      }
    }
    if (email.trim().toLowerCase() !== initialEmail) {
      const { error } = await authClient.changeEmail({ newEmail: email.trim().toLowerCase() });
      if (error) {
        failed = true;
        toast.error(error.message ?? "Couldn't update your email");
      }
    }
    setSaving(false);
    if (!failed) toast.success("Saved");
  }

  const dirty = name.trim() !== initialName || email.trim().toLowerCase() !== initialEmail;

  return (
    <Section title="Profile">
      <div className="flex items-center gap-4">
        <UserAvatar name={name || initialName} image={image} className="size-16 text-lg" />
        <input
          ref={fileRef}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          className="hidden"
          onChange={(e) => e.target.files?.[0] && uploadAvatar(e.target.files[0])}
        />
        <Button
          variant="outline"
          disabled={uploading}
          onClick={() => fileRef.current?.click()}
          className="rounded-full px-4 text-soft"
        >
          {uploading ? "Uploading…" : "Change picture"}
        </Button>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-2">
          <label className="text-xs font-normal text-soft">Name</label>
          <Input value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="flex flex-col gap-2">
          <label className="text-xs font-normal text-soft">Email</label>
          <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
      </div>
      <Button onClick={save} disabled={!dirty || saving || !name.trim() || !email.trim()} className="self-start rounded-full px-5">
        {saving ? "Saving…" : "Save changes"}
      </Button>
    </Section>
  );
}

function PasswordSection() {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [saving, setSaving] = useState(false);

  async function change() {
    setSaving(true);
    const { error } = await authClient.changePassword({
      currentPassword: current,
      newPassword: next,
      revokeOtherSessions: true,
    });
    setSaving(false);
    if (error) {
      toast.error(error.message ?? "Couldn't change your password");
      return;
    }
    setCurrent("");
    setNext("");
    toast.success("Password changed — other devices were signed out");
  }

  return (
    <Section title="Password">
      <div className="grid grid-cols-2 gap-3">
        <Input
          type="password"
          placeholder="Current password"
          autoComplete="current-password"
          value={current}
          onChange={(e) => setCurrent(e.target.value)}
        />
        <Input
          type="password"
          placeholder="New password (8+ chars)"
          autoComplete="new-password"
          value={next}
          onChange={(e) => setNext(e.target.value)}
        />
      </div>
      <Button onClick={change} disabled={saving || !current || next.length < 8} className="self-start rounded-full px-5">
        {saving ? "Changing…" : "Change password"}
      </Button>
    </Section>
  );
}
