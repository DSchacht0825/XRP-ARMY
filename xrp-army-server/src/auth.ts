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
      isPremium: user.is_premium
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

  static async signup(username: string, email: string, password: string, plan: 'free' | 'premium' | 'elite' = 'free'): Promise<AuthResponse> {
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

    // Set up premium trial if applicable
    const isPremium = plan !== 'free';
    const trialEndsAt = isPremium ? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) : undefined; // 7 days

    // Create user
    const userData = {
      username,
      email,
      password_hash: passwordHash,
      plan,
      is_premium: isPremium,
      trial_ends_at: trialEndsAt
    };

    const user = await database.createUser(userData);

    // Generate JWT token
    const token = this.generateToken(user);
    
    // Create session
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
    await database.createSession(user.id!, token, expiresAt);

    console.log(`🚀 User ${username} signed up successfully with ${plan} plan`);

    return {
      user: {
        id: user.id!,
        username: user.username,
        email: user.email,
        plan: user.plan,
        isPremium: user.is_premium,
        trialEndsAt: user.trial_ends_at ? new Date(user.trial_ends_at).toISOString() : undefined
      },
      token,
      expiresIn: JWT_EXPIRES_IN
    };
  }

  static async signin(email: string, password: string): Promise<AuthResponse> {
    if (!email || !password) {
      throw new Error('Email and password are required');
    }

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

    // Check if trial has expired for premium users
    if (user.is_premium && user.trial_ends_at) {
      const now = new Date();
      const trialEnd = new Date(user.trial_ends_at);
      
      if (now > trialEnd && !user.subscription_id) {
        // Trial expired, downgrade to free
        await database.updateUser(user.id!, { 
          plan: 'free', 
          is_premium: false,
          trial_ends_at: undefined
        });
        user.plan = 'free';
        user.is_premium = false;
        user.trial_ends_at = undefined;
        
        console.log(`⏰ User ${user.username}'s trial expired, downgraded to free plan`);
      }
    }

    // Generate new JWT token
    const token = this.generateToken(user);
    
    // Create session
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
    await database.createSession(user.id!, token, expiresAt);

    console.log(`✅ User ${user.username} signed in successfully`);

    return {
      user: {
        id: user.id!,
        username: user.username,
        email: user.email,
        plan: user.plan,
        isPremium: user.is_premium,
        trialEndsAt: user.trial_ends_at ? new Date(user.trial_ends_at).toISOString() : undefined
      },
      token,
      expiresIn: JWT_EXPIRES_IN
    };
  }

  static async logout(token: string): Promise<void> {
    try {
      await database.deleteSession(token);
      console.log('✅ User logged out successfully');
    } catch (error) {
      console.error('❌ Error during logout:', error);
      throw new Error('Logout failed');
    }
  }

  static async validateSession(token: string): Promise<User | null> {
    try {
      // Verify JWT token
      const decoded = this.verifyToken(token);
      if (!decoded) {
        return null;
      }

      // Check session in database
      const user = await database.getUserWithSession(token);
      return user;
    } catch (error) {
      console.error('❌ Session validation failed:', error);
      return null;
    }
  }
}

// Middleware for protecting routes
export const authenticateToken = async (req: AuthRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  try {
    const user = await AuthService.validateSession(token);
    if (!user) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error('❌ Token authentication error:', error);
    return res.status(403).json({ error: 'Invalid token' });
  }
};

// Middleware for premium-only routes
export const requirePremium = (req: AuthRequest, res: Response, next: NextFunction) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  if (!req.user.is_premium) {
    return res.status(403).json({ 
      error: 'Premium subscription required',
      upgrade: true,
      userPlan: req.user.plan
    });
  }

  next();
};

// Middleware for checking trial status
export const checkTrialStatus = async (req: AuthRequest, res: Response, next: NextFunction) => {
  if (!req.user) {
    return next();
  }

  if (req.user.is_premium && req.user.trial_ends_at) {
    const now = new Date();
    const trialEnd = new Date(req.user.trial_ends_at);
    
    if (now > trialEnd && !req.user.subscription_id) {
      // Trial expired, update user
      const updatedUser = await database.updateUser(req.user.id!, {
        plan: 'free',
        is_premium: false,
        trial_ends_at: undefined
      });
      
      if (updatedUser) {
        req.user = updatedUser;
      }
    }
  }

  next();
};