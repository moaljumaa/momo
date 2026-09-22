"use client";

import { useRef } from "react";
import {
  Bold,
  Italic,
  Strikethrough,
  Link as LinkIcon,
  List,
  ListOrdered,
  Quote,
  Code,
  Heading2,
} from "lucide-react";

// A plain textarea plus a toolbar that wraps/prefixes the current selection with markdown
// syntax — no heavy editor dependency, no live preview, just enough to write a formatted
// answer. Fixed height (the field itself scrolls), not an ever-growing textarea.
//
// Toolbar buttons use onMouseDown + preventDefault (not onClick) so the browser never
// moves focus off the textarea before we read/replace its selection — using onClick here
// was the reason the buttons looked "broken": focus left the field on mousedown, which on
// some builds collapses the selection before the click handler ever runs.
export function MarkdownField({
  value,
  onChange,
  placeholder,
  rows = 8,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  rows?: number;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);

  function wrap(before: string, after = before, placeholderText = "") {
    const el = ref.current;
    if (!el) return;
    const s = el.selectionStart;
    const e = el.selectionEnd;
    const selected = value.slice(s, e) || placeholderText;
    const next = value.slice(0, s) + before + selected + after + value.slice(e);
    onChange(next);
    const from = s + before.length;
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(from, from + selected.length);
    });
  }

  function linePrefix(prefix: string) {
    const el = ref.current;
    if (!el) return;
    const s = el.selectionStart;
    const e = el.selectionEnd;
    const lineStart = value.lastIndexOf("\n", s - 1) + 1;
    // Apply to every line the selection touches, not just the first — selecting three
    // list items and clicking "bulleted list" should bullet all three.
    const lineEnd = value.indexOf("\n", e);
    const block = value.slice(lineStart, lineEnd === -1 ? value.length : lineEnd);
    const prefixed = block
      .split("\n")
      .map((line) => prefix + line)
      .join("\n");
    const next = value.slice(0, lineStart) + prefixed + value.slice(lineStart + block.length);
    onChange(next);
    const shift = prefix.length;
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(s + shift, e + shift * (block.split("\n").length || 1));
    });
  }

  function insertLink() {
    const el = ref.current;
    if (!el) return;
    const s = el.selectionStart;
    const e = el.selectionEnd;
    const selected = value.slice(s, e) || "link text";
    const next = `${value.slice(0, s)}[${selected}](https://)${value.slice(e)}`;
    onChange(next);
    const urlStart = s + selected.length + 3;
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(urlStart, urlStart + "https://".length);
    });
  }

  const tools: { icon: typeof Bold; label: string; onClick: () => void }[] = [
    { icon: Heading2, label: "Heading", onClick: () => linePrefix("## ") },
    { icon: Bold, label: "Bold", onClick: () => wrap("**", "**", "bold text") },
    { icon: Italic, label: "Italic", onClick: () => wrap("_", "_", "italic text") },
    { icon: Strikethrough, label: "Strikethrough", onClick: () => wrap("~~", "~~", "text") },
    { icon: List, label: "Bulleted list", onClick: () => linePrefix("- ") },
    { icon: ListOrdered, label: "Numbered list", onClick: () => linePrefix("1. ") },
    { icon: Quote, label: "Quote", onClick: () => linePrefix("> ") },
    { icon: Code, label: "Code", onClick: () => wrap("`", "`", "code") },
    { icon: LinkIcon, label: "Link", onClick: insertLink },
  ];

  return (
    <div className="flex flex-col overflow-hidden rounded-[1rem] border border-edge bg-well">
      <div className="flex flex-wrap items-center gap-0.5 border-b border-line px-2 py-1.5">
        {tools.map(({ icon: Icon, label, onClick }) => (
          <button
            key={label}
            type="button"
            title={label}
            aria-label={label}
            onMouseDown={(e) => {
              // Prevent the button from stealing focus (and with it, the textarea's
              // selection) before onClick fires.
              e.preventDefault();
            }}
            onClick={onClick}
            className="flex size-7 shrink-0 items-center justify-center rounded-md text-soft transition-colors hover:bg-hover hover:text-ink"
          >
            <Icon className="size-3.5" />
          </button>
        ))}
      </div>
      <textarea
        ref={ref}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={rows}
        className="resize-none bg-transparent px-3.5 py-3 text-sm font-light text-ink placeholder:text-faint focus:outline-none"
      />
    </div>
  );
}
