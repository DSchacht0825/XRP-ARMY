import React, { useState, useEffect } from 'react';
import io, { Socket } from 'socket.io-client';
import PaymentModal from './PaymentModal';
import '../styles/Auth.css';

interface AuthProps {
  onAuthSuccess: (user: any) => void;
}

const Auth: React.FC<AuthProps> = ({ onAuthSuccess }) => {
  const [mode, setMode] = useState<'signin' | 'signup' | 'plan'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [username, setUsername] = useState('');
  const [selectedPlan, setSelectedPlan] = useState<'free' | 'premium' | 'elite'>('free');
  const [errors, setErrors] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  
  // Live XRP Preview Data
  const [livePrice, setLivePrice] = useState<number>(0.5234);
  const [priceChange, setPriceChange] = useState<number>(0);
  const [priceChangePercent, setPriceChangePercent] = useState<number>(0);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<string>('Connecting...');
  const [volume24h, setVolume24h] = useState<string>('$2.1B');

  const plans = [
    {
      id: 'free',
      name: 'XRP Soldier',
      price: '$0',
      period: 'Forever',
      features: [
        '✅ Real-time XRP price charts',
        '✅ Basic technical indicators',
        '✅ 1-hour delayed signals',
        '✅ Community chat access',
        '❌ AI Trading Signals',
        '❌ Advanced indicators',
        '❌ Price alerts',
        '❌ Portfolio tracking'
      ],
      badge: 'FREE',
      color: '#6b7280'
    },
    {
      id: 'premium',
      name: 'XRP Lieutenant',
      price: '$20',
      period: '/month',
      features: [
        '✅ Everything in Soldier',
        '✅ Real-time AI signals',
        '✅ Advanced indicators',
        '✅ Unlimited price alerts',
        '✅ Portfolio tracking',
        '✅ Priority support',
        '✅ Backtesting tools',
        '❌ API access'
      ],
      badge: 'POPULAR',
      color: '#00AAE4',
      popular: true
    },
    {
      id: 'elite',
      name: 'XRP General',
      price: '$49',
      period: '/month',
      features: [
        '✅ Everything in Lieutenant',
        '✅ API access',
        '✅ Custom indicators',
        '✅ Whale alerts',
        '✅ 1-on-1 strategy sessions',
        '✅ Early access features',
        '✅ White-label options',
        '✅ Institutional tools'
      ],
      badge: 'ELITE',
      color: '#fbbf24'
    }
  ];

  // WebSocket connection for live XRP preview
  useEffect(() => {
    const newSocket = io('http://localhost:5001', {
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    newSocket.on('connect', () => {
      console.log('Preview: Connected to server for live XRP data');
      setConnectionStatus('Connected');
      newSocket.emit('subscribe', 'XRPUSD', '1M');
    });

    newSocket.on('disconnect', () => {
      setConnectionStatus('Disconnected');
    });

    newSocket.on('historicalData', (data: { symbol: string; data: any[] }) => {
      if (data.symbol === 'XRPUSD' && data.data.length > 0) {
        const latest = data.data[data.data.length - 1];
        const previous = data.data[data.data.length - 2];
        
        setLivePrice(latest.close);
        
        if (previous) {
          const change = latest.close - previous.close;
          const changePercent = (change / previous.close) * 100;
          setPriceChange(change);
          setPriceChangePercent(changePercent);
        }
      }
    });

    newSocket.on('candleUpdate', (update: { symbol: string; data: any; isFinal: boolean }) => {
      if (update.symbol === 'XRPUSD') {
        const previousPrice = livePrice;
        setLivePrice(update.data.close);
        
        if (previousPrice > 0) {
          const change = update.data.close - previousPrice;
          const changePercent = (change / previousPrice) * 100;
          setPriceChange(change);
          setPriceChangePercent(changePercent);
        }
      }
    });

    setSocket(newSocket);

    return () => {
      if (newSocket) {
        newSocket.close();
      }
    };
  }, []);

  const validateEmail = (email: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors([]);
    setLoading(true);

    // Validation
    const newErrors = [];
    if (!email) newErrors.push('Email is required');
    if (!validateEmail(email)) newErrors.push('Invalid email format');
    if (!password) newErrors.push('Password is required');

    if (newErrors.length > 0) {
      setErrors(newErrors);
      setLoading(false);
      return;
    }

    try {
      // Import API service dynamically to avoid circular dependencies
      const ApiService = (await import('../services/api')).default;
      const response = await ApiService.signin(email, password);
      
      if (response.success && response.data) {
        console.log('✅ Login successful:', response.message);
        onAuthSuccess(response.data.user);
      } else {
        setErrors([response.error || 'Login failed']);
      }
    } catch (error: any) {
      console.error('❌ Login error:', error);
      setErrors(['Network error. Please try again.']);
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors([]);
    setLoading(true);

    // Validation
    const newErrors = [];
    if (!username) newErrors.push('Username is required');
    if (username.length < 3) newErrors.push('Username must be at least 3 characters');
    if (!email) newErrors.push('Email is required');
    if (!validateEmail(email)) newErrors.push('Invalid email format');
    if (!password) newErrors.push('Password is required');
    if (password.length < 8) newErrors.push('Password must be at least 8 characters');
    if (password !== confirmPassword) newErrors.push('Passwords do not match');

    if (newErrors.length > 0) {
      setErrors(newErrors);
      setLoading(false);
      return;
    }

    // Move to plan selection
    setTimeout(() => {
      setMode('plan');
      setLoading(false);
    }, 1000);
  };

  const handlePlanSelection = async () => {
    // For paid plans, show payment modal
    if (selectedPlan !== 'free') {
      setShowPaymentModal(true);
      return;
    }
    
    // For free plan, proceed with signup
    setLoading(true);
    
    try {
      // Import API service dynamically
      const ApiService = (await import('../services/api')).default;
      const response = await ApiService.signup(username, email, password, selectedPlan);
      
      if (response.success && response.data) {
        console.log('✅ Signup successful:', response.message);
        onAuthSuccess(response.data.user);
      } else {
        setErrors([response.error || 'Signup failed']);
      }
    } catch (error: any) {
      console.error('❌ Signup error:', error);
      setErrors(['Network error. Please try again.']);
    } finally {
      setLoading(false);
    }
  };

  const handlePaymentSuccess = async () => {
    // After successful payment, complete the signup
    setLoading(true);
    
    try {
      const ApiService = (await import('../services/api')).default;
      const response = await ApiService.signup(username, email, password, selectedPlan);
      
      if (response.success && response.data) {
        console.log('✅ Signup with payment successful');
        alert(`🚀 Welcome to XRP ${selectedPlan === 'premium' ? 'Lieutenant' : 'General'}!`);
        onAuthSuccess(response.data.user);
      } else {
        setErrors([response.error || 'Signup failed']);
      }
    } catch (error: any) {
      console.error('❌ Signup error:', error);
      setErrors(['Network error. Please try again.']);
    } finally {
      setLoading(false);
      setShowPaymentModal(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-wrapper">
        <div className="auth-header">
          <h1 className="auth-logo">
            <span className="xrp-icon">🚀</span>
            XRP TERMINAL
          </h1>
          <p className="auth-tagline">Join the XRP Army Trading Revolution</p>
        </div>

        {/* Live XRP Preview Chart */}
        <div className="xrp-preview-section">
          <div className="preview-header">
            <h3>🚀 Live XRP Performance</h3>
            <div className={`connection-indicator ${connectionStatus === 'Connected' ? 'connected' : 'disconnected'}`}>
              <div className="connection-dot"></div>
              Real-time
            </div>
          </div>
          
          <div className="xrp-price-preview">
            <div className="price-main">
              <span className="symbol">XRP/USD</span>
              <span className="price">${livePrice.toFixed(4)}</span>
              <div className={`price-change ${priceChangePercent >= 0 ? 'positive' : 'negative'}`}>
                <span className="change-amount">
                  {priceChangePercent >= 0 ? '+' : ''}{priceChange.toFixed(4)}
                </span>
                <span className="change-percent">
                  ({priceChangePercent >= 0 ? '+' : ''}{priceChangePercent.toFixed(2)}%)
                </span>
              </div>
            </div>
            
            <div className="market-stats">
              <div className="stat">
                <span className="label">24h Volume</span>
                <span className="value">{volume24h}</span>
              </div>
              <div className="stat">
                <span className="label">Market Cap</span>
                <span className="value">$28.5B</span>
              </div>
              <div className="stat">
                <span className="label">XRP Army</span>
                <span className="value">1.2M+</span>
              </div>
            </div>
          </div>
          
          <div className="preview-cta">
            <p>📈 See advanced charts, AI signals, and join the XRP Army!</p>
            <div className="cta-badges">
              <span className="badge">Real-time Data</span>
              <span className="badge">AI Signals</span>
              <span className="badge">XRP Community</span>
            </div>
          </div>
        </div>

        {mode === 'signin' && (
          <div className="auth-box">
            <h2>Welcome Back, Soldier!</h2>
            <form onSubmit={handleSignIn} className="auth-form">
              <div className="form-group">
                <label>Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="xrp.soldier@army.com"
                  className="auth-input"
                />
              </div>
              
              <div className="form-group">
                <label>Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="auth-input"
                />
              </div>

              {errors.length > 0 && (
                <div className="auth-errors">
                  {errors.map((error, i) => (
                    <p key={i} className="error-message">{error}</p>
                  ))}
                </div>
              )}

              <button type="submit" className="auth-button primary" disabled={loading}>
                {loading ? (
                  <span className="loading-spinner">⌛</span>
                ) : (
                  'Sign In to XRP Terminal'
                )}
              </button>

              <div className="auth-divider">
                <span>New to XRP Army?</span>
              </div>

              <button
                type="button"
                className="auth-button secondary"
                onClick={() => {
                  setMode('signup');
                  setErrors([]);
                }}
              >
                Join the XRP Army →
              </button>
            </form>

            <div className="auth-footer">
              <a href="#" className="auth-link">Forgot password?</a>
            </div>
          </div>
        )}

        {mode === 'signup' && (
          <div className="auth-box">
            <h2>Join the XRP Army!</h2>
            <form onSubmit={handleSignUp} className="auth-form">
              <div className="form-group">
                <label>Username</label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="XRPWarrior"
                  className="auth-input"
                />
              </div>

              <div className="form-group">
                <label>Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your.email@xrparmy.com"
                  className="auth-input"
                />
              </div>
              
              <div className="form-group">
                <label>Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Minimum 8 characters"
                  className="auth-input"
                />
              </div>

              <div className="form-group">
                <label>Confirm Password</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter password"
                  className="auth-input"
                />
              </div>

              {errors.length > 0 && (
                <div className="auth-errors">
                  {errors.map((error, i) => (
                    <p key={i} className="error-message">{error}</p>
                  ))}
                </div>
              )}

              <button type="submit" className="auth-button primary" disabled={loading}>
                {loading ? (
                  <span className="loading-spinner">⌛</span>
                ) : (
                  'Create XRP Terminal Account'
                )}
              </button>

              <div className="auth-divider">
                <span>Already in the Army?</span>
              </div>

              <button
                type="button"
                className="auth-button secondary"
                onClick={() => {
                  setMode('signin');
                  setErrors([]);
                }}
              >
                Sign In →
              </button>
            </form>

            <div className="auth-terms">
              By signing up, you agree to our <a href="#">Terms</a> and <a href="#">Privacy Policy</a>
            </div>
          </div>
        )}

        {mode === 'plan' && (
          <div className="plan-selection">
            <h2>Choose Your XRP Army Rank</h2>
            <p className="plan-subtitle">Choose your plan to get started</p>
            
            <div className="plans-grid">
              {plans.map((plan) => (
                <div
                  key={plan.id}
                  className={`plan-card ${selectedPlan === plan.id ? 'selected' : ''} ${plan.popular ? 'popular' : ''}`}
                  onClick={() => setSelectedPlan(plan.id as any)}
                  style={{ borderColor: selectedPlan === plan.id ? plan.color : 'transparent' }}
                >
                  {plan.popular && (
                    <div className="popular-badge">MOST POPULAR</div>
                  )}
                  
                  <div className="plan-header">
                    <h3 className="plan-name">{plan.name}</h3>
                    <div className="plan-badge" style={{ background: plan.color }}>
                      {plan.badge}
                    </div>
                  </div>
                  
                  <div className="plan-price">
                    <span className="price-amount">{plan.price}</span>
                    <span className="price-period">{plan.period}</span>
                  </div>
                  
                  <ul className="plan-features">
                    {plan.features.map((feature, i) => (
                      <li key={i} className={feature.startsWith('❌') ? 'disabled' : ''}>
                        {feature}
                      </li>
                    ))}
                  </ul>
                  
                  <button
                    className={`select-plan-btn ${selectedPlan === plan.id ? 'selected' : ''}`}
                    style={{ background: selectedPlan === plan.id ? plan.color : '' }}
                  >
                    {selectedPlan === plan.id ? '✓ Selected' : 'Select Plan'}
                  </button>
                </div>
              ))}
            </div>

            <div className="plan-actions">
              <button
                className="auth-button primary large"
                onClick={handlePlanSelection}
                disabled={loading}
              >
                {loading ? (
                  <span className="loading-spinner">⌛</span>
                ) : (
                  <>
                    {selectedPlan === 'free' ? 'Start Free Forever' : 'Continue to Payment'}
                    <span className="button-arrow">→</span>
                  </>
                )}
              </button>
              
              <button
                className="auth-button ghost"
                onClick={() => setMode('signup')}
              >
                ← Back
              </button>
            </div>

            <div className="security-badges">
              <span>🔒 256-bit SSL</span>
              <span>🛡️ Bank-level security</span>
              <span>💳 Secure payments</span>
            </div>
          </div>
        )}

        <div className="auth-benefits">
          <div className="benefit">
            <span className="benefit-icon">📈</span>
            <span>Real-time XRP data</span>
          </div>
          <div className="benefit">
            <span className="benefit-icon">🤖</span>
            <span>AI-powered signals</span>
          </div>
          <div className="benefit">
            <span className="benefit-icon">💎</span>
            <span>Join 50K+ XRP Army</span>
          </div>
        </div>
      </div>
      
      {/* Payment Modal */}
      <PaymentModal
        isOpen={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        planId={selectedPlan as 'premium' | 'elite'}
        userEmail={email}
        onSuccess={handlePaymentSuccess}
      />
    </div>
  );
};

export default Auth;