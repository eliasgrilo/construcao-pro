import type { PublicEnums } from './base'

export type CatalogoTables = {
  categorias: {
    Row: {
      created_at: string
      id: string
      minimo: number | null
      nome: string
      unidade: PublicEnums['unidade']
      updated_at: string
    }
    Insert: {
      created_at?: string
      id?: string
      minimo?: number | null
      nome: string
      unidade: PublicEnums['unidade']
      updated_at?: string
    }
    Update: {
      created_at?: string
      id?: string
      minimo?: number | null
      nome?: string
      unidade?: PublicEnums['unidade']
      updated_at?: string
    }
    Relationships: []
  }
  fornecedores: {
    Row: {
      ativo: boolean
      cidade: string | null
      cnpj: string | null
      created_at: string
      deleted_at: string | null
      email: string | null
      endereco: string | null
      estado: string | null
      id: string
      inscricao_estadual: string | null
      nome: string
      nome_fantasia: string | null
      observacao: string | null
      telefone: string | null
      updated_at: string
    }
    Insert: {
      ativo?: boolean
      cidade?: string | null
      cnpj?: string | null
      created_at?: string
      deleted_at?: string | null
      email?: string | null
      endereco?: string | null
      estado?: string | null
      id?: string
      inscricao_estadual?: string | null
      nome: string
      nome_fantasia?: string | null
      observacao?: string | null
      telefone?: string | null
      updated_at?: string
    }
    Update: {
      ativo?: boolean
      cidade?: string | null
      cnpj?: string | null
      created_at?: string
      deleted_at?: string | null
      email?: string | null
      endereco?: string | null
      estado?: string | null
      id?: string
      inscricao_estadual?: string | null
      nome?: string
      nome_fantasia?: string | null
      observacao?: string | null
      telefone?: string | null
      updated_at?: string
    }
    Relationships: []
  }
  materiais: {
    Row: {
      ativo: boolean
      categoria_id: string
      codigo: string
      codigo_barras: string | null
      cest_padrao: string | null
      created_at: string
      descricao: string | null
      estoque_minimo: number
      id: string
      nome: string
      preco_unitario: number
      unidade: PublicEnums['unidade']
      updated_at: string
    }
    Insert: {
      ativo?: boolean
      categoria_id: string
      codigo: string
      codigo_barras?: string | null
      cest_padrao?: string | null
      created_at?: string
      descricao?: string | null
      estoque_minimo?: number
      id?: string
      nome: string
      preco_unitario?: number
      unidade?: PublicEnums['unidade']
      updated_at?: string
    }
    Update: {
      ativo?: boolean
      categoria_id?: string
      codigo?: string
      codigo_barras?: string | null
      cest_padrao?: string | null
      created_at?: string
      descricao?: string | null
      estoque_minimo?: number
      id?: string
      nome?: string
      preco_unitario?: number
      unidade?: PublicEnums['unidade']
      updated_at?: string
    }
    Relationships: [
      {
        foreignKeyName: 'materiais_categoria_id_fkey'
        columns: ['categoria_id']
        isOneToOne: false
        referencedRelation: 'categorias'
        referencedColumns: ['id']
      },
    ]
  }
  produto_fornecedor: {
    Row: {
      cprod: string | null
      created_at: string
      fornecedor_id: string | null
      gtin: string | null
      id: string
      material_id: string
      unidade_compra: string | null
      updated_at: string
    }
    Insert: {
      cprod?: string | null
      created_at?: string
      fornecedor_id?: string | null
      gtin?: string | null
      id?: string
      material_id: string
      unidade_compra?: string | null
      updated_at?: string
    }
    Update: {
      cprod?: string | null
      created_at?: string
      fornecedor_id?: string | null
      gtin?: string | null
      id?: string
      material_id?: string
      unidade_compra?: string | null
      updated_at?: string
    }
    Relationships: [
      {
        foreignKeyName: 'produto_fornecedor_fornecedor_id_fkey'
        columns: ['fornecedor_id']
        isOneToOne: false
        referencedRelation: 'fornecedores'
        referencedColumns: ['id']
      },
      {
        foreignKeyName: 'produto_fornecedor_material_id_fkey'
        columns: ['material_id']
        isOneToOne: false
        referencedRelation: 'materiais'
        referencedColumns: ['id']
      },
    ]
  }
}
