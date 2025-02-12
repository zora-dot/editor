import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { Star } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

interface FavoriteButtonProps {
  pasteId: string;
}

export default function FavoriteButton({ pasteId }: FavoriteButtonProps) {
  const { user } = useAuth();
  const [isFavorited, setIsFavorited] = useState(false);
  const [favoritesCount, setFavoritesCount] = useState(0);

  useEffect(() => {
    if (user && pasteId) {
      checkIfFavorited();
    }
    getFavoritesCount();
  }, [user, pasteId]);

  const checkIfFavorited = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('favorites')
        .select('id')
        .eq('paste_id', pasteId)
        .eq('user_id', user.id);

      if (error) throw error;
      setIsFavorited(data && data.length > 0);
    } catch (error) {
      console.error('Error checking favorite status:', error);
    }
  };

  const getFavoritesCount = async () => {
    try {
      const { data, error } = await supabase
        .from('favorites')
        .select('id', { count: 'exact' })
        .eq('paste_id', pasteId);

      if (error) throw error;
      setFavoritesCount(data?.length || 0);
    } catch (error) {
      console.error('Error getting favorites count:', error);
    }
  };

  const handleFavorite = async (e: React.MouseEvent) => {
    e.preventDefault(); // Prevent navigation
    e.stopPropagation(); // Stop event bubbling
    
    if (!user) return;

    try {
      if (isFavorited) {
        const { error } = await supabase
          .from('favorites')
          .delete()
          .eq('paste_id', pasteId)
          .eq('user_id', user.id);

        if (error) throw error;
        setIsFavorited(false);
        setFavoritesCount(prev => Math.max(0, prev - 1));
      } else {
        const { error } = await supabase
          .from('favorites')
          .insert([{
            paste_id: pasteId,
            user_id: user.id
          }]);

        if (error) throw error;
        setIsFavorited(true);
        setFavoritesCount(prev => prev + 1);
      }
    } catch (error) {
      console.error('Error toggling favorite:', error);
    }
  };

  return (
    <button
      onClick={handleFavorite}
      className="flex items-center gap-1 text-gray-500 hover:text-yellow-500 transition-colors"
      title={isFavorited ? 'Remove from favorites' : 'Add to favorites'}
    >
      <Star
        className={`w-5 h-5 ${isFavorited ? 'fill-yellow-500 text-yellow-500' : ''}`}
      />
      <span className="text-sm">{favoritesCount}</span>
    </button>
  );
}