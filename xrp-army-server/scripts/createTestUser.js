const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcrypt');
const path = require('path');

// Database path
const dbPath = path.join(__dirname, '../xrp_terminal.db');

// Test user data
const testUser = {
  username: 'schacht_dan',
  email: 'schacht.dan@gmail.com',
  password: 'J3sus1981!',
  plan: 'elite', // General access
  is_premium: true
};

async function createTestUser() {
  const db = new sqlite3.Database(dbPath);
  
  try {
    // Hash the password
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(testUser.password, saltRounds);
    
    // Check if user already exists
    const existingUser = await new Promise((resolve, reject) => {
      db.get('SELECT * FROM users WHERE email = ?', [testUser.email], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
    
    if (existingUser) {
      console.log('📝 User already exists. Updating to General access...');
      
      // Update existing user to General access
      await new Promise((resolve, reject) => {
        db.run(
          'UPDATE users SET plan = ?, is_premium = ?, updated_at = CURRENT_TIMESTAMP WHERE email = ?',
          [testUser.plan, testUser.is_premium, testUser.email],
          function(err) {
            if (err) reject(err);
            else resolve(this);
          }
        );
      });
      
      console.log('✅ Updated existing user to General access');
    } else {
      console.log('🔨 Creating new test user...');
      
      // Create new user
      await new Promise((resolve, reject) => {
        db.run(
          `INSERT INTO users (username, email, password_hash, plan, is_premium, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
          [testUser.username, testUser.email, hashedPassword, testUser.plan, testUser.is_premium],
          function(err) {
            if (err) reject(err);
            else resolve(this);
          }
        );
      });
      
      console.log('✅ Created new test user');
    }
    
    // Verify the user was created/updated correctly
    const user = await new Promise((resolve, reject) => {
      db.get('SELECT * FROM users WHERE email = ?', [testUser.email], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
    
    console.log('🎯 Test User Details:');
    console.log(`   Email: ${user.email}`);
    console.log(`   Username: ${user.username}`);
    console.log(`   Plan: ${user.plan}`);
    console.log(`   Premium: ${user.is_premium ? 'Yes' : 'No'}`);
    console.log(`   Created: ${user.created_at}`);
    console.log(`   Updated: ${user.updated_at}`);
    
    console.log('\n🚀 Test Account Ready!');
    console.log('   Login: schacht.dan@gmail.com');
    console.log('   Password: J3sus1981!');
    console.log('   Access Level: XRP General (Elite)');
    
  } catch (error) {
    console.error('❌ Error creating test user:', error);
  } finally {
    db.close();
  }
}

// Run the script
createTestUser();