const bcrypt = require('bcrypt');
const sqlite3 = require('sqlite3').verbose();

// Create admin user directly in database
async function createAdminUser() {
  const db = new sqlite3.Database('./xrp_terminal.db');
  
  const adminData = {
    username: 'admin',
    email: 'schacht.dan@gmail.com',
    password: 'admin12345',
    plan: 'premium'
  };
  
  try {
    // Hash password
    const hashedPassword = await bcrypt.hash(adminData.password, 10);
    
    // Create user with premium access
    const sql = `
      INSERT OR REPLACE INTO users (
        username, email, password_hash, plan, 
        is_active_subscription, subscription_ends_at, subscription_id,
        created_at, updated_at, email_verified, subscription_status, expires_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'), ?, ?, ?)
    `;
    
    const params = [
      adminData.username,
      adminData.email,
      hashedPassword,
      adminData.plan,
      1, // active subscription
      '2026-12-31 23:59:59', // expires far future
      'admin_override_premium',
      1, // email verified
      'active',
      '2026-12-31 23:59:59'
    ];
    
    db.run(sql, params, function(err) {
      if (err) {
        console.error('❌ Error creating admin user:', err);
      } else {
        console.log('✅ Admin user created successfully!');
        console.log('📧 Email:', adminData.email);
        console.log('🔑 Password:', adminData.password);
        console.log('💎 Plan: Premium (Admin Override)');
      }
      db.close();
    });
    
  } catch (error) {
    console.error('❌ Error:', error);
    db.close();
  }
}

createAdminUser();