import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API_BASE_URL } from '../services/api';

interface ExchangeCredentials {
  exchangeName: 'binance' | 'coinbase' | 'kraken' | 'bitfinex' | 'kucoin';
  apiKey: string;
  secret: string;
  passphrase?: string;
  sandbox?: boolean;
}

interface ExchangeConnectionProps {
  onConnectionChange: (connected: boolean, exchangeName?: string) => void;
  user?: any;
}

const ExchangeConnection: React.FC<ExchangeConnectionProps> = ({ onConnectionChange, user }) => {
  const [isConnected, setIsConnected] = useState(false);
  const [connectedExchange, setConnectedExchange] = useState<string | null>(null);
  const [showConnectForm, setShowConnectForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [credentials, setCredentials] = useState<ExchangeCredentials>({
    exchangeName: 'binance',
    apiKey: '',
    secret: '',
    passphrase: '',
    sandbox: true
  });

  const userId = user?.id || user?.email || 'anonymous';

  useEffect(() => {
    checkConnectionStatus();
  }, []);

  const checkConnectionStatus = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/exchange/status/${userId}`);
      if (response.data.success) {
        setIsConnected(response.data.data.connected);
        setConnectedExchange(response.data.data.exchange);
        onConnectionChange(response.data.data.connected, response.data.data.exchange);
      }
    } catch (error) {
      console.error('Failed to check connection status:', error);
    }
  };

  const handleConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!credentials.apiKey.trim() || !credentials.secret.trim()) {
      alert('Please fill in API Key and Secret');
      return;
    }

    if (credentials.exchangeName === 'coinbase' && !credentials.passphrase?.trim()) {
      alert('Coinbase requires a passphrase');
      return;
    }

    setLoading(true);

    try {
      const response = await axios.post(`${API_BASE_URL}/exchange/connect`, {
        userId,
        credentials
      });

      if (response.data.success) {
        setIsConnected(true);
        setConnectedExchange(credentials.exchangeName);
        setShowConnectForm(false);
        setCredentials({
          exchangeName: 'binance',
          apiKey: '',
          secret: '',
          passphrase: '',
          sandbox: true
        });
        onConnectionChange(true, credentials.exchangeName);
        alert('Exchange connected successfully!');
      } else {
        alert(`Failed to connect: ${response.data.error}`);
      }
    } catch (error: any) {
      console.error('Connection failed:', error);
      alert(`Connection failed: ${error.response?.data?.error || error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnect = async () => {
    if (!window.confirm('Are you sure you want to disconnect your exchange?')) {
      return;
    }

    try {
      const response = await axios.delete(`${API_BASE_URL}/exchange/disconnect/${userId}`);
      
      if (response.data.success) {
        setIsConnected(false);
        setConnectedExchange(null);
        onConnectionChange(false);
        alert('Exchange disconnected successfully!');
      }
    } catch (error) {
      console.error('Failed to disconnect:', error);
      alert('Failed to disconnect exchange');
    }
  };

  const exchangeInfo = {
    binance: { name: 'Binance', color: '#f0b90b', needsPassphrase: false },
    coinbase: { name: 'Coinbase', color: '#0052ff', needsPassphrase: true },
    kraken: { name: 'Kraken', color: '#663399', needsPassphrase: false },
    bitfinex: { name: 'Bitfinex', color: '#37a830', needsPassphrase: false },
    kucoin: { name: 'KuCoin', color: '#20d4a8', needsPassphrase: true },
  };

  if (isConnected) {
    return (
      <div className="exchange-connection connected">
        <div className="connection-status">
          <div className="status-indicator connected" />
          <div className="connection-info">
            <h3>✅ Connected to {exchangeInfo[connectedExchange as keyof typeof exchangeInfo]?.name || connectedExchange}</h3>
            <p>Your portfolio will sync automatically from your exchange</p>
          </div>
        </div>
        <button className="disconnect-btn" onClick={handleDisconnect}>
          Disconnect Exchange
        </button>
      </div>
    );
  }

  return (
    <div className="exchange-connection">
      <div className="connection-header">
        <h3>🔗 Connect Your Exchange</h3>
        <p>Automatically sync your real portfolio from major exchanges</p>
      </div>

      {!showConnectForm ? (
        <div className="exchange-options">
          <div className="supported-exchanges">
            <p>Supported Exchanges:</p>
            <div className="exchange-logos">
              {Object.entries(exchangeInfo).map(([key, info]) => (
                <div key={key} className="exchange-logo" style={{ borderColor: info.color }}>
                  {info.name}
                </div>
              ))}
            </div>
          </div>
          
          <button 
            className="connect-exchange-btn"
            onClick={() => setShowConnectForm(true)}
          >
            Connect Exchange
          </button>
          
          <div className="security-note">
            <p>🔒 Your API keys are encrypted and only used for read-only access</p>
          </div>
        </div>
      ) : (
        <form onSubmit={handleConnect} className="connect-form">
          <div className="form-group">
            <label>Exchange</label>
            <select 
              value={credentials.exchangeName}
              onChange={(e) => setCredentials({
                ...credentials, 
                exchangeName: e.target.value as any
              })}
            >
              {Object.entries(exchangeInfo).map(([key, info]) => (
                <option key={key} value={key}>{info.name}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>API Key</label>
            <input
              type="text"
              value={credentials.apiKey}
              onChange={(e) => setCredentials({...credentials, apiKey: e.target.value})}
              placeholder="Enter your API key"
              required
            />
          </div>

          <div className="form-group">
            <label>API Secret</label>
            <input
              type="password"
              value={credentials.secret}
              onChange={(e) => setCredentials({...credentials, secret: e.target.value})}
              placeholder="Enter your API secret"
              required
            />
          </div>

          {exchangeInfo[credentials.exchangeName].needsPassphrase && (
            <div className="form-group">
              <label>Passphrase</label>
              <input
                type="password"
                value={credentials.passphrase || ''}
                onChange={(e) => setCredentials({...credentials, passphrase: e.target.value})}
                placeholder={credentials.exchangeName === 'coinbase' ? 'Enter your API passphrase' : 'Enter your passphrase'}
                required
              />
              {credentials.exchangeName === 'coinbase' && (
                <small className="form-help">
                  Get your API credentials from <a href="https://exchange.coinbase.com/settings/api" target="_blank" rel="noopener noreferrer">exchange.coinbase.com/settings/api</a>
                </small>
              )}
            </div>
          )}

          <div className="form-group">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={credentials.sandbox || false}
                onChange={(e) => setCredentials({...credentials, sandbox: e.target.checked})}
              />
              <span>Use Sandbox/Testnet (for testing)</span>
            </label>
          </div>

          <div className="api-permissions">
            <h4>Required API Permissions:</h4>
            <ul>
              <li>✅ Read Account Information</li>
              <li>✅ Read Trading History</li>
              <li>❌ Trading (Not Required)</li>
              <li>❌ Withdrawals (Not Required)</li>
            </ul>
          </div>

          <div className="form-actions">
            <button 
              type="submit" 
              className="connect-btn"
              disabled={loading}
            >
              {loading ? 'Connecting...' : 'Connect Exchange'}
            </button>
            <button 
              type="button" 
              className="cancel-btn"
              onClick={() => setShowConnectForm(false)}
            >
              Cancel
            </button>
          </div>

          <div className="security-info">
            <h4>🔐 Security Information:</h4>
            <ul>
              <li>We only request read-only permissions</li>
              <li>API keys are encrypted and stored securely</li>
              <li>We never store your trading passwords</li>
              <li>You can disconnect at any time</li>
            </ul>
          </div>
        </form>
      )}
    </div>
  );
};

export default ExchangeConnection;