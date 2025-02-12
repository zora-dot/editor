/*
  # Add drafts support
  
  1. New Tables
    - `drafts`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users)
      - `title` (text)
      - `content` (text)
      - `last_modified` (timestamptz)
      - `created_at` (timestamptz)
      - `is_auto_saved` (boolean)

  2. Security
    - Enable RLS on `drafts` table
    - Add policy for authenticated users to manage their drafts
*/

-- Create drafts table
CREATE TABLE drafts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users NOT NULL,
  title text,
  content text,
  last_modified timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  is_auto_saved boolean DEFAULT true
);

-- Enable RLS
ALTER TABLE drafts ENABLE ROW LEVEL SECURITY;

-- Create policy for users to manage their drafts
CREATE POLICY "Users can manage their drafts"
  ON drafts
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Create index for user_id for faster lookups
CREATE INDEX idx_drafts_user_id ON drafts(user_id);

-- Create index for last_modified for sorting
CREATE INDEX idx_drafts_last_modified ON drafts(last_modified DESC);