
'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { ArrowLeft, Download, Calendar } from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Suspense } from 'react'

interface SalesByCustomer {
    customer_name: string
    total_sales: number
    total_orders: number
    total_products: number
}

interface SalesByEmployee {
    cashier_id: string
    cashier_name: string
    total_sales: number
    total_orders: number
}

interface SalesByProduct {
    product_name: string
    quantity: number
    total_sales: number
}

interface SalesByPaymentMethod {
    payment_method: string
    total_sales: number
    transaction_count: number
}

export default function Page() {
    return (
        <Suspense fallback={<div className="p-8">Cargando reportes...</div>}>
            <AllSalesReportPage />
        </Suspense>
    )
}

function AllSalesReportPage() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const defaultTab = searchParams.get('tab') || 'ventas'

    const [selectedPeriod, setSelectedPeriod] = useState('thismonth')
    const [totalSales, setTotalSales] = useState(0)
    const [salesCount, setSalesCount] = useState(0)
    const [loading, setLoading] = useState(true)

    // Data for each tab
    const [salesByCustomer, setSalesByCustomer] = useState<SalesByCustomer[]>([])
    const [salesByEmployee, setSalesByEmployee] = useState<SalesByEmployee[]>([])
    const [salesByProduct, setSalesByProduct] = useState<SalesByProduct[]>([])
    const [salesByPaymentMethod, setSalesByPaymentMethod] = useState<SalesByPaymentMethod[]>([])

    useEffect(() => {
        console.log('Fetching data for period:', selectedPeriod)
        fetchAllData()
    }, [selectedPeriod])

    const getDateRange = () => {
        const now = new Date()
        let startDate = new Date()

        switch (selectedPeriod) {
            case 'today':
                startDate.setHours(0, 0, 0, 0)
                break
            case 'yesterday':
                startDate.setDate(now.getDate() - 1)
                startDate.setHours(0, 0, 0, 0)
                break
            case 'last7days':
                startDate.setDate(now.getDate() - 7)
                break
            case 'last30days':
                startDate.setDate(now.getDate() - 30)
                break
            case 'thismonth':
                startDate = new Date(now.getFullYear(), now.getMonth(), 1)
                break
        }

        return startDate.toISOString()
    }

    const fetchAllData = async () => {
        try {
            const startDate = getDateRange()
            console.log('Start date:', startDate)

            // Fetch total sales
            console.log('Fetching orders with start date:', startDate)

            const { data: orders, error: ordersError } = await supabase
                .from('orders')
                .select(`
                    *,
                    order_items (
                        *,
                        product:products (name)
                    ),
                    cashier:profiles (id, email)
                `)
                .gte('created_at', startDate)

            if (ordersError) {
                console.error('Supabase error:', ordersError)
                throw ordersError
            }

            console.log('Orders fetched:', orders)

            const total = orders?.reduce((acc, order) => acc + parseFloat(order.total), 0) || 0
            setTotalSales(total)
            setSalesCount(orders?.length || 0)

            // Process sales by customer
            const customerMap = new Map<string, SalesByCustomer>()
            orders?.forEach(order => {
                const customerName = order.loyalty_phone || 'Sin registro'
                const existing = customerMap.get(customerName) || {
                    customer_name: customerName,
                    total_sales: 0,
                    total_orders: 0,
                    total_products: 0
                }
                existing.total_sales += parseFloat(order.total)
                existing.total_orders += 1
                existing.total_products += order.order_items?.length || 0
                customerMap.set(customerName, existing)
            })
            setSalesByCustomer(Array.from(customerMap.values()).sort((a, b) => b.total_sales - a.total_sales).slice(0, 5))

            // Process sales by employee
            const employeeMap = new Map<string, SalesByEmployee>()
            orders?.forEach(order => {
                const cashierId = order.cashier_id || 'unknown'
                const cashierName = order.cashier?.email || 'Desconocido'
                const existing = employeeMap.get(cashierId) || {
                    cashier_id: cashierId,
                    cashier_name: cashierName,
                    total_sales: 0,
                    total_orders: 0
                }
                existing.total_sales += parseFloat(order.total)
                existing.total_orders += 1
                employeeMap.set(cashierId, existing)
            })
            setSalesByEmployee(Array.from(employeeMap.values()).sort((a, b) => b.total_sales - a.total_sales).slice(0, 5))

            // Process sales by product
            const productMap = new Map<string, SalesByProduct>()
            orders?.forEach(order => {
                order.order_items?.forEach((item: any) => {
                    const productName = item.product?.name || 'Producto desconocido'
                    const existing = productMap.get(productName) || {
                        product_name: productName,
                        quantity: 0,
                        total_sales: 0
                    }
                    existing.quantity += item.quantity
                    existing.total_sales += parseFloat(item.subtotal)
                    productMap.set(productName, existing)
                })
            })
            setSalesByProduct(Array.from(productMap.values()).sort((a, b) => b.total_sales - a.total_sales))

            // Process sales by payment method
            const paymentMap = new Map<string, SalesByPaymentMethod>()
            orders?.forEach(order => {
                const method = order.payment_method || 'Efectivo'
                const existing = paymentMap.get(method) || {
                    payment_method: method,
                    total_sales: 0,
                    transaction_count: 0
                }
                existing.total_sales += parseFloat(order.total)
                existing.transaction_count += 1
                paymentMap.set(method, existing)
            })
            setSalesByPaymentMethod(Array.from(paymentMap.values()))

        } catch (error) {
            console.error('Error fetching sales data:', error)
        } finally {
            setLoading(false)
        }
    }

    const periodButtons = [
        { label: 'Hoy', value: 'today' },
        { label: 'Ayer', value: 'yesterday' },
        { label: 'Últimos 7 días', value: 'last7days' },
        { label: 'Últimos 30 días', value: 'last30days' },
        { label: 'Este mes', value: 'thismonth' }
    ]

    return (
        <div className="p-8 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Reportes de Ventas</h1>
                    <p className="text-gray-500 mt-1">Análisis detallado de tus ventas</p>
                </div>
                <div className="flex items-center gap-3">
                    <Button variant="outline">
                        <Download className="w-4 h-4 mr-2" />
                        Exportar
                    </Button>
                    <Button variant="outline" onClick={() => router.back()}>
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        Volver
                    </Button>
                </div>
            </div>

            {/* Period Filters */}
            <Card>
                <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            {periodButtons.map((period) => (
                                <Button
                                    key={period.value}
                                    variant={selectedPeriod === period.value ? 'default' : 'outline'}
                                    className={selectedPeriod === period.value ? 'bg-purple-600 hover:bg-purple-700' : ''}
                                    onClick={() => setSelectedPeriod(period.value)}
                                >
                                    {period.label}
                                </Button>
                            ))}
                        </div>
                        <div className="flex items-center gap-2 text-sm text-gray-500">
                            <Calendar className="w-4 h-4" />
                            <span>27 nov 2025 - 27 nov 2025</span>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Tabs */}
            <Tabs defaultValue={defaultTab} key={defaultTab} className="w-full">
                <TabsList className="grid w-full grid-cols-5 bg-white border">
                    <TabsTrigger value="ventas">Ventas</TabsTrigger>
                    <TabsTrigger value="clientes">Clientes</TabsTrigger>
                    <TabsTrigger value="empleados">Empleados</TabsTrigger>
                    <TabsTrigger value="productos">Productos</TabsTrigger>
                    <TabsTrigger value="metodos">Métodos de Pago</TabsTrigger>
                </TabsList>

                {/* Ventas Tab */}
                <TabsContent value="ventas" className="space-y-4 mt-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Card>
                            <CardContent className="p-6">
                                <h3 className="text-sm text-gray-500 mb-2">Total de Ventas</h3>
                                <p className="text-xs text-gray-400 mb-4">Monto total vendido en el período</p>
                                <p className="text-4xl font-bold text-green-600">
                                    S/ {totalSales.toFixed(2)}
                                </p>
                                <p className="text-sm text-gray-500 mt-2">
                                    {salesCount} {salesCount === 1 ? 'venta realizada' : 'ventas realizadas'}
                                </p>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardContent className="p-6">
                                <h3 className="text-sm text-gray-500 mb-2">Ventas</h3>
                                <p className="text-xs text-gray-400 mb-4">Distribución por período</p>
                                <div className="h-64 flex items-end justify-center">
                                    <div className="w-full h-full bg-gradient-to-t from-green-500 to-green-400 rounded-t-lg flex items-end justify-center">
                                        <span className="text-white font-semibold mb-4">Ventas</span>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>

                {/* Clientes Tab */}
                <TabsContent value="clientes" className="space-y-4 mt-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Card>
                            <CardContent className="p-6">
                                <h3 className="text-lg font-semibold mb-2">Top 5 de Ventas por Clientes</h3>
                                <p className="text-sm text-gray-500 mb-6">Clientes con mayores compras</p>
                                <div className="space-y-4">
                                    {salesByCustomer.length === 0 ? (
                                        <p className="text-center text-gray-500 py-8">No hay datos de clientes para este período</p>
                                    ) : (
                                        salesByCustomer.map((customer, index) => (
                                            <div key={index} className="flex items-center justify-between border-b pb-3">
                                                <div>
                                                    <p className="font-medium">{customer.customer_name}</p>
                                                    <p className="text-sm text-gray-500">{customer.total_orders} compras</p>
                                                </div>
                                                <div className="text-right">
                                                    <p className="font-semibold text-green-600">S/ {customer.total_sales.toFixed(2)}</p>
                                                    <p className="text-xs text-gray-500">{customer.total_products} productos</p>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardContent className="p-6">
                                <h3 className="text-lg font-semibold mb-2">Ventas por Tipo de Cliente</h3>
                                <div className="h-64 flex items-center justify-center">
                                    <div className="relative w-48 h-48">
                                        <svg viewBox="0 0 100 100" className="transform -rotate-90">
                                            <circle cx="50" cy="50" r="40" fill="none" stroke="#10b981" strokeWidth="20" strokeDasharray="251.2" strokeDashoffset="0" />
                                        </svg>
                                        <div className="absolute inset-0 flex items-center justify-center">
                                            <div className="text-center">
                                                <p className="text-2xl font-bold">{salesByCustomer.length}</p>
                                                <p className="text-xs text-gray-500">Clientes</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div className="mt-4 flex items-center justify-center gap-2">
                                    <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                                    <span className="text-sm text-gray-600">Sin registro</span>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>

                {/* Empleados Tab */}
                <TabsContent value="empleados" className="space-y-4 mt-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Card>
                            <CardContent className="p-6">
                                <h3 className="text-lg font-semibold mb-2">Top 5 de Ventas por Empleados</h3>
                                <div className="space-y-4 mt-6">
                                    {salesByEmployee.length === 0 ? (
                                        <p className="text-center text-gray-500 py-8">No hay datos de empleados para este período</p>
                                    ) : (
                                        salesByEmployee.map((employee, index) => (
                                            <div key={index} className="flex items-center justify-between border-b pb-3">
                                                <div>
                                                    <p className="font-medium">{employee.cashier_name}</p>
                                                    <p className="text-sm text-gray-500">{employee.total_orders} ventas</p>
                                                </div>
                                                <p className="font-semibold text-green-600">S/ {employee.total_sales.toFixed(2)}</p>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardContent className="p-6">
                                <h3 className="text-lg font-semibold mb-2">Ventas por Empleado</h3>
                                <div className="h-64 flex items-end gap-4 px-4">
                                    {salesByEmployee.length === 0 ? (
                                        <div className="w-full h-full flex items-center justify-center text-gray-400">
                                            Sin datos para mostrar
                                        </div>
                                    ) : (
                                        salesByEmployee.map((employee, index) => {
                                            const maxSales = Math.max(...salesByEmployee.map(e => e.total_sales))
                                            const height = (employee.total_sales / maxSales) * 100
                                            return (
                                                <div key={index} className="flex-1 flex flex-col items-center">
                                                    <div className="w-full bg-blue-500 rounded-t" style={{ height: `${height}%` }}></div>
                                                    <p className="text-xs mt-2 text-center truncate w-full">{employee.cashier_name.split('@')[0]}</p>
                                                </div>
                                            )
                                        })
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>

                {/* Productos Tab */}
                <TabsContent value="productos" className="space-y-4 mt-6">
                    <Card>
                        <CardContent className="p-6">
                            <h3 className="text-lg font-semibold mb-2">Ventas por Producto</h3>
                            <p className="text-sm text-gray-500 mb-6">Productos más vendidos</p>
                            <div className="space-y-4">
                                {salesByProduct.length === 0 ? (
                                    <p className="text-center text-gray-500 py-8">No hay datos de productos para este período</p>
                                ) : (
                                    salesByProduct.map((product, index) => (
                                        <div key={index} className="flex items-center justify-between border-b pb-3">
                                            <div>
                                                <p className="font-medium">{product.product_name}</p>
                                                <p className="text-sm text-gray-500">{product.quantity} unidades vendidas</p>
                                            </div>
                                            <p className="font-semibold text-green-600">S/ {product.total_sales.toFixed(2)}</p>
                                        </div>
                                    ))
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Métodos de Pago Tab */}
                <TabsContent value="metodos" className="space-y-4 mt-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Card>
                            <CardContent className="p-6">
                                <h3 className="text-lg font-semibold mb-6">Ventas por Método de Pago</h3>
                                <div className="space-y-4">
                                    {salesByPaymentMethod.length === 0 ? (
                                        <p className="text-center text-gray-500 py-8">No hay datos de pagos para este período</p>
                                    ) : (
                                        salesByPaymentMethod.map((method, index) => (
                                            <div key={index} className="flex items-center justify-between border-b pb-3">
                                                <div>
                                                    <p className="font-medium">{method.payment_method}</p>
                                                    <p className="text-sm text-gray-500">{method.transaction_count} transacciones</p>
                                                </div>
                                                <p className="font-semibold text-green-600">S/ {method.total_sales.toFixed(2)}</p>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardContent className="p-6">
                                <h3 className="text-lg font-semibold mb-2">Distribución de Métodos de Pago</h3>
                                <div className="h-64 flex items-center justify-center">
                                    <div className="relative w-48 h-48">
                                        <svg viewBox="0 0 100 100" className="transform -rotate-90">
                                            <circle cx="50" cy="50" r="40" fill="none" stroke="#10b981" strokeWidth="20" strokeDasharray="251.2" strokeDashoffset="0" />
                                        </svg>
                                    </div>
                                </div>
                                <div className="mt-4 flex items-center justify-center gap-2">
                                    <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                                    <span className="text-sm text-gray-600">Efectivo</span>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    )
}
