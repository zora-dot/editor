-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create stripe_customers table
CREATE TABLE stripe_customers (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  customer_id text UNIQUE NOT NULL,
  email text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id)
);

-- Enable RLS on stripe_customers
ALTER TABLE stripe_customers ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for stripe_customers
CREATE POLICY "Users can view own stripe customer"
  ON stripe_customers FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Create stripe_subscriptions table
CREATE TABLE stripe_subscriptions (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  subscription_id text UNIQUE NOT NULL,
  status text NOT NULL,
  price_id text NOT NULL,
  quantity integer NOT NULL,
  cancel_at_period_end boolean NOT NULL DEFAULT false,
  cancel_at timestamptz,
  canceled_at timestamptz,
  current_period_start timestamptz NOT NULL,
  current_period_end timestamptz NOT NULL,
  created_at timestamptz DEFAULT now(),
  ended_at timestamptz,
  trial_start timestamptz,
  trial_end timestamptz,
  UNIQUE(user_id, subscription_id)
);

-- Enable RLS on stripe_subscriptions
ALTER TABLE stripe_subscriptions ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for stripe_subscriptions
CREATE POLICY "Users can view own subscriptions"
  ON stripe_subscriptions FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Create function to handle subscription status changes
CREATE OR REPLACE FUNCTION handle_subscription_change()
RETURNS trigger AS $$
BEGIN
  -- Update user's subscription status in profiles
  UPDATE profiles
  SET 
    subscription_tier = CASE 
      WHEN NEW.status = 'active' THEN 'SUPPORTER'
      ELSE 'FREE'
    END,
    subscription_expires_at = CASE 
      WHEN NEW.status = 'active' THEN NEW.current_period_end
      ELSE NULL
    END
  WHERE id = NEW.user_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for subscription changes
CREATE TRIGGER on_subscription_change
  AFTER INSERT OR UPDATE ON stripe_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION handle_subscription_change();

-- Create function to process Stripe webhook events
CREATE OR REPLACE FUNCTION process_stripe_webhook(event_type text, event_data jsonb)
RETURNS void AS $$
BEGIN
  -- Handle customer.subscription.created
  IF event_type = 'customer.subscription.created' THEN
    INSERT INTO stripe_subscriptions (
      user_id,
      subscription_id,
      status,
      price_id,
      quantity,
      cancel_at_period_end,
      cancel_at,
      canceled_at,
      current_period_start,
      current_period_end,
      created_at,
      ended_at,
      trial_start,
      trial_end
    )
    VALUES (
      (event_data->>'client_reference_id')::uuid,
      event_data->>'id',
      event_data->>'status',
      event_data->'items'->'data'->0->>'price'->>'id',
      (event_data->'items'->'data'->0->>'quantity')::integer,
      (event_data->>'cancel_at_period_end')::boolean,
      (event_data->>'cancel_at')::timestamptz,
      (event_data->>'canceled_at')::timestamptz,
      to_timestamp((event_data->>'current_period_start')::integer),
      to_timestamp((event_data->>'current_period_end')::integer),
      to_timestamp((event_data->>'created')::integer),
      (event_data->>'ended_at')::timestamptz,
      (event_data->>'trial_start')::timestamptz,
      (event_data->>'trial_end')::timestamptz
    );
  
  -- Handle customer.subscription.updated
  ELSIF event_type = 'customer.subscription.updated' THEN
    UPDATE stripe_subscriptions
    SET
      status = event_data->>'status',
      cancel_at_period_end = (event_data->>'cancel_at_period_end')::boolean,
      cancel_at = (event_data->>'cancel_at')::timestamptz,
      canceled_at = (event_data->>'canceled_at')::timestamptz,
      current_period_start = to_timestamp((event_data->>'current_period_start')::integer),
      current_period_end = to_timestamp((event_data->>'current_period_end')::integer),
      ended_at = (event_data->>'ended_at')::timestamptz,
      trial_start = (event_data->>'trial_start')::timestamptz,
      trial_end = (event_data->>'trial_end')::timestamptz
    WHERE subscription_id = event_data->>'id';
  
  -- Handle customer.subscription.deleted
  ELSIF event_type = 'customer.subscription.deleted' THEN
    UPDATE stripe_subscriptions
    SET
      status = 'canceled',
      ended_at = now()
    WHERE subscription_id = event_data->>'id';
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;