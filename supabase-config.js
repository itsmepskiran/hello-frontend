// Supabase Configuration for HelloBMG (Frontend)
import { createClient } from 'https://cdn.skypack.dev/@supabase/supabase-js@2'

// Project values
const SUPABASE_URL = 'https://vzshqqcthtqpgfwjxpxj.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ6c2hxcWN0aHRxcGdmd2p4cHhqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg3ODc4MDIsImV4cCI6MjA3NDM2MzgwMn0.xPWiruKzb8l-h7tI2m3bwOMhw5Wqf82m8zokHsLmLhY'

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

export const storage = {
  getPublicUrl(bucket, path) {
    const { data } = supabase.storage.from(bucket).getPublicUrl(path)
    return data.publicUrl
  }
}
