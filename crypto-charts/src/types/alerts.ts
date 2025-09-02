export interface PriceAlert {
  id: string;
  symbol: string;
  type: 'price_above' | 'price_below' | 'percent_change' | 'volume_spike';
  condition: {
    value: number;
    timeframe?: '1h' | '24h' | '7d'; // For percentage changes
  };
  isActive: boolean;
  createdAt: number;
  triggeredAt?: number;
  lastCheckedPrice?: number;
  notificationMethods: ('app' | 'email' | 'sms')[];
  message?: string;
  repeatAlert: boolean;
}

export interface AlertNotification {
  id: string;
  alertId: string;
  symbol: string;
  message: string;
  timestamp: number;
  type: 'triggered' | 'info' | 'warning';
  isRead: boolean;
  data: {
    currentPrice: number;
    triggerPrice: number;
    change?: number;
    changePercent?: number;
  };
}

export interface AlertStats {
  totalAlerts: number;
  activeAlerts: number;
  triggeredToday: number;
  accuracyRate: number; // Percentage of useful alerts
}

export interface AlertSettings {
  enableNotifications: boolean;
  enableSounds: boolean;
  emailNotifications: boolean;
  smsNotifications: boolean;
  maxAlertsPerSymbol: number;
  alertCooldown: number; // Minutes between repeat alerts
}