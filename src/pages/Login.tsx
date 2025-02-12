import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, Mail, Github, Chrome } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Helmet } from 'react-helmet-async';
import { supabase } from '../utils/supabaseClient';

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { signIn, signUp } = useAuth();
  const [isSignUp, setIsSignUp] = useState(location.state?.isSignUp || false);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [verificationSent, setVerificationSent] = useState(false);

  const handleSocialLogin = async (provider: 'google' | 'github') => {
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
          queryParams: provider === 'google' ? {
            access_type: 'offline',
            prompt: 'consent',
          } : undefined
        }
      });

      if (error) throw error;
      
      // The user will be redirected to the OAuth provider
      console.log('OAuth initiated:', data);
    } catch (error: any) {
      console.error('Social login error:', error);
      setError(error.message || 'Failed to initialize social login');
    }
  };

  const validateForm = () => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    
    if (!email.trim()) {
      setError('Please enter your email address');
      return false;
    }
    if (!emailRegex.test(email.trim())) {
      setError('Please enter a valid email address');
      return false;
    }
    if (!isForgotPassword && !password) {
      setError('Please enter your password');
      return false;
    }
    if (isSignUp) {
      if (password.length < 6) {
        setError('Password must be at least 6 characters long');
        return false;
      }
      if (password !== confirmPassword) {
        setError('Passwords do not match');
        return false;
      }
    }
    return true;
  };

  const resetForm = () => {
    setEmail('');
    setPassword('');
    setConfirmPassword('');
    setError('');
    setSuccess('');
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    
    if (!email.trim()) {
      setError('Please enter your email address');
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim());
      if (error) throw error;
      setSuccess('Password reset instructions have been sent to your email');
      setEmail('');
    } catch (error: any) {
      setError(error.message || 'Failed to send reset instructions');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    
    if (!validateForm()) {
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      if (isSignUp) {
        const { data: authData, error: signUpError } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            data: {
              username: username.trim()
            }
          }
        });

        if (signUpError) throw signUpError;

        if (authData.user) {
          const { error: profileError } = await supabase
            .from('profiles')
            .insert([
              {
                id: authData.user.id,
                username: username.trim()
              }
            ]);

          if (profileError) throw profileError;
        }

        setVerificationSent(true);
        resetForm();
      } else {
        await signIn(email.trim(), password);
        resetForm();
        navigate('/dashboard');
      }
    } catch (error: any) {
      setError(error.message || 'An unexpected error occurred. Please try again.');
      setPassword('');
      setConfirmPassword('');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (verificationSent) {
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-md text-center">
          <div className="bg-white rounded-lg shadow-xl p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Verify Your Email</h2>
            <p className="text-gray-600 mb-6">
              We've sent a verification link to your email address. Please check your inbox and click the link to verify your account.
            </p>
            <button
              onClick={() => {
                setVerificationSent(false);
                setIsSignUp(false);
              }}
              className="text-primary-600 hover:text-primary-700"
            >
              Return to sign in
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>{isSignUp ? 'Sign Up' : 'Sign In'} - PasteBin Rich Text</title>
      </Helmet>

      <div className="min-h-[80vh] flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <div className="flex items-center justify-center mb-4">
              <img 
                src="/logo.png" 
                alt="Rich Text Logo" 
                className="w-15 h-15"
                style={{ width: '15rem', height: '15rem', objectFit: 'contain' }}
              />
            </div>
            <h1 className="text-3xl font-bold text-white mb-2">
              {isForgotPassword 
                ? 'Reset Password'
                : isSignUp 
                  ? 'Create Account' 
                  : 'Welcome Back'}
            </h1>
            <p className="text-primary-200">
              {isForgotPassword
                ? 'Enter your email to receive reset instructions'
                : isSignUp
                  ? 'Create an account to start sharing your pastes'
                  : 'Sign in to access your pastes'}
            </p>
          </div>

          <div className="bg-white rounded-lg shadow-xl p-8">
            {error && (
              <div className="mb-6 p-4 bg-red-50 border border-red-100 text-red-600 rounded-md text-sm">
                {error}
              </div>
            )}

            {success && (
              <div className="mb-6 p-4 bg-green-50 border border-green-100 text-green-600 rounded-md text-sm">
                {success}
              </div>
            )}

            {/* Social Login Buttons */}
            {!isForgotPassword && (
              <div className="space-y-3 mb-6">
                <button
                  onClick={() => handleSocialLogin('google')}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
                >
                  <Chrome className="w-5 h-5 text-red-500" />
                  <span>Continue with Google</span>
                </button>
                <button
                  onClick={() => handleSocialLogin('github')}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
                >
                  <Github className="w-5 h-5" />
                  <span>Continue with GitHub</span>
                </button>
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-300"></div>
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-2 bg-white text-gray-500">Or continue with email</span>
                  </div>
                </div>
              </div>
            )}
            
            <form onSubmit={isForgotPassword ? handleForgotPassword : handleSubmit} className="space-y-6">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  id="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setError('');
                  }}
                  className="w-full rounded-md border border-gray-300 px-4 py-2 focus:border-primary-500 focus:ring focus:ring-primary-200"
                  required
                  autoComplete={isSignUp ? 'email' : 'username'}
                  disabled={isSubmitting}
                  placeholder="Enter your email"
                />
              </div>

              {isSignUp && (
                <div>
                  <label htmlFor="username" className="block text-sm font-medium text-gray-700">
                    Username
                  </label>
                  <input
                    type="text"
                    id="username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
                    required
                    pattern="^[a-zA-Z0-9][a-zA-Z0-9_-]{2,14}$"
                    title="Username must be 3-15 characters and can only contain letters, numbers, underscores, and hyphens"
                  />
                </div>
              )}

              {!isForgotPassword && (
                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                    Password
                  </label>
                  <input
                    type="password"
                    id="password"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      setError('');
                    }}
                    className="w-full rounded-md border border-gray-300 px-4 py-2 focus:border-primary-500 focus:ring focus:ring-primary-200"
                    required
                    autoComplete={isSignUp ? 'new-password' : 'current-password'}
                    minLength={6}
                    disabled={isSubmitting}
                    placeholder={isSignUp ? 'Create a password' : 'Enter your password'}
                  />
                </div>
              )}

              {isSignUp && (
                <div>
                  <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">
                    Confirm Password
                  </label>
                  <input
                    type="password"
                    id="confirmPassword"
                    value={confirmPassword}
                    onChange={(e) => {
                      setConfirmPassword(e.target.value);
                      setError('');
                    }}
                    className="w-full rounded-md border border-gray-300 px-4 py-2 focus:border-primary-500 focus:ring focus:ring-primary-200"
                    required
                    autoComplete="new-password"
                    minLength={6}
                    disabled={isSubmitting}
                    placeholder="Confirm your password"
                  />
                </div>
              )}
              
              <div className="space-y-4">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className={`w-full bg-primary-600 text-white py-3 px-4 rounded-md hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 transition-colors ${
                    isSubmitting ? 'opacity-75 cursor-not-allowed' : ''
                  }`}
                >
                  {isSubmitting 
                    ? 'Please wait...' 
                    : isForgotPassword
                      ? 'Send Reset Instructions'
                      : isSignUp 
                        ? 'Create Account' 
                        : 'Sign In'}
                </button>

                {isForgotPassword && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsForgotPassword(false);
                      resetForm();
                    }}
                    disabled={isSubmitting}
                    className="w-full flex items-center justify-center gap-2 text-gray-600 hover:text-gray-800 py-2 transition-colors"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    Back to Sign In
                  </button>
                )}
              </div>
            </form>

            {!isForgotPassword && (
              <div className="mt-6 text-center space-y-2">
                <button
                  onClick={() => {
                    setIsSignUp(!isSignUp);
                    resetForm();
                    setIsForgotPassword(false);
                  }}
                  disabled={isSubmitting}
                  className="text-primary-600 hover:text-primary-700 text-sm"
                >
                  {isSignUp
                    ? 'Already have an account? Sign in'
                    : "Don't have an account? Sign up"}
                </button>

                {!isSignUp && (
                  <div>
                    <button
                      onClick={() => {
                        setIsForgotPassword(!isForgotPassword);
                        resetForm();
                        setIsSignUp(false);
                      }}
                      disabled={isSubmitting}
                      className="text-primary-600 hover:text-primary-700 text-sm"
                    >
                      {isForgotPassword
                        ? 'Back to sign in'
                        : 'Forgot your password?'}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}