import { useState, useRef } from "react";
import { SP500_TOP50 } from "../data/sp500top50";
import { calculateFF5 } from "../utils/ff5_math";

function SortableHeader({ label, sortKey, currentSort, onSort }) {
  const isActive = currentSort.key === sortKey;
  return (
    <th 
      onClick={() => onSort(sortKey)}
      style={{ 
        cursor: "pointer", 
        padding: "14px 16px",
        textAlign: "left",
        fontSize: 11,
        fontWeight: 600,
        color: isActive ? "var(--text-primary)" : "var(--text-muted)",
        textTransform: "uppercase",
        letterSpacing: "0.06em",
        borderBottom: "1px solid var(--divider)",
        userSelect: "none",
        whiteSpace: "nowrap"
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        {label}
        {isActive && (
          <span style={{ color: "#E8453C", fontSize: 14, lineHeight: 1 }}>
            {currentSort.direction === 'asc' ? '↑' : '↓'}
          </span>
        )}
      </div>
    </th>
  );
}

export default function FF5RankingBoard() {
  const [results, setResults] = useState({});
  const [statuses, setStatuses] = useState({}); // 'idle', 'loading', 'done', 'error'
  const [isCalculatingAll, setIsCalculatingAll] = useState(false);
  const [sortConfig, setSortConfig] = useState({ key: 'ticker', direction: 'asc' });
  const abortControllerRef = useRef(null);

  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const getSortedData = () => {
    const data = [...SP500_TOP50];
    data.sort((a, b) => {
      let valA, valB;
      
      if (['ticker', 'name', 'sector'].includes(sortConfig.key)) {
        valA = a[sortConfig.key];
        valB = b[sortConfig.key];
      } else {
        const resA = results[a.ticker];
        const resB = results[b.ticker];
        
        if (!resA && !resB) return 0;
        if (!resA) return 1; // Uncalculated always at the bottom
        if (!resB) return -1;
        
        if (sortConfig.key === 'alpha') {
          valA = resA.alpha; valB = resB.alpha;
        } else if (sortConfig.key === 'r_squared') {
          valA = resA.r_squared; valB = resB.r_squared;
        } else {
          valA = resA.factors[sortConfig.key];
          valB = resB.factors[sortConfig.key];
        }
      }

      if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
      if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
    return data;
  };

  const calculateSingle = async (ticker) => {
    setStatuses(prev => ({ ...prev, [ticker]: 'loading' }));
    try {
      const queryTicker = ticker.replace('.', '-'); // e.g. BRK.B -> BRK-B for Yahoo Finance
      const data = await calculateFF5(queryTicker);
      setResults(prev => ({ ...prev, [ticker]: data }));
      setStatuses(prev => ({ ...prev, [ticker]: 'done' }));
    } catch (e) {
      console.error(`Failed to calculate ${ticker}:`, e);
      setStatuses(prev => ({ ...prev, [ticker]: 'error' }));
    }
  };

  const calculateAll = async () => {
    setIsCalculatingAll(true);
    abortControllerRef.current = new AbortController();
    const signal = abortControllerRef.current.signal;

    for (const stock of SP500_TOP50) {
      if (signal.aborted) break;
      if (statuses[stock.ticker] === 'done') continue;
      
      await calculateSingle(stock.ticker);
      // Wait to avoid rate limiting from Yahoo/CORS proxy
      await new Promise(r => setTimeout(r, 600)); 
    }
    
    setIsCalculatingAll(false);
  };

  const cancelCalculateAll = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setIsCalculatingAll(false);
  };

  const sortedData = getSortedData();
  const completedCount = Object.values(statuses).filter(s => s === 'done').length;
  const progressPct = (completedCount / SP500_TOP50.length) * 100;

  return (
    <div style={{ padding: "28px 0 40px 0" }}>
      <div style={{ maxWidth: 1040, margin: "0 auto", padding: "0 24px" }}>
        
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 24, flexWrap: "wrap", gap: 16 }}>
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 700, margin: 0, letterSpacing: "-0.02em" }}>
              S&P 500 Top 50 Ranking
            </h1>
            <p style={{ fontSize: 13, color: "var(--text-muted)", margin: "4px 0 0" }}>
              Compare locally calculated Fama-French loadings across top companies
            </p>
          </div>
          
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            {isCalculatingAll || completedCount > 0 ? (
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ fontSize: 12, color: "var(--text-muted)", fontFamily: "'JetBrains Mono', monospace" }}>
                  {completedCount} / {SP500_TOP50.length} completed
                </div>
                <div style={{ width: 120, height: 6, background: "var(--card-inner)", borderRadius: 3, overflow: "hidden" }}>
                  <div style={{ width: `${progressPct}%`, height: "100%", background: "#10B981", transition: "width 0.3s" }} />
                </div>
              </div>
            ) : null}

            {isCalculatingAll ? (
              <button onClick={cancelCalculateAll} style={{
                padding: "8px 16px", background: "transparent",
                border: "1px solid #E8453C66", borderRadius: 8, color: "#E8453C",
                fontFamily: "'DM Sans', sans-serif", fontSize: 13, fontWeight: 600, cursor: "pointer",
                transition: "all 0.2s"
              }}>Stop Analysis</button>
            ) : (
              <button onClick={calculateAll} style={{
                padding: "8px 20px",
                background: completedCount === SP500_TOP50.length ? "#30363D" : "linear-gradient(135deg, #E8453C, #D63A31)",
                border: "none", borderRadius: 8,
                color: completedCount === SP500_TOP50.length ? "#7D8590" : "#fff",
                fontFamily: "'DM Sans', sans-serif", fontSize: 13, fontWeight: 600,
                cursor: completedCount === SP500_TOP50.length ? "not-allowed" : "pointer",
                transition: "all 0.2s"
              }} disabled={completedCount === SP500_TOP50.length}>
                {completedCount > 0 ? "Resume Analysis" : "Run Analysis (All)"}
              </button>
            )}
          </div>
        </div>

        {/* Table */}
        <div style={{ background: "var(--card)", borderRadius: 14, border: "1px solid var(--divider)", overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 800 }}>
            <thead>
              <tr>
                <SortableHeader label="Ticker" sortKey="ticker" currentSort={sortConfig} onSort={handleSort} />
                <SortableHeader label="Name" sortKey="name" currentSort={sortConfig} onSort={handleSort} />
                <SortableHeader label="Sector" sortKey="sector" currentSort={sortConfig} onSort={handleSort} />
                <SortableHeader label="Alpha" sortKey="alpha" currentSort={sortConfig} onSort={handleSort} />
                <SortableHeader label="Mkt" sortKey="market" currentSort={sortConfig} onSort={handleSort} />
                <SortableHeader label="SMB" sortKey="smb" currentSort={sortConfig} onSort={handleSort} />
                <SortableHeader label="HML" sortKey="hml" currentSort={sortConfig} onSort={handleSort} />
                <SortableHeader label="RMW" sortKey="rmw" currentSort={sortConfig} onSort={handleSort} />
                <SortableHeader label="CMA" sortKey="cma" currentSort={sortConfig} onSort={handleSort} />
                <SortableHeader label="R²" sortKey="r_squared" currentSort={sortConfig} onSort={handleSort} />
                <th style={{ padding: "14px 16px", textAlign: "right" }}></th>
              </tr>
            </thead>
            <tbody>
              {sortedData.map((stock) => {
                const status = statuses[stock.ticker] || 'idle';
                const res = results[stock.ticker];

                return (
                  <tr key={stock.ticker} style={{ borderBottom: "1px solid var(--divider)", transition: "background 0.2s" }}>
                    <td style={{ padding: "14px 16px", fontSize: 14, fontWeight: 600, color: "var(--text-primary)" }}>
                      {stock.ticker}
                    </td>
                    <td style={{ padding: "14px 16px", fontSize: 13, color: "var(--text-muted)", whiteSpace: "nowrap" }}>
                      {stock.name}
                    </td>
                    <td style={{ padding: "14px 16px", fontSize: 13, color: "var(--text-muted)", whiteSpace: "nowrap" }}>
                      {stock.sector}
                    </td>
                    
                    {res ? (
                      <>
                        <td style={{ padding: "14px 16px", fontFamily: "'JetBrains Mono', monospace", fontSize: 13, fontWeight: 500, color: res.alpha > 0 ? "#10B981" : "#E8453C" }}>
                          {(res.alpha * 100).toFixed(2)}%
                        </td>
                        <td style={{ padding: "14px 16px", fontFamily: "'JetBrains Mono', monospace", fontSize: 13, color: "var(--text-primary)" }}>{res.factors.market.toFixed(2)}</td>
                        <td style={{ padding: "14px 16px", fontFamily: "'JetBrains Mono', monospace", fontSize: 13, color: "var(--text-primary)" }}>{res.factors.smb.toFixed(2)}</td>
                        <td style={{ padding: "14px 16px", fontFamily: "'JetBrains Mono', monospace", fontSize: 13, color: "var(--text-primary)" }}>{res.factors.hml.toFixed(2)}</td>
                        <td style={{ padding: "14px 16px", fontFamily: "'JetBrains Mono', monospace", fontSize: 13, color: "var(--text-primary)" }}>{res.factors.rmw.toFixed(2)}</td>
                        <td style={{ padding: "14px 16px", fontFamily: "'JetBrains Mono', monospace", fontSize: 13, color: "var(--text-primary)" }}>{res.factors.cma.toFixed(2)}</td>
                        <td style={{ padding: "14px 16px", fontFamily: "'JetBrains Mono', monospace", fontSize: 13, color: "var(--text-muted)" }}>{res.r_squared.toFixed(2)}</td>
                      </>
                    ) : (
                      <td colSpan={7} style={{ padding: "14px 16px", textAlign: "center", color: "var(--text-muted)", fontSize: 13, opacity: 0.6 }}>
                        {status === 'loading' ? 'Calculating...' : status === 'error' ? <span style={{color: "#E8453C"}}>Failed</span> : '-'}
                      </td>
                    )}
                    
                    <td style={{ padding: "14px 16px", textAlign: "right", minWidth: 60 }}>
                      {status !== 'done' && status !== 'loading' && (
                        <button 
                          onClick={() => calculateSingle(stock.ticker)}
                          style={{
                            background: "var(--card-inner)", border: "1px solid var(--input-border)",
                            color: "var(--text-primary)", padding: "4px 10px", borderRadius: 6,
                            fontSize: 12, cursor: "pointer", fontFamily: "'DM Sans', sans-serif",
                            transition: "all 0.2s"
                          }}
                        >
                          Calc
                        </button>
                      )}
                      {status === 'loading' && (
                        <div style={{
                          width: 14, height: 14, border: "2px solid var(--divider)",
                          borderTopColor: "#E8453C", borderRadius: "50%",
                          animation: "spin 0.8s linear infinite",
                          display: "inline-block", verticalAlign: "middle"
                        }} />
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <style>{`
          @keyframes spin  { to { transform: rotate(360deg); } }
          tr:hover { background: rgba(255,255,255,0.02); }
        `}</style>
      </div>
    </div>
  );
}