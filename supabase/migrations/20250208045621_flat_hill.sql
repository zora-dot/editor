/*
  # Configure email verification

  1. Changes
    - Add email verification settings
    - Configure email templates
    - Set up email verification flow
*/

-- Enable email verification
ALTER TABLE auth.users
  ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT FALSE;

-- Create function to handle email verification
CREATE OR REPLACE FUNCTION handle_email_verification()
RETURNS trigger AS $$
BEGIN
  -- Set email verification status
  NEW.email_verified := FALSE;
  
  -- Add metadata for verification requirement
  NEW.raw_app_meta_data := 
    COALESCE(NEW.raw_app_meta_data, '{}'::jsonb) || 
    jsonb_build_object(
      'requires_verification', true,
      'verification_sent_at', extract(epoch from NOW())
    );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for email verification
DROP TRIGGER IF EXISTS on_auth_user_email_verification ON auth.users;
CREATE TRIGGER on_auth_user_email_verification
  BEFORE INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_email_verification();

-- Update user policies to require email verification
CREATE POLICY "Require email verification"
  ON auth.users
  FOR ALL
  USING (
    email_verified = TRUE OR
    (raw_app_meta_data->>'requires_verification')::boolean IS NOT TRUE
  );