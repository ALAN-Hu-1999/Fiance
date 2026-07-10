import { fetchYahooFinanceData } from "./ff5_math";

const TRADING_DAYS = 252;
const SMART_DCA_LOOKBACK_MONTHS = 36;
const VOL_DCA_LOOKBACK_DAYS = 63;
const VOL_DCA_TARGET_VOL = 0.2;

export const ALT_CASH_ASSETS = [
  { key: "none", label: "None", symbol: null, description: "Unused under-invested scheduled cash stays outside the portfolio." },
  { key: "cash", label: "Cash Reserve", symbol: null, description: "Unused scheduled cash is kept as zero-return cash." },
  { key: "sgov", label: "High Yield Cash ETF", symbol: "SGOV", description: "Uses SGOV as a Treasury-bill ETF proxy." },
  { key: "gold", label: "Gold ETF", symbol: "GLD", description: "Uses GLD as a gold proxy." },
  { key: "bear", label: "Bear Bet ETF", symbol: "PSQ", description: "Uses PSQ as an inverse Nasdaq-100 proxy." },
];

export const MARKET_INDEX_PRESETS = [
  { label: "Bitcoin", symbol: "BTC-USD", aliases: ["BTC", "BITCOIN", "BTCUSD", "BTC/USD"] },
  { label: "Ethereum", symbol: "ETH-USD", aliases: ["ETH", "ETHEREUM", "ETHUSD", "ETH/USD"] },
  { label: "S&P 500", symbol: "^GSPC", aliases: ["SP500", "S&P500", "SPX"] },
  { label: "Nasdaq 100", symbol: "^NDX", aliases: ["NDX", "NASDAQ100", "NASDAQ 100"] },
  { label: "Nasdaq Composite", symbol: "^IXIC", aliases: ["IXIC", "NASDAQ"] },
  { label: "Dow Jones Industrial Average", symbol: "^DJI", aliases: ["DJI", "DOW", "DJIA"] },
  { label: "Russell 2000", symbol: "^RUT", aliases: ["RUT", "RUSSELL2000", "RUSSELL 2000"] },
  { label: "Nikkei 225", symbol: "^N225", aliases: ["N225", "NIKKEI", "NIKKEI225", "NIKKEI 225", "JAPAN"] },
  { label: "Hang Seng", symbol: "^HSI", aliases: ["HSI", "HANG SENG", "HANGSENG", "HONG KONG"] },
  { label: "Shanghai Composite", symbol: "000001.SS", aliases: ["SSE", "SHCOMP", "SHANGHAI", "CHINA"] },
  { label: "FTSE 100", symbol: "^FTSE", aliases: ["FTSE", "UKX", "UK"] },
  { label: "DAX", symbol: "^GDAXI", aliases: ["DAX", "GERMANY"] },
  { label: "CAC 40", symbol: "^FCHI", aliases: ["CAC", "CAC40", "FRANCE"] },
  { label: "STOXX Europe 600", symbol: "^STOXX", aliases: ["STOXX", "STOXX600", "EUROPE"] },
  { label: "S&P/TSX Composite", symbol: "^GSPTSE", aliases: ["TSX", "CANADA"] },
  { label: "ASX 200", symbol: "^AXJO", aliases: ["ASX", "ASX200", "AUSTRALIA"] },
];

const INDEX_ALIAS_MAP = new Map(
  MARKET_INDEX_PRESETS.flatMap((item) => [
    [item.symbol.toUpperCase(), item.symbol],
    [item.label.toUpperCase().replace(/[^A-Z0-9]/g, ""), item.symbol],
    ...item.aliases.map((alias) => [alias.toUpperCase().replace(/[^A-Z0-9]/g, ""), item.symbol]),
  ])
);

const DOT_SUFFIX_ALLOWLIST = new Set([
  "SS", "SZ", "T", "HK", "KS", "KQ", "TW", "TWO", "AX", "TO", "V", "L", "PA",
  "DE", "F", "SW", "MI", "AS", "BR", "ST", "CO", "OL", "HE", "MC", "SA", "MX",
  "SI", "KL", "BK", "JK", "NS", "BO",
]);

export const STRATEGIES = [
  {
    key: "buy_hold",
    name: "Buy & Hold",
    description: "Fully invested from the first available trading day.",
    color: "#34C759",
  },
  {
    key: "sma_20_50",
    name: "SMA 20/50",
    description: "Long when the 20-day average is above the 50-day average.",
    color: "#007AFF",
  },
  {
    key: "sma_50_200",
    name: "SMA 50/200",
    description: "Long when the 50-day average is above the 200-day average.",
    color: "#FF9F0A",
  },
  {
    key: "momentum_63",
    name: "63D Momentum",
    description: "Long when price is above the close 63 trading days ago.",
    color: "#AF52DE",
  },
  {
    key: "mean_reversion_rsi",
    name: "RSI Reversion",
    description: "Buys oversold RSI readings and exits after recovery.",
    color: "#FF3B30",
  },
  {
    key: "smart_dca_36m",
    name: "36M Percentile DCA",
    description: "Scales scheduled buys by where price sits in its trailing 36-month distribution.",
    color: "#5AC8FA",
  },
  {
    key: "trend_filtered_smart_dca",
    name: "Trend-Filtered DCA",
    description: "Uses 36-month valuation DCA only when the 50-day average is above the 200-day average.",
    color: "#EC4899",
  },
  {
    key: "volatility_scaled_dca",
    name: "Volatility-Scaled DCA",
    description: "Scales scheduled buys by 63-day realized volatility, buying more in calm regimes and less in turbulent ones.",
    color: "#64D2FF",
  },
  {
    key: "average_cost_smart_dca",
    name: "Avg Cost Smart DCA",
    description: "Scales scheduled buys by current price versus your running average cost basis.",
    color: "#32D74B",
  },
  {
    key: "dual_regime_accumulator",
    name: "Dual-Regime Accumulator",
    description: "Buys normally in 50/200 uptrends and switches to 36-month smart DCA in downtrends.",
    color: "#FF9500",
  },
];

export async function fetchHistoricalPrices(ticker, startDate, endDate = new Date()) {
  const startStamp = Math.floor(new Date(startDate).getTime() / 1000);
  const endStamp = Math.floor(new Date(endDate).getTime() / 1000) + 86400;
  const yahooTicker = resolveYahooSymbol(ticker);
  const history = await fetchYahooFinanceData(yahooTicker, startStamp, endStamp);

  return history
    .filter((row) => Number.isFinite(row.price))
    .sort((a, b) => a.date.localeCompare(b.date));
}

export function resolveYahooSymbol(rawTicker) {
  const trimmed = String(rawTicker || "").trim();
  if (!trimmed) return "";

  const aliasKey = trimmed.toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (INDEX_ALIAS_MAP.has(aliasKey)) {
    return INDEX_ALIAS_MAP.get(aliasKey);
  }

  if (trimmed.startsWith("^")) {
    return trimmed.toUpperCase();
  }

  const upper = trimmed.toUpperCase();
  const dotParts = upper.split(".");
  if (dotParts.length === 2) {
    const suffix = dotParts[1];
    return DOT_SUFFIX_ALLOWLIST.has(suffix) ? upper : upper.replace(".", "-");
  }

  return upper;
}

export function runStrategyBacktests(priceHistory, strategyKeys, initialCapital = 10000, options = {}) {
  if (!priceHistory || priceHistory.length < 2) {
    throw new Error("At least two price observations are required.");
  }

  const recurringAmount = Math.max(Number(options.recurringAmount) || 0, 0);
  const recurringFrequency = options.recurringFrequency || "none";
  const altCashEnabled = options.altCashAsset && options.altCashAsset !== "none";
  const altPriceMap = buildPriceMap(options.altCashHistory || []);
  const altCashSellMultiplier = Math.max(Number(options.altCashSellMultiplier) || 1, 0);
  const annualExpenseRatio = Math.max(Number(options.expenseRatio) || 0, 0) / 100;
  const dailyExpenseRate = annualExpenseRatio > 0 ? Math.pow(1 + annualExpenseRatio, 1 / TRADING_DAYS) - 1 : 0;

  return strategyKeys.map((strategyKey) => {
    const strategy = STRATEGIES.find((s) => s.key === strategyKey);
    if (!strategy) {
      throw new Error(`Unknown strategy: ${strategyKey}`);
    }

    const signals = buildSignals(priceHistory, strategyKey);
    const points = [];
    let equity = initialCapital;
    let peak = initialCapital;
    let maxDrawdown = 0;
    let totalContributed = initialCapital;
    let alternativeCash = 0;
    let investedDays = 0;
    let syntheticShares = priceHistory[0].price > 0 ? initialCapital / priceHistory[0].price : 0;
    let costBasis = initialCapital;
    let averageCost = syntheticShares > 0 ? costBasis / syntheticShares : null;
    const dailyReturns = [];

    points.push({
      date: priceHistory[0].date,
      value: roundMoney(equity),
      totalContributed: roundMoney(totalContributed),
      netGain: roundMoney(equity - totalContributed),
      drawdown: 0,
      position: signals[0],
      contribution: 0,
      contributionMultiplier: 0,
      pricePercentile: null,
      realizedVolatility: null,
      averageCost: averageCost === null ? null : roundMoney(averageCost),
      alternativeCash: 0,
      alternativeCashDeposit: 0,
      alternativeCashSale: 0,
    });

    for (let i = 1; i < priceHistory.length; i++) {
      const previous = priceHistory[i - 1].price;
      const current = priceHistory[i].price;
      const previousDate = priceHistory[i - 1].date;
      const currentDate = priceHistory[i].date;
      if (alternativeCash > 0) {
        alternativeCash *= 1 + getAltCashReturn(altPriceMap, previousDate, currentDate);
      }

      const dcaSignal = getContributionSignal(priceHistory, i, strategyKey, averageCost);
      const baseContribution = getContributionForDate(priceHistory, i, recurringAmount, recurringFrequency);
      const position = signals[i - 1];
      const canContribute = strategyKey === "trend_filtered_smart_dca" ? position > 0 : true;
      const desiredContribution = canContribute ? baseContribution * dcaSignal.multiplier : 0;
      let contribution = desiredContribution;
      let alternativeCashDeposit = 0;
      let alternativeCashSale = 0;

      if (altCashEnabled && baseContribution > 0) {
        const acPlan = getAlternativeCashPlan(strategyKey, dcaSignal, baseContribution, desiredContribution, altCashSellMultiplier);
        alternativeCashSale = Math.min(alternativeCash, acPlan.sellRequest);
        alternativeCash -= alternativeCashSale;
        alternativeCashDeposit = acPlan.deposit;
        alternativeCash += alternativeCashDeposit;
        contribution = acPlan.baseBuy + alternativeCashSale;
        totalContributed += baseContribution;
      }

      if (contribution > 0) {
        equity += contribution;
        if (!altCashEnabled) {
          totalContributed += contribution;
        }
        if (position > 0 && current > 0) {
          syntheticShares += contribution / current;
          costBasis += contribution;
          averageCost = syntheticShares > 0 ? costBasis / syntheticShares : averageCost;
        }
      }

      const assetReturn = previous === 0 ? 0 : (current - previous) / previous;
      const grossStrategyReturn = position * assetReturn;
      const strategyReturn = grossStrategyReturn - dailyExpenseRate;

      equity *= 1 + strategyReturn;
      const totalPortfolioValue = equity + alternativeCash;
      peak = Math.max(peak, totalPortfolioValue);
      const drawdown = peak === 0 ? 0 : totalPortfolioValue / peak - 1;
      maxDrawdown = Math.min(maxDrawdown, drawdown);
      dailyReturns.push(strategyReturn);
      if (position > 0) investedDays += 1;

      points.push({
        date: priceHistory[i].date,
        value: roundMoney(totalPortfolioValue),
        totalContributed: roundMoney(totalContributed),
        netGain: roundMoney(totalPortfolioValue - totalContributed),
        drawdown,
        position,
        contribution: roundMoney(contribution),
        contributionMultiplier: dcaSignal.multiplier,
        pricePercentile: dcaSignal.pricePercentile,
        realizedVolatility: dcaSignal.realizedVolatility,
        averageCost: averageCost === null ? null : roundMoney(averageCost),
        alternativeCash: roundMoney(alternativeCash),
        alternativeCashDeposit: roundMoney(alternativeCashDeposit),
        alternativeCashSale: roundMoney(alternativeCashSale),
      });
    }

    const finalValue = equity + alternativeCash;
    const netGain = finalValue - totalContributed;
    const totalReturn = totalContributed === 0 ? 0 : netGain / totalContributed;
    const years = Math.max(dailyReturns.length / TRADING_DAYS, 1 / TRADING_DAYS);
    const cagr = Math.pow(1 + totalReturn, 1 / years) - 1;
    const volatility = standardDeviation(dailyReturns) * Math.sqrt(TRADING_DAYS);
    const averageDailyReturn = mean(dailyReturns);
    const sharpe = volatility === 0 ? 0 : (averageDailyReturn * TRADING_DAYS) / volatility;

    return {
      ...strategy,
      finalValue: roundMoney(finalValue),
      totalContributed: roundMoney(totalContributed),
      netGain: roundMoney(netGain),
      totalReturn,
      cagr,
      volatility,
      maxDrawdown,
      sharpe,
      exposure: investedDays / dailyReturns.length,
      expenseRatio: annualExpenseRatio,
      points,
    };
  });
}

function buildPriceMap(history) {
  return new Map((history || []).map((row) => [row.date, row.price]));
}

function getAltCashReturn(priceMap, previousDate, currentDate) {
  if (!priceMap || priceMap.size === 0) return 0;
  const previous = priceMap.get(previousDate);
  const current = priceMap.get(currentDate);
  if (!previous || !current || previous <= 0) return 0;
  return (current - previous) / previous;
}

function getAlternativeCashPlan(strategyKey, dcaSignal, baseContribution, desiredContribution, sellMultiplier = 1) {
  if (desiredContribution <= 0) {
    return {
      baseBuy: 0,
      deposit: baseContribution,
      sellRequest: 0,
    };
  }

  if (usesPercentileAlternativeCash(strategyKey) && dcaSignal.pricePercentile !== null) {
    return getPercentileAlternativeCashPlan(dcaSignal.pricePercentile, baseContribution, sellMultiplier);
  }

  const baseBuy = Math.min(desiredContribution, baseContribution);
  return {
    baseBuy,
    deposit: Math.max(baseContribution - desiredContribution, 0),
    sellRequest: Math.max(desiredContribution - baseContribution, 0) * sellMultiplier,
  };
}

function usesPercentileAlternativeCash(strategyKey) {
  return ["smart_dca_36m", "trend_filtered_smart_dca", "dual_regime_accumulator"].includes(strategyKey);
}

function getPercentileAlternativeCashPlan(pricePercentile, baseContribution, sellMultiplier = 1) {
  if (pricePercentile >= 0.8) {
    return {
      baseBuy: baseContribution * 0.25,
      deposit: baseContribution * 0.75,
      sellRequest: 0,
    };
  }

  if (pricePercentile >= 0.7) {
    return {
      baseBuy: baseContribution * 0.5,
      deposit: 0,
      sellRequest: baseContribution * 0.5 * sellMultiplier,
    };
  }

  if (pricePercentile >= 0.5) {
    return {
      baseBuy: baseContribution,
      deposit: 0,
      sellRequest: baseContribution * sellMultiplier,
    };
  }

  if (pricePercentile >= 0.3) {
    return {
      baseBuy: baseContribution,
      deposit: 0,
      sellRequest: baseContribution * 2 * sellMultiplier,
    };
  }

  if (pricePercentile >= 0.11) {
    return {
      baseBuy: baseContribution,
      deposit: 0,
      sellRequest: baseContribution * 4 * sellMultiplier,
    };
  }

  return {
    baseBuy: baseContribution,
    deposit: 0,
    sellRequest: baseContribution * 8 * sellMultiplier,
  };
}

function getContributionForDate(priceHistory, index, amount, frequency) {
  if (amount <= 0 || frequency === "none") return 0;
  if (frequency === "weekly") return index % 5 === 0 ? amount : 0;

  if (frequency === "monthly") {
    const currentMonth = priceHistory[index].date.slice(0, 7);
    const previousMonth = priceHistory[index - 1].date.slice(0, 7);
    return currentMonth !== previousMonth ? amount : 0;
  }

  return 0;
}

function buildSignals(priceHistory, strategyKey) {
  switch (strategyKey) {
    case "buy_hold":
    case "smart_dca_36m":
    case "volatility_scaled_dca":
    case "average_cost_smart_dca":
    case "dual_regime_accumulator":
      return priceHistory.map(() => 1);
    case "trend_filtered_smart_dca":
      return movingAverageCrossover(priceHistory, 50, 200);
    case "sma_20_50":
      return movingAverageCrossover(priceHistory, 20, 50);
    case "sma_50_200":
      return movingAverageCrossover(priceHistory, 50, 200);
    case "momentum_63":
      return momentumSignal(priceHistory, 63);
    case "mean_reversion_rsi":
      return rsiReversionSignal(priceHistory, 14, 35, 55);
    default:
      return priceHistory.map(() => 0);
  }
}

function getContributionSignal(priceHistory, index, strategyKey, averageCost) {
  if (strategyKey === "volatility_scaled_dca") {
    const realizedVolatility = calculateRealizedVolatility(priceHistory, index, VOL_DCA_LOOKBACK_DAYS);
    if (realizedVolatility === null || realizedVolatility <= 0) {
      return { multiplier: 1, pricePercentile: null, realizedVolatility };
    }

    return {
      multiplier: roundMultiplier(clamp(VOL_DCA_TARGET_VOL / realizedVolatility, 0.5, 2)),
      pricePercentile: null,
      realizedVolatility,
    };
  }

  if (strategyKey === "average_cost_smart_dca") {
    const multiplier = getAverageCostMultiplier(priceHistory[index].price, averageCost);
    return { multiplier, pricePercentile: null, realizedVolatility: null };
  }

  if (strategyKey === "dual_regime_accumulator") {
    const fast = simpleMovingAverage(priceHistory, index, 50);
    const slow = simpleMovingAverage(priceHistory, index, 200);
    const isUptrend = fast !== null && slow !== null && fast > slow;
    if (isUptrend) {
      return { multiplier: 1, pricePercentile: null, realizedVolatility: null };
    }

    const pricePercentile = calculateTrailingPricePercentile(priceHistory, index, SMART_DCA_LOOKBACK_MONTHS);
    return {
      multiplier: getPercentileDcaMultiplier(pricePercentile),
      pricePercentile,
      realizedVolatility: null,
    };
  }

  if (strategyKey !== "smart_dca_36m" && strategyKey !== "trend_filtered_smart_dca") {
    return { multiplier: 1, pricePercentile: null, realizedVolatility: null };
  }

  const pricePercentile = calculateTrailingPricePercentile(priceHistory, index, SMART_DCA_LOOKBACK_MONTHS);
  return {
    multiplier: getPercentileDcaMultiplier(pricePercentile),
    pricePercentile,
    realizedVolatility: null,
  };
}

function getPercentileDcaMultiplier(pricePercentile) {
  if (pricePercentile === null) return 1;
  if (pricePercentile <= 0.2) return 2;
  if (pricePercentile <= 0.4) return 1.5;
  if (pricePercentile <= 0.6) return 1;
  if (pricePercentile <= 0.8) return 0.5;
  return 0.25;
}

function getAverageCostMultiplier(currentPrice, averageCost) {
  if (!averageCost || averageCost <= 0 || currentPrice <= 0) return 1;

  const priceVsCost = currentPrice / averageCost - 1;
  if (priceVsCost <= -0.2) return 2;
  if (priceVsCost <= -0.1) return 1.5;
  if (priceVsCost <= 0) return 1.25;
  if (priceVsCost <= 0.1) return 1;
  if (priceVsCost <= 0.2) return 0.75;
  return 0.5;
}

function calculateRealizedVolatility(priceHistory, index, lookbackDays) {
  if (index < lookbackDays) return null;

  const returns = [];
  for (let i = index - lookbackDays + 1; i <= index; i++) {
    const previous = priceHistory[i - 1].price;
    const current = priceHistory[i].price;
    if (previous > 0) {
      returns.push((current - previous) / previous);
    }
  }

  if (returns.length < 2) return null;
  return standardDeviation(returns) * Math.sqrt(TRADING_DAYS);
}

function calculateTrailingPricePercentile(priceHistory, index, lookbackMonths) {
  const current = priceHistory[index];
  const currentDate = new Date(`${current.date}T00:00:00Z`);
  const startDate = new Date(currentDate);
  startDate.setUTCMonth(startDate.getUTCMonth() - lookbackMonths);

  const trailingPrices = [];
  for (let i = index; i >= 0; i--) {
    const rowDate = new Date(`${priceHistory[i].date}T00:00:00Z`);
    if (rowDate < startDate) break;
    trailingPrices.push(priceHistory[i].price);
  }

  if (trailingPrices.length < 60) return null;

  const belowOrEqual = trailingPrices.filter((price) => price <= current.price).length;
  return belowOrEqual / trailingPrices.length;
}

function movingAverageCrossover(priceHistory, fastWindow, slowWindow) {
  return priceHistory.map((_, index) => {
    const fast = simpleMovingAverage(priceHistory, index, fastWindow);
    const slow = simpleMovingAverage(priceHistory, index, slowWindow);
    return fast !== null && slow !== null && fast > slow ? 1 : 0;
  });
}

function momentumSignal(priceHistory, lookback) {
  return priceHistory.map((row, index) => {
    if (index < lookback) return 0;
    return row.price > priceHistory[index - lookback].price ? 1 : 0;
  });
}

function rsiReversionSignal(priceHistory, period, entryLevel, exitLevel) {
  let invested = 0;

  return priceHistory.map((_, index) => {
    const rsi = relativeStrengthIndex(priceHistory, index, period);
    if (rsi === null) return invested;
    if (invested === 0 && rsi < entryLevel) invested = 1;
    if (invested === 1 && rsi > exitLevel) invested = 0;
    return invested;
  });
}

function simpleMovingAverage(priceHistory, index, windowSize) {
  if (index + 1 < windowSize) return null;
  let sum = 0;
  for (let i = index - windowSize + 1; i <= index; i++) {
    sum += priceHistory[i].price;
  }
  return sum / windowSize;
}

function relativeStrengthIndex(priceHistory, index, period) {
  if (index < period) return null;

  let gains = 0;
  let losses = 0;
  for (let i = index - period + 1; i <= index; i++) {
    const change = priceHistory[i].price - priceHistory[i - 1].price;
    if (change >= 0) gains += change;
    else losses += Math.abs(change);
  }

  if (losses === 0) return 100;
  const rs = gains / losses;
  return 100 - 100 / (1 + rs);
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function roundMultiplier(value) {
  return Math.round(value * 100) / 100;
}

function mean(values) {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function standardDeviation(values) {
  if (values.length < 2) return 0;
  const avg = mean(values);
  const variance = values.reduce((sum, value) => sum + Math.pow(value - avg, 2), 0) / (values.length - 1);
  return Math.sqrt(variance);
}

function roundMoney(value) {
  return Math.round(value * 100) / 100;
}
