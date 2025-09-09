import express from 'express';
import { AuthService, authenticateToken, AuthRequest } from '../auth';
import { requireActiveSubscription, requirePremium } from '../middleware/subscription';
import { PRICING_TIERS } from '../pricing';
import { squarePayment } from '../payment/square';

const router = express.Router();

// Sign up endpoint - No free trials, subscription required
router.post('/signup', async (req, res) => {
  try {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Username, email, and password are required'
      });
    }

    // Create user but they must subscribe to access features
    const result = await AuthService.signup(username, email, password, 'basic');

    res.status(201).json({
      success: true,
      message: `Welcome to XRP Army, ${username}! Please subscribe to access the platform.`,
      data: {
        ...result,
        subscriptionRequired: true,
        plans: PRICING_TIERS
      }
    });

  } catch (error: any) {
    console.error('❌ Signup error:', error.message);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

// Sign in endpoint
router.post('/signin', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Email and password are required'
      });
    }

    const result = await AuthService.signin(email, password);

    // Check if user has active subscription
    const requiresSubscription = !result.user.isActiveSubscription;

    res.status(200).json({
      success: true,
      message: requiresSubscription 
        ? `Welcome back, ${result.user.username}! Please subscribe to continue.`
        : `Welcome back, ${result.user.username}!`,
      data: {
        ...result,
        requiresSubscription,
        plans: requiresSubscription ? PRICING_TIERS : undefined
      }
    });

  } catch (error: any) {
    console.error('❌ Signin error:', error.message);
    res.status(401).json({
      success: false,
      error: error.message
    });
  }
});

// Logout endpoint
router.post('/logout', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (token) {
      await AuthService.logout(token);
    }

    res.status(200).json({
      success: true,
      message: 'Logged out successfully'
    });

  } catch (error: any) {
    console.error('❌ Logout error:', error.message);
    res.status(500).json({
      success: false,
      error: 'Logout failed'
    });
  }
});

// Get current user profile - requires active subscription
router.get('/me', authenticateToken, requireActiveSubscription, async (req: AuthRequest, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'User not found'
      });
    }

    res.status(200).json({
      success: true,
      data: {
        id: req.user.id,
        username: req.user.username,
        email: req.user.email,
        plan: req.user.plan,
        isActiveSubscription: req.user.is_active_subscription,
        subscriptionStatus: req.user.subscription_status,
        subscriptionEndsAt: req.user.subscription_ends_at ? new Date(req.user.subscription_ends_at).toISOString() : undefined,
        subscriptionId: req.user.subscription_id,
        joinedAt: req.user.created_at
      }
    });

  } catch (error: any) {
    console.error('❌ Get user profile error:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to get user profile'
    });
  }
});

// Create Square checkout link for subscription
router.post('/subscribe', authenticateToken, async (req: AuthRequest, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'User not found'
      });
    }

    const { plan } = req.body;
    
    if (!plan || !['basic', 'premium'].includes(plan)) {
      return res.status(400).json({
        success: false,
        error: 'Valid plan (basic or premium) is required'
      });
    }

    const selectedPlan = PRICING_TIERS[plan];
    
    // Create Square checkout link
    console.log(`💳 Creating Square checkout for user ${req.user.username} - Plan: ${plan} ($${selectedPlan.price}/month)`);

    const checkoutUrl = await squarePayment.createCheckoutLink(plan, req.user.id!);

    res.json({
      success: true,
      message: `Redirecting to Square checkout for ${selectedPlan.name} plan`,
      data: {
        checkoutUrl,
        plan: {
          id: plan,
          name: selectedPlan.name,
          price: selectedPlan.price,
          features: selectedPlan.features
        }
      }
    });

  } catch (error: any) {
    console.error('❌ Subscribe error:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to create checkout link'
    });
  }
});

// Square webhook endpoint for subscription events
router.post('/square-webhook', async (req, res) => {
  try {
    const signature = req.headers['x-square-signature'] as string;
    const webhookBody = req.body;

    const processed = await squarePayment.processWebhook(webhookBody, signature);
    
    if (processed) {
      res.status(200).json({ success: true });
    } else {
      res.status(400).json({ success: false });
    }
  } catch (error: any) {
    console.error('❌ Webhook error:', error.message);
    res.status(500).json({ success: false, error: 'Webhook processing failed' });
  }
});

// Subscription success callback
router.get('/subscription-success', authenticateToken, async (req: AuthRequest, res) => {
  try {
    if (!req.user) {
      return res.redirect('/login?error=authentication_required');
    }

    // Check if user now has active subscription
    const { database } = await import('../database');
    const user = await database.getUserById(req.user.id!);
    
    if (user?.is_active_subscription) {
      res.redirect('/dashboard?success=subscription_activated');
    } else {
      res.redirect('/subscribe?error=payment_pending');
    }
  } catch (error: any) {
    console.error('❌ Subscription success error:', error.message);
    res.redirect('/subscribe?error=verification_failed');
  }
});

// Cancel subscription
router.post('/cancel-subscription', authenticateToken, requireActiveSubscription, async (req: AuthRequest, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'User not found'
      });
    }

    // TODO: Cancel subscription in Square using subscriptionsApi
    // For now, just update local status
    const { database } = await import('../database');
    const updatedUser = await database.updateUser(req.user.id!, {
      subscription_status: 'cancelled',
      updated_at: new Date()
    });

    res.json({
      success: true,
      message: 'Subscription cancelled. You will have access until the end of your billing period.',
      data: {
        accessUntil: req.user.subscription_ends_at,
        note: 'To reactivate, you can subscribe again at any time.'
      }
    });

  } catch (error: any) {
    console.error('❌ Cancel subscription error:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to cancel subscription'
    });
  }
});

// Get pricing information
router.get('/pricing', (req, res) => {
  res.json({
    success: true,
    data: {
      plans: PRICING_TIERS,
      message: 'No free trials. Subscription required for access.'
    }
  });
});

// Validate token endpoint
router.post('/validate', async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({
        success: false,
        error: 'Token is required'
      });
    }

    const user = await AuthService.validateSession(token);
    
    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Invalid or expired token'
      });
    }

    res.status(200).json({
      success: true,
      data: {
        id: user.id,
        username: user.username,
        email: user.email,
        plan: user.plan,
        isActiveSubscription: user.is_active_subscription,
        subscriptionStatus: user.subscription_status,
        subscriptionEndsAt: user.subscription_ends_at?.toISOString(),
        requiresSubscription: !user.is_active_subscription
      }
    });

  } catch (error: any) {
    console.error('❌ Token validation error:', error.message);
    res.status(500).json({
      success: false,
      error: 'Token validation failed'
    });
  }
});

export default router;