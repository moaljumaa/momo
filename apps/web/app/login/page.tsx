"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";

export default function Login() {
  const router = useRouter();
  const [signup, setSignup] = useState(false);
  const [error, setError] = useState("");
  const [setupOpen, setSetupOpen] = useState(false);

  // The "create the admin" option only exists until the first account has been made.
  useEffect(() => {
    fetch("/api/setup").then((r) => r.json()).then((d) => setSetupOpen(!!d.open)).catch(() => {});
  }, []);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const email = String(f.get("email"));
    const password = String(f.get("password"));
    if (signup) {
      const created = await fetch("/api/setup", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, password, name: String(f.get("name")) }),
      });
      if (!created.ok) return setError((await created.json()).error ?? "Something went wrong");
    }
    const res = await authClient.signIn.email({ email, password });
    if (res.error) return setError(res.error.message ?? "Something went wrong");
    router.push("/");
    router.refresh();
  }

  const input = "w-full rounded-full border bg-transparent px-5 py-3 outline-none";
  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-4 p-8">
      <h1 className="text-2xl font-light">{signup ? "Create the admin account" : "Sign in"}</h1>
      <form onSubmit={submit} className="flex flex-col gap-3">
        {signup && <input name="name" placeholder="Name" required className={input} />}
        <input name="email" type="email" placeholder="Email" required className={input} />
        <input name="password" type="password" placeholder="Password" minLength={8} required className={input} />
        {error && <p className="text-sm text-destructive">{error}</p>}
        <Button type="submit">{signup ? "Create account" : "Sign in"}</Button>
      </form>
      {setupOpen && (
        <button className="text-sm text-muted-foreground" onClick={() => setSignup(!signup)}>
          {signup ? "Have an account? Sign in" : "First time? Set up the admin account"}
        </button>
      )}
    </main>
  );
}
