import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { NOW, TODAY } from './constants.mjs'
import { makeTag, queryValue } from './helpers.mjs'

export async function insertObra(client, suffix, overrides = {}) {
  const id = overrides.id ?? randomUUID()
  const nome = overrides.nome ?? suffix
  const endereco = overrides.endereco ?? `Endereco ${suffix}`
  const status = overrides.status ?? 'ATIVA'
  const now = NOW()
  await client.query(
    `
      insert into obras (
        id, nome, endereco, status, orcamento, valor_terreno, valor_burocracia,
        valor_construcao, observacoes, created_at, updated_at
      )
      values ($1, $2, $3, $4, 0, 0, 0, 0, null, $5, $5)
    `,
    [id, nome, endereco, status, now],
  )
  return { id, nome }
}

export async function insertAlmoxarifado(client, obraId, suffix) {
  const id = randomUUID()
  const now = NOW()
  await client.query(
    `
      insert into almoxarifados (id, nome, obra_id, created_at, updated_at)
      values ($1, $2, $3, $4, $4)
    `,
    [id, suffix, obraId, now],
  )
  return { id }
}

export async function insertCategoria(client, suffix) {
  const id = randomUUID()
  const now = NOW()
  await client.query(
    `
      insert into categorias (id, nome, unidade, created_at, updated_at)
      values ($1, $2, 'UN', $3, $3)
    `,
    [id, suffix, now],
  )
  return { id }
}

export async function insertMaterial(client, categoriaId, suffix) {
  const id = randomUUID()
  const now = NOW()
  await client.query(
    `
      insert into materiais (
        id, nome, codigo, categoria_id, estoque_minimo, preco_unitario,
        ativo, created_at, updated_at
      )
      values ($1, $2, $3, $4, 0, 10, true, $5, $5)
    `,
    [id, suffix, `${suffix}-codigo`, categoriaId, now],
  )
  return { id }
}

export async function insertFornecedor(client, suffix) {
  const id = randomUUID()
  const now = NOW()
  await client.query(
    `
      insert into fornecedores (id, nome, ativo, created_at, updated_at)
      values ($1, $2, true, $3, $3)
    `,
    [id, suffix, now],
  )
  return { id }
}

export async function insertUsuario(client, suffix, overrides = {}) {
  const id = overrides.id ?? randomUUID()
  const now = NOW()
  await client.query(
    `
      insert into usuarios (id, nome, email, senha, role, ativo, created_at, updated_at)
      values ($1, $2, $3, $4, $5, $6, $7, $7)
    `,
    [
      id,
      overrides.nome ?? suffix,
      overrides.email ?? `${suffix}@example.com`,
      overrides.senha ?? 'harness-secret',
      overrides.role ?? 'VISUALIZADOR',
      overrides.ativo ?? true,
      now,
    ],
  )
  return { id }
}

export async function insertUsuarioObra(client, usuarioId, obraId) {
  await client.query(
    'insert into usuario_obras (usuario_id, obra_id, created_at) values ($1, $2, $3)',
    [usuarioId, obraId, NOW()],
  )
}

export async function insertFinanceiroConta(client, suffix, overrides = {}) {
  const { rows } = await client.query(
    `
      insert into financeiro_contas (banco, agencia, numero_conta, valor_caixa, valor_aplicado)
      values ($1, '0001', $2, $3, $4)
      returning id
    `,
    [suffix, `${suffix}-conta`, overrides.valorCaixa ?? 1000, overrides.valorAplicado ?? 0],
  )
  return { id: rows[0].id }
}

export async function insertNotaFiscal(client, fornecedorId, suffix, valorTotal = 100) {
  const id = randomUUID()
  const now = NOW()
  await client.query(
    `
      insert into notas_fiscais (
        id, chave_acesso, cnpj_emitente, cnpj_destinatario, numero, serie,
        data_emissao, valor_total, status, fornecedor_id, nome_emitente,
        xml_original, created_at, updated_at
      )
      values ($1, $2, '11111111000191', '22222222000191', $3, '1', $4, $5, 'PENDENTE', $6, $7, '<xml />', $4, $4)
    `,
    [id, `${suffix}-chave`, suffix, now, valorTotal, fornecedorId, suffix],
  )
  return { id, numero: suffix }
}

export async function insertMovimentacao(client, body) {
  await client.query(
    `
      insert into movimentacoes (
        id, tipo, material_id, quantidade, preco_unitario, almoxarifado_id,
        fornecedor_id, nf_id, usuario_id, observacao, unidade, forma_pagamento, created_at
      )
      values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
    `,
    [
      body.id ?? randomUUID(),
      body.tipo,
      body.materialId,
      body.quantidade,
      body.precoUnitario,
      body.almoxarifadoId,
      body.fornecedorId ?? null,
      body.nfId ?? null,
      body.usuarioId,
      body.observacao ?? null,
      body.unidade ?? 'UN',
      body.formaPagamento ?? null,
      NOW(),
    ],
  )
}

export async function insertEstoque(client, materialId, almoxarifadoId, quantidade) {
  await client.query(
    `
      insert into estoques (id, material_id, almoxarifado_id, quantidade, created_at, updated_at)
      values ($1, $2, $3, $4, $5, $5)
    `,
    [randomUUID(), materialId, almoxarifadoId, quantidade, NOW()],
  )
}

export async function insertFinanceiroMovimento(
  client,
  contaId,
  motivo,
  valor,
  tipo = 'SAIDA',
  subconta = 'CAIXA',
) {
  await client.query(
    `
      insert into financeiro_movimentacoes (
        conta_id, tipo, subconta, motivo, valor, data, transferencia_destino_id
      )
      values ($1, $2, $3, $4, $5, $6, null)
    `,
    [contaId, tipo, subconta, motivo, valor, TODAY()],
  )
}

export async function insertContaPagar(client, nfId, fornecedorId, obraId, descricao, valorTotal) {
  const { rows } = await client.query(
    `
      insert into contas_pagar (descricao, categoria, obra_id, observacoes, valor_total, nf_id, fornecedor_id)
      values ($1, 'Materiais', $2, null, $3, $4, $5)
      returning id
    `,
    [descricao, obraId, valorTotal, nfId, fornecedorId],
  )
  return { id: rows[0].id }
}

export async function insertManutencaoAtiva(client, obraId, statusAnterior = 'ATIVA') {
  const { rows } = await client.query(
    `
      insert into obra_manutencao (obra_id, status, status_anterior)
      values ($1, 'ativo', $2)
      returning id
    `,
    [obraId, statusAnterior],
  )
  return { id: rows[0].id }
}

export async function deleteById(client, table, id) {
  await client.query(`delete from ${table} where id = $1`, [id])
}

export async function countRows(client, table, whereSql, params) {
  return Number(
    await queryValue(client, `select count(*)::int from ${table} where ${whereSql}`, params),
  )
}

export async function getUserState(client, userId) {
  const { rows } = await client.query(
    `
      select nome, role, ativo
      from usuarios
      where id = $1
    `,
    [userId],
  )
  return rows[0] ?? null
}

export async function getUserObras(client, userId) {
  const { rows } = await client.query(
    'select obra_id from usuario_obras where usuario_id = $1 order by obra_id',
    [userId],
  )
  return rows.map((row) => row.obra_id)
}

export async function createUsuarioUpdateScenario(client, runId, label) {
  const user = await insertUsuario(client, makeTag(runId, `${label}-user`), {
    nome: 'Original',
    role: 'VISUALIZADOR',
  })
  const obraA = await insertObra(client, makeTag(runId, `${label}-obra-a`))
  const obraB = await insertObra(client, makeTag(runId, `${label}-obra-b`))
  await insertUsuarioObra(client, user.id, obraA.id)
  return { userId: user.id, obraAId: obraA.id, obraBId: obraB.id }
}

export async function cleanupUsuarioUpdateScenario(client, ctx) {
  await client.query('delete from usuario_obras where usuario_id = $1', [ctx.userId])
  await deleteById(client, 'usuarios', ctx.userId)
  await deleteById(client, 'obras', ctx.obraAId)
  await deleteById(client, 'obras', ctx.obraBId)
}

export async function createEntradaFinanceiroScenario(client, runId, label) {
  const obra = await insertObra(client, makeTag(runId, `${label}-obra`))
  const almox = await insertAlmoxarifado(client, obra.id, makeTag(runId, `${label}-almox`))
  const categoria = await insertCategoria(client, makeTag(runId, `${label}-cat`))
  const material = await insertMaterial(client, categoria.id, makeTag(runId, `${label}-mat`))
  const fornecedor = await insertFornecedor(client, makeTag(runId, `${label}-forn`))
  const conta = await insertFinanceiroConta(client, makeTag(runId, `${label}-conta`))
  const authUser = await insertUsuario(client, makeTag(runId, `${label}-auth`))

  return {
    obraId: obra.id,
    almoxId: almox.id,
    categoriaId: categoria.id,
    materialId: material.id,
    fornecedorId: fornecedor.id,
    contaId: conta.id,
    authUserId: authUser.id,
    motivo: makeTag(runId, `${label}-motivo`),
    observacao: makeTag(runId, `${label}-obs`),
  }
}

export async function cleanupEntradaFinanceiroScenario(client, ctx) {
  await client.query('delete from financeiro_movimentacoes where motivo = $1', [ctx.motivo])
  await client.query('delete from movimentacoes where observacao = $1', [ctx.observacao])
  await client.query('delete from estoques where material_id = $1 and almoxarifado_id = $2', [
    ctx.materialId,
    ctx.almoxId,
  ])
  await client.query('delete from financeiro_contas where id = $1', [ctx.contaId])
  await deleteById(client, 'usuarios', ctx.authUserId)
  await deleteById(client, 'materiais', ctx.materialId)
  await deleteById(client, 'categorias', ctx.categoriaId)
  await deleteById(client, 'fornecedores', ctx.fornecedorId)
  await deleteById(client, 'almoxarifados', ctx.almoxId)
  await deleteById(client, 'obras', ctx.obraId)
}

export async function assertEntradaFinanceiroRolledBack(client, ctx) {
  const stockCount = await countRows(
    client,
    'estoques',
    'material_id = $1 and almoxarifado_id = $2',
    [ctx.materialId, ctx.almoxId],
  )
  const movCount = await countRows(client, 'movimentacoes', 'observacao = $1', [ctx.observacao])
  const finCount = await countRows(client, 'financeiro_movimentacoes', 'motivo = $1', [ctx.motivo])
  const saldo = Number(
    await queryValue(client, 'select valor_caixa from financeiro_contas where id = $1', [
      ctx.contaId,
    ]),
  )

  assert.equal(stockCount, 0)
  assert.equal(movCount, 0)
  assert.equal(finCount, 0)
  assert.equal(saldo, 1000)
}

export async function createNotaFiscalDeleteScenario(client, runId, label) {
  const obra = await insertObra(client, makeTag(runId, `${label}-obra`))
  const almox = await insertAlmoxarifado(client, obra.id, makeTag(runId, `${label}-almox`))
  const categoria = await insertCategoria(client, makeTag(runId, `${label}-cat`))
  const material = await insertMaterial(client, categoria.id, makeTag(runId, `${label}-mat`))
  const fornecedor = await insertFornecedor(client, makeTag(runId, `${label}-forn`))
  const user = await insertUsuario(client, makeTag(runId, `${label}-user`))
  const conta = await insertFinanceiroConta(client, makeTag(runId, `${label}-conta`), {
    valorCaixa: 500,
  })
  const nota = await insertNotaFiscal(client, fornecedor.id, makeTag(runId, label), 100)
  const financeMotivo = `NF-e nº ${nota.numero} — Compra inicial`

  await insertEstoque(client, material.id, almox.id, 5)
  await insertMovimentacao(client, {
    tipo: 'ENTRADA',
    materialId: material.id,
    quantidade: 5,
    precoUnitario: 20,
    almoxarifadoId: almox.id,
    fornecedorId: fornecedor.id,
    nfId: nota.id,
    usuarioId: user.id,
    observacao: makeTag(runId, `${label}-mov-obs`),
  })
  await insertFinanceiroMovimento(client, conta.id, financeMotivo, 100)
  await insertContaPagar(
    client,
    nota.id,
    fornecedor.id,
    obra.id,
    makeTag(runId, `${label}-conta`),
    100,
  )

  return {
    obraId: obra.id,
    almoxId: almox.id,
    categoriaId: categoria.id,
    materialId: material.id,
    fornecedorId: fornecedor.id,
    userId: user.id,
    contaId: conta.id,
    notaId: nota.id,
    financeMotivo,
  }
}

export async function cleanupNotaFiscalDeleteScenario(client, ctx) {
  await client.query('delete from contas_pagar where nf_id = $1', [ctx.notaId])
  await client.query('delete from financeiro_movimentacoes where motivo = $1', [ctx.financeMotivo])
  await client.query('delete from movimentacoes where nf_id = $1', [ctx.notaId])
  await client.query('delete from estoques where material_id = $1 and almoxarifado_id = $2', [
    ctx.materialId,
    ctx.almoxId,
  ])
  await deleteById(client, 'notas_fiscais', ctx.notaId)
  await client.query('delete from financeiro_contas where id = $1', [ctx.contaId])
  await deleteById(client, 'usuarios', ctx.userId)
  await deleteById(client, 'materiais', ctx.materialId)
  await deleteById(client, 'categorias', ctx.categoriaId)
  await deleteById(client, 'fornecedores', ctx.fornecedorId)
  await deleteById(client, 'almoxarifados', ctx.almoxId)
  await deleteById(client, 'obras', ctx.obraId)
}

export async function getNotaFiscalRollbackState(client, ctx) {
  const notaCount = await countRows(client, 'notas_fiscais', 'id = $1', [ctx.notaId])
  const estoque = Number(
    await queryValue(
      client,
      'select quantidade from estoques where material_id = $1 and almoxarifado_id = $2',
      [ctx.materialId, ctx.almoxId],
    ),
  )
  const movCount = await countRows(client, 'movimentacoes', 'nf_id = $1', [ctx.notaId])
  const finCount = await countRows(client, 'financeiro_movimentacoes', 'motivo = $1', [
    ctx.financeMotivo,
  ])
  const contaPagarCount = await countRows(client, 'contas_pagar', 'nf_id = $1', [ctx.notaId])
  const saldo = Number(
    await queryValue(client, 'select valor_caixa from financeiro_contas where id = $1', [
      ctx.contaId,
    ]),
  )

  return { notaCount, estoque, movCount, finCount, contaPagarCount, saldo }
}
