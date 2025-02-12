import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export const handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  let stripeEvent;
  try {
    const signature = event.headers['stripe-signature'];
    stripeEvent = stripe.webhooks.constructEvent(
      event.body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (error) {
    console.error('Webhook signature verification failed:', error.message);
    return {
      statusCode: 400,
      body: `Webhook Error: ${error.message}`
    };
  }

  try {
    switch (stripeEvent.type) {
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
        const subscription = stripeEvent.data.object;
        const userId = subscription.metadata.user_id;

        if (!userId) {
          throw new Error('No user_id in subscription metadata');
        }

        // Update user's subscription status
        const { error: updateError } = await supabase
          .from('profiles')
          .update({
            subscription_tier: subscription.status === 'active' ? 'SUPPORTER' : 'FREE',
            subscription_expires_at: new Date(subscription.current_period_end * 1000).toISOString()
          })
          .eq('id', userId);

        if (updateError) throw updateError;
        break;

      case 'customer.subscription.deleted':
        const canceledSubscription = stripeEvent.data.object;
        const canceledUserId = canceledSubscription.metadata.user_id;

        if (!canceledUserId) {
          throw new Error('No user_id in subscription metadata');
        }

        // Reset user's subscription status
        const { error: cancelError } = await supabase
          .from('profiles')
          .update({
            subscription_tier: 'FREE',
            subscription_expires_at: null
          })
          .eq('id', canceledUserId);

        if (cancelError) throw cancelError;
        break;
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ received: true })
    };
  } catch (error) {
    console.error('Error processing webhook:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message })
    };
  }
};