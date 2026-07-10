import { useEffect, useMemo, useRef, useState } from "react";
import { ALT_CASH_ASSETS, fetchHistoricalPrices, MARKET_INDEX_PRESETS, runStrategyBacktests, STRATEGIES } from "../utils/strategyBacktest";

const DEFAULT_CONFIG_COLORS = ["#34C759", "#007AFF", "#FF9F0A", "#5AC8FA", "#FF2D55", "#AF52DE", "#FF9500", "#32D74B"];

function createStrategyConfig(overrides = {}) {
  const baseStrategy = STRATEGIES.find((strategy) => strategy.key === (overrides.strategyKey || "buy_hold")) || STRATEGIES[0];
  return {
    id: overrides.id || `cfg-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    name: overrides.name || baseStrategy.name,
    strategyKey: overrides.strategyKey || baseStrategy.key,
    ticker: overrides.ticker || "SPY",
    initialCapital: overrides.initialCapital ?? 10000,
    recurringAmount: overrides.recurringAmount ?? 250,
    recurringFrequency: overrides.recurringFrequency || "weekly",
    altCashAsset: overrides.altCashAsset || "none",
    altCashSellMultiplier: overrides.altCashSellMultiplier ?? 1,
    expenseRatio: overrides.expenseRatio ?? 0,
    color: overrides.color || baseStrategy.color,
    collapsed: overrides.collapsed ?? false,
  };
}

const DEFAULT_STRATEGY_CONFIGS = [
  createStrategyConfig({ id: "cfg-buy-hold-spy", name: "SPY Buy & Hold", strategyKey: "buy_hold", ticker: "SPY", color: "#34C759" }),
  createStrategyConfig({ id: "cfg-smart-dca-spy", name: "SPY 36M DCA + Cash", strategyKey: "smart_dca_36m", ticker: "SPY", altCashAsset: "cash", color: "#5AC8FA" }),
  createStrategyConfig({ id: "cfg-avg-cost-qqq", name: "QQQ Avg Cost + Gold", strategyKey: "average_cost_smart_dca", ticker: "QQQ", altCashAsset: "gold", color: "#AF52DE" }),
];

function formatPct(value) {
  if (!Number.isFinite(value)) return "-";
  return `${value >= 0 ? "+" : ""}${(value * 100).toFixed(2)}%`;
}

function formatMoney(value) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

function metricColor(value) {
  if (value > 0) return "var(--success)";
  if (value < 0) return "var(--danger)";
  return "var(--text-primary)";
}

function StrategyToggle({ strategy, selected, onToggle }) {
  return (
    <button
      type="button"
      onClick={() => onToggle(strategy.key)}
      style={{
        display: "flex",
        alignItems: "flex-start",
        gap: 10,
        width: "100%",
        minHeight: 76,
        padding: 14,
        borderRadius: 8,
        border: selected ? `1px solid ${strategy.color}` : "1px solid var(--divider)",
        background: selected ? `${strategy.color}14` : "var(--card-inner)",
        color: "var(--text-primary)",
        cursor: "pointer",
        textAlign: "left",
        transition: "all 0.15s",
      }}
    >
      <span
        style={{
          width: 16,
          height: 16,
          borderRadius: 4,
          border: selected ? `1px solid ${strategy.color}` : "1px solid #586069",
          background: selected ? strategy.color : "transparent",
          boxShadow: selected ? `0 0 12px ${strategy.color}66` : "none",
          flexShrink: 0,
          marginTop: 2,
        }}
      />
      <span>
        <span style={{ display: "block", fontSize: 13, fontWeight: 700, marginBottom: 4 }}>
          {strategy.name}
        </span>
        <span style={{ display: "block", fontSize: 11.5, lineHeight: 1.35, color: "var(--text-muted)" }}>
          {strategy.description}
        </span>
      </span>
    </button>
  );
}

function StrategyConfigCard({ config, index, canRemove, onChange, onRemove, onDuplicate }) {
  const baseStrategy = STRATEGIES.find((strategy) => strategy.key === config.strategyKey) || STRATEGIES[0];
  const altAsset = ALT_CASH_ASSETS.find((asset) => asset.key === config.altCashAsset) || ALT_CASH_ASSETS[0];

  const update = (patch) => onChange(config.id, patch);

  return (
    <div style={{ background: "var(--card-inner)", border: `1px solid ${config.color}66`, borderRadius: 10, padding: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, marginBottom: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 9, minWidth: 0 }}>
          <input
            type="color"
            value={config.color}
            onChange={(event) => update({ color: event.target.value })}
            aria-label={`${config.name} color`}
            style={{ width: 30, height: 30, border: "none", background: "transparent", padding: 0, flexShrink: 0 }}
          />
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 11, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em" }}>Custom Strategy {index + 1}</div>
            {config.collapsed ? (
              <div style={{ marginTop: 4, fontSize: 13, fontWeight: 800, color: "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {config.name}
              </div>
            ) : (
              <input
                value={config.name}
                onChange={(event) => update({ name: event.target.value })}
                style={{ ...inputStyle, padding: "7px 8px", marginTop: 5, fontFamily: "'DM Sans', sans-serif", fontWeight: 700 }}
              />
            )}
          </div>
        </div>
        <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
          <button type="button" onClick={() => update({ collapsed: !config.collapsed })} style={miniButtonStyle}>
            {config.collapsed ? "Open" : "Hide"}
          </button>
          <button type="button" onClick={() => onDuplicate(config.id)} style={miniButtonStyle}>Copy</button>
          <button type="button" onClick={() => onRemove(config.id)} disabled={!canRemove} style={{ ...miniButtonStyle, opacity: canRemove ? 1 : 0.45, cursor: canRemove ? "pointer" : "not-allowed" }}>Del</button>
        </div>
      </div>

      {config.collapsed ? (
        <div style={{ display: "grid", gap: 5, fontSize: 12, color: "var(--text-muted)", lineHeight: 1.4 }}>
          <div><strong style={{ color: "var(--text-primary)" }}>{baseStrategy.name}</strong> on <strong style={{ color: "var(--text-primary)" }}>{config.ticker}</strong></div>
          <div>{formatMoney(Number(config.initialCapital) || 0)} initial, {formatMoney(Number(config.recurringAmount) || 0)} {config.recurringFrequency}, AC: {altAsset.label}, AC sell {Number(config.altCashSellMultiplier || 1).toFixed(2)}x, fee {Number(config.expenseRatio || 0).toFixed(2)}%</div>
        </div>
      ) : (
        <>
      <label style={{ display: "block", marginBottom: 10 }}>
        <span style={fieldLabelStyle}>Base Strategy</span>
        <select
          value={config.strategyKey}
          onChange={(event) => {
            const next = STRATEGIES.find((strategy) => strategy.key === event.target.value);
            update({
              strategyKey: event.target.value,
              name: config.name === baseStrategy.name ? next.name : config.name,
            });
          }}
          style={inputStyle}
        >
          {STRATEGIES.map((strategy) => (
            <option key={strategy.key} value={strategy.key}>{strategy.name}</option>
          ))}
        </select>
        <span style={{ display: "block", marginTop: 5, fontSize: 11.5, color: "var(--text-muted)", lineHeight: 1.35 }}>{baseStrategy.description}</span>
      </label>

      <label style={{ display: "block", marginBottom: 10 }}>
        <span style={fieldLabelStyle}>Asset Preset</span>
        <select
          value=""
          onChange={(event) => {
            if (event.target.value) update({ ticker: event.target.value });
          }}
          style={inputStyle}
        >
          <option value="">Keep custom ticker</option>
          {MARKET_INDEX_PRESETS.map((asset) => (
            <option key={asset.symbol} value={asset.symbol}>{asset.label} ({asset.symbol})</option>
          ))}
        </select>
      </label>

      <label style={{ display: "block", marginBottom: 10 }}>
        <span style={fieldLabelStyle}>Ticker / Asset</span>
        <input value={config.ticker} onChange={(event) => update({ ticker: event.target.value })} style={inputStyle} />
      </label>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
        <label>
          <span style={fieldLabelStyle}>Initial</span>
          <input type="number" min="0" step="100" value={config.initialCapital} onChange={(event) => update({ initialCapital: event.target.value })} style={inputStyle} />
        </label>
        <label>
          <span style={fieldLabelStyle}>Recurring</span>
          <input type="number" min="0" step="25" value={config.recurringAmount} onChange={(event) => update({ recurringAmount: event.target.value })} style={inputStyle} />
        </label>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <label>
          <span style={fieldLabelStyle}>Frequency</span>
          <select value={config.recurringFrequency} onChange={(event) => update({ recurringFrequency: event.target.value })} style={inputStyle}>
            <option value="none">None</option>
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
          </select>
        </label>
        <label>
          <span style={fieldLabelStyle}>AC Sleeve</span>
          <select value={config.altCashAsset} onChange={(event) => update({ altCashAsset: event.target.value })} style={inputStyle}>
            {ALT_CASH_ASSETS.map((asset) => (
              <option key={asset.key} value={asset.key}>{asset.label}</option>
            ))}
          </select>
        </label>
      </div>
      <label style={{ display: "block", marginTop: 10 }}>
        <span style={fieldLabelStyle}>AC Sell Aggression</span>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 62px", gap: 10, alignItems: "center" }}>
          <input
            type="range"
            min="0"
            max="4"
            step="0.25"
            value={config.altCashSellMultiplier}
            onChange={(event) => update({ altCashSellMultiplier: Number(event.target.value) })}
            style={{ width: "100%" }}
          />
          <input
            type="number"
            min="0"
            max="4"
            step="0.25"
            value={config.altCashSellMultiplier}
            onChange={(event) => update({ altCashSellMultiplier: event.target.value })}
            style={{ ...inputStyle, padding: "8px 7px" }}
          />
        </div>
        <span style={{ display: "block", marginTop: 5, fontSize: 11.5, color: "var(--text-muted)", lineHeight: 1.35 }}>
          1.00x uses the baseline AC sell table. Higher values sell AC more aggressively on dip-buy signals.
        </span>
      </label>
      <label style={{ display: "block", marginTop: 10 }}>
        <span style={fieldLabelStyle}>ETF Fee / Expense Ratio</span>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 70px", gap: 10, alignItems: "center" }}>
          <input
            type="range"
            min="0"
            max="3"
            step="0.01"
            value={config.expenseRatio}
            onChange={(event) => update({ expenseRatio: Number(event.target.value) })}
            style={{ width: "100%" }}
          />
          <input
            type="number"
            min="0"
            max="10"
            step="0.01"
            value={config.expenseRatio}
            onChange={(event) => update({ expenseRatio: event.target.value })}
            style={{ ...inputStyle, padding: "8px 7px" }}
          />
        </div>
        <span style={{ display: "block", marginTop: 5, fontSize: 11.5, color: "var(--text-muted)", lineHeight: 1.35 }}>
          Annual fee percentage. Example: QQQ is about 0.20, SPY is about 0.09.
        </span>
      </label>
      </>
      )}
    </div>
  );
}

function PerformanceChart({ results, initialCapital, playbackIndex }) {
  const width = 920;
  const height = 360;
  const pad = { top: 24, right: 24, bottom: 40, left: 76 };

  const visibleIndex = Math.max(0, playbackIndex);
  const visibleResults = results.map((result) => ({
    ...result,
    points: result.points.slice(0, Math.min(visibleIndex + 1, result.points.length)),
  }));
  const visiblePoints = visibleResults.flatMap((result) => result.points);
  const visibleValues = visiblePoints.map((point) => point.value);
  const rawMinValue = Math.min(initialCapital, ...visibleValues);
  const rawMaxValue = Math.max(initialCapital, ...visibleValues);
  const rawValueSpan = rawMaxValue - rawMinValue || Math.max(rawMaxValue * 0.02, 100);
  const valuePadding = rawValueSpan * 0.12;
  const minValue = Math.max(0, rawMinValue - valuePadding);
  const maxValue = rawMaxValue + valuePadding;
  const valueSpan = maxValue - minValue || 1;
  const dates = results[0]?.points.slice(0, Math.min(visibleIndex + 1, results[0]?.points.length || 0)) || [];
  const innerWidth = width - pad.left - pad.right;
  const innerHeight = height - pad.top - pad.bottom;

  const xFor = (index) => pad.left + (index / Math.max(dates.length - 1, 1)) * innerWidth;
  const yFor = (value) => pad.top + (1 - (value - minValue) / valueSpan) * innerHeight;
  const pathFor = (points) =>
    points
      .map((point, index) => `${index === 0 ? "M" : "L"} ${xFor(index).toFixed(2)} ${yFor(point.value).toFixed(2)}`)
      .join(" ");

  const gridValues = [0, 0.25, 0.5, 0.75, 1].map((ratio) => minValue + valueSpan * ratio);
  const firstDate = dates[0]?.date;
  const lastDate = dates[dates.length - 1]?.date;
  const currentDate = lastDate;

  return (
    <div style={{ background: "var(--card)", border: "1px solid var(--divider)", borderRadius: 12, padding: 18, overflowX: "auto" }}>
      <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Strategy equity curve comparison" style={{ width: "100%", minWidth: 760, display: "block" }}>
        <rect x="0" y="0" width={width} height={height} fill="var(--card)" />
        {gridValues.map((value) => (
          <g key={value}>
            <line x1={pad.left} x2={width - pad.right} y1={yFor(value)} y2={yFor(value)} stroke="rgba(35,43,58,0.13)" strokeWidth="1" />
            <text x={pad.left - 12} y={yFor(value) + 4} fill="#667085" fontSize="11" fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace" textAnchor="end">
              {formatMoney(value)}
            </text>
          </g>
        ))}
        <line x1={pad.left} x2={width - pad.right} y1={yFor(initialCapital)} y2={yFor(initialCapital)} stroke="#98A2B3" strokeDasharray="5 6" strokeWidth="1" />
        {visibleResults.map((result) => (
          <g key={result.key}>
            <path d={pathFor(result.points)} fill="none" stroke={result.color} strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" />
            {result.points.length > 0 && (
              <circle
                cx={xFor(result.points.length - 1)}
                cy={yFor(result.points[result.points.length - 1].value)}
                r="4.5"
                fill={result.color}
                stroke="var(--card)"
                strokeWidth="2"
              />
            )}
          </g>
        ))}
        {dates.length > 0 && (
          <line
            x1={xFor(Math.min(visibleIndex, dates.length - 1))}
            x2={xFor(Math.min(visibleIndex, dates.length - 1))}
            y1={pad.top}
            y2={height - pad.bottom}
            stroke="rgba(23,24,28,0.18)"
            strokeWidth="1"
          />
        )}
        <text x={pad.left} y={height - 12} fill="#667085" fontSize="11" fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace">
          {firstDate}
        </text>
        <text x={width - pad.right} y={height - 12} fill="#667085" fontSize="11" fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace" textAnchor="end">
          {lastDate}
        </text>
        {currentDate && (
          <text x={width / 2} y={22} fill="#17181C" fontSize="12" fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace" textAnchor="middle">
            {currentDate}
          </text>
        )}
      </svg>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 14, marginTop: 8 }}>
        {results.map((result) => (
          <div key={result.key} style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 12, color: "var(--text-muted)" }}>
            <span style={{ width: 18, height: 3, borderRadius: 2, background: result.color }} />
            <span>{result.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function BuyingVolumeChart({ results, playbackIndex }) {
  const width = 920;
  const height = 220;
  const pad = { top: 28, right: 24, bottom: 38, left: 76 };
  const visibleIndex = Math.max(0, playbackIndex);
  const dates = results[0]?.points.slice(0, Math.min(visibleIndex + 1, results[0]?.points.length || 0)) || [];
  const visibleResults = results.map((result) => ({
    ...result,
    points: result.points.slice(0, dates.length),
  }));
  const stackedDays = dates.map((date, index) => {
    const segments = visibleResults.map((result) => ({
      key: result.key,
      name: result.name,
      color: result.color,
      contribution: result.points[index]?.contribution || 0,
    }));
    return {
      date: date.date,
      segments,
      total: segments.reduce((sum, segment) => sum + segment.contribution, 0),
    };
  });
  const maxContribution = Math.max(100, ...stackedDays.map((day) => day.total));
  const innerWidth = width - pad.left - pad.right;
  const innerHeight = height - pad.top - pad.bottom;
  const xFor = (index) => pad.left + (index / Math.max(dates.length - 1, 1)) * innerWidth;
  const yFor = (value) => pad.top + (1 - value / maxContribution) * innerHeight;
  const barWidth = Math.max(1.5, Math.min(12, innerWidth / Math.max(stackedDays.length, 1) * 0.72));
  const firstDate = dates[0]?.date;
  const lastDate = dates[dates.length - 1]?.date;
  const currentBuys = stackedDays[stackedDays.length - 1]?.segments
    .filter((item) => item.contribution > 0);
  const currentTotalBuy = stackedDays[stackedDays.length - 1]?.total || 0;

  return (
    <div style={{ background: "var(--card)", border: "1px solid var(--divider)", borderRadius: 12, padding: 18, overflowX: "auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "baseline", marginBottom: 8 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 14 }}>Daily Buying Volume</h2>
          <p style={{ margin: "4px 0 0", fontSize: 12, color: "var(--text-muted)" }}>
            Stacked scheduled buy amount by strategy for each market day.
          </p>
        </div>
        <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, color: currentBuys.length ? "var(--success)" : "var(--text-muted)", textAlign: "right" }}>
          {currentBuys.length ? `Total: ${formatMoney(currentTotalBuy)}  ${currentBuys.map((item) => `${item.name}: ${formatMoney(item.contribution)}`).join("  ")}` : "No buys today"}
        </div>
      </div>
      <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Daily buying volume by strategy" style={{ width: "100%", minWidth: 760, display: "block" }}>
        <rect x="0" y="0" width={width} height={height} fill="var(--card)" />
        {[0, 0.5, 1].map((ratio) => {
          const value = maxContribution * ratio;
          return (
            <g key={ratio}>
              <line x1={pad.left} x2={width - pad.right} y1={yFor(value)} y2={yFor(value)} stroke="rgba(35,43,58,0.13)" strokeWidth="1" />
              <text x={pad.left - 12} y={yFor(value) + 4} fill="#667085" fontSize="11" fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace" textAnchor="end">
                {formatMoney(value)}
              </text>
            </g>
          );
        })}
        {stackedDays.map((day, index) => {
          let stackedValue = 0;
          return day.segments.map((segment) => {
            if (segment.contribution <= 0) return null;
            const yTop = yFor(stackedValue + segment.contribution);
            const yBottom = yFor(stackedValue);
            stackedValue += segment.contribution;
            return (
              <rect
                key={`${day.date}-${segment.key}`}
                x={xFor(index) - barWidth / 2}
                y={yTop}
                width={barWidth}
                height={Math.max(1, yBottom - yTop)}
                fill={segment.color}
                opacity="0.9"
              />
            );
          });
        })}
        {dates.length > 0 && (
          <line
            x1={xFor(dates.length - 1)}
            x2={xFor(dates.length - 1)}
            y1={pad.top}
            y2={height - pad.bottom}
            stroke="rgba(23,24,28,0.18)"
            strokeWidth="1"
          />
        )}
        <text x={pad.left} y={height - 10} fill="#667085" fontSize="11" fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace">
          {firstDate}
        </text>
        <text x={width - pad.right} y={height - 10} fill="#667085" fontSize="11" fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace" textAnchor="end">
          {lastDate}
        </text>
      </svg>
    </div>
  );
}

function PlaybackControls({
  isPlaying,
  onPlayPause,
  onRestart,
  speed,
  onSpeedChange,
  currentDate,
  progressPct,
  playbackIndex,
  maxIndex,
  onTimelineChange,
}) {
  return (
    <div style={{ background: "var(--card)", border: "1px solid var(--divider)", borderRadius: 12, padding: 16 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap", marginBottom: 12 }}>
        <div>
          <div style={{ fontSize: 11, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>Playback</div>
          <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 14, fontWeight: 700 }}>{currentDate || "Ready"}</div>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <button type="button" onClick={onRestart} style={secondaryButtonStyle}>Restart</button>
          <button type="button" onClick={onPlayPause} style={primaryButtonStyle}>{isPlaying ? "Pause" : "Play"}</button>
        </div>
      </div>
      <div style={{ height: 5, background: "var(--card-inner)", borderRadius: 4, overflow: "hidden", marginBottom: 14 }}>
        <div style={{ width: `${progressPct}%`, height: "100%", background: "linear-gradient(90deg, var(--success), var(--accent-2))", transition: "width 0.15s linear" }} />
      </div>
      <label style={{ display: "grid", gap: 7, marginBottom: 14 }}>
        <span style={{ fontSize: 12, color: "var(--text-muted)" }}>
          Timeline: <span style={{ fontFamily: "'JetBrains Mono', monospace", color: "var(--text-primary)" }}>{playbackIndex.toLocaleString()} / {maxIndex.toLocaleString()} market days</span>
        </span>
        <input
          type="range"
          min="0"
          max={maxIndex}
          step="1"
          value={playbackIndex}
          onChange={(event) => onTimelineChange(Number(event.target.value))}
          style={{ width: "100%" }}
        />
      </label>
      <label style={{ display: "grid", gap: 7 }}>
        <span style={{ fontSize: 12, color: "var(--text-muted)" }}>
          Playback speed: <span style={{ fontFamily: "'JetBrains Mono', monospace", color: "var(--text-primary)" }}>{speed} market days/sec</span>
        </span>
        <input
          type="range"
          min="1"
          max="60"
          step="1"
          value={speed}
          onChange={(event) => onSpeedChange(Number(event.target.value))}
          style={{ width: "100%" }}
        />
      </label>
    </div>
  );
}

function ResultTable({ results, playbackIndex }) {
  const tableRows = results.map((result) => buildPlaybackRow(result, playbackIndex));

  return (
    <div style={{ background: "var(--card)", borderRadius: 12, border: "1px solid var(--divider)", overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 980 }}>
        <thead>
          <tr>
            {["Strategy", "Today Buy", "AC Value", "AC Sell", "Value", "Invested", "Net Gain", "Return", "CAGR", "Max DD", "Exposure"].map((label) => (
              <th key={label} style={{ padding: "13px 14px", textAlign: label === "Strategy" ? "left" : "right", fontSize: 11, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em", borderBottom: "1px solid var(--divider)" }}>
                {label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {tableRows.map((row) => (
            <tr key={row.key} style={{ borderBottom: "1px solid var(--divider)" }}>
              <td style={{ padding: "14px", fontSize: 13, fontWeight: 700 }}>
                <span style={{ display: "inline-block", width: 9, height: 9, borderRadius: 9, background: row.color, marginRight: 8 }} />
                {row.name}
              </td>
              <td style={{ padding: "14px", textAlign: "right", fontFamily: "'JetBrains Mono', monospace", fontSize: 13, color: row.todayBuy > 0 ? "var(--success)" : "var(--text-muted)" }}>{formatMoney(row.todayBuy)}</td>
              <td style={{ padding: "14px", textAlign: "right", fontFamily: "'JetBrains Mono', monospace", fontSize: 13 }}>{formatMoney(row.alternativeCash)}</td>
              <td style={{ padding: "14px", textAlign: "right", fontFamily: "'JetBrains Mono', monospace", fontSize: 13, color: row.alternativeCashSale > 0 ? "var(--success)" : "var(--text-muted)" }}>{formatMoney(row.alternativeCashSale)}</td>
              <td style={{ padding: "14px", textAlign: "right", fontFamily: "'JetBrains Mono', monospace", fontSize: 13 }}>{formatMoney(row.finalValue)}</td>
              <td style={{ padding: "14px", textAlign: "right", fontFamily: "'JetBrains Mono', monospace", fontSize: 13 }}>{formatMoney(row.totalContributed)}</td>
              <td style={{ padding: "14px", textAlign: "right", fontFamily: "'JetBrains Mono', monospace", fontSize: 13, color: metricColor(row.netGain) }}>{formatMoney(row.netGain)}</td>
              <td style={{ padding: "14px", textAlign: "right", fontFamily: "'JetBrains Mono', monospace", fontSize: 13, color: metricColor(row.totalReturn) }}>{formatPct(row.totalReturn)}</td>
              <td style={{ padding: "14px", textAlign: "right", fontFamily: "'JetBrains Mono', monospace", fontSize: 13, color: metricColor(row.cagr) }}>{formatPct(row.cagr)}</td>
              <td style={{ padding: "14px", textAlign: "right", fontFamily: "'JetBrains Mono', monospace", fontSize: 13, color: "var(--danger)" }}>{formatPct(row.maxDrawdown)}</td>
              <td style={{ padding: "14px", textAlign: "right", fontFamily: "'JetBrains Mono', monospace", fontSize: 13 }}>{formatPct(row.exposure).replace("+", "")}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function buildPlaybackRow(result, playbackIndex) {
  const index = Math.min(Math.max(playbackIndex, 0), result.points.length - 1);
  const point = result.points[index] || result.points[0];
  const visiblePoints = result.points.slice(0, index + 1);
  const totalContributed = point?.totalContributed ?? result.totalContributed;
  const finalValue = point?.value ?? result.finalValue;
  const todayBuy = point?.contribution ?? 0;
  const alternativeCash = point?.alternativeCash ?? 0;
  const alternativeCashSale = point?.alternativeCashSale ?? 0;
  const netGain = finalValue - totalContributed;
  const totalReturn = totalContributed === 0 ? 0 : netGain / totalContributed;
  const years = Math.max(index / 252, 1 / 252);
  const cagr = Math.pow(Math.max(finalValue / Math.max(totalContributed, 1), 0), 1 / years) - 1;
  const maxDrawdown = Math.min(0, ...visiblePoints.map((item) => item.drawdown ?? 0));
  const exposure = index === 0
    ? point?.position ?? 0
    : visiblePoints.slice(1).filter((item) => item.position > 0).length / index;

  return {
    ...result,
    finalValue,
    todayBuy,
    alternativeCash,
    alternativeCashSale,
    totalContributed,
    netGain,
    totalReturn,
    cagr,
    maxDrawdown,
    exposure,
  };
}

function alignResultsToTimeline(rawResults) {
  const dates = Array.from(new Set(rawResults.flatMap((result) => result.points.map((point) => point.date)))).sort();
  const alignedResults = rawResults.map((result) => {
    const pointMap = new Map(result.points.map((point) => [point.date, point]));
    let lastPoint = result.points[0];

    return {
      ...result,
      points: dates.map((date) => {
        if (pointMap.has(date)) {
          lastPoint = pointMap.get(date);
          return lastPoint;
        }

        return {
          ...lastPoint,
          date,
          contribution: 0,
          alternativeCashDeposit: 0,
          alternativeCashSale: 0,
        };
      }),
    };
  });

  return {
    timeline: dates.map((date) => ({ date })),
    results: alignedResults,
  };
}

function buildResultName(config, fallbackName) {
  return config.name?.trim() || `${config.ticker.toUpperCase()} ${fallbackName}`;
}

function SummaryCard({ label, value, sub, color = "var(--text-primary)" }) {
  return (
    <div style={{ background: "var(--card-inner)", border: "1px solid var(--divider)", borderRadius: 10, padding: 16, minWidth: 150, flex: 1 }}>
      <div style={{ fontSize: 11, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 5 }}>{label}</div>
      <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 19, fontWeight: 700, color }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 4 }}>{sub}</div>}
    </div>
  );
}

export default function StrategySimulator() {
  const defaultStart = useMemo(() => {
    const date = new Date();
    date.setFullYear(date.getFullYear() - 5);
    return date.toISOString().split("T")[0];
  }, []);

  const [startDate, setStartDate] = useState(defaultStart);
  const [strategyConfigs, setStrategyConfigs] = useState(DEFAULT_STRATEGY_CONFIGS);
  const [priceHistory, setPriceHistory] = useState([]);
  const [results, setResults] = useState([]);
  const [playbackIndex, setPlaybackIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(5);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [lastUpdated, setLastUpdated] = useState("");
  const playbackRemainderRef = useRef(0);

  const bestResult = results.length
    ? [...results].sort((a, b) => b.totalReturn - a.totalReturn)[0]
    : null;
  const latestPoint = bestResult?.points[Math.min(playbackIndex, bestResult.points.length - 1)];
  const progressPct = results.length > 0 ? (Math.min(playbackIndex, priceHistory.length - 1) / Math.max(priceHistory.length - 1, 1)) * 100 : 0;

  useEffect(() => {
    if (!isPlaying || results.length === 0) return undefined;

    const intervalMs = 100;
    const timer = setInterval(() => {
      setPlaybackIndex((current) => {
        const maxIndex = priceHistory.length - 1;
        playbackRemainderRef.current += playbackSpeed / (1000 / intervalMs);
        const wholeDays = Math.floor(playbackRemainderRef.current);
        if (wholeDays < 1) return current;
        playbackRemainderRef.current -= wholeDays;
        const next = Math.min(current + wholeDays, maxIndex);
        if (next >= maxIndex) setIsPlaying(false);
        return next;
      });
    }, intervalMs);

    return () => clearInterval(timer);
  }, [isPlaying, playbackSpeed, priceHistory.length, results.length]);

  const updateStrategyConfig = (id, patch) => {
    setStrategyConfigs((current) => current.map((config) => config.id === id ? { ...config, ...patch } : config));
  };

  const removeStrategyConfig = (id) => {
    setStrategyConfigs((current) => current.length <= 1 ? current : current.filter((config) => config.id !== id));
  };

  const duplicateStrategyConfig = (id) => {
    setStrategyConfigs((current) => {
      const source = current.find((config) => config.id === id);
      if (!source) return current;
      const copy = createStrategyConfig({
        ...source,
        id: undefined,
        name: `${source.name} Copy`,
        color: DEFAULT_CONFIG_COLORS[current.length % DEFAULT_CONFIG_COLORS.length],
      });
      return [...current, copy];
    });
  };

  const addStrategyConfig = () => {
    setStrategyConfigs((current) => [
      ...current,
      createStrategyConfig({
        name: `Custom Strategy ${current.length + 1}`,
        color: DEFAULT_CONFIG_COLORS[current.length % DEFAULT_CONFIG_COLORS.length],
      }),
    ]);
  };

  const runSimulation = async () => {
    setLoading(true);
    setError("");
    setResults([]);
    setPriceHistory([]);
    setPlaybackIndex(0);
    setIsPlaying(false);
    playbackRemainderRef.current = 0;

    try {
      const historyCache = new Map();
      const getHistory = async (symbol, fromDate) => {
        const key = `${symbol.trim().toUpperCase()}|${fromDate}`;
        if (!historyCache.has(key)) {
          historyCache.set(key, await fetchHistoricalPrices(symbol, fromDate));
        }
        return historyCache.get(key);
      };
      const rawResults = [];

      for (const config of strategyConfigs) {
        const cleanTicker = config.ticker.trim();
        if (!cleanTicker) {
          throw new Error(`${config.name} is missing a ticker.`);
        }

        const history = await getHistory(cleanTicker, startDate);
        if (history.length < 40) {
          throw new Error(`${config.name}: not enough market data returned. Try an earlier start date or a more liquid ticker.`);
        }

        const selectedAltCash = ALT_CASH_ASSETS.find((asset) => asset.key === config.altCashAsset) || ALT_CASH_ASSETS[0];
        const altCashHistory = selectedAltCash.symbol
          ? await getHistory(selectedAltCash.symbol, history[0].date)
          : [];

        const [simulation] = runStrategyBacktests(history, [config.strategyKey], Number(config.initialCapital) || 0, {
          recurringAmount: Number(config.recurringAmount) || 0,
          recurringFrequency: config.recurringFrequency,
          altCashAsset: config.altCashAsset,
          altCashSellMultiplier: Number(config.altCashSellMultiplier) || 0,
          expenseRatio: Number(config.expenseRatio) || 0,
          altCashHistory,
        });

        rawResults.push({
          ...simulation,
          key: config.id,
          name: buildResultName(config, simulation.name),
          color: config.color,
          ticker: cleanTicker.toUpperCase(),
          config,
        });
      }

      const aligned = alignResultsToTimeline(rawResults);
      setPriceHistory(aligned.timeline);
      setResults(aligned.results);
      setPlaybackIndex(0);
      setIsPlaying(true);
      setLastUpdated(new Date().toLocaleString());
    } catch (err) {
      setError(err.message || "Simulation failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: "28px 0 46px" }}>
      <div style={{ maxWidth: 1180, margin: "0 auto", padding: "0 24px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: 18, marginBottom: 22 }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0, letterSpacing: "0" }}>
              Strategy Return Simulator
            </h1>
            <p style={{ fontSize: 13, color: "var(--text-muted)", margin: "5px 0 0", maxWidth: 680, lineHeight: 1.45 }}>
              Pulls updated daily adjusted-close history and compares rule-based strategy equity curves from your start date through the latest available market session.
            </p>
          </div>
          {lastUpdated && (
            <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: "var(--text-muted)", background: "var(--card)", border: "1px solid var(--divider)", borderRadius: 7, padding: "7px 10px" }}>
              refreshed {lastUpdated}
            </div>
          )}
        </div>

        <style>{`
          .strategy-layout {
            display: grid;
            grid-template-columns: minmax(280px, 340px) minmax(0, 1fr);
            gap: 18px;
            align-items: start;
          }
          @media (max-width: 860px) {
            .strategy-layout {
              grid-template-columns: 1fr;
            }
          }
        `}</style>

        <div className="strategy-layout">
          <section style={{ background: "var(--card)", border: "1px solid var(--divider)", borderRadius: 12, padding: 18 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, marginBottom: 14 }}>
              <h2 style={{ fontSize: 14, margin: 0, fontWeight: 700 }}>Custom Strategy Configs</h2>
              <button type="button" onClick={addStrategyConfig} style={miniButtonStyle}>Add</button>
            </div>
            <label style={{ display: "block", marginBottom: 12 }}>
              <span style={fieldLabelStyle}>Shared Start Date</span>
              <input
                type="date"
                value={startDate}
                max={new Date().toISOString().split("T")[0]}
                onChange={(event) => setStartDate(event.target.value)}
                style={inputStyle}
              />
            </label>
            <p style={{ fontSize: 12, color: "var(--text-muted)", lineHeight: 1.45, margin: "0 0 14px" }}>
              Each config can use a different ticker, base strategy, contribution schedule, AC sleeve, and color.
            </p>

            <div style={{ display: "grid", gap: 12, marginBottom: 16 }}>
              {strategyConfigs.map((config, index) => (
                <StrategyConfigCard
                  key={config.id}
                  config={config}
                  index={index}
                  canRemove={strategyConfigs.length > 1}
                  onChange={updateStrategyConfig}
                  onRemove={removeStrategyConfig}
                  onDuplicate={duplicateStrategyConfig}
                />
              ))}
            </div>

            <button
              type="button"
              onClick={runSimulation}
              disabled={loading || strategyConfigs.length === 0}
              style={{
                width: "100%",
                border: "none",
                borderRadius: 8,
                background: loading ? "rgba(113,122,140,0.22)" : "linear-gradient(135deg, var(--accent), var(--accent-2))",
                color: "#fff",
                fontSize: 13,
                fontWeight: 700,
                padding: "11px 14px",
                cursor: loading ? "wait" : "pointer",
                fontFamily: "'DM Sans', sans-serif",
              }}
            >
              {loading ? "Running simulation..." : "Run Simulation"}
            </button>

            {error && (
              <div style={{ marginTop: 14, padding: 12, borderRadius: 8, background: "rgba(255,59,48,0.1)", border: "1px solid rgba(255,59,48,0.28)", color: "var(--danger)", fontSize: 12, lineHeight: 1.4 }}>
                {error}
              </div>
            )}
          </section>

          <main style={{ display: "grid", gap: 16 }}>
            {results.length > 0 ? (
              <>
                <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                  <SummaryCard label="Price Observations" value={priceHistory.length.toLocaleString()} sub={`${priceHistory[0]?.date} to ${priceHistory[priceHistory.length - 1]?.date}`} />
                  <SummaryCard label="Best Strategy" value={bestResult.name} sub={`${formatMoney(bestResult.netGain)} gain`} color={bestResult.color} />
                  <SummaryCard label="Config Count" value={results.length.toLocaleString()} sub="Independent custom strategy runs" />
                  <SummaryCard label="Current Frame" value={latestPoint ? formatMoney(latestPoint.value) : "-"} sub={latestPoint?.date} color={bestResult.color} />
                </div>
                <PlaybackControls
                  isPlaying={isPlaying}
                  onPlayPause={() => setIsPlaying((current) => !current)}
                  onRestart={() => {
                    playbackRemainderRef.current = 0;
                    setPlaybackIndex(0);
                    setIsPlaying(true);
                  }}
                  speed={playbackSpeed}
                  onSpeedChange={setPlaybackSpeed}
                  currentDate={priceHistory[Math.min(playbackIndex, priceHistory.length - 1)]?.date}
                  progressPct={progressPct}
                  playbackIndex={Math.min(playbackIndex, Math.max(priceHistory.length - 1, 0))}
                  maxIndex={Math.max(priceHistory.length - 1, 0)}
                  onTimelineChange={(nextIndex) => {
                    playbackRemainderRef.current = 0;
                    setIsPlaying(false);
                    setPlaybackIndex(nextIndex);
                  }}
                />
                <PerformanceChart results={results} initialCapital={0} playbackIndex={playbackIndex} />
                <BuyingVolumeChart results={results} playbackIndex={playbackIndex} />
                <ResultTable results={results} playbackIndex={playbackIndex} />
              </>
            ) : (
              <div style={{ background: "var(--card)", border: "1px solid var(--divider)", borderRadius: 12, minHeight: 420, display: "flex", alignItems: "center", justifyContent: "center", padding: 32, textAlign: "center" }}>
                <div style={{ maxWidth: 440 }}>
                  <div style={{ width: 48, height: 48, margin: "0 auto 14px", borderRadius: 14, background: "linear-gradient(145deg, rgba(255,255,255,0.86), rgba(255,255,255,0.4))", border: "1px solid rgba(255,255,255,0.72)", color: "var(--accent)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800 }}>
                    SIM
                  </div>
                  <h2 style={{ margin: "0 0 8px", fontSize: 18 }}>No simulation yet</h2>
                  <p style={{ margin: 0, color: "var(--text-muted)", fontSize: 13, lineHeight: 1.5 }}>
                    Choose a ticker, start date, contribution plan, and at least one strategy. Results will play back as market days advance and show comparable growth curves, contributed capital, net gain, drawdown, and exposure.
                  </p>
                </div>
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}

const inputStyle = {
  width: "100%",
  boxSizing: "border-box",
  background: "var(--input-bg)",
  border: "1px solid var(--input-border)",
  borderRadius: 8,
  color: "var(--text-primary)",
  padding: "10px 11px",
  fontFamily: "'JetBrains Mono', monospace",
  fontSize: 13,
  outline: "none",
};

const primaryButtonStyle = {
  border: "none",
  borderRadius: 8,
  background: "linear-gradient(135deg, var(--accent), var(--accent-2))",
  color: "#fff",
  fontSize: 13,
  fontWeight: 700,
  padding: "9px 16px",
  cursor: "pointer",
  fontFamily: "'DM Sans', sans-serif",
};

const secondaryButtonStyle = {
  border: "1px solid var(--divider)",
  borderRadius: 8,
  background: "var(--card-inner)",
  color: "var(--text-primary)",
  fontSize: 13,
  fontWeight: 700,
  padding: "8px 14px",
  cursor: "pointer",
  fontFamily: "'DM Sans', sans-serif",
};

const miniButtonStyle = {
  border: "1px solid var(--divider)",
  borderRadius: 7,
  background: "var(--input-bg)",
  color: "var(--text-primary)",
  fontSize: 11,
  fontWeight: 700,
  padding: "6px 8px",
  cursor: "pointer",
  fontFamily: "'DM Sans', sans-serif",
};

const fieldLabelStyle = {
  display: "block",
  fontSize: 11,
  color: "var(--text-muted)",
  textTransform: "uppercase",
  letterSpacing: "0.06em",
  marginBottom: 6,
};
