/**
 * invite-user — server-side user invitation
 *
 * Creates a new Supabase Auth user using the service role key (which must
 * never reach the browser). The calling user must be authenticated AND have
 * the ADMIN role; the function verifies both before proceeding.
 *
 * Request body:
 *   { email: string, nome: string, role: "ADMIN"|"GESTOR"|"ALMOXARIFE"|"VISUALIZADOR" }
 *
 * Response:
 *   201 { userId: string }  — user created, invitation email sent
 *   400 { error: string }   — validation error
 *   401 { error: string }   — not authenticated
 *   403 { error: string }   — not an ADMIN
 *   409 { error: string }   — email already registered
 *   500 { error: string }   — server error
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  })
}

const VALID_ROLES = new Set(['ADMIN', 'GESTOR', 'ALMOXARIFE', 'VISUALIZADOR'])

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: CORS_HEADERS })
  }

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405)
  }

  // ── 1. Authenticate the calling user ───────────────────────────────────────
  const authHeader = req.headers.get('Authorization')
  if (!authHeader) return jsonResponse({ error: 'Unauthorized' }, 401)

  // Use anon key to verify the caller's JWT
  const userClient = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    { global: { headers: { Authorization: authHeader } } },
  )
  const { data: { user: caller }, error: authErr } = await userClient.auth.getUser()
  if (authErr || !caller) return jsonResponse({ error: 'Unauthorized' }, 401)

  // ── 2. Verify caller is ADMIN ──────────────────────────────────────────────
  // Use service role client to read the usuarios table without RLS restrictions
  const adminClient = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  )

  const { data: callerProfile, error: profileErr } = await adminClient
    .from('usuarios')
    .select('role')
    .eq('id', caller.id)
    .single()

  if (profileErr || !callerProfile) {
    return jsonResponse({ error: 'Perfil do usuário não encontrado.' }, 403)
  }
  if (callerProfile.role !== 'ADMIN') {
    return jsonResponse({ error: 'Apenas administradores podem convidar usuários.' }, 403)
  }

  // ── 3. Validate input ──────────────────────────────────────────────────────
  let body: { email: string; nome: string; role: string }
  try {
    body = await req.json()
  } catch {
    return jsonResponse({ error: 'Corpo da requisição inválido.' }, 400)
  }

  const email = (body.email ?? '').trim().toLowerCase()
  const nome = (body.nome ?? '').trim()
  const role = (body.role ?? '').trim().toUpperCase()

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return jsonResponse({ error: 'E-mail inválido.' }, 400)
  }
  if (!nome || nome.length < 2) {
    return jsonResponse({ error: 'Nome deve ter pelo menos 2 caracteres.' }, 400)
  }
  if (!VALID_ROLES.has(role)) {
    return jsonResponse({ error: `Perfil inválido: ${role}` }, 400)
  }

  // ── 4. Create the user via Admin API (service role key, server-side only) ──
  const { data: newUser, error: createErr } = await adminClient.auth.admin.createUser({
    email,
    email_confirm: true,
    user_metadata: { nome, role },
  })

  if (createErr) {
    // 422 from Supabase typically means email already registered
    if (
      createErr.message.toLowerCase().includes('already') ||
      createErr.message.toLowerCase().includes('duplicate') ||
      createErr.status === 422
    ) {
      return jsonResponse({ error: `O e-mail ${email} já está cadastrado.` }, 409)
    }
    return jsonResponse({ error: createErr.message }, 500)
  }

  return jsonResponse({ userId: newUser.user?.id }, 201)
})
