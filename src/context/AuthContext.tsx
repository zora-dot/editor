import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, AuthError } from '@supabase/supabase-js';
import { supabase } from '../utils/supabaseClient';

interface AuthContextType {
  user: User | null;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

const LOGIN_ATTEMPTS_KEY = 'login_attempts';
const LOGIN_LOCKOUT_KEY = 'login_lockout_until';
const MAX_LOGIN_ATTEMPTS = 10;
const LOCKOUT_DURATION = 60 * 60 * 1000; // 1 hour in milliseconds

interface LoginAttempts {
  count: number;
  firstAttempt: number;
}

const getLoginAttempts = (): LoginAttempts => {
  const stored = localStorage.getItem(LOGIN_ATTEMPTS_KEY);
  return stored ? JSON.parse(stored) : { count: 0, firstAttempt: Date.now() };
};

const setLoginAttempts = (attempts: LoginAttempts) => {
  localStorage.setItem(LOGIN_ATTEMPTS_KEY, JSON.stringify(attempts));
};

const resetLoginAttempts = () => {
  localStorage.removeItem(LOGIN_ATTEMPTS_KEY);
  localStorage.removeItem(LOGIN_LOCKOUT_KEY);
};

const isLockedOut = (): boolean => {
  const lockoutUntil = localStorage.getItem(LOGIN_LOCKOUT_KEY);
  if (!lockoutUntil) return false;
  
  const lockoutTime = parseInt(lockoutUntil, 10);
  return Date.now() < lockoutTime;
};

const checkLoginAttempts = () => {
  if (isLockedOut()) {
    const lockoutUntil = parseInt(localStorage.getItem(LOGIN_LOCKOUT_KEY)!, 10);
    const remainingTime = Math.ceil((lockoutUntil - Date.now()) / 1000 / 60);
    throw new Error(`Too many login attempts. Please try again in ${remainingTime} minutes.`);
  }

  const attempts = getLoginAttempts();
  const now = Date.now();

  if (now - attempts.firstAttempt > LOCKOUT_DURATION) {
    resetLoginAttempts();
    return;
  }

  if (attempts.count >= MAX_LOGIN_ATTEMPTS) {
    localStorage.setItem(LOGIN_LOCKOUT_KEY, (now + LOCKOUT_DURATION).toString());
    resetLoginAttempts();
    throw new Error('Too many login attempts. Please try again in 60 minutes.');
  }

  setLoginAttempts({
    count: attempts.count + 1,
    firstAttempt: attempts.firstAttempt || now,
  });
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const initializeAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (mounted) {
          setUser(session?.user ?? null);
          setLoading(false);
        }
      } catch (error) {
        console.error('Error getting session:', error);
        if (mounted) {
          setUser(null);
          setLoading(false);
        }
      }
    };

    initializeAuth();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!mounted) return;

      setUser(session?.user ?? null);
      
      if (session?.user) {
        resetLoginAttempts();
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      checkLoginAttempts();

      if (!email.trim() || !password) {
        throw new Error('Please enter both email and password.');
      }

      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password
      });

      if (error) throw error;
      resetLoginAttempts();
    } catch (error) {
      if (error instanceof AuthError) {
        switch (error.message) {
          case 'Invalid login credentials':
            throw new Error('The email or password you entered is incorrect.');
          case 'Email not confirmed':
            throw new Error('Please verify your email address before signing in.');
          default:
            throw new Error(error.message);
        }
      }
      throw error;
    }
  };

  const signUp = async (email: string, password: string) => {
    try {
      if (!email.trim() || !password) {
        throw new Error('Please fill in all required fields.');
      }

      if (password.length < 6) {
        throw new Error('Password must be at least 6 characters long.');
      }

      const { error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
          data: {
            email_confirmed: false
          }
        }
      });

      if (error) throw error;
    } catch (error) {
      if (error instanceof AuthError) {
        switch (error.message) {
          case 'User already registered':
            throw new Error('An account with this email already exists. Please sign in instead.');
          case 'Password should be at least 6 characters':
            throw new Error('Password must be at least 6 characters long.');
          default:
            throw new Error(error.message);
        }
      }
      throw error;
    }
  };

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      window.location.href = '/';
    } catch (error) {
      if (error instanceof AuthError) {
        throw new Error(error.message);
      }
      throw new Error('Failed to sign out. Please try again.');
    }
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      signIn, 
      signUp, 
      signOut,
      loading 
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};