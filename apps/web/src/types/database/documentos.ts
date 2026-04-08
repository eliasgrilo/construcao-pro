export type DocumentosTables = {
  documento_categorias: {
    Row: {
      cor: string
      created_at: string
      icone: string
      id: string
      nome: string
    }
    Insert: {
      cor?: string
      created_at?: string
      icone?: string
      id?: string
      nome: string
    }
    Update: {
      cor?: string
      created_at?: string
      icone?: string
      id?: string
      nome?: string
    }
    Relationships: []
  }
  documentos: {
    Row: {
      categoria_id: string | null
      created_at: string
      descricao: string | null
      id: string
      nome: string
      obra_id: string | null
      storage_path: string
      tamanho: number
      tipo_arquivo: string
      updated_at: string
    }
    Insert: {
      categoria_id?: string | null
      created_at?: string
      descricao?: string | null
      id?: string
      nome: string
      obra_id?: string | null
      storage_path: string
      tamanho?: number
      tipo_arquivo: string
      updated_at?: string
    }
    Update: {
      categoria_id?: string | null
      created_at?: string
      descricao?: string | null
      id?: string
      nome?: string
      obra_id?: string | null
      storage_path?: string
      tamanho?: number
      tipo_arquivo?: string
      updated_at?: string
    }
    Relationships: [
      {
        foreignKeyName: 'documentos_categoria_id_fkey'
        columns: ['categoria_id']
        isOneToOne: false
        referencedRelation: 'documento_categorias'
        referencedColumns: ['id']
      },
      {
        foreignKeyName: 'documentos_obra_id_fkey'
        columns: ['obra_id']
        isOneToOne: false
        referencedRelation: 'obras'
        referencedColumns: ['id']
      },
    ]
  }
}
