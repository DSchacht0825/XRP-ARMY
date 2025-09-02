import { Transaction, Holding, Portfolio, PortfolioSummary } from '../types/portfolio';

export class PortfolioCalculator {
  static calculateHoldings(transactions: Transaction[], currentPrices: { [symbol: string]: number }): Holding[] {
    const holdingsMap: { [symbol: string]: { amount: number; totalCost: number } } = {};
    
    // Process all transactions to calculate holdings
    transactions.forEach(transaction => {
      if (!holdingsMap[transaction.symbol]) {
        holdingsMap[transaction.symbol] = { amount: 0, totalCost: 0 };
      }
      
      const holding = holdingsMap[transaction.symbol];
      
      if (transaction.type === 'buy') {
        holding.amount += transaction.amount;
        holding.totalCost += (transaction.amount * transaction.price) + (transaction.fees || 0);
      } else if (transaction.type === 'sell') {
        const sellValue = transaction.amount * transaction.price - (transaction.fees || 0);
        const avgCost = holding.totalCost / holding.amount;
        
        holding.amount -= transaction.amount;
        holding.totalCost -= transaction.amount * avgCost;
        
        // If we sold everything, reset
        if (holding.amount <= 0) {
          holding.amount = 0;
          holding.totalCost = 0;
        }
      }
    });
    
    // Convert to Holding objects and calculate metrics
    return Object.entries(holdingsMap)
      .filter(([_, data]) => data.amount > 0)
      .map(([symbol, data]): Holding => {
        const currentPrice = currentPrices[symbol] || 0;
        const currentValue = data.amount * currentPrice;
        const averageCost = data.totalCost / data.amount;
        const unrealizedPnL = currentValue - data.totalCost;
        const unrealizedPnLPercent = (unrealizedPnL / data.totalCost) * 100;
        
        return {
          symbol,
          totalAmount: data.amount,
          averageCost,
          totalCost: data.totalCost,
          currentPrice,
          currentValue,
          unrealizedPnL,
          unrealizedPnLPercent,
          allocation: 0 // Will be calculated later
        };
      });
  }
  
  static calculatePortfolio(holdings: Holding[], transactions: Transaction[]): Portfolio {
    const totalValue = holdings.reduce((sum, holding) => sum + holding.currentValue, 0);
    const totalCost = holdings.reduce((sum, holding) => sum + holding.totalCost, 0);
    const totalPnL = totalValue - totalCost;
    const totalPnLPercent = totalCost > 0 ? (totalPnL / totalCost) * 100 : 0;
    
    // Calculate allocation percentages
    const holdingsWithAllocation = holdings.map(holding => ({
      ...holding,
      allocation: totalValue > 0 ? (holding.currentValue / totalValue) * 100 : 0
    }));
    
    return {
      totalValue,
      totalCost,
      totalPnL,
      totalPnLPercent,
      holdings: holdingsWithAllocation,
      transactions
    };
  }
  
  static calculatePortfolioSummary(portfolio: Portfolio): PortfolioSummary {
    const sortedByChange = [...portfolio.holdings].sort((a, b) => b.unrealizedPnLPercent - a.unrealizedPnLPercent);
    
    // Calculate diversification score (1-10, higher is more diversified)
    const concentrationRisk = Math.max(...portfolio.holdings.map(h => h.allocation));
    const diversificationScore = Math.max(1, 10 - (concentrationRisk / 10));
    
    return {
      totalBalance: portfolio.totalValue,
      dailyChange: portfolio.totalPnL, // Simplified - in real app would calculate 24h change
      dailyChangePercent: portfolio.totalPnLPercent,
      topGainer: {
        symbol: sortedByChange[0]?.symbol || '',
        change: sortedByChange[0]?.unrealizedPnLPercent || 0
      },
      topLoser: {
        symbol: sortedByChange[sortedByChange.length - 1]?.symbol || '',
        change: sortedByChange[sortedByChange.length - 1]?.unrealizedPnLPercent || 0
      },
      diversificationScore: Math.round(diversificationScore * 10) / 10
    };
  }
  
  static generateSampleTransactions(): Transaction[] {
    const now = Date.now();
    const day = 24 * 60 * 60 * 1000;
    
    return [
      {
        id: '1',
        symbol: 'BTCUSD',
        type: 'buy',
        amount: 0.5,
        price: 43000,
        timestamp: now - 30 * day,
        fees: 50
      },
      {
        id: '2',
        symbol: 'ETHUSD',
        type: 'buy',
        amount: 2.5,
        price: 2800,
        timestamp: now - 25 * day,
        fees: 25
      },
      {
        id: '3',
        symbol: 'XRPUSD',
        type: 'buy',
        amount: 1000,
        price: 0.62,
        timestamp: now - 20 * day,
        fees: 5
      },
      {
        id: '4',
        symbol: 'BTCUSD',
        type: 'buy',
        amount: 0.25,
        price: 41000,
        timestamp: now - 15 * day,
        fees: 30
      },
      {
        id: '5',
        symbol: 'ETHUSD',
        type: 'sell',
        amount: 0.5,
        price: 3100,
        timestamp: now - 10 * day,
        fees: 15
      }
    ];
  }
}