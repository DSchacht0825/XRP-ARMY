import crypto from 'crypto';
import axios from 'axios';

interface CoinbaseCredentials {
  apiKey: string;
  secret: string;
  passphrase: string;
  sandbox?: boolean;
}

interface CoinbaseAccount {
  id: string;
  currency: string;
  balance: string;
  available: string;
  hold: string;
  profile_id: string;
}

interface CoinbaseFill {
  trade_id: number;
  product_id: string;
  price: string;
  size: string;
  order_id: string;
  created_at: string;
  liquidity: string;
  fee: string;
  settled: boolean;
  side: 'buy' | 'sell';
}

export class CoinbaseExchangeAPI {
  private baseURL: string;
  private credentials: CoinbaseCredentials;

  constructor(credentials: CoinbaseCredentials) {
    this.credentials = credentials;
    this.baseURL = credentials.sandbox 
      ? 'https://api-public.sandbox.exchange.coinbase.com'
      : 'https://api.exchange.coinbase.com';
  }

  private generateSignature(method: string, path: string, body: string = ''): {
    'CB-ACCESS-KEY': string;
    'CB-ACCESS-SIGN': string;
    'CB-ACCESS-TIMESTAMP': string;
    'CB-ACCESS-PASSPHRASE': string;
  } {
    const timestamp = Date.now() / 1000;
    const message = timestamp + method.toUpperCase() + path + body;
    const key = Buffer.from(this.credentials.secret, 'base64');
    const hmac = crypto.createHmac('sha256', key);
    const signature = hmac.update(message).digest('base64');

    return {
      'CB-ACCESS-KEY': this.credentials.apiKey,
      'CB-ACCESS-SIGN': signature,
      'CB-ACCESS-TIMESTAMP': timestamp.toString(),
      'CB-ACCESS-PASSPHRASE': this.credentials.passphrase,
    };
  }

  private async makeRequest(method: string, endpoint: string, body?: any): Promise<any> {
    const path = endpoint;
    const bodyString = body ? JSON.stringify(body) : '';
    const headers = {
      ...this.generateSignature(method, path, bodyString),
      'Content-Type': 'application/json',
    };

    try {
      const response = await axios({
        method,
        url: `${this.baseURL}${endpoint}`,
        headers,
        data: body,
        timeout: 30000,
      });

      return response.data;
    } catch (error: any) {
      console.error('Coinbase API Error:', error.response?.data || error.message);
      throw new Error(`Coinbase API Error: ${error.response?.data?.message || error.message}`);
    }
  }

  async testConnection(): Promise<boolean> {
    try {
      await this.getAccounts();
      return true;
    } catch (error) {
      console.error('Coinbase connection test failed:', error);
      return false;
    }
  }

  async getAccounts(): Promise<CoinbaseAccount[]> {
    return await this.makeRequest('GET', '/accounts');
  }

  async getFills(productId?: string, limit: number = 100): Promise<CoinbaseFill[]> {
    let endpoint = `/fills?limit=${limit}`;
    if (productId) {
      endpoint += `&product_id=${productId}`;
    }
    
    return await this.makeRequest('GET', endpoint);
  }

  async getXRPData(): Promise<{
    balances: Array<{ currency: string; balance: number; available: number }>;
    trades: Array<{
      id: string;
      symbol: string;
      side: 'buy' | 'sell';
      amount: number;
      price: number;
      timestamp: string;
      fee: { cost: number; currency: string };
    }>;
  }> {
    try {
      // Get account balances
      const accounts = await this.getAccounts();
      const balances = accounts
        .filter(account => parseFloat(account.balance) > 0)
        .map(account => ({
          currency: account.currency,
          balance: parseFloat(account.balance),
          available: parseFloat(account.available),
        }));

      // Get XRP trades (fills)
      const fills = await this.getFills('XRP-USD');
      const trades = fills.map(fill => ({
        id: fill.trade_id.toString(),
        symbol: 'XRPUSD',
        side: fill.side,
        amount: parseFloat(fill.size),
        price: parseFloat(fill.price),
        timestamp: fill.created_at,
        fee: {
          cost: parseFloat(fill.fee),
          currency: 'USD'
        }
      }));

      return { balances, trades };
    } catch (error) {
      console.error('Error fetching Coinbase XRP data:', error);
      throw error;
    }
  }
}

export default CoinbaseExchangeAPI;