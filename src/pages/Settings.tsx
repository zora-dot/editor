import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { createClient } from '@supabase/supabase-js';
import { Key, Trash2, User, RefreshCw, Mail, DollarSign } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Helmet } from 'react-helmet-async';
import { format } from 'date-fns';

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

interface Profile {
  username: string;
  avatar_url: string | null;
  bio: string | null;
  subscription_tier?: string;
  subscription_expires_at?: string;
}

export default function Settings() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [currentEmailPassword, setCurrentEmailPassword] = useState('');
  const [deleteAccountPassword, setDeleteAccountPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [username, setUsername] = useState('');
  const [bio, setBio] = useState('');
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [usernameAvailable, setUsernameAvailable] = useState(true);
  const [isCheckingUsername, setIsCheckingUsername] = useState(false);
  const MAX_RETRIES = 3;

  useEffect(() => {
    if (user) {
      fetchProfile();
    } else {
      navigate('/login');
    }
  }, [user, navigate]);

  useEffect(() => {
    const checkUsername = async () => {
      if (!username || username === profile?.username) {
        setUsernameAvailable(true);
        return;
      }

      if (username.length > 15 || !/^[a-zA-Z0-9_-]+$/.test(username)) {
        setUsernameAvailable(false);
        return;
      }

      setIsCheckingUsername(true);
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('username')
          .ilike('username', username)
          .neq('id', user?.id)
          .maybeSingle();

        setUsernameAvailable(!data);
      } catch (error) {
        console.error('Error checking username:', error);
      } finally {
        setIsCheckingUsername(false);
      }
    };

    const timeoutId = setTimeout(checkUsername, 500);
    return () => clearTimeout(timeoutId);
  }, [username]);

  const fetchProfile = async (retry = false) => {
    if (!user) return;

    try {
      setIsLoading(true);
      setError('');

      const { data, error } = await supabase
        .from('profiles')
        .select('username, avatar_url, bio, subscription_tier, subscription_expires_at')
        .eq('id', user.id)
        .maybeSingle();

      if (error) throw error;
      
      if (data) {
        setProfile(data);
        setUsername(data.username);
        setBio(data.bio || '');
        setRetryCount(0);
      } else if (retry && retryCount < MAX_RETRIES) {
        const delay = Math.pow(2, retryCount) * 1000;
        setTimeout(() => {
          setRetryCount(prev => prev + 1);
          fetchProfile(true);
        }, delay);
      } else {
        throw new Error('Profile not found');
      }
    } catch (error: any) {
      console.error('Error fetching profile:', error);
      setError('Failed to load profile. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!currentPassword) {
      setError('Please enter your current password');
      return;
    }

    if (newPassword !== confirmNewPassword) {
      setError('New passwords do not match');
      return;
    }

    if (newPassword.length < 6) {
      setError('New password must be at least 6 characters long');
      return;
    }

    setIsLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
        email: user?.email
      }, {
        currentPassword: currentPassword
      });

      if (error) throw error;

      setSuccess('Password updated successfully');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmNewPassword('');
    } catch (error: any) {
      setError(error.message || 'Failed to update password');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEmailChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!currentEmailPassword) {
      setError('Please enter your current password');
      return;
    }

    if (!newEmail) {
      setError('Please enter a new email address');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newEmail)) {
      setError('Please enter a valid email address');
      return;
    }

    setIsLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({
        email: newEmail
      }, {
        currentPassword: currentEmailPassword
      });

      if (error) throw error;

      setSuccess('Email update confirmation sent to your new email address');
      setNewEmail('');
      setCurrentEmailPassword('');
    } catch (error: any) {
      setError(error.message || 'Failed to update email');
    } finally {
      setIsLoading(false);
    }
  };

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    // Validate username format
    const usernameRegex = /^[a-zA-Z0-9][a-zA-Z0-9_-]{2,14}$/;
    if (!usernameRegex.test(username)) {
      setError('Username must be 3-15 characters and can only contain letters, numbers, underscores, and hyphens');
      return;
    }

    // Validate bio length
    if (bio.length > 150) {
      setError('Bio must be 150 characters or less');
      return;
    }

    setError('');
    setSuccess('');
    setIsLoading(true);

    try {
      // Check if username is taken (case insensitive)
      const { data: existingUser, error: checkError } = await supabase
        .from('profiles')
        .select('id')
        .neq('id', user.id)
        .ilike('username', username)
        .maybeSingle();

      if (checkError) throw checkError;

      if (existingUser) {
        setError('This username is already taken');
        return;
      }

      const { error } = await supabase
        .from('profiles')
        .update({
          username,
          bio,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id);

      if (error) throw error;

      setSuccess('Profile updated successfully');
      setIsEditingProfile(false);
      await fetchProfile();
    } catch (error: any) {
      setError(error.message || 'Failed to update profile');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!deleteAccountPassword) {
      setError('Please enter your password to confirm account deletion');
      return;
    }

    const confirmed = window.confirm(
      'Are you sure you want to delete your account? This will permanently delete your account and all your pastes. This action cannot be undone.'
    );

    if (!confirmed) return;

    setIsLoading(true);
    try {
      // Verify password first
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user?.email || '',
        password: deleteAccountPassword
      });

      if (signInError) throw new Error('Invalid password');

      // Delete all user's data
      const { error: dataError } = await supabase
        .from('profiles')
        .delete()
        .eq('id', user?.id);

      if (dataError) throw dataError;

      await signOut();
      navigate('/');
    } catch (error: any) {
      setError(error.message || 'Failed to delete account');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRetry = () => {
    setRetryCount(0);
    fetchProfile(true);
  };

  const handleCancelSubscription = async () => {
    const confirmed = window.confirm(
      'Are you sure you want to cancel your subscription? You will lose access to supporter features at the end of your current billing period.'
    );

    if (!confirmed) return;

    setIsLoading(true);
    try {
      const response = await fetch('/.netlify/functions/cancel-subscription', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId: user?.id }),
      });

      if (!response.ok) {
        throw new Error('Failed to cancel subscription');
      }

      setSuccess('Your subscription has been cancelled and will end at the end of the current billing period');
      await fetchProfile();
    } catch (error) {
      console.error('Error cancelling subscription:', error);
      setError('Failed to cancel subscription. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (!user) {
    return null;
  }

  return (
    <>
      <Helmet>
        <title>Settings - PasteBin Rich Text</title>
      </Helmet>

      <div className="max-w-2xl mx-auto">
        <div className="bg-primary-800/50 rounded-lg backdrop-blur-sm border border-primary-700 p-6 mb-8">
          <h1 className="text-2xl font-bold text-white mb-2">Account Settings</h1>
          <p className="text-primary-200">Manage your account preferences</p>
        </div>

        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <User className="w-5 h-5 text-primary-500" />
                <h2 className="text-xl font-semibold">Profile</h2>
              </div>
            </div>

            {isEditingProfile ? (
              <form onSubmit={handleProfileUpdate} className="space-y-4">
                <div>
                  <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-1">
                    Username
                  </label>
                  <input
                    type="text"
                    id="username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className={`mt-1 block w-full rounded-md ${
                      isCheckingUsername
                        ? 'border-yellow-300'
                        : usernameAvailable
                        ? 'border-green-300'
                        : 'border-red-300'
                    } px-3 py-2 focus:border-primary-500 focus:ring focus:ring-primary-200`}
                    maxLength={15}
                    required
                  />
                  <p className="mt-1 text-sm text-gray-500">
                    Username must be 3-15 characters and can only contain letters, numbers, underscores, and hyphens.
                  </p>
                </div>

                <div>
                  <label htmlFor="bio" className="block text-sm font-medium text-gray-700 mb-1">
                    Bio
                  </label>
                  <div className="relative">
                    <textarea
                      id="bio"
                      value={bio}
                      onChange={(e) => setBio(e.target.value)}
                      maxLength={150}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
                      placeholder="Tell us about yourself..."
                    />
                    <div className="absolute bottom-2 right-2 text-xs text-gray-500 bg-white px-1">
                      {bio.length}/150
                    </div>
                  </div>
                </div>

                <div className="flex justify-end space-x-4">
                  <button
                    type="button"
                    onClick={() => {
                      setIsEditingProfile(false);
                      setUsername(profile?.username || '');
                      setBio(profile?.bio || '');
                      setError('');
                    }}
                    className="px-4 py-2 border border-gray-300 rounded-md text-gray-600 hover:bg-gray-50"
                    disabled={isLoading}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isLoading || !usernameAvailable}
                    className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-50"
                  >
                    {isLoading ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </form>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Username
                  </label>
                  <p className="mt-1 text-gray-900">{profile?.username}</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Bio
                  </label>
                  <p className="mt-1 text-gray-900 whitespace-pre-wrap break-words">{profile?.bio || 'No bio set'}</p>
                </div>

                <button
                  onClick={() => setIsEditingProfile(true)}
                  className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700"
                >
                  Edit Profile
                </button>
              </div>
            )}
          </div>

          {/* Email Section */}
          <div className="bg-white rounded-lg shadow-xl p-6">
            <div className="flex items-center gap-2 mb-4">
              <Mail className="w-5 h-5 text-primary-500" />
              <h2 className="text-xl font-semibold">Change Email</h2>
            </div>

            <form onSubmit={handleEmailChange} className="space-y-4">
              <div>
                <label htmlFor="newEmail" className="block text-sm font-medium text-gray-700">
                  New Email
                </label>
                <input
                  type="email"
                  id="newEmail"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-primary-500 focus:ring focus:ring-primary-200"
                  required
                />
              </div>

              <div>
                <label htmlFor="currentEmailPassword" className="block text-sm font-medium text-gray-700">
                  Current Password
                </label>
                <input
                  type="password"
                  id="currentEmailPassword"
                  value={currentEmailPassword}
                  onChange={(e) => setCurrentEmailPassword(e.target.value)}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-primary-500 focus:ring focus:ring-primary-200"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-primary-600 text-white py-2 px-4 rounded-md hover:bg-primary-700 disabled:opacity-50"
              >
                {isLoading ? 'Updating...' : 'Update Email'}
              </button>
            </form>
          </div>

          {/* Change Password Section */}
          <div className="bg-white rounded-lg shadow-xl p-6">
            <div className="flex items-center gap-2 mb-4">
              <Key className="w-5 h-5 text-primary-500" />
              <h2 className="text-xl font-semibold">Change Password</h2>
            </div>

            <form onSubmit={handlePasswordChange} className="space-y-4">
              <div>
                <label htmlFor="currentPassword" className="block text-sm font-medium text-gray-700">
                  Current Password
                </label>
                <input
                  type="password"
                  id="currentPassword"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-primary-500 focus:ring focus:ring-primary-200"
                  required
                />
              </div>

              <div>
                <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700">
                  New Password
                </label>
                <input
                  type="password"
                  id="newPassword"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-primary-500 focus:ring focus:ring-primary-200"
                  minLength={6}
                  required
                />
              </div>

              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
                  Confirm New Password
                </label>
                <input
                  type="password"
                  id="confirmPassword"
                  value={confirmNewPassword}
                  onChange={(e) => setConfirmNewPassword(e.target.value)}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-primary-500 focus:ring focus:ring-primary-200"
                  minLength={6}
                  required
                />
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className={`w-full bg-primary-600 text-white py-2 px-4 rounded-md hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 transition-colors ${
                  isLoading ? 'opacity-75 cursor-not-allowed' : ''
                }`}
              >
                {isLoading ? 'Updating...' : 'Update Password'}
              </button>
            </form>
          </div>

          {/* Subscription Management Section */}
          <div className="bg-white rounded-lg shadow-xl p-6">
            <div className="flex items-center gap-2 mb-4">
              <DollarSign className="w-5 h-5 text-primary-500" />
              <h2 className="text-xl font-semibold">Subscription Management</h2>
            </div>

            {profile?.subscription_tier === 'SUPPORTER' ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-primary-50 rounded-lg">
                  <div>
                    <h3 className="font-medium text-gray-900">Active Subscription</h3>
                    <p className="text-sm text-gray-600">
                      You are currently a Supporter
                    </p>
                    {profile?.subscription_expires_at && (
                      <p className="text-sm text-gray-600">
                        Next billing date:{' '}
                        {format(
                          new Date(profile.subscription_expires_at),
                          'MMMM dd, yyyy'
                        )}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={handleCancelSubscription}
                    disabled={isLoading}
                    className="px-4 py-2 text-red-600 hover:text-red-700 border border-red-200 hover:border-red-300 rounded-md transition-colors"
                  >
                    Cancel Subscription
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-gray-600">
                    You are currently on the free plan.{' '}
                    <Link
                      to="/pricing"
                      className="text-primary-600 hover:text-primary-700"
                    >
                      Upgrade to Supporter
                    </Link>{' '}
                    to access premium features.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Delete Account Section */}
          <div className="bg-white rounded-lg shadow-xl p-6">
            <div className="flex items-center gap-2 mb-4">
              <Trash2 className="w-5 h-5 text-red-500" />
              <h2 className="text-xl font-semibold">Delete Account</h2>
            </div>
            <p className="text-gray-600 mb-4">
              Permanently delete your account and all associated pastes. This action cannot be undone.
            </p>
            <div className="space-y-4">
              <div>
                <label htmlFor="deletePassword" className="block text-sm font-medium text-gray-700">
                  Enter your password to confirm
                </label>
                <input
                  type="password"
                  id="deletePassword"
                  value={deleteAccountPassword}
                  onChange={(e) => setDeleteAccountPassword(e.target.value)}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-primary-500 focus:ring focus:ring-primary-200"
                  required
                />
              </div>
              <button
                onClick={handleDeleteAccount}
                disabled={isLoading}
                className={`w-full bg-red-600 text-white py-2 px-4 rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-colors ${
                  isLoading ? 'opacity-75 cursor-not-allowed' : ''
                }`}
              >
                {isLoading ? 'Processing...' : 'Delete Account'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}