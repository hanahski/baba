import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/AppShell";
import { ArrowLeft, ExternalLink, Calendar } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export const Route = createFileRoute("/news_/$slug")({
  component: NewsArticlePage,
  head: ({ loaderData, params }: any) => {
    const a = loaderData?.article;
    const url = `/news/${params?.slug ?? ""}`;
    if (!a) return { meta: [{ title: "News — StudentsPlug" }], links: [{ rel: "canonical", href: url }] };
    return {
      meta: [
        { title: `${a.title} — EBSU Plug News`.slice(0, 70) },
        { name: "description", content: (a.summary ?? a.title).slice(0, 160) },
        { property: "og:title", content: a.title },
        { property: "og:description", content: (a.summary ?? a.title).slice(0, 200) },
        ...(a.image_url ? [{ property: "og:image", content: a.image_url }] : []),
        { property: "og:type", content: "article" },
        { property: "og:url", content: url },
        { property: "article:published_time", content: a.published_at ?? "" },
      ],
      links: [{ rel: "canonical", href: url }],
      scripts: [{
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "NewsArticle",
          headline: a.title,
          description: a.summary ?? undefined,
          image: a.image_url ?? undefined,
          datePublished: a.published_at ?? undefined,
          author: { "@type": "Organization", name: "StudentsPlug" },
        }),
      }],
    };
  },
  loader: async ({ params }) => {
    const { data } = await supabase
      .from("news_articles")
      .select("*")
      .eq("slug", params.slug)
      .eq("status", "published")
      .maybeSingle();
    if (!data) throw notFound();
    return { article: data };
  },
  notFoundComponent: () => (
    <AppShell>
      <div className="text-center py-16">
        <p className="font-bold">Article not found.</p>
        <Link to="/news" className="text-primary text-sm hover:underline">Back to news</Link>
      </div>
    </AppShell>
  ),
  errorComponent: ({ error }) => (
    <AppShell><p className="text-sm text-destructive py-8 text-center">Couldn't load: {error.message}</p></AppShell>
  ),
});

function NewsArticlePage() {
  const { slug } = Route.useParams();
  const { data: a } = useQuery({
    queryKey: ["news-article", slug],
    queryFn: async () => {
      const { data } = await supabase.from("news_articles").select("*").eq("slug", slug).maybeSingle();
      return data;
    },
  });

  if (!a) return <AppShell><p className="text-sm text-muted-foreground py-8 text-center">Loading…</p></AppShell>;

  const sources: string[] = Array.isArray(a.source_urls) ? (a.source_urls as any[]).filter((x): x is string => typeof x === "string") : [];

  return (
    <AppShell>
      <article className="max-w-3xl mx-auto">
        <Link to="/news" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4">
          <ArrowLeft className="w-4 h-4" /> All news
        </Link>

        <div className="inline-block text-xs font-bold uppercase tracking-wider text-primary mb-2">
          EBSU News
        </div>
        <h1 className="text-3xl sm:text-4xl font-display font-bold leading-tight mb-3">{a.title}</h1>
        {a.summary && <p className="text-lg text-muted-foreground mb-4">{a.summary}</p>}

        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-5">
          <Calendar className="w-3.5 h-3.5" />
          {new Date(a.published_at).toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" })}
        </div>

        {a.image_url && (
          <img src={a.image_url} alt="" className="w-full rounded-2xl mb-6 shadow-card" />
        )}

        <div className="prose prose-sm sm:prose-base max-w-none dark:prose-invert prose-headings:font-display">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{a.body}</ReactMarkdown>
        </div>

        {sources.length > 0 && (
          <div className="mt-8 pt-6 border-t">
            <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-2">Sources</h2>
            <ul className="space-y-1">
              {sources.map((u) => (
                <li key={u}>
                  <a href={u} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline inline-flex items-center gap-1 break-all">
                    {u} <ExternalLink className="w-3 h-3 shrink-0" />
                  </a>
                </li>
              ))}
            </ul>
          </div>
        )}
      </article>
    </AppShell>
  );
}
