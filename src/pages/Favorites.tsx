import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { createClient } from '@supabase/supabase-js';
import { formatDistanceToNow } from 'date-fns';
import { Clock, Lock, Star, Heart, Folder } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Helmet } from 'react-helmet-async';

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

interface Paste {
  id: string;
  title: string;
  content: string;
  created_at: string;
  expires_at: string | null;
  is_public: boolean;
  user_id: string;
  folder_id: string | null;
  custom_url: string | null;
  folder: {
    id: string;
    name: string;
  } | null;
  views: number;
  likes_count: number;
  favorites_count: number;
}

export default function Favorites() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [favorites, setFavorites] = useState<Paste[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    fetchFavorites();
  }, [user, navigate]);

  const fetchFavorites = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from('favorites')
        .select(`
          paste_id,
          pastes (
            id,
            title,
            content,
            created_at,
            expires_at,
            is_public,
            user_id,
            folder_id,
            custom_url,
            views,
            likes_count,
            favorites_count,
            folder:folders (
              id,
              name
            )
          )
        `)
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Filter out expired pastes
      const validPastes = data
        .filter(item => item.pastes && 
          (!item.pastes.expires_at || new Date(item.pastes.expires_at) > new Date()))
        .map(item => item.pastes as Paste);

      setFavorites(validPastes);
    } catch (error) {
      console.error('Error fetching favorites:', error);
      setError('Failed to load favorites');
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

  return (
    <>
      <Helmet>
        <title>Favorites - PasteBin Rich Text</title>
      </Helmet>

      <div className="max-w-4xl mx-auto">
        <div className="bg-primary-800/50 rounded-lg backdrop-blur-sm border border-primary-700 p-6 mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-white mb-2">Favorite Pastes</h1>
              <p className="text-primary-200">Your collection of saved pastes</p>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          {favorites.length === 0 ? (
            <div className="text-center py-8">
              <Star className="w-12 h-12 text-primary-300 mx-auto mb-4" />
              <p className="text-primary-200">You haven't favorited any pastes yet</p>
            </div>
          ) : (
            favorites.map((paste) => (
              <div
                key={paste.id}
                className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow"
              >
                <div className="p-6">
                  <div className="flex items-center justify-between mb-2">
                    <Link to={`/paste/${paste.id}`}>
                      <h2 className="text-lg font-semibold text-gray-900 hover:text-primary-600 transition-colors">
                        {paste.title || 'Untitled Paste'}
                      </h2>
                    </Link>
                    <div className="flex items-center space-x-2">
                      {!paste.is_public && (
                        <Lock className="w-4 h-4 text-primary-500" />
                      )}
                    </div>
                  </div>
                  <div className="flex items-center text-sm text-gray-500 space-x-4">
                    <span>
                      Created {formatDistanceToNow(new Date(paste.created_at))} ago
                    </span>
                    {paste.folder && (
                      <div className="flex items-center gap-1 text-primary-600">
                        <Folder className="w-4 h-4" />
                        <span>{paste.folder.name}</span>
                      </div>
                    )}
                    <span>Views: {paste.views}</span>
                    <div className="flex items-center gap-1">
                      <Heart className="w-4 h-4" />
                      <span>{paste.likes_count || 0}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Star className="w-4 h-4" />
                      <span>{paste.favorites_count || 0}</span>
                    </div>
                    {paste.expires_at && (
                      <span className="flex items-center">
                        <Clock className="w-4 h-4 mr-1" />
                        Expires {formatDistanceToNow(new Date(paste.expires_at))}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </>
  );
}