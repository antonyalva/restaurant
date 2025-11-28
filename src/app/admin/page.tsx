'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Separator } from '@/components/ui/separator'
import {
    TrendingUp,
    DollarSign,
    Package,
    AlertTriangle,
    Coffee,
    LogOut,
    Calendar,
    Users,
    Eye
} from 'lucide-react'

interface DashboardStats {
    todayRevenue: number
    todayOrders: number
    lowStockItems: number
    topProducts: Array<{
        name: string
        quantity: number
        revenue: number
    }>
    recentOrders: Array<{
        id: string
        order_number: string
        total: number
        subtotal: number
        tax: number
        created_at: string
        payment_method: string
        amount_paid: number | null
        change_amount: number
    }>
}

interface OrderDetail {
    id: string
    order_number: string
    total: number
    subtotal: number
    tax: number
    payment_method: string
    amount_paid: number | null
    change_amount: number
    created_at: string
    order_items: Array<{
        id: string
        quantity: number
        unit_price: number
        subtotal: number
        product: {
            name: string
        }
        variant?: {
            name: string
        }
    }>
}

export default function AdminPage() {
    const router = useRouter()
    const [stats, setStats] = useState<DashboardStats>({
        todayRevenue: 0,
        todayOrders: 0,
        lowStockItems: 0,
        topProducts: [],
        recentOrders: []
    })
    const [loading, setLoading] = useState(true)
    const [selectedOrder, setSelectedOrder] = useState<OrderDetail | null>(null)
    const [showOrderDetail, setShowOrderDetail] = useState(false)

    useEffect(() => {
        checkAuth()
        loadDashboardData()
    }, [])

    const checkAuth = async () => {
        const { data } = await supabase.auth.getSession()
        if (!data.session) {
            router.push('/login')
            return
        }

        const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', data.session.user.id)
            .single()

        if (profile?.role !== 'admin') {
            router.push('/pos')
        }
    }

    const loadDashboardData = async () => {
        setLoading(true)
        try {
            const today = new Date()
            today.setHours(0, 0, 0, 0)

            // Today's orders
            const { data: orders } = await supabase
                .from('orders')
                .select('*, order_items(*, product:products(name))')
                .gte('created_at', today.toISOString())
                .order('created_at', { ascending: false })

            const todayRevenue = orders?.reduce((sum, order) => sum + Number(order.total), 0) || 0
            const todayOrders = orders?.length || 0

            // Low stock items
            const { data: lowStock } = await supabase
                .from('ingredients')
                .select('*')
                .lt('current_stock', supabase.rpc('current_stock', { ingredient_id: 'id' }))

            // Top products (aggregation would be better with views/functions)
            const productSales: any = {}
            orders?.forEach(order => {
                order.order_items?.forEach((item: any) => {
                    const name = item.product?.name || 'Unknown'
                    if (!productSales[name]) {
                        productSales[name] = { quantity: 0, revenue: 0 }
                    }
                    productSales[name].quantity += item.quantity
                    productSales[name].revenue += Number(item.subtotal)
                })
            })

            const topProducts = Object.entries(productSales)
                .map(([name, data]: any) => ({ name, ...data }))
                .sort((a, b) => b.revenue - a.revenue)
                .slice(0, 5)

            setStats({
                todayRevenue,
                todayOrders,
                lowStockItems: lowStock?.length || 0,
                topProducts,
                recentOrders: orders?.slice(0, 10).map(o => ({
                    id: o.id,
                    order_number: o.order_number,
                    total: o.total,
                    subtotal: o.subtotal,
                    tax: o.tax,
                    created_at: o.created_at,
                    payment_method: o.payment_method,
                    amount_paid: o.amount_paid,
                    change_amount: o.change_amount
                })) || []
            })
        } catch (error) {
            console.error('Error loading dashboard:', error)
        } finally {
            setLoading(false)
        }
    }

    const handleViewOrder = async (orderId: string) => {
        try {
            const { data: order } = await supabase
                .from('orders')
                .select(`
                    *,
                    order_items(
                        *,
                        product:products(name),
                        variant:variants(name)
                    )
                `)
                .eq('id', orderId)
                .single()

            if (order) {
                setSelectedOrder(order as OrderDetail)
                setShowOrderDetail(true)
            }
        } catch (error) {
            console.error('Error loading order details:', error)
        }
    }

    return (
        <div className="p-8">
            <div className="mb-8">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
                <p className="text-sm text-gray-500 dark:text-gray-400">Bienvenido al panel de control</p>
            </div>
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Ventas del Día</CardTitle>
                        <DollarSign className="h-4 w-4 text-green-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-green-600">
                            ${stats.todayRevenue.toFixed(2)}
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                            {stats.todayOrders} órdenes
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Órdenes Hoy</CardTitle>
                        <Calendar className="h-4 w-4 text-blue-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-blue-600">
                            {stats.todayOrders}
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                            Transacciones completadas
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Productos Bajos</CardTitle>
                        <AlertTriangle className="h-4 w-4 text-yellow-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-yellow-600">
                            {stats.lowStockItems}
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                            Ingredientes bajo stock
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Top Producto</CardTitle>
                        <TrendingUp className="h-4 w-4 text-purple-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-lg font-bold text-purple-600 truncate">
                            {stats.topProducts[0]?.name || 'N/A'}
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                            {stats.topProducts[0]?.quantity || 0} vendidos
                        </p>
                    </CardContent>
                </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Top Products */}
                <Card>
                    <CardHeader>
                        <CardTitle>Productos Más Vendidos</CardTitle>
                        <CardDescription>Ranking de hoy por ingresos</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-3">
                            {stats.topProducts.length === 0 ? (
                                <p className="text-center text-gray-400 py-8">No hay ventas hoy</p>
                            ) : (
                                stats.topProducts.map((product, index) => (
                                    <div key={index} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 bg-amber-100 dark:bg-amber-900 rounded-full flex items-center justify-center">
                                                <span className="text-sm font-bold text-amber-700 dark:text-amber-300">
                                                    {index + 1}
                                                </span>
                                            </div>
                                            <div>
                                                <p className="font-medium text-gray-900 dark:text-white">{product.name}</p>
                                                <p className="text-xs text-gray-500">{product.quantity} unidades</p>
                                            </div>
                                        </div>
                                        <p className="font-bold text-green-600">
                                            ${product.revenue.toFixed(2)}
                                        </p>
                                    </div>
                                ))
                            )}
                        </div>
                    </CardContent>
                </Card>

                {/* Recent Orders */}
                <Card>
                    <CardHeader>
                        <CardTitle>Órdenes Recientes</CardTitle>
                        <CardDescription>Últimas 10 transacciones</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <ScrollArea className="h-[300px]">
                            <div className="space-y-2">
                                {stats.recentOrders.length === 0 ? (
                                    <p className="text-center text-gray-400 py-8">No hay órdenes</p>
                                ) : (
                                    stats.recentOrders.map((order, index) => (
                                        <div
                                            key={index}
                                            className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg text-sm cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                                            onClick={() => handleViewOrder(order.id)}
                                        >
                                            <div className="flex-1">
                                                <p className="font-medium text-gray-900 dark:text-white">
                                                    {order.order_number}
                                                </p>
                                                <p className="text-xs text-gray-500">
                                                    {new Date(order.created_at).toLocaleTimeString('es-ES', {
                                                        hour: '2-digit',
                                                        minute: '2-digit'
                                                    })}
                                                </p>
                                            </div>
                                            <div className="text-right flex items-center gap-3">
                                                <div>
                                                    <p className="font-bold text-green-600">${order.total.toFixed(2)}</p>
                                                    <Badge variant="outline" className="text-xs">
                                                        {order.payment_method === 'cash' ? 'Efectivo' : 'Tarjeta'}
                                                    </Badge>
                                                </div>
                                                <Eye className="w-4 h-4 text-gray-400" />
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </ScrollArea>
                    </CardContent>
                </Card>
            </div>

            {/* Order Detail Modal - Touch Optimized */}
            <Dialog open={showOrderDetail} onOpenChange={setShowOrderDetail}>
                <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col p-0 gap-0">
                    <DialogHeader className="p-6 pb-2 border-b">
                        <div className="flex justify-between items-start">
                            <div>
                                <DialogTitle className="text-xl">Detalle de Orden</DialogTitle>
                                <DialogDescription className="text-base mt-1">
                                    #{selectedOrder?.order_number}
                                </DialogDescription>
                            </div>
                            <div className="text-right">
                                <p className="text-sm text-gray-500">
                                    {selectedOrder && new Date(selectedOrder.created_at).toLocaleDateString('es-ES')}
                                </p>
                                <p className="text-sm text-gray-500">
                                    {selectedOrder && new Date(selectedOrder.created_at).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                                </p>
                            </div>
                        </div>
                    </DialogHeader>

                    {selectedOrder && (
                        <>
                            <ScrollArea className="flex-1 p-6">
                                <div className="space-y-6">
                                    {/* Order Items */}
                                    <div>
                                        <h3 className="font-semibold mb-3 text-lg flex items-center gap-2">
                                            <Package className="w-5 h-5 text-amber-600" />
                                            Productos
                                        </h3>
                                        <div className="space-y-3">
                                            {selectedOrder.order_items.map((item) => (
                                                <div key={item.id} className="flex justify-between items-start p-4 bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700">
                                                    <div className="flex-1">
                                                        <p className="font-semibold text-lg">{item.product.name}</p>
                                                        {item.variant && (
                                                            <Badge variant="secondary" className="mt-1">
                                                                {item.variant.name}
                                                            </Badge>
                                                        )}
                                                        <div className="mt-2 text-sm text-gray-600 dark:text-gray-400 flex items-center gap-2">
                                                            <span className="bg-white dark:bg-gray-900 px-2 py-1 rounded border">x{item.quantity}</span>
                                                            <span>a ${item.unit_price.toFixed(2)} c/u</span>
                                                        </div>
                                                    </div>
                                                    <p className="font-bold text-lg text-amber-600">${item.subtotal.toFixed(2)}</p>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    <Separator />

                                    {/* Payment Info */}
                                    <div className="bg-blue-50 dark:bg-blue-900/20 p-5 rounded-xl space-y-3 border border-blue-100 dark:border-blue-800">
                                        <div className="flex justify-between items-center">
                                            <span className="font-medium text-blue-900 dark:text-blue-100">Método de pago</span>
                                            <Badge className="text-base px-3 py-1 bg-blue-100 text-blue-800 hover:bg-blue-200 border-0">
                                                {selectedOrder.payment_method === 'cash' ? 'Efectivo 💵' : 'Tarjeta 💳'}
                                            </Badge>
                                        </div>
                                        {selectedOrder.payment_method === 'cash' && selectedOrder.amount_paid && (
                                            <>
                                                <div className="flex justify-between text-base">
                                                    <span className="text-blue-800/70 dark:text-blue-200/70">Monto recibido</span>
                                                    <span className="font-mono font-medium">${selectedOrder.amount_paid.toFixed(2)}</span>
                                                </div>
                                                <div className="flex justify-between text-lg font-bold">
                                                    <span className="text-blue-900 dark:text-blue-100">Cambio entregado</span>
                                                    <span className="font-mono text-blue-600 dark:text-blue-400">${selectedOrder.change_amount.toFixed(2)}</span>
                                                </div>
                                            </>
                                        )}
                                    </div>

                                    {/* Totals */}
                                    <div className="space-y-3 pt-2">
                                        <div className="flex justify-between text-base text-gray-600 dark:text-gray-400">
                                            <span>Subtotal</span>
                                            <span>${selectedOrder.subtotal.toFixed(2)}</span>
                                        </div>
                                        <div className="flex justify-between text-base text-gray-600 dark:text-gray-400">
                                            <span>Impuesto (10%)</span>
                                            <span>${selectedOrder.tax.toFixed(2)}</span>
                                        </div>
                                        <Separator />
                                        <div className="flex justify-between text-2xl font-bold">
                                            <span>Total</span>
                                            <span className="text-green-600">${selectedOrder.total.toFixed(2)}</span>
                                        </div>
                                    </div>
                                </div>
                            </ScrollArea>

                            <div className="p-6 border-t bg-gray-50 dark:bg-gray-900/50">
                                <Button
                                    className="w-full h-14 text-lg font-medium bg-gray-900 hover:bg-gray-800 dark:bg-white dark:text-gray-900 dark:hover:bg-gray-200"
                                    onClick={() => setShowOrderDetail(false)}
                                >
                                    Cerrar Detalle
                                </Button>
                            </div>
                        </>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    )
}
