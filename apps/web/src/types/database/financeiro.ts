export type FinanceiroTables = {
  contas_pagar: {
    Row: {
      categoria: string
      created_at: string
      descricao: string
      fornecedor_id: string | null
      id: string
      nf_id: string | null
      obra_id: string | null
      observacoes: string | null
      status: string
      updated_at: string
      valor_total: number
    }
    Insert: {
      categoria?: string
      created_at?: string
      descricao: string
      fornecedor_id?: string | null
      id?: string
      nf_id?: string | null
      obra_id?: string | null
      observacoes?: string | null
      status?: string
      updated_at?: string
      valor_total?: number
    }
    Update: {
      categoria?: string
      created_at?: string
      descricao?: string
      fornecedor_id?: string | null
      id?: string
      nf_id?: string | null
      obra_id?: string | null
      observacoes?: string | null
      status?: string
      updated_at?: string
      valor_total?: number
    }
    Relationships: [
      {
        foreignKeyName: 'contas_pagar_fornecedor_id_fkey'
        columns: ['fornecedor_id']
        isOneToOne: false
        referencedRelation: 'fornecedores'
        referencedColumns: ['id']
      },
      {
        foreignKeyName: 'contas_pagar_nf_id_fkey'
        columns: ['nf_id']
        isOneToOne: false
        referencedRelation: 'notas_fiscais'
        referencedColumns: ['id']
      },
      {
        foreignKeyName: 'contas_pagar_obra_id_fkey'
        columns: ['obra_id']
        isOneToOne: false
        referencedRelation: 'obras'
        referencedColumns: ['id']
      },
    ]
  }
  contas_pagar_parcelas: {
    Row: {
      conta_bancaria_id: string | null
      conta_pagar_id: string
      created_at: string
      id: string
      numero_parcela: number
      pago_em: string | null
      status: string
      total_parcelas: number
      valor: number
      vencimento: string
    }
    Insert: {
      conta_bancaria_id?: string | null
      conta_pagar_id: string
      created_at?: string
      id?: string
      numero_parcela?: number
      pago_em?: string | null
      status?: string
      total_parcelas?: number
      valor?: number
      vencimento: string
    }
    Update: {
      conta_bancaria_id?: string | null
      conta_pagar_id?: string
      created_at?: string
      id?: string
      numero_parcela?: number
      pago_em?: string | null
      status?: string
      total_parcelas?: number
      valor?: number
      vencimento?: string
    }
    Relationships: [
      {
        foreignKeyName: 'contas_pagar_parcelas_conta_bancaria_id_fkey'
        columns: ['conta_bancaria_id']
        isOneToOne: false
        referencedRelation: 'financeiro_contas'
        referencedColumns: ['id']
      },
      {
        foreignKeyName: 'contas_pagar_parcelas_conta_pagar_id_fkey'
        columns: ['conta_pagar_id']
        isOneToOne: false
        referencedRelation: 'contas_pagar'
        referencedColumns: ['id']
      },
    ]
  }
  contas_receber: {
    Row: {
      cliente: string | null
      created_at: string
      descricao: string
      id: string
      obra_id: string | null
      observacoes: string | null
      status: string
      updated_at: string
      valor_total: number
    }
    Insert: {
      cliente?: string | null
      created_at?: string
      descricao: string
      id?: string
      obra_id?: string | null
      observacoes?: string | null
      status?: string
      updated_at?: string
      valor_total?: number
    }
    Update: {
      cliente?: string | null
      created_at?: string
      descricao?: string
      id?: string
      obra_id?: string | null
      observacoes?: string | null
      status?: string
      updated_at?: string
      valor_total?: number
    }
    Relationships: [
      {
        foreignKeyName: 'contas_receber_obra_id_fkey'
        columns: ['obra_id']
        isOneToOne: false
        referencedRelation: 'obras'
        referencedColumns: ['id']
      },
    ]
  }
  contas_receber_parcelas: {
    Row: {
      conta_bancaria_id: string | null
      conta_receber_id: string
      created_at: string
      id: string
      numero_parcela: number
      recebido_em: string | null
      status: string
      total_parcelas: number
      valor: number
      vencimento: string
    }
    Insert: {
      conta_bancaria_id?: string | null
      conta_receber_id: string
      created_at?: string
      id?: string
      numero_parcela?: number
      recebido_em?: string | null
      status?: string
      total_parcelas?: number
      valor?: number
      vencimento: string
    }
    Update: {
      conta_bancaria_id?: string | null
      conta_receber_id?: string
      created_at?: string
      id?: string
      numero_parcela?: number
      recebido_em?: string | null
      status?: string
      total_parcelas?: number
      valor?: number
      vencimento?: string
    }
    Relationships: [
      {
        foreignKeyName: 'contas_receber_parcelas_conta_bancaria_id_fkey'
        columns: ['conta_bancaria_id']
        isOneToOne: false
        referencedRelation: 'financeiro_contas'
        referencedColumns: ['id']
      },
      {
        foreignKeyName: 'contas_receber_parcelas_conta_receber_id_fkey'
        columns: ['conta_receber_id']
        isOneToOne: false
        referencedRelation: 'contas_receber'
        referencedColumns: ['id']
      },
    ]
  }
  financeiro_contas: {
    Row: {
      agencia: string
      banco: string
      created_at: string
      id: string
      numero_conta: string
      tipo: string
      updated_at: string
      valor_aplicado: number
      valor_caixa: number
    }
    Insert: {
      agencia?: string
      banco: string
      created_at?: string
      id?: string
      numero_conta?: string
      tipo?: string
      updated_at?: string
      valor_aplicado?: number
      valor_caixa?: number
    }
    Update: {
      agencia?: string
      banco?: string
      created_at?: string
      id?: string
      numero_conta?: string
      tipo?: string
      updated_at?: string
      valor_aplicado?: number
      valor_caixa?: number
    }
    Relationships: []
  }
  financeiro_meta: {
    Row: {
      id: string
      updated_at: string
      valor: number
    }
    Insert: {
      id?: string
      updated_at?: string
      valor?: number
    }
    Update: {
      id?: string
      updated_at?: string
      valor?: number
    }
    Relationships: []
  }
  financeiro_movimentacoes: {
    Row: {
      conta_id: string
      created_at: string
      data: string
      id: string
      motivo: string
      subconta: string
      tipo: string
      transferencia_destino_id: string | null
      updated_at: string
      valor: number
    }
    Insert: {
      conta_id: string
      created_at?: string
      data: string
      id?: string
      motivo: string
      subconta: string
      tipo: string
      transferencia_destino_id?: string | null
      updated_at?: string
      valor: number
    }
    Update: {
      conta_id?: string
      created_at?: string
      data?: string
      id?: string
      motivo?: string
      subconta?: string
      tipo?: string
      transferencia_destino_id?: string | null
      updated_at?: string
      valor?: number
    }
    Relationships: [
      {
        foreignKeyName: 'financeiro_movimentacoes_conta_id_fkey'
        columns: ['conta_id']
        isOneToOne: false
        referencedRelation: 'financeiro_contas'
        referencedColumns: ['id']
      },
    ]
  }
  obra_venda_parcelas: {
    Row: {
      conta_id: string
      created_at: string
      data_vencimento: string
      id: string
      movimentacao_id: string | null
      numero_parcela: number
      obra_id: string
      pago: boolean
      total_parcelas: number
      valor: number
    }
    Insert: {
      conta_id: string
      created_at?: string
      data_vencimento: string
      id?: string
      movimentacao_id?: string | null
      numero_parcela: number
      obra_id: string
      pago?: boolean
      total_parcelas: number
      valor: number
    }
    Update: {
      conta_id?: string
      created_at?: string
      data_vencimento?: string
      id?: string
      movimentacao_id?: string | null
      numero_parcela?: number
      obra_id?: string
      pago?: boolean
      total_parcelas?: number
      valor?: number
    }
    Relationships: []
  }
}
