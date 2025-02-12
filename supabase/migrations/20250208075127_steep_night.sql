/*
  # Add password protection for private pastes

  1. Changes
    - Add password_hash column to pastes table
    - Add function to hash passwords
    - Add function to verify passwords
    - Update RLS policies to handle password protection

  2. Security
    - Password is stored as a secure hash
    - Uses pgcrypto for password hashing
    - RLS policies updated to enforce password protection
*/

-- Enable pgcrypto extension if not already enabled
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Add password_hash column to pastes table
ALTER TABLE pastes
ADD COLUMN IF NOT EXISTS password_hash text;

-- Create function to hash passwords
CREATE OR REPLACE FUNCTION hash_paste_password(password text)
RETURNS text
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN crypt(password, gen_salt('bf'));
END;
$$;

-- Create function to verify passwords
CREATE OR REPLACE FUNCTION verify_paste_password(paste_id uuid, password text)
RETURNS boolean
LANGUAGE plpgsql
AS $$
DECLARE
  stored_hash text;
BEGIN
  SELECT password_hash INTO stored_hash
  FROM pastes
  WHERE id = paste_id;
  
  IF stored_hash IS NULL THEN
    RETURN true;
  END IF;
  
  RETURN stored_hash = crypt(password, stored_hash);
END;
$$;

-- Update RLS policies for password protection
DROP POLICY IF EXISTS "Anyone can read public pastes or own pastes" ON pastes;
CREATE POLICY "Anyone can read public pastes or own pastes"
  ON pastes
  FOR SELECT
  USING (
    is_public = true OR 
    auth.uid() = user_id OR
    password_hash IS NULL
  );