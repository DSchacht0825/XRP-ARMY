import React from 'react';

// DIRECT SQUARE CHECKOUT LINKS - REAL LINKS FROM YOUR SQUARE ACCOUNT
const SQUARE_CHECKOUT_LINKS = {
  premium: 'https://square.link/u/FYrYvBjt', // XRP Lieutenant - $20/month
  elite: 'https://square.link/u/7xs2lxXZ'    // XRP General - $49/month
};

interface DirectSquareCheckoutProps {
  planId: 'premium' | 'elite';
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
        backgroundColor: planId === 'elite' ? '#FFD700' : '#4CAF50',
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
      💳 Pay with Square - {planId === 'elite' ? '$49/month' : '$20/month'}
    </button>
  );
};

export default DirectSquareCheckout;