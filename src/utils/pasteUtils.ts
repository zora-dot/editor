import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

export async function checkPasteLimits(content: string, userId: string) {
  try {
    // Get user's subscription status
    const { data: profile } = await supabase
      .from('profiles')
      .select('subscription_tier')
      .eq('id', userId)
      .single();

    const isSupporter = profile?.subscription_tier === 'SUPPORTER';
    const maxPasteSize = isSupporter ? 250 * 1024 : 100 * 1024; // 250KB vs 100KB per paste
    const maxDailyPastes = isSupporter ? 250 : 50; // Updated to 50 for free users

    // Check content size
    const contentSize = new Blob([content]).size;
    if (contentSize > maxPasteSize) {
      throw new Error(`Paste size exceeds the maximum limit of ${maxPasteSize / 1024}KB`);
    }

    // Check daily paste count
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const { count, error: countError } = await supabase
      .from('pastes')
      .select('id', { count: 'exact' })
      .eq('user_id', userId)
      .gte('created_at', today.toISOString());

    if (countError) throw countError;

    if (count && count >= maxDailyPastes) {
      throw new Error(`You have reached your daily limit of ${maxDailyPastes} pastes`);
    }

    return true;
  } catch (error: any) {
    throw new Error(error.message);
  }
}

export async function getDailyUsageStats(userId: string) {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const { count: dailyPastes } = await supabase
      .from('pastes')
      .select('id', { count: 'exact' })
      .eq('user_id', userId)
      .gte('created_at', today.toISOString());

    // Calculate total storage based on paste size
    const { data: pastes } = await supabase
      .from('pastes')
      .select('content')
      .eq('user_id', userId);

    const totalStorage = pastes?.reduce((acc, paste) => {
      return acc + new Blob([paste.content]).size;
    }, 0) || 0;

    return {
      dailyPastes: dailyPastes || 0,
      totalStorage
    };
  } catch (error) {
    console.error('Error getting usage stats:', error);
    return {
      dailyPastes: 0,
      totalStorage: 0
    };
  }
}

export async function incrementPasteViews(pasteId: string) {
  try {
    await supabase.rpc('increment_paste_views', { paste_id: pasteId });
  } catch (error) {
    console.error('Error incrementing views:', error);
  }
}