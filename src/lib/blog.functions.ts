import { createServerFn } from "@tanstack/react-start";

export type BlogPostSummary = {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  cover_url: string | null;
  tags: string[];
  author_name: string;
  published_at: string;
};

export type BlogPost = BlogPostSummary & { content: string };

export const listBlogPosts = createServerFn({ method: "GET" }).handler(
  async (): Promise<{ posts: BlogPostSummary[] }> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("blog_posts")
      .select("id, slug, title, excerpt, cover_url, tags, author_name, published_at")
      .eq("published", true)
      .order("published_at", { ascending: false });
    if (error) throw new Error(error.message);
    return { posts: (data ?? []) as BlogPostSummary[] };
  },
);

export const getBlogPost = createServerFn({ method: "GET" })
  .inputValidator((data: { slug: string }) => data)
  .handler(async ({ data }): Promise<{ post: BlogPost | null }> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row, error } = await supabaseAdmin
      .from("blog_posts")
      .select("id, slug, title, excerpt, content, cover_url, tags, author_name, published_at")
      .eq("slug", data.slug)
      .eq("published", true)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return { post: (row as BlogPost | null) ?? null };
  });
