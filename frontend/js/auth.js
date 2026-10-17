/**
 * Second Brain Authentication Service
 * Supports both Cloud (Supabase) and Resilient Local Multi-Account Authentication
 */
import { getSupabase } from './supabaseClient.js';
import { config } from './config.js';

class AuthService {
  constructor() {
    this.currentUser = this.loadStoredSession();
    this.listeners = new Set();
    this.isInitialized = Boolean(this.currentUser);
  }

  loadStoredSession() {
    if (typeof localStorage === 'undefined') return null;
    try {
      const saved = localStorage.getItem('secondBrain_auth_session') || localStorage.getItem('secondBrain_current_user');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.id && parsed.email) {
          return parsed;
        }
      }
    } catch (e) {
      console.warn('Failed to parse saved auth session:', e);
    }
    return null;
  }

  saveSession(user) {
    this.currentUser = user;
    if (typeof localStorage !== 'undefined') {
      if (user) {
        const serialized = JSON.stringify(user);
        localStorage.setItem('secondBrain_auth_session', serialized);
        localStorage.setItem('secondBrain_current_user', serialized);
      } else {
        localStorage.removeItem('secondBrain_auth_session');
        localStorage.removeItem('secondBrain_current_user');
      }
    }
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
    // If we already have a synchronous local user, keep it
    if (!this.currentUser) {
      this.currentUser = this.loadStoredSession();
    }

    const supabase = getSupabase();
    if (supabase) {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          const cloudUser = {
            id: session.user.id,
            email: session.user.email,
            name: session.user.user_metadata?.name || session.user.email.split('@')[0],
            isCloud: true
          };
          this.saveSession(cloudUser);
        }

        // Listen for Supabase auth state changes
        supabase.auth.onAuthStateChange((event, session) => {
          if (session?.user) {
            const cloudUser = {
              id: session.user.id,
              email: session.user.email,
              name: session.user.user_metadata?.name || session.user.email.split('@')[0],
              isCloud: true
            };
            this.saveSession(cloudUser);
            this.notify();
          } else if (event === 'SIGNED_OUT') {
            // CRITICAL: Only clear session if currently logged in via Supabase cloud!
            // Do NOT wipe out local multi-account users when Supabase fires unauthenticated event.
            if (this.currentUser && this.currentUser.isCloud) {
              this.saveSession(null);
              this.notify();
            }
          }
        });
      } catch (err) {
        console.warn('Supabase auth session check failed:', err);
      }
    }

    this.isInitialized = true;
    this.notify();
    return this.currentUser;
  }

  onAuthChange(fn) {
    this.listeners.add(fn);
    if (this.isInitialized || this.currentUser) {
      fn(this.currentUser);
    }
    return () => this.listeners.delete(fn);
  }

  notify() {
    this.listeners.forEach(fn => fn(this.currentUser));
  }

  getCurrentUser() {
    if (!this.currentUser) {
      this.currentUser = this.loadStoredSession();
    }
    return this.currentUser;
  }

  getUserId() {
    const user = this.getCurrentUser();
    return user ? user.id : 'guest';
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
        const cloudUser = {
          id: data.user.id,
          email: data.user.email,
          name: cleanName,
          isCloud: true
        };
        this.saveSession(cloudUser);
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

    const localUser = {
      id: userId,
      name: cleanName,
      email: cleanEmail,
      isCloud: false
    };

    this.saveSession(localUser);
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
        const cloudUser = {
          id: data.user.id,
          email: data.user.email,
          name: data.user.user_metadata?.name || cleanEmail.split('@')[0],
          isCloud: true
        };
        this.saveSession(cloudUser);
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

    const localUser = {
      id: account.id,
      name: account.name,
      email: account.email,
      isCloud: false
    };

    this.saveSession(localUser);
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

    this.saveSession(null);
    this.notify();
    return { success: true };
  }
}

export const auth = new AuthService();
