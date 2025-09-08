import sqlite3 from 'sqlite3';
import { promisify } from 'util';
import path from 'path';

export interface User {
  id?: number;
  username: string;
  email: string;
  password_hash: string;
  plan: 'free' | 'premium' | 'elite';
  is_premium: boolean;
  trial_ends_at?: Date;
  subscription_id?: string;
  created_at: Date;
  updated_at: Date;
}

export interface Session {
  id?: number;
  user_id: number;
  token: string;
  expires_at: Date;
  created_at: Date;
}

class Database {
  private db: sqlite3.Database;

  constructor() {
    // Use persistent volume path in production, local path in development
    const dbPath = process.env.NODE_ENV === 'production' 
      ? '/app/data/xrp_terminal.db'  // Railway persistent volume
      : path.join(__dirname, '../xrp_terminal.db');
    
    // Ensure directory exists in production
    if (process.env.NODE_ENV === 'production') {
      const fs = require('fs');
      const dir = path.dirname(dbPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
        console.log('📁 Created data directory for persistent storage');
      }
    }
    
    this.db = new sqlite3.Database(dbPath, (err) => {
      if (err) {
        console.error('❌ Error opening database:', err);
      } else {
        console.log('✅ Connected to SQLite database:', dbPath);
      }
    });
    
    this.initializeTables();
  }

  private async initializeTables() {
    const createUsersTable = `
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        plan TEXT DEFAULT 'free' CHECK (plan IN ('free', 'premium', 'elite')),
        is_premium BOOLEAN DEFAULT false,
        trial_ends_at DATETIME,
        subscription_id TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `;

    const createSessionsTable = `
      CREATE TABLE IF NOT EXISTS sessions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        token TEXT UNIQUE NOT NULL,
        expires_at DATETIME NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
      )
    `;

    const createIndexes = [
      'CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)',
      'CREATE INDEX IF NOT EXISTS idx_users_username ON users(username)',
      'CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token)',
      'CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id)',
      'CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at)'
    ];

    try {
      await this.run(createUsersTable);
      await this.run(createSessionsTable);
      
      for (const index of createIndexes) {
        await this.run(index);
      }
      
      console.log('📊 Database tables initialized successfully');
    } catch (error) {
      console.error('❌ Error initializing database tables:', error);
    }
  }

  public run(sql: string, params: any[] = []): Promise<sqlite3.RunResult> {
    return new Promise((resolve, reject) => {
      this.db.run(sql, params, function(err) {
        if (err) reject(err);
        else resolve(this);
      });
    });
  }

  public get(sql: string, params: any[] = []): Promise<any> {
    return new Promise((resolve, reject) => {
      this.db.get(sql, params, (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
  }

  public all(sql: string, params: any[] = []): Promise<any[]> {
    return new Promise((resolve, reject) => {
      this.db.all(sql, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  }

  // User methods
  public async createUser(userData: Omit<User, 'id' | 'created_at' | 'updated_at'>): Promise<User> {
    const sql = `
      INSERT INTO users (username, email, password_hash, plan, is_premium, trial_ends_at, subscription_id)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `;
    
    const params = [
      userData.username,
      userData.email,
      userData.password_hash,
      userData.plan,
      userData.is_premium,
      userData.trial_ends_at,
      userData.subscription_id
    ];

    try {
      const result = await this.run(sql, params);
      const user = await this.getUserById(result.lastID!);
      if (!user) {
        throw new Error('Failed to retrieve created user');
      }
      console.log(`✅ Created new user: ${userData.username} (${userData.email})`);
      return user;
    } catch (error) {
      console.error('❌ Error creating user:', error);
      throw error;
    }
  }

  public async getUserByEmail(email: string): Promise<User | null> {
    const sql = 'SELECT * FROM users WHERE email = ?';
    const row = await this.get(sql, [email]);
    return row || null;
  }

  public async getUserByUsername(username: string): Promise<User | null> {
    const sql = 'SELECT * FROM users WHERE username = ?';
    const row = await this.get(sql, [username]);
    return row || null;
  }

  public async getUserById(id: number): Promise<User | null> {
    const sql = 'SELECT * FROM users WHERE id = ?';
    const row = await this.get(sql, [id]);
    return row || null;
  }

  public async updateUser(id: number, updates: Partial<User>): Promise<User | null> {
    const fields = Object.keys(updates).filter(key => key !== 'id').map(key => `${key} = ?`);
    const values = Object.values(updates).filter((_, index) => Object.keys(updates)[index] !== 'id');
    
    if (fields.length === 0) return this.getUserById(id);

    const sql = `UPDATE users SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`;
    values.push(id);

    try {
      await this.run(sql, values);
      return this.getUserById(id);
    } catch (error) {
      console.error('❌ Error updating user:', error);
      throw error;
    }
  }

  // Session methods
  public async createSession(userId: number, token: string, expiresAt: Date): Promise<Session> {
    const sql = 'INSERT INTO sessions (user_id, token, expires_at) VALUES (?, ?, ?)';
    const result = await this.run(sql, [userId, token, expiresAt]);
    
    const session = await this.get('SELECT * FROM sessions WHERE id = ?', [result.lastID]);
    console.log(`✅ Created session for user ID: ${userId}`);
    return session;
  }

  public async getSessionByToken(token: string): Promise<Session | null> {
    const sql = 'SELECT * FROM sessions WHERE token = ? AND expires_at > datetime("now")';
    const row = await this.get(sql, [token]);
    return row || null;
  }

  public async deleteSession(token: string): Promise<void> {
    const sql = 'DELETE FROM sessions WHERE token = ?';
    await this.run(sql, [token]);
    console.log('✅ Session deleted');
  }

  public async cleanupExpiredSessions(): Promise<void> {
    const sql = 'DELETE FROM sessions WHERE expires_at <= datetime("now")';
    const result = await this.run(sql);
    if (result.changes && result.changes > 0) {
      console.log(`🧹 Cleaned up ${result.changes} expired sessions`);
    }
  }

  public async getUserWithSession(token: string): Promise<User | null> {
    const sql = `
      SELECT u.* FROM users u
      JOIN sessions s ON u.id = s.user_id
      WHERE s.token = ? AND s.expires_at > datetime("now")
    `;
    const row = await this.get(sql, [token]);
    return row || null;
  }

  public close(): void {
    this.db.close((err) => {
      if (err) {
        console.error('❌ Error closing database:', err);
      } else {
        console.log('✅ Database connection closed');
      }
    });
  }
}

export const database = new Database();

// Cleanup expired sessions every hour
setInterval(() => {
  database.cleanupExpiredSessions().catch(console.error);
}, 60 * 60 * 1000);