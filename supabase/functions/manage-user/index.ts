import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    // Verify the calling user's JWT
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) throw new Error('Missing authorization header')

    const { data: { user: caller }, error: callerErr } = await supabaseAdmin.auth.getUser(
      authHeader.replace('Bearer ', '')
    )
    if (callerErr || !caller) throw new Error('Unauthorized')

    const body = await req.json()
    const { action } = body

    // Staff may only update their own profile; management actions
    // (create/update/delete other users) require Admin or Developer.
    if (action !== 'update-self') {
      const { data: callerRow } = await supabaseAdmin
        .from('users')
        .select('user_permissions')
        .eq('id', caller.id)
        .single()
      const perms: string[] = callerRow?.user_permissions ?? []
      if (!perms.includes('Admin') && !perms.includes('Developer')) {
        throw new Error('You do not have permission to manage users.')
      }
    }

    // ── CREATE ────────────────────────────────────────────────────────────────
    if (action === 'create') {
      const { name, email, permissions, redirectTo } = body

      // Creates the auth user and emails them an invite link in one call
      const { data: inviteData, error: inviteErr } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
        redirectTo,
        data: { name },
      })
      if (inviteErr) throw inviteErr

      const { error: insertErr } = await supabaseAdmin.from('users').insert({
        id: inviteData.user.id,
        name,
        email,
        user_permissions: permissions,
        user_status: 'pending',
      })
      if (insertErr) {
        // Roll back the auth user if the profile insert fails
        await supabaseAdmin.auth.admin.deleteUser(inviteData.user.id)
        throw insertErr
      }

      return new Response(
        JSON.stringify({ id: inviteData.user.id, name, email }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // ── DELETE ────────────────────────────────────────────────────────────────
    if (action === 'delete') {
      const { userId } = body

      const { error: deleteProfileErr } = await supabaseAdmin.from('users').delete().eq('id', userId)
      if (deleteProfileErr) throw deleteProfileErr

      // Removes the user from auth.users (cascades session/token cleanup).
      // The on_public_user_deleted trigger usually deletes the auth user
      // already, so a not-found here means the work is done, not a failure.
      const { error: deleteAuthErr } = await supabaseAdmin.auth.admin.deleteUser(userId)
      if (deleteAuthErr && deleteAuthErr.status !== 404) throw deleteAuthErr

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // ── UPDATE ────────────────────────────────────────────────────────────────
    if (action === 'update') {
      const { userId, name, email, permissions, status } = body

      // Fetch current auth user once so we can diff before writing
      const { data: authUserData, error: getUserErr } = await supabaseAdmin.auth.admin.getUserById(userId)
      if (getUserErr) throw getUserErr

      const authUpdates: Record<string, unknown> = {}

      // Only sync email when it has actually changed — same-email calls return a {} error from GoTrue
      if (email !== undefined && authUserData.user.email !== email) {
        authUpdates.email = email
      }

      // Keep name in sync with auth.users user_metadata (set during invite via data: { name })
      if (name !== undefined) {
        authUpdates.user_metadata = { ...(authUserData.user.user_metadata ?? {}), name }
      }

      if (Object.keys(authUpdates).length > 0) {
        const { error: authUpdateErr } = await supabaseAdmin.auth.admin.updateUserById(userId, authUpdates)
        if (authUpdateErr) throw authUpdateErr
      }

      const updates: Record<string, unknown> = {}
      if (name !== undefined) updates.name = name
      if (email !== undefined) updates.email = email
      if (permissions !== undefined) updates.user_permissions = permissions
      if (status !== undefined) updates.user_status = status

      const { error: updateErr } = await supabaseAdmin.from('users').update(updates).eq('id', userId)
      if (updateErr) throw updateErr

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // ── UPDATE-SELF ───────────────────────────────────────────────────────────
    // Caller updates their own profile; userId is taken from their verified JWT
    // so it is impossible to modify another user's record via this action.
    if (action === 'update-self') {
      const userId = caller.id
      const { name, email, pipedriveApiToken } = body

      const { data: authUserData, error: getUserErr } = await supabaseAdmin.auth.admin.getUserById(userId)
      if (getUserErr) throw getUserErr

      const authUpdates: Record<string, unknown> = {}

      if (email !== undefined && authUserData.user.email !== email) {
        authUpdates.email = email
      }

      if (name !== undefined) {
        authUpdates.user_metadata = { ...(authUserData.user.user_metadata ?? {}), name }
      }

      if (Object.keys(authUpdates).length > 0) {
        const { error: authUpdateErr } = await supabaseAdmin.auth.admin.updateUserById(userId, authUpdates)
        if (authUpdateErr) throw authUpdateErr
      }

      const updates: Record<string, unknown> = {}
      if (name !== undefined) updates.name = name
      if (email !== undefined) updates.email = email
      if (pipedriveApiToken !== undefined) updates.pipedrive_api_token = pipedriveApiToken

      const { error: updateErr } = await supabaseAdmin.from('users').update(updates).eq('id', userId)
      if (updateErr) throw updateErr

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    throw new Error(`Unknown action: ${action}`)
  } catch (err: any) {
    let message = err instanceof Error
      ? err.message
      : (err?.message ? String(err.message) : JSON.stringify(err))
    if (!message || message === '{}') {
      message = 'Unknown error — check the manage-user function logs in the Supabase dashboard.'
    }
    return new Response(
      JSON.stringify({ error: message }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
