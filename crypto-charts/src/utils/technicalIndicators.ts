interface CandleData {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
}

export interface IndicatorData {
  time: number;
  value: number;
}

export interface MACDData {
  time: number;
  macd: number;
  signal: number;
  histogram: number;
}

export interface BollingerBandData {
  time: number;
  upper: number;
  middle: number;
  lower: number;
}

// Simple Moving Average
function calculateSMA(data: number[], period: number): number[] {
  const sma: number[] = [];
  for (let i = period - 1; i < data.length; i++) {
    const sum = data.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0);
    sma.push(sum / period);
  }
  return sma;
}

// Exponential Moving Average
function calculateEMA(data: number[], period: number): number[] {
  const ema: number[] = [];
  const multiplier = 2 / (period + 1);
  
  // First EMA is just SMA
  const firstSMA = data.slice(0, period).reduce((a, b) => a + b, 0) / period;
  ema.push(firstSMA);
  
  for (let i = period; i < data.length; i++) {
    const currentEMA = (data[i] - ema[ema.length - 1]) * multiplier + ema[ema.length - 1];
    ema.push(currentEMA);
  }
  
  return ema;
}

// RSI (Relative Strength Index)
export function calculateRSI(candles: CandleData[], period: number = 14): IndicatorData[] {
  if (candles.length < period + 1) return [];
  
  const prices = candles.map(c => c.close);
  const changes: number[] = [];
  
  for (let i = 1; i < prices.length; i++) {
    changes.push(prices[i] - prices[i - 1]);
  }
  
  const gains = changes.map(change => change > 0 ? change : 0);
  const losses = changes.map(change => change < 0 ? Math.abs(change) : 0);
  
  let avgGain = gains.slice(0, period).reduce((a, b) => a + b, 0) / period;
  let avgLoss = losses.slice(0, period).reduce((a, b) => a + b, 0) / period;
  
  const rsi: IndicatorData[] = [];
  
  for (let i = period; i < changes.length; i++) {
    if (avgLoss === 0) {
      rsi.push({ time: candles[i + 1].time, value: 100 });
    } else {
      const rs = avgGain / avgLoss;
      const rsiValue = 100 - (100 / (1 + rs));
      rsi.push({ time: candles[i + 1].time, value: rsiValue });
    }
    
    // Update averages for next iteration
    avgGain = (avgGain * (period - 1) + gains[i]) / period;
    avgLoss = (avgLoss * (period - 1) + losses[i]) / period;
  }
  
  return rsi;
}

// MACD (Moving Average Convergence Divergence)
export function calculateMACD(candles: CandleData[], fastPeriod: number = 12, slowPeriod: number = 26, signalPeriod: number = 9): MACDData[] {
  if (candles.length < slowPeriod + signalPeriod) return [];
  
  const prices = candles.map(c => c.close);
  const fastEMA = calculateEMA(prices, fastPeriod);
  const slowEMA = calculateEMA(prices, slowPeriod);
  
  const macdLine: number[] = [];
  const startIndex = slowPeriod - fastPeriod;
  
  for (let i = 0; i < slowEMA.length; i++) {
    macdLine.push(fastEMA[i + startIndex] - slowEMA[i]);
  }
  
  const signalLine = calculateEMA(macdLine, signalPeriod);
  const histogram: number[] = [];
  
  for (let i = 0; i < signalLine.length; i++) {
    histogram.push(macdLine[i + signalPeriod - 1] - signalLine[i]);
  }
  
  const result: MACDData[] = [];
  const dataStartIndex = slowPeriod + signalPeriod - 2;
  
  for (let i = 0; i < histogram.length && dataStartIndex + i < candles.length; i++) {
    result.push({
      time: candles[dataStartIndex + i].time,
      macd: macdLine[i + signalPeriod - 1],
      signal: signalLine[i],
      histogram: histogram[i]
    });
  }
  
  return result;
}

// Bollinger Bands
export function calculateBollingerBands(candles: CandleData[], period: number = 20, deviation: number = 2): BollingerBandData[] {
  if (candles.length < period) return [];
  
  const prices = candles.map(c => c.close);
  const sma = calculateSMA(prices, period);
  const result: BollingerBandData[] = [];
  
  for (let i = 0; i < sma.length; i++) {
    const dataIndex = i + period - 1;
    const priceSlice = prices.slice(i, i + period);
    const mean = sma[i];
    
    // Calculate standard deviation
    const variance = priceSlice.reduce((sum, price) => sum + Math.pow(price - mean, 2), 0) / period;
    const standardDeviation = Math.sqrt(variance);
    
    result.push({
      time: candles[dataIndex].time,
      upper: mean + (deviation * standardDeviation),
      middle: mean,
      lower: mean - (deviation * standardDeviation)
    });
  }
  
  return result;
}