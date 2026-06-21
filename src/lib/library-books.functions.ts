import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const catalogInput = z.object({
  category: z.enum(["all", "novel", "book", "comics", "poetry"]).default("all"),
  query: z.string().trim().max(100).default(""),
  limit: z.number().int().min(1).max(120).default(120),
});

export const getLibraryBooks = createServerFn({ method: "GET" })
  .inputValidator((input) => catalogInput.parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    let query = supabaseAdmin
      .from("library_books")
      .select("id,title,author,cover_url,category,price_credits,created_at,source")
      .in("source", ["user", "freebookcentre"])
      .not("title", "is", null)
      .neq("title", "")
      .order("created_at", { ascending: false })
      .limit(data.limit);

    if (data.category !== "all") query = query.eq("category", data.category);
    if (data.query) {
      const like = `%${data.query.replace(/[%,]/g, " ")}%`;
      query = query.or(`title.ilike.${like},author.ilike.${like}`);
    }

    const { data: books, error } = await query;
    if (error) throw new Error("Could not load the book catalog");
    return books ?? [];
  });
