import { Link } from "react-router-dom";

function Navbar() {
  return (
    <nav style={styles.nav}>
      <Link to="/" style={styles.link}>Upload</Link>
      <Link to="/claims" style={styles.link}>All Claims</Link>
    </nav>
  );
}

const styles = {
  nav: {
    background: "#111",
    padding: "15px",
    display: "flex",
    gap: "20px",
  },
  link: {
    color: "gold",
    fontWeight: "bold",
    textDecoration: "none",
  },
};

export default Navbar;
