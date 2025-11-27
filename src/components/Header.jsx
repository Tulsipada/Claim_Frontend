import { Link, useLocation } from "react-router-dom";

function Header() {
  const location = useLocation();

  const navItem = (path, label) => ({
    path,
    label,
    active: location.pathname === path,
  });

  const items = [
    navItem("/", "Home"),
    navItem("/dashboard", "Dashboard"),
    navItem("/upload", "Upload PDF"),
    navItem("/claims", "Claim Data"),
  ];

  return (
    <header style={styles.header}>
      <div style={styles.logoArea}>
        <div style={styles.logoCircle}>AI</div>
        <div style={styles.logoText}>
          <div style={styles.logoTitle}>Insurance AI Agent</div>
          <div style={styles.logoSubtitle}>Smart Claim Intelligence</div>
        </div>
      </div>

      <nav style={styles.nav}>
        {items.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            style={{
              ...styles.navLink,
              ...(item.active ? styles.navLinkActive : {}),
            }}
          >
            {item.label}
          </Link>
        ))}
      </nav>
    </header>
  );
}

const styles = {
  header: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    height: "70px",
    padding: "0 40px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    background: "rgba(255, 255, 255, 0.9)",
    backdropFilter: "blur(10px)",
    boxShadow: "0 2px 10px rgba(0,0,0,0.06)",
    zIndex: 100,
  },
  logoArea: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
  },
  logoCircle: {
    width: "40px",
    height: "40px",
    borderRadius: "50%",
    background:
      "linear-gradient(135deg, #3b82f6, #22c1c3)", // blue-ish water/insurance feel
    color: "#fff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: "700",
  },
  logoText: {
    lineHeight: 1.2,
  },
  logoTitle: {
    fontSize: "18px",
    fontWeight: "700",
    color: "#1f2933",
  },
  logoSubtitle: {
    fontSize: "12px",
    color: "#6b7280",
  },
  nav: {
    display: "flex",
    gap: "20px",
    background: "#f1f5f9",
    padding: "6px 14px",
    borderRadius: "999px",
    border: "1px solid #e2e8f0",
  },
  navLink: {
    textDecoration: "none",
    fontSize: "14px",
    padding: "6px 14px",
    borderRadius: "999px",
    color: "#475569",
    fontWeight: "500",
  },
  navLinkActive: {
    background: "#2563eb",
    color: "#ffffff",
  },
};

export default Header;
