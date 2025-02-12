import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { Folder, FolderPlus, Trash2, Edit2, Check, X, RefreshCw } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Link, useNavigate } from 'react-router-dom';

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

interface FolderType {
  id: string;
  name: string;
  user_id: string;
  created_at: string;
}

const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 second

export default function Folders() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [folders, setFolders] = useState<FolderType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [editingFolder, setEditingFolder] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    fetchFolders();
  }, [user, navigate]);

  const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  const fetchFolders = async (retry = false) => {
    if (!user) return;
    
    try {
      setLoading(true);
      setError('');
      const { data, error } = await supabase
        .from('folders')
        .select('*')
        .eq('user_id', user.id)
        .order('name');

      if (error) throw error;
      setFolders(data || []);
      setRetryCount(0); // Reset retry count on success
    } catch (error: any) {
      console.error('Error fetching folders:', error);
      if (retry && retryCount < MAX_RETRIES) {
        setRetryCount(prev => prev + 1);
        await delay(RETRY_DELAY * Math.pow(2, retryCount)); // Exponential backoff
        return fetchFolders(true);
      }
      setError('Failed to load folders. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newFolderName.trim() || isSubmitting) return;

    setIsSubmitting(true);
    setError('');
    let retries = 0;

    while (retries < MAX_RETRIES) {
      try {
        // First check if a folder with this name already exists
        const { data: existingFolder, error: checkError } = await supabase
          .from('folders')
          .select('id')
          .eq('user_id', user.id)
          .eq('name', newFolderName.trim())
          .single();

        if (checkError && checkError.code !== 'PGRST116') { // PGRST116 means no rows returned
          throw checkError;
        }

        if (existingFolder) {
          setError('A folder with this name already exists');
          return;
        }

        const { data, error } = await supabase
          .from('folders')
          .insert({
            name: newFolderName.trim(),
            user_id: user.id
          })
          .select()
          .single();

        if (error) throw error;

        setFolders(prev => [...prev, data]);
        setNewFolderName('');
        setIsCreating(false);
        break; // Success, exit retry loop
      } catch (error: any) {
        console.error('Error creating folder:', error);
        retries++;
        
        if (retries === MAX_RETRIES) {
          setError('Failed to create folder. Please try again.');
        } else {
          await delay(RETRY_DELAY * Math.pow(2, retries - 1)); // Exponential backoff
        }
      }
    }
    setIsSubmitting(false);
  };

  const handleUpdateFolder = async (folderId: string) => {
    if (!user || !editName.trim() || isSubmitting) return;

    setIsSubmitting(true);
    setError('');
    let retries = 0;

    while (retries < MAX_RETRIES) {
      try {
        // Check if another folder has the same name
        const { data: existingFolder, error: checkError } = await supabase
          .from('folders')
          .select('id')
          .eq('user_id', user.id)
          .eq('name', editName.trim())
          .neq('id', folderId)
          .single();

        if (checkError && checkError.code !== 'PGRST116') {
          throw checkError;
        }

        if (existingFolder) {
          setError('A folder with this name already exists');
          return;
        }

        const { error } = await supabase
          .from('folders')
          .update({ name: editName.trim() })
          .eq('id', folderId)
          .eq('user_id', user.id);

        if (error) throw error;

        setFolders(prev => 
          prev.map(folder => 
            folder.id === folderId 
              ? { ...folder, name: editName.trim() }
              : folder
          )
        );
        setEditingFolder(null);
        setEditName('');
        break; // Success, exit retry loop
      } catch (error: any) {
        console.error('Error updating folder:', error);
        retries++;
        
        if (retries === MAX_RETRIES) {
          setError('Failed to update folder. Please try again.');
        } else {
          await delay(RETRY_DELAY * Math.pow(2, retries - 1));
        }
      }
    }
    setIsSubmitting(false);
  };

  const handleDeleteFolder = async (folderId: string) => {
    if (!user || isSubmitting) return;

    const confirmed = window.confirm(
      'Are you sure you want to delete this folder? All pastes in this folder will be moved to "No Folder".'
    );
    if (!confirmed) return;

    setIsSubmitting(true);
    setError('');
    let retries = 0;

    while (retries < MAX_RETRIES) {
      try {
        // Update all pastes in this folder to have no folder
        const { error: updateError } = await supabase
          .from('pastes')
          .update({ folder_id: null })
          .eq('folder_id', folderId)
          .eq('user_id', user.id);

        if (updateError) throw updateError;

        // Delete the folder
        const { error: deleteError } = await supabase
          .from('folders')
          .delete()
          .eq('id', folderId)
          .eq('user_id', user.id);

        if (deleteError) throw deleteError;

        setFolders(prev => prev.filter(folder => folder.id !== folderId));
        break; // Success, exit retry loop
      } catch (error: any) {
        console.error('Error deleting folder:', error);
        retries++;
        
        if (retries === MAX_RETRIES) {
          setError('Failed to delete folder. Please try again.');
        } else {
          await delay(RETRY_DELAY * Math.pow(2, retries - 1));
        }
      }
    }
    setIsSubmitting(false);
  };

  const handleRetry = () => {
    setRetryCount(0);
    fetchFolders(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-primary-100">Loading...</div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-primary-800/50 rounded-lg backdrop-blur-sm border border-primary-700 p-6 mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white mb-2">Folders</h1>
            <p className="text-primary-200">Organize your pastes into folders</p>
          </div>
          <button
            onClick={() => setIsCreating(true)}
            className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors"
            disabled={isSubmitting}
          >
            <FolderPlus className="w-5 h-5" />
            <span>New Folder</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-100 text-red-600 rounded-md">
          <div className="flex items-center justify-between">
            <span>{error}</span>
            <button
              onClick={handleRetry}
              className="flex items-center gap-2 text-red-600 hover:text-red-700"
            >
              <RefreshCw className="w-4 h-4" />
              Retry
            </button>
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg shadow-xl">
        {isCreating && (
          <form onSubmit={handleCreateFolder} className="p-4 border-b">
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                placeholder="New folder name"
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                autoFocus
                disabled={isSubmitting}
              />
              <button
                type="submit"
                className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-50"
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Creating...' : 'Create'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsCreating(false);
                  setNewFolderName('');
                  setError('');
                }}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
                disabled={isSubmitting}
              >
                Cancel
              </button>
            </div>
          </form>
        )}

        <div className="divide-y">
          {folders.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              No folders yet. Create one to organize your pastes!
            </div>
          ) : (
            folders.map((folder) => (
              <div key={folder.id} className="p-4 flex items-center justify-between hover:bg-gray-50">
                {editingFolder === folder.id ? (
                  <div className="flex items-center gap-2 flex-1">
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                      autoFocus
                      disabled={isSubmitting}
                    />
                    <button
                      onClick={() => handleUpdateFolder(folder.id)}
                      className="p-2 text-green-600 hover:text-green-700 disabled:opacity-50"
                      disabled={isSubmitting}
                    >
                      <Check className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => {
                        setEditingFolder(null);
                        setEditName('');
                        setError('');
                      }}
                      className="p-2 text-red-600 hover:text-red-700"
                      disabled={isSubmitting}
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                ) : (
                  <>
                    <Link
                      to={`/dashboard?folder=${folder.id}`}
                      className="flex items-center gap-2 flex-1 text-gray-900 hover:text-primary-600"
                    >
                      <Folder className="w-5 h-5 text-primary-500" />
                      <span>{folder.name}</span>
                    </Link>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          setEditingFolder(folder.id);
                          setEditName(folder.name);
                          setError('');
                        }}
                        className="p-2 text-gray-600 hover:text-gray-800"
                        title="Edit folder"
                        disabled={isSubmitting}
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteFolder(folder.id)}
                        className="p-2 text-red-600 hover:text-red-700"
                        title="Delete folder"
                        disabled={isSubmitting}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}