/*
  # View Counter and Storage Functions

  1. Changes
    - Add function to safely increment paste views
    - Add function to calculate user storage usage
    - Add trigger to maintain view count integrity
    - Add indexes for better performance

  2. Security
    - Functions are marked as SECURITY DEFINER to ensure proper access control
    - RLS policies remain unchanged
*/

-- Create improved view counter function
CREATE OR REPLACE FUNCTION increment_paste_views(paste_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE pastes
  SET views = views + 1
  WHERE id = paste_id;
END;
$$;

-- Create function to calculate user's storage usage
CREATE OR REPLACE FUNCTION calculate_user_storage(user_uuid uuid)
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  total_size bigint;
BEGIN
  SELECT COALESCE(SUM(LENGTH(content)), 0)
  INTO total_size
  FROM pastes
  WHERE user_id = user_uuid;
  
  RETURN total_size;
END;
$$;

-- Create index for better performance on views queries
CREATE INDEX IF NOT EXISTS idx_pastes_views ON pastes(views);

-- Create function to enforce storage limits
CREATE OR REPLACE FUNCTION check_storage_limits()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_tier text;
  current_usage bigint;
  max_storage bigint;
BEGIN
  -- Get user's subscription tier
  SELECT subscription_tier INTO user_tier
  FROM profiles
  WHERE id = NEW.user_id;
  
  -- Calculate max storage based on tier
  max_storage := CASE 
    WHEN user_tier = 'SUPPORTER' THEN 250 * 1024 * 250  -- 250KB * 250 pastes
    ELSE 100 * 1024 * 50  -- 100KB * 50 pastes
  END;
  
  -- Get current storage usage
  current_usage := calculate_user_storage(NEW.user_id);
  
  -- Check if new paste would exceed limit
  IF current_usage + LENGTH(NEW.content) > max_storage THEN
    RAISE EXCEPTION 'Storage limit exceeded';
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for storage limits
CREATE TRIGGER check_storage_limits_trigger
  BEFORE INSERT OR UPDATE ON pastes
  FOR EACH ROW
  EXECUTE FUNCTION check_storage_limits();

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION increment_paste_views(uuid) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION calculate_user_storage(uuid) TO authenticated;