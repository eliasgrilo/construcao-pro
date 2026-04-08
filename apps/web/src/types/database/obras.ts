import type { PublicEnums } from './base'

export type ObrasTables = {
  almoxarifados: {
    Row: {
      created_at: string
      id: string
      nome: string
      obra_id: string
      updated_at: string
    }
    Insert: {
      created_at?: string
      id?: string
      nome: string
      obra_id: string
      updated_at?: string
    }
    Update: {
      created_at?: string
      id?: string
      nome?: string
      obra_id?: string
      updated_at?: string
    }
    Relationships: [
      {
        foreignKeyName: 'almoxarifados_obra_id_fkey'
        columns: ['obra_id']
        isOneToOne: false
        referencedRelation: 'obras'
        referencedColumns: ['id']
      },
    ]
  }
  estoques: {
    Row: {
      almoxarifado_id: string
      created_at: string
      id: string
      material_id: string
      quantidade: number
      updated_at: string
    }
    Insert: {
      almoxarifado_id: string
      created_at?: string
      id?: string
      material_id: string
      quantidade?: number
      updated_at?: string
    }
    Update: {
      almoxarifado_id?: string
      created_at?: string
      id?: string
      material_id?: string
      quantidade?: number
      updated_at?: string
    }
    Relationships: [
      {
        foreignKeyName: 'estoques_almoxarifado_id_fkey'
        columns: ['almoxarifado_id']
        isOneToOne: false
        referencedRelation: 'almoxarifados'
        referencedColumns: ['id']
      },
      {
        foreignKeyName: 'estoques_material_id_fkey'
        columns: ['material_id']
        isOneToOne: false
        referencedRelation: 'materiais'
        referencedColumns: ['id']
      },
    ]
  }
  movimentacoes: {
    Row: {
      almoxarifado_destino_id: string | null
      almoxarifado_id: string
      created_at: string
      forma_pagamento: string | null
      fornecedor_id: string | null
      id: string
      material_id: string
      nf_id: string | null
      observacao: string | null
      preco_unitario: number | null
      quantidade: number
      status_transferencia: PublicEnums['status_transferencia'] | null
      tipo: PublicEnums['tipo_movimentacao']
      unidade: string | null
      usuario_id: string
    }
    Insert: {
      almoxarifado_destino_id?: string | null
      almoxarifado_id: string
      created_at?: string
      forma_pagamento?: string | null
      fornecedor_id?: string | null
      id?: string
      material_id: string
      nf_id?: string | null
      observacao?: string | null
      preco_unitario?: number | null
      quantidade: number
      status_transferencia?: PublicEnums['status_transferencia'] | null
      tipo: PublicEnums['tipo_movimentacao']
      unidade?: string | null
      usuario_id: string
    }
    Update: {
      almoxarifado_destino_id?: string | null
      almoxarifado_id?: string
      created_at?: string
      forma_pagamento?: string | null
      fornecedor_id?: string | null
      id?: string
      material_id?: string
      nf_id?: string | null
      observacao?: string | null
      preco_unitario?: number | null
      quantidade?: number
      status_transferencia?: PublicEnums['status_transferencia'] | null
      tipo?: PublicEnums['tipo_movimentacao']
      unidade?: string | null
      usuario_id?: string
    }
    Relationships: [
      {
        foreignKeyName: 'movimentacoes_almoxarifado_destino_id_fkey'
        columns: ['almoxarifado_destino_id']
        isOneToOne: false
        referencedRelation: 'almoxarifados'
        referencedColumns: ['id']
      },
      {
        foreignKeyName: 'movimentacoes_almoxarifado_id_fkey'
        columns: ['almoxarifado_id']
        isOneToOne: false
        referencedRelation: 'almoxarifados'
        referencedColumns: ['id']
      },
      {
        foreignKeyName: 'movimentacoes_fornecedor_id_fkey'
        columns: ['fornecedor_id']
        isOneToOne: false
        referencedRelation: 'fornecedores'
        referencedColumns: ['id']
      },
      {
        foreignKeyName: 'movimentacoes_material_id_fkey'
        columns: ['material_id']
        isOneToOne: false
        referencedRelation: 'materiais'
        referencedColumns: ['id']
      },
      {
        foreignKeyName: 'movimentacoes_nf_id_fkey'
        columns: ['nf_id']
        isOneToOne: false
        referencedRelation: 'notas_fiscais'
        referencedColumns: ['id']
      },
      {
        foreignKeyName: 'movimentacoes_usuario_id_fkey'
        columns: ['usuario_id']
        isOneToOne: false
        referencedRelation: 'usuarios'
        referencedColumns: ['id']
      },
    ]
  }
  obra_lancamentos_burocracia: {
    Row: {
      categoria: string
      created_at: string
      data: string
      descricao: string
      id: string
      obra_id: string
      valor: number
    }
    Insert: {
      categoria: string
      created_at?: string
      data?: string
      descricao: string
      id?: string
      obra_id: string
      valor: number
    }
    Update: {
      categoria?: string
      created_at?: string
      data?: string
      descricao?: string
      id?: string
      obra_id?: string
      valor?: number
    }
    Relationships: [
      {
        foreignKeyName: 'obra_lancamentos_burocracia_obra_id_fkey'
        columns: ['obra_id']
        isOneToOne: false
        referencedRelation: 'obras'
        referencedColumns: ['id']
      },
    ]
  }
  obra_manutencao: {
    Row: {
      created_at: string
      data_conclusao: string | null
      data_inicio: string
      id: string
      obra_id: string
      status: string
      status_anterior: string | null
      updated_at: string
    }
    Insert: {
      created_at?: string
      data_conclusao?: string | null
      data_inicio?: string
      id?: string
      obra_id: string
      status?: string
      status_anterior?: string | null
      updated_at?: string
    }
    Update: {
      created_at?: string
      data_conclusao?: string | null
      data_inicio?: string
      id?: string
      obra_id?: string
      status?: string
      status_anterior?: string | null
      updated_at?: string
    }
    Relationships: [
      {
        foreignKeyName: 'obra_manutencao_obra_id_fkey'
        columns: ['obra_id']
        isOneToOne: false
        referencedRelation: 'obras'
        referencedColumns: ['id']
      },
    ]
  }
  obra_manutencao_item: {
    Row: {
      categoria: string | null
      created_at: string
      data_conclusao: string | null
      data_prevista: string | null
      descricao: string
      id: string
      manutencao_id: string
      obra_id: string
      observacoes: string | null
      prioridade: string | null
      resolvido: boolean
      responsavel: string | null
      updated_at: string
    }
    Insert: {
      categoria?: string | null
      created_at?: string
      data_conclusao?: string | null
      data_prevista?: string | null
      descricao: string
      id?: string
      manutencao_id: string
      obra_id: string
      observacoes?: string | null
      prioridade?: string | null
      resolvido?: boolean
      responsavel?: string | null
      updated_at?: string
    }
    Update: {
      categoria?: string | null
      created_at?: string
      data_conclusao?: string | null
      data_prevista?: string | null
      descricao?: string
      id?: string
      manutencao_id?: string
      obra_id?: string
      observacoes?: string | null
      prioridade?: string | null
      resolvido?: boolean
      responsavel?: string | null
      updated_at?: string
    }
    Relationships: [
      {
        foreignKeyName: 'obra_manutencao_item_manutencao_id_fkey'
        columns: ['manutencao_id']
        isOneToOne: false
        referencedRelation: 'obra_manutencao'
        referencedColumns: ['id']
      },
      {
        foreignKeyName: 'obra_manutencao_item_obra_id_fkey'
        columns: ['obra_id']
        isOneToOne: false
        referencedRelation: 'obras'
        referencedColumns: ['id']
      },
    ]
  }
  obras: {
    Row: {
      area_total: number | null
      cliente: string | null
      created_at: string
      data_inicio: string | null
      data_previsao_termino: string | null
      endereco: string
      id: string
      nome: string
      observacoes: string | null
      orcamento: number
      responsavel: string | null
      status: PublicEnums['status_obra']
      updated_at: string
      valor_burocracia: number
      valor_construcao: number
      valor_terreno: number
      valor_venda: number | null
    }
    Insert: {
      area_total?: number | null
      cliente?: string | null
      created_at?: string
      data_inicio?: string | null
      data_previsao_termino?: string | null
      endereco: string
      id?: string
      nome: string
      observacoes?: string | null
      orcamento?: number
      responsavel?: string | null
      status?: PublicEnums['status_obra']
      updated_at?: string
      valor_burocracia?: number
      valor_construcao?: number
      valor_terreno?: number
      valor_venda?: number | null
    }
    Update: {
      area_total?: number | null
      cliente?: string | null
      created_at?: string
      data_inicio?: string | null
      data_previsao_termino?: string | null
      endereco?: string
      id?: string
      nome?: string
      observacoes?: string | null
      orcamento?: number
      responsavel?: string | null
      status?: PublicEnums['status_obra']
      updated_at?: string
      valor_burocracia?: number
      valor_construcao?: number
      valor_terreno?: number
      valor_venda?: number | null
    }
    Relationships: []
  }
  usuario_obras: {
    Row: {
      created_at: string
      obra_id: string
      usuario_id: string
    }
    Insert: {
      created_at?: string
      obra_id: string
      usuario_id: string
    }
    Update: {
      created_at?: string
      obra_id?: string
      usuario_id?: string
    }
    Relationships: [
      {
        foreignKeyName: 'usuario_obras_obra_id_fkey'
        columns: ['obra_id']
        isOneToOne: false
        referencedRelation: 'obras'
        referencedColumns: ['id']
      },
      {
        foreignKeyName: 'usuario_obras_usuario_id_fkey'
        columns: ['usuario_id']
        isOneToOne: false
        referencedRelation: 'usuarios'
        referencedColumns: ['id']
      },
    ]
  }
}
