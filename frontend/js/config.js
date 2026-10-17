/**
 * Second Brain Cloud & Environment Configuration
 * Manages Supabase Cloud connection and Backend API URLs
 */

export const config = {
  // Built-in Default Supabase Cloud Connection
  defaultSupabaseUrl: 'https://vswqxmdsvnmdxnajgwnb.supabase.co',
  defaultSupabaseKey: 'sb_publishable_AMMqTlghyorxnDPWjRDQhA_Ov0M3Jr-',

  // Supabase Project URL (e.g. https://your-project.supabase.co)
  get supabaseUrl() {
    if (typeof localStorage !== 'undefined') {
      return localStorage.getItem('secondBrain_supabase_url') || this.defaultSupabaseUrl;
    }
    return this.defaultSupabaseUrl;
  },
  set supabaseUrl(val) {
    if (typeof localStorage === 'undefined') return;
    if (val) localStorage.setItem('secondBrain_supabase_url', val.trim());
    else localStorage.removeItem('secondBrain_supabase_url');
  },

  // Supabase Public / Anon API Key
  get supabaseKey() {
    if (typeof localStorage !== 'undefined') {
      return localStorage.getItem('secondBrain_supabase_key') || this.defaultSupabaseKey;
    }
    return this.defaultSupabaseKey;
  },
  set supabaseKey(val) {
    if (typeof localStorage === 'undefined') return;
    if (val) localStorage.setItem('secondBrain_supabase_key', val.trim());
    else localStorage.removeItem('secondBrain_supabase_key');
  },

  // Check if Supabase credentials are validly configured
  get isSupabaseConfigured() {
    const url = this.supabaseUrl;
    const key = this.supabaseKey;
    return Boolean(url && key && url.startsWith('http') && url.includes('.supabase.co'));
  },

  // Custom Node.js Express Backend URL (if deployed on Render / Railway / VPS)
  get customApiUrl() {
    return localStorage.getItem('secondBrain_custom_api_url') || '';
  },
  set customApiUrl(val) {
    if (val) localStorage.setItem('secondBrain_custom_api_url', val.trim());
    else localStorage.removeItem('secondBrain_custom_api_url');
  }
};
