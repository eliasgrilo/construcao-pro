import type { InternalSupabase, Json, PublicEnums } from './base'
import type { CatalogoTables } from './catalogo'
import type { DocumentosTables } from './documentos'
import type { FinanceiroTables } from './financeiro'
import type { ObrasTables } from './obras'
import type { SystemTables } from './system'

export type PublicFunctions = {
  aprovar_transferencia: {
    Args: { p_movimentacao_id: string }
    Returns: Json
  }
  buscar_fornecedor_por_cnpj: {
    Args: { p_cnpj: string }
    Returns: {
      id: string
      nome: string
      cnpj: string
      nome_fantasia: string | null
      telefone: string | null
      email: string | null
      endereco: string | null
      cidade: string | null
      estado: string | null
    }[]
  }
  cancel_obra_sale: {
    Args: { p_obra_id: string; p_new_status?: string }
    Returns: ObrasTables['obras']['Row']
  }
  cancelar_financeiro_movement: {
    Args: {
      p_conta_id: string
      p_delta_aplicado: number
      p_delta_caixa: number
      p_delta_destino_caixa?: number
      p_destino_conta_id?: string | null
      p_mov_id: string
    }
    Returns: undefined
  }
  categorizar_por_cfop: {
    Args: { p_cfop: string }
    Returns: string
  }
  create_conta_pagar: {
    Args: {
      p_categoria: string
      p_descricao: string
      p_fornecedor_id?: string | null
      p_nf_id?: string | null
      p_obra_id?: string | null
      p_observacoes?: string | null
      p_parcelas: Array<{
        numero_parcela: number
        status?: 'PENDENTE' | 'PAGO' | 'ATRASADO'
        total_parcelas: number
        valor: number
        vencimento: string
      }>
      p_valor_total: number
    }
    Returns: string
  }
  create_conta_receber: {
    Args: {
      p_cliente?: string | null
      p_descricao: string
      p_obra_id?: string | null
      p_observacoes?: string | null
      p_parcelas: Array<{
        numero_parcela: number
        total_parcelas: number
        valor: number
        vencimento: string
      }>
      p_valor_total: number
    }
    Returns: string
  }
  create_entrada_estoque_financeiro: {
    Args: {
      p_almoxarifado_id: string
      p_conta_id: string
      p_data?: string | null
      p_forma_pagamento?: string | null
      p_fornecedor_id?: string | null
      p_material_id: string
      p_motivo: string
      p_nf_id?: string | null
      p_observacao?: string | null
      p_preco_unitario: number
      p_quantidade: number
      p_subconta: 'CAIXA' | 'APLICADO'
      p_unidade?: string | null
    }
    Returns: string
  }
  create_audit_log: {
    Args: {
      p_acao: string
      p_entidade: string
      p_entidade_id: string
      p_payload?: Json
    }
    Returns: undefined
  }
  create_obra_with_almoxarifado: {
    Args: {
      p_area_total?: number | null
      p_cliente?: string | null
      p_data_inicio?: string | null
      p_data_previsao_termino?: string | null
      p_endereco: string
      p_nome: string
      p_observacoes?: string | null
      p_orcamento?: number
      p_responsavel?: string | null
      p_status?: 'ATIVA' | 'PAUSADA' | 'FINALIZADA' | 'VENDIDO' | 'TERRENO'
      p_valor_burocracia?: number
      p_valor_construcao?: number
      p_valor_terreno?: number
    }
    Returns: ObrasTables['obras']['Row']
  }
  criar_movimentacao_entrada: {
    Args: {
      p_almoxarifado_id: string
      p_forma_pagamento?: string | null
      p_fornecedor_id?: string | null
      p_material_id: string
      p_nf_id?: string | null
      p_observacao?: string | null
      p_preco_unitario: number
      p_quantidade: number
      p_unidade?: string | null
    }
    Returns: Json
  }
  criar_movimentacao_saida: {
    Args: {
      p_almoxarifado_id: string
      p_material_id: string
      p_observacao?: string | null
      p_preco_unitario: number
      p_quantidade: number
      p_unidade?: string | null
    }
    Returns: Json
  }
  criar_movimentacao_transferencia: {
    Args: {
      p_almoxarifado_destino_id: string
      p_almoxarifado_id: string
      p_material_id: string
      p_observacao?: string | null
      p_quantidade: number
      p_unidade?: string | null
    }
    Returns: Json
  }
  delete_nota_fiscal_orchestrated: {
    Args: { p_cancel_financeiro?: boolean; p_nf_id: string }
    Returns: undefined
  }
  fluxo_caixa_projetado: {
    Args: { p_fim: string; p_inicio: string; p_obra_id: string }
    Returns: { despesas: number; receitas: number; semana: string }[]
  }
  get_fornecedor_category_map: {
    Args: never
    Returns: Array<{
      categoria_id: string
      categoria_nome: string
      fornecedor_id: string
    }>
  }
  get_custo_por_obra: {
    Args: never
    Returns: {
      custo: number
      endereco: string
      id: string
      obra: string
      orcamento: number
      percentual: number
      status: string
      valor_burocracia: number
      valor_construcao: number
      valor_terreno: number
      valor_venda: number
    }[]
  }
  get_dashboard_stats: { Args: never; Returns: Json }
  get_estoque_alertas: { Args: never; Returns: Json }
  get_movimentacoes_recentes: { Args: { p_limit?: number }; Returns: Json }
  get_my_role: { Args: never; Returns: PublicEnums['role'] }
  get_obra_custos: { Args: { p_obra_id: string }; Returns: Json }
  has_obra_access: { Args: { p_obra_id: string }; Returns: boolean }
  is_admin: { Args: never; Returns: boolean }
  is_almoxarife_or_above: { Args: never; Returns: boolean }
  is_gestor_or_above: { Args: never; Returns: boolean }
  pagar_parcela: {
    Args: {
      p_conta_bancaria_id: string
      p_data_pagamento: string
      p_descricao: string
      p_numero_parcela: number
      p_parcela_id: string
      p_total_parcelas: number
      p_valor: number
    }
    Returns: undefined
  }
  receber_parcela: {
    Args: {
      p_conta_bancaria_id: string
      p_data_recebimento: string
      p_descricao: string
      p_numero_parcela: number
      p_parcela_id: string
      p_total_parcelas: number
      p_valor: number
    }
    Returns: undefined
  }
  rejeitar_transferencia: {
    Args: { p_movimentacao_id: string }
    Returns: Json
  }
  register_financeiro_movement: {
    Args: {
      p_conta_id: string
      p_data: string
      p_delta_aplicado: number
      p_delta_caixa: number
      p_delta_destino_caixa?: number
      p_destino_conta_id?: string | null
      p_motivo: string
      p_subconta: 'CAIXA' | 'APLICADO'
      p_tipo: 'ENTRADA' | 'SAIDA' | 'TRANSFERENCIA'
      p_transferencia_destino_id?: string | null
      p_valor: number
    }
    Returns: string
  }
  register_obra_sale: {
    Args: {
      p_movements: Array<{
        conta_id: string
        data: string
        delta_aplicado: number
        delta_caixa: number
        delta_destino_caixa?: number
        destino_conta_id?: string | null
        motivo: string
        subconta: 'CAIXA' | 'APLICADO'
        tipo: 'ENTRADA' | 'SAIDA' | 'TRANSFERENCIA'
        transferencia_destino_id?: string | null
        valor: number
      }>
      p_obra_id: string
      p_receivables: Array<{
        cliente?: string | null
        descricao: string
        observacoes?: string | null
        obra_id?: string | null
        parcelas: Array<{
          numero_parcela: number
          total_parcelas: number
          valor: number
          vencimento: string
        }>
        valor_total: number
      }>
      p_valor_venda: number
    }
    Returns: ObrasTables['obras']['Row']
  }
  reverse_financeiro_movement: {
    Args: {
      p_conta_id: string
      p_delta_aplicado: number
      p_delta_caixa: number
      p_delta_destino_caixa?: number
      p_destino_conta_id?: string | null
      p_mov_id: string
    }
    Returns: undefined
  }
  saldo_estoque: {
    Args: { p_obra_id: string }
    Returns: { material_id: string; nome: string; quantidade: number; unidade: string }[]
  }
  set_usuario_obras: {
    Args: { p_obra_ids: string[]; p_usuario_id: string }
    Returns: undefined
  }
  start_obra_manutencao: {
    Args: {
      p_obra_id: string
      p_problemas?: string[]
      p_status_anterior?: string | null
    }
    Returns: ObrasTables['obra_manutencao']['Row']
  }
  verificar_estoque_minimo: {
    Args: { p_obra_id: string }
    Returns: {
      estoque_minimo: number
      material_id: string
      nome: string
      quantidade_atual: number
      unidade: string
    }[]
  }
  vincular_nfe_estoque_atomico: {
    Args: {
      p_fornecedor_id: string
      p_itens: Json
      p_nf_id: string
      p_numero_nf: string
    }
    Returns: number
  }
  update_usuario_with_obras: {
    Args: {
      p_ativo: boolean
      p_nome: string
      p_obra_ids: string[]
      p_role: PublicEnums['role']
      p_usuario_id: string
    }
    Returns: undefined
  }
}

export type Database = {
  __InternalSupabase: InternalSupabase
  public: {
    Tables: CatalogoTables & DocumentosTables & FinanceiroTables & ObrasTables & SystemTables
    Views: {
      [_ in never]: never
    }
    Functions: PublicFunctions
    Enums: PublicEnums
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof DatabaseWithoutInternals, 'public'>]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    ? (DefaultSchema['Tables'] & DefaultSchema['Views'])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema['Tables']
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema['Tables']
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema['Enums']
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums']
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums'][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema['Enums']
    ? DefaultSchema['Enums'][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema['CompositeTypes']
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes']
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes'][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema['CompositeTypes']
    ? DefaultSchema['CompositeTypes'][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      status_nf: ['PENDENTE', 'PROCESSADA', 'VINCULADA', 'REJEITADA'],
      status_obra: ['ATIVA', 'FINALIZADA', 'PAUSADA', 'VENDIDO', 'TERRENO', 'MANUTENCAO'],
      status_transferencia: ['PENDENTE', 'APROVADA_NIVEL_1', 'APROVADA', 'REJEITADA'],
      tipo_movimentacao: ['ENTRADA', 'SAIDA', 'TRANSFERENCIA'],
      unidade: ['UN', 'KG', 'M', 'M2', 'M3', 'L', 'CX', 'PC', 'SC', 'TB', 'GL', 'FD', 'RL', 'PR'],
    },
  },
} as const
