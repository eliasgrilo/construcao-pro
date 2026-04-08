import { create } from 'zustand'

export type RealtimeStatus = 'CONNECTED' | 'RECONNECTING' | 'DISCONNECTED'

interface RealtimeStore {
  status: RealtimeStatus
  setStatus: (s: RealtimeStatus) => void
}

export const useRealtimeStore = create<RealtimeStore>((set) => ({
  // Start as RECONNECTING — the dot turns green only after the channel confirms SUBSCRIBED
  status: 'RECONNECTING',
  setStatus: (status) => set({ status }),
}))
