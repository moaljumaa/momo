// Q&A sources have no dedicated schema (Source.content is one string) so multiple
// questions + one answer are encoded as plain lines and parsed back the same way —
// shared here so the create path and the reopen-to-edit path can't drift apart.
export function formatQa(questions: string[], answer: string): string {
  return `${questions.map((q) => `Q: ${q}`).join("\n")}\nA: ${answer}`;
}

export function parseQa(content: string): { questions: string[]; answer: string } {
  const lines = content.split("\n");
  const questions: string[] = [];
  let answer = "";
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!;
    if (line.startsWith("Q: ")) {
      questions.push(line.slice(3));
    } else if (line.startsWith("A: ")) {
      answer = [line.slice(3), ...lines.slice(i + 1)].join("\n");
      break;
    }
  }
  return { questions: questions.length > 0 ? questions : [""], answer };
}
