import { PriceAlert, AlertNotification, AlertStats } from '../types/alerts';

export class AlertManager {
  private static alerts: PriceAlert[] = [];
  private static notifications: AlertNotification[] = [];
  private static listeners: ((notifications: AlertNotification[]) => void)[] = [];

  // Alert Management
  static addAlert(alert: Omit<PriceAlert, 'id' | 'createdAt'>): PriceAlert {
    const newAlert: PriceAlert = {
      ...alert,
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      createdAt: Date.now(),
    };
    
    this.alerts.push(newAlert);
    this.saveToStorage();
    return newAlert;
  }

  static removeAlert(alertId: string): boolean {
    const index = this.alerts.findIndex(alert => alert.id === alertId);
    if (index >= 0) {
      this.alerts.splice(index, 1);
      this.saveToStorage();
      return true;
    }
    return false;
  }

  static updateAlert(alertId: string, updates: Partial<PriceAlert>): PriceAlert | null {
    const alert = this.alerts.find(a => a.id === alertId);
    if (alert) {
      Object.assign(alert, updates);
      this.saveToStorage();
      return alert;
    }
    return null;
  }

  static getAlerts(symbol?: string): PriceAlert[] {
    if (symbol) {
      return this.alerts.filter(alert => alert.symbol === symbol);
    }
    return [...this.alerts];
  }

  static getActiveAlerts(symbol?: string): PriceAlert[] {
    return this.getAlerts(symbol).filter(alert => alert.isActive);
  }

  // Price Monitoring
  static checkAlerts(priceData: { [symbol: string]: number }): AlertNotification[] {
    const newNotifications: AlertNotification[] = [];
    const now = Date.now();

    this.alerts.forEach(alert => {
      if (!alert.isActive) return;

      const currentPrice = priceData[alert.symbol];
      if (!currentPrice) return;

      alert.lastCheckedPrice = currentPrice;
      let shouldTrigger = false;
      let message = '';
      let changePercent = 0;

      switch (alert.type) {
        case 'price_above':
          shouldTrigger = currentPrice >= alert.condition.value;
          message = `${alert.symbol} reached $${currentPrice.toLocaleString()} (above $${alert.condition.value.toLocaleString()})`;
          break;

        case 'price_below':
          shouldTrigger = currentPrice <= alert.condition.value;
          message = `${alert.symbol} dropped to $${currentPrice.toLocaleString()} (below $${alert.condition.value.toLocaleString()})`;
          break;

        case 'percent_change':
          // For demo purposes, we'll simulate percentage change
          const mockPreviousPrice = currentPrice * (1 - (Math.random() - 0.5) * 0.1);
          changePercent = ((currentPrice - mockPreviousPrice) / mockPreviousPrice) * 100;
          shouldTrigger = Math.abs(changePercent) >= alert.condition.value;
          message = `${alert.symbol} moved ${changePercent >= 0 ? '+' : ''}${changePercent.toFixed(2)}% (${alert.condition.timeframe || '24h'})`;
          break;

        case 'volume_spike':
          // Volume spike logic would go here
          break;
      }

      if (shouldTrigger) {
        const notification: AlertNotification = {
          id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
          alertId: alert.id,
          symbol: alert.symbol,
          message: alert.message || message,
          timestamp: now,
          type: 'triggered',
          isRead: false,
          data: {
            currentPrice,
            triggerPrice: alert.condition.value,
            changePercent
          }
        };

        newNotifications.push(notification);
        this.notifications.unshift(notification);

        // Update alert
        alert.triggeredAt = now;
        if (!alert.repeatAlert) {
          alert.isActive = false;
        }

        // Trigger notification methods
        this.sendNotification(notification, alert.notificationMethods);
      }
    });

    if (newNotifications.length > 0) {
      this.saveToStorage();
      this.notifyListeners();
    }

    return newNotifications;
  }

  // Notifications
  static getNotifications(limit = 50): AlertNotification[] {
    return this.notifications.slice(0, limit);
  }

  static markNotificationAsRead(notificationId: string): void {
    const notification = this.notifications.find(n => n.id === notificationId);
    if (notification) {
      notification.isRead = true;
      this.saveToStorage();
      this.notifyListeners();
    }
  }

  static clearNotifications(): void {
    this.notifications = [];
    this.saveToStorage();
    this.notifyListeners();
  }

  // Statistics
  static getAlertStats(): AlertStats {
    const now = Date.now();
    const oneDayAgo = now - 24 * 60 * 60 * 1000;
    
    const triggeredToday = this.notifications.filter(n => 
      n.timestamp >= oneDayAgo && n.type === 'triggered'
    ).length;

    return {
      totalAlerts: this.alerts.length,
      activeAlerts: this.alerts.filter(a => a.isActive).length,
      triggeredToday,
      accuracyRate: 85 + Math.random() * 10 // Mock accuracy rate
    };
  }

  // Event Listeners
  static addNotificationListener(callback: (notifications: AlertNotification[]) => void): void {
    this.listeners.push(callback);
  }

  static removeNotificationListener(callback: (notifications: AlertNotification[]) => void): void {
    const index = this.listeners.indexOf(callback);
    if (index >= 0) {
      this.listeners.splice(index, 1);
    }
  }

  private static notifyListeners(): void {
    this.listeners.forEach(callback => callback([...this.notifications]));
  }

  private static sendNotification(notification: AlertNotification, methods: ('app' | 'email' | 'sms')[]): void {
    methods.forEach(method => {
      switch (method) {
        case 'app':
          // In-app notification (handled by listeners)
          console.log(`📱 App Notification: ${notification.message}`);
          break;
        case 'email':
          // Email simulation
          console.log(`📧 Email sent: ${notification.message}`);
          break;
        case 'sms':
          // SMS simulation
          console.log(`📱 SMS sent: ${notification.message}`);
          break;
      }
    });
  }

  // Storage
  private static saveToStorage(): void {
    try {
      localStorage.setItem('crypto_alerts', JSON.stringify(this.alerts));
      localStorage.setItem('crypto_notifications', JSON.stringify(this.notifications.slice(0, 100))); // Limit stored notifications
    } catch (error) {
      console.error('Failed to save alerts to storage:', error);
    }
  }

  static loadFromStorage(): void {
    try {
      const alertsData = localStorage.getItem('crypto_alerts');
      const notificationsData = localStorage.getItem('crypto_notifications');
      
      if (alertsData) {
        this.alerts = JSON.parse(alertsData);
      }
      
      if (notificationsData) {
        this.notifications = JSON.parse(notificationsData);
      }
    } catch (error) {
      console.error('Failed to load alerts from storage:', error);
    }
  }

  // Initialize with sample data
  static initializeSampleAlerts(): void {
    if (this.alerts.length === 0) {
      const sampleAlerts = [
        {
          symbol: 'XRPUSD',
          type: 'price_above' as const,
          condition: { value: 3.00 },
          isActive: true,
          notificationMethods: ['app', 'email'] as ('app' | 'email' | 'sms')[],
          message: '🚀 XRP broke above $3.00! Moon mission activated!',
          repeatAlert: false
        },
        {
          symbol: 'XRPUSD',
          type: 'price_below' as const,
          condition: { value: 2.00 },
          isActive: true,
          notificationMethods: ['app'] as ('app' | 'email' | 'sms')[],
          message: '📉 XRP dipped below $2.00 - potential buying opportunity',
          repeatAlert: true
        },
        {
          symbol: 'XRPUSD',
          type: 'percent_change' as const,
          condition: { value: 10, timeframe: '24h' as const },
          isActive: true,
          notificationMethods: ['app', 'sms'] as ('app' | 'email' | 'sms')[],
          message: '💥 XRP up 10%+ in 24h! XRP Army rising!',
          repeatAlert: true
        }
      ];

      sampleAlerts.forEach(alert => this.addAlert(alert));
    }
  }
}