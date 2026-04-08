/**
 * gemini-proxy — server-side Gemini API relay
 *
 * Keeps the GEMINI_KEY out of the client bundle entirely.
 * The browser calls this edge function; it injects the key and forwards
 * the request to Google's Generative Language API.
 *
 * Supported modes (passed in JSON body):
 *   "match"       — NF-e item matching (returns JSON from Gemini)
 *   "clean_name"  — product name normalization (returns plain text)
 *   "chat"        — dashboard AI assistant (returns plain text)
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const GEMINI_KEY = Deno.env.get('GEMINI_KEY') ?? ''
const GEMINI_BASE = 'https://generativelanguage.googleapis.com/v1beta/models'
const GEMINI_BASE_ALPHA = 'https://generativelanguage.googleapis.com/v1alpha/models'
const GEMINI_MODELS = ['gemini-2.5-flash', 'gemini-2.0-flash']

// ── CORS headers ──────────────────────────────────────────────────────────────
// ALLOWED_ORIGIN must be set as a Supabase secret:
//   supabase secrets set ALLOWED_ORIGIN=https://construcao-pro.vercel.app
// Falls back to localhost for local development only.
const ALLOWED_ORIGIN = Deno.env.get('ALLOWED_ORIGIN')
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': ALLOWED_ORIGIN ?? '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  })
}

// ── Auth guard ────────────────────────────────────────────────────────────────
async function getAuthenticatedUser(req: Request) {
  const authHeader = req.headers.get('Authorization')
  if (!authHeader) return null

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    { global: { headers: { Authorization: authHeader } } },
  )
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()
  if (error || !user) return null
  return user
}

// ── Gemini HTTP call with model fallback ──────────────────────────────────────
async function callGeminiApi(
  model: string,
  requestBody: Record<string, unknown>,
  timeoutMs = 10_000,
): Promise<{ ok: boolean; status: number; data: unknown }> {
  const isPreview = model.includes('preview')
  const base = isPreview ? GEMINI_BASE_ALPHA : GEMINI_BASE
  const url = `${base}/${model}:generateContent`

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': GEMINI_KEY },
    body: JSON.stringify(requestBody),
    signal: AbortSignal.timeout(timeoutMs),
  })

  const data = await res.json().catch((e) => {
    console.error(`[gemini-proxy] Failed to parse JSON response from ${model}:`, e)
    return null
  })
  return { ok: res.ok, status: res.status, data }
}

async function callGeminiWithFallback(
  requestBody: Record<string, unknown>,
): Promise<{ text: string; error?: string }> {
  for (const model of GEMINI_MODELS) {
    try {
      const result = await callGeminiApi(model, requestBody)
      if (result.ok) {
        // biome-ignore lint/suspicious/noExplicitAny: Gemini API response shape
        const text: string = (result.data as any)?.candidates?.[0]?.content?.parts?.[0]?.text ?? ''
        return { text }
      }
      // 404 = model not found, try next
      if (result.status === 404) {
        console.warn(`[gemini-proxy] Model ${model} not found (404), trying next...`)
        continue
      }
      // Other errors: return immediately with error message
      // biome-ignore lint/suspicious/noExplicitAny: Gemini API error shape
      const apiMsg: string = (result.data as any)?.error?.message ?? ''
      return { text: '', error: `Gemini erro ${result.status}: ${apiMsg}` }
    } catch (err) {
      const isTimeout = (err as Error)?.name === 'TimeoutError'
      console.error(`[gemini-proxy] Model ${model} error:`, (err as Error)?.message)
      return {
        text: '',
        error: isTimeout ? 'Tempo esgotado aguardando Gemini.' : 'Sem conexão com a API Gemini.',
      }
    }
  }
  return { text: '', error: 'Todos os modelos Gemini falharam.' }
}

// ── Request handlers ──────────────────────────────────────────────────────────

interface MatchRequest {
  mode: 'match'
  prompt: string
}

interface CleanNameRequest {
  mode: 'clean_name'
  rawName: string
}

interface ChatRequest {
  mode: 'chat'
  systemInstruction: string
  turns: Array<{ role: 'user' | 'model'; parts: [{ text: string }] }>
}

type ProxyRequest = MatchRequest | CleanNameRequest | ChatRequest

async function handleMatch(req: MatchRequest): Promise<Response> {
  const geminiBody = {
    contents: [{ parts: [{ text: req.prompt }] }],
    generationConfig: { temperature: 0.05, maxOutputTokens: 512 },
  }
  const { text, error } = await callGeminiWithFallback(geminiBody)
  if (error) return jsonResponse({ error }, 502)
  return jsonResponse({ text })
}

async function handleCleanName(req: CleanNameRequest): Promise<Response> {
  const prompt = `Normalize este nome de produto fiscal para um nome comercial limpo em português brasileiro.
Regras: sem abreviações, título case, remova prefixos de NCM/CFOP/códigos fiscais.
Mantenha informações técnicas relevantes (tamanho, capacidade, material).
Retorne APENAS o nome limpo, sem explicações.

Nome fiscal: "${req.rawName}"
Nome limpo:`

  const geminiBody = {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: { temperature: 0.1, maxOutputTokens: 64 },
  }
  const { text, error } = await callGeminiWithFallback(geminiBody)
  if (error) return jsonResponse({ error }, 502)
  return jsonResponse({ text: text.trim() })
}

async function handleChat(req: ChatRequest): Promise<Response> {
  const geminiBody = {
    systemInstruction: { parts: [{ text: req.systemInstruction }] },
    contents: req.turns,
    generationConfig: { temperature: 0.3, maxOutputTokens: 500 },
  }

  // Chat uses only the primary model — no fallback needed for conversational UX
  try {
    const result = await callGeminiApi('gemini-2.5-flash', geminiBody, 15_000)
    if (!result.ok) {
      return jsonResponse({ error: 'Erro ao consultar a IA. Tente novamente.' }, 502)
    }
    const text: string =
      // biome-ignore lint/suspicious/noExplicitAny: Gemini API response shape
      (result.data as any)?.candidates?.[0]?.content?.parts?.[0]?.text ?? 'Sem resposta da IA.'
    return jsonResponse({ text })
  } catch {
    return jsonResponse({ error: 'Erro ao consultar a IA. Tente novamente.' }, 502)
  }
}

// ── Main handler ──────────────────────────────────────────────────────────────

Deno.serve(async (req: Request) => {
  // Preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: CORS_HEADERS })
  }

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405)
  }

  if (!ALLOWED_ORIGIN) {
    console.error('ALLOWED_ORIGIN not configured')
    return jsonResponse({ error: 'Server misconfiguration: ALLOWED_ORIGIN missing' }, 500)
  }

  // Require authenticated Supabase user
  const user = await getAuthenticatedUser(req)
  if (!user) {
    return jsonResponse({ error: 'Unauthorized' }, 401)
  }

  if (!GEMINI_KEY) {
    return jsonResponse({ error: 'GEMINI_KEY não configurada no servidor.' }, 500)
  }

  // Guard against oversized payloads (DoS prevention)
  const contentLength = Number(req.headers.get('content-length') ?? 0)
  if (contentLength > 50_000) {
    return jsonResponse({ error: 'Payload muito grande' }, 413)
  }

  let body: ProxyRequest
  try {
    body = (await req.json()) as ProxyRequest
  } catch {
    return jsonResponse({ error: 'Invalid JSON body' }, 400)
  }

  // Secondary size check on parsed body (handles chunked encoding)
  if (JSON.stringify(body).length > 50_000) {
    return jsonResponse({ error: 'Payload muito grande' }, 413)
  }

  switch (body.mode) {
    case 'match':
      return handleMatch(body)
    case 'clean_name':
      return handleCleanName(body)
    case 'chat':
      return handleChat(body)
    default:
      return jsonResponse({ error: 'mode inválido' }, 400)
  }
})
