// Parse a raw past-question body into a structured, readable shape.
// Best-effort: headers (school/faculty/dept), meta (date/time/instructions),
// sections (SECTION A/B/C / PART 1) and numbered questions.

export type PQBlock =
  | { kind: "section"; label: string }
  | { kind: "question"; number: string; text: string }
  | { kind: "para"; text: string };

export type ParsedPQ = {
  header: string[]; // school / faculty / dept / session lines
  meta: string[]; // date / time / instructions
  blocks: PQBlock[];
};

const SECTION_RE = /^\**\s*(SECTION\s+[A-Z]|PART\s+\d+|PART\s+[IVX]+)\b/i;
const QUESTION_RE = /^\**\s*(\d{1,2})\s*[\.\)]\s*(.*)$/;
const META_HINTS = /^(time|date|duration|instruction|instructions|course code|course title|exam date|answer )/i;

export function parsePastQuestion(body: string): ParsedPQ {
  const rawLines = body
    .replace(/\r\n/g, "\n")
    .split("\n")
    .map((l) => l.replace(/\s+$/g, ""))
    .filter((l) => l.length > 0);

  const header: string[] = [];
  const meta: string[] = [];
  const blocks: PQBlock[] = [];

  let firstQuestionSeen = false;
  let current: { number: string; lines: string[] } | null = null;

  const flush = () => {
    if (current) {
      blocks.push({
        kind: "question",
        number: current.number,
        text: current.lines.join("\n").trim(),
      });
      current = null;
    }
  };

  for (let i = 0; i < rawLines.length; i++) {
    const line = rawLines[i].replace(/^\*\*|\*\*$/g, "").trim();
    if (!line) continue;

    const qm = line.match(QUESTION_RE);
    const sm = line.match(SECTION_RE);

    if (sm) {
      flush();
      firstQuestionSeen = true;
      blocks.push({ kind: "section", label: line.replace(/\*/g, "").trim() });
      continue;
    }

    if (qm) {
      flush();
      firstQuestionSeen = true;
      current = { number: qm[1], lines: qm[2] ? [qm[2]] : [] };
      continue;
    }

    if (!firstQuestionSeen) {
      if (META_HINTS.test(line)) meta.push(line);
      else header.push(line);
      continue;
    }

    if (current) current.lines.push(line);
    else blocks.push({ kind: "para", text: line });
  }
  flush();

  return { header, meta, blocks };
}

export function extractYear(text: string): string | null {
  const m = text.match(/(20\d{2})\s*[\/\-]\s*(20\d{2})/);
  return m ? `${m[1]}-${m[2]}` : null;
}
