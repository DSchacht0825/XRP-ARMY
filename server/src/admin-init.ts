import bcrypt from 'bcrypt';
import sqlite3 from 'sqlite3';
import path from 'path';

// Initialize admin account with correct password
async function initAdmin() {
  const dbPath = path.join(__dirname, '../xrp_terminal.db');
  const db = new sqlite3.Database(dbPath);
  
  const adminEmail = 'schacht.dan@gmail.com';
  const adminPassword = 'J3sus1981!';
  
  try {
    // Hash the password
    const passwordHash = await bcrypt.hash(adminPassword, 10);
    
    // Update existing user or create new one
    const sql = `
      UPDATE users 
      SET 
        password_hash = ?,
        plan = 'elite',
        is_premium = 1,
        subscription_id = 'admin_override',
        trial_ends_at = '2026-12-31 23:59:59',
        updated_at = datetime('now')
      WHERE email = ?
    `;
    
    db.run(sql, [passwordHash, adminEmail], function(err) {
      if (err) {
        console.error('❌ Error updating admin:', err);
      } else if (this.changes === 0) {
        // User doesn't exist, create it
        const insertSql = `
          INSERT INTO users (
            username, email, password_hash, plan, is_premium,
            trial_ends_at, subscription_id,
            created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
        `;
        
        db.run(insertSql, [
          'admin',
          adminEmail,
          passwordHash,
          'elite',
          1,
          '2026-12-31 23:59:59',
          'admin_override'
        ], function(insertErr) {
          if (insertErr) {
            console.error('❌ Error creating admin:', insertErr);
          } else {
            console.log('✅ Admin user created successfully!');
            console.log('📧 Email:', adminEmail);
            console.log('🔑 Password:', adminPassword);
          }
          db.close();
        });
      } else {
        console.log('✅ Admin password updated successfully!');
        console.log('📧 Email:', adminEmail);
        console.log('🔑 Password:', adminPassword);
        db.close();
      }
    });
    
  } catch (error) {
    console.error('❌ Error:', error);
    db.close();
  }
}

// Run the initialization
initAdmin();