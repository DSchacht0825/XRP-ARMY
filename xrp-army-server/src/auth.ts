import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';
import { database, User } from './database';

// JWT Secret - In production, use environment variable
const JWT_SECRET = process.env.JWT_SECRET || 'xrp-army-secret-key-change-in-production-2024';
const JWT_EXPIRES_IN = '7d';
const SALT_ROUNDS = 12;

export interface AuthRequest extends Request {
  user?: User;
}

export interface AuthResponse {
  user: {
    id: number;
    username: string;
    email: string;
    plan: string;
    isActiveSubscription: boolean;
    subscriptionStatus: string;
    subscriptionEndsAt?: string;
  };
  token: string;
  expiresIn: string;
}

export class AuthService {
  static async hashPassword(password: string): Promise<string> {
    try {
      const hash = await bcrypt.hash(password, SALT_ROUNDS);
      return hash;
    } catch (error) {
      console.error('❌ Error hashing password:', error);
      throw new Error('Password hashing failed');
    }
  }

  static async verifyPassword(password: string, hash: string): Promise<boolean> {
    try {
      return await bcrypt.compare(password, hash);
    } catch (error) {
      console.error('❌ Error verifying password:', error);
      return false;
    }
  }

  static generateToken(user: User): string {
    const payload = {
      id: user.id,
      username: user.username,
      email: user.email,
      plan: user.plan,
      isActiveSubscription: user.is_active_subscription || user.is_premium
    };

    return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
  }

  static verifyToken(token: string): any {
    try {
      return jwt.verify(token, JWT_SECRET);
    } catch (error) {
      console.error('❌ Token verification failed:', error);
      return null;
    }
  }

  static async signup(username: string, email: string, password: string, plan: 'basic' | 'premium' = 'basic'): Promise<AuthResponse> {
    // Validation
    if (!username || username.length < 3) {
      throw new Error('Username must be at least 3 characters long');
    }
    
    if (!email || !email.includes('@')) {
      throw new Error('Valid email is required');
    }
    
    if (!password || password.length < 8) {
      throw new Error('Password must be at least 8 characters long');
    }

    // Check if user already exists
    const existingUserByEmail = await database.getUserByEmail(email);
    if (existingUserByEmail) {
      throw new Error('Email is already registered');
    }

    const existingUserByUsername = await database.getUserByUsername(username);
    if (existingUserByUsername) {
      throw new Error('Username is already taken');
    }

    // Hash password
    const passwordHash = await this.hashPassword(password);

    // Create user data
    const userData = {
      username,
      email,
      password_hash: passwordHash,
      plan,
      is_active_subscription: false, // No free access - must subscribe
      subscription_status: 'pending' as const,
      subscription_ends_at: undefined,
      subscription_id: undefined,
      stripe_customer_id: undefined
    };

    try {
      const user = await database.createUser(userData);
      const token = this.generateToken(user);
      
      console.log(`✅ User created: ${username} (${email}) - Plan: ${plan}`);

      return {
        user: {
          id: user.id!,
          username: user.username,
          email: user.email,
          plan: user.plan,
          isActiveSubscription: user.is_active_subscription || user.is_premium || false,
          subscriptionStatus: user.subscription_status || 'pending',
          subscriptionEndsAt: user.subscription_ends_at ? new Date(user.subscription_ends_at).toISOString() : undefined
        },
        token,
        expiresIn: JWT_EXPIRES_IN
      };
    } catch (error: any) {
      console.error('❌ User creation failed:', error);
      throw new Error('Account creation failed');
    }
  }

  static async signin(email: string, password: string): Promise<AuthResponse> {
    // Get user by email
    const user = await database.getUserByEmail(email);
    if (!user) {
      throw new Error('Invalid email or password');
    }

    // Verify password
    const isValidPassword = await this.verifyPassword(password, user.password_hash);
    if (!isValidPassword) {
      throw new Error('Invalid email or password');
    }

    // Check subscription status (backwards compatibility)
    const hasActiveSubscription = user.is_active_subscription || user.is_premium;
    const subscriptionStatus = user.subscription_status || (user.is_premium ? 'active' : 'pending');

    // Check if subscription has expired
    const expirationDate = user.subscription_ends_at || user.trial_ends_at;
    if (hasActiveSubscription && expirationDate && new Date(expirationDate) < new Date()) {
      // Update expired subscription
      await database.updateUser(user.id!, {
        is_active_subscription: false,
        subscription_status: 'expired'
      });
    }

    const token = this.generateToken(user);
    
    console.log(`✅ User signed in: ${user.username} (${email})`);

    return {
      user: {
        id: user.id!,
        username: user.username,
        email: user.email,
        plan: user.plan,
        isActiveSubscription: hasActiveSubscription || false,
        subscriptionStatus,
        subscriptionEndsAt: expirationDate ? new Date(expirationDate).toISOString() : undefined
      },
      token,
      expiresIn: JWT_EXPIRES_IN
    };
  }

  static async logout(token: string): Promise<void> {
    try {
      await database.deleteSession(token);
      console.log('✅ User logged out');
    } catch (error) {
      console.error('❌ Logout error:', error);
      throw new Error('Logout failed');
    }
  }

  static async validateSession(token: string): Promise<User | null> {
    try {
      const payload = this.verifyToken(token);
      if (!payload || !payload.id) {
        return null;
      }

      const user = await database.getUserById(payload.id);
      if (!user) {
        return null;
      }

      // Check if subscription has expired
      const hasActiveSubscription = user.is_active_subscription || user.is_premium;
      const expirationDate = user.subscription_ends_at || user.trial_ends_at;
      
      if (hasActiveSubscription && expirationDate && new Date(expirationDate) < new Date()) {
        // Update expired subscription
        await database.updateUser(user.id!, {
          is_active_subscription: false,
          subscription_status: 'expired'
        });
        
        // Return updated user data
        return await database.getUserById(user.id!);
      }

      return user;
    } catch (error) {
      console.error('❌ Session validation failed:', error);
      return null;
    }
  }

  // Refresh token (extend expiration)
  static async refreshToken(token: string): Promise<string | null> {
    try {
      const user = await this.validateSession(token);
      if (!user) {
        return null;
      }

      const newToken = this.generateToken(user);
      console.log(`🔄 Token refreshed for user: ${user.username}`);
      return newToken;
    } catch (error) {
      console.error('❌ Token refresh failed:', error);
      return null;
    }
  }
}

// Middleware to authenticate requests
export async function authenticateToken(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'Access token required'
      });
    }

    const user = await AuthService.validateSession(token);
    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Invalid or expired token'
      });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error('❌ Authentication middleware error:', error);
    res.status(500).json({
      success: false,
      error: 'Authentication failed'
    });
  }
}