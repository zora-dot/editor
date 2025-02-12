import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { createClient } from '@supabase/supabase-js';
import { formatDistanceToNow } from 'date-fns';
import { Clock, Lock, Share2, ChevronLeft, ChevronRight } from 'lucide-react';
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
}

export default function AllPastes() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [pastes, setPastes] = useState<Paste[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState(0);
  const [showShareTooltip, setShowShareTooltip] = useState<string | null>(null);

  const page = parseInt(searchParams.get('page') || '1');
  const perPage = parseInt(searchParams.get('per_page') || '10');

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    fetchPastes();
  }, [user, page, perPage]);

  const fetchPastes = async () => {
    try {
      setLoading(true);
      setError(null);

      // Get total count
      const { count: totalPastes, error: countError } = await supabase
        .from('pastes')
        .select('id', { count: 'exact' })
        .eq('user_id', user?.id);

      if (countError) throw countError;
      setTotalCount(totalPastes || 0);

      // Get paginated pastes
      const { data, error } = await supabase
        .from('pastes')
        .select(`
          *,
          folder:folders (
            id,
            name
          )
        `)
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false })
        .range((page - 1) * perPage, page * perPage - 1);

      if (error) throw error;
      setPastes(data || []);
    } catch (error: any) {
      console.error('Error fetching pastes:', error);
      setError('Failed to load pastes');
    } finally {
      setLoading(false);
    }
  };

  const totalPages = Math.ceil(totalCount / perPage);

  const handlePageChange = (newPage: number) => {
    if (newPage < 1 || newPage > totalPages) return;
    setSearchParams({ page: newPage.toString(), per_page: perPage.toString() });
  };

  const handlePerPageChange = (newPerPage: number) => {
    setSearchParams({ page: '1', per_page: newPerPage.toString() });
  };

  const copyToClipboard = async (id: string) => {
    try {
      const url = `${window.location.origin}/paste/${id}`;
      await navigator.clipboard.writeText(url);
      setShowShareTooltip(id);
      setTimeout(() => setShowShareTooltip(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
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
        <title>All Pastes - PasteBin Rich Text</title>
      </Helmet>

      <div className="max-w-4xl mx-auto">
        <div className="bg-primary-800/50 rounded-lg backdrop-blur-sm border border-primary-700 p-6 mb-8">
          <h1 className="text-2xl font-bold text-white mb-2">All Pastes</h1>
          <p className="text-primary-200">View and manage all your pastes</p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-100 text-red-600 rounded-md">
            {error}
          </div>
        )}

        <div className="bg-white rounded-lg shadow-xl">
          <div className="p-6">
            <div className="flex justify-between items-center mb-6">
              <div className="text-sm text-gray-600">
                Showing {((page - 1) * perPage) + 1} to {Math.min(page * perPage, totalCount)} of {totalCount} pastes
              </div>
              <div className="flex items-center gap-4">
                <label className="text-sm text-gray-600">
                  Pastes per page:
                  <select
                    value={perPage}
                    onChange={(e) => handlePerPageChange(parseInt(e.target.value))}
                    className="ml-2 px-2 py-1 border border-gray-300 rounded-md"
                  >
                    {[10, 25, 50, 100].map(value => (
                      <option key={value} value={value}>{value}</option>
                    ))}
                  </select>
                </label>
              </div>
            </div>

            <div className="space-y-4">
              {pastes.map((paste) => (
                <div
                  key={paste.id}
                  className="border border-gray-200 rounded-lg hover:shadow-md transition-shadow"
                >
                  <div className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <Link to={`/paste/${paste.id}`}>
                        <h2 className="text-lg font-semibold text-gray-900 hover:text-primary-600 transition-colors">
                          {paste.title || 'Untitled Paste'}
                        </h2>
                      </Link>
                      <div className="flex items-center space-x-3">
                        {!paste.is_public && (
                          <Lock className="w-4 h-4 text-primary-500" />
                        )}
                        <div className="relative">
                          <button
                            onClick={() => copyToClipboard(paste.id)}
                            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                            title="Copy share link"
                          >
                            <Share2 className="w-5 h-5 text-primary-500" />
                          </button>
                          {showShareTooltip === paste.id && (
                            <div className="absolute right-0 top-full mt-2 px-3 py-1 bg-gray-800 text-white text-sm rounded">
                              Copied!
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center text-sm text-gray-500 space-x-4">
                      <span>
                        Created {formatDistanceToNow(new Date(paste.created_at))} ago
                      </span>
                      {paste.expires_at && (
                        <span className="flex items-center">
                          <Clock className="w-4 h-4 mr-1" />
                          Expires {formatDistanceToNow(new Date(paste.expires_at))}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {totalPages > 1 && (
              <div className="mt-6 flex justify-center items-center gap-4">
                <button
                  onClick={() => handlePageChange(page - 1)}
                  disabled={page === 1}
                  className="p-2 text-gray-600 hover:text-gray-900 disabled:opacity-50"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <span className="text-gray-600">
                  Page {page} of {totalPages}
                </span>
                <button
                  onClick={() => handlePageChange(page + 1)}
                  disabled={page === totalPages}
                  className="p-2 text-gray-600 hover:text-gray-900 disabled:opacity-50"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}