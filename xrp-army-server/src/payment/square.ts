import { Client, Environment } from 'squareup';
import { PRICING_TIERS } from '../pricing';

// Live Square checkout links for production
const LIVE_CHECKOUT_LINKS = {
  basic: 'https://square.link/u/FYrYvBjt',
  premium: 'https://square.link/u/7xs2lxXZ'
};

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
      applicationId: process.env.SQUARE_APPLICATION_ID || '',
      accessToken: process.env.SQUARE_ACCESS_TOKEN || '',
      environment: Environment.Production, // Using production environment
      locationId: process.env.SQUARE_LOCATION_ID || ''
    };

    // Only initialize client if we have credentials for webhook processing
    if (this.config.accessToken) {
      this.client = new Client({
        accessToken: this.config.accessToken,
        environment: this.config.environment,
      });
    }
  }

  // Get live checkout link for subscription
  getCheckoutLink(plan: 'basic' | 'premium', userId: number): string {
    const checkoutLink = LIVE_CHECKOUT_LINKS[plan];
    if (!checkoutLink) {
      throw new Error('Invalid plan selected');
    }

    console.log(`🔗 Directing user ${userId} to live Square checkout for ${plan} plan: ${checkoutLink}`);
    return checkoutLink;
  }

  // Get subscription plan info
  getPlanInfo(plan: 'basic' | 'premium') {
    return {
      ...PRICING_TIERS[plan],
      checkoutLink: LIVE_CHECKOUT_LINKS[plan],
      isLive: true
    };
  }

  // Get all available plans with live checkout links
  getAllPlans() {
    return {
      basic: this.getPlanInfo('basic'),
      premium: this.getPlanInfo('premium')
    };
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