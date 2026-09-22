"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";

const nav = [
  { href: "/playground", label: "Playground" },
  { href: "/instructions", label: "Instructions" },
  { href: "/sources", label: "Data sources" },
  { href: "/channels", label: "Channels" },
  { href: "/actions", label: "Actions" },
  { href: "/guardrails", label: "Guardrails" },
  { href: "/conversations", label: "Conversations" },
  { href: "/contacts", label: "Contacts" },
  { href: "/analytics", label: "Analytics" },
  { href: "/settings", label: "Settings" },
];

export function Sidebar({ email }: { email: string }) {
  const path = usePathname();
  const router = useRouter();
  return (
    <aside className="sticky top-0 flex h-screen w-60 shrink-0 flex-col justify-between border-r border-line p-5">
      <div>
        <div className="mb-8 px-3 text-lg font-normal">momo</div>
        <nav className="flex flex-col gap-0.5">
          {nav.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              className={`rounded-full px-3 py-1.5 text-sm font-light transition-colors hover:bg-hover ${
                path === n.href ? "bg-hover font-normal text-ember" : "text-soft"
              }`}
            >
              {n.label}
            </Link>
          ))}
        </nav>
      </div>
      <div className="px-3 text-xs font-light text-faint">
        <div className="truncate">{email}</div>
        <button
          className="mt-1 underline decoration-dotted"
          onClick={async () => {
            await authClient.signOut();
            router.push("/login");
          }}
        >
          Sign out
        </button>
      </div>
    </aside>
  );
}
