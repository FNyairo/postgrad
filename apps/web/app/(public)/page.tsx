// Scaffold placeholder. The real landing page design lives at
// docs/design/landing-preview.html and deploy/pgsts-landing-preview/ (static
// review copy). Porting it into this route as a proper component — with the
// preview banner and placeholder brackets removed — is a build-order step of
// its own, done once the copy deck's Note A/B decisions come back and the
// static page is no longer needed for review.
export default function LandingPage() {
  return (
    <main style={{ fontFamily: "system-ui", padding: "3rem 1.5rem" }}>
      <h1>PGSTS — scaffold running</h1>
      <p>
        This is the Next.js app shell, not the real landing page yet. See{" "}
        <code>docs/design/landing-preview.html</code> for the reviewed design.
      </p>
    </main>
  );
}
