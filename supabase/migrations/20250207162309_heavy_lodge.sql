/*
  # Allow anonymous paste creation

  1. Changes
    - Add policy to allow anonymous users to create public pastes
    - Add policy to allow anyone to read public pastes
    - Modify existing policies to handle null user_id cases

  2. Security
    - Maintains security for authenticated users' private pastes
    - Allows public access for anonymous pastes
    - Ensures proper access control for all paste operations
*/

-- Policy to allow anonymous users to create public pastes
CREATE POLICY "Allow anonymous paste creation"
  ON pastes
  FOR INSERT
  WITH CHECK (
    -- Allow if user is authenticated and user_id matches auth.uid()
    -- OR if user is not authenticated (user_id is null) and paste is public
    (auth.uid() = user_id) OR 
    (user_id IS NULL AND is_public = true)
  );

-- Update the existing select policy to handle null user_id
CREATE POLICY "Anyone can read public pastes or own pastes"
  ON pastes
  FOR SELECT
  USING (
    is_public = true OR 
    (auth.uid() = user_id)
  );