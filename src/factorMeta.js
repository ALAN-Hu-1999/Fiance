export const FACTOR_META = {
  market: {
    label: "Market (Mkt-RF)",
    shortLabel: "Mkt-RF",
    desc: "Exposure to the overall equity market premium above the risk-free rate",
    color: "#E8453C",
    icon: "📈",
    // For coloring: positive = more market exposure (neutral, not directionally good/bad)
    // We color by sign: positive = green tint, negative = red tint
    positiveIsGood: null, // neutral
  },
  smb: {
    label: "Size (SMB)",
    shortLabel: "SMB",
    desc: "Small Minus Big — captures the size premium of smaller firms",
    color: "#F59E0B",
    icon: "📐",
    positiveIsGood: null,
  },
  hml: {
    label: "Value (HML)",
    shortLabel: "HML",
    desc: "High Minus Low — captures the value premium of high book-to-market firms",
    color: "#3B82F6",
    icon: "💎",
    positiveIsGood: null,
  },
  rmw: {
    label: "Profitability (RMW)",
    shortLabel: "RMW",
    desc: "Robust Minus Weak — captures the profitability premium",
    color: "#10B981",
    icon: "🏭",
    positiveIsGood: true, // higher profitability exposure generally better
  },
  cma: {
    label: "Investment (CMA)",
    shortLabel: "CMA",
    desc: "Conservative Minus Aggressive — captures the investment pattern premium",
    color: "#8B5CF6",
    icon: "🏗️",
    positiveIsGood: null,
  },
};

export const MARKETS = [
  { value: "US", label: "United States" },
  { value: "Europe", label: "Europe" },
  { value: "Japan", label: "Japan" },
  { value: "Asia_Pacific", label: "Asia Pacific" },
  { value: "Global", label: "Global" },
  { value: "UK", label: "United Kingdom" },
  { value: "Canada", label: "Canada" },
];

export const FACTOR_KEYS = Object.keys(FACTOR_META);