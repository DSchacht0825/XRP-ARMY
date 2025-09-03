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
  
  // XRP-Specific AI Signal Generation
  static generateSignal(symbol: string = 'XRPUSD', marketData: any[]): TradingSignal {
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
    
    // XRP-Specific Technical Analysis Scoring
    let technicalScore = 0;
    let signalType: 'buy' | 'sell' | 'hold' = 'hold';
    
    // XRP behaves differently from other crypto - more institutional patterns
    const xrpVolatilityFactor = this.calculateVolatility(prices) * 1.2;
    let aiReasons: string[] = [];
    
    // XRP-Specific RSI Analysis (adjusted for XRP's behavior)
    if (rsi < 25) {
      technicalScore += 30;
      signalType = 'buy';
      aiReasons.push(`🚨 XRP severely oversold (RSI: ${rsi.toFixed(1)}) - XRP Army accumulation zone!`);
    } else if (rsi < 35) {
      technicalScore += 20;
      aiReasons.push(`📉 XRP oversold conditions - potential moon mission loading...`);
    } else if (rsi > 75) {
      technicalScore -= 30;
      signalType = 'sell';
      aiReasons.push(`🔥 XRP overbought (RSI: ${rsi.toFixed(1)}) - profit-taking expected by whales`);
    } else if (rsi > 65) {
      technicalScore -= 15;
      aiReasons.push(`⚠️ XRP approaching overbought - watch for whale resistance`);
    }
    
    // XRP-Focused MACD Analysis
    if (macd.histogram > 0.001 && macd.line > macd.signal) {
      technicalScore += 25;
      aiReasons.push('🚀 XRP MACD bullish crossover - momentum building for XRP Army rally');
    } else if (macd.histogram < -0.001 && macd.line < macd.signal) {
      technicalScore -= 25;
      aiReasons.push('📊 XRP MACD bearish divergence - institutional selling pressure');
    }
    
    // XRP Institutional Moving Average Analysis
    const priceAboveSMA20 = currentPrice > sma20;
    const sma20AboveSMA50 = sma20 > sma50;
    
    if (priceAboveSMA20 && sma20AboveSMA50) {
      technicalScore += 30;
      aiReasons.push('🏛️ XRP in bullish alignment - institutional flow positive, XRP Army strong');
    } else if (!priceAboveSMA20 && !sma20AboveSMA50) {
      technicalScore -= 30;
      aiReasons.push('📉 XRP below key averages - bearish institutional sentiment');
    } else if (priceAboveSMA20) {
      technicalScore += 15;
      aiReasons.push('💪 XRP holding above 20-MA - short-term XRP Army strength');
    }
    
    // XRP-Specific Bollinger Bands (tighter thresholds for XRP volatility)
    if (currentPrice <= bollinger.lower * 1.005) {
      technicalScore += 20;
      aiReasons.push('🎯 XRP at lower Bollinger Band - historically strong XRP Army bounce zone');
    } else if (currentPrice >= bollinger.upper * 0.995) {
      technicalScore -= 20;
      aiReasons.push('🛑 XRP at upper Bollinger Band - whale profit-taking resistance');
    }
    
    // XRP Key Psychological Levels
    const xrpKeyLevels = [1.50, 2.00, 2.50, 3.00, 3.50, 4.00, 5.00];
    const nearKeyLevel = xrpKeyLevels.find(level => Math.abs(currentPrice - level) / currentPrice < 0.03);
    
    if (nearKeyLevel) {
      if (currentPrice > nearKeyLevel * 0.98) {
        technicalScore -= 15;
        aiReasons.push(`🎯 XRP approaching major resistance at $${nearKeyLevel.toFixed(2)} - whale selling wall expected`);
      } else if (currentPrice < nearKeyLevel * 1.02) {
        technicalScore += 15;
        aiReasons.push(`💎 XRP near key support at $${nearKeyLevel.toFixed(2)} - strong hands accumulating`);
      }
    }
    
    // Dynamic Support/Resistance
    const nearSupport = support.some(s => Math.abs(currentPrice - s) / currentPrice < 0.015);
    const nearResistance = resistance.some(r => Math.abs(currentPrice - r) / currentPrice < 0.015);
    
    if (nearSupport) {
      technicalScore += 18;
      aiReasons.push('💪 XRP testing dynamic support - XRP Army holding strong');
    }
    if (nearResistance) {
      technicalScore -= 18;
      aiReasons.push('🛑 XRP facing dynamic resistance - institutional profit-taking detected');
    }
    
    // XRP Volume Analysis (institutional vs retail flow)
    const avgVolume = volumes.slice(-20).reduce((a, b) => a + b, 0) / 20;
    const currentVolume = volumes[volumes.length - 1];
    
    if (currentVolume > avgVolume * 2) {
      technicalScore += 15;
      aiReasons.push('🐋 Massive XRP volume spike - whales are moving, XRP Army pay attention!');
    } else if (currentVolume > avgVolume * 1.5) {
      technicalScore += 8;
      aiReasons.push('📈 High XRP volume confirms price movement - institutional activity detected');
    } else if (currentVolume < avgVolume * 0.7) {
      technicalScore -= 5;
      aiReasons.push('😴 Low XRP volume - market waiting for catalyst');
    }
    
    // XRP-Specific Signal Determination with XRP Army messaging
    if (technicalScore > 25) {
      signalType = 'buy';
      if (technicalScore > 70) {
        aiReasons.push('🚀 MEGA BULLISH: All systems GO for XRP moon mission! XRP Army unite!');
      } else if (technicalScore > 50) {
        aiReasons.push('🚀 STRONG BUY: XRP showing massive strength, XRP Army accumulating!');
      } else {
        aiReasons.push('📈 BUY SIGNAL: XRP technical setup favorable, XRP Army holding strong');
      }
    } else if (technicalScore < -25) {
      signalType = 'sell';
      if (technicalScore < -70) {
        aiReasons.push('🛑 MEGA BEARISH: XRP facing serious headwinds, XRP Army be very cautious!');
      } else if (technicalScore < -50) {
        aiReasons.push('🛑 STRONG SELL: XRP under heavy pressure, consider profit-taking');
      } else {
        aiReasons.push('📉 SELL SIGNAL: XRP showing weakness, XRP Army reduce exposure');
      }
    } else {
      signalType = 'hold';
      aiReasons.push('🏛️ HOLD: XRP consolidating, XRP Army stay patient for next move');
    }
    
    const strength = Math.abs(technicalScore) > 70 ? 'very_strong' :
                    Math.abs(technicalScore) > 50 ? 'strong' :
                    Math.abs(technicalScore) > 30 ? 'medium' : 'weak';
    
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
      xrpArmySentiment: this.getXRPArmySentiment(technicalScore, signalType),
      
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
  
  // XRP Army Sentiment Analysis
  static getXRPArmySentiment(technicalScore: number, signalType: 'buy' | 'sell' | 'hold'): string {
    if (technicalScore > 70) {
      return '🚀🚀🚀 XRP ARMY MEGA BULLISH - MOON MISSION CONFIRMED! 🚀🚀🚀';
    } else if (technicalScore > 50) {
      return '🚀 XRP Army very bullish - diamond hands accumulating! 💎';
    } else if (technicalScore > 25) {
      return '📈 XRP Army bullish - hodlers stay strong! 💪';
    } else if (technicalScore < -70) {
      return '😱 XRP Army major concern - whales dumping hard! 🐋';
    } else if (technicalScore < -50) {
      return '⚠️ XRP Army bearish - weak hands being shaken out';
    } else if (technicalScore < -25) {
      return '📉 XRP Army cautious - waiting for better entry';
    } else {
      return '🏛️ XRP Army neutral - patience is key, hodl mode activated';
    }
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
  // XRP-Only Signal Generation
  static generateSignalsForMarket(marketData: { [symbol: string]: any[] }): void {
    // Focus exclusively on XRP - the only symbol that matters to XRP Army!
    if (marketData['XRPUSD'] && marketData['XRPUSD'].length > 50) {
      const lastSignal = this.signals.find(s => s.symbol === 'XRPUSD');
      const timeSinceLastSignal = lastSignal ? Date.now() - lastSignal.timestamp : Infinity;
      
      // Generate XRP signals every 15-60 minutes for more frequent analysis
      if (timeSinceLastSignal > (15 * 60 * 1000) + Math.random() * (45 * 60 * 1000)) {
        console.log('🤖 Generating new XRP Army AI signal...');
        this.generateSignal('XRPUSD', marketData['XRPUSD']);
      }
    }
  }
}