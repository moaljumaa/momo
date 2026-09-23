"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronsLeft, ChevronsRight, Inbox, Play, Settings, Users } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { UserAvatar } from "@/components/user-avatar";
import { useSettingsModal } from "@/components/settings-modal-provider";
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "@/components/ui/tooltip";

const nav = [
  { href: "/playground", label: "Playground", icon: Play, adminOnly: true },
  { href: "/conversations", label: "Conversations", icon: Inbox },
  { href: "/contacts", label: "Contacts", icon: Users },
];

export function Sidebar({
  name: initialName,
  email: initialEmail,
  image: initialImage,
  isAdmin,
}: {
  name: string;
  email: string;
  image: string | null;
  isAdmin: boolean;
}) {
  const path = usePathname();
  const { tab, open } = useSettingsModal();
  // Server-rendered values first, then the live session so profile edits show up immediately.
  const live = authClient.useSession().data?.user;
  const name = live?.name ?? initialName;
  const email = live?.email ?? initialEmail;
  const image = live ? (live.image ?? null) : initialImage;
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
    } ${active ? "bg-hover text-ink" : "text-soft"}`;

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
            {nav.filter((n) => isAdmin || !n.adminOnly).map((n) => {
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

          {isAdmin && (
          <div className={`mt-6 border-t border-line pt-6 ${collapsed ? "w-full" : ""}`}>
            <nav className="flex flex-col gap-0.5">
              {(() => {
                const item = (
                  <button onClick={() => open("sources")} className={itemClass(!!tab) + " text-left"}>
                    <Settings className="size-4 shrink-0" />
                    {!collapsed && "Configuration"}
                  </button>
                );
                return collapsed ? (
                  <Tooltip>
                    <TooltipTrigger render={item} />
                    <TooltipContent side="right">Configuration</TooltipContent>
                  </Tooltip>
                ) : (
                  item
                );
              })()}
            </nav>
          </div>
          )}
        </div>

        {(() => {
          const item = (
            <button
              onClick={() => open("account")}
              className={`flex items-center gap-2.5 rounded-full p-1.5 text-left transition-colors hover:bg-hover ${
                collapsed ? "justify-center" : "w-full"
              } ${tab === "account" ? "bg-hover" : ""}`}
            >
              <UserAvatar name={name} image={image} />
              {!collapsed && (
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-light text-ink">{name}</span>
                  <span className="block truncate text-xs font-light text-faint">{email}</span>
                </span>
              )}
            </button>
          );
          return collapsed ? (
            <Tooltip>
              <TooltipTrigger render={item} />
              <TooltipContent side="right">Account</TooltipContent>
            </Tooltip>
          ) : (
            item
          );
        })()}
      </aside>
    </TooltipProvider>
  );
}
