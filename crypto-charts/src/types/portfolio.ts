export interface Transaction {
  id: string;
  symbol: string;
  type: 'buy' | 'sell';
  amount: number;
  price: number;
  timestamp: number;
  fees?: number;
}

export interface Holding {
  symbol: string;
  totalAmount: number;
  averageCost: number;
  totalCost: number;
  currentPrice: number;
  currentValue: number;
  unrealizedPnL: number;
  unrealizedPnLPercent: number;
  allocation: number; // percentage of total portfolio
}

export interface Portfolio {
  totalValue: number;
  totalCost: number;
  totalPnL: number;
  totalPnLPercent: number;
  holdings: Holding[];
  transactions: Transaction[];
}

export interface PortfolioSummary {
  totalBalance: number;
  dailyChange: number;
  dailyChangePercent: number;
  topGainer: { symbol: string; change: number };
  topLoser: { symbol: string; change: number };
  diversificationScore: number;
}