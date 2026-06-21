// EBSU (Ebonyi State University) academic structure.
// Faculties/departments are from https://ebsu.edu.ng/faculties/.
// Course units below are kept only where official EBSU department curriculum
// pages expose course-code tables. No guessed/generated courses are allowed.

export type EbsuCourse = { code: string; title: string };
export type EbsuDepartment = { name: string; prefix: string; courses: EbsuCourse[] };
export type EbsuFaculty = { name: string; icon: string; departments: EbsuDepartment[] };

const GST: EbsuCourse[] = [];

function dept(name: string, prefix: string, courses: EbsuCourse[] = []): EbsuDepartment {
  return { name, prefix, courses };
}

const c = (code: string, title: string): EbsuCourse => ({ code, title });

export const EBSU_FACULTIES: EbsuFaculty[] = [
  {
    name: "Faculty of Science",
    icon: "🔬",
    departments: [
      dept("Applied Biology", "BIO", [
        c("BIO 101", "GENERAL BIOLOGY I"), c("BIO 191", "GENERAL BIOLOGY PRACTICAL I"),
        c("ICH 101", "GENERAL CHEMISTRY (INORGANIC)"), c("PHY 101", "GENERAL PHYSICS I"),
        c("MAT 101", "ALGEBRA AND MATRICES"), c("CSC 101", "INTRODUCTION TO COMPUTER SCIENCE"),
        c("BIO 102", "GENERAL BIOLOGY II"), c("BIO 201", "INVERTEBRATE BIOLOGY"),
        c("BIO 203", "SEEDLESS PLANTS"), c("BIO 211", "GENERAL CELL BIOLOGY"),
        c("BIO 202", "VERTEBRATE BIOLOGY"), c("BIO 204", "SEED PLANTS"),
        c("BIO 301", "WRITING AND RESEARCH SKILLS FOR BIOLOGISTS"), c("BIO 398", "SIWES (6 MONTHS)"),
        c("BIO 498", "RESEARCH PROJECT"),
      ]),
      dept("Applied Microbiology", "AMB", [
        c("AMB 102", "Introductory Microbiology"), c("AMB 211", "General Microbiology I"),
        c("AMB 351", "Microbial Physiology and Metabolism"), c("AMB 361", "Principles of Biotechnology"),
        c("AMB 421", "Pharmaceutical Microbiology"), c("AMB 425", "General Virology"),
        c("AMB 498", "Research Project"),
      ]),
      dept("Biochemistry", "BCH", [
        c("BCH 102", "Introductory Biochemistry"), c("BCH 201", "General Biochemistry 1"),
        c("BCH 202", "General Biochemistry II"), c("BCH 311", "Metabolism of Carbohydrates"),
        c("BCH 333", "Enzymology"), c("BCH 398", "SIWES"), c("BCH 498", "Research Project"),
      ]),
      dept("Biotechnology", "BTE"),
      dept("Computer Science", "CSC", [
        c("CSC 101", "Introduction to Computer Science"), c("CSC 102", "Introduction to Computer Systems"),
        c("CSC 112", "Problem Solving and Programming"), c("CSC 213", "Sequential Programming and File Processing"),
        c("CSC 215", "Low Level Programming"), c("CSC 221", "Information Technology & Internet Concepts"),
        c("CSC 231", "Data Structure & Algorithms"), c("CSC 204", "Database Creation & Management"),
        c("CSC 216", "Internet Programming"), c("CSC 311", "Object Oriented Programming"),
        c("CSC 323", "Operating System I"), c("CSC 325", "Software Engineering"),
        c("CSC 398", "SIWES"), c("CSC 498", "Research Project"),
      ]),
      dept("Geology / Exploration", "GLY"),
      dept("Industrial Chemistry", "ICH"),
      dept("Industrial Mathematics & Statistics", "MAT"),
      dept("Industrial Physics", "PHY", [
        c("PHY 101", "General Physics I"), c("PHY 201", "Mathematical Methods in Physics I"),
        c("PHY 211", "Structure of Matter"), c("PHY 261", "Elementary Modern Physics"),
        c("PHY 262", "Electric Circuits and Electronics"), c("PHY 311", "Solid State Physics"),
        c("PHY 398", "SIWES"), c("PHY 491", "Research Techniques"),
      ]),
    ],
  },
  { name: "Faculty of Agricultural and Natural Resource Management", icon: "🌾", departments: [dept("Agricultural Economics & Extension", "AEC"), dept("Animal Science", "ANS"), dept("Fishery & Aquaculture", "FAQ"), dept("Food Science & Technology", "FST"), dept("Soil Science & Environmental Management", "SSC")] },
  { name: "Faculty of Health Sciences and Technology", icon: "🩺", departments: [dept("Medical Laboratory Science", "MLS"), dept("Nursing Science", "NSC")] },
  { name: "Faculty of Social Sciences and Humanities", icon: "🌍", departments: [dept("Economics", "ECO"), dept("English Language / Literature", "ENG"), dept("History & International Relations", "HIR"), dept("Language & Linguistics", "LIN"), dept("Library & Information Science", "LIS"), dept("Mass Communication", "MAC"), dept("Philosophy & Religion", "PHI"), dept("Political Science", "POL"), dept("Psychology", "PSY"), dept("Social Works", "SWK"), dept("Sociology and Anthropology", "SOC")] },
  { name: "Faculty of Basic Medical Sciences", icon: "🧬", departments: [dept("Anatomy", "ANA"), dept("Medicine & Surgery", "MED"), dept("Physiology", "PIO")] },
  { name: "Faculty of Clinical Medicine", icon: "🏥", departments: [dept("Community Medicine", "CMD"), dept("Internal Medicine", "IMD"), dept("Pharmacology", "PHA"), dept("Surgery", "SUR")] },
  { name: "Faculty of Education", icon: "🎓", departments: [dept("Arts / Social Science Education", "EDA"), dept("Business Education", "EDB"), dept("Educational Foundations", "EDU"), dept("Guidance & Counselling", "EDG"), dept("Home Economics", "EDH"), dept("Human Kinetics & Health Education", "EDK"), dept("Science Education", "EDS"), dept("Technology & Vocational Education", "EDT")] },
  { name: "Faculty of Management Sciences", icon: "💼", departments: [dept("Accountancy", "ACC"), dept("Banking and Finance", "BFN"), dept("Business Management", "BUS"), dept("Marketing", "MKT"), dept("Public Administration", "PAD")] },
  { name: "Faculty of Law", icon: "⚖️", departments: [dept("Business Law", "LAW"), dept("Civil Law", "CVL"), dept("International Law & Jurisprudence", "ILJ"), dept("Private & Property Law", "PPL"), dept("Public Law", "PUL")] },
];

// Helper for UI fallback (when DB returns nothing): produce slug-based ids.
export function slugify(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

export const EBSU_GST_COURSES = GST;
