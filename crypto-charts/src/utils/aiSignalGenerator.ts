import { TradingSignal, MarketAnalysis, SignalStats } from '../types/signals';

export class AISignalGenerator {
  private static signals: TradingSignal[] = [];
  private static performanceHistory: { [signalId: string]: any } = {};
  
  // Technical Analysis Calculations
  static calculateRSI(prices: number[], period = 14): number {
    if (prices.length < period + 1) return 50;
    
    let gains = 0;
    let losses = 0;
    
    for (let i = prices.length - period; i < prices.length; i++) {
      const change = prices[i] - prices[i - 1];
      if (change > 0) gains += change;
      else losses += Math.abs(change);
    }
    
    const avgGain = gains / period;
    const avgLoss = losses / period;
    const rs = avgGain / (avgLoss || 0.01);
    
    return 100 - (100 / (1 + rs));
  }
  
  static calculateMACD(prices: number[]): { line: number; signal: number; histogram: number } {
    const ema12 = this.calculateEMA(prices, 12);
    const ema26 = this.calculateEMA(prices, 26);
    const macdLine = ema12 - ema26;
    const signalLine = this.calculateEMA([macdLine], 9);
    const histogram = macdLine - signalLine;
    
    return { line: macdLine, signal: signalLine, histogram };
  }
  
  static calculateEMA(prices: number[], period: number): number {
    if (prices.length === 0) return 0;
    const multiplier = 2 / (period + 1);
    let ema = prices[0];
    
    for (let i = 1; i < Math.min(prices.length, period * 2); i++) {
      ema = (prices[i] * multiplier) + (ema * (1 - multiplier));
    }
    
    return ema;
  }
  
  static calculateSMA(prices: number[], period: number): number {
    if (prices.length < period) return prices[prices.length - 1] || 0;
    const sum = prices.slice(-period).reduce((a, b) => a + b, 0);
    return sum / period;
  }
  
  static calculateBollingerBands(prices: number[], period = 20, stdDev = 2): { upper: number; middle: number; lower: number } {
    const sma = this.calculateSMA(prices, period);
    const variance = prices.slice(-period).reduce((sum, price) => sum + Math.pow(price - sma, 2), 0) / period;
    const standardDeviation = Math.sqrt(variance);
    
    return {
      upper: sma + (standardDeviation * stdDev),
      middle: sma,
      lower: sma - (standardDeviation * stdDev)
    };
  }
  
  static findSupportResistance(prices: number[], highs: number[], lows: number[]): { support: number[]; resistance: number[] } {
    const support: number[] = [];
    const resistance: number[] = [];
    const lookback = 10;
    
    // Find local minima for support
    for (let i = lookback; i < lows.length - lookback; i++) {
      let isSupport = true;
      for (let j = i - lookback; j <= i + lookback; j++) {
        if (j !== i && lows[j] < lows[i]) {
          isSupport = false;
          break;
        }
      }
      if (isSupport) support.push(lows[i]);
    }
    
    // Find local maxima for resistance
    for (let i = lookback; i < highs.length - lookback; i++) {
      let isResistance = true;
      for (let j = i - lookback; j <= i + lookback; j++) {
        if (j !== i && highs[j] > highs[i]) {
          isResistance = false;
          break;
        }
      }
      if (isResistance) resistance.push(highs[i]);
    }
    
    return { 
      support: support.slice(-3).sort((a, b) => b - a), 
      resistance: resistance.slice(-3).sort((a, b) => a - b) 
    };
  }
  
  // AI Signal Generation
  static generateSignal(symbol: string, marketData: any[]): TradingSignal {
    const prices = marketData.map(d => d.close);
    const highs = marketData.map(d => d.high);
    const lows = marketData.map(d => d.low);
    const volumes = marketData.map(d => d.volume);
    
    const currentPrice = prices[prices.length - 1];
    const rsi = this.calculateRSI(prices);
    const macd = this.calculateMACD(prices);
    const sma20 = this.calculateSMA(prices, 20);
    const sma50 = this.calculateSMA(prices, 50);
    const bollinger = this.calculateBollingerBands(prices);
    const { support, resistance } = this.findSupportResistance(prices, highs, lows);
    
    // Technical Analysis Scoring
    let technicalScore = 0;
    let signalType: 'buy' | 'sell' | 'hold' = 'hold';
    let aiReasons: string[] = [];
    
    // RSI Analysis
    if (rsi < 30) {
      technicalScore += 25;
      aiReasons.push(`RSI oversold at ${rsi.toFixed(1)} - potential reversal`);
    } else if (rsi > 70) {
      technicalScore -= 25;
      aiReasons.push(`RSI overbought at ${rsi.toFixed(1)} - potential correction`);
    }
    
    // MACD Analysis
    if (macd.histogram > 0 && macd.line > macd.signal) {
      technicalScore += 20;
      aiReasons.push('MACD showing bullish momentum');
    } else if (macd.histogram < 0 && macd.line < macd.signal) {
      technicalScore -= 20;
      aiReasons.push('MACD showing bearish momentum');
    }
    
    // Moving Average Analysis
    if (currentPrice > sma20 && sma20 > sma50) {
      technicalScore += 20;
      aiReasons.push('Price above key moving averages - uptrend confirmed');
    } else if (currentPrice < sma20 && sma20 < sma50) {
      technicalScore -= 20;
      aiReasons.push('Price below key moving averages - downtrend confirmed');
    }
    
    // Bollinger Bands Analysis
    if (currentPrice < bollinger.lower) {
      technicalScore += 15;
      aiReasons.push('Price near lower Bollinger Band - oversold condition');
    } else if (currentPrice > bollinger.upper) {
      technicalScore -= 15;
      aiReasons.push('Price near upper Bollinger Band - overbought condition');
    }
    
    // Support/Resistance Analysis
    const nearSupport = support.some(s => Math.abs(currentPrice - s) / currentPrice < 0.02);
    const nearResistance = resistance.some(r => Math.abs(currentPrice - r) / currentPrice < 0.02);
    
    if (nearSupport) {
      technicalScore += 10;
      aiReasons.push('Price approaching key support level');
    }
    if (nearResistance) {
      technicalScore -= 10;
      aiReasons.push('Price approaching key resistance level');
    }
    
    // Volume Analysis
    const avgVolume = volumes.slice(-20).reduce((a, b) => a + b, 0) / 20;
    const currentVolume = volumes[volumes.length - 1];
    if (currentVolume > avgVolume * 1.5) {
      technicalScore += 10;
      aiReasons.push('High volume confirms price movement');
    }
    
    // Determine signal type and strength
    if (technicalScore > 40) {
      signalType = 'buy';
    } else if (technicalScore < -40) {
      signalType = 'sell';
    }
    
    const strength = Math.abs(technicalScore) > 60 ? 'very_strong' :
                    Math.abs(technicalScore) > 40 ? 'strong' :
                    Math.abs(technicalScore) > 20 ? 'medium' : 'weak';
    
    // AI Confidence (simulated sophisticated ML model)
    const confidence = Math.min(95, Math.max(45, 50 + Math.abs(technicalScore) * 0.8 + Math.random() * 10));
    
    // Risk Management
    const volatility = this.calculateVolatility(prices.slice(-20));
    const stopLoss = signalType === 'buy' ? 
      currentPrice * (1 - volatility * 1.5) : 
      currentPrice * (1 + volatility * 1.5);
    
    const takeProfit = signalType === 'buy' ? 
      currentPrice * (1 + volatility * 3) : 
      currentPrice * (1 - volatility * 3);
    
    const riskReward = Math.abs(takeProfit - currentPrice) / Math.abs(stopLoss - currentPrice);
    
    // Create signal
    const signal: TradingSignal = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      symbol,
      type: signalType,
      strength,
      confidence: Math.round(confidence),
      price: currentPrice,
      timestamp: Date.now(),
      expiresAt: Date.now() + (24 * 60 * 60 * 1000), // 24 hours
      
      technicalScore,
      indicators: {
        rsi: { 
          value: rsi, 
          signal: rsi < 30 ? 'oversold' : rsi > 70 ? 'overbought' : 'neutral' 
        },
        macd: { 
          signal: macd.histogram > 0 ? 'bullish' : macd.histogram < 0 ? 'bearish' : 'neutral',
          histogram: macd.histogram
        },
        sma: { 
          trend: currentPrice > sma20 ? 'up' : currentPrice < sma20 ? 'down' : 'sideways',
          strength: Math.abs(currentPrice - sma20) / currentPrice * 100
        },
        volume: {
          trend: currentVolume > avgVolume * 1.2 ? 'increasing' : 
                 currentVolume < avgVolume * 0.8 ? 'decreasing' : 'normal'
        },
        support: support[0] || currentPrice * 0.95,
        resistance: resistance[0] || currentPrice * 1.05
      },
      
      aiScore: Math.round(technicalScore + Math.random() * 20 - 10),
      aiReasons,
      marketSentiment: technicalScore > 20 ? 'bullish' : technicalScore < -20 ? 'bearish' : 'neutral',
      
      predictions: {
        shortTerm: { 
          timeframe: '4h', 
          target: currentPrice * (1 + (technicalScore / 500)),
          probability: Math.max(60, confidence - 15)
        },
        mediumTerm: { 
          timeframe: '1w', 
          target: currentPrice * (1 + (technicalScore / 300)),
          probability: Math.max(55, confidence - 20)
        },
        longTerm: { 
          timeframe: '1m', 
          target: currentPrice * (1 + (technicalScore / 200)),
          probability: Math.max(50, confidence - 25)
        }
      },
      
      stopLoss,
      takeProfit,
      riskReward: Math.round(riskReward * 100) / 100,
      
      accuracy: this.getHistoricalAccuracy(symbol),
      tags: this.generateTags(rsi, macd, technicalScore),
      notes: aiReasons.length > 2 ? 'Multiple technical confluences detected' : undefined
    };
    
    this.signals.unshift(signal);
    if (this.signals.length > 100) {
      this.signals = this.signals.slice(0, 100);
    }
    
    return signal;
  }
  
  static calculateVolatility(prices: number[]): number {
    if (prices.length < 2) return 0.02;
    
    const returns = [];
    for (let i = 1; i < prices.length; i++) {
      returns.push((prices[i] - prices[i-1]) / prices[i-1]);
    }
    
    const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
    const variance = returns.reduce((sum, ret) => sum + Math.pow(ret - mean, 2), 0) / returns.length;
    
    return Math.sqrt(variance);
  }
  
  static getHistoricalAccuracy(symbol: string): number {
    // Simulate historical performance
    const baseAccuracy = { 'BTCUSD': 72, 'ETHUSD': 68, 'XRPUSD': 65 };
    return baseAccuracy[symbol as keyof typeof baseAccuracy] || 70;
  }
  
  static generateTags(rsi: number, macd: any, score: number): string[] {
    const tags = [];
    
    if (rsi < 30) tags.push('Oversold');
    if (rsi > 70) tags.push('Overbought');
    if (macd.histogram > 0) tags.push('MACD Bullish');
    if (macd.histogram < 0) tags.push('MACD Bearish');
    if (Math.abs(score) > 50) tags.push('High Conviction');
    if (Math.abs(score) < 30) tags.push('Low Conviction');
    
    return tags;
  }
  
  // Signal Management
  static getSignals(symbol?: string, limit = 20): TradingSignal[] {
    let filteredSignals = this.signals;
    
    if (symbol) {
      filteredSignals = this.signals.filter(s => s.symbol === symbol);
    }
    
    // Remove expired signals
    const now = Date.now();
    filteredSignals = filteredSignals.filter(s => !s.expiresAt || s.expiresAt > now);
    
    return filteredSignals.slice(0, limit);
  }
  
  static getSignalStats(): SignalStats {
    const now = Date.now();
    const oneDayAgo = now - (24 * 60 * 60 * 1000);
    const oneWeekAgo = now - (7 * 24 * 60 * 60 * 1000);
    
    const activeSignals = this.signals.filter(s => !s.expiresAt || s.expiresAt > now);
    const signalsToday = this.signals.filter(s => s.timestamp >= oneDayAgo);
    const signalsThisWeek = this.signals.filter(s => s.timestamp >= oneWeekAgo);
    
    return {
      totalSignals: this.signals.length,
      activeSignals: activeSignals.length,
      accuracy: 72.5, // Simulated
      averageReturn: 8.3, // Simulated
      winRate: 68.2, // Simulated  
      bestPerformer: 'BTCUSD',
      worstPerformer: 'XRPUSD',
      totalProfit: 15420, // Simulated
      signalsToday: signalsToday.length,
      signalsThisWeek: signalsThisWeek.length
    };
  }
  
  // Auto-generate signals for all symbols
  static generateSignalsForMarket(marketData: { [symbol: string]: any[] }): void {
    Object.keys(marketData).forEach(symbol => {
      if (marketData[symbol].length > 50) {
        // Generate signal every 30 minutes to 2 hours
        const lastSignal = this.signals.find(s => s.symbol === symbol);
        const timeSinceLastSignal = lastSignal ? Date.now() - lastSignal.timestamp : Infinity;
        
        if (timeSinceLastSignal > (30 * 60 * 1000) + Math.random() * (90 * 60 * 1000)) {
          this.generateSignal(symbol, marketData[symbol]);
        }
      }
    });
  }
}