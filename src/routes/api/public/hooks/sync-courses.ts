import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

// Curated free, embeddable academic content.
// Every source here serves PDF/HTML over HTTPS without X-Frame-Options DENY,
// so it renders inside an <iframe> on the site.

type CourseRow = {
  source: string;
  external_id: string;
  title: string;
  author: string | null;
  subject: string | null;
  level: string | null;
  cover_url: string | null;
  description: string | null;
  read_url: string;
  download_url: string | null;
  can_embed: boolean;
  is_course: boolean;
};

function cleanText(value: unknown, limit = 800): string | null {
  const text = Array.isArray(value) ? value.join(" ") : typeof value === "string" ? value : "";
  const cleaned = text
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return cleaned ? cleaned.slice(0, limit) : null;
}

// ---------- Wikibooks / Wikiversity ----------
// Wikimedia API-backed pages. They are free, global, HTTPS, and iframe-friendly.
const WIKI_RESOURCES: Array<Omit<CourseRow, "source" | "can_embed">> = [
  {
    external_id: "wikibooks-accountancy",
    title: "Accountancy",
    author: "Wikibooks contributors",
    subject: "Accounting",
    level: "University",
    cover_url: null,
    description: "Open accounting textbook and study guide.",
    read_url: "https://en.wikibooks.org/wiki/Accountancy",
    download_url: "https://en.wikibooks.org/wiki/Special:DownloadAsPdf/Accountancy",
    is_course: false,
  },
  {
    external_id: "wikibooks-calculus",
    title: "Calculus",
    author: "Wikibooks contributors",
    subject: "Mathematics",
    level: "University",
    cover_url: null,
    description: "Open calculus textbook for university study.",
    read_url: "https://en.wikibooks.org/wiki/Calculus",
    download_url: "https://en.wikibooks.org/wiki/Special:DownloadAsPdf/Calculus",
    is_course: false,
  },
  {
    external_id: "wikibooks-organic-chemistry",
    title: "Organic Chemistry",
    author: "Wikibooks contributors",
    subject: "Chemistry",
    level: "University",
    cover_url: null,
    description: "Open organic chemistry textbook.",
    read_url: "https://en.wikibooks.org/wiki/Organic_Chemistry",
    download_url: "https://en.wikibooks.org/wiki/Special:DownloadAsPdf/Organic_Chemistry",
    is_course: false,
  },
  {
    external_id: "wikibooks-microeconomics",
    title: "Microeconomics",
    author: "Wikibooks contributors",
    subject: "Economics",
    level: "University",
    cover_url: null,
    description: "Open textbook for microeconomic concepts and analysis.",
    read_url: "https://en.wikibooks.org/wiki/Microeconomics",
    download_url: "https://en.wikibooks.org/wiki/Special:DownloadAsPdf/Microeconomics",
    is_course: false,
  },
  {
    external_id: "wikibooks-project-management",
    title: "Project Management",
    author: "Wikibooks contributors",
    subject: "Professional Skills",
    level: "Career",
    cover_url: null,
    description: "Professional project management study material.",
    read_url: "https://en.wikibooks.org/wiki/Project_Management",
    download_url: "https://en.wikibooks.org/wiki/Special:DownloadAsPdf/Project_Management",
    is_course: false,
  },
  {
    external_id: "wikibooks-tech-writing",
    title: "Professional and Technical Writing",
    author: "Wikibooks contributors",
    subject: "Professional Skills",
    level: "Career",
    cover_url: null,
    description: "Professional writing, business communication, and workplace documentation.",
    read_url: "https://en.wikibooks.org/wiki/Professional_and_Technical_Writing",
    download_url:
      "https://en.wikibooks.org/wiki/Special:DownloadAsPdf/Professional_and_Technical_Writing",
    is_course: false,
  },
  {
    external_id: "wikiversity-aerodynamics",
    title: "Aerodynamics",
    author: "Wikiversity contributors",
    subject: "Engineering",
    level: "University",
    cover_url: null,
    description: "Free learning course covering forces and motion in air and fluids.",
    read_url: "https://en.wikiversity.org/wiki/Aerodynamics",
    download_url: null,
    is_course: true,
  },
  {
    external_id: "wikiversity-comparative-law-nigeria",
    title: "Comparative Law and Justice: Nigeria",
    author: "Wikiversity contributors",
    subject: "Nigeria",
    level: "University",
    cover_url: null,
    description: "Open learning material focused on Nigerian law and justice.",
    read_url: "https://en.wikiversity.org/wiki/Comparative_law_and_justice/Nigeria",
    download_url: null,
    is_course: true,
  },
];

function wikiRows(): CourseRow[] {
  return WIKI_RESOURCES.map((r) => ({
    ...r,
    source: r.external_id.startsWith("wikiversity") ? "wikiversity" : "wikibooks",
    can_embed: true,
  }));
}

// ---------- DOAB / OAPEN ----------
// REST APIs for open-access academic books; PDF links are accepted when available.
type DspaceMeta = { key?: string; value?: string };
type DspaceBitstream = { mimeType?: string; retrieveLink?: string; metadata?: DspaceMeta[] };
type DspaceItem = {
  uuid: string;
  name?: string;
  handle?: string;
  metadata?: DspaceMeta[];
  bitstreams?: DspaceBitstream[];
};

function metaOne(item: DspaceItem, key: string): string | null {
  return item.metadata?.find((m) => m.key === key)?.value ?? null;
}

function metaMany(item: DspaceItem, key: string): string[] {
  return (
    item.metadata
      ?.filter((m) => m.key === key)
      .map((m) => m.value ?? "")
      .filter(Boolean) ?? []
  );
}

function bitstreamMeta(item: DspaceItem, key: string): string | null {
  for (const bitstream of item.bitstreams ?? []) {
    const value = bitstream.metadata?.find((m) => m.key === key)?.value;
    if (value) return value;
  }
  return null;
}

async function openAccessBookRows(
  source: "doab" | "oapen",
  query: string,
  subject: string,
  limit = 10,
): Promise<CourseRow[]> {
  const base = source === "doab" ? "https://directory.doabooks.org" : "https://library.oapen.org";
  const res = await fetch(
    `${base}/rest/search?query=${encodeURIComponent(query)}&expand=metadata,bitstreams&limit=${limit}`,
    {
      headers: { "User-Agent": "StudentsPlug/1.0" },
    },
  );
  if (!res.ok) return [];
  const items = (await res.json()) as DspaceItem[];
  return items
    .map((item): CourseRow | null => {
      const title = item.name || metaOne(item, "dc.title");
      if (!title || !item.uuid) return null;
      const pdf = bitstreamMeta(item, "oapen.identifier.downloadUrl");
      const handleUrl = item.handle ? `${base}/handle/${item.handle}` : pdf;
      const readUrl = pdf ?? handleUrl;
      if (!readUrl) return null;
      const authors = [
        ...metaMany(item, "dc.contributor.author"),
        ...metaMany(item, "dc.contributor.editor"),
      ]
        .slice(0, 3)
        .join(", ");
      const year = metaOne(item, "dc.date.issued");
      const thumbnail = item.bitstreams?.find(
        (b) => b.mimeType?.startsWith("image/") && b.retrieveLink,
      )?.retrieveLink;
      return {
        source,
        external_id: `${source}-${item.uuid}`,
        title: title.slice(0, 280),
        author: authors || (source === "doab" ? "Directory of Open Access Books" : "OAPEN Library"),
        subject,
        level: "University",
        cover_url: thumbnail ? `${base}${thumbnail}` : null,
        description: cleanText(
          metaOne(item, "dc.description.abstract") ?? metaOne(item, "dc.description"),
          800,
        ),
        read_url: readUrl,
        download_url: pdf,
        can_embed: !!pdf,
        is_course: false,
      };
    })
    .filter((r): r is CourseRow => r !== null);
}

// ---------- OpenStax ----------
// Public catalog: returns every published OpenStax textbook with cover + web view + PDF.
type OpenStaxBook = {
  id: number;
  title: string;
  meta?: { slug?: string; html_url?: string };
  cover_url?: string;
  cover_color?: string;
  description?: string;
  high_resolution_pdf_url?: string;
  authors?: { value?: { name?: string } }[] | { name?: string }[];
};

async function fetchOpenStax(): Promise<CourseRow[]> {
  const res = await fetch(
    "https://openstax.org/apps/cms/api/v2/pages/?type=books.Book&fields=title,cover_url,cover_color,description,high_resolution_pdf_url,authors&limit=200&book_state=live",
    { headers: { "User-Agent": "StudentsPlug/1.0" } },
  );
  if (!res.ok) return [];
  const json = (await res.json()) as { items?: OpenStaxBook[] };
  const items = json.items ?? [];
  return items
    .map((b): CourseRow | null => {
      const slug = b.meta?.slug;
      const web = b.meta?.html_url ?? (slug ? `https://openstax.org/details/books/${slug}` : null);
      if (!web || !b.title) return null;
      const subject = null;

      const authorName =
        (Array.isArray(b.authors) && b.authors.length > 0
          ? ((b.authors[0] as { value?: { name?: string } }).value?.name ??
            (b.authors[0] as { name?: string }).name)
          : null) ?? "OpenStax";
      return {
        source: "openstax",
        external_id: `openstax-${b.id}`,
        title: b.title.replace(/<[^>]+>/g, "").slice(0, 280),
        author: authorName,
        subject,
        level: "University",
        cover_url: b.cover_url ?? null,
        description: b.description?.replace(/<[^>]+>/g, "").slice(0, 800) ?? null,
        read_url: web,
        download_url: b.high_resolution_pdf_url ?? null,
        can_embed: true,
        is_course: false,
      };
    })
    .filter((r): r is CourseRow => r !== null);
}

// ---------- Open Textbook Library ----------
// Public JSON catalog from the Open Textbook Library (University of Minnesota).
type OtlBook = {
  id: number;
  title: string;
  description?: string;
  language?: string;
  subjects?: { name: string }[];
  contributors?: { first_name?: string; last_name?: string; contribution?: string }[];
  formats?: { type: string; url: string }[];
  copyright_year?: number;
};

async function fetchOpenTextbookLibrary(): Promise<CourseRow[]> {
  const res = await fetch("https://open.umn.edu/opentextbooks/textbooks.json?per_page=200", {
    headers: { "User-Agent": "StudentsPlug/1.0" },
  });
  if (!res.ok) return [];
  const json = (await res.json()) as { data?: OtlBook[] };
  const items = json.data ?? [];
  return items
    .map((b): CourseRow | null => {
      const online = b.formats?.find((f) => /online|ebook|html|web/i.test(f.type))?.url;
      const pdf = b.formats?.find((f) => /pdf/i.test(f.type))?.url;
      const read = online ?? pdf;
      if (!read || !b.title) return null;
      if (!/^https:\/\//.test(read)) return null;
      const author =
        b.contributors
          ?.filter((c) => /author/i.test(c.contribution ?? "author"))
          .map((c) => `${c.first_name ?? ""} ${c.last_name ?? ""}`.trim())
          .filter(Boolean)
          .join(", ") || "Open Textbook Library";
      return {
        source: "open_textbook_library",
        external_id: `otl-${b.id}`,
        title: b.title.slice(0, 280),
        author: author.slice(0, 200),
        subject: b.subjects?.[0]?.name ?? null,
        level: "University",
        cover_url: null,
        description: b.description?.replace(/<[^>]+>/g, "").slice(0, 800) ?? null,
        read_url: read,
        download_url: pdf ?? null,
        can_embed: true,
        is_course: false,
      };
    })
    .filter((r): r is CourseRow => r !== null);
}

// ---------- MIT OpenCourseWare ----------
// Curated set of always-free MIT OCW courses with stable URLs and embeddable lecture-notes PDFs.
const MIT_OCW: Array<Omit<CourseRow, "source" | "can_embed" | "is_course">> = [
  {
    external_id: "mit-6.0001",
    title: "Introduction to Computer Science and Programming in Python",
    author: "Eric Grimson, John Guttag",
    subject: "Computer Science",
    level: "Undergraduate",
    cover_url:
      "https://ocw.mit.edu/courses/6-0001-introduction-to-computer-science-and-programming-in-python-fall-2016/d83c0fe78bcef3b3ec8d70e69b9d76b1_6-0001f16-th.jpg",
    description:
      "Introduction to computer science and programming for students with little or no programming experience. Uses Python 3.5.",
    read_url:
      "https://ocw.mit.edu/courses/6-0001-introduction-to-computer-science-and-programming-in-python-fall-2016/",
    download_url: null,
  },
  {
    external_id: "mit-18.01",
    title: "Single Variable Calculus",
    author: "David Jerison",
    subject: "Mathematics",
    level: "Undergraduate",
    cover_url: "https://ocw.mit.edu/courses/18-01-single-variable-calculus-fall-2006/18-01f06.jpg",
    description:
      "Calculus I: differentiation and integration of functions of one variable, with applications.",
    read_url: "https://ocw.mit.edu/courses/18-01-single-variable-calculus-fall-2006/",
    download_url: null,
  },
  {
    external_id: "mit-18.06",
    title: "Linear Algebra",
    author: "Gilbert Strang",
    subject: "Mathematics",
    level: "Undergraduate",
    cover_url: "https://ocw.mit.edu/courses/18-06-linear-algebra-spring-2010/18-06s10.jpg",
    description: "Basic subject on matrix theory and linear algebra by Prof. Gilbert Strang.",
    read_url: "https://ocw.mit.edu/courses/18-06-linear-algebra-spring-2010/",
    download_url: null,
  },
  {
    external_id: "mit-8.01",
    title: "Physics I: Classical Mechanics",
    author: "Walter Lewin",
    subject: "Physics",
    level: "Undergraduate",
    cover_url:
      "https://ocw.mit.edu/courses/8-01-physics-i-classical-mechanics-fall-1999/8-01f99.jpg",
    description:
      "First semester of introductory physics: kinematics, Newton's laws, work and energy.",
    read_url: "https://ocw.mit.edu/courses/8-01-physics-i-classical-mechanics-fall-1999/",
    download_url: null,
  },
  {
    external_id: "mit-14.01",
    title: "Principles of Microeconomics",
    author: "Jonathan Gruber",
    subject: "Economics",
    level: "Undergraduate",
    cover_url:
      "https://ocw.mit.edu/courses/14-01-principles-of-microeconomics-fall-2018/14-01f18.jpg",
    description: "Introduction to microeconomic concepts, theory, and policy analysis.",
    read_url: "https://ocw.mit.edu/courses/14-01-principles-of-microeconomics-fall-2018/",
    download_url: null,
  },
  {
    external_id: "mit-6.006",
    title: "Introduction to Algorithms",
    author: "Erik Demaine, Srini Devadas",
    subject: "Computer Science",
    level: "Undergraduate",
    cover_url:
      "https://ocw.mit.edu/courses/6-006-introduction-to-algorithms-spring-2020/6-006s20.jpg",
    description:
      "Mathematical modeling of computational problems, common algorithms and data structures.",
    read_url: "https://ocw.mit.edu/courses/6-006-introduction-to-algorithms-spring-2020/",
    download_url: null,
  },
  {
    external_id: "mit-15.s12",
    title: "Blockchain and Money",
    author: "Gary Gensler",
    subject: "Finance",
    level: "Graduate",
    cover_url: "https://ocw.mit.edu/courses/15-s12-blockchain-and-money-fall-2018/15-s12f18.jpg",
    description: "Course for students wishing to explore blockchain technology's potential use.",
    read_url: "https://ocw.mit.edu/courses/15-s12-blockchain-and-money-fall-2018/",
    download_url: null,
  },
  {
    external_id: "mit-7.012",
    title: "Introduction to Biology",
    author: "Eric Lander",
    subject: "Biology",
    level: "Undergraduate",
    cover_url: "https://ocw.mit.edu/courses/7-012-introduction-to-biology-fall-2004/7-012f04.jpg",
    description: "Fundamentals of biochemistry, genetics, molecular biology, and cell biology.",
    read_url: "https://ocw.mit.edu/courses/7-012-introduction-to-biology-fall-2004/",
    download_url: null,
  },
  {
    external_id: "mit-24.00",
    title: "Problems of Philosophy",
    author: "Caspar Hare",
    subject: "Humanities",
    level: "Undergraduate",
    cover_url: "https://ocw.mit.edu/courses/24-00-problems-of-philosophy-fall-2010/24-00f10.jpg",
    description: "Introduction to problems of moral philosophy and the philosophy of mind.",
    read_url: "https://ocw.mit.edu/courses/24-00-problems-of-philosophy-fall-2010/",
    download_url: null,
  },
];

function mitOcwRows(): CourseRow[] {
  return MIT_OCW.map((r) => ({ ...r, source: "mit_ocw", can_embed: true, is_course: true }));
}

// ---------- LibreTexts ----------
// LibreTexts bookshelves serve full HTML textbooks under each subject library.
// Curated entry points, embeddable.
const LIBRETEXTS: Array<Omit<CourseRow, "source" | "can_embed" | "is_course">> = [
  {
    external_id: "libre-chem-general",
    title: "General Chemistry (LibreTexts)",
    author: "LibreTexts Community",
    subject: "Chemistry",
    level: "University",
    cover_url: "https://chem.libretexts.org/@api/deki/files/124042/Chemistry_LibreTexts.png",
    description:
      "Comprehensive open chemistry textbook covering general, organic, and physical chemistry.",
    read_url: "https://chem.libretexts.org/Bookshelves/General_Chemistry",
    download_url: null,
  },
  {
    external_id: "libre-math-calc",
    title: "Calculus (LibreTexts)",
    author: "LibreTexts Community",
    subject: "Mathematics",
    level: "University",
    cover_url: "https://math.libretexts.org/@api/deki/files/9024/Mathematics_LibreTexts.png",
    description: "Open calculus textbooks: single and multivariable.",
    read_url: "https://math.libretexts.org/Bookshelves/Calculus",
    download_url: null,
  },
  {
    external_id: "libre-bio-intro",
    title: "Introductory Biology (LibreTexts)",
    author: "LibreTexts Community",
    subject: "Biology",
    level: "University",
    cover_url: "https://bio.libretexts.org/@api/deki/files/22341/Biology_LibreTexts.png",
    description: "Foundational biology textbook chapters: cells, genetics, evolution, ecology.",
    read_url: "https://bio.libretexts.org/Bookshelves/Introductory_and_General_Biology",
    download_url: null,
  },
  {
    external_id: "libre-eng-mech",
    title: "Engineering Mechanics (LibreTexts)",
    author: "LibreTexts Community",
    subject: "Engineering",
    level: "University",
    cover_url: "https://eng.libretexts.org/@api/deki/files/27851/Engineering_LibreTexts.png",
    description: "Statics and dynamics for engineering students.",
    read_url: "https://eng.libretexts.org/Bookshelves/Mechanical_Engineering",
    download_url: null,
  },
  {
    external_id: "libre-med-anatomy",
    title: "Anatomy and Physiology (LibreTexts)",
    author: "LibreTexts Community",
    subject: "Medicine",
    level: "University",
    cover_url: "https://med.libretexts.org/@api/deki/files/8961/Medicine_LibreTexts.png",
    description: "Open textbook for anatomy and physiology courses.",
    read_url: "https://med.libretexts.org/Bookshelves/Anatomy_and_Physiology",
    download_url: null,
  },
  {
    external_id: "libre-business",
    title: "Principles of Management (LibreTexts)",
    author: "LibreTexts Community",
    subject: "Business",
    level: "University",
    cover_url: "https://biz.libretexts.org/@api/deki/files/2161/Business_LibreTexts.png",
    description: "Open management and business textbooks.",
    read_url: "https://biz.libretexts.org/Bookshelves/Management",
    download_url: null,
  },
];

function libreTextsRows(): CourseRow[] {
  return LIBRETEXTS.map((r) => ({ ...r, source: "libretexts", can_embed: true, is_course: false }));
}

// ---------- Saylor Academy ----------
// Saylor courses are free, self-paced. Course catalog pages are embeddable.
const SAYLOR: Array<Omit<CourseRow, "source" | "can_embed" | "is_course">> = [
  {
    external_id: "saylor-cs101",
    title: "CS101: Introduction to Computer Science",
    author: "Saylor Academy",
    subject: "Computer Science",
    level: "Career",
    cover_url: null,
    description: "Introduction to computer science, programming concepts, and problem solving.",
    read_url: "https://learn.saylor.org/course/view.php?id=63",
    download_url: null,
  },
  {
    external_id: "saylor-bus101",
    title: "BUS101: Introduction to Business",
    author: "Saylor Academy",
    subject: "Business",
    level: "Career",
    cover_url: null,
    description: "Fundamentals of how businesses operate, including management and marketing.",
    read_url: "https://learn.saylor.org/course/view.php?id=33",
    download_url: null,
  },
  {
    external_id: "saylor-bus204",
    title: "BUS204: Business Statistics",
    author: "Saylor Academy",
    subject: "Business",
    level: "Career",
    cover_url: null,
    description: "Statistics for managers: probability, sampling, regression, hypothesis testing.",
    read_url: "https://learn.saylor.org/course/view.php?id=36",
    download_url: null,
  },
  {
    external_id: "saylor-cs102",
    title: "CS102: Introduction to Computer Science II",
    author: "Saylor Academy",
    subject: "Computer Science",
    level: "Career",
    cover_url: null,
    description: "Object-oriented programming, data structures, and software design.",
    read_url: "https://learn.saylor.org/course/view.php?id=64",
    download_url: null,
  },
  {
    external_id: "saylor-prdv104",
    title: "PRDV104: Time and Stress Management",
    author: "Saylor Academy",
    subject: "Career Skills",
    level: "Career",
    cover_url: null,
    description: "Practical skills to manage your time and reduce workplace stress.",
    read_url: "https://learn.saylor.org/course/view.php?id=400",
    download_url: null,
  },
];

function saylorRows(): CourseRow[] {
  return SAYLOR.map((r) => ({ ...r, source: "saylor", can_embed: true, is_course: true }));
}

// ---------- Validation: HEAD-check URLs and reject unreachable ones ----------
async function isReachable(url: string): Promise<boolean> {
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 6000);
    const res = await fetch(url, { method: "HEAD", redirect: "follow", signal: ctrl.signal });
    clearTimeout(t);
    if (res.ok) return true;
    // Some servers (e.g. OpenStax) reject HEAD with 405 — fall through and try GET
    if (res.status !== 405 && res.status !== 403) return false;
  } catch {
    // fallthrough
  }
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 6000);
    const res = await fetch(url, { method: "GET", redirect: "follow", signal: ctrl.signal });
    clearTimeout(t);
    return res.ok;
  } catch {
    return false;
  }
}

async function filterReachable(rows: CourseRow[]): Promise<CourseRow[]> {
  const checks = await Promise.all(
    rows.map(async (r) => ((await isReachable(r.read_url)) ? r : null)),
  );
  return checks.filter((r): r is CourseRow => r !== null);
}

async function upsertRows(label: string, rows: CourseRow[]) {
  if (!rows.length) return { source: label, inserted: 0 };
  const { error, count } = await supabaseAdmin
    .from("library_courses")
    .upsert(rows, { onConflict: "source,external_id", ignoreDuplicates: false, count: "exact" });
  if (error) throw new Error(`upsert ${label}: ${error.message}`);
  return { source: label, inserted: count ?? rows.length };
}

async function runSync() {
  const results: Array<{ source: string; inserted?: number; error?: string; dropped?: number }> =
    [];
  // [label, fetcher, skipReachabilityCheck, cap]
  const jobs: Array<[string, () => Promise<CourseRow[]>, boolean, number]> = [
    ["openstax", fetchOpenStax, true, 100],
    ["open_textbook_library", fetchOpenTextbookLibrary, true, 100],
    [
      "doab:computer_science",
      () => openAccessBookRows("doab", "computer science", "Computer Science", 12),
      true,
      12,
    ],
    ["doab:business", () => openAccessBookRows("doab", "business", "Business", 12), true, 12],
    ["oapen:education", () => openAccessBookRows("oapen", "education", "Education", 10), true, 10],
    ["wikibooks_wikiversity", async () => wikiRows(), true, 50],
    ["mit_ocw", async () => mitOcwRows(), false, 50],
    ["libretexts", async () => libreTextsRows(), false, 50],
    ["saylor", async () => saylorRows(), false, 50],
  ];
  for (const [label, fn, skipCheck, cap] of jobs) {
    try {
      const all = await fn();
      const rows = all.slice(0, cap);
      const reachable = skipCheck ? rows : await filterReachable(rows);
      results.push({
        ...(await upsertRows(label, reachable)),
        ...(rows.length !== reachable.length ? { dropped: rows.length - reachable.length } : {}),
      });
    } catch (e) {
      results.push({ source: label, error: (e as Error).message });
    }
  }
  // Cleanup: remove rows where the read_url has since gone dead.
  // Limit the sweep so a slow upstream can't time out the route.
  try {
    const { data: existing } = await supabaseAdmin
      .from("library_courses")
      .select("id,read_url")
      .order("updated_at", { ascending: true })
      .limit(40);
    const dead: string[] = [];
    for (const row of existing ?? []) {
      if (!(await isReachable(row.read_url))) dead.push(row.id);
    }
    if (dead.length) {
      await supabaseAdmin.from("library_courses").delete().in("id", dead);
      results.push({ source: "cleanup_dead", inserted: -dead.length });
    }
  } catch (e) {
    results.push({ source: "cleanup_dead", error: (e as Error).message });
  }
  return results;
}

function renderSyncHtml(title: string, results: Awaited<ReturnType<typeof runSync>>) {
  const rows = results
    .map(
      (r) =>
        `<tr><td>${r.source}</td><td>${r.inserted ?? 0}</td><td>${"dropped" in r && r.dropped ? `Dropped ${r.dropped}` : r.error ? `⚠️ ${r.error}` : "OK"}</td></tr>`,
    )
    .join("");
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title><style>body{font-family:system-ui,-apple-system,Segoe UI,sans-serif;margin:0;padding:24px;background:#f8fafc;color:#0f172a}main{max-width:900px;margin:auto}table{width:100%;border-collapse:collapse;background:white;border:1px solid #e2e8f0;border-radius:12px;overflow:hidden}td,th{padding:12px;border-bottom:1px solid #e2e8f0;text-align:left}code{background:#e2e8f0;padding:2px 6px;border-radius:6px}.hint{color:#475569}</style></head><body><main><h1>${title}</h1><p class="hint">Sync finished. Use <code>?format=json</code> if you need raw JSON.</p><table><thead><tr><th>Source</th><th>Inserted/updated</th><th>Status</th></tr></thead><tbody>${rows}</tbody></table></main></body></html>`;
}

async function syncResponse(request: Request) {
  const results = await runSync();
  const wantsJson =
    new URL(request.url).searchParams.get("format") === "json" ||
    !request.headers.get("accept")?.includes("text/html");
  if (wantsJson) return Response.json({ ok: true, results });
  return new Response(renderSyncHtml("Course and textbook sync", results), {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}

export const Route = createFileRoute("/api/public/hooks/sync-courses")({
  server: {
    handlers: {
      GET: ({ request }) => syncResponse(request),
      POST: async () => Response.json({ ok: true, results: await runSync() }),
    },
  },
});
