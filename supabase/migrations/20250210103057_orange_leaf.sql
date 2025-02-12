-- Create function to clean up expired pastes
CREATE OR REPLACE FUNCTION cleanup_expired_pastes()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM pastes
  WHERE expires_at < NOW();
END;
$$;

-- Create a cron job to run cleanup every hour
SELECT cron.schedule(
  'cleanup-expired-pastes',
  '0 * * * *', -- Run every hour
  'SELECT cleanup_expired_pastes()'
);

-- Add favorites_count to pastes table
ALTER TABLE pastes
ADD COLUMN favorites_count bigint DEFAULT 0;

-- Create function to update favorites count
CREATE OR REPLACE FUNCTION update_paste_favorites_count()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE pastes
    SET favorites_count = favorites_count + 1
    WHERE id = NEW.paste_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE pastes
    SET favorites_count = favorites_count - 1
    WHERE id = OLD.paste_id;
  END IF;
  RETURN NULL;
END;
$$;

-- Create trigger for favorites count
CREATE TRIGGER update_paste_favorites_count_trigger
AFTER INSERT OR DELETE ON favorites
FOR EACH ROW
EXECUTE FUNCTION update_paste_favorites_count();

-- Update existing favorites counts
UPDATE pastes p
SET favorites_count = (
  SELECT COUNT(*)
  FROM favorites f
  WHERE f.paste_id = p.id
);