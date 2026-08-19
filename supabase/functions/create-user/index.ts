import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// Add type declaration for Deno to resolve "Cannot find name 'Deno'" error
// in TypeScript environments that don't have Deno's global types.
declare const Deno: any;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // This is needed if you're planning to invoke your function from a browser.
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !serviceKey) {
      // Return 200 with error so frontend can see it
      return new Response(JSON.stringify({ error: 'Server configuration error: Missing Supabase URL or Service Role Key.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    const { email: rawEmail, password, name, role, branch_id, branch_name, is_active, phone_number, department, skills, avatar_url, date_of_birth, gender, reporting_to, employee_code } = await req.json();
    const email = rawEmail ? rawEmail.replace(/\s/g, '').trim().toLowerCase() : '';

    // Input validation
    if (!email || !password || !name || !role) {
      return new Response(JSON.stringify({ error: 'Missing required fields: email, password, name, and role are required.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    // --- Step 0: Authorize the caller (must be a Super Admin) ---
    const callerToken = (req.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '');
    if (!callerToken) {
      return new Response(JSON.stringify({ error: 'Permission denied: Missing auth token.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
    const callerClient = createClient(supabaseUrl, anonKey ?? '', {
      global: { headers: { Authorization: `Bearer ${callerToken}` } },
    });
    const { data: callerUser, error: callerUserError } = await callerClient.auth.getUser(callerToken);
    if (callerUserError || !callerUser?.user) {
      return new Response(JSON.stringify({ error: 'Permission denied: Invalid or expired session.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }
    const { data: callerProfile, error: callerProfileError } = await callerClient
      .from('profiles')
      .select('role, is_active')
      .eq('id', callerUser.user.id)
      .maybeSingle();
    if (callerProfileError || !callerProfile || callerProfile.role !== 'Super Admin') {
      return new Response(JSON.stringify({ error: 'Permission denied: Only Super Admins can create users.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    // Create a Supabase admin client with the service_role key
    const supabaseAdmin = createClient(supabaseUrl, serviceKey);

    // Step 1: Create the user in auth.users
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: email,
      password: password,
      email_confirm: true, // User will receive a confirmation email
      user_metadata: {
        name: name,
        role: role,
        avatar_url: avatar_url
      }
    });

    if (authError) {
      return new Response(JSON.stringify({ error: `Auth error: ${authError.message}` }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    if (!authData.user) {
      return new Response(JSON.stringify({ error: 'User created in auth, but no user data returned.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }
    const newUserId = authData.user.id;

    // Step 2: Create the user's profile in the public.profiles table
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .upsert({
        id: newUserId,
        name: name,
        email: email,
        role: role,
        branch_id: branch_id || null,
        branch_name: branch_name,
        is_active: is_active,
        phone_number: phone_number,
        department: department,
        skills: skills,
        avatar_url: avatar_url,
        date_of_birth: date_of_birth,
        gender: gender,
        reporting_to: reporting_to || null,
        employee_code: employee_code || null,
      });

    if (profileError) {
      // If profile creation fails, attempt to clean up the auth user to prevent orphans
      await supabaseAdmin.auth.admin.deleteUser(newUserId);
      return new Response(JSON.stringify({ error: `Profile error: ${profileError.message}. The authentication user was rolled back.` }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    return new Response(JSON.stringify({ message: `Successfully created user ${email}` }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message || 'Unknown server error' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  }
});