import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

export interface CartModifier {
    id: string
    name: string
    price: number
}

export interface CartItem {
    productId: string
    productName: string
    variantId?: string
    variantName?: string
    quantity: number
    basePrice: number
    variantPrice: number
    modifiers: CartModifier[]
    subtotal: number
}

interface CartStore {
    items: CartItem[]
    loyaltyPhone: string | null
    addItem: (item: Omit<CartItem, 'subtotal'>) => void
    updateQuantity: (index: number, quantity: number) => void
    removeItem: (index: number) => void
    clearCart: () => void
    setLoyaltyPhone: (phone: string | null) => void
    getTotal: () => number
    getSubtotal: () => number
    getTax: () => number
}

const TAX_RATE = Number(process.env.NEXT_PUBLIC_TAX_RATE) || 0.10

export const useCartStore = create<CartStore>()(
    persist(
        (set, get) => ({
            items: [],
            loyaltyPhone: null,

            addItem: (item) => {
                const subtotal =
                    (item.basePrice + item.variantPrice +
                        item.modifiers.reduce((sum, m) => sum + m.price, 0)) * item.quantity

                set((state) => ({
                    items: [...state.items, { ...item, subtotal }]
                }))
            },

            updateQuantity: (index, quantity) => {
                set((state) => {
                    const items = [...state.items]
                    if (quantity <= 0) {
                        items.splice(index, 1)
                    } else {
                        const item = items[index]
                        const unitPrice =
                            item.basePrice + item.variantPrice +
                            item.modifiers.reduce((sum, m) => sum + m.price, 0)
                        items[index] = { ...item, quantity, subtotal: unitPrice * quantity }
                    }
                    return { items }
                })
            },

            removeItem: (index) => {
                set((state) => ({
                    items: state.items.filter((_, i) => i !== index)
                }))
            },

            clearCart: () => set({ items: [], loyaltyPhone: null }),

            setLoyaltyPhone: (phone) => set({ loyaltyPhone: phone }),

            getSubtotal: () => {
                return get().items.reduce((sum, item) => sum + item.subtotal, 0)
            },

            getTax: () => {
                return get().getSubtotal() * TAX_RATE
            },

            getTotal: () => {
                return get().getSubtotal() + get().getTax()
            }
        }),
        {
            name: 'pos-cart-storage',
            storage: createJSONStorage(() => localStorage),
        }
    )
)
