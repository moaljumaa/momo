"use client";

import { createContext, useContext, useState, type ReactNode } from "react";

export type SettingsTab = "sources" | "channels" | "team" | "handoff" | "account";

type Ctx = {
  tab: SettingsTab | null;
  open: (tab: SettingsTab) => void;
  close: () => void;
};

const SettingsModalContext = createContext<Ctx | null>(null);

export function SettingsModalProvider({ children }: { children: ReactNode }) {
  const [tab, setTab] = useState<SettingsTab | null>(null);
  return (
    <SettingsModalContext.Provider
      value={{ tab, open: setTab, close: () => setTab(null) }}
    >
      {children}
    </SettingsModalContext.Provider>
  );
}

export function useSettingsModal() {
  const ctx = useContext(SettingsModalContext);
  if (!ctx) throw new Error("useSettingsModal must be used within SettingsModalProvider");
  return ctx;
}
