-- ─────────────────────────────────────────────────────────────────
-- REPLICA IDENTITY FULL: UPDATE and DELETE events carry the full old row.
-- Required for postgres_changes to be useful beyond INSERT-only monitoring.
-- ─────────────────────────────────────────────────────────────────
ALTER TABLE obras                       REPLICA IDENTITY FULL;
ALTER TABLE almoxarifados               REPLICA IDENTITY FULL;
ALTER TABLE categorias                  REPLICA IDENTITY FULL;
ALTER TABLE materiais                   REPLICA IDENTITY FULL;
ALTER TABLE estoques                    REPLICA IDENTITY FULL;
ALTER TABLE movimentacoes               REPLICA IDENTITY FULL;
ALTER TABLE fornecedores                REPLICA IDENTITY FULL;
ALTER TABLE notas_fiscais               REPLICA IDENTITY FULL;
ALTER TABLE itens_nf                    REPLICA IDENTITY FULL;
ALTER TABLE financeiro_contas           REPLICA IDENTITY FULL;
ALTER TABLE financeiro_movimentacoes    REPLICA IDENTITY FULL;
ALTER TABLE financeiro_meta             REPLICA IDENTITY FULL;
ALTER TABLE documento_categorias        REPLICA IDENTITY FULL;
ALTER TABLE documentos                  REPLICA IDENTITY FULL;
ALTER TABLE obra_lancamentos_burocracia REPLICA IDENTITY FULL;
ALTER TABLE obra_manutencao             REPLICA IDENTITY FULL;
ALTER TABLE obra_manutencao_item        REPLICA IDENTITY FULL;
ALTER TABLE tarefas                     REPLICA IDENTITY FULL;
ALTER TABLE contas_pagar                REPLICA IDENTITY FULL;
ALTER TABLE contas_pagar_parcelas       REPLICA IDENTITY FULL;
ALTER TABLE contas_receber              REPLICA IDENTITY FULL;
ALTER TABLE contas_receber_parcelas     REPLICA IDENTITY FULL;

-- ─────────────────────────────────────────────────────────────────
-- Enroll all 22 business-critical tables in the supabase_realtime
-- publication. Tables excluded: usuarios, usuario_obras, audit_logs,
-- nf_match_memoria, produto_fornecedor (write-only), obra_venda_parcelas
-- (no client-side query found).
-- ─────────────────────────────────────────────────────────────────
ALTER PUBLICATION supabase_realtime ADD TABLE obras;
ALTER PUBLICATION supabase_realtime ADD TABLE almoxarifados;
ALTER PUBLICATION supabase_realtime ADD TABLE categorias;
ALTER PUBLICATION supabase_realtime ADD TABLE materiais;
ALTER PUBLICATION supabase_realtime ADD TABLE estoques;
ALTER PUBLICATION supabase_realtime ADD TABLE movimentacoes;
ALTER PUBLICATION supabase_realtime ADD TABLE fornecedores;
ALTER PUBLICATION supabase_realtime ADD TABLE notas_fiscais;
ALTER PUBLICATION supabase_realtime ADD TABLE itens_nf;
ALTER PUBLICATION supabase_realtime ADD TABLE financeiro_contas;
ALTER PUBLICATION supabase_realtime ADD TABLE financeiro_movimentacoes;
ALTER PUBLICATION supabase_realtime ADD TABLE financeiro_meta;
ALTER PUBLICATION supabase_realtime ADD TABLE documento_categorias;
ALTER PUBLICATION supabase_realtime ADD TABLE documentos;
ALTER PUBLICATION supabase_realtime ADD TABLE obra_lancamentos_burocracia;
ALTER PUBLICATION supabase_realtime ADD TABLE obra_manutencao;
ALTER PUBLICATION supabase_realtime ADD TABLE obra_manutencao_item;
ALTER PUBLICATION supabase_realtime ADD TABLE tarefas;
ALTER PUBLICATION supabase_realtime ADD TABLE contas_pagar;
ALTER PUBLICATION supabase_realtime ADD TABLE contas_pagar_parcelas;
ALTER PUBLICATION supabase_realtime ADD TABLE contas_receber;
ALTER PUBLICATION supabase_realtime ADD TABLE contas_receber_parcelas;
