import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { createClient } from '@supabase/supabase-js';
import { format } from 'date-fns';
import { Users, FileText, ChevronLeft, ChevronRight, Edit2, Folder, MessageSquare } from 'lucide-react';
import { Helmet } from 'react-helmet-async';
import FollowButton from '../components/FollowButton';
import SupporterBadge from '../components/SupporterBadge';
import { useAuth } from '../context/AuthContext';
import LikeButton from '../components/LikeButton';
import FavoriteButton from '../components/FavoriteButton';

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

interface Profile {
  id: string;
  username: string;
  avatar_url: string | null;
  bio: string | null;
  created_at: string;
  subscription_tier: string;
}

interface Paste {
  id: string;
  title: string;
  created_at: string;
  is_public: boolean;
  views: number;
  folder?: {
    name: string;
  };
  comments_count?: number;
}

interface Stats {
  followers: number;
  following: number;
  pastes: number;
}

export default function Profile() {
  const { username } = useParams<{ username: string }>();
  const { user } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [pastes, setPastes] = useState<Paste[]>([]);
  const [stats, setStats] = useState<Stats>({ followers: 0, following: 0, pastes: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [sortBy, setSortBy] = useState<'date' | 'views'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  useEffect(() => {
    if (username) {
      fetchProfile();
    }
  }, [username, page, perPage, sortBy, sortOrder]);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      setError(null);

      // First get the profile
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('username', username)
        .single();

      if (profileError) throw profileError;
      if (!profileData) throw new Error('Profile not found');

      setProfile(profileData);

      // Then get public pastes for this user with pagination
      const from = (page - 1) * perPage;
      const to = from + perPage - 1;

      const { data: pastesData, error: pastesError, count } = await supabase
        .from('pastes')
        .select('id, title, created_at, is_public, views', { count: 'exact' })
        .eq('user_id', profileData.id)
        .eq('is_public', true)
        .order(sortBy === 'date' ? 'created_at' : 'views', { ascending: sortOrder === 'asc' })
        .range(from, to);

      if (pastesError) throw pastesError;
      setPastes(pastesData || []);
      setTotalPages(Math.ceil((count || 0) / perPage));

      // Fetch stats
      const [followersCount, followingCount] = await Promise.all([
        supabase
          .from('follows')
          .select('id', { count: 'exact' })
          .eq('following_id', profileData.id),
        supabase
          .from('follows')
          .select('id', { count: 'exact' })
          .eq('follower_id', profileData.id)
      ]);

      setStats({
        followers: followersCount.count || 0,
        following: followingCount.count || 0,
        pastes: count || 0
      });
    } catch (error) {
      console.error('Error fetching profile:', error);
      setError('Profile not found');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-primary-100">Loading...</div>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="max-w-4xl mx-auto text-center py-12">
        <div className="bg-red-500/10 text-red-500 p-4 rounded-lg">
          {error || 'Profile not found'}
        </div>
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>{profile?.username} - PasteBin Rich Text</title>
      </Helmet>

      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow-xl overflow-hidden">
          <div className="h-32 bg-primary-600"></div>
          <div className="px-6 py-4 sm:px-8 sm:py-6">
            <div className="sm:flex sm:items-center sm:justify-between">
              <div className="sm:flex sm:space-x-5">
                <div className="flex-shrink-0">
                  {profile?.avatar_url ? (
                    <img
                      src={profile.avatar_url}
                      alt={profile.username}
                      className="mx-auto h-20 w-20 rounded-full border-4 border-white -mt-10 relative z-10"
                    />
                  ) : (
                    <div className="mx-auto h-20 w-20 rounded-full border-4 border-white -mt-10 relative z-10 bg-primary-100 flex items-center justify-center">
                      <span className="text-2xl font-medium text-primary-600">
                        {profile?.username.charAt(0).toUpperCase()}
                      </span>
                    </div>
                  )}
                </div>
                <div className="mt-4 text-center sm:mt-0 sm:pt-1 sm:text-left">
                  <div className="flex items-center gap-2">
                    <h1 className="text-xl font-bold text-gray-900 sm:text-2xl">
                      {profile?.username}
                    </h1>
                    {profile?.subscription_tier === 'SUPPORTER' && (
                      <SupporterBadge />
                    )}
                  </div>
                  {profile?.bio && (
                    <p className="text-sm text-gray-600 mt-1 break-words max-w-prose whitespace-pre-wrap">
                      {profile.bio}
                    </p>
                  )}
                  <p className="text-sm text-gray-500 mt-1">
                    Joined {format(new Date(profile?.created_at || ''), 'MMMM yyyy')}
                  </p>
                </div>
              </div>
              <div className="mt-5 sm:mt-0">
                <FollowButton userId={profile?.id || ''} username={profile?.username || ''} />
              </div>
            </div>

            <div className="mt-6 grid grid-cols-3 gap-6 text-center">
              <div className="bg-gray-50 p-4 rounded-lg">
                <Users className="w-6 h-6 text-primary-500 mx-auto mb-2" />
                <p className="text-2xl font-semibold text-gray-900">{stats.followers}</p>
                <p className="text-sm text-gray-500">Followers</p>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <Users className="w-6 h-6 text-primary-500 mx-auto mb-2" />
                <p className="text-2xl font-semibold text-gray-900">{stats.following}</p>
                <p className="text-sm text-gray-500">Following</p>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <FileText className="w-6 h-6 text-primary-500 mx-auto mb-2" />
                <p className="text-2xl font-semibold text-gray-900">{stats.pastes}</p>
                <p className="text-sm text-gray-500">Public Pastes</p>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-white">Public Pastes</h2>
            <div className="flex items-center gap-4">
              <select
                value={perPage}
                onChange={(e) => {
                  setPerPage(Number(e.target.value));
                  setPage(1);
                }}
                className="px-3 py-1 bg-white rounded-md border border-gray-300"
              >
                <option value="10">10 per page</option>
                <option value="25">25 per page</option>
                <option value="50">50 per page</option>
                <option value="100">100 per page</option>
              </select>
              <select
                value={`${sortBy}-${sortOrder}`}
                onChange={(e) => {
                  const [newSortBy, newSortOrder] = e.target.value.split('-') as ['date' | 'views', 'asc' | 'desc'];
                  setSortBy(newSortBy);
                  setSortOrder(newSortOrder);
                  setPage(1);
                }}
                className="px-3 py-1 bg-white rounded-md border border-gray-300"
              >
                <option value="date-desc">Newest First</option>
                <option value="date-asc">Oldest First</option>
                <option value="views-desc">Most Views</option>
                <option value="views-asc">Least Views</option>
              </select>
            </div>
          </div>

          <div className="space-y-4">
            {pastes.length === 0 ? (
              <div className="bg-white rounded-lg shadow-md p-6 text-center text-gray-500">
                No public pastes yet
              </div>
            ) : (
              pastes.map((paste) => (
                <Link
                  key={paste.id}
                  to={`/paste/${paste.id}`}
                  className="block bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow"
                >
                  <div className="p-4">
                    {/* Row 1: Title and Views */}
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-lg font-semibold text-gray-900 hover:text-primary-600 transition-colors">
                        {paste.title || 'Untitled Paste'}
                      </h3>
                      <div className="text-sm text-gray-500">
                        {paste.views} views
                      </div>
                    </div>

                    {/* Row 2: Likes, Favorites, and Folder */}
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-4">
                        <LikeButton pasteId={paste.id} />
                        <FavoriteButton pasteId={paste.id} />
                        {paste.folder ? (
                          <div className="flex items-center gap-1 text-primary-600">
                            <Folder className="w-4 h-4" />
                            <span>{paste.folder.name}</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1 text-gray-500">
                            <Folder className="w-4 h-4" />
                            <span>No Folder</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Row 3: Created Date and Comments */}
                    <div className="flex items-center justify-between text-sm text-gray-500">
                      <div>
                        Created: {format(new Date(paste.created_at), 'MM/dd/yyyy hh:mm a')}
                      </div>
                      <div className="flex items-center gap-1">
                        <MessageSquare className="w-4 h-4" />
                        <span>Comments: {paste.comments_count || 0}</span>
                      </div>
                    </div>
                  </div>
                </Link>
              ))
            )}
          </div>

          {totalPages > 1 && (
            <div className="mt-6 flex justify-center items-center gap-4">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-2 text-white hover:text-primary-200 disabled:opacity-50"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <span className="text-white">
                Page {page} of {totalPages}
              </span>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="p-2 text-white hover:text-primary-200 disabled:opacity-50"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}