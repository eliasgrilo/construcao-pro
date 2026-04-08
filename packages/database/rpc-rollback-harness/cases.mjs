import assert from 'node:assert/strict'
import {
  createDeleteNotaFiscalRollbackCase,
  createEntradaFinanceiroRollbackCase,
  createUpdateUsuarioWithObrasRollbackCase,
} from './case-builders.mjs'
import { TODAY } from './constants.mjs'
import {
  countRows,
  deleteById,
  insertFinanceiroConta,
  insertManutencaoAtiva,
  insertObra,
} from './fixtures.mjs'
import { makeTag, queryValue } from './helpers.mjs'

export const cases = [
  {
    name: 'create_obra_with_almoxarifado rolls back the obra when almox insert fails',
    failpoint: { table: 'almoxarifados', op: 'INSERT' },
    async setup(client, runId) {
      return { name: makeTag(runId, 'obra-create-fail') }
    },
    async execute(client, ctx) {
      await client.query(
        `
          select (create_obra_with_almoxarifado(
            $1, $2, 'ATIVA', 0, 0, 0, 0, null, null, null, null, null, null
          )).id
        `,
        [ctx.name, `${ctx.name} endereco`],
      )
    },
    async assertRollback(client, ctx) {
      const obraCount = await countRows(client, 'obras', 'nome = $1', [ctx.name])
      assert.equal(obraCount, 0)
    },
    async cleanup() {},
  },
  {
    name: 'start_obra_manutencao rolls back previous close when new manutencao insert fails',
    failpoint: { table: 'obra_manutencao', op: 'INSERT' },
    async setup(client, runId) {
      const obra = await insertObra(client, makeTag(runId, 'manut-insert'), { status: 'ATIVA' })
      const previous = await insertManutencaoAtiva(client, obra.id, 'ATIVA')
      return { obraId: obra.id, previousId: previous.id }
    },
    async execute(client, ctx) {
      await client.query('select start_obra_manutencao($1, $2, $3::text[])', [
        ctx.obraId,
        'ATIVA',
        [],
      ])
    },
    async assertRollback(client, ctx) {
      const obraStatus = await queryValue(client, 'select status from obras where id = $1', [
        ctx.obraId,
      ])
      const previousStatus = await queryValue(
        client,
        'select status from obra_manutencao where id = $1::uuid',
        [ctx.previousId],
      )
      const maintenanceCount = await countRows(client, 'obra_manutencao', 'obra_id = $1', [
        ctx.obraId,
      ])
      assert.equal(obraStatus, 'ATIVA')
      assert.equal(previousStatus, 'ativo')
      assert.equal(maintenanceCount, 1)
    },
    async cleanup(client, ctx) {
      await client.query('delete from obra_manutencao where obra_id = $1', [ctx.obraId])
      await deleteById(client, 'obras', ctx.obraId)
    },
  },
  {
    name: 'start_obra_manutencao rolls back new session when problem insert fails',
    failpoint: { table: 'obra_manutencao_item', op: 'INSERT' },
    async setup(client, runId) {
      const obra = await insertObra(client, makeTag(runId, 'manut-item'), { status: 'ATIVA' })
      const previous = await insertManutencaoAtiva(client, obra.id, 'ATIVA')
      return { obraId: obra.id, previousId: previous.id }
    },
    async execute(client, ctx) {
      await client.query('select start_obra_manutencao($1, $2, $3::text[])', [
        ctx.obraId,
        'ATIVA',
        ['Problema injetado'],
      ])
    },
    async assertRollback(client, ctx) {
      const obraStatus = await queryValue(client, 'select status from obras where id = $1', [
        ctx.obraId,
      ])
      const previousStatus = await queryValue(
        client,
        'select status from obra_manutencao where id = $1::uuid',
        [ctx.previousId],
      )
      const itemCount = await countRows(client, 'obra_manutencao_item', 'obra_id = $1', [
        ctx.obraId,
      ])
      const maintenanceCount = await countRows(client, 'obra_manutencao', 'obra_id = $1', [
        ctx.obraId,
      ])
      assert.equal(obraStatus, 'ATIVA')
      assert.equal(previousStatus, 'ativo')
      assert.equal(itemCount, 0)
      assert.equal(maintenanceCount, 1)
    },
    async cleanup(client, ctx) {
      await client.query('delete from obra_manutencao_item where obra_id = $1', [ctx.obraId])
      await client.query('delete from obra_manutencao where obra_id = $1', [ctx.obraId])
      await deleteById(client, 'obras', ctx.obraId)
    },
  },
  {
    name: 'start_obra_manutencao rolls back inserted rows when obra status update fails',
    failpoint: { table: 'obras', op: 'UPDATE', after: 1 },
    async setup(client, runId) {
      const obra = await insertObra(client, makeTag(runId, 'manut-obra-update'), {
        status: 'PAUSADA',
      })
      return { obraId: obra.id }
    },
    async execute(client, ctx) {
      await client.query('select start_obra_manutencao($1, $2, $3::text[])', [
        ctx.obraId,
        'PAUSADA',
        ['Problema 1'],
      ])
    },
    async assertRollback(client, ctx) {
      const obraStatus = await queryValue(client, 'select status from obras where id = $1', [
        ctx.obraId,
      ])
      const maintenanceCount = await countRows(client, 'obra_manutencao', 'obra_id = $1', [
        ctx.obraId,
      ])
      const itemCount = await countRows(client, 'obra_manutencao_item', 'obra_id = $1', [
        ctx.obraId,
      ])
      assert.equal(obraStatus, 'PAUSADA')
      assert.equal(maintenanceCount, 0)
      assert.equal(itemCount, 0)
    },
    async cleanup(client, ctx) {
      await client.query('delete from obra_manutencao_item where obra_id = $1', [ctx.obraId])
      await client.query('delete from obra_manutencao where obra_id = $1', [ctx.obraId])
      await deleteById(client, 'obras', ctx.obraId)
    },
  },
  createUpdateUsuarioWithObrasRollbackCase({
    name: 'update_usuario_with_obras rolls back user update when assignment delete fails',
    failpoint: { table: 'usuario_obras', op: 'DELETE' },
    label: 'user-delete',
  }),
  createUpdateUsuarioWithObrasRollbackCase({
    name: 'update_usuario_with_obras rolls back delete when replacement insert fails',
    failpoint: { table: 'usuario_obras', op: 'INSERT' },
    label: 'user-insert',
  }),
  createEntradaFinanceiroRollbackCase({
    name: 'create_entrada_estoque_financeiro rolls back everything when movement insert fails',
    failpoint: { table: 'movimentacoes', op: 'INSERT' },
    label: 'entrada-mov',
    quantity: 3,
    unitPrice: 15,
  }),
  createEntradaFinanceiroRollbackCase({
    name: 'create_entrada_estoque_financeiro rolls back movement when estoque write fails',
    failpoint: { table: 'estoques', op: 'INSERT' },
    label: 'entrada-estoque',
    quantity: 2,
    unitPrice: 12,
  }),
  createEntradaFinanceiroRollbackCase({
    name: 'create_entrada_estoque_financeiro rolls back inventory when financeiro log fails',
    failpoint: { table: 'financeiro_movimentacoes', op: 'INSERT' },
    label: 'entrada-fin',
    quantity: 4,
    unitPrice: 11,
  }),
  createDeleteNotaFiscalRollbackCase({
    name: 'delete_nota_fiscal_orchestrated rolls back estoque reversal when movement delete fails',
    failpoint: { table: 'movimentacoes', op: 'DELETE' },
    label: 'nf-mov',
    assertState(state) {
      assert.equal(state.notaCount, 1)
      assert.equal(state.estoque, 5)
      assert.equal(state.movCount, 1)
      assert.equal(state.finCount >= 1, true)
      assert.equal(state.contaPagarCount, 1)
      assert.equal(state.saldo, 500)
    },
  }),
  createDeleteNotaFiscalRollbackCase({
    name: 'delete_nota_fiscal_orchestrated rolls back account reversal when financeiro delete fails',
    failpoint: { table: 'financeiro_movimentacoes', op: 'DELETE' },
    label: 'nf-fin',
    assertState(state) {
      assert.equal(state.notaCount, 1)
      assert.equal(state.movCount, 1)
      assert.equal(state.contaPagarCount, 1)
      assert.equal(state.saldo, 500)
    },
  }),
  createDeleteNotaFiscalRollbackCase({
    name: 'delete_nota_fiscal_orchestrated rolls back all dependent reversals when final nota delete fails',
    failpoint: { table: 'notas_fiscais', op: 'DELETE' },
    label: 'nf-final',
    assertState(state) {
      assert.equal(state.notaCount, 1)
      assert.equal(state.movCount, 1)
      assert.equal(state.contaPagarCount, 1)
      assert.equal(state.estoque, 5)
      assert.equal(state.saldo, 500)
    },
  }),
  {
    name: 'register_obra_sale rolls back obra status when immediate financeiro log fails',
    failpoint: { table: 'financeiro_movimentacoes', op: 'INSERT' },
    async setup(client, runId) {
      const obra = await insertObra(client, makeTag(runId, 'sale-fin'), { status: 'ATIVA' })
      const conta = await insertFinanceiroConta(client, makeTag(runId, 'conta-sale-fin'), {
        valorCaixa: 1000,
      })
      const motivo = makeTag(runId, 'sale-fin-motivo')
      return { obraId: obra.id, contaId: conta.id, motivo }
    },
    async execute(client, ctx) {
      await client.query(
        `
          select (register_obra_sale($1, 250000, $2::jsonb, '[]'::jsonb)).id
        `,
        [
          ctx.obraId,
          JSON.stringify([
            {
              conta_id: ctx.contaId,
              tipo: 'ENTRADA',
              subconta: 'CAIXA',
              motivo: ctx.motivo,
              valor: 250000,
              data: TODAY(),
              delta_caixa: 250000,
              delta_aplicado: 0,
            },
          ]),
        ],
      )
    },
    async assertRollback(client, ctx) {
      const obra = await client.query('select status, valor_venda from obras where id = $1', [
        ctx.obraId,
      ])
      const saldo = Number(
        await queryValue(client, 'select valor_caixa from financeiro_contas where id = $1', [
          ctx.contaId,
        ]),
      )
      const movCount = await countRows(client, 'financeiro_movimentacoes', 'motivo = $1', [
        ctx.motivo,
      ])
      assert.deepEqual(obra.rows[0], { status: 'ATIVA', valor_venda: null })
      assert.equal(saldo, 1000)
      assert.equal(movCount, 0)
    },
    async cleanup(client, ctx) {
      await client.query('delete from financeiro_movimentacoes where motivo = $1', [ctx.motivo])
      await client.query('delete from financeiro_contas where id = $1', [ctx.contaId])
      await deleteById(client, 'obras', ctx.obraId)
    },
  },
  {
    name: 'register_obra_sale rolls back receivable parent when installment insert fails',
    failpoint: { table: 'contas_receber_parcelas', op: 'INSERT' },
    async setup(client, runId) {
      const obra = await insertObra(client, makeTag(runId, 'sale-recv'), { status: 'ATIVA' })
      const descricao = makeTag(runId, 'sale-recv-desc')
      return { obraId: obra.id, descricao }
    },
    async execute(client, ctx) {
      await client.query(
        `
          select (register_obra_sale($1, 300000, '[]'::jsonb, $2::jsonb)).id
        `,
        [
          ctx.obraId,
          JSON.stringify([
            {
              descricao: ctx.descricao,
              cliente: null,
              obra_id: ctx.obraId,
              observacoes: null,
              valor_total: 300000,
              parcelas: [
                { numero_parcela: 1, total_parcelas: 2, valor: 150000, vencimento: TODAY() },
                { numero_parcela: 2, total_parcelas: 2, valor: 150000, vencimento: TODAY() },
              ],
            },
          ]),
        ],
      )
    },
    async assertRollback(client, ctx) {
      const obra = await client.query('select status, valor_venda from obras where id = $1', [
        ctx.obraId,
      ])
      const recvCount = await countRows(client, 'contas_receber', 'descricao = $1', [ctx.descricao])
      const parcelaCount = await countRows(
        client,
        'contas_receber_parcelas',
        'conta_receber_id in (select id from contas_receber where descricao = $1)',
        [ctx.descricao],
      )
      assert.deepEqual(obra.rows[0], { status: 'ATIVA', valor_venda: null })
      assert.equal(recvCount, 0)
      assert.equal(parcelaCount, 0)
    },
    async cleanup(client, ctx) {
      await client.query(
        'delete from contas_receber_parcelas where conta_receber_id in (select id from contas_receber where descricao = $1)',
        [ctx.descricao],
      )
      await client.query('delete from contas_receber where descricao = $1', [ctx.descricao])
      await deleteById(client, 'obras', ctx.obraId)
    },
  },
]
