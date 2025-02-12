import React, { useState, useRef, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { createClient } from '@supabase/supabase-js';
import { formatDistanceToNow, format } from 'date-fns';
import { Clock, Lock, Unlock, Share2, Edit2, Folder, User } from 'lucide-react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import TextAlign from '@tiptap/extension-text-align';
import UnderlineExtension from '@tiptap/extension-underline';
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight';
import { common, createLowlight } from 'lowlight';
import { useAuth } from '../context/AuthContext';
import Comments from '../components/Comments';
import LikeButton from '../components/LikeButton';
import FavoriteButton from '../components/FavoriteButton';
import { incrementPasteViews } from '../utils/pasteUtils';

const lowlight = createLowlight(common);

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
  views: number;
  username: string;
  avatar_url: string | null;
  folder?: {
    name: string;
  };
}

export default function ViewPaste() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [paste, setPaste] = useState<Paste | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showShareTooltip, setShowShareTooltip] = useState(false);
  const tooltipTimeoutRef = useRef<number>();
  const [isInitialized, setIsInitialized] = useState(false);
  const [password, setPassword] = useState('');
  const [isPasswordProtected, setIsPasswordProtected] = useState(false);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        bulletList: {
          HTMLAttributes: {
            class: 'list-disc ml-4',
          },
        },
        orderedList: {
          HTMLAttributes: {
            class: 'list-decimal ml-4',
          },
        },
        paragraph: {
          HTMLAttributes: {
            class: 'mb-4',
          },
        },
        codeBlock: false,
      }),
      UnderlineExtension,
      TextAlign.configure({
        types: ['heading', 'paragraph'],
        alignments: ['left', 'center', 'right'],
        defaultAlignment: 'left',
      }),
      CodeBlockLowlight.configure({
        lowlight,
        defaultLanguage: 'javascript',
        HTMLAttributes: {
          class: 'rounded-md bg-gray-900 p-4 font-mono text-sm text-white',
        },
      }),
    ],
    content: '',
    editable: false,
    editorProps: {
      attributes: {
        class: 'prose prose-sm sm:prose lg:prose-lg xl:prose-2xl focus:outline-none min-h-[300px] p-4',
      },
    },
  });

  useEffect(() => {
    if (paste && editor && !isInitialized) {
      editor.commands.setContent(paste.content);
      setIsInitialized(true);
    }
  }, [paste, editor, isInitialized]);

  useEffect(() => {
    const fetchPaste = async () => {
      if (!id) return;
      
      try {
        setLoading(true);
        setError(null);

        const { data, error } = await supabase
          .from('pastes')
          .select('*')
          .eq('id', id)
          .single();

        if (error) throw error;
        if (!data) throw new Error('Paste not found');

        if (data.expires_at && new Date(data.expires_at) < new Date()) {
          throw new Error('This paste has expired');
        }

        if (!data.is_public && (!user || user.id !== data.user_id)) {
          setIsPasswordProtected(true);
          return;
        }

        setPaste(data);

        // Increment view count using the new function
        await incrementPasteViews(id);
        
        if (editor) {
          editor.commands.setContent(data.content);
          setIsInitialized(true);
        }
      } catch (err) {
        console.error('Error fetching paste:', err);
        setError(err instanceof Error ? err.message : 'Failed to load paste');
      } finally {
        setLoading(false);
      }
    };

    fetchPaste();
  }, [id, user, editor]);

  const verifyPassword = async () => {
    try {
      const { data, error } = await supabase
        .rpc('verify_paste_password', { 
          paste_id: id,
          password: password 
        });

      if (error) throw error;

      if (data) {
        setIsPasswordProtected(false);
        const { data: pasteData } = await supabase
          .from('pastes')
          .select('*')
          .eq('id', id)
          .single();
        
        if (pasteData) {
          setPaste(pasteData);
        }
      } else {
        setError('Incorrect password');
      }
    } catch (err) {
      console.error('Error verifying password:', err);
      setError('Failed to verify password');
    }
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setShowShareTooltip(true);
      if (tooltipTimeoutRef.current) {
        window.clearTimeout(tooltipTimeoutRef.current);
      }
      tooltipTimeoutRef.current = window.setTimeout(() => {
        setShowShareTooltip(false);
      }, 2000);
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

  if (isPasswordProtected) {
    return (
      <div className="max-w-md mx-auto mt-10">
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-bold mb-4">Password Protected Paste</h2>
          {error && (
            <div className="mb-4 text-red-600 bg-red-50 p-3 rounded">
              {error}
            </div>
          )}
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter password"
            className="w-full px-3 py-2 border rounded mb-4"
          />
          <button
            onClick={verifyPassword}
            className="w-full bg-primary-600 text-white py-2 rounded hover:bg-primary-700"
          >
            Access Paste
          </button>
        </div>
      </div>
    );
  }

  if (error || !paste) {
    return (
      <div className="max-w-4xl mx-auto text-center py-12">
        <div className="bg-red-500/10 text-red-500 p-4 rounded-lg mb-4">
          {error || 'Paste not found'}
        </div>
        <button
          onClick={() => navigate('/')}
          className="px-6 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700"
        >
          Go Home
        </button>
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>{paste.title || 'Untitled Paste'} - PasteBin Rich Text</title>
      </Helmet>

      <div className="max-w-4xl mx-auto">
        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow-xl overflow-hidden">
            <div className="p-6 bg-primary-50 border-b border-primary-100">
              <div className="flex flex-col space-y-4">
                {/* Title and Actions Row */}
                <div className="flex items-center justify-between">
                  <h1 className="text-2xl font-bold text-gray-900">
                    {paste.title || 'Untitled Paste'}
                  </h1>
                  <div className="flex items-center gap-4">
                    {user?.id === paste.user_id && (
                      <Link
                        to={`/paste/${paste.id}/edit`}
                        className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                        title="Edit paste"
                      >
                        <Edit2 className="w-5 h-5 text-primary-500" />
                      </Link>
                    )}
                    <div className="flex items-center gap-2">
                      {paste.is_public ? (
                        <Unlock className="w-4 h-4 text-green-500" />
                      ) : (
                        <Lock className="w-4 h-4 text-red-500" />
                      )}
                      <span className="text-sm text-gray-600">
                        {paste.is_public ? 'Public' : 'Private'}
                      </span>
                    </div>
                    <div className="relative">
                      <button
                        onClick={copyToClipboard}
                        className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                        title="Copy link"
                      >
                        <Share2 className="w-5 h-5 text-primary-500" />
                      </button>
                      {showShareTooltip && (
                        <div className="absolute right-0 top-full mt-2 px-3 py-1 bg-gray-800 text-white text-sm rounded">
                          Copied!
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <LikeButton pasteId={paste.id} />
                      <FavoriteButton pasteId={paste.id} />
                    </div>
                  </div>
                </div>

                {/* Metadata Rows */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-primary-500" />
                      <span className="font-medium">PASTED BY:</span>
                      <Link 
                        to={`/profile/${paste.username}`}
                        className="text-primary-600 hover:text-primary-700"
                      >
                        {paste.username}
                      </Link>
                    </div>
                    <span>•</span>
                    <span>{paste.views} views</span>
                    <span>•</span>
                    <span>{format(new Date(paste.created_at), 'MM/dd/yyyy hh:mm a')}</span>
                  </div>
                  
                  <div className="flex items-center gap-4">
                    {paste.expires_at && (
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-primary-500" />
                        <span>Expires in {formatDistanceToNow(new Date(paste.expires_at))}</span>
                      </div>
                    )}
                    {user?.id === paste.user_id && paste.folder && (
                      <>
                        <span>•</span>
                        <div className="flex items-center gap-2">
                          <Folder className="w-4 h-4 text-primary-500" />
                          <span>{paste.folder.name}</span>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
            <div className="p-6">
              <EditorContent editor={editor} className="min-h-[300px] prose max-w-none" />
            </div>
          </div>
          {paste && <Comments pasteId={paste.id} pasteUserId={paste.user_id} />}
        </div>
      </div>
    </>
  );
}