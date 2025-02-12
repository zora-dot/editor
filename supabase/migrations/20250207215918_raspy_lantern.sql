/*
  # Enable Email Verification Settings
  
  1. Changes
    - Add email verification tracking
    - Set up verification handling
    - Configure verification requirements
  
  Note: This migration sets up the necessary structure for email verification
*/

-- Add metadata column for tracking verification status if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'auth' 
    AND table_name = 'users' 
    AND column_name = 'email_verification_sent'
  ) THEN
    ALTER TABLE auth.users 
    ADD COLUMN IF NOT EXISTS email_verification_sent timestamptz;
  END IF;
END $$;

-- Create or update function to handle email verification
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS trigger AS $$
BEGIN
  -- Set email verification sent timestamp
  NEW.email_verification_sent = NOW();
  
  -- Ensure email confirmation is required
  NEW.email_confirmed_at = NULL;
  NEW.confirmed_at = NULL;
  
  -- Add metadata for verification requirement
  NEW.raw_app_meta_data = 
    COALESCE(NEW.raw_app_meta_data, '{}'::jsonb) || 
    jsonb_build_object(
      'requires_email_verification', true,
      'verification_sent_at', extract(epoch from NOW())
    );
    
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new user handling
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  BEFORE INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Add policy to enforce email verification
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM pg_policies 
    WHERE schemaname = 'auth' 
    AND tablename = 'users' 
    AND policyname = 'require_email_verification'
  ) THEN
    CREATE POLICY require_email_verification ON auth.users
      FOR ALL
      USING (
        (raw_app_meta_data->>'requires_email_verification')::boolean IS NOT TRUE OR
        email_confirmed_at IS NOT NULL
      );
  END IF;
END $$;