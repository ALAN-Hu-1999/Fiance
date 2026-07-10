import { useState } from "react";
import FamaFrench5Factor from "./components/FamaFrench5Factor";
import FF5RankingBoard from "./components/FF5RankingBoard";
import StrategySimulator from "./components/StrategySimulator";

const TABS = [
  { key: "strategy", label: "Strategy Lab" },
  { key: "single", label: "Single Stock" },
  { key: "ranking", label: "Top 50 Ranking" },
];

export default function App() {
  const [tab, setTab] = useState("strategy");

  return (
    <div
      className="app-shell"
      style={{
        "--bg": "#F5F7FB",
        "--card": "rgba(255,255,255,0.68)",
        "--card-inner": "rgba(255,255,255,0.42)",
        "--bar-bg": "rgba(120,130,150,0.10)",
        "--divider": "rgba(35,43,58,0.11)",
        "--text-primary": "#17181C",
        "--text-muted": "#667085",
        "--input-bg": "rgba(255,255,255,0.58)",
        "--input-border": "rgba(85,98,122,0.16)",
        "--accent": "#007AFF",
        "--accent-2": "#5AC8FA",
        "--danger": "#FF3B30",
        "--success": "#34C759",
        "--warning": "#FF9F0A",
        minHeight: "100vh",
        background: "linear-gradient(180deg, #F8FAFD 0%, #EEF3F9 48%, #F8FAFC 100%)",
        fontFamily:
          "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'SF Pro Text', 'Helvetica Neue', Arial, sans-serif",
        color: "var(--text-primary)",
      }}
    >
      <style>{`
        html {
          background: #f5f7fb;
        }
        body {
          margin: 0;
        }
        * {
          box-sizing: border-box;
        }
        .app-shell {
          position: relative;
          overflow-x: hidden;
        }
        .app-shell::before {
          content: "";
          position: fixed;
          inset: 0;
          pointer-events: none;
          background: linear-gradient(115deg, rgba(255,255,255,0.46), transparent 42%);
          mix-blend-mode: screen;
        }
        .glass-nav,
        .app-shell section,
        .app-shell main > div,
        .app-shell table,
        .app-shell svg {
          backdrop-filter: blur(28px) saturate(1.55);
          -webkit-backdrop-filter: blur(28px) saturate(1.55);
        }
        .app-shell button,
        .app-shell input,
        .app-shell select {
          font: inherit;
        }
        .app-shell input[type="number"] {
          font-variant-numeric: tabular-nums;
        }
        .app-shell button {
          box-shadow: 0 8px 20px rgba(15,23,42,0.06), inset 0 1px 0 rgba(255,255,255,0.55);
        }
        .app-shell button:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 14px 30px rgba(15,23,42,0.11), inset 0 1px 0 rgba(255,255,255,0.72);
        }
        .app-shell input:focus,
        .app-shell select:focus {
          border-color: rgba(0,122,255,0.58) !important;
          box-shadow: 0 0 0 4px rgba(0,122,255,0.13);
        }
        .app-shell h1,
        .app-shell h2,
        .app-shell h3 {
          letter-spacing: 0;
        }
        .app-shell table tr:hover {
          background: rgba(255,255,255,0.36) !important;
        }
      `}</style>

      {/* Global tab bar */}
      <div
        className="glass-nav"
        style={{
          position: "sticky",
          top: 0,
          zIndex: 10,
          background: "rgba(255,255,255,0.54)",
          borderBottom: "1px solid rgba(255,255,255,0.54)",
          boxShadow: "0 18px 40px rgba(15,23,42,0.08)",
          padding: "10px 32px",
          display: "flex",
          alignItems: "center",
          gap: 6,
          overflowX: "auto",
        }}
      >
        {/* Logo */}
        <div style={{
          width: 34,
          height: 34,
          borderRadius: 10,
          background: "linear-gradient(145deg, rgba(255,255,255,0.9), rgba(255,255,255,0.38))",
          border: "1px solid rgba(255,255,255,0.8)",
          boxShadow: "0 12px 28px rgba(0,122,255,0.16), inset 0 1px 0 rgba(255,255,255,0.9)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 12,
          fontWeight: 800,
          color: "var(--accent)",
          marginRight: 14,
          flexShrink: 0,
        }}>
          F5
        </div>

        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            style={{
              background: tab === t.key ? "rgba(255,255,255,0.74)" : "rgba(255,255,255,0.18)",
              border: "1px solid rgba(255,255,255,0.58)",
              borderBottom: tab === t.key ? "1px solid rgba(255,255,255,0.8)" : "1px solid rgba(255,255,255,0.42)",
              borderRadius: 999,
              color: tab === t.key ? "var(--text-primary)" : "var(--text-muted)",
              fontSize: 14,
              fontWeight: tab === t.key ? 700 : 600,
              padding: "9px 15px",
              cursor: "pointer",
              transition: "all 0.2s ease",
              whiteSpace: "nowrap",
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "strategy" && <StrategySimulator />}
      {tab === "single"  && <FamaFrench5Factor />}
      {tab === "ranking" && <FF5RankingBoard />}
    </div>
  );
}
