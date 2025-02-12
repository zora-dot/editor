-- Drop existing view
DROP VIEW IF EXISTS paste_details;

-- Recreate the view with proper column selection and joins
CREATE OR REPLACE VIEW paste_details AS
SELECT 
  p.id,
  p.title,
  p.content,
  p.created_at,
  p.expires_at,
  p.is_public,
  p.user_id,
  p.folder_id,
  p.custom_url,
  p.views,
  p.favorites_count,
  p.password_hash,
  pr.username,
  pr.avatar_url,
  f.name as folder_name
FROM pastes p
LEFT JOIN auth.users u ON p.user_id = u.id
LEFT JOIN profiles pr ON p.user_id = pr.id
LEFT JOIN folders f ON p.folder_id = f.id;

-- Grant access to the view
GRANT SELECT ON paste_details TO authenticated, anon;

-- Create RLS policies for the view
DROP POLICY IF EXISTS "Users can read own pastes in view" ON paste_details;
DROP POLICY IF EXISTS "Anyone can read public pastes in view" ON paste_details;

ALTER TABLE paste_details ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View access policy"
  ON paste_details FOR SELECT
  USING (
    is_public = true OR 
    auth.uid() = user_id OR
    folder_id IN (
      SELECT id FROM folders WHERE user_id = auth.uid()
    )
  );

-- Create function to get user's public pastes
CREATE OR REPLACE FUNCTION get_user_public_pastes(user_uuid uuid)
RETURNS SETOF paste_details
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT *
  FROM paste_details
  WHERE user_id = user_uuid
    AND is_public = true
  ORDER BY created_at DESC;
$$;

-- Grant execute permission on the function
GRANT EXECUTE ON FUNCTION get_user_public_pastes TO authenticated, anon;