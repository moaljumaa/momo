import { Globe, FileText, CircleHelp, AlignLeft, type LucideIcon } from "lucide-react";

export type SourceKind = "URL" | "FILE" | "QA" | "TEXT";

const ICON: Record<SourceKind, LucideIcon> = {
  URL: Globe,
  FILE: FileText,
  QA: CircleHelp,
  TEXT: AlignLeft,
};

export const SOURCE_LABEL: Record<SourceKind, string> = {
  URL: "Website",
  FILE: "File",
  QA: "Q&A",
  TEXT: "Text snippet",
};

// One consistent glyph per source kind, used everywhere a source is listed — the table,
// the add-source picker, the side sheet — so a user learns "globe = website" once.
export function SourceTypeIcon({ type, className }: { type: SourceKind; className?: string }) {
  const Icon = ICON[type];
  return (
    <span
      className={`flex size-7 shrink-0 items-center justify-center rounded-full border border-line bg-well text-soft ${className ?? ""}`}
      title={SOURCE_LABEL[type]}
    >
      <Icon className="size-3.5" />
    </span>
  );
}
