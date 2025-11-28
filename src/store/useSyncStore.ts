import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

export interface PendingOrder {
    id: string
    orderData: any
    timestamp: number
}

interface SyncStore {
    pendingOrders: PendingOrder[]
    isOnline: boolean
    addPendingOrder: (order: any) => void
    removePendingOrder: (id: string) => void
    setOnlineStatus: (status: boolean) => void
    getPendingCount: () => number
}

export const useSyncStore = create<SyncStore>()(
    persist(
        (set, get) => ({
            pendingOrders: [],
            isOnline: true,

            addPendingOrder: (order) => {
                const pendingOrder: PendingOrder = {
                    id: crypto.randomUUID(),
                    orderData: order,
                    timestamp: Date.now()
                }
                set((state) => ({
                    pendingOrders: [...state.pendingOrders, pendingOrder]
                }))
            },

            removePendingOrder: (id) => {
                set((state) => ({
                    pendingOrders: state.pendingOrders.filter(o => o.id !== id)
                }))
            },

            setOnlineStatus: (status) => set({ isOnline: status }),

            getPendingCount: () => get().pendingOrders.length
        }),
        {
            name: 'pos-sync-storage',
            storage: createJSONStorage(() => localStorage),
        }
    )
)
