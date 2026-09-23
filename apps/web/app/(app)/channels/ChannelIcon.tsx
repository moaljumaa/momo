import { Globe, LifeBuoy, type LucideIcon } from "lucide-react";

export type ChannelKind = "website-widget" | "help-page";

const ICON: Record<ChannelKind, LucideIcon> = {
  "website-widget": Globe,
  "help-page": LifeBuoy,
};

export const CHANNEL_LABEL: Record<ChannelKind, string> = {
  "website-widget": "Website widget",
  "help-page": "Help page",
};

// One consistent glyph per channel kind, used in the picker and the channel list.
export function ChannelIcon({ kind, className }: { kind: ChannelKind; className?: string }) {
  const Icon = ICON[kind];
  return (
    <span
      className={`flex size-9 shrink-0 items-center justify-center rounded-full border border-line bg-sheet text-faint ${className ?? ""}`}
    >
      <Icon className="size-3.5" />
    </span>
  );
}
