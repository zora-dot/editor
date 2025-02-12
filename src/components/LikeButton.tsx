import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { Heart } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

interface LikeButtonProps {
  pasteId?: string;
  commentId?: string;
  initialLikes?: number;
}

export default function LikeButton({ pasteId, commentId, initialLikes = 0 }: LikeButtonProps) {
  const { user } = useAuth();
  const [likes, setLikes] = useState(initialLikes);
  const [isLiked, setIsLiked] = useState(false);

  useEffect(() => {
    if (user) {
      checkIfLiked();
    }
    fetchLikesCount();
  }, [pasteId, commentId, user]);

  const checkIfLiked = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('likes')
        .select('id')
        .match({
          ...(pasteId ? { paste_id: pasteId } : {}),
          ...(commentId ? { comment_id: commentId } : {}),
          user_id: user.id
        });

      if (error) throw error;
      setIsLiked(data && data.length > 0);
    } catch (error) {
      console.error('Error checking like status:', error);
    }
  };

  const fetchLikesCount = async () => {
    try {
      const { count, error } = await supabase
        .from('likes')
        .select('id', { count: 'exact' })
        .match({
          ...(pasteId ? { paste_id: pasteId } : {}),
          ...(commentId ? { comment_id: commentId } : {})
        });

      if (error) throw error;
      setLikes(count || 0);
    } catch (error) {
      console.error('Error fetching likes count:', error);
    }
  };

  const handleLike = async (e: React.MouseEvent) => {
    e.preventDefault(); // Prevent navigation
    e.stopPropagation(); // Stop event bubbling
    
    if (!user) return;

    try {
      if (isLiked) {
        const { error } = await supabase
          .from('likes')
          .delete()
          .match({
            ...(pasteId ? { paste_id: pasteId } : {}),
            ...(commentId ? { comment_id: commentId } : {}),
            user_id: user.id
          });

        if (error) throw error;
        setLikes(prev => Math.max(0, prev - 1));
        setIsLiked(false);
      } else {
        const { error } = await supabase
          .from('likes')
          .insert([{
            ...(pasteId ? { paste_id: pasteId } : {}),
            ...(commentId ? { comment_id: commentId } : {}),
            user_id: user.id
          }]);

        if (error) throw error;
        setLikes(prev => prev + 1);
        setIsLiked(true);
      }
    } catch (error) {
      console.error('Error toggling like:', error);
    }
  };

  return (
    <button
      onClick={handleLike}
      className="flex items-center gap-1 text-gray-500 hover:text-red-500 transition-colors"
      title={isLiked ? 'Unlike' : 'Like'}
    >
      <Heart
        className={`w-4 h-4 ${isLiked ? 'fill-red-500 text-red-500' : ''}`}
      />
      <span className="text-sm">{likes}</span>
    </button>
  );
}