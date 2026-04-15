import { useState } from "react";
import FamaFrench5Factor from "./components/FamaFrench5Factor";
import FF5RankingBoard from "./components/FF5RankingBoard";

const TABS = [
  { key: "single", label: "Single Stock" },
  { key: "ranking", label: "Top 50 Ranking" },
];

export default function App() {
  const [tab, setTab] = useState("single");

  return (
    <div style={{
      "--bg": "#0E1117",
      "--card": "#161B22",
      "--card-inner": "#1C2128",
      "--bar-bg": "#1C2128",
      "--divider": "#2D333B",
      "--text-primary": "#E6EDF3",
      "--text-muted": "#7D8590",
      "--input-bg": "#0D1117",
      "--input-border": "#30363D",
      minHeight: "100vh",
      background: "var(--bg)",
      fontFamily: "'DM Sans', sans-serif",
      color: "var(--text-primary)",
    }}>
      <link
        href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;700&display=swap"
        rel="stylesheet"
      />

      {/* Global tab bar */}
      <div style={{
        background: "var(--card)",
        borderBottom: "1px solid var(--divider)",
        padding: "0 32px",
        display: "flex",
        alignItems: "center",
        gap: 4,
      }}>
        {/* Logo */}
        <div style={{
          width: 28,
          height: 28,
          borderRadius: 7,
          background: "linear-gradient(135deg, #E8453C, #F59E0B)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 11,
          fontWeight: 800,
          color: "#fff",
          marginRight: 16,
          flexShrink: 0,
        }}>
          FF
        </div>

        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            style={{
              background: "none",
              border: "none",
              borderBottom: tab === t.key ? "2px solid #E8453C" : "2px solid transparent",
              color: tab === t.key ? "var(--text-primary)" : "var(--text-muted)",
              fontFamily: "'DM Sans', sans-serif",
              fontSize: 14,
              fontWeight: tab === t.key ? 600 : 400,
              padding: "14px 16px 12px",
              cursor: "pointer",
              transition: "all 0.15s",
              whiteSpace: "nowrap",
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "single"  && <FamaFrench5Factor />}
      {tab === "ranking" && <FF5RankingBoard />}
    </div>
  );
}