import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { Folder, FolderPlus, ChevronDown, ChevronRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';

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

interface FolderListProps {
  selectedFolder: string | null;
  onFolderSelect: (folderId: string | null) => void;
}

export default function FolderList({ selectedFolder, onFolderSelect }: FolderListProps) {
  const { user } = useAuth();
  const [folders, setFolders] = useState<FolderType[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [error, setError] = useState('');
  const [isExpanded, setIsExpanded] = useState(true);

  useEffect(() => {
    if (user) {
      fetchFolders();
    }
  }, [user]);

  const fetchFolders = async () => {
    try {
      const { data, error } = await supabase
        .from('folders')
        .select('*')
        .eq('user_id', user?.id)
        .order('name');

      if (error) throw error;
      setFolders(data || []);
    } catch (error) {
      console.error('Error fetching folders:', error);
    }
  };

  const handleCreateFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFolderName.trim()) return;

    try {
      const { error } = await supabase
        .from('folders')
        .insert([
          {
            name: newFolderName.trim(),
            user_id: user?.id
          }
        ]);

      if (error) throw error;

      setNewFolderName('');
      setIsCreating(false);
      fetchFolders();
    } catch (error: any) {
      setError(error.message);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-4 mb-6">
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center text-gray-700 font-medium"
        >
          {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          <span>Folders</span>
        </button>
        <div className="flex items-center gap-3">
          <Link
            to="/folders"
            className="text-sm text-primary-600 hover:text-primary-700 font-medium"
          >
            View All
          </Link>
          <button
            onClick={() => setIsCreating(true)}
            className="text-primary-600 hover:text-primary-700"
            title="Create new folder"
          >
            <FolderPlus className="w-5 h-5" />
          </button>
        </div>
      </div>

      {isExpanded && (
        <div className="space-y-2">
          <button
            onClick={() => onFolderSelect(null)}
            className={`w-full flex items-center px-3 py-2 rounded-md ${
              selectedFolder === null
                ? 'bg-primary-100 text-primary-700'
                : 'hover:bg-gray-100'
            }`}
          >
            <Folder className="w-4 h-4 mr-2" />
            <span>All Pastes</span>
          </button>

          {folders.map((folder) => (
            <button
              key={folder.id}
              onClick={() => onFolderSelect(folder.id)}
              className={`w-full flex items-center px-3 py-2 rounded-md ${
                selectedFolder === folder.id
                  ? 'bg-primary-100 text-primary-700'
                  : 'hover:bg-gray-100'
              }`}
            >
              <Folder className="w-4 h-4 mr-2" />
              <span>{folder.name}</span>
            </button>
          ))}

          {isCreating && (
            <form onSubmit={handleCreateFolder} className="mt-2">
              <input
                type="text"
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                placeholder="New folder name"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                autoFocus
              />
              {error && <p className="text-red-500 text-sm mt-1">{error}</p>}
              <div className="flex justify-end gap-2 mt-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsCreating(false);
                    setNewFolderName('');
                    setError('');
                  }}
                  className="px-3 py-1 text-sm text-gray-600 hover:text-gray-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-3 py-1 text-sm bg-primary-600 text-white rounded-md hover:bg-primary-700"
                >
                  Create
                </button>
              </div>
            </form>
          )}
        </div>
      )}
    </div>
  );
}