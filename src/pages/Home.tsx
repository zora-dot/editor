import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { createClient } from '@supabase/supabase-js';
import { 
  Clock, Lock, Unlock, Share2, Plus, FolderPlus, 
  Bold, Italic, Underline, AlignLeft, AlignCenter, 
  AlignRight, List, ListOrdered, Undo, Redo, Save,
  Folder
} from 'lucide-react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import TextAlign from '@tiptap/extension-text-align';
import UnderlineExtension from '@tiptap/extension-underline';
import { useAuth } from '../context/AuthContext';
import { Helmet } from 'react-helmet-async';
import { checkPasteLimits } from '../utils/pasteUtils';
import { useSubscription } from '../context/SubscriptionContext';

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

const EXPIRY_OPTIONS = [
  { value: 1, label: '1 Hour', hours: 1 },
  { value: 12, label: '12 Hours', hours: 12 },
  { value: 24, label: '1 Day', hours: 24 },
  { value: 120, label: '5 Days', hours: 120 },
  { value: 240, label: '10 Days', hours: 240 },
  { value: 1200, label: '50 Days', hours: 1200 },
  { value: 0, label: 'Never (Paid Feature)', hours: 0, disabled: true }
];

const AUTOSAVE_DELAY = 60000; // 1 minute

export default function Home() {
  const { user } = useAuth();
  const { isSupporter } = useSubscription();
  const navigate = useNavigate();
  const location = useLocation();
  const [title, setTitle] = useState('');
  const [isPublic, setIsPublic] = useState(true);
  const [password, setPassword] = useState('');
  const [showPasswordInput, setShowPasswordInput] = useState(false);
  const [expiryOption, setExpiryOption] = useState(EXPIRY_OPTIONS[2]); // Default to 1 day
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [draftId, setDraftId] = useState<string | null>(null);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
  const [folders, setFolders] = useState<{ id: string; name: string }[]>([]);
  const [showShareTooltip, setShowShareTooltip] = useState(false);
  const autosaveTimeoutRef = useRef<number>();
  const contentChanged = useRef(false);

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
      }),
      UnderlineExtension,
      TextAlign.configure({
        types: ['heading', 'paragraph'],
        alignments: ['left', 'center', 'right'],
        defaultAlignment: 'left',
      }),
    ],
    editorProps: {
      attributes: {
        class: 'prose prose-sm sm:prose lg:prose-lg xl:prose-2xl focus:outline-none min-h-[300px] p-4',
      },
    },
    onUpdate: ({ editor }) => {
      contentChanged.current = true;
      if (user) {
        if (autosaveTimeoutRef.current) {
          window.clearTimeout(autosaveTimeoutRef.current);
        }
        autosaveTimeoutRef.current = window.setTimeout(saveDraft, AUTOSAVE_DELAY);
      }
    },
  });

  useEffect(() => {
    const loadDraft = async () => {
      const draftIdFromState = location.state?.draftId;
      if (user && draftIdFromState) {
        try {
          const { data, error } = await supabase
            .from('drafts')
            .select('*')
            .eq('id', draftIdFromState)
            .eq('user_id', user.id)
            .single();

          if (error) throw error;
          if (data) {
            setTitle(data.title || '');
            editor?.commands.setContent(data.content || '');
            setDraftId(data.id);
            setLastSaved(new Date(data.last_modified));
          }
        } catch (error) {
          console.error('Error loading draft:', error);
        }
      }
    };

    loadDraft();

    return () => {
      if (autosaveTimeoutRef.current) {
        window.clearTimeout(autosaveTimeoutRef.current);
      }
    };
  }, [user, location.state, editor]);

  useEffect(() => {
    if (user) {
      fetchFolders();
    }
  }, [user]);

  const fetchFolders = async () => {
    try {
      const { data, error } = await supabase
        .from('folders')
        .select('id, name')
        .eq('user_id', user?.id)
        .order('name');

      if (error) throw error;
      setFolders(data || []);
    } catch (error) {
      console.error('Error fetching folders:', error);
    }
  };

  const saveDraft = async (isManual = false) => {
    if (!user || !editor || (!contentChanged.current && !isManual)) return;

    try {
      setIsSaving(true);
      const content = editor.getHTML();
      
      const draftData = {
        user_id: user.id,
        title: title || 'Untitled Draft',
        content,
        last_modified: new Date().toISOString(),
        is_auto_saved: !isManual
      };

      let result;
      if (draftId) {
        result = await supabase
          .from('drafts')
          .update(draftData)
          .eq('id', draftId)
          .eq('user_id', user.id)
          .select()
          .single();
      } else {
        result = await supabase
          .from('drafts')
          .insert(draftData)
          .select()
          .single();
      }

      if (result.error) throw result.error;
      
      setDraftId(result.data.id);
      setLastSaved(new Date());
      contentChanged.current = false;
    } catch (error) {
      console.error('Error saving draft:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleShare = async () => {
    try {
      const url = window.location.href;
      await navigator.clipboard.writeText(url);
      setShowShareTooltip(true);
      setTimeout(() => setShowShareTooltip(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!editor?.getText()) {
      setError('Please enter some content');
      return;
    }

    if (!isPublic && showPasswordInput && !password.trim()) {
      setError('Please enter a password for the private paste');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      if (user) {
        await checkPasteLimits(editor.getHTML(), user.id);
      }

      const expiresAt = expiryOption.hours ? new Date(Date.now() + expiryOption.hours * 60 * 60 * 1000) : null;

      let passwordHash = null;
      if (!isPublic && showPasswordInput && password.trim()) {
        const { data: hash, error: hashError } = await supabase
          .rpc('hash_paste_password', { password: password.trim() });
        
        if (hashError) throw hashError;
        passwordHash = hash;
      }

      const { data, error } = await supabase
        .from('pastes')
        .insert([
          {
            title: title || 'Untitled Paste',
            content: editor.getHTML(),
            user_id: user?.id || null,
            is_public: user ? isPublic : true,
            expires_at: expiresAt,
            folder_id: selectedFolder,
            views: 0,
            password_hash: passwordHash
          },
        ])
        .select()
        .single();

      if (error) throw error;
      
      if (draftId) {
        await supabase
          .from('drafts')
          .delete()
          .eq('id', draftId)
          .eq('user_id', user?.id);
      }

      navigate(`/paste/${data.id}`);
    } catch (error: any) {
      console.error('Error creating paste:', error);
      setError(error.message || 'Failed to create paste');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVisibilityChange = (newIsPublic: boolean) => {
    setIsPublic(newIsPublic);
    if (newIsPublic) {
      setShowPasswordInput(false);
      setPassword('');
    }
  };

  return (
    <>
      <Helmet>
        <title>Create New Paste - PasteBin Rich Text</title>
      </Helmet>

      <div className="max-w-4xl mx-auto">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="bg-white rounded-lg shadow-xl overflow-hidden">
            <div className="p-4 bg-primary-50 border-b border-primary-100">
              <input
                type="text"
                placeholder="Paste Title (optional)"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3 py-2 border border-primary-200 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>

            <div className="bg-gray-100 p-2 border-b border-primary-100">
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => editor?.chain().focus().undo().run()}
                  disabled={!editor?.can().undo()}
                  className={`p-2 rounded hover:bg-primary-100 ${!editor?.can().undo() ? 'opacity-50 cursor-not-allowed' : ''}`}
                  title="Undo"
                >
                  <Undo className="w-5 h-5" />
                </button>
                <button
                  type="button"
                  onClick={() => editor?.chain().focus().redo().run()}
                  disabled={!editor?.can().redo()}
                  className={`p-2 rounded hover:bg-primary-100 ${!editor?.can().redo() ? 'opacity-50 cursor-not-allowed' : ''}`}
                  title="Redo"
                >
                  <Redo className="w-5 h-5" />
                </button>
                <div className="w-px h-6 bg-gray-300 mx-1" />
                <button
                  type="button"
                  onClick={() => editor?.chain().focus().toggleBold().run()}
                  className={`p-2 rounded ${editor?.isActive('bold') ? 'bg-primary-200' : 'hover:bg-primary-100'}`}
                  title="Bold"
                >
                  <Bold className="w-5 h-5" />
                </button>
                <button
                  type="button"
                  onClick={() => editor?.chain().focus().toggleItalic().run()}
                  className={`p-2 rounded ${editor?.isActive('italic') ? 'bg-primary-200' : 'hover:bg-primary-100'}`}
                  title="Italic"
                >
                  <Italic className="w-5 h-5" />
                </button>
                <button
                  type="button"
                  onClick={() => editor?.chain().focus().toggleUnderline().run()}
                  className={`p-2 rounded ${editor?.isActive('underline') ? 'bg-primary-200' : 'hover:bg-primary-100'}`}
                  title="Underline"
                >
                  <Underline className="w-5 h-5" />
                </button>
                <div className="w-px h-6 bg-gray-300 mx-1" />
                <button
                  type="button"
                  onClick={() => editor?.chain().focus().setTextAlign('left').run()}
                  className={`p-2 rounded ${editor?.isActive({ textAlign: 'left' }) ? 'bg-primary-200' : 'hover:bg-primary-100'}`}
                  title="Align Left"
                >
                  <AlignLeft className="w-5 h-5" />
                </button>
                <button
                  type="button"
                  onClick={() => editor?.chain().focus().setTextAlign('center').run()}
                  className={`p-2 rounded ${editor?.isActive({ textAlign: 'center' }) ? 'bg-primary-200' : 'hover:bg-primary-100'}`}
                  title="Align Center"
                >
                  <AlignCenter className="w-5 h-5" />
                </button>
                <button
                  type="button"
                  onClick={() => editor?.chain().focus().setTextAlign('right').run()}
                  className={`p-2 rounded ${editor?.isActive({ textAlign: 'right' }) ? 'bg-primary-200' : 'hover:bg-primary-100'}`}
                  title="Align Right"
                >
                  <AlignRight className="w-5 h-5" />
                </button>
                <div className="w-px h-6 bg-gray-300 mx-1" />
                <button
                  type="button"
                  onClick={() => editor?.chain().focus().toggleBulletList().run()}
                  className={`p-2 rounded ${editor?.isActive('bulletList') ? 'bg-primary-200' : 'hover:bg-primary-100'}`}
                  title="Bullet List"
                >
                  <List className="w-5 h-5" />
                </button>
                <button
                  type="button"
                  onClick={() => editor?.chain().focus().toggleOrderedList().run()}
                  className={`p-2 rounded ${editor?.isActive('orderedList') ? 'bg-primary-200' : 'hover:bg-primary-100'}`}
                  title="Numbered List"
                >
                  <ListOrdered className="w-5 h-5" />
                </button>
                {user && (
                  <>
                    <div className="w-px h-6 bg-gray-300 mx-1" />
                    <button
                      type="button"
                      onClick={() => saveDraft(true)}
                      className="flex items-center gap-1 p-2 rounded hover:bg-primary-100"
                      title="Save Draft"
                    >
                      <Save className="w-5 h-5" />
                      {isSaving ? 'Saving...' : 'Save Draft'}
                    </button>
                    {lastSaved && (
                      <span className="text-sm text-gray-500 self-center">
                        Last saved: {lastSaved.toLocaleTimeString()}
                      </span>
                    )}
                  </>
                )}
              </div>
            </div>

            <div className="p-6">
              <EditorContent editor={editor} className="min-h-[300px] prose max-w-none" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-xl p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Expiration Time
                </label>
                <select
                  value={expiryOption.value}
                  onChange={(e) => {
                    const option = EXPIRY_OPTIONS.find(opt => opt.value === Number(e.target.value));
                    if (option && !option.disabled) setExpiryOption(option);
                  }}
                  className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  {EXPIRY_OPTIONS.map((option) => (
                    <option 
                      key={option.value} 
                      value={option.value}
                      disabled={option.disabled}
                    >
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              {user && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Folder
                  </label>
                  <div className="relative">
                    <select
                      value={selectedFolder || ''}
                      onChange={(e) => setSelectedFolder(e.target.value || null)}
                      className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 appearance-none"
                    >
                      <option value="">No Folder</option>
                      {folders.map((folder) => (
                        <option key={folder.id} value={folder.id}>
                          {folder.name}
                        </option>
                      ))}
                    </select>
                    <Folder className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
                  </div>
                </div>
              )}

              {user && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Visibility
                    </label>
                    <div className="flex items-center gap-4">
                      <button
                        type="button"
                        onClick={() => handleVisibilityChange(true)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-md ${
                          isPublic
                            ? 'bg-primary-600 text-white'
                            : 'bg-white text-gray-700 hover:bg-primary-50'
                        }`}
                      >
                        <Unlock className="w-4 h-4" />
                        Public
                      </button>
                      <button
                        type="button"
                        onClick={() => handleVisibilityChange(false)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-md ${
                          !isPublic
                            ? 'bg-primary-600 text-white'
                            : 'bg-white text-gray-700 hover:bg-primary-50'
                        }`}
                      >
                        <Lock className="w-4 h-4" />
                        Private
                      </button>
                    </div>
                  </div>

                  {!isPublic && (
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <button
                          type="button"
                          onClick={() => setShowPasswordInput(!showPasswordInput)}
                          className={`flex items-center gap-2 px-4 py-2 rounded-md ${
                            showPasswordInput
                              ? 'bg-primary-100 text-primary-700'
                              : 'text-gray-700 hover:bg-gray-100'
                          }`}
                        >
                          <Lock className="w-4 h-4" />
                          {showPasswordInput ? 'Remove Password' : 'Add Password'}
                        </button>
                      </div>

                      {showPasswordInput && (
                        <div>
                          <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="Enter password"
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                          />
                          <p className="mt-1 text-sm text-gray-500">
                            This paste will require a password to view
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            {error && (
              <div className="mt-4 p-4 bg-red-50 border border-red-100 text-red-600 rounded-md">
                {error}
              </div>
            )}

            <div className="mt-6">
              <button
                type="submit"
                disabled={isSubmitting}
                className={`w-full px-6 py-3 bg-primary-600 text-white rounded-md hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 transition-colors ${
                  isSubmitting ? 'opacity-75 cursor-not-allowed' : ''
                }`}
              >
                {isSubmitting ? 'Creating...' : 'Create Paste'}
              </button>
            </div>
          </div>
        </form>
      </div>

      {showShareTooltip && (
        <div className="fixed bottom-4 right-4 bg-gray-800 text-white px-4 py-2 rounded-md shadow-lg">
          Link copied to clipboard!
        </div>
      )}
    </>
  );
}