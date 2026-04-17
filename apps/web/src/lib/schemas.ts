import { z } from 'zod'

// ─── Auth ────────────────────────────────────────────────
export const loginSchema = z.object({
  email: z.string().email('E-mail inválido'),
  password: z.string().min(6, 'Senha deve ter no mínimo 6 caracteres'),
})
export type LoginInput = z.infer<typeof loginSchema>

export const signupSchema = z
  .object({
    nome: z.string().min(2, 'Nome deve ter no mínimo 2 caracteres'),
    email: z.string().email('E-mail inválido'),
    password: z.string().min(8, 'Senha deve ter no mínimo 8 caracteres'),
    confirmPassword: z.string().min(1, 'Confirme sua senha'),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: 'Senhas não coincidem',
    path: ['confirmPassword'],
  })
export type SignupInput = z.infer<typeof signupSchema>

// ─── Helpers ────────────────────────────────────────────
const emptyToUndefined = (v: unknown) => (typeof v === 'string' && v.trim() === '' ? undefined : v)

/**
 * Validates a Brazilian CNPJ number.
 * Accepts formats: 00.000.000/0000-00 or 00000000000000 (14 digits).
 */
export function isValidCNPJ(value: string): boolean {
  const digits = value.replace(/\D/g, '')
  if (digits.length !== 14) return false
  // Reject all-same-digit CNPJs (e.g. 00000000000000)
  if (/^(\d)\1{13}$/.test(digits)) return false

  const calc = (mod: number) => {
    let sum = 0
    let weight = mod - 7
    for (let i = 0; i < mod; i++) {
      sum += Number(digits[i]) * weight
      weight = weight === 2 ? 9 : weight - 1
    }
    const rem = sum % 11
    return rem < 2 ? 0 : 11 - rem
  }

  return calc(12) === Number(digits[12]) && calc(13) === Number(digits[13])
}

// ─── Obra ────────────────────────────────────────────────
export const createObraSchema = z.object({
  nome: z.string().min(2, 'Nome deve ter no mínimo 2 caracteres'),
  endereco: z.string().min(5, 'Endereço deve ter no mínimo 5 caracteres'),
  status: z.enum(['ATIVA', 'FINALIZADA', 'PAUSADA', 'VENDIDO', 'TERRENO']).default('ATIVA'),
  orcamento: z.number().min(0, 'Orçamento deve ser positivo').default(0),
  valorTerreno: z.number().min(1, 'Valor do terreno é obrigatório'),
  valorBurocracia: z.number().min(0, 'Valor deve ser positivo').default(0),
  valorConstrucao: z.number().min(0, 'Valor deve ser positivo').default(0),
  dataInicio: z.preprocess(emptyToUndefined, z.string().optional()),
  dataPrevisaoTermino: z.preprocess(emptyToUndefined, z.string().optional()),
  responsavel: z.preprocess(emptyToUndefined, z.string().optional()),
  cliente: z.preprocess(emptyToUndefined, z.string().optional()),
  areaTotal: z.preprocess(
    (v) => (v === '' || v === undefined || v === null ? undefined : v),
    z.number().nonnegative('Área deve ser positiva').optional(),
  ),
  observacoes: z.preprocess(emptyToUndefined, z.string().optional()),
})
export type CreateObraInput = z.infer<typeof createObraSchema>

// ─── Material ────────────────────────────────────────────
export const createMaterialSchema = z.object({
  nome: z.string().min(2, 'Nome deve ter no mínimo 2 caracteres'),
  codigo: z.string().min(1, 'Código é obrigatório'),
  categoriaId: z.string().uuid('ID da categoria inválido'),
  unidade: z.string().min(1, 'Selecione a unidade de medida'),
  estoqueMinimo: z.number().nonnegative('Estoque mínimo não pode ser negativo').default(0),
})
export type CreateMaterialInput = z.infer<typeof createMaterialSchema>

// ─── Fornecedor ──────────────────────────────────────────
export const createFornecedorSchema = z.object({
  nome: z.string().min(2, 'Nome deve ter no mínimo 2 caracteres'),
  cnpj: z.preprocess(
    emptyToUndefined,
    z
      .string()
      .refine((v) => isValidCNPJ(v), 'CNPJ inválido — verifique os dígitos')
      .optional(),
  ),
  telefone: z.preprocess(emptyToUndefined, z.string().optional()),
  email: z.preprocess(emptyToUndefined, z.string().email('Email inválido').optional()),
  endereco: z.preprocess(emptyToUndefined, z.string().optional()),
  observacao: z.preprocess(emptyToUndefined, z.string().optional()),
  nomeFantasia: z.preprocess(emptyToUndefined, z.string().optional()),
  inscricaoEstadual: z.preprocess(emptyToUndefined, z.string().optional()),
  cidade: z.preprocess(emptyToUndefined, z.string().optional()),
  estado: z.preprocess(
    emptyToUndefined,
    z.string().max(2, 'Use a sigla do estado (ex: SP)').optional(),
  ),
})
export type CreateFornecedorInput = z.infer<typeof createFornecedorSchema>

// ─── Financeiro — Movimentação ────────────────────────────
export const createMovimentacaoSchema = z.object({
  tipo: z.enum(['ENTRADA', 'SAIDA', 'TRANSFERENCIA']),
  subconta: z.enum(['CAIXA', 'APLICADO']),
  motivo: z.string().min(1, 'Motivo é obrigatório'),
  valor: z
    .number({ invalid_type_error: 'Informe um valor' })
    .positive('Valor deve ser maior que zero')
    .finite('Valor inválido')
    .max(999_999_999, 'Valor máximo excedido'),
  data: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data inválida'),
  transferenciaDestinoId: z.string().nullable().default(null),
})
export type CreateMovimentacaoInput = z.infer<typeof createMovimentacaoSchema>

// ─── Financeiro — Nova Conta Bancária ─────────────────────
export const createFinanceiroContaSchema = z.object({
  banco: z.string().min(2, 'Nome do banco obrigatório (mín. 2 caracteres)'),
  agencia: z.preprocess(
    emptyToUndefined,
    z
      .string()
      .regex(/^\d{1,6}(-\d{1,2})?$/, 'Formato inválido — ex: 0001 ou 0001-5')
      .optional(),
  ),
  numeroConta: z.preprocess(emptyToUndefined, z.string().optional()),
  valorInicial: z.number().min(0, 'Saldo inicial não pode ser negativo').default(0),
  subconta: z.enum(['CAIXA', 'APLICADO']).default('CAIXA'),
  tipo: z.enum(['Corrente', 'Poupança', 'Investimento']).default('Corrente'),
})
export type CreateFinanceiroContaInput = z.infer<typeof createFinanceiroContaSchema>

// ─── Financeiro — Conta a Pagar ──────────────────────────
export const createContaPagarSchema = z.object({
  descricao: z.string().min(2, 'Descrição obrigatória (mín. 2 caracteres)'),
  categoria: z.string().min(1, 'Selecione uma categoria'),
  obraId: z.preprocess(emptyToUndefined, z.string().optional()),
  observacoes: z.preprocess(emptyToUndefined, z.string().optional()),
  valor: z
    .number({ invalid_type_error: 'Informe o valor' })
    .positive('Valor deve ser maior que zero')
    .finite('Valor inválido')
    .max(999_999_999, 'Valor máximo excedido'),
  vencimento: z.string().min(1, 'Data de vencimento obrigatória'),
  nParcelas: z.number().int().min(1).max(60).default(1),
})
export type CreateContaPagarInput = z.infer<typeof createContaPagarSchema>

// ─── Financeiro — Conta a Receber ────────────────────────
export const createContaReceberSchema = z.object({
  descricao: z.string().min(2, 'Descrição obrigatória (mín. 2 caracteres)'),
  cliente: z.preprocess(emptyToUndefined, z.string().optional()),
  obraId: z.preprocess(emptyToUndefined, z.string().optional()),
  observacoes: z.preprocess(emptyToUndefined, z.string().optional()),
  valor: z
    .number({ invalid_type_error: 'Informe o valor' })
    .positive('Valor deve ser maior que zero')
    .finite('Valor inválido')
    .max(999_999_999, 'Valor máximo excedido'),
  vencimento: z.string().min(1, 'Data de vencimento obrigatória'),
  nParcelas: z.number().int().min(1).max(60).default(1),
})
export type CreateContaReceberInput = z.infer<typeof createContaReceberSchema>

// ─── Usuário (Admin Panel) ────────────────────────────────
export const inviteUsuarioSchema = z.object({
  nome: z.string().min(2, 'Nome deve ter no mínimo 2 caracteres'),
  email: z.string().email('E-mail inválido'),
  role: z.enum(['ADMIN', 'GESTOR', 'ALMOXARIFE', 'VISUALIZADOR']),
})
export type InviteUsuarioInput = z.infer<typeof inviteUsuarioSchema>

export const updateUsuarioSchema = z.object({
  nome: z.string().min(2, 'Nome deve ter no mínimo 2 caracteres'),
  role: z.enum(['ADMIN', 'GESTOR', 'ALMOXARIFE', 'VISUALIZADOR']),
  ativo: z.boolean(),
})
export type UpdateUsuarioInput = z.infer<typeof updateUsuarioSchema>
