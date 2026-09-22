import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

// Renders saved markdown (text/Q&A source content, answers) as actual formatting instead
// of raw "**bold**" syntax. Weight caps at 500 (Mist: never 600+), sentence case content
// untouched — this only maps markdown nodes to the existing type scale.
export function Markdown({ children, className }: { children: string; className?: string }) {
  return (
    <div className={`flex flex-col gap-3 text-sm font-light leading-relaxed text-soft ${className ?? ""}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          p: ({ children }) => <p className="whitespace-pre-wrap">{children}</p>,
          strong: ({ children }) => <strong className="font-medium text-ink">{children}</strong>,
          em: ({ children }) => <em>{children}</em>,
          a: ({ children, href }) => (
            <a href={href} target="_blank" rel="noreferrer" className="text-sky underline decoration-dotted">
              {children}
            </a>
          ),
          ul: ({ children }) => <ul className="flex flex-col gap-1 pl-5 [list-style:disc]">{children}</ul>,
          ol: ({ children }) => <ol className="flex flex-col gap-1 pl-5 [list-style:decimal]">{children}</ol>,
          li: ({ children }) => <li>{children}</li>,
          code: ({ children }) => (
            <code className="rounded bg-well px-1.5 py-0.5 text-[13px] text-ink">{children}</code>
          ),
          h1: ({ children }) => <p className="text-base font-normal text-ink">{children}</p>,
          h2: ({ children }) => <p className="text-base font-normal text-ink">{children}</p>,
          h3: ({ children }) => <p className="text-sm font-normal text-ink">{children}</p>,
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}
