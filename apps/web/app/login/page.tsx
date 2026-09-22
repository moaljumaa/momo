"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";

export default function Login() {
  const router = useRouter();
  const [signup, setSignup] = useState(false);
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const email = String(f.get("email"));
    const password = String(f.get("password"));
    const res = signup
      ? await authClient.signUp.email({ email, password, name: String(f.get("name")) })
      : await authClient.signIn.email({ email, password });
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
      <button className="text-sm text-muted-foreground" onClick={() => setSignup(!signup)}>
        {signup ? "Have an account? Sign in" : "First time? Set up the admin account"}
      </button>
    </main>
  );
}
