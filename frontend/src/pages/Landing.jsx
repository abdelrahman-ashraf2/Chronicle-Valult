import Navbar from "../components/Navbar.jsx";
import { useAuth } from "../context/AuthContext.jsx";

const features = [
  {
    title: "Serial Number Tracking",
    body: "Track every registered watch by serial number with a clean public verification flow."
  },
  {
    title: "Movement & Parts Verification",
    body: "Document calibre details and originality status for critical components."
  },
  {
    title: "Auction History Records",
    body: "Preserve sale dates, houses, and prices alongside the watch they belong to."
  },
  {
    title: "Authentication Checks",
    body: "Review serial, parts, and auction findings in one final authentication result."
  }
];

const testimonials = [
  {
    quote: "Chronicle Vault gave structure to a collection that had outgrown spreadsheets years ago.",
    name: "Elias Moreau",
    title: "Private Collector, Geneva"
  },
  {
    quote: "The serial lookup feels discreet and refined. It gives clients confidence without exposing anything private.",
    name: "Amelia Hart",
    title: "Vintage Watch Consultant"
  },
  {
    quote: "It is rare to find a registry that treats provenance, parts, and authentication as one story.",
    name: "Ruben Vale",
    title: "Auction Advisor, London"
  }
];

export default function Landing({ onNavigate }) {
  const { isAuthenticated } = useAuth();

  return (
    <main className="public-site">
      <section className="hero">
        <Navbar onNavigate={onNavigate} transparent />
        <div className="hero-glow" />
        <div className="hero-content">
          <p className="eyebrow">Vintage Watch Authentication Registry</p>
          <h1>Chronicle Vault</h1>
          <p className="hero-subtitle">Vintage Watch Authentication Registry</p>
          <p className="hero-copy">
            A secure registry for tracking serial numbers, movements, original parts,
            auction history, and authentication checks.
          </p>
          <div className="hero-actions">
            <button className="button primary large" onClick={() => onNavigate(isAuthenticated ? "dashboard" : "login")}>
              {isAuthenticated ? "Dashboard" : "Login"}
            </button>
            <button className="button ghost large" onClick={() => onNavigate("lookup")}>
              Serial Lookup
            </button>
          </div>
        </div>
        <div className="watch-orbit" aria-hidden="true">
          <div className="watch-crown" />
          <div className="watch-face">
            <span className="marker twelve">12</span>
            <span className="marker three">3</span>
            <span className="marker six">6</span>
            <span className="marker nine">9</span>
            <i className="hand hour" />
            <i className="hand minute" />
            <b />
          </div>
        </div>
      </section>

      <section className="public-section feature-intro">
        <div>
          <p className="eyebrow">Features</p>
          <h2>Built for collectors, advisors, and authentication workflows.</h2>
        </div>
        <p>
          Chronicle Vault keeps the identity of each watch intact, from production year and case material
          to market history and formal authentication results.
        </p>
      </section>

      <section className="feature-grid feature-grid-four">
        {features.map((feature, index) => (
          <article key={feature.title}>
            <span>{String(index + 1).padStart(2, "0")}</span>
            <h3>{feature.title}</h3>
            <p>{feature.body}</p>
          </article>
        ))}
      </section>

      <section className="public-section about-section">
        <div>
          <p className="eyebrow">About</p>
          <h2>A private archive with a public confidence layer.</h2>
        </div>
        <p>
          Chronicle Vault is designed to separate what should stay private from what should be verifiable.
          Members manage detailed watch records inside a secure dashboard, while the public lookup page
          reveals only safe authentication signals for serial-based verification.
        </p>
      </section>

      <section className="testimonial-band">
        <div className="testimonial-header">
          <p className="eyebrow">Testimonials</p>
          <h2>Trusted by people who care about provenance.</h2>
        </div>
        <div className="testimonial-grid">
          {testimonials.map((item) => (
            <article className="testimonial-card" key={item.name}>
              <p className="testimonial-quote">"{item.quote}"</p>
              <strong>{item.name}</strong>
              <span>{item.title}</span>
            </article>
          ))}
        </div>
      </section>

      <section className="lookup-cta">
        <p className="eyebrow">Public Verification</p>
        <h2>Search by serial number.</h2>
        <p>Verify a registered watch without exposing owner details, internal notes, or private account data.</p>
        <button className="button primary large" onClick={() => onNavigate("lookup")}>
          Open Serial Lookup
        </button>
      </section>

      <footer className="public-footer">
        <span>Chronicle Vault</span>
        <small>Secure registry for vintage watch authentication and provenance.</small>
      </footer>
    </main>
  );
}
