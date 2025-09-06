import { Client, Environment } from 'square';

// Square configuration - using sandbox credentials
const squareClient = new Client({
  accessToken: 'EAAAl_oXzR81OR_ZfD5uCNxsvsv31WUosBDhDLA4yDTW3kyFwFeMopPucFtgYitJ',
  environment: Environment.Sandbox
});

const APPLICATION_ID = 'sandbox-sq0idb-_3kTGKyO0GN2YAFIc3tNgQ';
const LOCATION_ID = 'REPLACE_WITH_YOUR_LOCATION_ID'; // You'll need to get this from Square Dashboard

export interface PaymentDetails {
  amount: number; // in cents
  currency: string;
  buyerEmail: string;
  planName: string;
  planId: 'premium' | 'elite';
}

export interface SubscriptionPlan {
  id: string;
  name: string;
  amount: number; // in cents
  interval: 'MONTHLY';
}

// Define subscription plans
export const SUBSCRIPTION_PLANS: Record<string, SubscriptionPlan> = {
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

class SquarePaymentService {
  // Create a payment link for checkout
  async createPaymentLink(planId: 'premium' | 'elite', userEmail: string): Promise<string> {
    const plan = SUBSCRIPTION_PLANS[planId];
    
    try {
      const response = await squareClient.checkoutApi.createPaymentLink({
        order: {
          locationId: LOCATION_ID,
          lineItems: [
            {
              name: plan.name + ' Subscription',
              quantity: '1',
              basePriceMoney: {
                amount: BigInt(plan.amount),
                currency: 'USD'
              }
            }
          ]
        },
        checkoutOptions: {
          subscriptionPlanId: plan.id,
          redirectUrl: `${window.location.origin}/payment/success`,
          askForShippingAddress: false,
          merchantSupportEmail: 'support@xrparmy.com'
        },
        prePopulatedData: {
          buyerEmail: userEmail
        }
      });

      if (response.result.paymentLink) {
        return response.result.paymentLink.url || '';
      }
      
      throw new Error('Failed to create payment link');
    } catch (error) {
      console.error('Square payment link error:', error);
      throw error;
    }
  }

  // Create a subscription directly (requires customer ID)
  async createSubscription(customerId: string, planId: 'premium' | 'elite'): Promise<any> {
    const plan = SUBSCRIPTION_PLANS[planId];
    
    try {
      const response = await squareClient.subscriptionsApi.createSubscription({
        locationId: LOCATION_ID,
        planId: plan.id,
        customerId: customerId,
        startDate: new Date().toISOString().split('T')[0]
      });

      return response.result.subscription;
    } catch (error) {
      console.error('Square subscription error:', error);
      throw error;
    }
  }

  // Create a customer
  async createCustomer(email: string, firstName?: string, lastName?: string): Promise<string> {
    try {
      const response = await squareClient.customersApi.createCustomer({
        emailAddress: email,
        givenName: firstName,
        familyName: lastName
      });

      if (response.result.customer) {
        return response.result.customer.id;
      }
      
      throw new Error('Failed to create customer');
    } catch (error) {
      console.error('Square customer creation error:', error);
      throw error;
    }
  }

  // Cancel subscription
  async cancelSubscription(subscriptionId: string): Promise<void> {
    try {
      await squareClient.subscriptionsApi.cancelSubscription(
        subscriptionId,
        {}
      );
    } catch (error) {
      console.error('Square cancel subscription error:', error);
      throw error;
    }
  }

  // Get subscription details
  async getSubscription(subscriptionId: string): Promise<any> {
    try {
      const response = await squareClient.subscriptionsApi.retrieveSubscription(subscriptionId);
      return response.result.subscription;
    } catch (error) {
      console.error('Square get subscription error:', error);
      throw error;
    }
  }

  // Initialize Square Web Payments SDK
  async initializePaymentForm(containerId: string): Promise<any> {
    const payments = (window as any).Square?.payments(APPLICATION_ID, LOCATION_ID);
    
    if (!payments) {
      throw new Error('Square.js failed to load');
    }

    const card = await payments.card();
    await card.attach(`#${containerId}`);
    
    return card;
  }

  // Process payment with card token
  async processPayment(sourceId: string, paymentDetails: PaymentDetails): Promise<any> {
    try {
      const response = await squareClient.paymentsApi.createPayment({
        sourceId,
        amountMoney: {
          amount: BigInt(paymentDetails.amount),
          currency: paymentDetails.currency
        },
        locationId: LOCATION_ID,
        buyerEmailAddress: paymentDetails.buyerEmail,
        note: `${paymentDetails.planName} Subscription`
      });

      return response.result.payment;
    } catch (error) {
      console.error('Square payment error:', error);
      throw error;
    }
  }
}

export default new SquarePaymentService();