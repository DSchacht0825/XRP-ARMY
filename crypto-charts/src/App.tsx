import React, { useState, useEffect, useCallback } from 'react';
import io, { Socket } from 'socket.io-client';
import CandlestickChart from './components/CandlestickChart';
import Portfolio from './components/Portfolio';
import Alerts from './components/Alerts';
import TradingSignals from './components/TradingSignals';
import Auth from './components/Auth';
import './App.css';

interface CandleData {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
}

interface ChartData {
  [key: string]: CandleData[];
}

const App: React.FC = () => {
  const [user, setUser] = useState<any>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [activeView, setActiveView] = useState<string>('charts');
  const [activeTab, setActiveTab] = useState<string>('XRPUSD');
  const [chartData, setChartData] = useState<ChartData>({
    'XRPUSD': []
  });
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<string>('Connecting...');
  const [loading, setLoading] = useState<{ [key: string]: boolean }>({
    'XRPUSD': true
  });
  const [chartType, setChartType] = useState<string>('candlestick');
  const [timeframe, setTimeframe] = useState<string>('1m');
  const [historicalPeriod, setHistoricalPeriod] = useState<string>('1M');
  const [selectedIndicators, setSelectedIndicators] = useState<string[]>([]);
  const [showPatterns, setShowPatterns] = useState<boolean>(true);
  const [selectedPatterns, setSelectedPatterns] = useState<string[]>(['Bullish Engulfing', 'Bearish Engulfing']);

  const symbols = ['XRPUSD'];

  // Check for existing user session on mount
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const ApiService = (await import('./services/api')).default;
        const user = await ApiService.initializeAuth();
        
        if (user) {
          setUser(user);
          setIsAuthenticated(true);
          console.log('✅ Session restored for user:', user.username);
        } else {
          console.log('❌ No valid session found');
        }
      } catch (error) {
        console.error('❌ Auth initialization failed:', error);
      }
    };

    initializeAuth();
  }, []);

  const handleAuthSuccess = (userData: any) => {
    setUser(userData);
    setIsAuthenticated(true);
  };

  const handleLogout = async () => {
    try {
      const ApiService = (await import('./services/api')).default;
      await ApiService.logout();
      console.log('✅ Logged out successfully');
    } catch (error) {
      console.error('❌ Logout error:', error);
      // Clear local storage anyway
      localStorage.removeItem('xrp_auth_token');
      localStorage.removeItem('xrp_user');
    } finally {
      setUser(null);
      setIsAuthenticated(false);
    }
  };

  // WebSocket connection
  useEffect(() => {
    if (!isAuthenticated) return;
    const socketUrl = process.env.NODE_ENV === 'production' 
      ? 'https://xrp-army-production.up.railway.app'
      : 'http://localhost:5001';
    const newSocket = io(socketUrl, {
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    newSocket.on('connect', () => {
      console.log('Connected to server');
      setConnectionStatus('Connected');
      
      symbols.forEach(symbol => {
        newSocket.emit('subscribe', symbol, '1M'); // Default to 1 month on initial connect
      });
    });

    newSocket.on('disconnect', () => {
      console.log('Disconnected from server');
      setConnectionStatus('Disconnected');
    });

    newSocket.on('historicalData', (data: { symbol: string; data: CandleData[] }) => {
      console.log(`Received historical data for ${data.symbol}:`, data.data.length, 'candles');
      setChartData(prev => ({
        ...prev,
        [data.symbol]: data.data
      }));
      setLoading(prev => ({
        ...prev,
        [data.symbol]: false
      }));
    });

    newSocket.on('candleUpdate', (update: { symbol: string; data: CandleData; isFinal: boolean }) => {
      setChartData(prev => {
        const currentData = [...(prev[update.symbol] || [])];
        
        if (update.isFinal) {
          const existingIndex = currentData.findIndex(candle => candle.time === update.data.time);
          if (existingIndex >= 0) {
            currentData[existingIndex] = update.data;
          } else {
            currentData.push(update.data);
            if (currentData.length > 500) {
              currentData.shift();
            }
          }
        } else {
          const lastCandle = currentData[currentData.length - 1];
          if (lastCandle && lastCandle.time === update.data.time) {
            currentData[currentData.length - 1] = update.data;
          } else if (!lastCandle || lastCandle.time < update.data.time) {
            currentData.push(update.data);
          }
        }

        return {
          ...prev,
          [update.symbol]: currentData
        };
      });
    });

    newSocket.on('connect_error', (error) => {
      console.error('Connection error:', error);
      setConnectionStatus('Connection Error');
    });

    setSocket(newSocket);

    return () => {
      if (newSocket) {
        newSocket.close();
      }
    };
  }, [isAuthenticated]);

  // Handle historical period changes
  useEffect(() => {
    if (socket) {
      setLoading({
        'XRPUSD': true
      });
      
      symbols.forEach(symbol => {
        socket.emit('subscribe', symbol, historicalPeriod);
      });
    }
  }, [historicalPeriod, socket]);

  const handleTabChange = useCallback((symbol: string) => {
    setActiveTab(symbol);
  }, []);

  const getSymbolInfo = (symbol: string) => {
    const info: { [key: string]: { name: string; color: string } } = {
      'XRPUSD': { name: 'XRP', color: '#00AAE4' }
    };
    return info[symbol] || { name: symbol, color: '#00AAE4' };
  };

  // Show auth page if not authenticated
  if (!isAuthenticated) {
    return <Auth onAuthSuccess={handleAuthSuccess} />;
  }

  return (
    <div className="App">
      {/* XRP-Focused Branding Header */}
      <div className="causory-header xrp-focused">
        <div className="causory-brand">
          <h1 className="causory-logo">XRP TERMINAL</h1>
          <div className="xrp-badge">🚀</div>
        </div>
        <div className="causory-crypto-title">
          <h2>The Ultimate XRP Trading Platform</h2>
          <p className="xrp-tagline">
            {user?.plan === 'elite' ? '⭐ XRP General' : 
             user?.plan === 'premium' ? '💎 XRP Lieutenant' : 
             '🛡️ XRP Soldier'} | {user?.username || user?.email}
          </p>
        </div>
        <div className="user-controls">
          <span className={`user-plan-badge ${user?.plan || 'free'}`}>
            {user?.plan === 'elite' ? 'ELITE' : 
             user?.plan === 'premium' ? 'PREMIUM' : 
             'FREE'}
          </span>
          <button onClick={handleLogout} className="logout-btn">
            Logout
          </button>
        </div>
      </div>
      
      <div className="header">
        {/* Main Navigation */}
        <div className="main-nav">
          <button 
            className={`nav-btn ${activeView === 'charts' ? 'active' : ''}`}
            onClick={() => setActiveView('charts')}
          >
            📈 Charts
          </button>
          <button 
            className={`nav-btn ${activeView === 'portfolio' ? 'active' : ''}`}
            onClick={() => setActiveView('portfolio')}
          >
            💼 Portfolio
          </button>
          <button 
            className={`nav-btn ${activeView === 'alerts' ? 'active' : ''}`}
            onClick={() => setActiveView('alerts')}
          >
            🔔 Alerts
          </button>
          <button 
            className={`nav-btn ${activeView === 'signals' ? 'active' : ''}`}
            onClick={() => setActiveView('signals')}
          >
            🤖 AI Signals
          </button>
        </div>
        
        {activeView === 'charts' && (
          <>
            <div className="xrp-header-stats">
              <div className="xrp-price-display">
                <span className="xrp-symbol">XRP/USD</span>
                <span className="xrp-price">${chartData['XRPUSD']?.[chartData['XRPUSD'].length - 1]?.close?.toFixed(4) || '0.0000'}</span>
                <span className={`xrp-change ${Math.random() > 0.5 ? 'positive' : 'negative'}`}>
                  {Math.random() > 0.5 ? '+' : '-'}{(Math.random() * 10).toFixed(2)}%
                </span>
              </div>
              <div className="xrp-community-stats">
                <div className="stat-item">
                  <span className="stat-label">XRP Army Members</span>
                  <span className="stat-value">1.2M+</span>
                </div>
                <div className="stat-item">
                  <span className="stat-label">Daily Volume</span>
                  <span className="stat-value">$2.1B</span>
                </div>
                <div className="stat-item">
                  <span className="stat-label">Market Cap</span>
                  <span className="stat-value">$28.5B</span>
                </div>
              </div>
            </div>
            
            <div className="chart-controls">
          <div className="control-group">
            <label>Chart Type:</label>
            <select 
              value={chartType} 
              onChange={(e) => setChartType(e.target.value)}
              className="control-select"
            >
              <option value="candlestick">Candlestick</option>
              <option value="line">Line</option>
              <option value="heikin-ashi">Heikin Ashi</option>
            </select>
          </div>
          
          <div className="control-group">
            <label>Timeframe:</label>
            <select 
              value={timeframe} 
              onChange={(e) => setTimeframe(e.target.value)}
              className="control-select"
            >
              <option value="1m">1m</option>
              <option value="5m">5m</option>
              <option value="15m">15m</option>
              <option value="1h">1h</option>
              <option value="4h">4h</option>
              <option value="1d">1d</option>
            </select>
          </div>

          <div className="control-group">
            <label>Historical:</label>
            <select 
              value={historicalPeriod} 
              onChange={(e) => setHistoricalPeriod(e.target.value)}
              className="control-select"
            >
              <option value="1M">1 Month</option>
              <option value="6M">6 Months</option>
              <option value="1Y">1 Year</option>
              <option value="ALL">All Time</option>
            </select>
          </div>

          <div className="control-group">
            <label>Indicators:</label>
            <div className="indicators-checkboxes">
              {['RSI', 'MACD', 'Bollinger'].map(indicator => (
                <label key={indicator} className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={selectedIndicators.includes(indicator)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedIndicators([...selectedIndicators, indicator]);
                      } else {
                        setSelectedIndicators(selectedIndicators.filter(i => i !== indicator));
                      }
                    }}
                    className="indicator-checkbox"
                  />
                  <span className="indicator-name">{indicator}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="control-group">
            <label>Patterns:</label>
            <div className="indicators-checkboxes">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={showPatterns}
                  onChange={(e) => setShowPatterns(e.target.checked)}
                  className="indicator-checkbox"
                />
                <span className="indicator-name">Enable Patterns</span>
              </label>
              
              {showPatterns && (
                <>
                  {['Bullish Engulfing', 'Bearish Engulfing', 'Doji', 'Hammer', 'Shooting Star', 'Morning Star', 'Evening Star'].map(pattern => (
                    <label key={pattern} className="checkbox-label pattern-checkbox">
                      <input
                        type="checkbox"
                        checked={selectedPatterns.includes(pattern)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedPatterns([...selectedPatterns, pattern]);
                          } else {
                            setSelectedPatterns(selectedPatterns.filter(p => p !== pattern));
                          }
                        }}
                        className="indicator-checkbox"
                      />
                      <span className="indicator-name">{pattern}</span>
                    </label>
                  ))}
                </>
              )}
            </div>
          </div>

          <div className="connection-status">
            <div className={`status-dot ${connectionStatus === 'Connected' ? 'connected' : 'disconnected'}`} />
            {connectionStatus}
          </div>
            </div>
          </>
        )}
      </div>
      
      {/* Main Content Area */}
      {activeView === 'charts' ? (
        <div className="chart-container">
        {loading[activeTab] ? (
          <div className="loading-container">
            <div className="loading-spinner"></div>
            <div className="loading-text">Loading {activeTab} historical data...</div>
          </div>
        ) : (
          <CandlestickChart 
            symbol={activeTab} 
            data={chartData[activeTab] || []}
            chartType={chartType}
            timeframe={timeframe}
            historicalPeriod={historicalPeriod}
            indicators={selectedIndicators}
            showPatterns={showPatterns}
            selectedPatterns={selectedPatterns}
          />
        )}
        </div>
      ) : activeView === 'portfolio' ? (
        <div className="portfolio-view">
          <Portfolio 
            currentPrices={{
              'XRPUSD': chartData['XRPUSD']?.[chartData['XRPUSD'].length - 1]?.close || 0,
            }}
          />
        </div>
      ) : activeView === 'alerts' ? (
        <div className="alerts-view">
          <Alerts 
            currentPrices={{
              'XRPUSD': chartData['XRPUSD']?.[chartData['XRPUSD'].length - 1]?.close || 0,
            }}
          />
        </div>
      ) : (
        <div className="signals-view">
          <TradingSignals 
            currentPrices={{
              'XRPUSD': chartData['XRPUSD']?.[chartData['XRPUSD'].length - 1]?.close || 0,
            }}
            marketData={chartData}
            isPremium={user?.plan === 'premium' || user?.plan === 'elite'}
            userPlan={user?.plan || 'free'}
          />
        </div>
      )}
    </div>
  );
};

export default App;
