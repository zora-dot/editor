/*
  # Fix authentication triggers and profile creation

  1. Changes
    - Improve profile creation trigger to handle race conditions
    - Add better error handling for profile creation
    - Fix username generation to ensure uniqueness
    - Add proper constraints and validations

  2. Security
    - Ensure proper RLS policies
    - Add validation checks
*/

-- Drop existing triggers and functions
DROP TRIGGER IF EXISTS on_auth_user_created_profile ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user_profile();

-- Create improved profile creation function with better error handling
CREATE OR REPLACE FUNCTION public.handle_new_user_profile() 
RETURNS trigger 
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  profile_id uuid;
  username_base text;
  username_final text;
  username_suffix int;
  max_attempts int := 5;
  attempt_count int := 0;
BEGIN
  -- Get base username from email or use fallback
  username_base := COALESCE(
    SPLIT_PART(NEW.email, '@', 1),
    'user'
  );
  
  -- Remove special characters and ensure valid length
  username_base := REGEXP_REPLACE(username_base, '[^a-zA-Z0-9]', '', 'g');
  username_base := SUBSTR(username_base, 1, 15);
  
  -- Try to create profile with unique username
  LOOP
    EXIT WHEN attempt_count >= max_attempts;
    
    BEGIN
      -- Generate username with random suffix
      username_suffix := FLOOR(RANDOM() * 9000 + 1000);
      username_final := username_base || username_suffix::text;
      
      -- Insert new profile
      INSERT INTO public.profiles (
        id,
        username,
        created_at,
        updated_at
      ) VALUES (
        NEW.id,
        username_final,
        NOW(),
        NOW()
      )
      RETURNING id INTO profile_id;
      
      -- If we get here, insert succeeded
      EXIT;
    EXCEPTION
      WHEN unique_violation THEN
        -- Try again with different suffix
        attempt_count := attempt_count + 1;
    END;
  END LOOP;
  
  -- If we couldn't create a profile after max attempts, fail gracefully
  IF profile_id IS NULL THEN
    RAISE EXCEPTION 'Could not create profile: username generation failed after % attempts', max_attempts;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create new trigger for profile creation
CREATE TRIGGER on_auth_user_created_profile
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user_profile();

-- Ensure profiles table has proper constraints
ALTER TABLE profiles
  DROP CONSTRAINT IF EXISTS profiles_username_check,
  ADD CONSTRAINT profiles_username_check 
    CHECK (username ~ '^[a-zA-Z0-9][a-zA-Z0-9_-]{2,19}$');

-- Create index for faster username lookups
CREATE INDEX IF NOT EXISTS idx_profiles_username_lower 
  ON profiles (LOWER(username));

-- Update RLS policies
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON profiles;
CREATE POLICY "Profiles are viewable by everyone"
  ON profiles FOR SELECT
  TO public
  USING (true);

DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Add function to validate username changes
CREATE OR REPLACE FUNCTION validate_username_change()
RETURNS trigger AS $$
BEGIN
  -- Check if username is already taken (case insensitive)
  IF NEW.username != OLD.username AND 
     EXISTS (
       SELECT 1 
       FROM profiles 
       WHERE LOWER(username) = LOWER(NEW.username)
     ) 
  THEN
    RAISE EXCEPTION 'Username already taken';
  END IF;
  
  -- Check username format
  IF NEW.username !~ '^[a-zA-Z0-9][a-zA-Z0-9_-]{2,19}$' THEN
    RAISE EXCEPTION 'Username must be 3-20 characters and can only contain letters, numbers, underscores, and hyphens';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for username validation
DROP TRIGGER IF EXISTS validate_username_change_trigger ON profiles;
CREATE TRIGGER validate_username_change_trigger
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION validate_username_change();