import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://jehyuaifapujonhsdplv.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImplaHl1YWlmYXB1am9uaHNkcGx2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU5MTk5NjUsImV4cCI6MjA5MTQ5NTk2NX0._uIWzHJ_l2Ok07_5VyeHEt0c4NywuTiKhX_CpghREyw'

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)