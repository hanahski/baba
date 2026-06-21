import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "About StudentsPlug — Student Knowledge Hub" },
      {
        name: "description",
        content:
          "Learn how StudentsPlug helps university students share knowledge, discover study resources, and connect with their campus community.",
      },
      { property: "og:title", content: "About StudentsPlug" },
      {
        property: "og:description",
        content: "A student-first knowledge and campus community platform.",
      },
      { property: "og:url", content: "/about" },
    ],
    links: [{ rel: "canonical", href: "/about" }],
  }),
  component: AboutPage,
});

function AboutPage() {
  return (
    <AppShell>
      <article className="mx-auto max-w-3xl space-y-8">
        <header className="space-y-3">
          <p className="text-sm font-semibold text-primary">About StudentsPlug</p>
          <h1 className="text-3xl font-bold font-display sm:text-4xl">
            Built for students who learn better together
          </h1>
          <p className="text-muted-foreground">
            StudentsPlug is a student knowledge hub for discovering useful academic resources,
            sharing original work, and staying connected to campus life.
          </p>
        </header>
        <section className="space-y-3">
          <h2 className="text-xl font-bold font-display">What we do</h2>
          <p>
            We bring study notes, past questions, courses, books, campus news, learning tools, and
            student conversations into one accessible place. Writers can publish their own books,
            while students can find material relevant to their studies.
          </p>
        </section>
        <section className="space-y-3">
          <h2 className="text-xl font-bold font-display">Our standards</h2>
          <p>
            We aim to keep StudentsPlug useful, respectful, and safe. Community members are expected
            to share content they created or have permission to distribute. We may remove
            incomplete, misleading, unsafe, or rights-infringing material.
          </p>
        </section>
        <section className="space-y-3">
          <h2 className="text-xl font-bold font-display">Our audience</h2>
          <p>
            The platform is designed primarily for university students, educators, writers, and
            campus communities seeking practical knowledge and genuine peer support.
          </p>
        </section>
      </article>
    </AppShell>
  );
}
