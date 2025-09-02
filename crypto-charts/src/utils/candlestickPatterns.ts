interface CandleData {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
}

export interface PatternResult {
  time: number;
  pattern: string;
  type: 'bullish' | 'bearish';
  confidence: number; // 0-100
  description: string;
}

// Helper functions for pattern analysis
const getCandleBody = (candle: CandleData): number => Math.abs(candle.close - candle.open);
const getUpperShadow = (candle: CandleData): number => candle.high - Math.max(candle.open, candle.close);
const getLowerShadow = (candle: CandleData): number => Math.min(candle.open, candle.close) - candle.low;
const getCandleRange = (candle: CandleData): number => candle.high - candle.low;
const isBullish = (candle: CandleData): boolean => candle.close > candle.open;
const isBearish = (candle: CandleData): boolean => candle.close < candle.open;
const isDoji = (candle: CandleData): boolean => {
  const bodySize = getCandleBody(candle);
  const range = getCandleRange(candle);
  return bodySize <= range * 0.1; // Body is less than 10% of total range
};

// Bullish Engulfing Pattern
export function detectBullishEngulfing(candles: CandleData[]): PatternResult[] {
  const patterns: PatternResult[] = [];
  
  for (let i = 1; i < candles.length; i++) {
    const prev = candles[i - 1];
    const curr = candles[i];
    
    // Previous candle must be bearish
    if (!isBearish(prev)) continue;
    
    // Current candle must be bullish
    if (!isBullish(curr)) continue;
    
    // Current candle must engulf previous candle
    const engulfs = curr.open <= prev.close && curr.close >= prev.open;
    
    if (engulfs) {
      const prevBody = getCandleBody(prev);
      const currBody = getCandleBody(curr);
      const engulfmentRatio = currBody / prevBody;
      
      // Calculate confidence based on engulfment ratio and volume
      let confidence = Math.min(90, 50 + (engulfmentRatio - 1) * 20);
      
      patterns.push({
        time: curr.time,
        pattern: 'Bullish Engulfing',
        type: 'bullish',
        confidence: Math.round(confidence),
        description: 'Bullish reversal pattern where a large bullish candle engulfs the previous bearish candle'
      });
    }
  }
  
  return patterns;
}

// Bearish Engulfing Pattern
export function detectBearishEngulfing(candles: CandleData[]): PatternResult[] {
  const patterns: PatternResult[] = [];
  
  for (let i = 1; i < candles.length; i++) {
    const prev = candles[i - 1];
    const curr = candles[i];
    
    // Previous candle must be bullish
    if (!isBullish(prev)) continue;
    
    // Current candle must be bearish
    if (!isBearish(curr)) continue;
    
    // Current candle must engulf previous candle
    const engulfs = curr.open >= prev.close && curr.close <= prev.open;
    
    if (engulfs) {
      const prevBody = getCandleBody(prev);
      const currBody = getCandleBody(curr);
      const engulfmentRatio = currBody / prevBody;
      
      let confidence = Math.min(90, 50 + (engulfmentRatio - 1) * 20);
      
      patterns.push({
        time: curr.time,
        pattern: 'Bearish Engulfing',
        type: 'bearish',
        confidence: Math.round(confidence),
        description: 'Bearish reversal pattern where a large bearish candle engulfs the previous bullish candle'
      });
    }
  }
  
  return patterns;
}

// Doji Pattern
export function detectDoji(candles: CandleData[]): PatternResult[] {
  const patterns: PatternResult[] = [];
  
  for (const candle of candles) {
    if (isDoji(candle)) {
      const range = getCandleRange(candle);
      const upperShadow = getUpperShadow(candle);
      const lowerShadow = getLowerShadow(candle);
      
      let dojiType = 'Doji';
      let confidence = 70;
      
      // Determine specific doji type
      if (upperShadow > range * 0.6 && lowerShadow < range * 0.1) {
        dojiType = 'Dragonfly Doji';
        confidence = 80;
      } else if (lowerShadow > range * 0.6 && upperShadow < range * 0.1) {
        dojiType = 'Gravestone Doji';
        confidence = 80;
      } else if (upperShadow > range * 0.3 && lowerShadow > range * 0.3) {
        dojiType = 'Long-Legged Doji';
        confidence = 75;
      }
      
      patterns.push({
        time: candle.time,
        pattern: dojiType,
        type: dojiType.includes('Dragonfly') ? 'bullish' : dojiType.includes('Gravestone') ? 'bearish' : 'bullish',
        confidence,
        description: `${dojiType} - Indecision pattern that may signal trend reversal`
      });
    }
  }
  
  return patterns;
}

// Hammer Pattern
export function detectHammer(candles: CandleData[]): PatternResult[] {
  const patterns: PatternResult[] = [];
  
  for (const candle of candles) {
    const body = getCandleBody(candle);
    const range = getCandleRange(candle);
    const upperShadow = getUpperShadow(candle);
    const lowerShadow = getLowerShadow(candle);
    
    // Hammer criteria
    const hasSmallBody = body <= range * 0.3;
    const hasLongLowerShadow = lowerShadow >= range * 0.6;
    const hasShortUpperShadow = upperShadow <= range * 0.1;
    
    if (hasSmallBody && hasLongLowerShadow && hasShortUpperShadow) {
      let confidence = 75;
      
      // Higher confidence if it's a bullish hammer at the bottom of a trend
      if (isBullish(candle)) {
        confidence += 10;
      }
      
      patterns.push({
        time: candle.time,
        pattern: 'Hammer',
        type: 'bullish',
        confidence,
        description: 'Bullish reversal pattern with small body and long lower shadow'
      });
    }
  }
  
  return patterns;
}

// Shooting Star Pattern
export function detectShootingStar(candles: CandleData[]): PatternResult[] {
  const patterns: PatternResult[] = [];
  
  for (const candle of candles) {
    const body = getCandleBody(candle);
    const range = getCandleRange(candle);
    const upperShadow = getUpperShadow(candle);
    const lowerShadow = getLowerShadow(candle);
    
    // Shooting star criteria
    const hasSmallBody = body <= range * 0.3;
    const hasLongUpperShadow = upperShadow >= range * 0.6;
    const hasShortLowerShadow = lowerShadow <= range * 0.1;
    
    if (hasSmallBody && hasLongUpperShadow && hasShortLowerShadow) {
      let confidence = 75;
      
      // Higher confidence if it's a bearish shooting star at the top of a trend
      if (isBearish(candle)) {
        confidence += 10;
      }
      
      patterns.push({
        time: candle.time,
        pattern: 'Shooting Star',
        type: 'bearish',
        confidence,
        description: 'Bearish reversal pattern with small body and long upper shadow'
      });
    }
  }
  
  return patterns;
}

// Morning Star Pattern (3-candle pattern)
export function detectMorningStar(candles: CandleData[]): PatternResult[] {
  const patterns: PatternResult[] = [];
  
  for (let i = 2; i < candles.length; i++) {
    const first = candles[i - 2];
    const second = candles[i - 1];
    const third = candles[i];
    
    // First candle: Large bearish
    const firstIsBearish = isBearish(first);
    const firstBody = getCandleBody(first);
    
    // Second candle: Small body (star)
    const secondBody = getCandleBody(second);
    const secondIsStar = secondBody < firstBody * 0.5;
    
    // Third candle: Large bullish
    const thirdIsBullish = isBullish(third);
    const thirdBody = getCandleBody(third);
    
    if (firstIsBearish && secondIsStar && thirdIsBullish && thirdBody > firstBody * 0.6) {
      const confidence = 85;
      
      patterns.push({
        time: third.time,
        pattern: 'Morning Star',
        type: 'bullish',
        confidence,
        description: 'Strong bullish reversal pattern consisting of three candles'
      });
    }
  }
  
  return patterns;
}

// Evening Star Pattern (3-candle pattern)
export function detectEveningStar(candles: CandleData[]): PatternResult[] {
  const patterns: PatternResult[] = [];
  
  for (let i = 2; i < candles.length; i++) {
    const first = candles[i - 2];
    const second = candles[i - 1];
    const third = candles[i];
    
    // First candle: Large bullish
    const firstIsBullish = isBullish(first);
    const firstBody = getCandleBody(first);
    
    // Second candle: Small body (star)
    const secondBody = getCandleBody(second);
    const secondIsStar = secondBody < firstBody * 0.5;
    
    // Third candle: Large bearish
    const thirdIsBearish = isBearish(third);
    const thirdBody = getCandleBody(third);
    
    if (firstIsBullish && secondIsStar && thirdIsBearish && thirdBody > firstBody * 0.6) {
      const confidence = 85;
      
      patterns.push({
        time: third.time,
        pattern: 'Evening Star',
        type: 'bearish',
        confidence,
        description: 'Strong bearish reversal pattern consisting of three candles'
      });
    }
  }
  
  return patterns;
}

// Main function to detect all patterns
export function detectAllPatterns(candles: CandleData[]): PatternResult[] {
  if (candles.length < 3) return [];
  
  const allPatterns: PatternResult[] = [];
  
  // Single candle patterns
  allPatterns.push(...detectDoji(candles));
  allPatterns.push(...detectHammer(candles));
  allPatterns.push(...detectShootingStar(candles));
  
  // Two candle patterns
  allPatterns.push(...detectBullishEngulfing(candles));
  allPatterns.push(...detectBearishEngulfing(candles));
  
  // Three candle patterns
  allPatterns.push(...detectMorningStar(candles));
  allPatterns.push(...detectEveningStar(candles));
  
  // Sort by time and remove duplicates at same time
  return allPatterns
    .sort((a, b) => a.time - b.time)
    .filter((pattern, index, array) => 
      index === 0 || pattern.time !== array[index - 1].time || pattern.pattern !== array[index - 1].pattern
    );
}