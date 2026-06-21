// Stylized inline-SVG avatars — no extra bundle weight.
// 4 cool boys + 4 fancy girls, each with a distinctive look.
export type AvatarKey =
  | "boy-1"
  | "boy-2"
  | "boy-3" // legacy alias → falls through to boy-1
  | "boy-4"
  | "boy-5"
  | "girl-1"
  | "girl-2"
  | "girl-3"
  | "girl-4";

type AvatarDef = { label: string; svg: string; gender: "boy" | "girl" };

const bg = (id: string, c1: string, c2: string) => `
  <defs><linearGradient id='${id}' x1='0' x2='1' y1='0' y2='1'>
    <stop offset='0' stop-color='${c1}'/>
    <stop offset='1' stop-color='${c2}'/>
  </linearGradient></defs>
  <rect width='120' height='120' rx='60' fill='url(#${id})'/>`;

const eyes = (lx: number, rx: number, y: number, color = "#1a1a2e") => `
  <circle cx='${lx}' cy='${y}' r='2.6' fill='${color}'/>
  <circle cx='${rx}' cy='${y}' r='2.6' fill='${color}'/>`;

const smile = (cx: number, cy: number, w: number, color = "#1a1a2e") => `
  <path d='M${cx - w / 2} ${cy} q${w / 2} ${w * 0.35} ${w} 0' stroke='${color}' stroke-width='2' fill='none' stroke-linecap='round'/>`;

// --- Boy 1 — cool stylish haircut (textured top fade) ----------------------
const BOY_1 = `
<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 120 120'>
  ${bg("b1", "#1e3a8a", "#3b82f6")}
  <!-- neck/shoulders -->
  <path d='M30 110 q30 -22 60 0 v10 h-60z' fill='#0b1530'/>
  <!-- face -->
  <ellipse cx='60' cy='58' rx='22' ry='25' fill='#d4a373'/>
  <!-- fade sides -->
  <path d='M37 56 q-2 -10 4 -20 q19 -16 38 0 q6 10 4 20 q-4 -8 -23 -8 t-23 8z' fill='#1a0f08'/>
  <!-- textured top -->
  <path d='M40 38 q5 -16 20 -16 t20 16 q-3 -2 -7 -2 q-3 4 -7 0 q-3 4 -6 0 q-4 4 -7 0 q-4 4 -6 0 q-4 -1 -7 2z' fill='#0d0905'/>
  <!-- side part line -->
  <path d='M52 36 q4 8 -2 18' stroke='#2a1a0e' stroke-width='1.2' fill='none' opacity='0.6'/>
  <!-- ear -->
  <ellipse cx='38' cy='62' rx='3' ry='5' fill='#b88a5e'/>
  ${eyes(52, 68, 60)}
  <!-- eyebrows -->
  <path d='M47 53 q5 -2 10 0' stroke='#0d0905' stroke-width='1.8' fill='none' stroke-linecap='round'/>
  <path d='M63 53 q5 -2 10 0' stroke='#0d0905' stroke-width='1.8' fill='none' stroke-linecap='round'/>
  ${smile(60, 72, 10)}
</svg>`;

// --- Boy 2 — trendy eyeglasses --------------------------------------------
const BOY_2 = `
<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 120 120'>
  ${bg("b2", "#064e3b", "#10b981")}
  <path d='M30 110 q30 -22 60 0 v10 h-60z' fill='#0a2a20'/>
  <ellipse cx='60' cy='58' rx='22' ry='25' fill='#e8b48a'/>
  <!-- short hair -->
  <path d='M38 44 q22 -22 44 0 v6 q-22 -10 -44 0z' fill='#3b2412'/>
  <ellipse cx='38' cy='62' rx='3' ry='5' fill='#c79068'/>
  ${eyes(52, 68, 60)}
  <!-- glasses — thick rounded frames -->
  <g fill='none' stroke='#0d0d0d' stroke-width='2.4'>
    <rect x='44' y='54' width='14' height='12' rx='5'/>
    <rect x='62' y='54' width='14' height='12' rx='5'/>
    <path d='M58 60 h4'/>
    <path d='M44 58 q-4 0 -6 2'/>
    <path d='M76 58 q4 0 6 2'/>
  </g>
  ${smile(60, 74, 10)}
</svg>`;

// --- Girl 1 — long wavy hair + hoop earrings ------------------------------
const GIRL_1 = `
<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 120 120'>
  ${bg("g1", "#831843", "#ec4899")}
  <!-- hair back -->
  <path d='M28 64 q0 -42 32 -42 t32 42 q-2 32 -8 56 h-48 q-6 -24 -8 -56z' fill='#1a0a06'/>
  <!-- face -->
  <ellipse cx='60' cy='60' rx='20' ry='24' fill='#f1c6a3'/>
  <!-- wavy front bangs -->
  <path d='M40 46 q4 -6 10 -2 q4 -6 10 -2 q4 -6 10 -2 q4 -6 10 -2 q-2 6 -8 8 q-22 4 -32 0z' fill='#1a0a06'/>
  <!-- hoop earrings -->
  <circle cx='38' cy='66' r='4' fill='none' stroke='#fde68a' stroke-width='2'/>
  <circle cx='82' cy='66' r='4' fill='none' stroke='#fde68a' stroke-width='2'/>
  ${eyes(52, 68, 62)}
  <!-- lashes -->
  <path d='M49 60 l-2 -2 M52 59 l-1 -2 M55 59 l1 -2' stroke='#1a1a2e' stroke-width='1' fill='none'/>
  <path d='M65 59 l-1 -2 M68 59 l1 -2 M71 60 l2 -2' stroke='#1a1a2e' stroke-width='1' fill='none'/>
  <!-- lips -->
  <path d='M54 74 q6 4 12 0 q-2 4 -6 4 t-6 -4z' fill='#be123c'/>
</svg>`;

// --- Girl 2 — ponytail + bow + blush --------------------------------------
const GIRL_2 = `
<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 120 120'>
  ${bg("g2", "#7c2d12", "#f59e0b")}
  <!-- ponytail behind -->
  <path d='M78 38 q22 14 18 44 q-2 14 -10 18 q4 -16 -2 -32 q-6 -14 -16 -22z' fill='#4a1f0a'/>
  <ellipse cx='60' cy='60' rx='20' ry='24' fill='#e8b48a'/>
  <!-- hair top + bangs -->
  <path d='M38 50 q-2 -28 22 -28 t22 28 q-2 -10 -22 -10 t-22 10z' fill='#4a1f0a'/>
  <path d='M42 48 q8 -4 18 -2 q10 -2 18 2 q-4 6 -18 6 t-18 -6z' fill='#3a1707'/>
  <!-- bow -->
  <g transform='translate(72 30)'>
    <path d='M0 0 q-8 -4 -8 6 q0 4 8 2 z' fill='#ec4899'/>
    <path d='M0 0 q8 -4 8 6 q0 4 -8 2 z' fill='#ec4899'/>
    <circle cx='0' cy='2' r='2' fill='#be185d'/>
  </g>
  ${eyes(52, 68, 62)}
  <!-- blush -->
  <circle cx='46' cy='70' r='3' fill='#fb7185' opacity='0.5'/>
  <circle cx='74' cy='70' r='3' fill='#fb7185' opacity='0.5'/>
  <path d='M54 76 q6 3 12 0' stroke='#be123c' stroke-width='2' fill='none' stroke-linecap='round'/>
</svg>`;

// --- Girl 3 — afro puff + statement earrings ------------------------------
const GIRL_3 = `
<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 120 120'>
  ${bg("g3", "#4c1d95", "#a78bfa")}
  <!-- afro puff -->
  <circle cx='60' cy='30' r='22' fill='#1a0d05'/>
  <circle cx='44' cy='34' r='10' fill='#1a0d05'/>
  <circle cx='76' cy='34' r='10' fill='#1a0d05'/>
  <circle cx='60' cy='20' r='10' fill='#1a0d05'/>
  <ellipse cx='60' cy='62' rx='20' ry='24' fill='#8b5a3c'/>
  <!-- hairline -->
  <path d='M40 50 q20 -10 40 0 q-2 6 -20 6 t-20 -6z' fill='#1a0d05'/>
  <!-- statement earrings (gold drops) -->
  <circle cx='38' cy='66' r='2' fill='#fbbf24'/>
  <path d='M38 68 q-2 6 0 12 q2 -6 0 -12z' fill='#fbbf24'/>
  <circle cx='82' cy='66' r='2' fill='#fbbf24'/>
  <path d='M82 68 q-2 6 0 12 q2 -6 0 -12z' fill='#fbbf24'/>
  ${eyes(52, 68, 62, "#2a1505")}
  <path d='M47 56 q5 -2 10 0' stroke='#1a0d05' stroke-width='1.6' fill='none' stroke-linecap='round'/>
  <path d='M63 56 q5 -2 10 0' stroke='#1a0d05' stroke-width='1.6' fill='none' stroke-linecap='round'/>
  <path d='M54 76 q6 4 12 0 q-2 4 -6 4 t-6 -4z' fill='#9f1239'/>
</svg>`;

// --- Girl 4 — braided crown + lipstick ------------------------------------
const GIRL_4 = `
<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 120 120'>
  ${bg("g4", "#0c4a6e", "#67e8f9")}
  <!-- back hair -->
  <path d='M30 64 q0 -38 30 -38 t30 38 q-2 30 -6 56 h-48 q-4 -26 -6 -56z' fill='#2a1505'/>
  <ellipse cx='60' cy='62' rx='20' ry='24' fill='#f0c8a0'/>
  <!-- braided crown (zig-zag across forehead) -->
  <path d='M38 46 q4 -6 8 0 q4 -6 8 0 q4 -6 8 0 q4 -6 8 0 q4 -6 8 0' stroke='#2a1505' stroke-width='6' fill='none' stroke-linecap='round'/>
  <path d='M38 46 q4 6 8 0 q4 6 8 0 q4 6 8 0 q4 6 8 0 q4 6 8 0' stroke='#3b1f0a' stroke-width='3' fill='none' stroke-linecap='round' opacity='0.7'/>
  <!-- small flower accent -->
  <g transform='translate(44 42)'>
    <circle cx='0' cy='0' r='1.6' fill='#fef3c7'/>
    <circle cx='-2' cy='-1' r='1.4' fill='#fde68a'/>
    <circle cx='2' cy='-1' r='1.4' fill='#fde68a'/>
    <circle cx='0' cy='2' r='1.4' fill='#fde68a'/>
  </g>
  ${eyes(52, 68, 62)}
  <path d='M48 60 q4 -2 8 0' stroke='#2a1505' stroke-width='1.4' fill='none' stroke-linecap='round'/>
  <path d='M64 60 q4 -2 8 0' stroke='#2a1505' stroke-width='1.4' fill='none' stroke-linecap='round'/>
  <!-- bold lipstick -->
  <path d='M52 74 q4 -3 8 0 q4 -3 8 0 q-2 6 -8 6 t-8 -6z' fill='#dc2626'/>
  <path d='M52 74 q8 5 16 0' stroke='#7f1d1d' stroke-width='0.8' fill='none'/>
</svg>`;

// --- Boy 4 — stylish side-swept undercut + earring -----------------------
const BOY_4 = `
<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 120 120'>
  ${bg("b4", "#7c2d12", "#fb923c")}
  <path d='M30 110 q30 -22 60 0 v10 h-60z' fill='#2a1407'/>
  <ellipse cx='60' cy='58' rx='22' ry='25' fill='#d4a373'/>
  <!-- undercut sides -->
  <path d='M37 60 q-2 -8 2 -16 q20 -10 42 -2 q4 8 2 18 q-4 -6 -23 -6 t-23 6z' fill='#2a1a0e'/>
  <!-- side-swept top -->
  <path d='M40 40 q4 -18 22 -18 q18 0 22 18 q-6 -2 -12 4 q-8 6 -18 4 q-8 -2 -14 -8z' fill='#0d0905'/>
  <!-- swept fringe over forehead -->
  <path d='M44 44 q14 -2 30 6 q-12 6 -28 4 q-3 -4 -2 -10z' fill='#1a0f08'/>
  <!-- earring stud -->
  <circle cx='38' cy='66' r='1.8' fill='#fde68a'/>
  <ellipse cx='38' cy='62' rx='3' ry='5' fill='#b88a5e'/>
  ${eyes(52, 68, 60)}
  <path d='M47 53 q5 -2 10 0' stroke='#0d0905' stroke-width='1.8' fill='none' stroke-linecap='round'/>
  <path d='M63 53 q5 -2 10 0' stroke='#0d0905' stroke-width='1.8' fill='none' stroke-linecap='round'/>
  ${smile(60, 72, 10)}
</svg>`;

// --- Boy 5 — cool curly top + beanie vibe ---------------------------------
const BOY_5 = `
<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 120 120'>
  ${bg("b5", "#1e293b", "#06b6d4")}
  <path d='M30 110 q30 -22 60 0 v10 h-60z' fill='#0b1530'/>
  <ellipse cx='60' cy='58' rx='22' ry='25' fill='#a06a48'/>
  <!-- curly top — overlapping circles -->
  <g fill='#1a0d05'>
    <circle cx='44' cy='38' r='8'/>
    <circle cx='52' cy='32' r='9'/>
    <circle cx='60' cy='30' r='10'/>
    <circle cx='68' cy='32' r='9'/>
    <circle cx='76' cy='38' r='8'/>
    <circle cx='40' cy='46' r='6'/>
    <circle cx='80' cy='46' r='6'/>
  </g>
  <!-- hairline fade -->
  <path d='M40 52 q20 -8 40 0 q-2 4 -20 4 t-20 -4z' fill='#0d0905'/>
  <ellipse cx='38' cy='62' rx='3' ry='5' fill='#7d4f30'/>
  ${eyes(52, 60, 60)}
  <path d='M47 53 q5 -2 10 0' stroke='#0d0905' stroke-width='1.8' fill='none' stroke-linecap='round'/>
  <path d='M55 53 q5 -2 10 0' stroke='#0d0905' stroke-width='1.8' fill='none' stroke-linecap='round'/>
  <!-- cool smirk -->
  <path d='M54 72 q6 3 12 -1' stroke='#1a1a2e' stroke-width='2' fill='none' stroke-linecap='round'/>
</svg>`;

export const AVATARS: Record<AvatarKey, AvatarDef> = {
  "boy-1": { label: "Sage", gender: "boy", svg: BOY_1 },
  "boy-2": { label: "Rex", gender: "boy", svg: BOY_2 },
  // Legacy key (old DB rows). Render as Sage so nothing breaks.
  "boy-3": { label: "Sage", gender: "boy", svg: BOY_1 },
  "boy-4": { label: "Kai", gender: "boy", svg: BOY_4 },
  "boy-5": { label: "Zane", gender: "boy", svg: BOY_5 },
  "girl-1": { label: "Zoe", gender: "girl", svg: GIRL_1 },
  "girl-2": { label: "Mira", gender: "girl", svg: GIRL_2 },
  "girl-3": { label: "Nia", gender: "girl", svg: GIRL_3 },
  "girl-4": { label: "Lila", gender: "girl", svg: GIRL_4 },
};

// Order in the picker — hide legacy "boy-3" duplicate from the gallery.
export const AVATAR_KEYS: AvatarKey[] = [
  "boy-1",
  "boy-2",
  "boy-4",
  "boy-5",
  "girl-1",
  "girl-2",
  "girl-3",
  "girl-4",
];

export function avatarDataUri(key: string): string {
  if (key && /^https?:\/\//i.test(key)) return key;
  const a = AVATARS[(key as AvatarKey)] ?? AVATARS["boy-1"];
  return `data:image/svg+xml;utf8,${encodeURIComponent(a.svg.trim())}`;
}

// --- Name-based gender guess + random avatar picker -----------------------
const FEMALE_NAMES = new Set([
  "ada","aisha","amaka","amara","amina","angela","anita","ann","anna","ashley",
  "barbara","beatrice","betty","blessing","bridget","carol","catherine","chioma",
  "chiamaka","chinwe","chidinma","chinaza","chinasa","christy","cynthia","daisy",
  "deborah","diana","ebere","elizabeth","ella","emily","emma","esther","eunice",
  "eva","faith","fatima","favour","funke","gloria","grace","hannah","helen",
  "ifeoma","ijeoma","ime","ireti","jane","janet","jennifer","jessica","joy",
  "joyce","julia","karen","kate","kemi","khadija","laura","lilian","linda",
  "lisa","love","lydia","maria","mariam","martha","mary","mercy","michelle",
  "mira","monica","nancy","ngozi","nia","nkechi","nneka","nora","oluchi",
  "olivia","onyeka","onyinye","patience","peace","precious","priscilla","rachel",
  "rebecca","rita","ruth","sandra","sarah","sharon","sofia","sophia","stella",
  "susan","tara","temitope","tina","tracy","uche","victoria","vivian","yetunde",
  "zainab","zara","zoe","lila","amelia","amelie","arya","aurora","ayesha",
  "bella","chloe","clara","ella","ellie","fiona","hadiza","halima","isla",
  "ivy","layla","lola","luna","maya","mia","naomi","nina","poppy","rose",
  "sade","tola","yvonne",
]);

const MALE_NAMES = new Set([
  "aaron","abdul","abdullah","abel","abraham","ade","adekunle","ahmed","ajayi",
  "akin","alan","alex","alexander","ali","amir","andrew","anthony","arthur",
  "ben","benjamin","bola","brian","bruno","caleb","carl","charles","chibuzo",
  "chidi","chike","chinedu","chris","christopher","damilola","daniel","danny",
  "david","dennis","dominic","drake","ebuka","edward","efe","eli","elijah",
  "emeka","emmanuel","eric","ethan","ezra","felix","francis","frank","gabriel",
  "george","gideon","godwin","henry","ibrahim","ifeanyi","ike","isaac","isaiah",
  "ismail","jack","jacob","james","jason","jeffrey","jeremiah","john","jonathan",
  "joseph","joshua","jude","julian","kayode","kelvin","kenneth","kevin","kingsley",
  "kunle","leo","liam","logan","louis","luke","mark","martin","matthew","max",
  "michael","mike","mohammed","muhammad","musa","nathan","nelson","nick","noah",
  "obi","odion","ola","olamide","olu","oluwaseun","onyeka","opeyemi","oscar",
  "patrick","paul","peter","philip","raphael","ray","richard","robert","ryan",
  "sam","samuel","sean","segun","seun","simon","solomon","stephen","steve","tega",
  "thomas","timothy","tobi","tom","tony","tunde","uche","umar","usman","victor",
  "wale","wesley","william","yusuf","zach","zane","kai","rex","sage","cole",
  "dante","felix","ezekiel","ezra",
]);

function guessGender(name: string): "boy" | "girl" {
  const first = (name || "").trim().split(/\s+/)[0]?.toLowerCase() ?? "";
  if (!first) return Math.random() < 0.5 ? "boy" : "girl";
  if (FEMALE_NAMES.has(first)) return "girl";
  if (MALE_NAMES.has(first)) return "boy";
  // Suffix heuristic — names ending in a/e/i/ya are commonly feminine.
  if (/(a|e|i|ya|ah|ia|na)$/.test(first)) return "girl";
  return "boy";
}

export function pickAvatarForName(name: string): AvatarKey {
  const gender = guessGender(name);
  const pool = AVATAR_KEYS.filter((k) => AVATARS[k].gender === gender);
  return pool[Math.floor(Math.random() * pool.length)] ?? "boy-1";
}

