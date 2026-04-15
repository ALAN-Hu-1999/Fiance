import MLR from 'ml-regression-multivariate-linear';
import ff5Data from '../data/ff5_daily.json';

// Simple CORS proxy to bypass browser restrictions
const CORS_PROXY = 'https://corsproxy.io/?';

/**
 * Fetches historical daily stock prices from Yahoo Finance.
 * @param {string} ticker Stock ticker symbol
 * @param {string} period1 Start timestamp (seconds)
 * @param {string} period2 End timestamp (seconds)
 */
async function fetchYahooFinanceData(ticker, period1, period2) {
  const url = `https://query2.finance.yahoo.com/v8/finance/chart/${ticker}?period1=${period1}&period2=${period2}&interval=1d&events=history`;
  const response = await fetch(CORS_PROXY + encodeURIComponent(url));
  
  if (!response.ok) {
    throw new Error(`Failed to fetch data for ${ticker}`);
  }

  const data = await response.json();
  if (!data.chart.result || data.chart.result.length === 0) {
    throw new Error(`No data found for ${ticker}`);
  }

  const result = data.chart.result[0];
  const timestamps = result.timestamp;
  const adjCloses = result.indicators.adjclose[0].adjclose;

  if (!timestamps || !adjCloses) {
    throw new Error(`Incomplete data for ${ticker}`);
  }

  const history = [];
  for (let i = 0; i < timestamps.length; i++) {
    if (adjCloses[i] !== null && adjCloses[i] !== undefined) {
      const date = new Date(timestamps[i] * 1000);
      const dateStr = date.toISOString().split('T')[0];
      history.push({ date: dateStr, price: adjCloses[i] });
    }
  }

  return history;
}

/**
 * Aligns Fama-French data with stock price data and calculates daily excess returns.
 */
function alignAndCalculateReturns(stockHistory, ffData) {
  // Convert stock history into a map for easy lookup
  const stockMap = new Map();
  stockHistory.forEach((item, index) => {
    stockMap.set(item.date, { price: item.price, index });
  });

  const alignedData = [];

  for (let i = 1; i < stockHistory.length; i++) {
    const today = stockHistory[i];
    const yesterday = stockHistory[i - 1];

    const todayFF = ffData.find(ff => ff.date === today.date);
    if (!todayFF) continue; // Skip if no Fama-French data for this date

    const stockReturn = (today.price - yesterday.price) / yesterday.price;
    const excessReturn = stockReturn - todayFF.RF;

    alignedData.push({
      date: today.date,
      excessReturn,
      Mkt_RF: todayFF['Mkt-RF'],
      SMB: todayFF.SMB,
      HML: todayFF.HML,
      RMW: todayFF.RMW,
      CMA: todayFF.CMA,
    });
  }

  return alignedData;
}

/**
 * Calculates R-Squared for the regression model
 */
function calculateRSquared(actualY, predictedY) {
  const meanY = actualY.reduce((a, b) => a + b, 0) / actualY.length;
  let ssTotal = 0;
  let ssResidual = 0;

  for (let i = 0; i < actualY.length; i++) {
    ssTotal += Math.pow(actualY[i] - meanY, 2);
    ssResidual += Math.pow(actualY[i] - predictedY[i], 2);
  }

  return ssTotal === 0 ? 0 : 1 - (ssResidual / ssTotal);
}

/**
 * Main function to perform Fama-French 5-Factor regression for a ticker.
 */
export async function calculateFF5(ticker) {
  // We use the first and last dates of our local Fama-French dataset
  if (!ff5Data || ff5Data.length === 0) {
    throw new Error('Local Fama-French dataset is empty.');
  }

  const startDateStr = ff5Data[0].date;
  const endDateStr = ff5Data[ff5Data.length - 1].date;

  const startStamp = Math.floor(new Date(startDateStr).getTime() / 1000);
  const endStamp = Math.floor(new Date(endDateStr).getTime() / 1000) + 86400; // Add a day to include the last date

  const stockHistory = await fetchYahooFinanceData(ticker, startStamp, endStamp);
  const alignedData = alignAndCalculateReturns(stockHistory, ff5Data);

  if (alignedData.length < 30) {
    throw new Error('Not enough overlapping historical data to perform a reliable regression (need at least 30 days).');
  }

  const X = [];
  const Y = [];

  for (const row of alignedData) {
    X.push([row.Mkt_RF, row.SMB, row.HML, row.RMW, row.CMA]);
    Y.push([row.excessReturn]);
  }

  // Perform Multivariate Linear Regression
  const mlr = new MLR(X, Y);
  const weights = mlr.weights; // weights array: [intercept, b1, b2, b3, b4, b5]

  // Calculate R-Squared
  const predictedY = mlr.predict(X).map(p => p[0]);
  const actualY = Y.map(y => y[0]);
  const rSquared = calculateRSquared(actualY, predictedY);

  // Annualize Alpha (Assuming 252 trading days)
  const dailyAlpha = weights[0][0];
  const annualizedAlpha = (Math.pow(1 + dailyAlpha, 252) - 1);

  return {
    alpha: annualizedAlpha,
    factors: {
      market: weights[1][0],
      smb: weights[2][0],
      hml: weights[3][0],
      rmw: weights[4][0],
      cma: weights[5][0],
    },
    r_squared: rSquared,
    data_period: `${alignedData[0].date} to ${alignedData[alignedData.length - 1].date}`,
    observations: alignedData.length
  };
}