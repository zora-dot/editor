/*
  # Add password hashing functions
  
  1. New Functions
    - `hash_paste_password`: Function to hash passwords using bcrypt
    - `verify_paste_password`: Function to verify paste passwords
  
  2. Security
    - Uses pgcrypto for secure password hashing
    - Functions are marked as SECURITY DEFINER for proper access control
*/

-- Enable pgcrypto extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Drop existing functions if they exist
DROP FUNCTION IF EXISTS public.hash_paste_password(text);
DROP FUNCTION IF EXISTS public.verify_paste_password(uuid, text);

-- Create improved password hashing function
CREATE OR REPLACE FUNCTION public.hash_paste_password(password text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF password IS NULL OR length(password) = 0 THEN
    RETURN NULL;
  END IF;
  RETURN crypt(password, gen_salt('bf', 10));
END;
$$;

-- Create improved password verification function
CREATE OR REPLACE FUNCTION public.verify_paste_password(paste_id uuid, password text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  stored_hash text;
BEGIN
  -- Get the stored password hash
  SELECT password_hash INTO stored_hash
  FROM pastes
  WHERE id = paste_id;
  
  -- If no password is set, return true
  IF stored_hash IS NULL THEN
    RETURN true;
  END IF;
  
  -- If password is provided but doesn't match, return false
  IF password IS NULL THEN
    RETURN false;
  END IF;
  
  -- Compare the provided password with stored hash
  RETURN stored_hash = crypt(password, stored_hash);
END;
$$;