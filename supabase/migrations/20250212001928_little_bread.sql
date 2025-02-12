-- Add updated_at column to pastes table
ALTER TABLE pastes 
ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- Create trigger to automatically update updated_at
CREATE OR REPLACE FUNCTION update_paste_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for pastes table
DROP TRIGGER IF EXISTS update_paste_updated_at_trigger ON pastes;
CREATE TRIGGER update_paste_updated_at_trigger
  BEFORE UPDATE ON pastes
  FOR EACH ROW
  EXECUTE FUNCTION update_paste_updated_at();

-- Update existing rows to have updated_at set
UPDATE pastes 
SET updated_at = created_at 
WHERE updated_at IS NULL;