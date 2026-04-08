export type BaixaTarget = {
  materialId: string
  materialNome: string
  materialCodigo: string
  almoxarifadoId: string
  almoxarifadoNome: string
  obraNome: string
  quantidadeDisponivel: number
  unidade: string
  precoUnitario: number
}

export type TransferTarget = {
  materialId: string
  materialNome: string
  almoxarifadoId: string
  almoxarifadoNome: string
  quantidadeDisponivel: number
  unidade: string
}

export type DeleteTarget = {
  id: string
  materialId: string
  materialNome: string
  almoxarifadoId: string
  almoxarifadoNome: string
  quantidade: number
  unidade: string
  precoUnitario: number
}

export type AlmoxSelectItem = {
  id: string
  nome: string
  obra?: { id: string; nome: string } | null
}

export type AlmoxByObraGroup = [
  string,
  {
    obraNome: string
    almoxs: AlmoxSelectItem[]
  },
]
