import { createFileRoute, Link, notFound, useRouter } from "@tanstack/react-router";
import { useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { AppShell } from "@/components/AppShell";
import { getBlogPost } from "@/lib/blog.functions";

const postQuery = (slug: string) =>
  queryOptions({
    queryKey: ["blog-post", slug],
    queryFn: () => getBlogPost({ data: { slug } }),
  });

export const Route = createFileRoute("/blog/$slug")({
  loader: async ({ context, params }) => {
    const res = await context.queryClient.ensureQueryData(postQuery(params.slug));
    if (!res.post) throw notFound();
    return res;
  },
  head: ({ params, loaderData }) => {
    const post = loaderData?.post;
    const title = post ? `${post.title} | StudentsPlug Blog` : "Blog post — StudentsPlug";
    const description = post?.excerpt ?? "EBSU admission and cutoff mark guides on StudentsPlug.";
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:type", content: "article" },
        { property: "og:url", content: `/blog/${params.slug}` },
      ],
      links: [{ rel: "canonical", href: `/blog/${params.slug}` }],
      scripts: post
        ? [
            {
              type: "application/ld+json",
              children: JSON.stringify({
                "@context": "https://schema.org",
                "@type": "Article",
                headline: post.title,
                description: post.excerpt,
                datePublished: post.published_at,
                author: { "@type": "Organization", name: post.author_name },
              }),
            },
          ]
        : undefined,
    };
  },
  component: BlogPostPage,
  notFoundComponent: () => (
    <AppShell>
      <div className="mx-auto max-w-2xl py-16 text-center">
        <h1 className="text-2xl font-bold">Post not found</h1>
        <p className="mt-2 text-muted-foreground">That guide doesn't exist or was unpublished.</p>
        <Link to="/blog" className="mt-6 inline-flex rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground">
          Back to blog
        </Link>
      </div>
    </AppShell>
  ),
  errorComponent: ({ reset }) => {
    const router = useRouter();
    return (
      <AppShell>
        <div className="mx-auto max-w-2xl py-16 text-center">
          <h1 className="text-2xl font-bold">Couldn't load this post</h1>
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="mt-4 rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground"
          >
            Retry
          </button>
        </div>
      </AppShell>
    );
  },
});

function BlogPostPage() {
  const { post } = Route.useLoaderData();
  if (!post) return null;

  return (
    <AppShell>
      <article className="mx-auto max-w-3xl space-y-6">
        <nav className="text-xs text-muted-foreground">
          <Link to="/blog" className="hover:text-foreground">← All posts</Link>
        </nav>
        <header className="space-y-3">
          <div className="flex flex-wrap gap-2">
            {post.tags.map((t: string) => (
              <span key={t} className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
                {t}
              </span>
            ))}
          </div>
          <h1 className="text-3xl font-bold font-display sm:text-4xl">{post.title}</h1>
          <p className="text-muted-foreground">{post.excerpt}</p>
          <p className="text-xs text-muted-foreground">
            By {post.author_name} ·{" "}
            {new Date(post.published_at).toLocaleDateString(undefined, {
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </p>
        </header>
        <div className="prose prose-sm max-w-none dark:prose-invert sm:prose-base prose-headings:font-display">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{post.content}</ReactMarkdown>
        </div>
      </article>
    </AppShell>
  );
}
