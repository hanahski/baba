import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy Policy — StudentsPlug" },
      {
        name: "description",
        content:
          "Read how StudentsPlug collects, uses, protects, and manages account, content, device, and activity information.",
      },
      { property: "og:title", content: "StudentsPlug Privacy Policy" },
      {
        property: "og:description",
        content: "How StudentsPlug handles information and user privacy.",
      },
      { property: "og:url", content: "/privacy" },
    ],
    links: [{ rel: "canonical", href: "/privacy" }],
  }),
  component: PrivacyPage,
});

function PrivacyPage() {
  return (
    <AppShell>
      <article className="mx-auto max-w-3xl space-y-8">
        <header className="space-y-3">
          <p className="text-sm font-semibold text-primary">Privacy Policy</p>
          <h1 className="text-3xl font-bold font-display sm:text-4xl">
            Your privacy on StudentsPlug
          </h1>
          <p className="text-sm text-muted-foreground">Last updated: June 13, 2026</p>
        </header>
        <section className="space-y-3">
          <h2 className="text-xl font-bold font-display">Information we collect</h2>
          <p>
            We collect information you provide when creating an account, editing your profile,
            publishing content, sending messages, making reports, or using marketplace and learning
            features. We also process basic device, session, and usage information needed to secure
            and operate the service.
          </p>
        </section>
        <section className="space-y-3">
          <h2 className="text-xl font-bold font-display">How we use information</h2>
          <p>
            Information is used to provide accounts and features, display content you choose to
            share, personalize your experience, prevent abuse, moderate reports, maintain
            reliability, and improve StudentsPlug.
          </p>
        </section>
        <section className="space-y-3">
          <h2 className="text-xl font-bold font-display">Sharing and visibility</h2>
          <p>
            Public posts, profile details, listings, comments, and published books can be visible to
            other people. Private messages and unpublished drafts are limited to their intended
            participants, except where access is necessary for safety, legal compliance, or service
            operation.
          </p>
        </section>
        <section className="space-y-3">
          <h2 className="text-xl font-bold font-display">Storage and security</h2>
          <p>
            We use access controls and technical safeguards to protect information. No online
            service can guarantee absolute security, so users should protect their passwords and
            report suspected misuse promptly.
          </p>
        </section>
        <section className="space-y-3">
          <h2 className="text-xl font-bold font-display">Your choices</h2>
          <p>
            You can update profile information, remove content where the feature allows it, control
            certain visibility settings, or ask us to review an account or privacy concern through
            the in-app report tool.
          </p>
        </section>
        <section className="space-y-3">
          <h2 className="text-xl font-bold font-display">Cookies and similar technology</h2>
          <p>
            StudentsPlug uses local storage, cookies, and similar technologies for sign-in sessions,
            preferences, security, and core functionality. Future analytics or advertising services
            may use similar technology subject to their own policies and applicable consent
            requirements.
          </p>
        </section>
        <section className="space-y-3">
          <h2 className="text-xl font-bold font-display">Children and changes</h2>
          <p>
            StudentsPlug is intended for university communities and is not directed to children
            under 13. We may update this policy as the service changes and will revise the date
            above when we do.
          </p>
        </section>
        <section className="space-y-3">
          <h2 className="text-xl font-bold font-display">Contact</h2>
          <p>
            For privacy questions or requests, use the Report control inside StudentsPlug and
            describe your request clearly.
          </p>
        </section>
      </article>
    </AppShell>
  );
}
