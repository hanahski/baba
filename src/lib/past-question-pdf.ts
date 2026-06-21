import { jsPDF } from "jspdf";
import { parsePastQuestion, extractYear } from "./past-question-format";

export function downloadPastQuestionPdf(opts: {
  title: string;
  body: string;
  course: { code: string; title: string };
  faculty?: string | null;
  department?: string | null;
}) {
  const { course, body, faculty, department } = opts;
  const year = extractYear(body) ?? "";
  const parsed = parsePastQuestion(body);

  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 48;
  const contentW = pageW - margin * 2;
  let y = margin;

  const line = (text: string, opts2: { size?: number; bold?: boolean; color?: [number, number, number]; gap?: number } = {}) => {
    const { size = 11, bold = false, color = [20, 20, 20], gap = 4 } = opts2;
    doc.setFont("helvetica", bold ? "bold" : "normal");
    doc.setFontSize(size);
    doc.setTextColor(color[0], color[1], color[2]);
    const wrapped = doc.splitTextToSize(text, contentW);
    for (const w of wrapped) {
      if (y > pageH - margin - 20) {
        doc.addPage();
        y = margin;
      }
      doc.text(w, margin, y);
      y += size + gap;
    }
  };

  // Branded header band
  doc.setFillColor(20, 83, 45); // EBSU green-ish
  doc.rect(0, 0, pageW, 70, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text("EBSU", margin, 32);
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text("Ebonyi State University · StudentsPlug Past Questions", margin, 52);
  y = 100;

  // Course block
  line(`${course.code} — ${course.title}`, { size: 16, bold: true, gap: 6 });
  if (faculty) line(faculty, { size: 11, color: [80, 80, 80] });
  if (department) line(department, { size: 11, color: [80, 80, 80] });
  if (year) line(`Session: ${year}`, { size: 11, color: [80, 80, 80] });
  y += 6;

  // Meta
  if (parsed.meta.length) {
    doc.setDrawColor(220, 220, 220);
    doc.line(margin, y, pageW - margin, y);
    y += 14;
    for (const m of parsed.meta) line(m, { size: 10, color: [60, 60, 60] });
    y += 4;
  }

  // Header extras (not already covered)
  for (const h of parsed.header) {
    if (h.toLowerCase().includes(course.code.toLowerCase())) continue;
    if (faculty && h.toLowerCase().includes(faculty.toLowerCase())) continue;
    if (department && h.toLowerCase().includes(department.toLowerCase())) continue;
    line(h, { size: 10, color: [80, 80, 80] });
  }

  y += 8;
  doc.setDrawColor(20, 83, 45);
  doc.setLineWidth(1.2);
  doc.line(margin, y, pageW - margin, y);
  y += 16;

  // Body
  for (const b of parsed.blocks) {
    if (b.kind === "section") {
      y += 6;
      line(b.label.toUpperCase(), { size: 12, bold: true, color: [20, 83, 45], gap: 6 });
    } else if (b.kind === "question") {
      y += 4;
      line(`${b.number}. ${b.text}`, { size: 11, gap: 4 });
    } else {
      line(b.text, { size: 11, color: [40, 40, 40] });
    }
  }

  // Footer
  const total = doc.getNumberOfPages();
  for (let p = 1; p <= total; p++) {
    doc.setPage(p);
    doc.setFontSize(9);
    doc.setTextColor(120, 120, 120);
    doc.text(`StudentsPlug · EBSU · Page ${p} of ${total}`, margin, pageH - 20);
  }

  const safeYear = year ? `_${year}` : "";
  const safeCode = course.code.replace(/\s+/g, "");
  doc.save(`EBSU_${safeCode}${safeYear}.pdf`);
}
