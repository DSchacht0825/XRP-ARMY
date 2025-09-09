import { Request, Response, NextFunction } from 'express';
import { AuthRequest } from '../auth';
import { database } from '../database';
import { hasFeatureAccess, getFeatureLimit } from '../pricing';

export interface SubscriptionRequest extends AuthRequest {
  subscription?: {
    plan: string;
    isActive: boolean;
    expiresAt?: Date;
  };
}

// Middleware to check if user has an active paid subscription
export async function requireActiveSubscription(req: SubscriptionRequest, res: Response, next: NextFunction) {
  try {
    if (!req.user) {
      return res.status(401).json({ 
        error: 'Authentication required',
        code: 'AUTH_REQUIRED' 
      });
    }

    // Check if user has an active subscription
    if (!req.user.is_active_subscription || req.user.subscription_status !== 'active') {
      return res.status(402).json({ 
        error: 'Active subscription required. Please subscribe to access this feature.',
        code: 'SUBSCRIPTION_REQUIRED',
        plans: {
          basic: {
            price: '$9.99/month',
            description: 'Basic plan with essential features'
          },
          premium: {
            price: '$20/month', 
            description: 'Premium plan with AI signals and advanced features'
          }
        }
      });
    }

    // Check if subscription has expired
    if (req.user.subscription_ends_at && new Date(req.user.subscription_ends_at) < new Date()) {
      // Update user's subscription status
      await database.updateUser(req.user.id!, {
        is_active_subscription: false,
        subscription_status: 'expired'
      });
      
      return res.status(402).json({ 
        error: 'Your subscription has expired. Please renew to continue.',
        code: 'SUBSCRIPTION_EXPIRED',
        expiredAt: req.user.subscription_ends_at
      });
    }

    // Add subscription info to request
    req.subscription = {
      plan: req.user.plan,
      isActive: true,
      expiresAt: req.user.subscription_ends_at
    };

    next();
  } catch (error) {
    console.error('Subscription check error:', error);
    res.status(500).json({ error: 'Failed to verify subscription status' });
  }
}

// Middleware to check if user has access to specific features
export function requireFeature(feature: string) {
  return async (req: SubscriptionRequest, res: Response, next: NextFunction) => {
    try {
      // First ensure they have an active subscription
      if (!req.user?.is_active_subscription) {
        return res.status(402).json({ 
          error: 'Subscription required to access this feature',
          code: 'SUBSCRIPTION_REQUIRED'
        });
      }

      const hasAccess = hasFeatureAccess(req.user.plan, feature);
      
      if (!hasAccess) {
        return res.status(403).json({ 
          error: `This feature requires a higher tier plan`,
          code: 'FEATURE_RESTRICTED',
          feature,
          currentPlan: req.user.plan,
          requiredPlan: feature === 'aiSignals' ? 'premium' : 'basic'
        });
      }

      next();
    } catch (error) {
      console.error('Feature check error:', error);
      res.status(500).json({ error: 'Failed to verify feature access' });
    }
  };
}

// Middleware for Premium-only features
export async function requirePremium(req: SubscriptionRequest, res: Response, next: NextFunction) {
  try {
    if (!req.user) {
      return res.status(401).json({ 
        error: 'Authentication required',
        code: 'AUTH_REQUIRED'
      });
    }

    if (req.user.plan !== 'premium' || !req.user.is_active_subscription) {
      return res.status(403).json({ 
        error: 'This feature requires a Premium subscription ($20/month)',
        code: 'PREMIUM_REQUIRED',
        features: [
          'AI-powered trading signals',
          'Advanced pattern recognition', 
          'Sentiment analysis',
          'Whale alerts',
          'Unlimited alerts',
          'API access'
        ]
      });
    }

    next();
  } catch (error) {
    console.error('Premium check error:', error);
    res.status(500).json({ error: 'Failed to verify premium access' });
  }
}

// Check rate limits based on subscription tier
export function checkRateLimit(resource: string) {
  return async (req: SubscriptionRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const limit = getFeatureLimit(req.user.plan, resource);
      
      // For now, just pass through - implement actual rate limiting with Redis later
      // This is a placeholder for rate limit logic
      
      next();
    } catch (error) {
      console.error('Rate limit check error:', error);
      res.status(500).json({ error: 'Failed to check rate limits' });
    }
  };
}