export const API_BASE_URL = process.env.NODE_ENV === 'production' 
  ? 'https://api.edgexrp.com/api'
  : 'http://localhost:5001/api';

export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
}

export interface User {
  id: number;
  username: string;
  email: string;
  plan: 'basic' | 'premium';
  isActiveSubscription: boolean;
  subscriptionStatus: string;
  subscriptionEndsAt?: string;
  subscriptionId?: string;
  joinedAt?: string;
}

export interface AuthResponse {
  user: User;
  token: string;
  expiresIn: string;
}

class ApiService {
  private static getAuthHeader(): { Authorization?: string } {
    const token = localStorage.getItem('xrp_auth_token');
    return token ? { Authorization: `Bearer ${token}` } : {};
  }

  private static async makeRequest<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    try {
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        headers: {
          'Content-Type': 'application/json',
          ...this.getAuthHeader(),
          ...options.headers,
        },
        ...options,
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || `HTTP error! status: ${response.status}`);
      }

      return data;
    } catch (error: any) {
      console.error(`API Error (${endpoint}):`, error.message);
      return {
        success: false,
        error: error.message || 'Network error occurred'
      };
    }
  }

  // Authentication endpoints
  static async signup(
    username: string, 
    email: string, 
    password: string, 
    plan: 'basic' | 'premium' = 'basic'
  ): Promise<ApiResponse<AuthResponse>> {
    const response = await this.makeRequest<AuthResponse>('/auth/signup', {
      method: 'POST',
      body: JSON.stringify({ username, email, password, plan }),
    });

    if (response.success && response.data) {
      localStorage.setItem('xrp_auth_token', response.data.token);
      localStorage.setItem('xrp_user', JSON.stringify(response.data.user));
    }

    return response;
  }

  static async signin(email: string, password: string): Promise<ApiResponse<AuthResponse>> {
    const response = await this.makeRequest<AuthResponse>('/auth/signin', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });

    if (response.success && response.data) {
      localStorage.setItem('xrp_auth_token', response.data.token);
      localStorage.setItem('xrp_user', JSON.stringify(response.data.user));
    }

    return response;
  }

  static async logout(): Promise<ApiResponse<void>> {
    const response = await this.makeRequest<void>('/auth/logout', {
      method: 'POST',
    });

    // Always clear local storage, even if the API call fails
    localStorage.removeItem('xrp_auth_token');
    localStorage.removeItem('xrp_user');

    return response;
  }

  static async getCurrentUser(): Promise<ApiResponse<User>> {
    return this.makeRequest<User>('/auth/me');
  }

  static async validateToken(token: string): Promise<ApiResponse<User>> {
    return this.makeRequest<User>('/auth/validate', {
      method: 'POST',
      body: JSON.stringify({ token }),
    });
  }

  static async upgradeToPremium(plan: 'premium' | 'elite'): Promise<ApiResponse<any>> {
    return this.makeRequest<any>('/auth/upgrade', {
      method: 'POST',
      body: JSON.stringify({ plan }),
    });
  }

  // Utility methods
  static getStoredUser(): User | null {
    const userStr = localStorage.getItem('xrp_user');
    if (!userStr) return null;
    
    try {
      return JSON.parse(userStr);
    } catch (error) {
      console.error('Error parsing stored user:', error);
      localStorage.removeItem('xrp_user');
      return null;
    }
  }

  static getStoredToken(): string | null {
    return localStorage.getItem('xrp_auth_token');
  }

  static isAuthenticated(): boolean {
    return !!(this.getStoredToken() && this.getStoredUser());
  }

  static async initializeAuth(): Promise<User | null> {
    const token = this.getStoredToken();
    if (!token) return null;

    try {
      const response = await this.validateToken(token);
      if (response.success && response.data) {
        localStorage.setItem('xrp_user', JSON.stringify(response.data));
        return response.data;
      } else {
        // Token is invalid, clear storage
        localStorage.removeItem('xrp_auth_token');
        localStorage.removeItem('xrp_user');
        return null;
      }
    } catch (error) {
      console.error('Auth initialization failed:', error);
      localStorage.removeItem('xrp_auth_token');
      localStorage.removeItem('xrp_user');
      return null;
    }
  }
}

export default ApiService;