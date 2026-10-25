import { createClient } from '@supabase/supabase-js';
import config from '../config.js';

// Server-only service client. Never import this module from the SPA package.
export const supabase = createClient(config.supabaseUrl, config.supabaseSecretKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false
  }
});

export async function checkDatabaseConnection() {
  const { error } = await supabase
    .from('guilds')
    .select('guild_id', { head: true, count: 'exact' })
    .limit(1);

  if (error) throw error;
  return true;
}

export async function getActiveGuildIds(candidateGuildIds = []) {
  if (!Array.isArray(candidateGuildIds) || candidateGuildIds.length === 0) return [];

  const { data, error } = await supabase
    .from('guilds')
    .select('guild_id')
    .eq('is_active', true)
    .in('guild_id', candidateGuildIds);

  if (error) throw error;
  return (data || []).map(({ guild_id }) => guild_id).filter((guildId) => typeof guildId === 'string');
}
