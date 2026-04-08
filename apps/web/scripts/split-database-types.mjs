import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'

const inputArg = process.argv[2]

if (!inputArg) {
  console.error('Usage: node apps/web/scripts/split-database-types.mjs <input-file>')
  process.exit(1)
}

const inputPath = resolve(process.cwd(), inputArg)
const outputDir = resolve(process.cwd(), 'apps/web/src/types/database')
const barrelPath = resolve(process.cwd(), 'apps/web/src/types/database.ts')
const source = readFileSync(inputPath, 'utf8').replace(/\r\n/g, '\n')

const TABLE_GROUPS = {
  catalogo: ['categorias', 'fornecedores', 'materiais', 'produto_fornecedor'],
  documentos: ['documento_categorias', 'documentos'],
  financeiro: [
    'contas_pagar',
    'contas_pagar_parcelas',
    'contas_receber',
    'contas_receber_parcelas',
    'financeiro_contas',
    'financeiro_meta',
    'financeiro_movimentacoes',
    'obra_venda_parcelas',
  ],
  obras: [
    'almoxarifados',
    'estoques',
    'movimentacoes',
    'obra_lancamentos_burocracia',
    'obra_manutencao',
    'obra_manutencao_item',
    'obras',
    'usuario_obras',
  ],
  system: ['audit_logs', 'itens_nf', 'nf_match_memoria', 'notas_fiscais', 'tarefas', 'usuarios'],
}

function between(startMarker, endMarker) {
  const start = source.indexOf(startMarker)
  const end = source.indexOf(endMarker)
  if (start === -1 || end === -1 || end <= start) {
    throw new Error(`Could not extract block between "${startMarker}" and "${endMarker}"`)
  }
  return source.slice(start + startMarker.length, end)
}

function countChar(line, char) {
  return [...line].filter((token) => token === char).length
}

function normalizeIndent(block, spacesToTrim = 4) {
  return block
    .split('\n')
    .map((line) => line.slice(Math.min(spacesToTrim, line.match(/^ */)?.[0].length ?? 0)))
    .join('\n')
    .trim()
}

function extractTableBlocks() {
  const tablesBody = between('    Tables: {\n', '    Views: {\n')
  const lines = tablesBody.split('\n')
  const blocks = new Map()

  for (let index = 0; index < lines.length; index += 1) {
    const match = lines[index].match(/^ {6}([a-z_]+): \{$/)
    if (!match) continue

    const tableName = match[1]
    const chunk = []
    let balance = 0

    do {
      const line = lines[index]
      chunk.push(line)
      balance += countChar(line, '{') - countChar(line, '}')
      index += 1
    } while (index < lines.length && balance > 0)

    index -= 1
    blocks.set(tableName, normalizeIndent(chunk.join('\n')))
  }

  return blocks
}

function extractPublicEnumsBlock() {
  return normalizeIndent(between('    Enums: {\n', '    CompositeTypes: {\n')).replace(/\n\}$/, '')
}

function extractFunctionsBlock() {
  return normalizeIndent(
    between('    Functions: {\n', '    Enums: {\n').replaceAll(
      "Database['public']['Enums']",
      'PublicEnums',
    ),
  ).replace(/\n\}$/, '')
}

function extractJsonType() {
  const match = source.match(/^export type Json = .+$/m)
  if (!match) throw new Error('Could not find Json type')
  return match[0]
}

function extractPostgrestVersion() {
  const match = source.match(/PostgrestVersion: '([^']+)'/)
  if (!match) throw new Error('Could not find PostgrestVersion')
  return match[1]
}

function parseEnumValues(enumsBlock) {
  const lines = enumsBlock.split('\n')
  const enums = {}
  let currentName = null
  let currentValues = []

  const flush = () => {
    if (!currentName) return
    enums[currentName] = currentValues
    currentName = null
    currentValues = []
  }

  for (const line of lines) {
    const headerMatch = line.match(/^ {2}([a-z_]+):(.*)$/)
    if (headerMatch) {
      flush()
      currentName = headerMatch[1]
      currentValues = [...headerMatch[2].matchAll(/'([^']+)'/g)].map((match) => match[1])
      continue
    }

    if (currentName) {
      currentValues.push(...[...line.matchAll(/'([^']+)'/g)].map((match) => match[1]))
    }
  }

  flush()
  return enums
}

function writeFile(relativePath, contents) {
  const fullPath = resolve(outputDir, relativePath)
  mkdirSync(dirname(fullPath), { recursive: true })
  writeFileSync(fullPath, `${contents.trim()}\n`)
}

function groupTables(tableBlocks, tableNames) {
  return tableNames.map((name) => {
    const block = tableBlocks.get(name)
    if (!block) throw new Error(`Missing table block for ${name}`)
    return block.replaceAll("Database['public']['Enums']", 'PublicEnums')
  })
}

function createDomainFile(typeName, blocks) {
  const body = blocks.join('\n')
  const imports = []
  if (body.includes('Json')) imports.push('Json')
  if (body.includes('PublicEnums')) imports.push('PublicEnums')
  const importLine = imports.length ? `import type { ${imports.join(', ')} } from './base'\n\n` : ''

  return `${importLine}export type ${typeName} = {\n${body}\n}`
}

const tableBlocks = extractTableBlocks()
const enumsBlock = extractPublicEnumsBlock()
const functionsBlock = extractFunctionsBlock()
const jsonType = extractJsonType()
const postgrestVersion = extractPostgrestVersion()
const enumValues = parseEnumValues(enumsBlock)

mkdirSync(outputDir, { recursive: true })

writeFile(
  'base.ts',
  `${jsonType}

export interface InternalSupabase {
  PostgrestVersion: '${postgrestVersion}'
}

export type PublicEnums = {
${enumsBlock}
}`,
)

writeFile(
  'catalogo.ts',
  createDomainFile('CatalogoTables', groupTables(tableBlocks, TABLE_GROUPS.catalogo)),
)
writeFile(
  'documentos.ts',
  createDomainFile('DocumentosTables', groupTables(tableBlocks, TABLE_GROUPS.documentos)),
)
writeFile(
  'financeiro.ts',
  createDomainFile('FinanceiroTables', groupTables(tableBlocks, TABLE_GROUPS.financeiro)),
)
writeFile('obras.ts', createDomainFile('ObrasTables', groupTables(tableBlocks, TABLE_GROUPS.obras)))
writeFile(
  'system.ts',
  createDomainFile('SystemTables', groupTables(tableBlocks, TABLE_GROUPS.system)),
)

const constantsBody = Object.entries(enumValues)
  .map(([name, values]) => `      ${name}: [${values.map((value) => `'${value}'`).join(', ')}],`)
  .join('\n')

writeFile(
  'schema.ts',
  `import type { InternalSupabase, Json, PublicEnums } from './base'
import type { CatalogoTables } from './catalogo'
import type { DocumentosTables } from './documentos'
import type { FinanceiroTables } from './financeiro'
import type { ObrasTables } from './obras'
import type { SystemTables } from './system'

export type PublicFunctions = {
${functionsBlock}
}

export type Database = {
  __InternalSupabase: InternalSupabase
  public: {
    Tables: CatalogoTables & DocumentosTables & FinanceiroTables & ObrasTables & SystemTables
    Views: {
      [_ in never]: never
    }
    Functions: PublicFunctions
    Enums: PublicEnums
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof DatabaseWithoutInternals, 'public'>]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    ? (DefaultSchema['Tables'] & DefaultSchema['Views'])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema['Tables']
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema['Tables']
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema['Enums']
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums']
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums'][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema['Enums']
    ? DefaultSchema['Enums'][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema['CompositeTypes']
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes']
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes'][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema['CompositeTypes']
    ? DefaultSchema['CompositeTypes'][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
${constantsBody}
    },
  },
} as const`,
)

writeFileSync(
  barrelPath,
  `export type { Json } from './database/base'
export { Constants } from './database/schema'
export type {
  CompositeTypes,
  Database,
  Enums,
  Tables,
  TablesInsert,
  TablesUpdate,
} from './database/schema'
`,
)
