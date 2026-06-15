import { useAuth } from "../context/AuthContext.jsx";

export default function Navbar({ onNavigate, transparent = false }) {
  const { isAuthenticated, logout } = useAuth();

  async function handleSignOut() {
    await logout();
    onNavigate("home", { replace: true });
  }

  return (
    <header className={`public-header${transparent ? " transparent" : ""}`}>
      <button className="wordmark" onClick={() => onNavigate("home")}>
        <span className="wordmark-seal">CV</span>
        <span>
          <strong>Chronicle Vault</strong>
          <small>Vintage Watch Authentication Registry</small>
        </span>
      </button>

      <nav className="public-nav" aria-label="Public navigation">
        <button onClick={() => onNavigate("home")}>About</button>
        <button onClick={() => onNavigate("lookup")}>Serial Lookup</button>
        {isAuthenticated ? (
          <>
            <button className="button primary compact" onClick={() => onNavigate("dashboard")}>
              Dashboard
            </button>
            <button onClick={handleSignOut}>Sign out</button>
          </>
        ) : (
          <button className="button primary compact" onClick={() => onNavigate("login")}>
            Login
          </button>
        )}
      </nav>
    </header>
  );
}
