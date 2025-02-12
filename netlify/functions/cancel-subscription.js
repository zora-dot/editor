const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const { userId } = JSON.parse(event.body);

    // Fetch the user's active subscription ID from Supabase
    const { data, error } = await supabase
      .from('profiles')
      .select('stripe_subscription_id')
      .eq('id', userId)
      .single();

    if (error || !data.stripe_subscription_id) {
      throw new Error('User does not have an active subscription');
    }

    const subscriptionId = data.stripe_subscription_id;

    // Cancel the subscription using Stripe API
    const canceledSubscription = await stripe.subscriptions.update(subscriptionId, {
      cancel_at_period_end: true
    });

    // Update the user's profile
    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        subscription_tier: 'FREE',
        subscription_expires_at: new Date(canceledSubscription.current_period_end * 1000).toISOString()
      })
      .eq('id', userId);

    if (updateError) throw updateError;

    return {
      statusCode: 200,
      body: JSON.stringify({ success: true, subscription: canceledSubscription })
    };
  } catch (error) {
    console.error('Error canceling subscription:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message })
    };
  }
};