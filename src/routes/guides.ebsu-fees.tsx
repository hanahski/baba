import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";

export const Route = createFileRoute("/guides/ebsu-fees")({
  component: EbsuFeesGuide,
  head: () => ({
    meta: [
      { title: "EBSU School Fees & Admission Portal Guide (2026)" },
      { name: "description", content: "Step-by-step guide to checking Ebonyi State University school fees, using the EBSU portal, and tracking your admission status as a fresher or returning student." },
      { property: "og:title", content: "EBSU School Fees & Portal Guide" },
      { property: "og:description", content: "Check your EBSU school fees, log in to the portal, and track admission status — explained simply for new and returning students." },
      { property: "og:type", content: "article" },
      { property: "og:url", content: "/guides/ebsu-fees" },
    ],
    links: [{ rel: "canonical", href: "/guides/ebsu-fees" }],
    scripts: [{
      type: "application/ld+json",
      children: JSON.stringify({
        "@context": "https://schema.org",
        "@type": "Article",
        headline: "EBSU School Fees & Admission Portal Guide",
        author: { "@type": "Organization", name: "StudentsPlug" },
        about: "Ebonyi State University fees and portal",
      }),
    }],
  }),
});

function EbsuFeesGuide() {
  return (
    <AppShell>
      <article className="max-w-3xl mx-auto prose prose-sm sm:prose-base dark:prose-invert prose-headings:font-display">
        <h1>EBSU School Fees & Admission Portal Guide</h1>
        <p className="lead text-muted-foreground">
          Everything an EBSU student needs to check school fees, log in to the official portal, and confirm admission status — without getting lost on the way.
        </p>

        <h2>1. Where to check EBSU school fees</h2>
        <p>
          Fees vary by faculty, department and level (100L freshers usually pay more than returning students because of one-off charges like acceptance and matriculation). The single source of truth is the official EBSU portal at <a href="https://portal.ebsu.edu.ng" target="_blank" rel="noopener">portal.ebsu.edu.ng</a>. Log in with your matric number, open <em>Payments → School Fees Schedule</em>, and pick your session.
        </p>

        <h2>2. EBSU portal login (fresh & returning students)</h2>
        <ol>
          <li>Open <a href="https://portal.ebsu.edu.ng" target="_blank" rel="noopener">portal.ebsu.edu.ng</a>.</li>
          <li>Freshers: log in with the JAMB registration number first, then change to matric number after registration.</li>
          <li>Returning students: matric number + the password you set during course registration.</li>
          <li>If you forgot the password, use the "Reset password" link and check the email tied to your portal account.</li>
        </ol>

        <h2>3. Checking your admission status</h2>
        <p>
          Newly admitted? Two places to confirm: <strong>JAMB CAPS</strong> for the official offer, and the EBSU portal's <em>Admission Status</em> page for your matric number assignment. If CAPS shows admitted but the EBSU portal hasn't updated, give it 24–72 hours after acceptance fee payment.
        </p>

        <h2>4. Paying school fees online</h2>
        <p>
          From the portal, generate a Remita RRR, then pay via bank transfer, USSD or any bank branch. Always download the receipt — the portal only marks you as cleared once Remita confirms.
        </p>

        <h2>5. Common problems & fixes</h2>
        <ul>
          <li><strong>Portal not loading:</strong> try a different network (MTN/Airtel often beat campus Wi-Fi at peak hours).</li>
          <li><strong>Payment not reflecting:</strong> wait 1 hour, then upload the receipt under <em>Payments → Verify</em>.</li>
          <li><strong>Course registration locked:</strong> usually means fees aren't fully cleared — recheck the breakdown.</li>
        </ul>

        <h2>Need help from other students?</h2>
        <p>
          Post your question in the <Link to="/">StudentsPlug feed</Link> — fellow EBSU students reply with the exact step that worked for them.
        </p>
      </article>
    </AppShell>
  );
}
