/**
 * Second Brain Authentication Service
 * Supports both Cloud (Supabase) and Resilient Local Multi-Account Authentication
 */
import { getSupabase } from './supabaseClient.js';
import { config } from './config.js';

class AuthService {
  constructor() {
    this.currentUser = null;
    this.listeners = new Set();
    this.isInitialized = false;
  }

  async hashPassword(password) {
    if (typeof crypto !== 'undefined' && crypto.subtle) {
      const msgUint8 = new TextEncoder().encode(password);
      const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    }
    // Fallback basic hash if crypto.subtle is unavailable
    let hash = 0;
    for (let i = 0; i < password.length; i++) {
      hash = (hash << 5) - hash + password.charCodeAt(i);
      hash |= 0;
    }
    return `h_${Math.abs(hash)}`;
  }

  async init() {
    if (this.isInitialized) return this.currentUser;

    const supabase = getSupabase();
    if (supabase) {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          this.currentUser = {
            id: session.user.id,
            email: session.user.email,
            name: session.user.user_metadata?.name || session.user.email.split('@')[0],
            isCloud: true
          };
        }

        // Listen for Supabase auth state changes
        supabase.auth.onAuthStateChange((event, session) => {
          if (session?.user) {
            this.currentUser = {
              id: session.user.id,
              email: session.user.email,
              name: session.user.user_metadata?.name || session.user.email.split('@')[0],
              isCloud: true
            };
          } else {
            this.currentUser = null;
          }
          this.notify();
        });
      } catch (err) {
        console.warn('Supabase auth session check failed:', err);
      }
    }

    // If not logged in via Supabase, check local session
    if (!this.currentUser && typeof localStorage !== 'undefined') {
      try {
        const savedSession = localStorage.getItem('secondBrain_auth_session');
        if (savedSession) {
          this.currentUser = JSON.parse(savedSession);
        }
      } catch (e) {
        console.warn('Failed to parse local auth session:', e);
      }
    }

    this.isInitialized = true;
    return this.currentUser;
  }

  onAuthChange(fn) {
    this.listeners.add(fn);
    if (this.isInitialized) {
      fn(this.currentUser);
    }
    return () => this.listeners.delete(fn);
  }

  notify() {
    this.listeners.forEach(fn => fn(this.currentUser));
  }

  getCurrentUser() {
    return this.currentUser;
  }

  getUserId() {
    return this.currentUser ? this.currentUser.id : 'guest';
  }

  async signUp({ name, email, password }) {
    const cleanEmail = (email || '').trim().toLowerCase();
    const cleanName = (name || '').trim() || cleanEmail.split('@')[0];

    if (!cleanEmail || !cleanEmail.includes('@')) {
      throw new Error('Please enter a valid email address');
    }
    if (!password || password.length < 6) {
      throw new Error('Password must be at least 6 characters long');
    }

    const supabase = getSupabase();
    if (supabase) {
      const { data, error } = await supabase.auth.signUp({
        email: cleanEmail,
        password,
        options: {
          data: { name: cleanName }
        }
      });
      if (error) throw new Error(error.message);

      if (data?.user) {
        this.currentUser = {
          id: data.user.id,
          email: data.user.email,
          name: cleanName,
          isCloud: true
        };
        this.notify();
        return { success: true, user: this.currentUser, message: 'Account created in Supabase cloud!' };
      }
    }

    // Local multi-account creation
    const accounts = JSON.parse(localStorage.getItem('secondBrain_accounts') || '[]');
    const existing = accounts.find(a => a.email.toLowerCase() === cleanEmail);
    if (existing) {
      throw new Error('An account with this email already exists. Please Sign In.');
    }

    const passwordHash = await this.hashPassword(password);
    const userId = `usr_${cleanEmail.replace(/[^a-z0-9]/gi, '_')}`;

    const newAccount = {
      id: userId,
      name: cleanName,
      email: cleanEmail,
      passwordHash,
      createdAt: new Date().toISOString()
    };

    accounts.push(newAccount);
    localStorage.setItem('secondBrain_accounts', JSON.stringify(accounts));

    this.currentUser = {
      id: userId,
      name: cleanName,
      email: cleanEmail,
      isCloud: false
    };

    localStorage.setItem('secondBrain_auth_session', JSON.stringify(this.currentUser));
    this.notify();
    return { success: true, user: this.currentUser, message: 'Account created successfully! ⚡' };
  }

  async signIn({ email, password }) {
    const cleanEmail = (email || '').trim().toLowerCase();

    if (!cleanEmail || !cleanEmail.includes('@')) {
      throw new Error('Please enter a valid email address');
    }
    if (!password) {
      throw new Error('Please enter your password');
    }

    const supabase = getSupabase();
    if (supabase) {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password
      });
      if (error) throw new Error(error.message);

      if (data?.user) {
        this.currentUser = {
          id: data.user.id,
          email: data.user.email,
          name: data.user.user_metadata?.name || cleanEmail.split('@')[0],
          isCloud: true
        };
        this.notify();
        return { success: true, user: this.currentUser };
      }
    }

    // Local multi-account sign in
    const accounts = JSON.parse(localStorage.getItem('secondBrain_accounts') || '[]');
    const account = accounts.find(a => a.email.toLowerCase() === cleanEmail);
    if (!account) {
      throw new Error('No account found with this email. Click "Create Account" below.');
    }

    const passwordHash = await this.hashPassword(password);
    if (account.passwordHash !== passwordHash) {
      throw new Error('Incorrect password. Please verify and try again.');
    }

    this.currentUser = {
      id: account.id,
      name: account.name,
      email: account.email,
      isCloud: false
    };

    localStorage.setItem('secondBrain_auth_session', JSON.stringify(this.currentUser));
    this.notify();
    return { success: true, user: this.currentUser };
  }

  async signOut() {
    const supabase = getSupabase();
    if (supabase) {
      try {
        await supabase.auth.signOut();
      } catch (e) {
        console.warn('Supabase sign out warning:', e);
      }
    }

    localStorage.removeItem('secondBrain_auth_session');
    this.currentUser = null;
    this.notify();
    return { success: true };
  }
}

export const auth = new AuthService();
