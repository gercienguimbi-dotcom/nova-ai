import { createClient } from '@supabase/supabase-js'

export const supabase = createClient(
  'https://jcnjafxwlxqilrmzhbuf.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpjbmphZnh3bHhxaWxybXpoYnVmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM1MzY5NjYsImV4cCI6MjA4OTExMjk2Nn0.i5LuNVtzSCV6I8qiB2NVZJTCpcNPmmWMRHRxUcLaf58'
)