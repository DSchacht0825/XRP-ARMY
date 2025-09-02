# 🚀 XRP TERMINAL - The Ultimate XRP Trading Platform

**Built by the XRP Army, for the XRP Army**

![XRP Terminal](https://img.shields.io/badge/XRP-Terminal-00AAE4?style=for-the-badge&logo=ripple)
![Status](https://img.shields.io/badge/Status-Production%20Ready-success?style=for-the-badge)
![Real-Time](https://img.shields.io/badge/Data-Real--Time-brightgreen?style=for-the-badge)

## 📈 Overview

XRP Terminal is a professional-grade trading platform exclusively focused on XRP. Built with real-time market data, advanced AI signals, and premium features designed for serious XRP traders and the XRP Army community.

## ⚡ Features

### 🎯 **Core Trading Features**
- **Real-Time XRP Data** - Live price feeds from Kraken WebSocket
- **Professional Charts** - Candlestick, line, and Heikin Ashi charts
- **Technical Indicators** - RSI, MACD, Bollinger Bands
- **Pattern Recognition** - Bullish/Bearish engulfing, Doji, Hammer patterns
- **Multiple Timeframes** - 1m, 5m, 15m, 1h, 4h, 1d

### 🤖 **AI-Powered Signals** (Premium)
- Advanced XRP-specific trading signals
- AI-powered buy/sell recommendations
- Real-time signal filtering and sorting
- Premium paywall with free trial
- Performance tracking and confidence scores

### 📊 **Portfolio Management**
- XRP holdings tracking
- Profit & Loss calculations
- Exchange integration ready
- Real-time portfolio valuation

### 🔔 **Smart Alerts**
- Price level alerts (above/below)
- Percentage change notifications
- Volume spike detection
- Multi-channel notifications (App, Email, SMS)

## 🛠 Technology Stack

### Frontend
- **React 18** with TypeScript
- **Socket.IO Client** for real-time updates
- **Lightweight Charting Library** (TradingView)
- **CSS3** with modern animations and gradients

### Backend
- **Node.js** with Express
- **Socket.IO** for WebSocket connections
- **Kraken WebSocket API** for live market data
- **TypeScript** for type safety

## Installation

1. Clone the repository:
```bash
cd /Users/danielschacht/candlesticks
```

2. Install dependencies for both server and client:
```bash
# Install server dependencies
cd server
npm install

# Install client dependencies
cd ../crypto-charts
npm install
```

## Running the Application

### Option 1: Using the start script (Recommended)
```bash
cd /Users/danielschacht/candlesticks
./start.sh
```

### Option 2: Running services separately

**Terminal 1 - Start the backend server:**
```bash
cd /Users/danielschacht/candlesticks/server
npm run dev
```

**Terminal 2 - Start the React frontend:**
```bash
cd /Users/danielschacht/candlesticks/crypto-charts
npm start
```

## Access the Application

- Frontend: http://localhost:3000
- Backend API: http://localhost:5000

## How It Works

1. The Node.js backend connects to Binance's WebSocket API for real-time price data
2. Data is processed and forwarded to the React frontend via Socket.IO
3. The frontend renders interactive candlestick charts using TradingView's Lightweight Charts
4. Charts update in real-time as new price data arrives
5. Users can switch between different cryptocurrency pairs using the tab navigation

## API Endpoints

- `GET /api/symbols` - Get list of available trading pairs
- `GET /api/historical/:symbol` - Get historical candlestick data for a symbol
- WebSocket events:
  - `subscribe` - Subscribe to a specific symbol
  - `historicalData` - Receive historical data
  - `candleUpdate` - Receive real-time candle updates

## Project Structure

```
/Users/danielschacht/candlesticks/
├── server/                 # Node.js backend
│   ├── src/
│   │   └── index.ts       # Main server file
│   ├── package.json
│   └── tsconfig.json
├── crypto-charts/          # React frontend
│   ├── src/
│   │   ├── components/
│   │   │   └── CandlestickChart.tsx
│   │   ├── App.tsx
│   │   └── App.css
│   └── package.json
├── start.sh               # Start script for both services
└── README.md
```