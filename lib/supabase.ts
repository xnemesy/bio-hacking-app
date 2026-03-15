// Configurazione client Supabase con persistenza auth via AsyncStorage
import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '../types/index';

const SUPABASE_URL = 'https://nsgzpdtqbnpgfaqgpyyd.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5zZ3pwZHRxYm5wZ2ZhcWdweXlkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM1MTc0MTYsImV4cCI6MjA4OTA5MzQxNn0._uertHd_mrRWhLmiCTfMpY5q3MnEmpTLmqaRTQmLCuw';

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
