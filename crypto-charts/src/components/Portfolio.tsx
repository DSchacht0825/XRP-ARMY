import React, { useState, useEffect } from 'react';
import { Portfolio as PortfolioType, PortfolioSummary, Transaction } from '../types/portfolio';
import { PortfolioCalculator } from '../utils/portfolioCalculations';
import ExchangeConnection from './ExchangeConnection';
import axios from 'axios';

interface PortfolioProps {
  currentPrices: { [symbol: string]: number };
}

const Portfolio: React.FC<PortfolioProps> = ({ currentPrices }) => {
  const [portfolio, setPortfolio] = useState<PortfolioType | null>(null);
  const [summary, setSummary] = useState<PortfolioSummary | null>(null);
  const [showAddTransaction, setShowAddTransaction] = useState(false);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isExchangeConnected, setIsExchangeConnected] = useState(false);
  const [connectedExchange, setConnectedExchange] = useState<string | null>(null);
  const [syncLoading, setSyncLoading] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);

  const userId = 'demo-user'; // In production, get from auth context

  useEffect(() => {
    // Initialize with sample data
    const sampleTransactions = PortfolioCalculator.generateSampleTransactions();
    setTransactions(sampleTransactions);
  }, []);

  useEffect(() => {
    if (transactions.length > 0 && Object.keys(currentPrices).length > 0) {
      const holdings = PortfolioCalculator.calculateHoldings(transactions, currentPrices);
      const portfolioData = PortfolioCalculator.calculatePortfolio(holdings, transactions);
      const summaryData = PortfolioCalculator.calculatePortfolioSummary(portfolioData);
      
      setPortfolio(portfolioData);
      setSummary(summaryData);
    }
  }, [transactions, currentPrices]);

  const handleConnectionChange = (connected: boolean, exchangeName?: string) => {
    setIsExchangeConnected(connected);
    setConnectedExchange(exchangeName || null);
    
    if (connected) {
      syncFromExchange();
    } else {
      // Revert to sample data when disconnected
      const sampleTransactions = PortfolioCalculator.generateSampleTransactions();
      setTransactions(sampleTransactions);
      setLastSyncTime(null);
    }
  };

  const syncFromExchange = async () => {
    if (!isExchangeConnected) return;

    setSyncLoading(true);
    try {
      const response = await axios.post(`http://localhost:5001/api/exchange/sync/${userId}`);
      
      if (response.data.success) {
        const { balances, trades } = response.data.data;
        
        // Convert exchange trades to our transaction format
        const exchangeTransactions: Transaction[] = trades.map((trade: any) => ({
          id: trade.id,
          symbol: trade.symbol.replace('/', ''), // Convert ETH/USD to ETHUSD
          type: trade.side as 'buy' | 'sell',
          amount: trade.amount,
          price: trade.price,
          date: trade.timestamp,
          fee: trade.fee.cost || 0,
          notes: `${connectedExchange} - ${trade.side} order`,
        }));

        setTransactions(exchangeTransactions);
        setLastSyncTime(new Date());
        
        console.log(`Synced ${exchangeTransactions.length} transactions from ${connectedExchange}`);
        console.log(`Found ${balances.length} assets in your ${connectedExchange} account`);
      }
    } catch (error) {
      console.error('Failed to sync from exchange:', error);
      alert('Failed to sync portfolio from exchange');
    } finally {
      setSyncLoading(false);
    }
  };

  if (!portfolio || !summary) {
    return (
      <div className="portfolio-loading">
        <div className="loading-spinner"></div>
        <div className="loading-text">Loading Portfolio...</div>
      </div>
    );
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  const formatPercent = (percent: number) => {
    return `${percent >= 0 ? '+' : ''}${percent.toFixed(2)}%`;
  };

  return (
    <div className="portfolio-container">
      {/* Exchange Connection */}
      <ExchangeConnection onConnectionChange={handleConnectionChange} />

      {/* Sync Status */}
      {isExchangeConnected && (
        <div className="sync-status">
          <div className="sync-info">
            <span>🔄 Connected to {connectedExchange}</span>
            {lastSyncTime && (
              <span>Last sync: {lastSyncTime.toLocaleString()}</span>
            )}
          </div>
          <button 
            className="sync-btn"
            onClick={syncFromExchange}
            disabled={syncLoading}
          >
            {syncLoading ? '⏳ Syncing...' : '🔄 Sync Now'}
          </button>
        </div>
      )}

      {/* Portfolio Summary Cards */}
      <div className="portfolio-summary">
        <div className="summary-card main-balance">
          <div className="card-header">
            <h3>Total Portfolio Value</h3>
          </div>
          <div className="card-content">
            <div className="balance-amount">{formatCurrency(summary.totalBalance)}</div>
            <div className={`balance-change ${summary.dailyChangePercent >= 0 ? 'positive' : 'negative'}`}>
              {formatCurrency(summary.dailyChange)} ({formatPercent(summary.dailyChangePercent)})
            </div>
          </div>
        </div>

        <div className="summary-card">
          <div className="card-header">
            <h4>Top Performer</h4>
          </div>
          <div className="card-content">
            <div className="performer-symbol">{summary.topGainer.symbol}</div>
            <div className="performer-change positive">
              {formatPercent(summary.topGainer.change)}
            </div>
          </div>
        </div>

        <div className="summary-card">
          <div className="card-header">
            <h4>Underperformer</h4>
          </div>
          <div className="card-content">
            <div className="performer-symbol">{summary.topLoser.symbol}</div>
            <div className="performer-change negative">
              {formatPercent(summary.topLoser.change)}
            </div>
          </div>
        </div>

        <div className="summary-card">
          <div className="card-header">
            <h4>Diversification</h4>
          </div>
          <div className="card-content">
            <div className="diversification-score">{summary.diversificationScore}/10</div>
            <div className="diversification-label">
              {summary.diversificationScore >= 7 ? 'Well Diversified' : 
               summary.diversificationScore >= 4 ? 'Moderately Diversified' : 'High Risk'}
            </div>
          </div>
        </div>
      </div>

      {/* Holdings Table */}
      <div className="portfolio-holdings">
        <div className="holdings-header">
          <h3>Holdings</h3>
          <button 
            className="add-transaction-btn"
            onClick={() => setShowAddTransaction(true)}
          >
            + Add Transaction
          </button>
        </div>

        <div className="holdings-table">
          <div className="table-header">
            <div className="col-symbol">Asset</div>
            <div className="col-amount">Amount</div>
            <div className="col-price">Avg Cost</div>
            <div className="col-current">Current Price</div>
            <div className="col-value">Value</div>
            <div className="col-pnl">P&L</div>
            <div className="col-allocation">Allocation</div>
          </div>

          {portfolio.holdings.map((holding) => (
            <div key={holding.symbol} className="table-row">
              <div className="col-symbol">
                <span className="symbol-name">{holding.symbol}</span>
              </div>
              <div className="col-amount">
                {holding.totalAmount.toFixed(4)}
              </div>
              <div className="col-price">
                {formatCurrency(holding.averageCost)}
              </div>
              <div className="col-current">
                {formatCurrency(holding.currentPrice)}
              </div>
              <div className="col-value">
                {formatCurrency(holding.currentValue)}
              </div>
              <div className={`col-pnl ${holding.unrealizedPnL >= 0 ? 'positive' : 'negative'}`}>
                <div>{formatCurrency(holding.unrealizedPnL)}</div>
                <div className="pnl-percent">{formatPercent(holding.unrealizedPnLPercent)}</div>
              </div>
              <div className="col-allocation">
                <div className="allocation-bar">
                  <div 
                    className="allocation-fill"
                    style={{ width: `${holding.allocation}%` }}
                  ></div>
                </div>
                <span className="allocation-text">{holding.allocation.toFixed(1)}%</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Portfolio Allocation Chart */}
      <div className="portfolio-allocation">
        <h3>Portfolio Allocation</h3>
        <div className="allocation-chart">
          {portfolio.holdings.map((holding, index) => (
            <div 
              key={holding.symbol} 
              className="allocation-segment"
              style={{
                width: `${holding.allocation}%`,
                backgroundColor: `hsl(${(index * 137.5) % 360}, 70%, 50%)`
              }}
            >
              <span className="allocation-label">
                {holding.allocation > 10 ? `${holding.symbol} ${holding.allocation.toFixed(1)}%` : ''}
              </span>
            </div>
          ))}
        </div>
        <div className="allocation-legend">
          {portfolio.holdings.map((holding, index) => (
            <div key={holding.symbol} className="legend-item">
              <div 
                className="legend-color"
                style={{ backgroundColor: `hsl(${(index * 137.5) % 360}, 70%, 50%)` }}
              ></div>
              <span>{holding.symbol}: {holding.allocation.toFixed(1)}%</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Portfolio;