import { Client, Environment } from 'squareup';
import { PRICING_TIERS } from '../pricing';

interface SquareConfig {
  applicationId: string;
  accessToken: string;
  environment: Environment;
  locationId: string;
}

export class SquarePaymentService {
  private client: Client;
  private config: SquareConfig;

  constructor() {
    this.config = {
      applicationId: process.env.SQUARE_APPLICATION_ID || 'sandbox-sq0idb-your-app-id',
      accessToken: process.env.SQUARE_ACCESS_TOKEN || 'sandbox-sq0atb-your-access-token',
      environment: process.env.NODE_ENV === 'production' ? Environment.Production : Environment.Sandbox,
      locationId: process.env.SQUARE_LOCATION_ID || 'your-location-id'
    };

    this.client = new Client({
      accessToken: this.config.accessToken,
      environment: this.config.environment,
    });
  }

  // Create a checkout link for subscription
  async createCheckoutLink(plan: 'basic' | 'premium', userId: number): Promise<string> {
    try {
      const planConfig = PRICING_TIERS[plan];
      if (!planConfig) {
        throw new Error('Invalid plan selected');
      }

      const checkoutApi = this.client.checkoutApi;
      
      const requestBody = {
        idempotencyKey: `checkout_${userId}_${plan}_${Date.now()}`,
        order: {
          locationId: this.config.locationId,
          lineItems: [
            {
              name: `XRP Army ${planConfig.name} - Monthly Subscription`,
              quantity: '1',
              // Square expects amounts in the smallest currency unit (cents)
              variationName: `${planConfig.name} Plan`,
              metadata: {
                plan: plan,
                userId: userId.toString(),
                subscriptionType: 'monthly'
              }
            }
          ]
        },
        checkoutOptions: {
          allowTipping: false,
          customFields: [
            {
              title: 'User ID',
              value: userId.toString()
            }
          ],
          subscriptionPlanId: plan === 'basic' ? 
            process.env.SQUARE_BASIC_PLAN_ID : 
            process.env.SQUARE_PREMIUM_PLAN_ID
        },
        redirectUrl: process.env.FRONTEND_URL + '/subscription/success',
        merchantSupportEmail: process.env.SUPPORT_EMAIL || 'support@xrparmy.com'
      };

      const response = await checkoutApi.createPaymentLink(requestBody);
      
      if (response.result.paymentLink?.url) {
        return response.result.paymentLink.url;
      } else {
        throw new Error('Failed to create checkout link');
      }

    } catch (error) {
      console.error('Square checkout error:', error);
      throw new Error('Failed to create payment link');
    }
  }

  // Create subscription plans in Square (run this once to set up)
  async createSubscriptionPlans() {
    try {
      const subscriptionsApi = this.client.subscriptionsApi;

      // Basic Plan
      const basicPlan = {
        idempotencyKey: `plan_basic_${Date.now()}`,
        object: {
          type: 'CATALOG_SUBSCRIPTION_PLAN',
          subscriptionPlanData: {
            name: 'XRP Army Basic',
            phases: [
              {
                cadence: 'MONTHLY',
                periods: 1, // Recurring monthly
                recurringPriceMoney: {
                  amount: 999, // $9.99 in cents
                  currency: 'USD'
                }
              }
            ]
          }
        }
      };

      // Premium Plan  
      const premiumPlan = {
        idempotencyKey: `plan_premium_${Date.now()}`,
        object: {
          type: 'CATALOG_SUBSCRIPTION_PLAN',
          subscriptionPlanData: {
            name: 'XRP Army Premium with AI Signals',
            phases: [
              {
                cadence: 'MONTHLY',
                periods: 1, // Recurring monthly
                recurringPriceMoney: {
                  amount: 2000, // $20.00 in cents
                  currency: 'USD'
                }
              }
            ]
          }
        }
      };

      const catalogApi = this.client.catalogApi;
      
      const basicResponse = await catalogApi.upsertCatalogObject(basicPlan);
      const premiumResponse = await catalogApi.upsertCatalogObject(premiumPlan);

      console.log('✅ Subscription plans created in Square:');
      console.log('Basic Plan ID:', basicResponse.result.catalogObject?.id);
      console.log('Premium Plan ID:', premiumResponse.result.catalogObject?.id);

      return {
        basicPlanId: basicResponse.result.catalogObject?.id,
        premiumPlanId: premiumResponse.result.catalogObject?.id
      };

    } catch (error) {
      console.error('❌ Error creating subscription plans:', error);
      throw error;
    }
  }

  // Process webhook from Square for subscription events
  async processWebhook(webhookBody: any, signature: string): Promise<boolean> {
    try {
      // Verify webhook signature here if needed
      const event = webhookBody;
      
      switch (event.type) {
        case 'subscription.created':
          await this.handleSubscriptionCreated(event.data);
          break;
        case 'subscription.updated':
          await this.handleSubscriptionUpdated(event.data);
          break;
        case 'subscription.canceled':
          await this.handleSubscriptionCanceled(event.data);
          break;
        case 'invoice.payment_made':
          await this.handlePaymentMade(event.data);
          break;
        case 'invoice.payment_failed':
          await this.handlePaymentFailed(event.data);
          break;
        default:
          console.log('Unhandled webhook event:', event.type);
      }

      return true;
    } catch (error) {
      console.error('Webhook processing error:', error);
      return false;
    }
  }

  private async handleSubscriptionCreated(data: any) {
    console.log('📝 Subscription created:', data);
    // Update user's subscription status in database
    const { database } = await import('../database');
    
    // Extract user ID from metadata or order details
    const userId = data.object?.source?.name || data.object?.metadata?.userId;
    if (userId) {
      await database.updateUser(parseInt(userId), {
        is_active_subscription: true,
        subscription_status: 'active',
        subscription_id: data.object.id,
        subscription_ends_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
      });
    }
  }

  private async handleSubscriptionUpdated(data: any) {
    console.log('🔄 Subscription updated:', data);
    // Handle subscription changes
  }

  private async handleSubscriptionCanceled(data: any) {
    console.log('❌ Subscription canceled:', data);
    const { database } = await import('../database');
    
    const userId = data.object?.source?.name || data.object?.metadata?.userId;
    if (userId) {
      await database.updateUser(parseInt(userId), {
        subscription_status: 'cancelled'
      });
    }
  }

  private async handlePaymentMade(data: any) {
    console.log('💰 Payment successful:', data);
    // Extend subscription period
    const { database } = await import('../database');
    
    const userId = data.object?.source?.name || data.object?.metadata?.userId;
    if (userId) {
      const newEndDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // Extend 30 days
      await database.updateUser(parseInt(userId), {
        is_active_subscription: true,
        subscription_status: 'active',
        subscription_ends_at: newEndDate
      });
    }
  }

  private async handlePaymentFailed(data: any) {
    console.log('💳 Payment failed:', data);
    // Handle failed payment - maybe send email notification
    const { database } = await import('../database');
    
    const userId = data.object?.source?.name || data.object?.metadata?.userId;
    if (userId) {
      await database.updateUser(parseInt(userId), {
        subscription_status: 'payment_failed'
      });
    }
  }
}

export const squarePayment = new SquarePaymentService();