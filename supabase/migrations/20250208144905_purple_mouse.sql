-- Add views column to pastes if it doesn't exist
ALTER TABLE pastes 
ADD COLUMN IF NOT EXISTS views bigint DEFAULT 0;

-- Add subscription_tier to profiles
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS subscription_tier text DEFAULT 'FREE',
ADD COLUMN IF NOT EXISTS subscription_expires_at timestamptz,
ADD COLUMN IF NOT EXISTS username_color text,
ADD CONSTRAINT profiles_subscription_tier_check 
  CHECK (subscription_tier IN ('FREE', 'SUPPORTER')),
-- Add constraint to bio length
ALTER COLUMN bio type varchar(150);

-- Create subscriptions table
CREATE TABLE IF NOT EXISTS subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  tier text NOT NULL,
  status text NOT NULL,
  current_period_start timestamptz NOT NULL,
  current_period_end timestamptz NOT NULL,
  created_at timestamptz DEFAULT now(),
  stripe_subscription_id text UNIQUE,
  stripe_customer_id text,
  CONSTRAINT subscriptions_tier_check 
    CHECK (tier IN ('FREE', 'SUPPORTER')),
  CONSTRAINT subscriptions_status_check 
    CHECK (status IN ('active', 'canceled', 'incomplete', 'incomplete_expired', 'past_due', 'trialing', 'unpaid'))
);

-- Enable RLS on subscriptions
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

-- Create policies for subscriptions
CREATE POLICY "Users can view own subscriptions"
  ON subscriptions FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Create function to check if user is a supporter
CREATE OR REPLACE FUNCTION is_supporter(user_uuid uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM profiles
    WHERE id = user_uuid
    AND subscription_tier = 'SUPPORTER'
    AND (subscription_expires_at IS NULL OR subscription_expires_at > now())
  );
END;
$$;