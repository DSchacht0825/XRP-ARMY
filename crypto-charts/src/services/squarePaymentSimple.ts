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
  // Create a payment link using backend API
  async createPaymentLink(planId: 'premium' | 'elite', userEmail: string): Promise<string> {
    const plan = SUBSCRIPTION_PLANS[planId];
    
    console.log('💳 Square Payment Link Request via Backend:');
    console.log('- Plan:', planId, plan);
    console.log('- User Email:', userEmail);
    
    // Get auth token from localStorage
    const authToken = localStorage.getItem('xrp_auth_token');
    if (!authToken) {
      throw new Error('Authentication required. Please log in again.');
    }

    // Determine backend URL
    const backendUrl = process.env.NODE_ENV === 'production' 
      ? 'https://xrp-army-production.up.railway.app'
      : 'http://localhost:5001';
    
    try {
      const response = await fetch(`${backendUrl}/api/payment/create-payment-link`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({
          planId,
          userEmail
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        console.error('❌ Backend API Error:', response.status, response.statusText);
        console.error('❌ Backend API Error Body:', errorData);
        
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