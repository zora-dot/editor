-- Add foreign key from pastes to profiles
ALTER TABLE pastes
DROP CONSTRAINT IF EXISTS pastes_user_id_fkey,
ADD CONSTRAINT pastes_user_id_fkey 
  FOREIGN KEY (user_id) 
  REFERENCES profiles(id)
  ON DELETE CASCADE;

-- Add views column if it doesn't exist
ALTER TABLE pastes
ADD COLUMN IF NOT EXISTS views bigint DEFAULT 0;

-- Create function to increment paste views
CREATE OR REPLACE FUNCTION increment_paste_views(paste_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE pastes
  SET views = views + 1
  WHERE id = paste_id;
END;
$$;

-- Create index for better join performance
CREATE INDEX IF NOT EXISTS idx_pastes_user_id 
ON pastes(user_id);

-- Update paste policies to work with profiles
DROP POLICY IF EXISTS "Users can read own pastes" ON pastes;
CREATE POLICY "Users can read own pastes"
  ON pastes
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Anyone can read public pastes" ON pastes;
CREATE POLICY "Anyone can read public pastes"
  ON pastes
  FOR SELECT
  USING (is_public = true);

DROP POLICY IF EXISTS "Users can create own pastes" ON pastes;
CREATE POLICY "Users can create own pastes"
  ON pastes
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own pastes" ON pastes;
CREATE POLICY "Users can update own pastes"
  ON pastes
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);