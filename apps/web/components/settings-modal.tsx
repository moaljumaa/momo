"use client";

import { Dialog as DialogPrimitive } from "@base-ui/react/dialog";
import { Database, Radio, UserRound, UserRoundCheck, Users, XIcon } from "lucide-react";
import { useSettingsModal, type SettingsTab } from "./settings-modal-provider";
import { SourcesPanel } from "@/app/(app)/sources/SourcesPanel";
import { ChannelsPanel } from "@/app/(app)/channels/ChannelsPanel";
import { TeamPanel } from "@/app/(app)/team/TeamPanel";
import { HandoffPanel } from "@/app/(app)/handoff/HandoffPanel";
import { AccountPanel } from "./account-panel";

const SECTIONS: { id: SettingsTab; label: string; icon: typeof Database }[] = [
  { id: "sources", label: "Data sources", icon: Database },
  { id: "channels", label: "Channels", icon: Radio },
  { id: "team", label: "Team", icon: Users },
  { id: "handoff", label: "Handoff", icon: UserRoundCheck },
];

const ACCOUNT_SECTION = { id: "account" as SettingsTab, label: "Account", icon: UserRound };

// Configuration tabs are admin-only; every role gets Account.
export function SettingsModal({ isAdmin }: { isAdmin: boolean }) {
  const { tab, open, close } = useSettingsModal();

  return (
    <DialogPrimitive.Root open={!!tab} onOpenChange={(o) => !o && close()}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Backdrop className="fixed inset-0 z-50 bg-black/50 data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0" />
        <DialogPrimitive.Popup className="fixed top-1/2 left-1/2 z-50 flex h-[min(720px,88vh)] w-[min(920px,92vw)] -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-[1.25rem] border border-line bg-sheet text-ink shadow-2xl outline-none data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95">
          <DialogPrimitive.Title className="sr-only">Settings</DialogPrimitive.Title>

          <nav className="flex w-56 shrink-0 flex-col gap-0.5 border-r border-line bg-well p-4">
            <div className="mb-4 px-2 text-xs font-normal text-faint">Settings</div>
            {(isAdmin ? [...SECTIONS, ACCOUNT_SECTION] : [ACCOUNT_SECTION]).map((s) => (
              <button
                key={s.id}
                onClick={() => open(s.id)}
                className={`flex items-center gap-2.5 rounded-full px-3 py-2 text-left text-sm font-light transition-colors ${
                  tab === s.id ? "bg-hover text-ink" : "text-soft hover:bg-hover"
                }`}
              >
                <s.icon className="size-4 shrink-0" />
                {s.label}
              </button>
            ))}
          </nav>

          <div className="flex-1 overflow-y-auto p-8">
            {isAdmin && tab === "sources" && <SourcesPanel />}
            {isAdmin && tab === "channels" && <ChannelsPanel />}
            {isAdmin && tab === "team" && <TeamPanel />}
            {isAdmin && tab === "handoff" && <HandoffPanel />}
            {tab === "account" && <AccountPanel />}
          </div>

          <DialogPrimitive.Close className="absolute top-5 right-5 text-faint transition-colors hover:text-ink">
            <XIcon className="size-4" />
          </DialogPrimitive.Close>
        </DialogPrimitive.Popup>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
