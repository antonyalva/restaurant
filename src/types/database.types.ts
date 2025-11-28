export interface Database {
    public: {
        Tables: {
            profiles: {
                Row: {
                    id: string
                    email: string
                    full_name: string | null
                    role: 'admin' | 'cashier'
                    created_at: string
                    updated_at: string
                }
                Insert: {
                    id: string
                    email: string
                    full_name?: string | null
                    role?: 'admin' | 'cashier'
                    created_at?: string
                    updated_at?: string
                }
                Update: {
                    id?: string
                    email?: string
                    full_name?: string | null
                    role?: 'admin' | 'cashier'
                    created_at?: string
                    updated_at?: string
                }
            }
            categories: {
                Row: {
                    id: string
                    name: string
                    icon: string | null
                    sort_order: number
                    created_at: string
                }
            }
            products: {
                Row: {
                    id: string
                    name: string
                    description: string | null
                    base_price: number
                    category_id: string | null
                    image_url: string | null
                    is_active: boolean
                    created_at: string
                    updated_at: string
                }
            }
            orders: {
                Row: {
                    id: string
                    order_number: string
                    cashier_id: string | null
                    total: number
                    subtotal: number
                    tax: number
                    payment_method: 'cash' | 'card' | 'qr'
                    amount_paid: number | null
                    change_amount: number
                    loyalty_phone: string | null
                    synced: boolean
                    created_at: string
                }
            }
        }
    }
}
