import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title: "Terms of Service — StudentsPlug" },
      {
        name: "description",
        content:
          "The terms that govern your use of StudentsPlug — acceptable use, content ownership, accounts, and liability.",
      },
      { property: "og:title", content: "Terms of Service — StudentsPlug" },
      {
        property: "og:description",
        content: "Rules and terms for using the StudentsPlug platform.",
      },
      { property: "og:url", content: "/terms" },
    ],
    links: [{ rel: "canonical", href: "/terms" }],
  }),
  component: TermsPage,
});

function TermsPage() {
  return (
    <AppShell>
      <article className="mx-auto max-w-3xl space-y-6">
        <header className="space-y-2">
          <p className="text-sm font-semibold text-primary">Legal</p>
          <h1 className="text-3xl font-bold font-display sm:text-4xl">Terms of Service</h1>
          <p className="text-sm text-muted-foreground">Last updated: June 2026</p>
        </header>

        <section className="space-y-2">
          <h2 className="text-xl font-bold font-display">1. Acceptance of Terms</h2>
          <p>
            By accessing or using StudentsPlug, you agree to be bound by these Terms of Service.
            If you do not agree, please do not use the service.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-xl font-bold font-display">2. Eligibility</h2>
          <p>
            StudentsPlug is intended for university students aged 16 and above. By using the
            platform, you confirm you meet this requirement.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-xl font-bold font-display">3. User Accounts</h2>
          <p>
            You are responsible for maintaining the confidentiality of your account credentials
            and for all activity that occurs under your account. Notify us immediately of any
            unauthorized use.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-xl font-bold font-display">4. Acceptable Use</h2>
          <p>You agree not to:</p>
          <ul className="list-disc pl-6 space-y-1 text-muted-foreground">
            <li>Post content that is unlawful, harassing, defamatory, or infringing.</li>
            <li>Upload copyrighted material you do not own or have permission to share.</li>
            <li>Attempt to disrupt, hack, or reverse-engineer the service.</li>
            <li>Use automated tools to scrape or extract data without permission.</li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="text-xl font-bold font-display">5. Content Ownership</h2>
          <p>
            You retain ownership of content you submit. By posting, you grant StudentsPlug a
            non-exclusive, royalty-free license to host, display, and distribute it within the
            platform.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-xl font-bold font-display">6. Third-Party Content & Ads</h2>
          <p>
            StudentsPlug may display advertisements served by third parties such as Google
            AdSense. We do not control and are not responsible for third-party content. Your
            interactions with advertisers are solely between you and them.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-xl font-bold font-display">7. Termination</h2>
          <p>
            We may suspend or terminate accounts that violate these Terms or harm other users or
            the platform.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-xl font-bold font-display">8. Disclaimer</h2>
          <p>
            StudentsPlug is provided "as is" without warranties of any kind. We do not guarantee
            the accuracy or completeness of user-submitted content.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-xl font-bold font-display">9. Limitation of Liability</h2>
          <p>
            To the maximum extent permitted by law, StudentsPlug and its operators will not be
            liable for any indirect, incidental, or consequential damages arising from your use
            of the service.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-xl font-bold font-display">10. Changes to These Terms</h2>
          <p>
            We may update these Terms from time to time. Continued use of StudentsPlug after
            changes are posted constitutes acceptance of the revised Terms.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-xl font-bold font-display">11. Contact</h2>
          <p>
            For questions about these Terms, please use our <a href="/contact" className="text-primary underline">contact page</a>.
          </p>
        </section>
      </article>
    </AppShell>
  );
}
