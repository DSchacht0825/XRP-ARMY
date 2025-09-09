import React, { useState, useEffect } from 'react';
import squarePaymentService, { SUBSCRIPTION_PLANS } from '../services/squarePaymentSimple';
import DirectSquareCheckout from './DirectSquareCheckout';
import '../styles/PaymentModal.css';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  planId: 'basic' | 'premium';
  userEmail: string;
  userName?: string;
  onSuccess: () => void;
}

const PaymentModal: React.FC<PaymentModalProps> = ({ 
  isOpen, 
  onClose, 
  planId, 
  userEmail,
  userName,
  onSuccess 
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<'link'>('link');

  const plan = SUBSCRIPTION_PLANS[planId];

  useEffect(() => {
    // Load Square Web SDK script
    if (!document.querySelector('#square-web-sdk')) {
      const script = document.createElement('script');
      script.id = 'square-web-sdk';
      script.src = 'https://web.squarecdn.com/v1/square.js';
      script.async = true;
      document.body.appendChild(script);
    }
  }, []);

  const handlePaymentLinkCheckout = async () => {
    setLoading(true);
    setError(null);

    try {
      // Create payment link and redirect
      const paymentUrl = await squarePaymentService.createPaymentLink(planId, userEmail);
      
      // Store plan info for success callback
      localStorage.setItem('pending_subscription', JSON.stringify({
        planId,
        planName: plan.name,
        userEmail,
        userName
      }));

      // Redirect to Square checkout
      window.location.href = paymentUrl;
    } catch (err: any) {
      setError(err.message || 'Payment processing failed');
      setLoading(false);
    }
  };

  // Simplified - only payment links for now
  const handleCardPayment = async () => {
    // Redirect to payment link for now
    await handlePaymentLinkCheckout();
  };

  if (!isOpen) return null;

  console.log('🔥 PAYMENT MODAL IS RENDERING! isOpen:', isOpen, 'planId:', planId);

  return (
    <div className="payment-modal-overlay" style={{zIndex: 9999, position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
      <div className="payment-modal" style={{backgroundColor: 'white', padding: '20px', borderRadius: '8px', maxWidth: '500px', width: '90%', maxHeight: '80vh', overflow: 'auto'}}>
        <div className="payment-modal-header">
          <h2>Complete Your Subscription</h2>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        <div className="payment-modal-body">
          <div className="plan-summary">
            <h3>{plan.name}</h3>
            <div className="price-display">
              <span className="amount">${(plan.amount / 100).toFixed(2)}</span>
              <span className="period">/month</span>
              <span className="live-badge" style={{color: '#e74c3c', fontWeight: 'bold', marginLeft: '10px'}}>[LIVE]</span>
            </div>
            {plan.features && (
              <ul className="plan-features" style={{fontSize: '14px', marginTop: '10px'}}>
                {plan.features.slice(0, 3).map((feature, index) => (
                  <li key={index}>✓ {feature}</li>
                ))}
              </ul>
            )}
          </div>

          {error && (
            <div className="error-message">
              {error}
            </div>
          )}

          <div className="payment-methods">
            <div className="method-tabs">
              <button className="tab active">
                Secure Checkout
              </button>
            </div>

            <div className="payment-link-section">
              <p>You'll be redirected to Square's secure checkout page</p>
              <ul className="features-list">
                <li>✓ Live payment processing (not demo)</li>
                <li>✓ Secure Square checkout</li>
                <li>✓ Instant account activation</li>
                <li>✓ Real subscription billing</li>
              </ul>
              
              {/* DIRECT SQUARE CHECKOUT - NO BACKEND NEEDED */}
              <DirectSquareCheckout 
                planId={planId} 
                userEmail={userEmail}
              />
              
              {/* Original button as fallback */}
              <button 
                className="checkout-btn"
                onClick={handlePaymentLinkCheckout}
                disabled={loading}
                style={{ display: 'none' }}
              >
                {loading ? 'Processing...' : 'Continue to Checkout →'}
              </button>
            </div>
          </div>

          <div className="payment-footer">
            <p className="security-note">
              🔒 Live payments secured by Square - This is real billing
            </p>
            <p className="terms">
              By subscribing, you agree to our Terms of Service and Privacy Policy.
              You can cancel your subscription at any time.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaymentModal;