'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { ArrowLeft, Banknote, CreditCard, QrCode, ShoppingBag, DollarSign, Receipt, AlertTriangle, CheckCircle2, ChevronDown, ChevronUp, Printer } from 'lucide-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

interface OrderItem {
    id: string
    product: { name: string }
    quantity: number
    unit_price: number
    subtotal: number
}

interface Order {
    id: string
    order_number: string
    created_at: string
    total: number
    payment_method: 'cash' | 'card' | 'qr'
    amount_paid: number
    change_amount: number
    subtotal: number
    tax: number
    order_items: OrderItem[]
}

interface Shift {
    id: string
    start_time: string
    end_time: string | null
    initial_cash: number
    final_cash: number | null
    expected_cash: number | null
    status: 'open' | 'closed'
    notes: string | null
    cashier: {
        full_name: string | null
        email: string
    }
}

export default function ShiftDetailPage() {
    const router = useRouter()
    const params = useParams()
    const [shift, setShift] = useState<Shift | null>(null)
    const [orders, setOrders] = useState<Order[]>([])
    const [loading, setLoading] = useState(true)
    const [expandedOrder, setExpandedOrder] = useState<string | null>(null)

    useEffect(() => {
        if (params.id) {
            fetchShiftDetails()
        }
    }, [params.id])

    const fetchShiftDetails = async () => {
        try {
            // 1. Fetch Shift
            const { data: shiftData, error: shiftError } = await supabase
                .from('shifts')
                .select(`
                    *,
                    cashier:profiles(full_name, email)
                `)
                .eq('id', params.id)
                .single()

            if (shiftError) throw shiftError
            setShift(shiftData)

            // 2. Fetch Orders for this shift
            // We filter by cashier_id and time range
            let query = supabase
                .from('orders')
                .select(`
                    *,
                    order_items (
                        id,
                        quantity,
                        unit_price,
                        subtotal,
                        product:products(name)
                    )
                `)
                .eq('cashier_id', shiftData.cashier_id)
                .gte('created_at', shiftData.start_time)
                .order('created_at', { ascending: false })

            if (shiftData.end_time) {
                query = query.lte('created_at', shiftData.end_time)
            }

            const { data: ordersData, error: ordersError } = await query
            if (ordersError) throw ordersError

            setOrders(ordersData || [])

        } catch (error) {
            console.error('Error fetching details:', error)
        } finally {
            setLoading(false)
        }
    }

    // Calculations
    const totalOrders = orders.length
    const totalSales = orders.reduce((sum, order) => sum + order.total, 0)
    const averageTicket = totalOrders > 0 ? totalSales / totalOrders : 0

    const salesByMethod = {
        cash: orders.filter(o => o.payment_method === 'cash').reduce((sum, o) => sum + o.total, 0),
        card: orders.filter(o => o.payment_method === 'card').reduce((sum, o) => sum + o.total, 0),
        qr: orders.filter(o => o.payment_method === 'qr').reduce((sum, o) => sum + o.total, 0),
    }

    const cashCount = {
        initial: shift?.initial_cash || 0,
        sales: salesByMethod.cash,
        expected: (shift?.initial_cash || 0) + salesByMethod.cash,
        real: shift?.final_cash || 0,
        difference: (shift?.final_cash || 0) - ((shift?.initial_cash || 0) + salesByMethod.cash)
    }

    const formatCurrency = (amount: number) => `S/. ${amount.toFixed(2)}`

    if (loading) return <div className="p-8 text-center">Cargando detalles del turno...</div>
    if (!shift) return <div className="p-8 text-center">Turno no encontrado</div>

    return (
        <div className="p-8 space-y-6 max-w-7xl mx-auto">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Button variant="outline" size="icon" onClick={() => router.back()}>
                        <ArrowLeft className="w-4 h-4" />
                    </Button>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                            Detalle de Turno #{shift.id.slice(0, 8)}
                        </h1>
                        <p className="text-gray-500 text-sm">
                            {format(new Date(shift.start_time), "PPP p", { locale: es })} -
                            {shift.end_time ? format(new Date(shift.end_time), " p", { locale: es }) : ' En curso'}
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <Badge variant={shift.status === 'open' ? 'default' : 'secondary'} className="text-sm px-3 py-1">
                        {shift.status === 'open' ? 'Caja Abierta' : 'Caja Cerrada'}
                    </Badge>
                    <Button variant="outline">
                        <Printer className="w-4 h-4 mr-2" />
                        Imprimir Reporte
                    </Button>
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex flex-col gap-1">
                            <span className="text-sm font-medium text-gray-500">Total Órdenes</span>
                            <div className="flex items-center gap-2">
                                <ShoppingBag className="w-5 h-5 text-blue-600" />
                                <span className="text-2xl font-bold">{totalOrders}</span>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex flex-col gap-1">
                            <span className="text-sm font-medium text-gray-500">Ventas Totales</span>
                            <div className="flex items-center gap-2">
                                <DollarSign className="w-5 h-5 text-green-600" />
                                <span className="text-2xl font-bold">{formatCurrency(totalSales)}</span>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex flex-col gap-1">
                            <span className="text-sm font-medium text-gray-500">Ticket Promedio</span>
                            <div className="flex items-center gap-2">
                                <Receipt className="w-5 h-5 text-amber-600" />
                                <span className="text-2xl font-bold">{formatCurrency(averageTicket)}</span>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex flex-col gap-1">
                            <span className="text-sm font-medium text-gray-500">Cajero</span>
                            <div className="flex items-center gap-2">
                                <span className="text-lg font-semibold truncate">
                                    {shift.cashier?.full_name || shift.cashier?.email.split('@')[0]}
                                </span>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Sales by Payment Method */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-lg">Ventas por Método de Pago</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    {/* Cash */}
                    <div className="bg-green-50 dark:bg-green-900/10 p-4 rounded-lg flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                                <Banknote className="w-6 h-6 text-green-600 dark:text-green-400" />
                            </div>
                            <div>
                                <p className="font-semibold text-green-900 dark:text-green-100">Efectivo</p>
                                <p className="text-sm text-green-700 dark:text-green-300">
                                    {orders.filter(o => o.payment_method === 'cash').length} órdenes
                                </p>
                            </div>
                        </div>
                        <div className="text-right">
                            <p className="text-xl font-bold text-green-700 dark:text-green-300">{formatCurrency(salesByMethod.cash)}</p>
                            <p className="text-xs text-green-600 dark:text-green-400">
                                {totalSales > 0 ? ((salesByMethod.cash / totalSales) * 100).toFixed(1) : 0}%
                            </p>
                        </div>
                    </div>

                    {/* Card */}
                    <div className="bg-blue-50 dark:bg-blue-900/10 p-4 rounded-lg flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                                <CreditCard className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                            </div>
                            <div>
                                <p className="font-semibold text-blue-900 dark:text-blue-100">Tarjeta</p>
                                <p className="text-sm text-blue-700 dark:text-blue-300">
                                    {orders.filter(o => o.payment_method === 'card').length} órdenes
                                </p>
                            </div>
                        </div>
                        <div className="text-right">
                            <p className="text-xl font-bold text-blue-700 dark:text-blue-300">{formatCurrency(salesByMethod.card)}</p>
                            <p className="text-xs text-blue-600 dark:text-blue-400">
                                {totalSales > 0 ? ((salesByMethod.card / totalSales) * 100).toFixed(1) : 0}%
                            </p>
                        </div>
                    </div>

                    {/* QR */}
                    <div className="bg-purple-50 dark:bg-purple-900/10 p-4 rounded-lg flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                                <QrCode className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                            </div>
                            <div>
                                <p className="font-semibold text-purple-900 dark:text-purple-100">QR / Digital</p>
                                <p className="text-sm text-purple-700 dark:text-purple-300">
                                    {orders.filter(o => o.payment_method === 'qr').length} órdenes
                                </p>
                            </div>
                        </div>
                        <div className="text-right">
                            <p className="text-xl font-bold text-purple-700 dark:text-purple-300">{formatCurrency(salesByMethod.qr)}</p>
                            <p className="text-xs text-purple-600 dark:text-purple-400">
                                {totalSales > 0 ? ((salesByMethod.qr / totalSales) * 100).toFixed(1) : 0}%
                            </p>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Cash Reconciliation */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-lg">Arqueo de Caja</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <div className="flex justify-between text-sm text-gray-500">
                            <span>Efectivo Inicial:</span>
                            <span>{formatCurrency(cashCount.initial)}</span>
                        </div>
                        <div className="flex justify-between text-sm text-gray-500">
                            <span>+ Ventas en Efectivo:</span>
                            <span>{formatCurrency(cashCount.sales)}</span>
                        </div>
                        <Separator />
                        <div className="flex justify-between font-bold text-gray-900 dark:text-white">
                            <span>Efectivo Esperado:</span>
                            <span>{formatCurrency(cashCount.expected)}</span>
                        </div>
                        <div className="flex justify-between font-bold text-gray-900 dark:text-white">
                            <span>Efectivo Real:</span>
                            <span>{shift.final_cash !== null ? formatCurrency(shift.final_cash) : '-'}</span>
                        </div>
                    </div>

                    {shift.status === 'closed' && shift.final_cash !== null && (
                        <div className={`p-4 rounded-lg flex items-center gap-3 ${cashCount.difference < 0 ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>
                            {cashCount.difference < 0 ? (
                                <AlertTriangle className="w-5 h-5" />
                            ) : (
                                <CheckCircle2 className="w-5 h-5" />
                            )}
                            <span className="font-bold">
                                {cashCount.difference < 0 ? 'Faltante:' : 'Sobrante:'} {formatCurrency(Math.abs(cashCount.difference))}
                            </span>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Orders List */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-lg">Todas las Órdenes ({totalOrders})</CardTitle>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Hora</TableHead>
                                <TableHead>Orden #</TableHead>
                                <TableHead>Método</TableHead>
                                <TableHead>Items</TableHead>
                                <TableHead className="text-right">Total</TableHead>
                                <TableHead></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {orders.map((order) => (
                                <>
                                    <TableRow
                                        key={order.id}
                                        className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800"
                                        onClick={() => setExpandedOrder(expandedOrder === order.id ? null : order.id)}
                                    >
                                        <TableCell className="font-medium">
                                            {format(new Date(order.created_at), "HH:mm:ss")}
                                        </TableCell>
                                        <TableCell>#{order.order_number}</TableCell>
                                        <TableCell>
                                            <Badge variant="outline" className="capitalize">
                                                {order.payment_method === 'qr' ? 'QR' : order.payment_method === 'card' ? 'Tarjeta' : 'Efectivo'}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>{order.order_items.length} items</TableCell>
                                        <TableCell className="text-right font-bold text-green-600">
                                            {formatCurrency(order.total)}
                                        </TableCell>
                                        <TableCell>
                                            {expandedOrder === order.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                        </TableCell>
                                    </TableRow>
                                    {expandedOrder === order.id && (
                                        <TableRow className="bg-gray-50 dark:bg-gray-800/50">
                                            <TableCell colSpan={6} className="p-4">
                                                <div className="space-y-3">
                                                    <p className="font-semibold text-sm text-gray-500">Productos de la Orden</p>
                                                    <div className="space-y-2">
                                                        {order.order_items.map((item) => (
                                                            <div key={item.id} className="flex justify-between text-sm bg-white dark:bg-gray-800 p-2 rounded border">
                                                                <div className="flex items-center gap-2">
                                                                    <Badge variant="secondary" className="h-6 w-6 flex items-center justify-center p-0">
                                                                        {item.quantity}x
                                                                    </Badge>
                                                                    <span>{item.product?.name}</span>
                                                                </div>
                                                                <span>{formatCurrency(item.subtotal)}</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                    <div className="flex justify-end gap-8 text-sm pt-2 border-t">
                                                        <div className="text-gray-500">
                                                            <span>Subtotal: </span>
                                                            <span>{formatCurrency(order.subtotal)}</span>
                                                        </div>
                                                        <div className="text-gray-500">
                                                            <span>Impuestos: </span>
                                                            <span>{formatCurrency(order.tax)}</span>
                                                        </div>
                                                        <div className="font-bold text-lg">
                                                            <span>Total: </span>
                                                            <span className="text-green-600">{formatCurrency(order.total)}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    )
}
