/*
  # Add Full-Text Search for Pastes

  1. Changes
    - Add tsvector column for search
    - Create function to update search vector
    - Create trigger to automatically update search vector
    - Create index for faster searching
  
  2. Search Features
    - Search across title and content
    - Weights: title (A), content (B)
    - Language: English
*/

-- Add search vector column
ALTER TABLE pastes ADD COLUMN IF NOT EXISTS search_vector tsvector;

-- Create function to generate search vector
CREATE OR REPLACE FUNCTION pastes_search_vector_trigger() RETURNS trigger AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('english', COALESCE(NEW.title, '')), 'A') ||
    setweight(to_tsvector('english', COALESCE(NEW.content, '')), 'B');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to update search vector
DROP TRIGGER IF EXISTS pastes_search_vector_update ON pastes;
CREATE TRIGGER pastes_search_vector_update
  BEFORE INSERT OR UPDATE
  ON pastes
  FOR EACH ROW
  EXECUTE FUNCTION pastes_search_vector_trigger();

-- Create GIN index for faster searching
CREATE INDEX IF NOT EXISTS pastes_search_idx ON pastes USING GIN (search_vector);

-- Update existing records
UPDATE pastes SET search_vector =
  setweight(to_tsvector('english', COALESCE(title, '')), 'A') ||
  setweight(to_tsvector('english', COALESCE(content, '')), 'B');