import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { createClient } from '@supabase/supabase-js';
import { formatDistanceToNow } from 'date-fns';
import { FileText, Trash2, Edit2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Helmet } from 'react-helmet-async';

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

interface Draft {
  id: string;
  title: string;
  content: string;
  last_modified: string;
  is_auto_saved: boolean;
}

export default function Drafts() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    fetchDrafts();
  }, [user, navigate]);

  const fetchDrafts = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from('drafts')
        .select('*')
        .eq('user_id', user?.id)
        .order('last_modified', { ascending: false });

      if (error) throw error;
      setDrafts(data || []);
    } catch (error) {
      console.error('Error fetching drafts:', error);
      setError('Failed to load drafts');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (draftId: string) => {
    const confirmed = window.confirm('Are you sure you want to delete this draft?');
    if (!confirmed) return;

    try {
      const { error } = await supabase
        .from('drafts')
        .delete()
        .eq('id', draftId)
        .eq('user_id', user?.id);

      if (error) throw error;
      setDrafts(drafts.filter(draft => draft.id !== draftId));
    } catch (error) {
      console.error('Error deleting draft:', error);
      alert('Failed to delete draft');
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
        <title>Drafts - PasteBin Rich Text</title>
      </Helmet>

      <div className="max-w-4xl mx-auto">
        <div className="bg-primary-800/50 rounded-lg backdrop-blur-sm border border-primary-700 p-6 mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-white mb-2">Your Drafts</h1>
              <p className="text-primary-200">Access your saved and auto-saved drafts</p>
            </div>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-100 text-red-600 rounded-lg p-4 mb-6">
            {error}
          </div>
        )}

        <div className="bg-white rounded-lg shadow-xl">
          {drafts.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">You don't have any drafts yet</p>
            </div>
          ) : (
            <div className="divide-y">
              {drafts.map((draft) => (
                <div key={draft.id} className="p-4 hover:bg-gray-50">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <h3 className="font-medium text-gray-900">
                        {draft.title || 'Untitled Draft'}
                      </h3>
                      <div className="mt-1 text-sm text-gray-500 flex items-center gap-4">
                        <span>
                          Last modified {formatDistanceToNow(new Date(draft.last_modified))} ago
                        </span>
                        {draft.is_auto_saved && (
                          <span className="text-primary-600">Auto-saved</span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => navigate('/', { state: { draftId: draft.id } })}
                        className="p-2 text-gray-600 hover:text-gray-900"
                        title="Edit draft"
                      >
                        <Edit2 className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => handleDelete(draft.id)}
                        className="p-2 text-red-600 hover:text-red-700"
                        title="Delete draft"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}