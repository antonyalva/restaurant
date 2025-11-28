'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { LineChart, Line, PieChart, Pie, Cell, ResponsiveContainer, XAxis, YAxis, Tooltip, Legend } from 'recharts'
import {
    Package,
    FileText,
    Layers,
    Grid,
    Truck,
    DollarSign,
    Gift,
    Users,
    Settings,
    TrendingUp,
    BarChart3,
    PieChart as PieChartIcon
} from 'lucide-react'

// Color palette
const COLORS = {
    efectivo: '#10b981',
    card: '#8b5cf6',
    qr: '#3b82f6',
    products: ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444']
}

interface DailySales {
    date: string
    sales: number
}

interface PaymentMethodData {
    name: string
    value: number
    orders: number
    percentage: number
}

interface TopProduct {
    name: string
    quantity: number
    revenue: number
}

interface TopCategory {
    name: string
    quantity: number
    revenue: number
}

interface RecentOrder {
    id: string
    order_number: string
    created_at: string
    cashier_email: string
    payment_method: string
    total: number
}

export default function AdminDashboard() {
    const router = useRouter()
    const [loading, setLoading] = useState(true)
    const [totalSales, setTotalSales] = useState(0)
    const [todaySales, setTodaySales] = useState(0)
    const [totalTransactions, setTotalTransactions] = useState(0)
    const [dailySales, setDailySales] = useState<DailySales[]>([])
    const [paymentMethods, setPaymentMethods] = useState<PaymentMethodData[]>([])
    const [topProducts, setTopProducts] = useState<TopProduct[]>([])
    const [topCategories, setTopCategories] = useState<TopCategory[]>([])
    const [recentOrders, setRecentOrders] = useState<RecentOrder[]>([])
    const [searchTerm, setSearchTerm] = useState('')
    const [paymentFilter, setPaymentFilter] = useState('all')

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
            // Fetch ALL orders for total stats
            const { data: allOrders } = await supabase
                .from('orders')
                .select('total')

            const totalSalesAmount = allOrders?.reduce((sum, order) => sum + parseFloat(order.total), 0) || 0
            const totalTransactionsCount = allOrders?.length || 0
            setTotalSales(totalSalesAmount)
            setTotalTransactions(totalTransactionsCount)

            // Fetch today's orders
            const today = new Date()
            today.setHours(0, 0, 0, 0)
            const { data: todayOrders } = await supabase
                .from('orders')
                .select('total')
                .gte('created_at', today.toISOString())

            const todaySalesAmount = todayOrders?.reduce((sum, order) => sum + parseFloat(order.total), 0) || 0
            setTodaySales(todaySalesAmount)

            // Fetch orders from last 7 days
            const sevenDaysAgo = new Date()
            sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

            const { data: orders } = await supabase
                .from('orders')
                .select(`
                    *,
                    order_items (
                        *,
                        product:products (name, category_id)
                    ),
                    cashier:profiles (email)
                `)
                .gte('created_at', sevenDaysAgo.toISOString())
                .order('created_at', { ascending: false })

            if (orders) {
                // Process daily sales
                const salesByDay: { [key: string]: number } = {}
                const last7Days = []
                for (let i = 6; i >= 0; i--) {
                    const date = new Date()
                    date.setDate(date.getDate() - i)
                    const dateStr = date.toLocaleDateString('es-PE', { day: 'numeric', month: 'short' })
                    salesByDay[dateStr] = 0
                    last7Days.push(dateStr)
                }

                orders.forEach(order => {
                    const orderDate = new Date(order.created_at)
                    const dateStr = orderDate.toLocaleDateString('es-PE', { day: 'numeric', month: 'short' })
                    if (salesByDay[dateStr] !== undefined) {
                        salesByDay[dateStr] += parseFloat(order.total)
                    }
                })

                const dailySalesData = last7Days.map(date => ({
                    date,
                    sales: salesByDay[date]
                }))
                setDailySales(dailySalesData)

                // Process payment methods
                const paymentData: { [key: string]: { amount: number, count: number } } = {
                    'Efectivo': { amount: 0, count: 0 },
                    'Tarjeta': { amount: 0, count: 0 },
                    'Yape': { amount: 0, count: 0 }
                }

                orders.forEach(order => {
                    const method = order.payment_method === 'cash' ? 'Efectivo' :
                        order.payment_method === 'card' ? 'Tarjeta' : 'Yape'
                    paymentData[method].amount += parseFloat(order.total)
                    paymentData[method].count += 1
                })

                const totalAmount = Object.values(paymentData).reduce((sum, data) => sum + data.amount, 0)
                const paymentMethodsData = Object.entries(paymentData).map(([name, data]) => ({
                    name,
                    value: data.amount,
                    orders: data.count,
                    percentage: totalAmount > 0 ? (data.amount / totalAmount) * 100 : 0
                }))
                setPaymentMethods(paymentMethodsData)

                // Process top products
                const productSales: { [key: string]: { quantity: number, revenue: number } } = {}
                orders.forEach(order => {
                    order.order_items?.forEach((item: any) => {
                        const name = item.product?.name || 'Unknown'
                        if (!productSales[name]) {
                            productSales[name] = { quantity: 0, revenue: 0 }
                        }
                        productSales[name].quantity += item.quantity
                        productSales[name].revenue += parseFloat(item.subtotal)
                    })
                })

                const topProductsData = Object.entries(productSales)
                    .map(([name, data]) => ({ name, ...data }))
                    .sort((a, b) => b.revenue - a.revenue)
                    .slice(0, 5)
                setTopProducts(topProductsData)

                // Process top categories
                const categorySales: { [key: string]: { quantity: number, revenue: number } } = {}
                orders.forEach(order => {
                    order.order_items?.forEach((item: any) => {
                        const categoryId = item.product?.category_id
                        if (categoryId) {
                            if (!categorySales[categoryId]) {
                                categorySales[categoryId] = { quantity: 0, revenue: 0 }
                            }
                            categorySales[categoryId].quantity += item.quantity
                            categorySales[categoryId].revenue += parseFloat(item.subtotal)
                        }
                    })
                })

                // Fetch category names
                const { data: categories } = await supabase
                    .from('categories')
                    .select('id, name')

                const categoryMap = new Map(categories?.map(c => [c.id, c.name]) || [])
                const topCategoriesData = Object.entries(categorySales)
                    .map(([id, data]) => ({
                        name: categoryMap.get(id) || 'Unknown',
                        ...data
                    }))
                    .sort((a, b) => b.revenue - a.revenue)
                    .slice(0, 5)
                setTopCategories(topCategoriesData)

                // Recent orders
                const recentOrdersData = orders.slice(0, 7).map(order => ({
                    id: order.id,
                    order_number: order.order_number,
                    created_at: order.created_at,
                    cashier_email: order.cashier?.email || 'Unknown',
                    payment_method: order.payment_method,
                    total: parseFloat(order.total)
                }))
                setRecentOrders(recentOrdersData)
            }
        } catch (error) {
            console.error('Error loading dashboard data:', error)
        } finally {
            setLoading(false)
        }
    }

    const quickAccessCards = [
        { title: 'Gestión de Inventario', description: 'Gestionar niveles de stock', icon: Package, href: '/admin/inventory/ingredients' },
        { title: 'Historial de Ventas', description: 'Consultar ventas por período', icon: FileText, href: '/admin/sales' },
        { title: 'Catálogo de Productos', description: 'Gestionar productos', icon: Layers, href: '/admin/inventory/products' },
        { title: 'Categorías', description: 'Gestionar categorías de productos', icon: Grid, href: '/admin/inventory/categories' },
        { title: 'Proveedores', description: 'Gestionar proveedores', icon: Truck, href: '/admin/inventory/suppliers' },
        { title: 'Turnos / Cierre de Caja', description: 'Ver historial de turnos y cierres', icon: DollarSign, href: '/admin/shifts' },
        { title: 'Programa de Fidelidad', description: 'Gestionar clientes y recompensas', icon: Gift, href: '/admin/loyalty/dashboard' },
        { title: 'Usuarios y Roles', description: 'Gestionar cajeros y permisos', icon: Users, href: '/admin/people/users' },
        { title: 'Configuración', description: 'Datos del negocio y tickets', icon: Settings, href: '/admin' },
        { title: 'Fidelidad', description: 'Reglas y recompensas', icon: Gift, href: '/admin/loyalty/rules' },
    ]

    const filteredOrders = recentOrders.filter(order => {
        const matchesSearch = order.order_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
            order.cashier_email.toLowerCase().includes(searchTerm.toLowerCase())
        const matchesPayment = paymentFilter === 'all' || order.payment_method === paymentFilter
        return matchesSearch && matchesPayment
    })

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
                    <p className="mt-4 text-gray-600">Cargando dashboard...</p>
                </div>
            </div>
        )
    }

    return (
        <div className="p-6 space-y-6 bg-gray-50 min-h-screen">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card>
                    <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                            <CardTitle className="text-sm font-medium text-gray-600">Total de ventas</CardTitle>
                            <DollarSign className="w-4 h-4 text-gray-400" />
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold">S/. {totalSales.toFixed(2)}</div>
                        <p className="text-xs text-gray-500 mt-1">Ventas totales</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                            <CardTitle className="text-sm font-medium text-gray-600">Ventas de hoy</CardTitle>
                            <TrendingUp className="w-4 h-4 text-gray-400" />
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold">S/. {todaySales.toFixed(2)}</div>
                        <p className="text-xs text-gray-500 mt-1">Ventas para hoy</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                            <CardTitle className="text-sm font-medium text-gray-600">Total de ventas</CardTitle>
                            <BarChart3 className="w-4 h-4 text-gray-400" />
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold">{totalTransactions}</div>
                        <p className="text-xs text-gray-500 mt-1">Transacciones completadas</p>
                    </CardContent>
                </Card>
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Sales Last 7 Days */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-lg">
                            <TrendingUp className="w-5 h-5 text-green-600" />
                            Ventas Últimos 7 Días
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <ResponsiveContainer width="100%" height={250}>
                            <LineChart data={dailySales}>
                                <XAxis dataKey="date" stroke="#9ca3af" style={{ fontSize: '12px' }} />
                                <YAxis stroke="#9ca3af" style={{ fontSize: '12px' }} />
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }}
                                    formatter={(value: number) => [`S/ ${value.toFixed(2)}`, 'Ventas']}
                                />
                                <Line type="monotone" dataKey="sales" stroke="#10b981" strokeWidth={3} dot={{ fill: '#10b981', r: 5 }} />
                            </LineChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>

                {/* Payment Methods */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-lg">
                            <BarChart3 className="w-5 h-5 text-blue-600" />
                            Métodos de Pago
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-center justify-center">
                            <ResponsiveContainer width="100%" height={250}>
                                <PieChart>
                                    <Pie
                                        data={paymentMethods}
                                        cx="50%"
                                        cy="50%"
                                        labelLine={false}
                                        label={(entry) => `${entry.name} ${entry.percentage.toFixed(0)}%`}
                                        outerRadius={80}
                                        fill="#8884d8"
                                        dataKey="value"
                                    >
                                        {paymentMethods.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={
                                                entry.name === 'Efectivo' ? COLORS.efectivo :
                                                    entry.name === 'Tarjeta' ? COLORS.card :
                                                        COLORS.qr
                                            } />
                                        ))}
                                    </Pie>
                                    <Tooltip formatter={(value: number) => `S/ ${value.toFixed(2)}`} />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                        <div className="mt-4 space-y-2">
                            {paymentMethods.map((method, index) => (
                                <div key={index} className="flex items-center justify-between text-sm">
                                    <div className="flex items-center gap-2">
                                        <div className={`w-3 h-3 rounded-full`} style={{
                                            backgroundColor: method.name === 'Efectivo' ? COLORS.efectivo :
                                                method.name === 'Tarjeta' ? COLORS.card :
                                                    COLORS.qr
                                        }}></div>
                                        <span>{method.name}</span>
                                    </div>
                                    <div className="text-right">
                                        <div className="font-semibold">S/ {method.value.toFixed(2)}</div>
                                        <div className="text-xs text-gray-500">{method.orders} órdenes</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Product Analytics */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Top Products */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-lg">
                            <PieChartIcon className="w-5 h-5 text-purple-600" />
                            Top 5 Productos Más Vendidos
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <ResponsiveContainer width="100%" height={200}>
                            <PieChart>
                                <Pie
                                    data={topProducts}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={80}
                                    fill="#8884d8"
                                    paddingAngle={5}
                                    dataKey="revenue"
                                >
                                    {topProducts.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS.products[index % COLORS.products.length]} />
                                    ))}
                                </Pie>
                                <Tooltip formatter={(value: number) => `S/ ${value.toFixed(2)}`} />
                            </PieChart>
                        </ResponsiveContainer>
                        <div className="mt-4 space-y-2">
                            {topProducts.map((product, index) => (
                                <div key={index} className="flex items-center justify-between text-sm">
                                    <div className="flex items-center gap-2">
                                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS.products[index % COLORS.products.length] }}></div>
                                        <span className="truncate max-w-[200px]">{product.name}</span>
                                    </div>
                                    <div className="text-right">
                                        <div className="font-semibold">S/ {product.revenue.toFixed(2)}</div>
                                        <div className="text-xs text-gray-500">{product.quantity} un.</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>

                {/* Top Categories */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-lg">
                            <PieChartIcon className="w-5 h-5 text-orange-600" />
                            Categorías Más Vendidas
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <ResponsiveContainer width="100%" height={200}>
                            <PieChart>
                                <Pie
                                    data={topCategories}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={80}
                                    fill="#8884d8"
                                    paddingAngle={5}
                                    dataKey="revenue"
                                >
                                    {topCategories.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS.products[index % COLORS.products.length]} />
                                    ))}
                                </Pie>
                                <Tooltip formatter={(value: number) => `S/ ${value.toFixed(2)}`} />
                            </PieChart>
                        </ResponsiveContainer>
                        <div className="mt-4 space-y-2">
                            {topCategories.map((category, index) => (
                                <div key={index} className="flex items-center justify-between text-sm">
                                    <div className="flex items-center gap-2">
                                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS.products[index % COLORS.products.length] }}></div>
                                        <span>{category.name}</span>
                                    </div>
                                    <div className="text-right">
                                        <div className="font-semibold">S/ {category.revenue.toFixed(2)}</div>
                                        <div className="text-xs text-gray-500">{category.quantity} un.</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Quick Access Cards */}
            <Card>
                <CardHeader>
                    <CardTitle>Acceso Rápido</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                        {quickAccessCards.map((card, index) => (
                            <button
                                key={index}
                                onClick={() => router.push(card.href)}
                                className="p-4 bg-white border border-gray-200 rounded-lg hover:shadow-md transition-shadow text-left"
                            >
                                <card.icon className="w-6 h-6 text-gray-600 mb-2" />
                                <h3 className="font-semibold text-sm mb-1">{card.title}</h3>
                                <p className="text-xs text-gray-500">{card.description}</p>
                            </button>
                        ))}
                    </div>
                </CardContent>
            </Card>

            {/* Recent Orders */}
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <CardTitle>Órdenes Recientes</CardTitle>
                        <Button variant="ghost" size="sm" onClick={() => { setSearchTerm(''); setPaymentFilter('all') }}>
                            Limpiar Filtros
                        </Button>
                    </div>
                    <div className="flex gap-4 mt-4">
                        <Input
                            placeholder="Buscar por ID o cajero..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="max-w-xs"
                        />
                        <select
                            value={paymentFilter}
                            onChange={(e) => setPaymentFilter(e.target.value)}
                            className="border border-gray-300 rounded-md px-3 py-2 text-sm"
                        >
                            <option value="all">Todos los métodos</option>
                            <option value="cash">Efectivo</option>
                            <option value="card">Tarjeta</option>
                            <option value="qr">Yape</option>
                        </select>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="text-sm text-gray-500 mb-4">
                        Mostrando {filteredOrders.length} de {recentOrders.length} órdenes
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gray-50 border-b">
                                <tr>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Orden</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fecha</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cajero</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Método</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Monto</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Estado</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                                {filteredOrders.map((order) => (
                                    <tr key={order.id} className="hover:bg-gray-50">
                                        <td className="px-4 py-3 text-sm">{order.order_number}</td>
                                        <td className="px-4 py-3 text-sm">
                                            {new Date(order.created_at).toLocaleDateString('es-PE', {
                                                month: 'short',
                                                day: 'numeric',
                                                hour: '2-digit',
                                                minute: '2-digit'
                                            })}
                                        </td>
                                        <td className="px-4 py-3 text-sm">{order.cashier_email.split('@')[0]}</td>
                                        <td className="px-4 py-3 text-sm capitalize">{
                                            order.payment_method === 'cash' ? 'Efectivo' :
                                                order.payment_method === 'card' ? 'Tarjeta' : 'Yape'
                                        }</td>
                                        <td className="px-4 py-3 text-sm font-semibold">S/ {order.total.toFixed(2)}</td>
                                        <td className="px-4 py-3 text-sm">
                                            <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-800">
                                                completado
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
