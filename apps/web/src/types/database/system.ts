import type { Json, PublicEnums } from './base'

export type SystemTables = {
  audit_logs: {
    Row: {
      acao: string
      created_at: string
      entidade: string
      entidade_id: string
      id: string
      payload: Json | null
      usuario_id: string
    }
    Insert: {
      acao: string
      created_at?: string
      entidade: string
      entidade_id: string
      id?: string
      payload?: Json | null
      usuario_id: string
    }
    Update: {
      acao?: string
      created_at?: string
      entidade?: string
      entidade_id?: string
      id?: string
      payload?: Json | null
      usuario_id?: string
    }
    Relationships: [
      {
        foreignKeyName: 'audit_logs_usuario_id_fkey'
        columns: ['usuario_id']
        isOneToOne: false
        referencedRelation: 'usuarios'
        referencedColumns: ['id']
      },
    ]
  }
  itens_nf: {
    Row: {
      cfop: string | null
      cprod: string | null
      descricao: string
      gtin: string | null
      id: string
      material_id: string | null
      ncm: string | null
      nf_id: string
      quantidade: number
      rateio_desconto: number | null
      rateio_frete: number | null
      unidade: string
      valor_icms_st: number | null
      valor_ipi: number | null
      valor_total: number
      valor_unitario: number
    }
    Insert: {
      cfop?: string | null
      cprod?: string | null
      descricao: string
      gtin?: string | null
      id?: string
      material_id?: string | null
      ncm?: string | null
      nf_id: string
      quantidade: number
      rateio_desconto?: number | null
      rateio_frete?: number | null
      unidade: string
      valor_icms_st?: number | null
      valor_ipi?: number | null
      valor_total: number
      valor_unitario: number
    }
    Update: {
      cfop?: string | null
      cprod?: string | null
      descricao?: string
      gtin?: string | null
      id?: string
      material_id?: string | null
      ncm?: string | null
      nf_id?: string
      quantidade?: number
      rateio_desconto?: number | null
      rateio_frete?: number | null
      unidade?: string
      valor_icms_st?: number | null
      valor_ipi?: number | null
      valor_total?: number
      valor_unitario?: number
    }
    Relationships: [
      {
        foreignKeyName: 'itens_nf_material_id_fkey'
        columns: ['material_id']
        isOneToOne: false
        referencedRelation: 'materiais'
        referencedColumns: ['id']
      },
      {
        foreignKeyName: 'itens_nf_nf_id_fkey'
        columns: ['nf_id']
        isOneToOne: false
        referencedRelation: 'notas_fiscais'
        referencedColumns: ['id']
      },
    ]
  }
  nf_match_memoria: {
    Row: {
      descricao_xml: string
      material_id: string
      material_nome: string
      updated_at: string
    }
    Insert: {
      descricao_xml: string
      material_id: string
      material_nome: string
      updated_at?: string
    }
    Update: {
      descricao_xml?: string
      material_id?: string
      material_nome?: string
      updated_at?: string
    }
    Relationships: [
      {
        foreignKeyName: 'nf_match_memoria_material_id_fkey'
        columns: ['material_id']
        isOneToOne: false
        referencedRelation: 'materiais'
        referencedColumns: ['id']
      },
    ]
  }
  notas_fiscais: {
    Row: {
      chave_acesso: string
      cnpj_destinatario: string | null
      cnpj_emitente: string
      created_at: string
      data_emissao: string
      finalidade: number | null
      fornecedor_id: string | null
      id: string
      nome_emitente: string | null
      numero: string
      serie: string
      status: PublicEnums['status_nf']
      updated_at: string
      valor_total: number
      xml_original: string | null
      xml_url: string | null
    }
    Insert: {
      chave_acesso: string
      cnpj_destinatario?: string | null
      cnpj_emitente: string
      created_at?: string
      data_emissao: string
      finalidade?: number | null
      fornecedor_id?: string | null
      id?: string
      nome_emitente?: string | null
      numero: string
      serie: string
      status?: PublicEnums['status_nf']
      updated_at?: string
      valor_total: number
      xml_original?: string | null
      xml_url?: string | null
    }
    Update: {
      chave_acesso?: string
      cnpj_destinatario?: string | null
      cnpj_emitente?: string
      created_at?: string
      data_emissao?: string
      finalidade?: number | null
      fornecedor_id?: string | null
      id?: string
      nome_emitente?: string | null
      numero?: string
      serie?: string
      status?: PublicEnums['status_nf']
      updated_at?: string
      valor_total?: number
      xml_original?: string | null
      xml_url?: string | null
    }
    Relationships: [
      {
        foreignKeyName: 'notas_fiscais_fornecedor_id_fkey'
        columns: ['fornecedor_id']
        isOneToOne: false
        referencedRelation: 'fornecedores'
        referencedColumns: ['id']
      },
    ]
  }
  tarefas: {
    Row: {
      concluida: boolean
      created_at: string
      id: string
      obra_id: string | null
      obra_nome: string | null
      texto: string
      updated_at: string
      user_id: string
    }
    Insert: {
      concluida?: boolean
      created_at?: string
      id?: string
      obra_id?: string | null
      obra_nome?: string | null
      texto: string
      updated_at?: string
      user_id: string
    }
    Update: {
      concluida?: boolean
      created_at?: string
      id?: string
      obra_id?: string | null
      obra_nome?: string | null
      texto?: string
      updated_at?: string
      user_id?: string
    }
    Relationships: []
  }
  usuarios: {
    Row: {
      ativo: boolean
      created_at: string
      email: string
      id: string
      nome: string
      role: PublicEnums['role']
      updated_at: string
    }
    Insert: {
      ativo?: boolean
      created_at?: string
      email: string
      id: string
      nome?: string
      role?: PublicEnums['role']
      updated_at?: string
    }
    Update: {
      ativo?: boolean
      created_at?: string
      email?: string
      id?: string
      nome?: string
      role?: PublicEnums['role']
      updated_at?: string
    }
    Relationships: []
  }
  user_preferences: {
    Row: {
      chave: string
      created_at: string
      id: string
      updated_at: string
      user_id: string
      valor: string
    }
    Insert: {
      chave: string
      created_at?: string
      id?: string
      updated_at?: string
      user_id?: string
      valor: string
    }
    Update: {
      chave?: string
      created_at?: string
      id?: string
      updated_at?: string
      user_id?: string
      valor?: string
    }
    Relationships: [
      {
        foreignKeyName: 'user_preferences_user_id_fkey'
        columns: ['user_id']
        isOneToOne: false
        referencedRelation: 'usuarios'
        referencedColumns: ['id']
      },
    ]
  }
}
