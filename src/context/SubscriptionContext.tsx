import React, { createContext, useContext, useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { useAuth } from './AuthContext';

// Create a single supabase client instance
const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true
    }
  }
);

interface SubscriptionContextType {
  isSupporter: boolean;
  subscription: any;
  loading: boolean;
  error: string | null;
  checkSubscriptionStatus: () => Promise<void>;
}

const SubscriptionContext = createContext<SubscriptionContextType | null>(null);

export function SubscriptionProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [isSupporter, setIsSupporter] = useState(false);
  const [subscription, setSubscription] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const MAX_RETRIES = 3;
  const RETRY_DELAY = 1000; // 1 second

  const checkSubscriptionStatus = async (retry = false) => {
    if (!user) {
      setIsSupporter(false);
      setSubscription(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('subscription_tier, subscription_expires_at')
        .eq('id', user.id)
        .single();

      if (profileError) {
        // If error is related to network/connection, retry
        if (retry && retryCount < MAX_RETRIES) {
          setRetryCount(prev => prev + 1);
          setTimeout(() => {
            checkSubscriptionStatus(true);
          }, RETRY_DELAY * Math.pow(2, retryCount)); // Exponential backoff
          return;
        }
        throw profileError;
      }

      const isActive = profile?.subscription_tier === 'SUPPORTER' && 
        (!profile?.subscription_expires_at || new Date(profile.subscription_expires_at) > new Date());

      setIsSupporter(isActive);
      setSubscription(profile);
      setRetryCount(0); // Reset retry count on success
    } catch (error: any) {
      console.error('Error checking subscription:', error);
      setError('Failed to check subscription status');
      setIsSupporter(false);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkSubscriptionStatus(true);

    // Set up real-time subscription for profile changes
    const subscription = supabase
      .channel('profile_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'profiles',
          filter: user ? `id=eq.${user.id}` : undefined
        },
        () => {
          checkSubscriptionStatus(false);
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [user]);

  return (
    <SubscriptionContext.Provider value={{
      isSupporter,
      subscription,
      loading,
      error,
      checkSubscriptionStatus: () => checkSubscriptionStatus(true)
    }}>
      {children}
    </SubscriptionContext.Provider>
  );
}

export const useSubscription = () => {
  const context = useContext(SubscriptionContext);
  if (!context) {
    throw new Error('useSubscription must be used within a SubscriptionProvider');
  }
  return context;
};