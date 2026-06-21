import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import { AppShell } from "@/components/AppShell";
import { listBlogPosts } from "@/lib/blog.functions";

const postsQuery = queryOptions({
  queryKey: ["blog-posts"],
  queryFn: () => listBlogPosts(),
});

export const Route = createFileRoute("/blog/")({
  loader: ({ context }) => context.queryClient.ensureQueryData(postsQuery),
  head: () => ({
    meta: [
      { title: "Blog — StudentsPlug | EBSU Admission & Cutoff Mark Guides" },
      {
        name: "description",
        content:
          "Up-to-date guides on EBSU cutoff marks, JAMB and Post-UTME requirements, admission tips and student life at Ebonyi State University.",
      },
      { property: "og:title", content: "StudentsPlug Blog — EBSU Guides" },
      {
        property: "og:description",
        content:
          "EBSU cutoff marks, admission requirements, Post-UTME tips and aggregate-score breakdowns by course.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "/blog" },
    ],
    links: [{ rel: "canonical", href: "/blog" }],
  }),
  component: BlogIndex,
});

function BlogIndex() {
  const { data } = useSuspenseQuery(postsQuery);
  const posts = data.posts;

  return (
    <AppShell>
      <header className="mb-6 space-y-2">
        <p className="text-sm font-semibold text-primary">StudentsPlug Blog</p>
        <h1 className="text-3xl font-bold font-display sm:text-4xl">
          EBSU admission, cutoff marks &amp; student guides
        </h1>
        <p className="text-muted-foreground">
          Original guides written for Ebonyi State University aspirants and current students.
        </p>
      </header>

      <ul className="grid gap-4 sm:grid-cols-2">
        {posts.map((p) => (
          <li
            key={p.id}
            className="rounded-xl border bg-card p-5 transition hover:shadow-card"
          >
            <Link to="/blog/$slug" params={{ slug: p.slug }} className="block space-y-2">
              <p className="text-xs font-medium uppercase tracking-wide text-primary">
                {p.tags[0] ?? "Guide"}
              </p>
              <h2 className="text-lg font-bold font-display leading-snug">{p.title}</h2>
              <p className="text-sm text-muted-foreground line-clamp-3">{p.excerpt}</p>
              <p className="text-xs text-muted-foreground">
                {new Date(p.published_at).toLocaleDateString(undefined, {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}{" "}
                · {p.author_name}
              </p>
            </Link>
          </li>
        ))}
      </ul>

      {posts.length === 0 ? (
        <p className="mt-10 text-center text-sm text-muted-foreground">
          No posts published yet.
        </p>
      ) : null}
    </AppShell>
  );
}
