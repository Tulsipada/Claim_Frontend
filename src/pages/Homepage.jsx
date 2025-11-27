import { useEffect, useState } from "react";

// ---------- Your images for slider ----------
const slides = [
  "/hero/hero1.jpg",
  "/hero/hero2.jpg",
  "/hero/hero3.jpg",
  "/hero/hero4.jpg",
];


function HomePage() {
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrent((prev) => (prev + 1) % slides.length);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div style={{ ...styles.page, backgroundImage: `url(${slides[current]})` }}>
      {/* Dark Overlay */}
      <div style={styles.overlay} />

      {/* Centered Hero Text */}
      <div style={styles.centerContent}>
        <h1 style={styles.title}>
          AI-Powered <span style={styles.highlight}>Insurance Claim</span> System
        </h1>

        <p style={styles.subtitle}>
          Automate PDF extraction, classification, fraud detection & claim analytics —  
          faster, smarter, accurate.
        </p>

        <div style={styles.btnRow}>
          <a href="/upload" style={styles.primaryBtn}>Upload Claim PDF</a>
          <a href="/dashboard" style={styles.secondaryBtn}>View Dashboard</a>
        </div>
      </div>

      {/* Footer */}
      <footer style={styles.footer}>
        © {new Date().getFullYear()} Insurance AI Claim System • Powered by AI
      </footer>
    </div>
  );
}

const styles = {
  page: {
  height: "100vh",
  width: "100vw",
  backgroundSize: "cover",
  backgroundPosition: "center",
  backgroundRepeat: "no-repeat",
  position: "relative",
  display: "flex",
  flexDirection: "column",
  justifyContent: "center",
  alignItems: "center",
  overflow: "hidden",
  transition: "background-image 0.8s ease-in-out", // 👈 add this
},



  overlay: {
    position: "absolute",
    inset: 0,
    background: "rgba(0,0,0,0.55)",
    zIndex: 1,
  },

  centerContent: {
    zIndex: 2,
    textAlign: "center",
    maxWidth: "900px",
    padding: "20px",
  },

  title: {
    color: "white",
    fontSize: "52px",
    fontWeight: "800",
    marginBottom: "20px",
    lineHeight: 1.2,
  },

  highlight: { color: "#60a5fa" },

  subtitle: {
    color: "#e5e7eb",
    fontSize: "18px",
    lineHeight: 1.7,
    marginBottom: "28px",
  },

  btnRow: {
    display: "flex",
    justifyContent: "center",
    gap: "18px",
    flexWrap: "wrap",
  },

  primaryBtn: {
    padding: "14px 28px",
    background: "#2563eb",
    color: "white",
    borderRadius: "999px",
    textDecoration: "none",
    fontWeight: "600",
    fontSize: "16px",
  },

  secondaryBtn: {
    padding: "14px 28px",
    background: "rgba(255,255,255,0.25)",
    border: "1px solid white",
    color: "white",
    borderRadius: "999px",
    textDecoration: "none",
    fontWeight: "600",
    fontSize: "16px",
  },

  footer: {
    zIndex: 2,
    position: "absolute",
    bottom: "20px",
    textAlign: "center",
    width: "100%",
    color: "#d1d5db",
    fontSize: "14px",
  },
};

export default HomePage;
