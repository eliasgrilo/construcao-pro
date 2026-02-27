import { z } from 'zod'

// ─── Auth ────────────────────────────────────────────────
export const loginSchema = z.object({
  email: z.string().email('E-mail inválido'),
  password: z.string().min(6, 'Senha deve ter no mínimo 6 caracteres'),
})
export type LoginInput = z.infer<typeof loginSchema>

// ─── Obra ────────────────────────────────────────────────
export const createObraSchema = z.object({
  nome: z.string().min(2, 'Nome deve ter no mínimo 2 caracteres'),
  endereco: z.string().min(5, 'Endereço deve ter no mínimo 5 caracteres'),
  status: z.enum(['ATIVA', 'FINALIZADA', 'PAUSADA', 'VENDIDO', 'TERRENO']).default('ATIVA'),
  orcamento: z.number().min(0, 'Orçamento deve ser positivo').default(0),
  valorTerreno: z.number().min(0, 'Valor deve ser positivo').default(0),
  valorBurocracia: z.number().min(0, 'Valor deve ser positivo').default(0),
  valorConstrucao: z.number().min(0, 'Valor deve ser positivo').default(0),
})
export type CreateObraInput = z.infer<typeof createObraSchema>

// ─── Material ────────────────────────────────────────────
export const createMaterialSchema = z.object({
  nome: z.string().min(2, 'Nome deve ter no mínimo 2 caracteres'),
  codigo: z.string().min(1, 'Código é obrigatório'),
  categoriaId: z.string().uuid('ID da categoria inválido'),
  estoqueMinimo: z.number().nonnegative('Estoque mínimo não pode ser negativo').default(0),
  precoUnitario: z.number().nonnegative('Preço não pode ser negativo').default(0),
  descricao: z.string().optional(),
  codigoBarras: z.string().optional(),
})
export type CreateMaterialInput = z.infer<typeof createMaterialSchema>

// ─── Fornecedor ──────────────────────────────────────────
export const createFornecedorSchema = z.object({
  nome: z.string().min(2, 'Nome deve ter no mínimo 2 caracteres'),
  cnpj: z.string().optional(),
  telefone: z.string().optional(),
  email: z.string().email('Email inválido').optional().or(z.literal('')),
  endereco: z.string().optional(),
  observacao: z.string().optional(),
})
export type CreateFornecedorInput = z.infer<typeof createFornecedorSchema>
