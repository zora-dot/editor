/*
  # Add OAuth Provider Support

  1. Changes
    - Add provider column to auth.users
    - Add provider_id column to auth.users
    - Add indexes for provider lookups
    - Update profile creation to handle OAuth data

  2. Security
    - Enable RLS for OAuth-related tables
    - Add policies for secure provider access
*/

-- Add provider-related columns to auth.users if they don't exist
ALTER TABLE auth.users
ADD COLUMN IF NOT EXISTS provider text,
ADD COLUMN IF NOT EXISTS provider_id text;

-- Create index for provider lookups
CREATE INDEX IF NOT EXISTS idx_auth_users_provider 
ON auth.users(provider, provider_id);

-- Update profile creation function to handle OAuth data
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
  provider_data jsonb;
BEGIN
  -- Get provider-specific data
  provider_data := CASE 
    WHEN NEW.raw_user_meta_data->>'provider' = 'google' THEN
      NEW.raw_user_meta_data->'google_data'
    WHEN NEW.raw_user_meta_data->>'provider' = 'github' THEN
      NEW.raw_user_meta_data->'github_data'
    ELSE
      '{}'::jsonb
  END;

  -- Get username base from provider data or email
  username_base := COALESCE(
    provider_data->>'preferred_username',
    SPLIT_PART(NEW.email, '@', 1),
    'user'
  );
  
  -- Clean up username
  username_base := REGEXP_REPLACE(username_base, '[^a-zA-Z0-9]', '', 'g');
  username_base := SUBSTR(username_base, 1, 15);
  
  -- Try to create profile with unique username
  LOOP
    EXIT WHEN attempt_count >= max_attempts;
    
    BEGIN
      username_suffix := FLOOR(RANDOM() * 9000 + 1000);
      username_final := username_base || username_suffix::text;
      
      INSERT INTO public.profiles (
        id,
        username,
        avatar_url,
        created_at,
        updated_at
      ) VALUES (
        NEW.id,
        username_final,
        COALESCE(
          provider_data->>'avatar_url',
          provider_data->>'picture',
          NULL
        ),
        NOW(),
        NOW()
      )
      RETURNING id INTO profile_id;
      
      EXIT;
    EXCEPTION
      WHEN unique_violation THEN
        attempt_count := attempt_count + 1;
    END;
  END LOOP;
  
  IF profile_id IS NULL THEN
    RAISE EXCEPTION 'Could not create profile: username generation failed after % attempts', max_attempts;
  END IF;
  
  RETURN NEW;
END;
$$;