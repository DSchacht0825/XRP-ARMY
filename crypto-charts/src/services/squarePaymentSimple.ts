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

  // Create a payment link using backend API
  async createPaymentLink(planId: 'premium' | 'elite', userEmail: string): Promise<string> {
    const plan = SUBSCRIPTION_PLANS[planId];
    
    console.log('💳 Square Payment Link Request via Backend:');
    console.log('- Plan:', planId, plan);
    console.log('- User Email:', userEmail);
    
    // Get auth token from localStorage - allow bypass for local testing
    let authToken = localStorage.getItem('xrp_auth_token');
    if (!authToken && process.env.NODE_ENV === 'production') {
      throw new Error('Authentication required. Please log in again.');
    }
    
    // For local testing, use a dummy token or allow bypass
    let finalToken = authToken || 'local-test-token';

    // Determine backend URL
    const backendUrl = process.env.NODE_ENV === 'production' 
      ? 'https://xrp-army-production.up.railway.app'
      : 'http://localhost:5001';
    
    const makeRequest = async (token: string) => {
      return await fetch(`${backendUrl}/api/payment/create-payment-link`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          planId,
          userEmail
        })
      });
    };
    
    try {
      let response = await makeRequest(finalToken);

      // If we get a 403 error and we're in production, try to refresh the token
      if (!response.ok && response.status === 403 && process.env.NODE_ENV === 'production' && authToken) {
        console.log('🔄 Token expired, attempting refresh...');
        const newToken = await this.refreshToken();
        
        if (newToken) {
          finalToken = newToken;
          response = await makeRequest(finalToken);
        }
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        console.error('❌ Backend API Error:', response.status, response.statusText);
        console.error('❌ Backend API Error Body:', errorData);
        
        if (response.status === 403) {
          throw new Error('Authentication failed. Please log in again.');
        }
        
        throw new Error(`Backend API Error (${response.status}): ${errorData.error || 'Unknown error'}`);
      }

      const data = await response.json();
      
      if (data.success && data.payment_url) {
        console.log('✅ Payment link created successfully via backend');
        return data.payment_url;
      }
      
      throw new Error('Payment link URL not found in backend response');
    } catch (error) {
      console.error('❌ Square payment link error:', error);
      
      if (error instanceof TypeError && error.message.includes('fetch')) {
        throw new Error('Network error: Unable to connect to Square API. This may be due to CORS restrictions or network issues.');
      }
      
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