import { useState } from "react";

function UploadPage() {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [errorMsg, setErrorMsg] = useState("");

  const uploadPDF = async () => {
    if (!file) {
      setErrorMsg("⚠ Please select a PDF file first.");
      return;
    }

    setLoading(true);
    setErrorMsg("");
    setResult(null);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("http://127.0.0.1:8000/upload-claim", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        setErrorMsg(data.detail || "Upload failed.");
      } else {
        setResult(data);
      }
    } catch (error) {
      setErrorMsg("❌ Error uploading file.");
    }

    setLoading(false);
  };

  return (
    <div style={styles.page}>
      <div style={styles.overlay} />

      <div style={styles.container}>
        {/* Heading */}
        <h1 style={styles.title}>Upload Claim PDF</h1>
        <p style={styles.subtitle}>
          Upload your Insurance Claim PDF — AI will extract, classify, and analyze automatically.
        </p>

        {/* Upload Card */}
        <div style={styles.card}>
          <label style={styles.dropArea}>
            <input
              type="file"
              accept="application/pdf"
              style={styles.hiddenInput}
              onChange={(e) => setFile(e.target.files[0])}
            />

            <span style={styles.dropMain}>
              {file ? file.name : "Click to select a PDF file"}
            </span>
            <span style={styles.dropHint}>
              Only PDF files are supported.
            </span>
          </label>

          <button
            style={styles.button}
            disabled={loading}
            onClick={uploadPDF}
          >
            {loading ? "Processing..." : "Upload & Process"}
          </button>

          {errorMsg && <div style={styles.errorBox}>{errorMsg}</div>}
        </div>

        {/* Output Section */}
        {result && (
          <div style={styles.outputBox}>
            <h2 style={styles.outputTitle}>Claim Processed Successfully 🎉</h2>

            <p><strong>Claim Type:</strong> {result.claim_type || "N/A"}</p>
            <p><strong>Name:</strong> {result.name || "N/A"}</p>
            <p><strong>Description:</strong> {result.description || "N/A"}</p>

            {result.extracted_entities && (
              <>
                <p>
                  <strong>Total Amount:</strong>{" "}
                  {JSON.parse(result.extracted_entities)?.total_estimate || "N/A"}
                </p>

                <p>
                  <strong>Risk Level:</strong>{" "}
                  {JSON.parse(result.extracted_entities)?.risk_level || "N/A"}
                </p>
              </>
            )}

            <p><strong>Uploaded File:</strong> {result.filename}</p>
          </div>
        )}
      </div>
    </div>
  );
}

const styles = {
  page: {
    height: "100vh",
    width: "100vw",
    position: "relative",

    // Background
    backgroundImage: "url('/hero/insurance1.jpg')",
    backgroundSize: "cover",
    backgroundPosition: "center",
    backgroundRepeat: "no-repeat",

    // Center content perfectly
    display: "flex",
    justifyContent: "center",
    alignItems: "center",

    overflow: "hidden", // ❗ No scroll
  },

  overlay: {
    position: "absolute",
    inset: 0,
    background: "rgba(0,0,0,0.45)",
  },

  container: {
    zIndex: 5,
    width: "480px",
    textAlign: "center",

    // Push content slightly upward to avoid scroll
    transform: "translateY(-20px)",
  },

  title: {
    fontSize: "36px",
    fontWeight: 800,
    color: "white",
    marginBottom: "10px",
  },

  subtitle: {
    fontSize: "15px",
    color: "#e5e7eb",
    marginBottom: "22px",
    lineHeight: 1.4,
  },

  card: {
    background: "rgba(255,255,255,0.95)",
    padding: "20px",
    borderRadius: "14px",
    boxShadow: "0 10px 25px rgba(0,0,0,0.3)",
  },

  dropArea: {
    border: "1px dashed #9ca3af",
    padding: "18px",
    borderRadius: "12px",
    cursor: "pointer",
    marginBottom: "18px",
  },

  hiddenInput: { display: "none" },

  dropMain: {
    fontSize: "14px",
    color: "#111827",
  },

  dropHint: {
    fontSize: "12px",
    color: "#6b7280",
  },

  button: {
    width: "100%",
    padding: "12px",
    marginTop: "8px",
    borderRadius: "999px",
    background: "#2563eb",
    color: "white",
    fontSize: "15px",
    cursor: "pointer",
    border: "none",
  },

  errorBox: {
    marginTop: "10px",
    padding: "10px",
    background: "#fee2e2",
    color: "#991b1b",
    borderRadius: "6px",
    fontSize: "14px",
  },

  outputBox: {
    marginTop: "18px",
    padding: "14px",
    borderRadius: "12px",
    background: "rgba(255,255,255,0.9)",
    color: "#111",
    textAlign: "left",
    maxHeight: "180px", // ❗ keep it small
    overflowY: "auto",  // If too big, only this scrolls
  },

  outputTitle: {
    fontSize: "18px",
    fontWeight: "700",
    marginBottom: "8px",
  },
};


export default UploadPage;
