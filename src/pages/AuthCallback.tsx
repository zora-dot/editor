import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../utils/supabaseClient';

export default function AuthCallback() {
  const navigate = useNavigate();

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // Get the URL hash
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        const queryParams = new URLSearchParams(window.location.search);
        
        // Check if we have an error
        const error = hashParams.get('error') || queryParams.get('error');
        if (error) {
          throw new Error(error);
        }

        // Get the session
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) throw sessionError;

        if (session) {
          // Check if profile exists
          const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .single();

          if (profileError && profileError.code !== 'PGRST116') {
            throw profileError;
          }

          // If no profile exists, create one
          if (!profile) {
            const { error: insertError } = await supabase
              .from('profiles')
              .insert([{
                id: session.user.id,
                username: `user_${session.user.id.substring(0, 8)}`,
                avatar_url: session.user.user_metadata.avatar_url
              }]);

            if (insertError) throw insertError;
          }

          // Successfully authenticated
          navigate('/dashboard', { replace: true });
        } else {
          // No session found
          throw new Error('No session found');
        }
      } catch (error) {
        console.error('Auth callback error:', error);
        navigate('/login?error=auth_callback_failed', { replace: true });
      }
    };

    handleCallback();
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600 mx-auto mb-4"></div>
        <p className="text-primary-100">Completing sign in...</p>
      </div>
    </div>
  );
}