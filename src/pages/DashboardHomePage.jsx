import { Link } from "react-router-dom";
import { useEffect, useState } from "react";

function DashboardHomePage() {
  const [claims, setClaims] = useState([]);
  const [loading, setLoading] = useState(true);

  // 🔹 Chatbot state
  const [chatInput, setChatInput] = useState("");
  const [messages, setMessages] = useState([
    {
      from: "ai",
      text: "Hello! I am your Insurance AI Assistant. Ask me anything about claims, risk, or analytics.",
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    },
  ]);
  const [chatLoading, setChatLoading] = useState(false);

  // Fetch real data from backend
  useEffect(() => {
    fetch("http://127.0.0.1:8000/claims")
      .then((res) => res.json())
      .then((data) => {
        setClaims(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Error fetching claims:", err);
        setLoading(false);
      });
  }, []);

  // ---- Derived analytics from real claims ----
  const totalClaims = claims.length;

  const medicalClaims = claims.filter((c) => {
    const t = (c.claim_type || "").toLowerCase();
    return (
      t.includes("medical") ||
      t.includes("hospital") ||
      t.includes("health")
    );
  }).length;

  const homeClaims = claims.filter((c) => {
    const t = (c.claim_type || "").toLowerCase();
    return (
      t.includes("property") ||
      t.includes("home") ||
      t.includes("house") ||
      t.includes("fire") ||
      t.includes("water")
    );
  }).length;

  const highRiskAlerts = claims.reduce((count, c) => {
    try {
      const extra = JSON.parse(c.extracted_entities || "{}");
      if (
        (extra.fraud_risk &&
          String(extra.fraud_risk).toLowerCase() === "high") ||
        (extra.risk_level &&
          String(extra.risk_level).toLowerCase() === "high")
      ) {
        return count + 1;
      }
    } catch {
      // ignore parse errors
    }
    return count;
  }, 0);

  // Latest 3 claims for "Recent Claim Notes"
  const recentClaims = [...claims].slice(-3).reverse();

  // 🔹 Send message to backend AI (/ai-chat)
  const sendMessage = async () => {
    if (!chatInput.trim() || chatLoading) return;

    const nowTime = new Date().toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });

    // Add user message to chat
    const userMessage = {
      from: "agent",
      text: chatInput.trim(),
      time: nowTime,
    };
    setMessages((prev) => [...prev, userMessage]);
    const userText = chatInput.trim();
    setChatInput("");
    setChatLoading(true);

    try {
      const res = await fetch("http://127.0.0.1:8000/ai-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userText }),
      });

      const data = await res.json();

      const aiMessage = {
        from: "ai",
        text: data.reply || "I could not generate a response.",
        time: new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
      };

      setMessages((prev) => [...prev, aiMessage]);
    } catch (err) {
      console.error("AI chat error:", err);
      const errorMessage = {
        from: "ai",
        text: "⚠️ Unable to contact AI server. Please check backend.",
        time: new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setChatLoading(false);
    }
  };

  return (
    <div style={styles.page}>
      {/* Top heading */}
      <div style={styles.headerRow}>
        <div>
          <h1 style={styles.title}>Claims Analytics Dashboard</h1>
          <p style={styles.subtitle}>
            Overview of insurance claim activity, categories, and AI processing.
          </p>
        </div>

        <Link to="/upload" style={styles.primaryBtn}>
          + New Claim
        </Link>
      </div>

      {/* Top KPI cards */}
      <div style={styles.kpiRow}>
        <AnalyticsCard
          label="Total Claims"
          value={totalClaims}
          sub="All uploaded PDFs"
          trend="Live from database"
          trendColor="#16a34a"
        />
        <AnalyticsCard
          label="Medical Claims"
          value={medicalClaims}
          sub="Hospital & health"
          trend="Calculated from claim_type"
          trendColor="#16a34a"
        />
        <AnalyticsCard
          label="Home / Property"
          value={homeClaims}
          sub="Fire, water, damage"
          trend="Calculated from claim_type"
          trendColor="#2563eb"
        />
        <AnalyticsCard
          label="High-Risk Alerts"
          value={highRiskAlerts}
          sub="Potential fraud cases"
          trend="Based on fraud_risk=high"
          trendColor="#f97316"
        />
      </div>

      {/* Second row: Reviews + Chat */}
      <div style={styles.bottomRow}>
        {/* Left: Recent claim reviews / notes */}
        <div style={styles.panel}>
          <div style={styles.panelHeader}>
            <span style={styles.panelTitle}>Recent Claim Notes</span>
            <span style={styles.panelMeta}>
              {loading
                ? "Loading from server..."
                : recentClaims.length > 0
                ? "Latest 3 claims from database"
                : "No claims found"}
            </span>
          </div>

          {loading ? (
            <div
              style={{ padding: "10px 0", fontSize: 13, color: "#6b7280" }}
            >
              Loading recent claims...
            </div>
          ) : recentClaims.length === 0 ? (
            <div
              style={{ padding: "10px 0", fontSize: 13, color: "#6b7280" }}
            >
              No claims to display. Upload a claim PDF to see notes here.
            </div>
          ) : (
            recentClaims.map((c) => {
              let extra = {};
              try {
                extra = JSON.parse(c.extracted_entities || "{}");
              } catch {
                extra = {};
              }

              const noteText =
                extra.summary ||
                c.description ||
                (c.text
                  ? c.text.slice(0, 160) + "..."
                  : "No additional notes.");

              const score =
                extra.ai_confidence != null
                  ? `${Math.round(Number(extra.ai_confidence) * 100)}%`
                  : "–";

              return (
                <ClaimNote
                  key={c.id}
                  name={c.name || "Unknown"}
                  time={c.created_at || "Recently"}
                  type={c.claim_type || "Unknown Claim Type"}
                  note={noteText}
                  score={score}
                />
              );
            })
          )}
        </div>

        {/* Right: Chat / AI assistant  */}
        <div style={styles.panel}>
          <div style={styles.panelHeader}>
            <span style={styles.panelTitle}>AI Assistant Chat</span>
            <span style={styles.panelMeta}>
              Ask questions about claims, risk and analytics
            </span>
          </div>

          <div style={styles.chatWindow}>
            {messages.map((m, idx) => (
              <ChatBubble
                key={idx}
                from={m.from}
                text={m.text}
                time={m.time}
              />
            ))}

            {chatLoading && (
              <div style={{ fontSize: 11, color: "#6b7280", marginTop: 4 }}>
                AI is typing...
              </div>
            )}
          </div>

          <div style={styles.chatInputRow}>
            <input
              type="text"
              placeholder="Ask the AI about claim trends, risk, or a process..."
              style={styles.chatInput}
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && sendMessage()}
            />
            <button style={styles.sendBtn} onClick={sendMessage} disabled={chatLoading}>
              {chatLoading ? "Sending..." : "Send"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* Small reusable components */

function AnalyticsCard({ label, value, sub, trend, trendColor }) {
  return (
    <div style={styles.kpiCard}>
      <div style={styles.kpiTop}>
        <span style={styles.kpiLabel}>{label}</span>
        <span style={styles.kpiMenu}>⋮</span>
      </div>
      <div style={styles.kpiValue}>{value}</div>
      <div style={styles.kpiSub}>{sub}</div>

      {/* Fake mini chart using bars (visual only) */}
      <div style={styles.kpiChart}>
        {[40, 55, 35, 70, 60, 80, 50].map((h, idx) => (
          <div
            key={idx}
            style={{
              ...styles.kpiBar,
              height: `${h}%`,
            }}
          />
        ))}
      </div>

      <div style={{ ...styles.kpiTrend, color: trendColor }}>{trend}</div>
    </div>
  );
}

function ClaimNote({ name, time, type, note, score }) {
  return (
    <div style={styles.noteRow}>
      <div style={styles.avatarCircle}>{name[0]}</div>
      <div style={styles.noteContent}>
        <div style={styles.noteHeader}>
          <span style={styles.noteName}>{name}</span>
          <span style={styles.noteTime}>{time}</span>
        </div>
        <div style={styles.noteType}>{type}</div>
        <div style={styles.noteText}>{note}</div>
        <div style={styles.noteFooter}>
          <span style={styles.noteScore}>AI confidence: {score}</span>
        </div>
      </div>
    </div>
  );
}

function ChatBubble({ from, text, time }) {
  const isAI = from === "ai";
  return (
    <div
      style={{
        ...styles.chatBubbleRow,
        justifyContent: isAI ? "flex-start" : "flex-end",
      }}
    >
      <div
        style={{
          ...styles.chatBubble,
          backgroundColor: isAI ? "#e0f2fe" : "#22c55e",
          color: isAI ? "#0f172a" : "#ffffff",
          alignSelf: isAI ? "flex-start" : "flex-end",
        }}
      >
        <div style={styles.chatText}>{text}</div>
        {time && <div style={styles.chatTime}>{time}</div>}
      </div>
    </div>
  );
}

const styles = {
  page: {
    padding: "30px 40px",
    minHeight: "calc(100vh - 70px)",
    backgroundColor: "#f5f7fb",
    fontFamily: "Segoe UI, Arial, sans-serif",
  },

  headerRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "22px",
  },
  title: {
    fontSize: "26px",
    fontWeight: 700,
    color: "#111827",
  },
  subtitle: {
    fontSize: "14px",
    color: "#6b7280",
    marginTop: "4px",
  },
  primaryBtn: {
    padding: "8px 16px",
    borderRadius: "999px",
    backgroundColor: "#2563eb",
    color: "#ffffff",
    fontSize: "14px",
    fontWeight: 600,
    textDecoration: "none",
  },

  kpiRow: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: "16px",
    marginBottom: "24px",
  },
  kpiCard: {
    backgroundColor: "#ffffff",
    borderRadius: "10px",
    padding: "14px 16px",
    border: "1px solid #e5e7eb",
    boxShadow: "0 2px 8px rgba(15,23,42,0.04)",
  },
  kpiTop: {
    display: "flex",
    justifyContent: "space-between",
    marginBottom: "6px",
  },
  kpiLabel: {
    fontSize: "13px",
    color: "#6b7280",
  },
  kpiMenu: {
    fontSize: "16px",
    color: "#9ca3af",
    cursor: "pointer",
  },
  kpiValue: {
    fontSize: "24px",
    fontWeight: 700,
    color: "#111827",
  },
  kpiSub: {
    fontSize: "12px",
    color: "#9ca3af",
    marginBottom: "6px",
  },
  kpiChart: {
    display: "flex",
    alignItems: "flex-end",
    gap: "4px",
    height: "40px",
    marginBottom: "6px",
  },
  kpiBar: {
    flex: 1,
    borderRadius: "3px",
    background: "linear-gradient(180deg,#22c55e,#16a34a)",
  },
  kpiTrend: {
    fontSize: "12px",
    fontWeight: 600,
  },

  bottomRow: {
    display: "grid",
    gridTemplateColumns: "2fr 1.2fr",
    gap: "18px",
    marginTop: "10px",
  },
  panel: {
    backgroundColor: "#ffffff",
    borderRadius: "10px",
    padding: "16px 18px",
    border: "1px solid #e5e7eb",
    boxShadow: "0 2px 10px rgba(15,23,42,0.04)",
  },
  panelHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "baseline",
    marginBottom: "10px",
  },
  panelTitle: {
    fontSize: "15px",
    fontWeight: 600,
    color: "#111827",
  },
  panelMeta: {
    fontSize: "11px",
    color: "#9ca3af",
  },

  noteRow: {
    display: "flex",
    gap: "12px",
    padding: "10px 0",
    borderBottom: "1px solid #f3f4f6",
  },
  avatarCircle: {
    width: "36px",
    height: "36px",
    borderRadius: "50%",
    backgroundColor: "#bfdbfe",
    color: "#1d4ed8",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: 700,
    fontSize: "16px",
  },
  noteContent: {
    flex: 1,
  },
  noteHeader: {
    display: "flex",
    justifyContent: "space-between",
    marginBottom: "2px",
  },
  noteName: {
    fontSize: "14px",
    fontWeight: 600,
    color: "#111827",
  },
  noteTime: {
    fontSize: "11px",
    color: "#9ca3af",
  },
  noteType: {
    fontSize: "12px",
    color: "#2563eb",
    marginBottom: "4px",
  },
  noteText: {
    fontSize: "13px",
    color: "#4b5563",
    marginBottom: "6px",
  },
  noteFooter: {
    fontSize: "11px",
    color: "#6b7280",
  },
  noteScore: {
    fontWeight: 600,
  },

  chatWindow: {
    backgroundColor: "#f9fafb",
    borderRadius: "8px",
    padding: "10px",
    height: "240px",
    overflowY: "auto",
    marginBottom: "10px",
  },
  chatBubbleRow: {
    display: "flex",
    marginBottom: "8px",
  },
  chatBubble: {
    maxWidth: "80%",
    padding: "8px 10px",
    borderRadius: "12px",
  },
  chatText: {
    fontSize: "13px",
    marginBottom: "3px",
  },
  chatTime: {
    fontSize: "10px",
    opacity: 0.7,
  },
  chatInputRow: {
    display: "flex",
    gap: "8px",
    marginTop: "4px",
  },
  chatInput: {
    flex: 1,
    padding: "8px 10px",
    borderRadius: "8px",
    border: "1px solid #d1d5db",
    fontSize: "13px",
  },
  sendBtn: {
    padding: "8px 14px",
    borderRadius: "8px",
    border: "none",
    backgroundColor: "#2563eb",
    color: "#ffffff",
    fontSize: "13px",
    fontWeight: 600,
    cursor: "pointer",
  },
};

export default DashboardHomePage;
