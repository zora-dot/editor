-- Drop existing foreign key if it exists
ALTER TABLE pastes
DROP CONSTRAINT IF EXISTS pastes_user_id_fkey;

-- Add new foreign key constraint referencing profiles
ALTER TABLE pastes
ADD CONSTRAINT pastes_user_id_fkey
  FOREIGN KEY (user_id)
  REFERENCES profiles(id)
  ON DELETE CASCADE;

-- Create index for better join performance
CREATE INDEX IF NOT EXISTS idx_pastes_user_id
  ON pastes(user_id);

-- Update RLS policies to use auth.uid()
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