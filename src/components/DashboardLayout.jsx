import { Link, useLocation } from "react-router-dom";

function DashboardLayout({ children }) {
  const location = useLocation();

  const isActive = (path) => location.pathname === path;

  return (
    <div style={styles.container}>

      {/* HEADER */}
      <header style={styles.header}>
        INSURANCE AI SYSTEM
      </header>

      {/* MAIN WRAPPER */}
      <div style={styles.mainWrapper}>

        {/* LEFT SIDEBAR */}
        <aside style={styles.sidebar}>
          <div style={styles.logo}>Claims AI</div>

          <nav style={styles.nav}>
            <Link
              to="/"
              style={{
                ...styles.navItem,
                ...(isActive("/") ? styles.active : {}),
              }}
            >
              🏠 Dashboard
            </Link>

            <Link
              to="/upload"
              style={{
                ...styles.navItem,
                ...(isActive("/upload") ? styles.active : {}),
              }}
            >
              📄 Upload Claim
            </Link>

            <Link
              to="/claims"
              style={{
                ...styles.navItem,
                ...(isActive("/claims") ? styles.active : {}),
              }}
            >
              📊 All Claims
            </Link>
          </nav>
        </aside>

        {/* FULL WIDTH CONTENT */}
        <main style={styles.content}>
          {children}
        </main>

      </div>
    </div>
  );
}

const styles = {
  container: {
    width: "100vw",
    height: "100vh",
    background: "black",
    overflow: "hidden",
    display: "flex",
    flexDirection: "column",
  },

  header: {
    height: "60px",
    background: "#050505",
    color: "gold",
    fontSize: "28px",
    textAlign: "center",
    borderBottom: "2px solid gold",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: "bold",
  },

  mainWrapper: {
    display: "flex",
    height: "calc(100vh - 60px)",
    width: "100%",
  },

  sidebar: {
    width: "250px",
    background: "#070707",
    borderRight: "2px solid gold",
    padding: "20px",
    height: "100%",
  },

  logo: {
    fontSize: "22px",
    color: "gold",
    fontWeight: "bold",
    marginBottom: "25px",
    textAlign: "center",
  },

  nav: {
    display: "flex",
    flexDirection: "column",
    gap: "12px",
  },

  navItem: {
    padding: "12px 14px",
    background: "#111",
    borderRadius: "10px",
    color: "#ccc",
    textDecoration: "none",
    fontSize: "16px",
    border: "1px solid #222",
    transition: "0.2s",
  },

  active: {
    background: "black",
    border: "1px solid gold",
    color: "gold",
  },

  content: {
    flex: 1,
    height: "100%",
    background: "black",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    padding: "40px",
    overflowY: "auto",
  },
};

export default DashboardLayout;
