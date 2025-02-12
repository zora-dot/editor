-- Create or replace the function to increment paste views atomically
CREATE OR REPLACE FUNCTION increment_paste_views(paste_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE pastes
  SET views = COALESCE(views, 0) + 1
  WHERE id = paste_id;
END;
$$;

-- Ensure views column has a default value and is not null
ALTER TABLE pastes 
  ALTER COLUMN views SET DEFAULT 0,
  ALTER COLUMN views SET NOT NULL;

-- Update any existing NULL values to 0
UPDATE pastes SET views = 0 WHERE views IS NULL;

-- Create index for better performance on views queries
CREATE INDEX IF NOT EXISTS idx_pastes_views ON pastes(views);

-- Grant execute permission on the function
GRANT EXECUTE ON FUNCTION increment_paste_views(uuid) TO authenticated, anon;