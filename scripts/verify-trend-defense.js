import { buildTrendDefenseSignals, fetchHistoricalPrices, runStrategyBacktests } from "../src/utils/strategyBacktest.js";

const monthlyCloses = [
  100, 102, 104, 106, 108, 110, 112, 114, 116, 118, 120, 122,
  104, 88, 82, 80, 118, 126, 132, 136,
];

const history = [];
let previousClose = monthlyCloses[0];
monthlyCloses.forEach((close, monthIndex) => {
  for (let day = 1; day <= 20; day++) {
    const date = new Date(Date.UTC(2024, monthIndex, day));
    const progress = day / 20;
    history.push({
      date: date.toISOString().slice(0, 10),
      price: previousClose + (close - previousClose) * progress,
    });
  }
  previousClose = close;
});

const options = {
  defensiveCorePct: 80,
  trendMonths: 10,
  drawdownTriggerPct: 10,
  recurringFrequency: "none",
  altCashAsset: "cash",
};

const signals = buildTrendDefenseSignals(history, options);
const uniqueWeights = [...new Set(signals.map((value) => Number(value.toFixed(4))))];

if (!uniqueWeights.includes(0.9) || !uniqueWeights.includes(0.8) || signals.at(-1) !== 1) {
  throw new Error(`Unexpected trend-defense weights: ${uniqueWeights.join(", ")}`);
}

const [buyHold, defense] = runStrategyBacktests(
  history,
  ["buy_hold", "trend_defense_80_20"],
  10000,
  options,
);

if (defense.maxDrawdown <= buyHold.maxDrawdown) {
  throw new Error(`Defense drawdown ${defense.maxDrawdown} did not improve on ${buyHold.maxDrawdown}`);
}

console.log(JSON.stringify({
  uniqueWeights,
  buyHoldMaxDrawdown: buyHold.maxDrawdown,
  defenseMaxDrawdown: defense.maxDrawdown,
  recoveredWeight: signals.at(-1),
}, null, 2));

if (process.argv.includes("--live")) {
  const tickerArg = process.argv.find((arg) => arg.startsWith("--ticker="));
  const startArg = process.argv.find((arg) => arg.startsWith("--start="));
  const liveTicker = tickerArg ? tickerArg.slice("--ticker=".length) : "QQC.TO";
  const liveStart = startArg ? startArg.slice("--start=".length) : "2021-05-27";
  const liveHistory = await fetchHistoricalPrices(liveTicker, liveStart);
  const [liveBuyHold, liveDefense, liveSmartDca, liveSmartDefense] = runStrategyBacktests(
    liveHistory,
    ["buy_hold", "trend_defense_80_20", "smart_dca_36m", "smart_dca_trend_defense"],
    0,
    {
      ...options,
      recurringAmount: 100,
      recurringFrequency: "weekly",
      expenseRatio: 0.21,
    },
  );

  console.log(JSON.stringify({
    liveTicker,
    liveStart,
    liveObservations: liveHistory.length,
    buyHoldFinalValue: liveBuyHold.finalValue,
    defenseFinalValue: liveDefense.finalValue,
    smartDcaFinalValue: liveSmartDca.finalValue,
    smartDefenseFinalValue: liveSmartDefense.finalValue,
    buyHoldMaxDrawdown: liveBuyHold.maxDrawdown,
    defenseMaxDrawdown: liveDefense.maxDrawdown,
    smartDcaMaxDrawdown: liveSmartDca.maxDrawdown,
    smartDefenseMaxDrawdown: liveSmartDefense.maxDrawdown,
  }, null, 2));
}
