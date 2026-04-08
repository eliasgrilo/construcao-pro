export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export interface InternalSupabase {
  PostgrestVersion: 'XX'
}

export type PublicEnums = {
  role: 'ADMIN' | 'GESTOR' | 'ALMOXARIFE' | 'VISUALIZADOR'
  status_nf: 'PENDENTE' | 'PROCESSADA' | 'VINCULADA' | 'REJEITADA'
  status_obra: 'ATIVA' | 'FINALIZADA' | 'PAUSADA' | 'VENDIDO' | 'TERRENO' | 'MANUTENCAO'
  status_transferencia: 'PENDENTE' | 'APROVADA_NIVEL_1' | 'APROVADA' | 'REJEITADA'
  tipo_movimentacao: 'ENTRADA' | 'SAIDA' | 'TRANSFERENCIA'
  unidade:
    | 'UN'
    | 'KG'
    | 'M'
    | 'M2'
    | 'M3'
    | 'L'
    | 'CX'
    | 'PC'
    | 'SC'
    | 'TB'
    | 'GL'
    | 'FD'
    | 'RL'
    | 'PR'
}
