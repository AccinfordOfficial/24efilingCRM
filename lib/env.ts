// Reusable environment configuration referencing import.meta.env for Vite environment variables.
export const ENV = {
  SUPABASE_URL: import.meta.env.VITE_SUPABASE_URL || 'https://jblhzdtqrhfeawycecql.supabase.co',
  SUPABASE_ANON_KEY: import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpibGh6ZHRxcmhmZWF3eWNlY3FsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIwNzQzMzEsImV4cCI6MjA3NzY1MDMzMX0.a7agmNDE0aQl9gCt6SMuZdbp-KKVSm7Balojc6mQXyE',
  GOOGLE_GENAI_API_KEY: import.meta.env.GEMINI_API_KEY || '',
  WHATSAPP_TOKEN: import.meta.env.WHATSAPP_ACCESS_TOKEN || '',
  WHATSAPP_PHONE_NUMBER_ID: import.meta.env.WHATSAPP_PHONE_NUMBER_ID || '',
} as const;
