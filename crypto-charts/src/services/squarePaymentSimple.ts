// Simplified Square payment service using payment links only
// This avoids browser compatibility issues with the Square Node SDK

const SQUARE_ACCESS_TOKEN = process.env.REACT_APP_SQUARE_ACCESS_TOKEN || 'EAAAl9z0g1huFmNMztub7cilS1cp_ea009v31G8VB7slx3MnIuGtAFIuP_ZiRNTT';
const APPLICATION_ID = 'sq0idp-hxoTovuE7sR4gVhwgABuOw';
const LOCATION_ID = 'LS3VWY69ZXS1V';
const API_BASE_URL = 'https://connect.squareup.com/v2';

export const SUBSCRIPTION_PLANS = {
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

class SimpleSquarePaymentService {
  // Create a payment link using Square API directly
  async createPaymentLink(planId: 'premium' | 'elite', userEmail: string): Promise<string> {
    const plan = SUBSCRIPTION_PLANS[planId];
    
    try {
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
            redirect_url: `${window.location.origin}/payment/success?plan=${planId}&email=${encodeURIComponent(userEmail)}`,
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
        const error = await response.json();
        throw new Error(error.message || 'Failed to create payment link');
      }

      const data = await response.json();
      
      if (data.payment_link && data.payment_link.url) {
        return data.payment_link.url;
      }
      
      throw new Error('Payment link URL not found in response');
    } catch (error) {
      console.error('Square payment link error:', error);
      throw error;
    }
  }

  // Get payment details (for webhooks or verification)
  async getPayment(paymentId: string): Promise<any> {
    try {
      const response = await fetch(`${API_BASE_URL}/payments/${paymentId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${SQUARE_ACCESS_TOKEN}`,
          'Square-Version': '2023-10-18'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to get payment details');
      }

      const data = await response.json();
      return data.payment;
    } catch (error) {
      console.error('Square get payment error:', error);
      throw error;
    }
  }

  // Create customer (for future billing)
  async createCustomer(email: string, firstName?: string, lastName?: string): Promise<string> {
    try {
      const response = await fetch(`${API_BASE_URL}/customers`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SQUARE_ACCESS_TOKEN}`,
          'Square-Version': '2023-10-18'
        },
        body: JSON.stringify({
          email_address: email,
          given_name: firstName || '',
          family_name: lastName || ''
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to create customer');
      }

      const data = await response.json();
      
      if (data.customer && data.customer.id) {
        return data.customer.id;
      }
      
      throw new Error('Customer ID not found in response');
    } catch (error) {
      console.error('Square customer creation error:', error);
      throw error;
    }
  }
}

export default new SimpleSquarePaymentService();