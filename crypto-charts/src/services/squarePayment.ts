import { Client, Environment } from 'square';

// Square configuration - using production credentials
const squareClient = new Client({
  accessToken: process.env.REACT_APP_SQUARE_ACCESS_TOKEN || 'EAAAl9z0g1huFmNMztub7cilS1cp_ea009v31G8VB7slx3MnIuGtAFIuP_ZiRNTT',
  environment: Environment.Production
});

const APPLICATION_ID = 'sq0idp-hxoTovuE7sR4gVhwgABuOw';
const LOCATION_ID = 'LS3VWY69ZXS1V'; // Causory (Main) - 724 Granada Dr

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
  // Create a subscription with customer and card
  async createSubscriptionWithCard(planId: 'premium' | 'elite', userEmail: string, cardToken: string, userName?: string): Promise<any> {
    const plan = SUBSCRIPTION_PLANS[planId];
    
    try {
      // Step 1: Create or find customer
      let customerId: string;
      
      // Try to find existing customer first
      try {
        const searchResponse = await squareClient.customersApi.searchCustomers({
          filter: {
            emailAddress: {
              exact: userEmail
            }
          }
        });
        
        if (searchResponse.result.customers && searchResponse.result.customers.length > 0) {
          customerId = searchResponse.result.customers[0].id!;
        } else {
          // Create new customer
          const [firstName, lastName] = userName ? userName.split(' ') : ['', ''];
          customerId = await this.createCustomer(userEmail, firstName, lastName);
        }
      } catch (searchError) {
        // If search fails, create new customer
        const [firstName, lastName] = userName ? userName.split(' ') : ['', ''];
        customerId = await this.createCustomer(userEmail, firstName, lastName);
      }

      // Step 2: Create card on file for customer
      const cardResponse = await squareClient.cardsApi.createCard({
        sourceId: cardToken,
        card: {
          customerId: customerId
        }
      });

      if (!cardResponse.result.card) {
        throw new Error('Failed to save card');
      }

      // Step 3: Create subscription plan (if not exists in Square)
      // Note: In production, these plans should be pre-created in Square Dashboard
      
      // Step 4: Create subscription
      const subscriptionResponse = await squareClient.subscriptionsApi.createSubscription({
        locationId: LOCATION_ID,
        planVariationId: plan.id, // This should be the actual plan variation ID from Square
        customerId: customerId,
        cardId: cardResponse.result.card.id,
        startDate: new Date().toISOString().split('T')[0]
      });

      return {
        subscription: subscriptionResponse.result.subscription,
        customerId: customerId
      };
    } catch (error) {
      console.error('Square subscription error:', error);
      throw error;
    }
  }

  // Create a payment link for checkout (simpler method)
  async createPaymentLink(planId: 'premium' | 'elite', userEmail: string): Promise<string> {
    const plan = SUBSCRIPTION_PLANS[planId];
    
    try {
      // For subscriptions, we need to use Quick Pay Links or Checkout API
      // This creates a one-time payment that can be converted to subscription
      const response = await squareClient.checkoutApi.createPaymentLink({
        order: {
          locationId: LOCATION_ID,
          lineItems: [
            {
              name: plan.name + ' Monthly Subscription',
              quantity: '1',
              basePriceMoney: {
                amount: BigInt(plan.amount),
                currency: 'USD'
              },
              note: `Monthly subscription - ${plan.name}`
            }
          ]
        },
        checkoutOptions: {
          redirectUrl: `${window.location.origin}/payment/success?plan=${planId}`,
          askForShippingAddress: false,
          merchantSupportEmail: 'support@xrparmy.com',
          acceptedPaymentMethods: {
            applePay: true,
            googlePay: true,
            cashAppPay: true,
            afterpayClearpay: false
          }
        },
        prePopulatedData: {
          buyerEmail: userEmail
        },
        description: `Start your ${plan.name} subscription today!`
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