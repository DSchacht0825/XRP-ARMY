import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/PaymentSuccess.css';

const PaymentSuccess: React.FC = () => {
  const navigate = useNavigate();
  const [subscriptionInfo, setSubscriptionInfo] = useState<any>(null);

  useEffect(() => {
    // Retrieve pending subscription info
    const pendingSubscription = localStorage.getItem('pending_subscription');
    
    if (pendingSubscription) {
      const info = JSON.parse(pendingSubscription);
      setSubscriptionInfo(info);
      
      // Complete the signup process
      completeSubscription(info);
      
      // Clear the pending subscription
      localStorage.removeItem('pending_subscription');
    }
  }, []);

  const completeSubscription = async (info: any) => {
    try {
      // Import API service dynamically
      const ApiService = (await import('../services/api')).default;
      
      // Update user subscription status
      const response = await ApiService.upgradeToPremium(info.planId);
      
      if (response.success) {
        console.log('✅ Subscription activated successfully');
        
        // Redirect to dashboard after 3 seconds
        setTimeout(() => {
          navigate('/dashboard');
        }, 3000);
      }
    } catch (error) {
      console.error('Error completing subscription:', error);
    }
  };

  return (
    <div className="payment-success-container">
      <div className="success-card">
        <div className="success-icon">
          <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="12" cy="12" r="10" stroke="#22c55e" strokeWidth="2"/>
            <path d="M8 12l2 2 4-4" stroke="#22c55e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
        
        <h1>Payment Successful!</h1>
        
        {subscriptionInfo && (
          <div className="subscription-details">
            <p>Welcome to <strong>{subscriptionInfo.planName}</strong></p>
            <p className="email">Confirmation sent to: {subscriptionInfo.userEmail}</p>
          </div>
        )}
        
        <div className="success-message">
          <p>Your subscription has been activated successfully.</p>
          <p>Redirecting you to your dashboard...</p>
        </div>
        
        <div className="loader">
          <div className="loader-bar"></div>
        </div>
        
        <button 
          className="dashboard-btn"
          onClick={() => navigate('/dashboard')}
        >
          Go to Dashboard Now →
        </button>
      </div>
    </div>
  );
};

export default PaymentSuccess;