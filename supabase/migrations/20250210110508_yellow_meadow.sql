/*
  # Fix Pastes-Profiles Relationship

  1. Changes
    - Drop existing foreign key constraint if it exists
    - Add correct foreign key constraint from pastes to profiles
    - Update RLS policies to use correct relationship

  2. Security
    - Maintain existing RLS policies with corrected references
*/

-- Drop existing foreign key if it exists
ALTER TABLE pastes
DROP CONSTRAINT IF EXISTS pastes_user_id_fkey;

-- Add new foreign key constraint referencing auth.users instead of profiles
ALTER TABLE pastes
ADD CONSTRAINT pastes_user_id_fkey
  FOREIGN KEY (user_id)
  REFERENCES auth.users(id)
  ON DELETE CASCADE;

-- Create index for better join performance
CREATE INDEX IF NOT EXISTS idx_pastes_user_id
  ON pastes(user_id);

-- Update the pastes policies to use auth.uid()
DROP POLICY IF EXISTS "Users can read own pastes" ON pastes;
CREATE POLICY "Users can read own pastes"
  ON pastes FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create own pastes" ON pastes;
CREATE POLICY "Users can create own pastes"
  ON pastes FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own pastes" ON pastes;
CREATE POLICY "Users can update own pastes"
  ON pastes FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own pastes" ON pastes;
CREATE POLICY "Users can delete own pastes"
  ON pastes FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create a view to join pastes with profiles for easier querying
CREATE OR REPLACE VIEW paste_details AS
SELECT 
  p.*,
  pr.username,
  pr.avatar_url
FROM pastes p
LEFT JOIN profiles pr ON p.user_id = pr.id;

-- Grant access to the view
GRANT SELECT ON paste_details TO authenticated, anon;