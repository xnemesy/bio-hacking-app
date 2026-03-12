// Configurazione client Supabase con persistenza auth via AsyncStorage
import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '../types/index';

const SUPABASE_URL = 'INSERISCI_SUPABASE_URL';
const SUPABASE_ANON_KEY = 'INSERISCI_ANON_KEY';

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
