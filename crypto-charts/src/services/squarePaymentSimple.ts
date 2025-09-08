// Square payment service using backend API proxy
// This avoids CORS issues by using the backend server to handle Square API calls

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
  // Helper method to refresh token
  private async refreshToken(): Promise<string | null> {
    const currentToken = localStorage.getItem('xrp_auth_token');
    if (!currentToken) return null;

    const backendUrl = process.env.NODE_ENV === 'production' 
      ? 'https://xrp-army-production.up.railway.app'
      : 'http://localhost:5001';
    
    try {
      const response = await fetch(`${backendUrl}/api/auth/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ token: currentToken })
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data.token) {
          localStorage.setItem('xrp_auth_token', data.data.token);
          console.log('🔄 Token refreshed successfully');
          return data.data.token;
        }
      }
    } catch (error) {
      console.error('❌ Token refresh failed:', error);
    }
    
    return null;
  }

  // Create a payment link using backend API - SIMPLIFIED VERSION
  async createPaymentLink(planId: 'premium' | 'elite', userEmail: string): Promise<string> {
    const plan = SUBSCRIPTION_PLANS[planId];
    
    console.log('💳 SIMPLE Square Payment Link Request:');
    console.log('- Plan:', planId, plan);
    console.log('- User Email:', userEmail);

    // Determine backend URL
    const backendUrl = process.env.NODE_ENV === 'production' 
      ? 'https://xrp-army-production.up.railway.app'
      : 'http://localhost:5001';
    
    try {
      const response = await fetch(`${backendUrl}/api/payment/create-payment-link`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          planId,
          userEmail
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Backend Error:', response.status, errorText);
        throw new Error(`Payment failed (${response.status}): ${errorText}`);
      }

      const data = await response.json();
      
      if (data.success && data.payment_url) {
        console.log('✅ Payment link created successfully');
        return data.payment_url;
      }
      
      throw new Error('Payment link not found in response');
    } catch (error) {
      console.error('❌ Payment error:', error);
      throw error;
    }
  }

  // Get payment details via backend
  async getPayment(paymentId: string): Promise<any> {
    const authToken = localStorage.getItem('xrp_auth_token');
    if (!authToken) {
      throw new Error('Authentication required. Please log in again.');
    }

    const backendUrl = process.env.NODE_ENV === 'production' 
      ? 'https://xrp-army-production.up.railway.app'
      : 'http://localhost:5001';
    
    try {
      const response = await fetch(`${backendUrl}/api/payment/payment/${paymentId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to get payment details');
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Backend get payment error:', error);
      throw error;
    }
  }

  // Create customer (for future billing) - TODO: Implement via backend if needed
  async createCustomer(email: string, firstName?: string, lastName?: string): Promise<string> {
    // This would need to be implemented via backend API when needed
    throw new Error('Customer creation not yet implemented via backend API');
  }
}

export default new SimpleSquarePaymentService();