import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { createClient } from '@supabase/supabase-js';
import { format } from 'date-fns';
import { FileText, Plus, Lock, Share2, Edit2, Folder, MessageSquare } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Helmet } from 'react-helmet-async';
import FolderList from '../components/FolderList';
import UsageStats from '../components/UsageStats';
import { getDailyUsageStats } from '../utils/pasteUtils';
import LikeButton from '../components/LikeButton';
import FavoriteButton from '../components/FavoriteButton';

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
  favorites_count: number;
  likes_count?: number;
  comments_count: number;
}

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [pastes, setPastes] = useState<Paste[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
  const [showShareTooltip, setShowShareTooltip] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [usageStats, setUsageStats] = useState({ dailyPastes: 0, totalStorage: 0 });

  useEffect(() => {
    if (!user) {
      navigate('/login', { state: { from: '/dashboard' } });
      return;
    }
    fetchPastes();
    fetchUsageStats();
  }, [user, selectedFolder]);

  const fetchUsageStats = async () => {
    if (!user) return;
    const stats = await getDailyUsageStats(user.id);
    setUsageStats(stats);
  };

  const fetchPastes = async (retry = false) => {
    if (!user) return;
    
    try {
      setLoading(true);
      setError(null);

      let query = supabase
        .from('pastes')
        .select(`
          *,
          folder:folders (
            id,
            name
          ),
          comments:comments (count)
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10);

      if (selectedFolder) {
        query = query.eq('folder_id', selectedFolder);
      }

      const { data, error } = await query;

      if (error) throw error;
      
      // Filter out expired pastes
      const now = new Date();
      const validPastes = (data || []).filter(paste => {
        return !paste.expires_at || new Date(paste.expires_at) > now;
      });
      
      setPastes(validPastes);
      setRetryCount(0);
    } catch (error) {
      console.error('Error fetching pastes:', error);
      setError('Failed to load pastes. Please try again.');
      
      if (retry && retryCount < 3) {
        const timeout = Math.pow(2, retryCount) * 1000;
        setTimeout(() => {
          setRetryCount(prev => prev + 1);
          fetchPastes(true);
        }, timeout);
      }
    } finally {
      setLoading(false);
    }
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
        <title>Dashboard - PasteBin Rich Text</title>
      </Helmet>

      <div className="max-w-4xl mx-auto">
        <div className="bg-primary-800/50 rounded-lg backdrop-blur-sm border border-primary-700 p-6 mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-white mb-2">Dashboard</h1>
              <p className="text-primary-200">Manage and organize your pastes</p>
            </div>
            <div className="flex items-center gap-4">
              <Link
                to="/drafts"
                className="flex items-center gap-2 px-4 py-2 bg-primary-700 text-white rounded-md hover:bg-primary-600 transition-colors"
              >
                <FileText className="w-4 h-4" />
                View Drafts
              </Link>
              <Link
                to="/all-pastes"
                className="flex items-center gap-2 px-4 py-2 bg-primary-700 text-white rounded-md hover:bg-primary-600 transition-colors"
              >
                <FileText className="w-4 h-4" />
                View All Pastes
              </Link>
              <Link
                to="/"
                className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors"
              >
                <Plus className="w-5 h-5" />
                <span>Create New Paste</span>
              </Link>
            </div>
          </div>
        </div>

        <div className="mb-8">
          <UsageStats
            dailyPastes={usageStats.dailyPastes}
            totalStorage={usageStats.totalStorage}
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="lg:col-span-1">
            <FolderList
              selectedFolder={selectedFolder}
              onFolderSelect={setSelectedFolder}
            />
          </div>

          <div className="lg:col-span-3">
            {error && (
              <div className="mb-6 p-4 bg-red-50 border border-red-100 text-red-600 rounded-md">
                {error}
              </div>
            )}

            <h2 className="text-xl font-bold text-white mb-4">Recent Pastes</h2>

            <div className="space-y-4">
              {pastes.length === 0 ? (
                <div className="bg-white rounded-lg shadow-md p-8 text-center">
                  <p className="text-gray-500">
                    {selectedFolder
                      ? 'No pastes in this folder yet'
                      : 'No pastes yet. Create your first paste!'}
                  </p>
                </div>
              ) : (
                pastes.map((paste) => (
                  <div
                    key={paste.id}
                    className="block bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow"
                  >
                    <div className="p-4">
                      <div className="flex items-center justify-between mb-3">
                        <Link
                          to={`/paste/${paste.id}`}
                          className="text-lg font-semibold text-gray-900 hover:text-primary-600 transition-colors"
                        >
                          {paste.title || 'Untitled Paste'}
                        </Link>
                        <div className="flex items-center gap-2">
                          {!paste.is_public && (
                            <Lock className="w-4 h-4 text-primary-500" />
                          )}
                          <div className="text-sm text-gray-500">
                            {paste.views} views
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => copyToClipboard(paste.id)}
                              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                              title="Copy link"
                            >
                              <Share2 className="w-5 h-5 text-primary-500" />
                            </button>
                            <Link
                              to={`/paste/${paste.id}/edit`}
                              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                              title="Edit paste"
                            >
                              <Edit2 className="w-5 h-5 text-primary-500" />
                            </Link>
                          </div>
                        </div>
                      </div>

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

                      <div className="flex items-center justify-between text-sm text-gray-500">
                        <div>
                          Created: {format(new Date(paste.created_at), 'MM/dd/yyyy hh:mm a')}
                        </div>
                        <div className="flex items-center gap-1">
                          <MessageSquare className="w-4 h-4" />
                          <span>Comments: {paste.comments?.[0]?.count || 0}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}