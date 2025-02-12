-- Drop existing view if it exists
DROP VIEW IF EXISTS paste_details;

-- Create an improved view that includes all necessary fields
CREATE OR REPLACE VIEW paste_details AS
SELECT 
  p.*,
  pr.username,
  pr.avatar_url,
  f.id as folder_id,
  f.name as folder_name
FROM pastes p
LEFT JOIN profiles pr ON p.user_id = pr.id
LEFT JOIN folders f ON p.folder_id = f.id;

-- Grant access to the view
GRANT SELECT ON paste_details TO authenticated, anon;

-- Create index for better join performance
CREATE INDEX IF NOT EXISTS idx_pastes_folder_id
  ON pastes(folder_id);

-- Update RLS policies for the view
ALTER VIEW paste_details OWNER TO authenticated;

-- Create policies for the view to match paste policies
CREATE POLICY "Users can read own pastes in view"
  ON paste_details FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Anyone can read public pastes in view"
  ON paste_details FOR SELECT
  USING (is_public = true);