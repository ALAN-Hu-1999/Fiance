import { useState, useEffect, useRef, useCallback } from "react";
import { FACTOR_META, MARKETS } from "../factorMeta";
import { calculateFF5 } from "../utils/ff5_math";

const TIMEOUT_SEC = 60;

/* ─── Progress Tracker ─── */
function ProgressTracker({ phase, elapsed, error }) {
  const steps = [
    { key: "fetch", label: "Fetching market data" },
    { key: "align", label: "Aligning timelines" },
    { key: "calc",  label: "Running regression" },
  ];
  const phaseIdx = steps.findIndex((s) => s.key === phase);
  const pct = Math.min((elapsed / TIMEOUT_SEC) * 100, 100);
  const remaining = Math.max(TIMEOUT_SEC - Math.floor(elapsed), 0);

  return (
    <div style={{
      background: "var(--card)", borderRadius: 14,
      border: `1px solid ${error ? "#E8453C44" : "var(--divider)"}`,
      padding: 24, marginBottom: 20,
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {!error && (
            <div style={{
              width: 18, height: 18, border: "2.5px solid var(--divider)",
              borderTopColor: "#E8453C", borderRadius: "50%",
              animation: "spin 0.8s linear infinite",
            }} />
          )}
          <span style={{
            fontFamily: "'DM Sans', sans-serif", fontSize: 14, fontWeight: 600,
            color: error ? "#E8453C" : "var(--text-primary)",
          }}>
            {error ? "Request failed" : "Calculating…"}
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{
            fontFamily: "'JetBrains Mono', monospace", fontSize: 12, color: "var(--text-muted)",
            background: "var(--card-inner)", padding: "3px 8px", borderRadius: 5,
          }}>
            {elapsed.toFixed(1)}s
          </span>
          {!error && (
            <span style={{
              fontFamily: "'JetBrains Mono', monospace", fontSize: 11,
              color: remaining < 15 ? "#F59E0B" : "var(--text-muted)",
            }}>
              timeout {remaining}s
            </span>
          )}
        </div>
      </div>

      <div style={{
        height: 4, background: "var(--card-inner)", borderRadius: 2,
        overflow: "hidden", marginBottom: 18,
      }}>
        <div style={{
          height: "100%", borderRadius: 2,
          background: error ? "#E8453C" : elapsed < TIMEOUT_SEC * 0.7 ? "#E8453C" : "#F59E0B",
          width: `${pct}%`,
          transition: "width 0.3s linear",
        }} />
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
        {steps.map((s, i) => {
          const isActive   = s.key === phase;
          const isComplete = phaseIdx > i || phase === "done";
          const isPending  = phaseIdx < i && phase !== "done";
          const isFailed   = error && isActive;

          return (
            <div key={s.key} style={{ display: "flex", alignItems: "stretch", minHeight: 34 }}>
              <div style={{ width: 28, display: "flex", flexDirection: "column", alignItems: "center", flexShrink: 0 }}>
                <div style={{
                  width: isActive ? 11 : 9, height: isActive ? 11 : 9,
                  borderRadius: "50%", flexShrink: 0, marginTop: 5,
                  background: isFailed ? "#E8453C" : isComplete ? "#10B981" : isActive ? "#E8453C" : "#2D333B",
                  boxShadow: isActive && !isFailed ? "0 0 8px #E8453C88" : "none",
                  transition: "all 0.3s",
                }} />
                {i < steps.length - 1 && (
                  <div style={{ width: 2, flex: 1, minHeight: 8, background: isComplete ? "#10B98155" : "#2D333B", transition: "background 0.3s" }} />
                )}
              </div>
              <span style={{
                fontFamily: "'DM Sans', sans-serif", fontSize: 13,
                fontWeight: isActive ? 600 : 400, paddingTop: 2, paddingLeft: 6,
                color: isFailed ? "#E8453C" : isComplete ? "#10B981" : isActive ? "var(--text-primary)" : "var(--text-muted)",
                opacity: isPending ? 0.35 : 1, transition: "all 0.3s",
              }}>
                {isComplete ? "✓ " : ""}{s.label}
                {isActive && !isFailed && <span style={{ animation: "pulse 1.5s ease-in-out infinite" }}> …</span>}
              </span>
            </div>
          );
        })}
      </div>

      <style>{`
        @keyframes spin  { to { transform: rotate(360deg); } }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.3} }
      `}</style>
    </div>
  );
}

/* ─── Factor Bar ─── */
function FactorBar({ factorKey, value, maxAbsVal, delay }) {
  const meta = FACTOR_META[factorKey];
  const pct  = maxAbsVal === 0 ? 0 : (Math.abs(value) / maxAbsVal) * 100;
  const isPositive = value >= 0;
  const [visible, setVisible] = useState(false);
  useEffect(() => { const t = setTimeout(() => setVisible(true), delay); return () => clearTimeout(t); }, [delay]);

  return (
    <div style={{ opacity: visible ? 1 : 0, transform: visible ? "translateY(0)" : "translateY(12px)", transition: "all 0.5s cubic-bezier(0.22,1,0.36,1)", marginBottom: 20 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 6 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 16 }}>{meta.icon}</span>
          <span style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 600, fontSize: 14, color: "var(--text-primary)" }}>{meta.label}</span>
        </div>
        <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 15, fontWeight: 700, color: meta.color }}>
          {value > 0 ? "+" : ""}{value.toFixed(3)}
        </span>
      </div>
      <div style={{ position: "relative", height: 28, background: "var(--bar-bg)", borderRadius: 6, overflow: "hidden" }}>
        <div style={{ position: "absolute", left: "50%", top: 0, bottom: 0, width: 1, background: "var(--divider)", zIndex: 2 }} />
        <div style={{
          position: "absolute", top: 3, bottom: 3, borderRadius: 4,
          background: `linear-gradient(90deg, ${meta.color}CC, ${meta.color})`,
          transition: "width 0.8s cubic-bezier(0.22,1,0.36,1)",
          width:  visible ? `${pct / 2}%` : "0%",
          ...(isPositive ? { left: "50%" } : { right: "50%" }),
          boxShadow: `0 0 12px ${meta.color}44`,
        }} />
      </div>
      <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11.5, color: "var(--text-muted)", marginTop: 5, lineHeight: 1.4 }}>{meta.desc}</p>
    </div>
  );
}

function StatCard({ label, value, sub }) {
  return (
    <div style={{ background: "var(--card-inner)", borderRadius: 10, padding: "14px 16px", flex: 1, minWidth: 120 }}>
      <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>{label}</div>
      <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 18, fontWeight: 700, color: "var(--text-primary)" }}>{value}</div>
      {sub && <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

/* ─── Main ─── */
export default function FamaFrench5Factor() {
  const [symbol,  setSymbol]  = useState("");
  const [market,  setMarket]  = useState("US");
  const [loading, setLoading] = useState(false);
  const [result,  setResult]  = useState(null);
  const [error,   setError]   = useState(null);
  const [phase,   setPhase]   = useState("fetch");
  const [elapsed, setElapsed] = useState(0);
  const timerRef     = useRef(null);
  const startRef     = useRef(null);
  const inputRef     = useRef(null);
  const cancelledRef = useRef(false);

  useEffect(() => {
    inputRef.current?.focus();
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const startTimer = useCallback(() => {
    startRef.current = Date.now();
    timerRef.current = setInterval(() => {
      setElapsed((Date.now() - startRef.current) / 1000);
    }, 100);
  }, []);

  const stopTimer = useCallback(() => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
  }, []);

  const analyze = async () => {
    if (!symbol.trim()) return;
    cancelledRef.current = false;
    setLoading(true);
    setError(null);
    setResult(null);
    setPhase("fetch");
    setElapsed(0);
    startTimer();

    const ticker = symbol.trim().toUpperCase();

    try {
      const phaseTimer1 = setTimeout(() => setPhase("align"), 800);
      const phaseTimer2 = setTimeout(() => setPhase("calc"), 1600);
      
      const resultData = await calculateFF5(ticker);

      clearTimeout(phaseTimer1);
      clearTimeout(phaseTimer2);

      const finalResult = {
        ticker: ticker,
        company_name: "Local Calculation",
        market: market,
        sector: "Market Data",
        market_cap_category: "N/A",
        factors: resultData.factors,
        alpha: resultData.alpha,
        r_squared: resultData.r_squared,
        analysis: `Calculated from ${resultData.observations} daily observations. Using OLS Regression to find the best fit line mapping ${ticker}'s excess returns to the 5 factors.`,
        data_period: resultData.data_period,
        methodology_note: "Multivariate Linear Regression (OLS) on historical daily returns vs Kenneth French's factors."
      };

      setResult(finalResult);
      setPhase("done");
    } catch (e) {
      if (!cancelledRef.current) {
        setError(e.message || "Analysis failed.");
      }
    } finally {
      stopTimer();
      setLoading(false);
    }
  };

  const cancel = () => {
    cancelledRef.current = true;
    stopTimer();
    setLoading(false);
    setError(null);
    setPhase("fetch");
  };

  const maxAbsVal = result
    ? Math.max(...Object.values(result.factors).map(Math.abs), 0.01)
    : 1;

  return (
    <div style={{ padding: "28px 0 40px 0" }}>
      <div style={{ maxWidth: 680, margin: "0 auto", padding: "0 24px" }}>
        {/* Sub-header */}
        <div style={{ marginBottom: 24 }}>
          <h1 style={{ fontSize: 20, fontWeight: 700, margin: 0, letterSpacing: "-0.02em" }}>
            Fama–French 5-Factor Model
          </h1>
          <p style={{ fontSize: 13, color: "var(--text-muted)", margin: "4px 0 0" }}>
            Authentic Local Calculation via Multivariate Linear Regression
          </p>
        </div>

        {/* Input */}
        <div style={{ background: "var(--card)", borderRadius: 14, border: "1px solid var(--divider)", padding: 24, marginBottom: 24 }}>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <div style={{ flex: "1 1 180px" }}>
              <label style={{ fontSize: 11, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em", display: "block", marginBottom: 6 }}>
                Ticker Symbol
              </label>
              <input
                ref={inputRef} type="text" placeholder="e.g. AAPL"
                value={symbol}
                onChange={(e) => setSymbol(e.target.value.toUpperCase())}
                onKeyDown={(e) => e.key === "Enter" && !loading && analyze()}
                disabled={loading}
                style={{
                  width: "100%", padding: "10px 14px", background: "var(--input-bg)",
                  border: "1px solid var(--input-border)", borderRadius: 8,
                  color: "var(--text-primary)", fontFamily: "'JetBrains Mono', monospace",
                  fontSize: 15, fontWeight: 600, outline: "none", boxSizing: "border-box",
                  letterSpacing: "0.05em", opacity: loading ? 0.5 : 1,
                }}
              />
            </div>
            <div style={{ flex: "1 1 200px" }}>
              <label style={{ fontSize: 11, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em", display: "block", marginBottom: 6 }}>
                Market
              </label>
              <select
                value={market} onChange={(e) => setMarket(e.target.value)} disabled={loading}
                style={{
                  width: "100%", padding: "10px 14px", background: "var(--input-bg)",
                  border: "1px solid var(--input-border)", borderRadius: 8,
                  color: "var(--text-primary)", fontFamily: "'DM Sans', sans-serif",
                  fontSize: 14, outline: "none", boxSizing: "border-box", cursor: "pointer",
                  opacity: loading ? 0.5 : 1,
                }}
              >
                {MARKETS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
              </select>
            </div>
            <div style={{ display: "flex", alignItems: "flex-end", flex: "0 0 auto" }}>
              {loading ? (
                <button onClick={cancel} style={{
                  padding: "10px 22px", background: "transparent",
                  border: "1px solid #E8453C66", borderRadius: 8, color: "#E8453C",
                  fontFamily: "'DM Sans', sans-serif", fontSize: 14, fontWeight: 600, cursor: "pointer",
                }}>Cancel</button>
              ) : (
                <button onClick={analyze} disabled={!symbol.trim()} style={{
                  padding: "10px 28px",
                  background: !symbol.trim() ? "#30363D" : "linear-gradient(135deg, #E8453C, #D63A31)",
                  border: "none", borderRadius: 8,
                  color: !symbol.trim() ? "#7D8590" : "#fff",
                  fontFamily: "'DM Sans', sans-serif", fontSize: 14, fontWeight: 600,
                  cursor: !symbol.trim() ? "not-allowed" : "pointer",
                }}>Calculate</button>
              )}
            </div>
          </div>
        </div>

        {(loading || (error && !result)) && (
          <ProgressTracker phase={phase} elapsed={elapsed} error={error} />
        )}

        {error && (
          <div style={{ background: "#E8453C18", border: "1px solid #E8453C44", borderRadius: 14, padding: 20, marginBottom: 24 }}>
            <p style={{ margin: 0, fontSize: 14, color: "#E8453C", fontWeight: 500 }}>⚠ {error}</p>
          </div>
        )}

        {result && (
          <>
            <div style={{
              background: "#10B98112", border: "1px solid #10B98133",
              borderRadius: 14, padding: "14px 20px", marginBottom: 20,
              display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8,
            }}>
              <span style={{ fontSize: 13, color: "#10B981", fontWeight: 500 }}>
                Calculation completed in {elapsed.toFixed(1)}s
              </span>
            </div>

            <div style={{ background: "var(--card)", borderRadius: 14, border: "1px solid var(--divider)", padding: 24, marginBottom: 20 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
                <div>
                  <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700, letterSpacing: "-0.02em" }}>{result.ticker}</h2>
                  <p style={{ margin: "4px 0 0", fontSize: 14, color: "var(--text-muted)" }}>{result.company_name} · {result.sector}</p>
                </div>
                <div style={{ background: "var(--card-inner)", borderRadius: 8, padding: "6px 14px", fontFamily: "'JetBrains Mono', monospace", fontSize: 12, color: "var(--text-muted)" }}>
                  {result.market_cap_category} · {result.market}
                </div>
              </div>
            </div>

            <div style={{ display: "flex", gap: 12, marginBottom: 20, flexWrap: "wrap" }}>
              <StatCard label="Alpha (α)" value={`${(result.alpha * 100).toFixed(2)}%`} sub="Annualized" />
              <StatCard label="R-Squared"   value={result.r_squared.toFixed(3)}          sub="Model fit" />
              <StatCard label="Market Beta" value={result.factors.market.toFixed(3)}     sub="Systematic risk" />
            </div>

            <div style={{ background: "var(--card)", borderRadius: 14, border: "1px solid var(--divider)", padding: 24, marginBottom: 20 }}>
              <h3 style={{ margin: "0 0 20px", fontSize: 15, fontWeight: 600 }}>Factor Loadings (β)</h3>
              {Object.keys(FACTOR_META).map((key, i) => (
                <FactorBar key={key} factorKey={key} value={result.factors[key]} maxAbsVal={maxAbsVal} delay={i * 120} />
              ))}
            </div>

            <div style={{ background: "var(--card)", borderRadius: 14, border: "1px solid var(--divider)", padding: 24, marginBottom: 20 }}>
              <h3 style={{ margin: "0 0 12px", fontSize: 15, fontWeight: 600 }}>Analysis</h3>
              <p style={{ fontSize: 13.5, lineHeight: 1.65, color: "var(--text-muted)", margin: 0 }}>{result.analysis}</p>
            </div>

            <div style={{ background: "var(--card)", borderRadius: 14, border: "1px solid var(--divider)", padding: 20 }}>
              <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
                <div style={{ flex: 1, minWidth: 200 }}>
                  <span style={{ fontSize: 11, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em" }}>Data Period</span>
                  <p style={{ fontSize: 13, margin: "4px 0 0", color: "var(--text-primary)" }}>{result.data_period}</p>
                </div>
                <div style={{ flex: 2, minWidth: 200 }}>
                  <span style={{ fontSize: 11, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em" }}>Methodology</span>
                  <p style={{ fontSize: 13, margin: "4px 0 0", color: "var(--text-primary)" }}>{result.methodology_note}</p>
                </div>
              </div>
            </div>
          </>
        )}

        {!loading && !result && !error && (
          <div style={{ textAlign: "center", padding: "48px 24px", color: "var(--text-muted)" }}>
            <div style={{ fontSize: 40, marginBottom: 12, opacity: 0.4 }}>📊</div>
            <p style={{ fontSize: 14, margin: 0 }}>Enter a ticker symbol and select a market to begin</p>
            <p style={{ fontSize: 12, margin: "8px 0 0", opacity: 0.6 }}>
              Try AAPL, MSFT, TSLA, BRK.B, JNJ, or any publicly traded stock
            </p>
          </div>
        )}
      </div>
    </div>
  );
}