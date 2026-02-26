export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
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
            foreignKeyName: "almoxarifados_obra_id_fkey"
            columns: ["obra_id"]
            isOneToOne: false
            referencedRelation: "obras"
            referencedColumns: ["id"]
          },
        ]
      }
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
            foreignKeyName: "audit_logs_usuario_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      categorias: {
        Row: {
          created_at: string
          id: string
          nome: string
          unidade: Database["public"]["Enums"]["unidade"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          nome: string
          unidade: Database["public"]["Enums"]["unidade"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          nome?: string
          unidade?: Database["public"]["Enums"]["unidade"]
          updated_at?: string
        }
        Relationships: []
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
            foreignKeyName: "estoques_almoxarifado_id_fkey"
            columns: ["almoxarifado_id"]
            isOneToOne: false
            referencedRelation: "almoxarifados"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "estoques_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "materiais"
            referencedColumns: ["id"]
          },
        ]
      }
      fornecedores: {
        Row: {
          ativo: boolean
          cnpj: string | null
          created_at: string
          email: string | null
          endereco: string | null
          id: string
          nome: string
          observacao: string | null
          telefone: string | null
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          cnpj?: string | null
          created_at?: string
          email?: string | null
          endereco?: string | null
          id?: string
          nome: string
          observacao?: string | null
          telefone?: string | null
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          cnpj?: string | null
          created_at?: string
          email?: string | null
          endereco?: string | null
          id?: string
          nome?: string
          observacao?: string | null
          telefone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      itens_nf: {
        Row: {
          cfop: string | null
          descricao: string
          id: string
          material_id: string | null
          ncm: string | null
          nf_id: string
          quantidade: number
          unidade: string
          valor_total: number
          valor_unitario: number
        }
        Insert: {
          cfop?: string | null
          descricao: string
          id?: string
          material_id?: string | null
          ncm?: string | null
          nf_id: string
          quantidade: number
          unidade: string
          valor_total: number
          valor_unitario: number
        }
        Update: {
          cfop?: string | null
          descricao?: string
          id?: string
          material_id?: string | null
          ncm?: string | null
          nf_id?: string
          quantidade?: number
          unidade?: string
          valor_total?: number
          valor_unitario?: number
        }
        Relationships: [
          {
            foreignKeyName: "itens_nf_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "materiais"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "itens_nf_nf_id_fkey"
            columns: ["nf_id"]
            isOneToOne: false
            referencedRelation: "notas_fiscais"
            referencedColumns: ["id"]
          },
        ]
      }
      materiais: {
        Row: {
          categoria_id: string
          codigo: string
          codigo_barras: string | null
          created_at: string
          descricao: string | null
          estoque_minimo: number
          id: string
          nome: string
          preco_unitario: number
          updated_at: string
        }
        Insert: {
          categoria_id: string
          codigo: string
          codigo_barras?: string | null
          created_at?: string
          descricao?: string | null
          estoque_minimo?: number
          id?: string
          nome: string
          preco_unitario?: number
          updated_at?: string
        }
        Update: {
          categoria_id?: string
          codigo?: string
          codigo_barras?: string | null
          created_at?: string
          descricao?: string | null
          estoque_minimo?: number
          id?: string
          nome?: string
          preco_unitario?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "materiais_categoria_id_fkey"
            columns: ["categoria_id"]
            isOneToOne: false
            referencedRelation: "categorias"
            referencedColumns: ["id"]
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
          status_transferencia:
            | Database["public"]["Enums"]["status_transferencia"]
            | null
          tipo: Database["public"]["Enums"]["tipo_movimentacao"]
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
          status_transferencia?:
            | Database["public"]["Enums"]["status_transferencia"]
            | null
          tipo: Database["public"]["Enums"]["tipo_movimentacao"]
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
          status_transferencia?:
            | Database["public"]["Enums"]["status_transferencia"]
            | null
          tipo?: Database["public"]["Enums"]["tipo_movimentacao"]
          unidade?: string | null
          usuario_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "movimentacoes_almoxarifado_destino_id_fkey"
            columns: ["almoxarifado_destino_id"]
            isOneToOne: false
            referencedRelation: "almoxarifados"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "movimentacoes_almoxarifado_id_fkey"
            columns: ["almoxarifado_id"]
            isOneToOne: false
            referencedRelation: "almoxarifados"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "movimentacoes_fornecedor_id_fkey"
            columns: ["fornecedor_id"]
            isOneToOne: false
            referencedRelation: "fornecedores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "movimentacoes_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "materiais"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "movimentacoes_nf_id_fkey"
            columns: ["nf_id"]
            isOneToOne: false
            referencedRelation: "notas_fiscais"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "movimentacoes_usuario_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
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
          id: string
          numero: string
          serie: string
          status: Database["public"]["Enums"]["status_nf"]
          updated_at: string
          valor_total: number
          xml_url: string | null
        }
        Insert: {
          chave_acesso: string
          cnpj_destinatario?: string | null
          cnpj_emitente: string
          created_at?: string
          data_emissao: string
          id?: string
          numero: string
          serie: string
          status?: Database["public"]["Enums"]["status_nf"]
          updated_at?: string
          valor_total: number
          xml_url?: string | null
        }
        Update: {
          chave_acesso?: string
          cnpj_destinatario?: string | null
          cnpj_emitente?: string
          created_at?: string
          data_emissao?: string
          id?: string
          numero?: string
          serie?: string
          status?: Database["public"]["Enums"]["status_nf"]
          updated_at?: string
          valor_total?: number
          xml_url?: string | null
        }
        Relationships: []
      }
      obras: {
        Row: {
          created_at: string
          endereco: string
          id: string
          nome: string
          orcamento: number
          status: Database["public"]["Enums"]["status_obra"]
          updated_at: string
          valor_terreno: number
          valor_burocracia: number
          valor_construcao: number
          valor_venda: number
        }
        Insert: {
          created_at?: string
          endereco: string
          id?: string
          nome: string
          orcamento?: number
          status?: Database["public"]["Enums"]["status_obra"]
          updated_at?: string
          valor_terreno?: number
          valor_burocracia?: number
          valor_construcao?: number
          valor_venda?: number
        }
        Update: {
          created_at?: string
          endereco?: string
          id?: string
          nome?: string
          orcamento?: number
          status?: Database["public"]["Enums"]["status_obra"]
          updated_at?: string
          valor_terreno?: number
          valor_burocracia?: number
          valor_construcao?: number
          valor_venda?: number
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
            foreignKeyName: "usuario_obras_obra_id_fkey"
            columns: ["obra_id"]
            isOneToOne: false
            referencedRelation: "obras"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "usuario_obras_usuario_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      usuarios: {
        Row: {
          ativo: boolean
          created_at: string
          email: string
          id: string
          nome: string
          role: Database["public"]["Enums"]["role"]
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          email: string
          id: string
          nome?: string
          role?: Database["public"]["Enums"]["role"]
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          email?: string
          id?: string
          nome?: string
          role?: Database["public"]["Enums"]["role"]
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      aprovar_transferencia: {
        Args: { p_movimentacao_id: string }
        Returns: Json
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
      criar_movimentacao_entrada: {
        Args: {
          p_almoxarifado_id: string
          p_forma_pagamento?: string
          p_fornecedor_id?: string
          p_material_id: string
          p_nf_id?: string
          p_observacao?: string
          p_preco_unitario: number
          p_quantidade: number
          p_unidade?: string
        }
        Returns: Json
      }
      criar_movimentacao_saida: {
        Args: {
          p_almoxarifado_id: string
          p_material_id: string
          p_observacao?: string
          p_preco_unitario: number
          p_quantidade: number
          p_unidade?: string
        }
        Returns: Json
      }
      criar_movimentacao_transferencia: {
        Args: {
          p_almoxarifado_destino_id: string
          p_almoxarifado_id: string
          p_material_id: string
          p_observacao?: string
          p_quantidade: number
          p_unidade?: string
        }
        Returns: Json
      }
      get_custo_por_obra: { Args: Record<PropertyKey, never>; Returns: Json }
      get_dashboard_stats: { Args: Record<PropertyKey, never>; Returns: Json }
      get_estoque_alertas: { Args: Record<PropertyKey, never>; Returns: Json }
      get_movimentacoes_recentes: { Args: { p_limit?: number }; Returns: Json }
      get_my_role: { Args: Record<PropertyKey, never>; Returns: Database["public"]["Enums"]["role"] }
      get_obra_custos: { Args: { p_obra_id: string }; Returns: Json }
      has_obra_access: { Args: { p_obra_id: string }; Returns: boolean }
      is_admin: { Args: Record<PropertyKey, never>; Returns: boolean }
      is_almoxarife_or_above: { Args: Record<PropertyKey, never>; Returns: boolean }
      is_gestor_or_above: { Args: Record<PropertyKey, never>; Returns: boolean }
      rejeitar_transferencia: {
        Args: { p_movimentacao_id: string }
        Returns: Json
      }
    }
    Enums: {
      role: "ADMIN" | "GESTOR" | "ALMOXARIFE" | "VISUALIZADOR"
      status_nf: "PENDENTE" | "PROCESSADA" | "VINCULADA" | "REJEITADA"
      status_obra: "ATIVA" | "FINALIZADA" | "PAUSADA" | "VENDIDO" | "TERRENO"
      status_transferencia:
        | "PENDENTE"
        | "APROVADA_NIVEL_1"
        | "APROVADA"
        | "REJEITADA"
      tipo_movimentacao: "ENTRADA" | "SAIDA" | "TRANSFERENCIA"
      unidade:
        | "UN"
        | "KG"
        | "M"
        | "M2"
        | "M3"
        | "L"
        | "CX"
        | "PC"
        | "SC"
        | "TB"
        | "GL"
        | "FD"
        | "RL"
        | "PR"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never
