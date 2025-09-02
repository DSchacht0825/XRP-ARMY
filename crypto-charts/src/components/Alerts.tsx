import React, { useState, useEffect } from 'react';
import { PriceAlert, AlertNotification, AlertStats } from '../types/alerts';
import { AlertManager } from '../utils/alertManager';

interface AlertsProps {
  currentPrices: { [symbol: string]: number };
}

const Alerts: React.FC<AlertsProps> = ({ currentPrices }) => {
  const [alerts, setAlerts] = useState<PriceAlert[]>([]);
  const [notifications, setNotifications] = useState<AlertNotification[]>([]);
  const [stats, setStats] = useState<AlertStats | null>(null);
  const [activeTab, setActiveTab] = useState<'alerts' | 'notifications' | 'create'>('alerts');
  const [showCreateForm, setShowCreateForm] = useState(false);

  // Create alert form state
  const [newAlert, setNewAlert] = useState({
    symbol: 'XRPUSD',
    type: 'price_above' as 'price_above' | 'price_below' | 'percent_change' | 'volume_spike',
    value: '',
    timeframe: '24h' as '1h' | '24h' | '7d',
    notificationMethods: ['app'] as ('app' | 'email' | 'sms')[],
    message: '',
    repeatAlert: false
  });

  useEffect(() => {
    // Initialize AlertManager
    AlertManager.loadFromStorage();
    AlertManager.initializeSampleAlerts();
    
    // Load initial data
    loadData();

    // Set up notification listener
    const handleNotifications = (newNotifications: AlertNotification[]) => {
      setNotifications(newNotifications);
    };
    AlertManager.addNotificationListener(handleNotifications);

    // Set up price monitoring interval
    const monitorInterval = setInterval(() => {
      if (Object.keys(currentPrices).length > 0) {
        AlertManager.checkAlerts(currentPrices);
        loadData();
      }
    }, 5000); // Check every 5 seconds

    return () => {
      clearInterval(monitorInterval);
      AlertManager.removeNotificationListener(handleNotifications);
    };
  }, [currentPrices]);

  const loadData = () => {
    setAlerts(AlertManager.getAlerts());
    setNotifications(AlertManager.getNotifications());
    setStats(AlertManager.getAlertStats());
  };

  const handleCreateAlert = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newAlert.value.trim()) return;

    const alert = AlertManager.addAlert({
      symbol: newAlert.symbol,
      type: newAlert.type,
      condition: {
        value: parseFloat(newAlert.value),
        timeframe: newAlert.type === 'percent_change' ? newAlert.timeframe : undefined
      },
      isActive: true,
      notificationMethods: newAlert.notificationMethods,
      message: newAlert.message.trim() || undefined,
      repeatAlert: newAlert.repeatAlert
    });

    if (alert) {
      loadData();
      setNewAlert({
        symbol: 'XRPUSD',
        type: 'price_above' as 'price_above' | 'price_below' | 'percent_change' | 'volume_spike',
        value: '',
        timeframe: '24h' as '1h' | '24h' | '7d',
        notificationMethods: ['app'] as ('app' | 'email' | 'sms')[],
        message: '',
        repeatAlert: false
      });
      setShowCreateForm(false);
      setActiveTab('alerts');
    }
  };

  const toggleAlert = (alertId: string) => {
    const alert = alerts.find(a => a.id === alertId);
    if (alert) {
      AlertManager.updateAlert(alertId, { isActive: !alert.isActive });
      loadData();
    }
  };

  const deleteAlert = (alertId: string) => {
    AlertManager.removeAlert(alertId);
    loadData();
  };

  const markNotificationAsRead = (notificationId: string) => {
    AlertManager.markNotificationAsRead(notificationId);
    loadData();
  };

  const formatPrice = (price: number, symbol: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: symbol === 'XRPUSD' ? 4 : 2,
      maximumFractionDigits: symbol === 'XRPUSD' ? 4 : 2,
    }).format(price);
  };

  const getAlertTypeLabel = (type: string) => {
    switch (type) {
      case 'price_above': return 'Above';
      case 'price_below': return 'Below';
      case 'percent_change': return '% Change';
      case 'volume_spike': return 'Volume';
      default: return type;
    }
  };

  const getAlertStatusColor = (alert: PriceAlert) => {
    if (!alert.isActive) return '#6b7280';
    if (alert.triggeredAt) return '#10b981';
    return '#3b82f6';
  };

  return (
    <div className="alerts-container">
      {/* Alert Stats */}
      {stats && (
        <div className="alert-stats">
          <div className="stat-card">
            <div className="stat-value">{stats.totalAlerts}</div>
            <div className="stat-label">Total Alerts</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{stats.activeAlerts}</div>
            <div className="stat-label">Active</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{stats.triggeredToday}</div>
            <div className="stat-label">Triggered Today</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{stats.accuracyRate.toFixed(1)}%</div>
            <div className="stat-label">Accuracy</div>
          </div>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="alerts-nav">
        <button 
          className={`nav-tab ${activeTab === 'alerts' ? 'active' : ''}`}
          onClick={() => setActiveTab('alerts')}
        >
          📊 My Alerts ({alerts.filter(a => a.isActive).length})
        </button>
        <button 
          className={`nav-tab ${activeTab === 'notifications' ? 'active' : ''}`}
          onClick={() => setActiveTab('notifications')}
        >
          🔔 Notifications ({notifications.filter(n => !n.isRead).length})
        </button>
        <button 
          className="create-alert-btn"
          onClick={() => {
            setShowCreateForm(true);
            setActiveTab('create');
          }}
        >
          ➕ Create Alert
        </button>
      </div>

      {/* Content */}
      {activeTab === 'alerts' && (
        <div className="alerts-list">
          <h3>Price Alerts</h3>
          {alerts.length === 0 ? (
            <div className="empty-state">
              <p>No alerts created yet</p>
              <button 
                className="create-first-alert-btn"
                onClick={() => {
                  setShowCreateForm(true);
                  setActiveTab('create');
                }}
              >
                Create Your First Alert
              </button>
            </div>
          ) : (
            <div className="alerts-grid">
              {alerts.map(alert => (
                <div key={alert.id} className="alert-card">
                  <div className="alert-header">
                    <div className="alert-symbol">{alert.symbol}</div>
                    <div className="alert-actions">
                      <button
                        className={`toggle-btn ${alert.isActive ? 'active' : 'inactive'}`}
                        onClick={() => toggleAlert(alert.id)}
                      >
                        {alert.isActive ? 'ON' : 'OFF'}
                      </button>
                      <button
                        className="delete-btn"
                        onClick={() => deleteAlert(alert.id)}
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                  
                  <div className="alert-condition">
                    <span className="alert-type">{getAlertTypeLabel(alert.type)}</span>
                    <span className="alert-value">
                      {alert.type.startsWith('price_') 
                        ? formatPrice(alert.condition.value, alert.symbol)
                        : `${alert.condition.value}${alert.type === 'percent_change' ? '%' : ''}`
                      }
                    </span>
                  </div>

                  <div className="alert-details">
                    <div className="alert-current-price">
                      Current: {formatPrice(currentPrices[alert.symbol] || 0, alert.symbol)}
                    </div>
                    <div className="alert-methods">
                      {alert.notificationMethods.map(method => (
                        <span key={method} className="method-badge">
                          {method === 'app' ? '📱' : method === 'email' ? '📧' : '💬'} {method}
                        </span>
                      ))}
                    </div>
                  </div>

                  {alert.triggeredAt && (
                    <div className="alert-triggered">
                      ✅ Triggered {new Date(alert.triggeredAt).toLocaleString()}
                    </div>
                  )}

                  <div 
                    className="alert-status-bar"
                    style={{ backgroundColor: getAlertStatusColor(alert) }}
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'notifications' && (
        <div className="notifications-list">
          <div className="notifications-header">
            <h3>Notifications</h3>
            <button 
              className="clear-notifications-btn"
              onClick={() => {
                AlertManager.clearNotifications();
                loadData();
              }}
            >
              Clear All
            </button>
          </div>

          {notifications.length === 0 ? (
            <div className="empty-state">
              <p>No notifications yet</p>
            </div>
          ) : (
            <div className="notifications-grid">
              {notifications.map(notification => (
                <div 
                  key={notification.id} 
                  className={`notification-card ${notification.isRead ? 'read' : 'unread'}`}
                  onClick={() => markNotificationAsRead(notification.id)}
                >
                  <div className="notification-header">
                    <span className="notification-symbol">{notification.symbol}</span>
                    <span className="notification-time">
                      {new Date(notification.timestamp).toLocaleString()}
                    </span>
                  </div>
                  <div className="notification-message">{notification.message}</div>
                  <div className="notification-data">
                    <span>Price: {formatPrice(notification.data.currentPrice, notification.symbol)}</span>
                    {notification.data.changePercent && (
                      <span className={notification.data.changePercent >= 0 ? 'positive' : 'negative'}>
                        {notification.data.changePercent >= 0 ? '+' : ''}{notification.data.changePercent.toFixed(2)}%
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {(activeTab === 'create' || showCreateForm) && (
        <div className="create-alert-form">
          <h3>Create New Alert</h3>
          <form onSubmit={handleCreateAlert}>
            <div className="form-grid">
              <div className="form-group">
                <label>Symbol</label>
                <select 
                  value={newAlert.symbol}
                  onChange={(e) => setNewAlert({...newAlert, symbol: e.target.value})}
                >
                  <option value="XRPUSD">XRP/USD</option>
                </select>
              </div>

              <div className="form-group">
                <label>Alert Type</label>
                <select
                  value={newAlert.type}
                  onChange={(e) => setNewAlert({...newAlert, type: e.target.value as any})}
                >
                  <option value="price_above">Price Above</option>
                  <option value="price_below">Price Below</option>
                  <option value="percent_change">Percentage Change</option>
                </select>
              </div>

              <div className="form-group">
                <label>
                  {newAlert.type.startsWith('price_') 
                    ? 'Price Threshold' 
                    : newAlert.type === 'percent_change' 
                    ? 'Percentage' 
                    : 'Value'
                  }
                </label>
                <input
                  type="number"
                  value={newAlert.value}
                  onChange={(e) => setNewAlert({...newAlert, value: e.target.value})}
                  placeholder={newAlert.type.startsWith('price_') ? '50000' : '5'}
                  step={newAlert.type === 'percent_change' ? '0.1' : '0.01'}
                  required
                />
              </div>

              {newAlert.type === 'percent_change' && (
                <div className="form-group">
                  <label>Timeframe</label>
                  <select
                    value={newAlert.timeframe}
                    onChange={(e) => setNewAlert({...newAlert, timeframe: e.target.value as any})}
                  >
                    <option value="1h">1 Hour</option>
                    <option value="24h">24 Hours</option>
                    <option value="7d">7 Days</option>
                  </select>
                </div>
              )}
            </div>

            <div className="form-group">
              <label>Custom Message (Optional)</label>
              <input
                type="text"
                value={newAlert.message}
                onChange={(e) => setNewAlert({...newAlert, message: e.target.value})}
                placeholder="🚀 XRP to the moon!"
              />
            </div>

            <div className="form-group">
              <label>Notification Methods</label>
              <div className="methods-checkboxes">
                {['app', 'email', 'sms'].map(method => (
                  <label key={method} className="method-checkbox">
                    <input
                      type="checkbox"
                      checked={newAlert.notificationMethods.includes(method as any)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setNewAlert({
                            ...newAlert,
                            notificationMethods: [...newAlert.notificationMethods, method as any]
                          });
                        } else {
                          setNewAlert({
                            ...newAlert,
                            notificationMethods: newAlert.notificationMethods.filter(m => m !== method)
                          });
                        }
                      }}
                    />
                    <span>
                      {method === 'app' ? '📱 App' : method === 'email' ? '📧 Email' : '💬 SMS'}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            <div className="form-group">
              <label className="repeat-checkbox">
                <input
                  type="checkbox"
                  checked={newAlert.repeatAlert}
                  onChange={(e) => setNewAlert({...newAlert, repeatAlert: e.target.checked})}
                />
                <span>Repeat alert when triggered</span>
              </label>
            </div>

            <div className="form-actions">
              <button type="submit" className="create-btn">Create Alert</button>
              <button 
                type="button" 
                className="cancel-btn"
                onClick={() => {
                  setShowCreateForm(false);
                  setActiveTab('alerts');
                }}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default Alerts;