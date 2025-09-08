import express from 'express';
import { authenticateToken, AuthRequest } from '../auth';

const router = express.Router();

// Square API configuration
const SQUARE_ACCESS_TOKEN = process.env.SQUARE_ACCESS_TOKEN || 'EAAAl9z0g1huFmNMztub7cilS1cp_ea009v31G8VB7slx3MnIuGtAFIuP_ZiRNTT';
const LOCATION_ID = 'LS3VWY69ZXS1V';
const API_BASE_URL = 'https://connect.squareup.com/v2';

const SUBSCRIPTION_PLANS = {
  premium: {
    id: 'xrp-lieutenant-monthly',
    name: 'XRP Lieutenant',
    amount: 2000, // $20.00 in cents
    interval: 'MONTHLY'
  },
  elite: {
    id: 'xrp-general-monthly',
    name: 'XRP General',
    amount: 4900, // $49.00 in cents
    interval: 'MONTHLY'
  }
};

// Create payment link endpoint - SIMPLIFIED - NO AUTH REQUIRED
router.post('/create-payment-link', async (req, res) => {
  try {
    const { planId, userEmail } = req.body;

    if (!planId || !userEmail) {
      return res.status(400).json({ 
        error: 'Missing required fields: planId, userEmail' 
      });
    }

    const plan = SUBSCRIPTION_PLANS[planId as keyof typeof SUBSCRIPTION_PLANS];
    if (!plan) {
      return res.status(400).json({ 
        error: 'Invalid plan ID. Must be "premium" or "elite"' 
      });
    }

    console.log('💳 Creating Square payment link:', { planId, userEmail, plan });

    // Determine frontend URL for redirect
    const frontendUrl = process.env.NODE_ENV === 'production' 
      ? 'https://xrp-army.vercel.app'
      : 'http://localhost:3000';

    const response = await fetch(`${API_BASE_URL}/online-checkout/payment-links`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SQUARE_ACCESS_TOKEN}`,
        'Square-Version': '2023-10-18'
      },
      body: JSON.stringify({
        order: {
          location_id: LOCATION_ID,
          line_items: [
            {
              name: `${plan.name} - First Month`,
              quantity: '1',
              base_price_money: {
                amount: plan.amount,
                currency: 'USD'
              },
              note: `First month payment - ${plan.name} subscription`
            }
          ]
        },
        checkout_options: {
          redirect_url: `${frontendUrl}/payment/success?plan=${planId}&email=${encodeURIComponent(userEmail)}`,
          ask_for_shipping_address: false,
          merchant_support_email: 'support@xrparmy.com',
          accepted_payment_methods: {
            apple_pay: true,
            google_pay: true,
            cash_app_pay: true,
            afterpay_clearpay: false
          }
        },
        pre_populated_data: {
          buyer_email: userEmail
        },
        description: `Start your ${plan.name} subscription - $${(plan.amount / 100).toFixed(2)}/month`
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Square API Error:', response.status, response.statusText);
      console.error('❌ Square API Error Body:', errorText);
      
      let errorMessage = 'Failed to create payment link';
      try {
        const error = JSON.parse(errorText);
        errorMessage = error.message || error.errors?.[0]?.detail || errorMessage;
      } catch (e) {
        errorMessage = errorText || errorMessage;
      }
      
      return res.status(response.status).json({
        error: `Square API Error: ${errorMessage}`
      });
    }

    const data = await response.json();
    
    if (data.payment_link && data.payment_link.url) {
      console.log('✅ Payment link created successfully:', data.payment_link.url);
      return res.json({
        success: true,
        payment_url: data.payment_link.url,
        payment_link_id: data.payment_link.id
      });
    }
    
    return res.status(500).json({
      error: 'Payment link URL not found in Square response'
    });

  } catch (error: any) {
    console.error('❌ Payment link creation error:', error);
    
    return res.status(500).json({
      error: error.message || 'Internal server error'
    });
  }
});

// Get payment details endpoint
router.get('/payment/:paymentId', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { paymentId } = req.params;

    const response = await fetch(`${API_BASE_URL}/payments/${paymentId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${SQUARE_ACCESS_TOKEN}`,
        'Square-Version': '2023-10-18'
      }
    });

    if (!response.ok) {
      return res.status(response.status).json({
        error: 'Failed to get payment details'
      });
    }

    const data = await response.json();
    res.json(data.payment);

  } catch (error: any) {
    console.error('❌ Get payment error:', error);
    res.status(500).json({
      error: error.message || 'Internal server error'
    });
  }
});

export default router;