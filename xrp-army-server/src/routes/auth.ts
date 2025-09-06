import express from 'express';
import { AuthService, authenticateToken, AuthRequest } from '../auth';

const router = express.Router();

// Sign up endpoint
router.post('/signup', async (req, res) => {
  try {
    const { username, email, password, plan = 'free' } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Username, email, and password are required'
      });
    }

    const result = await AuthService.signup(username, email, password, plan);

    res.status(201).json({
      success: true,
      message: `Welcome to XRP Army, ${username}! ${plan !== 'free' ? 'Your 7-day free trial has started!' : ''}`,
      data: result
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

    res.status(200).json({
      success: true,
      message: `Welcome back, ${result.user.username}!`,
      data: result
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

// Get current user profile
router.get('/me', authenticateToken, async (req: AuthRequest, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'User not found'
      });
    }

    // Calculate trial days remaining for premium users
    let trialDaysRemaining = null;
    if (req.user.is_premium && req.user.trial_ends_at) {
      const now = new Date();
      const trialEnd = new Date(req.user.trial_ends_at);
      const diffTime = trialEnd.getTime() - now.getTime();
      trialDaysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      if (trialDaysRemaining < 0) {
        trialDaysRemaining = 0;
      }
    }

    res.status(200).json({
      success: true,
      data: {
        id: req.user.id,
        username: req.user.username,
        email: req.user.email,
        plan: req.user.plan,
        isPremium: req.user.is_premium,
        trialEndsAt: req.user.trial_ends_at ? new Date(req.user.trial_ends_at).toISOString() : undefined,
        trialDaysRemaining,
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

// Upgrade user plan endpoint
router.post('/upgrade', authenticateToken, async (req: AuthRequest, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'User not found'
      });
    }

    const { plan } = req.body;
    
    if (!plan || !['premium', 'elite'].includes(plan)) {
      return res.status(400).json({
        success: false,
        error: 'Valid plan (premium or elite) is required'
      });
    }

    // Update user plan in database
    const { database } = await import('../database');
    const updatedUser = await database.updateUser(req.user.id!, {
      plan: plan,
      is_premium: true,
      updated_at: new Date()
    });

    if (!updatedUser) {
      return res.status(500).json({
        success: false,
        error: 'Failed to update user plan'
      });
    }

    res.json({
      success: true,
      message: `Plan upgraded to ${plan}`,
      data: {
        user: {
          id: updatedUser.id,
          username: updatedUser.username,
          email: updatedUser.email,
          plan: updatedUser.plan,
          isPremium: updatedUser.is_premium
        }
      }
    });

  } catch (error: any) {
    console.error('❌ Upgrade plan error:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to upgrade plan'
    });
  }
});

// Validate token endpoint (for frontend session checking)
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
        isPremium: user.is_premium,
        trialEndsAt: user.trial_ends_at?.toISOString()
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

// Upgrade to premium (mock payment processing)
router.post('/upgrade', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { plan } = req.body;

    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    if (!['premium', 'elite'].includes(plan)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid plan. Must be premium or elite'
      });
    }

    // Mock payment processing - In production, integrate with Stripe/PayPal here
    console.log(`💳 Processing payment for user ${req.user.username} - Plan: ${plan}`);

    // Update user plan (with 7-day trial for now)
    const trialEndsAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
    const subscriptionId = `sub_${Date.now()}_${req.user.id}`; // Mock subscription ID

    const updatedUser = await require('../database').database.updateUser(req.user.id!, {
      plan,
      is_premium: true,
      trial_ends_at: trialEndsAt,
      subscription_id: subscriptionId
    });

    res.status(200).json({
      success: true,
      message: `🚀 Congratulations! You're now a XRP ${plan === 'premium' ? 'Lieutenant' : 'General'}! Your 7-day free trial has started.`,
      data: {
        plan,
        isPremium: true,
        trialEndsAt: trialEndsAt.toISOString(),
        subscriptionId
      }
    });

  } catch (error: any) {
    console.error('❌ Upgrade error:', error.message);
    res.status(500).json({
      success: false,
      error: 'Upgrade failed. Please try again.'
    });
  }
});

export default router;