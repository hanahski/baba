import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title: "Contact StudentsPlug — Support & Feedback" },
      {
        name: "description",
        content:
          "Contact StudentsPlug for support, feedback, safety reports, content questions, or partnership enquiries.",
      },
      { property: "og:title", content: "Contact StudentsPlug" },
      {
        property: "og:description",
        content: "Get support or send feedback to the StudentsPlug team.",
      },
      { property: "og:url", content: "/contact" },
    ],
    links: [{ rel: "canonical", href: "/contact" }],
  }),
  component: ContactPage,
});

function ContactPage() {
  return (
    <AppShell>
      <article className="mx-auto max-w-3xl space-y-8">
        <header className="space-y-3">
          <p className="text-sm font-semibold text-primary">Contact</p>
          <h1 className="text-3xl font-bold font-display sm:text-4xl">How can we help?</h1>
          <p className="text-muted-foreground">
            Use the in-app report tool to contact the StudentsPlug team about support, feedback,
            safety, or content concerns.
          </p>
        </header>
        <section className="space-y-3 border-y py-6">
          <h2 className="text-xl font-bold font-display">Fastest way to reach us</h2>
          <p>
            Sign in, open the relevant page, and tap <strong>Report</strong>. Include the page,
            book, post, or account involved and describe what happened. Your report goes directly to
            the moderation team.
          </p>
          <Button asChild>
            <Link to="/login" search={{ redirect: "/" }}>
              Sign in to StudentsPlug
            </Link>
          </Button>
        </section>
        <section className="space-y-3">
          <h2 className="text-xl font-bold font-display">Content and copyright</h2>
          <p>
            If you own content shown on StudentsPlug and believe it was shared without permission,
            report that specific item and provide enough information for us to identify the work and
            review your request.
          </p>
        </section>
      </article>
    </AppShell>
  );
}
