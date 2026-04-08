import type { useCreateContaPagar, useRegisterFinanceiroMovement } from '@/hooks/use-supabase'
import { supabase } from '@/lib/supabase'
import { todayISO } from '@/lib/utils'
import type {
  ItemDistribution,
  ItemMatchState,
  NFItemParsed,
  NFePagamento,
  NFeParsed,
} from '../../notas-fiscais-types'
import {
  PAGAMENTO_IMEDIATO_TPAG,
  cleanProductName,
  formatCNPJ,
  generateMaterialCode,
  getOrCreateImportedCategory,
  getPagLabel,
  item_key,
  normalizeUnidade,
  saveMemoryCloud,
  toTitleCase,
  translateCFOP,
} from '../../notas-fiscais-utils'
import { calculateRateios } from './nfe-rateio'

export type BaseNFParams = {
  parsed: { nf: NFeParsed; itens: NFItemParsed[] }
  matchedFornecedorId: string | null
  rawXml: string | null
}

type ParsedNF = { nf: NFeParsed; itens: NFItemParsed[] }
type NfInsertRef = { id: string }

export async function uploadXmlAndCreateNFe(
  params: BaseNFParams,
  file: File,
  hasAnyConfirmedItems: boolean,
) {
  let xml_url: string | null = null
  try {
    const fileName = `${params.parsed.nf.chave_acesso}.xml`
    const { error: storageError } = await supabase.storage
      .from('nf-xml')
      .upload(fileName, file, { contentType: 'application/xml', upsert: true })
    if (!storageError) {
      xml_url = supabase.storage.from('nf-xml').getPublicUrl(fileName).data.publicUrl
    }
  } catch (error) {
    console.error('[NFe] XML upload failed, continuing without URL:', error)
  }

  const { data: insertedNF, error: nfError } = await supabase
    .from('notas_fiscais')
    .insert({
      numero: params.parsed.nf.numero,
      serie: params.parsed.nf.serie,
      finalidade: params.parsed.nf.finalidade ?? null,
      chave_acesso: params.parsed.nf.chave_acesso,
      cnpj_emitente: params.parsed.nf.cnpj_emitente,
      cnpj_destinatario: params.parsed.nf.cnpj_destinatario,
      valor_total: params.parsed.nf.valor_total,
      data_emissao: params.parsed.nf.data_emissao,
      fornecedor_id: params.matchedFornecedorId ?? null,
      nome_emitente: params.parsed.nf.nome_emitente || null,
      status: hasAnyConfirmedItems ? 'PROCESSADA' : 'PENDENTE',
      xml_url,
      xml_original: params.rawXml ?? null,
    })
    .select('id, status')
    .single()

  if (nfError) {
    if (nfError.code === '23505') {
      const { data: existingNF } = await supabase
        .from('notas_fiscais')
        .select('id, status')
        .eq('chave_acesso', params.parsed.nf.chave_acesso)
        .single()

      if (existingNF?.status === 'PENDENTE') {
        await supabase.from('itens_nf').delete().eq('nf_id', existingNF.id)
        await supabase
          .from('notas_fiscais')
          .update({
            numero: params.parsed.nf.numero,
            serie: params.parsed.nf.serie,
            finalidade: params.parsed.nf.finalidade ?? null,
            valor_total: params.parsed.nf.valor_total,
            data_emissao: params.parsed.nf.data_emissao,
            fornecedor_id: params.matchedFornecedorId ?? null,
            nome_emitente: params.parsed.nf.nome_emitente || null,
            cnpj_emitente: params.parsed.nf.cnpj_emitente,
            cnpj_destinatario: params.parsed.nf.cnpj_destinatario,
            xml_url,
            xml_original: params.rawXml ?? null,
            status: hasAnyConfirmedItems ? 'PROCESSADA' : 'PENDENTE',
          })
          .eq('id', existingNF.id)
        return existingNF
      }
      throw new Error('Esta NF-e já foi importada.')
    }
    throw nfError
  }
  return insertedNF
}

export async function processMissingMaterials(
  skippedItems: ItemMatchState[],
  reviewEditedNames: Map<number, string>,
  nfData: NfInsertRef,
  parsed: ParsedNF,
  matchedFornecedorId: string | null,
) {
  const newMaterialMap = new Map<number, string>()
  const newMaterialNomeMap = new Map<number, string>()

  if (skippedItems.length === 0) return { newMaterialMap, newMaterialNomeMap }

  const importedCategoryId = await getOrCreateImportedCategory().catch(async () => {
    const { data } = await supabase.from('categorias').select('id').limit(1).maybeSingle()
    return data?.id ?? null
  })

  if (!importedCategoryId) return { newMaterialMap, newMaterialNomeMap }

  const cleanedNames = await Promise.all(
    skippedItems.map((state) =>
      reviewEditedNames.has(state.index)
        ? Promise.resolve(reviewEditedNames.get(state.index) as string)
        : cleanProductName(state.item.descricao),
    ),
  )

  for (let i = 0; i < skippedItems.length; i++) {
    const state = skippedItems[i]
    const item = state.item
    const rawName = (reviewEditedNames.get(state.index) ?? cleanedNames[i])
      .replace(/\s+/g, ' ')
      .trim()
    const cleanedName = rawName || toTitleCase(state.item.descricao) || 'Material s/ nome'

    const insertPayload = {
      nome: cleanedName,
      codigo: generateMaterialCode(item.cProd, item.descricao),
      categoria_id: importedCategoryId,
      unidade: normalizeUnidade(item.unidade),
      codigo_barras: item.gtin ?? null,
      cest_padrao: item.cest ?? null,
      descricao: `Cadastrado via NF-e nº ${parsed.nf.numero} — ${new Date().toLocaleDateString('pt-BR')}`,
      preco_unitario: item.valor_unitario,
      estoque_minimo: 0,
      ativo: true,
    }

    const { data: newMat, error: matError } = await supabase
      .from('materiais')
      .insert(insertPayload)
      .select('id')
      .single()

    let resolvedMaterialId: string | null = null
    if (!matError && newMat?.id) resolvedMaterialId = newMat.id
    else if (matError?.code === '23505') {
      const { data: existingMat } = await supabase
        .from('materiais')
        .select('id')
        .eq('codigo', insertPayload.codigo)
        .maybeSingle()
      if (existingMat?.id) resolvedMaterialId = existingMat.id
    }

    if (!resolvedMaterialId) continue

    newMaterialMap.set(state.index, resolvedMaterialId)
    newMaterialNomeMap.set(state.index, cleanedName)
    saveMemoryCloud(item_key(item), { id_interno: resolvedMaterialId, nome_interno: cleanedName })

    try {
      if (item.gtin) {
        await supabase.from('produto_fornecedor').upsert(
          {
            material_id: resolvedMaterialId,
            fornecedor_id: matchedFornecedorId,
            cprod: item.cProd,
            gtin: item.gtin,
            unidade_compra: item.unidade,
          },
          { onConflict: 'gtin', ignoreDuplicates: false },
        )
      } else if (matchedFornecedorId && item.cProd) {
        await supabase.from('produto_fornecedor').upsert(
          {
            material_id: resolvedMaterialId,
            fornecedor_id: matchedFornecedorId,
            cprod: item.cProd,
            gtin: null,
            unidade_compra: item.unidade,
          },
          { onConflict: 'material_id,fornecedor_id', ignoreDuplicates: false },
        )
      }
    } catch (error) {
      console.error('[NFe] Failed to link supplier product codes:', error)
    }
  }

  return { newMaterialMap, newMaterialNomeMap }
}

export async function registerNFeItems(
  nfId: string,
  parsed: ParsedNF,
  matchStates: ItemMatchState[],
  newMaterialMap: Map<number, string>,
  matchedFornecedorId: string | null,
) {
  if (parsed.itens.length === 0) return

  const rateioInputs = parsed.itens.map((item) => ({ valorTotalItem: item.valor_total }))
  const rateios = calculateRateios(rateioInputs, parsed.nf.vFrete, parsed.nf.vDesc)

  const itemsToInsert = parsed.itens.map((item, index: number) => {
    const confirmedId = matchStates.find((s) => s.index === index)?.confirmedMaterialId ?? null
    const autoRegisteredId = newMaterialMap.get(index) ?? null

    return {
      nf_id: nfId,
      descricao: item.descricao,
      ncm: item.ncm,
      cfop: translateCFOP(item.cfop),
      unidade: item.unidade,
      quantidade: item.quantidade,
      valor_unitario: item.valor_unitario,
      valor_total: item.valor_total,
      rateio_frete: rateios[index]?.frete ?? 0,
      rateio_desconto: rateios[index]?.desconto ?? 0,
      valor_ipi: item.valor_ipi,
      valor_icms_st: item.valor_icms_st,
      material_id: confirmedId ?? autoRegisteredId ?? null,
      cprod: item.cProd ?? null,
      gtin: item.gtin ?? null,
    }
  })

  await supabase.from('itens_nf').insert(itemsToInsert)

  if (matchedFornecedorId) {
    const confirmedStates = matchStates.filter(
      (s) => s.matchStatus === 'confirmed' && s.confirmedMaterialId,
    )
    const gtinLoads = confirmedStates
      .filter((s) => parsed.itens[s.index]?.gtin)
      .map((s) => ({
        material_id: s.confirmedMaterialId as string,
        fornecedor_id: matchedFornecedorId,
        cprod: parsed.itens[s.index].cProd,
        gtin: parsed.itens[s.index].gtin,
        unidade_compra: parsed.itens[s.index].unidade,
      }))
    const cprodLoads = confirmedStates
      .filter((s) => parsed.itens[s.index]?.cProd && !parsed.itens[s.index]?.gtin)
      .map((s) => ({
        material_id: s.confirmedMaterialId as string,
        fornecedor_id: matchedFornecedorId,
        cprod: parsed.itens[s.index].cProd,
        gtin: null,
        unidade_compra: parsed.itens[s.index].unidade,
      }))
    try {
      if (gtinLoads.length)
        await supabase.from('produto_fornecedor').upsert(gtinLoads, { onConflict: 'gtin' })
      if (cprodLoads.length)
        await supabase
          .from('produto_fornecedor')
          .upsert(cprodLoads, { onConflict: 'material_id,fornecedor_id' })
    } catch (error) {
      console.error('[NFe] Failed to register item-supplier links:', error)
    }
  }
}

export async function dispatchDistributions(
  distributions: ItemDistribution[],
  nfData: NfInsertRef,
  parsed: ParsedNF,
  matchedFornecedorId: string | null,
) {
  const rateios = calculateRateios(
    parsed.itens.map((item) => ({ valorTotalItem: item.valor_total })),
    parsed.nf.vFrete,
    parsed.nf.vDesc,
  )

  const itens: Array<{
    material_id: string
    almoxarifado_id: string
    quantidade: number
    preco_unitario: number
    unidade: string
  }> = []

  for (const dist of distributions) {
    if (!dist.materialId) continue
    const item = parsed.itens[dist.itemIndex]
    if (!item) continue
    const itemFrete = rateios[dist.itemIndex]?.frete ?? 0
    const itemDesconto = rateios[dist.itemIndex]?.desconto ?? 0
    const custoUnitarioReal =
      item.quantidade > 0
        ? (item.valor_total + itemFrete - itemDesconto + item.valor_ipi + item.valor_icms_st) /
          item.quantidade
        : dist.valorUnitario
    for (const alloc of dist.allocations) {
      if (!alloc.almoxarifadoId || alloc.quantidade <= 0) continue
      itens.push({
        material_id: dist.materialId,
        almoxarifado_id: alloc.almoxarifadoId,
        quantidade: alloc.quantidade,
        preco_unitario: custoUnitarioReal,
        unidade: dist.unidade,
      })
    }
  }

  if (itens.length === 0) return { movimentacoesCriadas: 0, movimentacoesFalhadas: 0 }

  const { data: count, error } = await supabase.rpc('vincular_nfe_estoque_atomico', {
    p_nf_id: nfData.id,
    p_fornecedor_id: matchedFornecedorId,
    p_numero_nf: parsed.nf.numero,
    p_itens: itens,
  } as never)

  if (error) return { movimentacoesCriadas: 0, movimentacoesFalhadas: itens.length }
  return {
    movimentacoesCriadas: (count as number | null) ?? itens.length,
    movimentacoesFalhadas: 0,
  }
}

export async function processFinanceiroRecords(
  createContaPagar: ReturnType<typeof useCreateContaPagar>,
  immediateDebitTotal: number,
  selectedContaId: string | null,
  registerFinanceiroMovement: ReturnType<typeof useRegisterFinanceiroMovement>,
  parsed: ParsedNF,
  parsedPagamentos: NFePagamento[],
  matchedFornecedorId: string | null,
  nfId: string,
) {
  let failedDebit = false

  if (immediateDebitTotal > 0 && selectedContaId) {
    try {
      await registerFinanceiroMovement.mutateAsync({
        conta_id: selectedContaId,
        tipo: 'SAIDA',
        subconta: 'CAIXA',
        motivo: `NF-e nº ${parsed.nf.numero} — ${formatCNPJ(parsed.nf.cnpj_emitente)}`,
        valor: immediateDebitTotal,
        data: todayISO(),
        delta_caixa: -immediateDebitTotal,
        delta_aplicado: 0,
      })
    } catch {
      failedDebit = true
    }
  }

  const cfopCounts: Record<string, number> = {}
  for (const item of parsed.itens) {
    const cfop = item.cfop ?? ''
    cfopCounts[cfop] = (cfopCounts[cfop] ?? 0) + 1
  }
  const dominantCFOP = Object.entries(cfopCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null
  const { data: categoriaData } = dominantCFOP
    ? await supabase.rpc('categorizar_por_cfop', { p_cfop: dominantCFOP })
    : { data: 'Fornecedores' }
  const categoria = (categoriaData as string | null) ?? 'Fornecedores'

  if (categoria !== '__DEVOLUCAO__' && parsedPagamentos.length > 0) {
    const pendingPags = parsedPagamentos.filter((p) => !PAGAMENTO_IMEDIATO_TPAG.has(p.tPag))
    const immediatePags = parsedPagamentos.filter((p) => PAGAMENTO_IMEDIATO_TPAG.has(p.tPag))

    if (pendingPags.length > 0) {
      const totalPending = pendingPags.reduce((sum, p) => sum + p.vPag, 0)
      const parcelas = pendingPags.map((p, index) => {
        let vencimento = p.dVenc && !Number.isNaN(new Date(p.dVenc).getTime()) ? p.dVenc : ''
        if (!vencimento) {
          const d = new Date()
          d.setDate(d.getDate() + 30 * (index + 1))
          vencimento = d.toLocaleDateString('en-CA')
        }
        return {
          numero_parcela: index + 1,
          total_parcelas: pendingPags.length,
          valor: p.vPag,
          vencimento,
          status: 'PENDENTE' as const,
        }
      })

      await createContaPagar.mutateAsync({
        descricao: `NF ${parsed.nf.numero} — ${parsed.nf.nome_emitente}`,
        categoria,
        obra_id: null,
        observacoes: `Chave NF-e: ${parsed.nf.chave_acesso}\nForma: ${pendingPags.map((p) => getPagLabel(p.tPag, p.xPag)).join(', ')}`,
        valor_total: totalPending,
        nf_id: nfId,
        fornecedor_id: matchedFornecedorId,
        parcelas,
      })
    }

    if (immediatePags.length > 0) {
      const totalImediato = immediatePags.reduce((sum, p) => sum + p.vPag, 0)
      const rawDVenc = immediatePags[0]?.dVenc ? new Date(immediatePags[0].dVenc) : null
      const pagoEm =
        rawDVenc && !Number.isNaN(rawDVenc.getTime())
          ? rawDVenc.toISOString().slice(0, 10)
          : todayISO()

      await createContaPagar.mutateAsync({
        descricao: `NF ${parsed.nf.numero} — (pago)`,
        categoria,
        obra_id: null,
        observacoes: `Pago via: ${immediatePags.map((p) => getPagLabel(p.tPag, p.xPag)).join(', ')}`,
        valor_total: totalImediato,
        nf_id: nfId,
        fornecedor_id: matchedFornecedorId,
        parcelas: [
          {
            numero_parcela: 1,
            total_parcelas: 1,
            valor: totalImediato,
            vencimento: pagoEm,
            status: 'PAGO',
          },
        ],
      })
    }
  }

  return { failedDebit }
}
