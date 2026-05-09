import type { PersistedClient, Persister } from '@tanstack/react-query-persist-client'
import { del, get, set } from 'idb-keyval'

const IDB_KEY = 'construcao-pro-query-cache'

/**
 * TanStack Query persister backed by IndexedDB (via idb-keyval).
 * Allows the app to restore cached data (documentos, categorias, obras, etc.)
 * after being closed and reopened without a network connection.
 *
 * Offline behaviour:
 *  - On first load with no internet: restores last cached state from IDB.
 *  - On reconnect: queries refetch and IDB is updated automatically.
 */
export const idbPersister: Persister = {
  persistClient: async (client: PersistedClient) => {
    await set(IDB_KEY, client)
  },
  restoreClient: async () => {
    return await get<PersistedClient>(IDB_KEY)
  },
  removeClient: async () => {
    await del(IDB_KEY)
  },
}
