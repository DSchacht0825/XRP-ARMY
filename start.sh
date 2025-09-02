#!/bin/bash

echo "Starting Crypto Candlestick Charts Application..."
echo "================================"

# Start the backend server
echo "Starting backend server..."
cd server
npm run dev &
SERVER_PID=$!

# Wait for server to start
sleep 3

# Start the React frontend
echo "Starting React frontend..."
cd ../crypto-charts
npm start &
CLIENT_PID=$!

echo "================================"
echo "Server running on http://localhost:5000"
echo "Client running on http://localhost:3000"
echo "Press Ctrl+C to stop both services"
echo "================================"

# Function to handle shutdown
shutdown() {
    echo "Shutting down services..."
    kill $SERVER_PID 2>/dev/null
    kill $CLIENT_PID 2>/dev/null
    exit
}

# Set up trap to catch Ctrl+C
trap shutdown INT

# Wait for both processes
wait