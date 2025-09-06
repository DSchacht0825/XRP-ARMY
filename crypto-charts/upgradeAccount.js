// Quick script to upgrade account via production API
const API_BASE_URL = 'https://xrp-army-production.up.railway.app/api';

async function upgradeAccount() {
  try {
    // First, login to get token
    console.log('🔑 Logging in...');
    const loginResponse = await fetch(`${API_BASE_URL}/auth/signin`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: 'schacht.dan@gmail.com',
        password: 'J3sus1981!'
      })
    });

    const loginData = await loginResponse.json();
    
    if (!loginData.success) {
      console.error('❌ Login failed:', loginData.error);
      return;
    }

    console.log('✅ Login successful');
    console.log('Current plan:', loginData.data.user.plan);
    console.log('Premium status:', loginData.data.user.isPremium);

    const token = loginData.data.token;

    // Try to find an upgrade endpoint or use a custom one
    // Since /upgrade doesn't exist, let's try other endpoints
    
    // Check if there's a user update endpoint
    const endpoints = [
      '/user/upgrade',
      '/auth/upgrade', 
      '/subscription/upgrade',
      '/premium/upgrade',
      '/user/update-plan'
    ];

    let upgraded = false;
    
    for (const endpoint of endpoints) {
      try {
        console.log(`🔄 Trying endpoint: ${endpoint}`);
        const response = await fetch(`${API_BASE_URL}${endpoint}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            plan: 'elite',
            isPremium: true
          })
        });

        const data = await response.text();
        
        if (response.ok) {
          console.log('✅ Upgrade successful via:', endpoint);
          console.log('Response:', data);
          upgraded = true;
          break;
        } else {
          console.log(`❌ ${endpoint}: ${response.status} - ${data.substring(0, 100)}`);
        }
      } catch (err) {
        console.log(`❌ ${endpoint}: Error -`, err.message);
      }
    }

    if (!upgraded) {
      console.log('❌ Could not find working upgrade endpoint');
      console.log('💡 You may need to manually update the database or add an admin endpoint');
    }

  } catch (error) {
    console.error('❌ Script error:', error);
  }
}

// Run the script
upgradeAccount();