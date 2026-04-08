import assert from 'node:assert/strict'
import { TODAY } from './constants.mjs'
import {
  assertEntradaFinanceiroRolledBack,
  cleanupEntradaFinanceiroScenario,
  cleanupNotaFiscalDeleteScenario,
  cleanupUsuarioUpdateScenario,
  createEntradaFinanceiroScenario,
  createNotaFiscalDeleteScenario,
  createUsuarioUpdateScenario,
  getNotaFiscalRollbackState,
  getUserObras,
  getUserState,
} from './fixtures.mjs'

export function createUpdateUsuarioWithObrasRollbackCase({ name, failpoint, label }) {
  return {
    name,
    failpoint,
    setup(client, runId) {
      return createUsuarioUpdateScenario(client, runId, label)
    },
    async execute(client, ctx) {
      await client.query('select update_usuario_with_obras($1, $2, $3, $4, $5::text[])', [
        ctx.userId,
        'Alterado',
        'ADMIN',
        false,
        [ctx.obraBId],
      ])
    },
    async assertRollback(client, ctx) {
      const user = await getUserState(client, ctx.userId)
      const obras = await getUserObras(client, ctx.userId)
      assert.deepEqual(user, { nome: 'Original', role: 'VISUALIZADOR', ativo: true })
      assert.deepEqual(obras, [ctx.obraAId])
    },
    cleanup: cleanupUsuarioUpdateScenario,
  }
}

export function createEntradaFinanceiroRollbackCase({
  name,
  failpoint,
  label,
  quantity,
  unitPrice,
}) {
  return {
    name,
    failpoint,
    setup(client, runId) {
      return createEntradaFinanceiroScenario(client, runId, label)
    },
    async execute(client, ctx) {
      await client.query(
        `
          select create_entrada_estoque_financeiro(
            $1, $2, $3, $4, $5::uuid, 'CAIXA', $6, $7, $8, $9, 'UN', 'PIX', null
          )
        `,
        [
          ctx.materialId,
          quantity,
          unitPrice,
          ctx.almoxId,
          ctx.contaId,
          ctx.motivo,
          TODAY(),
          ctx.fornecedorId,
          ctx.observacao,
        ],
      )
    },
    assertRollback: assertEntradaFinanceiroRolledBack,
    cleanup: cleanupEntradaFinanceiroScenario,
  }
}

export function createDeleteNotaFiscalRollbackCase({ name, failpoint, label, assertState }) {
  return {
    name,
    failpoint,
    setup(client, runId) {
      return createNotaFiscalDeleteScenario(client, runId, label)
    },
    async execute(client, ctx) {
      await client.query('select delete_nota_fiscal_orchestrated($1, true)', [ctx.notaId])
    },
    async assertRollback(client, ctx) {
      const state = await getNotaFiscalRollbackState(client, ctx)
      assertState(state)
    },
    cleanup: cleanupNotaFiscalDeleteScenario,
  }
}
