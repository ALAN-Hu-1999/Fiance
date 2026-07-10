export const FACTOR_META = {
  market: {
    label: "Market (Mkt-RF)",
    shortLabel: "Mkt-RF",
    desc: "Exposure to the overall equity market premium above the risk-free rate",
    color: "#007AFF",
    icon: "M",
    // For coloring: positive means more market exposure, so it is neutral.
    positiveIsGood: null,
  },
  smb: {
    label: "Size (SMB)",
    shortLabel: "SMB",
    desc: "Small Minus Big - captures the size premium of smaller firms",
    color: "#FF9F0A",
    icon: "S",
    positiveIsGood: null,
  },
  hml: {
    label: "Value (HML)",
    shortLabel: "HML",
    desc: "High Minus Low - captures the value premium of high book-to-market firms",
    color: "#5856D6",
    icon: "V",
    positiveIsGood: null,
  },
  rmw: {
    label: "Profitability (RMW)",
    shortLabel: "RMW",
    desc: "Robust Minus Weak - captures the profitability premium",
    color: "#34C759",
    icon: "P",
    positiveIsGood: true,
  },
  cma: {
    label: "Investment (CMA)",
    shortLabel: "CMA",
    desc: "Conservative Minus Aggressive - captures the investment pattern premium",
    color: "#AF52DE",
    icon: "I",
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
