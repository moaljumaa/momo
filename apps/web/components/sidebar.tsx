"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ChevronsLeft, ChevronsRight, Database, Inbox, MessageSquare, Radio, Users } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { useSettingsModal } from "@/components/settings-modal-provider";
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "@/components/ui/tooltip";

const nav = [
  { href: "/conversations", label: "Conversations", icon: Inbox },
  { href: "/playground", label: "Playground", icon: MessageSquare },
];

const settingsNav = [
  { tab: "sources" as const, label: "Data sources", icon: Database },
  { tab: "channels" as const, label: "Channels", icon: Radio },
  { tab: "team" as const, label: "Team", icon: Users },
];

export function Sidebar({ email }: { email: string }) {
  const path = usePathname();
  const router = useRouter();
  const { tab, open } = useSettingsModal();
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    setCollapsed(localStorage.getItem("momo:sidebar-collapsed") === "1");
  }, []);

  function toggle() {
    setCollapsed((c) => {
      localStorage.setItem("momo:sidebar-collapsed", c ? "0" : "1");
      return !c;
    });
  }

  const itemClass = (active: boolean) =>
    `flex items-center gap-2.5 rounded-full px-3 py-1.5 text-sm font-light transition-colors hover:bg-hover ${
      collapsed ? "justify-center px-0 py-2" : ""
    } ${active ? "border border-accent-orange-line bg-accent-orange text-ink" : "text-soft"}`;

  return (
    <TooltipProvider>
      <aside
        className={`sticky top-0 flex h-screen shrink-0 flex-col justify-between bg-well p-3 text-ink transition-[width] duration-200 ${
          collapsed ? "w-16 items-center" : "w-60 p-5"
        }`}
      >
        <div className={collapsed ? "w-full" : ""}>
          <div className={`mb-8 flex items-center ${collapsed ? "justify-center" : "justify-between px-3"}`}>
            {!collapsed && <span className="text-lg font-normal">momo</span>}
            <button
              onClick={toggle}
              className="flex size-7 items-center justify-center rounded-full text-faint transition-colors hover:bg-hover hover:text-ink"
            >
              {collapsed ? <ChevronsRight className="size-4" /> : <ChevronsLeft className="size-4" />}
            </button>
          </div>

          <nav className="flex flex-col gap-0.5">
            {nav.map((n) => {
              const active = path === n.href;
              const item = (
                <Link key={n.href} href={n.href} className={itemClass(active)}>
                  <n.icon className="size-4 shrink-0" />
                  {!collapsed && n.label}
                </Link>
              );
              return collapsed ? (
                <Tooltip key={n.href}>
                  <TooltipTrigger render={item} />
                  <TooltipContent side="right">{n.label}</TooltipContent>
                </Tooltip>
              ) : (
                item
              );
            })}
          </nav>

          <div className={`mt-6 border-t border-line pt-6 ${collapsed ? "w-full" : ""}`}>
            <nav className="flex flex-col gap-0.5">
              {settingsNav.map((n) => {
                const active = tab === n.tab;
                const item = (
                  <button key={n.tab} onClick={() => open(n.tab)} className={itemClass(active) + " text-left"}>
                    <n.icon className="size-4 shrink-0" />
                    {!collapsed && n.label}
                  </button>
                );
                return collapsed ? (
                  <Tooltip key={n.tab}>
                    <TooltipTrigger render={item} />
                    <TooltipContent side="right">{n.label}</TooltipContent>
                  </Tooltip>
                ) : (
                  item
                );
              })}
            </nav>
          </div>
        </div>

        <div className={`text-xs font-light text-faint ${collapsed ? "flex flex-col items-center gap-2" : "px-3"}`}>
          {!collapsed && <div className="truncate">{email}</div>}
          <button
            className={collapsed ? "flex size-7 items-center justify-center rounded-full hover:bg-hover hover:text-ink" : "mt-1 underline decoration-dotted"}
            onClick={async () => {
              await authClient.signOut();
              router.push("/login");
            }}
          >
            {collapsed ? email.slice(0, 1).toUpperCase() : "Sign out"}
          </button>
        </div>
      </aside>
    </TooltipProvider>
  );
}
