import React from 'react';

// LIVE SQUARE CHECKOUT LINKS - PRODUCTION READY
const SQUARE_CHECKOUT_LINKS = {
  basic: 'https://square.link/u/FYrYvBjt',    // XRP Army Basic - $9.99/month
  premium: 'https://square.link/u/7xs2lxXZ'  // XRP Army Premium - $20/month
};

interface DirectSquareCheckoutProps {
  planId: 'basic' | 'premium';
  userEmail?: string;
}

const DirectSquareCheckout: React.FC<DirectSquareCheckoutProps> = ({ planId, userEmail }) => {
  const handleDirectPayment = () => {
    console.log('💰 DIRECT Square Checkout - No backend needed!');
    console.log('Plan:', planId);
    
    // Get the direct Square checkout link
    const checkoutUrl = SQUARE_CHECKOUT_LINKS[planId];
    
    if (checkoutUrl) {
      // Add email to URL if provided
      const finalUrl = userEmail 
        ? `${checkoutUrl}?email=${encodeURIComponent(userEmail)}`
        : checkoutUrl;
      
      console.log('🚀 Redirecting to:', finalUrl);
      
      // Open Square checkout in same window
      window.location.href = finalUrl;
    } else {
      console.error('❌ Invalid plan ID');
    }
  };

  return (
    <button 
      onClick={handleDirectPayment}
      className="direct-checkout-btn"
      style={{
        backgroundColor: planId === 'premium' ? '#FFD700' : '#4CAF50',
        color: 'white',
        padding: '12px 24px',
        fontSize: '16px',
        fontWeight: 'bold',
        border: 'none',
        borderRadius: '8px',
        cursor: 'pointer',
        width: '100%',
        marginTop: '10px'
      }}
    >
      💳 Pay with Square - {planId === 'premium' ? '$20/month' : '$9.99/month'} [LIVE]
    </button>
  );
};

export default DirectSquareCheckout;