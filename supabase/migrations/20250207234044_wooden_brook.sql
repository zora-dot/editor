/*
  # Add folders and visibility features
  
  1. New Tables
    - `folders` table for organizing pastes
      - `id` (uuid, primary key)
      - `name` (text, folder name)
      - `user_id` (uuid, reference to auth.users)
      - `created_at` (timestamp)
  
  2. Changes to existing tables
    - Add `folder_id` to pastes table
    - Add `custom_url` to pastes table
  
  3. Security
    - Enable RLS on folders table
    - Add policies for folder access
*/

-- Create folders table
CREATE TABLE folders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  user_id uuid REFERENCES auth.users NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Add folder_id and custom_url to pastes
ALTER TABLE pastes 
ADD COLUMN IF NOT EXISTS folder_id uuid REFERENCES folders(id),
ADD COLUMN IF NOT EXISTS custom_url text UNIQUE;

-- Enable RLS on folders
ALTER TABLE folders ENABLE ROW LEVEL SECURITY;

-- Policies for folders
CREATE POLICY "Users can manage their own folders"
  ON folders
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Update paste policies for folder access
CREATE POLICY "Users can access pastes in their folders"
  ON pastes
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() = user_id OR
    (is_public = true) OR
    (folder_id IN (
      SELECT id FROM folders WHERE user_id = auth.uid()
    ))
  );

-- Create index for custom_url lookups
CREATE UNIQUE INDEX IF NOT EXISTS idx_pastes_custom_url ON pastes (custom_url) WHERE custom_url IS NOT NULL;

-- Create function to validate custom URLs
CREATE OR REPLACE FUNCTION validate_custom_url()
RETURNS trigger AS $$
BEGIN
  -- Check if custom_url contains only allowed characters
  IF NEW.custom_url !~ '^[a-zA-Z0-9-_]+$' THEN
    RAISE EXCEPTION 'Custom URL can only contain letters, numbers, hyphens and underscores';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for custom URL validation
CREATE TRIGGER validate_custom_url_trigger
  BEFORE INSERT OR UPDATE ON pastes
  FOR EACH ROW
  WHEN (NEW.custom_url IS NOT NULL)
  EXECUTE FUNCTION validate_custom_url();