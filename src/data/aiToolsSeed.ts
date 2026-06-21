// Built-in AI tools that travel with the codebase.
// Every approved tool baked here is auto-installed into a fresh database on
// first admin visit — so remixes of this project ship with the same tools.
//
// To add a new one: in /admin → Tool AI, click "Export to codebase" on an
// approved tool, then paste the snippet into the array below.

export type SeedTool = {
  slug: string;
  title: string;
  description: string;
  icon: string;
  category: "edu" | "other";
  kind: "ai_prompt" | "ai_image" | "api_call";
  config: Record<string, any>;
};

export const BUILTIN_AI_TOOLS: SeedTool[] = [
  {
    slug: "word-definer",
    title: "Word definer",
    description: "Get the definition, part of speech and example sentences for any English word.",
    icon: "BookA",
    category: "edu",
    kind: "api_call",
    config: {
      url: "https://api.dictionaryapi.dev/api/v2/entries/en/{input}",
      method: "GET",
      input_label: "Word",
      input_placeholder: "serendipity",
      result_path: "",
    },
  },
  {
    slug: "academic-rewriter",
    title: "Academic rewriter",
    description: "Rewrite your paragraph in clear, formal academic English.",
    icon: "FileText",
    category: "edu",
    kind: "ai_prompt",
    config: {
      system_prompt:
        "You rewrite the user's text in formal academic English. Keep the meaning, improve clarity, fix grammar, vary sentence structure, and avoid contractions. Return only the rewritten paragraph.",
      model: "google/gemini-2.5-flash",
      input_label: "Your paragraph",
      input_placeholder: "Paste a paragraph to rewrite…",
      output_format: "markdown",
    },
  },
  {
    slug: "explain-like-im-5",
    title: "Explain like I'm 5",
    description: "Turn any complex topic into a simple, friendly explanation.",
    icon: "Brain",
    category: "edu",
    kind: "ai_prompt",
    config: {
      system_prompt:
        "Explain the user's topic to a curious 5-year-old. Use short sentences, simple words, and a fun analogy. Keep it under 150 words.",
      model: "google/gemini-2.5-flash-lite",
      input_label: "Topic",
      input_placeholder: "quantum entanglement",
      output_format: "markdown",
    },
  },
  {
    slug: "country-facts",
    title: "Country facts",
    description: "Capital, population, region and currency for any country.",
    icon: "Globe2",
    category: "other",
    kind: "api_call",
    config: {
      url: "https://restcountries.com/v3.1/name/{input}",
      method: "GET",
      input_label: "Country",
      input_placeholder: "Nigeria",
      result_path: "",
    },
  },
  {
    slug: "study-vibe-wallpaper",
    title: "Study-vibe wallpaper",
    description: "Generate an aesthetic study-room wallpaper from a vibe description.",
    icon: "Image",
    category: "other",
    kind: "ai_image",
    config: {
      prompt_template:
        "A cozy aesthetic study room wallpaper, soft lighting, depth of field, vibe: {input}. Cinematic, 4k, no text.",
      input_label: "Vibe",
      input_placeholder: "rainy night, lo-fi, warm lamp",
    },
  },
];
