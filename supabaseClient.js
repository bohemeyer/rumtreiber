import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://mvidhtluukxamhqyvltb.supabase.co";
const supabaseAnonKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im12aWRodGx1dWt4YW1ocXl2bHRiIiwicm9sZSI6ImFub24iLCJpYXQiOjE2NzA5Njk1NjgsImV4cCI6MTk4NjU0NTU2OH0.TUb1YB2kOL0dVwVRctZeSrLvAAd-qa7buHJZLHnSSzo";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
