import { type Role, useAuthStore } from '@/stores/auth-store'
import { useCallback, useMemo } from 'react'
import { useShallow } from 'zustand/react/shallow'

// Stable empty array — used for restricted users with zero obra assignments.
// Module-level ensures the same reference is returned on every render,
// preventing obraIdSet from being recreated unnecessarily.
const EMPTY_OBRA_IDS: string[] = []

/** Hierarchy: ADMIN > GESTOR > ALMOXARIFE > VISUALIZADOR */
const ROLE_LEVEL: Record<Role, number> = {
  ADMIN: 4,
  GESTOR: 3,
  ALMOXARIFE: 2,
  VISUALIZADOR: 1,
}

export interface Permissions {
  role: Role | null
  /** True when user has ADMIN role */
  isAdmin: boolean
  /** True when user has GESTOR or ADMIN role */
  isGestorOrAbove: boolean
  /** True when user has ALMOXARIFE, GESTOR, or ADMIN role */
  isAlmoxarifeOrAbove: boolean
  /** True when user has VISUALIZADOR role (read-only) */
  isReadOnly: boolean

  // ── Granular action checks ──
  /** Can create/edit/delete estoque movements (entrada, saída, baixa, transferência) */
  canManageEstoque: boolean
  /** Can create/edit/delete financial records */
  canManageFinanceiro: boolean
  /** Can create/edit/delete materiais and categorias */
  canManageMateriais: boolean
  /** Can manage notas fiscais */
  canManageNotasFiscais: boolean
  /** Can manage fornecedores */
  canManageFornecedores: boolean
  /** Can manage documentação */
  canManageDocumentos: boolean
  /** Can manage obras (create, edit status, add manutenção) */
  canManageObras: boolean
  /** Can manage users (admin panel) */
  canManageUsers: boolean
  /** Can see financeiro page */
  canViewFinanceiro: boolean

  // ── Obra-level access ──
  /**
   * Obra IDs the user is assigned to, or null if user has unrestricted access
   * (ADMIN and GESTOR see all obras).
   */
  allowedObraIds: string[] | null
  /** Returns true if user can access a specific obra */
  hasObraAccess: (obraId: string) => boolean
  /** Filters an array of items to only those the user can access */
  filterByObra: <T extends { obra_id?: string | null }>(items: T[]) => T[]
}

export function usePermissions(): Permissions {
  // useShallow prevents new array/object references from triggering re-renders
  // when the store value hasn't actually changed.
  const { role, obraIds } = useAuthStore(
    useShallow((s) => ({
      role: s.user?.role ?? null,
      obraIds: s.user?.obraIds ?? null,
    })),
  )

  const level = role ? ROLE_LEVEL[role] : 0
  const isAdmin = level >= ROLE_LEVEL.ADMIN
  const isGestorOrAbove = level >= ROLE_LEVEL.GESTOR
  const isAlmoxarifeOrAbove = level >= ROLE_LEVEL.ALMOXARIFE
  const isReadOnly = level <= ROLE_LEVEL.VISUALIZADOR

  // ADMIN and GESTOR have unrestricted obra access (null = see all).
  // Restricted roles use their assigned IDs, falling back to a stable empty
  // array so users with zero assignments see nothing rather than everything.
  const allowedObraIds = isGestorOrAbove ? null : (obraIds ?? EMPTY_OBRA_IDS)

  const obraIdSet = useMemo(
    () => (allowedObraIds ? new Set(allowedObraIds) : null),
    [allowedObraIds],
  )

  const hasObraAccess = useCallback(
    (obraId: string) => {
      if (!obraIdSet) return true // unrestricted
      return obraIdSet.has(obraId)
    },
    [obraIdSet],
  )

  const filterByObra = useCallback(
    <T extends { obra_id?: string | null }>(items: T[]): T[] => {
      if (!obraIdSet) return items // unrestricted
      return items.filter((item) => item.obra_id && obraIdSet.has(item.obra_id))
    },
    [obraIdSet],
  )

  return useMemo(
    () => ({
      role,
      isAdmin,
      isGestorOrAbove,
      isAlmoxarifeOrAbove,
      isReadOnly,

      canManageEstoque: isAlmoxarifeOrAbove,
      canManageFinanceiro: isGestorOrAbove,
      canManageMateriais: isAlmoxarifeOrAbove,
      canManageNotasFiscais: isAlmoxarifeOrAbove,
      canManageFornecedores: isAlmoxarifeOrAbove,
      canManageDocumentos: isAlmoxarifeOrAbove,
      canManageObras: isGestorOrAbove,
      canManageUsers: isAdmin,
      canViewFinanceiro: isGestorOrAbove,

      allowedObraIds,
      hasObraAccess,
      filterByObra,
    }),
    [
      role,
      isAdmin,
      isGestorOrAbove,
      isAlmoxarifeOrAbove,
      isReadOnly,
      allowedObraIds,
      hasObraAccess,
      filterByObra,
    ],
  )
}
