export interface PricingTier {
  id: string;
  name: string;
  price: number;
  interval: 'monthly' | 'yearly';
  features: string[];
  limits: {
    [key: string]: number | boolean;
  };
}

export const PRICING_TIERS: { [key: string]: PricingTier } = {
  basic: {
    id: 'basic',
    name: 'Basic',
    price: 9.99,
    interval: 'monthly',
    features: [
      'Real-time XRP price tracking',
      'Basic charts and indicators',
      'Price alerts (up to 5)',
      'Order book analysis',
      'Volume tracking',
      'Basic technical analysis tools',
      'Email support'
    ],
    limits: {
      priceAlerts: 5,
      customIndicators: false,
      aiSignals: false,
      advancedCharts: false,
      portfolioTracking: true,
      maxWatchlistItems: 10,
      apiAccess: false
    }
  },
  premium: {
    id: 'premium',
    name: 'Premium with AI Signals',
    price: 20.00,
    interval: 'monthly',
    features: [
      'Everything in Basic plan',
      'AI-powered trading signals',
      'Advanced pattern recognition',
      'Sentiment analysis',
      'Unlimited price alerts',
      'Custom technical indicators',
      'Advanced charting tools',
      'Portfolio tracking & analytics',
      'API access',
      'Priority support',
      'Whale alert notifications',
      'Market manipulation detection'
    ],
    limits: {
      priceAlerts: -1, // unlimited
      customIndicators: true,
      aiSignals: true,
      advancedCharts: true,
      portfolioTracking: true,
      maxWatchlistItems: -1, // unlimited
      apiAccess: true,
      whaleAlerts: true,
      sentimentAnalysis: true
    }
  }
};

export function getTierByPlan(plan: string): PricingTier | null {
  return PRICING_TIERS[plan] || null;
}

export function hasFeatureAccess(plan: string, feature: string): boolean {
  const tier = getTierByPlan(plan);
  if (!tier) return false;
  
  const limit = tier.limits[feature];
  return limit === true || (typeof limit === 'number' && limit !== 0);
}

export function getFeatureLimit(plan: string, feature: string): number | boolean {
  const tier = getTierByPlan(plan);
  if (!tier) return false;
  
  return tier.limits[feature] ?? false;
}