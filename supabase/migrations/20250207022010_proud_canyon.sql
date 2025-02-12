/*
  # Create pastes table

  1. New Tables
    - `pastes`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to auth.users)
      - `title` (text)
      - `content` (text)
      - `syntax` (text)
      - `expires_at` (timestamptz)
      - `created_at` (timestamptz)
      - `is_public` (boolean)

  2. Security
    - Enable RLS on `pastes` table
    - Add policies for:
      - Users can read their own pastes
      - Anyone can read public pastes
      - Users can create their own pastes
      - Users can update their own pastes
*/

CREATE TABLE pastes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users,
  title text,
  content text NOT NULL,
  syntax text DEFAULT 'plain',
  expires_at timestamptz,
  created_at timestamptz DEFAULT now(),
  is_public boolean DEFAULT true
);

ALTER TABLE pastes ENABLE ROW LEVEL SECURITY;

-- Policy to allow users to read their own pastes
CREATE POLICY "Users can read own pastes"
  ON pastes
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Policy to allow anyone to read public pastes
CREATE POLICY "Anyone can read public pastes"
  ON pastes
  FOR SELECT
  USING (is_public = true);

-- Policy to allow users to create their own pastes
CREATE POLICY "Users can create own pastes"
  ON pastes
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Policy to allow users to update their own pastes
CREATE POLICY "Users can update own pastes"
  ON pastes
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);