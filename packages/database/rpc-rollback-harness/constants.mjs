export const SUPPORT_SCHEMA = 'codex_test_support'
export const SUPPORT_TABLE = `${SUPPORT_SCHEMA}.fail_state`
export const SUPPORT_FUNCTION = `${SUPPORT_SCHEMA}.maybe_fail`
export const HARNESS_PREFIX = 'codex-harness'
export const NOW = () => new Date().toISOString()
export const TODAY = () => NOW().slice(0, 10)
export const TRIGGER_TABLES = [
  'obras',
  'almoxarifados',
  'usuario_obras',
  'obra_manutencao',
  'obra_manutencao_item',
  'movimentacoes',
  'estoques',
  'financeiro_contas',
  'financeiro_movimentacoes',
  'notas_fiscais',
  'contas_pagar',
  'contas_receber',
  'contas_receber_parcelas',
]
