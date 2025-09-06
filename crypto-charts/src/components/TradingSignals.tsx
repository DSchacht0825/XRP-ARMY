import React, { useState, useEffect } from 'react';
import { TradingSignal, SignalStats } from '../types/signals';
import { AISignalGenerator } from '../utils/aiSignalGenerator';

interface TradingSignalsProps {
  currentPrices: { [symbol: string]: number };
  marketData: { [symbol: string]: any[] };
  isPremium?: boolean;
  userPlan?: string;
}

const TradingSignals: React.FC<TradingSignalsProps> = ({ currentPrices, marketData, isPremium = false, userPlan = 'free' }) => {
  const [signals, setSignals] = useState<TradingSignal[]>([]);
  const [stats, setStats] = useState<SignalStats | null>(null);
  const [activeTab, setActiveTab] = useState<'all' | 'buy' | 'sell' | 'active'>('all');
  const [selectedSymbol, setSelectedSymbol] = useState<string>('all');
  const [showPremiumModal, setShowPremiumModal] = useState(false);
  const [signalPerformance, setSignalPerformance] = useState<any[]>([]);
  const [sortBy, setSortBy] = useState<'newest' | 'confidence' | 'performance'>('newest');
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);

  useEffect(() => {
    // Generate initial signals
    if (Object.keys(marketData).length > 0) {
      AISignalGenerator.generateSignalsForMarket(marketData);
      loadSignals();
    }

    // Update signals every 5 minutes
    const interval = setInterval(() => {
      if (Object.keys(marketData).length > 0) {
        AISignalGenerator.generateSignalsForMarket(marketData);
        loadSignals();
      }
    }, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, [marketData]);

  const loadSignals = () => {
    const allSignals = AISignalGenerator.getSignals();
    const signalStats = AISignalGenerator.getSignalStats();
    
    setSignals(allSignals);
    setStats(signalStats);
  };

  const filteredSignals = signals.filter(signal => {
    if (selectedSymbol !== 'all' && signal.symbol !== selectedSymbol) return false;
    
    switch (activeTab) {
      case 'buy': return signal.type === 'buy';
      case 'sell': return signal.type === 'sell';
      case 'active': return !signal.expiresAt || signal.expiresAt > Date.now();
      default: return true;
    }
  });

  // Sort signals
  const sortedSignals = [...filteredSignals].sort((a, b) => {
    switch (sortBy) {
      case 'confidence':
        return b.confidence - a.confidence;
      case 'performance':
        return b.technicalScore - a.technicalScore;
      case 'newest':
      default:
        return b.timestamp - a.timestamp;
    }
  });

  const formatPrice = (price: number, symbol: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: symbol === 'XRPUSD' ? 4 : 2,
      maximumFractionDigits: symbol === 'XRPUSD' ? 4 : 2,
    }).format(price);
  };

  const formatTimeAgo = (timestamp: number) => {
    const minutes = Math.floor((Date.now() - timestamp) / (1000 * 60));
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  const getSignalColor = (type: string, strength: string) => {
    const baseColor = type === 'buy' ? '#10b981' : type === 'sell' ? '#ef4444' : '#6b7280';
    const opacity = strength === 'very_strong' ? 1 : strength === 'strong' ? 0.8 : strength === 'medium' ? 0.6 : 0.4;
    return `${baseColor}${Math.round(opacity * 255).toString(16).padStart(2, '0')}`;
  };

  const getStrengthIcon = (strength: string) => {
    switch (strength) {
      case 'very_strong': return '🔥🔥🔥';
      case 'strong': return '🔥🔥';
      case 'medium': return '🔥';
      case 'weak': return '💡';
      default: return '❓';
    }
  };

  if (showSuccessMessage) {
    return (
      <div className="trading-signals-container">
        <div className="success-message">
          <div className="success-content">
            <h2>🎉 Welcome to AI Signals!</h2>
            <p>Your subscription has started successfully</p>
            <div className="success-animation">
              <div className="checkmark">✓</div>
            </div>
            <p>Redirecting you to your premium dashboard...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!isPremium) {
    return (
      <div className="trading-signals-container">
        <div className="premium-paywall">
          <div className="paywall-header">
            <h2>🤖 AI Trading Signals</h2>
            <div className="premium-badge">PREMIUM FEATURE</div>
          </div>
          
          <div className="paywall-content">
            <div className="feature-preview">
              <div className="mock-signals-container">
                <div className="mock-signal">
                  <div className="signal-header">
                    <span className="signal-symbol">BTCUSD</span>
                    <span className="signal-type buy">BUY 🔥🔥🔥</span>
                    <span className="signal-confidence">92% Confidence</span>
                    <span className="signal-time">2m ago</span>
                  </div>
                  <div className="signal-price">Entry: $45,250 | TP: $47,800 | SL: $43,900 | R/R: 1:1.8</div>
                  <div className="signal-reason">🤖 RSI oversold + MACD bullish crossover + strong volume</div>
                </div>

                <div className="mock-signal">
                  <div className="signal-header">
                    <span className="signal-symbol">ETHUSD</span>
                    <span className="signal-type sell">SELL 🔥🔥</span>
                    <span className="signal-confidence">84% Confidence</span>
                    <span className="signal-time">5m ago</span>
                  </div>
                  <div className="signal-price">Entry: $3,150 | TP: $3,050 | SL: $3,220 | R/R: 1:1.4</div>
                  <div className="signal-reason">🤖 Resistance rejection + bearish divergence detected</div>
                </div>

                <div className="mock-signal">
                  <div className="signal-header">
                    <span className="signal-symbol">XRPUSD</span>
                    <span className="signal-type buy">BUY 🔥</span>
                    <span className="signal-confidence">78% Confidence</span>
                    <span className="signal-time">12m ago</span>
                  </div>
                  <div className="signal-price">Entry: $0.6520 | TP: $0.6780 | SL: $0.6350 | R/R: 1:1.5</div>
                  <div className="signal-reason">🤖 Support bounce + volume spike confirmation</div>
                </div>
              </div>
              
              <div className="blur-overlay">
                <div className="unlock-message">
                  <h3>📚 Educational Trading Analysis</h3>
                  <p>AI-powered analysis and educational trading insights for XRP market trends</p>
                  <div className="ai-features">
                    <div className="feature">🤖 <strong>AI-Powered</strong> Analysis</div>
                    <div className="feature">📊 <strong>Technical</strong> Indicators</div>
                    <div className="feature">⚡ <strong>Real-Time</strong> Signals</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="premium-features">
              <h3>What You Get:</h3>
              <div className="features-grid">
                <div className="feature-item">
                  <span className="feature-icon">🤖</span>
                  <div>
                    <h4>AI Analysis</h4>
                    <p>Advanced machine learning models analyzing 50+ indicators</p>
                  </div>
                </div>
                <div className="feature-item">
                  <span className="feature-icon">📊</span>
                  <div>
                    <h4>Real-Time Signals</h4>
                    <p>Live buy/sell signals with entry, stop loss, and take profit levels</p>
                  </div>
                </div>
                <div className="feature-item">
                  <span className="feature-icon">🎯</span>
                  <div>
                    <h4>70%+ Accuracy</h4>
                    <p>Historically proven performance with detailed analytics</p>
                  </div>
                </div>
                <div className="feature-item">
                  <span className="feature-icon">📱</span>
                  <div>
                    <h4>Instant Alerts</h4>
                    <p>Push notifications for new signals and price targets</p>
                  </div>
                </div>
                <div className="feature-item">
                  <span className="feature-icon">📈</span>
                  <div>
                    <h4>Risk Management</h4>
                    <p>Calculated risk/reward ratios and position sizing recommendations</p>
                  </div>
                </div>
                <div className="feature-item">
                  <span className="feature-icon">🏆</span>
                  <div>
                    <h4>Performance Tracking</h4>
                    <p>Track signal performance and your trading statistics</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="pricing-section">
              <h3>Choose Your Plan:</h3>
              <div className="pricing-cards">
                <div className="pricing-card">
                  <h4>Monthly</h4>
                  <div className="price">$49<span>/month</span></div>
                  <button className="upgrade-btn">Upgrade to Premium</button>
                </div>
                <div className="pricing-card popular">
                  <div className="popular-badge">MOST POPULAR</div>
                  <h4>Yearly</h4>
                  <div className="price">$39<span>/month</span></div>
                  <div className="savings">Save $120/year</div>
                  <button className="upgrade-btn primary">Upgrade to Premium</button>
                </div>
                <div className="pricing-card">
                  <h4>Lifetime</h4>
                  <div className="price">$499<span>one-time</span></div>
                  <button className="upgrade-btn">Get Lifetime Access</button>
                </div>
              </div>
            </div>

            <div className="trial-notice">
              <p>💎 <strong>Instant access</strong> - Cancel anytime</p>
              <div className="cta-buttons">
                <button 
                  className="demo-btn primary"
                  onClick={async () => {
                    try {
                      const ApiService = (await import('../services/api')).default;
                      const response = await ApiService.upgradeToPremium('premium');
                      
                      if (response.success) {
                        setShowSuccessMessage(true);
                        setTimeout(() => {
                          setShowSuccessMessage(false);
                          setShowPremiumModal(false);
                          window.location.reload(); // Refresh to show premium features
                        }, 2000);
                      } else {
                        alert(`❌ Upgrade failed: ${response.error}`);
                      }
                    } catch (error) {
                      console.error('❌ Upgrade error:', error);
                      alert('❌ Network error. Please try again.');
                    }
                  }}
                >
                  🚀 Upgrade to Premium
                </button>
                <button 
                  className="demo-btn secondary"
                  onClick={() => {
                    setShowPremiumModal(false);
                  }}
                >
                  💎 Continue with Free Plan
                </button>
              </div>
              
              <div className="disclaimer-section">
                <h4>⚠️ Trading Risk Disclaimer</h4>
                <p><strong>Not Financial Advice:</strong> All content is for educational purposes only. Consult a financial advisor before making investment decisions.</p>
                <p><strong>Risk Warning:</strong> Trading cryptocurrencies involves substantial risk and may result in significant losses.</p>
                <p><strong>No Guarantees:</strong> Past performance does not indicate future results. Use at your own risk.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="trading-signals-container">
      {/* Premium Header */}
      <div className="premium-header">
        <div className="premium-status">
          <span className="premium-badge active">✨ PREMIUM ACTIVE</span>
          <span className="subscription-info">Premium Active</span>
        </div>
        <div className="premium-features-active">
          <span>🤖 AI Signals</span>
          <span>📊 Advanced Analytics</span>
          <span>⚡ Real-time Updates</span>
        </div>
      </div>

      {/* Signal Stats */}
      {stats && (
        <div className="signal-stats">
          <div className="stat-card">
            <div className="stat-value">{stats.totalSignals}</div>
            <div className="stat-label">Total Signals</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{stats.activeSignals}</div>
            <div className="stat-label">Active</div>
          </div>
          <div className="stat-card disclaimer-card">
            <div className="disclaimer-icon">⚠️</div>
            <div className="disclaimer-text">Educational Only</div>
          </div>
          <div className="stat-card disclaimer-card">
            <div className="disclaimer-icon">📈</div>
            <div className="disclaimer-text">Past ≠ Future</div>
          </div>
          <div className="stat-card disclaimer-card">
            <div className="disclaimer-icon">⚡</div>
            <div className="disclaimer-text">High Risk</div>
          </div>
        </div>
      )}

      {/* Filter Controls */}
      <div className="signal-controls">
        <div className="signal-tabs">
          <button 
            className={`tab ${activeTab === 'all' ? 'active' : ''}`}
            onClick={() => setActiveTab('all')}
          >
            All Signals ({signals.length})
          </button>
          <button 
            className={`tab ${activeTab === 'buy' ? 'active' : ''}`}
            onClick={() => setActiveTab('buy')}
          >
            🟢 Buy ({signals.filter(s => s.type === 'buy').length})
          </button>
          <button 
            className={`tab ${activeTab === 'sell' ? 'active' : ''}`}
            onClick={() => setActiveTab('sell')}
          >
            🔴 Sell ({signals.filter(s => s.type === 'sell').length})
          </button>
          <button 
            className={`tab ${activeTab === 'active' ? 'active' : ''}`}
            onClick={() => setActiveTab('active')}
          >
            ⚡ Active ({signals.filter(s => !s.expiresAt || s.expiresAt > Date.now()).length})
          </button>
        </div>

        <div className="signal-filters">
          <div className="symbol-filter">
            <select 
              value={selectedSymbol} 
              onChange={(e) => setSelectedSymbol(e.target.value)}
            >
              <option value="all">All Symbols</option>
              <option value="BTCUSD">Bitcoin (BTC)</option>
              <option value="ETHUSD">Ethereum (ETH)</option>
              <option value="XRPUSD">Ripple (XRP)</option>
            </select>
          </div>
          
          <div className="sort-filter">
            <select 
              value={sortBy} 
              onChange={(e) => setSortBy(e.target.value as any)}
            >
              <option value="newest">Sort by Newest</option>
              <option value="confidence">Sort by Confidence</option>
              <option value="performance">Sort by Performance</option>
            </select>
          </div>
        </div>
      </div>

      {/* Signal List */}
      <div className="signals-list">
        {filteredSignals.length === 0 ? (
          <div className="empty-signals">
            <h3>No signals available</h3>
            <p>AI is analyzing market conditions. New signals will appear soon.</p>
          </div>
        ) : (
          sortedSignals.map(signal => (
            <div key={signal.id} className="signal-card">
              <div className="signal-header">
                <div className="signal-symbol">{signal.symbol}</div>
                <div className={`signal-type ${signal.type}`}>
                  {signal.type.toUpperCase()} {getStrengthIcon(signal.strength)}
                </div>
                <div className="signal-confidence">
                  {signal.confidence}% Confidence
                </div>
                <div className="signal-time">
                  {formatTimeAgo(signal.timestamp)}
                </div>
              </div>

              <div className="signal-content">
                <div className="signal-pricing">
                  <div className="price-info">
                    <span className="label">Entry:</span>
                    <span className="value">{formatPrice(signal.price, signal.symbol)}</span>
                  </div>
                  {signal.takeProfit && (
                    <div className="price-info">
                      <span className="label">TP:</span>
                      <span className="value positive">{formatPrice(signal.takeProfit, signal.symbol)}</span>
                    </div>
                  )}
                  {signal.stopLoss && (
                    <div className="price-info">
                      <span className="label">SL:</span>
                      <span className="value negative">{formatPrice(signal.stopLoss, signal.symbol)}</span>
                    </div>
                  )}
                  <div className="price-info">
                    <span className="label">R/R:</span>
                    <span className="value">1:{signal.riskReward}</span>
                  </div>
                </div>

                <div className="signal-analysis">
                  <div className="technical-scores">
                    <div className="score">
                      <span className="score-label">Technical:</span>
                      <span className={`score-value ${signal.technicalScore > 0 ? 'positive' : 'negative'}`}>
                        {signal.technicalScore > 0 ? '+' : ''}{signal.technicalScore}
                      </span>
                    </div>
                    <div className="score">
                      <span className="score-label">AI:</span>
                      <span className={`score-value ${signal.aiScore > 0 ? 'positive' : 'negative'}`}>
                        {signal.aiScore > 0 ? '+' : ''}{signal.aiScore}
                      </span>
                    </div>
                  </div>

                  <div className="indicators">
                    <div className="indicator">
                      <span>RSI: {signal.indicators.rsi.value.toFixed(1)}</span>
                      <span className={`signal-badge ${signal.indicators.rsi.signal}`}>
                        {signal.indicators.rsi.signal}
                      </span>
                    </div>
                    <div className="indicator">
                      <span>MACD:</span>
                      <span className={`signal-badge ${signal.indicators.macd.signal}`}>
                        {signal.indicators.macd.signal}
                      </span>
                    </div>
                    <div className="indicator">
                      <span>Trend:</span>
                      <span className={`signal-badge ${signal.indicators.sma.trend}`}>
                        {signal.indicators.sma.trend}
                      </span>
                    </div>
                  </div>
                </div>

                {signal.aiReasons.length > 0 && (
                  <div className="ai-reasoning">
                    <h4>AI Analysis:</h4>
                    <ul>
                      {signal.aiReasons.slice(0, 3).map((reason, index) => (
                        <li key={index}>{reason}</li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="signal-predictions">
                  <h4>Price Predictions:</h4>
                  <div className="predictions-grid">
                    <div className="prediction">
                      <span className="timeframe">{signal.predictions.shortTerm.timeframe}</span>
                      <span className="target">{formatPrice(signal.predictions.shortTerm.target, signal.symbol)}</span>
                      <span className="probability">{signal.predictions.shortTerm.probability}%</span>
                    </div>
                    <div className="prediction">
                      <span className="timeframe">{signal.predictions.mediumTerm.timeframe}</span>
                      <span className="target">{formatPrice(signal.predictions.mediumTerm.target, signal.symbol)}</span>
                      <span className="probability">{signal.predictions.mediumTerm.probability}%</span>
                    </div>
                  </div>
                </div>

                {signal.tags.length > 0 && (
                  <div className="signal-tags">
                    {signal.tags.map(tag => (
                      <span key={tag} className="tag">{tag}</span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default TradingSignals;