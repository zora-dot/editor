import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Settings, User, Search, Star, Menu, X, DollarSign } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { createClient } from '@supabase/supabase-js';
import NotificationsPopover from './NotificationsPopover';

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

interface Profile {
  username: string;
  avatar_url: string | null;
}

export default function Navbar() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);

  useEffect(() => {
    if (user) {
      fetchProfile();
    }
  }, [user]);

  const fetchProfile = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('username, avatar_url')
        .eq('id', user?.id)
        .single();

      if (error) throw error;
      setProfile(data);
    } catch (error) {
      console.error('Error fetching profile:', error);
    }
  };

  const handleSearch = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setSearchQuery(query);
    setSearchError(null);
    
    if (!query.trim()) {
      setSearchResults([]);
      setShowResults(false);
      return;
    }

    setIsSearching(true);
    setShowResults(true);

    try {
      const { data, error } = await supabase
        .from('pastes')
        .select('id, title, content, created_at')
        .textSearch('search_vector', query)
        .filter('user_id', 'eq', user?.id)
        .limit(10);

      if (error) throw error;
      setSearchResults(data || []);
    } catch (error: any) {
      console.error('Search error:', error);
      setSearchError('Unable to search at the moment. Please try again later.');
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  return (
    <nav className="bg-primary-900/50 backdrop-blur-sm border-b border-primary-700 relative z-50">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16 md:h-24">
          <div className="flex items-center">
            <Link to="/" className="flex items-center space-x-2">
              <img 
                src="/logo.png" 
                alt="Rich Text Logo" 
                className="w-8 h-8 md:w-12 md:h-12"
              />
              <span className="text-lg md:text-xl font-bold text-primary-100">PasteBin Rich Text</span>
            </Link>
          </div>

          <div className="hidden md:flex items-center space-x-4">
            {user && (
              <>
                <div className="relative" id="search-container">
                  <div className="flex items-center bg-primary-800/50 rounded-lg border border-primary-600/50 focus-within:border-primary-500">
                    <Search className="w-5 h-5 text-primary-300 ml-3" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={handleSearch}
                      placeholder="Search your pastes..."
                      className="w-64 px-3 py-2 bg-transparent text-primary-100 placeholder-primary-400 focus:outline-none"
                    />
                  </div>
                </div>
                <Link
                  to="/dashboard"
                  className="text-primary-100 hover:text-white transition-colors"
                >
                  Dashboard
                </Link>
                <Link
                  to="/favorites"
                  className="text-primary-100 hover:text-white transition-colors"
                  title="Favorites"
                >
                  <Star className="w-5 h-5" />
                </Link>
                <NotificationsPopover />
                {profile && (
                  <Link
                    to={`/profile/${profile.username}`}
                    className="text-primary-100 hover:text-white transition-colors"
                    title="Profile"
                  >
                    <User className="w-5 h-5" />
                  </Link>
                )}
                <Link
                  to="/settings"
                  className="text-primary-100 hover:text-white transition-colors"
                >
                  <Settings className="w-5 h-5" />
                </Link>
                <Link
                  to="/pricing"
                  className="text-primary-100 hover:text-white transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <DollarSign className="w-5 h-5" />
                    <span>Pricing</span>
                  </div>
                </Link>
                <button
                  onClick={handleSignOut}
                  className="text-primary-100 hover:text-white transition-colors"
                >
                  Sign Out
                </button>
              </>
            )}
            {!user && (
              <div className="flex items-center space-x-3">
                <Link
                  to="/pricing"
                  className="text-primary-100 hover:text-white transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <DollarSign className="w-5 h-5" />
                    <span>Pricing</span>
                  </div>
                </Link>
                <Link
                  to="/login"
                  className="text-primary-100 hover:text-white transition-colors"
                >
                  Sign In
                </Link>
                <Link
                  to="/login"
                  state={{ isSignUp: true }}
                  className="flex items-center space-x-2 bg-primary-700 hover:bg-primary-600 text-white px-4 py-2 rounded-md transition-colors"
                >
                  <User className="w-4 h-4" />
                  <span>Sign Up</span>
                </Link>
              </div>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden">
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="text-primary-100 hover:text-white p-2"
            >
              {isMobileMenuOpen ? (
                <X className="w-6 h-6" />
              ) : (
                <Menu className="w-6 h-6" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {isMobileMenuOpen && (
          <div className="md:hidden border-t border-primary-700">
            <div className="px-2 pt-2 pb-3 space-y-1">
              {user ? (
                <>
                  <Link
                    to="/dashboard"
                    className="block px-3 py-2 text-primary-100 hover:text-white"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    Dashboard
                  </Link>
                  <Link
                    to="/favorites"
                    className="block px-3 py-2 text-primary-100 hover:text-white"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    Favorites
                  </Link>
                  {profile && (
                    <Link
                      to={`/profile/${profile.username}`}
                      className="block px-3 py-2 text-primary-100 hover:text-white"
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      Profile
                    </Link>
                  )}
                  <Link
                    to="/settings"
                    className="block px-3 py-2 text-primary-100 hover:text-white"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    Settings
                  </Link>
                  <Link
                    to="/pricing"
                    className="block px-3 py-2 text-primary-100 hover:text-white"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    Pricing
                  </Link>
                  <button
                    onClick={() => {
                      handleSignOut();
                      setIsMobileMenuOpen(false);
                    }}
                    className="block w-full text-left px-3 py-2 text-primary-100 hover:text-white"
                  >
                    Sign Out
                  </button>
                </>
              ) : (
                <>
                  <Link
                    to="/pricing"
                    className="block px-3 py-2 text-primary-100 hover:text-white"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    Pricing
                  </Link>
                  <Link
                    to="/login"
                    className="block px-3 py-2 text-primary-100 hover:text-white"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    Sign In
                  </Link>
                  <Link
                    to="/login"
                    state={{ isSignUp: true }}
                    className="block px-3 py-2 text-primary-100 hover:text-white"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    Sign Up
                  </Link>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}