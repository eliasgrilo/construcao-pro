import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
)

Deno.serve(async (req) => {
  // Only allow POST
  if (req.method !== 'POST' && req.method !== 'GET') {
    return new Response('Method Not Allowed', { status: 405 })
  }

  const { data, error } = await supabase.rpc('mark_parcelas_atrasado')
  if (error) {
    console.error('mark_parcelas_atrasado error:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  console.log(`Marked ${data} parcelas as ATRASADO`)
  return new Response(JSON.stringify({ updated: data, timestamp: new Date().toISOString() }), {
    headers: { 'Content-Type': 'application/json' },
  })
})
