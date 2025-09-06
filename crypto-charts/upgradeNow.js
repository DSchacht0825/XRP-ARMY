// Direct upgrade script
const API_BASE_URL = 'https://xrp-army-production.up.railway.app/api';

async function upgrade() {
  try {
    // Login
    const loginResponse = await fetch(`${API_BASE_URL}/auth/signin`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'schacht.dan@gmail.com',
        password: 'J3sus1981!'
      })
    });

    const loginData = await loginResponse.json();
    console.log('Login response:', loginData);

    if (!loginData.success) {
      console.error('Login failed');
      return;
    }

    const token = loginData.data.token;
    console.log('Token received, attempting upgrade...');

    // Upgrade
    const upgradeResponse = await fetch(`${API_BASE_URL}/auth/upgrade`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ plan: 'elite' })
    });

    const upgradeData = await upgradeResponse.json();
    console.log('Upgrade response:', upgradeData);

    if (upgradeData.success) {
      console.log('🎉 SUCCESS! Account upgraded to General (Elite) access');
      console.log('New plan:', upgradeData.data.user.plan);
      console.log('Premium status:', upgradeData.data.user.isPremium);
    } else {
      console.log('❌ Upgrade failed:', upgradeData.error);
    }

  } catch (error) {
    console.error('Error:', error);
  }
}

upgrade();