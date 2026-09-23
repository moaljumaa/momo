import type { VNode } from "preact";

// Minimal, dependency-free markdown renderer for AI/agent chat bubbles — bold, italic,
// inline code, links, and "- " bullet lists. No headings/tables/blockquotes: those never
// show up in a short support-bot answer, and dragging in a full markdown lib just to render
// **bold** would bloat the single-file widget bundle for no real gain.
function renderInline(text: string, keyPrefix: string): (string | VNode)[] {
  const nodes: (string | VNode)[] = [];
  const pattern = /\*\*(.+?)\*\*|\*(.+?)\*|`(.+?)`|\[(.+?)\]\((.+?)\)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let i = 0;

  while ((match = pattern.exec(text))) {
    if (match.index > lastIndex) nodes.push(text.slice(lastIndex, match.index));
    const key = `${keyPrefix}-${i++}`;
    if (match[1] !== undefined) nodes.push(<strong key={key}>{match[1]}</strong>);
    else if (match[2] !== undefined) nodes.push(<em key={key}>{match[2]}</em>);
    else if (match[3] !== undefined) nodes.push(<code key={key}>{match[3]}</code>);
    else if (match[4] !== undefined && !/^(https?:|mailto:)/i.test(match[5]!.trim()))
      nodes.push(match[0]);
    else if (match[4] !== undefined)
      nodes.push(
        <a key={key} href={match[5]} target="_blank" rel="noreferrer noopener">
          {match[4]}
        </a>,
      );
    lastIndex = pattern.lastIndex;
  }
  if (lastIndex < text.length) nodes.push(text.slice(lastIndex));
  return nodes;
}

export function Markdown({ text }: { text: string }) {
  const blocks = text.split(/\n{2,}/);
  return (
    <>
      {blocks.map((block, bi) => {
        const lines = block.split("\n").filter((l) => l.trim().length > 0);
        const isList = lines.length > 0 && lines.every((l) => /^[-*]\s+/.test(l.trim()));
        if (isList) {
          return (
            <ul key={bi}>
              {lines.map((l, li) => (
                <li key={li}>{renderInline(l.trim().replace(/^[-*]\s+/, ""), `${bi}-${li}`)}</li>
              ))}
            </ul>
          );
        }
        return (
          <p key={bi}>
            {lines.map((l, li) => (
              <>
                {li > 0 && <br />}
                {renderInline(l, `${bi}-${li}`)}
              </>
            ))}
          </p>
        );
      })}
    </>
  );
}
