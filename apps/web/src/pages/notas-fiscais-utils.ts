import { supabase } from '@/lib/supabase'
import type {
  GeminiMatchResult,
  MatchMemory,
  MaterialItem,
  NFItemParsed,
  NFePagamento,
  NFeParsed,
  UploadStep,
} from './notas-fiscais-types'

// ─── Constants ─────────────────────────────────────────────────────────────────

// GEMINI_KEY intentionally removed from the client — the key lives exclusively
// in the server-side gemini-proxy Edge Function (Supabase secrets).
export const MEMORIA_TABLE = 'nf_match_memoria'

export const STATUS_CONFIG: Record<
  string,
  { label: string; bg: string; text: string; dot: string }
> = {
  PENDENTE: { label: 'Pendente', bg: '#FF950015', text: '#FF9500', dot: '#FF9500' },
  PROCESSADA: { label: 'Processada', bg: '#007AFF15', text: '#007AFF', dot: '#007AFF' },
  VINCULADA: { label: 'Vinculada', bg: '#34C75915', text: '#34C759', dot: '#34C759' },
  REJEITADA: { label: 'Rejeitada', bg: '#FF3B3015', text: '#FF3B30', dot: '#FF3B30' },
}

export const FILTERS = [
  { id: 'all' as const, label: 'Todas', color: '#007AFF' },
  { id: 'PENDENTE' as const, label: 'Pendentes', color: '#FF9500' },
  { id: 'PROCESSADA' as const, label: 'Processadas', color: '#007AFF' },
  { id: 'VINCULADA' as const, label: 'Vinculadas', color: '#34C759' },
  { id: 'REJEITADA' as const, label: 'Rejeitadas', color: '#FF3B30' },
]

// 4-step import flow: select → preview → matching → finalizar
export const STEP_ORDER: UploadStep[] = ['select', 'preview', 'matching', 'finalizar']
export const STEP_META: Array<{ label: string }> = [
  { label: 'Arquivo' },
  { label: 'Prévia' },
  { label: 'IA' },
  { label: 'Confirmar' },
]

// ─── Framer Motion variants — module-level so references are stable across renders ─
export const nfCardVariants = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { duration: 0.28, ease: [0.25, 0.46, 0.45, 0.94] } },
} as const
export const nfListVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.035 } },
} as const

// ─── Date helpers ───────────────────────────────────────────────────────────────

// Date-only strings (YYYY-MM-DD) are parsed as UTC midnight by spec, which can
// shift the displayed month in Brazil (UTC-3). Appending T12:00:00 forces
// local-noon parsing so the month never rolls back by one day.
function normalizeDateStr(dateStr: string): string {
  return /^\d{4}-\d{2}-\d{2}$/.test(dateStr) ? `${dateStr}T12:00:00` : dateStr
}

export function monthKey(dateStr: string): string {
  try {
    const d = new Date(normalizeDateStr(dateStr))
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
  } catch {
    return ''
  }
}

export function formatMonthYear(dateStr: string): string {
  try {
    const d = new Date(normalizeDateStr(dateStr))
    const label = d.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
    return label.charAt(0).toUpperCase() + label.slice(1)
  } catch {
    return dateStr
  }
}

// ─── Cloud memory — module-level cache avoids repeated Supabase round-trips ────
// Org-wide learning: every confirmed match is saved to the cloud so all users
// benefit from prior imports, even on different devices.
// The cache is keyed by Supabase user ID so that different users in the same
// browser tab (e.g. logout → re-login as another user) do not share matches.

export let _memoryCache: MatchMemory | null = null
export let _memoryCacheUserId: string | null = null

export async function loadMemoryCloud(): Promise<MatchMemory> {
  // Determine current user to scope the cache
  const {
    data: { user },
  } = await supabase.auth.getUser()
  const userId = user?.id ?? null

  // Invalidate cache if the logged-in user changed
  if (userId !== _memoryCacheUserId) {
    _memoryCache = null
    _memoryCacheUserId = userId
  }

  if (_memoryCache) return _memoryCache
  try {
    const { data, error } = await supabase
      .from(MEMORIA_TABLE)
      .select('descricao_xml, material_id, material_nome')
    if (error) throw error
    const mem: MatchMemory = {}
    for (const row of (data ?? []) as Array<{
      descricao_xml: string
      material_id: string
      material_nome: string
    }>) {
      mem[row.descricao_xml] = { id_interno: row.material_id, nome_interno: row.material_nome }
    }
    _memoryCache = mem
    return mem
  } catch {
    return {}
  }
}

export function saveMemoryCloud(
  key: string,
  value: { id_interno: string; nome_interno: string },
): void {
  // Capture the cache owner at call time — prevents a logout/re-login race from
  // writing one user's learning data into another user's in-memory cache scope.
  const cacheOwnerAtCallTime = _memoryCacheUserId

  if (_memoryCache !== null && _memoryCacheUserId === cacheOwnerAtCallTime) {
    _memoryCache = { ..._memoryCache, [key]: value }
  }

  supabase
    .from(MEMORIA_TABLE)
    .upsert(
      {
        descricao_xml: key,
        material_id: value.id_interno,
        material_nome: value.nome_interno,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'descricao_xml' },
    )
    .then(({ error }: { error: { message: string } | null }) => {
      if (error && _memoryCacheUserId === cacheOwnerAtCallTime && _memoryCache?.[key]) {
        // Rollback the optimistic in-memory update when the cloud write fails,
        // but only if the cache still belongs to the same user session.
        const { [key]: _removed, ...rest } = _memoryCache
        _memoryCache = rest
      }
    })
}

// ─── NF-e auto-registration helpers ────────────────────────────────────────────

export async function getOrCreateImportedCategory(): Promise<string> {
  const { data: existing } = await supabase
    .from('categorias')
    .select('id')
    .eq('nome', 'Importados NF-e')
    .maybeSingle()
  if (existing?.id) return existing.id
  const { data: created, error } = await supabase
    .from('categorias')
    .insert({ nome: 'Importados NF-e', unidade: 'UN' })
    .select('id')
    .single()
  if (error) {
    // Concurrent insert race — fetch the row that beat us
    if (error.code === '23505') {
      const { data: race } = await supabase
        .from('categorias')
        .select('id')
        .eq('nome', 'Importados NF-e')
        .maybeSingle()
      if (race?.id) return race.id
    }
    throw new Error('Não foi possível criar categoria padrão.')
  }
  return created.id
}

export function toTitleCase(str: string): string {
  return str
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .trim()
}

export async function cleanProductName(rawName: string): Promise<string> {
  try {
    const { data, error } = await supabase.functions.invoke('gemini-proxy', {
      body: { mode: 'clean_name', rawName },
    })
    if (error || data?.error || !data?.text) return toTitleCase(rawName)
    return (data.text as string).trim() || toTitleCase(rawName)
  } catch {
    return toTitleCase(rawName)
  }
}

export function generateMaterialCode(cProd: string | null, descricao: string): string {
  if (cProd) return `NF-${cProd.replace(/\W/g, '').slice(0, 12).toUpperCase()}`
  const words = descricao
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9 ]/g, '')
    .split(/\s+/)
    .slice(0, 2)
  const prefix = words.join('').slice(0, 8)
  // Use last 6 digits of current timestamp — monotonically increasing, collision-resistant
  const suffix = String(Date.now()).slice(-6)
  return `NF-${prefix || 'ITEM'}${suffix}`
}

// ─── Gemini ─────────────────────────────────────────────────────────────────────

export function buildGeminiPrompt(
  item: NFItemParsed,
  catalogSlice: object[],
  memory: MatchMemory,
): string {
  return `Você é um especialista em logística e inventário de materiais de construção.

TAREFA: Encontre o item do Catálogo Interno que melhor corresponde ao item do XML abaixo.

CRITÉRIOS (prioridade decrescente):
1. HISTÓRICO: Se item já foi vinculado em MEMORIA_DE_APRENDIZADO, use com confiança 1.0
2. CÓDIGO DE BARRAS: EAN igual → confiança 1.0
3. EQUIVALÊNCIA TÉCNICA: "PARAFUSO SEXT 1/4" = "Parafuso Aço 6mm" (1/4" ≈ 6mm)
4. ABREVIAÇÕES: UN=Unidade, CX=Caixa, PÇ=Peça, SEXT=Sextavado, SC=Saco, KG=Quilograma
5. SIMILARIDADE: Nomes próximos, mesma categoria, mesma unidade

ITEM_XML: ${JSON.stringify({ descricao: item.descricao, unidade: item.unidade, gtin: item.gtin, cProd: item.cProd })}
MEMORIA: ${JSON.stringify(memory)}
CATALOGO: ${JSON.stringify(catalogSlice)}

Responda APENAS JSON válido:
{"status":"sucesso","vinculo_sugerido":{"id_interno":"UUID","nome_interno":"NOME","confianca":0.95,"justificativa_logica":"1 frase"},"acoes_necessarias":["confirmar_vinculo"]}

status "duvida" se confiança < 0.4, "erro" se catálogo vazio ou sem correspondência.`
}

export function parseGeminiResponse(text: string): GeminiMatchResult {
  if (!text) throw new Error('Gemini retornou resposta vazia.')
  const cleaned = text
    .replace(/^```(?:json)?\s*/m, '')
    .replace(/\s*```\s*$/m, '')
    .trim()
  try {
    return JSON.parse(cleaned) as GeminiMatchResult
  } catch {
    throw new Error('Gemini retornou resposta com formato inválido.')
  }
}

// GeminiFatalKeyError signals that the Gemini key/quota is broken server-side
// and further attempts for this session should be aborted.
export class GeminiFatalKeyError extends Error {
  constructor(msg: string) {
    super(msg)
    this.name = 'GeminiFatalKeyError'
  }
}

export async function callGemini(
  item: NFItemParsed,
  catalog: MaterialItem[],
  memory: MatchMemory,
): Promise<GeminiMatchResult> {
  // Pre-filter to relevant items only — keeps prompt size small (~5 KB vs ~40 KB)
  const catalogSlice = getRelevantCatalogSlice(item, catalog)
  const memorySlice = getRelevantMemorySlice(item, memory)
  const prompt = buildGeminiPrompt(item, catalogSlice, memorySlice)

  // Relay through the server-side Edge Function — the Gemini key never reaches
  // the browser; authentication is injected automatically by the Supabase client.
  const { data, error } = await supabase.functions.invoke('gemini-proxy', {
    body: { mode: 'match', prompt },
  })

  if (error) {
    throw new Error(error.message ?? 'Erro ao comunicar com o servidor de IA.')
  }

  if (data?.error) {
    // Treat key/quota errors as fatal so the caller stops retrying
    const msg: string = data.error
    if (
      msg.includes('expirada') ||
      msg.includes('inválida') ||
      msg.includes('revogada') ||
      msg.includes('não configurada')
    ) {
      throw new GeminiFatalKeyError(msg)
    }
    throw new Error(msg)
  }

  const text: string = data?.text ?? ''
  return parseGeminiResponse(text)
}

// ─── Local semantic fallback ────────────────────────────────────────────────────

export function localMatch(item: NFItemParsed, catalog: MaterialItem[]): GeminiMatchResult | null {
  if (catalog.length === 0) return null
  const query = item.descricao.toLowerCase()
  const tokens = query.split(/\s+/).filter((t) => t.length > 2)
  if (tokens.length === 0) return null

  const scored = catalog.map((m) => {
    const name = m.nome.toLowerCase()
    const score = tokens.reduce((acc, t) => acc + (name.includes(t) ? 1 : 0), 0)
    return { m, score }
  })
  scored.sort((a, b) => b.score - a.score)

  const best = scored[0]
  if (!best || best.score === 0) return null

  const confidence = Math.min(0.55, best.score / Math.max(tokens.length, 1))
  return {
    status: confidence >= 0.3 ? 'sucesso' : 'duvida',
    vinculo_sugerido: {
      id_interno: best.m.id,
      nome_interno: best.m.nome,
      confianca: confidence,
      justificativa_logica: 'Correspondência por palavras-chave (IA indisponível).',
    },
    acoes_necessarias: ['confirmar_vinculo', 'distribuir_estoque'],
  }
}

// ─── Unit normalizer — maps NF-e uCom strings to materiais unidade enum ─────

export const UNIDADE_MAP: Record<string, string> = {
  UN: 'UN',
  UNID: 'UN',
  UNIDADE: 'UN',
  PC: 'PC',
  PÇ: 'PC',
  PCS: 'PC',
  PECA: 'PC',
  PEÇA: 'PC',
  KG: 'KG',
  GR: 'KG',
  G: 'KG',
  M: 'M',
  MT: 'M',
  ML: 'M',
  M2: 'M2',
  'M²': 'M2',
  M3: 'M3',
  'M³': 'M3',
  L: 'L',
  LT: 'L',
  LTS: 'L',
  CX: 'CX',
  CAIXA: 'CX',
  SC: 'SC',
  SACO: 'SC',
  TB: 'TB',
  TUBO: 'TB',
  GL: 'GL',
  GALAO: 'GL',
  GALÃO: 'GL',
}

export type MatUnidade = 'UN' | 'KG' | 'M' | 'M2' | 'M3' | 'L' | 'CX' | 'PC' | 'SC' | 'TB' | 'GL'

export function normalizeUnidade(uCom: string): MatUnidade {
  const key = uCom.toUpperCase().trim().replace(/\./g, '')
  return (UNIDADE_MAP[key] as MatUnidade) ?? 'UN'
}

export function item_key(item: NFItemParsed): string {
  if (item.gtin) return `gtin:${item.gtin}`
  return `${item.descricao.toLowerCase().trim()}|${item.unidade}`
}

export function translateCFOP(cfop: string | null): string | null {
  if (!cfop || cfop.length < 4) return cfop
  const map: Record<string, string> = { '5': '1', '6': '2', '7': '3' }
  const translated = map[cfop[0]]
  return translated ? translated + cfop.slice(1) : cfop
}

// ─── Prompt pre-filters — smaller context = faster Gemini responses ─────────────
// Ranks catalog items by token overlap with the NF item description.
// Sending only the 25 most relevant items (~5 KB) instead of all 300 (~40 KB)
// reduces per-call latency by 2–5 s and lowers token cost significantly.
export function getRelevantCatalogSlice(
  item: NFItemParsed,
  catalog: MaterialItem[],
): Array<{
  id: string
  nome: string
  codigo: string | null
  unidade: string | null
  codigo_barras: string | null
}> {
  const mapped = catalog.map((m) => ({
    id: m.id,
    nome: m.nome,
    codigo: m.codigo,
    unidade: m.unidade,
    codigo_barras: m.codigo_barras,
  }))
  if (catalog.length <= 30) return mapped

  const tokens = item.descricao
    .toLowerCase()
    .split(/\s+/)
    .filter((t) => t.length > 2)
  if (tokens.length === 0) return mapped.slice(0, 30)

  const scored = catalog.map((m, i) => {
    const name = m.nome.toLowerCase()
    const code = (m.codigo ?? '').toLowerCase()
    const score = tokens.reduce(
      (acc, t) => acc + (name.includes(t) ? 2 : 0) + (code.includes(t) ? 1 : 0),
      0,
    )
    return { i, score }
  })
  scored.sort((a, b) => b.score - a.score)

  const topIdxs = new Set(scored.slice(0, 25).map((s) => s.i))
  return mapped.filter((_, i) => topIdxs.has(i))
}

// Filters the learning memory to the 15 entries most similar to the current item.
// Avoids sending hundreds of unrelated past matches in every prompt.
export function getRelevantMemorySlice(item: NFItemParsed, memory: MatchMemory): MatchMemory {
  const entries = Object.entries(memory)
  if (entries.length <= 15) return memory

  const tokens = item.descricao
    .toLowerCase()
    .split(/\s+/)
    .filter((t) => t.length > 2)
  if (tokens.length === 0) return Object.fromEntries(entries.slice(0, 15)) as MatchMemory

  const scored = entries.map(([key, value]) => {
    const k = key.toLowerCase()
    const score = tokens.reduce((acc, t) => acc + (k.includes(t) ? 1 : 0), 0)
    return { key, value, score }
  })
  scored.sort((a, b) => b.score - a.score)
  return Object.fromEntries(
    scored.slice(0, 15).map(({ key, value }) => [key, value]),
  ) as MatchMemory
}

// ─── XML parser ─────────────────────────────────────────────────────────────────

/** Map CFOP code to financial category for Contas a Pagar auto-categorization */
export function categorizeByCFOP(cfop: string | null): string {
  if (!cfop) return 'Fornecedores'
  const code = Number.parseInt(cfop, 10)
  if ([1101, 1102, 2101, 2102, 5101, 5102, 6101, 6102, 1403, 2403].includes(code))
    return 'Custo de Mercadoria Vendida'
  if ([1551, 2551, 1406, 2406].includes(code)) return 'Investimento / Equipamentos'
  if ([1556, 2556, 1407, 2407].includes(code)) return 'Despesas Operacionais'
  if ([1401, 2401].includes(code)) return 'Materiais de Construção'
  if ([5201, 5202, 6201, 6202, 1201, 1202, 2201, 2202].includes(code)) return '__DEVOLUCAO__'
  return 'Fornecedores'
}

/** Payment tPag codes considered already paid (cash, cards, PIX) at NF emission */
export const PAGAMENTO_IMEDIATO_TPAG = new Set([
  '01',
  '02',
  '03',
  '04',
  '05',
  '10',
  '11',
  '12',
  '13',
  '17',
  '18',
  '19',
])

/** Human-readable payment method label from tPag code */
export function getPagLabel(tPag: string, xPag: string | null): string {
  const labels: Record<string, string> = {
    '01': 'Dinheiro',
    '02': 'Cheque',
    '03': 'Cartão de Crédito',
    '04': 'Cartão de Débito',
    '05': 'Crédito Loja',
    '10': 'Vale Alimentação',
    '11': 'Vale Refeição',
    '12': 'Vale Presente',
    '13': 'Vale Combustível',
    '15': 'Boleto Bancário',
    '16': 'Depósito Bancário',
    '17': 'PIX',
    '18': 'Transferência Bancária',
    '19': 'Cashback',
    '90': 'Sem pagamento',
  }
  return xPag || labels[tPag] || `Pagamento (${tPag})`
}

export function formatCNPJ(v: string): string {
  const d = v.replace(/\D/g, '')
  return d.length === 14 ? d.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5') : v
}

export function parseNFeXML(xmlText: string): { nf: NFeParsed; itens: NFItemParsed[] } {
  const doc = new DOMParser().parseFromString(xmlText, 'application/xml')
  if (doc.querySelector('parsererror')) throw new Error('Arquivo XML inválido ou corrompido.')

  const getTag = (name: string): string =>
    doc.getElementsByTagName(name)[0]?.textContent?.trim() ?? ''

  const chaveFromProt = getTag('chNFe')
  const infNFe = doc.getElementsByTagName('infNFe')[0]
  const idAttr = infNFe?.getAttribute('Id') ?? ''
  const chave_acesso = chaveFromProt || (idAttr.startsWith('NFe') ? idAttr.slice(3) : idAttr)

  if (!chave_acesso || chave_acesso.length !== 44)
    throw new Error('Chave de acesso não encontrada. Confirme que é uma NF-e autorizada.')

  // ── finNFe (finalidade): 1=Normal, 2=Complementar, 3=Ajuste, 4=Devolução ───
  const ideEl = doc.getElementsByTagName('ide')[0]
  const finNFeRaw = ideEl?.getElementsByTagName('finNFe')[0]?.textContent?.trim()
  const finalidade = finNFeRaw ? Number.parseInt(finNFeRaw, 10) : null

  const numero = getTag('nNF')
  const emitEl = doc.getElementsByTagName('emit')[0]
  const destEl = doc.getElementsByTagName('dest')[0]
  const enderEmitEl = emitEl?.getElementsByTagName('enderEmit')[0]
  const cnpj_emitente = emitEl?.getElementsByTagName('CNPJ')[0]?.textContent?.trim() ?? ''
  const nome_emitente = emitEl?.getElementsByTagName('xNome')[0]?.textContent?.trim() ?? ''
  const nome_fantasia_emitente =
    emitEl?.getElementsByTagName('xFant')[0]?.textContent?.trim() || null
  const ie_emitente = emitEl?.getElementsByTagName('IE')[0]?.textContent?.trim() || null
  const fone_emitente = enderEmitEl?.getElementsByTagName('fone')[0]?.textContent?.trim() || null

  // Compose full address from enderEmit sub-tags
  const addrParts = [
    enderEmitEl?.getElementsByTagName('xLgr')[0]?.textContent?.trim(),
    enderEmitEl?.getElementsByTagName('nro')[0]?.textContent?.trim(),
    enderEmitEl?.getElementsByTagName('xCpl')[0]?.textContent?.trim(),
    enderEmitEl?.getElementsByTagName('xBairro')[0]?.textContent?.trim(),
    enderEmitEl?.getElementsByTagName('xMun')[0]?.textContent?.trim(),
    enderEmitEl?.getElementsByTagName('UF')[0]?.textContent?.trim(),
    enderEmitEl?.getElementsByTagName('CEP')[0]?.textContent?.trim(),
  ].filter(Boolean)
  const endereco_emitente = addrParts.length > 0 ? addrParts.join(', ') : null

  const cnpjDest = destEl?.getElementsByTagName('CNPJ')[0]?.textContent?.trim() ?? ''

  if (!numero) throw new Error('Número da NF não encontrado.')
  if (!cnpj_emitente) throw new Error('CNPJ do emitente não encontrado.')

  // ── Tax totals from <ICMSTot> ───────────────────────────────────────────────
  const icmsTot = doc.getElementsByTagName('ICMSTot')[0]
  const getTotTag = (name: string): number =>
    Number.parseFloat(icmsTot?.getElementsByTagName(name)[0]?.textContent?.trim() || '0')

  const vNFParsed = getTotTag('vNF') || Number.parseFloat(getTag('vNF') || '0')
  const vST = getTotTag('vST')
  const vFrete = getTotTag('vFrete')
  const vDesc = getTotTag('vDesc')
  const vSeg = getTotTag('vSeg')
  const vOutro = getTotTag('vOutro')
  // Retained taxes reduce what the buyer actually pays
  const totalRetido =
    getTotTag('vISSRet') +
    getTotTag('vRetPIS') +
    getTotTag('vRetCOFINS') +
    getTotTag('vRetCSLL') +
    getTotTag('vIRRF')
  const valor_liquido = Math.max(0, vNFParsed - totalRetido)

  // ── Payment methods from <pag>/<detPag> ────────────────────────────────────
  // NF-e schema ≥ 4.0 (NT 2016.002): payments are inside <detPag> elements.
  // Older schema (≤ 3.10): single <tPag>/<vPag> directly inside <pag>.
  const detPags = Array.from(doc.getElementsByTagName('detPag'))
  const pagamentos: NFePagamento[] =
    detPags.length > 0
      ? detPags.map((dp) => ({
          tPag: dp.getElementsByTagName('tPag')[0]?.textContent?.trim() ?? '90',
          vPag: Number.parseFloat(dp.getElementsByTagName('vPag')[0]?.textContent?.trim() || '0'),
          xPag: dp.getElementsByTagName('xPag')[0]?.textContent?.trim() || null,
          dVenc: dp.getElementsByTagName('dVenc')[0]?.textContent?.trim() || null,
        }))
      : (() => {
          // Legacy fallback: check <pag><tPag> and <pag><vPag>
          const pagEl = doc.getElementsByTagName('pag')[0]
          const legacyTPag = pagEl?.getElementsByTagName('tPag')[0]?.textContent?.trim()
          const legacyVPag = Number.parseFloat(
            pagEl?.getElementsByTagName('vPag')[0]?.textContent?.trim() || '0',
          )
          if (legacyTPag && legacyVPag > 0) {
            return [{ tPag: legacyTPag, vPag: legacyVPag, xPag: null, dVenc: null }]
          }
          // No payment info at all — default to single pending boleto for the full amount
          return [{ tPag: '15', vPag: valor_liquido, xPag: null, dVenc: null }]
        })()

  return {
    nf: {
      numero,
      serie: getTag('serie'),
      finalidade,
      data_emissao: getTag('dhEmi') || getTag('dEmi'),
      cnpj_emitente,
      nome_emitente,
      nome_fantasia_emitente,
      ie_emitente,
      fone_emitente,
      endereco_emitente,
      cnpj_destinatario: cnpjDest || null,
      valor_total: vNFParsed,
      chave_acesso,
      pagamentos,
      valor_liquido,
      vST,
      vFrete,
      vDesc,
      vOutro,
      vSeg,
    },
    itens: Array.from(doc.getElementsByTagName('det')).map((det) => {
      const rawGtin = det.getElementsByTagName('cEAN')[0]?.textContent?.trim() ?? null
      const gtin =
        rawGtin && rawGtin !== 'SEM GTIN' && rawGtin !== '0' && rawGtin !== '' ? rawGtin : null
      const cProd = det.getElementsByTagName('cProd')[0]?.textContent?.trim() || null

      // CEST: present only for ICMS-ST products (Convênio ICMS 92/2015)
      const cest = det.getElementsByTagName('CEST')[0]?.textContent?.trim() || null

      // IPI: look for vIPI inside <IPI><IPITrib> (taxed) or <IPI><IPINT> (exempt=0)
      const valor_ipi = Number.parseFloat(
        det.getElementsByTagName('vIPI')[0]?.textContent?.trim() || '0',
      )

      // ICMS-ST: vICMSST appears in ICMS10/20/30/70 groups; vICMSSTRet in ICMS60
      // getElementsByTagName searches all descendants so this covers all groups.
      const vICMSST = Number.parseFloat(
        det.getElementsByTagName('vICMSST')[0]?.textContent?.trim() || '0',
      )
      const vICMSSTRet = Number.parseFloat(
        det.getElementsByTagName('vICMSSTRet')[0]?.textContent?.trim() || '0',
      )
      // Sum both: a single item can have highlighted ST (vICMSST) AND retained ST (vICMSSTRet)
      const valor_icms_st = vICMSST + vICMSSTRet

      return {
        descricao: det.getElementsByTagName('xProd')[0]?.textContent?.trim() ?? '',
        ncm: det.getElementsByTagName('NCM')[0]?.textContent?.trim() || null,
        cfop: det.getElementsByTagName('CFOP')[0]?.textContent?.trim() || null,
        cest,
        unidade: det.getElementsByTagName('uCom')[0]?.textContent?.trim() ?? 'UN',
        quantidade: Number.parseFloat(
          det.getElementsByTagName('qCom')[0]?.textContent?.trim() || '0',
        ),
        valor_unitario: Number.parseFloat(
          det.getElementsByTagName('vUnCom')[0]?.textContent?.trim() || '0',
        ),
        valor_total: Number.parseFloat(
          det.getElementsByTagName('vProd')[0]?.textContent?.trim() || '0',
        ),
        valor_ipi,
        valor_icms_st,
        gtin,
        cProd,
      }
    }),
  }
}
