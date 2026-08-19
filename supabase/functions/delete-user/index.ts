
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
        const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
        const supabaseClient = createClient(supabaseUrl, serviceRoleKey)

        // --- Step 0: Authorize the caller (Super Admin or Admin; Admins cannot
        // delete Admins/Super Admins or themselves) ---
        const callerToken = (req.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '');
        if (!callerToken) {
            return new Response(
                JSON.stringify({ error: 'Permission denied: Missing auth token.' }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
            )
        }

        const callerClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY') ?? '', {
            global: { headers: { Authorization: `Bearer ${callerToken}` } },
        });
        const { data: callerUser, error: callerUserError } = await callerClient.auth.getUser(callerToken);
        if (callerUserError || !callerUser?.user) {
            return new Response(
                JSON.stringify({ error: 'Permission denied: Invalid or expired session.' }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
            )
        }
        const callerId = callerUser.user.id;
        const { data: callerProfile } = await callerClient
            .from('profiles')
            .select('role')
            .eq('id', callerId)
            .maybeSingle();
        const callerRole = callerProfile?.role;
        if (callerRole !== 'Super Admin' && callerRole !== 'Admin') {
            return new Response(
                JSON.stringify({ error: 'Permission denied: Only Super Admins and Admins can delete users.' }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
            )
        }

        const { userIds } = await req.json()

        if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
            return new Response(
                JSON.stringify({ error: 'No user IDs provided' }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
            )
        }

        if (userIds.includes(callerId)) {
            return new Response(
                JSON.stringify({ error: 'Cannot delete your own account.' }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
            )
        }

        if (callerRole === 'Admin') {
            const { data: targets } = await supabaseClient
                .from('profiles')
                .select('id, role')
                .in('id', userIds)
            const elevated = targets?.filter(t => t.role === 'Super Admin' || t.role === 'Admin')
            if (elevated && elevated.length > 0) {
                return new Response(
                    JSON.stringify({ error: 'Permission denied: Admins cannot delete other Admins or Super Admins.' }),
                    { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
                )
            }
        }

        // Delete users from auth.users (this should waterfall to public.profiles if configured, 
        // but often we might need to delete from profiles manually if no cascade exists)
        // Supabase Admin API deleteUser can typically only delete one at a time?
        // Let's check docs logic... actually listUsers is paginated, deleteUser is single.
        // So we loop.

        const results = [];
        const errors = [];

        for (const id of userIds) {
            const { error } = await supabaseClient.auth.admin.deleteUser(id)
            if (error) {
                console.error(`Failed to delete user ${id}:`, error)
                errors.push({ id, error: error.message })
            } else {
                results.push(id)
            }
        }

        // Also explicitly delete from profiles just in case Cascade isn't set up
        // Although standard practice is Cascade. Safe to try delete.
        const { error: profileError } = await supabaseClient
            .from('profiles')
            .delete()
            .in('id', userIds)

        // Ignore profile error if it's just "row not found" (already deleted by cascade)
        // But good to log it.
        if (profileError) {
            console.warn("Profile delete warning (might be cascade):", profileError);
        }

        return new Response(
            JSON.stringify({ success: true, deleted: results, failed: errors }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
        )

    } catch (error) {
        return new Response(
            JSON.stringify({ error: error.message }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        )
    }
})
