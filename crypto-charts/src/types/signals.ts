export interface TradingSignal {
  id: string;
  symbol: string;
  type: 'buy' | 'sell' | 'hold';
  strength: 'weak' | 'medium' | 'strong' | 'very_strong';
  confidence: number; // 0-100
  price: number;
  timestamp: number;
  expiresAt?: number;
  
  // Technical Analysis
  technicalScore: number;
  indicators: {
    rsi: { value: number; signal: 'oversold' | 'overbought' | 'neutral' };
    macd: { signal: 'bullish' | 'bearish' | 'neutral'; histogram: number };
    sma: { trend: 'up' | 'down' | 'sideways'; strength: number };
    volume: { trend: 'increasing' | 'decreasing' | 'normal' };
    support: number;
    resistance: number;
  };
  
  // AI Analysis
  aiScore: number;
  aiReasons: string[];
  marketSentiment: 'bullish' | 'bearish' | 'neutral';
  
  // Price Predictions
  predictions: {
    shortTerm: { timeframe: '1h' | '4h' | '1d'; target: number; probability: number };
    mediumTerm: { timeframe: '3d' | '1w'; target: number; probability: number };
    longTerm: { timeframe: '1m' | '3m'; target: number; probability: number };
  };
  
  // Risk Management
  stopLoss?: number;
  takeProfit?: number;
  riskReward: number;
  
  // Metadata
  accuracy?: number; // Historical accuracy of similar signals
  tags: string[];
  notes?: string;
}

export interface SignalPerformance {
  signalId: string;
  symbol: string;
  type: 'buy' | 'sell';
  entryPrice: number;
  currentPrice: number;
  highestPrice: number;
  lowestPrice: number;
  unrealizedPnL: number;
  unrealizedPnLPercent: number;
  status: 'active' | 'hit_tp' | 'hit_sl' | 'expired';
  duration: number; // milliseconds
}

export interface SignalStats {
  totalSignals: number;
  activeSignals: number;
  accuracy: number;
  averageReturn: number;
  winRate: number;
  bestPerformer: string;
  worstPerformer: string;
  totalProfit: number;
  signalsToday: number;
  signalsThisWeek: number;
}

export interface MarketAnalysis {
  symbol: string;
  timestamp: number;
  
  // Market Data
  price: number;
  volume24h: number;
  marketCap?: number;
  
  // Technical Indicators
  rsi: number;
  macd: { line: number; signal: number; histogram: number };
  sma20: number;
  sma50: number;
  sma200: number;
  bollinger: { upper: number; middle: number; lower: number };
  
  // Volatility & Momentum
  volatility: number;
  momentum: number;
  
  // Support & Resistance
  supportLevels: number[];
  resistanceLevels: number[];
  
  // Market Sentiment
  fearGreedIndex?: number;
  socialSentiment?: 'bullish' | 'bearish' | 'neutral';
  newsImpact?: 'positive' | 'negative' | 'neutral';
}

export interface AIModel {
  name: string;
  version: string;
  accuracy: number;
  lastUpdated: number;
  description: string;
  features: string[];
}

export interface SignalAlert {
  id: string;
  signalId: string;
  type: 'new_signal' | 'price_target' | 'stop_loss' | 'take_profit';
  message: string;
  timestamp: number;
  isRead: boolean;
  priority: 'low' | 'medium' | 'high' | 'urgent';
}