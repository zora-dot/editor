-- Drop existing profile creation trigger and function
DROP TRIGGER IF EXISTS on_auth_user_created_profile ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user_profile();

-- Create improved profile creation function with username validation
CREATE OR REPLACE FUNCTION public.handle_new_user_profile() 
RETURNS trigger AS $$
DECLARE
  base_username TEXT;
  temp_username TEXT;
  counter INTEGER := 0;
BEGIN
  -- Get base username from metadata or generate one
  base_username := COALESCE(
    NEW.raw_user_meta_data->>'username',
    'user_' || substr(NEW.id::text, 1, 8)
  );
  
  -- Try the base username first
  temp_username := base_username;
  
  -- Keep trying with incrementing numbers until we find a unique username
  WHILE EXISTS (
    SELECT 1 FROM profiles WHERE username = temp_username
  ) LOOP
    counter := counter + 1;
    temp_username := base_username || counter::text;
  END LOOP;

  INSERT INTO public.profiles (
    id,
    username,
    created_at,
    updated_at
  ) VALUES (
    NEW.id,
    temp_username,
    NOW(),
    NOW()
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create new trigger for profile creation
CREATE TRIGGER on_auth_user_created_profile
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user_profile();

-- Update username validation
ALTER TABLE profiles
  DROP CONSTRAINT IF EXISTS profiles_username_key,
  DROP CONSTRAINT IF EXISTS profiles_username_check;

-- Add new constraints for username
ALTER TABLE profiles
  ADD CONSTRAINT profiles_username_key UNIQUE (username),
  ADD CONSTRAINT profiles_username_check 
    CHECK (username ~ '^[a-zA-Z0-9._-]{3,20}$');

-- Create function to validate username changes
CREATE OR REPLACE FUNCTION validate_username_change()
RETURNS trigger AS $$
BEGIN
  -- Check if username is already taken
  IF NEW.username != OLD.username AND 
     EXISTS (SELECT 1 FROM profiles WHERE username = NEW.username) THEN
    RAISE EXCEPTION 'Username already taken';
  END IF;
  
  -- Check username format
  IF NEW.username !~ '^[a-zA-Z0-9._-]{3,20}$' THEN
    RAISE EXCEPTION 'Username must be 3-20 characters and can only contain letters, numbers, periods, underscores, and hyphens';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for username validation
CREATE TRIGGER validate_username_change_trigger
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION validate_username_change();